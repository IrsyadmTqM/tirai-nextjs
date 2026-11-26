import { Eye, FileLock2, HandCoins, KeyRound, LogIn, LogOut, type LucideIcon, ShieldCheck, ShieldX, Trash2, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BarList } from "@/components/bar-list";
import { Paper, Receipt } from "@/components/brand";
import { Chip, PageHeader, PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { ACTION_LABEL, ASNAF_INFO, PROGRAM_INFO, compactRupiah, dateTime, rupiah, shortId } from "@/lib/labels";
import { auditOverview, donationTotalsByProgram, mustahikCounts } from "@/lib/queries";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

export const metadata: Metadata = { title: "Audit" };

const ACTION_ICON: Record<string, LucideIcon> = {
  "user.register": UserPlus,
  "user.delete": Trash2,
  "auth.login": LogIn,
  "auth.logout": LogOut,
  "unit.grant": KeyRound,
  "mustahik.create": FileLock2,
  "mustahik.open": Eye,
  "donation.create": HandCoins,
};

export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Audit />
    </Suspense>
  );
}

async function Audit() {
  await requireUser("audit:read");
  const [{ verification, recent, opens }, totals, counts] = await Promise.all([auditOverview(60), donationTotalsByProgram(), mustahikCounts()]);
  const totalDonasi = totals.reduce((a, t) => a + t.total, 0);

  return (
    <>
      <PageHeader title="Audit" chips={<Chip tone="pine">Tanpa identitas</Chip>} />

      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Paper
          tilt={-1}
          className={`p-5 ${verification.ok ? "bg-pine-700 text-paper-50 shadow-[4px_5px_0_var(--color-pine-950)]" : "bg-red-700 text-white shadow-[4px_5px_0_#5c1414]"}`}
        >
          {verification.ok ? <ShieldCheck className="size-8 text-mustard-400" /> : <ShieldX className="size-8" />}
          <p className="mt-3 text-3xl font-extrabold">{verification.ok ? "Utuh" : `Rusak di #${verification.brokenAtId}`}</p>
          <p className="font-display opacity-80">Rantai hash · {verification.count} entri</p>
        </Paper>
        <Stat tilt={0.8} value={compactRupiah(totalDonasi)} label="Total donasi" />
        <Stat tilt={-0.6} value={String(counts.total)} label="Mustahik" />
        <Stat tilt={1} value={String(opens)} label="Data disingkap" />
      </div>

      <div className="mb-10 grid gap-8 lg:grid-cols-2">
        <Paper className="p-6">
          <p className="mb-4 font-display text-xl text-pine-900">Donasi per program</p>
          <BarList
            rows={totals.map((t) => ({ label: PROGRAM_INFO[t.program].label, value: t.total, detail: `${t.n} transaksi` }))}
            format={rupiah}
          />
        </Paper>
        <Paper className="p-6">
          <p className="mb-4 font-display text-xl text-pine-900">Mustahik per asnaf</p>
          <BarList rows={counts.byAsnaf.map((r) => ({ label: ASNAF_INFO[r.asnaf].label, value: r.n }))} format={(n) => `${n} orang`} />
        </Paper>
      </div>

      <Receipt title={`Log audit · ${verification.count} entri`}>
        <ul className="divide-y-2 divide-dashed divide-paper-300">
          {recent.map((e) => {
            const Icon = ACTION_ICON[e.action] ?? FileLock2;
            return (
              <li key={e.id} className="flex gap-3 py-3">
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${e.action === "mustahik.open" ? "bg-clay-500 text-paper-50" : "bg-paper-200 text-pine-700"}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">{ACTION_LABEL[e.action] ?? e.action}</span>
                    {e.actorRole ? (
                      <Chip>
                        {ROLE_LABELS[e.actorRole as Role]} · {shortId(e.actorId)}
                      </Chip>
                    ) : (
                      <Chip tone="mustard">{e.actorId ? `Akun dihapus · ${shortId(e.actorId)}` : "Anonim"}</Chip>
                    )}
                  </div>
                  {e.purpose && <p className="mt-1 text-sm text-clay-600">&ldquo;{e.purpose}&rdquo;</p>}
                </div>
                <div className="shrink-0 text-right font-mono text-xs text-ink-400">
                  <p>#{e.id}</p>
                  <p>{dateTime(e.at)}</p>
                  <p title={e.hash}>{e.hash.slice(0, 8)}…</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Receipt>
    </>
  );
}

function Stat({ value, label, tilt }: { value: string; label: string; tilt: number }) {
  return (
    <Paper tilt={tilt} className="p-5">
      <p className="mt-11 text-3xl font-extrabold text-pine-900">{value}</p>
      <p className="font-display text-ink-500">{label}</p>
    </Paper>
  );
}

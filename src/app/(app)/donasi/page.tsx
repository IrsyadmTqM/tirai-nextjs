import { EyeOff, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Paper, Receipt } from "@/components/brand";
import { DonationForm } from "@/components/donasi/donation-form";
import { Chip, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { PROGRAM_INFO, compactRupiah, dateOnly, rupiah } from "@/lib/labels";
import { donationTotalsByProgram, listAllDonations, listMyDonations } from "@/lib/queries";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "Donasi" };

export default function DonationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Donations />
    </Suspense>
  );
}

async function Donations() {
  const user = await requireUser();
  if (can(user.role, "donation:create")) return <DonorView userId={user.id} />;
  if (can(user.role, "donation:read:all")) return <AmilView />;
  return null;
}

async function DonorView({ userId }: { userId: string }) {
  const mine = await listMyDonations(userId);
  const total = mine.reduce((a, d) => a + d.amount, 0);
  return (
    <>
      <PageHeader title="Donasi" />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DonationForm />
        <Receipt title="Riwayat Anda">
          {mine.length === 0 ? (
            <p className="py-6 text-center text-ink-500">Belum ada donasi.</p>
          ) : (
            <ul className="divide-y-2 divide-dashed divide-paper-300">
              {mine.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-bold">{PROGRAM_INFO[d.program].label}</p>
                    <p className="text-xs text-ink-500">{dateOnly(d.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.isAnonymous && (
                      <Chip tone="mustard" icon={<EyeOff />}>
                        Anonim
                      </Chip>
                    )}
                    <span className="font-mono font-bold">{rupiah(d.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between border-t-2 border-ink-900 pt-3 font-mono font-bold">
            <span>TOTAL</span>
            <span>{rupiah(total)}</span>
          </div>
        </Receipt>
      </div>
    </>
  );
}

async function AmilView() {
  const [all, totals] = await Promise.all([listAllDonations(), donationTotalsByProgram()]);
  return (
    <>
      <PageHeader title="Donasi masuk" chips={<Chip tone="mustard">{all.length} transaksi</Chip>} />
      {all.length === 0 ? (
        <EmptyState icon={<HandCoins />} title="Belum ada donasi" />
      ) : (
        <>
          <div className="mb-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(PROGRAM_INFO).map(([key, info], i) => {
              const t = totals.find((x) => x.program === key);
              return (
                <Paper key={key} tilt={[-1, 0.8, -0.5, 1, -0.8][i]} className="p-4">
                  <p className="text-2xl font-extrabold text-pine-900">{compactRupiah(t?.total ?? 0)}</p>
                  <p className="font-display text-ink-500">{info.label}</p>
                </Paper>
              );
            })}
          </div>
          <Receipt title="Semua donasi">
            <ul className="divide-y-2 divide-dashed divide-paper-300">
              {all.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className={`truncate font-bold ${d.donorName === "Hamba Allah" ? "text-ink-500 italic" : ""}`}>{d.donorName}</p>
                    <p className="text-xs text-ink-500">
                      {PROGRAM_INFO[d.program].label} · {dateOnly(d.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-bold">{rupiah(d.amount)}</span>
                </li>
              ))}
            </ul>
          </Receipt>
        </>
      )}
    </>
  );
}

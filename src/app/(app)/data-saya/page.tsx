import { Eye, FileLock2, HandCoins, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Paper, Receipt } from "@/components/brand";
import { AssessmentViewer, DataControls } from "@/components/data/my-data";
import { Chip, PageHeader, PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { ACTION_LABEL, ASNAF_INFO, dateOnly, dateTime, rupiah } from "@/lib/labels";
import { accessLogFor, activityOf, assessmentsOf, listMyDonations, profileOf } from "@/lib/queries";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

export const metadata: Metadata = { title: "Data Saya" };

export default function MyDataPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyData />
    </Suspense>
  );
}

async function MyData() {
  const user = await requireUser("data:own");
  const [profile, donations, assessments, accessLog, activity] = await Promise.all([
    profileOf(user.id),
    listMyDonations(user.id),
    assessmentsOf(user.id),
    accessLogFor(user.id),
    activityOf(user.id, 8),
  ]);
  // Hanya tindakan orang lain terhadap data saya.
  const byOthers = accessLog.filter((e) => e.actorId !== user.id);

  return (
    <>
      <PageHeader title="Data Saya" chips={<Chip tone="mustard">Kendali di tangan Anda</Chip>} />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-7">
          <Paper tilt={-0.8} tape="sage" className="p-6">
            <SectionTitle icon={<UserRound />}>Akun</SectionTitle>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Username" value={profile.username} mono />
              <Row label="Nama" value={profile.displayName} />
              <Row label="Peran" value={ROLE_LABELS[profile.role]} />
              <Row label="Persetujuan" value={`Versi ${profile.consentVersion} · ${dateOnly(profile.consentAt)}`} />
            </dl>
          </Paper>

          {donations.length > 0 && (
            <Paper tilt={0.6} className="p-6">
              <SectionTitle icon={<HandCoins />}>Donasi</SectionTitle>
              <p className="mt-2 text-3xl font-extrabold text-pine-900">{rupiah(donations.reduce((a, d) => a + d.amount, 0))}</p>
              <p className="text-sm text-ink-500">{donations.length} transaksi</p>
            </Paper>
          )}

          {assessments.map((a) => (
            <Paper key={a.id} tilt={-0.5} tape="clay" className="p-6">
              <SectionTitle icon={<FileLock2 />}>Data asesmen</SectionTitle>
              <div className="mt-2 mb-4 flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold">{a.code}</span>
                <Chip>{ASNAF_INFO[a.asnaf].label}</Chip>
              </div>
              <AssessmentViewer userId={user.id} />
            </Paper>
          ))}

          <DataControls userId={user.id} username={user.username} />
        </div>

        <div className="space-y-10">
          <Receipt title="Siapa yang menyingkap data Anda">
            {byOthers.length === 0 ? (
              <div className="py-6 text-center">
                <Eye className="mx-auto mb-2 size-7 text-paper-500" />
                <p className="text-ink-500">Belum ada yang membuka data Anda.</p>
              </div>
            ) : (
              <ol className="space-y-4">
                {byOthers.map((e) => (
                  <li key={e.id} className="relative border-l-2 border-paper-300 pl-5">
                    <span className={`absolute top-1 -left-[7px] size-3 rounded-full ${e.action === "mustahik.open" ? "bg-clay-500" : "bg-pine-500"}`} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-bold">
                        {e.actorName ?? "Akun dihapus"}
                        {e.actorRole && <span className="font-normal text-ink-500"> · {ROLE_LABELS[e.actorRole as Role]}</span>}
                      </p>
                      <span className="font-mono text-xs text-ink-400">{dateTime(e.at)}</span>
                    </div>
                    <p className="text-sm text-ink-500">{ACTION_LABEL[e.action] ?? e.action}</p>
                    {e.purpose && <p className="mt-1 inline-block rounded bg-clay-100 px-2 py-0.5 text-sm text-clay-800">&ldquo;{e.purpose}&rdquo;</p>}
                  </li>
                ))}
              </ol>
            )}
          </Receipt>

          <Receipt title="Aktivitas akun Anda">
            <ul className="space-y-1.5 text-sm">
              {activity.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span>{ACTION_LABEL[e.action] ?? e.action}</span>
                  <span className="font-mono text-xs text-ink-400">{dateTime(e.at)}</span>
                </li>
              ))}
            </ul>
          </Receipt>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <p className="flex items-center gap-2 font-display text-xl text-pine-900 [&_svg]:size-5 [&_svg]:text-clay-500">{icon}{children}</p>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-400">{label}</dt>
      <dd className={`min-w-0 font-semibold break-words ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

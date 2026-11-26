import { Eye, HandCoins, HeartHandshake, type LucideIcon, ReceiptText, ShieldCheck, ShieldX, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Chip, Heading, PageSkeleton } from "@/components/ui";
import { VaultStatus } from "@/components/vault-gate";
import { requireUser } from "@/lib/auth/dal";
import { rupiah } from "@/lib/labels";
import { accessLogFor, auditOverview, getMyUnits, listAllDonations, listMustahikForAmil, listMyDonations, mustahikCounts } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/rbac";

export const metadata: Metadata = { title: "Beranda" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

type Tile = { href: string; icon: LucideIcon; title: string; metric?: string; tone?: "pine" | "clay" | "paper" };

async function Dashboard() {
  const user = await requireUser();
  const tiles: Tile[] = [];
  let units: string[] = [];

  if (user.role === "amil") {
    const [myUnits, list, donations] = await Promise.all([getMyUnits(user.id), listMustahikForAmil(user.id), listAllDonations()]);
    units = myUnits.map((u) => u.name);
    tiles.push(
      { href: "/mustahik/baru", icon: UserPlus, title: "Daftarkan mustahik", tone: "clay" },
      { href: "/mustahik", icon: Users, title: "Mustahik di unit", metric: String(list.length) },
      { href: "/donasi", icon: HandCoins, title: "Donasi masuk", metric: rupiah(donations.reduce((a, d) => a + d.amount, 0)) },
    );
  }
  if (user.role === "donatur") {
    const mine = await listMyDonations(user.id);
    tiles.push(
      { href: "/donasi", icon: HeartHandshake, title: "Tunaikan donasi", tone: "clay" },
      { href: "/donasi", icon: HandCoins, title: "Total donasi Anda", metric: rupiah(mine.reduce((a, d) => a + d.amount, 0)) },
    );
  }
  if (user.role === "auditor") {
    const [{ verification }, counts] = await Promise.all([auditOverview(1), mustahikCounts()]);
    tiles.push(
      {
        href: "/audit",
        icon: verification.ok ? ShieldCheck : ShieldX,
        title: verification.ok ? "Rantai log utuh" : `Rantai rusak di #${verification.brokenAtId}`,
        metric: `${verification.count} entri`,
        tone: verification.ok ? "pine" : "clay",
      },
      { href: "/audit", icon: Users, title: "Mustahik terdaftar", metric: String(counts.total) },
    );
  }
  if (user.role === "mustahik") {
    const opens = (await accessLogFor(user.id)).filter((l) => l.action === "mustahik.open").length;
    tiles.push({ href: "/data-saya", icon: Eye, title: "Data Anda disingkap", metric: `${opens}×`, tone: "clay" });
  }
  tiles.push({ href: "/data-saya", icon: ReceiptText, title: "Data Saya" });

  const toneClass = {
    clay: "bg-clay-500 text-paper-50 shadow-[4px_5px_0_var(--color-clay-800)]",
    pine: "bg-pine-700 text-paper-50 shadow-[4px_5px_0_var(--color-pine-950)]",
    paper: "bg-paper-50 shadow-[4px_5px_0_var(--color-paper-400)]",
  };

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <Heading>Assalamu&apos;alaikum, {user.displayName.split(" ")[0]}</Heading>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="pine">{ROLE_LABELS[user.role]}</Chip>
          {units.map((u) => (
            <Chip key={u} tone="mustard">
              {u}
            </Chip>
          ))}
        </div>
      </div>

      <VaultStatus userId={user.id} />

      <section className="grid gap-7 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t, i) => {
          const tone = t.tone ?? "paper";
          const tilt = [-1.2, 0.9, -0.6, 1.1][i % 4];
          return (
            <Link
              key={t.title}
              href={t.href}
              className={`group relative flex min-h-40 flex-col justify-between rounded-md p-6 transition hover:-translate-y-1 animate-drop ${toneClass[tone]}`}
              style={{ "--tilt": `${tilt}deg`, animationDelay: `${i * 70}ms` } as React.CSSProperties}
            >
              <t.icon className={`size-9 ${tone === "paper" ? "text-clay-500" : "text-mustard-400"}`} strokeWidth={1.8} />
              <div>
                {t.metric && <p className="font-display text-3xl font-semibold">{t.metric}</p>}
                <p className={`font-display text-xl ${t.metric ? "opacity-80" : "font-medium"}`}>{t.title} →</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

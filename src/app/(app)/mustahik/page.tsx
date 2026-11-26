import { Building2, Scissors, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MustahikCard } from "@/components/mustahik/mustahik-card";
import { Chip, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { getMyUnits, listMustahikForAmil } from "@/lib/queries";

export const metadata: Metadata = { title: "Mustahik" };

export default function MustahikPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MustahikList />
    </Suspense>
  );
}

async function MustahikList() {
  const user = await requireUser("mustahik:list");
  const [units, list] = await Promise.all([getMyUnits(user.id), listMustahikForAmil(user.id)]);

  return (
    <>
      <PageHeader
        title="Mustahik"
        chips={units.map((u) => (
          <Chip key={u.id} tone="mustard" icon={<Building2 />}>
            {u.name} · {list.length}
          </Chip>
        ))}
      />

      {units.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="Belum tergabung di unit">
          Minta amil lain memberi Anda kunci unit.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => (
            <MustahikCard key={m.id} userId={user.id} item={m} index={i} />
          ))}
          <Link
            href="/mustahik/baru"
            className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-paper-500 text-ink-700 transition hover:border-clay-500 hover:bg-paper-50"
          >
            <Scissors className="size-8 text-clay-500" strokeWidth={1.8} />
            <span className="font-display text-xl">Daftarkan</span>
          </Link>
        </div>
      )}
    </>
  );
}

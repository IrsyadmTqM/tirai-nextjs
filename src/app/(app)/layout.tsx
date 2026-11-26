import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { type NavItem, NavLinks, UserMenu } from "@/components/app-nav";
import { Logo } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS, can } from "@/lib/rbac";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Pita navigasi dari kertas hijau dengan tepi bawah digunting */}
      <header className="edge-torn sticky top-0 z-30 bg-pine-700 pb-4 text-paper-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/dasbor" className="flex shrink-0 items-center gap-2 text-mustard-400">
            <Logo className="size-7" />
            <span className="font-display text-2xl font-semibold text-paper-50">Tirai</span>
          </Link>
          <Suspense fallback={<div className="flex-1" />}>
            <Navigation />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

async function Navigation() {
  const user = await getCurrentUser();
  if (!user) return <div className="flex-1" />;
  const items: NavItem[] = [{ href: "/dasbor", label: "Beranda" }];
  if (can(user.role, "mustahik:list")) items.push({ href: "/mustahik", label: "Mustahik" });
  if (can(user.role, "donation:create") || can(user.role, "donation:read:all")) items.push({ href: "/donasi", label: "Donasi" });
  if (can(user.role, "audit:read")) items.push({ href: "/audit", label: "Audit" });
  items.push({ href: "/data-saya", label: "Data Saya" });

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <NavLinks items={items} />
      <UserMenu name={user.displayName} role={ROLE_LABELS[user.role]} />
    </div>
  );
}

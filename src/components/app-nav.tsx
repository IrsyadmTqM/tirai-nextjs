"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/client/auth";

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/dasbor" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1 font-display text-[15px] whitespace-nowrap transition ${
              active ? "bg-paper-50 text-pine-700 shadow-[2px_2px_0_var(--color-pine-950)]" : "text-paper-50/75 hover:text-paper-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight md:block">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-xs text-paper-50/70">{role}</p>
      </div>
      <button
        type="button"
        title="Keluar"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await logout().catch(() => {});
          router.replace("/masuk");
          router.refresh();
        }}
        className="flex size-9 items-center justify-center rounded-md bg-pine-800 text-paper-50 transition hover:bg-clay-500"
      >
        <LogOut className="size-4" />
        <span className="sr-only">Keluar</span>
      </button>
    </div>
  );
}

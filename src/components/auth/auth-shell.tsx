import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, PaperScene } from "@/components/brand";

export function AuthShell({ quote, source, children }: { quote: string; source: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col gap-16 overflow-hidden bg-pine-700 p-12 text-paper-50 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-mustard-400">
          <Logo className="size-8" />
          <span className="font-display text-2xl font-semibold text-paper-50">Tirai</span>
        </Link>
        <figure className="relative z-10 max-w-md">
          <blockquote className="font-display text-3xl leading-snug font-medium">&ldquo;{quote}&rdquo;</blockquote>
          <figcaption className="mt-4 font-display text-mustard-400">{source}</figcaption>
        </figure>
        {/* Ilustrasi di bawah, tidak menimpa kutipan */}
        <PaperScene className="pointer-events-none absolute -right-10 -bottom-16 w-[30rem] max-w-[90%]" />
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <Link href="/" className="mb-10 flex items-center gap-2 text-pine-700 lg:hidden">
            <Logo className="size-7" />
            <span className="font-display text-2xl font-semibold">Tirai</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

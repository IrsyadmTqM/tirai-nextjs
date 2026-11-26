import { Eye, Fingerprint, KeyRound, LockKeyhole, ReceiptText, ServerCog } from "lucide-react";
import Link from "next/link";
import { Logo, Paper, PaperScene } from "@/components/brand";
import { ButtonLink, Chip } from "@/components/ui";

const promises = [
  { icon: LockKeyhole, title: "Terkunci di perangkat", body: "Server pun tak bisa membaca.", source: "QS. An-Nisa: 58", tape: "mustard" as const },
  { icon: ReceiptText, title: "Setiap akses tercatat", body: "Membuka data wajib menyebut tujuan.", source: "QS. Al-Hujurat: 12", tape: "clay" as const },
  { icon: Fingerprint, title: "Kendali di tangan Anda", body: "Lihat, ekspor, atau hapus kapan saja.", source: "UU PDP No. 27/2022", tape: "sage" as const },
];

const roles = [
  { icon: ServerCog, who: "Server & admin", sees: "Hanya sandi acak" },
  { icon: LockKeyhole, who: "Amil unit lain", sees: "Tak bisa membuka" },
  { icon: Eye, who: "Auditor", sees: "Angka & log" },
  { icon: KeyRound, who: "Amil unitnya", sees: "Isi data, tercatat" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-pine-700">
          <Logo className="size-8" />
          <span className="font-display text-2xl font-semibold">Tirai</span>
        </Link>
        <div className="flex gap-3">
          <ButtonLink href="/masuk" variant="paper" className="hidden sm:inline-flex">
            Masuk
          </ButtonLink>
          <ButtonLink href="/daftar">Daftar</ButtonLink>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-12 lg:pb-24">
        <div className="animate-rise">
          <Paper tilt={-2} className="inline-block px-3 py-1 font-display text-sm text-pine-700">
            ZISWAF privacy-first
          </Paper>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] font-semibold text-pine-900 sm:text-6xl">
            Amanah terjaga, martabat terlindungi.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-500">
            Data mustahik tersimpan di balik tirai. Hanya yang berhak boleh menyingkapnya.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/masuk" className="px-6 py-3 text-lg">
              Masuk ke Tirai
            </ButtonLink>
            <ButtonLink href="/daftar" variant="paper" className="px-6 py-3 text-lg">
              Daftar donatur
            </ButtonLink>
          </div>
        </div>
        <PaperScene className="mx-auto w-full max-w-lg animate-rise [animation-delay:120ms]" />
      </section>

      <section className="bg-pine-700 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-3">
          {promises.map(({ icon: Icon, title, body, source, tape }, i) => (
            <Paper key={title} tilt={[-1.5, 1, -0.8][i]} tape={tape} className="p-7 pt-8">
              <Icon className="size-10 text-clay-500" strokeWidth={1.8} />
              <h2 className="mt-4 font-display text-2xl font-medium text-pine-900">{title}</h2>
              <p className="mt-1 text-ink-500">{body}</p>
              <Chip tone="mustard" className="mt-5">
                {source}
              </Chip>
            </Paper>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-10 font-display text-4xl font-semibold text-pine-900">Siapa melihat apa?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ icon: Icon, who, sees }, i) => (
            <Paper key={who} tilt={i % 2 ? 0.8 : -0.8} className="flex items-center gap-4 p-5">
              <Icon className="size-8 shrink-0 text-pine-700" strokeWidth={1.8} />
              <div>
                <p className="font-display text-lg font-medium">{who}</p>
                <p className="text-sm text-ink-500">{sees}</p>
              </div>
            </Paper>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-dashed border-paper-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:px-6">
          <span className="flex items-center gap-2 font-display text-lg text-pine-700">
            <Logo className="size-5" /> Tirai
          </span>
          <span>Tugas Besar ICT dan Islam · Topik D</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { Check, Copy, Download, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Receipt } from "@/components/brand";
import { Alert, Button, Field, Heading, Input } from "@/components/ui";
import { registerAccount } from "@/lib/client/auth";
import { CONSENT_POINTS } from "@/lib/consent";

export function RegisterForm() {
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  return recoveryCode ? <RecoveryStep code={recoveryCode} /> : <FormStep onDone={setRecoveryCode} />;
}

function FormStep({ onDone }: { onDone: (code: string) => void }) {
  const [form, setForm] = useState({ displayName: "", username: "", password: "", confirm: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    try {
      onDone((await registerAccount(form)).recoveryCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar");
      setBusy(false);
    }
  }

  return (
    <>
      <Heading>Buat akun</Heading>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Field label="Nama tampilan" hint="Disembunyikan saat berdonasi anonim.">
          <Input value={form.displayName} onChange={set("displayName")} autoComplete="nickname" maxLength={80} required />
        </Field>
        <Field label="Username" hint="Huruf kecil, angka, titik, atau garis bawah.">
          <Input value={form.username} onChange={set("username")} autoComplete="username" autoCapitalize="none" pattern="[a-z0-9._]{3,32}" required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" hint="Minimal 10 karakter.">
            <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" minLength={10} required />
          </Field>
          <Field label="Ulangi" error={mismatch ? "Tidak sama" : undefined}>
            <Input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
          </Field>
        </div>

        <fieldset className="rounded-md bg-paper-50 p-4 shadow-[3px_3px_0_var(--color-paper-400)]">
          <ul className="space-y-1.5 text-sm text-ink-700">
            {CONSENT_POINTS.map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-sage-600" strokeWidth={3} /> {p}
              </li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-center gap-3 border-t-2 border-dashed border-paper-300 pt-3 font-bold">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-5 accent-pine-700" required />
            Saya setuju
          </label>
        </fieldset>

        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy || !consent || mismatch} className="w-full py-3 text-lg">
          {busy && <Loader2 className="size-5 animate-spin" />}
          {busy ? "Membuat kunci…" : "Buat akun"}
        </Button>
      </form>
      <p className="mt-8 text-center text-ink-500">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-bold text-pine-700 hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}

function RecoveryStep({ code }: { code: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  function download() {
    const text = `Kunci pemulihan Tirai\n\n${code}\n\nSimpan di tempat aman. Tanpa kunci ini, data terenkripsi tidak bisa dibuka jika Anda lupa password.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: "kunci-pemulihan-tirai.txt" }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-rise">
      <KeyRound className="size-12 text-clay-500" strokeWidth={1.8} />
      <Heading className="mt-4">Simpan kunci ini</Heading>
      <p className="mt-2 text-ink-500">Hanya kunci ini yang bisa membuka data Anda jika lupa password. Kami tidak memegang salinannya.</p>

      <Receipt title="Kunci pemulihan" className="mt-6">
        <p className="grid grid-cols-4 gap-2 text-center font-mono text-sm font-bold tracking-wider text-pine-800">
          {code.split("-").map((g, i) => (
            <span key={i} className="rounded bg-paper-200 py-1">
              {g}
            </span>
          ))}
        </p>
      </Receipt>

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="paper"
          className="flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Tersalin" : "Salin"}
        </Button>
        <Button type="button" variant="paper" className="flex-1" onClick={download}>
          <Download className="size-4" /> Unduh
        </Button>
      </div>

      <label className="mt-6 flex cursor-pointer items-center gap-3 font-bold">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="size-5 accent-pine-700" />
        Sudah saya simpan
      </label>
      <Button
        className="mt-5 w-full py-3 text-lg"
        disabled={!saved}
        onClick={() => {
          router.replace("/dasbor");
          router.refresh();
        }}
      >
        Lanjut
      </Button>
    </div>
  );
}

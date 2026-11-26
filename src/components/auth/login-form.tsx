"use client";

import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Heading, Input } from "@/components/ui";
import { login } from "@/lib/client/auth";

const DEMO_USERS = ["amil.pusat", "amil.barat", "auditor", "donatur", "mustahik"];

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.replace("/dasbor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
      setBusy(false);
    }
  }

  return (
    <>
      <Heading>Assalamu&apos;alaikum</Heading>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full py-3 text-lg">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
          {busy ? "Membuka kunci…" : "Masuk"}
        </Button>
      </form>

      <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-pine-700">
        <ShieldCheck className="size-4 shrink-0" /> Password tidak pernah dikirim ke server.
      </p>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 border-t-2 border-dashed border-paper-400 pt-5">
          <p className="mb-2 text-xs font-bold text-ink-400">AKUN DEMO · password di README</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUsername(u)}
                className="rounded-full bg-paper-50 px-3 py-1 font-mono text-xs text-ink-700 shadow-[2px_2px_0_var(--color-paper-400)] hover:text-pine-700"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-ink-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-bold text-pine-700 hover:underline">
          Daftar
        </Link>
      </p>
    </>
  );
}

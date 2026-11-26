"use client";

import { Building2, Coins, EyeOff, HandHeart, Heart, Loader2, Wheat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Paper } from "@/components/brand";
import { Alert, Button, Chip, inputClass } from "@/components/ui";
import { api } from "@/lib/client/api";
import { PROGRAM_INFO, rupiah } from "@/lib/labels";

const PROGRAM_ICONS = { zakat_mal: Coins, zakat_fitrah: Wheat, infak: HandHeart, sedekah: Heart, wakaf: Building2 };
const PRESETS = [50_000, 100_000, 250_000, 500_000];

export function DonationForm() {
  const router = useRouter();
  const [program, setProgram] = useState<keyof typeof PROGRAM_ICONS>("zakat_mal");
  const [amount, setAmount] = useState(100_000);
  const [custom, setCustom] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/donasi", { body: { program, amount, isAnonymous: anonymous } });
      setThanks(true);
      router.refresh();
      setTimeout(() => setThanks(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat donasi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper className="p-6 sm:p-7">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {(Object.keys(PROGRAM_ICONS) as (keyof typeof PROGRAM_ICONS)[]).map((key) => {
          const Icon = PROGRAM_ICONS[key];
          const on = program === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setProgram(key)}
              className={`flex flex-col items-center gap-1.5 rounded-md px-2 py-3 font-display transition ${
                on ? "bg-pine-700 text-paper-50 shadow-[3px_3px_0_var(--color-pine-950)]" : "bg-paper-100 text-ink-700 hover:bg-paper-200"
              }`}
            >
              <Icon className="size-6" strokeWidth={1.8} />
              <span className="text-sm leading-tight">{PROGRAM_INFO[key].label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom(false);
            }}
            className={`rounded-full px-4 py-1.5 font-bold transition ${!custom && amount === p ? "bg-clay-500 text-paper-50" : "bg-paper-200 text-ink-700 hover:bg-paper-300"}`}
          >
            {p / 1000}rb
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`rounded-full px-4 py-1.5 font-bold transition ${custom ? "bg-clay-500 text-paper-50" : "bg-paper-200 text-ink-700 hover:bg-paper-300"}`}
        >
          Lainnya
        </button>
      </div>
      {custom && (
        <div className="relative mt-3">
          <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-ink-400">Rp</span>
          <input
            className={`${inputClass} pl-12`}
            inputMode="numeric"
            autoFocus
            value={amount ? amount.toLocaleString("id-ID") : ""}
            onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "").slice(0, 11)))}
          />
        </div>
      )}

      <label className="mt-6 flex cursor-pointer items-center gap-4 rounded-md bg-mustard-100 p-4">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="peer sr-only" />
        <span className="relative h-7 w-12 shrink-0 rounded-full bg-paper-400 transition peer-checked:bg-pine-700 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-paper-50 after:transition peer-checked:after:translate-x-5" />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 font-display text-lg text-mustard-700">
            <EyeOff className="size-4" /> Sembunyikan nama saya
          </span>
          <span className="text-sm text-mustard-700/80">Amil hanya melihat &ldquo;Hamba Allah&rdquo;.</span>
        </span>
        <Chip tone="mustard" className="hidden bg-paper-50 sm:inline-flex">
          QS. Al-Baqarah: 271
        </Chip>
      </label>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {thanks && (
        <div className="mt-4">
          <Alert tone="pine">Jazakallahu khairan. Donasi tercatat.</Alert>
        </div>
      )}

      <Button variant="clay" className="mt-6 w-full py-3 text-lg" onClick={submit} disabled={busy || amount < 10_000}>
        {busy && <Loader2 className="size-5 animate-spin" />} Tunaikan {rupiah(amount)}
      </Button>
      <p className="mt-3 text-center text-xs text-ink-400">Simulasi: belum terhubung ke pembayaran.</p>
    </Paper>
  );
}

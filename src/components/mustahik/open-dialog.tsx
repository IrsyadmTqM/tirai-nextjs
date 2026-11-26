"use client";

import { Eye, Loader2, LockKeyholeOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { UnlockVault, useVaultKey } from "@/components/vault-gate";
import { openMustahik } from "@/lib/client/mustahik";
import type { MustahikPrivateData } from "@/lib/crypto";

const QUICK_PURPOSES = ["Verifikasi kelayakan", "Penyaluran bantuan", "Kunjungan lapangan", "Permintaan mustahik"];

/**
 * Dialog "singkap dengan tujuan". QS. Al-Hujurat: 12 melarang tajassus, jadi
 * data hanya bisa dibuka setelah amil menuliskan tujuannya, dan tujuan itu
 * dicatat server sebelum ciphertext diberikan.
 */
export function OpenDialog({
  userId,
  mustahikId,
  code,
  onClose,
  onOpened,
}: {
  userId: string;
  mustahikId: string;
  code: string;
  onClose: () => void;
  onOpened: (data: MustahikPrivateData) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { key, setKey, loading } = useVaultKey(userId);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key) return;
    if (purpose.trim().length < 10) {
      setError("Tuliskan tujuan minimal 10 karakter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onOpened(await openMustahik(mustahikId, purpose.trim(), key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka data");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md bg-paper-50 p-0 text-ink-900 shadow-[6px_7px_0_var(--color-pine-950)] backdrop:bg-pine-950/60"
    >
      <form onSubmit={submit} className="p-6">
        <p className="flex items-center gap-2 font-display text-2xl font-medium text-pine-900">
          <Eye className="size-6 text-clay-500" /> Singkap <span className="font-mono text-lg">{code}</span>
        </p>
        <p className="mt-1 text-sm text-ink-500">Tujuan Anda dicatat dan bisa dilihat mustahik serta auditor.</p>

        {loading ? null : !key ? (
          <div className="mt-5">
            <UnlockVault userId={userId} onUnlocked={setKey} />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p + " ")}
                  className={`rounded-full px-3 py-1 text-sm font-bold transition ${
                    purpose.startsWith(p) ? "bg-pine-700 text-paper-50" : "bg-paper-200 text-ink-700 hover:bg-paper-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3 min-h-24"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setError(null);
              }}
              placeholder="Verifikasi kelayakan penerima bantuan pendidikan"
              maxLength={300}
              autoFocus
            />
          </>
        )}

        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
            Batal
          </Button>
          <Button type="submit" disabled={busy || !key}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LockKeyholeOpen className="size-4" />} Singkap & catat
          </Button>
        </div>
      </form>
    </dialog>
  );
}

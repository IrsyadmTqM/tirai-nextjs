"use client";

import { Loader2, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, Button, Chip, Input } from "@/components/ui";
import { unlockVault } from "@/lib/client/auth";
import { loadUserKey } from "@/lib/client/vault";

/** Kunci privat pengguna dari brankas IndexedDB. `null` berarti brankas terkunci. */
export function useVaultKey(userId: string) {
  const [key, setKey] = useState<CryptoKey | null | undefined>(undefined);
  useEffect(() => {
    loadUserKey(userId)
      .then(setKey)
      .catch(() => setKey(null));
  }, [userId]);
  return { key, setKey, loading: key === undefined };
}

/** Ditampilkan saat brankas terkunci (mis. IndexedDB dibersihkan atau perangkat baru). */
export function UnlockVault({ userId, onUnlocked }: { userId: string; onUnlocked: (key: CryptoKey) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onUnlocked(await unlockVault(userId, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka brankas");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md bg-mustard-100 p-5 shadow-[3px_3px_0_#ecd7a3]">
      <p className="mb-3 flex items-center gap-2 font-display text-lg text-mustard-700">
        <LockKeyhole className="size-5" /> Brankas kunci terkunci
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password Anda"
          autoComplete="current-password"
          required
          className="sm:flex-1"
        />
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LockKeyholeOpen className="size-4" />} Buka
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </form>
  );
}

/** Lencana status brankas untuk beranda. */
export function VaultStatus({ userId }: { userId: string }) {
  const { key, setKey, loading } = useVaultKey(userId);
  if (loading) return null;
  if (key) {
    return (
      <Chip tone="sage" icon={<LockKeyholeOpen />}>
        Brankas terbuka di perangkat ini
      </Chip>
    );
  }
  return <UnlockVault userId={userId} onUnlocked={setKey} />;
}

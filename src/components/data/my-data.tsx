"use client";

import { Download, Loader2, LockKeyholeOpen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Paper } from "@/components/brand";
import { Alert, Button, Input } from "@/components/ui";
import { UnlockVault, useVaultKey } from "@/components/vault-gate";
import { api } from "@/lib/client/api";
import { clearVault } from "@/lib/client/vault";
import { type Encrypted, type MustahikPrivateData, type SealedBox, decryptRecord, openDataKey } from "@/lib/crypto";
import { compactRupiah } from "@/lib/labels";

type ExportPayload = {
  exportedAt: string;
  profile: unknown;
  donations: unknown[];
  assessments: { id: string; code: string; ciphertext: Encrypted; sealedKey: SealedBox; [k: string]: unknown }[];
  activity: unknown[];
};

/** Membuka data asesmen milik sendiri dengan kunci privat sendiri (tanpa lewat amil). */
async function decryptOwnAssessments(payload: ExportPayload, key: CryptoKey) {
  return Promise.all(
    payload.assessments.map(async ({ ciphertext, sealedKey, ...rest }) => {
      const dek = await openDataKey(sealedKey, key, rest.id);
      return { ...rest, data: await decryptRecord(ciphertext, dek, rest.id) };
    }),
  );
}

export function AssessmentViewer({ userId }: { userId: string }) {
  const { key, setKey, loading } = useVaultKey(userId);
  const [data, setData] = useState<MustahikPrivateData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!key) return <UnlockVault userId={userId} onUnlocked={setKey} />;
  if (data) {
    return (
      <dl className="space-y-1.5 text-sm">
        {[
          ["Nama", data.fullName],
          ["NIK", data.nik],
          ["HP", data.phone],
          ["Alamat", data.address],
          ["Penghasilan", `${compactRupiah(data.monthlyIncome)} / bulan`],
          ["Tanggungan", String(data.dependents)],
          ["Catatan", data.notes || "—"],
        ].map(([l, v]) => (
          <div key={l} className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-400">{l}</dt>
            <dd className="min-w-0 font-semibold break-words">{v}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <>
      <Button
        variant="paper"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const payload = await api<ExportPayload>("/api/me");
            const [first] = await decryptOwnAssessments(payload, key);
            if (first) setData(first.data);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal membuka");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <LockKeyholeOpen className="size-4" />} Lihat isinya
      </Button>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </>
  );
}

export function DataControls({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const { key } = useVaultKey(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const payload = await api<ExportPayload>("/api/me");
      // Bagian terenkripsi didekripsi di browser ini; jika brankas terkunci, ciphertext diekspor apa adanya.
      const assessments = key ? await decryptOwnAssessments(payload, key) : payload.assessments;
      const blob = new Blob([JSON.stringify({ ...payload, assessments }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: `tirai-data-${username}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengekspor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper className="p-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="paper" onClick={exportData} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Ekspor semua
        </Button>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="size-4" /> Hapus akun
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {confirmOpen && (
        <DeleteDialog
          username={username}
          onClose={() => setConfirmOpen(false)}
          onDeleted={async () => {
            await clearVault();
            router.replace("/");
            router.refresh();
          }}
        />
      )}
    </Paper>
  );
}

function DeleteDialog({ username, onClose, onDeleted }: { username: string; onClose: () => void; onDeleted: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "DELETE", body: { confirmUsername: typed } });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md bg-paper-50 p-0 text-ink-900 shadow-[6px_7px_0_#5c1414]"
    >
      <form onSubmit={submit} className="p-6">
        <p className="flex items-center gap-2 font-display text-2xl text-red-800">
          <Trash2 className="size-6" /> Hapus akun?
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
          <li>Akun, kunci, dan sesi dihapus permanen.</li>
          <li>Kunci data asesmen Anda dihancurkan.</li>
          <li>Nominal donasi tetap ada tanpa nama, untuk laporan keuangan.</li>
        </ul>
        <p className="mt-4 mb-2 text-sm font-bold">
          Ketik <span className="font-mono">{username}</span> untuk konfirmasi
        </p>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" autoComplete="off" />
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
            Batal
          </Button>
          <Button type="submit" className="bg-red-700 shadow-[3px_3px_0_#5c1414] hover:bg-red-800" disabled={busy || typed !== username}>
            {busy && <Loader2 className="size-4 animate-spin" />} Hapus permanen
          </Button>
        </div>
      </form>
    </dialog>
  );
}

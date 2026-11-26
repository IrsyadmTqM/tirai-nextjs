// Operasi data mustahik di browser amil.

import {
  type Encrypted,
  type MustahikPrivateData,
  type SealedBox,
  decryptRecord,
  encryptRecord,
  generateDataKey,
  importPublicKey,
  openDataKey,
  openPrivateKey,
  sealDataKey,
  unitKeyContext,
} from "@/lib/crypto";
import { api } from "./api";

type UnitKeys = { unitId: string; name: string; publicKey: string; sealedUnitKey: SealedBox };

export type EncryptionStep = "dek" | "encrypt" | "seal" | "send";

/** Enkripsi asesmen di browser lalu kirim ciphertext-nya. */
export async function createMustahik(
  input: { unitId: string; unitPublicKey: string; asnaf: string; district: string; data: MustahikPrivateData },
  onStep: (step: EncryptionStep) => void | Promise<void> = () => {},
): Promise<{ id: string; code: string }> {
  const id = crypto.randomUUID();
  await onStep("dek");
  const dek = await generateDataKey();
  await onStep("encrypt");
  const ciphertext = await encryptRecord(input.data, dek, id);
  await onStep("seal");
  const unitSealedKey = await sealDataKey(dek, await importPublicKey(input.unitPublicKey), id);
  await onStep("send");
  return api("/api/mustahik", {
    body: { id, unitId: input.unitId, asnaf: input.asnaf, district: input.district, ciphertext, unitSealedKey },
  });
}

/** Membuka data: server mencatat tujuan dulu, baru memberikan ciphertext. */
export async function openMustahik(
  id: string,
  purpose: string,
  privateKey: CryptoKey,
): Promise<MustahikPrivateData> {
  const opened = await api<{ unitId: string; ciphertext: Encrypted; sealedKey: SealedBox }>(
    `/api/mustahik/${id}/open`,
    { body: { purpose } },
  );
  const { units } = await api<{ units: UnitKeys[] }>("/api/keys/me");
  const unit = units.find((u) => u.unitId === opened.unitId);
  if (!unit) throw new Error("Anda tidak memegang kunci unit ini");
  const unitKey = await openPrivateKey(unit.sealedUnitKey, privateKey, unitKeyContext(unit.unitId));
  const dek = await openDataKey(opened.sealedKey, unitKey, id);
  return decryptRecord(opened.ciphertext, dek, id);
}

// Enkripsi data asesmen mustahik (docs/ARSITEKTUR.md bagian 4.3).
// Setiap record punya kunci data (DEK) sendiri. DEK disegel ke kunci publik
// unit amil, dan ke kunci publik mustahik jika ia punya akun.

import { fromUtf8, utf8 } from "./encoding";
import { type Encrypted, type SealedBox, aesDecrypt, aesEncrypt, open, seal } from "./primitives";

const subtle = () => globalThis.crypto.subtle;

export const unitKeyContext = (unitId: string) => `tirai/unit-key/${unitId}`;
const dekContext = (recordId: string) => `tirai/dek/${recordId}`;
const recordAad = (recordId: string) => utf8(`tirai/mustahik/${recordId}`);

/** Isi asesmen yang dienkripsi. Server tidak pernah melihat isi ini. */
export type MustahikPrivateData = {
  fullName: string;
  nik: string;
  phone: string;
  address: string;
  monthlyIncome: number;
  dependents: number;
  notes: string;
};

export async function generateDataKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** ID record dipakai sebagai AAD, jadi ciphertext tidak bisa dipindah ke record lain. */
export async function encryptRecord(data: MustahikPrivateData, dek: CryptoKey, recordId: string): Promise<Encrypted> {
  return aesEncrypt(dek, utf8(JSON.stringify(data)), recordAad(recordId));
}

export async function decryptRecord(data: Encrypted, dek: CryptoKey, recordId: string): Promise<MustahikPrivateData> {
  return JSON.parse(fromUtf8(await aesDecrypt(dek, data, recordAad(recordId))));
}

export async function sealDataKey(dek: CryptoKey, recipient: CryptoKey, recordId: string): Promise<SealedBox> {
  const raw = new Uint8Array(await subtle().exportKey("raw", dek));
  return seal(raw, recipient, dekContext(recordId));
}

export async function openDataKey(box: SealedBox, privateKey: CryptoKey, recordId: string): Promise<CryptoKey> {
  const raw = await open(box, privateKey, dekContext(recordId));
  return subtle().importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
}

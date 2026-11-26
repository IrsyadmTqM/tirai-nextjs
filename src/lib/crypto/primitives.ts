// Primitif kriptografi Tirai. Semuanya memakai Web Crypto API bawaan
// (browser dan Node.js), tanpa pustaka pihak ketiga.
// Penjelasan desain: docs/ARSITEKTUR.md bagian 4.

import { type Bytes, fromBase64, fromHex, randomBytes, toBase64, toHex, utf8 } from "./encoding";

const subtle = () => globalThis.crypto.subtle;

/** Jumlah iterasi PBKDF2 (rekomendasi OWASP 2023 untuk PBKDF2-SHA256). */
export const KDF_ITERATIONS = 600_000;

const EC = { name: "ECDH", namedCurve: "P-256" } as const;
const EMPTY = new Uint8Array(0);

/** Hasil enkripsi AES-256-GCM. `iv` dan `ct` dalam base64. */
export type Encrypted = { iv: string; ct: string };

/** Kunci yang disegel untuk satu penerima (pola ECIES). */
export type SealedBox = { epk: string; iv: string; ct: string };

// ---------------------------------------------------------------------------
// AES-256-GCM
// ---------------------------------------------------------------------------

export async function aesEncrypt(key: CryptoKey, plaintext: Bytes, aad: Bytes = EMPTY): Promise<Encrypted> {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, plaintext);
  return { iv: toBase64(iv), ct: toBase64(ct) };
}

export async function aesDecrypt(key: CryptoKey, data: Encrypted, aad: Bytes = EMPTY): Promise<Bytes> {
  const pt = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(data.iv), additionalData: aad },
    key,
    fromBase64(data.ct),
  );
  return new Uint8Array(pt);
}

// ---------------------------------------------------------------------------
// Kunci pengguna dari password (bagian 4.1)
// ---------------------------------------------------------------------------

/**
 * Menurunkan dua kunci dari satu password:
 * - `authKey`: dikirim ke server sebagai pengganti password (server menyimpan hash-nya).
 * - `kek`: tidak pernah keluar dari browser; membuka kunci privat pengguna.
 * HKDF searah, jadi server yang tahu `authKey` tetap tidak bisa menghitung `kek`.
 */
export async function deriveUserKeys(
  password: string,
  salt: Bytes,
  iterations: number = KDF_ITERATIONS,
): Promise<{ authKey: string; kek: CryptoKey }> {
  const passwordKey = await subtle().importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const master = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    passwordKey,
    256,
  );
  const hkdfKey = await subtle().importKey("raw", master, "HKDF", false, ["deriveBits", "deriveKey"]);
  const authBits = await subtle().deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: EMPTY, info: utf8("tirai/auth") },
    hkdfKey,
    256,
  );
  const kek = await subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: EMPTY, info: utf8("tirai/kek") },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return { authKey: toBase64(authBits), kek };
}

// ---------------------------------------------------------------------------
// Pasangan kunci ECDH P-256
// ---------------------------------------------------------------------------

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey(EC, true, ["deriveBits"]);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return toBase64(await subtle().exportKey("raw", key));
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return subtle().importKey("raw", fromBase64(base64), EC, true, []);
}

async function exportPrivateKeyBytes(key: CryptoKey): Promise<Bytes> {
  return new Uint8Array(await subtle().exportKey("pkcs8", key));
}

async function importPrivateKeyBytes(pkcs8: Bytes, extractable: boolean): Promise<CryptoKey> {
  return subtle().importKey("pkcs8", pkcs8, EC, extractable, ["deriveBits"]);
}

/** Mengenkripsi kunci privat dengan `kek` (atau kunci pemulihan) untuk disimpan di server. */
export async function wrapPrivateKey(privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<Encrypted> {
  return aesEncrypt(wrappingKey, await exportPrivateKeyBytes(privateKey), utf8("tirai/private-key"));
}

/** Membuka kunci privat. Default non-extractable: setelah dibuka, kunci tidak bisa diekspor lagi. */
export async function unwrapPrivateKey(
  wrapped: Encrypted,
  wrappingKey: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  const pkcs8 = await aesDecrypt(wrappingKey, wrapped, utf8("tirai/private-key"));
  return importPrivateKeyBytes(pkcs8, extractable);
}

/** Mengimpor ulang kunci privat (extractable) sebagai non-extractable. */
export async function toNonExtractable(privateKey: CryptoKey): Promise<CryptoKey> {
  return importPrivateKeyBytes(await exportPrivateKeyBytes(privateKey), false);
}

// ---------------------------------------------------------------------------
// Kunci pemulihan (ditampilkan sekali saat mendaftar)
// ---------------------------------------------------------------------------

/** 256 bit acak dalam format hex berkelompok, mis. `3FA9-C1D2-...` (16 kelompok). */
export function generateRecoveryCode(): string {
  return toHex(randomBytes(32)).toUpperCase().match(/.{4}/g)!.join("-");
}

export async function importRecoveryCode(code: string): Promise<CryptoKey> {
  const hex = code.replace(/[^0-9a-f]/gi, "");
  if (hex.length !== 64) throw new Error("Kunci pemulihan harus 64 karakter hex");
  return subtle().importKey("raw", fromHex(hex), "AES-GCM", false, ["encrypt", "decrypt"]);
}

// ---------------------------------------------------------------------------
// Seal / open: menyegel data untuk satu kunci publik (bagian 4.2–4.3)
// ---------------------------------------------------------------------------

async function deriveSealKey(privateKey: CryptoKey, publicKey: CryptoKey, epk: Bytes): Promise<CryptoKey> {
  const shared = await subtle().deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdfKey = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: epk, info: utf8("tirai/seal") },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Menyegel `plaintext` sehingga hanya pemilik kunci privat pasangan `recipient` yang bisa membukanya.
 * `context` mengikat segel ke tujuannya (mis. `tirai/dek/<id>`), jadi segel tidak bisa dipakai ulang di tempat lain.
 */
export async function seal(plaintext: Bytes, recipient: CryptoKey, context: string): Promise<SealedBox> {
  const ephemeral = await generateKeyPair();
  const epk = new Uint8Array(await subtle().exportKey("raw", ephemeral.publicKey));
  const key = await deriveSealKey(ephemeral.privateKey, recipient, epk);
  const box = await aesEncrypt(key, plaintext, utf8(context));
  return { epk: toBase64(epk), ...box };
}

export async function open(box: SealedBox, privateKey: CryptoKey, context: string): Promise<Bytes> {
  const epkBytes = fromBase64(box.epk);
  const epk = await subtle().importKey("raw", epkBytes, EC, true, []);
  const key = await deriveSealKey(privateKey, epk, epkBytes);
  return aesDecrypt(key, box, utf8(context));
}

/** Menyegel kunci privat (mis. kunci unit) untuk penerima lain. Kunci harus extractable. */
export async function sealPrivateKey(privateKey: CryptoKey, recipient: CryptoKey, context: string): Promise<SealedBox> {
  return seal(await exportPrivateKeyBytes(privateKey), recipient, context);
}

export async function openPrivateKey(
  box: SealedBox,
  privateKey: CryptoKey,
  context: string,
  extractable = false,
): Promise<CryptoKey> {
  return importPrivateKeyBytes(await open(box, privateKey, context), extractable);
}

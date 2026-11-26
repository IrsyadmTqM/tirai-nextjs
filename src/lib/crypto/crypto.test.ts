import { describe, expect, it } from "vitest";
import {
  decryptRecord,
  deriveUserKeys,
  encryptRecord,
  exportPublicKey,
  generateDataKey,
  generateKeyPair,
  generateRecoveryCode,
  importPublicKey,
  importRecoveryCode,
  type MustahikPrivateData,
  open,
  openDataKey,
  openPrivateKey,
  randomBytes,
  seal,
  sealDataKey,
  sealPrivateKey,
  unitKeyContext,
  unwrapPrivateKey,
  utf8,
  wrapPrivateKey,
} from "./index";

// Iterasi kecil supaya test cepat; produksi memakai KDF_ITERATIONS.
const ITER = 1_000;

const sample: MustahikPrivateData = {
  fullName: "Siti Contoh",
  nik: "3201010101010001",
  phone: "081200000000",
  address: "Jl. Contoh No. 1",
  monthlyIncome: 750_000,
  dependents: 3,
  notes: "Data fiktif untuk pengujian",
};

describe("deriveUserKeys", () => {
  it("menghasilkan authKey yang sama untuk password dan salt yang sama", async () => {
    const salt = randomBytes(16);
    const a = await deriveUserKeys("rahasia-panjang", salt, ITER);
    const b = await deriveUserKeys("rahasia-panjang", salt, ITER);
    expect(a.authKey).toBe(b.authKey);
  });

  it("menghasilkan authKey berbeda untuk password atau salt berbeda", async () => {
    const salt = randomBytes(16);
    const a = await deriveUserKeys("rahasia-panjang", salt, ITER);
    const b = await deriveUserKeys("rahasia-lain", salt, ITER);
    const c = await deriveUserKeys("rahasia-panjang", randomBytes(16), ITER);
    expect(a.authKey).not.toBe(b.authKey);
    expect(a.authKey).not.toBe(c.authKey);
  });

  it("kek tidak bisa diekspor (tidak pernah bisa dikirim ke server)", async () => {
    const { kek } = await deriveUserKeys("rahasia-panjang", randomBytes(16), ITER);
    expect(kek.extractable).toBe(false);
  });
});

describe("kunci privat pengguna", () => {
  it("bisa dibuka dengan password yang benar dan menjadi non-extractable", async () => {
    const salt = randomBytes(16);
    const { kek } = await deriveUserKeys("rahasia-panjang", salt, ITER);
    const pair = await generateKeyPair();
    const wrapped = await wrapPrivateKey(pair.privateKey, kek);

    const { kek: kek2 } = await deriveUserKeys("rahasia-panjang", salt, ITER);
    const unwrapped = await unwrapPrivateKey(wrapped, kek2);
    expect(unwrapped.extractable).toBe(false);
  });

  it("gagal dibuka dengan password yang salah", async () => {
    const salt = randomBytes(16);
    const { kek } = await deriveUserKeys("rahasia-panjang", salt, ITER);
    const wrapped = await wrapPrivateKey((await generateKeyPair()).privateKey, kek);
    const { kek: wrong } = await deriveUserKeys("tebakan-salah", salt, ITER);
    await expect(unwrapPrivateKey(wrapped, wrong)).rejects.toThrow();
  });

  it("bisa dipulihkan dengan kunci pemulihan", async () => {
    const pair = await generateKeyPair();
    const code = generateRecoveryCode();
    expect(code).toMatch(/^([0-9A-F]{4}-){15}[0-9A-F]{4}$/);
    const wrapped = await wrapPrivateKey(pair.privateKey, await importRecoveryCode(code));
    const restored = await unwrapPrivateKey(wrapped, await importRecoveryCode(code.toLowerCase()));
    expect(restored.type).toBe("private");
  });
});

describe("seal / open", () => {
  it("hanya penerima yang bisa membuka", async () => {
    const alice = await generateKeyPair();
    const eve = await generateKeyPair();
    const box = await seal(utf8("halo"), alice.publicKey, "tirai/test");
    expect(new TextDecoder().decode(await open(box, alice.privateKey, "tirai/test"))).toBe("halo");
    await expect(open(box, eve.privateKey, "tirai/test")).rejects.toThrow();
  });

  it("gagal jika konteks berbeda (segel tidak bisa dipakai ulang di tempat lain)", async () => {
    const alice = await generateKeyPair();
    const box = await seal(utf8("halo"), alice.publicKey, "tirai/a");
    await expect(open(box, alice.privateKey, "tirai/b")).rejects.toThrow();
  });

  it("kunci publik bisa diekspor dan diimpor ulang", async () => {
    const alice = await generateKeyPair();
    const pub = await importPublicKey(await exportPublicKey(alice.publicKey));
    const box = await seal(utf8("halo"), pub, "tirai/test");
    expect(await open(box, alice.privateKey, "tirai/test")).toBeInstanceOf(Uint8Array);
  });
});

describe("alur lengkap data mustahik", () => {
  it("amil anggota unit bisa membaca; amil luar unit tidak", async () => {
    const unitId = crypto.randomUUID();
    const recordId = crypto.randomUUID();
    const unit = await generateKeyPair();
    const amil = await generateKeyPair();
    const outsider = await generateKeyPair();

    // Kunci privat unit disegel ke kunci publik amil anggota.
    const sealedUnitKey = await sealPrivateKey(unit.privateKey, amil.publicKey, unitKeyContext(unitId));

    // Browser amil mengenkripsi asesmen dan menyegel DEK ke kunci publik unit.
    const dek = await generateDataKey();
    const ciphertext = await encryptRecord(sample, dek, recordId);
    const sealedDek = await sealDataKey(dek, unit.publicKey, recordId);

    // Membuka: kunci amil → kunci unit → DEK → data.
    const unitPriv = await openPrivateKey(sealedUnitKey, amil.privateKey, unitKeyContext(unitId));
    const opened = await openDataKey(sealedDek, unitPriv, recordId);
    expect(await decryptRecord(ciphertext, opened, recordId)).toEqual(sample);

    await expect(openPrivateKey(sealedUnitKey, outsider.privateKey, unitKeyContext(unitId))).rejects.toThrow();
  });

  it("ciphertext tidak bisa dipindahkan ke record lain (AAD)", async () => {
    const recordId = crypto.randomUUID();
    const dek = await generateDataKey();
    const ciphertext = await encryptRecord(sample, dek, recordId);
    await expect(decryptRecord(ciphertext, dek, crypto.randomUUID())).rejects.toThrow();
  });

  it("ciphertext yang diubah satu bit ditolak", async () => {
    const recordId = crypto.randomUUID();
    const dek = await generateDataKey();
    const ciphertext = await encryptRecord(sample, dek, recordId);
    const bytes = Uint8Array.from(atob(ciphertext.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    const tampered = { ...ciphertext, ct: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptRecord(tampered, dek, recordId)).rejects.toThrow();
  });
});

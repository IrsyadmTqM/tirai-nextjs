// Mengisi data demo. Semua nama, NIK, dan alamat di sini FIKTIF.
//
// Akun demo (password sama untuk semua, hanya untuk pengembangan lokal):
//   amil.pusat   Amil di Unit Pusat (memegang kunci Unit Pusat)
//   amil.barat   Amil di Unit Barat (TIDAK bisa membaca data Unit Pusat)
//   auditor      Auditor (log audit dan laporan agregat, tanpa identitas)
//   donatur      Donatur
//   mustahik     Mustahik yang punya akun (bisa melihat siapa yang membuka datanya)
//
// Proses seed memakai modul kripto yang sama dengan browser, jadi data demo
// terenkripsi dengan cara yang persis sama seperti data asli.

import { count } from "drizzle-orm";
import { appendAudit } from "../src/lib/audit";
import { hashAuthKey } from "../src/lib/auth/password";
import { newMustahikCode } from "../src/lib/codes";
import { CONSENT_VERSION } from "../src/lib/consent";
import {
  KDF_ITERATIONS,
  type MustahikPrivateData,
  deriveUserKeys,
  encryptRecord,
  exportPublicKey,
  generateDataKey,
  generateKeyPair,
  generateRecoveryCode,
  importRecoveryCode,
  randomBytes,
  sealDataKey,
  sealPrivateKey,
  toBase64,
  unitKeyContext,
  wrapPrivateKey,
} from "../src/lib/crypto";
import { type Db, createDb } from "../src/lib/db/client";
import { ASNAF, PROGRAMS, donations, mustahik, mustahikKeys, unitMembers, units, users } from "../src/lib/db/schema";
import type { Role } from "../src/lib/rbac";

const DEFAULT_DEMO_PASSWORD = "tirai-demo-2026";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

// Password bawaan tertulis di README publik. Jangan pakai untuk basis data yang bisa
// diakses dari internet (mis. Neon untuk deploy), karena siapa pun bisa masuk sebagai amil.
function assertSafeDemoPassword() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const host = new URL(url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  if (!isLocal && DEMO_PASSWORD === DEFAULT_DEMO_PASSWORD) {
    throw new Error(
      `Basis data ${host} bukan lokal. Isi DEMO_PASSWORD dengan password baru, jangan pakai password bawaan dari README.`,
    );
  }
  if (!isLocal && DEMO_PASSWORD.length < 12) {
    throw new Error("DEMO_PASSWORD untuk basis data publik minimal 12 karakter.");
  }
}

async function createUser(db: Db, username: string, displayName: string, role: Role) {
  const salt = randomBytes(16);
  const { authKey, kek } = await deriveUserKeys(DEMO_PASSWORD, salt, KDF_ITERATIONS);
  const pair = await generateKeyPair();
  const recovery = await importRecoveryCode(generateRecoveryCode());
  const [row] = await db
    .insert(users)
    .values({
      username,
      displayName,
      role,
      authHash: await hashAuthKey(authKey),
      kdfSalt: toBase64(salt),
      kdfIterations: KDF_ITERATIONS,
      publicKey: await exportPublicKey(pair.publicKey),
      wrappedPrivateKey: await wrapPrivateKey(pair.privateKey, kek),
      recoveryWrappedPrivateKey: await wrapPrivateKey(pair.privateKey, recovery),
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    })
    .returning({ id: users.id });
  await appendAudit(db, { actorId: row.id, action: "user.register", resourceType: "user", resourceId: row.id });
  return { id: row.id, publicKey: pair.publicKey };
}

async function createUnit(db: Db, name: string, amil: { id: string; publicKey: CryptoKey }) {
  const pair = await generateKeyPair();
  const [unit] = await db
    .insert(units)
    .values({ name, publicKey: await exportPublicKey(pair.publicKey) })
    .returning({ id: units.id });
  await db.insert(unitMembers).values({
    unitId: unit.id,
    userId: amil.id,
    sealedUnitKey: await sealPrivateKey(pair.privateKey, amil.publicKey, unitKeyContext(unit.id)),
  });
  await appendAudit(db, { actorId: amil.id, action: "unit.grant", resourceType: "unit", resourceId: unit.id });
  return { id: unit.id, publicKey: pair.publicKey };
}

async function createMustahik(
  db: Db,
  opts: {
    unit: { id: string; publicKey: CryptoKey };
    amilId: string;
    asnaf: (typeof ASNAF)[number];
    district: string;
    data: MustahikPrivateData;
    account?: { id: string; publicKey: CryptoKey };
  },
) {
  const id = crypto.randomUUID();
  const dek = await generateDataKey();
  await db.insert(mustahik).values({
    id,
    code: newMustahikCode(),
    unitId: opts.unit.id,
    userId: opts.account?.id ?? null,
    asnaf: opts.asnaf,
    district: opts.district,
    status: "terverifikasi",
    ciphertext: await encryptRecord(opts.data, dek, id),
    createdBy: opts.amilId,
  });
  await db.insert(mustahikKeys).values({
    mustahikId: id,
    recipientType: "unit",
    recipientId: opts.unit.id,
    sealedKey: await sealDataKey(dek, opts.unit.publicKey, id),
  });
  if (opts.account) {
    await db.insert(mustahikKeys).values({
      mustahikId: id,
      recipientType: "user",
      recipientId: opts.account.id,
      sealedKey: await sealDataKey(dek, opts.account.publicKey, id),
    });
  }
  await appendAudit(db, {
    actorId: opts.amilId,
    action: "mustahik.create",
    resourceType: "mustahik",
    resourceId: id,
    subjectUserId: opts.account?.id ?? null,
  });
  return id;
}

async function main() {
  assertSafeDemoPassword();
  const handle = await createDb();
  const { db } = handle;

  const [{ value: existing }] = await db.select({ value: count() }).from(users);
  if (existing > 0) {
    console.log("Data sudah ada, seed dilewati. Jalankan `npm run db:reset` untuk mengulang dari awal.");
    await handle.close();
    return;
  }

  console.log("Membuat akun demo (PBKDF2 600rb iterasi per akun, tunggu sebentar)...");
  const amilPusat = await createUser(db, "amil.pusat", "Hasan Basri", "amil");
  const amilBarat = await createUser(db, "amil.barat", "Nurul Hidayah", "amil");
  await createUser(db, "auditor", "Dewan Pengawas Syariah", "auditor");
  const donatur = await createUser(db, "donatur", "Budi Santoso", "donatur");
  const akunMustahik = await createUser(db, "mustahik", "Siti Aminah", "mustahik");

  const unitPusat = await createUnit(db, "Unit Pusat", amilPusat);
  const unitBarat = await createUnit(db, "Unit Barat", amilBarat);

  const sitiId = await createMustahik(db, {
    unit: unitPusat,
    amilId: amilPusat.id,
    asnaf: "miskin",
    district: "Cibeunying Kaler",
    account: akunMustahik,
    data: {
      fullName: "Siti Aminah",
      nik: "3273000000000001",
      phone: "081200000001",
      address: "Jl. Fiktif No. 12, RT 03/RW 05",
      monthlyIncome: 900_000,
      dependents: 3,
      notes: "Janda, menanggung tiga anak usia sekolah. Bekerja sebagai buruh cuci harian.",
    },
  });
  await createMustahik(db, {
    unit: unitPusat,
    amilId: amilPusat.id,
    asnaf: "fakir",
    district: "Coblong",
    data: {
      fullName: "Ahmad Fauzi",
      nik: "3273000000000002",
      phone: "081200000002",
      address: "Gg. Contoh No. 4",
      monthlyIncome: 0,
      dependents: 2,
      notes: "Lansia, tidak lagi bekerja. Tinggal bersama istri yang sakit.",
    },
  });
  await createMustahik(db, {
    unit: unitPusat,
    amilId: amilPusat.id,
    asnaf: "gharim",
    district: "Sukajadi",
    data: {
      fullName: "Rina Marlina",
      nik: "3273000000000003",
      phone: "081200000003",
      address: "Jl. Fiktif No. 7",
      monthlyIncome: 1_500_000,
      dependents: 1,
      notes: "Terlilit utang biaya pengobatan anak.",
    },
  });
  await createMustahik(db, {
    unit: unitBarat,
    amilId: amilBarat.id,
    asnaf: "ibnu_sabil",
    district: "Cimahi Selatan",
    data: {
      fullName: "Dedi Kurniawan",
      nik: "3277000000000004",
      phone: "081200000004",
      address: "Terminal Fiktif",
      monthlyIncome: 0,
      dependents: 0,
      notes: "Perantau kehabisan bekal dalam perjalanan pulang.",
    },
  });

  // Contoh jejak pembukaan data, supaya timeline mustahik tidak kosong saat demo.
  await appendAudit(db, {
    actorId: amilPusat.id,
    action: "mustahik.open",
    resourceType: "mustahik",
    resourceId: sitiId,
    subjectUserId: akunMustahik.id,
    purpose: "Verifikasi kelayakan penerima bantuan pendidikan",
  });

  const demoDonations: { program: (typeof PROGRAMS)[number]; amount: number; isAnonymous: boolean }[] = [
    { program: "zakat_mal", amount: 2_500_000, isAnonymous: false },
    { program: "sedekah", amount: 100_000, isAnonymous: true },
    { program: "infak", amount: 250_000, isAnonymous: false },
    { program: "wakaf", amount: 1_000_000, isAnonymous: true },
  ];
  for (const d of demoDonations) {
    const [row] = await db
      .insert(donations)
      .values({ donorId: donatur.id, ...d })
      .returning({ id: donations.id });
    // Donasi anonim tidak mencatat siapa pelakunya di log audit.
    await appendAudit(db, {
      actorId: d.isAnonymous ? null : donatur.id,
      action: "donation.create",
      resourceType: "donation",
      resourceId: row.id,
    });
  }

  console.log("✓ Seed selesai. Akun demo: amil.pusat, amil.barat, auditor, donatur, mustahik (lihat README).");
  await handle.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Skema basis data Tirai (docs/ARSITEKTUR.md bagian 8).
// Catatan: file ini juga dibaca drizzle-kit, jadi pakai import relatif (bukan "@/").

import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Encrypted, SealedBox } from "../crypto/primitives";
import { ROLES } from "../rbac";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ROLES);

// QS. At-Taubah: 60, delapan golongan penerima zakat.
export const ASNAF = ["fakir", "miskin", "amil", "mualaf", "riqab", "gharim", "fisabilillah", "ibnu_sabil"] as const;
export const asnafEnum = pgEnum("asnaf", ASNAF);

export const MUSTAHIK_STATUS = ["diajukan", "terverifikasi", "ditolak"] as const;
export const mustahikStatusEnum = pgEnum("mustahik_status", MUSTAHIK_STATUS);

export const PROGRAMS = ["zakat_mal", "zakat_fitrah", "infak", "sedekah", "wakaf"] as const;
export const programEnum = pgEnum("program", PROGRAMS);

export const keyRecipientEnum = pgEnum("key_recipient", ["unit", "user"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: roleEnum("role").notNull().default("donatur"),
  // scrypt(authKey). Password asli tidak pernah sampai ke server.
  authHash: text("auth_hash").notNull(),
  kdfSalt: text("kdf_salt").notNull(),
  kdfIterations: integer("kdf_iterations").notNull(),
  publicKey: text("public_key").notNull(),
  wrappedPrivateKey: jsonb("wrapped_private_key").$type<Encrypted>().notNull(),
  recoveryWrappedPrivateKey: jsonb("recovery_wrapped_private_key").$type<Encrypted>().notNull(),
  consentVersion: text("consent_version").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  // SHA-256 dari token di cookie; token asli tidak disimpan.
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  publicKey: text("public_key").notNull(),
  createdAt: createdAt(),
});

export const unitMembers = pgTable(
  "unit_members",
  {
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Kunci privat unit, disegel ke kunci publik amil ini.
    sealedUnitKey: jsonb("sealed_unit_key").$type<SealedBox>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.unitId, t.userId] })],
);

export const mustahik = pgTable(
  "mustahik",
  {
    // Dibuat di browser karena dipakai sebagai AAD saat enkripsi.
    id: uuid("id").primaryKey(),
    code: text("code").notNull().unique(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    asnaf: asnafEnum("asnaf").notNull(),
    district: text("district").notNull(),
    status: mustahikStatusEnum("status").notNull().default("diajukan"),
    ciphertext: jsonb("ciphertext").$type<Encrypted>().notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("mustahik_unit_idx").on(t.unitId), index("mustahik_user_idx").on(t.userId)],
);

export const mustahikKeys = pgTable(
  "mustahik_keys",
  {
    mustahikId: uuid("mustahik_id")
      .notNull()
      .references(() => mustahik.id, { onDelete: "cascade" }),
    recipientType: keyRecipientEnum("recipient_type").notNull(),
    recipientId: uuid("recipient_id").notNull(),
    sealedKey: jsonb("sealed_key").$type<SealedBox>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.mustahikId, t.recipientType, t.recipientId] }),
    index("mustahik_keys_recipient_idx").on(t.recipientId),
  ],
);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // NULL setelah akun donatur dihapus; nominal tetap ada untuk akuntabilitas.
    donorId: uuid("donor_id").references(() => users.id, { onDelete: "set null" }),
    program: programEnum("program").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("donations_donor_idx").on(t.donorId)],
);

// Tanpa foreign key ke users: entri harus tetap ada setelah akun dihapus.
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    subjectUserId: uuid("subject_user_id"),
    purpose: text("purpose"),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull().unique(),
  },
  (t) => [index("audit_subject_idx").on(t.subjectUserId), index("audit_actor_idx").on(t.actorId)],
);

// Query baca untuk halaman (Server Components). Setiap fungsi menerima ID
// pengguna yang sudah diverifikasi oleh DAL, bukan dari input klien.

import "server-only";
import { and, count, desc, eq, inArray, sum } from "drizzle-orm";
import { type ChainedEntry, verifyAuditChain } from "@/lib/audit-chain";
import { getDb, schema } from "@/lib/db";

const { users, units, unitMembers, mustahik, donations, auditLog } = schema;

export async function getMyUnits(userId: string) {
  const db = await getDb();
  return db
    .select({ id: units.id, name: units.name, publicKey: units.publicKey })
    .from(unitMembers)
    .innerJoin(units, eq(units.id, unitMembers.unitId))
    .where(eq(unitMembers.userId, userId));
}

export async function listMustahikForAmil(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: mustahik.id,
      code: mustahik.code,
      asnaf: mustahik.asnaf,
      district: mustahik.district,
      status: mustahik.status,
      createdAt: mustahik.createdAt,
      unitName: units.name,
    })
    .from(mustahik)
    .innerJoin(units, eq(units.id, mustahik.unitId))
    .innerJoin(unitMembers, and(eq(unitMembers.unitId, mustahik.unitId), eq(unitMembers.userId, userId)))
    .orderBy(desc(mustahik.createdAt));
}

/** Semua donasi untuk amil. Nama donatur anonim diganti "Hamba Allah" di sini, sebelum sampai ke halaman. */
export async function listAllDonations() {
  const db = await getDb();
  const rows = await db
    .select({
      id: donations.id,
      program: donations.program,
      amount: donations.amount,
      isAnonymous: donations.isAnonymous,
      createdAt: donations.createdAt,
      donorName: users.displayName,
    })
    .from(donations)
    .leftJoin(users, eq(users.id, donations.donorId))
    .orderBy(desc(donations.createdAt));
  return rows.map(({ donorName, ...r }) => ({
    ...r,
    donorName: r.isAnonymous || !donorName ? "Hamba Allah" : donorName,
  }));
}

export async function listMyDonations(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: donations.id,
      program: donations.program,
      amount: donations.amount,
      isAnonymous: donations.isAnonymous,
      createdAt: donations.createdAt,
    })
    .from(donations)
    .where(eq(donations.donorId, userId))
    .orderBy(desc(donations.createdAt));
}

export async function donationTotalsByProgram() {
  const db = await getDb();
  const rows = await db
    .select({ program: donations.program, total: sum(donations.amount), n: count() })
    .from(donations)
    .groupBy(donations.program);
  return rows.map((r) => ({ program: r.program, total: Number(r.total ?? 0), n: r.n }));
}

export async function mustahikCounts() {
  const db = await getDb();
  const byAsnaf = await db.select({ asnaf: mustahik.asnaf, n: count() }).from(mustahik).groupBy(mustahik.asnaf);
  const byStatus = await db.select({ status: mustahik.status, n: count() }).from(mustahik).groupBy(mustahik.status);
  return { byAsnaf, byStatus, total: byAsnaf.reduce((a, r) => a + r.n, 0) };
}

export async function auditOverview(limit = 100) {
  const db = await getDb();
  const all = (await db.select().from(auditLog).orderBy(auditLog.id)) as ChainedEntry[];
  const verification = verifyAuditChain(all);
  const recent = all.slice(-limit).reverse();
  const actorIds = [...new Set(recent.map((e) => e.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length
    ? await db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.id, actorIds))
    : [];
  const roleOf = new Map(actors.map((a) => [a.id, a.role]));
  // Auditor melihat peran dan ID pendek, bukan nama.
  return {
    verification,
    opens: all.filter((e) => e.action === "mustahik.open").length,
    recent: recent.map((e) => ({ ...e, actorRole: e.actorId ? (roleOf.get(e.actorId) ?? null) : null })),
  };
}

/** Siapa yang membuka data saya, untuk transparansi bagi pemilik data. */
export async function accessLogFor(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      purpose: auditLog.purpose,
      actorName: users.displayName,
      actorRole: users.role,
      actorId: auditLog.actorId,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(eq(auditLog.subjectUserId, userId))
    .orderBy(desc(auditLog.id));
}

export async function activityOf(userId: string, limit = 10) {
  const db = await getDb();
  return db
    .select({ id: auditLog.id, at: auditLog.at, action: auditLog.action })
    .from(auditLog)
    .where(eq(auditLog.actorId, userId))
    .orderBy(desc(auditLog.id))
    .limit(limit);
}

export async function profileOf(userId: string) {
  const db = await getDb();
  const [p] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      consentVersion: users.consentVersion,
      consentAt: users.consentAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return p;
}

export async function assessmentsOf(userId: string) {
  const db = await getDb();
  return db
    .select({ id: mustahik.id, code: mustahik.code, asnaf: mustahik.asnaf, status: mustahik.status })
    .from(mustahik)
    .where(eq(mustahik.userId, userId));
}

// Menulis log audit berantai hash. Menerima `db` sebagai parameter supaya bisa
// dipakai dari route API maupun skrip seed.

import { desc, sql } from "drizzle-orm";
import { type AuditFields, GENESIS_HASH, computeAuditHash } from "./audit-chain";
import type { Db } from "./db/client";
import { auditLog } from "./db/schema";

// Kunci advisory acak tapi tetap; menyerialkan penulisan log supaya rantai tidak bercabang.
const AUDIT_LOCK_KEY = 7_302_118;

export type AuditInput = Omit<AuditFields, "at" | "resourceId" | "subjectUserId" | "purpose" | "actorId"> &
  Partial<Pick<AuditFields, "resourceId" | "subjectUserId" | "purpose" | "actorId">>;

export async function appendAudit(db: Db, input: AuditInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`);
    const [last] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.id)).limit(1);
    const prevHash = last?.hash ?? GENESIS_HASH;
    const fields: AuditFields = {
      at: new Date(),
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      subjectUserId: input.subjectUserId ?? null,
      purpose: input.purpose ?? null,
    };
    await tx.insert(auditLog).values({ ...fields, prevHash, hash: computeAuditHash(prevHash, fields) });
  });
}

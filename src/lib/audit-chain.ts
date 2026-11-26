// Rantai hash log audit (docs/ARSITEKTUR.md bagian 4.5).
// Fungsi murni tanpa akses DB supaya mudah diuji.

import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export type AuditFields = {
  at: Date;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  subjectUserId: string | null;
  purpose: string | null;
};

export type ChainedEntry = AuditFields & { id: number; prevHash: string; hash: string };

/** hash = SHA-256(prevHash ‖ isi entri). Urutan field dikunci lewat array. */
export function computeAuditHash(prevHash: string, e: AuditFields): string {
  const body = JSON.stringify([
    e.at.toISOString(),
    e.actorId,
    e.action,
    e.resourceType,
    e.resourceId,
    e.subjectUserId,
    e.purpose,
  ]);
  return createHash("sha256").update(`${prevHash}\n${body}`).digest("hex");
}

export type ChainVerification = { ok: true; count: number } | { ok: false; count: number; brokenAtId: number };

/** Memeriksa seluruh rantai. `entries` harus terurut berdasarkan id. */
export function verifyAuditChain(entries: ChainedEntry[]): ChainVerification {
  let prev = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.prevHash !== prev || computeAuditHash(prev, entry) !== entry.hash) {
      return { ok: false, count: entries.length, brokenAtId: entry.id };
    }
    prev = entry.hash;
  }
  return { ok: true, count: entries.length };
}

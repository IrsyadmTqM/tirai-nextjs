import { describe, expect, it } from "vitest";
import { type AuditFields, type ChainedEntry, GENESIS_HASH, computeAuditHash, verifyAuditChain } from "./audit-chain";

function buildChain(fields: AuditFields[]): ChainedEntry[] {
  let prev = GENESIS_HASH;
  return fields.map((f, i) => {
    const hash = computeAuditHash(prev, f);
    const entry = { ...f, id: i + 1, prevHash: prev, hash };
    prev = hash;
    return entry;
  });
}

const entry = (action: string, purpose: string | null = null): AuditFields => ({
  at: new Date("2026-11-26T08:00:00.000Z"),
  actorId: "00000000-0000-4000-8000-000000000001",
  action,
  resourceType: "mustahik",
  resourceId: "00000000-0000-4000-8000-000000000002",
  subjectUserId: null,
  purpose,
});

describe("rantai log audit", () => {
  it("rantai yang utuh lolos pemeriksaan", () => {
    const chain = buildChain([entry("mustahik.create"), entry("mustahik.open", "Verifikasi kelayakan")]);
    expect(verifyAuditChain(chain)).toEqual({ ok: true, count: 2 });
  });

  it("mengubah tujuan pembukaan di entri lama terdeteksi", () => {
    const chain = buildChain([entry("mustahik.create"), entry("mustahik.open", "Verifikasi kelayakan"), entry("x")]);
    chain[1] = { ...chain[1], purpose: "Alasan lain" };
    expect(verifyAuditChain(chain)).toEqual({ ok: false, count: 3, brokenAtId: 2 });
  });

  it("menghapus entri di tengah terdeteksi", () => {
    const chain = buildChain([entry("a"), entry("b"), entry("c")]);
    expect(verifyAuditChain([chain[0], chain[2]])).toMatchObject({ ok: false, brokenAtId: 3 });
  });

  it("menghitung ulang hash satu entri tetap terdeteksi di entri berikutnya", () => {
    const chain = buildChain([entry("a"), entry("b"), entry("c")]);
    const forged = { ...chain[1], purpose: "palsu" };
    forged.hash = computeAuditHash(forged.prevHash, forged);
    expect(verifyAuditChain([chain[0], forged, chain[2]])).toMatchObject({ ok: false, brokenAtId: 3 });
  });
});

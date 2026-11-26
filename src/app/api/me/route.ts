import { and, count, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth/dal";
import { destroySession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { HttpError, assertSameOrigin, handle, parseBody } from "@/lib/http";

// GET: ekspor semua data milik pengguna (hak portabilitas, UU PDP).
// Bagian terenkripsi dikirim apa adanya; browser pengguna yang mendekripsinya.
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser("data:own");
    const db = await getDb();
    const { users, donations, mustahik, mustahikKeys, auditLog } = schema;

    const [profile] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        consentVersion: users.consentVersion,
        consentAt: users.consentAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id));

    const myDonations = await db
      .select({
        id: donations.id,
        program: donations.program,
        amount: donations.amount,
        isAnonymous: donations.isAnonymous,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .where(eq(donations.donorId, user.id));

    const assessments = await db
      .select({
        id: mustahik.id,
        code: mustahik.code,
        asnaf: mustahik.asnaf,
        district: mustahik.district,
        status: mustahik.status,
        ciphertext: mustahik.ciphertext,
        sealedKey: mustahikKeys.sealedKey,
      })
      .from(mustahik)
      .innerJoin(
        mustahikKeys,
        and(
          eq(mustahikKeys.mustahikId, mustahik.id),
          eq(mustahikKeys.recipientType, "user"),
          eq(mustahikKeys.recipientId, user.id),
        ),
      )
      .where(eq(mustahik.userId, user.id));

    const activity = await db
      .select({
        at: auditLog.at,
        actorId: auditLog.actorId,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        purpose: auditLog.purpose,
      })
      .from(auditLog)
      .where(or(eq(auditLog.actorId, user.id), eq(auditLog.subjectUserId, user.id)))
      .orderBy(auditLog.id);

    return Response.json(
      { exportedAt: new Date().toISOString(), profile, donations: myDonations, assessments, activity },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

const DeleteBody = z.object({ confirmUsername: z.string() });

// DELETE: hapus akun (hak penghapusan, UU PDP). Rincian di docs/ARSITEKTUR.md bagian 6.
export async function DELETE(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireApiUser("data:own");
    const { confirmUsername } = await parseBody(req, DeleteBody);
    if (confirmUsername.trim().toLowerCase() !== user.username) {
      throw new HttpError(400, "Username konfirmasi tidak cocok");
    }
    const db = await getDb();
    const { users, donations, mustahik, mustahikKeys, unitMembers } = schema;

    // Jangan sampai data satu unit terkunci selamanya karena pemegang kunci terakhir pergi.
    const myUnits = await db
      .select({ unitId: unitMembers.unitId })
      .from(unitMembers)
      .where(eq(unitMembers.userId, user.id));
    if (myUnits.length > 0) {
      const memberCounts = await db
        .select({ unitId: unitMembers.unitId, members: count() })
        .from(unitMembers)
        .where(
          inArray(
            unitMembers.unitId,
            myUnits.map((u) => u.unitId),
          ),
        )
        .groupBy(unitMembers.unitId);
      if (memberCounts.some((u) => u.members <= 1)) {
        throw new HttpError(
          409,
          "Anda satu-satunya pemegang kunci di unit Anda. Berikan akses unit ke amil lain dulu supaya data mustahik tidak terkunci selamanya.",
        );
      }
    }

    await appendAudit(db, { actorId: user.id, action: "user.delete", resourceType: "user", resourceId: user.id });
    await db.transaction(async (tx) => {
      // Crypto-shredding: buang DEK yang disegel untuk pengguna ini.
      await tx
        .delete(mustahikKeys)
        .where(and(eq(mustahikKeys.recipientType, "user"), eq(mustahikKeys.recipientId, user.id)));
      await tx.update(mustahik).set({ userId: null }).where(eq(mustahik.userId, user.id));
      // Nominal donasi tetap ada untuk akuntabilitas lembaga, tapi dilepas dari akun.
      await tx.update(donations).set({ donorId: null, isAnonymous: true }).where(eq(donations.donorId, user.id));
      // Sesi dan keanggotaan unit ikut terhapus lewat ON DELETE CASCADE.
      await tx.delete(users).where(eq(users.id, user.id));
    });
    await destroySession();
    return Response.json({ ok: true });
  });
}

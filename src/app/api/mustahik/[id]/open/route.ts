import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import { HttpError, assertSameOrigin, handle, parseBody } from "@/lib/http";

const Body = z.object({
  purpose: z.string().trim().min(10, "Tuliskan tujuan minimal 10 karakter").max(300),
});

// Satu-satunya jalan untuk mendapatkan ciphertext data mustahik.
// QS. Al-Hujurat: 12 melarang tajassus, jadi setiap pembukaan wajib menyebut
// tujuan dan dicatat SEBELUM data diberikan. Mustahik bisa melihat catatan ini.
export async function POST(req: Request, ctx: RouteContext<"/api/mustahik/[id]/open">) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireApiUser("mustahik:open");
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Data tidak ditemukan");
    const { purpose } = await parseBody(req, Body);
    const db = await getDb();

    const [row] = await db
      .select({
        unitId: schema.mustahik.unitId,
        userId: schema.mustahik.userId,
        ciphertext: schema.mustahik.ciphertext,
        sealedKey: schema.mustahikKeys.sealedKey,
      })
      .from(schema.mustahik)
      .innerJoin(
        schema.mustahikKeys,
        and(
          eq(schema.mustahikKeys.mustahikId, schema.mustahik.id),
          eq(schema.mustahikKeys.recipientType, "unit"),
          eq(schema.mustahikKeys.recipientId, schema.mustahik.unitId),
        ),
      )
      .innerJoin(
        schema.unitMembers,
        and(eq(schema.unitMembers.unitId, schema.mustahik.unitId), eq(schema.unitMembers.userId, user.id)),
      )
      .where(eq(schema.mustahik.id, id))
      .limit(1);
    // Sama-sama 404 untuk "tidak ada" dan "bukan unit Anda", supaya keberadaan data tidak bocor.
    if (!row) throw new HttpError(404, "Data tidak ditemukan");

    await appendAudit(db, {
      actorId: user.id,
      action: "mustahik.open",
      resourceType: "mustahik",
      resourceId: id,
      subjectUserId: row.userId,
      purpose,
    });

    return Response.json(
      { unitId: row.unitId, ciphertext: row.ciphertext, sealedKey: row.sealedKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

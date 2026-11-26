import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth/dal";
import { newMustahikCode } from "@/lib/codes";
import { getDb, schema } from "@/lib/db";
import { HttpError, assertSameOrigin, encryptedSchema, handle, parseBody, sealedBoxSchema } from "@/lib/http";

const Body = z.object({
  id: z.uuid(),
  unitId: z.uuid(),
  asnaf: z.enum(schema.ASNAF),
  // Hanya kecamatan (minimisasi data), alamat lengkap ada di dalam ciphertext.
  district: z.string().trim().min(2).max(60),
  ciphertext: encryptedSchema,
  unitSealedKey: sealedBoxSchema,
});

// Mendaftarkan mustahik. Server hanya menerima ciphertext; isi asesmen
// dienkripsi di browser amil (lihat src/components/mustahik/assessment-wizard.tsx).
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireApiUser("mustahik:create");
    const body = await parseBody(req, Body);
    const db = await getDb();

    const [member] = await db
      .select({ unitId: schema.unitMembers.unitId })
      .from(schema.unitMembers)
      .where(and(eq(schema.unitMembers.unitId, body.unitId), eq(schema.unitMembers.userId, user.id)));
    if (!member) throw new HttpError(403, "Anda bukan anggota unit ini");

    const code = newMustahikCode();
    await db.transaction(async (tx) => {
      await tx.insert(schema.mustahik).values({
        id: body.id,
        code,
        unitId: body.unitId,
        asnaf: body.asnaf,
        district: body.district,
        ciphertext: body.ciphertext,
        createdBy: user.id,
      });
      await tx.insert(schema.mustahikKeys).values({
        mustahikId: body.id,
        recipientType: "unit",
        recipientId: body.unitId,
        sealedKey: body.unitSealedKey,
      });
    });
    await appendAudit(db, { actorId: user.id, action: "mustahik.create", resourceType: "mustahik", resourceId: body.id });
    return Response.json({ id: body.id, code }, { status: 201 });
  });
}

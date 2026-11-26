import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import { assertSameOrigin, handle, parseBody } from "@/lib/http";

const Body = z.object({
  program: z.enum(schema.PROGRAMS),
  amount: z.number().int().min(10_000, "Minimal Rp10.000").max(10_000_000_000),
  // QS. Al-Baqarah: 271 dan hadis "tangan kiri tidak tahu apa yang diberikan tangan kanan".
  isAnonymous: z.boolean(),
});

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await requireApiUser("donation:create");
    const body = await parseBody(req, Body);
    const db = await getDb();
    const [row] = await db
      .insert(schema.donations)
      .values({ donorId: user.id, ...body })
      .returning({ id: schema.donations.id });
    // Donasi anonim tidak mencatat pelaku di log audit, supaya identitas donatur
    // tidak tersebar ke tempat lain selain riwayat miliknya sendiri.
    await appendAudit(db, {
      actorId: body.isAnonymous ? null : user.id,
      action: "donation.create",
      resourceType: "donation",
      resourceId: row.id,
    });
    return Response.json({ id: row.id }, { status: 201 });
  });
}

import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import { handle } from "@/lib/http";

// Materi kunci milik pengguna, semuanya masih terenkripsi.
// Dipakai browser untuk membuka brankas kunci (mis. setelah IndexedDB dibersihkan)
// dan, bagi amil, untuk membuka kunci unit.
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    const db = await getDb();
    const [keys] = await db
      .select({
        kdfSalt: schema.users.kdfSalt,
        kdfIterations: schema.users.kdfIterations,
        publicKey: schema.users.publicKey,
        wrappedPrivateKey: schema.users.wrappedPrivateKey,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    const units = await db
      .select({
        unitId: schema.units.id,
        name: schema.units.name,
        publicKey: schema.units.publicKey,
        sealedUnitKey: schema.unitMembers.sealedUnitKey,
      })
      .from(schema.unitMembers)
      .innerJoin(schema.units, eq(schema.units.id, schema.unitMembers.unitId))
      .where(eq(schema.unitMembers.userId, user.id));
    return Response.json({ ...keys, units }, { headers: { "Cache-Control": "no-store" } });
  });
}

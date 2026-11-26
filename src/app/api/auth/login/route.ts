import { eq } from "drizzle-orm";
import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { DUMMY_AUTH_HASH, verifyAuthKey } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { HttpError, assertSameOrigin, base64Schema, handle, parseBody } from "@/lib/http";

const Body = z.object({
  username: z.string().trim().toLowerCase().min(1).max(32),
  authKey: base64Schema,
});

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const { username, authKey } = await parseBody(req, Body);
    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);

    // Tetap jalankan scrypt walau username tidak ada, supaya waktu respons tidak membocorkan apa pun.
    const valid = await verifyAuthKey(authKey, user?.authHash ?? DUMMY_AUTH_HASH);
    if (!user || !valid) throw new HttpError(401, "Username atau password salah");

    await createSession(user.id);
    await appendAudit(db, { actorId: user.id, action: "auth.login", resourceType: "user", resourceId: user.id });

    // Kunci privat dikirim dalam keadaan terenkripsi; hanya browser (yang tahu password) bisa membukanya.
    return Response.json({ userId: user.id, wrappedPrivateKey: user.wrappedPrivateKey });
  });
}

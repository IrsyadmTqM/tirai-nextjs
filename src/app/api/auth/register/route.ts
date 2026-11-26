import { eq } from "drizzle-orm";
import { z } from "zod";
import { appendAudit } from "@/lib/audit";
import { hashAuthKey } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { CONSENT_VERSION } from "@/lib/consent";
import { KDF_ITERATIONS } from "@/lib/crypto/primitives";
import { getDb, schema } from "@/lib/db";
import { HttpError, assertSameOrigin, base64Schema, encryptedSchema, handle, parseBody } from "@/lib/http";

const Body = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{3,32}$/, "3–32 karakter: huruf kecil, angka, titik, garis bawah"),
  displayName: z.string().trim().min(1).max(80),
  authKey: base64Schema,
  kdfSalt: base64Schema,
  kdfIterations: z.number().int().min(KDF_ITERATIONS),
  publicKey: base64Schema,
  wrappedPrivateKey: encryptedSchema,
  recoveryWrappedPrivateKey: encryptedSchema,
  consent: z.literal(true, "Persetujuan pemrosesan data wajib dicentang"),
});

// Pendaftaran mandiri selalu sebagai donatur. Peran lain diberikan oleh admin.
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const body = await parseBody(req, Body);
    const db = await getDb();

    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, body.username));
    if (taken) throw new HttpError(409, "Username sudah dipakai");

    const [user] = await db
      .insert(schema.users)
      .values({
        username: body.username,
        displayName: body.displayName,
        role: "donatur",
        authHash: await hashAuthKey(body.authKey),
        kdfSalt: body.kdfSalt,
        kdfIterations: body.kdfIterations,
        publicKey: body.publicKey,
        wrappedPrivateKey: body.wrappedPrivateKey,
        recoveryWrappedPrivateKey: body.recoveryWrappedPrivateKey,
        consentVersion: CONSENT_VERSION,
        consentAt: new Date(),
      })
      .returning({ id: schema.users.id });

    await appendAudit(db, { actorId: user.id, action: "user.register", resourceType: "user", resourceId: user.id });
    await createSession(user.id);
    return Response.json({ userId: user.id }, { status: 201 });
  });
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fakeSaltFor } from "@/lib/auth/password";
import { KDF_ITERATIONS } from "@/lib/crypto/primitives";
import { getDb, schema } from "@/lib/db";
import { authSecret } from "@/lib/env";
import { handle, parseBody } from "@/lib/http";

const Body = z.object({ username: z.string().trim().toLowerCase().min(1).max(32) });

// Langkah pertama login: browser butuh salt untuk menurunkan kunci dari password.
// Username yang tidak terdaftar tetap mendapat salt (palsu tapi konsisten),
// jadi endpoint ini tidak bisa dipakai untuk mengecek siapa yang punya akun.
export async function POST(req: Request) {
  return handle(async () => {
    const { username } = await parseBody(req, Body);
    const db = await getDb();
    const [user] = await db
      .select({ salt: schema.users.kdfSalt, iterations: schema.users.kdfIterations })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return Response.json(user ?? { salt: fakeSaltFor(username, authSecret()), iterations: KDF_ITERATIONS });
  });
}

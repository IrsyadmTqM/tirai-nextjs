import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Membungkus route handler: mengubah error menjadi respons JSON yang rapi. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    // Biarkan sinyal internal Next.js (mis. saat prerender) lewat, jangan ditelan.
    unstable_rethrow(err);
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Data tidak valid", issues: z.flattenError(err).fieldErrors }, { status: 400 });
    }
    // Jangan bocorkan detail error ke klien; detail cukup di log server.
    console.error(err);
    return Response.json({ error: "Terjadi kesalahan di server" }, { status: 500 });
  }
}

/**
 * Perlindungan CSRF untuk permintaan yang mengubah data: header Origin harus
 * sama dengan host aplikasi. Browser modern selalu mengirim Origin untuk POST/DELETE.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new HttpError(403, "Permintaan lintas situs ditolak");
  }
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Body harus berupa JSON");
  }
  return schema.parse(body);
}

// Skema yang dipakai berulang.
const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, "Harus base64").max(20_000);
export const encryptedSchema = z.object({ iv: base64, ct: base64 });
export const sealedBoxSchema = z.object({ epk: base64, iv: base64, ct: base64 });
export const base64Schema = base64;

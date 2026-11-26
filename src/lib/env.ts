import "server-only";

const DEV_SECRET = "tirai-dev-secret-jangan-dipakai-di-produksi";

/** Rahasia server untuk HMAC (mis. salt palsu di prelogin). Wajib diisi di produksi. */
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET wajib diisi di produksi");
  return DEV_SECRET;
}

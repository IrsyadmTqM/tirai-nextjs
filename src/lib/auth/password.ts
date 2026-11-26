// Hash scrypt untuk `authKey` yang dikirim browser. Server tidak pernah
// menerima password asli (lihat deriveUserKeys di src/lib/crypto/primitives.ts).

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scryptAsync(secret: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(secret, salt, KEYLEN, { N: n, r, p }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Format: `scrypt$N$r$p$salt$hash` (base64), supaya parameter bisa dinaikkan nanti. */
export async function hashAuthKey(authKey: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(authKey, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyAuthKey(authKey: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(authKey, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash tiruan untuk menyamakan waktu respons login bagi username yang tidak ada. */
export const DUMMY_AUTH_HASH = `scrypt$${N}$${R}$${P}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

/**
 * Salt palsu yang konsisten untuk username yang tidak terdaftar, supaya
 * endpoint prelogin tidak membocorkan siapa saja yang punya akun.
 */
export function fakeSaltFor(username: string, secret: string): string {
  return createHmac("sha256", secret).update(`prelogin:${username}`).digest().subarray(0, 16).toString("base64");
}

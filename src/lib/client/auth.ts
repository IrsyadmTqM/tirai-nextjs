// Alur autentikasi di browser (docs/ARSITEKTUR.md bagian 4.1).
// Password hanya dipakai di sini untuk menurunkan kunci; yang dikirim ke server adalah authKey.

import {
  type Encrypted,
  KDF_ITERATIONS,
  deriveUserKeys,
  exportPublicKey,
  fromBase64,
  generateKeyPair,
  generateRecoveryCode,
  importRecoveryCode,
  randomBytes,
  toBase64,
  toNonExtractable,
  unwrapPrivateKey,
  wrapPrivateKey,
} from "@/lib/crypto";
import { api } from "./api";
import { clearVault, saveUserKey } from "./vault";

export async function registerAccount(input: {
  username: string;
  displayName: string;
  password: string;
}): Promise<{ recoveryCode: string }> {
  const salt = randomBytes(16);
  const { authKey, kek } = await deriveUserKeys(input.password, salt, KDF_ITERATIONS);
  const pair = await generateKeyPair();
  const recoveryCode = generateRecoveryCode();

  const { userId } = await api<{ userId: string }>("/api/auth/register", {
    body: {
      username: input.username,
      displayName: input.displayName,
      authKey,
      kdfSalt: toBase64(salt),
      kdfIterations: KDF_ITERATIONS,
      publicKey: await exportPublicKey(pair.publicKey),
      wrappedPrivateKey: await wrapPrivateKey(pair.privateKey, kek),
      recoveryWrappedPrivateKey: await wrapPrivateKey(pair.privateKey, await importRecoveryCode(recoveryCode)),
      consent: true,
    },
  });
  await saveUserKey(userId, await toNonExtractable(pair.privateKey));
  return { recoveryCode };
}

async function preloginKeys(username: string, password: string) {
  const { salt, iterations } = await api<{ salt: string; iterations: number }>("/api/auth/prelogin", {
    body: { username },
  });
  return deriveUserKeys(password, fromBase64(salt), iterations);
}

export async function login(username: string, password: string): Promise<void> {
  const { authKey, kek } = await preloginKeys(username, password);
  const { userId, wrappedPrivateKey } = await api<{ userId: string; wrappedPrivateKey: Encrypted }>(
    "/api/auth/login",
    { body: { username, authKey } },
  );
  await saveUserKey(userId, await unwrapPrivateKey(wrappedPrivateKey, kek));
}

/** Membuka brankas lagi (mis. di perangkat yang IndexedDB-nya sudah dibersihkan). */
export async function unlockVault(userId: string, password: string): Promise<CryptoKey> {
  const keys = await api<{ kdfSalt: string; kdfIterations: number; wrappedPrivateKey: Encrypted }>("/api/keys/me");
  const { kek } = await deriveUserKeys(password, fromBase64(keys.kdfSalt), keys.kdfIterations);
  let privateKey: CryptoKey;
  try {
    privateKey = await unwrapPrivateKey(keys.wrappedPrivateKey, kek);
  } catch {
    throw new Error("Password salah");
  }
  await saveUserKey(userId, privateKey);
  return privateKey;
}

export async function logout(): Promise<void> {
  await clearVault();
  await api("/api/auth/logout", { body: {} });
}

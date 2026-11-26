import "server-only";
import { connection } from "next/server";
import { type Db, type DbHandle, createDb } from "./client";

// Satu koneksi per proses. Disimpan di globalThis supaya hot reload saat
// `next dev` tidak membuka PGlite berkali-kali pada folder yang sama.
const globalForDb = globalThis as unknown as { tiraiDb?: Promise<DbHandle> };

export async function getDb(): Promise<Db> {
  // Data di sini selalu per permintaan (dan sebagian bersifat pribadi), jadi
  // jangan pernah ikut di-prerender. PGlite berjalan di dalam proses yang sama,
  // sehingga tanpa ini kuerinya bisa selesai saat Next.js mencoba prerender.
  await connection();
  globalForDb.tiraiDb ??= createDb();
  return (await globalForDb.tiraiDb).db;
}

export * as schema from "./schema";

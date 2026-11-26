// Membuat koneksi basis data.
// - DATABASE_URL diisi  → PostgreSQL sungguhan (postgres-js).
// - DATABASE_URL kosong → PGlite (PostgreSQL dalam WebAssembly) di folder .data/,
//   supaya anggota tim bisa menjalankan proyek tanpa memasang PostgreSQL/Docker.
// File ini tidak memakai "server-only" karena juga dipakai skrip migrasi dan seed.

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type DbHandle = { db: Db; kind: "postgres" | "pglite"; close: () => Promise<void> };

export const PGLITE_DIR = process.env.PGLITE_DIR ?? ".data/pglite";

export async function createDb(): Promise<DbHandle> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare: false supaya aman lewat connection pooler (mis. Neon/PgBouncer mode transaksi).
    // Di Vercel tiap instance fungsi punya pool sendiri, jadi pool-nya dibuat kecil.
    const sql = postgres(url, { max: process.env.VERCEL ? 3 : 10, prepare: false, idle_timeout: 20 });
    return { db: drizzle(sql, { schema }) as unknown as Db, kind: "postgres", close: () => sql.end() };
  }
  const { mkdirSync } = await import("node:fs");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  mkdirSync(PGLITE_DIR, { recursive: true });
  const client = new PGlite(PGLITE_DIR);
  return { db: drizzle(client, { schema }) as unknown as Db, kind: "pglite", close: () => client.close() };
}

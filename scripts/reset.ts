// Menghapus basis data PGlite lokal. Sengaja tidak menyentuh PostgreSQL sungguhan.
import { rmSync } from "node:fs";
import { PGLITE_DIR } from "../src/lib/db/client";

if (process.env.DATABASE_URL) {
  console.error("DATABASE_URL terisi. Reset hanya untuk PGlite lokal; hapus basis data PostgreSQL secara manual.");
  process.exit(1);
}
rmSync(PGLITE_DIR, { recursive: true, force: true });
console.log(`✓ ${PGLITE_DIR} dihapus`);

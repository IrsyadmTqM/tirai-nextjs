import { defineConfig } from "drizzle-kit";

// Hanya dipakai untuk `npm run db:generate` (membuat file migrasi SQL dari schema.ts).
// Migrasi dijalankan oleh scripts/migrate.ts, yang mendukung PGlite dan PostgreSQL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});

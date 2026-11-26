// Menjalankan migrasi SQL di folder drizzle/ ke PGlite atau PostgreSQL.
import { createDb } from "../src/lib/db/client";

async function main() {
  const handle = await createDb();
  const migrationsFolder = "drizzle";
  if (handle.kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(handle.db as any, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(handle.db as any, { migrationsFolder });
  }
  console.log(`✓ Migrasi selesai (${handle.kind})`);
  await handle.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

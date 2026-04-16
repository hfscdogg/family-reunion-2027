import { createTables, seedOptions } from "../lib/db";

async function main() {
  console.log("Creating tables...");
  await createTables();
  console.log("Tables created.");

  console.log("Seeding default options...");
  await seedOptions();
  console.log("Seed data inserted.");

  console.log("Done! Database is ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});

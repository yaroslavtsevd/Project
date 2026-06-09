import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, all, esc } from "./dbClient.js";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, "..", "..", "migrations");

interface MigrationRow {
  filename: string;
}

/**
 * Execute a multi-statement SQL string using db.exec().
 * db.run() only handles a single statement; migration files often have many.
 */
function execMulti(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

export async function migrate(): Promise<void> {
  // Enable foreign key enforcement for this connection
  await run("PRAGMA foreign_keys = ON;");

  // Bootstrap the migrations tracking table
  await run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id        INTEGER PRIMARY KEY,
      filename  TEXT    NOT NULL UNIQUE,
      appliedAt TEXT    NOT NULL
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  const applied = await all<MigrationRow>(
    "SELECT filename FROM schema_migrations ORDER BY filename;",
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8").trim();
    if (!sql) continue;

    // Use exec() to support multi-statement migration files
    await execMulti(sql);

    const now = new Date().toISOString();
    await run(`
      INSERT INTO schema_migrations (filename, appliedAt)
      VALUES ('${esc(file)}', '${now}');
    `);
    console.log(`[DB] Migration applied: ${file}`);
  }

  console.log("[DB] All migrations up to date.");
}

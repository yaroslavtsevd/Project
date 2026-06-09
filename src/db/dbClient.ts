import { db } from "./db.js";

/** Escape a string value for safe inline SQL interpolation. */
export function esc(value: string): string {
  return String(value).replace(/'/g, "''");
}

/** Log SQL in non-production environments. */
function logSql(sql: string): void {
  if (process.env["NODE_ENV"] !== "production") {
    console.log("[SQL]", sql.trim().replace(/\s+/g, " "));
  }
}

/** SELECT — returns an array of rows. Accepts optional parameterised values. */
export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  logSql(sql);
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => (err ? reject(err) : resolve(rows)));
  });
}

/** SELECT — returns one row or undefined. Accepts optional parameterised values. */
export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  logSql(sql);
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => (err ? reject(err) : resolve(row)));
  });
}

/** INSERT / UPDATE / DELETE — returns { lastID, changes }. Accepts optional parameterised values. */
export function run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
  logSql(sql);
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: { lastID: number; changes: number }, err: Error | null) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Execute multiple operations inside a single SQLite transaction.
 */
export async function transaction(operations: (() => Promise<unknown>)[]): Promise<void> {
  await run("BEGIN TRANSACTION;");
  try {
    for (const op of operations) {
      await op();
    }
    await run("COMMIT;");
    console.log("[DB] Transaction committed successfully.");
  } catch (err) {
    await run("ROLLBACK;");
    console.error("[DB] Transaction rolled back due to error:", err);
    throw err;
  }
}

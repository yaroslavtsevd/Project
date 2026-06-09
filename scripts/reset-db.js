/**
 * Reset database — removes app.db so next `npm run seed` starts fresh.
 * Run: node scripts/reset-db.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "app.db");

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("[reset-db] Removed:", dbPath);
} else {
  console.log("[reset-db] No DB found at:", dbPath, "(nothing to do)");
}
console.log("[reset-db] Done. Run `npm run seed` to reinitialize.");

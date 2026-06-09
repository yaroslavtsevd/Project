import { cpSync, existsSync, mkdirSync } from "node:fs";

if (!existsSync("dist")) {
  mkdirSync("dist", { recursive: true });
}

cpSync("public", "dist/public", { recursive: true });
console.log("public copied to dist/public");

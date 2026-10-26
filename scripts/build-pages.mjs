import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const apiDir = path.join(process.cwd(), "src", "app", "api");
const backupDir = path.join(process.cwd(), "src", "api_backup");

try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, backupDir);
  }
  process.env.NEXT_EXPORT = "true";
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, NEXT_EXPORT: "true" },
  });
} finally {
  if (fs.existsSync(backupDir)) {
    fs.renameSync(backupDir, apiDir);
  }
}

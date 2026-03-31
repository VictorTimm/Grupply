import { appendFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "grupply", ".next");
const dest = join(root, ".next");

// #region agent log
const logLine =
  JSON.stringify({
    sessionId: "97e223",
    hypothesisId: "H5",
    location: "scripts/sync-next-output.mjs",
    message: "sync attempt",
    data: { srcExists: existsSync(src), cwd: process.cwd() },
    timestamp: Date.now(),
  }) + "\n";
try {
  appendFileSync(join(root, "debug-97e223.log"), logLine);
} catch {
  /* ignore */
}
fetch("http://127.0.0.1:7838/ingest/071fdb3d-186d-4d94-bc25-a5093692a8a6", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "97e223" },
  body: logLine.trim(),
}).catch(() => {});
// #endregion

if (!existsSync(src)) {
  console.error("[sync-next-output] Missing build output:", src);
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[sync-next-output] Copied grupply/.next -> .next");

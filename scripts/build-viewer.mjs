/**
 * build-viewer.mjs — build the That Open viewer and stage it into media/viewer/.
 *
 * The viewer source lives in this repo under viewer/. This script builds it (Vite → dist/) and
 * copies the runtime files the bundled pnt_server expects, mirroring the viewer/ layout so
 * `_BASE = __file__/../..` resolves dist/ and dashboard/ correctly:
 *
 *   media/viewer/
 *     ├─ dist/        (Vite build — includes worker/worker.mjs)
 *     ├─ dashboard/   (Dash/PyWebView dashboard assets)
 *     └─ server/      (pnt_server.py)
 *
 * Override the viewer source location with env PYNET_VIEWER_DIR.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const viewerSrc = process.env.PYNET_VIEWER_DIR ?? resolve(repoRoot, "viewer");

if (!existsSync(viewerSrc)) {
  console.error(
    `[build-viewer] Viewer source not found at: ${viewerSrc}\n` +
      `Set PYNET_VIEWER_DIR to the viewer directory.`
  );
  process.exit(1);
}

const run = (cmd, cwd) => {
  console.log(`[build-viewer] $ ${cmd}  (cwd: ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

// 1. Build the viewer (install deps if missing).
if (!existsSync(join(viewerSrc, "node_modules"))) {
  run("npm install", viewerSrc);
}
run("npm run build", viewerSrc);

// 2. Stage runtime files into media/viewer/.
const dest = join(repoRoot, "media", "viewer");
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const copy = (rel, required = true) => {
  const from = join(viewerSrc, rel);
  if (!existsSync(from)) {
    if (required) {
      console.error(`[build-viewer] Missing required path: ${from}`);
      process.exit(1);
    }
    console.warn(`[build-viewer] Skipping optional path: ${rel}`);
    return;
  }
  cpSync(from, join(dest, rel), { recursive: true });
  console.log(`[build-viewer] copied ${rel}`);
};

copy("dist");
copy("dashboard", false);
mkdirSync(join(dest, "server"), { recursive: true });
cpSync(join(viewerSrc, "server", "pnt_server.py"), join(dest, "server", "pnt_server.py"));
console.log("[build-viewer] copied server/pnt_server.py");

console.log(`[build-viewer] Done → ${dest}`);

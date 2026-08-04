/**
 * stage-library.mjs — stage the PyNet reference markdown into media/library/.
 *
 * These are the routing docs an AI assistant needs *before* it writes a script for an Autodesk
 * host: the CLAUDE.md router plus the per-host guides in docs/. At runtime the extension copies
 * them to %APPDATA%\Pynet\Library so they sit at a stable, well-known path the assistant can be
 * pointed at — no need for the user to know how to open a folder in VS Code.
 *
 * Deliberately NOT staged: .claude/commands/ (the workflow skills). Those are licensed product,
 * not documentation.
 *
 * Source repo is the sibling PyNetLibrary; override with env PYNET_VIEWER_DIR's parent or
 * PYNET_LIBRARY_DIR.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const librarySrc =
  process.env.PYNET_LIBRARY_DIR ?? resolve(repoRoot, "..", "PyNetLibrary");

if (!existsSync(join(librarySrc, "CLAUDE.md"))) {
  console.error(
    `[stage-library] PyNetLibrary not found at: ${librarySrc}\n` +
      `Set PYNET_LIBRARY_DIR to the PyNetLibrary checkout.`
  );
  process.exit(1);
}

const dest = join(repoRoot, "media", "library");
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

// The router assumes it sits inside a full PyNetLibrary checkout — it tells the assistant to
// Glob 01_Scripts/, read the stubs and check AI_History/. None of that ships here, so say so up
// front rather than let the assistant hunt for directories that do not exist.
const PREAMBLE = `> **This is the standalone reference copy of the PyNET router**, deployed by the
> PyNet Platform VS Code extension to \`%APPDATA%\\Pynet\\Library\`.
>
> The routing rules and the \`docs/\` guides below are complete and authoritative — follow them.
> What is **not** present in this copy: the example scripts (\`01_Scripts/\`), the API stubs
> (\`02_PyNet Stubs/\`) and the run history (\`AI_History/\`). Do not Glob or Read those paths here;
> they live in the full library at https://github.com/Rafael-NunezDeArenas/PyNetLibrary.
> Where a rule below says to consult them, fall back to live API exploration through the bridge.

---

`;

const router = readFileSync(join(librarySrc, "CLAUDE.md"), "utf8");
writeFileSync(join(dest, "CLAUDE.md"), PREAMBLE + router, "utf8");
console.log("[stage-library] wrote CLAUDE.md (router + standalone preamble)");

cpSync(join(librarySrc, "docs"), join(dest, "docs"), { recursive: true });
console.log("[stage-library] copied docs/");

console.log(`[stage-library] Done → ${dest}`);

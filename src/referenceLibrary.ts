/**
 * referenceLibrary.ts — deploy the bundled PyNET reference docs to a stable, well-known path.
 *
 * The AI assistant needs the routing docs (CLAUDE.md + docs/) loaded before it writes a script
 * for an Autodesk host. Rather than editing the user's own instruction files — every client keeps
 * them somewhere different, and clobbering a personal CLAUDE.md is not ours to do — we drop a
 * read-only copy at %APPDATA%\Pynet\Library and point the user (and the assistant) at it.
 *
 * Redeployed whenever the extension version changes, so an upgraded extension refreshes the docs.
 */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const DEPLOYED_VERSION_KEY = "pynet.libraryDeployedVersion";
const HIDE_HINT_KEY = "pynet.libraryHintDismissed";

/** %APPDATA%\Pynet\Library — falls back to the home dir if APPDATA is somehow unset. */
export function libraryPath(): string {
  const roaming = process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Roaming");
  return path.join(roaming, "Pynet", "Library");
}

/**
 * True when the full PyNET Library installer has already populated this folder — it ships
 * 01_Scripts, the API stubs and 00_References, none of which travel inside the extension.
 */
function fullLibraryInstalled(dest: string): boolean {
  return fs.existsSync(path.join(dest, "01_Scripts"));
}

/**
 * Copy the bundled docs to %APPDATA%\Pynet\Library if this extension version has not deployed
 * them yet. Returns true when files were written. Never throws — a failed deploy must not stop
 * the extension from activating.
 *
 * The PyNET Library installer owns this same folder and ships strictly more than we do: router,
 * docs/, .claude/commands, 01_Scripts, the stubs and 00_References. Ours is the standalone subset
 * for people who only installed the extension, and its CLAUDE.md carries a preamble stating that
 * the scripts and stubs are absent — which stops being true the moment the full Library lands
 * next to it. So when we detect one, we write nothing at all and let it be authoritative.
 */
export async function deployLibrary(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<boolean> {
  const source = path.join(context.extensionPath, "media", "library");
  if (!fs.existsSync(source)) {
    output.appendLine("Reference library not bundled in this build — skipping deploy.");
    return false;
  }

  const dest = libraryPath();
  const deployed = context.globalState.get<string>(DEPLOYED_VERSION_KEY);
  const current = context.extension.packageJSON.version as string;
  if (deployed === current && fs.existsSync(path.join(dest, "docs"))) {
    return false; // already current
  }

  try {
    if (fullLibraryInstalled(dest)) {
      output.appendLine(
        `Full PyNET Library already installed at ${dest} — it ships everything we would, ` +
          `so nothing was written.`
      );
      await context.globalState.update(DEPLOYED_VERSION_KEY, current);
      return false; // nothing deployed: do not nudge the user to open a folder they already have
    }
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(source, dest, { recursive: true, force: true });
    await context.globalState.update(DEPLOYED_VERSION_KEY, current);
    output.appendLine(`Reference docs deployed to ${dest}`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    output.appendLine(`Could not deploy reference library: ${msg}`);
    return false;
  }
}

/**
 * One-time nudge after a fresh deploy: opening the library as a workspace folder is what makes
 * an assistant pick the routing docs up automatically, and that is not obvious to a user who has
 * never opened a folder in VS Code.
 */
export async function offerToOpenLibrary(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(HIDE_HINT_KEY, false)) {
    return;
  }
  const OPEN = "Open library";
  const LATER = "Not now";
  const NEVER = "Don't show again";
  const choice = await vscode.window.showInformationMessage(
    "PyNET reference docs installed. Open them as a folder so your AI assistant knows how to " +
      "drive Navisworks, Revit and Civil 3D.",
    OPEN,
    LATER,
    NEVER
  );
  if (choice === OPEN) {
    await vscode.commands.executeCommand("pynet.openLibrary");
  } else if (choice === NEVER) {
    await context.globalState.update(HIDE_HINT_KEY, true);
  }
}

/** Open the deployed library as a VS Code folder (new window if one is already open). */
export async function openLibraryCommand(output: vscode.OutputChannel): Promise<void> {
  const dest = libraryPath();
  if (!fs.existsSync(dest)) {
    vscode.window.showWarningMessage(
      "PyNET reference library is not installed yet. Reload the window and try again."
    );
    return;
  }
  output.appendLine(`Opening reference library: ${dest}`);
  await vscode.commands.executeCommand(
    "vscode.openFolder",
    vscode.Uri.file(dest),
    { forceNewWindow: !!vscode.workspace.workspaceFolders?.length }
  );
}

/**
 * extension.ts — PyNet Platform activation entrypoint.
 *
 * Commands:
 *   pynet.openViewer   — pick a .pnt (native dialog) or reopen a recent one, load it into the
 *                        bundled server, and show the viewer. Adds the package to the history.
 *   pynet.installBridge — install/repair the MCP bridge and (re)configure AI clients.
 *   pynet.clearRecent  — clear the recent-models history.
 */
import * as vscode from "vscode";
import { ServerManager } from "./serverManager";
import { ViewerPanel } from "./viewerPanel";
import { runInstallCommand, bridgeAlreadyInstalled } from "./bridgeInstaller";
import { RecentModelsProvider } from "./recentModels";
import { deployLibrary, offerToOpenLibrary, openLibraryCommand } from "./referenceLibrary";

const BRIDGE_INSTALLED_KEY = "pynet.bridgeAutoInstalled";

let server: ServerManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("PyNet Platform");
  context.subscriptions.push(output);

  server = new ServerManager(context.extensionPath, output);
  context.subscriptions.push(server);

  const recent = new RecentModelsProvider(context);
  const iconUri = vscode.Uri.joinPath(context.extensionUri, "media", "Pynet.svg");

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("pynet.home", recent),
    vscode.commands.registerCommand("pynet.openViewer", (arg?: unknown) =>
      openModel(server!, iconUri, recent, output, arg)
    ),
    vscode.commands.registerCommand("pynet.installBridge", () => runInstallCommand(output)),
    vscode.commands.registerCommand("pynet.clearRecent", () => recent.clear()),
    vscode.commands.registerCommand("pynet.removeRecent", (model) => recent.remove(model)),
    vscode.commands.registerCommand("pynet.openLibrary", () => openLibraryCommand(output))
  );

  void maybeAutoInstall(context, output);
  void maybeDeployLibrary(context, output);
}

/**
 * Resolve a .pnt path (from a recent-item arg, or the native open dialog), load it into the
 * server, show the viewer and record it in history.
 */
async function openModel(
  server: ServerManager,
  iconUri: vscode.Uri,
  recent: RecentModelsProvider,
  output: vscode.OutputChannel,
  arg?: unknown
): Promise<void> {
  try {
    let pntPath: string | undefined =
      typeof arg === "string" ? arg : undefined;

    if (!pntPath) {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Open BIM Model",
        filters: { "PyNET viewer package": ["pnt"] },
      });
      pntPath = picked?.[0]?.fsPath;
    }
    if (!pntPath) {
      return; // user cancelled
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "PyNet: loading model…" },
      async () => {
        const port = await server.ensureStarted();
        const res = await fetch(`http://127.0.0.1:${port}/api/load-pnt-path`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pntPath }),
        });
        const data: any = await res.json();
        if (!res.ok || data.status !== "ok") {
          throw new Error(data?.message ?? `HTTP ${res.status}`);
        }
        const models = (data.models ?? [])
          .map((m: any) => (typeof m === "string" ? m : m.fileName))
          .filter(Boolean) as string[];

        // Stay open until the embedded viewer actually finishes loading every federated IFC —
        // not just until the .pnt zip has been extracted server-side.
        await ViewerPanel.show(server, iconUri, models, output);
      }
    );

    await recent.add(pntPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    output.appendLine(`ERROR opening model: ${msg}`);
    vscode.window.showErrorMessage(`PyNet: could not open model — ${msg}`);
  }
}

/** First-run install of the bridge + client config, unless already done or disabled. */
async function maybeAutoInstall(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const enabled = vscode.workspace
    .getConfiguration("pynet")
    .get<boolean>("autoInstallBridgeOnStartup", true);
  if (!enabled) {
    return;
  }
  const alreadyRan = context.globalState.get<boolean>(BRIDGE_INSTALLED_KEY, false);
  if (alreadyRan && bridgeAlreadyInstalled()) {
    return;
  }
  await runInstallCommand(output);
  await context.globalState.update(BRIDGE_INSTALLED_KEY, true);
}

/** Deploy the reference docs to %APPDATA%\Pynet\Library, nudging the user only on a fresh copy. */
async function maybeDeployLibrary(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const written = await deployLibrary(context, output);
  if (written) {
    await offerToOpenLibrary(context);
  }
}

export function deactivate(): void {
  server?.dispose();
  server = undefined;
}

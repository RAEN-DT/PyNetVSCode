/**
 * bridgeInstaller.ts — installs `pynet-mcp-bridge` and configures all detected AI clients.
 *
 * Pure-TypeScript port of PyNetBridge/install.ps1 — no PowerShell. Uses Node `child_process`
 * to drive python/uv/pip and `mcpClients.ts` to write the per-client config.
 */
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { configureAllClients, ClientResult } from "./mcpClients";
import { resolvePython, PythonInfo } from "./python";

const pExecFile = promisify(execFile);

const MIN_MAJOR = 3;
const MIN_MINOR = 10;

export interface InstallResult {
  installed: boolean;
  bridgeCommand?: string;
  clients: ClientResult[];
}

/** Whether a command resolves on PATH (used to detect `uv` and `pynet-bridge`). */
function which(cmd: string): string | undefined {
  try {
    // `where` returns one path per line on Windows; take the first.
    const out = execFileSync(process.platform === "win32" ? "where" : "which", [cmd], {
      encoding: "utf8",
    });
    const first = out.split(/\r?\n/).find((l) => l.trim().length > 0);
    return first?.trim();
  } catch {
    return undefined;
  }
}

/**
 * End-to-end install + configure. Reports progress through the supplied callback.
 * Throws with a user-friendly message if Python is missing/too old or install fails.
 */
export async function installAndConfigure(
  log: (msg: string) => void
): Promise<InstallResult> {
  // 1. Python is mandatory for the whole infrastructure.
  const py: PythonInfo | undefined = await resolvePython();
  if (!py) {
    throw new Error(
      "Python 3.10+ not found. Install it from https://python.org (or set 'pynet.pythonPath') and retry."
    );
  }
  if (py.major < MIN_MAJOR || (py.major === MIN_MAJOR && py.minor < MIN_MINOR)) {
    throw new Error(
      `Python ${MIN_MAJOR}.${MIN_MINOR}+ is required, but found ${py.major}.${py.minor} at ${py.path}.`
    );
  }
  log(`Found Python ${py.major}.${py.minor} (${py.path}).`);

  // 2. Install the package — prefer uv, fall back to pip on the resolved interpreter.
  //    If the upgrade fails because the executable is locked (a running MCP client holds it)
  //    but the bridge is already present, that's fine: we still (re)configure the clients.
  const alreadyPresent = bridgeAlreadyInstalled();
  const hasUv = !!which("uv");
  try {
    if (hasUv) {
      log("Installing pynet-mcp-bridge via uv…");
      await pExecFile("uv", ["tool", "install", "pynet-mcp-bridge", "--upgrade"]);
    } else {
      log("uv not found — installing via pip…");
      await pExecFile(py.path, ["-m", "pip", "install", "--upgrade", "pynet-mcp-bridge"]);
    }
    log("Package installed.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (alreadyPresent) {
      log(
        `Could not upgrade (likely the bridge is in use by a running client): ${msg.split("\n")[0]}`
      );
      log("Bridge already installed — continuing to (re)configure clients.");
    } else {
      throw new Error(`pynet-mcp-bridge install failed: ${msg}`);
    }
  }

  // 3. Resolve the installed `pynet-bridge` executable — its path is the client `command`.
  const bridgeCommand = which("pynet-bridge");
  if (!bridgeCommand) {
    throw new Error(
      "pynet-bridge was installed but its executable is not on PATH. Open a new terminal/session and run 'PyNET: Install / Repair MCP Bridge' again."
    );
  }
  log(`Resolved bridge executable: ${bridgeCommand}`);

  // 4. Configure every detected AI client.
  log("Configuring AI clients…");
  const clients = configureAllClients(bridgeCommand);
  for (const c of clients) {
    const tag =
      c.status === "configured" ? "[OK]" : c.status === "not-found" ? "[--]" : "[ERR]";
    log(`  ${tag} ${c.name}${c.detail ? " — " + c.detail : ""}`);
  }

  return { installed: true, bridgeCommand, clients };
}

/** Command handler: runs the install with a progress notification and a summary. */
export async function runInstallCommand(output: vscode.OutputChannel): Promise<void> {
  output.clear();
  output.show(true);
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "PyNET: installing MCP bridge…",
        cancellable: false,
      },
      () => installAndConfigure((m) => output.appendLine(m))
    );
    const ok = result.clients.filter((c) => c.status === "configured").length;
    vscode.window.showInformationMessage(
      `PyNET MCP bridge installed. Configured ${ok} AI client(s). Restart your AI clients to pick up the change.`
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    output.appendLine(`ERROR: ${msg}`);
    vscode.window.showErrorMessage(`PyNET install failed: ${msg}`);
  }
}

/** True if the bridge executable is already on PATH (used to skip auto-install). */
export function bridgeAlreadyInstalled(): boolean {
  return !!which("pynet-bridge");
}

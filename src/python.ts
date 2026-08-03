/**
 * python.ts — resolve a usable Python 3.10+ interpreter.
 *
 * Python is mandatory for the whole PyNet infrastructure (bridge + viewer server), so this is
 * shared by both bridgeInstaller.ts and serverManager.ts. Resolution order:
 *   1. `pynet.pythonPath` setting (explicit override)
 *   2. `python` on PATH
 *   3. Windows launcher `py -3`
 */
import { execFile } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

const pExecFile = promisify(execFile);

export interface PythonInfo {
  /** Executable invocation: the binary path (and any leading args, e.g. py -3). */
  path: string;
  args: string[];
  major: number;
  minor: number;
}

async function probe(cmd: string, leadingArgs: string[]): Promise<PythonInfo | undefined> {
  try {
    const { stdout, stderr } = await pExecFile(cmd, [...leadingArgs, "--version"]);
    const text = (stdout || stderr || "").trim();
    const m = /Python (\d+)\.(\d+)/.exec(text);
    if (!m) {
      return undefined;
    }
    return { path: cmd, args: leadingArgs, major: +m[1], minor: +m[2] };
  } catch {
    return undefined;
  }
}

/** Returns the first working interpreter, or undefined if none found. */
export async function resolvePython(): Promise<PythonInfo | undefined> {
  const configured = vscode.workspace
    .getConfiguration("pynet")
    .get<string>("pythonPath", "")
    .trim();

  const candidates: Array<[string, string[]]> = [];
  if (configured) {
    candidates.push([configured, []]);
  }
  candidates.push(["python", []]);
  if (process.platform === "win32") {
    candidates.push(["py", ["-3"]]);
  }

  for (const [cmd, args] of candidates) {
    const info = await probe(cmd, args);
    if (info) {
      return info;
    }
  }
  return undefined;
}

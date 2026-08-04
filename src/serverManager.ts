/**
 * serverManager.ts — owns the lifecycle of the bundled pnt_server.py (headless mode).
 *
 * The viewer is served by Python (mandatory in the PyNET infrastructure). This module finds a
 * free port, spawns `python pnt_server.py --headless --port <p>` against the copy bundled in
 * media/viewer/server/, waits until it responds, and kills it on dispose. A single instance is
 * shared across viewer panels.
 */
import { ChildProcess, spawn } from "child_process";
import * as http from "http";
import * as net from "net";
import * as path from "path";
import * as vscode from "vscode";
import { resolvePython } from "./python";

export class ServerManager implements vscode.Disposable {
  private proc: ChildProcess | undefined;
  private port = 0;
  private starting: Promise<number> | undefined;

  constructor(
    private readonly extensionPath: string,
    private readonly output: vscode.OutputChannel
  ) {}

  /** Port the server is listening on, or 0 if not started. */
  get activePort(): number {
    return this.port;
  }

  /** Start the server if needed and return its port. Concurrent calls share one start. */
  async ensureStarted(): Promise<number> {
    if (this.proc && this.port) {
      return this.port;
    }
    if (!this.starting) {
      this.starting = this.start().finally(() => {
        this.starting = undefined;
      });
    }
    return this.starting;
  }

  private async start(): Promise<number> {
    const py = await resolvePython();
    if (!py) {
      throw new Error(
        "Python 3.10+ not found. Install it (or set 'pynet.pythonPath') — the viewer server requires Python."
      );
    }

    const configured = vscode.workspace
      .getConfiguration("pynet")
      .get<number>("viewerPort", 0);
    const port = configured && configured > 0 ? configured : await findFreePort();

    const serverScript = path.join(
      this.extensionPath,
      "media",
      "viewer",
      "server",
      "pnt_server.py"
    );

    this.output.appendLine(`Starting viewer server: ${py.path} ${serverScript} --headless --port ${port}`);
    const proc = spawn(py.path, [...py.args, serverScript, "--headless", "--port", String(port)], {
      cwd: path.dirname(serverScript),
      env: process.env,
    });

    proc.stdout?.on("data", (d) => this.output.append(`[server] ${d}`));
    proc.stderr?.on("data", (d) => this.output.append(`[server] ${d}`));
    proc.on("exit", (code) => {
      this.output.appendLine(`Viewer server exited (code ${code}).`);
      if (this.proc === proc) {
        this.proc = undefined;
        this.port = 0;
      }
    });

    this.proc = proc;
    this.port = port;

    await waitForServer(port, 30_000);
    this.output.appendLine(`Viewer server ready on http://127.0.0.1:${port}`);
    return port;
  }

  dispose(): void {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
      this.port = 0;
    }
  }
}

/** Ask the OS for an ephemeral free port by binding to :0. */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const p = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(p));
    });
  });
}

/** Poll the server root until it answers or the timeout elapses. */
function waitForServer(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 2000 },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Viewer server did not start within ${timeoutMs} ms.`));
      } else {
        setTimeout(attempt, 400);
      }
    };
    attempt();
  });
}

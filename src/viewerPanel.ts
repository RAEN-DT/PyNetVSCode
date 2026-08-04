/**
 * viewerPanel.ts — the VS Code Webview that hosts the That Open viewer (iframe only).
 *
 * The file dialog + .pnt loading happen in extension.ts before this panel is shown, so the panel
 * is a thin full-screen iframe pointed at /viewer/?models=…. `portMapping` makes the local server
 * port reachable from inside the webview sandbox.
 */
import * as vscode from "vscode";
import { ServerManager } from "./serverManager";

export class ViewerPanel {
  private static current: ViewerPanel | undefined;

  // A load in flight — resolved (never rejected; failures already surface via
  // showErrorMessage in handleMessage) when the iframe reports modelsLoaded/loadError, so
  // callers can await actual completion instead of just the /api/load-pnt-path round trip.
  private pendingLoad: (() => void) | null = null;

  /**
   * Show (or reuse) the viewer panel and wait until the embedded viewer has actually
   * finished loading the given models — not just until the panel/iframe is created.
   */
  static async show(
    server: ServerManager,
    iconUri: vscode.Uri,
    models: string[],
    output?: vscode.OutputChannel
  ): Promise<void> {
    const port = await server.ensureStarted();

    if (ViewerPanel.current) {
      ViewerPanel.current.panel.reveal(vscode.ViewColumn.Active);
      ViewerPanel.current.load(models);
      await ViewerPanel.current.waitForLoad();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "pynet.viewer",
      "PyNET Viewer",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        portMapping: [{ webviewPort: port, extensionHostPort: port }],
      }
    );
    panel.iconPath = iconUri;
    ViewerPanel.current = new ViewerPanel(panel, port, output);
    ViewerPanel.current.load(models);
    await ViewerPanel.current.waitForLoad();
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly port: number,
    private readonly output?: vscode.OutputChannel
  ) {
    this.panel.webview.html = this.render();
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    this.panel.onDidDispose(() => {
      if (ViewerPanel.current === this) {
        ViewerPanel.current = undefined;
      }
      this.pendingLoad?.();
      this.pendingLoad = null;
    });
  }

  /**
   * Resolves once the current load finishes (success or failure — the failure itself is
   * already reported via showErrorMessage). Falls back to a timeout so a catastrophic
   * failure inside the webview (one that never gets to post a loadError, e.g. the bundle
   * itself fails to parse) can't hang the caller's progress notification forever.
   */
  private waitForLoad(): Promise<void> {
    return new Promise((resolve) => {
      this.pendingLoad = resolve;
      setTimeout(() => {
        if (this.pendingLoad === resolve) {
          this.output?.appendLine("WARN: timed out waiting for the viewer to report models loaded");
          this.pendingLoad = null;
          resolve();
        }
      }, 120_000);
    });
  }

  /** Relayed from the iframe (via the wrapper page's postMessage bridge). */
  private handleMessage(msg: any): void {
    if (msg?.type !== "viewer-event") return;
    if (msg.event === "loadError") {
      const detail = `${msg.model ?? "model"}: ${msg.message ?? "unknown error"}`;
      this.output?.appendLine(`ERROR loading in viewer: ${detail}`);
      void vscode.window.showErrorMessage(`PyNET: failed to load ${detail}`);
    }
    if (msg.event === "loadError" || msg.event === "modelsLoaded") {
      this.pendingLoad?.();
      this.pendingLoad = null;
    }
  }

  /** Point the embedded viewer at the given model file names. */
  private load(models: string[]): void {
    void this.panel.webview.postMessage({ type: "load", models });
  }

  private render(): string {
    const port = this.port;
    const csp = [
      "default-src 'none'",
      `frame-src http://localhost:${port} http://127.0.0.1:${port}`,
      "style-src 'unsafe-inline'",
      "script-src 'unsafe-inline'",
    ].join("; ");

    return /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #1a304d; }
    iframe { border: 0; width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <iframe id="viewer" allow="fullscreen" title="PyNET Viewer"></iframe>
  <script>
    const vscodeApi = acquireVsCodeApi();
    const iframeEl = document.getElementById("viewer");
    const base = "http://localhost:${port}/viewer/";
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "load") {
        const models = encodeURIComponent((msg.models || []).join(","));
        iframeEl.src = base + "?models=" + models + "&autoLoad=true";
      } else if (msg.type === "viewer-event" && event.source === iframeEl.contentWindow) {
        // Relay events the iframe posts to its parent (this wrapper) up to the extension host.
        vscodeApi.postMessage(msg);
      }
    });
  </script>
</body>
</html>`;
  }
}

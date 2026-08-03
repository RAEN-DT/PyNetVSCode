/**
 * mcpClients.ts — registers the `pynet-bridge` MCP server into every detected AI client.
 *
 * Pure-TypeScript port of PyNetBridge/install.ps1 (`Add-McpServer` + per-client logic).
 * No PowerShell: all config files are read/written directly with `fs`.
 *
 * Each client stores MCP servers in a JSON object under a root key (`mcpServers` for most,
 * `servers` for VS Code/Copilot) — except Codex, which uses a TOML block. The writers are
 * idempotent: re-running replaces the existing `pynet-bridge` entry instead of duplicating it.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ClientResult {
  name: string;
  status: "configured" | "not-found" | "error";
  configPath?: string;
  detail?: string;
}

const SERVER_KEY = "pynet-bridge";

/** Build the stdio server entry that every JSON client shares. */
function serverEntry(command: string): Record<string, unknown> {
  return { type: "stdio", command: command.replace(/\\/g, "/"), args: [] };
}

/**
 * Merge the pynet-bridge entry into a JSON config file under `rootKey`.
 * Returns true if written, false if the file/dir does not exist and createEmpty is false.
 */
function writeJsonClient(
  configPath: string,
  command: string,
  rootKey: string,
  createEmpty: boolean
): boolean {
  let parsed: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8").trim();
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Corrupt/non-JSON file — bail rather than clobber user data.
        throw new Error(`Existing config is not valid JSON: ${configPath}`);
      }
    }
  } else if (!createEmpty) {
    return false;
  }

  const bucket = (parsed[rootKey] as Record<string, unknown>) ?? {};
  bucket[SERVER_KEY] = serverEntry(command);
  parsed[rootKey] = bucket;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), "utf8");
  return true;
}

/** Codex stores MCP servers as TOML blocks in ~/.codex/config.toml. */
function writeCodexClient(configPath: string, command: string): boolean {
  const block =
    `[mcp_servers.${SERVER_KEY}]\n` +
    `command = "${command.replace(/\\/g, "/")}"\n` +
    `args = []\n`;

  let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";

  // Replace an existing [mcp_servers.pynet-bridge] block (up to the next [section] or EOF).
  const pattern = /^\[mcp_servers\.pynet-bridge\][\s\S]*?(?=^\[|\Z)/m;
  if (pattern.test(content)) {
    content = content.replace(pattern, block + "\n");
  } else {
    content = content.replace(/\s*$/, "");
    content += (content.length ? "\n\n" : "") + block;
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content, "utf8");
  return true;
}

/** Locate Claude Desktop's config (Store package layout first, then classic %APPDATA%). */
function claudeDesktopConfigPath(): string | undefined {
  const packages = path.join(process.env.LOCALAPPDATA ?? "", "Packages");
  if (fs.existsSync(packages)) {
    const claudePkg = fs
      .readdirSync(packages)
      .find((d) => d.startsWith("Claude_"));
    if (claudePkg) {
      return path.join(
        packages,
        claudePkg,
        "LocalCache",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      );
    }
  }
  const appdataClaude = path.join(process.env.APPDATA ?? "", "Claude");
  if (fs.existsSync(appdataClaude)) {
    return path.join(appdataClaude, "claude_desktop_config.json");
  }
  return undefined;
}

/**
 * Configure all known clients with the resolved `pynet-bridge` command (absolute exe path).
 * Mirrors install.ps1: Claude Desktop, Claude Code, Cline, Roo Code, Codex, VS Code/Copilot.
 */
export function configureAllClients(bridgeCommand: string): ClientResult[] {
  const home = os.homedir();
  const appdata = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
  const results: ClientResult[] = [];

  const tryJson = (
    name: string,
    configPath: string | undefined,
    rootKey: string,
    requireDir: string | null
  ): void => {
    if (!configPath) {
      results.push({ name, status: "not-found" });
      return;
    }
    if (requireDir && !fs.existsSync(requireDir)) {
      results.push({ name, status: "not-found", configPath });
      return;
    }
    try {
      const ok = writeJsonClient(configPath, bridgeCommand, rootKey, true);
      results.push({ name, status: ok ? "configured" : "not-found", configPath });
    } catch (e) {
      results.push({ name, status: "error", configPath, detail: String(e) });
    }
  };

  // Claude Desktop — root "mcpServers"
  tryJson("Claude Desktop", claudeDesktopConfigPath(), "mcpServers", null);

  // Claude Code — ~/.claude.json, root "mcpServers"
  tryJson("Claude Code", path.join(home, ".claude.json"), "mcpServers", null);

  // Cline — VS Code globalStorage, only if the extension dir exists
  {
    const cline = path.join(
      appdata,
      "Code",
      "User",
      "globalStorage",
      "saoudrizwan.claude-dev",
      "settings",
      "cline_mcp_settings.json"
    );
    tryJson("Cline", cline, "mcpServers", path.dirname(cline));
  }

  // Roo Code — VS Code globalStorage
  {
    const roo = path.join(
      appdata,
      "Code",
      "User",
      "globalStorage",
      "rooveterinaryinc.roo-cline",
      "settings",
      "mcp_settings.json"
    );
    tryJson("Roo Code", roo, "mcpServers", path.dirname(roo));
  }

  // Codex — ~/.codex/config.toml (TOML)
  {
    const codex = path.join(home, ".codex", "config.toml");
    try {
      writeCodexClient(codex, bridgeCommand);
      results.push({ name: "Codex", status: "configured", configPath: codex });
    } catch (e) {
      results.push({ name: "Codex", status: "error", configPath: codex, detail: String(e) });
    }
  }

  // VS Code / GitHub Copilot — %APPDATA%\Code\User\mcp.json, root "servers"
  {
    const codeUser = path.join(appdata, "Code", "User");
    const copilot = path.join(codeUser, "mcp.json");
    tryJson("GitHub Copilot (VS Code)", copilot, "servers", codeUser);
  }

  return results;
}

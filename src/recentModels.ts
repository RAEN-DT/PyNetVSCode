/**
 * recentModels.ts — persistent history of opened .pnt packages + its activity-bar TreeView.
 *
 * History lives in globalState so it survives restarts. Clicking an item reopens that package
 * directly (no file dialog). When empty, the view falls back to its viewsWelcome content.
 */
import * as path from "path";
import * as vscode from "vscode";

const STORE_KEY = "pynet.recentModels";
const MAX_RECENT = 20;

export interface RecentModel {
  path: string;
  name: string;
  openedAt: number;
}

export class RecentModelsProvider implements vscode.TreeDataProvider<RecentModel> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private get items(): RecentModel[] {
    return this.context.globalState.get<RecentModel[]>(STORE_KEY, []);
  }

  /** Record a freshly opened package at the top of the list (de-duplicated by path). */
  async add(pntPath: string): Promise<void> {
    const name =
      path.basename(pntPath, path.extname(pntPath)) || path.basename(pntPath) || "Model";
    const next = [
      { path: pntPath, name, openedAt: Date.now() },
      ...this.items.filter((m) => m.path.toLowerCase() !== pntPath.toLowerCase()),
    ].slice(0, MAX_RECENT);
    await this.context.globalState.update(STORE_KEY, next);
    this._onDidChange.fire();
  }

  /** Remove a single entry (invoked by the inline trash action). */
  async remove(model: RecentModel): Promise<void> {
    const target = model?.path?.toLowerCase();
    if (!target) {
      return;
    }
    const next = this.items.filter((m) => m.path.toLowerCase() !== target);
    await this.context.globalState.update(STORE_KEY, next);
    this._onDidChange.fire();
  }

  async clear(): Promise<void> {
    await this.context.globalState.update(STORE_KEY, []);
    this._onDidChange.fire();
  }

  getTreeItem(model: RecentModel): vscode.TreeItem {
    const item = new vscode.TreeItem(model.name, vscode.TreeItemCollapsibleState.None);
    item.description = relativeTime(model.openedAt);
    item.tooltip = model.path;
    item.iconPath = new vscode.ThemeIcon("file-binary");
    item.contextValue = "pynetRecentModel";
    item.command = {
      command: "pynet.openViewer",
      title: "Open BIM Model",
      arguments: [model.path],
    };
    return item;
  }

  getChildren(): RecentModel[] {
    return [...this.items].sort((a, b) => b.openedAt - a.openedAt);
  }
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

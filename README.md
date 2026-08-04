<p align="center">
  <img src="https://raw.githubusercontent.com/RAEN-DT/PyNetVSCode/main/Assets/PynetViewer.png" width="440" alt="PyNET Viewer"/>
</p>

<h3 align="center">BIM Viewer &amp; MCP Bridge for VS Code</h3>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=RAENDT.pynet-platform"><img src="https://img.shields.io/visual-studio-marketplace/v/RAENDT.pynet-platform?label=marketplace&color=4388B1" alt="Marketplace"/></a>
  <img src="https://img.shields.io/badge/python-3.10%20%E2%80%93%203.13-blue" alt="Python"/>
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey" alt="Windows"/>
  <img src="https://img.shields.io/badge/hosts-Navisworks%20%C2%B7%20Revit%20%C2%B7%20Civil%203D-orange" alt="Hosts"/>
  <img src="https://img.shields.io/badge/MCP-compatible-8A2BE2" alt="MCP"/>
</p>

Explore federated BIM models inside VS Code, and let your AI assistant drive **Autodesk
Navisworks, Revit and Civil 3D** in natural language.

This extension does three things:

- **Embeds a 3D BIM viewer** — open a `.pnt` package and navigate the federated model, its
  spatial tree, element properties, sections, measurements and clash results, without leaving
  the editor.
- **Installs and wires the PyNet MCP Bridge** — one click sets up `pynet-mcp-bridge` and writes
  the server config into every AI client it finds: Claude Desktop, Claude Code, Codex, Cline,
  Roo Code and GitHub Copilot.
- **Ships the reference docs your assistant needs** — the routing guides for each Autodesk host,
  installed locally so the assistant knows which API to reach for before it writes a line.

## What you can ask

Once the bridge is wired, your assistant talks to the model and to the viewer at the same time —
so it can point at what it is describing:

> *"Which clashes involve the HVAC model? Show me the worst one."*
> *"Isolate the structural discipline and hide everything else."*
> *"List every duct type on level 2 with its element id."*

## Requirements

| | |
|---|---|
| **Windows** | The Autodesk hosts are Windows-only. |
| **Python 3.10+** | Mandatory — both the bridge and the viewer server run on it. Auto-detected on `PATH`, or set `pynet.pythonPath`. |
| **PyNet plugin** | Needed only to drive Autodesk from your AI client. **The viewer works without it.** |

## Getting started

1. Install the extension. On first activation it installs the bridge and configures every AI
   client it detects — no action needed. (Turn it off with `pynet.autoInstallBridgeOnStartup`.)
2. **Restart your AI clients** so they pick up the new MCP server.
3. Open the **PyNet Platform** icon in the activity bar and choose **Open BIM Model** to load a
   `.pnt` package. Models you open are kept in a recent list.

If a client was closed during setup, run **PyNet: Install / Repair MCP Bridge** from the command
palette at any time — it is safe to re-run and re-detects everything.

## The reference library

Writing a script for Navisworks, Revit or Civil 3D means knowing which API applies, which imports
are allowed and how the host expects to be addressed. The extension installs those routing docs to
`%APPDATA%\Pynet\Library` and offers to open them the first time.

Open that folder as a workspace and your assistant picks the routing up automatically — that is
what turns "write me a clash report" into a script that runs first time. Reopen it whenever you
like with **PyNet: Open Reference Library**.

## Commands

| Command | Action |
|---|---|
| **PyNet: Open BIM Model** | Opens a `.pnt` package in the embedded 3D viewer. |
| **PyNet: Install / Repair MCP Bridge** | Installs or upgrades `pynet-mcp-bridge` and reconfigures every detected AI client. |
| **PyNet: Open Reference Library** | Opens the installed reference docs as a folder. |
| **PyNet: Clear Recent Models** | Empties the recent models list. |

## Settings

| Setting | Default | Description |
|---|---|---|
| `pynet.pythonPath` | `""` | Python 3.10+ executable. Empty = auto-detect (`python`, `py -3`). |
| `pynet.autoInstallBridgeOnStartup` | `true` | Install the bridge and configure clients on first run. |
| `pynet.viewerPort` | `0` | Local viewer server port. `0` = pick a free one. |

## How it works

The viewer is a [That Open](https://thatopen.com/) engine build served by a bundled local server
and embedded in a VS Code webview. A control channel lets the MCP bridge drive the scene — select,
isolate, fit, highlight clashes, read properties — so your AI assistant can point at what it is
talking about while it talks about it.

**Nothing is uploaded.** The server binds to localhost and the model never leaves your machine.

## Links

- [PyNet Platform](https://github.com/RAEN-DT/PyNet) — the Autodesk plugin and the wider ecosystem
- [PyNet MCP Bridge](https://github.com/RAEN-DT/PyNetBridge) — the MCP server
- [PyNet Library](https://github.com/RAEN-DT/PyNetLibrary) — reference scripts for Navisworks, Revit and Civil 3D
- [Report an issue](https://github.com/RAEN-DT/PyNetVSCode/issues)

## License

MIT © [RAEN Digital Tools](https://github.com/RAEN-DT)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/RAEN-DT/PyNet/main/Assets/RAENDigitalTools.png" alt="RAEN Digital Tools" width="180"><br/><br/>
  <sub>© 2026 RAEN Digital Tools · Todos los derechos reservados.<br/>
  Obra inscrita en el Registro de la Propiedad Intelectual de la Comunidad de Madrid.</sub>
</p>

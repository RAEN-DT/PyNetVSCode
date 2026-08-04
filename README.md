<p align="center">
  <img src="https://raw.githubusercontent.com/RAEN-DT/PyNetVSCode/main/Assets/PynetViewer.png" width="440" alt="PyNET Viewer"/>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=RAENDT.pynet-platform"><img src="https://img.shields.io/visual-studio-marketplace/v/RAENDT.pynet-platform?label=marketplace&color=4388B1" alt="Marketplace"/></a>
  <img src="https://img.shields.io/badge/python-3.10%20%E2%80%93%203.13-blue" alt="Python"/>
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey" alt="Windows"/>
  <img src="https://img.shields.io/badge/hosts-Navisworks%20%C2%B7%20Revit%20%C2%B7%20Civil%203D-orange" alt="Hosts"/>
  <img src="https://img.shields.io/badge/MCP-compatible-8A2BE2" alt="MCP"/>
</p>

<p align="center">
  <a href="https://github.com/RAEN-DT">Organization</a> &middot;
  <a href="https://github.com/RAEN-DT/PyNet">Platform</a> &middot;
  <a href="https://github.com/RAEN-DT/PyNetBridge">Bridge</a> &middot;
  <a href="https://github.com/RAEN-DT/PyNetLibrary">Library</a> &middot;
  <a href="https://github.com/RAEN-DT/PyNet/wiki/PyNET-FAQs">FAQs</a>
</p>

#

**PyNET Viewer** brings federated BIM models into VS Code and connects your AI assistant to
Autodesk **Navisworks, Revit and Civil 3D** — so it can explore, explain and operate the model
in natural language, without leaving the editor.

### 📥 Request the Beta Testing 30 days **Trial** here:
Contact: **info@raendt.com** to request beta access.

---

## 🧊 What this extension does

| | |
| :--- | :--- |
| **3D BIM Viewer** | Open a `.pnt` package and navigate the federated model — spatial tree, element properties, sections, measurements and clash results. **Free, and works on its own.** |
| **MCP Bridge setup** | One click installs `pynet-mcp-bridge` and configures every AI client it finds: Claude Desktop, Claude Code, Codex, Cline, Roo Code and GitHub Copilot. |
| **Reference docs** | Installs the routing guides for each Autodesk host locally, so your assistant knows which API to reach for before it writes a line. |

---

## 💬 What you can ask

Once the bridge is wired, the assistant talks to the model and to the viewer at the same time —
so it can point at what it is describing:

> *"Which clashes involve the HVAC model? Show me the worst one."*
>
> *"Isolate the structural discipline and hide everything else."*
>
> *"List every duct type on level 2 with its element id."*

---

## 📋 Requirements

| Requirement | Detail |
| :--- | :--- |
| **Windows** | The Autodesk hosts are Windows-only. |
| **Python 3.10 – 3.13** | Mandatory — both the bridge and the viewer server run on it. Auto-detected on `PATH`, or set `pynet.pythonPath`. |
| **PyNet plugin** | Only needed to drive Autodesk from your AI client. **The viewer works without it.** |

---

## 🚀 Getting started

1. **Install the extension.** On first activation it installs the bridge and configures every AI
   client it detects — no action needed. (Turn it off with `pynet.autoInstallBridgeOnStartup`.)
2. **Restart your AI clients** so they pick up the new MCP server.
3. **Open a model.** Click the PyNET icon in the activity bar → **Open BIM Model**, and pick a
   `.pnt` package. Everything you open is kept in a recent list.

> If a client was closed during setup, run **PyNet: Install / Repair MCP Bridge** from the command
> palette at any time — it is safe to re-run and re-detects everything.

---

## 📚 The reference library

Writing a script for Navisworks, Revit or Civil 3D means knowing which API applies, which imports
are allowed, and how the host expects to be addressed. The extension installs those routing guides
to `%APPDATA%\Pynet\Library` and offers to open them the first time.

Open that folder as a workspace and your assistant picks the routing up automatically — that is
what turns *"write me a clash report"* into a script that runs first time. Reopen it whenever you
like with **PyNet: Open Reference Library**.

---

## ⌨️ Commands

| Command | Action |
| :--- | :--- |
| **PyNet: Open BIM Model** | Opens a `.pnt` package in the embedded 3D viewer. |
| **PyNet: Install / Repair MCP Bridge** | Installs or upgrades the bridge and reconfigures every detected AI client. |
| **PyNet: Open Reference Library** | Opens the installed reference docs as a folder. |
| **PyNet: Clear Recent Models** | Empties the recent models list. |

## ⚙️ Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `pynet.pythonPath` | `""` | Python 3.10+ executable. Empty = auto-detect (`python`, `py -3`). |
| `pynet.viewerPort` | `0` | Local viewer server port. `0` = pick a free one. |
| `pynet.autoInstallBridgeOnStartup` | `true` | Install the bridge and configure clients on first run. |

---

## 🤖 How it works

The viewer is a [That Open](https://thatopen.com/) engine build served by a bundled local server
and embedded in a VS Code webview. A control channel lets the MCP bridge drive the scene — select,
isolate, fit, highlight clashes, read properties — so your assistant can point at what it is
talking about while it talks about it.

**Important note on AI providers:** PyNET is the integration layer between AI models and Autodesk
tools. **Access to AI models (Claude, OpenAI, etc.) is not included** — you bring your own client
and subscription.

---

## 🔒 Privacy & Security

* **Local execution.** The viewer server binds to localhost; the model never leaves your machine.
* **Nothing uploaded.** No BIM data is transmitted externally at runtime.
* **Validated scripts.** Anything the AI sends to an Autodesk host passes a static validator first.
* **AI-generated code** may be processed by the AI provider you choose to use.

---

## 🧩 The PyNET Ecosystem

| Component | Repository | Purpose |
| :--- | :--- | :--- |
| **PyNet Platform** | [PyNet](https://github.com/RAEN-DT/PyNet) | Navisworks/Revit/Civil 3D plugin hosting the Python.NET engine |
| **PyNet Bridge (MCP)** | [PyNetBridge](https://github.com/RAEN-DT/PyNetBridge) | MCP server connecting AI models to PyNET, with secure script validation |
| **PyNet Library** | [PyNetLibrary](https://github.com/RAEN-DT/PyNetLibrary) | Reference scripts and AI context for the three hosts |
| **PyNet for VS Code** | [PyNetVSCode](https://github.com/RAEN-DT/PyNetVSCode) | This extension — embedded viewer + one-click bridge setup |

---

## ❓ FAQs & Support

Questions about installation, configuration or usage? See the
[PyNET FAQs](https://github.com/RAEN-DT/PyNet/wiki/PyNET-FAQs), or
[report an issue](https://github.com/RAEN-DT/PyNetVSCode/issues).

---

## ⚠️ Disclaimer

PyNET Platform is intended for professional use in BIM automation. Users are responsible for
reviewing, validating and ensuring the correctness of AI-generated scripts before applying them in
production environments.

---

## 📄 License

MIT © [RAEN Digital Tools](https://github.com/RAEN-DT)

<p align="center">
  <img src="https://raw.githubusercontent.com/RAEN-DT/PyNet/main/Assets/RAENDigitalTools.png" alt="RAEN Digital Tools" width="180"><br/><br/>
  <sub>© 2026 RAEN Digital Tools · Todos los derechos reservados.<br/>
  Obra inscrita en el Registro de la Propiedad Intelectual de la Comunidad de Madrid.</sub>
</p>

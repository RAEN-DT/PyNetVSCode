<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2024-2026 RAEN Digital Tools SL - PyNET Platform -->

# PyNET BIM Viewer & Coordination Dashboard

Embeddable web component built with **ThatOpen Components** for visualizing federated IFC models
alongside coordination data (clash detection) exported from Navisworks.

The extension in this repo bundles the built viewer into `media/viewer/` via
`scripts/build-viewer.mjs`. The sections below are for working on the viewer itself.

> Moved here from `PyNetLibrary/03_Viewer` — the extension is the only consumer, so the source and
> the thing that ships it now live together. Producing a `.pnt` from a model is still documented in
> [PyNetLibrary/docs/pnt-export.md](https://github.com/RAEN-DT/PyNetLibrary/blob/main/docs/pnt-export.md).

## Structure

```
viewer/
  src/           → Viewer TypeScript (ThatOpen + Three.js)
  dashboard/     → Dashboard HTML + Plotly (clash table, charts)
  server/        → Python servers: pnt_server.py (current) + legacy_server.py
  public/worker/ → Web Worker for fragment parsing
  dist/          → Viewer production build (generated with vite build)
```

## The `.pnt` package

A `.pnt` file is the portable coordination package: a **ZIP bundle** containing the federated IFC
models (`models/*.ifc`) plus the clash data (`clashes.json`). It makes a whole coordination snapshot
a single self-contained file that opens without any loose files.

## Open a `.pnt` package — `pnt_server.py`

`pnt_server.py` is the product server: a Flask/Dash app wrapped in a **PyWebView desktop window**.
It opens a `.pnt`, extracts it to `~/.pynet_viewer/<name>/`, and shows the viewer + dashboard.

```powershell
cd viewer\server

python pnt_server.py                 # opens a file picker to choose a .pnt
python pnt_server.py project.pnt     # opens a specific package directly
python pnt_server.py --port 8096     # custom port (default 8095)
```

### Standalone `.exe` (no Python required)

`pnt_server.py` can be packaged into a single distributable executable with PyInstaller. End users
just double-click the `.exe`, pick their `.pnt`, and explore the model + clashes without installing
anything.

```powershell
cd viewer\server
pyinstaller pnt_server.py --onefile --noconsole --add-data "../dashboard;dashboard" --add-data "../dist;dist"
```

## Rebuild the viewer (after changes in `src/`)

```powershell
cd viewer
npm install
npm run build
```

Or build and stage it into the extension in one step, from the repo root:

```powershell
node scripts/build-viewer.mjs
```

## Development with hot-reload

```powershell
cd viewer
npm run dev
# Vite at http://localhost:5173 — requires legacy_server.py on port 8080 for IFC files
python server\legacy_server.py --ifc-dir "C:\path\to\ifcs" --port 8080
```

## Legacy — serve a folder of loose IFCs (`legacy_server.py`)

> Development / troubleshooting only. The standard flow is the `.pnt` package above.
> `legacy_server.py` is the older Python-stdlib server that serves a directory of IFC files
> directly, with no `.pnt` packaging.

```powershell
cd viewer
python server\legacy_server.py --ifc-dir "C:\path\to\ifcs" --port 8095
```

Then open `http://localhost:8095/` for the dashboard, or
`http://localhost:8095/viewer/?models=model1.ifc,model2.ifc` for the viewer alone.

## Viewer public API (for integration)

| Function | Description |
| :--- | :--- |
| `window.loadModel(url, name)` | Loads an IFC model by URL |
| `window.highlightElements(modelId, expressIds)` | Highlights elements (clash navigation) |
| `window.fitToAllModels()` | Fits camera to all loaded models |
| `postMessage({ type: "viewer-command", ... })` | iframe ↔ dashboard communication |

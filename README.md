<div align="center">

# 🌳 JSON Tree Viewer

**Paste in any JSON and instantly explore it as a collapsible tree or a live, pannable graph — no install, no build step.**

[![Live](https://img.shields.io/badge/Live-Visit%20Site-6366f1?style=for-the-badge&logo=github)](https://debabratasaha-dev.github.io/JSON-tree-viewer/)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-22c55e?style=for-the-badge)

</div>

---

## Features

| | |
|---|---|
| 🌲 **List View** | Collapsible tree with syntax highlighting and per-type icons |
| 🕸️ **Graph View** ⭐ | **Interactive graph-chart — zoom, pan, and collapse nodes on the fly** |
| 🎨 **Themes** | Light / Dark mode toggle |
| 📁 **Input** | Paste JSON directly or upload a `.json` file |
| ⚡ **Zero setup** | Just open `index.html` — works fully offline |

---

## 🕸️ Interactive Mindmap View

The **Graph View** is what sets this project apart. Instead of a plain text tree, your JSON is rendered as a live, interactive mindmap where:

- Every object and array becomes a **clickable node** — click to expand or collapse its children
- **Scroll to zoom** in and out (0.2× – 3×), or use the `+` / `−` buttons
- **Click and drag** to pan freely across the entire mindmap canvas
- **Smooth curved connectors** visually show the parent-child relationships between nodes
- Each node displays the **key name**, a **value summary**, and a **data type badge**
- **Automatic centering** and responsive layout that adapts to your data structure

It's built entirely with SVG connectors for crisp curves and vanilla JS transforms — no canvas, no third-party graph library.

---

## Quick Start

```bash
git clone https://github.com/debabratasaha-dev/JSON-tree-viewer.git
cd JSON-tree-viewer
# Open index.html in your browser
```

Or go **[here](https://debabratasaha-dev.github.io/JSON-tree-viewer/)** to use it.

---

## How It Works

1. Paste your JSON or upload a `.json` file from the left sidebar
2. Click **Render Tree** to visualize
3. Switch between **List View** and **Graph View** from the top bar
4. Use **Expand All / Collapse All** or click individual nodes to explore

---

## Project Structure

```
JSON-tree-viewer/
├── index.html   # App shell & layout
├── style.css    # Design system, themes, animations
├── script.js    # Tree & graph rendering, zoom, pan, theme
└── favicon.svg
```

---

## Contributing

Issues and PRs are welcome! Please open an issue first to discuss any major changes.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/debabratasaha-dev"><strong>Debabrata Saha</strong></a>
</div>

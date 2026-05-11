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
| 🕸️ **Graph View** ⭐ | **Responsive mindmap — wheel zoom, pinch zoom, pan, and collapse branches on the fly** |
| 🎨 **Themes** | Light / Dark mode toggle |
| 📁 **Input** | Paste JSON directly or upload a `.json` file |
| ⚡ **Zero setup** | Just open `index.html` — works fully offline |

---

## Interactive Mindmap Graph View

The **Graph View** renders JSON as a responsive mindmap where nested data is shown as connected cards instead of an org chart:

- Objects and arrays become clickable branches that expand or collapse their children
- Mouse wheel, trackpad pinch, touch pinch, and the `+` / `-` buttons zoom from 0.2x to 3x
- Mouse drag and touch drag pan freely across the mindmap canvas
- Smooth SVG connector curves show parent-child relationships between cards
- Each row shows the key name, value summary, datatype icon, and datatype name
- Graph cards resize for long strings and adapt to mobile screens without changing the data details
- The graph redraws after zooming so text remains crisp

It is built with positioned DOM cards, SVG connector curves, and vanilla JavaScript transforms - no canvas, no third-party graph library.

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

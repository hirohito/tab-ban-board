# Tab-Ban Board

**Kanban for your tabs.**

Tab-Ban Board is a Chrome extension that replaces your new tab page with a Kanban-style board of everything you have open — **one column per root domain**, scrolling horizontally. All your GitHub tabs in one column, all your Google tabs in the next, your localhost dev servers in their own.

A Kanban remix of [Tab Out](https://github.com/zarazhangrui/tab-out) by [Zara](https://x.com/zarazhangrui), with a UI built on [shadcn/ui](https://ui.shadcn.com).

No server. No account. No external API calls at runtime.

---

## The board

Columns are laid out in priority order:

1. **Chrome tab groups first** — any tab in one of Chrome's native tab groups keeps that grouping, shown as a column with the group's **name and colour**
2. **Then root domains** — remaining tabs group by domain (`mail.google.com` and `docs.google.com` both land in `google.com`), sorted busiest-first
3. **Then "Other"** — every domain with just a single tab collapses into one **Other** column, so a pile of one-off tabs doesn't spread the board across the screen

Other niceties:

- Hosting platforms are handled sensibly: `alice.github.io` and `bob.github.io` get **separate** columns
- `localhost` gets its own column with **port badges** so you can tell your dev servers apart
- The board **scrolls horizontally** — as many columns as you need

## Features

- **Click any card to jump to that tab** across windows, no new tab opened
- **Close a single tab** or **close a whole domain column** in one click — with the swoosh sound + confetti burst carried over from Tab Out
- **Duplicate detection**: pages open more than once collapse into one card with a ×N badge, plus a one-click "keep one of each" cleanup banner
- **Live updates** — the board repaints as tabs open, close, and navigate
- **Light & dark mode**, following your system preference
- **100% local at runtime** — favicons come from Chrome's own cache, fonts are bundled, your data never leaves your machine
- **Toolbar badge** with a color-coded open-tab count (green ≤ 10, amber ≤ 20, red beyond)

---

## Install

The built extension is committed to this repo, so there's **nothing to build** — just clone and load it.

**1. Clone (or [download the ZIP](https://github.com/hirohito/tab-ban-board/archive/refs/heads/main.zip) and unzip)**

```bash
git clone https://github.com/hirohito/tab-ban-board.git
```

**2. Load the Chrome extension**

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the **`extension/`** folder inside the repo

**3. Open a new tab**

You'll see your board.

> Using a coding agent? Point it at this repo and say *"install this extension"* — it can run the two steps above for you.

---

## Development

Only needed if you want to change the code (end users can skip this — the built `extension/` is already committed).

```bash
npm install
npm run dev
```

Outside the extension context there is no `chrome.tabs`, so the dev server renders a set of demo tabs — handy for working on the UI. Rebuild with `npm run build` and reload the extension at `chrome://extensions` to test the real thing.

A **pre-commit hook** keeps the committed `extension/` in sync automatically: whenever you commit changes to the source, it rebuilds and stages `extension/` for you (a failed build aborts the commit). It's enabled automatically the first time you run `npm install`; to enable it manually, run `git config core.hooksPath .githooks`.

Use `npm run package` to produce a versioned `.zip` for the Chrome Web Store.

---

## Tech stack

| What | How |
|------|-----|
| Extension | Chrome Manifest V3 (new tab override + badge service worker) |
| UI | React 19 + [shadcn/ui](https://ui.shadcn.com) (Card, Item, Alert, Badge, ScrollArea, Empty, sonner) |
| Styling | Tailwind CSS v4, semantic tokens, system light/dark |
| Build | Vite → static `extension/`, all assets bundled (no CDN, no remote fonts) |
| Favicons | Chrome's built-in `_favicon` cache (no external requests) |
| Sound | Web Audio API (synthesized swoosh, no files) |
| Confetti | Plain DOM particles, no libraries |

---

## License

MIT © 2026 Hiro Yamada.

This project is a derivative work of [Tab Out](https://github.com/zarazhangrui/tab-out) (MIT © Zara Zhang), whose original copyright and license terms are preserved in [`LICENSE`](./LICENSE).

# Project Minto V2

A native desktop **rugby league management sim** — Football Manager for the NRL,
minus the 3D match engine. Deep simulation, deep management, decisions that
actually change results.

This is **V2**: a [Tauri](https://tauri.app) (Rust) desktop app hosting the game
UI, with the simulation engine moving into Rust over time. The original
HTML/web version lives in `../project-minto` and is **frozen as a reference**.

See [SCOPE.md](SCOPE.md) for the vision and boundaries, [ROADMAP.md](ROADMAP.md)
for the plan, [HANDOVER.md](HANDOVER.md) for current state, and
[VERSION_HISTORY.md](VERSION_HISTORY.md) for beta release notes.

## Layout

```
frontend/         the game UI (HTML / CSS / vanilla JS)
  index.html
  styles.css
  src/engine/     game logic (JS today; ported to Rust over time)
  src/ui/         view layer (pages, modals, helpers)
src-tauri/         the Rust / Tauri desktop shell
  src/lib.rs       app entry + save commands
  tauri.conf.json  window + bundle config
  icons/           app icons
SCOPE.md / ROADMAP.md / HANDOVER.md
```

## Prerequisites (Linux / Fedora)

```bash
# 1. Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

# 2. Tauri system libraries
sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel
sudo dnf group install -y c-development

# 3. Node.js (already present if you have npm)
```

## Launch

From the `project-mintoV2/` directory:

```bash
npm install     # one-time: installs the local Tauri CLI
npm run dev      # build (first run takes a few minutes) and launch the app
```

To produce a distributable bundle:

```bash
npm run build    # outputs to src-tauri/target/release/bundle/ (AppImage, .deb)
```

## Saves

Saves are written by the Rust backend to the OS app-data folder:

- **Linux:** `~/.local/share/com.minto.app/saves/`
- **Windows:** `%APPDATA%\com.minto.app\saves\`
- **macOS:** `~/Library/Application Support/com.minto.app/saves/`

(When the frontend is opened in a plain browser instead of Tauri, it falls back
to the old HTTP save API — handy for quick UI iteration.)

## Troubleshooting

- **`Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display`** —
  a WebKitGTK + Wayland bug. The app sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` at
  startup to avoid it, so this should not occur. If it still does, try running
  with `GDK_BACKEND=x11 npm run dev`.
- **First build is slow** — Tauri compiles a large Rust dependency tree once;
  subsequent builds are incremental and fast.

## Roadmap (short form)

- **Phase 1 ✅** — Tauri desktop shell; saves handled by Rust.
- **Phase 2** — Vite build step + ES modules.
- **Phase 3** — port the simulation engine into Rust (RNG/players → match engine).
- **Phase 4** — Rust owns all state; SQLite saves; JS becomes a pure view.

Full feature plan in [ROADMAP.md](ROADMAP.md).

# Project Minto V2 — Handover

_Updated every session._

## ⏸️ Session Pause Note (for the next assistant)

**Phase 1 (Tauri desktop shell) is complete and verified compiling/running.**
No work is mid-flight. The app launches as a native Linux window, loads the V1
web UI unchanged, and saves through Rust commands.

- **This session:** created `project-mintoV2` as a Tauri + Rust desktop port of
  Project Minto (V1 left untouched). Scaffolded the shell, wrote the Rust save
  layer, added the frontend Tauri shim, installed the toolchain, got it
  building and running, fixed a Wayland crash. Wrote SCOPE / README / ROADMAP /
  this handover.
- **Project decisions locked this session** (see Decisions Log below): real NRL
  names/logos, full FM-level sim depth, Rust engine port is first priority,
  V1 frozen as reference.
- **Next up:** Phase 2 (Vite + ES modules) then Phase 3 step 1 (port RNG +
  player generation to Rust). See ROADMAP.md.
- **Not yet done:** a full play-through verifying save/load across a session in
  the packaged app; `npm run build` (bundle) not yet produced; V2 is not yet a
  git repo.

## How to run

From `project-mintoV2/`:

```bash
npm install     # one-time (local Tauri CLI)
npm run dev      # build + launch (first build is slow)
npm run build    # distributable bundle
```

Rust env: `. "$HOME/.cargo/env"` if `cargo` isn't on PATH in a fresh shell.
Full prerequisites and troubleshooting in README.md.

## Current state — what works

- **Tauri shell** loads `frontend/index.html` (the V1 UI) in a native window
  (1280×832, resizable, min 1024×700).
- **Saves via Rust** — `list_saves` / `load_save` / `write_save` / `delete_save`
  in `src-tauri/src/lib.rs`, writing JSON to `~/.local/share/com.minto.app/saves/`.
  Verified: the saves directory is created on launch.
- **Frontend save shim** — `frontend/src/engine/12-save.js` detects
  `window.__TAURI__` and routes save calls to `invoke`; falls back to the old
  `/api/saves` HTTP API in a plain browser.
- **`withGlobalTauri: true`** in `tauri.conf.json` exposes `window.__TAURI__` so
  the plain-`<script>` frontend can call Rust without a bundler.
- **Wayland crash fix** — `run()` sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` on
  Linux at startup (avoids Gdk "Error 71"). No env var needed at launch.
- Compiles cleanly (`cargo build`); app runs and exits cleanly.

## Project shape

- **`frontend/`** — the game UI, copied from V1 (HTML/CSS/vanilla JS). Same
  architecture as V1: global `G` = game state, global `UI` = view logic, page
  modules extend `UI` via `Object.assign`. Still loaded as ~40 ordered
  `<script>` tags (retired in Phase 2). Engine in `frontend/src/engine/`, UI in
  `frontend/src/ui/`.
- **`src-tauri/`** — the Rust desktop shell.
  - `src/lib.rs` — app entry (`run()`) + the four save commands + Wayland fix.
  - `src/main.rs` — thin binary entry calling `app_lib::run()`.
  - `tauri.conf.json` — window/bundle config; `frontendDist: "../frontend"`,
    `withGlobalTauri: true`, identifier `com.minto.app`.
  - `Cargo.toml` — deps: `tauri`, `tauri-plugin-log`, `serde`, `serde_json`, `log`.
  - `capabilities/default.json` — `core:default` permissions (custom commands
    need no capability entry).
  - `icons/` — default Tauri icon set (placeholder — replace with real branding).
- **`package.json`** — `dev` / `build` / `tauri` scripts; `@tauri-apps/cli` dev dep.

### Syntax check (frontend, unchanged from V1)
```bash
cd frontend && for f in src/engine/*.js src/ui/*.js src/ui/pages/*.js; do node --check "$f" || exit 1; done
```

## Decisions Log (2026-06-26)

| Question | Decision |
|---|---|
| Real NRL identity | **Real NRL names/logos for now** (personal use). Leaning toward shipping **fictional-by-default + a real-life "mod" data pack** — possibly from the start. Hard requirement either way: **data layer must be swappable from day one** (all identity loaded from data, never hard-coded) so the fictional/real split is config, not a rewrite. |
| Match-sim depth ceiling | **Full FM-level tactical depth** (sets, tackles, field position, ruck, play-by-play, fatigue, HIA). |
| First priority after Phase 1 | **Rust engine port (foundation)** — RNG/players first, then match engine. |
| V1 (HTML version) | **Frozen as reference.** No new features in V1; V2 is the sole dev line. |

## Reference docs

- `SCOPE.md` — vision, non-goals, platforms, licensing, sim-depth target.
- `ROADMAP.md` — technical track (Phases 1–5) + feature track (A–F).
- `README.md` — prerequisites, launch, saves, troubleshooting.

## Suggested next steps

1. **Phase 2** — add Vite + ES modules; formalise the engine/UI boundary.
2. **Phase 3 step 1** — port `01-rng.js` + `03-players.js` to a Rust crate;
   validate output parity against the JS, expose via a Tauri command.
3. Initialise V2 as its own git repo when ready.
4. Replace placeholder app icons with real branding.

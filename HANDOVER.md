# Project Minto V2 — Handover

_Updated every session._

## ⏸️ Session Pause Note (for the next assistant)

**Continuation session complete.** Frontend build clean: 54 modules, ~550 kB, no errors.

- **Latest work after simulation-depth brief:** Implemented the first tactical
  intelligence slice:
  1. Wednesday pre-match preview is now a staff/scout opponent report with
     imperfect confidence based on attack coach, defence coach, scout, and coach
     tactics ratings.
  2. Report includes expected XIII, how the opponent scores, key playmaker/strike
     runner/yardage threat, vulnerable channel, selection notes, and a concrete
     recommendation.
  3. Structured report data is stored in `G.matchIntel` and on the inbox news item.
  4. Inbox analysis items now link to Tactics.
  5. Tactics page shows latest opponent report and has quick-apply buttons for the
     recommended attacking focus.
  6. Added `myTeam().matchPrefs.attackFocus` with real match-engine effects:
     balanced, middle, left, right, territory. It changes run distribution, metres,
     line-break chance, kicking volume, and error risk.
  7. Attacking focus now also modifies expected tries by comparing the selected
     attacking channel against the opponent's relevant defensive channel.
  8. Match Day now exposes attacking focus controls and links to the staff report.
  9. Verified syntax/build plus browser smoke test: generate career -> complete
     preseason -> advance to Wednesday -> report appears -> Tactics shows report
     -> tactical focus applies -> match sim completes.
- **User clarified desired simulation depth:** add a strong manager-impact loop:
  Wednesday staff/scout pre-match analysis with accuracy based on staff ratings;
  actionable opponent tendencies and vulnerabilities; and pre-match/in-match
  tactical decisions that directly affect the match engine. Examples include
  targeting a weak edge/middle, selecting a defensive centre to mark a strike
  centre, rushing a key playmaker, tiring a halfback/five-eighth by forcing
  tackles, changing tempo/risk/offload instructions, kicking to corners to
  protect a lead, or chasing points with expansive play. This has been added to
  `SCOPE.md` and `ROADMAP.md`.
- **Latest continuation:** Picked up unfinished work from the previous session and fixed
  the actual half-implemented issues:
  1. Fixed `09-calendar.js` duplicate `myPos` declaration that broke `vite build`.
  2. Routed new-game, slot-load, file-import, and "new career" state resets through
     `setG()` so the ES-module state singleton and `window.G` stay in sync.
  3. Removed the stale `05-offseason-view.js` import from `src/main.js`; it was
     overriding the newer preseason offseason view and dumping users back to Dashboard.
  4. Fixed the `match-report` route alias so full match reports no longer fall back to
     Dashboard.
  5. Added derived territory percentage (`terrH`/`terrA`) alongside possession and
     surfaced it in both the compact and full match reports.
  6. Verified via Chrome DevTools smoke test: wizard -> pick club -> complete preseason
     -> sim match -> open full match report with Territory % visible.
- **Previous feature depth session (Feature Track E + F):** Six game-feel improvements:
  1. **Round Summary news** — after each round completes, a "Round X Wrap" item
     appears in the inbox (leader, biggest win, top try scorer). In `08-progression.js`
     `generateWeeklyMedia()`.
  2. **Narrative match feed events** — line-break, big-tackle, and error commentary
     events now appear in both `_buildFeed` (sim-to-result) and `_buildHalfFeedEvents`
     (watch-game live feed). Uses `l.lb` line-break stat for triggers.
  3. **Career milestones** — when a coached-team player hits 50/100/150/200/250/300
     NRL games or 50/100/150/200 career tries, a 'milestone' news item is generated
     in `07-match.js` inside `updatePlayerForm()`.
  4. **Mid-week preview** — `generatePreMatchPreview()` in `09-calendar.js` fires
     when the calendar advances to Wednesday (dow=2). Adds an 'analysis'/'Match Preview'
     inbox item about the upcoming opponent (position, form, injuries, upset flags).
     Guards against duplicate with `G.calendar.previewRound`.
  5. **Team of the Week news** — `generateWeeklyMedia()` checks which coached-team
     players received a ToTW award for the current round and generates a 'league'
     news item.
  6. **Inbox tabs** — added 'milestone' (Milestones) and 'league' (League News)
     filter tabs to `inbox.js`; added action buttons for both new types.
- **Previous session highlights (also done):** Team theming (alpha CSS vars), confetti
  accent colour, advance button gate labels, match result news in inbox,
  pre-match standings/H2H strip, board confidence feedback.
- **Not yet started:** Phase 3 (Rust engine port) — requires `cargo` on PATH.
  The technical track paused to do feature depth work instead.

## How to run

From `project-minto-v2/`:

```bash
# Source cargo first if needed
. "$HOME/.cargo/env"

npm install          # one-time (installs @tauri-apps/cli + vite)
npm run dev          # starts Vite dev server + Tauri (first build slow)
npm run build        # distributable bundle

# Frontend only (no Tauri, just the browser):
npm run frontend:dev    # starts Vite at http://localhost:5173
npm run frontend:build  # builds to frontend/dist/
```

Rust env: `. "$HOME/.cargo/env"` if `cargo` isn't on PATH in a fresh shell.
Full prerequisites and troubleshooting in README.md.

## Current state — what works

- **Phase 1:** Tauri shell, save/load via Rust commands, Wayland fix — all intact.
- **Phase 2 — Vite + ES modules:**
  - `vite build` succeeds: 54 modules → single JS bundle (~550 kB).
  - The 40-`<script>` chain is retired; `index.html` has one `<script type="module">`.
  - All 13 engine files are proper ES modules with named `export` declarations.
  - Engine files also assign their exports to `window` so UI pages use them as globals.
  - `00-state.js` manages the G singleton; `setG()` keeps `window.G` in sync.
  - `03-players.js` now exports `resetPid()`, `setPid()`, `getPid()` for cross-module PID management.
  - `01-core.js` exports `UI` and sets `window.UI`; all other UI files import `{ UI }`.
  - All 29 UI page files have been given `import { UI } from '../01-core.js'` (minimal change).
  - `05-helpers.js` assigns helper functions (`teamLogo`, `ovrCls`, etc.) to `window`.
  - Tauri config updated: `devUrl: "http://localhost:5173"`, `beforeDevCommand`, `beforeBuildCommand`.
- **Frontend save shim** — `12-save.js` detects `window.__TAURI__` and routes save calls
  to `invoke`; falls back to `/api/saves` HTTP API in a plain browser.
- Compiles cleanly (`vite build`); frontend UI is functional.

## Project shape

- **`frontend/`** — the game UI.
  - `index.html` — single `<script type="module" src="/src/main.js">`.
  - `src/main.js` — entry point; imports all engine then UI modules in order.
  - `src/engine/00-state.js` — G singleton with `setG()` + window sync.
  - `src/engine/01-rng.js` … `12-save.js` — engine as ES modules (export + window assign).
  - `src/ui/01-core.js` — exports `UI` and sets `window.UI`.
  - `src/ui/pages/` — 29 page files; use UI + engine globals.
  - `vite.config.js` — Vite config (root=frontend, outDir=dist).
- **`src-tauri/`** — the Rust desktop shell (unchanged from Phase 1).
- **`package.json`** — scripts: `dev`, `build`, `frontend:dev`, `frontend:build`.

### Syntax check (all JS)
```bash
cd frontend && node --check src/engine/*.js src/ui/*.js src/ui/pages/*.js
```

### Vite build check
```bash
cd frontend && npx vite build
```

## Decisions Log

| Question | Decision |
|---|---|
| Real NRL identity | **Real NRL names/logos for now** (personal use). Data-driven identity from day one — swappable config, not a rewrite. |
| Match-sim depth ceiling | **Full FM-level tactical depth** (sets, tackles, field position, ruck, play-by-play, fatigue, HIA). |
| Coach agency | **Manager decisions must directly affect results.** Staff reports expose imperfect tactical intelligence; lineup, role, pre-match, and in-match instructions should change odds through the match engine. |
| First priority after Phase 1 | **Rust engine port (foundation)** — RNG/players first, then match engine. |
| V1 (HTML version) | **Frozen as reference.** No new features in V1; V2 is the sole dev line. |
| Phase 2 ES module strategy | **Window globals shim** — engine files export + assign to window; UI page files use globals; clean border is the engine's named-export API. UI pages will be fully modularised incrementally during Phase 3+ work. |

## Reference docs

- `SCOPE.md` — vision, non-goals, platforms, licensing, sim-depth target.
- `ROADMAP.md` — technical track (Phases 1–5) + feature track (A–F).
- `README.md` — prerequisites, launch, saves, troubleshooting.

## Suggested next steps

### Technical track (Phase 3)
1. **Phase 3 step 1** — port `01-rng.js` + `03-players.js` to a Rust crate.
   - Start with the RNG (a seedable LCG — trivial in Rust).
   - Validate output parity: run the same seed through both JS and Rust and compare.
   - Expose via a Tauri command: `generate_players(cfg)` → JSON.
   - **Requires `cargo` on PATH**: `. "$HOME/.cargo/env"` in the terminal first.
2. Test a full play-through via `npm run dev` in a terminal with Cargo on PATH.
3. Begin Phase 3 step 2: teams, fixtures, selection in Rust.

### Feature track (if doing another feature session)
- **Match engine depth (Feature A)**: Set-by-set possession and territory tracking in
  `07-match.js`. The `simMatchHalf` function is the right entry point. Add a possession
  counter per set and track territory zones (own-20, own-40, mid, opp-40, opp-20).
  Surface in the match report as "possession %" and "territory %".
  - First slice now done: derived possession/territory percentages exist and are visible.
    Remaining work is the deeper set-by-set possession/territory model.
- **Tactical intelligence / pre-match analysis:** Build Wednesday staff reports with
  imperfect accuracy based on coaching/scouting ratings. Reports should identify
  opponent lineup, key players, scoring channels, and vulnerabilities, then link to
  actionable tactical changes.
  - First slice done: report generation, inbox item, Tactics-page display, and
    quick-apply attack focus. Match Day also exposes the focus before kick-off.
- **In-match management (Feature B)**: The second half currently plays out automatically.
  Adding a pause at the 60' mark (2/3 of the way through) for another sub window and
  tactical adjustment would make the live-watch experience richer. Tactical switches
  should include middle/left/right focus, tempo, offload risk, field-position kicking,
  defensive aggression, rush pressure, and target-player instructions.
  - Next technical step: split second-half simulation into 40-60 and 60-80 chunks so
    60-minute tactical changes can affect the remaining result, not just messaging.
- **Replace placeholder app icons** with real branding.
- **Onboarding** (Feature E): A clearer "what to do first" overlay for new saves.

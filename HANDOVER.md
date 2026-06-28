# Project Minto V2 — Handover

_Updated every session._

## ⏸️ Session Pause Note (for the next assistant)

**Latest session work — match report grades, opponent form guide, richer watch-game feed:**

1. **Match grade column** added to the full match report player table (`match-report.js`).
   Uses the existing `l.r` (1–10 rating computed in `simTeamStats`) and converts to
   letter grades: A+/A/B+/B/C/D. Sorted by grade descending (highest-rated player first).

2. **Opponent recent form guide** on the matchday page (`matchday.js`). Shows the
   opposition's last 4 completed match results (W/L/D, score, opponent, round number)
   in a compact strip below the head-to-head record.

3. **Richer watch-game narrative** (`_buildHalfFeedEvents` in `07-match.js`):
   - Second line-break event if a player has 3+ LBs in the match
   - Kicking duel commentary naming the halfback/five-eighth
   - Late-game fatigue event (63–78 min) naming a forward still working hard
   - Scoreline context: "This is a real contest" (close) or "looking comfortable now" (big lead)
   All existing tactic-aware events preserved.

4. **Advance bug defensive fixes** (committed previously):
   - `advance()` intercepts match days, routes to matchday instead of auto-simming
   - try-catch around `advanceCalendarDay()` surfaces JS errors as toasts
   - Stale `_htPending`/`_60Pending` flags cleared in `buildMatchEventStream` and `simGamesForDow`

Build clean: 54 modules, 592 kB, no errors.

**Previous session work — continuous watch-game rewrite (complete):**

Replaced the old three-phase split-match system (0–40 / HT team-talk / 40–60 / 60–80) with a
fully continuous event stream. Subs and tactical changes can now happen at any point.

Key changes across `07-match.js` and `matchday.js`:

1. **`buildMatchEventStream(m, isFinal)`** added to `07-match.js`. Calls `simMatch` once at
   kick-off, tags all events with `evType` and `stoppage:bool`, inserts kickoff / halftime /
   fulltime markers, and returns a sorted flat list. No mid-game re-simulation.

2. **`_revealFeedContinuous(events, i, myM)`** — new streaming function. Time-gap-based delays:
   `delay = Math.max(150, round(gapMins × 7500 / watchSpeed))` → 80 min ≈ 10 real min at 1×.
   Flushes `_subQueue` at every `stoppage:true` event (never at half-time).

3. **`_toggleWatchPause()`** — pause/resume. Saves index, clears timeout, resumes from same point.

4. **`_flushSubQueue(myM, atMin)`** — applies queued subs, swaps lineup slots, writes to
   `myM.det.subs`, emits sub events spliced in after the current stoppage.

5. **`_addSubToQueue()` / `_removeSubFromQueue(qi)`** — add from dropdowns, remove by index.

6. **`_buildCoachingPanel(myM)`** — rebuilt without `phase` parameter. Sub queue UI replaces old
   `_coachSubPlans` selectors. Live "Queue" button + pending list with remove buttons.
   All existing tactic controls (attack focus, game intent, offloads, defence, pressure target,
   penalty, game plan) preserved.

7. **`p_watchgame()`** rewritten: speed slider (0.25–16×, range input), pause button, lineups +
   feed + coaching panel in a 3-col grid. Score initialises to "0", not "–".

8. **Old functions removed:** `_revealFeedPage`, `_revealFeedPageList`, `_buildTeamTalkHtml`,
   `_setCoachSubPlan`, `_applyHtSubs`, `_applyTeamTalk`, `_applyQueuedSubs`.

Build clean: 54 modules, 588 kB, no errors.

**Pending / known limitations:**
- Match outcome is pre-generated at kick-off — mid-game tactical changes affect the coaching
  panel copy and sub queue but cannot retroactively change the simulated result. Accepted as
  Phase 1 limitation; deep set-by-set engine (Feature A) will fix this later.
- Half-time is a non-stoppage event — no subs are applied there (by design, per user spec).
- The "All results" button and post-match report still rely on `_handleFullTime` (unchanged).

**Previous session work:**
1. **Sub plan consolidation complete.** `_setHtSubPlan` → `_setCoachSubPlan`; `_applyHtSubs`
   delegates to `_applyQueuedSubs(myM, 'ht')`. Single `UI._coachSubPlans` shared between HT
   modal and coaching panel sidebar.
2. **Coaching panel — full in-match control suite.** Panel now includes: bench sub selectors
   (applied at HT or 60'); attack focus; game intent (Chase/Normal/Protect); offloads
   (Low/Normal/High); defence (Structured/Aggressive); pressure target (select an opponent
   player); penalty preference; game plan. Sticky, scrollable, always visible during watch game.
3. **Game intent wired into engine.** `matchPrefs.gameIntent`: chase = +8%/+6% tries (both
   teams), protect = -7%/-5%. Re-read at each chunk independently.
4. **Offload risk and defensive style wired in.** `offloadRisk` modifies error chance (+/-9%)
   and line breaks (+/-12%). `defStyle` aggressive increases own missed tackles (+18%);
   opponent's aggressive defence increases the attacking team's line breaks (+8%).
5. **Target player pressure.** Coaching panel shows a dropdown of key opponent players (HB,
   FE, HK, WG, CE, FB, SR, LK). Targeting one reduces their runs (-20%), metres (-25%),
   and increases their error chance (+20%). Passed via `opts.targetPlayerId` to simTeamStats.
   `targetPlayerId` is cleared at match start in `autoSetAIMatchPrefs`.
6. **Combination chemistry wired into match execution.** Per-player `chemRating` from
   `t.combinations` adjusts error chance (~±8%) and line breaks (~±12%).
7. **AI tactical variety.** `autoSetAIMatchPrefs` runs at `_matchSetup` for non-coached teams,
   randomly assigning weighted attack focus, game intent, offload risk, and defensive style
   each match. Makes the tactical system bidirectional.
8. **Tactics page expanded.** "Match settings" card includes all 4 tactical controls with
   radio-row selectors and effect descriptions. Quick-apply buttons now include aggressive
   defence and offload suggestions based on the opponent report's attack/weakness analysis.
9. **Match Day focusCard expanded.** Game intent, offloads, and defensive style are now
   settable pre-kick-off alongside the existing attack focus.
10. **Match report: line breaks added.** LB column in player stats table; "Line breaks" row
    in team summary stats comparison (only shown if either team has LBs > 0).
11. Build clean — 54 modules, ~584 kB, no errors.



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
- **New design note from user:** add a team-page tactical diagnostics view showing
  attack/defence by channel: middle, left edge, right edge, back three/backfield
  (wingers + fullback), and spine (fullback + halves + hooker). Also add
  **combination chemistry** ratings for player groups. "Combination" is the rugby
  league term for player partnerships/groups; "chemistry" or "cohesion" is the
  rating. Playing together should improve chemistry; low chemistry should create
  timing errors/defensive misreads, high chemistry should improve execution.
- **Latest work on that note:** implemented the first team-page diagnostics slice.
  Club modals now show channel attack/defence ratings, channel production stats
  (tries, line breaks, metres, runs, tackles/missed tackles, errors), and
  combination chemistry for halves, hooker/halves, spine, edges, middle rotation,
  and back three. The match engine now persists `t.combinations` after matches so
  repeated groups build chemistry over time; new groupings project chemistry from
  role fit, position familiarity, decision making, composure, and team cohesion.
- **Inbox fix:** analysis/news items can now expand correctly. The bug was an
  inbox key type mismatch: `createdAt` numbers were compared against the string
  key stored by the click handler, so items marked read but never opened. Inbox
  keys are now normalised to strings, and expanded reports preserve line breaks.
- **Report style decision:** match and pre-match reports should read like real
  staff/media reports, not expose game ratings. Latest change removes visible
  player OVR/channel score language from the Wednesday opponent report, changes
  Tactics report confidence from a percentage to a qualitative staff read, makes
  post-match analysis describe performances in prose, and removes the `Rtg`
  column from the full match report player table. Internal ratings can still
  drive sorting/recommendations; do not print them in report copy.
- **Latest report-depth addition:** Wednesday reports now add league-context
  analyst notes such as where the opponent ranks for middle metres, edge tries,
  staff-modelled tries-conceded risk on the weak channel, and whether an
  opposition player is top five for tackle busts by the staff count. Current
  channel attack rankings use existing player season stats by lineup slot;
  defensive conceded-by-channel is still modelled from the lineup until the
  deeper set-by-set/channel telemetry lands.
- **Inbox/report readability update:** Inbox now uses a mail-style layout with
  messages in a left column and the selected item in a central reading pane.
  Opponent reports are sectioned (`Summary`, `Staff read`, `League context`,
  `Expected XIII`, `Key threats`, `Plan`) and the recommendation now checks
  combined evidence so the report does not call an area both vulnerable and
  well-defended. Future enhancement: add charts/tables/graphics to the analysis
  pane once channel telemetry is richer.
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
- **Team-page tactical diagnostics:** First slice done on club modals. It shows
  channel ratings/stat output and persisted combination chemistry. Remaining work:
  feed the chemistry rating directly into timing errors, defensive misreads,
  attacking execution, and richer channel stats as the set-by-set engine lands.
- **In-match management (Feature B)**: ✅ Complete. The coaching panel has:
  attack focus, game intent (chase/normal/protect), offloads (low/normal/high), defence
  (structured/aggressive), pressure target (specific opponent player), subs, penalty, game
  plan. All wired into the match engine with meaningful per-chunk effects. AI teams also
  receive random tactical settings each match. The Tactics page and Match Day page both
  expose these pre-match. Tactic-aware narrative events now fire in both the split watch-game
  and sim-to-result feeds, reflecting offloads, territory focus, chase/protect intent,
  aggressive defence, and pressure targeting by name.
- **Replace placeholder app icons** with real branding.
- **Onboarding** (Feature E): A clearer "what to do first" overlay for new saves.

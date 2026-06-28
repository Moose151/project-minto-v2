# Project Minto V2 — Handover

_Updated every session._

## ⏸️ Session Pause Note (for the next assistant)

**Latest session work — morale system, board relationship, man management depth:**

### 1. Rotation-based morale (`08-progression.js` — `weeklyRecoveryAndDev`)
- Top-squad players consistently dropped from the 17 lose morale each week: −1 after 2w out, −2 after 3w, −3 after 5w+
- Good Man Management (`G.coach.attrs.manMgmt`) partially mitigates the penalty
- Regular starters (in the starting 13) get a small morale boost every 3 weeks
- `p.weeksDropped` and `p.weeksStarting` track consecutive weeks in/out; both reset at offseason
- Only applies during `G.phase === 'regular'` and only for `squad === 'top'` players

### 2. Squad mood panel (training page — `training.js`)
- New section injected between Load Management and Development Pipeline
- Shows squad average morale with colour-coded bar and mood label (Buoyant / Positive / Stable / Unsettled / Low)
- "Low morale players" section — any top-squad player under 40 morale, showing weeks dropped
- "Rotation risk" section — players 3+ weeks out of the squad who are losing morale

### 3. Coach page overhaul (`coach.js`)
- Old: three small stat cards. New: a prominent Board Objectives card plus cleaned-up rep/record cards
- Board Objectives card shows: season target (ladder position required), current position vs target, trajectory label ("Exceeding expectations" / "On track" / "Pressure building" / "Below expectations"), projected season-end outcome with board confidence impact, confidence meter with descriptive text, and contract security indicator (Secure / Stable / Final year / Expired)
- Man Management attribute description updated to mention rotation morale effects

### 4. Dashboard alerts enhanced (`dashboard.js`)
- Low squad morale (avg < 40): "Squad morale low" alert → links to Training page
- Rotation discontent (3+ players 4+ weeks out of 17): "Rotation discontent" neutral alert → links to Training
- Board pressure alert now links to Coach page instead of Ladder

### 5. Player modal context (`player-modal.js`)
- Squad label now shows "Out of 17 · Xw" or "Regular starter · Xw" when `weeksDropped >= 3` or `weeksStarting >= 3`

### 6. Inbox one-on-one meeting (`inbox.js` + `player-modal.js`)
- Player messages with morale < 50 show "One-on-one meeting" button instead of "Squad"
- `UI.playerMeeting(id)` modal: context-aware prompt (dropped X weeks / critically low / declining)
- 4 response options: Promise game time / Clarify his role / Challenge him / Just listen
- Man Management scales each option's effectiveness (0.7× at mm=0, 1.5× at mm=99)
- "Promise game time" sets `p.promisedGameTime = true` (hooks into existing promise concern system)
- `UI._doPlayerMeeting()` applies morale, cohesion, and optional form boost; auto-saves

### 7. Team talk — Man Management scaling (`matchday.js`)
- `doTeamTalk()` now applies a Man Management multiplier: `0.84 + (mm/99) * 0.66` (≈0.84× at mm=0, ≈1.5× at mm=99)
- Effective moraleD and cohD calculated at click time and shown on the buttons pre-click
- Man Management label shown above the button grid ("low / average / high impact")
- Stored `m.teamTalk` now reflects the actual effective values (not the base values)

### 8. Mid-season board review (`08-progression.js` — `completeRound`)
- Fires once per season at the halfway round (round = `Math.floor(totalRounds / 2)`)
- Compares current ladder position to `G.coach.expect.minPos`
- Generates an inbox Board message and adjusts `G.coach.conf` (+4 / +2 / −2 / −6 depending on trajectory)
- `G._midSeasonReviewDone` flag prevents double-firing; reset to `false` at season start in `11-offseason.js`

---

**Previous session work — UI page rewrites + matchday systems:**

### 1. Training page — full rewrite (`training.js`)
- Development pipeline section: visual OVR→potential bars for the top 12 developing players
- Per-player **Attribute Target** dropdown (grouped Offensive / Defensive / Physical / Mental, ★ marks key attrs)
- Key attributes badges column showing the top 5 position-relevant attrs with current values
- `setAttrTarget(id, val)` method wires directly to `p.attrTarget` on the player object
- `developPlayer()` in `08-progression.js` was updated to honour `p.attrTarget`: 65% of weekly gains go to the target attr; if capped at 99 or target is clear, falls back to normal key-attr distribution

### 2. Season Leaders page — full rewrite (`season-leaders.js`)
- 5-tab layout: Attack / Defence / Kicking / Scoring / General
- Prominent top-3 leader cards with large value display, team colour bar, gold/silver/bronze rank colour
- Full top-10 table per category with a per-80-min column for counting stats
- Kicking % section with minimum-games guard

### 3. Achievements page — full rewrite (`achievements.js`)
- Gold / Silver / Bronze tier system with matching colour, background, and border per card
- Categories: Season Success / Match Feats / Club Milestones / Player Talent
- Progress hints for trackable locked achievements (season count, funds vs $5M, consecutive prems)
- 2-column grid layout; tier summary strip at the top (earned vs total per tier)

### 4. Ladder page — rewrite (`ladder.js`)
- Standings tab: added Win% column (coloured green ≥60%, red <40%)
- New **Home/Away** tab: computes `hw/hl/hd/aw/al/ad` by iterating `G.fixtures` directly (no engine change needed); two-level header, home Win% and away Win% colour-coded

### 5. Fantasy page — full rewrite (`fantasy.js`)
- **Team of the Round** tab: 13-slot pitch layout mirroring real positions (FB / WG WG / CE CE / FE HB / PR HK PR / SR SR / LK); greedy best-per-slot allocation from round scores; 88px chips with FP badge colour-coded (≥70 green, ≥50 accent)
- **Round Scores** tab: full top-20 table with all stat columns and FP
- **Season Ladder** tab: original leaderboard with position filter + sort; preserved

### 6. Matchday — pre-match team talk system (`matchday.js`)
- 5 team talk options (Fire them up / Stay composed / Back yourselves / Put them under / Enjoy the moment)
- Each applies `moraleD` to the starting 13 and `cohD` to team cohesion — both feed directly into `squadStrength()` in `07-match.js`
- Shows as button-cards before kick-off; collapses to a summary card once chosen
- `m.teamTalk` flag prevents re-selection

### 7. Matchday — post-match press conference (`matchday.js`)
- Triggers 600ms after full time via `_showPressConference(myM, won, drew)`
- Context-sensitive question (big win / close win / draw / close loss / heavy loss)
- Win: 4 options (Credit opponent / Back the process / Demand higher standards / Let them enjoy it)
- Draw: 3 options (Take the positives / We can do better / Stick together)
- Loss: 4 options (We will respond / Honest review needed / Back the playing group / Trust the process)
- Each option applies `confD` to `G.coach.conf`, `morD` to all 17 squad players, `cohD` to team cohesion
- `myM.pressConf = true` prevents re-triggering; auto-saves after selection; toast shows effects applied

---

**Previous session work — match report grades, opponent form guide, richer watch-game feed:**

1. **Match grade column** in the full match report player table (`match-report.js`). Uses `l.r` (1–10 rating) → letter grades A+/A/B+/B/C/D. Sorted by grade descending.

2. **Opponent recent form guide** on the matchday page. Shows the opposition's last 4 completed match results (W/L/D, score, opponent, round) in a compact strip below the H2H record.

3. **Richer watch-game narrative** (`_buildHalfFeedEvents` in `07-match.js`):
   - Second line-break event if a player has 3+ LBs in the match
   - Kicking duel commentary naming the halfback/five-eighth
   - Late-game fatigue event (63–78 min) naming a forward still working hard
   - Scoreline context ("This is a real contest" / "looking comfortable now")

4. **Split second half into 40–60 and 60–80 chunks** with a persistent coaching panel that stays visible across both halves.

---

**Earlier session work — continuous watch-game rewrite (complete):**

Replaced the old three-phase split-match system with a fully continuous event stream. Subs and tactical changes can now happen at any point.

Key changes across `07-match.js` and `matchday.js`:

1. **`buildMatchEventStream(m, isFinal)`** — calls `simMatch` once at kick-off, tags all events with `evType` and `stoppage:bool`, inserts kickoff / halftime / fulltime markers, returns a sorted flat list.

2. **`_revealFeedContinuous(events, i, myM)`** — time-gap-based delays: `delay = Math.max(150, round(gapMins × 7500 / watchSpeed))` → 80 min ≈ 10 real min at 1×.

3. **`_toggleWatchPause()`** — pause/resume; saves index, clears timeout, resumes from same point.

4. **`_flushSubQueue(myM, atMin)`** — applies queued subs, swaps lineup slots, writes to `myM.det.subs`, splices sub events in after the current stoppage.

5. **`_addSubToQueue()` / `_removeSubFromQueue(qi)`** — add from dropdowns, remove by index.

6. **`_buildCoachingPanel(myM)`** — rebuilt without `phase` parameter. Sub queue UI. All existing tactic controls preserved.

7. **`p_watchgame()`** rewritten: speed slider (0.25–16×), pause button, lineups + feed + coaching panel in 3-col grid.

---

**Earlier session work — in-match management + tactical engine:**

1. Sub plan consolidation: single `UI._coachSubPlans` shared between HT modal and coaching panel sidebar.
2. Coaching panel: attack focus, game intent (Chase/Normal/Protect), offloads (Low/Normal/High), defence (Structured/Aggressive), pressure target (specific opponent player), penalty preference, game plan.
3. **Game intent wired into engine:** chase = +8%/+6% tries; protect = -7%/-5%.
4. **Offload risk wired in:** modifies error chance (±9%) and line breaks (±12%).
5. **Defensive style wired in:** aggressive increases own missed tackles (+18%); opponent aggressive defence increases attacker line breaks (+8%).
6. **Pressure target:** reduces target's runs (−20%), metres (−25%), raises error chance (+20%).
7. **Combination chemistry wired into match execution:** `chemRating` from `t.combinations` adjusts error chance (~±8%) and line breaks (~±12%).
8. **AI tactical variety:** `autoSetAIMatchPrefs` assigns random weighted tactics at match start for all non-coached teams.
9. **Tactics page expanded** with match settings card and quick-apply buttons.
10. **Match Day focusCard expanded** to include game intent, offloads, defensive style pre-kick-off.
11. Line breaks added to match report (LB column + team stat row).

---

**Earlier session work — tactical intelligence / opponent reports:**

1. Wednesday pre-match preview is a staff/scout opponent report with imperfect confidence based on attack coach, defence coach, scout, and coach tactics ratings.
2. Report includes expected XIII, how the opponent scores, key playmaker/strike runner/yardage threat, vulnerable channel, selection notes, and concrete recommendation.
3. Structured report data stored in `G.matchIntel` and on the inbox news item.
4. Tactics page shows latest opponent report; quick-apply buttons for recommended attacking focus.
5. `myTeam().matchPrefs.attackFocus` wired into the match engine: balanced, middle, left, right, territory each affect run distribution, metres, line-break chance, kicking volume, error risk.
6. Match Day exposes attacking focus controls and links to the staff report.
7. League-context analyst notes added (channel rankings, key player stat comparisons).
8. Inbox uses mail-style layout (messages left, reading pane right); opponent reports sectioned (Summary / Staff read / League context / Expected XIII / Key threats / Plan).

---

**Earlier session work — team diagnostics + combination chemistry:**

- Club modals show channel attack/defence ratings, channel production stats (tries, LBs, metres, runs, tackles/missed tackles, errors), and combination chemistry for: halves, hooker/halves, spine, edges, middle rotation, back three.
- Match engine persists `t.combinations` after matches so repeated groups build chemistry over time.
- New groupings project chemistry from role fit, position familiarity, decision making, composure, and team cohesion.

---

**Pending / known limitations:**
- Match outcome is pre-generated at kick-off — mid-game tactical changes affect the coaching panel copy and sub queue but cannot retroactively change the simulated result. Accepted as Phase 1 limitation; deep set-by-set engine (Feature A) will fix this later.
- Half-time is a non-stoppage event — no subs applied there (by design).
- Phase 3 Rust engine port not yet started — requires `cargo` on PATH.

---

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

---

## Current state — what works

- **Phase 1:** Tauri shell, save/load via Rust commands, Wayland fix — all intact.
- **Phase 2 — Vite + ES modules:**
  - `vite build` succeeds: 54 modules → single JS bundle (~643 kB).
  - The 40-`<script>` chain is retired; `index.html` has one `<script type="module">`.
  - All 13 engine files are proper ES modules with named `export` declarations.
  - Engine files also assign their exports to `window` so UI pages use them as globals.
  - `00-state.js` manages the G singleton; `setG()` keeps `window.G` in sync.
  - `03-players.js` exports `resetPid()`, `setPid()`, `getPid()` for cross-module PID management.
  - `01-core.js` exports `UI` and sets `window.UI`; all other UI files import `{ UI }`.
  - All 29 UI page files have `import { UI } from '../01-core.js'`.
  - `05-helpers.js` assigns helper functions (`teamLogo`, `ovrCls`, etc.) to `window`.
  - Tauri config: `devUrl: "http://localhost:5173"`, `beforeDevCommand`, `beforeBuildCommand`.
- **Frontend save shim** — `12-save.js` detects `window.__TAURI__` and routes save calls to `invoke`; falls back to `/api/saves` HTTP API in a plain browser.
- Compiles cleanly (`vite build`); frontend UI is functional.

---

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

---

## Decisions Log

| Question | Decision |
|---|---|
| Real NRL identity | **Real NRL names/logos for now** (personal use). Data-driven identity — swappable config, not a rewrite. |
| Match-sim depth ceiling | **Full FM-level tactical depth** (sets, tackles, field position, ruck, play-by-play, fatigue, HIA). |
| Coach agency | **Manager decisions must directly affect results.** Staff reports expose imperfect tactical intelligence; lineup, role, pre-match, and in-match instructions change odds through the match engine. |
| First priority after Phase 1 | **Rust engine port (foundation)** — RNG/players first, then match engine. |
| V1 (HTML version) | **Frozen as reference.** No new features in V1; V2 is the sole dev line. |
| Phase 2 ES module strategy | **Window globals shim** — engine files export + assign to window; UI page files use globals. Clean border is the engine's named-export API. |

---

## Reference docs

- `SCOPE.md` — vision, non-goals, platforms, licensing, sim-depth target.
- `ROADMAP.md` — technical track (Phases 1–5) + feature track (A–F).
- `README.md` — prerequisites, launch, saves, troubleshooting.

---

## Suggested next steps

### Feature ideas (roughly prioritised)

1. **Transfer/recruitment window** — currently no in-season player movement. A mid-season loan/trade system or end-of-season free agency would give the squad management loop real decisions. Player `weeksDropped` and low morale now provide a natural trigger for "player wants out" storylines.

2. **Win/loss streak morale** — a team on a 4+ game winning streak should see a collective squad morale lift. A losing streak should compound pressure on top of the existing per-match penalties. Streak tracking already exists in `ladder()` form data.

3. **Board season briefing inbox item** — at the start of each season, generate a "Board Briefing" inbox message with the target, contract situation, and one key objective. Would make the season open with clearer stakes.

4. **Form indicators on teamsheet** — player form is tracked (`p.form`) but only shown on squad/modal pages. Surfacing hot/cold indicators directly on the teamsheet would make it influence lineup decisions more visibly.

5. **Deeper set-by-set match engine (Feature A)** — the big remaining sim-depth item. `simMatchHalf` is the entry point. Add possession counter per set, track territory zones (own-20, own-40, mid, opp-40, opp-20). Surface as live territory shift in the watch-game feed.

6. **Onboarding** (Feature E) — a clearer "what to do first" overlay for new saves.

7. **Replace placeholder app icons** with real branding.

### Technical track (Phase 3)
1. Port `01-rng.js` + `03-players.js` to a Rust crate; validate parity via same-seed comparison.
2. Expose via Tauri command: `generate_players(cfg)` → JSON.
3. **Requires `cargo` on PATH**: `. "$HOME/.cargo/env"` in the terminal first.

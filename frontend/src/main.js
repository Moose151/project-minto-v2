/* ---------- Project Minto V2 — module entry point (Phase 2) ----------
   Engine modules are loaded first; each assigns its public API to window
   so legacy UI page files can access functions as bare globals.          */

// Engine (evaluation order matters — each builds on the previous)
import './engine/00-state.js';
import './engine/01-rng.js';
import './engine/02-data.js';
import './engine/03-players.js';
import './engine/04-teams.js';
import './engine/05-game.js';
import './engine/06-selection.js';
import './engine/07-match.js';
import './engine/08-progression.js';
import './engine/09-calendar.js';
import './engine/09-ladder.js';
import './engine/10-finals.js';
import './engine/11-offseason.js';
import './engine/12-save.js';

// UI core (extends window.UI and assigns page handlers)
import './ui/01-core.js';
import './ui/02-wizard.js';
import './ui/03-match-view.js';

// UI pages
import './ui/pages/clubs.js';
import './ui/pages/coach.js';
import './ui/pages/achievements.js';
import './ui/pages/contracts.js';
import './ui/pages/dashboard.js';
import './ui/pages/inbox.js';
import './ui/pages/calendar.js';
import './ui/pages/fixtures.js';
import './ui/pages/history.js';
import './ui/pages/hall-of-fame.js';
import './ui/pages/injuryward.js';
import './ui/pages/ladder.js';
import './ui/pages/matchday.js';
import './ui/pages/match-report.js';
import './ui/pages/predictions.js';
import './ui/pages/options.js';
import './ui/pages/player-modal.js';
import './ui/pages/squad.js';
import './ui/pages/stats.js';
import './ui/pages/season-leaders.js';
import './ui/pages/fantasy.js';
import './ui/pages/recruitment.js';
import './ui/pages/records.js';
import './ui/pages/tactics.js';
import './ui/pages/teamsheet.js';
import './ui/pages/training.js';
import './ui/pages/staff.js';
import './ui/pages/scouting.js';
import './ui/pages/club-management.js';

// UI remaining (offseason views, helpers, then boot last)
import './ui/04-offseason-view.js';
import './ui/05-helpers.js';
import './ui/06-boot.js';

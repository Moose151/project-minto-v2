/* Central UI object. Page modules below extend it via Object.assign. */

const HUBS = [
  { key: 'club', label: 'My Club', pages: [
    ['dashboard',      'Dashboard'],
    ['offseason',      'Offseason'],
    ['inbox',          'Inbox'],
    ['coach',          'Coach'],
    ['club-management','Club Mgmt'],
    ['achievements',   'Achievements'],
    ['history',        'History'],
  ]},
  { key: 'squad', label: 'Squad', pages: [
    ['squad',      'Players'],
    ['teamsheet',  'Team Sheet'],
    ['tactics',    'Tactics'],
    ['training',   'Training'],
    ['injuryward', 'Injury Ward'],
  ]},
  { key: 'competition', label: 'Competition', pages: [
    ['matchday',   'Match Day'],
    ['fixtures',   'Fixtures'],
    ['calendar',   'Calendar'],
    ['ladder',     'Ladder'],
    ['predictions','Predictions'],
  ]},
  { key: 'ops', label: 'Football Ops', pages: [
    ['recruitment', 'Recruitment'],
    ['contracts',   'Contracts'],
    ['scouting',    'Scouting'],
    ['staff',       'Staff'],
  ]},
  { key: 'league', label: 'League', pages: [
    ['teams',        'Clubs'],
    ['stats',        'Stats'],
    ['seasonleaders','Season Leaders'],
    ['records',      'Records'],
    ['halloffame',   'Hall of Fame'],
    ['fantasy',      'Fantasy'],
    ['options',      'Options'],
  ]},
];

const PAGE_META = Object.fromEntries(HUBS.flatMap(h => h.pages.map(([key, label]) => [key, { label, hub: h.key }])));

export const UI = {
  page: 'dashboard',
  _lastPage: null, _backStack: [],
  sortKey: 'pos', sortDir: 1, statCat: 't', _playerId: null,

  nav() {
    const navEl = document.getElementById('nav');
    if (UI.inWizard()) { navEl.innerHTML = ''; navEl.classList.add('empty'); return; }
    navEl.classList.remove('empty');

    const inboxUnread = G && G.news ? G.news.filter(n => !n.read).length : 0;
    const activeHub = HUBS.find(h => h.pages.some(([k]) => k === UI.page)) || HUBS[0];

    const sectionsHtml = HUBS.map(h => {
      const items = h.pages.map(([k, l]) => {
        const badge = k === 'inbox' && inboxUnread > 0 ? `<span class="nav-badge">${inboxUnread}</span>` : '';
        return `<button class="nav-item${UI.page === k ? ' active' : ''}" onclick="UI.go('${k}')">
          <span>${l}</span>${badge}
        </button>`;
      }).join('');
      return `<section class="nav-section${h.key === activeHub.key ? ' active' : ''}">
        <button class="nav-section-head" onclick="UI.goHub('${h.key}')">${h.label}</button>
        <div class="nav-items">${items}</div>
      </section>`;
    }).join('');

    navEl.innerHTML =
      `<div class="nav-rail-head">
        <button class="nav-back" onclick="UI.back()" title="Go back">Back</button>
        <div>
          <div class="nav-context">Current Area</div>
          <div class="nav-current">${activeHub.label}</div>
        </div>
      </div>
      <div class="nav-scroll">${sectionsHtml}</div>`;
  },

  topbar() {
    const el = document.getElementById('topinfo');
    const logoWrap = document.getElementById('team-logo-wrap');
    if (!G || G.coach.teamId == null) {
      el.innerHTML = '';
      if (logoWrap) logoWrap.innerHTML = '';
      document.getElementById('advanceBtn').style.display = 'none';
      return;
    }
    document.getElementById('advanceBtn').style.display = '';
    const t = myTeam();
    UI.applyTeamTheme(t);
    if (logoWrap && typeof teamLogo === 'function') {
      logoWrap.innerHTML = `<button class="topbar-logo-btn" onclick="UI.go('dashboard')" title="Go to Dashboard">${teamLogo(t, 46)}</button>`;
    }
    const lad = ladder();
    const pos = lad.findIndex(r => r.id === t.id) + 1;
    const rec = lad.find(r => r.id === t.id);
    const onBye = G.phase === 'regular' && (G.byes && G.byes[G.round] || []).includes(G.coach.teamId);
    if (typeof ensureCalendar === 'function') ensureCalendar();
    const dateLine = G.phase === 'regular' && typeof calendarDateLabel === 'function' ? ` · ${calendarDateLabel()}` : '';
    const stop = G.phase === 'regular' && typeof calendarStopForDay === 'function' ? calendarStopForDay(ensureCalendar().day) : null;
    const phase = G.phase === 'regular'
      ? `Round ${G.round + 1} of ${G.fixtures.length}${onBye ? ' · BYE' : ''}`
      : G.phase === 'finals' ? (G.finals.week === 1 ? 'Semi Finals' : 'Grand Final') : 'Off-Season';
    const pageLabel = PAGE_META[UI.page]?.label || 'Dashboard';
    el.innerHTML = `
      <div class="top-stat page-chip"><span class="lbl">View</span><span class="val">${esc(pageLabel)}</span></div>
      <div class="top-stat"><span class="lbl">Club</span><span class="val"><span class="team-spine" style="background:${t.c1}"></span>${esc(teamName(t))}</span></div>
      <div class="top-stat"><span class="lbl">Season</span><span class="val">${G.year} · ${esc(phase)}${esc(dateLine)}</span></div>
      <div class="top-stat"><span class="lbl">Position</span><span class="val">${ord(pos)} (${rec.w}-${rec.l})</span></div>
      <div class="top-stat"><span class="lbl">Board</span><span class="val" style="color:${G.coach.conf < 30 ? 'var(--red)' : G.coach.conf > 70 ? 'var(--green)' : 'var(--ink)'}">${Math.round(G.coach.conf)}%</span></div>
      ${G.godMode ? '<div class="god-badge">God Mode</div>' : ''}`;
    const btn = document.getElementById('advanceBtn');
    const inPreseason = G.phase === 'offseason' && G.offseason && G.offseason.step === 'preseason';
    btn.disabled = G.phase === 'offseason' && !inPreseason;
    const cal = G.phase === 'regular' && typeof ensureCalendar === 'function' ? ensureCalendar() : null;
    const trainingPending = cal && stop && stop.key === 'training' && cal.trainingReviewedDay !== cal.day;
    const recoveryPending = cal && stop && stop.key === 'recovery' && cal.medicalReviewedDay !== cal.day;
    const selectionPending = cal && stop && stop.key === 'selection' && !onBye && myTeam().teamSubmitted !== G.round;
    btn.textContent = inPreseason ? 'Start Season →'
      : G.phase === 'finals' ? (
          G.finals.useTop8
            ? ['Play Finals Week 1', 'Play Semi Finals', 'Play Preliminary Finals', 'Play Grand Final'][G.finals.week - 1]
            : (G.finals.week === 1 ? 'Play Semis' : 'Play Grand Final')
        )
      : trainingPending ? 'Review Training →'
      : recoveryPending ? 'Review Recovery →'
      : selectionPending ? 'Submit Team List →'
      : stop && stop.key === 'match' && !onBye ? (UI.page === 'matchday' ? (UI._matchMode === 'watch' ? 'Kick Off →' : 'Sim to Result →') : 'Match Day →')
      : onBye && stop && stop.key === 'match' ? 'Advance (Bye)'
      : 'Next Day';
  },

  _workflowState(){
    if(!G || G.phase !== 'regular' || typeof ensureCalendar !== 'function') return null;
    const cal = ensureCalendar();
    const day = cal.day || 0;
    const dow = typeof calendarDayInWeek === 'function' ? calendarDayInWeek(day) : day % 7;
    const stop = typeof calendarStopForDay === 'function' ? calendarStopForDay(day) : null;
    const t = myTeam();
    const roundIdx = typeof calendarRoundForDay === 'function' ? calendarRoundForDay(day) : (G.round || 0);
    const onBye = ((G.byes && G.byes[roundIdx]) || []).includes(G.coach.teamId);
    const trainingDone = cal.trainingReviewedDay === day;
    const medicalDone = cal.medicalReviewedDay === day;
    const teamDone = onBye || t.teamSubmitted === G.round;
    const issues = typeof lineupIssues === 'function' && !onBye ? lineupIssues(t) : [];
    return {cal, day, dow, stop, t, roundIdx, onBye, trainingDone, medicalDone, teamDone, issues};
  },

  _workflowPrimary(){
    const s = UI._workflowState();
    if(!s) return {label:'Dashboard', page:'dashboard'};
    if(s.stop && s.stop.key === 'training' && !s.trainingDone) return {label:'Review Training', page:'training', primary:true};
    if(s.stop && s.stop.key === 'selection' && !s.onBye && (s.issues.length || !s.teamDone)) return {label:s.issues.length ? 'Fix Team Sheet' : 'Submit Team List', page:'teamsheet', primary:true};
    if(s.stop && s.stop.key === 'match' && !s.onBye) return {label:'Match Day', page:'matchday', primary:true};
    if(s.stop && s.stop.key === 'recovery' && !s.medicalDone) return {label:'Review Recovery', page:'injuryward', primary:true};
    const nextStop = (() => {
      for(let i=1;i<=7;i++){
        const ev = calendarStopForDay(s.day + i);
        if(ev && ['training','selection','match','recovery'].includes(ev.key)) return ev;
      }
      return null;
    })();
    return nextStop ? {label:`Next: ${nextStop.label}`, page:nextStop.page} : {label:'Next Day', advance:true};
  },

  workflowStrip(){
    const s = UI._workflowState();
    if(!s) return '';
    const steps = [
      {dow:0, key:'training', label:'Training', page:'training', done:s.trainingDone},
      {dow:1, key:'selection', label:'Team List', page:'teamsheet', done:s.teamDone, warn:!s.onBye && s.issues.length},
      {dow:2, key:'prep', label:'Prep', page:'tactics', done:s.teamDone},
      {dow:null, key:'match', label:s.onBye?'Bye':'Match', page:'matchday', done:false},
      {dow:6, key:'recovery', label:'Recovery', page:'injuryward', done:s.medicalDone},
    ];
    const matchDow = (() => {
      const m = typeof calendarMyMatch === 'function' ? calendarMyMatch(s.roundIdx) : null;
      return m && typeof slotDow === 'function' ? slotDow(m.slot) : 5;
    })();
    const items = steps.map(st => {
      const stepDow = st.key === 'match' ? matchDow : st.dow;
      const active = s.stop && (s.stop.key === st.key || (st.key === 'prep' && (s.dow === 2 || s.dow === 3) && (!s.stop || s.stop.key === 'travel')));
      const done = st.done || (stepDow != null && s.dow > stepDow && !active);
      const cls = ['flow-step', active?'active':'', done?'done':'', st.warn?'warn':''].filter(Boolean).join(' ');
      const detail = st.key === 'selection' && st.warn ? `${s.issues.length} issue${s.issues.length===1?'':'s'}` :
        st.key === 'match' && s.onBye ? 'rest week' :
        stepDow != null && typeof CAL_WEEKDAYS !== 'undefined' ? CAL_WEEKDAYS[stepDow] : '';
      return `<button class="${cls}" onclick="UI.go('${st.page}')">
        <span>${esc(st.label)}</span><b>${esc(detail)}</b>
      </button>`;
    }).join('');
    const primary = UI._workflowPrimary();
    const action = primary.advance
      ? `<button class="btn primary" onclick="UI.advance()">${esc(primary.label)}</button>`
      : `<button class="btn primary" onclick="UI.go('${primary.page}')">${esc(primary.label)}</button>`;
    return `<div class="flow-strip">
      <div class="flow-copy">
        <b>Round ${s.roundIdx + 1} Rhythm</b>
        <span>${esc(typeof calendarDateLabel === 'function' ? calendarDateLabel(s.day) : '')}${s.stop ? ` · ${esc(s.stop.label)}` : ''}</span>
      </div>
      <div class="flow-steps">${items}</div>
      <div class="flow-action">${action}</div>
    </div>`;
  },

  go(page) {
    if (UI.page && UI.page !== page) UI._backStack.push(UI.page);
    UI.page = page;
    UI._forceTop = true;
    UI.render();
  },

  goHub(hubKey) {
    const hub = HUBS.find(h => h.key === hubKey);
    if (hub && hub.pages.length) UI.go(hub.pages[0][0]);
  },

  back() {
    const page = UI._backStack.pop() || 'dashboard';
    UI.page = page;
    UI._forceTop = true;
    UI.render();
  },

  inWizard() { return !G || G.coach.teamId == null; },

  render() {
    if (UI.inWizard()) {
      UI.nav(); UI.topbar();
      document.getElementById('main').innerHTML = UI.wizard();
      return;
    }
    const m = document.getElementById('main');
    if (G.phase === 'offseason' && !['offseason','options','history','halloffame','records','coach','stats','ladder','teams','squad','fixtures','calendar','fantasy','recruitment','player','tactics','matchday','injuryward','predictions','staff','contracts','scouting','club-management','achievements','inbox','watchgame'].includes(UI.page)) UI.page = 'offseason';
    UI.nav(); UI.topbar();
    const samePage = UI._lastPage === UI.page;
    const prevTop = (samePage && !UI._forceTop) ? m.scrollTop : 0;
    const fn = UI['p_' + UI.page] || UI.p_dashboard;
    m.innerHTML = fn();
    UI._forceTop = false;
    UI._lastPage = UI.page;
    UI.nav();
    if (prevTop > 0) {
      m.scrollTop = prevTop;
      requestAnimationFrame(() => { if (m.scrollTop !== prevTop) m.scrollTop = prevTop; });
    } else {
      m.scrollTop = 0;
    }
  },

  applyTeamTheme(team) {
    if (!team || !team.c1) return;
    function hexLum(hex) {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    }
    function hexRgb(hex) {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }
    function darken(hex, amt) {
      return '#' + hexRgb(hex).map(v => Math.max(0, Math.round(v * (1 - amt))).toString(16).padStart(2, '0')).join('');
    }
    const l1 = hexLum(team.c1);
    const l2 = hexLum(team.c2 || '#888888');
    // Pick the more luminous colour as the accent (more visible on a dark background)
    const accent = l1 >= l2 ? team.c1 : (team.c2 || team.c1);
    const [ar, ag, ab] = hexRgb(accent);
    const lum = hexLum(accent);
    const root = document.documentElement;
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-d', darken(accent, 0.22));
    root.style.setProperty('--accent-a05', `rgba(${ar},${ag},${ab},.05)`);
    root.style.setProperty('--accent-a06', `rgba(${ar},${ag},${ab},.06)`);
    root.style.setProperty('--accent-muted', `rgba(${ar},${ag},${ab},.09)`);
    root.style.setProperty('--accent-a12', `rgba(${ar},${ag},${ab},.12)`);
    root.style.setProperty('--accent-a18', `rgba(${ar},${ag},${ab},.18)`);
    root.style.setProperty('--accent-a22', `rgba(${ar},${ag},${ab},.22)`);
    root.style.setProperty('--accent-line', `rgba(${ar},${ag},${ab},.35)`);
    root.style.setProperty('--accent-a50', `rgba(${ar},${ag},${ab},.50)`);
    root.style.setProperty('--accent-text', lum > 0.35 ? '#191305' : '#FFFFFF');
  },

  toast(txt) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = txt;
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => d.remove(), 3600);
  },
  modal(html) { document.getElementById('modal').innerHTML = html; document.getElementById('modal-bg').classList.add('open'); },
  closeModal() { document.getElementById('modal-bg').classList.remove('open'); },
};

if (typeof window !== 'undefined') window.UI = UI;

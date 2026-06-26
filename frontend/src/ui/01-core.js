'use strict';

/* Central UI object. Page modules below extend it via Object.assign. */
const UI = {
  page:'dashboard',
  _lastPage:null, _backStack:[],
  sortKey:'pos', sortDir:1, statCat:'t', _playerId:null,

  nav(){
    if(UI.inWizard && UI.inWizard()){ document.getElementById('nav').innerHTML = ''; return; }
    const items = [['dashboard','Dashboard'],['inbox','Inbox'],['squad','Squad'],['teamsheet','Team Sheet'],['injuryward','Injury Ward'],['matchday','Match Day'],['tactics','Tactics'],['training','Training'],['SEP','Competition'],['calendar','Calendar'],['fixtures','Fixtures'],['ladder','Ladder'],['stats','Stat Leaders'],['seasonleaders','Season Leaders'],['fantasy','Fantasy'],['teams','Clubs'],['predictions','Predictions'],['SEP','Club & Career'],['recruitment','Recruitment'],['contracts','Contracts'],['staff','Staff'],['scouting','Scouting'],['coach','Coach Profile'],['club-management','Club Management'],['achievements','Achievements'],['halloffame','Hall of Fame'],['records','Records'],['history','History'],['options','Options']];
    const inboxUnread = G && G.news ? G.news.filter(n=>!n.read).length : 0;
    document.getElementById('nav').innerHTML = items.map(([k,l])=> k==='SEP'
      ? `<div class="navsep">${l}</div>`
      : `<button class="navbtn ${UI.page===k?'active':''}" onclick="UI.go('${k}')">${l}${k==='inbox'&&inboxUnread>0?`<span style="background:var(--red);color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 4px;margin-left:4px;vertical-align:middle">${inboxUnread}</span>`:''}</button>`).join('');
  },
  topbar(){
    const el = document.getElementById('topinfo');
    if(!G || G.coach.teamId == null){ el.innerHTML=''; document.getElementById('advanceBtn').style.display='none'; return; }
    document.getElementById('advanceBtn').style.display='';
    const t = myTeam();
    const lad = ladder();
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    const rec = lad.find(r=>r.id===t.id);
    const onBye = G.phase==='regular' && (G.byes && G.byes[G.round] || []).includes(G.coach.teamId);
    if(typeof ensureCalendar === 'function') ensureCalendar();
    const dateLine = G.phase==='regular' && typeof calendarDateLabel === 'function' ? ` · ${calendarDateLabel()}` : '';
    const stop = G.phase==='regular' && typeof calendarStopForDay === 'function' ? calendarStopForDay(ensureCalendar().day) : null;
    const phase = G.phase==='regular'
      ? `Round ${G.round+1} of ${G.fixtures.length}${onBye?' · BYE':''}`
      : G.phase==='finals' ? (G.finals.week===1?'Semi Finals':'Grand Final') : 'Off-Season';
    el.innerHTML = `
      <div class="top-stat"><span class="lbl">Club</span><span class="val"><span class="team-spine" style="background:${t.c1}"></span>${esc(teamName(t))}</span></div>
      <div class="top-stat"><span class="lbl">Season</span><span class="val">${G.year} · ${esc(phase)}${esc(dateLine)}</span></div>
      <div class="top-stat"><span class="lbl">Position</span><span class="val">${ord(pos)} (${rec.w}-${rec.l})</span></div>
      <div class="top-stat"><span class="lbl">Board</span><span class="val" style="color:${G.coach.conf<30?'var(--red)':G.coach.conf>70?'var(--green)':'var(--ink)'}">${Math.round(G.coach.conf)}%</span></div>
      ${G.godMode?'<div class="god-badge">God Mode</div>':''}`;
    const btn = document.getElementById('advanceBtn');
    btn.disabled = (G.phase==='offseason');
    btn.textContent = G.phase==='finals' ? (
      G.finals.useTop8
        ? ['Play Finals Week 1','Play Semi Finals','Play Preliminary Finals','Play Grand Final'][G.finals.week-1]
        : (G.finals.week===1?'Play Semis':'Play Grand Final')
    ) : stop && stop.key === 'match' && !onBye ? 'Play Match Day' : onBye && stop && stop.key === 'match' ? 'Advance (Bye)' : 'Next Day';
  },
  go(page){
    if(UI.page && UI.page !== page) UI._backStack.push(UI.page);
    UI.page = page;
    UI._forceTop = true;
    UI.render();
  },
  back(){
    const page = UI._backStack.pop() || 'dashboard';
    UI.page = page;
    UI._forceTop = true;
    UI.render();
  },
  inWizard(){ return !G || G.coach.teamId == null; },
  render(){
    if(UI.inWizard()){
      UI.nav(); UI.topbar();
      document.getElementById('main').innerHTML = UI.wizard();
      return;
    }
    UI.nav(); UI.topbar();
    const m = document.getElementById('main');
    if(G.phase==='offseason' && !['offseason','options','history','halloffame','records','coach','stats','ladder','teams','squad','fixtures','calendar','fantasy','recruitment','player','tactics','matchday','injuryward','predictions','staff','contracts','scouting','club-management','achievements','inbox','watchgame'].includes(UI.page)) UI.page='offseason';
    const samePage = UI._lastPage === UI.page;
    const prevTop = (samePage && !UI._forceTop) ? m.scrollTop : 0;
    const fn = UI['p_'+UI.page] || UI.p_dashboard;
    m.innerHTML = `${UI._backStack.length?`<button class="btn sm page-back" onclick="UI.back()">Back</button>`:''}` + fn();
    UI._forceTop = false;
    UI._lastPage = UI.page;
    UI.nav();
    // Restore scroll synchronously (same task as innerHTML swap = no paint in between = no flash)
    if(prevTop > 0){
      m.scrollTop = prevTop;
      requestAnimationFrame(()=>{ if(m.scrollTop !== prevTop) m.scrollTop = prevTop; });
    } else {
      m.scrollTop = 0;
    }
  },
  toast(txt){
    const d = document.createElement('div'); d.className='toast'; d.textContent=txt;
    document.getElementById('toasts').appendChild(d);
    setTimeout(()=>d.remove(), 3600);
  },
  modal(html){ document.getElementById('modal').innerHTML = html; document.getElementById('modal-bg').classList.add('open'); },
  closeModal(){ document.getElementById('modal-bg').classList.remove('open'); },
};

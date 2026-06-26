'use strict';

/* Match Day — pre-match info, lineups, coaching preferences and match feed */
Object.assign(UI, {
  _watchSpeed: 2,
  _matchMode: 'result',

  setWatchSpeed(v){
    UI._watchSpeed = v;
    [1,2,4,8].forEach(s => {
      const btn = document.getElementById(`wg-spd-${s}`);
      if(btn) btn.className = `btn sm${s===v?' primary':''}`;
    });
  },

  p_matchday(){
    const t = myTeam();
    const m = G.phase==='regular' && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
    if(!m){
      const onBye = G.phase==='regular' && (G.byes && G.byes[G.round] || []).includes(t.id);
      return `<h1 class="page">Match Day</h1>
        ${onBye
          ? `<div style="text-align:center;padding:40px 0">
              <div style="font-size:56px;font-weight:900;font-family:var(--disp);color:var(--brass);letter-spacing:.08em">BYE</div>
              <p class="page-sub" style="margin:6px 0 14px">Round ${G.round+1} — your team has no match this week. Players rest and recover.</p>
              <div class="btnrow" style="justify-content:center">
                <button class="btn primary" onclick="UI.advance()">Next day</button>
                <button class="btn" onclick="UI.go('calendar')">Calendar</button>
                <button class="btn" onclick="UI.go('fixtures')">View round fixtures</button>
                <button class="btn" onclick="UI.go('training')">Training</button>
              </div>
            </div>`
          : `<p class="page-sub">No regular-season match is currently available.</p>`}`;
    }
    const h = G.teams[m.h], a = G.teams[m.a];
    const stadium = h.stadium || pick(STADIUM_NAMES);
    if(!m.projWeather) m.projWeather = pick(WEATHER);
    if(!m.projCrowd) m.projCrowd = matchCrowd(h, false);
    const homeGame = m.h === G.coach.teamId;
    const isMagicRound = G.magicRound && G.magicRound.round === G.round;
    const mrHost = isMagicRound ? G.teams.find(x => x.id === G.magicRound.hostTeamId) : null;
    const ticketPrice = G.club ? (G.club.ticketPrice || 28) : 28;
    const displayVenue = isMagicRound ? (G.magicRound.venue || (mrHost ? mrHost.city + ' Stadium' : 'Magic Round Venue')) : stadium;
    const venue = `${esc(displayVenue)} · ${esc(m.projWeather)} · projected crowd ${m.projCrowd.toLocaleString()}${homeGame&&!isMagicRound?` · tickets ${money(ticketPrice)}`:''}`;
    const label = v => String(v).replace(/([A-Z])/g,' $1').replace(/^./, c=>c.toUpperCase());
    const row = (team, i) => {
      const p = G.players[team.lineup[i]];
      return `<tr><td>#${SLOTS[i].n}</td><td>${SLOTS[i].pos}</td><td>${p?`<b>${esc(p.name)}</b>`:'-'}</td><td class="num">${p?p.ovr:'-'}</td><td class="num">${p?Math.round(p.cond):'-'}%</td><td class="num">${p?`${p.s.g}g ${p.s.t}T ${p.s.runs||0}R`:''}</td></tr>`;
    };
    const prefs = t.matchPrefs || (t.matchPrefs={autoSubs:true, penalty:'auto', fieldGoal:true});
    const watchControls = UI._matchMode==='watch' ? `<div class="card" style="margin-top:16px"><h2 class="sec" style="margin-top:0">Watch controls</h2>
      <div class="grid3">
        <div class="field"><label>Penalty preference</label><select onchange="myTeam().matchPrefs.penalty=this.value;UI.render()">
          ${['auto','kickTouch','tap','penaltyGoal'].map(v=>`<option value="${v}" ${prefs.penalty===v?'selected':''}>${label(v)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Watch speed</label><select onchange="UI.setWatchSpeed(+this.value)">${[1,2,4,8].map(v=>`<option value="${v}" ${UI._watchSpeed===v?'selected':''}>${v}x</option>`).join('')}</select></div>
        <div class="field"><label>Automation</label>
          <label style="display:block;color:var(--muted);font-size:12px"><input type="checkbox" ${prefs.autoSubs?'checked':''} onchange="myTeam().matchPrefs.autoSubs=this.checked"> Auto substitutions</label>
          <label style="display:block;color:var(--muted);font-size:12px"><input type="checkbox" ${prefs.fieldGoal?'checked':''} onchange="myTeam().matchPrefs.fieldGoal=this.checked"> Attempt field goals inside 45m</label>
        </div>
      </div>
    </div>` : '';
    let ticketControls = '';
    if(homeGame && !m.played){
      const li = leagueTicketInfo();
      const myPrestige = clubPrestigeScore(t);
      const ordinal = n => n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
      let rankLabel;
      if(li.rankFromMostExpensive === 1) rankLabel = 'Most expensive in the league';
      else if(li.rankFromCheapest === 1) rankLabel = 'Cheapest in the league';
      else if(li.rankFromMostExpensive <= 3) rankLabel = `${ordinal(li.rankFromMostExpensive)} most expensive in the league`;
      else if(li.rankFromCheapest <= 3) rankLabel = `${ordinal(li.rankFromCheapest)} cheapest in the league`;
      else if(ticketPrice >= li.avg) rankLabel = `Above average — ${ordinal(li.rankFromMostExpensive)} most expensive`;
      else rankLabel = `Below average — ${ordinal(li.rankFromCheapest)} cheapest`;
      const rankColor = ticketPrice > li.avg ? 'var(--brass)' : ticketPrice < li.avg ? 'var(--green)' : 'var(--muted)';
      const presNote = myPrestige >= 72 ? 'Premium club: fans tolerate higher prices'
        : myPrestige >= 50 ? 'Moderate price sensitivity'
        : 'Fans are price-sensitive at this prestige level';
      ticketControls = `<div class="card" style="margin-top:12px">
        <h2 class="sec" style="margin-top:0">Home Tickets</h2>
        <p class="page-sub">Ticket price is managed from Club Management. Price affects projected crowd and gate revenue.</p>
        <div class="btnrow" style="align-items:center">
          <span style="font-family:var(--disp);font-size:28px;font-weight:700;min-width:80px;text-align:center">${money(ticketPrice)}</span>
          <span style="font-size:12px;color:var(--muted)">Projected gate: <b>${money(m.projCrowd * ticketPrice)}</b> · crowd ${m.projCrowd.toLocaleString()}</span>
          <button class="btn sm" onclick="UI.go('club-management')">Edit prices</button>
        </div>
        <div style="font-size:12px;margin-top:6px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <span>League avg: <b>${money(li.avg)}</b></span>
          <span style="color:${rankColor}">${rankLabel}</span>
          <span style="color:var(--dim)">${presNote}</span>
        </div>
      </div>`;
    }
    const badWeather = m.projWeather === 'Heavy rain' || m.projWeather === 'Windy';
    const weatherTacticsPref = (prefs.weatherTactics || 'normal');
    const weatherTacticsCard = badWeather ? `<div class="card" style="border-color:var(--brass);margin-bottom:10px;padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:var(--brass)">Conditions: ${esc(m.projWeather)}</div>
          <p style="font-size:12px;color:var(--muted);margin:3px 0 0">Adjust your game plan to suit the weather — fewer risky passes but better kicking accuracy and discipline.</p>
        </div>
        <div class="btnrow" style="margin:0;gap:6px;flex-shrink:0">
          <button class="btn sm${weatherTacticsPref==='normal'?' primary':''}" onclick="myTeam().matchPrefs.weatherTactics='normal';UI.render()">Normal game plan</button>
          <button class="btn sm${weatherTacticsPref==='conservative'?' primary':''}" onclick="myTeam().matchPrefs.weatherTactics='conservative';UI.render()">Adapt to conditions</button>
        </div>
      </div>
    </div>` : '';
    const o = UI._matchOdds(m);
    const favTeam = o.favoured==='h' ? h : a;
    const oddsBar = `<div style="display:flex;gap:12px;align-items:center;margin:8px 0 4px;flex-wrap:wrap">
      <span style="color:var(--muted);font-size:12px">Bookie odds:</span>
      <span style="font-weight:700;color:${o.favoured==='h'?'var(--brass)':'var(--muted)'}">${esc(h.nick)} ${UI._oddsStr(o.oddsH)}</span>
      <span style="color:var(--dim)">·</span>
      <span style="font-weight:700;color:${o.favoured==='a'?'var(--brass)':'var(--muted)'}">${esc(a.nick)} ${UI._oddsStr(o.oddsA)}</span>
      <span style="color:var(--dim);font-size:11px">(${esc(favTeam.nick)} favoured · ${Math.round((o.favoured==='h'?o.pH:o.pA)*100)}% implied)</span>
      <button class="btn sm" onclick="UI.go('predictions')" style="margin-left:auto">Full predictions →</button>
    </div>`;
    const myCoach = G.coach.name;
    const oppTeam = t.id===h.id ? a : h;
    const oppCoach = oppTeam.headCoach ? oppTeam.headCoach.name : 'Unknown coach';
    const coachLine = `<p style="font-size:12px;color:var(--muted);margin:2px 0 8px"><b>${esc(myCoach)}</b> vs <b>${esc(oppCoach)}</b>${oppTeam.headCoach?` (rep ${oppTeam.headCoach.rep})`:''}  · ${esc(venue)}</p>`;
    const slotBadge = m.slot ? `<span style="font-size:11px;color:var(--brass);font-weight:700;background:rgba(210,165,62,.12);padding:2px 9px;border-radius:10px;letter-spacing:.04em;white-space:nowrap">${esc(m.slot.label)}</span>` : '';
    return `<h1 class="page">Match Day</h1>
    <p class="page-sub" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">Round ${G.round+1} · ${slotBadge} ${teamLogo(h,28)} ${esc(teamName(h))} v ${teamLogo(a,28)} ${esc(teamName(a))}</p>
    ${isMagicRound ? `<div style="background:linear-gradient(135deg,rgba(210,165,62,.15),rgba(210,165,62,.05));border:1px solid rgba(210,165,62,.5);border-radius:8px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;gap:10px">
      <div style="font-size:20px">✦</div>
      <div><div style="font-weight:700;color:var(--brass);font-size:14px">Magic Round ${G.year}</div>
      <div style="font-size:11px;color:var(--muted)">All fixtures at ${esc(G.magicRound.venue)} · Neutral ground — no home advantage for either side${mrHost&&mrHost.id===G.coach.teamId?' · Your club earns a $1.5M hosting fee':''}</div></div>
    </div>` : ''}
    ${coachLine}
    ${weatherTacticsCard}
    ${oddsBar}
    <div class="btnrow"><button class="btn ${UI._matchMode==='result'?'primary':''}" onclick="UI._matchMode='result';UI.render()">Sim result</button><button class="btn ${UI._matchMode==='watch'?'primary':''}" onclick="UI._matchMode='watch';UI.render()">Watch game</button><button class="btn" onclick="UI.go('teamsheet')">Adjust team sheet</button></div>
    <div class="grid2">
      <div class="card"><h2 class="sec" style="margin-top:0">${esc(h.nick)} lineup</h2><table><tbody>${Array.from({length:17},(_,i)=>row(h,i)).join('')}</tbody></table></div>
      <div class="card"><h2 class="sec" style="margin-top:0">${esc(a.nick)} lineup</h2><table><tbody>${Array.from({length:17},(_,i)=>row(a,i)).join('')}</tbody></table></div>
    </div>
    ${ticketControls}
    ${watchControls}
    <div class="btnrow" style="margin-top:16px"><button class="btn primary" onclick="UI.playMatchDay(UI._matchMode==='watch')">${UI._matchMode==='watch'?'Kick off':'Sim to result'}</button></div>`;
  },

  setTicketPrice(value){
    if(!G.club) return;
    G.club.ticketPrice = clamp(Math.round(+value || 28), 10, 120);
    const t = myTeam();
    const m = G.phase==='regular' && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
    if(m && m.h === t.id && !m.played){
      m.projCrowd = matchCrowd(G.teams[m.h], false);
    }
    UI.render();
  },

  playMatchDay(watch){
    const stop = typeof calendarStopForDay === 'function' ? calendarStopForDay(ensureCalendar().day) : null;
    if(G.phase === 'regular' && (!stop || stop.key !== 'match')){
      UI.toast('This match is not scheduled for today.');
      UI.go('calendar');
      return;
    }
    if(watch && G.phase === 'regular' && typeof advanceCalendarDayForWatch === 'function'){
      // Split flow: sim AI-only games now, run coached match in two halves
      const t = myTeam();
      const myM = G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
      if(!myM){ UI.render(); return; }
      const prepRes = advanceCalendarDayForWatch();
      const {h1Events} = simMatchFirstHalf(myM, false);
      autoSave();
      UI._watchGameRound = (prepRes.earlyMatches||[]).concat([myM]);
      UI._watchGameTitle = myM.slot ? myM.slot.label + ' result' : 'Match result';
      UI._watchH1Events = h1Events;
      UI._watchMyM = myM;
      UI._watchEarlyMatches = prepRes.earlyMatches || [];
      UI.go('watchgame');
      return;
    }
    // Standard (non-watch) flow
    const res = G.phase === 'regular' && typeof advanceCalendarDay === 'function' ? advanceCalendarDay() : advanceRound();
    autoSave();
    if(!res || (res.type!=='round' && !res.myM)) { UI.render(); return; }
    const label = res.type === 'round'
      ? `Round ${(res.roundIdx == null ? G.round - 1 : res.roundIdx) + 1} results`
      : `${res.myM && res.myM.slot ? res.myM.slot.label : 'Match'} result`;
    UI.render();
    UI.showRoundResults(res.round || res.playedToday || [res.myM], label);
  },

  p_watchgame(){
    const games = UI._watchGameRound;
    if(!games){
      return `<h1 class="page">Watch Game</h1><p class="page-sub">No game data. <button class="btn sm" onclick="UI.go('matchday')">Back to Match Day</button></p>`;
    }
    const myM = games.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId);
    if(!myM){ UI.go('matchday'); return ''; }
    UI._htSubPlans = {}; // Reset sub plans for new game
    const h = G.teams[myM.h], a = G.teams[myM.a];
    const mineIsH = myM.h === G.coach.teamId;

    const lineupCol = (team, side) => {
      const rows = Array.from({length:17}, (_,i) => {
        const p = G.players[team.lineup[i]];
        if(!p) return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;border-bottom:1px solid var(--line);opacity:.3"><span style="color:var(--dim);min-width:18px;font-size:11px">${i+1}</span><span style="font-size:12px;color:var(--muted)">—</span></div>`;
        return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;border-bottom:1px solid var(--line)">
          <span style="color:var(--dim);min-width:18px;font-size:11px">${i+1}</span>
          <span style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</span>
          <span class="pos-tag" style="font-size:10px">${p.pos}</span>
          <span class="ovr ${ovrCls(p.ovr)}" style="font-size:11px">${p.ovr}</span>
        </div>`;
      }).join('');
      return `<div style="min-width:160px"><div style="font-size:11px;font-weight:700;color:var(--brass);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${esc(team.nick)}</div>${rows}</div>`;
    };

    // Start feed after render — use pre-built first-half events if available (split-match flow)
    setTimeout(() => {
      let events;
      if(UI._watchH1Events){
        const h1 = UI._watchH1Events;
        UI._watchH1Events = null;
        // Add kick-off line at the start
        const h = G.teams[myM.h], a = G.teams[myM.a];
        const kickOff = {min:0, txt:`Kick off at ${myM.det.venue||'the stadium'}. ${myM.det.weather||'Clear'} conditions, crowd of ${(myM.det.crowd||15000).toLocaleString()}.`};
        events = [kickOff, ...h1];
        // Append a HT marker at end of first half events
        const htH = myM.det.htScore ? myM.det.htScore.h : 0;
        const htA = myM.det.htScore ? myM.det.htScore.a : 0;
        events.push({min:40, txt:`⏸ HALF TIME — ${h.nick} ${htH}–${htA} ${a.nick}`});
      } else {
        events = UI._buildFeed(myM);
      }
      UI._revealFeedPage(events, 0, myM);
    }, 120);

    return `<div style="margin-bottom:12px">
      <div id="wg-header" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
          <div style="text-align:center">${teamLogo(h,48)}<div style="font-weight:700;margin-top:4px">${esc(h.nick)}</div></div>
          <div style="font-family:var(--disp);font-size:48px;font-weight:900;min-width:120px;text-align:center;letter-spacing:.04em">
            <span id="wg-scoreH" style="color:var(--dim)">–</span>
            <span style="color:var(--muted);font-size:32px;margin:0 4px">:</span>
            <span id="wg-scoreA" style="color:var(--dim)">–</span>
          </div>
          <div style="text-align:center">${teamLogo(a,48)}<div style="font-weight:700;margin-top:4px">${esc(a.nick)}</div></div>
        </div>
        <div id="wg-banner" style="font-size:13px;color:var(--muted);margin-top:8px">⚽ Match in progress…</div>
        <div style="font-size:11px;color:var(--dim);margin-top:4px">${esc(myM.det.venue||'Stadium')} · ${esc(myM.det.weather||'')} · Round ${G.round} · ${(myM.det.crowd||0).toLocaleString()} crowd</div>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:16px">
        <div style="display:flex;flex-direction:column;gap:16px">
          ${lineupCol(h,'h')}
          ${lineupCol(a,'a')}
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h2 class="sec" style="margin:0">Live Feed</h2>
            <div class="btnrow" style="margin:0;gap:6px">
              <span style="font-size:11px;color:var(--muted)">Speed:</span>
              ${[1,2,4,8].map(v=>`<button id="wg-spd-${v}" class="btn sm ${UI._watchSpeed===v?'primary':''}" onclick="UI.setWatchSpeed(${v})">${v}x</button>`).join('')}
            </div>
          </div>
          <div id="wg-feedBox" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;min-height:300px;max-height:520px;overflow-y:auto;font-size:13px"></div>
        </div>
      </div>
      <div id="wg-postMatch" style="display:none;margin-top:20px"></div>
      <div class="btnrow" style="margin-top:12px">
        <button class="btn" onclick="UI.go('matchday')">Back to Match Day</button>
        <button class="btn" id="wg-allResultsBtn" style="display:none" onclick="UI.showRoundResults(UI._watchGameRound,UI._watchGameTitle||'Match result')">All results</button>
      </div>
    </div>`;
  },

  // Used for second-half events in the split-match flow (separate list, no HT pause)
  _revealFeedPageList(events, i, myM){
    if(UI.page !== 'watchgame') return;
    const box = document.getElementById('wg-feedBox');
    if(!box || i>=events.length){
      // List exhausted — add FULL TIME if not yet appended
      if(myM && myM.played && box){
        const h = G.teams[myM.h], a = G.teams[myM.a];
        const ftTxt = `FULL TIME — ${h.nick} ${myM.hs}–${myM.as} ${a.nick}`;
        box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline"><span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">80'</span><span style="color:var(--brass)">${ftTxt}</span></div>`;
        box.scrollTop = box.scrollHeight;
        UI._handleFullTime(myM);
      }
      return;
    }
    const e = events[i];
    const isScore = e.txt && (e.txt.startsWith('TRY') || e.txt.includes('slots a penalty goal'));
    const isSinBin = e.txt && (e.txt.includes('SIN BINNED') || e.txt.includes('SENT OFF'));
    const isSub = e.txt && e.txt.startsWith('↕ SUB');
    const color = isScore ? 'color:var(--brass)' : isSinBin ? 'color:var(--red)' : isSub ? 'color:var(--muted)' : '';
    box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline"><span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${e.min}'</span><span style="${color}">${esc(e.txt)}</span></div>`;
    box.scrollTop = box.scrollHeight;
    setTimeout(()=>UI._revealFeedPageList(events, i+1, myM), Math.max(80, 800/(UI._watchSpeed||2)));
  },

  _handleFullTime(myM){
    const won = myM.h===G.coach.teamId ? myM.hs>myM.as : myM.as>myM.hs;
    const drew = myM.hs===myM.as;
    const sh = document.getElementById('wg-scoreH');
    const sa = document.getElementById('wg-scoreA');
    const banner = document.getElementById('wg-banner');
    const header = document.getElementById('wg-header');
    const allBtn = document.getElementById('wg-allResultsBtn');
    const postMatch = document.getElementById('wg-postMatch');
    if(sh){ sh.textContent = myM.hs; sh.style.color = won&&myM.h===G.coach.teamId?'var(--green)':drew?'var(--muted)':'var(--ink)'; }
    if(sa){ sa.textContent = myM.as; sa.style.color = won&&myM.a===G.coach.teamId?'var(--green)':drew?'var(--muted)':'var(--ink)'; }
    if(banner){ banner.textContent = won?'🏆 FULL TIME — WIN':drew?'⏱ FULL TIME — DRAW':'⏱ FULL TIME — LOSS'; banner.style.color = won?'var(--green)':drew?'var(--muted)':'var(--red)'; banner.style.fontWeight='700'; banner.style.fontSize='16px'; }
    if(header){
      const flashColor = won ? 'rgba(76,175,125,.18)' : drew ? 'rgba(144,151,162,.12)' : 'rgba(200,90,79,.14)';
      header.style.transition = 'background .25s'; header.style.background = flashColor;
      UI._showFullTimeSiren(header, won, drew);
      setTimeout(()=>{ if(header) header.style.background = ''; }, 900);
    }
    if(won) UI._spawnConfetti();
    if(allBtn) allBtn.style.display='';
    if(postMatch){
      G._lastPlayedMatch = myM;
      postMatch.style.display='';
      postMatch.innerHTML = `<h2 class="sec">Match Report</h2>${UI._buildMatchReportHtml(myM)}<div class="btnrow" style="margin-top:14px"><button class="btn primary" onclick="UI.go('match-report')">Full Analysis →</button></div>`;
    }
    // Finalise the calendar day now the match is complete (split-match flow)
    if(typeof finaliseCalendarDayAfterWatch === 'function'){
      const dayRes = finaliseCalendarDayAfterWatch(myM);
      autoSave();
      // Update _watchGameRound with any additional early matches (already simulated)
      if(UI._watchEarlyMatches && UI._watchEarlyMatches.length){
        const allGames = [...UI._watchEarlyMatches, myM];
        UI._watchGameRound = allGames;
        const label = myM.slot ? myM.slot.label + ' results' : 'Match results';
        UI._watchGameTitle = label;
      }
    }
  },

  _revealFeedPage(events, i, myM){
    if(UI.page !== 'watchgame') return;
    const box = document.getElementById('wg-feedBox');
    if(!box || i>=events.length) return;
    const e = events[i];
    const isScore = e.txt && (e.txt.startsWith('TRY') || e.txt.includes('HALF TIME') || e.txt.startsWith('FULL TIME') || e.txt.includes('slots a penalty goal'));
    const isSinBin = e.txt && (e.txt.includes('SIN BINNED') || e.txt.includes('SENT OFF'));
    const color = isScore ? 'color:var(--brass)' : isSinBin ? 'color:var(--red)' : '';
    box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline">
      <span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${e.min}'</span>
      <span style="${color}">${esc(e.txt)}</span>
    </div>`;
    box.scrollTop = box.scrollHeight;
    if(e.txt && e.txt.includes('HALF TIME')){
      const banner = document.getElementById('wg-banner');
      if(banner) banner.textContent = '⏸ Half time';
      UI._htEvents = events; UI._htNextIdx = i + 1; UI._htMatch = myM;
      const postMatch = document.getElementById('wg-postMatch');
      if(postMatch){ postMatch.style.display = ''; postMatch.innerHTML = UI._buildTeamTalkHtml(myM); }
      return;
    }
    if(e.txt && e.txt.startsWith('FULL TIME')){
      const won = myM.h===G.coach.teamId ? myM.hs>myM.as : myM.as>myM.hs;
      const drew = myM.hs===myM.as;
      const sh = document.getElementById('wg-scoreH');
      const sa = document.getElementById('wg-scoreA');
      const banner = document.getElementById('wg-banner');
      const header = document.getElementById('wg-header');
      const allBtn = document.getElementById('wg-allResultsBtn');
      const postMatch = document.getElementById('wg-postMatch');
      if(sh){ sh.textContent = myM.hs; sh.style.color = won&&myM.h===G.coach.teamId?'var(--green)':drew?'var(--muted)':'var(--ink)'; }
      if(sa){ sa.textContent = myM.as; sa.style.color = won&&myM.a===G.coach.teamId?'var(--green)':drew?'var(--muted)':'var(--ink)'; }
      if(banner){ banner.textContent = won?'🏆 FULL TIME — WIN':drew?'⏱ FULL TIME — DRAW':'⏱ FULL TIME — LOSS'; banner.style.color = won?'var(--green)':drew?'var(--muted)':'var(--red)'; banner.style.fontWeight='700'; banner.style.fontSize='16px'; }
      if(header){
        const flashColor = won ? 'rgba(76,175,125,.18)' : drew ? 'rgba(144,151,162,.12)' : 'rgba(200,90,79,.14)';
        header.style.transition = 'background .25s';
        header.style.background = flashColor;
        UI._showFullTimeSiren(header, won, drew);
        setTimeout(()=>{ if(header) header.style.background = ''; }, 900);
      }
      if(won) UI._spawnConfetti();
      if(allBtn) allBtn.style.display='';
      if(postMatch){
        G._lastPlayedMatch = myM;
        postMatch.style.display='';
        postMatch.innerHTML = `<h2 class="sec">Match Report</h2>${UI._buildMatchReportHtml(myM)}<div class="btnrow" style="margin-top:14px"><button class="btn primary" onclick="UI.go('match-report')">Full Analysis →</button></div>`;
      }
    }
    setTimeout(()=>UI._revealFeedPage(events, i+1, myM), Math.max(80, 800/(UI._watchSpeed||2)));
  },

  _showFullTimeSiren(header, won, drew){
    if(!header) return;
    let siren = document.getElementById('wg-siren');
    if(!siren){
      siren = document.createElement('div');
      siren.id = 'wg-siren';
      header.style.position = 'relative';
      header.appendChild(siren);
    }
    siren.className = won ? 'win' : drew ? 'draw' : 'loss';
    siren.innerHTML = `<div>SIREN</div><span>${won?'FULL TIME WIN':drew?'FULL TIME DRAW':'FULL TIME'}</span>`;
    setTimeout(()=>{ if(siren && siren.parentNode) siren.parentNode.removeChild(siren); }, 1800);
  },

  _spawnConfetti(){
    let el = document.getElementById('wg-confetti');
    if(!el){ el = document.createElement('div'); el.id='wg-confetti'; document.body.appendChild(el); }
    el.innerHTML = '';
    const COLORS = ['#d2a53e','#4caf7d','#5b9bd5','#e05c5c','#9c6dd8','#f0a430','#61c9a8'];
    for(let i=0;i<55;i++){
      const s = document.createElement('span');
      s.style.left = (Math.random()*100)+'%';
      s.style.background = COLORS[Math.floor(Math.random()*COLORS.length)];
      s.style.animationDuration = (1.8+Math.random()*2)+'s';
      s.style.animationDelay = (Math.random()*1.2)+'s';
      s.style.width = (6+Math.random()*8)+'px';
      s.style.height = s.style.width;
      s.style.borderRadius = Math.random()>0.5?'50%':'2px';
      el.appendChild(s);
    }
    setTimeout(()=>{ if(el && el.parentNode) el.parentNode.removeChild(el); }, 4500);
  },

  _buildMatchReportHtml(myM){
    const th=G.teams[myM.h], ta=G.teams[myM.a];
    const mineIsH = myM.h === G.coach.teamId;
    const won = mineIsH ? myM.hs>myM.as : myM.as>myM.hs;
    const drew = myM.hs===myM.as;
    const myNick = esc(mineIsH ? th.nick : ta.nick);
    const oppNick = esc(mineIsH ? ta.nick : th.nick);
    const myDet = mineIsH ? myM.det.h : myM.det.a;
    const oppDet = mineIsH ? myM.det.a : myM.det.h;
    const sumDet = det => {
      const s = {t:0,gl:0,ga:0,fg:0,tk:0,mt:0,runs:0,m:0,err:0,inf:0,k4020:0,fdo:0};
      for(const [,l] of Object.entries(det)){ if(!l||typeof l!=='object'||Array.isArray(l)) continue; s.t+=l.t||0;s.gl+=l.gl||0;s.ga+=l.ga||0;s.fg+=l.fg||0;s.tk+=l.tk||0;s.mt+=l.mt||0;s.runs+=l.runs||0;s.m+=l.m||0;s.err+=l.err||0;s.inf+=l.inf||0;s.k4020+=l.k4020||0;s.fdo+=l.fdo||0; }
      return s;
    };
    const mySt = sumDet(myDet), oppSt = sumDet(oppDet);
    const topPlayers = det => Object.entries(det).map(([id,l])=>({p:G.players[+id],l})).filter(x=>x.p&&x.l&&x.l.r).sort((a,b)=>b.l.r-a.l.r);
    const myTop = topPlayers(myDet).slice(0,5);
    const oppTop = topPlayers(oppDet).slice(0,3);
    const perfRow = x => `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;border-bottom:1px solid var(--line)">
      <span style="cursor:pointer;text-decoration:underline;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" onclick="UI.playerModal(${x.p.id})">${esc(x.p.name)} <span class="pos-tag" style="font-size:10px">${x.p.pos}</span></span>
      <span style="color:var(--muted);font-size:11px;white-space:nowrap;padding-left:6px">${x.l.t?x.l.t+'T ':''}${x.l.ta?x.l.ta+'TA ':''}${x.l.gl?x.l.gl+(x.l.ga?'/'+x.l.ga:'')+'G ':''}${x.l.fg?x.l.fg+'FG ':''}<b style="color:var(--ink)">${x.l.r.toFixed(1)}</b></span>
    </div>`;
    const statCmp = (label,myN,oppN,myTxt,oppTxt,lowerIsBetter) => {
      const myB=lowerIsBetter?myN<oppN:myN>oppN, oppB=lowerIsBetter?oppN<myN:oppN>myN;
      return `<tr><td style="text-align:right;font-weight:${myB?700:400};color:${myB?'var(--green)':'inherit'};padding:2px 6px;font-size:12px">${myTxt!==undefined?myTxt:myN}</td><td style="color:var(--muted);text-align:center;font-size:10px;padding:2px 8px">${esc(label)}</td><td style="font-weight:${oppB?700:400};color:${oppB?'var(--green)':'inherit'};padding:2px 6px;font-size:12px">${oppTxt!==undefined?oppTxt:oppN}</td></tr>`;
    };
    const ht=myM.det.htScore||{h:0,a:0}, htMine=mineIsH?ht.h:ht.a, htOpp=mineIsH?ht.a:ht.h;
    // Scoring timeline
    const tryEvs=[...(myM.det.h._tryEvents||[]).map(ev=>({...ev,side:'h'})),...(myM.det.a._tryEvents||[]).map(ev=>({...ev,side:'a'}))].sort((a,b)=>a.min-b.min);
    const penEvs=[...(myM.det.h._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'h'})),...(myM.det.a._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'a'}))].sort((a,b)=>a.min-b.min);
    const fgEvs=(myM.det.events||[]).filter(e=>e.pts===1).sort((a,b)=>a.min-b.min);
    let sH=0,sA=0;
    const scoreEvs=[...tryEvs.map(ev=>({min:ev.min,type:'try',ev})),...penEvs.map(ev=>({min:ev.min,type:'pen',ev})),...fgEvs.map(ev=>({min:ev.min,type:'fg',ev}))].sort((a,b)=>a.min-b.min);
    const scoringTimeline=scoreEvs.map(item=>{
      if(item.type==='try'){const ev=item.ev,team=ev.side==='h'?th:ta,scorer=G.players[ev.scorerId],assist=ev.assistId?G.players[ev.assistId]:null;if(ev.side==='h') sH+=4+(ev.converted?2:0);else sA+=4+(ev.converted?2:0);const isMine=(ev.side==='h')===mineIsH,col=isMine?'var(--green)':'var(--red)';return `<div style="display:flex;gap:6px;align-items:baseline;padding:4px 6px;border-left:3px solid ${col};margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:${col};font-weight:700;width:28px;flex-shrink:0;font-size:10px">TRY</span><span style="flex:1">${esc(scorer?scorer.name:'?')}${assist?` <span style="color:var(--muted)">(${esc(assist.name)})</span>`:''} <span style="font-size:10px;color:${ev.converted?'var(--green)':'var(--red)'}">${ev.converted?'CONV':'NO CONV'}</span> <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span></div>`;}
      if(item.type==='pen'){const ev=item.ev,team=ev.side==='h'?th:ta,kicker=ev.kickerId?G.players[ev.kickerId]:null;if(ev.side==='h') sH+=2;else sA+=2;return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">PEN</span><span style="flex:1">${kicker?esc(kicker.name):'?'} <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span></div>`;}
      if(item.type==='fg'){const ev=item.ev,team=G.teams[ev.team];if(ev.team===myM.h) sH+=1;else sA+=1;return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">FG</span><span style="flex:1">${team?esc(team.nick):'?'}</span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span></div>`;}
      return '';
    }).join('');
    const myInjs=Object.entries(myDet).filter(([,l])=>l&&l.inj).map(([id,l])=>{const p=G.players[+id];if(!p)return null;return `${esc(p.name)} — ${esc(l.inj)}${p.injury?` (${p.injury.weeks}wk)`:''}`}).filter(Boolean);
    return `<div class="grid2" style="gap:12px;margin-bottom:12px">
      <div><h2 class="sec" style="margin-top:0;font-size:12px">Best for ${myNick}</h2>${myTop.map(perfRow).join('')}</div>
      <div><h2 class="sec" style="margin-top:0;font-size:12px">Best for ${oppNick}</h2>${oppTop.map(perfRow).join('')}</div>
    </div>
    <p style="text-align:center;font-size:11px;color:var(--muted);margin:0 0 10px">HT: ${htMine}–${htOpp}</p>
    ${scoringTimeline?`<h2 class="sec" style="font-size:12px">Scoring</h2><div style="margin-bottom:12px">${scoringTimeline}</div>`:''}
    <h2 class="sec" style="font-size:12px">Match Stats</h2>
    <table style="width:100%;margin-bottom:10px"><thead><tr>
      <th class="noclick" style="text-align:right;color:var(--muted);font-size:10px;font-weight:400;padding:2px 6px">${myNick}</th>
      <th class="noclick" style="text-align:center;width:90px"></th>
      <th class="noclick" style="color:var(--muted);font-size:10px;font-weight:400;padding:2px 6px">${oppNick}</th>
    </tr></thead><tbody>
      ${statCmp('Tries',mySt.t,oppSt.t)}
      ${statCmp('Goals',mySt.gl,oppSt.gl,`${mySt.gl}/${mySt.ga}`,`${oppSt.gl}/${oppSt.ga}`)}
      ${mySt.fg||oppSt.fg?statCmp('Field goals',mySt.fg,oppSt.fg):''}
      ${statCmp('Tackles',mySt.tk,oppSt.tk)}
      ${statCmp('Missed tackles',mySt.mt,oppSt.mt,undefined,undefined,true)}
      ${statCmp('Run metres',mySt.m,oppSt.m)}
      ${mySt.k4020||oppSt.k4020?statCmp('40/20s',mySt.k4020,oppSt.k4020):''}
      ${mySt.fdo||oppSt.fdo?statCmp('Forced drop-outs',mySt.fdo,oppSt.fdo):''}
      ${statCmp('Errors',mySt.err,oppSt.err,undefined,undefined,true)}
      ${statCmp('Infringements',mySt.inf,oppSt.inf,undefined,undefined,true)}
    </tbody></table>
    ${myInjs.length?`<p style="font-size:12px;color:var(--red);margin:4px 0"><b>Injuries:</b> ${myInjs.join(' · ')}</p>`:''}
    ${(myM.det.suspensions||[]).length?`<p style="font-size:12px;color:var(--red);margin:4px 0 0"><b>Cited:</b> ${myM.det.suspensions.map(s=>{const p=G.players[s.pid];return p?`${esc(p.name)} (${s.weeks}wk)`:''}).filter(Boolean).join(', ')}</p>`:''}
    ${(myM.det.subs||[]).length?`<p style="font-size:12px;color:var(--muted);margin:4px 0 0"><b>Subs:</b> ${myM.det.subs.map(s=>{const pin=G.players[s.inId],pout=G.players[s.outId];return pin&&pout?`${esc(pin.name)} for ${esc(pout.name)} (${s.min}')`:''}).filter(Boolean).join(' · ')}</p>`:''}`;
  },

  showMatchFeed(games, title){
    const myM = games.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId);
    if(!myM) return UI.showRoundResults(games, title);
    const events = UI._buildFeed(myM);
    const h = G.teams[myM.h], a = G.teams[myM.a];
    UI.modal(`<h3>${esc(title)}</h3>
      <p class="page-sub" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${teamLogo(h,28)} ${esc(h.nick)} <b id="liveScoreH">–</b> – <b id="liveScoreA">–</b> ${teamLogo(a,28)} ${esc(a.nick)} · ${esc(myM.det.venue||'Stadium')} · ${esc(myM.det.weather||'')} · ${(myM.det.crowd||0).toLocaleString()}</p>
      <p id="liveResultBanner" style="text-align:center;font-weight:700;font-size:16px;margin-bottom:8px;color:var(--muted)">Kick off…</p>
      <div id="liveFeedBox" style="max-height:400px;overflow-y:auto;font-size:13px"></div>
      <div class="btnrow" style="margin-top:12px">
        <button class="btn primary" id="liveFullResultsBtn" style="display:none" onclick="UI.closeModal();UI.showRoundResults(G.fixtures[G.round-1],'Round ${G.round} results')">Full results</button>
        <button class="btn" onclick="UI.closeModal()">Close</button>
      </div>`);
    UI._revealFeed(events, 0, myM);
  },

  _revealFeed(events, i, myM){
    const box = document.getElementById('liveFeedBox');
    if(!box || i>=events.length) return;
    const e = events[i];
    const isScore = e.txt && (e.txt.startsWith('TRY') || e.txt.includes('HALF TIME') || e.txt.startsWith('FULL TIME') || e.txt.includes('slots a penalty goal'));
    const isSinBin = e.txt && (e.txt.includes('SIN BINNED') || e.txt.includes('SENT OFF'));
    const color = isScore ? 'color:var(--brass)' : isSinBin ? 'color:var(--red)' : '';
    box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline">
      <span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${e.min}'</span>
      <span style="${color}">${esc(e.txt)}</span>
    </div>`;
    box.scrollTop = box.scrollHeight;
    if(myM && e.txt && e.txt.startsWith('FULL TIME')){
      const won = myM.h===G.coach.teamId ? myM.hs>myM.as : myM.as>myM.hs;
      const drew = myM.hs===myM.as;
      const sh = document.getElementById('liveScoreH');
      const sa = document.getElementById('liveScoreA');
      const banner = document.getElementById('liveResultBanner');
      const fullBtn = document.getElementById('liveFullResultsBtn');
      if(sh) sh.textContent = myM.hs;
      if(sa) sa.textContent = myM.as;
      if(banner){ banner.textContent = won?'WIN':drew?'DRAW':'LOSS'; banner.style.color = won?'var(--green)':drew?'var(--muted)':'var(--red)'; }
      if(fullBtn) fullBtn.style.display='';
    }
    setTimeout(()=>UI._revealFeed(events, i+1, myM), Math.max(80, 800/(UI._watchSpeed||2)));
  },

  _buildTeamTalkHtml(myM){
    const mineIsH = myM.h === G.coach.teamId;
    const ht = myM.det.htScore || {h:0, a:0};
    const myHT = mineIsH ? ht.h : ht.a;
    const oppHT = mineIsH ? ht.a : ht.h;
    const situation = myHT > oppHT ? 'leading' : myHT < oppHT ? 'trailing' : 'level';
    const situationText = situation === 'leading'
      ? `You're ahead — keep the intensity and close it out.`
      : situation === 'trailing'
      ? `You're behind — something has to change in the second half.`
      : `It's all square — the second half decides everything.`;
    const t = myTeam();
    if(!UI._htSubPlans) UI._htSubPlans = {};
    // Build substitution rows (bench slots 13-16 = positions 14-17)
    const usedOutSlots = new Set(Object.values(UI._htSubPlans).filter(v => v !== '' && v != null));
    const subRows = [13,14,15,16].map(benchSlot => {
      const benchId = t.lineup[benchSlot];
      const p = benchId != null ? G.players[benchId] : null;
      if(!p) return '';
      const chosen = UI._htSubPlans[benchSlot];
      const starterOpts = Array.from({length:13}, (_,si) => {
        const sid = t.lineup[si];
        const sp = G.players[sid];
        if(!sp) return '';
        const alreadyTaken = usedOutSlots.has(si) && (+chosen !== si);
        return `<option value="${si}" ${+chosen===si?'selected':''} ${alreadyTaken?'disabled':''}>#${si+1} ${esc(sp.name)} (${sp.pos})</option>`;
      }).join('');
      return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:12px">
        <span style="flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
          <b>${esc(p.name)}</b> <span class="pos-tag" style="font-size:10px">${p.pos}</span> <span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span>
        </span>
        <select style="font-size:11px;max-width:165px" onchange="UI._setHtSubPlan(${benchSlot},this.value)">
          <option value="">Stay on bench</option>
          ${starterOpts}
        </select>
      </div>`;
    }).filter(Boolean).join('');
    const subCount = Object.values(UI._htSubPlans).filter(v => v !== '' && v != null).length;
    const subsHtml = subRows ? `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line)">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Substitutions <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
      ${subRows}
      ${subCount>0?`<p style="font-size:11px;color:var(--brass);margin:5px 0 0">${subCount} sub${subCount>1?'s':''} planned — will take effect at start of second half</p>`:''}
    </div>` : '';
    return `<div class="card" style="border-color:var(--brass);padding:14px">
      <h2 class="sec" style="margin-top:0;color:var(--brass)">Half-Time</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 12px">HT: <b>${myHT}–${oppHT}</b> · ${situationText}</p>
      ${subsHtml}
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Team Talk</div>
      <div class="grid2" style="gap:8px">
        <button class="btn" onclick="UI._applyTeamTalk('fireup')" style="text-align:left;height:auto;padding:10px 12px">
          <div style="font-weight:700;margin-bottom:3px">Fire Up</div>
          <div style="font-size:11px;color:var(--muted);white-space:normal">Rallying call — high intensity, lifts most players but risks discipline issues</div>
        </button>
        <button class="btn" onclick="UI._applyTeamTalk('encourage')" style="text-align:left;height:auto;padding:10px 12px">
          <div style="font-weight:700;margin-bottom:3px">Encourage</div>
          <div style="font-size:11px;color:var(--muted);white-space:normal">Back the players — safe and consistent, boosts confidence across the board</div>
        </button>
        <button class="btn" onclick="UI._applyTeamTalk('tactical')" style="text-align:left;height:auto;padding:10px 12px">
          <div style="font-weight:700;margin-bottom:3px">Tactical</div>
          <div style="font-size:11px;color:var(--muted);white-space:normal">Focus on structure and execution — neutral morale, reduces error risk</div>
        </button>
        <button class="btn" onclick="UI._applyTeamTalk('berate')" style="text-align:left;height:auto;padding:10px 12px">
          <div style="font-weight:700;margin-bottom:3px">Berate</div>
          <div style="font-size:11px;color:var(--muted);white-space:normal">Challenge underperformers — polarising; some respond, others shut down</div>
        </button>
      </div>
    </div>`;
  },

  _setHtSubPlan(benchSlot, outSlotStr){
    if(!UI._htSubPlans) UI._htSubPlans = {};
    if(outSlotStr === '' || outSlotStr == null){
      delete UI._htSubPlans[benchSlot];
    } else {
      UI._htSubPlans[benchSlot] = +outSlotStr;
    }
    const panel = document.getElementById('wg-postMatch');
    if(panel && UI._htMatch) panel.innerHTML = UI._buildTeamTalkHtml(UI._htMatch);
  },

  _applyHtSubs(myM){
    if(!myM || !UI._htSubPlans) return;
    const t = myTeam();
    const subEvents = [];
    for(const [benchSlotStr, outSlot] of Object.entries(UI._htSubPlans)){
      if(outSlot === undefined || outSlot === null || outSlot === '') continue;
      const benchSlot = +benchSlotStr;
      const inId = t.lineup[benchSlot];
      const outId = t.lineup[+outSlot];
      const inPlayer = G.players[inId];
      const outPlayer = G.players[outId];
      if(!inPlayer || !outPlayer) continue;
      // Swap in lineup for future use
      t.lineup[+outSlot] = inId;
      t.lineup[benchSlot] = outId;
      // Record in match det
      myM.det.subs = myM.det.subs || [];
      const subMin = ri(41, 55);
      myM.det.subs.push({outId, inId, outSlot: +outSlot, benchSlot, min: subMin});
      subEvents.push({min: subMin, txt: `↕ SUB — ${inPlayer.name} on for ${outPlayer.name} (${t.nick})`});
    }
    // Insert sub events into the queued second-half events at correct minute positions
    if(subEvents.length && UI._htEvents && UI._htNextIdx != null){
      subEvents.sort((a,b) => a.min - b.min);
      for(const ev of subEvents){
        let pos = UI._htNextIdx;
        while(pos < UI._htEvents.length && UI._htEvents[pos].min < ev.min) pos++;
        UI._htEvents.splice(pos, 0, ev);
      }
    }
    UI._htSubPlans = {};
  },

  _applyTeamTalk(choice){
    const MSGS = {
      fireup:    ["The coach demands more. The room responds with intensity.",    "A passionate call to arms echoes through the sheds."],
      encourage: ["The coach backs the group. Confidence is high.",              "Positive, assured — the team heads out believing."],
      tactical:  ["The coach maps out the second half in clinical detail.",       "Structure, discipline, execution — the adjustments are clear."],
      berate:    ["The coach calls out several players by name.",                 "The message is blunt. Some players grit their teeth; others look shaken."],
    };
    // Form deltas applied to starters going into second half
    const EFFECTS = { fireup: [2, 4], encourage: [2, 3], tactical: [1, 2], berate: [-4, 5] };
    // Power modifier fed into second-half simulation
    const POWER_MOD = { fireup: 1.05, encourage: 1.02, tactical: 1.01, berate: rnd() < 0.5 ? 1.04 : 0.97 };
    const [low, high] = EFFECTS[choice] || [1, 2];
    const t = myTeam();
    for(const id of t.lineup.slice(0, 13)){
      const p = G.players[id]; if(!p) continue;
      const delta = choice === 'berate' ? (rnd() < 0.35 ? low : high) : ri(low, high);
      p.form = clamp((p.form || 70) + delta, 30, 100);
    }
    const box = document.getElementById('wg-feedBox');
    if(box){
      const msg = pick(MSGS[choice] || MSGS.encourage);
      box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline">
        <span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">HT</span>
        <span style="color:var(--brass);font-style:italic">${esc(msg)}</span>
      </div>`;
      box.scrollTop = box.scrollHeight;
    }
    const postMatch = document.getElementById('wg-postMatch');
    if(postMatch){ postMatch.style.display = 'none'; postMatch.innerHTML = ''; }
    const myM = UI._htMatch;
    // Apply planned substitutions (updates lineup before second-half power is computed)
    UI._applyHtSubs(myM);
    // If this is a split-match (first half was simulated incrementally), simulate second half now
    if(myM && myM._htPending && typeof simMatchSecondHalf === 'function'){
      const powerMod = POWER_MOD[choice] || 1.0;
      const {h2Events} = simMatchSecondHalf(myM, false, powerMod);
      autoSave();
      // Insert any queued sub events from _applyHtSubs into h2Events
      const subEvents = (UI._htEvents || []).slice(UI._htNextIdx || 0).filter(e=>e.txt && e.txt.startsWith('↕ SUB'));
      const allH2 = [...(subEvents||[]), ...h2Events].sort((a,b)=>a.min-b.min);
      const banner = document.getElementById('wg-banner');
      if(banner) banner.textContent = '▶ Second half underway…';
      // Play the second-half events directly
      UI._revealFeedPageList(allH2, 0, myM);
      return;
    }
    // Fallback: pre-simulated feed
    const events = UI._htEvents, nextIdx = UI._htNextIdx;
    setTimeout(()=>UI._revealFeedPage(events, nextIdx, myM), 350);
  },

  _buildFeed(m){
    const h = G.teams[m.h], a = G.teams[m.a];

    const TRY_DESC = {
      FB:['weaves through to score','chips over and catches it himself','sprints clear on the full back'],
      WG:['dives over in the corner','finishes brilliantly','plants it down in-goal'],
      CE:['powers through','steps inside to score','bulldozes over the line'],
      FE:['catches them napping','produces something special','beats the last defender'],
      HB:['darts away from dummy half','slips through the gap','wrong-foots the defence to score'],
      PR:['crashes over from close range','powers through three defenders','rumbles over the line'],
      HK:['darts from dummy half to score','snipes through from short range','catches the defence off guard'],
      SR:['barges over','charges over the line','takes the direct option to score'],
      LK:['leads from the front to score','charges over','shows his class to dot down'],
      BE:['finishes the move off','gets the reward for hard work','crashes over'],
    };
    const tryDesc = pos => pick(TRY_DESC[pos] || TRY_DESC.BE);
    const ASSIST_VERBS = ['provides the scoring pass for','fires the ball to','puts','threads a perfect ball to'];

    // Build injury-minute lookup so events after a player's injury are suppressed for that player
    const injMins = {};
    for(const [sKey, sObj] of [['h', m.det.h], ['a', m.det.a]]){
      for(const [id, l] of Object.entries(sObj)){
        if(l && typeof l === 'object' && !Array.isArray(l) && l.injMin) injMins[sKey+':'+id] = l.injMin;
      }
    }
    const playerInjMin = (id, side) => injMins[side+':'+id] || null;

    // Collect all try events sorted by time
    const tryEvs = [
      ...(m.det.h._tryEvents||[]).map(ev=>({...ev, side:'h'})),
      ...(m.det.a._tryEvents||[]).map(ev=>({...ev, side:'a'})),
    ].sort((x,y)=>x.min-y.min);

    // Collect all penalty goal events
    const penEvs = [
      ...(m.det.h._penGoalEvents||[]).map(ev=>({...ev, side:'h'})),
      ...(m.det.a._penGoalEvents||[]).map(ev=>({...ev, side:'a'})),
    ].sort((x,y)=>x.min-y.min);

    const all = [];
    all.push({min:0, txt:`Kick off at ${m.det.venue||'the stadium'}. ${m.det.weather||'Clear'} conditions, crowd of ${(m.det.crowd||15000).toLocaleString()}.`});

    // Build try/conversion events with running score
    let sH=0, sA=0;
    for(const ev of tryEvs){
      const team = ev.side==='h' ? h : a;
      const scorer = G.players[ev.scorerId]; if(!scorer) continue;
      const assist = ev.assistId ? G.players[ev.assistId] : null;
      const kicker = ev.kickerId ? G.players[ev.kickerId] : null;
      if(ev.side==='h'){ sH += 4+(ev.converted?2:0); } else { sA += 4+(ev.converted?2:0); }
      const assistTxt = assist ? ` ${pick(ASSIST_VERBS)} ${assist.name},` : '';
      const convTxt = ev.converted
        ? (kicker && kicker.id!==scorer.id ? ` ${kicker.name} converts.` : ' Conversion good.')
        : ' Conversion missed.';
      // Cap try minute to before the scorer's injury so the player doesn't score after leaving the field
      const sInjMin = playerInjMin(ev.scorerId, ev.side);
      const tryMin = sInjMin ? Math.min(ev.min, Math.max(1, sInjMin - 1)) : ev.min;
      all.push({min:tryMin, txt:`TRY — ${team.nick}:${assistTxt} ${scorer.name} ${tryDesc(scorer.pos)}.${convTxt} (${sH}–${sA})`});
    }

    // Penalty goal events with running score
    for(const ev of penEvs){
      const team = ev.side==='h' ? h : a;
      const kicker = G.players[ev.kickerId]; if(!kicker) continue;
      if(ev.made){
        if(ev.side==='h') sH+=2; else sA+=2;
        all.push({min:ev.min, txt:`${kicker.name} (${team.nick}) slots a penalty goal. (${sH}–${sA})`});
      } else {
        all.push({min:ev.min, txt:`${kicker.name} (${team.nick}) misses the penalty attempt.`});
      }
    }

    // Field goals, infringements and other det.events
    for(const ev of (m.det.events||[])){
      all.push(ev);
    }

    // Injuries, 40/20s and forced drop-outs from per-player lines
    for(const [side, team, sKey] of [[m.det.h,h,'h'],[m.det.a,a,'a']]){
      for(const [id,l] of Object.entries(side)){
        const p = G.players[+id]; if(!p || typeof l!=='object' || !l || Array.isArray(l)) continue;
        const injMin = l.injMin || null;
        if(l.inj) all.push({min: injMin || ri(10,75), txt:`Injury: ${p.name} (${team.nick}) leaves the field with ${l.inj}.`});
        // 40/20s and FDOs must occur before the player was injured
        const maxKickMin = injMin ? Math.max(8, injMin - 1) : 72;
        if(l.k4020) for(let i=0;i<l.k4020;i++) all.push({min:ri(8, maxKickMin), txt:`${p.name} (${team.nick}) finds touch with a pinpoint 40/20 kick!`});
        if(l.fdo) for(let i=0;i<l.fdo;i++) all.push({min:ri(8, maxKickMin), txt:`${p.name} (${team.nick}) pins the opposition in-goal and forces a drop-out.`});
      }
    }

    all.sort((x,y)=>x.min-y.min);

    // Insert half-time marker
    let htH=0, htA=0;
    for(const ev of tryEvs.filter(e=>e.min<=40)){ if(ev.side==='h') htH+=4+(ev.converted?2:0); else htA+=4+(ev.converted?2:0); }
    for(const ev of penEvs.filter(e=>e.min<=40 && e.made)){ if(ev.side==='h') htH+=2; else htA+=2; }
    const htIdx = all.findIndex(e=>e.min>40);
    if(htIdx>=0) all.splice(htIdx,0,{min:40, txt:`⏸ HALF TIME — ${h.nick} ${htH}–${htA} ${a.nick}`});
    else all.push({min:40, txt:`⏸ HALF TIME — ${h.nick} ${htH}–${htA} ${a.nick}`});

    all.push({min:80, txt:`FULL TIME — ${h.nick} ${m.hs}–${m.as} ${a.nick}`});
    return all;
  },
});

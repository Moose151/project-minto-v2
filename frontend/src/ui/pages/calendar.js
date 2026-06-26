'use strict';

/* Calendar — daily schedule, stops, travel, and recovery */
Object.assign(UI, {
  p_calendar(){
    ensureCalendar();
    const today = G.calendar.day;
    const roundIdx = calendarRoundForDay(today);
    const stop = calendarStopForDay(today);
    const myMatch = calendarMyMatch(roundIdx);
    const bye = ((G.byes && G.byes[roundIdx]) || []).includes(G.coach.teamId);
    const t = myTeam();
    const lowCond = t.players.map(id=>G.players[id]).filter(p=>p && isTopSquadPlayer(p) && !p.injury && (p.cond < 72 || (p.load||0) > 62)).sort((a,b)=>(b.load||0)-(a.load||0)).slice(0,5);
    const injured = t.players.map(id=>G.players[id]).filter(p=>p && p.injury).length;
    const reviewPending = stop && (
      (stop.key === 'training' && G.calendar.trainingReviewedDay !== G.calendar.day) ||
      (stop.key === 'recovery' && G.calendar.medicalReviewedDay !== G.calendar.day)
    );
    const eventCard = (day) => {
      const r = calendarRoundForDay(day);
      const dow = calendarDayInWeek(day);
      const date = calendarDateLabel(day);
      const ev = calendarStopForDay(day);
      const m = calendarMyMatch(r);
      const isBye = ((G.byes && G.byes[r]) || []).includes(G.coach.teamId);
      let title = ev ? ev.label : 'Training block';
      let detail = 'Normal training and recovery.';
      let tone = ev ? ev.tone : 'neutral';
      if(dow === 2 || dow === 3) detail = 'Main preparation block. Review tactics and workloads.';
      if(ev && ev.key === 'selection') detail = 'Name a compliant 19-man squad before the weekend.';
      if(ev && ev.key === 'training') detail = 'Review training focus and medical load after the previous round.';
      if(ev && ev.key === 'travel') detail = 'Away trip logistics. Keep overloaded players fresh.';
      if(ev && ev.key === 'recovery') detail = 'Medical checks, rehab and reduced field load.';
      if(ev && ev.key === 'gamenight'){
        const round = G.fixtures && G.fixtures[r];
        if(round){
          const gn = sortMatchesBySlot(round).filter(mm=>!mm.played && slotDow(mm.slot)===dow);
          detail = gn.map(mm=>`${teamName(G.teams[mm.h])} v ${teamName(G.teams[mm.a])} (${mm.slot ? mm.slot.label : 'TBC'})`).join(' · ') || 'Games today.';
        }
      }
      if(ev && ev.key === 'match'){
        if(isBye) detail = 'No fixture. Squad receives a rest week.';
        else if(m){
          const opp = G.teams[m.h===G.coach.teamId ? m.a : m.h];
          const slotLabel = m.slot ? ` · ${m.slot.label}` : '';
          detail = `${m.h===G.coach.teamId?'Home':'Away'} v ${teamName(opp)}${slotLabel}.`;
        }
      }
      const border = tone === 'good' ? 'var(--green)' : tone === 'warn' ? 'var(--brass)' : 'var(--line)';
      return `<div class="card" style="border-color:${border};padding:10px 12px;${day===today?'box-shadow:0 0 0 1px var(--brass) inset':''}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><b>${esc(date)}</b><br><span style="color:var(--muted);font-size:11px">Round ${r+1}</span></div>
          ${day===today?'<span style="font-size:10px;color:var(--brass);font-weight:700">TODAY</span>':''}
        </div>
        <div style="margin-top:8px;font-weight:700">${esc(title)}</div>
        <p style="font-size:12px;color:var(--muted);margin:3px 0 0">${esc(detail)}</p>
      </div>`;
    };
    const matchLine = myMatch && !bye ? (() => {
      const opp = G.teams[myMatch.h===G.coach.teamId ? myMatch.a : myMatch.h];
      return `${myMatch.h===G.coach.teamId?'Home':'Away'} v ${teamName(opp)}`;
    })() : bye ? 'Bye week' : 'No fixture';
    const roundMatches = sortMatchesBySlot(G.fixtures[roundIdx] || []);
    const roundRows = roundMatches.map(m=>{
      const h = G.teams[m.h], a = G.teams[m.a];
      const mine = m.h===G.coach.teamId || m.a===G.coach.teamId;
      const slotLabel = m.slot ? m.slot.label : 'Sat Afternoon';
      const status = m.played ? `${m.hs}–${m.as}` : 'Upcoming';
      const statusColour = m.played ? 'var(--ink)' : 'var(--muted)';
      return `<tr style="${mine?'background:rgba(210,165,62,.07)':''}">
        <td style="font-size:11px;color:var(--brass);font-weight:700">${esc(slotLabel)}</td>
        <td>${teamLogo(h,20)} ${esc(h.nick)}</td>
        <td class="num" style="font-weight:700;color:${statusColour}">${status}</td>
        <td style="text-align:right">${esc(a.nick)} ${teamLogo(a,20)}</td>
      </tr>`;
    }).join('');
    return `<h1 class="page">Calendar</h1>
    <p class="page-sub">${calendarDateLabel()} · Round ${roundIdx+1} · ${esc(matchLine)}</p>
    <div class="grid3" style="margin-bottom:12px">
      <div class="card"><div class="navsep" style="margin:0">Current Stop</div><div style="font-family:var(--disp);font-size:24px;font-weight:700;margin-top:4px">${esc(stop ? stop.label : 'Training block')}</div><p class="page-sub">${reviewPending?`${stop.key==='recovery'?'Medical':'Training'} review still pending.`:stop && stop.key==='match' ? (bye?'Bye weekend':'Ready for match day') : 'Advance one day at a time.'}</p>${reviewPending?`<button class="btn sm primary" onclick="UI.go('${stop.key==='recovery'?'injuryward':'training'}')">Review ${stop.key==='recovery'?'medical':'training'}</button>`:''}</div>
      <div class="card"><div class="navsep" style="margin:0">Fatigue Watch</div><div style="font-family:var(--disp);font-size:24px;font-weight:700;margin-top:4px;color:${lowCond.length?'var(--brass)':'var(--green)'}">${lowCond.length}</div><p class="page-sub">Main-squad players below 72 condition or above 62 load.</p></div>
      <div class="card"><div class="navsep" style="margin:0">Medical</div><div style="font-family:var(--disp);font-size:24px;font-weight:700;margin-top:4px;color:${injured?'var(--red)':'var(--green)'}">${injured}</div><p class="page-sub">Unavailable injured players.</p></div>
    </div>
    <div class="btnrow"><button class="btn primary" onclick="UI.advance()">${stop&&stop.key==='match'&&!bye?'Play Match Day':'Next Day'}</button><button class="btn" onclick="UI.go('teamsheet')">Team Sheet</button><button class="btn" onclick="UI.go('training')">Training</button><button class="btn" onclick="UI.go('injuryward')">Injury Ward</button>${lowCond.length?`<button class="btn" onclick="myTeam().focus='recovery';UI.toast('Team focus set to recovery.');UI.render()">Set recovery focus</button>`:''}</div>
    ${lowCond.length?`<h2 class="sec">Load Watch</h2><div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr><th class="noclick">Player</th><th class="noclick">Pos</th><th class="noclick num">Cond</th><th class="noclick num">Load</th><th class="noclick num">Fatigue</th></tr></thead><tbody>${lowCond.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})"><td><b>${esc(p.name)}</b></td><td><span class="pos-tag">${p.pos}</span></td><td class="num" style="color:${p.cond<65?'var(--red)':p.cond<78?'var(--brass)':'var(--muted)'}">${Math.round(p.cond)}%</td><td class="num">${Math.round(p.load||0)}</td><td class="num">${Math.round(p.fatigue||0)}</td></tr>`).join('')}</tbody></table></div>`:''}
    <h2 class="sec">Round ${roundIdx+1} Games</h2>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr><th class="noclick">Kickoff</th><th class="noclick">Home</th><th class="noclick num">Status</th><th class="noclick" style="text-align:right">Away</th></tr></thead><tbody>${roundRows}</tbody></table></div>
    <h2 class="sec">Next 14 Days</h2>
    <div class="grid3">${Array.from({length:14},(_,i)=>eventCard(today+i)).join('')}</div>`;
  }
});

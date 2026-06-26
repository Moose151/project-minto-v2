'use strict';

/* Dashboard — club hub, next match, mini ladder, media feed */
Object.assign(UI, {
  _dashStatus(label, value, sub, tone){
    return `<div class="dash-status ${tone||''}">
      <div class="dash-label">${esc(label)}</div>
      <div class="dash-value">${value}</div>
      <div class="dash-sub">${esc(sub||'')}</div>
    </div>`;
  },
  _dashAlerts(t, lad){
    const alerts = [];
    const injured = t.players.map(id=>G.players[id]).filter(p=>p && p.injury);
    const suspended = t.players.map(id=>G.players[id]).filter(p=>p && p.suspended && p.suspended.weeks>0);
    const devReady = t.players.map(id=>G.players[id]).filter(p=>p && p.squad==='dev' && p.ovr>=60);
    const expiring = t.players.map(id=>G.players[id]).filter(p=>p && p.years<=1 && p.squad==='top');
    const slTargets = (G.coach.shortlist || []).map(id=>G.players[id]).filter(p=>p && p.years<=1);
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    if(injured.length) alerts.push({tone:'bad', title:'Casualty ward', body:`${injured.length} player${injured.length===1?' is':'s are'} injured. Check the team sheet before advancing.`, action:`<button class="btn sm" onclick="UI.go('teamsheet')">Team sheet</button>`});
    if(suspended.length) alerts.push({tone:'bad', title:'Suspension', body:suspended.map(p=>`${p.name} (${p.suspended.weeks}w remaining)`).join(', '), action:`<button class="btn sm" onclick="UI.go('teamsheet')">Team sheet</button>`});
    if(devReady.length) alerts.push({tone:'good', title:'Promotion ready', body:`${devReady.length} development player${devReady.length===1?' is':'s are'} rated 60+ OVR.`, action:`<button class="btn sm" onclick="UI.go('squad')">Review squad</button>`});
    if(expiring.length >= 5) alerts.push({tone:'neutral', title:'Contract queue', body:`${expiring.length} top-squad players have one year or less remaining.`, action:`<button class="btn sm" onclick="UI.go('contracts')">Contracts</button>`});
    if(slTargets.length) alerts.push({tone:'neutral', title:'Recruitment watch', body:`${slTargets.length} shortlisted target${slTargets.length===1?' is':'s are'} approachable now or this off-season.`, action:`<button class="btn sm" onclick="UI.go('recruitment')">Recruitment</button>`});
    if((t.cohesion||50) < 35) alerts.push({tone:'bad', title:'Cohesion low', body:'Lineup churn is hurting match-day rhythm. A settled 13 will lift cohesion over time.', action:`<button class="btn sm" onclick="UI.go('teamsheet')">Settle side</button>`});
    if(G.coach.conf < 30) alerts.push({tone:'bad', title:'Board pressure', body:`Board confidence is down to ${Math.round(G.coach.conf)}%. Results matter from here.`, action:`<button class="btn sm" onclick="UI.go('ladder')">View ladder</button>`});
    if(!alerts.length && G.phase==='regular') alerts.push({tone:'good', title:'Week in hand', body:`The club is ${ord(pos)} and ready for the next round. Review training or play on.`, action:`<button class="btn sm" onclick="UI.go('training')">Training</button>`});
    return alerts.slice(0,4).map(a=>`<div class="alert-card ${a.tone}">
      <div><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>${a.action||''}
    </div>`).join('');
  },
  _newsCard(n){
    if(typeof n === 'string') n = {title:'Club News', body:n, txt:n, type:'general', tone:'neutral', tag:'News'};
    const body = n.body || n.txt || '';
    const title = n.title || n.tag || 'Club News';
    const tag = n.tag || n.type || 'News';
    const clickable = n.playerId ? ` onclick="UI.playerModal(${n.playerId})"` : (n.teamId!=null && UI.teamModal ? ` onclick="UI.teamModal(${n.teamId})"` : '');
    return `<div class="news-card ${n.tone||'neutral'} ${clickable?'clickable':''}"${clickable}>
      <div class="news-top"><span>${esc(tag)}</span><span>${n.y} · Rd ${n.r}</span></div>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
    </div>`;
  },
  p_dashboard(){
    const t = myTeam();
    const lad = ladder();
    const next = G.phase==='regular' && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
    const onBye = G.phase==='regular' && (G.byes && G.byes[G.round] || []).includes(t.id);
    const rec = lad.find(r=>r.id===t.id);
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    const capSpend = teamSalary(t);
    const capPct = Math.round(capSpend / G.config.cap * 100);
    const topCount = squadCount(t, 'top');
    const devReady = t.players.map(id=>G.players[id]).filter(p=>p && p.squad==='dev' && p.ovr>=60).length;
    const injured = t.players.map(id=>G.players[id]).filter(p=>p && p.injury).length;
    const suspended = t.players.map(id=>G.players[id]).filter(p=>p && p.suspended && p.suspended.weeks>0).length;
    const shortlist = (G.coach.shortlist || []).length;
    const club = G.club || { funds: 0 };
    const clubFundsTone = club.funds < 0 ? 'bad' : club.funds > 2000000 ? 'good' : '';
    let nextHtml = '<p class="page-sub">No upcoming fixture.</p>';
    if(onBye && !next){
      nextHtml = `<div style="text-align:center;padding:16px 0 8px">
        <div style="font-size:40px;font-weight:900;font-family:var(--disp);color:var(--brass);letter-spacing:.06em">BYE</div>
        <p class="page-sub" style="margin:4px 0 10px">Round ${G.round+1} — rest week. Players get a bonus conditioning boost.</p>
        <div class="btnrow" style="justify-content:center"><button class="btn primary" onclick="UI.advance()">Next day</button><button class="btn" onclick="UI.go('calendar')">Calendar</button><button class="btn" onclick="UI.go('fixtures')">View fixtures</button></div>
      </div>`;
    } else if(next){
      const opp = G.teams[next.h===t.id ? next.a : next.h];
      const home = next.h===t.id;
      const oppPos = lad.findIndex(r=>r.id===opp.id)+1;
      const oppRec = lad.find(r=>r.id===opp.id);
      const streak = (() => {
        const form = rec ? rec.form.slice().reverse().filter(f=>f==='W'||f==='L'||f==='D') : [];
        if(!form.length) return '';
        const t0 = form[0];
        let count = 0;
        for(const f of form){ if(f===t0) count++; else break; }
        if(count < 2) return '';
        const color = t0==='W'?'var(--green)':t0==='L'?'var(--red)':'var(--muted)';
        return `<span style="font-size:11px;font-weight:700;color:${color};margin-left:6px">${count === form.length ? count+'✦ ' : count+'×'}${t0==='W'?'WIN STREAK':t0==='L'?'LOSS STREAK':'DRAWS'}</span>`;
      })();
      const slotInfo = next && next.slot ? `<span style="font-size:11px;color:var(--brass);font-weight:700;margin-right:8px">${esc(next.slot.label)}</span>` : '';
      nextHtml = `<div class="vs-big" style="padding:8px 0">
        <div class="tm">${teamLogo(t,58)}<div class="nm">${esc(t.nick)}</div><div class="pmeta" style="color:var(--muted)">${ord(pos)} · ${rec?rec.w+'-'+rec.l:'–'}${streak}</div><div class="team-rating-row" style="justify-content:center">${teamRatingPill(t,'overall','OVR')}${teamRatingPill(t,'atk','ATT')}${teamRatingPill(t,'def','DEF')}</div></div>
        <div class="dash">v</div>
        <div class="tm">${teamLogo(opp,58)}<div class="nm">${esc(opp.nick)}</div><div class="pmeta" style="color:var(--muted)">${ord(oppPos)} · ${oppRec.w}-${oppRec.l}</div><div class="team-rating-row" style="justify-content:center">${teamRatingPill(opp,'overall','OVR')}${teamRatingPill(opp,'atk','ATT')}${teamRatingPill(opp,'def','DEF')}</div></div>
      </div>
      ${(()=>{
        const mr = G.magicRound;
        if(mr && mr.round === G.round){
          const mrH = G.teams.find(x=>x.id===mr.hostTeamId);
          return `<div style="text-align:center;margin:4px 0;padding:4px 8px;background:rgba(210,165,62,.12);border-radius:6px;font-size:11px;color:var(--brass);font-weight:600">✦ Magic Round · ${esc(mr.venue)} · Neutral venue — no home advantage</div>`;
        }
        return `<p style="text-align:center; color:var(--muted); font-size:12px">${slotInfo}${home?'Home':'Away'} · Round ${G.round+1}</p>`;
      })()}
      <div class="btnrow" style="justify-content:center"><button class="btn" onclick="UI.go('teamsheet')">Set team</button><button class="btn" onclick="UI.go('calendar')">Calendar</button><button class="btn primary" onclick="UI.advance()">${calendarStopForDay(ensureCalendar().day)?.key==='match'?'Play match day':'Next day'}</button></div>`;
    }
    if(G.phase==='finals'){
      const btn = G.finals.useTop8
        ? ['Play Finals Week 1','Play Semi Finals','Play Preliminary Finals','Play Grand Final'][G.finals.week-1]
        : (G.finals.week===1?'Play Semis':'Play Grand Final');
      nextHtml = `<p>Finals football. Hit <b>${btn}</b> up top to advance.</p>`;
    }
    const mini = lad.slice(0,8).map((r,i)=>{
      const tm = G.teams[r.id];
      return `<tr style="${tm.id===t.id?'background:rgba(210,165,62,.07)':''}"><td class="lpos">${i+1}</td><td>${teamLogo(tm,24)} ${esc(tm.nick)}</td><td class="num">${r.pts}</td><td>${r.form.slice(-5).map(f=>`<span class="form-dot ${f}"></span>`).join('')}</td></tr>`;
    }).join('');
    // State of Origin widget
    const originHtml = (() => {
      const orig = G.origin;
      if(!orig || !orig.games) return '';
      const played = orig.games.filter(g=>g.played);
      const next = orig.games.find(g=>!g.played);
      if(!played.length && !next) return '';
      const s = orig.series;
      const seriesLabel = s.qld===s.nsw ? `${s.qld} all` : `${s.qld>s.nsw?'QLD':' NSW'} ${Math.max(s.qld,s.nsw)}-${Math.min(s.qld,s.nsw)}`;
      const lastGame = played[played.length-1];
      const lastLine = lastGame ? `Game ${lastGame.num}: QLD ${lastGame.qldScore}–${lastGame.nswScore} NSW · ` : '';
      const nextLine = next ? `Game ${next.num} · Round ${next.round+1} · ${next.venue}` : 'Series complete';
      return `<div class="card" style="margin-top:12px;padding:10px 14px;border-color:rgba(210,165,62,.4)">
        <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">State of Origin ${G.year}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <span style="font-size:20px;font-weight:700;font-family:var(--disp)">QLD ${s.qld} – NSW ${s.nsw}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:8px">${s.qld===s.nsw?'Level':''+seriesLabel}</span>
          </div>
          <div style="font-size:11px;color:var(--muted);text-align:right">${lastLine}${nextLine}</div>
        </div>
      </div>`;
    })();
    // Last completed round results for the "Round Results" panel
    const lastCompletedRound = G.round > 0 ? G.round - 1 : null;
    const roundResultsHtml = (() => {
      if(lastCompletedRound === null || !G.fixtures[lastCompletedRound]) return '';
      const rf = G.fixtures[lastCompletedRound];
      const sorted = sortMatchesBySlot(rf.filter(m=>m.played));
      if(!sorted.length) return '';
      const rows = sorted.map(m=>{
        const h=G.teams[m.h], a=G.teams[m.a];
        const mine = m.h===G.coach.teamId || m.a===G.coach.teamId;
        const slotLabel = m.slot ? m.slot.label : 'Sat Afternoon';
        return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--line);${mine?'background:rgba(210,165,62,.06);margin:0 -8px;padding:4px 8px;':''}">
          <span style="font-size:9px;color:var(--brass);min-width:68px;flex-shrink:0;font-weight:600">${esc(slotLabel)}</span>
          ${teamLogo(h,18)}
          <span style="font-size:12px;font-weight:${m.hs>m.as?700:400};flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(h.nick)}</span>
          <span style="font-size:13px;font-weight:700;font-family:var(--disp);min-width:36px;text-align:center">${m.hs}–${m.as}</span>
          <span style="font-size:12px;font-weight:${m.as>m.hs?700:400};flex:1;text-align:right;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(a.nick)}</span>
          ${teamLogo(a,18)}
        </div>`;
      });
      const byeTeams = (G.byes && G.byes[lastCompletedRound]) || [];
      const byeRow = byeTeams.length ? `<div style="font-size:10px;color:var(--brass);text-align:center;padding:4px 0">${byeTeams.map(id=>G.teams[id]?esc(G.teams[id].nick):'').join(', ')} — BYE</div>` : '';
      return `<div class="card" style="margin-top:16px"><h2 class="sec" style="margin-top:0">Round ${lastCompletedRound+1} Results</h2>${rows.join('')}${byeRow}
        <div class="btnrow" style="margin-top:8px"><button class="btn sm" onclick="UI._fixtRound=${lastCompletedRound};UI.go('fixtures')">Full fixtures</button></div>
      </div>`;
    })();
    const news = (G.news || []).slice(0,12).map(n=>UI._newsCard(n)).join('') || '<p class="page-sub">Quiet week.</p>';
    return `<h1 class="page">Dashboard</h1><p class="page-sub">${esc(teamName(t))} · ${G.year} · Board expectation: ${esc(G.coach.expect.label)}</p>
    <div class="dash-strip">
      ${UI._dashStatus('Ladder', ord(pos), `${rec.w}-${rec.l}, ${rec.pts} pts`, pos<=4?'good':pos>G.teams.length*.7?'bad':'')}
      ${UI._dashStatus('Board', `${Math.round(G.coach.conf)}%`, 'confidence', G.coach.conf>=70?'good':G.coach.conf<35?'bad':'')}
      ${UI._dashStatus('Cohesion', `${Math.round(t.cohesion||50)}%`, 'lineup rhythm', (t.cohesion||50)>=70?'good':(t.cohesion||50)<35?'bad':'')}
      ${(()=>{ const r=teamRatings(t); return UI._dashStatus('Attack', r.atk, 'squad attack rating', r.atk>=72?'good':r.atk<55?'bad':'') + UI._dashStatus('Defence', r.def, 'squad defence rating', r.def>=72?'good':r.def<55?'bad':''); })()}
      ${UI._dashStatus('Cap', `${capPct}%`, `${money(capSpend)} spent`, capPct>98?'bad':capPct<88?'good':'')}
      ${UI._dashStatus('Squad', `${topCount}/${TOP_SQUAD_CAP}`, `${injured} injured · ${suspended} suspended`, (injured||suspended)?'bad':devReady?'good':'')}
      ${UI._dashStatus('Shortlist', shortlist, 'targets watched', shortlist?'good':'')}
      ${UI._dashStatus('Club Funds', money(club.funds), `${money(club.seasonRevenue||0)} revenue this season`, clubFundsTone)}
    </div>
    ${originHtml}
    <div class="grid2" style="margin-top:${originHtml?'12':'16'}px">
      <div class="card"><h2 class="sec" style="margin-top:0">Next match</h2>${nextHtml}</div>
      <div class="card"><h2 class="sec" style="margin-top:0">Club alerts</h2><div class="alert-list">${UI._dashAlerts(t, lad)}</div></div>
    </div>
    ${roundResultsHtml}
    <div class="grid2" style="margin-top:16px">
      <div class="card"><h2 class="sec" style="margin-top:0">Ladder</h2><table><tbody>${mini}</tbody></table>
        <div class="btnrow"><button class="btn sm" onclick="UI.go('ladder')">Full ladder</button></div></div>
      <div class="card"><h2 class="sec" style="margin-top:0">Media feed</h2>
        <div class="news-list">${news}</div></div>
    </div>`;
  }
});

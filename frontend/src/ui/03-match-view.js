'use strict';

Object.assign(UI, {
  /* ---------- advance ---------- */
  advance(){
    if(!G || G.phase==='offseason') return;
    const stop = G.phase === 'regular' && typeof calendarStopForDay === 'function' ? calendarStopForDay(ensureCalendar().day) : null;
    const onBye = G.phase === 'regular' && ((G.byes && G.byes[G.round]) || []).includes(G.coach.teamId);
    if(stop && stop.key === 'training' && G.calendar.trainingReviewedDay !== G.calendar.day){
      UI.page = 'training';
      UI._forceTop = true;
      UI.render();
      UI.toast('Review training and recovery before advancing.');
      return;
    }
    if(stop && stop.key === 'recovery' && G.calendar.medicalReviewedDay !== G.calendar.day){
      UI.page = 'injuryward';
      UI._forceTop = true;
      UI.render();
      UI.toast('Complete the recovery and judiciary review before advancing.');
      return;
    }
    const requiresTeamList = G.phase !== 'regular' || (stop && ((stop.key === 'selection' && !onBye) || (stop.key === 'match' && !onBye)));
    const issues = requiresTeamList ? lineupIssues(myTeam()) : [];
    if(issues.length){
      UI.modal(`<h3>Team Sheet Not Compliant</h3>
        <p class="page-sub">${stop&&stop.key==='selection'?'Team-list Tuesday requires a compliant 19 before you advance.':'Fix these issues before advancing to the match.'}</p>
        <div class="card" style="padding:10px">${issues.map(x=>`<div style="padding:4px 0;color:var(--red)">${esc(x)}</div>`).join('')}</div>
        <div class="btnrow"><button class="btn primary" onclick="UI.closeModal();UI.go('teamsheet')">Fix team sheet</button><button class="btn" onclick="UI.closeModal()">Close</button></div>`);
      return;
    }
    if(stop && stop.key === 'selection' && !onBye && G.phase === 'regular'){
      const t = myTeam();
      if(t.teamSubmitted !== G.round){
        UI.modal(`<h3>Team List Not Submitted</h3>
          <p class="page-sub">You must confirm your team list on the team sheet before the Tuesday deadline.</p>
          <div class="btnrow"><button class="btn primary" onclick="UI.closeModal();UI.go('teamsheet')">Go to Team Sheet</button><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`);
        return;
      }
    }
    const res = G.phase === 'regular' && typeof advanceCalendarDay === 'function' ? advanceCalendarDay() : advanceRound();
    autoSave();
    if(res && (res.type === 'day' || res.type === 'round') && res.stop && res.stop.page && UI.page !== res.stop.page){
      UI.page = res.stop.page;
      UI._forceTop = true;
    }
    UI.render();
    if(res && (res.type === 'day' || res.type === 'round') && res.stop) UI.toast(res.stop.label);
    if(res && res.type==='round') UI.showRoundResults(res.round, `Round ${(res.roundIdx == null ? G.round - 1 : res.roundIdx) + 1} results`);
    if(res && res.type==='finals') UI.showRoundResults(res.games, res.label);
    if(res && res.type==='day' && res.earlyMatches && res.earlyMatches.length) UI.showEarlyResults(res.earlyMatches);
  },
  showRoundResults(games, title){
    const myM = games.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId);
    let big = '';
    if(myM){
      const th=G.teams[myM.h], ta=G.teams[myM.a];
      const mineIsH = myM.h === G.coach.teamId;
      const won = mineIsH ? myM.hs>myM.as : myM.as>myM.hs;
      const drew = myM.hs===myM.as;
      const myDet = mineIsH ? myM.det.h : myM.det.a;
      const oppDet = mineIsH ? myM.det.a : myM.det.h;
      const myNick = esc(mineIsH ? th.nick : ta.nick);
      const oppNick = esc(mineIsH ? ta.nick : th.nick);

      const sumDet = det => {
        const s = {t:0, gl:0, ga:0, fg:0, tk:0, mt:0, runs:0, m:0, err:0, inf:0, k4020:0, fdo:0};
        for(const [,l] of Object.entries(det)){
          if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
          s.t+=l.t||0; s.gl+=l.gl||0; s.ga+=l.ga||0; s.fg+=l.fg||0;
          s.tk+=l.tk||0; s.mt+=l.mt||0; s.runs+=l.runs||0; s.m+=l.m||0;
          s.err+=l.err||0; s.inf+=l.inf||0; s.k4020+=l.k4020||0; s.fdo+=l.fdo||0;
        }
        return s;
      };
      const mySt = sumDet(myDet), oppSt = sumDet(oppDet);

      const topPlayers = det => Object.entries(det)
        .map(([id,l])=>({p:G.players[+id], l}))
        .filter(x=>x.p && x.l && x.l.r)
        .sort((a,b)=>b.l.r-a.l.r);
      const myTop = topPlayers(myDet).slice(0,5);
      const oppTop = topPlayers(oppDet).slice(0,3);

      const myInjs = Object.entries(myDet).filter(([,l])=>l&&l.inj).map(([id,l])=>{
        const p=G.players[+id]; if(!p) return null;
        return `${esc(p.name)} — ${esc(l.inj)}${p.injury?` (${p.injury.weeks}wk)`:''}`;
      }).filter(Boolean);

      // Scoring timeline
      const tryEvs = [
        ...(myM.det.h._tryEvents||[]).map(ev=>({...ev,side:'h'})),
        ...(myM.det.a._tryEvents||[]).map(ev=>({...ev,side:'a'})),
      ].sort((a,b)=>a.min-b.min);
      const penEvs = [
        ...(myM.det.h._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'h'})),
        ...(myM.det.a._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'a'})),
      ].sort((a,b)=>a.min-b.min);
      const fgEvs = (myM.det.events||[]).filter(e=>e.pts===1).sort((a,b)=>a.min-b.min);
      let sH=0, sA=0;
      const scoreEvs = [
        ...tryEvs.map(ev=>({min:ev.min, type:'try', ev})),
        ...penEvs.map(ev=>({min:ev.min, type:'pen', ev})),
        ...fgEvs.map(ev=>({min:ev.min, type:'fg', ev})),
      ].sort((a,b)=>a.min-b.min);
      const scoringTimeline = scoreEvs.map(item=>{
        if(item.type==='try'){
          const ev=item.ev; const team=ev.side==='h'?th:ta;
          const scorer=G.players[ev.scorerId], assist=ev.assistId?G.players[ev.assistId]:null;
          if(ev.side==='h') sH+=4+(ev.converted?2:0); else sA+=4+(ev.converted?2:0);
          const isMine=(ev.side==='h')===mineIsH, col=isMine?'var(--green)':'var(--red)';
          return `<div style="display:flex;gap:6px;align-items:baseline;padding:4px 6px;border-left:3px solid ${col};margin:2px 0;font-size:12px">
            <span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span>
            <span style="color:${col};font-weight:700;width:28px;flex-shrink:0;font-size:10px">TRY</span>
            <span style="flex:1">${esc(scorer?scorer.name:'?')}${assist?` <span style="color:var(--muted)">(${esc(assist.name)})</span>`:''} <span style="font-size:10px;color:${ev.converted?'var(--green)':'var(--red)'}">${ev.converted?'CONV':'NO CONV'}</span> <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span>
            <span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span>
          </div>`;
        }
        if(item.type==='pen'){
          const ev=item.ev; const team=ev.side==='h'?th:ta;
          const kicker=ev.kickerId?G.players[ev.kickerId]:null;
          if(ev.side==='h') sH+=2; else sA+=2;
          return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px">
            <span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span>
            <span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">PEN</span>
            <span style="flex:1">${kicker?esc(kicker.name):'?'} <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span>
            <span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span>
          </div>`;
        }
        if(item.type==='fg'){
          const ev=item.ev; const team=G.teams[ev.team];
          if(ev.team===myM.h) sH+=1; else sA+=1;
          return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px">
            <span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span>
            <span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">FG</span>
            <span style="flex:1">${team?esc(team.nick):'?'}</span>
            <span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--brass)">${sH}–${sA}</span>
          </div>`;
        }
        return '';
      }).join('');

      const perfRow = x => `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;border-bottom:1px solid var(--line)">
        <span style="cursor:pointer;text-decoration:underline;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" onclick="UI.closeModal();UI.playerModal(${x.p.id})">${esc(x.p.name)} <span class="pos-tag" style="font-size:10px">${x.p.pos}</span></span>
        <span style="color:var(--muted);font-size:11px;white-space:nowrap;padding-left:6px">${x.l.t?x.l.t+'T ':''}${x.l.ta?x.l.ta+'TA ':''}${x.l.gl?x.l.gl+(x.l.ga?'/'+x.l.ga:'')+'G ':''}${x.l.fg?x.l.fg+'FG ':''}${x.l.k4020?x.l.k4020+' 40/20 ':''}${x.l.fdo?x.l.fdo+' FDO ':''}<b style="color:var(--ink)">${x.l.r.toFixed(1)}</b></span>
      </div>`;

      const statCmp = (label, myN, oppN, myTxt, oppTxt, lowerIsBetter) => {
        const myB = lowerIsBetter ? myN < oppN : myN > oppN;
        const oppB = lowerIsBetter ? oppN < myN : oppN > myN;
        return `<tr>
          <td style="text-align:right;font-weight:${myB?700:400};color:${myB?'var(--green)':'inherit'};padding:2px 6px;font-size:12px">${myTxt!==undefined?myTxt:myN}</td>
          <td style="color:var(--muted);text-align:center;font-size:10px;padding:2px 8px">${esc(label)}</td>
          <td style="font-weight:${oppB?700:400};color:${oppB?'var(--green)':'inherit'};padding:2px 6px;font-size:12px">${oppTxt!==undefined?oppTxt:oppN}</td>
        </tr>`;
      };

      const ht = myM.det.htScore || {h:0, a:0};
      const htMine = mineIsH ? ht.h : ht.a, htOpp = mineIsH ? ht.a : ht.h;

      big = `
        <div class="vs-big" style="padding:10px 0">
          <div class="tm">${teamLogo(th,32)}<div class="nm">${esc(th.nick)}</div><div class="sc ${myM.hs>myM.as?'winner':''}" style="color:${myM.hs>=myM.as?'var(--brass)':'var(--ink)'}">${myM.hs}</div></div>
          <div class="dash">–</div>
          <div class="tm">${teamLogo(ta,32)}<div class="nm">${esc(ta.nick)}</div><div class="sc ${myM.as>myM.hs?'winner':''}" style="color:${myM.as>=myM.hs?'var(--brass)':'var(--ink)'}">${myM.as}</div></div>
        </div>
        <p style="text-align:center;color:${won?'var(--green)':drew?'var(--muted)':'var(--red)'};font-weight:700;font-size:15px;margin:0 0 4px">${won?'WIN':drew?'DRAW':'LOSS'}</p>
        <p style="text-align:center;font-size:11px;color:var(--muted);margin:0 0 14px">${esc(myM.det.venue||'')} · ${esc(myM.det.weather||'')} · ${(myM.det.crowd||0).toLocaleString()} crowd · HT: ${htMine}–${htOpp}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <h2 class="sec" style="margin-top:0;font-size:12px">Best for ${myNick}</h2>
            ${myTop.map(perfRow).join('')}
          </div>
          <div>
            <h2 class="sec" style="margin-top:0;font-size:12px">Best for ${oppNick}</h2>
            ${oppTop.map(perfRow).join('')}
          </div>
        </div>

        ${scoringTimeline ? `<h2 class="sec" style="font-size:12px">Scoring</h2><div style="margin-bottom:12px">${scoringTimeline}</div>` : ''}

        <h2 class="sec" style="font-size:12px">Match Stats</h2>
        <table style="width:100%;margin-bottom:10px">
          <thead><tr>
            <th class="noclick" style="text-align:right;color:var(--muted);font-size:10px;font-weight:400;padding:2px 6px">${myNick}</th>
            <th class="noclick" style="text-align:center;width:90px"></th>
            <th class="noclick" style="color:var(--muted);font-size:10px;font-weight:400;padding:2px 6px">${oppNick}</th>
          </tr></thead>
          <tbody>
            ${myM.det.possH!=null ? statCmp('Possession %', mineIsH?myM.det.possH:myM.det.possA, mineIsH?myM.det.possA:myM.det.possH, `${mineIsH?myM.det.possH:myM.det.possA}%`, `${mineIsH?myM.det.possA:myM.det.possH}%`) : ''}
            ${myM.det.complH!=null ? statCmp('Completion %', mineIsH?myM.det.complH:myM.det.complA, mineIsH?myM.det.complA:myM.det.complH, `${mineIsH?myM.det.complH:myM.det.complA}%`, `${mineIsH?myM.det.complA:myM.det.complH}%`) : ''}
            ${statCmp('Tries', mySt.t, oppSt.t)}
            ${statCmp('Goals', mySt.gl, oppSt.gl, `${mySt.gl}/${mySt.ga}`, `${oppSt.gl}/${oppSt.ga}`)}
            ${mySt.fg||oppSt.fg ? statCmp('Field goals', mySt.fg, oppSt.fg) : ''}
            ${statCmp('Tackles', mySt.tk, oppSt.tk)}
            ${statCmp('Missed tackles', mySt.mt, oppSt.mt, undefined, undefined, true)}
            ${statCmp('Run metres', mySt.m, oppSt.m)}
            ${mySt.k4020||oppSt.k4020 ? statCmp('40/20s', mySt.k4020, oppSt.k4020) : ''}
            ${mySt.fdo||oppSt.fdo ? statCmp('Forced drop-outs', mySt.fdo, oppSt.fdo) : ''}
            ${statCmp('Errors', mySt.err, oppSt.err, undefined, undefined, true)}
            ${statCmp('Infringements', mySt.inf, oppSt.inf, undefined, undefined, true)}
          </tbody>
        </table>

        ${myInjs.length ? `<p style="font-size:12px;color:var(--red);margin:4px 0"><b>Injuries:</b> ${myInjs.join(' · ')}</p>` : ''}
        ${(myM.det.suspensions||[]).length ? `<p style="font-size:12px;color:var(--red);margin:4px 0 0"><b>Cited:</b> ${myM.det.suspensions.map(s=>{const p=G.players[s.pid];return p?`${esc(p.name)} (${s.weeks}wk)`:''}).filter(Boolean).join(', ')}</p>` : ''}`;
    }
    const others = games.filter(m=>m!==myM).map(m=>{
      const th=G.teams[m.h], ta=G.teams[m.a];
      return `<div class="score-line">
        <span class="team-spine" style="background:${th.c1}"></span><span class="t ${m.hs>m.as?'winner':''}">${esc(th.nick)}</span><span class="s">${m.hs}</span>
        <span style="color:var(--dim)">v</span>
        <span class="s">${m.as}</span><span class="t ${m.as>m.hs?'winner':''}" style="text-align:right">${esc(ta.nick)}</span><span class="team-spine" style="background:${ta.c1}"></span>
      </div>`;
    }).join('');
    UI.modal(`<h3>${esc(title)}</h3>${big}${others?`<h2 class="sec">Around the grounds</h2><div>${others}</div>`:''}
      <div class="btnrow" style="margin-top:16px"><button class="btn primary" onclick="UI.closeModal()">Continue</button></div>`);
  },
  showEarlyResults(games){
    if(!games || !games.length) return;
    const dayLabel = games[0].slot ? games[0].slot.label : 'Early games';
    const rows = games.map(m=>{
      const th=G.teams[m.h], ta=G.teams[m.a];
      return `<div class="score-line">
        <span class="team-spine" style="background:${th.c1}"></span><span class="t ${m.hs>m.as?'winner':''}">${esc(th.nick)}</span><span class="s">${m.hs}</span>
        <span style="color:var(--dim)">v</span>
        <span class="s">${m.as}</span><span class="t ${m.as>m.hs?'winner':''}" style="text-align:right">${esc(ta.nick)}</span><span class="team-spine" style="background:${ta.c1}"></span>
      </div>`;
    }).join('');
    UI.modal(`<h3>${esc(dayLabel)} Results</h3>
      <p class="page-sub" style="margin-bottom:10px">${games.length} game${games.length===1?'':'s'} played tonight.</p>
      <div>${rows}</div>
      <div class="btnrow" style="margin-top:14px"><button class="btn primary" onclick="UI.closeModal()">Continue</button></div>`);
  },
});

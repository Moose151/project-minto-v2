'use strict';

/* Full match analysis page — navigated to from the post-match "Full Analysis →" button */
Object.assign(UI, {
  get ['p_match-report']() { return UI.p_matchReport; },

  p_matchReport(){
    const myM = G._lastPlayedMatch;
    if(!myM) return `<h1 class="page">Match Report</h1><p class="page-sub">No recent match to display. Play a match first.</p>`;

    const th = G.teams[myM.h], ta = G.teams[myM.a];
    const coachInMatch = myM.h === G.coach.teamId || myM.a === G.coach.teamId;
    const mineIsH = coachInMatch ? myM.h === G.coach.teamId : true;
    const won   = mineIsH ? myM.hs > myM.as : myM.as > myM.hs;
    const drew  = myM.hs === myM.as;
    const myT   = mineIsH ? th : ta;
    const oppT  = mineIsH ? ta : th;
    const myDet = mineIsH ? myM.det.h : myM.det.a;
    const oppDet = mineIsH ? myM.det.a : myM.det.h;

    const resultClr = coachInMatch ? (won ? 'var(--green)' : drew ? 'var(--muted)' : 'var(--red)') : 'var(--brass)';
    const resultTxt = coachInMatch ? (won ? 'WIN' : drew ? 'DRAW' : 'LOSS') : 'FINAL';
    const myScore   = mineIsH ? myM.hs : myM.as;
    const oppScore  = mineIsH ? myM.as : myM.hs;
    const ht        = myM.det.htScore || {h:0, a:0};
    const htMine    = mineIsH ? ht.h : ht.a;
    const htOpp     = mineIsH ? ht.a : ht.h;

    // Aggregate team stats from detail objects
    const sumDet = det => {
      const s = {t:0,gl:0,ga:0,fg:0,tk:0,mt:0,runs:0,m:0,err:0,inf:0,k4020:0,fdo:0,ks:0,km:0};
      for(const [,l] of Object.entries(det)){
        if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
        s.t   += l.t||0; s.gl += l.gl||0; s.ga  += l.ga||0;  s.fg  += l.fg||0;
        s.tk  += l.tk||0;s.mt += l.mt||0; s.runs+= l.runs||0; s.m  += l.m||0;
        s.err += l.err||0; s.inf+=l.inf||0; s.k4020+=l.k4020||0; s.fdo+=l.fdo||0;
        s.ks  += l.ks||0; s.km += l.km||0;
      }
      return s;
    };
    const mySt = sumDet(myDet), oppSt = sumDet(oppDet);

    const statCmp = (label, myN, oppN, myTxt, oppTxt, lowerIsBetter) => {
      const myB = lowerIsBetter ? myN < oppN : myN > oppN;
      const oppB= lowerIsBetter ? oppN < myN  : oppN > myN;
      return `<tr>
        <td style="text-align:right;font-weight:${myB?700:400};color:${myB?'var(--green)':'inherit'};padding:3px 8px;font-size:13px">${myTxt !== undefined ? myTxt : myN}</td>
        <td style="color:var(--muted);text-align:center;font-size:11px;padding:3px 10px;white-space:nowrap">${esc(label)}</td>
        <td style="font-weight:${oppB?700:400};color:${oppB?'var(--green)':'inherit'};padding:3px 8px;font-size:13px">${oppTxt !== undefined ? oppTxt : oppN}</td>
      </tr>`;
    };

    // Scoring timeline
    const tryEvs = [
      ...(myM.det.h._tryEvents||[]).map(ev=>({...ev,side:'h'})),
      ...(myM.det.a._tryEvents||[]).map(ev=>({...ev,side:'a'}))
    ].sort((a,b)=>a.min-b.min);
    const penEvs = [
      ...(myM.det.h._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'h'})),
      ...(myM.det.a._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'a'}))
    ].sort((a,b)=>a.min-b.min);
    const fgEvs = (myM.det.events||[]).filter(e=>e.pts===1).sort((a,b)=>a.min-b.min);
    let sH=0, sA=0;
    const scoreEvs = [
      ...tryEvs.map(ev=>({min:ev.min,type:'try',ev})),
      ...penEvs.map(ev=>({min:ev.min,type:'pen',ev})),
      ...fgEvs.map(ev=>({min:ev.min,type:'fg',ev}))
    ].sort((a,b)=>a.min-b.min);
    const scoringTimeline = scoreEvs.map(item=>{
      if(item.type==='try'){
        const ev=item.ev, team=ev.side==='h'?th:ta;
        const scorer=G.players[ev.scorerId], assist=ev.assistId?G.players[ev.assistId]:null;
        if(ev.side==='h') sH+=4+(ev.converted?2:0); else sA+=4+(ev.converted?2:0);
        const isMine=(ev.side==='h')===mineIsH, col=coachInMatch ? (isMine?'var(--green)':'var(--red)') : (ev.side==='h'?'var(--green)':'var(--brass)');
        return `<div style="display:flex;gap:8px;align-items:baseline;padding:5px 8px;border-left:3px solid ${col};margin:3px 0;font-size:13px">
          <span style="color:var(--dim);font-size:11px;width:28px;flex-shrink:0">${ev.min}'</span>
          <span style="color:${col};font-weight:700;width:32px;flex-shrink:0;font-size:11px">TRY</span>
          <span style="flex:1">${esc(scorer?scorer.name:'?')}${assist?` <span style="color:var(--muted)">(${esc(assist.name)})</span>`:''}${ev.converted?' ✓':' ✗'} <span style="color:var(--muted);font-size:11px">${esc(team.nick)}</span></span>
          <span style="font-family:var(--disp);font-weight:700;font-size:14px;color:var(--brass)">${sH}–${sA}</span>
        </div>`;
      }
      if(item.type==='pen'){
        const ev=item.ev, team=ev.side==='h'?th:ta, kicker=ev.kickerId?G.players[ev.kickerId]:null;
        if(ev.side==='h') sH+=2; else sA+=2;
        return `<div style="display:flex;gap:8px;align-items:baseline;padding:4px 8px;border-left:3px solid var(--muted);margin:3px 0;font-size:13px">
          <span style="color:var(--dim);font-size:11px;width:28px;flex-shrink:0">${ev.min}'</span>
          <span style="color:var(--muted);width:32px;flex-shrink:0;font-size:11px">PEN</span>
          <span style="flex:1">${kicker?esc(kicker.name):'?'} <span style="color:var(--muted);font-size:11px">${esc(team.nick)}</span></span>
          <span style="font-family:var(--disp);font-weight:700;font-size:14px;color:var(--brass)">${sH}–${sA}</span>
        </div>`;
      }
      if(item.type==='fg'){
        const ev=item.ev, team=G.teams[ev.team];
        if(ev.team===myM.h) sH+=1; else sA+=1;
        return `<div style="display:flex;gap:8px;align-items:baseline;padding:4px 8px;border-left:3px solid var(--muted);margin:3px 0;font-size:13px">
          <span style="color:var(--dim);font-size:11px;width:28px;flex-shrink:0">${ev.min}'</span>
          <span style="color:var(--muted);width:32px;flex-shrink:0;font-size:11px">FG</span>
          <span style="flex:1">${team?esc(team.nick):'?'}</span>
          <span style="font-family:var(--disp);font-weight:700;font-size:14px;color:var(--brass)">${sH}–${sA}</span>
        </div>`;
      }
      return '';
    }).join('');

    // Full player stat table for one team
    const playerStatTable = (det, teamNick) => {
      const rows = Object.entries(det)
        .map(([id,l])=>({p:G.players[+id], l}))
        .filter(x=>x.p && x.l && typeof x.l === 'object' && !Array.isArray(x.l))
        .sort((a,b)=>(b.l.r||0)-(a.l.r||0));
      if(!rows.length) return '<p style="color:var(--muted);font-size:12px">No data.</p>';
      return `<div style="overflow-x:auto">
        <table style="width:100%;font-size:12px">
          <thead><tr style="color:var(--muted);font-size:10px">
            <th class="noclick" style="text-align:left;padding:3px 4px">Player</th>
            <th class="noclick" style="padding:2px 3px">Pos</th>
            <th class="noclick num" style="padding:2px 3px">T</th>
            <th class="noclick num" style="padding:2px 3px">TA</th>
            <th class="noclick num" style="padding:2px 3px">G</th>
            <th class="noclick num" style="padding:2px 3px">Runs</th>
            <th class="noclick num" style="padding:2px 3px">Tk</th>
            <th class="noclick num" style="padding:2px 3px">MT</th>
            <th class="noclick num" style="padding:2px 3px">Err</th>
            <th class="noclick num" style="padding:2px 3px">Inf</th>
            <th class="noclick num" style="padding:2px 3px">Rtg</th>
          </tr></thead>
          <tbody>${rows.map(({p,l})=>`
            <tr style="border-bottom:1px solid var(--line);cursor:pointer" onclick="UI.playerModal(${p.id})">
              <td style="padding:4px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${esc(p.name)}</td>
              <td style="padding:2px 3px"><span class="pos-tag" style="font-size:9px">${p.pos}</span></td>
              <td class="num" style="padding:2px 3px;color:${(l.t||0)?'var(--green)':'inherit'}">${l.t||'—'}</td>
              <td class="num" style="padding:2px 3px;color:var(--muted)">${l.ta||'—'}</td>
              <td class="num" style="padding:2px 3px">${l.gl!=null&&l.ga!=null?l.gl+'/'+l.ga:'—'}</td>
              <td class="num" style="padding:2px 3px">${l.runs||'—'}</td>
              <td class="num" style="padding:2px 3px">${l.tk||'—'}</td>
              <td class="num" style="padding:2px 3px;color:${(l.mt||0)>2?'var(--red)':'inherit'}">${l.mt||'—'}</td>
              <td class="num" style="padding:2px 3px;color:${(l.err||0)?'var(--brass)':'inherit'}">${l.err||'—'}</td>
              <td class="num" style="padding:2px 3px;color:${(l.inf||0)?'var(--red)':'inherit'}">${l.inf||'—'}</td>
              <td class="num" style="padding:2px 3px;font-weight:700;color:${(l.r||0)>=8?'var(--green)':(l.r||0)<5?'var(--red)':'inherit'}">${l.r ? l.r.toFixed(1) : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    };

    const myInjs = Object.entries(myDet).filter(([,l])=>l&&l.inj).map(([id,l])=>{
      const p=G.players[+id]; if(!p) return null;
      return `${esc(p.name)} — ${esc(l.inj)}${p.injury?` (${p.injury.weeks}wk)`:''}`;
    }).filter(Boolean);

    return `<h1 class="page">Full Match Analysis</h1>

    <div class="card" style="margin-bottom:16px;text-align:center;padding:20px">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Round ${myM.det.round!=null?myM.det.round+1:G.round} · ${esc(myM.det.venue||'Stadium')} · ${esc(myM.det.weather||'')} · ${(myM.det.crowd||0).toLocaleString()} crowd</div>
      <div style="display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap">
        <div style="text-align:center">
          ${teamLogo(myT, 52)}
          <div style="font-weight:700;font-size:16px;margin-top:4px">${esc(myT.nick)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:48px;font-weight:900;font-family:var(--disp);color:${resultClr}">${myScore}–${oppScore}</div>
          <div style="display:flex;gap:12px;justify-content:center;font-size:12px;margin:4px 0">
            <span style="color:var(--muted)">HT <b style="color:var(--ink)">${htMine}–${htOpp}</b></span>
            <span style="color:var(--dim)">|</span>
            <span style="color:var(--muted)">2H <b style="color:var(--ink)">${myScore-htMine}–${oppScore-htOpp}</b></span>
          </div>
          <div style="font-size:20px;font-weight:800;color:${resultClr};margin-top:2px">${resultTxt}</div>
        </div>
        <div style="text-align:center">
          ${teamLogo(oppT, 52)}
          <div style="font-weight:700;font-size:16px;margin-top:4px">${esc(oppT.nick)}</div>
        </div>
      </div>
    </div>

    ${scoringTimeline ? `<h2 class="sec">Scoring Sequence</h2><div class="card" style="margin-bottom:16px;padding:10px 12px">${scoringTimeline}</div>` : ''}

    <h2 class="sec">Match Stats</h2>
    <div class="card" style="margin-bottom:16px;padding:10px 16px">
      <table style="width:100%">
        <thead><tr>
          <th class="noclick" style="text-align:right;color:var(--muted);font-size:11px;font-weight:400;padding:3px 8px">${esc(myT.nick)}</th>
          <th class="noclick" style="text-align:center;width:120px"></th>
          <th class="noclick" style="color:var(--muted);font-size:11px;font-weight:400;padding:3px 8px">${esc(oppT.nick)}</th>
        </tr></thead>
        <tbody>
          ${statCmp('1st Half', htMine, htOpp)}
          ${statCmp('2nd Half', myScore-htMine, oppScore-htOpp)}
          ${myM.det.possH!=null ? statCmp('Possession %', mineIsH?myM.det.possH:myM.det.possA, mineIsH?myM.det.possA:myM.det.possH, `${mineIsH?myM.det.possH:myM.det.possA}%`, `${mineIsH?myM.det.possA:myM.det.possH}%`) : ''}
          ${myM.det.complH!=null ? statCmp('Completion %', mineIsH?myM.det.complH:myM.det.complA, mineIsH?myM.det.complA:myM.det.complH, `${mineIsH?myM.det.complH:myM.det.complA}%`, `${mineIsH?myM.det.complA:myM.det.complH}%`) : ''}
          ${statCmp('Tries', mySt.t, oppSt.t)}
          ${statCmp('Goals', mySt.gl, oppSt.gl, `${mySt.gl}/${mySt.ga}`, `${oppSt.gl}/${oppSt.ga}`)}
          ${mySt.fg||oppSt.fg ? statCmp('Field goals', mySt.fg, oppSt.fg) : ''}
          ${statCmp('Tackles', mySt.tk, oppSt.tk)}
          ${statCmp('Missed tackles', mySt.mt, oppSt.mt, undefined, undefined, true)}
          ${statCmp('Run metres', mySt.m, oppSt.m)}
          ${statCmp('Errors', mySt.err, oppSt.err, undefined, undefined, true)}
          ${statCmp('Infringements', mySt.inf, oppSt.inf, undefined, undefined, true)}
          ${mySt.k4020||oppSt.k4020 ? statCmp('40/20s', mySt.k4020, oppSt.k4020) : ''}
          ${mySt.fdo||oppSt.fdo ? statCmp('Forced drop-outs', mySt.fdo, oppSt.fdo) : ''}
          ${mySt.ks||oppSt.ks ? statCmp('Kicks', mySt.ks, oppSt.ks) : ''}
          ${mySt.km||oppSt.km ? statCmp('Kick metres', mySt.km, oppSt.km) : ''}
        </tbody>
      </table>
    </div>

    <h2 class="sec">${esc(myT.nick)} — Player Stats</h2>
    <div class="card" style="margin-bottom:16px;padding:10px 0">${playerStatTable(myDet, myT.nick)}</div>

    <h2 class="sec">${esc(oppT.nick)} — Player Stats</h2>
    <div class="card" style="margin-bottom:16px;padding:10px 0">${playerStatTable(oppDet, oppT.nick)}</div>

    ${myInjs.length ? `<p style="font-size:13px;color:var(--red);margin:0 0 16px"><b>Injuries this match:</b> ${myInjs.join(' · ')}</p>` : ''}
    ${(myM.det.suspensions||[]).length ? `<p style="font-size:13px;color:var(--red);margin:0 0 16px"><b>Cited:</b> ${myM.det.suspensions.map(s=>{const p=G.players[s.pid];return p?`${esc(p.name)} (${s.weeks}wk)`:''}).filter(Boolean).join(', ')}</p>` : ''}

    <div class="btnrow">
      <button class="btn" onclick="UI.go('matchday')">Match Day</button>
      <button class="btn" onclick="UI.go('dashboard')">Dashboard</button>
    </div>`;
  },
});

'use strict';

Object.assign(UI, {
  /* ---------- pages ---------- */
  p_dashboard(){
    const t = myTeam();
    const lad = ladder();
    const next = G.phase==='regular' && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
    let nextHtml = '<p class="page-sub">No upcoming fixture.</p>';
    if(next){
      const opp = G.teams[next.h===t.id ? next.a : next.h];
      const home = next.h===t.id;
      const oppPos = lad.findIndex(r=>r.id===opp.id)+1;
      nextHtml = `<div class="vs-big" style="padding:8px 0">
        <div class="tm"><div class="jersey jersey-lg" style="background:${t.c1};color:${contrastText(t.c1)}">${esc(t.abbr[0])}</div><div class="nm">${esc(t.nick)}</div></div>
        <div class="dash">v</div>
        <div class="tm"><div class="jersey jersey-lg" style="background:${opp.c1};color:${contrastText(opp.c1)}">${esc(opp.abbr[0])}</div><div class="nm">${esc(opp.nick)}</div><div class="pmeta" style="color:var(--muted)">${ord(oppPos)} · squad ${Math.round(squadStrength(opp))}</div></div>
      </div>
      <p style="text-align:center; color:var(--muted); font-size:12px">${home?'Home':'Away'} · Round ${G.round+1}</p>
      <div class="btnrow" style="justify-content:center"><button class="btn" onclick="UI.go('teamsheet')">Set team</button><button class="btn primary" onclick="UI.advance()">Play round</button></div>`;
    }
    if(G.phase==='finals') nextHtml = `<p>Finals football. Hit <b>${G.finals.week===1?'Play Semis':'Play Grand Final'}</b> up top.</p>`;
    const mini = lad.slice(0,8).map((r,i)=>{
      const tm = G.teams[r.id];
      return `<tr class="${tm.id===t.id?'':''}" style="${tm.id===t.id?'background:rgba(210,165,62,.07)':''}"><td class="lpos">${i+1}</td><td><span class="team-spine" style="background:${tm.c1}"></span>${esc(tm.nick)}</td><td class="num">${r.pts}</td></tr>`;
    }).join('');
    return `<h1 class="page">Dashboard</h1><p class="page-sub">${esc(teamName(t))} · ${G.year} · Board expectation: ${esc(G.coach.expect.label)}</p>
    <div class="grid2">
      <div class="card"><h2 class="sec" style="margin-top:0">Next match</h2>${nextHtml}</div>
      <div class="card"><h2 class="sec" style="margin-top:0">Ladder</h2><table><tbody>${mini}</tbody></table>
        <div class="btnrow"><button class="btn sm" onclick="UI.go('ladder')">Full ladder</button></div></div>
    </div>
    <div class="card" style="margin-top:16px"><h2 class="sec" style="margin-top:0">News</h2>
      ${G.news.slice(0,10).map(n=>`<div class="news-item"><span class="nd">${n.y} · Rd ${n.r}</span><br>${esc(n.txt)}</div>`).join('')||'<p class="page-sub">Quiet week.</p>'}</div>`;
  },

  p_squad(){
    const t = myTeam();
    const rows = t.players.map(id=>G.players[id]).filter(Boolean);
    const k = UI.sortKey, dir = UI.sortDir;
    const val = p => k==='name'?p.name : k==='pos'?p.pos : k==='sal'?p.salary : k==='yrs'?p.years : k==='avg'?(p.s.g?p.s.rSum/p.s.g:0) : k==='t'?p.s.t : k==='cond'?p.cond : k==='mor'?p.morale : k==='age'?p.age : k==='pot'?p.pot : p.ovr;
    rows.sort((a,b)=>{ const x=val(a), y=val(b); return (x<y?-1:x>y?1:0)*dir; });
    const totalSal = teamSalary(t);
    const th = (key,label,num)=>`<th class="${num?'num':''}" onclick="UI.sort('${key}')">${label}${UI.sortKey===key?(dir<0?' ▾':' ▴'):''}</th>`;
    return `<h1 class="page">Squad</h1>
    <p class="page-sub">${rows.length} players · salary ${money(totalSal)} of ${money(G.config.cap)} cap <span style="color:${totalSal>G.config.cap?'var(--red)':'var(--green)'}">(${money(G.config.cap-totalSal)} ${totalSal>G.config.cap?'over':'free'})</span></p>
    <div class="card" style="padding:6px; overflow-x:auto"><table>
      <thead><tr>${th('name','Player')}${th('age','Age',1)}${th('pos','Pos')}${th('ovr','OVR',1)}${th('pot','POT',1)}${th('cond','Cond',1)}${th('mor','Morale',1)}${th('t','Tries',1)}${th('avg','Avg R',1)}${th('sal','Salary',1)}${th('yrs','Yrs',1)}<th class="noclick">Status</th></tr></thead>
      <tbody>${rows.map(p=>UI.playerRow(p)).join('')}</tbody></table></div>`;
  },
  playerRow(p){
    return `<tr class="click" onclick="UI.playerModal(${p.id})">
      <td><b>${esc(p.name)}</b><br><span class="pmeta" style="color:var(--muted); font-size:11px">${esc(p.style)}</span></td>
      <td class="num">${p.age}</td><td><span class="pos-tag">${p.pos}</span> <span class="pos-tag" style="opacity:.55">${p.pos2}</span></td>
      <td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
      <td class="num" style="color:var(--muted)">${p.pot}</td>
      <td class="num" style="color:${p.cond<60?'var(--red)':'var(--muted)'}">${Math.round(p.cond)}</td>
      <td class="num" style="color:${p.morale<40?'var(--red)':p.morale>70?'var(--green)':'var(--muted)'}">${Math.round(p.morale)}</td>
      <td class="num">${p.s.t}</td><td class="num">${p.s.g?(p.s.rSum/p.s.g).toFixed(1):'—'}</td>
      <td class="num">${money(p.salary)}</td><td class="num">${p.years}</td>
      <td>${p.injury?`<span class="inj">${esc(p.injury.n)} · ${p.injury.weeks}w</span>`:''}</td></tr>`;
  },
  sort(k){ if(UI.sortKey===k) UI.sortDir*=-1; else { UI.sortKey=k; UI.sortDir=-1; } UI.render(); },

  playerModal(id){
    const p = G.players[id]; if(!p) return;
    const t = G.teams.find(t=>t.players.includes(id));
    const attrs = ATTRS.map(a=>`<div><div class="attr"><span>${ATTR_LABEL[a]}</span><b>${p.attrs[a]}</b></div><div class="bar"><i style="width:${p.attrs[a]}%"></i></div></div>`).join('');
    UI.modal(`<h3>${esc(p.name)}</h3>
      <p class="page-sub" style="margin-bottom:8px">${POS_NAME[p.pos]} (${p.pos}/${p.pos2}) · ${esc(p.style)} · ${p.age}yo · ${p.hgt}cm ${p.wgt}kg · ${t?esc(teamName(t)):'Free agent'}</p>
      <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom:6px">
        <div class="top-stat"><span class="lbl">Overall</span><span class="val ovr ${ovrCls(p.ovr)}" style="font-size:30px">${p.ovr}</span></div>
        <div class="top-stat"><span class="lbl">Potential</span><span class="val" style="font-size:30px; font-family:var(--disp); color:var(--muted)">${p.pot}</span></div>
        <div class="top-stat"><span class="lbl">Condition</span><span class="val">${Math.round(p.cond)}%</span></div>
        <div class="top-stat"><span class="lbl">Morale</span><span class="val">${Math.round(p.morale)}%</span></div>
        <div class="top-stat"><span class="lbl">Contract</span><span class="val">${money(p.salary)} · ${Math.max(0,p.years)}yr</span></div>
      </div>
      ${p.injury?`<p class="inj" style="margin-bottom:8px">Injured: ${esc(p.injury.n)} — ${p.injury.weeks} week(s)</p>`:''}
      <div class="attr-grid">${attrs}</div>
      <h2 class="sec">This season</h2>
      <p style="font-size:13px">${p.s.g} games · ${p.s.mins||0} mins · ${p.s.t} tries · ${p.s.ta} try assists · ${p.s.lb||0} LB · ${p.s.tk} tackles · ${p.s.mt||0} missed · ${p.s.m}m · ${p.s.ks||0} kicks · ${p.s.inf||0} inf · avg ${p.s.g?(p.s.rSum/p.s.g).toFixed(1):'—'} · ${p.s.votes} votes</p>
      <h2 class="sec">Career</h2>
      <p style="font-size:13px">${p.career.seasons} seasons · ${p.career.games} games · ${p.career.tries} tries · ${p.career.points} points · ${p.career.premierships} premierships</p>
      <div class="btnrow" style="margin-top:14px"><button class="btn" onclick="UI.closeModal()">Close</button></div>`);
  },

  p_teamsheet(){
    const t = myTeam();
    const rows = SLOTS.map((s,i)=>{
      const pid = t.lineup[i];
      const p = pid!=null ? G.players[pid] : null;
      const fam = p ? familiarity(p, s.pos) : 1;
      const posLbl = s.pos==='BE'?'INT':s.pos;
      if(!p) return `<div class="sheet-row empty" onclick="UI.pickSlot(${i})"><span class="jersey" style="background:${t.c1}; color:${contrastText(t.c1)}">${s.n}</span><span class="pname">Select ${s.pos==='BE'?'interchange':POS_NAME[s.pos].toLowerCase()}…</span><span class="pmeta">${posLbl}</span></div>`;
      return `<div class="sheet-row ${fam<0.9?'oop':''}" onclick="UI.pickSlot(${i})">
        <span class="jersey" style="background:${t.c1}; color:${contrastText(t.c1)}">${s.n}</span>
        <span class="pname">${esc(p.name)}</span>
        <span class="pmeta">${posLbl} · <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span>${fam<1?` · ${Math.round(fam*100)}% fit`:''}${p.cond<60?` · <span style="color:var(--red)">tired</span>`:''}</span></div>`;
    });
    return `<h1 class="page">Team Sheet</h1><p class="page-sub">Round ${G.round+1} selection. Tap a jersey to change the pick. Out-of-position players take a performance hit.</p>
    <div class="btnrow"><button class="btn primary" onclick="autoPick(myTeam()); UI.render(); UI.toast('Best 17 selected.')">Auto-pick best 17</button>
      <span style="align-self:center; color:var(--muted); font-size:12px">Game plan:</span>
      ${['attacking','balanced','grinding'].map(pl=>`<button class="btn sm ${t.plan===pl?'primary':''}" onclick="myTeam().plan='${pl}'; UI.render()">${pl[0].toUpperCase()+pl.slice(1)}</button>`).join('')}</div>
    <div class="grid2">
      <div class="card">${rows.slice(0,13).join('')}</div>
      <div class="card"><div class="navsep" style="margin:0 0 8px">Interchange</div>${rows.slice(13).join('')}
        <p style="color:var(--muted); font-size:12px; margin-top:12px">Bench impact counts at reduced weight — load it with fresh middles and a utility.</p></div>
    </div>`;
  },
  pickSlot(slotIdx){
    const t = myTeam();
    const s = SLOTS[slotIdx];
    const cands = t.players.map(id=>G.players[id]).filter(p=>p && !p.injury)
      .sort((a,b)=> b.ovr*familiarity(b,s.pos) - a.ovr*familiarity(a,s.pos));
    UI.modal(`<h3>Jersey #${s.n} — ${s.pos==='BE'?'Interchange':POS_NAME[s.pos]}</h3>
      <p class="page-sub">Picking a player already in the 17 swaps the two jerseys.</p>
      <div style="max-height:420px; overflow-y:auto">
      ${cands.map(p=>{
        const inIdx = t.lineup.indexOf(p.id);
        const fam = familiarity(p, s.pos);
        return `<div class="sheet-row" onclick="UI.assignSlot(${slotIdx},${p.id})">
          <span class="pos-tag">${p.pos}</span><span class="pname">${esc(p.name)}</span>
          <span class="pmeta"><span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span> · ${Math.round(fam*100)}% fit · cond ${Math.round(p.cond)}${inIdx>=0?` · #${SLOTS[inIdx].n}`:''}</span></div>`;
      }).join('')}</div>
      <div class="btnrow"><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`);
  },
  assignSlot(slotIdx, pid){
    const t = myTeam();
    const existing = t.lineup.indexOf(pid);
    if(existing>=0) t.lineup[existing] = t.lineup[slotIdx];
    t.lineup[slotIdx] = pid;
    UI.closeModal(); UI.render();
  },

  p_training(){
    const t = myTeam();
    const opts = [
      ['balanced','Balanced','Even development across the squad.'],
      ['attack','Attacking shape','Boosts growth in attack, passing and vision.'],
      ['defence','Defensive systems','Boosts growth in defence, tackling and work rate.'],
      ['fitness','Conditioning block','Boosts speed, strength and stamina growth.'],
      ['youth','Youth development','Doubles down on players 21 and under.'],
      ['recovery','Recovery focus','Squad recovers more condition each week — fewer soft-tissue injuries.']
    ];
    return `<h1 class="page">Training</h1><p class="page-sub">Weekly focus shapes who develops and how fresh your squad stays.</p>
    <div class="grid3">${opts.map(([k,l,d])=>`<div class="card" style="cursor:pointer; ${t.focus===k?'border-color:var(--brass)':''}" onclick="myTeam().focus='${k}'; UI.render()">
      <div style="font-family:var(--disp); font-size:18px; font-weight:700; text-transform:uppercase; color:${t.focus===k?'var(--brass)':'var(--ink)'}">${l}</div>
      <p style="color:var(--muted); font-size:12.5px; margin-top:4px">${d}</p></div>`).join('')}</div>
    <h2 class="sec">Developing players</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Potential</th><th class="noclick num">Headroom</th></tr></thead><tbody>
    ${t.players.map(id=>G.players[id]).filter(p=>p&&p.pot>p.ovr).sort((a,b)=>(b.pot-b.ovr)-(a.pot-a.ovr)).slice(0,10).map(p=>
      `<tr class="click" onclick="UI.playerModal(${p.id})"><td>${esc(p.name)} <span class="pos-tag">${p.pos}</span></td><td class="num">${p.age}</td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="num">${p.pot}</td><td class="num" style="color:var(--green)">+${p.pot-p.ovr}</td></tr>`).join('')}
    </tbody></table></div>`;
  },

  p_fixtures(){
    const blocks = G.fixtures.map((round, r)=>{
      const games = round.map(m=>{
        const th=G.teams[m.h], ta=G.teams[m.a];
        const mine = m.h===G.coach.teamId || m.a===G.coach.teamId;
        return `<div class="score-line" style="${mine?'background:rgba(210,165,62,.06); border-radius:6px':''}">
          <span class="team-spine" style="background:${th.c1}"></span><span class="t ${m.played&&m.hs>m.as?'winner':''}">${esc(th.nick)}</span>
          <span class="s">${m.played?m.hs:''}</span><span style="color:var(--dim)">${m.played?'–':'v'}</span><span class="s">${m.played?m.as:''}</span>
          <span class="t ${m.played&&m.as>m.hs?'winner':''}" style="text-align:right">${esc(ta.nick)}</span><span class="team-spine" style="background:${ta.c1}"></span></div>`;
      }).join('');
      return `<div class="card" style="margin-bottom:12px"><div class="navsep" style="margin:0 0 6px">Round ${r+1} ${r===G.round&&G.phase==='regular'?'· next':''}</div>${games}</div>`;
    });
    let finalsHtml='';
    if(G.finals){
      const fg = m=>{ const th=G.teams[m.h], ta=G.teams[m.a];
        return `<div class="score-line"><span class="team-spine" style="background:${th.c1}"></span><span class="t ${m.played&&m.hs>m.as?'winner':''}">${esc(th.nick)}</span><span class="s">${m.played?m.hs:''}</span><span style="color:var(--dim)">${m.played?'–':'v'}</span><span class="s">${m.played?m.as:''}</span><span class="t ${m.played&&m.as>m.hs?'winner':''}" style="text-align:right">${esc(ta.nick)}</span><span class="team-spine" style="background:${ta.c1}"></span></div>`; };
      finalsHtml = `<div class="card" style="margin-bottom:12px; border-color:var(--brass)"><div class="navsep" style="margin:0 0 6px; color:var(--brass)">Finals</div>${G.finals.sf.map(fg).join('')}${G.finals.gf?fg(G.finals.gf):''}</div>`;
    }
    return `<h1 class="page">Fixtures & Results</h1><p class="page-sub">Your matches are highlighted.</p>${finalsHtml}${blocks.join('')}`;
  },

  p_ladder(){
    const lad = ladder();
    return `<h1 class="page">Ladder</h1><p class="page-sub">${esc(G.config.leagueName)} · ${G.year} · top 4 reach the finals</p>
    <div class="card" style="padding:6px; overflow-x:auto"><table>
    <thead><tr><th class="noclick"></th><th class="noclick">Club</th><th class="noclick num">P</th><th class="noclick num">W</th><th class="noclick num">D</th><th class="noclick num">L</th><th class="noclick num">PF</th><th class="noclick num">PA</th><th class="noclick num">Diff</th><th class="noclick num">Pts</th><th class="noclick">Form</th></tr></thead>
    <tbody>${lad.map((r,i)=>{
      const t = G.teams[r.id];
      const diff = r.pf-r.pa;
      return `<tr class="${i===3?'finals-line':''}" style="${t.id===G.coach.teamId?'background:rgba(210,165,62,.07)':''}">
        <td class="lpos">${i+1}</td><td><span class="team-spine" style="background:${t.c1}"></span><b>${esc(teamName(t))}</b></td>
        <td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td>
        <td class="num">${r.pf}</td><td class="num">${r.pa}</td><td class="num" style="color:${diff>=0?'var(--green)':'var(--red)'}">${diff>0?'+':''}${diff}</td>
        <td class="num"><b>${r.pts}</b></td>
        <td>${r.form.slice(-5).map(f=>`<span class="form-dot ${f}"></span>`).join('')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  },

  p_stats(){
    const cats = [['t','Tries'],['ta','Try assists'],['gl','Goals'],['pts','Points'],['tk','Tackles'],['m','Run metres'],['votes','Medal votes'],['avg','Avg rating']];
    const all = Object.values(G.players).filter(p=>p.s.g>0);
    const v = p => UI.statCat==='pts' ? p.s.t*4+p.s.gl*2 : UI.statCat==='avg' ? p.s.rSum/p.s.g : p.s[UI.statCat];
    const rows = all.sort((a,b)=>v(b)-v(a)).slice(0,15);
    return `<h1 class="page">Stat Leaders</h1><p class="page-sub">${G.year} season · all clubs</p>
    <div class="btnrow">${cats.map(([k,l])=>`<button class="btn sm ${UI.statCat===k?'primary':''}" onclick="UI.statCat='${k}'; UI.render()">${l}</button>`).join('')}</div>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick"></th><th class="noclick">Player</th><th class="noclick">Club</th><th class="noclick num">G</th><th class="noclick num">${cats.find(c=>c[0]===UI.statCat)[1]}</th></tr></thead><tbody>
    ${rows.map((p,i)=>{
      const t = G.teams.find(t=>t.players.includes(p.id));
      return `<tr class="click" onclick="UI.playerModal(${p.id})"><td class="lpos">${i+1}</td><td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
      <td>${t?`<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}`:'—'}</td><td class="num">${p.s.g}</td><td class="num"><b>${UI.statCat==='avg'?v(p).toFixed(1):Math.round(v(p))}</b></td></tr>`;
    }).join('')}</tbody></table></div>`;
  },

  p_teams(){
    const lad = ladder();
    return `<h1 class="page">Clubs</h1><p class="page-sub">Every club in the ${esc(G.config.leagueName)}. Tap to inspect a squad.</p>
    <div class="team-pick">${lad.map((r,i)=>{
      const t = G.teams[r.id];
      return `<div class="tp" onclick="UI.teamModal(${t.id})">
        <div class="jersey" style="background:${t.c1}; color:${contrastText(t.c1)}; float:right">${esc(t.abbr[0])}</div>
        <div class="city">${esc(t.city)}</div><div class="nick">${esc(t.nick)}</div>
        <div class="str">${ord(i+1)} · ${r.w}-${r.l} · squad ${Math.round(squadStrength(t))}</div></div>`;
    }).join('')}</div>`;
  },
  teamModal(id){
    const t = G.teams[id];
    const rows = t.players.map(i=>G.players[i]).filter(Boolean).sort((a,b)=>b.ovr-a.ovr);
    UI.modal(`<h3><span class="team-spine" style="background:${t.c1}; height:22px"></span>${esc(teamName(t))}</h3>
    <p class="page-sub">Squad ${rows.length} · payroll ${money(teamSalary(t))} · strength ${Math.round(squadStrength(t))}</p>
    <div style="max-height:440px; overflow-y:auto"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick">Pos</th><th class="noclick num">OVR</th><th class="noclick num">Salary</th><th class="noclick num">Yrs</th></tr></thead><tbody>
    ${rows.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})"><td>${esc(p.name)}</td><td class="num">${p.age}</td><td><span class="pos-tag">${p.pos}</span></td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="num">${money(p.salary)}</td><td class="num">${Math.max(0,p.years)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="btnrow" style="margin-top:12px"><button class="btn" onclick="UI.closeModal()">Close</button></div>`);
  },

  p_coach(){
    const c = G.coach;
    const badge = BADGES.slice().reverse().find(b=>c.rep>=b[0])[1];
    return `<h1 class="page">Coach Profile</h1><p class="page-sub">${esc(c.name)} · ${esc(teamName(myTeam()))}</p>
    <div class="grid3">
      <div class="card"><div class="navsep" style="margin:0">Reputation</div><div style="font-family:var(--disp); font-size:42px; font-weight:700; color:var(--brass)">${Math.round(c.rep)}</div><div class="bar"><i style="width:${c.rep}%"></i></div><p style="color:var(--muted); font-size:12px; margin-top:8px">${esc(badge)}</p></div>
      <div class="card"><div class="navsep" style="margin:0">Career record</div><div style="font-family:var(--disp); font-size:42px; font-weight:700">${c.careerW||0}–${c.careerL||0}</div><p style="color:var(--muted); font-size:12px; margin-top:8px">${c.prems||0} premiership${(c.prems||0)===1?'':'s'} · season ${G.season}</p></div>
      <div class="card"><div class="navsep" style="margin:0">Board confidence</div><div style="font-family:var(--disp); font-size:42px; font-weight:700; color:${c.conf<30?'var(--red)':c.conf>70?'var(--green)':'var(--ink)'}">${Math.round(c.conf)}%</div><p style="color:var(--muted); font-size:12px; margin-top:8px">Expectation: ${esc(c.expect.label)}</p></div>
    </div>
    <h2 class="sec">Coaching history</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Year</th><th class="noclick">Club</th><th class="noclick num">Finish</th><th class="noclick"></th></tr></thead><tbody>
    ${c.history.map(h=>`<tr><td>${h.year}</td><td>${esc(h.team)}</td><td class="num">${ord(h.pos)}</td><td>${h.premier?'🏆 Premiers':''}</td></tr>`).join('')||'<tr><td colspan="4" style="color:var(--muted)">First season underway.</td></tr>'}
    </tbody></table></div>`;
  },

  p_history(){
    return `<h1 class="page">History</h1><p class="page-sub">Honour roll of the ${esc(G.config.leagueName)}.</p>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Year</th><th class="noclick">Premiers</th><th class="noclick">Minor premiers</th><th class="noclick">Player of the Year</th><th class="noclick num">You</th></tr></thead><tbody>
    ${G.history.map(h=>{
      const pt = G.teams[h.premier], mt = G.teams[h.minor];
      return `<tr><td>${h.year}</td><td><span class="team-spine" style="background:${pt.c1}"></span><b>${esc(teamName(pt))}</b></td><td>${esc(mt.nick)}</td><td>${h.poty?esc(h.poty.name)+' ('+esc(h.poty.team)+')':'—'}</td><td class="num">${ord(h.myPos)}</td></tr>`;
    }).join('')||'<tr><td colspan="5" style="color:var(--muted)">No completed seasons yet.</td></tr>'}
    </tbody></table></div>`;
  },

  p_options(){
    return `<h1 class="page">Options</h1><p class="page-sub">Saves live in memory while this page is open — export a file to keep your career.</p>
    <div class="grid2">
      <div class="card"><h2 class="sec" style="margin-top:0">Save & load</h2>
        <div class="btnrow"><button class="btn primary" onclick="exportSave()">Export save file</button>
        <label class="btn" style="display:inline-block">Import save<input type="file" accept=".json" style="display:none" onchange="if(this.files[0]) importSave(this.files[0])"></label></div>
        <p style="color:var(--muted); font-size:12px">Exports a .json you can re-import any time.</p></div>
      <div class="card"><h2 class="sec" style="margin-top:0">New career</h2>
        <p style="color:var(--muted); font-size:12px; margin-bottom:10px">Abandons the current save unless you export it first.</p>
        <button class="btn danger" onclick="if(confirm('Start a new career? Unsaved progress is lost.')){G=null; UI.wizWorld=null; UI.render();}">Start new career</button></div>
    </div>`;
  },

  p_contracts(){
    const t = myTeam();
    const expiring = t.players.map(id=>G.players[id]).filter(p=>p && p.years<=1).sort((a,b)=>b.ovr-a.ovr);
    const totalSal = teamSalary(t);
    return `<h1 class="page">Contracts</h1>
    <p class="page-sub">Payroll ${money(totalSal)} of ${money(G.config.cap)} cap. Players in their final year can be re-signed in the off-season.</p>
    <h2 class="sec">Off contract at season's end</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Current</th><th class="noclick num">Likely demand</th></tr></thead><tbody>
    ${expiring.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})"><td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td><td class="num">${p.age}</td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="num">${money(p.salary)}</td><td class="num">${money(demandFor(p, myTeam()))}</td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--muted)">Nobody coming off contract.</td></tr>'}
    </tbody></table></div>`;
  },
});

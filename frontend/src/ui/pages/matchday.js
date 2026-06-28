import { UI } from "../01-core.js";


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
              <div style="font-size:56px;font-weight:900;font-family:var(--disp);color:var(--accent);letter-spacing:.08em">BYE</div>
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
    const focus = prefs.attackFocus || 'balanced';
    const intent = prefs.gameIntent || 'normal';
    const offloadRisk = prefs.offloadRisk || 'normal';
    const defStyle = prefs.defStyle || 'structured';
    const focusOpts = [['balanced','Balanced'],['middle','Middle'],['left','Left edge'],['right','Right edge'],['territory','Territory']];
    const intentOpts = [['chase','Chase'],['normal','Normal'],['protect','Protect']];
    const offloadOpts = [['low','Low offloads'],['normal','Normal'],['high','High offloads']];
    const defStyleOpts = [['structured','Structured'],['aggressive','Aggressive']];
    const intelKey = `${G.year}-R${(G.round || 0) + 1}`;
    const intel = G.matchIntel && G.matchIntel[intelKey];
    const focusCard = `<div class="card" style="margin-bottom:10px;padding:12px 14px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div style="flex:1;min-width:220px">
          <div style="font-weight:700;font-size:13px;color:var(--accent)">Attacking focus</div>
          <p style="font-size:12px;color:var(--muted);margin:3px 0 0">${intel ? esc(intel.recommendation || 'Staff report available.') : 'Choose where the attack is pointed before kick-off.'}</p>
        </div>
        <div class="btnrow" style="margin:0;gap:6px;flex-shrink:0;max-width:520px">
          ${focusOpts.map(([k,l])=>`<button class="btn sm${focus===k?' primary':''}" onclick="myTeam().matchPrefs.attackFocus='${k}';UI.render()">${esc(l)}</button>`).join('')}
          ${intel ? `<button class="btn sm" onclick="UI.go('tactics')">Staff report</button>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--line)">
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px">Game intent</div>
          <div class="btnrow" style="margin:0;gap:4px">${intentOpts.map(([k,l])=>`<button class="btn sm${intent===k?' primary':''}" onclick="myTeam().matchPrefs.gameIntent='${k}';UI.render()" style="font-size:11px">${esc(l)}</button>`).join('')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px">Offloads</div>
          <div class="btnrow" style="margin:0;gap:4px">${offloadOpts.map(([k,l])=>`<button class="btn sm${offloadRisk===k?' primary':''}" onclick="myTeam().matchPrefs.offloadRisk='${k}';UI.render()" style="font-size:11px">${esc(l)}</button>`).join('')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px">Defence</div>
          <div class="btnrow" style="margin:0;gap:4px">${defStyleOpts.map(([k,l])=>`<button class="btn sm${defStyle===k?' primary':''}" onclick="myTeam().matchPrefs.defStyle='${k}';UI.render()" style="font-size:11px">${esc(l)}</button>`).join('')}</div>
        </div>
      </div>
    </div>`;
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
      const rankColor = ticketPrice > li.avg ? 'var(--accent)' : ticketPrice < li.avg ? 'var(--green)' : 'var(--muted)';
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
    const weatherTacticsCard = badWeather ? `<div class="card" style="border-color:var(--accent);margin-bottom:10px;padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:var(--accent)">Conditions: ${esc(m.projWeather)}</div>
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
      <span style="font-weight:700;color:${o.favoured==='h'?'var(--accent)':'var(--muted)'}">${esc(h.nick)} ${UI._oddsStr(o.oddsH)}</span>
      <span style="color:var(--dim)">·</span>
      <span style="font-weight:700;color:${o.favoured==='a'?'var(--accent)':'var(--muted)'}">${esc(a.nick)} ${UI._oddsStr(o.oddsA)}</span>
      <span style="color:var(--dim);font-size:11px">(${esc(favTeam.nick)} favoured · ${Math.round((o.favoured==='h'?o.pH:o.pA)*100)}% implied)</span>
      <button class="btn sm" onclick="UI.go('predictions')" style="margin-left:auto">Full predictions →</button>
    </div>`;
    const myCoach = G.coach.name;
    const oppTeam = t.id===h.id ? a : h;
    const oppCoach = oppTeam.headCoach ? oppTeam.headCoach.name : 'Unknown coach';
    const coachLine = `<p style="font-size:12px;color:var(--muted);margin:2px 0 8px"><b>${esc(myCoach)}</b> vs <b>${esc(oppCoach)}</b>${oppTeam.headCoach?` (rep ${oppTeam.headCoach.rep})`:''}  · ${esc(venue)}</p>`;
    const slotBadge = m.slot ? `<span style="font-size:11px;color:var(--accent);font-weight:700;background:var(--accent-a12);padding:2px 9px;border-radius:10px;letter-spacing:.04em;white-space:nowrap">${esc(m.slot.label)}</span>` : '';
    // Head-to-head record this season
    const lad = ladder();
    const myLadRow = lad.find(r=>r.id===t.id)||{w:0,l:0,d:0,form:[]};
    const oppLadRow = lad.find(r=>r.id===oppTeam.id)||{w:0,l:0,d:0,form:[]};
    const myPos = lad.findIndex(r=>r.id===t.id)+1;
    const oppPos = lad.findIndex(r=>r.id===oppTeam.id)+1;
    const formDots = row => (row.form||[]).slice(-5).map(f=>`<span class="form-dot ${f}"></span>`).join('');
    const h2hMatches = G.fixtures.slice(0, G.round).flat().filter(fx=>
      fx.played && ((fx.h===t.id&&fx.a===oppTeam.id)||(fx.h===oppTeam.id&&fx.a===t.id))
    );
    const h2hHtml = h2hMatches.length ? (() => {
      let myW=0, myL=0, myD=0;
      h2hMatches.forEach(fx=>{
        const iH = fx.h===t.id;
        const ms = iH?fx.hs:fx.as, os = iH?fx.as:fx.hs;
        if(ms>os) myW++; else if(ms<os) myL++; else myD++;
      });
      const lastFx = h2hMatches[h2hMatches.length-1];
      const lastIH = lastFx.h===t.id;
      const lS = `${lastIH?lastFx.hs:lastFx.as}–${lastIH?lastFx.as:lastFx.hs}`;
      return `<span style="font-size:11px;color:var(--muted)">H2H this season: <b>${myW}W ${myL}L${myD?' '+myD+'D':''}</b> · Last: ${lS}</span>`;
    })() : '';
    // Opponent's last 4 completed matches
    const oppRecentFx = G.fixtures.slice(0, G.round).flat()
      .filter(fx => fx.played && (fx.h === oppTeam.id || fx.a === oppTeam.id))
      .slice(-4);
    const oppFormLine = oppRecentFx.length ? oppRecentFx.map(fx => {
      const isH = fx.h === oppTeam.id;
      const pf = isH ? fx.hs : fx.as, pa = isH ? fx.as : fx.hs;
      const won = pf > pa, drew = pf === pa;
      const other = G.teams[isH ? fx.a : fx.h];
      const col = won ? 'var(--green)' : drew ? 'var(--muted)' : 'var(--red)';
      const lbl = won ? 'W' : drew ? 'D' : 'L';
      const rdNum = fx.det ? fx.det.round + 1 : '';
      return `<span style="font-size:11px"><span style="color:${col};font-weight:700">${lbl}</span> <span style="color:var(--muted)">${pf}–${pa}${other?' v '+esc(other.nick):''}${rdNum?' (Rd '+rdNum+')':''}</span></span>`;
    }).join(' &nbsp;') : '';
    const standingStrip = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 8px;font-size:12px">
      <span>${teamLogo(t,20)} <b>${esc(t.nick)}</b> <span style="color:var(--muted)">${ord(myPos)} · ${myLadRow.w}–${myLadRow.l}</span> ${formDots(myLadRow)}</span>
      <span style="color:var(--dim)">vs</span>
      <span>${teamLogo(oppTeam,20)} <b>${esc(oppTeam.nick)}</b> <span style="color:var(--muted)">${ord(oppPos)} · ${oppLadRow.w}–${oppLadRow.l}</span> ${formDots(oppLadRow)}</span>
      ${h2hHtml}
    </div>${oppFormLine ? `<div style="font-size:11px;color:var(--muted);margin:-4px 0 8px"><b>${esc(oppTeam.nick)} last ${oppRecentFx.length}:</b> ${oppFormLine}</div>` : ''}`;
    // Team talk section
    const TEAM_TALKS = [
      { key:'fire',     label:'Fire them up',       desc:'We\'re going out there to make a statement. High intensity from the first whistle.',        moraleD:8,  cohD:0,  tone:'red'   },
      { key:'composed', label:'Stay composed',      desc:'Play your game. Trust the structure. The points will come if we execute.',                   moraleD:4,  cohD:5,  tone:'blue'  },
      { key:'belief',   label:'Back yourselves',    desc:'This group has worked hard for this. Go out and show them what you\'re made of.',            moraleD:6,  cohD:2,  tone:'green' },
      { key:'pressure', label:'Put them under',     desc:'We\'ve prepared for this opponent. Attack early, force errors, and don\'t let up.',          moraleD:5,  cohD:-2, tone:'orange'},
      { key:'enjoy',    label:'Enjoy the moment',   desc:'This is what you play for. Play free, play together, and enjoy every minute of it.',         moraleD:3,  cohD:4,  tone:'yellow'},
    ];
    const toneAccent = { red:'var(--red)', blue:'var(--accent)', green:'var(--green)', orange:'#f59e0b', yellow:'#eab308' };
    const teamTalkSection = !m.played ? (m.teamTalk
      ? `<div class="card" style="margin-bottom:10px;border-color:${toneAccent[m.teamTalk.tone]||'var(--accent)'};padding:10px 14px">
          <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Team talk delivered</div>
          <div style="font-size:14px;font-weight:700;color:${toneAccent[m.teamTalk.tone]||'var(--accent)'}">${esc(m.teamTalk.label)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(m.teamTalk.desc)}</div>
          <div style="font-size:11px;margin-top:6px;color:var(--green)">+${m.teamTalk.moraleD} morale to starting 13${m.teamTalk.cohD>0?` · +${m.teamTalk.cohD} cohesion`:m.teamTalk.cohD<0?` · ${m.teamTalk.cohD} cohesion`:''}</div>
        </div>`
      : `<div class="card" style="margin-bottom:10px;border-color:var(--accent-line);padding:12px 14px">
          <h2 class="sec" style="margin-top:0;margin-bottom:6px">Pre-match team talk</h2>
          <p class="page-sub" style="margin:0 0 10px">Choose your message before kick-off. Your tone affects player morale and cohesion — and that directly changes how the match plays out.</p>
          ${(()=>{
            const mm = (G.coach.attrs && G.coach.attrs.manMgmt) || 40;
            const mmMult = 0.84 + (mm / 99) * 0.66;
            const mmLabel = mm >= 70 ? `Man Mgmt ${mm} — high impact` : mm >= 50 ? `Man Mgmt ${mm} — average impact` : `Man Mgmt ${mm} — low impact`;
            const mmColor = mm >= 70 ? 'var(--green)' : mm >= 50 ? 'var(--accent)' : 'var(--muted)';
            return `<p style="font-size:11px;color:${mmColor};margin:0 0 10px">Your coaching attribute scales effectiveness · <b>${mmLabel}</b></p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
              ${TEAM_TALKS.map(tt => {
                const effMor = Math.round(tt.moraleD * mmMult);
                const effCoh = tt.cohD ? Math.round(tt.cohD * mmMult) : 0;
                return `<button onclick="UI.doTeamTalk(${JSON.stringify(tt).replace(/"/g,'&quot;')})" style="background:var(--hover);border:1px solid ${toneAccent[tt.tone]||'var(--line)'};border-radius:8px;padding:10px 12px;text-align:left;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background='var(--hover)'">
                  <div style="font-weight:700;font-size:13px;color:${toneAccent[tt.tone]||'var(--ink)'};margin-bottom:4px">${esc(tt.label)}</div>
                  <div style="font-size:11px;color:var(--muted);line-height:1.4;margin-bottom:6px">${esc(tt.desc)}</div>
                  <div style="font-size:10px;font-weight:700;color:var(--green)">+${effMor} morale${effCoh!==0?` · ${effCoh>0?'+':''}${effCoh} cohesion`:''}</div>
                </button>`;
              }).join('')}
            </div>`;
          })()}
        </div>`) : '';
    return `<h1 class="page">Match Day</h1>
    <p class="page-sub">Round ${G.round+1} match desk. Review the setup, deliver the talk, then choose a quick sim or live watch.</p>
    <div class="matchday-hero">
      <div class="matchday-team">
        ${teamLogo(h,54)}
        <div><span>${esc(h.city)}</span><b>${esc(h.nick)}</b></div>
      </div>
      <div class="matchday-centre">
        ${slotBadge}
        <div class="matchday-v">v</div>
        <p>${esc(venue)}</p>
      </div>
      <div class="matchday-team right">
        <div><span>${esc(a.city)}</span><b>${esc(a.nick)}</b></div>
        ${teamLogo(a,54)}
      </div>
    </div>
    ${isMagicRound ? `<div class="matchday-notice">
      <b>Magic Round ${G.year}</b>
      <span>All fixtures at ${esc(G.magicRound.venue)} · Neutral ground — no home advantage${mrHost&&mrHost.id===G.coach.teamId?' · Your club earns a $1.5M hosting fee':''}</span>
    </div>` : ''}
    <div class="matchday-meta">
      ${coachLine}
      ${standingStrip}
      ${oddsBar}
    </div>
    <div class="matchday-actions">
      <div>
        <button class="btn ${UI._matchMode==='result'?'primary':''}" onclick="UI._matchMode='result';UI.render()">Sim result</button>
        <button class="btn ${UI._matchMode==='watch'?'primary':''}" onclick="UI._matchMode='watch';UI.render()">Watch game</button>
        <button class="btn" onclick="UI.go('teamsheet')">Team sheet</button>
        <button class="btn" onclick="UI.go('tactics')">Tactics</button>
      </div>
      <button class="btn primary" onclick="UI.playMatchDay(UI._matchMode==='watch')">${UI._matchMode==='watch'?'Kick off':'Sim to result'}</button>
    </div>
    <div class="matchday-layout">
      <div class="matchday-coaching">
        ${teamTalkSection}
        ${focusCard}
        ${weatherTacticsCard}
        ${ticketControls}
        ${watchControls}
      </div>
      <div class="matchday-lineups">
        <div class="card"><div class="ts-card-head"><span class="navsep">${esc(h.nick)} Lineup</span><p>${h.id===t.id?'Your 17':'Opposition 17'}</p></div><div class="matchday-lineup-table"><table><tbody>${Array.from({length:17},(_,i)=>row(h,i)).join('')}</tbody></table></div></div>
        <div class="card"><div class="ts-card-head"><span class="navsep">${esc(a.nick)} Lineup</span><p>${a.id===t.id?'Your 17':'Opposition 17'}</p></div><div class="matchday-lineup-table"><table><tbody>${Array.from({length:17},(_,i)=>row(a,i)).join('')}</tbody></table></div></div>
      </div>
    </div>`;
  },

  doTeamTalk(tt){
    const t = myTeam();
    const m = G.phase === 'regular' && G.fixtures[G.round]
      ? G.fixtures[G.round].find(m => m.h === t.id || m.a === t.id)
      : null;
    if(!m || m.played || m.teamTalk) return;
    // Man Management scales effectiveness: 40 = 1.0×, 70 = 1.25×, 99 = 1.5×
    const mm = (G.coach.attrs && G.coach.attrs.manMgmt) || 40;
    const mmMult = 0.84 + (mm / 99) * 0.66;
    const effectiveMorD = Math.round((tt.moraleD || 0) * mmMult);
    const effectiveCohD = tt.cohD ? Math.round(tt.cohD * mmMult) : 0;
    m.teamTalk = { ...tt, moraleD: effectiveMorD, cohD: effectiveCohD };
    // Apply morale boost to the starting 13
    t.lineup.slice(0, 13).forEach(id => {
      const p = G.players[id];
      if(p) p.morale = clamp((p.morale || 50) + effectiveMorD, 5, 99);
    });
    // Cohesion boost (positive or negative)
    if(effectiveCohD) t.cohesion = clamp((t.cohesion || 50) + effectiveCohD, 0, 100);
    UI.toast(`Team talk: "${tt.label}" — squad is ready.`);
    UI.render();
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
    if(watch && G.phase === 'regular' && typeof advanceCalendarDayForWatch === 'function'){
      const t = myTeam();
      const myM = G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;
      if(!myM){ UI.render(); return; }
      // Sim all AI matches first, then build the full continuous event stream for the coached match
      const prepRes = advanceCalendarDayForWatch();
      const events = buildMatchEventStream(myM, false);
      autoSave();
      UI._watchGameRound = (prepRes.earlyMatches||[]).concat([myM]);
      UI._watchGameTitle = myM.slot ? myM.slot.label + ' result' : 'Match result';
      UI._watchEvents = events;
      UI._watchMyM = myM;
      UI._watchEarlyMatches = prepRes.earlyMatches || [];
      UI._watchPaused = false;
      UI._subQueue = [];
      UI._watchTab = 'feed';
      UI._wgPossTeam = 'h';
      UI._wgTackle = 1;
      UI._watchCurrentMin = 0;
      UI._wgDragFromSlot = null;
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

    if(!UI._subQueue) UI._subQueue = [];
    if(UI._watchPaused == null) UI._watchPaused = false;
    if(!UI._watchTab) UI._watchTab = 'feed';
    if(UI._wgPossTeam == null) UI._wgPossTeam = 'h';
    if(UI._wgTackle == null) UI._wgTackle = 1;
    if(UI._watchCurrentMin == null) UI._watchCurrentMin = 0;

    const h = G.teams[myM.h], a = G.teams[myM.a];
    const speedVal = UI._watchSpeed || 1;
    const activeTab = UI._watchTab || 'feed';

    setTimeout(() => UI._startLiveWatch(UI._watchEvents||[], myM), 120);

    return `<div style="margin-bottom:12px">
      <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px">
          <span style="font-size:11px;color:var(--muted);white-space:nowrap">Speed:</span>
          <input type="range" id="wg-speed" min="0.25" max="16" step="0.25" value="${speedVal}"
                 style="flex:1;cursor:pointer"
                 oninput="UI._watchSpeed=+this.value;document.getElementById('wg-speed-label').textContent=(+this.value%1===0?this.value:parseFloat(this.value).toFixed(2).replace(/\\.?0+$/,''))+'x'">
          <span id="wg-speed-label" style="font-size:11px;color:var(--ink);min-width:36px">${speedVal}x</span>
        </div>
        <button id="wg-pause-btn" class="btn sm" onclick="UI._toggleWatchPause()" style="min-width:86px">${UI._watchPaused?'▶ Resume':'⏸ Pause'}</button>
        <button class="btn sm" id="wg-allResultsBtn" style="display:none" onclick="UI.showRoundResults(UI._watchGameRound,UI._watchGameTitle||'Match result')">All results</button>
      </div>

      <div id="wg-header" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-align:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
          <div style="text-align:center">${teamLogo(h,40)}<div style="font-weight:700;margin-top:4px;font-size:13px">${esc(h.nick)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="font-family:var(--disp);font-size:44px;font-weight:900;min-width:110px;text-align:center;letter-spacing:.04em">
              <span id="wg-scoreH" style="color:var(--dim)">0</span>
              <span style="color:var(--muted);font-size:28px;margin:0 4px">:</span>
              <span id="wg-scoreA" style="color:var(--dim)">0</span>
            </div>
            <div style="font-family:var(--disp);font-size:18px;font-weight:700;color:var(--accent);min-width:60px;text-align:center" id="wg-clock">0:00</div>
          </div>
          <div style="text-align:center">${teamLogo(a,40)}<div style="font-weight:700;margin-top:4px;font-size:13px">${esc(a.nick)}</div></div>
        </div>
        <div id="wg-possession" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px">
          <span id="wg-poss-lbl-h" style="font-size:11px;font-weight:700;color:var(--ink)">${esc(h.nick)}</span>
          <div style="display:flex;align-items:center;gap:3px">
            <div id="wg-ball-h" style="width:10px;height:10px;border-radius:50%;background:var(--accent);transition:opacity .3s"></div>
            <div style="display:flex;gap:3px" id="wg-tackle-dots">
              ${[1,2,3,4,5,6].map(n=>`<div id="wg-tck-${n}" style="width:9px;height:9px;border-radius:2px;background:${n<=1?'var(--accent)':'var(--line)'};transition:background .2s"></div>`).join('')}
            </div>
            <div id="wg-ball-a" style="width:10px;height:10px;border-radius:50%;background:var(--accent);transition:opacity .3s;opacity:0.15"></div>
          </div>
          <span id="wg-poss-lbl-a" style="font-size:11px;font-weight:700;color:var(--dim)">${esc(a.nick)}</span>
        </div>
        <div id="wg-banner" style="font-size:12px;color:var(--muted);margin-top:6px">Kick off — 80 min match</div>
        <div id="wg-stats-bar" style="display:flex;align-items:center;justify-content:center;gap:0;margin-top:8px;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:6px;overflow:hidden">
          <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center">
            <div style="padding:4px 6px;border-right:1px solid var(--line)"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Tries</div><b id="wg-stat-tries-h" style="font-size:15px">0</b></div>
            <div style="padding:4px 6px;border-right:1px solid var(--line)"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Line Breaks</div><b id="wg-stat-lb-h" style="font-size:15px">0</b></div>
            <div style="padding:4px 6px"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Errors</div><b id="wg-stat-err-h" style="font-size:15px;color:var(--red)">0</b></div>
          </div>
          <div style="padding:4px 10px;background:var(--bg);border-left:1px solid var(--line);border-right:1px solid var(--line);white-space:nowrap;text-align:center">
            <div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Poss</div>
            <span id="wg-stat-poss" style="font-size:11px;color:var(--muted)">—</span>
          </div>
          <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center">
            <div style="padding:4px 6px;border-left:1px solid var(--line)"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Errors</div><b id="wg-stat-err-a" style="font-size:15px;color:var(--red)">0</b></div>
            <div style="padding:4px 6px;border-left:1px solid var(--line)"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Line Breaks</div><b id="wg-stat-lb-a" style="font-size:15px">0</b></div>
            <div style="padding:4px 6px;border-left:1px solid var(--line)"><div style="font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em">Tries</div><b id="wg-stat-tries-a" style="font-size:15px">0</b></div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--dim);margin-top:2px">${esc(myM.det&&myM.det.venue||'Stadium')} · ${esc(myM.det&&myM.det.weather||'')} · ${((myM.det&&myM.det.crowd)||0).toLocaleString()} crowd</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 220px;gap:12px;align-items:start">
        <div>
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <button id="wg-tab-btn-feed" class="btn sm${activeTab==='feed'?' primary':''}" onclick="UI._switchWatchTab('feed')">Live Feed</button>
            <button id="wg-tab-btn-stats" class="btn sm${activeTab==='stats'?' primary':''}" onclick="UI._switchWatchTab('stats')">Team List</button>
          </div>
          <div id="wg-tab-feed" style="display:${activeTab==='feed'?'block':'none'}">
            <div id="wg-feedBox" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;min-height:360px;max-height:600px;overflow-y:auto;font-size:13px"></div>
          </div>
          <div id="wg-tab-stats" style="display:${activeTab==='stats'?'block':'none'}">
            ${UI._buildTeamStatsTab(myM)}
          </div>
        </div>
        <div id="wg-coachPanel">${UI._buildCoachingPanel(myM)}</div>
      </div>
      <div id="wg-postMatch" style="display:none;margin-top:16px"></div>
    </div>`;
  },

  _switchWatchTab(tab){
    UI._watchTab = tab;
    const feedDiv = document.getElementById('wg-tab-feed');
    const statsDiv = document.getElementById('wg-tab-stats');
    const feedBtn = document.getElementById('wg-tab-btn-feed');
    const statsBtn = document.getElementById('wg-tab-btn-stats');
    if(feedDiv) feedDiv.style.display = tab==='feed' ? 'block' : 'none';
    if(statsDiv){ statsDiv.style.display = tab==='stats' ? 'block' : 'none'; if(tab==='stats') UI._refreshTeamStats(); }
    if(feedBtn){ feedBtn.classList.toggle('primary', tab==='feed'); }
    if(statsBtn){ statsBtn.classList.toggle('primary', tab==='stats'); }
  },

  _buildTeamStatsTab(myM){
    if(!myM || !myM.det) return '<p style="padding:12px;color:var(--muted);font-size:12px">Loading match data...</p>';
    const t = myTeam();
    const myTeamId = G.coach.teamId;
    const isMineHome = myM.h === myTeamId;
    const myDet = isMineHome ? myM.det.h : myM.det.a;
    const oppDet = isMineHome ? myM.det.a : myM.det.h;
    const myTeamObj = G.teams[myTeamId];
    const oppTeamObj = G.teams[isMineHome ? myM.a : myM.h];
    const pct = Math.min((UI._watchCurrentMin || 0) / 80, 1);

    const condBar = (p) => {
      const cond = Math.round(p.cond || 50);
      const col = cond >= 70 ? 'var(--green)' : cond >= 50 ? 'var(--accent)' : 'var(--red)';
      return `<div style="display:flex;align-items:center;gap:3px;min-width:48px">
        <div style="width:28px;height:5px;background:var(--line);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${cond}%;background:${col}"></div>
        </div>
        <span style="font-size:9px;color:${col}">${cond}</span>
      </div>`;
    };

    const sc = (v) => v != null ? Math.round((v || 0) * pct) : 0;
    const gradeHtml = (r) => {
      if(!r || pct < 0.1) return '<span style="color:var(--dim)">—</span>';
      if(r >= 9) return '<span style="color:#c9a227;font-weight:700">A+</span>';
      if(r >= 8) return '<span style="color:var(--green);font-weight:700">A</span>';
      if(r >= 7) return '<span style="color:var(--green)">B+</span>';
      if(r >= 6) return 'B';
      if(r >= 5) return '<span style="color:var(--muted)">C</span>';
      return '<span style="color:var(--red)">D</span>';
    };

    const instrSel = (p) => {
      const instr = (t.matchPrefs && t.matchPrefs.playerInstr && t.matchPrefs.playerInstr[p.id]) || 'auto';
      return `<select style="font-size:9px;padding:1px 2px;max-width:64px;background:var(--card);border:1px solid var(--line);border-radius:3px;color:var(--ink)" onchange="UI._setPlayerInstr(${p.id},this.value)">
        <option value="auto"${instr==='auto'?' selected':''}>Auto</option>
        <option value="run"${instr==='run'?' selected':''}>Run hard</option>
        <option value="defend"${instr==='defend'?' selected':''}>Defend</option>
        <option value="kick"${instr==='kick'?' selected':''}>Kick</option>
      </select>`;
    };

    const myRows = t.lineup.slice(0, 17).map((id, si) => {
      const p = G.players[id];
      const isBench = si >= 13;
      if(!p) return `<tr style="opacity:.3"><td style="font-size:10px;color:var(--dim);padding:3px 4px">${si+1}</td><td colspan="9" style="font-size:10px;color:var(--dim);padding:3px 4px">—</td></tr>`;
      const line = myDet && myDet[id] ? myDet[id] : {};
      return `<tr id="wg-prow-${id}" draggable="true" style="cursor:grab;border-bottom:1px solid var(--line)"
          ondragstart="UI._wgDragStart(event,${si})"
          ondragover="event.preventDefault();this.style.background='var(--hover)'"
          ondragleave="this.style.background=''"
          ondrop="UI._wgDrop(event,${si});this.style.background=''">
        <td style="font-size:10px;color:var(--dim);padding:3px 4px;white-space:nowrap">${si+1}</td>
        <td style="font-size:11px;padding:3px 4px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap${isBench?';color:var(--muted)':''}">${esc(p.name)}</td>
        <td style="padding:3px 4px"><span class="pos-tag" style="font-size:9px">${p.pos}</span></td>
        <td style="padding:3px 4px">${condBar(p)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.tk)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.runs)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.m)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.lb)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px">${gradeHtml(line.r)}</td>
        <td style="padding:3px 4px">${instrSel(p)}</td>
      </tr>`;
    }).join('');

    const oppRows = oppTeamObj ? oppTeamObj.lineup.slice(0, 17).map((id, si) => {
      const p = G.players[id];
      if(!p) return '';
      const line = oppDet && oppDet[id] ? oppDet[id] : {};
      return `<tr style="border-bottom:1px solid var(--line)">
        <td style="font-size:10px;color:var(--dim);padding:3px 4px">${si+1}</td>
        <td style="font-size:11px;padding:3px 4px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap${si>=13?';color:var(--muted)':''}">${esc(p.name)}</td>
        <td style="padding:3px 4px"><span class="pos-tag" style="font-size:9px">${p.pos}</span></td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.tk)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.runs)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.m)}</td>
        <td style="font-size:10px;text-align:right;padding:3px 4px;color:var(--muted)">${sc(line.lb)}</td>
      </tr>`;
    }).join('') : '';

    const thStyle = 'font-size:9px;color:var(--dim);text-align:left;padding:3px 4px;font-weight:600;border-bottom:1px solid var(--line)';
    const thR = 'font-size:9px;color:var(--dim);text-align:right;padding:3px 4px;font-weight:600;border-bottom:1px solid var(--line)';
    return `<div class="card" style="padding:10px">
      <div style="margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
          ${esc(myTeamObj.nick)} — drag rows to swap positions
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thStyle}">#</th><th style="${thStyle}">Name</th><th style="${thStyle}">Pos</th>
            <th style="${thStyle}">Cond</th><th style="${thR}">Tk</th><th style="${thR}">Runs</th>
            <th style="${thR}">Mtrs</th><th style="${thR}">LB</th><th style="${thR}">Grd</th>
            <th style="${thStyle}">Instr</th>
          </tr></thead>
          <tbody id="wg-my-rows">${myRows}</tbody>
        </table>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${esc(oppTeamObj ? oppTeamObj.nick : 'Opposition')}</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thStyle}">#</th><th style="${thStyle}">Name</th><th style="${thStyle}">Pos</th>
            <th style="${thR}">Tk</th><th style="${thR}">Runs</th><th style="${thR}">Mtrs</th><th style="${thR}">LB</th>
          </tr></thead>
          <tbody>${oppRows}</tbody>
        </table>
      </div>
    </div>`;
  },

  _refreshTeamStats(){
    const statsDiv = document.getElementById('wg-tab-stats');
    if(!statsDiv || statsDiv.style.display === 'none' || !UI._watchMyM) return;
    statsDiv.innerHTML = UI._buildTeamStatsTab(UI._watchMyM);
  },

  _updateTeamStatsRows(myM){
    if(!myM || !myM.det) return;
    const t = myTeam();
    const isMineHome = myM.h === G.coach.teamId;
    const myDet = isMineHome ? myM.det.h : myM.det.a;
    const pct = Math.min((UI._watchCurrentMin || 0) / 80, 1);
    t.lineup.slice(0, 17).forEach(id => {
      if(!id) return;
      const row = document.getElementById('wg-prow-' + id);
      if(!row) return;
      const line = myDet && myDet[id] ? myDet[id] : {};
      const cells = row.querySelectorAll('td');
      if(cells[4]) cells[4].textContent = Math.round((line.tk || 0) * pct);
      if(cells[5]) cells[5].textContent = Math.round((line.runs || 0) * pct);
      if(cells[6]) cells[6].textContent = Math.round((line.m || 0) * pct);
      if(cells[7]) cells[7].textContent = Math.round((line.lb || 0) * pct);
    });
  },

  _updatePossession(myM, ev){
    const isTry = ev && ev.evType === 'try';
    const isHT = ev && ev.evType === 'halftime';
    const isFT = ev && ev.evType === 'fulltime';
    if(isFT) return;
    if(isTry){
      const homeScored = ev.txt && G.teams[myM.h] && ev.txt.includes(G.teams[myM.h].nick + ':');
      UI._wgPossTeam = homeScored ? 'a' : 'h';
      UI._wgTackle = 1;
    } else if(isHT){
      UI._wgPossTeam = UI._wgPossTeam === 'h' ? 'a' : 'h';
      UI._wgTackle = 1;
    } else {
      UI._wgTackle = (UI._wgTackle || 1) + 1;
      if(UI._wgTackle > 6){
        UI._wgTackle = 1;
        UI._wgPossTeam = UI._wgPossTeam === 'h' ? 'a' : 'h';
      }
    }
    const poss = UI._wgPossTeam;
    if(UI._liveStats) { if(poss==='h') UI._liveStats.hPoss++; else UI._liveStats.aPoss++; UI._updateLiveStatsBar(); }
    const ballH = document.getElementById('wg-ball-h');
    const ballA = document.getElementById('wg-ball-a');
    const lblH = document.getElementById('wg-poss-lbl-h');
    const lblA = document.getElementById('wg-poss-lbl-a');
    if(ballH) ballH.style.opacity = poss === 'h' ? '1' : '0.15';
    if(ballA) ballA.style.opacity = poss === 'a' ? '1' : '0.15';
    if(lblH) { lblH.style.color = poss === 'h' ? 'var(--ink)' : 'var(--dim)'; lblH.style.fontWeight = poss === 'h' ? '700' : '400'; }
    if(lblA) { lblA.style.color = poss === 'a' ? 'var(--ink)' : 'var(--dim)'; lblA.style.fontWeight = poss === 'a' ? '700' : '400'; }
    for(let n = 1; n <= 6; n++){
      const dot = document.getElementById('wg-tck-' + n);
      if(dot) dot.style.background = n <= (UI._wgTackle || 1) ? 'var(--accent)' : 'var(--line)';
    }
  },

  _updateLiveStatsBar(){
    if(!UI._liveStats) return;
    const s = UI._liveStats;
    const total = s.hPoss + s.aPoss;
    const hPct = total > 0 ? Math.round(s.hPoss / total * 100) : 50;
    const aPct = 100 - hPct;
    const elTH = document.getElementById('wg-stat-tries-h');
    const elTA = document.getElementById('wg-stat-tries-a');
    const elPoss = document.getElementById('wg-stat-poss');
    const elLBH = document.getElementById('wg-stat-lb-h');
    const elLBA = document.getElementById('wg-stat-lb-a');
    const elEH = document.getElementById('wg-stat-err-h');
    const elEA = document.getElementById('wg-stat-err-a');
    if(elTH) elTH.textContent = s.hTries;
    if(elTA) elTA.textContent = s.aTries;
    if(elPoss && total > 10) elPoss.textContent = `Poss ${hPct}%–${aPct}%`;
    if(elLBH) elLBH.textContent = s.hLB||0;
    if(elLBA) elLBA.textContent = s.aLB||0;
    if(elEH) elEH.textContent = s.hErr||0;
    if(elEA) elEA.textContent = s.aErr||0;
  },

  _wgDragStart(event, fromSlot){
    UI._wgDragFromSlot = fromSlot;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(fromSlot));
  },

  _wgDrop(event, toSlot){
    event.preventDefault();
    const fromSlot = UI._wgDragFromSlot;
    if(fromSlot == null || fromSlot === toSlot) return;
    const t = myTeam();
    const fromBench = fromSlot >= 13;
    const toBench = toSlot >= 13;
    // Capture IDs before swap
    const fromId = t.lineup[fromSlot];
    const toId = t.lineup[toSlot];
    const fromP = G.players[fromId];
    const toP = G.players[toId];
    // Swap
    t.lineup[fromSlot] = toId;
    t.lineup[toSlot] = fromId;
    UI._wgDragFromSlot = null;
    // If bench ↔ starter swap, log as a sub event in the feed
    if(fromBench !== toBench && fromP && toP && UI._watchMyM){
      const atMin = UI._watchCurrentMin || 0;
      const inP = fromBench ? fromP : toP;
      const outP = fromBench ? toP : fromP;
      UI._watchMyM.det.subs = UI._watchMyM.det.subs || [];
      UI._watchMyM.det.subs.push({outId: outP.id, inId: inP.id, min: atMin});
      const feedBox = document.getElementById('wg-feedBox');
      if(feedBox){
        feedBox.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline"><span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${atMin}'</span><span style="color:var(--muted)">↕ SUB — ${esc(inP.name)} on for ${esc(outP.name)} (${esc(t.nick)})</span></div>`;
        feedBox.scrollTop = feedBox.scrollHeight;
      }
      if(UI._watchTab === 'feed') UI._switchWatchTab('feed');
    }
    UI._refreshTeamStats();
    UI._refreshCoachPanel();
  },

  _setPlayerInstr(playerId, instr){
    const t = myTeam();
    if(!t.matchPrefs) t.matchPrefs = {};
    if(!t.matchPrefs.playerInstr) t.matchPrefs.playerInstr = {};
    t.matchPrefs.playerInstr[playerId] = instr;
    if(instr !== 'auto' && UI._watchMyM){
      const p = G.players[playerId];
      if(p){
        const atMin = UI._watchCurrentMin || 0;
        const instrLabel = {run:'run hard', defend:'focus on defence', kick:'look to kick'}[instr] || instr;
        const feedBox = document.getElementById('wg-feedBox');
        if(feedBox){
          feedBox.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline"><span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${atMin}'</span><span style="color:var(--muted);font-style:italic">Coach: ${esc(p.name)} — ${instrLabel}</span></div>`;
          feedBox.scrollTop = feedBox.scrollHeight;
        }
      }
    }
  },

  _buildCoachingPanel(myM){
    const t = myTeam();
    if(!t.matchPrefs) t.matchPrefs = {};
    const prefs = t.matchPrefs;
    const focus = prefs.attackFocus || 'balanced';
    const intent = prefs.gameIntent || 'normal';
    const offloadRisk = prefs.offloadRisk || 'normal';
    const defStyle = prefs.defStyle || 'structured';

    const focusOpts = [['balanced','Balanced'],['middle','Middle'],['left','L edge'],['right','R edge'],['territory','Territory']];
    const focusBtns = focusOpts.map(([k,l]) =>
      '<button class="btn sm' + (focus===k?' primary':'') + '" onclick="myTeam().matchPrefs.attackFocus=' + JSON.stringify(k) + ';UI._refreshCoachPanel()" style="font-size:10px;padding:3px 6px">' + l + '</button>'
    ).join('');
    const intentOpts = [['chase','Chase'],['normal','Normal'],['protect','Protect']];
    const intentBtns = intentOpts.map(([k,l]) => {
      const col = k==='chase'?';color:var(--accent)':k==='protect'?';color:var(--green)':'';
      return '<button class="btn sm' + (intent===k?' primary':'') + '" onclick="myTeam().matchPrefs.gameIntent=' + JSON.stringify(k) + ';UI._refreshCoachPanel()" style="font-size:10px;padding:3px 6px' + col + '">' + l + '</button>';
    }).join('');
    const offloadOpts = [['low','Low'],['normal','Normal'],['high','High']];
    const offloadBtns = offloadOpts.map(([k,l]) =>
      '<button class="btn sm' + (offloadRisk===k?' primary':'') + '" onclick="myTeam().matchPrefs.offloadRisk=' + JSON.stringify(k) + ';UI._refreshCoachPanel()" style="font-size:10px;padding:3px 6px">' + l + '</button>'
    ).join('');
    const defOpts = [['structured','Structured'],['aggressive','Aggressive']];
    const defBtns = defOpts.map(([k,l]) =>
      '<button class="btn sm' + (defStyle===k?' primary':'') + '" onclick="myTeam().matchPrefs.defStyle=' + JSON.stringify(k) + ';UI._refreshCoachPanel()" style="font-size:10px;padding:3px 6px">' + l + '</button>'
    ).join('');

    // Pressure target
    const targetId = prefs.targetPlayerId || null;
    let pressureHtml = '';
    if(myM){
      const oppTeamId = myM.h === t.id ? myM.a : myM.h;
      const opp = G.teams[oppTeamId];
      if(opp){
        const keyOpp = opp.lineup.slice(0,13).map((id,i)=>({p:G.players[id],slot:i})).filter(x=>x.p && ['HB','FE','HK','WG','CE','FB','SR','LK'].includes(x.p.pos));
        const oppOpts = keyOpp.map(({p}) => '<option value="' + p.id + '" ' + (targetId===p.id?'selected':'') + '>' + esc(p.name) + ' (' + p.pos + ')</option>').join('');
        pressureHtml = '<div style="margin-bottom:10px">'
          + '<div style="font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:700">Pressure target</div>'
          + '<select style="font-size:10px;width:100%" onchange="var v=+this.value||null;myTeam().matchPrefs.targetPlayerId=v;UI._refreshCoachPanel()">'
          + '<option value="">None</option>' + oppOpts + '</select>'
          + (targetId ? '<div style="font-size:10px;color:var(--accent);margin-top:2px">Targeted — reduces their metres, raises error risk</div>'
                      : '<div style="font-size:10px;color:var(--dim);margin-top:2px">Focus defence on a specific opponent</div>')
          + '</div>';
      }
    }

    // Sub queue
    if(!UI._subQueue) UI._subQueue = [];
    const queuedOutSlots = new Set(UI._subQueue.map(s=>s.outSlot));
    const queuedBenchSlots = new Set(UI._subQueue.map(s=>s.benchSlot));
    const benchPlayers = [13,14,15,16].map(bs=>({bs,p:G.players[t.lineup[bs]]})).filter(x=>x.p&&!queuedBenchSlots.has(x.bs));
    const starterPlayers = Array.from({length:13},(_,si)=>({si,p:G.players[t.lineup[si]]})).filter(x=>x.p&&!queuedOutSlots.has(x.si));
    const pendingList = UI._subQueue.map((sub,qi) => {
      const inP = G.players[t.lineup[sub.benchSlot]], outP = G.players[t.lineup[sub.outSlot]];
      if(!inP||!outP) return '';
      return '<div style="font-size:11px;display:flex;align-items:center;gap:4px;padding:2px 0">'
        + '<span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--accent)">' + esc(inP.name) + ' → ' + esc(outP.name) + '</span>'
        + '<button class="btn sm" style="font-size:9px;padding:1px 5px" onclick="UI._removeSubFromQueue(' + qi + ')">×</button>'
        + '</div>';
    }).filter(Boolean).join('');
    const benchOpts = benchPlayers.map(x=>'<option value="' + x.bs + '">' + esc(x.p.name) + ' (' + x.p.pos + ')</option>').join('');
    const starterOpts = '<option value="">— replaces —</option>' + starterPlayers.map(x=>'<option value="' + x.si + '">#' + (x.si+1) + ' ' + esc(x.p.name) + ' (' + x.p.pos + ')</option>').join('');
    const subsHtml = '<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line)">'
      + '<div style="font-size:10px;color:var(--muted);margin-bottom:5px;font-weight:700">Substitutions</div>'
      + (pendingList ? '<div style="margin-bottom:6px">' + pendingList + '</div>' : '')
      + (benchPlayers.length
        ? '<div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">'
          + '<select id="wg-sub-in" style="font-size:10px;flex:1;min-width:70px">' + benchOpts + '</select>'
          + '<select id="wg-sub-out" style="font-size:10px;flex:1;min-width:70px">' + starterOpts + '</select>'
          + '<button class="btn sm" style="font-size:10px;padding:3px 6px" onclick="UI._addSubToQueue()">Queue</button>'
          + '</div>'
          + '<div style="font-size:10px;color:var(--dim);margin-top:3px">Applied at next stoppage in play</div>'
        : '<div style="font-size:10px;color:var(--dim)">All bench players queued or unavailable</div>')
      + '</div>';

    const penOpts = [['auto','Auto'],['kickTouch','Touch'],['tap','Tap'],['penaltyGoal','Goal']];
    const penSel = penOpts.map(([v,l])=>`<option value="${v}" ${prefs.penalty===v?'selected':''}>${l}</option>`).join('');
    const gameplanOpts = [['attacking','Attacking'],['balanced','Balanced'],['grinding','Grinding']];
    const gameplanSel = gameplanOpts.map(([v,l])=>`<option value="${v}" ${(t.plan||'balanced')===v?'selected':''}>${l}</option>`).join('');

    const liveH = (typeof document !== 'undefined' && document.getElementById('wg-scoreH')?.textContent) || (myM && myM._liveH != null ? myM._liveH : '0');
    const liveA = (typeof document !== 'undefined' && document.getElementById('wg-scoreA')?.textContent) || (myM && myM._liveA != null ? myM._liveA : '0');
    const myNick = myM ? esc(G.teams[myM.h===t.id?myM.h:myM.a].nick) : '';
    const oppNick = myM ? esc(G.teams[myM.h===t.id?myM.a:myM.h].nick) : '';
    const myScore = myM && myM.h===t.id ? liveH : liveA;
    const oppScore = myM && myM.h===t.id ? liveA : liveH;
    const myDiff = parseInt(myScore) - parseInt(oppScore);
    const halfLabel = (UI._watchHalf || 1) === 1 ? '1st half' : '2nd half';
    const sitText = myDiff > 12 ? 'Leading well — protect?' : myDiff > 0 ? `Ahead by ${myDiff}` : myDiff === 0 ? 'Level' : myDiff > -12 ? `Down ${Math.abs(myDiff)} — chase?` : `Down ${Math.abs(myDiff)} — high-risk chase`;
    const sitCol = myDiff > 6 ? 'var(--green)' : myDiff < -6 ? 'var(--red)' : 'var(--muted)';

    // Squad mood for HT context
    const moodSnippet = (UI._watchHalf || 1) === 2 ? (() => {
      const t2 = myTeam();
      const starters = t2.lineup.slice(0,13).map(id=>G.players[id]).filter(Boolean);
      if(!starters.length) return '';
      const avg = Math.round(starters.reduce((s,p)=>s+(p.morale||50),0)/starters.length);
      const low = starters.filter(p=>(p.morale||50)<40).length;
      const moodLbl = avg>=70?'Buoyant':avg>=55?'Positive':avg>=40?'Flat':'Low';
      const moodCol = avg>=70?'var(--green)':avg>=55?'var(--muted)':avg<40?'var(--red)':'var(--accent)';
      return `<div style="font-size:10px;color:var(--dim);margin-top:4px;padding-top:4px;border-top:1px solid var(--line)">
        Mood: <span style="color:${moodCol};font-weight:700">${moodLbl}</span> (avg ${avg})${low?` · <span style="color:var(--red)">${low} low</span>`:''}
      </div>`;
    })() : '';

    return `<div class="card" style="padding:12px;position:sticky;top:8px;max-height:calc(100vh - 100px);overflow-y:auto">
      <div style="text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line)">
        <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Live score · ${halfLabel}</div>
        <div style="font-family:var(--disp);font-size:26px;font-weight:900;letter-spacing:.04em"><span id="cp-scoreH">${myScore}</span> – <span id="cp-scoreA">${oppScore}</span></div>
        <div style="font-size:9px;color:var(--dim)">${myNick} v ${oppNick}</div>
        <div id="cp-situation" style="font-size:11px;color:${sitCol};font-weight:700;margin-top:4px">${sitText}</div>
        ${moodSnippet}
      </div>
      ${subsHtml}
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700">Attack focus</div>
        <div style="display:flex;flex-wrap:wrap;gap:3px">${focusBtns}</div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700">Game intent</div>
        <div style="display:flex;gap:3px">${intentBtns}</div>
        <div style="font-size:10px;color:var(--dim);margin-top:3px">${intent==='chase'?'Expansive — more tries, more errors':intent==='protect'?'Kick for field position, manage the clock':'Balanced'}</div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700">Offloads</div>
        <div style="display:flex;gap:3px">${offloadBtns}</div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700">Defence</div>
        <div style="display:flex;gap:3px">${defBtns}</div>
      </div>
      ${pressureHtml}
      <div style="margin-bottom:8px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:700">Penalty</div>
        <select style="font-size:11px;width:100%" onchange="myTeam().matchPrefs.penalty=this.value">${penSel}</select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:700">Game plan</div>
        <select style="font-size:11px;width:100%" onchange="myTeam().plan=this.value">${gameplanSel}</select>
      </div>
    </div>`;
  },

  _refreshCoachPanel(){
    const panel = document.getElementById('wg-coachPanel');
    if(panel && UI._watchMyM) panel.innerHTML = UI._buildCoachingPanel(UI._watchMyM);
  },

  _updateCpSituation(myM, myScore, oppScore){
    const el = document.getElementById('cp-situation');
    if(!el) return;
    const diff = myScore - oppScore;
    const text = diff > 12 ? `Leading by ${diff} — protect?` : diff > 0 ? `Ahead by ${diff}` : diff === 0 ? 'Level' : diff > -12 ? `Down ${Math.abs(diff)} — chase?` : `Down ${Math.abs(diff)} — high-risk chase`;
    const col = diff > 6 ? 'var(--green)' : diff < -6 ? 'var(--red)' : 'var(--muted)';
    el.textContent = text;
    el.style.color = col;
  },

  // ── Live watch engine ───────────────────────────────────────────────────
  // Single setInterval tick — speed changes take effect every tick, pause is a flag.
  // TICK_MS = 50ms (20 ticks/real-sec).
  // At speed=1: 6 game-secs per tick → 120 game-sec/real-sec → 40 game-min in 20 real-sec.
  _startLiveWatch(events, myM){
    UI._liveEvents = events.slice().sort((a,b) => a.min - b.min);
    UI._liveEventIdx = 0;
    UI._liveGameSec = 0;
    UI._liveHtDone = false;
    UI._liveFtDone = false;
    UI._liveHtPaused = false;
    UI._watchMyM = myM;
    UI._watchPaused = false;
    UI._watchHalf = 1;
    UI._liveStats = {hTries:0, aTries:0, hPoss:0, aPoss:0};

    if(UI._liveIntervalId) clearInterval(UI._liveIntervalId);

    const TICK_MS = 50;
    const BASE_SECS_PER_TICK = 6; // game-seconds advanced per tick at speed=1

    UI._liveIntervalId = setInterval(() => {
      if(UI.page !== 'watchgame'){ clearInterval(UI._liveIntervalId); return; }
      if(UI._watchPaused || UI._liveHtPaused) return;

      const speed = UI._watchSpeed || 1;
      UI._liveGameSec += speed * BASE_SECS_PER_TICK;

      const secInt = Math.floor(UI._liveGameSec);
      const gameMins = Math.floor(secInt / 60);
      const gameSecs = secInt % 60;
      UI._watchCurrentMin = gameMins;

      // Update clock display (MM:SS)
      const clockEl = document.getElementById('wg-clock');
      if(clockEl && !UI._liveHtPaused){
        if(gameMins >= 80) clockEl.textContent = "80:00";
        else clockEl.textContent = `${gameMins}:${String(gameSecs).padStart(2,'0')}`;
      }

      // Fire all events whose minute has now been reached
      const currentGameMin = UI._liveGameSec / 60;
      while(UI._liveEventIdx < UI._liveEvents.length){
        const ev = UI._liveEvents[UI._liveEventIdx];
        if(ev.min > currentGameMin) break;
        UI._liveEventIdx++;
        UI._fireLiveEvent(ev, myM);
        if(ev.evType === 'halftime'){
          // Auto-resume after a brief HT break (scaled by speed, max 3s)
          UI._liveHtPaused = true;
          if(clockEl) clockEl.textContent = 'HT';
          setTimeout(() => {
            UI._liveHtPaused = false;
            if(clockEl) clockEl.textContent = '40:00';
          }, Math.max(400, Math.round(3000 / speed)));
        }
        if(ev.evType === 'fulltime' || UI._liveFtDone) return;
      }

      // Update stats tab if open
      if(UI._watchTab === 'stats') UI._updateTeamStatsRows(myM);

      // Safety: end game if clock passes 80 min and fulltime event hasn't fired
      if(UI._liveGameSec >= 4810 && !UI._liveFtDone){
        UI._liveFtDone = true;
        clearInterval(UI._liveIntervalId);
        while(UI._liveEventIdx < UI._liveEvents.length){
          UI._fireLiveEvent(UI._liveEvents[UI._liveEventIdx++], myM);
        }
        UI._handleFullTime(myM);
      }
    }, TICK_MS);
  },

  _fireLiveEvent(ev, myM){
    const box = document.getElementById('wg-feedBox');
    if(!box) return;
    const isScore   = ev.evType==='try'||ev.evType==='penalty'||ev.evType==='fieldgoal';
    const isHT      = ev.evType==='halftime';
    const isFT      = ev.evType==='fulltime';
    const isSub     = ev.evType==='sub';
    const isInj     = ev.evType==='injury';
    const isSinBin  = ev.evType==='sinbin';
    const isSendOff = ev.evType==='sendoff';

    // Apply sub queue at stoppages
    if(ev.stoppage && !isHT && UI._subQueue && UI._subQueue.length){
      const subEvs = UI._flushSubQueue(myM, ev.min);
      if(subEvs.length){
        // Insert sub events just after current position
        UI._liveEvents.splice(UI._liveEventIdx, 0, ...subEvs);
        UI._refreshCoachPanel();
        UI._refreshTeamStats();
      }
    }

    const color = isScore   ? 'color:var(--accent);font-weight:700'
                : isHT     ? 'color:var(--accent);font-weight:600'
                : isSub    ? 'color:var(--muted)'
                : isInj    ? 'color:var(--red)'
                : isSinBin ? 'color:#c9a227;font-weight:600'
                : isSendOff? 'color:var(--red);font-weight:700' : '';
    const mins = isHT ? 40 : isFT ? 80 : (ev.min || 0);
    const secs = 0;
    const minLabel = isHT ? 'HT' : isFT ? 'FT' : `${mins}:${String(secs).padStart(2,'0')}`;

    box.innerHTML += '<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline">'
      + '<span style="color:var(--dim);font-size:11px;min-width:40px;flex-shrink:0">' + minLabel + '</span>'
      + '<span style="' + color + '">' + esc(ev.txt) + '</span></div>';
    box.scrollTop = box.scrollHeight;

    // Score update
    if(isScore){
      const sc = UI._extractLiveScore(ev.txt);
      if(sc){
        const sh = document.getElementById('wg-scoreH'), sa = document.getElementById('wg-scoreA');
        if(sh) sh.textContent = sc.h; if(sa) sa.textContent = sc.a;
        if(myM){
          const t = myTeam();
          const myS = myM.h===t.id ? sc.h : sc.a, oppS = myM.h===t.id ? sc.a : sc.h;
          const cph = document.getElementById('cp-scoreH'), cpa = document.getElementById('cp-scoreA');
          if(cph) cph.textContent = myS; if(cpa) cpa.textContent = oppS;
          UI._updateCpSituation(myM, +myS, +oppS);
        }
      }
      if(ev.evType==='try' && UI._liveStats){
        const homeScored = myM && G.teams[myM.h] && ev.txt.includes(G.teams[myM.h].nick+':');
        if(homeScored) UI._liveStats.hTries++; else UI._liveStats.aTries++;
        UI._updateLiveStatsBar();
      }
    }

    // HT: refresh panel + scoreboard
    if(isHT){
      const sc = UI._extractLiveScore(ev.txt);
      if(sc){ const sh=document.getElementById('wg-scoreH'),sa=document.getElementById('wg-scoreA'); if(sh)sh.textContent=sc.h; if(sa)sa.textContent=sc.a; }
      const banner = document.getElementById('wg-banner'); if(banner) banner.textContent = '⏸ HALF TIME';
      UI._watchHalf = 2;
      UI._refreshCoachPanel();
    }

    // FT
    if(isFT){
      UI._liveFtDone = true;
      if(UI._liveIntervalId){ clearInterval(UI._liveIntervalId); UI._liveIntervalId = null; }
      UI._handleFullTime(myM);
      return;
    }

    // Track errors and line breaks for stats bar
    if(UI._liveStats && myM && (ev.evType==='error' || ev.evType==='narrative')){
      const th = G.teams[myM.h];
      if(ev.evType==='error'){
        const homeErr = th && ev.txt.includes('('+th.nick+')');
        if(homeErr) UI._liveStats.hErr = (UI._liveStats.hErr||0)+1;
        else UI._liveStats.aErr = (UI._liveStats.aErr||0)+1;
        UI._updateLiveStatsBar();
      } else if(ev.txt && (ev.txt.includes('breaks the line')||ev.txt.includes('sprints clear')||ev.txt.includes('charges through')
          ||ev.txt.includes('gets to the edge')||ev.txt.includes('drives through the middle')||ev.txt.includes('bursts through')
          ||ev.txt.includes('steps inside')||ev.txt.includes('cuts inside and sprints'))){
        const homeLB = th && ev.txt.includes('('+th.nick+')');
        if(homeLB) UI._liveStats.hLB = (UI._liveStats.hLB||0)+1;
        else UI._liveStats.aLB = (UI._liveStats.aLB||0)+1;
        UI._updateLiveStatsBar();
      }
    }

    UI._updatePossession(myM, ev);
  },

  _toggleWatchPause(){
    UI._watchPaused = !UI._watchPaused;
    const btn = document.getElementById('wg-pause-btn');
    if(btn) btn.textContent = UI._watchPaused ? '▶ Resume' : '⏸ Pause';
    // Interval keeps running — pause flag prevents clock/event advances
  },

  _flushSubQueue(myM, atMin){
    const t = myTeam();
    const events = [];
    for(const sub of [...UI._subQueue]){
      const outId = t.lineup[sub.outSlot], inId = t.lineup[sub.benchSlot];
      const outP = G.players[outId], inP = G.players[inId];
      if(!outP||!inP) continue;
      t.lineup[sub.outSlot] = inId; t.lineup[sub.benchSlot] = outId;
      myM.det.subs = myM.det.subs || [];
      myM.det.subs.push({outId, inId, outSlot:sub.outSlot, benchSlot:sub.benchSlot, min:atMin});
      events.push({min:atMin+0.1, evType:'sub', stoppage:false, txt:`↕ SUB — ${inP.name} on for ${outP.name} (${t.nick})`});
    }
    UI._subQueue = [];
    return events;
  },

  _addSubToQueue(){
    const inSel = document.getElementById('wg-sub-in');
    const outSel = document.getElementById('wg-sub-out');
    if(!inSel||!outSel||!outSel.value) return;
    if(!UI._subQueue) UI._subQueue = [];
    const benchSlot = +inSel.value, outSlot = +outSel.value;
    if(UI._subQueue.some(s=>s.outSlot===outSlot||s.benchSlot===benchSlot)) return;
    UI._subQueue.push({benchSlot, outSlot});
    UI._refreshCoachPanel();
  },

  _removeSubFromQueue(qi){
    if(!UI._subQueue) return;
    UI._subQueue.splice(qi,1);
    UI._refreshCoachPanel();
  },

  _handleFullTime(myM){
    if(UI._liveIntervalId){ clearInterval(UI._liveIntervalId); UI._liveIntervalId = null; }
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
      // Queue press conference prompt after a short delay
      setTimeout(() => UI._showPressConference(myM, won, drew), 600);
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

  _extractLiveScore(txt){
    const m = txt && txt.match(/\((\d+)[–\-](\d+)\)/);
    return m ? {h:+m[1], a:+m[2]} : null;
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
    const teamAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d2a53e';
    const COLORS = [teamAccent,'#4caf7d','#5b9bd5','#e05c5c','#9c6dd8','#f0a430','#61c9a8'];
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
    const myPoss  = mineIsH ? (myM.det.possH||50) : (myM.det.possA||50);
    const oppPoss = mineIsH ? (myM.det.possA||50) : (myM.det.possH||50);
    const myTerr  = mineIsH ? (myM.det.terrH||50) : (myM.det.terrA||50);
    const oppTerr = mineIsH ? (myM.det.terrA||50) : (myM.det.terrH||50);
    const myCompl  = mineIsH ? (myM.det.complH||0) : (myM.det.complA||0);
    const oppCompl = mineIsH ? (myM.det.complA||0) : (myM.det.complH||0);
    const topPlayers = det => Object.entries(det).map(([id,l])=>({p:G.players[+id],l})).filter(x=>x.p&&x.l&&x.l.r).sort((a,b)=>b.l.r-a.l.r);
    const myTop = topPlayers(myDet).slice(0,5);
    const oppTop = topPlayers(oppDet).slice(0,3);
    const perfRow = x => `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;border-bottom:1px solid var(--line)">
      <span style="cursor:pointer;text-decoration:underline;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" onclick="UI.playerModal(${x.p.id})">${esc(x.p.name)} <span class="pos-tag" style="font-size:10px">${x.p.pos}</span></span>
      <span style="color:var(--muted);font-size:11px;white-space:nowrap;padding-left:6px">${x.l.t?x.l.t+'T ':''}${x.l.ta?x.l.ta+'TA ':''}${x.l.gl?x.l.gl+(x.l.ga?'/'+x.l.ga:'')+'G ':''}${x.l.fg?x.l.fg+'FG ':''}${x.l.m?Math.round(x.l.m)+'m ':''}${x.l.lb?x.l.lb+'LB ':''}<b style="color:var(--ink)">${x.l.r.toFixed(1)}</b></span>
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
      if(item.type==='try'){const ev=item.ev,team=ev.side==='h'?th:ta,scorer=G.players[ev.scorerId],assist=ev.assistId?G.players[ev.assistId]:null;if(ev.side==='h') sH+=4+(ev.converted?2:0);else sA+=4+(ev.converted?2:0);const isMine=(ev.side==='h')===mineIsH,col=isMine?'var(--green)':'var(--red)';return `<div style="display:flex;gap:6px;align-items:baseline;padding:4px 6px;border-left:3px solid ${col};margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:${col};font-weight:700;width:28px;flex-shrink:0;font-size:10px">TRY</span><span style="flex:1">${esc(scorer?scorer.name:'?')}${assist?` <span style="color:var(--muted)">(${esc(assist.name)})</span>`:''} <span style="font-size:10px;color:${ev.converted?'var(--green)':'var(--red)'}">${ev.converted?'CONV':'NO CONV'}</span> <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--accent)">${sH}–${sA}</span></div>`;}
      if(item.type==='pen'){const ev=item.ev,team=ev.side==='h'?th:ta,kicker=ev.kickerId?G.players[ev.kickerId]:null;if(ev.side==='h') sH+=2;else sA+=2;return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">PEN</span><span style="flex:1">${kicker?esc(kicker.name):'?'} <span style="color:var(--muted);font-size:10px">${esc(team.nick)}</span></span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--accent)">${sH}–${sA}</span></div>`;}
      if(item.type==='fg'){const ev=item.ev,team=G.teams[ev.team];if(ev.team===myM.h) sH+=1;else sA+=1;return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 6px;border-left:3px solid var(--muted);margin:2px 0;font-size:12px"><span style="color:var(--dim);font-size:10px;width:24px;flex-shrink:0">${ev.min}'</span><span style="color:var(--muted);width:28px;flex-shrink:0;font-size:10px">FG</span><span style="flex:1">${team?esc(team.nick):'?'}</span><span style="font-family:var(--disp);font-weight:700;font-size:12px;color:var(--accent)">${sH}–${sA}</span></div>`;}
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
      ${statCmp('Possession',myPoss,oppPoss,myPoss+'%',oppPoss+'%')}
      ${statCmp('Territory',myTerr,oppTerr,myTerr+'%',oppTerr+'%')}
      ${statCmp('Completion',myCompl,oppCompl,myCompl+'%',oppCompl+'%')}
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

  _showPressConference(myM, won, drew){
    if(myM.pressConf) return; // already done

    const myScore = myM.h === G.coach.teamId ? myM.hs : myM.as;
    const oppScore = myM.h === G.coach.teamId ? myM.as : myM.hs;
    const margin = Math.abs(myScore - oppScore);
    const bigWin = won && margin >= 20;
    const closeWin = won && margin < 10;
    const closeLoss = !won && !drew && margin < 10;
    const heavyLoss = !won && !drew && margin >= 20;

    // Pick question based on result context
    const question = bigWin ? `Your side dominated with a ${margin}-point win. What's the key takeaway for the group?`
      : closeWin ? `A tight one — you got there in the end. How did the team manage the pressure?`
      : drew ? `A draw today. Are you satisfied with how the team competed?`
      : closeLoss ? `Unlucky not to get the points. What do you put the defeat down to?`
      : heavyLoss ? `A difficult afternoon — down by ${margin}. Where did it fall apart today?`
      : won ? `A solid ${margin}-point victory. What pleased you most?`
      : `A tough loss. What's your message to the playing group?`;

    // Result-appropriate response options
    const OPTIONS = won ? [
      { key: 'credit', label: 'Credit the opponent', desc: 'Show respect for the opposition.', confD: 3, morD: 0, cohD: 3, tone: 'blue' },
      { key: 'process', label: 'Back the process', desc: 'Trust the system and the week of preparation.', confD: 4, morD: 3, cohD: 2, tone: 'green' },
      { key: 'standards', label: 'Demand higher standards', desc: 'Not satisfied — expect more from the group.', confD: 2, morD: -2, cohD: 0, tone: 'orange' },
      { key: 'enjoy', label: 'Let them enjoy it', desc: 'A good win deserves celebrating.', confD: 2, morD: 5, cohD: 2, tone: 'yellow' },
    ] : drew ? [
      { key: 'positives', label: 'Take the positives', desc: 'A point is a point — focus on what worked.', confD: 2, morD: 2, cohD: 2, tone: 'blue' },
      { key: 'better', label: 'We can do better', desc: 'A draw isn\'t good enough — respond next week.', confD: 3, morD: -1, cohD: 0, tone: 'orange' },
      { key: 'together', label: 'Stick together', desc: 'Tight group wins you games when form wobbles.', confD: 2, morD: 3, cohD: 4, tone: 'green' },
    ] : [
      { key: 'respond', label: 'We will respond', desc: 'Losing breeds hunger — bounce back next week.', confD: 1, morD: 4, cohD: 3, tone: 'green' },
      { key: 'honest', label: 'Honest review needed', desc: 'Call it out — the group needs accountability.', confD: 3, morD: -2, cohD: -1, tone: 'orange' },
      { key: 'believe', label: 'Back the playing group', desc: 'Public confidence in the squad despite the result.', confD: 0, morD: 5, cohD: 2, tone: 'blue' },
      { key: 'process', label: 'Trust the process', desc: 'Losses happen — stay the course.', confD: 2, morD: 2, cohD: 1, tone: 'yellow' },
    ];

    const toneColor = { blue: 'var(--blue,#5b9bd5)', green: 'var(--green)', orange: 'var(--orange,#e08a30)', yellow: 'var(--accent)', red: 'var(--red)' };

    const optCards = OPTIONS.map(o => `
      <div onclick="UI._doPressConf(${JSON.stringify(o).replace(/"/g,'&quot;')},${myM.h},${myM.a},${myM.hs},${myM.as})"
        style="cursor:pointer;padding:12px 14px;border-radius:8px;border:1px solid var(--line);background:var(--hover);display:flex;gap:10px;align-items:flex-start;transition:border-color .15s"
        onmouseover="this.style.borderColor='${toneColor[o.tone]||'var(--accent)'}'"
        onmouseout="this.style.borderColor='var(--line)'">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;color:${toneColor[o.tone]||'var(--ink)'}">${esc(o.label)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(o.desc)}</div>
        </div>
      </div>`).join('');

    UI.modal(`
      <h3 style="margin-bottom:4px">Post-Match Press Conference</h3>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">${esc(question)}</p>
      <div style="display:flex;flex-direction:column;gap:8px">${optCards}</div>
      <p style="font-size:11px;color:var(--dim);margin-top:14px;text-align:center">Your response shapes board confidence and player morale.</p>
    `);
  },

  _doPressConf(opt, mh, ma, hs, as){
    const myM = G.fixtures.flat().find(m => m.h === mh && m.a === ma && m.hs === hs && m.as === as);
    if(!myM) return UI.closeModal();
    myM.pressConf = true;

    const t = G.teams.find(t => t.id === G.coach.teamId);
    if(opt.confD && G.coach) G.coach.conf = Math.max(0, Math.min(100, (G.coach.conf || 50) + opt.confD));
    if(t && opt.cohD) t.cohesion = Math.max(0, Math.min(100, (t.cohesion || 50) + opt.cohD));
    if(t && opt.morD){
      (t.lineup || []).slice(0, 17).forEach(id => {
        const p = G.players[id];
        if(p) p.morale = Math.max(5, Math.min(99, (p.morale || 50) + opt.morD));
      });
    }

    const effects = [];
    if(opt.confD > 0) effects.push(`Board confidence +${opt.confD}`);
    else if(opt.confD < 0) effects.push(`Board confidence ${opt.confD}`);
    if(opt.morD > 0) effects.push(`Player morale +${opt.morD}`);
    else if(opt.morD < 0) effects.push(`Player morale ${opt.morD}`);
    if(opt.cohD > 0) effects.push(`Team cohesion +${opt.cohD}`);
    else if(opt.cohD < 0) effects.push(`Team cohesion ${opt.cohD}`);

    autoSave();
    UI.closeModal();
    if(effects.length) UI.toast(`Press conf: "${opt.label}" — ${effects.join(', ')}.`);
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
    const color = isScore ? 'color:var(--accent)' : isSinBin ? 'color:var(--red)' : '';
    box.innerHTML += `<div style="padding:5px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:baseline">
      <span style="color:var(--dim);font-size:11px;min-width:28px;flex-shrink:0">${e.min}'</span>
      <span style="${color}">${esc(e.txt)}</span>
    </div>`;
    box.scrollTop = box.scrollHeight;
    if(isScore && e.txt && !e.txt.startsWith('FULL TIME') && !e.txt.includes('HALF TIME')){
      const sc = UI._extractLiveScore(e.txt);
      if(sc){ const sh=document.getElementById('liveScoreH'),sa=document.getElementById('liveScoreA'); if(sh)sh.textContent=sc.h; if(sa)sa.textContent=sc.a; }
    }
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

    // Merge tries + penalties chronologically so running score is always correct
    let sH=0, sA=0;
    const allScoring = [
      ...tryEvs.map(e => ({...e, _st:'try'})),
      ...penEvs.map(e => ({...e, _st:'pen'}))
    ].sort((a,b) => a.min - b.min);
    for(const ev of allScoring){
      if(ev._st === 'try'){
        const team = ev.side==='h' ? h : a;
        const scorer = G.players[ev.scorerId]; if(!scorer) continue;
        const assist = ev.assistId ? G.players[ev.assistId] : null;
        const kicker = ev.kickerId ? G.players[ev.kickerId] : null;
        if(ev.side==='h'){ sH += 4+(ev.converted?2:0); } else { sA += 4+(ev.converted?2:0); }
        const assistTxt = assist ? ` ${pick(ASSIST_VERBS)} ${assist.name},` : '';
        const convTxt = ev.converted
          ? (kicker && kicker.id!==scorer.id ? ` ${kicker.name} converts.` : ' Conversion good.')
          : ' Conversion missed.';
        const sInjMin = playerInjMin(ev.scorerId, ev.side);
        const tryMin = sInjMin ? Math.min(ev.min, Math.max(1, sInjMin - 1)) : ev.min;
        all.push({min:tryMin, txt:`TRY — ${team.nick}:${assistTxt} ${scorer.name} ${tryDesc(scorer.pos)}.${convTxt} (${sH}–${sA})`});
      } else {
        // Penalty goal events with running score — processed in chronological order
        const team = ev.side==='h' ? h : a;
        const kicker = G.players[ev.kickerId]; if(!kicker) continue;
        if(ev.made){
          if(ev.side==='h') sH+=2; else sA+=2;
          all.push({min:ev.min, txt:`${kicker.name} (${team.nick}) slots a penalty goal. (${sH}–${sA})`});
        } else {
          all.push({min:ev.min, txt:`${kicker.name} (${team.nick}) misses the penalty attempt.`});
        }
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

    // Narrative commentary derived from aggregate player stats
    // Score context for tactic events
    const finalH = m.hs || 0, finalA = m.as || 0;
    const margin = Math.abs(finalH - finalA);
    const lbDescF = p => {
      const isForward = ['PR','SR','LK','HK'].includes(p.pos);
      const isBack = ['WG','CE','FB'].includes(p.pos);
      return isForward
        ? pick(['charges through two tacklers and makes massive metres!','drives through the middle and breaks clear!','bursts through the line and draws the fullback!','takes contact and comes out the other side — breaks away!','crashes off the ruck and exploits a gap in the line!'])
        : isBack
        ? pick(['cuts inside and sprints clear!','steps off his right and gets into open space!','rounds the last man and gets away!','shows great footwork and finds the gap!','ghosts through the defensive line!'])
        : pick(['finds a gap and makes big metres!','beats a man on the outside and goes!','breaks a tackle and charges downfield!','steps off both feet and gets away!','gets to the edge and breaks the line!']);
    };
    const tkDescF = p => {
      const isForward = ['PR','SR','LK','HK'].includes(p.pos);
      return isForward
        ? pick(['drives through the tackle, wrapping him up and rolling him back.','puts in another bone-shaking hit — leading by example.','comes off the line early and smothers the play.','hammers the ball-carrier and strips the momentum.','is taking no prisoners — another dominant carry stopped.'])
        : pick(['wraps up perfectly and drags him to ground.','puts in a big defensive hit — the line is holding.','makes the important tackle at the ruck.','reads the play and cuts him off cold.','is everywhere in defence — an outstanding shift.']);
    };
    const errDescF = () => pick([
      'drops it cold — the referee signals repeat set.',
      'loses the ball in contact — a let-off for the defence.',
      'coughs it up under pressure — the defenders celebrating.',
      'spills a short ball — an uncharacteristic error.',
      'knocks on and the opposition get a repeat set.',
      'fails to gather the pass — ball on the ground.',
      "can't hold on in traffic — knock-on.",
    ]);
    for(const [side, team] of [[m.det.h,h],[m.det.a,a]]){
      let topBreaker = null, topLb = 0, topDefender = null, topTk = 0;
      const errPlayers = [];
      for(const [id, l] of Object.entries(side)){
        if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
        const p = G.players[+id]; if(!p) continue;
        if((l.lb||0) > topLb){ topLb = l.lb||0; topBreaker = p; }
        if((l.tk||0) > topTk){ topTk = l.tk||0; topDefender = p; }
        if((l.err||0) >= 2) errPlayers.push(p);
      }
      if(topBreaker && topLb >= 2)
        all.push({min: ri(10, 37), txt: `${topBreaker.name} (${team.nick}) ${lbDescF(topBreaker)}`});
      if(topBreaker && topLb >= 4)
        all.push({min: ri(48, 74), txt: `${topBreaker.name} again — he's been the best ball-runner on the park.`});
      if(topDefender && topTk >= 12)
        all.push({min: ri(15, 70), txt: `${topDefender.name} (${team.nick}) ${tkDescF(topDefender)}`});
      if(errPlayers.length)
        all.push({min: ri(20, 62), txt: `${errPlayers[0].name} (${team.nick}) ${errDescF()}`});
    }

    // Tactic-aware narrative events — context-sensitive, composite construction
    for(const [team, oppTeam] of [[h,a],[a,h]]){
      const prefs = team.matchPrefs || {};
      const oppPrefs = oppTeam.matchPrefs || {};
      const lineupPlayers = (team.lineup||[]).slice(0,13).map(id=>G.players[id]).filter(Boolean);
      const topForward = lineupPlayers.filter(p=>['PR','SR','LK','HK'].includes(p.pos)).sort((a,b)=>(b.attrs.ballRunning||50)+(b.attrs.strength||50)-(a.attrs.ballRunning||50)-(a.attrs.strength||50))[0];
      const kicker = [...lineupPlayers].sort((a,b)=>(b.attrs.placeKick||b.attrs.kicking||50)-(a.attrs.placeKick||a.attrs.kicking||50))[0];
      const targeted = oppPrefs.targetPlayerId ? G.players[oppPrefs.targetPlayerId] : null;
      const teamScore = team.id === h.id ? finalH : finalA;
      const oppScore = team.id === h.id ? finalA : finalH;
      const isLeading = teamScore > oppScore;
      const isTrailing = teamScore < oppScore;

      if(prefs.offloadRisk === 'high' && topForward){
        const setup = pick([`${topForward.name} takes contact`,`${topForward.name} drives through two defenders`,`${topForward.name} absorbs a hit in the middle`]);
        const result = pick(['and fires an offload to keep the play alive!','and pops it out of the tackle — the ball stays alive!','and releases off the ground — brilliant instinct!','and finds the runner at his hip — heads-up league!',`and keeps it alive — ${team.nick} looking dangerous.`]);
        all.push({min: ri(12, 68), txt: `${setup} ${result}`});
      } else if(prefs.offloadRisk === 'low' && topForward && rnd() < 0.55){
        all.push({min: ri(12, 68), txt: pick([
          `${topForward.name} (${team.nick}) takes it up hard and goes to ground cleanly — the forwards keeping it tight.`,
          `${topForward.name} (${team.nick}) drives through contact and presents the ball back — disciplined carry.`,
          `${topForward.name} (${team.nick}) accepts the tackle and recycles cleanly — ${team.nick} not giving anything away.`,
          `${topForward.name} (${team.nick}) keeps it tight through the ruck — no risks through the middle.`,
          `${topForward.name} (${team.nick}) completes the set carry and goes to ground — ${team.nick} are grinding it out.`,
        ])});
      }
      if(prefs.attackFocus === 'territory' && kicker){
        all.push({min: ri(10, 72), txt: pick([
          `${kicker.name} (${team.nick}) puts boot to ball and finds touch inside their 20 — ${team.nick} working the field position.`,
          `${kicker.name} (${team.nick}) cuts the angle and sends it to the corner flag — forcing them to play from deep.`,
          `${kicker.name} (${team.nick}) chips a grubber into the in-goal and wins the drop-out — territory won.`,
          `${kicker.name} (${team.nick}) finds the sideline with a raking kick — excellent field position for ${team.nick}.`,
          `${kicker.name} (${team.nick}) kicks long and pins ${oppTeam.nick} inside their own 10 — controlled pressure from ${team.nick}.`,
        ])});
      }
      if(prefs.gameIntent === 'chase' && rnd() < 0.7){
        const trailNote = isTrailing ? pick([`Down by ${margin}, `,`Chasing the game, `,`With points needed, `]) : '';
        all.push({min: ri(20, 65), txt: pick([
          `${trailNote}${team.nick} shifting the ball at speed — they want it in hand.`,
          `${trailNote}${team.nick} are refusing to kick — every set is an attacking opportunity.`,
          `${trailNote}${team.nick} throwing it wide at every chance — backs getting plenty of ball.`,
          `${team.nick} backing themselves to score from anywhere — expansive stuff.`,
          `${team.nick} moving it quickly off the ruck — no intention of slowing this down.`,
        ])});
      } else if(prefs.gameIntent === 'protect' && rnd() < 0.7){
        const leadNote = isLeading ? pick([`Leading by ${margin}, `,`Ahead by ${margin}, `,`With the lead to protect, `]) : '';
        all.push({min: ri(20, 65), txt: pick([
          `${leadNote}${team.nick} kicking on last tackle — slowing the game down.`,
          `${leadNote}${team.nick} working the kick game, finding touch and earning field position.`,
          `${team.nick} taking the safe option — the forwards driving deep into the tackle.`,
          `${team.nick} happy to kick it dead and reset the line — no risks.`,
          `${leadNote}${team.nick} slowing the ruck and kicking to the corners — game management on display.`,
        ])});
      }
      if(prefs.defStyle === 'aggressive' && topForward){
        all.push({min: ri(15, 70), txt: pick([
          `${topForward.name} (${team.nick}) leads the rush and gets up in the halfback's face — no time to set.`,
          `${topForward.name} (${team.nick}) flies out of the defensive line and smothers the play.`,
          `${topForward.name} (${team.nick}) is dominating the line-speed — ${oppTeam.nick} can't get set before the pressure arrives.`,
          `${topForward.name} (${team.nick}) comes off the line hard and puts in a crunching shot — ${team.nick} flying up in defence.`,
          `${team.nick} are blitzing the line on every tackle — ${topForward.name} leading the charge.`,
        ])});
      }
      if(targeted && oppPrefs.targetPlayerId === targeted.id && rnd() < 0.75){
        all.push({min: ri(18, 65), txt: pick([
          `${targeted.name} (${team.nick}) gets the ball and two ${oppTeam.nick} defenders are on him immediately — he is clearly being targeted.`,
          `${targeted.name} (${team.nick}) finding no room — ${oppTeam.nick} have the rush defence set specifically for him.`,
          `Every time ${targeted.name} gets the ball, ${oppTeam.nick} have extra defenders there — the staff plan is obvious.`,
          `${targeted.name} (${team.nick}) is being funnelled into the sideline on every carry — no space being offered.`,
          `${targeted.name} (${team.nick}) draws the rush defence again — ${oppTeam.nick} are committed to shutting him down.`,
        ])});
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

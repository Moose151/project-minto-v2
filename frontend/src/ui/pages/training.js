'use strict';

/* Training — weekly focus + developing-players table */
Object.assign(UI, {
  _trainPos: 'all',
  _trainSort: 'age',

  p_training(){
    const t = myTeam();
    const opts = [
      ['balanced','Balanced','Even development across the squad.'],
      ['attack','Attacking shape','Boosts passing, kicking, playmaking, ball-running and finishing.'],
      ['defence','Defensive systems','Boosts tackling, defensive reads, big hits, last-ditch effort and marker defence.'],
      ['fitness','Conditioning block','Boosts speed, acceleration, agility, strength, stamina and durability.'],
      ['youth','Youth development','Doubles down on players 21 and under.'],
      ['recovery','Recovery focus','Squad recovers more condition each week — fewer soft-tissue injuries.']
    ];
    const trainSortVal = p => ({
      age: p.age, ovr: -p.ovr, load: -(p.load||0), cond: -(p.cond||0),
      pot: -(scoutedPotential(p).mid||0), name: p.name, form: formText(p)
    }[UI._trainSort] ?? p.age);
    const players = t.players.map(id=>G.players[id]).filter(Boolean)
      .filter(p => UI._trainPos === 'all' || p.pos === UI._trainPos || p.pos2 === UI._trainPos)
      .sort((a,b) => {
        const av = trainSortVal(a), bv = trainSortVal(b);
        return typeof av === 'string' ? av.localeCompare(bv) : av - bv || b.ovr - a.ovr;
      });
    const cal = typeof ensureCalendar === 'function' ? ensureCalendar() : null;
    const stop = cal && typeof calendarStopForDay === 'function' ? calendarStopForDay(cal.day) : null;
    const reviewDue = stop && stop.key === 'training' && cal.trainingReviewedDay !== cal.day;
    const loadWatch = t.players.map(id=>G.players[id])
      .filter(p=>p && isTopSquadPlayer(p) && !p.injury && ((p.load||0) > 50 || p.cond < 76))
      .sort((a,b)=>(b.fatigue||0)-(a.fatigue||0))
      .slice(0,8);
    const trainSelect = p => `<select onchange="UI.setPlayerTraining(${p.id}, this.value)">
      ${Object.entries(INDIVIDUAL_TRAINING).map(([k,l])=>`<option value="${k}" ${(p.training||'balanced')===k?'selected':''}>${l}</option>`).join('')}
    </select>`;
    const posSelect = p => `<select onchange="UI.setRetrainPos(${p.id}, this.value)">
      <option value="">Choose position</option>${realisticRetrainPositions(p).map(pos=>`<option value="${pos}" ${p.retrainPos===pos?'selected':''}>${pos}</option>`).join('')}
    </select>`;
    const specOpts = p => SPECIALIST_BY_POS[p.pos] || ['balanced'];
    const specSelect = p => `<select onchange="UI.setRetrainSpec(${p.id}, this.value)">
      <option value="">Choose specialist</option>${specOpts(p).filter(s=>s!==p.spec).map(s=>`<option value="${s}" ${p.retrainSpec===s?'selected':''}>${SPECIALIST_LABEL[s]||s}</option>`).join('')}
    </select>`;
    return `<h1 class="page">Training</h1><p class="page-sub">Weekly focus shapes who develops and how fresh your squad stays.</p>
    ${reviewDue?`<div class="card" style="border-color:var(--brass);margin-bottom:12px">
      <div style="font-family:var(--disp);font-size:22px;font-weight:700;color:var(--brass)">Training review due</div>
      <p class="page-sub">Set a team focus and check overloaded players before advancing beyond Monday.</p>
      <div class="btnrow"><button class="btn primary" onclick="UI.markTrainingReviewed()">Mark review complete</button><button class="btn" onclick="UI.go('calendar')">Calendar</button></div>
    </div>`:''}
    <div class="grid3">${opts.map(([k,l,d])=>`<div class="card" style="cursor:pointer; ${t.focus===k?'border-color:var(--brass)':''}" onclick="myTeam().focus='${k}'; UI.render()">
      <div style="font-family:var(--disp); font-size:18px; font-weight:700; text-transform:uppercase; color:${t.focus===k?'var(--brass)':'var(--ink)'}">${l}</div>
      <p style="color:var(--muted); font-size:12.5px; margin-top:4px">${d}</p></div>`).join('')}</div>
    ${loadWatch.length?`<h2 class="sec">Load management</h2>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr><th class="noclick">Player</th><th class="noclick">Pos</th><th class="noclick num">Cond</th><th class="noclick num">Load</th><th class="noclick num">Fatigue</th><th class="noclick">Advice</th></tr></thead><tbody>${loadWatch.map(p=>{
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const bad = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74;
      return `<tr class="click" onclick="UI.playerModal(${p.id})"><td><b>${esc(p.name)}</b></td><td><span class="pos-tag">${p.pos}</span></td><td class="num" style="color:${p.cond<65?'var(--red)':p.cond<78?'var(--brass)':'var(--muted)'}">${Math.round(p.cond)}%</td><td class="num">${Math.round(p.load||0)}</td><td class="num" style="color:${bad?'var(--red)':fatigue>=55?'var(--brass)':'var(--muted)'}">${fatigue}</td><td>${bad?'<span style="color:var(--red);font-size:12px">Rest or bench risk</span>':'<span style="color:var(--brass);font-size:12px">Monitor workload</span>'}</td></tr>`;
    }).join('')}</tbody></table></div>`:''}
    <h2 class="sec">Developing players</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Est. Potential</th><th class="noclick num">Est. Headroom</th></tr></thead><tbody>
    ${t.players.map(id=>G.players[id]).filter(p=>p&&scoutedPotential(p).mid>p.ovr).sort((a,b)=>(scoutedPotential(b).mid-b.ovr)-(scoutedPotential(a).mid-a.ovr)).slice(0,10).map(p=>
      `<tr class="click" onclick="UI.playerModal(${p.id})"><td>${esc(p.name)} <span class="pos-tag">${p.pos}</span></td><td class="num">${p.age}</td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="num">${potHtml(p)}</td><td class="num" style="color:var(--green)">+${Math.max(0, scoutedPotential(p).mid-p.ovr)}</td></tr>`).join('')}
    </tbody></table></div>
    <h2 class="sec">Individual training</h2>
    <div class="btnrow" style="flex-wrap:wrap;margin-bottom:6px">
      ${['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'].map(pos=>`<button class="btn sm ${UI._trainPos===pos?'primary':''}" onclick="UI._trainPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`).join('')}
      <select style="max-width:180px;margin-left:8px" onchange="UI._trainSort=this.value;UI.render()">${[['age','Sort: youngest'],['ovr','Sort: OVR'],['load','Sort: load'],['cond','Sort: condition'],['form','Sort: form'],['pot','Sort: potential'],['name','Sort: name']].map(([v,l])=>`<option value="${v}" ${UI._trainSort===v?'selected':''}>${l}</option>`).join('')}</select>
      ${UI._trainPos!=='all'||UI._trainSort!=='age'?`<button class="btn sm" onclick="UI._trainPos='all';UI._trainSort='age';UI.render()">Reset</button>`:''}
    </div>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr>
      <th class="noclick">Player</th><th class="noclick">Specialist</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick">Focus</th><th class="noclick">Retrain position</th><th class="noclick">Retrain specialist</th>
    </tr></thead><tbody>${players.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})">
      <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}/${p.pos2}</span></td>
      <td>${esc(specialistLabel(p))}${p.side&&p.side!=='either'?` <span style="color:var(--muted);font-size:11px">(${p.side})</span>`:''}</td>
      <td class="num">${p.age}</td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
      <td onclick="event.stopPropagation()">${trainSelect(p)}</td>
      <td onclick="event.stopPropagation()">${posSelect(p)}</td>
      <td onclick="event.stopPropagation()">${specSelect(p)}</td>
    </tr>`).join('')}</tbody></table></div>`;
  },
  setPlayerTraining(id, val){
    const p = G.players[id]; if(!p) return;
    p.training = val;
    UI.toast(`${p.name}: ${INDIVIDUAL_TRAINING[val] || 'Training'} focus set.`);
    UI.render();
  },
  setRetrainPos(id, val){
    const p = G.players[id]; if(!p) return;
    if(val && !realisticRetrainPositions(p).includes(val)){
      UI.toast(`${p.name} cannot realistically retrain to ${val}.`);
      UI.render();
      return;
    }
    p.retrainPos = val || null;
    if(val) p.training = 'position';
    UI.render();
  },
  setRetrainSpec(id, val){
    const p = G.players[id]; if(!p) return;
    p.retrainSpec = val || null;
    if(val) p.training = 'specialist';
    UI.render();
  },
  markTrainingReviewed(){
    ensureCalendar();
    G.calendar.trainingReviewedDay = G.calendar.day;
    UI.toast('Training review complete.');
    UI.render();
  }
});

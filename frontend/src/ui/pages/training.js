import { UI } from "../01-core.js";

Object.assign(UI, {
  _trainPos: 'all',
  _trainSort: 'age',

  p_training(){
    const t = myTeam();
    const focusOpts = [
      ['balanced','Balanced','Even development across the squad.'],
      ['attack','Attacking shape','Boosts passing, kicking, playmaking, ball-running and finishing.'],
      ['defence','Defensive systems','Boosts tackling, defensive reads, big hits, last-ditch effort and marker defence.'],
      ['fitness','Conditioning block','Boosts speed, acceleration, agility, strength, stamina and durability.'],
      ['youth','Youth development','Doubles down on players 21 and under.'],
      ['recovery','Recovery focus','Squad recovers more condition each week — fewer soft-tissue injuries.']
    ];
    const cal = typeof ensureCalendar === 'function' ? ensureCalendar() : null;
    const stop = cal && typeof calendarStopForDay === 'function' ? calendarStopForDay(cal.day) : null;
    const reviewDue = stop && stop.key === 'training' && cal.trainingReviewedDay !== cal.day;

    const loadWatch = t.players.map(id=>G.players[id])
      .filter(p=>p && isTopSquadPlayer(p) && !p.injury && ((p.load||0) > 50 || p.cond < 76))
      .sort((a,b)=>(b.fatigue||0)-(a.fatigue||0))
      .slice(0,8);

    // Developing players — sorted by headroom, with progress bars
    const devPlayers = t.players.map(id=>G.players[id])
      .filter(p=>p && scoutedPotential(p).mid > p.ovr)
      .sort((a,b)=>(scoutedPotential(b).mid-b.ovr)-(scoutedPotential(a).mid-a.ovr))
      .slice(0,12);

    const ovrMin = 40; // baseline for bar scaling
    const devBar = p => {
      const pot = scoutedPotential(p).mid;
      const range = Math.max(1, pot - ovrMin);
      const pctOvr = Math.max(0, Math.min(100, (p.ovr - ovrMin) / range * 100));
      const pctPot = 100;
      const headroom = Math.max(0, pot - p.ovr);
      return `<div style="position:relative;height:6px;background:var(--hover);border-radius:3px;width:100%;min-width:120px">
        <div style="position:absolute;left:0;top:0;height:6px;width:${pctOvr.toFixed(1)}%;background:var(--accent);border-radius:3px;opacity:0.9"></div>
        <div style="position:absolute;left:${pctOvr.toFixed(1)}%;top:0;height:6px;width:${(pctPot-pctOvr).toFixed(1)}%;background:var(--green);border-radius:3px;opacity:0.3"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:10px;color:var(--muted)">
        <span>OVR <b style="color:var(--ink)">${p.ovr}</b></span>
        <span style="color:var(--green)">+${headroom} → ${pot}</span>
      </div>`;
    };

    // Individual training table
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

    const keyAttrSet = p => new Set(typeof positionKeyAttrs === 'function' ? positionKeyAttrs(p.pos) : []);

    const trainSelect = p => `<select onchange="UI.setPlayerTraining(${p.id}, this.value)" onclick="event.stopPropagation()">
      ${Object.entries(INDIVIDUAL_TRAINING).map(([k,l])=>`<option value="${k}" ${(p.training||'balanced')===k?'selected':''}>${l}</option>`).join('')}
    </select>`;

    const attrTargetSelect = p => {
      const key = keyAttrSet(p);
      const grouped = Object.entries(ATTR_GROUPS).map(([grp, attrs]) => {
        const opts = attrs.map(a => {
          const label = ATTR_LABEL[a] || a;
          const val = p.attrs[a] || 0;
          const isKey = key.has(a);
          return `<option value="${a}" ${p.attrTarget===a?'selected':''} ${isKey?'':''}>
            ${isKey ? '★ ' : ''}${label} (${val})</option>`;
        }).join('');
        const grpLabel = {offensive:'Offensive',defensive:'Defensive',physical:'Physical',mental:'Mental'}[grp] || grp;
        return `<optgroup label="${grpLabel}">${opts}</optgroup>`;
      }).join('');
      return `<select onchange="UI.setAttrTarget(${p.id}, this.value)" onclick="event.stopPropagation()">
        <option value="">Auto</option>${grouped}
      </select>`;
    };

    const posSelect = p => `<select onchange="UI.setRetrainPos(${p.id}, this.value)" onclick="event.stopPropagation()">
      <option value="">—</option>${realisticRetrainPositions(p).map(pos=>`<option value="${pos}" ${p.retrainPos===pos?'selected':''}>${pos}</option>`).join('')}
    </select>`;

    const specOpts = p => SPECIALIST_BY_POS[p.pos] || ['balanced'];
    const specSelect = p => `<select onchange="UI.setRetrainSpec(${p.id}, this.value)" onclick="event.stopPropagation()">
      <option value="">—</option>${specOpts(p).filter(s=>s!==p.spec).map(s=>`<option value="${s}" ${p.retrainSpec===s?'selected':''}>${SPECIALIST_LABEL[s]||s}</option>`).join('')}
    </select>`;

    const keyBadges = p => {
      const key = positionKeyAttrs(p.pos).slice(0, 5);
      const target = p.attrTarget;
      return key.map(a => {
        const v = p.attrs[a] || 0;
        const isTarget = a === target;
        return `<span style="display:inline-flex;align-items:center;gap:3px;margin:1px 2px 1px 0;padding:1px 5px;border-radius:10px;font-size:10px;background:${isTarget?'var(--accent)':'var(--hover)'};color:${isTarget?'#000':'var(--muted)'}">${ATTR_LABEL[a]||a} ${v}</span>`;
      }).join('');
    };

    const recommendedFocus = (() => {
      if(loadWatch.some(p => p.cond < 66 || (p.load||0) > 74)) return 'recovery';
      const youthUpside = devPlayers.filter(p=>p.age<=21).length;
      if(youthUpside >= 4) return 'youth';
      const recentFor = ladder().find(r=>r.id===t.id);
      if(recentFor && recentFor.pa > recentFor.pf + 30) return 'defence';
      return t.focus || 'balanced';
    })();
    const focusLabel = focusOpts.find(x=>x[0]===t.focus)?.[1] || 'Balanced';

    return `<h1 class="page">Training</h1><p class="page-sub">Set team focus and individual training targets to shape player development.</p>
    ${UI.workflowStrip ? UI.workflowStrip() : ''}
    ${reviewDue?`<div class="card" style="border-color:var(--accent);margin-bottom:12px">
      <div style="font-family:var(--disp);font-size:22px;font-weight:700;color:var(--accent)">Training review due</div>
      <p class="page-sub">Current focus: <b style="color:var(--ink)">${esc(focusLabel)}</b>. ${loadWatch.length ? `${loadWatch.length} player${loadWatch.length===1?'':'s'} need load attention.` : 'No urgent load flags.'}</p>
      <div class="btnrow">
        ${recommendedFocus!==t.focus?`<button class="btn" onclick="myTeam().focus='${recommendedFocus}';UI.render();UI.toast('Training focus updated.')">Use staff recommendation</button>`:''}
        <button class="btn primary" onclick="UI.markTrainingReviewed()">Complete review</button>
        <button class="btn" onclick="UI.go('teamsheet')">Team list</button>
      </div>
    </div>`:''}

    <h2 class="sec">Team focus</h2>
    <div class="grid3">${focusOpts.map(([k,l,d])=>`<div class="card" style="cursor:pointer;${t.focus===k?'border-color:var(--accent)':''}" onclick="myTeam().focus='${k}';UI.render()">
      <div style="font-family:var(--disp);font-size:17px;font-weight:700;text-transform:uppercase;color:${t.focus===k?'var(--accent)':'var(--ink)'}">${l}</div>
      <p style="color:var(--muted);font-size:12px;margin-top:4px">${d}</p></div>`).join('')}</div>

    ${loadWatch.length?`<h2 class="sec">Load management</h2>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr>
      <th class="noclick">Player</th><th class="noclick">Pos</th>
      <th class="noclick num">Cond</th><th class="noclick num">Load</th><th class="noclick num">Fatigue</th><th class="noclick">Advice</th>
    </tr></thead><tbody>${loadWatch.map(p=>{
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const bad = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74;
      return `<tr class="click" onclick="UI.playerModal(${p.id})"><td><b>${esc(p.name)}</b></td><td><span class="pos-tag">${p.pos}</span></td>
        <td class="num" style="color:${p.cond<65?'var(--red)':p.cond<78?'var(--accent)':'var(--muted)'}">${Math.round(p.cond)}%</td>
        <td class="num">${Math.round(p.load||0)}</td>
        <td class="num" style="color:${bad?'var(--red)':fatigue>=55?'var(--accent)':'var(--muted)'}">${fatigue}</td>
        <td>${bad?'<span style="color:var(--red);font-size:12px">Rest — injury risk</span>':'<span style="color:var(--accent);font-size:12px">Monitor workload</span>'}</td></tr>`;
    }).join('')}</tbody></table></div>`:''}

    ${(()=>{
      const topSquad = t.players.map(id=>G.players[id]).filter(p=>p && p.squad==='top');
      const avgMorale = topSquad.length ? Math.round(topSquad.reduce((s,p)=>s+(p.morale||50),0)/topSquad.length) : 50;
      const lowMorale = topSquad.filter(p=>(p.morale||50)<40).sort((a,b)=>(a.morale||50)-(b.morale||50)).slice(0,5);
      const atRisk = topSquad.filter(p=>(p.weeksDropped||0)>=3 && !p.injury).slice(0,5);
      const moodColor = avgMorale>=70?'var(--green)':avgMorale<40?'var(--red)':'var(--accent)';
      const moodLabel = avgMorale>=80?'Buoyant':avgMorale>=65?'Positive':avgMorale>=50?'Stable':avgMorale>=35?'Unsettled':'Low';
      return `<h2 class="sec">Squad mood</h2>
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:${lowMorale.length||atRisk.length?12:0}px">
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Squad Average</div>
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font-size:32px;font-weight:900;font-family:var(--disp);color:${moodColor}">${avgMorale}</span>
              <span style="font-size:14px;font-weight:600;color:${moodColor}">${moodLabel}</span>
            </div>
          </div>
          <div style="flex:1;min-width:160px">
            <div style="height:8px;background:var(--card2);border-radius:4px;overflow:hidden">
              <div style="width:${avgMorale}%;height:100%;background:${moodColor}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:3px"><span>0</span><span>100</span></div>
          </div>
          <div style="font-size:12px;color:var(--muted);max-width:240px">
            ${avgMorale>=70?'Players are in good spirits. Team talks and press conferences keep it here.'
              :avgMorale>=50?'Morale is steady. Good results and regular game time will lift it.'
              :'Morale is low. Players need results, game time, and positive management.'}
          </div>
        </div>
        ${lowMorale.length?`<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:2px">
          <div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:6px">Low morale players</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${lowMorale.map(p=>`<div class="click" onclick="UI.playerModal(${p.id})" style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:var(--hover);cursor:pointer;border:1px solid var(--line)">
              ${playerAvatar(p,28)}
              <div>
                <div style="font-size:12px;font-weight:600">${esc(p.name)}</div>
                <div style="font-size:11px;color:var(--red)">${Math.round(p.morale||50)} morale${(p.weeksDropped||0)>=2?' · dropped '+p.weeksDropped+'w':''}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>`:''}
        ${atRisk.length?`<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:${lowMorale.length?6:2}px">
          <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px">Rotation risk — morale declining from lack of game time</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${atRisk.map(p=>`<div class="click" onclick="UI.playerModal(${p.id})" style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:var(--hover);cursor:pointer;border:1px solid var(--line)">
              ${playerAvatar(p,28)}
              <div>
                <div style="font-size:12px;font-weight:600">${esc(p.name)}</div>
                <div style="font-size:11px;color:var(--accent)">${p.weeksDropped}w out of squad</div>
              </div>
            </div>`).join('')}
          </div>
        </div>`:''}
      </div>`;
    })()}
    <h2 class="sec">Development pipeline</h2>
    <div class="card" style="padding:10px 6px">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${devPlayers.map(p=>`<div class="click" onclick="UI.playerModal(${p.id})" style="padding:10px;border-radius:8px;background:var(--hover);cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span>
            <div>
              <div style="font-weight:600;font-size:13px">${esc(p.name)}</div>
              <div style="font-size:11px;color:var(--muted)"><span class="pos-tag" style="font-size:10px">${p.pos}</span> · Age ${p.age}${p.attrTarget?` · Target: <b style="color:var(--accent)">${ATTR_LABEL[p.attrTarget]||p.attrTarget}</b>`:''}</div>
            </div>
          </div>
          ${devBar(p)}
        </div>`).join('')}
      </div>
    </div>

    <h2 class="sec">Individual training</h2>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      ${['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'].map(pos=>`<button class="btn sm ${UI._trainPos===pos?'primary':''}" onclick="UI._trainPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`).join('')}
      <select style="max-width:160px;margin-left:4px" onchange="UI._trainSort=this.value;UI.render()">${[['age','Youngest first'],['ovr','OVR'],['load','Load'],['cond','Condition'],['form','Form'],['pot','Potential'],['name','Name']].map(([v,l])=>`<option value="${v}" ${UI._trainSort===v?'selected':''}>Sort: ${l}</option>`).join('')}</select>
      ${UI._trainPos!=='all'||UI._trainSort!=='age'?`<button class="btn sm" onclick="UI._trainPos='all';UI._trainSort='age';UI.render()">Reset</button>`:''}
    </div>
    <div style="color:var(--muted);font-size:11.5px;margin-bottom:6px">
      ★ = position key attribute &nbsp;·&nbsp; <b>Attr target</b>: 65% of development gains directed here &nbsp;·&nbsp; Auto = engine chooses
    </div>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr>
      <th class="noclick">Player</th>
      <th class="noclick num">Age</th><th class="noclick num">OVR</th>
      <th class="noclick">Key attributes</th>
      <th class="noclick">Focus</th>
      <th class="noclick">Attr target</th>
      <th class="noclick">Retrain pos</th>
      <th class="noclick">Spec</th>
    </tr></thead><tbody>${players.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})">
      <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
      <td class="num">${p.age}</td>
      <td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
      <td onclick="event.stopPropagation()" style="min-width:180px">${keyBadges(p)}</td>
      <td onclick="event.stopPropagation()">${trainSelect(p)}</td>
      <td onclick="event.stopPropagation()">${attrTargetSelect(p)}</td>
      <td onclick="event.stopPropagation()">${posSelect(p)}</td>
      <td onclick="event.stopPropagation()">${specSelect(p)}</td>
    </tr>`).join('')}</tbody></table></div>`;
  },

  setAttrTarget(id, val){
    const p = G.players[id]; if(!p) return;
    p.attrTarget = val || null;
    if(val) UI.toast(`${p.name}: training targeted on ${ATTR_LABEL[val]||val}.`);
    UI.render();
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
    UI.go('teamsheet');
  }
});

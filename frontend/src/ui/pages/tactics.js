import { UI } from "../01-core.js";


/* Tactics — team roles, position roles and field-zone intent */
Object.assign(UI, {
  p_tactics(){
    const t = myTeam();
    assignDefaultTeamRoles(t);
    t.matchPrefs = t.matchPrefs || {};
    const active = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
    const intelKey = `${G.year}-R${(G.round || 0) + 1}`;
    const latestIntel = (G.matchIntel && (G.matchIntel[intelKey] || Object.values(G.matchIntel).slice(-1)[0])) || null;
    const focus = t.matchPrefs.attackFocus || 'balanced';
    const intent = t.matchPrefs.gameIntent || 'normal';
    const offloadRisk = t.matchPrefs.offloadRisk || 'normal';
    const defStyle = t.matchPrefs.defStyle || 'structured';
    const focusOpts = [
      ['balanced','Balanced','No deliberate channel bias.'],
      ['middle','Dominate middle','More carries and metres from middles; slight handling load.'],
      ['left','Attack left','Shift more ball to your left edge; higher edge-error risk.'],
      ['right','Attack right','Shift more ball to your right edge; higher edge-error risk.'],
      ['territory','Territory','More kicking, safer possession and field-position pressure.'],
    ];
    const intentOpts = [['chase','Chase points','High-risk expansive play — more tries, more errors.'],['normal','Normal','Balanced — respond to the game state.'],['protect','Protect lead','Kick for field position and slow the game down.']];
    const offloadOpts = [['low','Low','Ball security first — fewer errors, fewer line breaks.'],['normal','Normal','Standard offload risk.'],['high','High','More offloads in contact — bigger breaks, more errors.']];
    const defOpts = [['structured','Structured','Organised line defence — disciplined, lower missed tackle rate.'],['aggressive','Aggressive','Committed tackling — big hits but risks missing tackles.']];
    const readLabel = c => c >= 80 ? 'Strong staff read' : c >= 62 ? 'Clear staff read' : c >= 45 ? 'Cautious staff read' : 'Tentative staff read';
    const opt = (role, scoreRole) => active.slice().sort((a,b)=>roleScore(b,scoreRole)-roleScore(a,scoreRole)).map(p=>
      `<option value="${p.id}" ${t.roles[role]===p.id?'selected':''}>${esc(p.name)} (${p.pos}) · ${Math.round(roleScore(p,scoreRole))}</option>`
    ).join('');
    const roleSelect = (role, label, scoreRole, hint) => {
      const chosen = G.players[t.roles[role]];
      return `<div class="tactic-role-card">
        <div class="tactic-role-head">
          <div><span>${esc(label)}</span>${chosen?`<b>${esc(chosen.name)}</b>`:'<b>Not set</b>'}</div>
          ${chosen?`<span class="ovr ${ovrCls(chosen.ovr)}">${chosen.ovr}</span>`:''}
        </div>
        <select onchange="myTeam().roles.${role}=+this.value;UI.render()">${opt(role, scoreRole)}</select>
        <p>${esc(hint)}</p>
      </div>`;
    };
    const tacticControl = (title, subtitle, opts, value, apply) => `<section class="tactic-control">
      <div class="tactic-control-copy"><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div>
      <div class="tactic-choice-grid">${opts.map(([k,l,h])=>`<button class="tactic-choice ${value===k?'active':''}" title="${esc(h)}" onclick="${apply}='${k}';UI.render()">
        <b>${esc(l)}</b><span>${esc(h)}</span>
      </button>`).join('')}</div>
    </section>`;
    const currentPlan = [
      ['Attack', (focusOpts.find(x=>x[0]===focus)||focusOpts[0])[1]],
      ['Intent', (intentOpts.find(x=>x[0]===intent)||intentOpts[1])[1]],
      ['Offloads', (offloadOpts.find(x=>x[0]===offloadRisk)||offloadOpts[1])[1]],
      ['Defence', (defOpts.find(x=>x[0]===defStyle)||defOpts[0])[1]],
    ].map(([l,v])=>`<div class="tactic-summary-chip"><span>${l}</span><b>${esc(v)}</b></div>`).join('');
    const slotRole = i => {
      const p = G.players[t.lineup[i]];
      const pos = SLOTS[i].pos;
      const roles = POSITION_ROLES[pos] || ['balanced'];
      const val = t.positionRoles[String(i)] || roles[0];
      return `<tr>
        <td><b>#${SLOTS[i].n}</b> ${POS_NAME[pos]}</td>
        <td>${p?`<span class="pos-tag">${p.pos}</span> ${esc(p.name)}`:'-'}</td>
        <td><select onchange="myTeam().positionRoles['${i}']=this.value;UI.render()">${roles.map(r=>`<option value="${r}" ${val===r?'selected':''}>${UI._roleLabel(r)}</option>`).join('')}</select></td>
        <td class="num">${p?Math.round(UI._positionRoleScore(p,val)):'-'}</td>
      </tr>`;
    };
    return `<h1 class="page">Tactics</h1>
    <p class="page-sub">Set the match identity, specialists, and positional instructions that feed the match engine.</p>
    <div class="tactics-layout">
      <div class="card tactic-plan-card">
        <div class="ts-card-head">
          <div><span class="navsep">Match Identity</span><p>These choices alter run distribution, errors, line breaks, kicking volume, and defensive risk.</p></div>
          <div class="tactic-summary">${currentPlan}</div>
        </div>
        ${tacticControl('Attack focus', 'Where the ball goes when your side has control.', focusOpts, focus, "myTeam().matchPrefs.attackFocus")}
        ${tacticControl('Game intent', 'How hard your side pushes the scoreline and tempo.', intentOpts, intent, "myTeam().matchPrefs.gameIntent")}
        ${tacticControl('Offload risk', 'How willing your carriers are to pass through contact.', offloadOpts, offloadRisk, "myTeam().matchPrefs.offloadRisk")}
        ${tacticControl('Defensive style', 'How aggressively your line commits in contact.', defOpts, defStyle, "myTeam().matchPrefs.defStyle")}
      </div>
      <div class="card tactic-report-card"><div class="ts-card-head"><div><span class="navsep">Opponent Report</span><p>Staff recommendations from the latest scout packet.</p></div></div>
        ${latestIntel ? `
          <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${readLabel(latestIntel.confidence || 50)} · Round ${latestIntel.round}</p>
          <p style="font-size:12px;line-height:1.5;margin:0 0 8px">${esc(latestIntel.recommendation || 'No recommendation recorded.')}</p>
          <div class="btnrow" style="margin:0;flex-wrap:wrap;gap:6px">
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'middle') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='middle';myTeam().matchPrefs.offloadRisk='high';UI.toast('Middle focus + high offloads applied.');UI.render()">Attack middle (+ high offloads)</button>` : ''}
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'left') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='right';UI.toast('Attack right edge applied.');UI.render()">Attack their left</button>` : ''}
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'right') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='left';UI.toast('Attack left edge applied.');UI.render()">Attack their right</button>` : ''}
            ${(latestIntel.attackChannels && latestIntel.attackChannels[0] && latestIntel.attackChannels[0].rating > 64) ? `<button class="btn sm" onclick="myTeam().matchPrefs.defStyle='aggressive';UI.toast('Aggressive defence applied — watch missed tackle rate.');UI.render()">Rush their ${latestIntel.attackChannels[0].key === 'middle' ? 'organiser' : latestIntel.attackChannels[0].key + ' edge'}</button>` : ''}
            ${(latestIntel.keyThreats && latestIntel.keyThreats.length) ? `<button class="btn sm" onclick="myTeam().matchPrefs.defStyle='aggressive';UI.toast('Aggressive defence applied to pressure key organiser.');UI.render()">Pressure playmaker</button>` : ''}
            <button class="btn sm" onclick="UI.go('inbox')">Open report</button>
          </div>` : `<p style="color:var(--muted);font-size:12px;margin:0">No opponent report yet. Advance to Wednesday of match week for staff analysis.</p>`}
      </div>
      <div class="card tactic-roles-card">
        <div class="ts-card-head"><div><span class="navsep">Specialists</span><p>Pick the players who steer the side.</p></div><button class="btn sm" onclick="UI.go('teamsheet')">Team sheet</button></div>
        <div class="tactic-role-grid">
        ${roleSelect('captain','Captain','captain','Leadership, composure, decision making and experience give a small cohesion/performance lift.')}
        ${roleSelect('goalKicker','Goal kicker','goalKicker','Takes conversions and penalty goals. If unavailable, the next best active option takes over.')}
        ${roleSelect('primaryKicker','Primary territorial kicker','kicker','Main source of long kicks, 40/20s and 20/40s.')}
        ${roleSelect('secondaryKicker','Secondary territorial kicker','kicker','Backup long-kicking option.')}
        ${roleSelect('primaryPlaymaker','Primary playmaker','playmaker','Main organiser for attacking shape.')}
        ${roleSelect('secondaryPlaymaker','Secondary playmaker','playmaker','Support organiser.')}
        </div>
      </div>
      <div class="card tactic-zone-card">
        <div class="ts-card-head"><div><span class="navsep">Field Position Plan</span><p>Safe improves control and territory. Expansive increases attack and risk.</p></div></div>
        <div class="zone-plan-grid">${FIELD_ZONES.map(([key,label])=>`<div class="zone-plan-row">
          <b>${esc(label)}</b>
          <div class="radio-row">${ZONE_PLANS.map(pl=>`<div class="opt ${(t.zoneTactics&&t.zoneTactics[key])===pl?'sel':''}" onclick="myTeam().zoneTactics['${key}']='${pl}';UI.render()">${UI._roleLabel(pl)}</div>`).join('')}</div>
        </div>`).join('')}</div>
      </div>
      <div class="card tactic-position-card">
        <div class="ts-card-head"><div><span class="navsep">Position Roles</span><p>Fine-tune how the starting XIII behave in their jersey.</p></div></div>
        <div style="overflow-x:auto"><table><thead><tr><th class="noclick">Jersey</th><th class="noclick">Player</th><th class="noclick">Role</th><th class="noclick num">Fit</th></tr></thead><tbody>
        ${Array.from({length:13},(_,i)=>slotRole(i)).join('')}
        </tbody></table></div>
      </div>
    </div>
    </div>`;
  },
  _roleLabel(v){ return String(v).replace(/([A-Z])/g,' $1').replace(/^./, c=>c.toUpperCase()); },
  _positionRoleScore(p, role){
    const fit = positionRoleFit(p, p.pos, role);
    return clamp(((fit.a+fit.d)/2)*100, 50, 110);
  },
});

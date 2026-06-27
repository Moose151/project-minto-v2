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
    const focusOpts = [
      ['balanced','Balanced','No deliberate channel bias.'],
      ['middle','Dominate middle','More carries and metres from middles; slight handling load.'],
      ['left','Attack left','Shift more ball to your left edge; higher edge-error risk.'],
      ['right','Attack right','Shift more ball to your right edge; higher edge-error risk.'],
      ['territory','Territory','More kicking, safer possession and field-position pressure.'],
    ];
    const readLabel = c => c >= 80 ? 'Strong staff read' : c >= 62 ? 'Clear staff read' : c >= 45 ? 'Cautious staff read' : 'Tentative staff read';
    const opt = (role, scoreRole) => active.slice().sort((a,b)=>roleScore(b,scoreRole)-roleScore(a,scoreRole)).map(p=>
      `<option value="${p.id}" ${t.roles[role]===p.id?'selected':''}>${esc(p.name)} (${p.pos}) · ${Math.round(roleScore(p,scoreRole))}</option>`
    ).join('');
    const roleSelect = (role, label, scoreRole, hint) => `<div class="field">
      <label>${label}</label>
      <select onchange="myTeam().roles.${role}=+this.value;UI.render()">${opt(role, scoreRole)}</select>
      <p style="color:var(--muted);font-size:11px;margin-top:4px">${esc(hint)}</p>
    </div>`;
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
    <p class="page-sub">Pick your on-field leaders and specialists, then shape how roles and field position influence the match engine.</p>
    <div class="grid2" style="margin-bottom:16px">
      <div class="card"><h2 class="sec" style="margin-top:0">Match focus</h2>
        <p style="color:var(--muted);font-size:12px;margin-bottom:10px">This changes run distribution, kick volume, line-break chance and error risk in the match engine.</p>
        <div class="radio-row">${focusOpts.map(([k,l,h])=>`<div class="opt ${focus===k?'sel':''}" title="${esc(h)}" onclick="myTeam().matchPrefs.attackFocus='${k}';UI.render()">${esc(l)}</div>`).join('')}</div>
        <p style="color:var(--muted);font-size:11px;margin-top:8px">${esc((focusOpts.find(x=>x[0]===focus)||focusOpts[0])[2])}</p>
      </div>
      <div class="card"><h2 class="sec" style="margin-top:0">Latest opponent report</h2>
        ${latestIntel ? `
          <p style="font-size:12px;color:var(--muted);margin:0 0 8px">${readLabel(latestIntel.confidence || 50)} · Round ${latestIntel.round}</p>
          <p style="font-size:12px;line-height:1.5;margin:0 0 8px">${esc(latestIntel.recommendation || 'No recommendation recorded.')}</p>
          <div class="btnrow" style="margin:0">
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'middle') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='middle';UI.toast('Match focus set to dominate middle.');UI.render()">Apply middle focus</button>` : ''}
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'left') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='right';UI.toast('Match focus set to attack right edge.');UI.render()">Attack their left</button>` : ''}
            ${(latestIntel.weakChannels && latestIntel.weakChannels[0] && latestIntel.weakChannels[0].key === 'right') ? `<button class="btn sm primary" onclick="myTeam().matchPrefs.attackFocus='left';UI.toast('Match focus set to attack left edge.');UI.render()">Attack their right</button>` : ''}
            <button class="btn sm" onclick="UI.go('inbox')">Open report</button>
          </div>` : `<p style="color:var(--muted);font-size:12px;margin:0">No opponent report yet. Advance to Wednesday of match week for staff analysis.</p>`}
      </div>
    </div>
    <div class="grid2">
      <div class="card"><h2 class="sec" style="margin-top:0">Team roles</h2>
        ${roleSelect('captain','Captain','captain','Leadership, composure, decision making and experience give a small cohesion/performance lift.')}
        ${roleSelect('goalKicker','Goal kicker','goalKicker','Takes conversions and penalty goals. If unavailable, the next best active option takes over.')}
        ${roleSelect('primaryKicker','Primary territorial kicker','kicker','Main source of long kicks, 40/20s and 20/40s.')}
        ${roleSelect('secondaryKicker','Secondary territorial kicker','kicker','Backup long-kicking option.')}
        ${roleSelect('primaryPlaymaker','Primary playmaker','playmaker','Main organiser for attacking shape.')}
        ${roleSelect('secondaryPlaymaker','Secondary playmaker','playmaker','Support organiser.')}
      </div>
      <div class="card"><h2 class="sec" style="margin-top:0">Field position plan</h2>
        <p style="color:var(--muted);font-size:12px;margin-bottom:10px">Safe improves control and kicking territory slightly. Expansive increases attack but carries more risk.</p>
        ${FIELD_ZONES.map(([key,label])=>`<div class="field"><label>${label}</label><div class="radio-row">
          ${ZONE_PLANS.map(pl=>`<div class="opt ${(t.zoneTactics&&t.zoneTactics[key])===pl?'sel':''}" onclick="myTeam().zoneTactics['${key}']='${pl}';UI.render()">${UI._roleLabel(pl)}</div>`).join('')}
        </div></div>`).join('')}
      </div>
    </div>
    <div class="card" style="padding:6px;overflow-x:auto;margin-top:16px"><h2 class="sec" style="margin:8px 10px">Position roles</h2>
      <table><thead><tr><th class="noclick">Jersey</th><th class="noclick">Player</th><th class="noclick">Role</th><th class="noclick num">Fit</th></tr></thead><tbody>
      ${Array.from({length:13},(_,i)=>slotRole(i)).join('')}
      </tbody></table>
    </div>`;
  },
  _roleLabel(v){ return String(v).replace(/([A-Z])/g,' $1').replace(/^./, c=>c.toUpperCase()); },
  _positionRoleScore(p, role){
    const fit = positionRoleFit(p, p.pos, role);
    return clamp(((fit.a+fit.d)/2)*100, 50, 110);
  },
});

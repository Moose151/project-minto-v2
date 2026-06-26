'use strict';

/* Tactics — team roles, position roles and field-zone intent */
Object.assign(UI, {
  p_tactics(){
    const t = myTeam();
    assignDefaultTeamRoles(t);
    const active = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
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

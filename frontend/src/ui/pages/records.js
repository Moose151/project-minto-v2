'use strict';

/* Records — league-wide and club-scoped player records */
Object.assign(UI, {
  _recordClub: 'all',
  _recView: 'career',

  p_records(){
    const players = Object.values(G.players || {});
    const clubOptions = [['all','All clubs']].concat(G.teams.map(t=>[String(t.id), teamName(t)]));
    const selectedClubId = UI._recordClub === 'all' ? null : +UI._recordClub;

    const playerLink = p => p
      ? `<span class="hist-player" onclick="UI.playerModal(${p.id})">${playerAvatar(p, 26)}<span>${esc(p.name)}</span></span>`
      : '—';
    const teamLink = teamId => {
      const t = G.teams[teamId];
      return t ? `<span class="team-spine" style="background:${t.c1}"></span><span onclick="UI.teamModal(${t.id})" style="cursor:pointer;text-decoration:underline">${esc(t.nick)}</span>` : '—';
    };
    const fmt = (key, val, games) => key === 'avg'
      ? (games ? Number(val).toFixed(1) : '-')
      : Math.round(val || 0).toLocaleString();

    const topRows = (items, key, label, opts={}) => {
      const rows = items
        .filter(x=>x && x.val > 0)
        .sort((a,b)=>b.val-a.val || String(a.name||'').localeCompare(String(b.name||'')))
        .slice(0, opts.limit || 10);
      return `<div class="card" style="padding:6px;overflow-x:auto">
        <h2 class="sec" style="margin:8px 10px">${esc(label)}</h2>
        <table><thead><tr><th class="noclick"></th><th class="noclick">Player</th>${opts.showClub===false?'':'<th class="noclick">Club</th>'}<th class="noclick num">${esc(opts.valueLabel || label)}</th></tr></thead><tbody>
          ${rows.map((x,i)=>`<tr>
            <td class="lpos">${i+1}</td>
            <td>${playerLink(x.p)}</td>
            ${opts.showClub===false?'':`<td>${x.teamId != null ? teamLink(x.teamId) : esc(x.teamName || '—')}</td>`}
            <td class="num"><b>${fmt(key, x.val, x.games)}</b></td>
          </tr>`).join('') || `<tr><td colspan="${opts.showClub===false?3:4}" style="color:var(--muted)">No records yet.</td></tr>`}
        </tbody></table>
      </div>`;
    };

    const careerItems = key => players.map(p=>{
      const c = p.career || {};
      const val = key === 'avg' ? (c.games ? (c.rSum || 0) / c.games : 0) : c[key] || 0;
      return {p, name:p.name, val, games:c.games || 0, teamId:(G.teams.find(t=>t.players.includes(p.id))||{}).id};
    });

    const seasonItems = key => {
      const out = [];
      for(const p of players){
        for(const h of p.history || []){
          const val = key === 'avg' ? Number(h.avg || 0) : h[key] || 0;
          out.push({p, name:p.name, val, games:h.g || 0, teamName:`${h.team} · ${h.year}`});
        }
      }
      return out;
    };

    const clubItems = key => {
      const out = [];
      for(const p of players){
        for(const b of Object.values(p.clubStats || {})){
          if(!b || !b.games) continue;
          if(selectedClubId != null && b.teamId !== selectedClubId) continue;
          const val = key === 'avg' ? (b.games ? (b.rSum || 0) / b.games : 0) : b[key] || 0;
          out.push({p, name:p.name, val, games:b.games || 0, teamId:b.teamId, teamName:b.teamName});
        }
      }
      return out;
    };

    const tabs = [['career','Career Records'],['season','Single-Season Records'],['club','Club Records']];
    const selectedTeam = selectedClubId == null ? null : G.teams[selectedClubId];

    let content = '';
    if(UI._recView === 'career'){
      content = `<h2 class="sec">League Career Records</h2>
        <div class="grid3">
          ${topRows(careerItems('games'), 'games', 'Career Games')}
          ${topRows(careerItems('tries'), 'tries', 'Career Tries')}
          ${topRows(careerItems('points'), 'points', 'Career Points')}
          ${topRows(careerItems('ta'), 'ta', 'Career Try Assists')}
          ${topRows(careerItems('tk'), 'tk', 'Career Tackles')}
          ${topRows(careerItems('fdo'), 'fdo', 'Career Forced Drop-Outs')}
        </div>`;
    } else if(UI._recView === 'season'){
      content = `<h2 class="sec">Single-Season Records</h2>
        <div class="grid3">
          ${topRows(seasonItems('t'), 't', 'Season Tries')}
          ${topRows(seasonItems('ta'), 'ta', 'Season Try Assists')}
          ${topRows(seasonItems('m'), 'm', 'Season Run Metres')}
          ${topRows(seasonItems('tk'), 'tk', 'Season Tackles')}
          ${topRows(seasonItems('fpts'), 'fpts', 'Season Fantasy Points')}
          ${topRows(seasonItems('avg'), 'avg', 'Season Avg Rating', {valueLabel:'Avg'})}
        </div>`;
    } else {
      content = `<div class="card history-controls">
          <div class="field"><label>Filter by club</label><select onchange="UI._recordClub=this.value;UI.render()">
            ${clubOptions.map(([v,l])=>`<option value="${v}" ${UI._recordClub===v?'selected':''}>${esc(l)}</option>`).join('')}
          </select></div>
        </div>
        <h2 class="sec">${selectedTeam ? esc(selectedTeam.nick) : 'All Clubs'} — Club Records</h2>
        <div class="grid3">
          ${topRows(clubItems('games'), 'games', 'Club Games')}
          ${topRows(clubItems('tries'), 'tries', 'Club Tries')}
          ${topRows(clubItems('points'), 'points', 'Club Points')}
          ${topRows(clubItems('ta'), 'ta', 'Club Try Assists')}
          ${topRows(clubItems('tk'), 'tk', 'Club Tackles')}
          ${topRows(clubItems('fdo'), 'fdo', 'Club Forced Drop-Outs')}
        </div>`;
    }

    return `<h1 class="page">Records</h1>
      <p class="page-sub">League-wide player records and club-scoped records from the current save.</p>
      <div class="btnrow" style="margin-bottom:14px">
        ${tabs.map(([k,l])=>`<button class="btn ${UI._recView===k?'primary':''}" onclick="UI._recView='${k}';UI.render()">${l}</button>`).join('')}
      </div>
      ${content}`;
  },
});

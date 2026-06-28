import { UI } from "../01-core.js";


Object.assign(UI, {
  _ladderView: 'standings',

  p_ladder(){
    const lad = ladder();
    const finalsSpots = G.teams.length >= 8 ? 8 : 4;
    const currentByeRound = (() => {
      if(!G.byes) return null;
      for(let r = G.round; r >= 0; r--){
        if(G.byes[r] && G.byes[r].length) return r;
      }
      return null;
    })();
    const currentByeTeams = currentByeRound != null ? (G.byes[currentByeRound] || []) : [];

    // Home / Away record per team
    const homeAway = {};
    for(const t of G.teams) homeAway[t.id] = { hw:0, hl:0, hd:0, aw:0, al:0, ad:0 };
    for(const round of G.fixtures) for(const m of round){
      if(!m.played) continue;
      const hr = homeAway[m.h], ar = homeAway[m.a];
      if(!hr || !ar) continue;
      if(m.hs > m.as){ hr.hw++; ar.al++; }
      else if(m.as > m.hs){ hr.hl++; ar.aw++; }
      else { hr.hd++; ar.ad++; }
    }

    const views = [['standings','Standings'],['home','Home/Away']];

    const standingsTable = `<div class="card" style="padding:6px;overflow-x:auto"><table>
      <thead><tr>
        <th class="noclick"></th>
        <th class="noclick">Club</th>
        <th class="noclick num">P</th>
        <th class="noclick num">W</th>
        <th class="noclick num">D</th>
        <th class="noclick num">L</th>
        <th class="noclick num">PF</th>
        <th class="noclick num">PA</th>
        <th class="noclick num">Diff</th>
        <th class="noclick num">Pts</th>
        <th class="noclick">Form</th>
        <th class="noclick num" style="color:var(--muted);font-size:10px">Win%</th>
      </tr></thead>
      <tbody>${lad.map((r, i) => {
        const t = G.teams[r.id];
        const diff = r.pf - r.pa;
        const onCurrentBye = currentByeTeams.includes(t.id);
        const winPct = r.p > 0 ? Math.round((r.w + r.d * 0.5) / r.p * 100) : 0;
        const pctColor = winPct >= 60 ? 'var(--green)' : winPct < 40 ? 'var(--red)' : 'var(--muted)';
        return `<tr class="${i === finalsSpots - 1 ? 'finals-line' : ''}" style="${t.id === G.coach.teamId ? 'background:var(--accent-a06)' : ''}">
          <td class="lpos">${i + 1}</td>
          <td class="click" onclick="UI.teamModal(${t.id})" style="cursor:pointer">
            ${teamLogo(t, 28)} <b>${esc(teamName(t))}</b>${onCurrentBye ? ` <span class="pos-tag" style="font-size:9px;color:var(--accent);border-color:var(--accent)">BYE</span>` : ''}
          </td>
          <td class="num">${r.p}</td>
          <td class="num">${r.w}</td>
          <td class="num">${r.d}</td>
          <td class="num">${r.l}</td>
          <td class="num">${r.pf}</td>
          <td class="num">${r.pa}</td>
          <td class="num" style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'}">${diff > 0 ? '+' : ''}${diff}</td>
          <td class="num"><b>${r.pts}</b></td>
          <td>${r.form.slice(-5).map(f => `<span class="form-dot ${f}"></span>`).join('')}</td>
          <td class="num" style="color:${pctColor};font-size:11px">${r.p > 0 ? winPct + '%' : '—'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;

    const homeAwayTable = `<div class="card" style="padding:6px;overflow-x:auto"><table>
      <thead><tr>
        <th class="noclick"></th>
        <th class="noclick">Club</th>
        <th class="noclick num">Pts</th>
        <th class="noclick num" colspan="3" style="border-left:1px solid var(--line)">Home</th>
        <th class="noclick num" colspan="3" style="border-left:1px solid var(--line)">Away</th>
      </tr>
      <tr>
        <th class="noclick"></th><th class="noclick"></th><th class="noclick num"></th>
        <th class="noclick num" style="border-left:1px solid var(--line);color:var(--muted);font-size:10px">W</th>
        <th class="noclick num" style="color:var(--muted);font-size:10px">D</th>
        <th class="noclick num" style="color:var(--muted);font-size:10px">L</th>
        <th class="noclick num" style="border-left:1px solid var(--line);color:var(--muted);font-size:10px">W</th>
        <th class="noclick num" style="color:var(--muted);font-size:10px">D</th>
        <th class="noclick num" style="color:var(--muted);font-size:10px">L</th>
      </tr></thead>
      <tbody>${lad.map((r, i) => {
        const t = G.teams[r.id];
        const ha = homeAway[t.id] || {};
        const homeGames = (ha.hw || 0) + (ha.hl || 0) + (ha.hd || 0);
        const awayGames = (ha.aw || 0) + (ha.al || 0) + (ha.ad || 0);
        const hPct = homeGames > 0 ? Math.round(ha.hw / homeGames * 100) : null;
        const aPct = awayGames > 0 ? Math.round(ha.aw / awayGames * 100) : null;
        const hColor = hPct != null ? (hPct >= 60 ? 'var(--green)' : hPct < 40 ? 'var(--red)' : 'var(--muted)') : 'var(--dim)';
        const aColor = aPct != null ? (aPct >= 60 ? 'var(--green)' : aPct < 40 ? 'var(--red)' : 'var(--muted)') : 'var(--dim)';
        return `<tr class="${i === finalsSpots - 1 ? 'finals-line' : ''}" style="${t.id === G.coach.teamId ? 'background:var(--accent-a06)' : ''}">
          <td class="lpos">${i + 1}</td>
          <td class="click" onclick="UI.teamModal(${t.id})" style="cursor:pointer">${teamLogo(t, 24)} <b>${esc(teamName(t))}</b></td>
          <td class="num"><b>${r.pts}</b></td>
          <td class="num" style="border-left:1px solid var(--line);color:${hColor};font-weight:700">${ha.hw || 0}</td>
          <td class="num" style="color:var(--muted)">${ha.hd || 0}</td>
          <td class="num" style="color:var(--muted)">${ha.hl || 0}</td>
          <td class="num" style="border-left:1px solid var(--line);color:${aColor};font-weight:700">${ha.aw || 0}</td>
          <td class="num" style="color:var(--muted)">${ha.ad || 0}</td>
          <td class="num" style="color:var(--muted)">${ha.al || 0}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;

    return `<h1 class="page">Ladder</h1>
    <p class="page-sub">${esc(G.config.leagueName)} · ${G.year} · top ${finalsSpots} qualify for finals${currentByeTeams.length ? ` · BYE round ${currentByeRound + 1} awarded 2 pts` : ''}</p>
    <div class="btnrow" style="margin-bottom:12px">
      ${views.map(([k, l]) => `<button class="btn ${UI._ladderView === k ? 'primary' : ''}" onclick="UI._ladderView='${k}';UI.render()">${l}</button>`).join('')}
    </div>
    ${UI._ladderView === 'standings' ? standingsTable : homeAwayTable}`;
  }
});

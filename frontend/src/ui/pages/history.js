'use strict';

/* History — season-by-season honour roll with expandable year detail */
Object.assign(UI, {
  _histExpanded: null,
  _histSort: 'newest',
  _histFilter: 'all',
  _histSearch: '',

  p_history(){
    const query = (UI._histSearch || '').trim().toLowerCase();
    const matchesQuery = h => {
      if(!query) return true;
      const pt = G.teams[h.premier], mt = h.minor != null ? G.teams[h.minor] : null;
      const coachYearName = h.coachYear ? (h.coachYear.name || h.coachYear.coach || h.coachYear) : null;
      const gfH = h.gfScore ? G.teams[h.gfScore.h] : null;
      const gfA = h.gfScore ? G.teams[h.gfScore.a] : null;
      const bits = [
        h.year,
        pt && teamName(pt), pt && pt.nick,
        mt && teamName(mt), mt && mt.nick,
        gfH && teamName(gfH), gfA && teamName(gfA),
        h.poty && h.poty.name,
        h.rookie && h.rookie.name,
        h.topTry && h.topTry.name,
        h.coachYear && (h.coachYear.name || h.coachYear.coach || h.coachYear),
      ].filter(Boolean).join(' ').toLowerCase();
      return bits.includes(query);
    };
    const passesFilter = h => {
      if(UI._histFilter === 'myPremiers') return h.premier === G.coach.teamId;
      if(UI._histFilter === 'myMinor') return h.minor === G.coach.teamId;
      if(UI._histFilter === 'myTop4') return h.myPos && h.myPos <= 4;
      if(UI._histFilter === 'myBottom4') return h.myPos && h.myPos > G.teams.length - 4;
      if(UI._histFilter === 'gf') return h.gfScore && (h.gfScore.h === G.coach.teamId || h.gfScore.a === G.coach.teamId);
      return true;
    };
    const sortVal = h => {
      if(UI._histSort === 'oldest') return h.year;
      if(UI._histSort === 'myFinish') return h.myPos || 999;
      if(UI._histSort === 'premier') return (G.teams[h.premier] ? teamName(G.teams[h.premier]) : '').toLowerCase();
      return -h.year;
    };
    const cmp = (a,b) => {
      const av = sortVal(a), bv = sortVal(b);
      if(typeof av === 'string') return av.localeCompare(bv);
      return av - bv;
    };
    const history = (G.history || []).filter(h=>matchesQuery(h) && passesFilter(h)).sort(cmp);
    const playerLink = p => {
      if(!p) return '—';
      const live = G.players[p.id];
      const avatar = live ? playerAvatar(live, 26) : '';
      return `<span class="hist-player" onclick="event.stopPropagation();UI.playerModal(${p.id})">${avatar}<span>${esc(p.name)}</span></span>`;
    };

    const rows = history.map(h => {
      const pt = G.teams[h.premier], mt = h.minor != null ? G.teams[h.minor] : null;
      const coachYearName = h.coachYear ? (h.coachYear.name || h.coachYear.coach || h.coachYear) : null;
      const isOpen = UI._histExpanded === h.year;
      const isMine = h.myPos != null;

      const summaryRow = `<tr class="click" onclick="UI._histExpanded=UI._histExpanded===${h.year}?null:${h.year};UI.render()" style="cursor:pointer">
        <td><b>${h.year}</b></td>
        <td>${pt ? `<span class="team-spine" style="background:${pt.c1}"></span><span onclick="event.stopPropagation();UI.teamModal(${h.premier})" style="cursor:pointer;text-decoration:underline">${esc(teamName(pt))}</span>` : '—'}</td>
        <td>${mt ? `<span onclick="event.stopPropagation();UI.teamModal(${h.minor})" style="cursor:pointer;text-decoration:underline">${esc(mt.nick)}</span>` : '—'}</td>
        <td>${playerLink(h.poty)}</td>
        <td>${playerLink(h.rookie)}</td>
        <td class="num">${isMine ? ord(h.myPos) : '—'}</td>
        <td style="color:var(--muted);font-size:12px">${isOpen ? '▲' : '▼'}</td>
      </tr>`;

      if(!isOpen) return summaryRow;

      // Expanded detail row
      const gfLine = h.gfScore
        ? `${esc(G.teams[h.gfScore.h].nick)} ${h.gfScore.hs}–${h.gfScore.as} ${esc(G.teams[h.gfScore.a].nick)}`
        : '—';

      const ladRows = (h.ladder || []).map((r, i) => {
        const lt = G.teams[r.id];
        const isMyTeam = lt && lt.id === G.coach.teamId;
        return lt ? `<tr style="${isMyTeam?'background:rgba(210,165,62,.08)':''}">
          <td class="lpos">${i+1}</td>
          <td><span class="team-spine" style="background:${lt.c1}"></span>${esc(lt.nick)}</td>
          <td class="num">${r.pts}pt</td>
        </tr>` : '';
      }).join('');

      const detailRow = `<tr><td colspan="7" style="padding:0">
        <div style="background:var(--card2);border-radius:6px;margin:2px 0 8px;padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;margin-bottom:6px">Awards</div>
            <div style="font-size:12px;margin:3px 0"><span style="color:var(--muted)">POTY:</span> ${h.poty ? `${playerLink(h.poty)}${h.poty.votes?' ('+h.poty.votes+' votes)':''}` : '—'}</div>
            <div style="font-size:12px;margin:3px 0"><span style="color:var(--muted)">Rookie:</span> ${playerLink(h.rookie)}</div>
            <div style="font-size:12px;margin:3px 0"><span style="color:var(--muted)">Top try scorer:</span> ${h.topTry ? `${playerLink(h.topTry)}${h.topTry.tries?' ('+h.topTry.tries+' tries)':''}` : '—'}</div>
            <div style="font-size:12px;margin:3px 0"><span style="color:var(--muted)">Coach of year:</span> ${coachYearName ? esc(coachYearName) : '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;margin-bottom:6px">Grand Final</div>
            <div style="font-size:13px;font-weight:600">${gfLine}</div>
            ${pt ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">Premiers: <span onclick="UI.teamModal(${h.premier})" style="cursor:pointer;text-decoration:underline">${esc(teamName(pt))}</span></div>` : ''}
            ${mt ? `<div style="font-size:12px;color:var(--muted)">Minor premiers: <span onclick="UI.teamModal(${h.minor})" style="cursor:pointer;text-decoration:underline">${esc(mt.nick)}</span></div>` : ''}
            ${isMine ? `<div style="font-size:12px;margin-top:8px;color:${h.myPos<=4?'var(--green)':h.myPos>G.teams.length*.7?'var(--red)':'var(--ink)'}">${esc(G.coach.name)}: finished ${ord(h.myPos)}</div>` : ''}
          </div>
          <div>
            <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;margin-bottom:6px">Ladder</div>
            <table style="width:100%"><tbody>${ladRows || '<tr><td colspan="3" style="color:var(--muted)">—</td></tr>'}</tbody></table>
          </div>
        </div>
      </td></tr>`;

      return summaryRow + detailRow;
    }).join('');

    return `<h1 class="page">History</h1>
    <p class="page-sub">Honour roll of the ${esc(G.config.leagueName)}. Tap a year to expand details.</p>
    <div class="card history-controls">
      <div class="field"><label>Search history</label><input type="search" value="${esc(UI._histSearch||'')}" placeholder="Team, player, coach, year..." oninput="UI._histSearch=this.value;UI.render()"></div>
      <div class="field"><label>Sort</label><select onchange="UI._histSort=this.value;UI.render()">
        ${[
          ['newest','Newest first'],['oldest','Oldest first'],['myFinish','Best coach finish'],['premier','Premier name']
        ].map(([v,l])=>`<option value="${v}" ${UI._histSort===v?'selected':''}>${l}</option>`).join('')}
      </select></div>
      <div class="field"><label>Filter</label><select onchange="UI._histFilter=this.value;UI.render()">
        ${[
          ['all','All seasons'],['myPremiers','My premierships'],['myMinor','My minor premierships'],['gf','My grand finals'],['myTop4','My top-4 seasons'],['myBottom4','My bottom-4 seasons']
        ].map(([v,l])=>`<option value="${v}" ${UI._histFilter===v?'selected':''}>${l}</option>`).join('')}
      </select></div>
      <button class="btn sm" onclick="UI._histSearch='';UI._histSort='newest';UI._histFilter='all';UI.render()">Clear</button>
    </div>
    <div class="card" style="padding:6px;overflow-x:auto">
      <table><thead><tr>
        <th class="noclick">Year</th>
        <th class="noclick">Premiers</th>
        <th class="noclick">Minor premiers</th>
        <th class="noclick">Player of the Year</th>
        <th class="noclick">Rookie of the Year</th>
        <th class="noclick num">You</th>
        <th class="noclick"></th>
      </tr></thead><tbody>
      ${rows || '<tr><td colspan="7" style="color:var(--muted)">No completed seasons match those filters.</td></tr>'}
      </tbody></table>
    </div>`;
  }
});

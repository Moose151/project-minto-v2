import { UI } from "../01-core.js";


Object.assign(UI, {
  _fantasyPos: 'all',
  _fantasySort: 'fpts',
  _fantasyTab: 'totr',

  p_fantasy(){
    const positions = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'];
    const sortOptions = [
      ['fpts','Total FP'],['avg','Avg FP'],['g','Games'],['t','Tries'],['ta','Try assists'],
      ['k4020','40/20s'],['fdo','Forced drop-outs'],['runs','Runs'],['tk','Tackles'],['m','Run metres'],['name','Name']
    ];
    const all = Object.values(G.players).filter(p => p.s.g > 0);

    // Build last completed round's full player stats
    const roundScores = [];
    let totrRound = -1;
    for(let r = (G.phase === 'regular' ? G.round - 1 : G.fixtures.length - 1); r >= 0; r--){
      const games = G.fixtures[r];
      if(!games || !games.every(m => m.played)) continue;
      totrRound = r;
      for(const m of games){
        if(!m.det) continue;
        for(const side of [m.det.h, m.det.a]){
          for(const [id, line] of Object.entries(side)){
            const p = G.players[+id];
            if(p && line.fp != null) roundScores.push({ p, line });
          }
        }
      }
      break;
    }
    roundScores.sort((a, b) => b.line.fp - a.line.fp);

    // Pick best performer per position slot for the TOTR pitch
    const TOTR_SLOTS = [
      { pos: 'FB', n: 1 },
      { pos: 'WG', n: 2 },
      { pos: 'CE', n: 2 },
      { pos: 'FE', n: 1 },
      { pos: 'HB', n: 1 },
      { pos: 'PR', n: 2 },
      { pos: 'HK', n: 1 },
      { pos: 'SR', n: 2 },
      { pos: 'LK', n: 1 },
    ];
    const usedIds = new Set();
    const totrTeam = {};
    for(const { pos, n } of TOTR_SLOTS){
      totrTeam[pos] = [];
      for(const { p, line } of roundScores){
        if(usedIds.has(p.id)) continue;
        if(p.pos === pos || p.pos2 === pos){
          totrTeam[pos].push({ p, line });
          usedIds.add(p.id);
          if(totrTeam[pos].length >= n) break;
        }
      }
    }

    const totrChip = (entry) => {
      if(!entry) return `<div style="width:88px;height:88px;border-radius:8px;background:rgba(255,255,255,.04);border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:10px">—</div>`;
      const { p, line } = entry;
      const t = G.teams.find(t => t.players.includes(p.id));
      const color = t ? t.c1 : 'var(--accent)';
      const fpColor = line.fp >= 70 ? 'var(--green)' : line.fp >= 50 ? 'var(--accent)' : 'var(--ink)';
      return `<div class="click" onclick="UI.playerModal(${p.id})" style="width:88px;text-align:center;cursor:pointer">
        <div style="position:relative;display:inline-block">
          ${playerAvatar(p, 44)}
          <span style="position:absolute;bottom:-4px;right:-4px;background:${fpColor};color:#000;font-size:11px;font-weight:900;font-family:var(--disp);padding:1px 5px;border-radius:10px;min-width:22px">${line.fp}</span>
        </div>
        <div style="font-size:10px;font-weight:700;margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:88px">${esc(p.name.split(' ').slice(-1)[0])}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;margin-top:1px">
          <span class="pos-tag" style="font-size:8px;padding:0 4px">${p.pos}</span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>
        </div>
      </div>`;
    };

    const pitchRow = (players) => `<div style="display:flex;justify-content:center;gap:12px;margin:6px 0">${players.map(e => totrChip(e)).join('')}</div>`;

    const totrPitch = totrRound >= 0 ? `
      <div style="background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:12px;padding:16px 12px;margin-bottom:6px">
        <div style="text-align:center;font-size:10px;color:var(--accent);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px">Round ${totrRound + 1} — Team of the Round</div>
        ${pitchRow(totrTeam['FB'])}
        ${pitchRow(totrTeam['WG'])}
        ${pitchRow(totrTeam['CE'])}
        ${pitchRow([...totrTeam['FE'], ...totrTeam['HB']])}
        ${pitchRow([...(totrTeam['PR'][0] ? [totrTeam['PR'][0]] : []), ...totrTeam['HK'], ...(totrTeam['PR'][1] ? [totrTeam['PR'][1]] : [])])}
        ${pitchRow(totrTeam['SR'])}
        ${pitchRow(totrTeam['LK'])}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px;margin-bottom:16px">
        <span style="font-size:11px;color:var(--muted)">Best performer per position · FP shown on badge</span>
        <button class="btn sm" onclick="UI._fantasyTab='totr_table';UI.render()">Full scores →</button>
      </div>` : `<p style="color:var(--muted);text-align:center;padding:24px 0">No completed rounds yet.</p>`;

    const totrTable = totrRound >= 0 ? `
      <h2 class="sec">Round ${totrRound + 1} — Full Scores</h2>
      <div class="card" style="padding:6px;overflow-x:auto;margin-bottom:16px">
        <table><thead><tr>
          <th class="noclick"></th><th class="noclick">Player</th><th class="noclick">Club</th>
          <th class="noclick num">T</th><th class="noclick num">TA</th><th class="noclick num">G</th>
          <th class="noclick num">FG</th><th class="noclick num">40/20</th><th class="noclick num">FDO</th>
          <th class="noclick num">Runs</th><th class="noclick num">Tk</th><th class="noclick num">Mtrs</th><th class="noclick num">Err</th>
          <th class="noclick num">FP</th>
        </tr></thead><tbody>
        ${roundScores.slice(0, 20).map(({ p, line }, i) => {
          const t = G.teams.find(t => t.players.includes(p.id));
          return `<tr class="click" onclick="UI.playerModal(${p.id})">
            <td class="lpos">${i + 1}</td>
            <td><div class="player-cell">${playerAvatar(p, 32)}<div><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></div></div></td>
            <td>${t ? `<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}` : '—'}</td>
            <td class="num">${line.t || 0}</td><td class="num">${line.ta || 0}</td><td class="num">${line.ga ? `${line.gl}/${line.ga}` : (line.gl || 0)}</td>
            <td class="num">${line.fg || 0}</td><td class="num">${line.k4020 || 0}</td><td class="num">${line.fdo || 0}</td>
            <td class="num">${line.runs || 0}</td><td class="num">${line.tk || 0}</td><td class="num">${line.m || 0}</td><td class="num">${line.err || 0}</td>
            <td class="num"><b style="color:${line.fp >= 70 ? 'var(--green)' : line.fp >= 50 ? 'var(--accent)' : 'var(--ink)'}">${line.fp}</b></td>
          </tr>`;
        }).join('')}
        </tbody></table>
      </div>` : '';

    const fantasyVal = p => {
      if(UI._fantasySort === 'avg') return p.s.g ? (p.s.fpts || 0) / p.s.g : 0;
      if(UI._fantasySort === 'name') return p.name;
      return p.s[UI._fantasySort] || 0;
    };
    const seasonPlayers = all
      .filter(p => UI._fantasyPos === 'all' || p.pos === UI._fantasyPos)
      .sort((a, b) => {
        const av = fantasyVal(a), bv = fantasyVal(b);
        if(typeof av === 'string') return av.localeCompare(bv);
        return bv - av;
      })
      .slice(0, 25);

    const seasonTable = `<h2 class="sec">Season Leaders</h2>
      <div class="card" style="padding:6px">
        <div class="btnrow" style="margin:4px 0 8px;flex-wrap:wrap;gap:6px">
          <select style="max-width:180px" onchange="UI._fantasySort=this.value;UI.render()">
            ${sortOptions.map(([v, l]) => `<option value="${v}" ${UI._fantasySort === v ? 'selected' : ''}>Sort: ${l}</option>`).join('')}
          </select>
          ${positions.map(pos => `<button class="btn sm ${UI._fantasyPos === pos ? 'primary' : ''}" onclick="UI._fantasyPos='${pos}';UI.render()">${pos === 'all' ? 'All' : pos}</button>`).join('')}
          ${(UI._fantasyPos !== 'all' || UI._fantasySort !== 'fpts') ? `<button class="btn sm" onclick="UI._fantasyPos='all';UI._fantasySort='fpts';UI.render()">Reset</button>` : ''}
        </div>
        <table><thead><tr>
          <th class="noclick"></th><th class="noclick">Player</th><th class="noclick">Club</th>
          <th class="noclick num">G</th><th class="noclick num">Total FP</th><th class="noclick num">Avg FP</th>
        </tr></thead><tbody>
        ${seasonPlayers.map((p, i) => {
          const t = G.teams.find(t => t.players.includes(p.id));
          const avg = p.s.g ? ((p.s.fpts || 0) / p.s.g).toFixed(1) : '—';
          return `<tr class="click" onclick="UI.playerModal(${p.id})">
            <td class="lpos">${i + 1}</td>
            <td><div class="player-cell">${playerAvatar(p, 34)}<div><b>${nationalityFlag(p.nationality)} ${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></div></div></td>
            <td>${t ? `<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}` : '—'}</td>
            <td class="num">${p.s.g}</td>
            <td class="num"><b>${p.s.fpts || 0}</b></td>
            <td class="num">${avg}</td>
          </tr>`;
        }).join('')}
        ${seasonPlayers.length === 0 ? '<tr><td colspan="6" style="color:var(--muted)">No players match this filter.</td></tr>' : ''}
        </tbody></table>
      </div>`;

    const tabs = [['totr','Team of Round'],['totr_table','Round Scores'],['season','Season Ladder']];

    return `<h1 class="page">Fantasy</h1>
    <p class="page-sub">${G.year} · Try 4pts · Try assist 2pts · Goal 2pts · FG 2pts · 40/20 3pts · FDO 2pts · 10tk 1pt · 25m 1pt · 8 runs 1pt · Error −2pts</p>
    <div class="btnrow" style="margin-bottom:14px">
      ${tabs.map(([k, l]) => `<button class="btn ${UI._fantasyTab === k ? 'primary' : ''}" onclick="UI._fantasyTab='${k}';UI.render()">${l}</button>`).join('')}
    </div>
    ${UI._fantasyTab === 'totr' ? totrPitch : ''}
    ${UI._fantasyTab === 'totr_table' ? totrTable : ''}
    ${UI._fantasyTab === 'season' ? seasonTable : ''}`;
  }
});

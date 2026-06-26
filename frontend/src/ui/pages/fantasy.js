'use strict';

/* Fantasy scoring page — Team of the Round + season leaderboard */
Object.assign(UI, {
  _fantasyPos: 'all',
  _fantasySort: 'fpts',

  p_fantasy(){
    const positions = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'];
    const sortOptions = [
      ['fpts','Total FP'],['avg','Avg FP'],['g','Games'],['t','Tries'],['ta','Try assists'],
      ['k4020','40/20s'],['fdo','Forced drop-outs'],['runs','Runs'],['tk','Tackles'],['m','Run metres'],['name','Name']
    ];
    const all = Object.values(G.players).filter(p=>p.s.g > 0);
    const fantasyVal = p => {
      if(UI._fantasySort === 'avg') return p.s.g ? (p.s.fpts||0)/p.s.g : 0;
      if(UI._fantasySort === 'name') return p.name;
      return p.s[UI._fantasySort] || 0;
    };
    const cmpFantasy = (a,b) => {
      const av = fantasyVal(a), bv = fantasyVal(b);
      if(typeof av === 'string') return av.localeCompare(bv);
      return bv - av;
    };
    const season = all
      .filter(p=>UI._fantasyPos === 'all' || p.pos === UI._fantasyPos)
      .sort(cmpFantasy)
      .slice(0, 25);

    // find last completed regular-season round
    let totrHtml = '';
    for(let r = (G.phase==='regular' ? G.round-1 : G.fixtures.length-1); r >= 0; r--){
      const games = G.fixtures[r];
      if(!games || !games.every(m=>m.played)) continue;
      // gather all player fp from this round
      const scores = [];
      for(const m of games){
        if(!m.det) continue;
        for(const side of [m.det.h, m.det.a]){
          for(const [id, line] of Object.entries(side)){
            const p = G.players[+id];
            if(p && line.fp != null) scores.push({p, line});
          }
        }
      }
      scores.sort((a,b)=>b.line.fp - a.line.fp);
      const top10 = scores.slice(0, 10);
      totrHtml = `<div class="card" style="margin-bottom:12px">
        <h2 class="sec" style="margin-top:0">Team of Round ${r+1}</h2>
        <table><thead><tr>
          <th class="noclick"></th><th class="noclick">Player</th><th class="noclick">Club</th>
          <th class="noclick num">T</th><th class="noclick num">TA</th><th class="noclick num">G/A</th>
          <th class="noclick num">FG</th><th class="noclick num">40/20</th><th class="noclick num">FDO</th><th class="noclick num">Runs</th><th class="noclick num">Tk</th><th class="noclick num">Mtrs</th><th class="noclick num">Err</th>
          <th class="noclick num">FP</th>
        </tr></thead><tbody>
        ${top10.map(({p,line},i)=>{
          const t = G.teams.find(t=>t.players.includes(p.id));
          return `<tr class="click" onclick="UI.playerModal(${p.id})">
            <td class="lpos">${i+1}</td>
            <td><div class="player-cell">${playerAvatar(p,34)}<div><b>${nationalityFlag(p.nationality)} ${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span><br><span class="pmeta" style="font-size:10px;color:var(--muted)">${p.repTeam?esc(p.repTeam):''}</span></div></div></td>
            <td>${t?`<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}`:'—'}</td>
            <td class="num">${line.t}</td><td class="num">${line.ta}</td><td class="num">${line.ga?line.gl+'/'+line.ga:line.gl}</td>
            <td class="num">${line.fg||0}</td><td class="num">${line.k4020||0}</td><td class="num">${line.fdo||0}</td><td class="num">${line.runs||0}</td><td class="num">${line.tk}</td><td class="num">${line.m}</td><td class="num">${line.err}</td>
            <td class="num"><b>${line.fp}</b></td>
          </tr>`;
        }).join('')}
        </tbody></table>
      </div>`;
      break;
    }

    return `<h1 class="page">Fantasy</h1>
    <p class="page-sub">${G.year} · Scoring: Try 4pts · Try assist 2pts · Goal 2pts · Field goal 2pts · 40/20 3pts · Forced drop-out 2pts · 10 tackles 1pt · 25m 1pt · 8 runs 1pt · Error −2pts</p>
    ${totrHtml}
    <div class="card" style="padding:6px">
      <h2 class="sec" style="margin-top:0">Season Leaders</h2>
      <div class="btnrow" style="margin:4px 0 8px">
        <select style="max-width:190px" onchange="UI._fantasySort=this.value;UI.render()">
          ${sortOptions.map(([v,l])=>`<option value="${v}" ${UI._fantasySort===v?'selected':''}>Sort: ${l}</option>`).join('')}
        </select>
      </div>
      <div class="btnrow" style="margin:0 0 10px"><span style="font-size:11px;color:var(--muted);margin-right:4px;align-self:center">Position:</span>
        ${positions.map(pos=>`<button class="btn sm ${UI._fantasyPos===pos?'primary':''}" onclick="UI._fantasyPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`).join('')}
        ${(UI._fantasyPos!=='all'||UI._fantasySort!=='fpts')?`<button class="btn sm" onclick="UI._fantasyPos='all';UI._fantasySort='fpts';UI.render()">Reset</button>`:''}
      </div>
      <table><thead><tr>
        <th class="noclick"></th><th class="noclick">Player</th><th class="noclick">Club</th>
        <th class="noclick num">G</th><th class="noclick num">Total FP</th><th class="noclick num">Avg FP</th>
      </tr></thead><tbody>
      ${season.map((p,i)=>{
        const t = G.teams.find(t=>t.players.includes(p.id));
        const avg = p.s.g ? ((p.s.fpts||0)/p.s.g).toFixed(1) : '—';
        return `<tr class="click" onclick="UI.playerModal(${p.id})">
          <td class="lpos">${i+1}</td>
          <td><div class="player-cell">${playerAvatar(p,34)}<div><b>${nationalityFlag(p.nationality)} ${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span><br><span class="pmeta" style="font-size:10px;color:var(--muted)">${p.repTeam?esc(p.repTeam):''}</span></div></div></td>
          <td>${t?`<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}`:'—'}</td>
          <td class="num">${p.s.g}</td>
          <td class="num"><b>${p.s.fpts||0}</b></td>
          <td class="num">${avg}</td>
        </tr>`;
      }).join('')}
      ${season.length===0?'<tr><td colspan="6" style="color:var(--muted)">No players match this filter.</td></tr>':''}
      </tbody></table>
    </div>`;
  }
});

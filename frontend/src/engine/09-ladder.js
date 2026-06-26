'use strict';

/* ---------- ladder ---------- */
function ladder(){
  const rows = G.teams.map(t=>({id:t.id, p:0, w:0, l:0, d:0, pf:0, pa:0, pts:0, form:[], byeRounds:[]}));
  const rowById = id => rows[id];
  for(let r=0; r<G.fixtures.length; r++) for(const m of G.fixtures[r]){
    if(!m.played) continue;
    const h = rowById(m.h), a = rowById(m.a);
    h.p++; a.p++; h.pf+=m.hs; h.pa+=m.as; a.pf+=m.as; a.pa+=m.hs;
    if(m.hs>m.as){ h.w++; a.l++; h.pts+=2; h.form.push('W'); a.form.push('L'); }
    else if(m.as>m.hs){ a.w++; h.l++; a.pts+=2; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  }
  // Award 2 pts for bye rounds (NRL standard)
  if(G.byes) for(let r=0; r<G.fixtures.length; r++){
    const byeTeams = G.byes[r];
    if(!byeTeams || !byeTeams.length) continue;
    // Only award bye points for rounds that have been played (all other matches in that round are done)
    const roundPlayed = G.fixtures[r] && G.fixtures[r].length > 0 && G.fixtures[r].every(m=>m.played);
    if(!roundPlayed) continue;
    for(const id of byeTeams){
      const row = rowById(id);
      if(!row) continue;
      row.pts += 2;
      row.form.push('B');
      row.byeRounds.push(r);
    }
  }
  rows.sort((x,y)=> y.pts-x.pts || (y.pf-y.pa)-(x.pf-x.pa) || y.pf-x.pf);
  return rows;
}

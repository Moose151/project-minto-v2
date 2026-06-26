'use strict';

/* ---------- finals ---------- */
function _newFinalMatch(h, a){ return {h, a, played:false, hs:0, as:0, det:null}; }
function _w(m){ return m.hs >= m.as ? m.h : m.a; }
function _l(m){ return m.hs >= m.as ? m.a : m.h; }

function startFinals(){
  G.phase = 'finals';
  const lad = ladder();
  const useTop8 = lad.length >= 8;
  const count = useTop8 ? 8 : Math.min(4, lad.length);
  const top = lad.slice(0, count).map(r => r.id);

  G.finals = {
    week: 1,
    useTop8,
    top8: top,
    minor: lad[0].id,
    // qf is always the first week (either 4 matches for top-8, or 2 for top-4)
    qf: useTop8 ? [
      _newFinalMatch(top[0], top[3]),  // Qualifying Final 1: 1v4
      _newFinalMatch(top[1], top[2]),  // Qualifying Final 2: 2v3
      _newFinalMatch(top[4], top[7]),  // Elimination Final 1: 5v8
      _newFinalMatch(top[5], top[6]),  // Elimination Final 2: 6v7
    ] : [
      _newFinalMatch(top[0], top[3]),  // 1v4
      _newFinalMatch(top[1], top[2]),  // 2v3
    ],
    sf: null,
    pf: null,
    gf: null,
    premier: null,
  };

  if(useTop8){
    const names = top.slice(0, 8).map((id, i) => `${G.teams[id].nick} (${i+1})`);
    addNews(`Finals series: Top 8 confirmed. Qualifying Finals — ${G.teams[top[0]].nick} (1) v ${G.teams[top[3]].nick} (4), ${G.teams[top[1]].nick} (2) v ${G.teams[top[2]].nick} (3). Elimination Finals — ${G.teams[top[4]].nick} (5) v ${G.teams[top[7]].nick} (8), ${G.teams[top[5]].nick} (6) v ${G.teams[top[6]].nick} (7).`);
  } else {
    addNews(`Finals: ${G.teams[top[0]].nick} (1) v ${G.teams[top[3]].nick} (4), ${G.teams[top[1]].nick} (2) v ${G.teams[top[2]].nick} (3).`);
  }
  // Audit finals promises: player promised selection if team qualifies — check if in lineup
  const myT = typeof myTeam === 'function' ? myTeam() : null;
  if(myT && top.includes(myT.id)){
    const active17 = new Set((myT.lineup || []).slice(0,17).filter(id=>id!=null));
    for(const id of myT.players){
      const p = G.players[id];
      if(!p || !p.promises || !p.promises.finals || p.promiseTeam !== myT.id) continue;
      if(!active17.has(p.id)){
        p.promiseConcern = (p.promiseConcern || 0) + 3;
        p.morale = clamp(p.morale - 10, 5, 99);
        addNews(`${esc(p.name)} was promised finals selection but has not been included in the match-day squad. ${p.morale < 40 ? 'They are seriously considering a move.' : 'Morale has taken a hit.'}`,
          {title:'Finals Promise Broken', type:'contract', tone:'bad', playerId:p.id, teamId:myT.id, tag:'Contracts'});
        if(p.promiseConcern >= 4 && !p.releaseRequest){ p.releaseRequest = true; }
      }
    }
  }
}

function advanceFinals(){
  const F = G.finals;
  return F.useTop8 ? _advanceTop8(F) : _advanceTop4(F);
}

function _advanceTop8(F){
  if(F.week === 1){
    for(const m of F.qf) simMatch(m, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly(F.qf);

    // QF winners advance direct to Prelims; QF losers face EF winners in Semis
    const qf1w = _w(F.qf[0]), qf1l = _l(F.qf[0]);
    const qf2w = _w(F.qf[1]), qf2l = _l(F.qf[1]);
    const ef1w = _w(F.qf[2]);   // 5v8 winner
    const ef2w = _w(F.qf[3]);   // 6v7 winner

    F._qf1w = qf1w; F._qf2w = qf2w;  // keep for week-3
    F.sf = [
      _newFinalMatch(qf1l, ef2w),   // Semi 1: QF1 loser v EF2 winner
      _newFinalMatch(qf2l, ef1w),   // Semi 2: QF2 loser v EF1 winner
    ];
    F.week = 2;

    addNews(`Semi Finals: ${G.teams[qf1l].nick} v ${G.teams[ef2w].nick}, ${G.teams[qf2l].nick} v ${G.teams[ef1w].nick}. ${G.teams[_l(F.qf[2])].nick} and ${G.teams[_l(F.qf[3])].nick} eliminated.`);
    return {type:'finals', games:F.qf, label:'Qualifying & Elimination Finals'};
  }

  if(F.week === 2){
    for(const m of F.sf) simMatch(m, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly(F.sf);

    const sf1w = _w(F.sf[0]), sf2w = _w(F.sf[1]);
    F.pf = [
      _newFinalMatch(F._qf1w, sf2w),  // Prelim 1: QF1 winner v SF2 winner
      _newFinalMatch(F._qf2w, sf1w),  // Prelim 2: QF2 winner v SF1 winner
    ];
    F.week = 3;

    addNews(`Preliminary Finals: ${G.teams[F._qf1w].nick} v ${G.teams[sf2w].nick}, ${G.teams[F._qf2w].nick} v ${G.teams[sf1w].nick}.`);
    return {type:'finals', games:F.sf, label:'Semi Finals'};
  }

  if(F.week === 3){
    for(const m of F.pf) simMatch(m, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly(F.pf);

    const pf1w = _w(F.pf[0]), pf2w = _w(F.pf[1]);
    F.gf = _newFinalMatch(pf1w, pf2w);
    F.week = 4;

    addNews(`Grand Final set: ${G.teams[pf1w].nick} v ${G.teams[pf2w].nick}!`);
    return {type:'finals', games:F.pf, label:'Preliminary Finals'};
  }

  if(F.week === 4){
    simMatch(F.gf, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly([F.gf]);
    return _declareChampion(F);
  }
}

function _advanceTop4(F){
  if(F.week === 1){
    const matches = F.qf;
    for(const m of matches) simMatch(m, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly(matches);

    const w1 = _w(matches[0]), w2 = _w(matches[1]);
    F.gf = _newFinalMatch(w1, w2);
    F.week = 2;

    addNews(`Grand Final: ${G.teams[w1].nick} v ${G.teams[w2].nick}.`);
    return {type:'finals', games:matches, label:'Semi Finals'};
  }

  if(F.week === 2){
    simMatch(F.gf, true);
    weeklyRecoveryAndDev();
    payCoachWeekly();
    payClubWeekly([F.gf]);
    return _declareChampion(F);
  }
}

function _declareChampion(F){
  F.premier = _w(F.gf);
  const pt = G.teams[F.premier];
  for(const id of pt.players){
    const p = G.players[id];
    ensurePlayerCareerStats(p);
    p.career.premierships++;
    playerClubStatBucket(p, pt).premierships++;
    addPlayerAward(p, 'Premiership', G.year, teamName(pt));
  }
  if(F.premier === G.coach.teamId){ G.coach.rep = clamp(G.coach.rep+10,1,99); G.coach.conf = 95; G.coach.prems++; }
  addNews(`${teamName(pt)} are the ${G.year} premiers! Defeated ${teamName(G.teams[_l(F.gf)])} ${Math.max(F.gf.hs,F.gf.as)}–${Math.min(F.gf.hs,F.gf.as)}.`);
  startOffseason();
  return {type:'finals', games:[F.gf], label:'Grand Final'};
}

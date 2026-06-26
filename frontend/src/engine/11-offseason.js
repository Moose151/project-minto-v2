'use strict';

/* ---------- offseason ---------- */
function startOffseason(){
  G.phase = 'offseason';
  // award: player of the year
  let best=null;
  for(const id in G.players){ const p=G.players[id]; if(!best || p.s.votes>best.s.votes || (p.s.votes===best.s.votes && p.s.rSum>best.s.rSum)) best=p; }
  const lad = ladder();
  const topTry = Object.values(G.players).sort((a,b)=>b.s.t-a.s.t)[0];
  const rookie = rookieOfYear();
  const teamOfYear = seasonTeamOfYear();
  const coachYear = coachOfYear(lad);
  G.offseason = { step:'review', awards:{poty:best?best.id:null, topTry:topTry?topTry.id:null, rookie:rookie?rookie.id:null, teamOfYear, coachYear}, retirements:[], expiring:[], freeAgents:[], offers:[], sacked:false };
  awardSeasonHonours(best, topTry, rookie, teamOfYear);
  if(typeof simInternationalWindow === 'function') G.offseason.intl = simInternationalWindow();
  reassessPotential();
  // board review
  const myPos = lad.findIndex(r=>r.id===G.coach.teamId)+1;
  const E = G.coach.expect;
  let verdict;
  if(G.finals.premier===G.coach.teamId){ verdict='Premiership delivered — the board is ecstatic.'; G.coach.conf=95; }
  else if(myPos <= E.minPos){ verdict=`Finished ${ord(myPos)} — expectations met.`; G.coach.conf=clamp(G.coach.conf+10,0,100); G.coach.rep=clamp(G.coach.rep+2,1,99); }
  else if(myPos <= E.minPos+2){ verdict=`Finished ${ord(myPos)} — just short of expectations. The board wants improvement.`; G.coach.conf=clamp(G.coach.conf-8,0,100); }
  else { verdict=`Finished ${ord(myPos)} — well below expectations.`; G.coach.conf=clamp(G.coach.conf-22,0,100); G.coach.rep=clamp(G.coach.rep-3,1,99); }
  if(G.coach.conf < 18){
    G.offseason.sacked = true;
    const sackedPayoutYears = Math.max(0, (G.coach.contractYears || 0) - 1);
    const sackedPayout = sackedPayoutYears * (G.coach.salary || 0);
    if(sackedPayout > 0 && G.club){
      G.club.funds = (G.club.funds || 0) - sackedPayout;
      G.offseason.sackedPayout = sackedPayout;
      verdict += ` ${G.coach.name} has been sacked. Contract payout: ${money(sackedPayout)}.`;
    } else {
      verdict += ` ${G.coach.name} has been sacked.`;
    }
  }
  G.offseason.verdict = verdict;
  G.offseason.finalPos = myPos;
  addNews(verdict);
  // record history
  const gf = G.finals ? G.finals.gf : null;
  G.history.unshift({
    year: G.year,
    premier: G.finals.premier, minor: G.finals.minor,
    poty:    best    ? {id:best.id,    name:best.name,    team:teamOf(best.id),    votes:best.s.votes}       : null,
    rookie:  rookie  ? {id:rookie.id,  name:rookie.name,  team:teamOf(rookie.id)}                            : null,
    topTry:  topTry  ? {id:topTry.id,  name:topTry.name,  team:teamOf(topTry.id), tries:topTry.s.t}          : null,
    coachYear: coachYear || null,
    gfScore: gf ? {h:gf.h, a:gf.a, hs:gf.hs, as:gf.as} : null,
    myPos,
    ladder: lad.map(r=>({id:r.id, pts:r.pts})),
  });
  const myLadRow = lad.find(r=>r.id===G.coach.teamId)||{w:0,l:0,d:0};
  G.coach.history.unshift({year:G.year, team:teamName(myTeam()), pos:myPos, premier:G.finals.premier===G.coach.teamId, w:myLadRow.w, l:myLadRow.l, d:myLadRow.d});
  checkAchievements('season', {lad, best, rookie, myPos});
  for(const id in G.players) recordPlayerSeason(G.players[id]);
  // retirements
  for(const t of G.teams){
    t.players = t.players.filter(id=>{
      const p = G.players[id];
      const retire = p.age>=33 && rnd() < (p.age-31)*.22 || (p.age>=31 && p.ovr<55 && rnd()<.4);
      if(retire){
        const hof = considerHallOfFame(p, t);
        G.offseason.retirements.push({name:p.name, age:p.age, team:t.nick, games:p.career.games, hallOfFame:!!hof});
        delete G.players[id];
        return false;
      }
      return true;
    });
  }
  // age everyone +1, decrement contracts, reset condition
  for(const id in G.players){ const p=G.players[id];
    p.age++; p.years--; p.cond=100; p.injury=null;
    advanceContractSchedule(p);
    p.career.seasons++;
  }
  for(const t of G.teams){
    for(const id of t.players.slice()){
      const p = G.players[id];
      if(!p || p.squad !== 'dev' || canJoinYouthSquad(p)) continue;
      t.players = t.players.filter(pid=>pid!==id);
      t.lineup = (t.lineup||[]).map(pid=>pid===id?null:pid);
      p.squad = null;
      if(!G.freeAgents) G.freeAgents = [];
      if(!G.freeAgents.includes(id)) G.freeAgents.push(id);
      if(G.offseason && !G.offseason.freeAgents.includes(id)) G.offseason.freeAgents.push(id);
      if(t.id===G.coach.teamId){
        addNews(`${p.name} has aged out of the youth squad and was released to the open market. Offer main-squad or train-and-trial terms before season end to retain future youth graduates.`,
          {title:'Youth Player Aged Out', type:'contract', tone:'neutral', playerId:id, teamId:t.id, tag:'Contracts'});
      }
    }
  }
  // offseason development pass (simulates ~8 weeks of training for all players)
  applyOffseasonDevelopment();
  // expiring at my club
  const mt = myTeam();
  G.offseason.expiring = mt.players.filter(id=>G.players[id].years<=0);
  // AI coach rotation — poor results can get a coach fired
  for(const t of G.teams){
    if(t.id === G.coach.teamId) continue;
    if(!t.headCoach) t.headCoach = genAIHeadCoach();
    t.headCoach.seasons = (t.headCoach.seasons || 0) + 1;
    const tPos = lad.findIndex(r=>r.id===t.id)+1;
    const bottomQuarter = tPos >= Math.ceil(G.teams.length * 0.75);
    const midLower = tPos >= Math.ceil(G.teams.length * 0.5);
    const fireChance = bottomQuarter && t.headCoach.seasons >= 2 ? 0.45
                     : bottomQuarter ? 0.22
                     : midLower && t.headCoach.seasons >= 4 ? 0.10 : 0;
    if(fireChance > 0 && rnd() < fireChance){
      const oldName = t.headCoach.name;
      const promoted = promoteAssistantToHeadCoach(t);
      if(promoted){
        addNews(`${oldName} has been sacked by the ${t.nick}. ${promoted.name}, formerly your ${promoted.roleLabel}, has been appointed as the new head coach.`,
          {title:'Assistant Promoted', type:'board', tone:'neutral', teamId:t.id, tag:'Coaching'});
      } else {
        const newCoach = genAIHeadCoach();
        t.headCoach = newCoach;
        if(newCoach.plan && rnd() < 0.55) t.plan = newCoach.plan;
        t.cohesion = clamp((t.cohesion || 50) - ri(3, 10), 10, 90);
        const philInfo = COACH_PHILOSOPHIES.find(p=>p.key===newCoach.philosophy);
        const quote = pick(COACH_PRESS_QUOTES);
        addNews(
          `${oldName} has been sacked by the ${t.nick}. ${newCoach.name} has been appointed as the new head coach — ` +
          `${philInfo ? philInfo.desc : 'a new direction for the club.'} "${quote}" — ${newCoach.name}.`,
          {title:'Coaching Change', type:'board', tone:'neutral', teamId:t.id, tag:'Coaching'}
        );
      }
    } else {
      // Rep drift based on finish
      t.headCoach.rep = clamp(t.headCoach.rep + (tPos <= G.teams.length*0.25 ? 3 : bottomQuarter ? -2 : 1), 5, 95);
    }
  }
  // AI clubs handle their own re-signings now (simple): keep if cap room & wants to stay
  for(const t of G.teams){ if(t.id===G.coach.teamId) continue;
    const expiring = t.players.filter(id=>G.players[id].years<=0);
    for(const id of expiring){
      const p = G.players[id];
      const newSal = salaryFor(p);
      const capRoom = G.config.cap*1.02 - teamSalary(t);
      if(newSal <= capRoom && rnd() < .75){ setPlayerContract(p, newSal, ri(1,3), 'flat'); }
      else { t.players = t.players.filter(x=>x!==id); G.offseason.freeAgents.push(id); }
    }
  }
}
function addPlayerAward(p, award, year, detail){
  if(!p) return;
  p.awards = p.awards || [];
  p.awards.unshift({award, year:year || G.year, detail:detail || ''});
}
function recordTeamOfWeek(round){
  const byPos = {};
  for(const m of round){
    if(!m.det) continue;
    for(const side of [m.det.h, m.det.a]){
      for(const [id,line] of Object.entries(side)){
        const p = G.players[+id];
        if(!p || !line.r) continue;
        const key = ['FB','WG','CE','FE','HB','PR','HK','SR','LK'].includes(p.pos) ? p.pos : 'BE';
        byPos[key] = byPos[key] || [];
        byPos[key].push({p,line});
      }
    }
  }
  const slots = ['FB','WG','WG','CE','CE','FE','HB','PR','PR','HK','SR','SR','LK'];
  const used = new Set();
  for(const pos of slots){
    const pool = (byPos[pos] || []).filter(x=>!used.has(x.p.id)).sort((a,b)=>b.line.r-a.line.r);
    if(!pool.length) continue;
    const pick = pool[0];
    used.add(pick.p.id);
    addPlayerAward(pick.p, 'Team of the Week', G.year, `Round ${G.round+1} · ${pick.line.r.toFixed(1)} rating`);
  }
}
function awardSeasonHonours(best, topTry, rookie, teamOfYear){
  if(best) addPlayerAward(best, 'Player of the Year', G.year, `${best.s.votes} votes`);
  if(topTry) addPlayerAward(topTry, 'Top Tryscorer', G.year, `${topTry.s.t} tries`);
  if(rookie) addPlayerAward(rookie, 'Rookie of the Year', G.year, `${rookie.s.g} games`);
  for(const item of teamOfYear || []) addPlayerAward(G.players[item.id], 'Team of the Year', G.year, `${item.slot} · ${item.avg} avg`);
}
function seasonTeamOfYear(){
  const out = [];
  const used = new Set();
  for(const pos of ['FB','WG','WG','CE','CE','FE','HB','PR','PR','HK','SR','SR','LK']){
    const p = Object.values(G.players)
      .filter(p=>p.pos===pos && p.s.g>=6 && !used.has(p.id))
      .sort((a,b)=>(b.s.rSum/b.s.g)-(a.s.rSum/a.s.g))[0];
    if(p){ used.add(p.id); out.push({slot:pos, id:p.id, avg:(p.s.rSum/p.s.g).toFixed(1), team:teamOf(p.id)}); }
  }
  return out;
}
function coachOfYear(lad){
  let best = null;
  for(const r of lad){
    const t = G.teams[r.id];
    const strengthRank = G.teams.slice().sort((a,b)=>squadStrength(b)-squadStrength(a)).findIndex(x=>x.id===t.id)+1;
    const finish = lad.findIndex(x=>x.id===t.id)+1;
    const score = (strengthRank-finish)*6 + r.pts + (G.finals && G.finals.premier===t.id ? 20 : 0);
    const coachName = t.id===G.coach.teamId ? G.coach.name : (t.headCoach ? t.headCoach.name : `${t.city} Coach`);
    if(!best || score>best.score) best = {teamId:t.id, coach:coachName, score:Math.round(score), finish, strengthRank};
  }
  return best;
}
function assistantHeadCoachReadiness(s){
  if(!s) return 0;
  const role = STAFF_ROLES.find(r=>r.key===s.role) || {};
  const roleBonus = s.role === 'youth' ? 7
    : s.role === 'attacking' || s.role === 'defensive' ? 5
    : s.role === 'fitness' ? 2
    : s.role === 'kicking' ? 1
    : 0;
  return (s.ability || 0) + roleBonus + Math.min(6, (s.yearsLeft || 1) * 1.5);
}
function promoteAssistantToHeadCoach(t){
  if(!G.staff || !G.staff.length) return null;
  const candidates = G.staff
    .map(s=>({s, readiness:assistantHeadCoachReadiness(s)}))
    .filter(x=>x.readiness >= 72)
    .sort((a,b)=>b.readiness-a.readiness || b.s.ability-a.s.ability);
  if(!candidates.length) return null;
  const best = candidates[0];
  const chance = clamp((best.readiness - 62) / 45, 0.10, 0.72);
  if(rnd() >= chance) return null;
  const s = best.s;
  G.staff = G.staff.filter(x=>x.id !== s.id);
  const role = STAFF_ROLES.find(r=>r.key===s.role) || {};
  const rep = clamp(Math.round(18 + (s.ability || 50) * 0.62 + ri(-5, 7)), 25, 72);
  t.headCoach = {
    name:s.name,
    rep,
    seasons:0,
    promotedFromAssistant:true,
    formerRole:s.role,
  };
  return {name:s.name, roleLabel:role.label || s.role, rep};
}
function applyOffseasonDevelopment(){
  const OFFSEASON_WEEKS = 8;
  const improvers = [], decliners = [];
  for(const id in G.players){
    const p = G.players[id]; if(!p) continue;
    const t = G.teams.find(tm => tm.players.includes(p.id));
    const isMine = t && t.id === G.coach.teamId;
    const facilityDev = isMine ? (0.92 + facilityLevel('training')*.035 + (p.age<=21 ? facilityLevel('academy')*.025 : 0)) : 1;
    const devMod = ((isMine && G.coach.attrs) ? (0.7 + 0.6*(G.coach.attrs.development/100)) : 1) * facilityDev;
    const profMod = clamp(0.6 + (p.attrs.professionalism || 50) / 200, 0.6, 1.05);
    const moraleMod = clamp(0.78 + (p.morale || 50) / 230, 0.78, 1.07);
    const prevOvr = p.ovr;

    // Growth: mirror in-season Poisson rates × offseason weeks
    let baseWeeklyExpected = 0;
    if(p.age <= 17)       baseWeeklyExpected = 2.2;
    else if(p.age <= 19)  baseWeeklyExpected = 1.8;
    else if(p.age <= 21)  baseWeeklyExpected = 1.3;
    else if(p.age <= 23)  baseWeeklyExpected = 0.85;
    else if(p.age <= 25)  baseWeeklyExpected = 0.48;
    else if(p.age <= 27)  baseWeeklyExpected = 0.25;
    else if(p.age <= 30)  baseWeeklyExpected = 0.10;
    const growProb = baseWeeklyExpected * profMod * moraleMod * devMod;
    const keyAttrsOS = positionKeyAttrs(p.pos);
    let gains = Math.min(poisson(growProb * OFFSEASON_WEEKS), 6);
    for(let g = 0; g < gains && p.ovr < p.pot; g++){
      const a = (keyAttrsOS.length && rnd() < 0.72) ? pick(keyAttrsOS) : pick(ATTRS);
      const staffBonus = isMine ? staffMultiplier(a, p.pos) : 1;
      const gain = staffBonus > 1.15 && rnd() < (staffBonus - 1) ? 2 : 1;
      p.attrs[a] = clamp(p.attrs[a]+gain, 20, 99);
      p.ovr = calcOvr(p);
      if(p.ovr >= 92){
        const immortalCount = Object.values(G.players).filter(x => x && x.id !== p.id && x.ovr >= 92).length;
        if(immortalCount >= 3){ p.attrs[a] = clamp(p.attrs[a]-gain, 20, 99); p.ovr = calcOvr(p); }
        else if(prevOvr < 92){
          addNews(`${esc(p.name)} (${p.pos}, ${t?esc(t.nick):'Free Agent'}) has ascended to Immortal status during the offseason.`,
            {title:'Immortal Player', type:'development', tone:'good', playerId:p.id, teamId:t?t.id:null, tag:'Development'});
        }
      }
    }

    // Veteran mental growth (2 chances during offseason)
    if(p.age >= 28 && p.age <= 36){
      const mentalChance = clamp(0.036 + (p.age - 28) * 0.003, 0.036, 0.060) * moraleMod * devMod * 2;
      if(rnd() < mentalChance){
        const a = pick(MENTAL_ATTRS);
        if(p.attrs[a] < 92){ p.attrs[a] = clamp(p.attrs[a]+1, 20, 99); p.ovr = calcOvr(p); }
      }
    }

    // Physical decline (~2 weeks' worth)
    let physDecline = 0;
    if(p.age >= 36)       physDecline = (0.17 + (p.age - 36) * 0.025) * 2;
    else if(p.age >= 33)  physDecline = (0.07 + (p.age - 33) * 0.033) * 2;
    else if(p.age >= 31)  physDecline = (0.03 + (p.age - 31) * 0.020) * 2;
    else if(p.age >= 29)  physDecline = 0.024;
    if(physDecline > 0 && (p.attrs.professionalism || 50) >= 75) physDecline *= 0.82;
    if(physDecline > 0 && rnd() < physDecline){
      const a = pick(PHYSICAL_ATTRS); p.attrs[a] = clamp(p.attrs[a]-1, 20, 99); p.ovr = calcOvr(p);
    }
    // Technical skill decline for late-career players
    if(p.age >= 35 && rnd() < (0.020 + (p.age - 35) * 0.009) * 2){
      const a = pick(TECHNICAL_ATTRS); p.attrs[a] = clamp(p.attrs[a]-1, 20, 99); p.ovr = calcOvr(p);
    }

    p.pot = Math.max(p.pot, p.ovr);
    if(isMine){
      const delta = p.ovr - prevOvr;
      if(delta >= 2) improvers.push({p, delta});
      else if(delta <= -2) decliners.push({p, delta});
    }
  }
  // Store full data for offseason development review screen
  if(G.offseason){
    improvers.sort((a,b)=>b.delta-a.delta);
    decliners.sort((a,b)=>a.delta-b.delta);
    G.offseason.devSummary = {
      improvers: improvers.map(x=>({id:x.p.id, delta:x.p.ovr-(x.p.seasonStartOvr||x.p.ovr-x.delta), ovr:x.p.ovr})),
      decliners: decliners.map(x=>({id:x.p.id, delta:x.p.ovr-(x.p.seasonStartOvr||x.p.ovr-x.delta), ovr:x.p.ovr})),
    };
  }
  // News summary for coached club
  const parts = [];
  if(improvers.length) parts.push(`Biggest improvers: ${improvers.slice(0,3).map(x=>`${x.p.name} +${x.delta}`).join(', ')}.`);
  if(decliners.length) parts.push(`Declines: ${decliners.slice(0,2).map(x=>`${x.p.name} ${x.delta}`).join(', ')}.`);
  if(parts.length){
    addNews(`Offseason training complete. ${parts.join(' ')}`, {
      title:'Offseason Development', type:'development',
      tone: improvers.length >= decliners.length ? 'good' : 'neutral',
      teamId: G.coach.teamId, tag:'Development',
    });
  }
}
function recordPlayerSeason(p){
  if(!p || !p.s) return;
  ensurePlayerCareerStats(p);
  p.history = p.history || [];
  const t = G.teams.find(t=>t.players.includes(p.id));
  p.history.unshift({
    year:G.year,
    team:t ? t.nick : 'Free Agent',
    age:p.age,
    pos:p.pos,
    ovr:p.ovr,
    pot:p.pot,
    g:p.s.g,
    t:p.s.t,
    runs:p.s.runs||0,
    ta:p.s.ta,
    gl:p.s.gl,
    ga:p.s.ga||0,
    fg:p.s.fg||0,
    tk:p.s.tk,
    m:p.s.m,
    err:p.s.err,
    k4020:p.s.k4020||0,
    fdo:p.s.fdo||0,
    mins:p.s.mins||0,
    mt:p.s.mt||0,
    lb:p.s.lb||0,
    lba:p.s.lba||0,
    ks:p.s.ks||0,
    km:p.s.km||0,
    inf:p.s.inf||0,
    fpts:p.s.fpts||0,
    avg:p.s.g ? +(p.s.rSum/p.s.g).toFixed(1) : 0,
    votes:p.s.votes,
  });
  if(p.history.length > 30) p.history.pop();
}
function hallOfFameScore(p){
  if(!p || !p.career) return 0;
  const awards = p.awards || [];
  const awardScore = awards.reduce((s,a)=>{
    const name = String(a.award || '');
    if(/Player of the Year/i.test(name)) return s + 24;
    if(/Team of the Year/i.test(name)) return s + 9;
    if(/Rookie of the Year|Top Tryscorer/i.test(name)) return s + 8;
    if(/Team of the Week/i.test(name)) return s + 1.2;
    return s + 2;
  }, 0);
  const peakOvr = Math.max(p.ovr || 0, ...(p.history || []).map(h=>h.ovr || 0));
  const avgRating = (p.history || []).filter(h=>h.g).reduce((s,h)=>s+(Number(h.avg)||0)*Math.min(h.g,24),0) /
    Math.max(1, (p.history || []).filter(h=>h.g).reduce((s,h)=>s+Math.min(h.g,24),0));
  const games = p.career.games || 0;
  const points = p.career.points || 0;
  const tries = p.career.tries || 0;
  const score = games*0.18 + points*0.018 + tries*0.34 + (p.career.premierships||0)*18 +
    awardScore + Math.max(0, peakOvr-72)*4.5 + Math.max(0, avgRating-6.6)*18;
  return Math.round(score);
}
function considerHallOfFame(p, t){
  G.hallOfFame = G.hallOfFame || [];
  if(G.hallOfFame.some(x=>x.id===p.id)) return null;
  const score = hallOfFameScore(p);
  const peakOvr = Math.max(p.ovr || 0, ...(p.history || []).map(h=>h.ovr || 0));
  const automatic = peakOvr >= 88 || (p.career && p.career.premierships >= 3) || (p.awards || []).some(a=>/Player of the Year/i.test(a.award || ''));
  if(score < 115 && !automatic) return null;
  const item = {
    id:p.id,
    name:p.name,
    age:p.age,
    pos:p.pos,
    pos2:p.pos2,
    nationality:p.nationality,
    repTeam:p.repTeam,
    stateRep:p.stateRep,
    team:t ? teamName(t) : 'Free Agent',
    teamId:t ? t.id : null,
    inductionYear:G.year,
    score,
    peakOvr,
    quality:playerTier(peakOvr).label,
    career:Object.assign({}, p.career),
    awards:(p.awards || []).slice(0,12).map(a=>({award:a.award, year:a.year, detail:a.detail})),
    history:(p.history || []).slice(0,12),
  };
  G.hallOfFame.unshift(item);
  addNews(`${p.name} has been inducted into the Hall of Fame after retiring from the ${t ? t.nick : 'league'}.`, {
    title:'Hall of Fame Induction',
    type:'history',
    tone:'good',
    tag:'Hall of Fame',
    teamId:t ? t.id : undefined,
  });
  return item;
}
function rookieOfYear(){
  const rookies = Object.values(G.players).filter(p=>{
    const previousGames = p.seasonStartGames == null ? Math.max(0, p.career.games - p.s.g) : p.seasonStartGames;
    return p.age <= 21 && previousGames < 10 && p.s.g >= 6;
  });
  if(!rookies.length) return null;
  const score = p => {
    const avg = p.s.g ? p.s.rSum / p.s.g : 0;
    const fpAvg = p.s.g ? (p.s.fpts || 0) / p.s.g : 0;
    return avg*10 + fpAvg*1.2 + p.s.g*0.7 + p.s.t*1.5 + p.s.ta*1.2 + p.s.votes*2;
  };
  return rookies.sort((a,b)=>score(b)-score(a))[0];
}
function reassessPotential(){
  for(const id in G.players){
    const p = G.players[id];
    if(!p || p.age > 24) continue;
    const startPot = p.seasonStartPot == null ? p.pot : p.seasonStartPot;
    const ovrGain = (p.seasonStartOvr == null) ? 0 : p.ovr - p.seasonStartOvr;
    const avg = p.s.g ? p.s.rSum / p.s.g : 0;
    const fpAvg = p.s.g ? (p.s.fpts || 0) / p.s.g : 0;
    const stalled = p.pot - p.ovr >= 8 && (p.s.g < 4 || avg < 6.1 || ovrGain <= 0);
    const badContext = p.morale < 42 || p.attrs.professionalism < 45 || p.attrs.injury < 45;
    const breakout = (p.s.g >= 8 && (avg >= 7.25 || fpAvg >= 8 || ovrGain >= 3)) || (p.squad === 'dev' && ovrGain >= 4);
    const diamond = p.pot - p.ovr <= 6 && breakout && p.age <= 22;
    let delta = 0, title = '', tone = 'neutral';
    if(diamond && rnd() < 0.45){
      delta = ri(2, 5); title = 'Diamond In The Rough'; tone = 'good';
    } else if(breakout && rnd() < 0.28){
      delta = ri(1, 3); title = 'Breakout Reassessment'; tone = 'good';
    } else if(stalled && badContext && rnd() < 0.32){
      delta = -ri(1, 4); title = 'Development Concern'; tone = 'bad';
    } else if(stalled && rnd() < 0.14){
      delta = -1; title = 'Potential Cooling'; tone = 'bad';
    }
    if(delta){
      p.pot = clamp(p.pot + delta, p.ovr, 97);
      const t = G.teams.find(t=>t.players.includes(p.id));
      if(t && t.id === G.coach.teamId){
        const direction = delta > 0 ? 'raised' : 'lowered';
        addNews(`Scouts have ${direction} their long-term projection for ${p.name} after his ${G.year} season.`, {
          title,
          type: 'development',
          tone,
          playerId: p.id,
          teamId: t.id,
          tag: 'Scouting',
        });
      }
    }
    p.seasonStartPot = startPot;
  }
}
function teamOf(pid){ const t = G.teams.find(t=>t.players.includes(+pid)); return t? t.nick : '—'; }
function currentSalary(p){ return p ? (p.salary || 0) : 0; }
const TOP_SQUAD_CAP = 30;
const YOUTH_SQUAD_CAP = 12;
const TRIAL_SQUAD_CAP = 5;
const TRIAL_GAME_CAP = 6;
const TRIAL_SALARY_CAP = 150000;
function isTopSquadPlayer(p){ return !!(p && (p.squad === 'top' || !p.squad)); }
function isYouthSquadPlayer(p){ return !!(p && p.squad === 'dev'); }
function isTrialSquadPlayer(p){ return !!(p && p.squad === 'trial'); }
function salaryCountsForCap(p){ return isTopSquadPlayer(p); }
function squadCount(t, squad){
  return (t.players || []).map(id=>G.players[id]).filter(p=>{
    if(squad === 'top') return isTopSquadPlayer(p);
    if(squad === 'dev') return isYouthSquadPlayer(p);
    if(squad === 'trial') return isTrialSquadPlayer(p);
    return false;
  }).length;
}
function canJoinYouthSquad(p){ return !!(p && p.age < 21 && !p.everTopSquad); }
function trialGamesUsed(p){ return Math.max(0, p && p.trialGames || 0); }
function canTrialPlay(p){ return isTrialSquadPlayer(p) && trialGamesUsed(p) < TRIAL_GAME_CAP; }
function selectionSquadEligible(p){ return isTopSquadPlayer(p) || canTrialPlay(p); }
function teamSalary(t){ return (t.players || []).reduce((s,id)=>{ const p=G.players[id]; return s + (p && salaryCountsForCap(p) ? currentSalary(p) : 0); }, 0); }
function ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }

/* re-sign / free agent negotiation */
function contractScheduleFor(annual, years, type){
  years = Math.round(years || 0);
  if(years <= 0) return [];
  years = clamp(years, 1, 5);
  type = ['flat','front','back'].includes(type) ? type : 'flat';
  annual = Math.round((+annual || 85000) / 5000) * 5000;
  if(years === 1 || type === 'flat') return Array(years).fill(annual);
  const step = years >= 4 ? 0.10 : 0.12;
  const mid = (years - 1) / 2;
  const weights = Array.from({length:years}, (_,i)=>{
    const offset = (mid - i) * step;
    return type === 'front' ? 1 + offset : 1 - offset;
  });
  const weightTotal = weights.reduce((s,w)=>s+w,0);
  const total = annual * years;
  const schedule = weights.map(w=>Math.max(85000, Math.round((total * w / weightTotal) / 5000) * 5000));
  const diff = total - schedule.reduce((s,v)=>s+v,0);
  schedule[schedule.length-1] = Math.max(85000, schedule[schedule.length-1] + diff);
  return schedule;
}
function contractTotal(p){
  if(!p) return 0;
  if(p.contractSchedule && p.contractSchedule.length) return p.contractSchedule.reduce((s,v)=>s+(+v||0),0);
  return (p.salary || 0) * Math.max(0, p.years || 0);
}
function contractAvg(p){
  const yrs = Math.max(1, p && p.years || 1);
  return Math.round(contractTotal(p) / yrs / 5000) * 5000;
}
function contractTypeLabel(type){
  return type === 'front' ? 'Front-loaded' : type === 'back' ? 'Back-loaded' : 'Flat';
}
function setPlayerContract(p, annual, years, type){
  const schedule = contractScheduleFor(annual, years, type);
  p.salary = schedule[0] || Math.round((+annual || 0) / 5000) * 5000;
  p.years = schedule.length;
  p.contractType = ['front','back'].includes(type) ? type : 'flat';
  p.contractSchedule = schedule;
}
function advanceContractSchedule(p){
  if(!p) return;
  if(p.contractSchedule && p.contractSchedule.length){
    p.contractSchedule.shift();
    if(p.contractSchedule.length) p.salary = p.contractSchedule[0];
  }
  if((p.years || 0) <= 0){
    p.contractSchedule = [];
    p.contractType = 'flat';
  }
}
function demandFor(p, toTeam){
  let d = salaryFor(p);
  const posPremium = {
    HB:1.45, FE:1.38, HK:1.34,
    FB:1.18, LK:1.20, SR:1.16, PR:1.08,
    CE:1.00, WG:0.98
  }[p.pos] || 1;
  const youthUpside = p.age <= 23 ? clamp(((p.pot || p.ovr || 60) - (p.ovr || 60)) / 25, 0, .18) : 0;
  d *= posPremium * (1 + youthUpside);
  if(p.s.votes>10) d*=1.15;
  if(p.ambition>75) d*=1.08;
  if(p.morale<40) d*=1.1;
  if((p.form == null ? 50 : p.form) >= 72) d*=1.05;
  // Market scarcity: fewer quality free agents at pos → higher demand
  if(G.freeAgents && G.freeAgents.length){
    const compFAs = G.freeAgents.map(id=>G.players[id]).filter(x=>x&&x.pos===p.pos&&x.id!==p.id&&x.ovr>=(p.ovr-8));
    if(compFAs.length === 0) d *= 1.18;
    else if(compFAs.length <= 2) d *= 1.09;
  }
  const psnl = p.personality;
  if(psnl === 'money') d *= 1.14;
  if(psnl === 'ambitious') d *= 1.06;
  if(psnl === 'loyal') d *= 0.94;
  const current = G.teams.find(t=>t.players.includes(p.id));
  if(toTeam && current && current.id === toTeam.id && !p.releaseRequest){
    const loyaltyBase = p.loyalty >= 85 ? .10 : p.loyalty >= 70 ? .06 : p.loyalty >= 55 ? .03 : 0;
    const loyaltyDiscount = psnl === 'loyal' ? loyaltyBase + 0.07 : loyaltyBase;
    d *= (1 - loyaltyDiscount);
  }
  return Math.round(d/5000)*5000;
}
function contractIntent(p, toTeam){
  if(!p) return {key:'unknown', label:'Unknown', open:false, reason:'No player record.'};
  const current = G.teams.find(t=>t.players.includes(p.id));
  const isCurrentClub = !!(toTeam && current && current.id === toTeam.id);
  const years = Math.max(0, p.years || 0);
  if(p.releaseRequest) return {key:'wants_out', label:'Wants out', open:false, reason:'Has requested a release.'};
  if(p.age >= 34 && years <= 1) return {key:'undecided', label:'Retiring/undecided', open:p.loyalty>=70 && p.morale>=55, reason:'Late-career decision.'};
  if(!isCurrentClub && years > 1) return {key:'unavailable', label:'Under contract', open:false, reason:'Not available for talks yet.'};
  const form = p.form == null ? 50 : p.form;
  const prestige = toTeam && typeof clubPrestigeScore === 'function' ? clubPrestigeScore(toTeam) : 55;
  let score = (p.loyalty || 50)*0.38 + (p.morale || 50)*0.26 + form*0.14 + prestige*0.10 - (p.ambition || 50)*0.08;
  if(years <= 1) score += 12;
  if(years >= 3) score -= 10;
  if(p.prefCity && toTeam && p.prefCity === toTeam.city) score += 6;
  if(p.prefCity && toTeam && p.prefCity !== toTeam.city && p.ambition < 65) score -= 5;
  if(score >= 68) return {key:'eager', label:'Eager to stay', open:true, reason:'Loyal, settled, and ready to talk.'};
  if(score >= (years > 1 ? 56 : 50)) return {key:'open', label:'Open to talks', open:true, reason:years > 1 ? 'Would consider an early extension.' : 'Willing to negotiate.'};
  if(years <= 1) return {key:'test_market', label:'Wants to test market', open:false, reason:'Prefers to wait for rival offers.'};
  return {key:'not_now', label:'Not now', open:false, reason:'Happy to wait before discussing an extension.'};
}
function offerContract(p, salary, years, toTeam, promises, demandOverride){
  const chance = contractSignChance(p, salary, years, toTeam, promises, demandOverride);
  const ok = rnd() < chance.prob;
  if(ok){ setPlayerContract(p, salary, years, promises && promises.contractType); p.promises = normalisePromises(promises); p.promiseTeam = toTeam.id; p.promiseConcern = 0; }
  return {ok, demand:chance.demand, prob:chance.prob};
}
function contractSignChance(p, salary, years, toTeam, promises, demandOverride){
  const demand = demandOverride != null ? demandOverride : demandFor(p, toTeam);
  let prob = clamp(.5 + (salary-demand)/demand*1.6, .02, .96);
  const current = G.teams.find(t=>t.players.includes(p.id));
  const intent = contractIntent(p, toTeam);
  if(current && toTeam && current.id===toTeam.id && !intent.open) prob *= p.years<=1 ? .72 : .35;
  if(intent.key === 'eager') prob *= 1.14;
  if(intent.key === 'test_market') prob *= .78;
  const stayBonus = current && current.id===toTeam.id ? p.loyalty/350 : 0;
  const cityBonus = p.prefCity && p.prefCity===toTeam.city ? .12 : 0;
  const cityPenalty = p.prefCity && p.prefCity!==toTeam.city && p.ambition<65 ? -.08 : 0;
  const prestige = typeof clubPrestigeScore === 'function' ? clubPrestigeScore(toTeam) : 55;
  const prestigePull = ((prestige - 55) / 100) * (p.ambition / 70);
  prob *= clamp(.7 + p.morale/200 + stayBonus + cityBonus + cityPenalty + prestigePull + (toTeam.id===G.coach.teamId && p.loyalty>60 ? .08 : 0), .35, 1.36);
  if(years>=3 && p.age<=27) prob = Math.min(.97, prob*1.1);
  if(years<=1 && p.age<=25) prob *= .85;
  if(p.approachTeam === toTeam.id) prob = Math.min(.97, prob * 1.15);
  // Personality modifiers
  const psnl = p.personality;
  const lad = (G.fixtures && G.fixtures.length && typeof ladder === 'function') ? ladder() : [];
  const toPos = lad.length ? lad.findIndex(r=>r.id===toTeam.id)+1 : Math.ceil(G.teams.length/2);
  if(psnl === 'money') prob *= 1.0; // money players already accounted for via higher demand
  if(psnl === 'winner' && toPos <= Math.ceil(G.teams.length*0.35)) prob = Math.min(.97, prob*1.18); // love top clubs
  if(psnl === 'winner' && toPos > Math.ceil(G.teams.length*0.65)) prob *= 0.82; // reluctant for bottom clubs
  if(psnl === 'loyal' && current && toTeam && current.id===toTeam.id) prob = Math.min(.97, prob*1.22); // very sticky to own club
  if(psnl === 'loyal' && current && toTeam && current.id!==toTeam.id) prob *= 0.80; // hard to poach
  if(psnl === 'ambitious') { const pPull = ((prestige-50)/80); prob = Math.min(.97, prob*(1+pPull*0.18)); } // prestige-addicted
  if(psnl === 'homesick' && p.prefCity && p.prefCity===toTeam.city) prob = Math.min(.97, prob*1.30);
  if(psnl === 'homesick' && p.prefCity && p.prefCity!==toTeam.city) prob *= 0.72;
  const pr = normalisePromises(promises);
  if(pr.role === 'starter') prob *= 1.09;
  if(pr.role === 'bench') prob *= p.ovr < 68 ? 1.06 : 0.96;
  if(pr.role === 'superstar') prob *= 1.16;
  if(pr.captain) prob *= 1.12;
  if(pr.minutes) prob *= 1.08;
  if(pr.finals)  prob *= p.age >= 30 ? 1.10 : 1.05;  // veterans value finals promise more
  if(pr.pathway) prob *= p.age <= 22 ? 1.12 : 1.01;  // only meaningful for young players
  const starCount = toTeam.players.map(id=>G.players[id]).filter(x=>x && x.id!==p.id && x.promises && x.promises.role==='superstar').length;
  if(pr.role==='superstar' && starCount >= 3) prob *= .62;
  if(pr.captain && toTeam.players.some(id=>{ const x=G.players[id]; return x && x.id!==p.id && x.promises && x.promises.captain; })) prob *= .72;
  // Too many game-time promises dilute their value
  const minuteCount = toTeam.players.filter(id=>{ const x=G.players[id]; return x && x.id!==p.id && x.promises && x.promises.minutes; }).length;
  if(pr.minutes && minuteCount >= 4) prob *= 0.88;
  return {prob:clamp(prob,.01,.98), demand};
}
function normalisePromises(promises){
  promises = promises || {};
  return {
    role:    ['none','bench','starter','superstar'].includes(promises.role) ? promises.role : 'none',
    captain: !!promises.captain,
    minutes: !!promises.minutes,   // guaranteed game time (≥⅔ of games)
    finals:  !!promises.finals,    // selected if team makes finals
    pathway: !!promises.pathway,   // development pathway (≤22yo: ≥10 games)
    contractType: ['flat','front','back'].includes(promises.contractType) ? promises.contractType : 'flat',
  };
}
function promiseSummary(p){
  const pr = p && p.promises;
  if(!pr) return 'No promises';
  const bits = [];
  if(pr.role && pr.role !== 'none') bits.push(pr.role);
  if(pr.captain)  bits.push('captaincy');
  if(pr.minutes)  bits.push('game time');
  if(pr.finals)   bits.push('finals selection');
  if(pr.pathway)  bits.push('dev pathway');
  return bits.length ? bits.join(' + ') : 'No promises';
}
function releasePlayer(t, pid){
  t.players = t.players.filter(x=>x!==pid);
  if(G.offseason && !G.offseason.freeAgents.includes(pid)) G.offseason.freeAgents.push(pid);
}
function finishContractsPhase(){
  const mt = myTeam();
  // unsigned expiring players at my club walk to free agency
  for(const id of mt.players.slice()){
    if(G.players[id].years<=0) releasePlayer(mt, id);
  }
  // any other roster still holding expired contracts (e.g. the club the coach just left)
  // gets the AI re-sign treatment; the rest walk
  for(const t of G.teams){ if(t.id===G.coach.teamId) continue;
    for(const id of t.players.slice()){
      const p = G.players[id];
      if(!p || p.years>0) continue;
      const newSal = salaryFor(p);
      const capRoom = G.config.cap*1.02 - teamSalary(t);
      if(newSal <= capRoom && rnd() < .75){ setPlayerContract(p, newSal, ri(1,3), 'flat'); }
      else releasePlayer(t, id);
    }
  }
  // AI teams sign free agents to fill needs
  const order = shuffle(G.teams.filter(t=>t.id!==G.coach.teamId));
  for(let pass=0; pass<6; pass++){
    for(const t of order){
      if(squadCount(t, 'top')>=28) continue;
      const room = G.config.cap - teamSalary(t);
      const cands = G.offseason.freeAgents.map(id=>G.players[id]).filter(p=>p && salaryFor(p)<=room).sort((a,b)=>b.ovr-a.ovr);
      if(cands.length && (squadCount(t, 'top')<26 || rnd()<.6)){
        const p = cands[Math.floor(rnd()*Math.min(3,cands.length))];
        setPlayerContract(p, salaryFor(p), ri(1,3), 'flat');
        p.squad = 'top';
        p.everTopSquad = true;
        t.players.push(p.id);
        G.offseason.freeAgents = G.offseason.freeAgents.filter(id=>id!==p.id);
      }
    }
  }
  // unsigned market thins out: veterans hang the boots up, fringe players drift away
  G.offseason.freeAgents = G.offseason.freeAgents.filter(id=>{
    const p = G.players[id];
    if(!p) return false;
    if(p.age>=34 || (p.age>=31 && rnd()<.7) || (p.ovr<55 && rnd()<.5)){ delete G.players[id]; return false; }
    return true;
  });
  G.freeAgents = Array.from(new Set([...(G.freeAgents || []), ...G.offseason.freeAgents]))
    .filter(id=>G.players[id] && !G.teams.some(t=>t.players.includes(id)));
  G.offseason.step = 'preseason';
  G.offseason.preseason = createPreseasonPlan();
  // rookie intake: every club gets 3 juniors; pad thin squads
  for(const t of G.teams){
    const youthRoom = Math.max(0, YOUTH_SQUAD_CAP - squadCount(t, 'dev'));
    const n = Math.min(youthRoom, 3 + Math.max(0, 25 - t.players.length));
    for(let i=0;i<n;i++){
      const pos = pick(SQUAD_TEMPLATE);
      const p = makePlayer(G, pos, ri(17,20), t.rep-6);
      p.squad = 'dev';
      p.everTopSquad = false;
      setPlayerContract(p, ri(17,24)*5000, ri(2,3), 'flat');
      t.players.push(p.id);
    }
  }
}
function createPreseasonPlan(){
  return {
    membershipPrice: G.club && G.club.membershipPrice != null ? G.club.membershipPrice : 160,
    campFocus: 'balanced',      // backs focus
    campFocusFwd: 'balanced',   // forwards focus
    trialsPlayed: 0,
    trials: [],
    sponsorOffers: generateSponsorOffers(),
    acceptedSponsorIds: [],
    revenueApplied: false,
  };
}
function generateSponsorOffers(){
  const names = ['Ironline Finance','Harbour Health','Pacific Telco','Southern Cross Energy','Coastal Airlines','Summit Motors','Red Zone Apparel','Brightside Insurance','Bluewater Foods','Civic Bank'];
  const prestige = typeof clubPrestigeScore === 'function' ? clubPrestigeScore(myTeam()) : 55;
  const major = 450000 + prestige * 12000 + ri(-60000, 90000);
  const minor = 120000 + prestige * 3600 + ri(-30000, 45000);
  // generate new sponsor offers
  const existing = (G.club.sponsorships || []).filter(s=>s.yearsLeft>0);
  const existingNames = new Set(existing.map(s=>s.name));
  const freshNames = shuffle(names.filter(n=>!existingNames.has(n)));
  const offers = freshNames.slice(0,5).map((name,i)=>({
    id:`S${G.year}_${i}`,
    name,
    category:i===0?'major':'minor',
    value:Math.round((i===0?major:minor*rf(.75,1.25))/10000)*10000,
    yearsLeft:i===0?ri(2,3):ri(1,2),
    renewal:false,
  }));
  // include renewal offers for expiring sponsors (yearsLeft === 1 means last season active)
  const expiring = existing.filter(s=>s.yearsLeft===1);
  for(const s of expiring){
    const renewalValue = Math.round(s.value * rf(1.02, 1.15) / 10000) * 10000;
    offers.unshift({
      id:`SR${G.year}_${s.id}`,
      name:s.name,
      category:s.category,
      value:renewalValue,
      yearsLeft:s.category==='major'?ri(2,3):ri(1,2),
      renewal:true,
      expiryNote:`Renew ${s.category} deal (+${Math.round((renewalValue/s.value-1)*100)}%)`,
    });
  }
  return offers;
}
function membershipProjection(price){
  price = clamp(Math.round(+price || 160), 80, 500);
  const prestige = typeof clubPrestigeScore === 'function' ? clubPrestigeScore(myTeam()) : 55;
  const last = G.history && G.history[0];
  const form = last && last.myPos ? clamp(18 - last.myPos, 0, 16) : 8;
  const demand = clamp(15500 + prestige*185 + form*420 - (price-160)*42, 3500, stadiumCapacity ? stadiumCapacity()*0.92 : 40000);
  const members = Math.round(demand / 100) * 100;
  return {price, members, revenue:members * price};
}
function acceptSponsorOffer(id){
  const ps = G.offseason && G.offseason.preseason;
  if(!ps) return {ok:false, msg:'No preseason sponsor window is active.'};
  G.club.sponsorships = G.club.sponsorships || [];
  const offer = ps.sponsorOffers.find(s=>s.id===id);
  if(!offer) return {ok:false, msg:'Sponsor offer not found.'};
  if(ps.acceptedSponsorIds.includes(id)) return {ok:false, msg:'Sponsor already accepted.'};
  if(offer.renewal){
    // remove the expiring deal being renewed (same name + category)
    G.club.sponsorships = G.club.sponsorships.filter(s=>!(s.name===offer.name && s.category===offer.category && s.yearsLeft===1));
  }
  const activeAfterRenewal = G.club.sponsorships.filter(s=>s.yearsLeft>0);
  const majorCount = activeAfterRenewal.filter(s=>s.category==='major').length;
  const minorCount = activeAfterRenewal.filter(s=>s.category==='minor').length;
  if(offer.category==='major' && majorCount >= 1) return {ok:false, msg:'You can only have one major sponsor at a time.'};
  if(offer.category==='minor' && minorCount >= 2) return {ok:false, msg:'You can only have two minor sponsors at a time.'};
  ps.acceptedSponsorIds.push(id);
  G.club.sponsorships.push({id:offer.id, name:offer.name, category:offer.category, value:offer.value, yearsLeft:offer.yearsLeft});
  return {ok:true, msg:`${offer.name} ${offer.renewal?'renewed':'signed'} as a ${offer.category} sponsor.`};
}
function simPreseasonTrial(){
  const ps = G.offseason && G.offseason.preseason;
  if(!ps || ps.trialsPlayed >= 3) return null;
  const opp = pick(G.teams.filter(t=>t.id!==G.coach.teamId));
  const mine = myTeam();
  const myPow = squadStrength(mine) + (ps.campFocus==='attack'?2:ps.campFocus==='defence'?1:0);
  const opPow = squadStrength(opp);
  const myScore = Math.max(0, Math.round(14 + (myPow-opPow)*0.7 + ri(-8,18)));
  const opScore = Math.max(0, Math.round(14 + (opPow-myPow)*0.7 + ri(-8,18)));
  const trial = {opponent:opp.id, us:myScore, them:opScore};
  ps.trialsPlayed++;
  ps.trials.push(trial);
  const active = mine.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
  for(const p of active){
    p.cond = clamp(p.cond - ri(2,6), 35, 100);
    if(!p.injury && rnd()<.018){
      const inj = pick(INJURIES.filter(x=>x.w[1] <= 4));
      p.injury = {n:inj.n, weeks:ri(inj.w[0], inj.w[1])};
      addNews(`${p.name} picked up a ${inj.n} during a preseason trial.`, {title:'Trial Injury', type:'injury', tone:'bad', playerId:p.id, teamId:mine.id, tag:'Preseason'});
    }
  }
  return trial;
}
function applyPreseasonCamp(){
  const ps = G.offseason && G.offseason.preseason;
  if(!ps) return;
  const FOCUS_ATTRS = {
    attack:  ['ballRunning','playmaking','finishing','shortPass','longPass'],
    defence: ['tackling','defRead','workRate','markerDef','lastDitch'],
    fitness: ['stamina','injury','speed','acceleration','agility'],
    balanced:['professionalism','decisionMaking','stamina','workRate','composure'],
  };
  const BACK_POS = new Set(['FB','WG','CE','FE','HB']);
  const backsAttrs  = FOCUS_ATTRS[ps.campFocus    || 'balanced'];
  const fwdAttrs    = FOCUS_ATTRS[ps.campFocusFwd || 'balanced'];
  for(const id of myTeam().players){
    const p = G.players[id]; if(!p) continue;
    const isBack = BACK_POS.has(p.pos);
    const focusAttrs = isBack ? backsAttrs : fwdAttrs;
    // Younger players benefit more; all players have a base chance
    const chance = p.age <= 21 ? 0.55 : p.age <= 24 ? 0.38 : p.age <= 27 ? 0.20 : 0.10;
    if(rnd() < chance){
      const a = pick(focusAttrs);
      p.attrs[a] = clamp(p.attrs[a]+1, 20, 99);
      p.ovr = calcOvr(p);
    }
  }
}
function completePreseason(){
  const ps = G.offseason && G.offseason.preseason;
  if(!ps) return false;
  const membership = membershipProjection(ps.membershipPrice);
  const sponsors = (G.club.sponsorships || []).filter(s=>s.yearsLeft>0);
  const sponsorRevenue = sponsors.reduce((sum,s)=>sum+(s.value||0),0);
  applyPreseasonCamp();
  startNewSeason();
  ensureClubFacilities();
  G.club.membershipRevenue = membership.revenue;
  G.club.membershipPrice = membership.price;
  G.club.sponsorshipRevenue = sponsorRevenue;
  G.club.seasonRevenue = (G.club.seasonRevenue || 0) + membership.revenue + sponsorRevenue;
  G.club.funds = Math.round((G.club.funds || 0) + membership.revenue + sponsorRevenue);
  addNews(`Preseason complete: ${membership.members.toLocaleString()} members signed up, raising ${money(membership.revenue)}. Sponsorship income: ${money(sponsorRevenue)}.`, {title:'Preseason Revenue', type:'club', tone:'good', tag:'Preseason'});
  return true;
}
/* job offers after review (if sacked or strong rep) */
function generateJobOffers(){
  const lad = ladder();
  const offers = [];
  for(const t of G.teams){
    if(t.id===G.coach.teamId) continue;
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    const desperation = pos / G.teams.length;
    const fit = G.coach.rep + desperation*30 - squadStrength(t)*0.6;
    if(!(G.offseason.sacked ? desperation>.4 : (fit > 18 && rnd()<.5))) continue;
    const salBase = Math.round((80000 + G.coach.rep*2800 + desperation*45000)/5000)*5000;
    const years = G.coach.rep >= 60 ? ri(2,3) : 2;
    const reasons = pos<=3 ? 'compete for the premiership'
      : pos<=6 ? 'push into the top eight'
      : desperation>.65 ? 'rebuild from the bottom'
      : 'build a promising young group';
    const rec = lad.find(r=>r.id===t.id)||{w:0,l:0,pts:0};
    offers.push({teamId:t.id, salary:salBase, years, pos, reason:reasons, w:rec.w, l:rec.l});
  }
  return offers.slice(0, 3);
}
function startNewSeason(){
  G.year++; G.season++; G.round=0; G.phase='regular'; G.finals=null; G.offseason=null;
  G.calendar = {day:0, startISO:`${G.year}-03-02`, lastStop:{key:'training', label:'Training review', page:'training', tone:'neutral'}};
  ensureClubFacilities();
  // Facility degradation: each facility above level 1 has a chance to drop each season
  const fac = G.club.facilities;
  const degraded = [];
  for(const key of ['stadium','training','gym','medical','academy']){
    const lvl = fac[key] || 1;
    if(lvl <= 1) continue;
    const chance = 0.07 + (lvl - 1) * 0.05; // 12% at lvl2 → 27% at lvl5
    if(Math.random() < chance){
      fac[key] = lvl - 1;
      const def = typeof FACILITY_DEFS !== 'undefined' ? FACILITY_DEFS[key] : null;
      degraded.push(def ? def.label : key);
    }
  }
  if(degraded.length){
    addNews(`Facility wear and tear: ${degraded.join(', ')} ${degraded.length>1?'have':'has'} degraded by one level. Consider reinvesting in infrastructure.`,
      {title:'Facility Degradation', type:'board', tone:'bad', tag:'Facilities'});
  }
  updateAiClubFacilities();
  G.club.seasonRevenue = 0; G.club.seasonWages = 0; G.club.gateRevenue = 0; G.club.broadcastRevenue = 0; G.club.membershipRevenue = 0; G.club.sponsorshipRevenue = 0; G.club.vendorRevenue = 0; G.club.magicRoundRevenue = 0;
  G.club.sponsorships = (G.club.sponsorships || []).map(s=>({...s, yearsLeft:Math.max(0,(s.yearsLeft||1)-1)})).filter(s=>s.yearsLeft>0);
  G.config.cap = Math.round(G.config.cap * (1+G.config.capGrowth) / 10000)*10000;
  // Expire all Train & Trial contracts — release to free agency
  for(const t of G.teams){
    const trialIds = t.players.filter(id=>{ const p=G.players[id]; return p && p.squad==='trial'; });
    for(const id of trialIds){
      const p = G.players[id];
      t.players = t.players.filter(pid=>pid!==id);
      t.lineup = (t.lineup||[]).map(pid=>pid===id?null:pid);
      p.squad = null; p.trialGames = 0;
      if(!G.freeAgents) G.freeAgents = [];
      if(!G.freeAgents.includes(id)) G.freeAgents.push(id);
      if(t.id===G.coach.teamId) addNews(`${p.name}'s train & trial contract has expired — released to free agency.`,{type:'contract',tone:'neutral',tag:'Contracts',teamId:t.id});
    }
  }
  for(const id in G.players){ const p=G.players[id]; resetSeasonStats(p); p.morale=clamp(p.morale, 45, 90); p.form=clamp(Math.round((p.form == null ? 50 : p.form)*0.72 + 50*0.28), 25, 85); p.ovr=calcOvr(p); p.pot=Math.max(p.pot,p.ovr); p.seasonStartOvr=p.ovr; p.seasonStartPot=p.pot; p.seasonStartGames=p.career.games; p.seasonStartAttrs={...p.attrs}; delete p.approachTeam; if(p.ovrHistory){ p.ovrHistory.push({year:G.year, ovr:p.ovr}); if(p.ovrHistory.length>20) p.ovrHistory.shift(); } }
  for(const t of G.teams){ t.rep = Math.round(squadStrength(t)); autoPick(t); }
  const fixtResult = genFixtures(G.teams.map(t=>t.id), G.config.seasonRounds);
  G.fixtures = fixtResult.rounds;
  G.byes = fixtResult.byes;
  // Magic Round: pick host by prestige bid (squad strength + randomness)
  const mrRound = clamp(Math.round(G.fixtures.length * 0.42 + Math.floor(rf(0,1) * G.fixtures.length * 0.16)), 7, G.fixtures.length - 4);
  const mrBids = G.teams.map(t => ({t, bid: squadStrength(t) + rf(0, 32)}));
  mrBids.sort((a, b) => b.bid - a.bid);
  const mrHost = mrBids[0].t;
  const mrVenue = `${mrHost.city} Magic Round`;
  G.magicRound = {round: mrRound, hostTeamId: mrHost.id, venue: mrVenue};
  const mrIsMyClub = mrHost.id === G.coach.teamId;
  addNews(
    `Magic Round ${G.year} will be hosted by ${mrHost.nick} in ${mrHost.city} — all Round ${mrRound+1} fixtures played at ${mrHost.stadium || mrHost.city+' Stadium'}.` +
    (mrIsMyClub ? ' Your club will receive a $1,500,000 NRL hosting payment.' : ''),
    {title:'Magic Round Announced', type:'club', tone:mrIsMyClub?'good':'neutral', teamId:G.coach.teamId, tag:'Magic Round'}
  );
  G.origin = typeof generateOriginSchedule === 'function' ? generateOriginSchedule(G.fixtures.length) : null;
  G.coach.expect = setExpectation();
  G.coach.conf = clamp(G.coach.conf, 35, 100);
  G.coach.seasonsAtClub++;
  G.coach.weeklyPayEarned = 0;
  G.coach.contractYears = Math.max(0, (G.coach.contractYears||1)-1);
  if(G.coach.contractYears===0){
    const skill = (G.coach.attrs.development+G.coach.attrs.manMgmt+G.coach.attrs.fitness+G.coach.attrs.tactics)/4;
    G.coach.salary = Math.round((90000 + G.coach.rep*2500 + skill*1800)/5000)*5000;
    G.coach.contractYears = G.coach.conf>70 ? 3 : 2;
    addNews(`${G.coach.name} signs a ${G.coach.contractYears}-year coaching extension worth ${money(G.coach.salary)} per season.`, {title:'Coach Extension', type:'contract', tone:'good', tag:'Coach'});
  }
  // Staff contract expiry
  if(G.staff){
    const expired = G.staff.filter(s=>{s.yearsLeft = Math.max(0,(s.yearsLeft||1)-1); return s.yearsLeft<=0;});
    for(const s of expired){
      addNews(`${s.name} (${(STAFF_ROLES.find(r=>r.key===s.role)||{}).label||s.role}) contract has expired and they have departed the club.`,
        {title:'Staff Departure', type:'contract', tone:'bad', tag:'Staff'});
    }
    G.staff = G.staff.filter(s=>s.yearsLeft>0);
  }
  // Scout contract expiry
  if(G.scouting && G.scouting.scouts){
    const expired = G.scouting.scouts.filter(s=>{s.yearsLeft = Math.max(0,(s.yearsLeft||1)-1); return s.yearsLeft<=0;});
    for(const s of expired){
      G.scouting.missions = (G.scouting.missions||[]).filter(m=>m.scoutId!==s.id);
      addNews(`Scout ${s.name} contract has expired.`, {title:'Scout Departure', type:'contract', tone:'bad', tag:'Scouting'});
    }
    G.scouting.scouts = G.scouting.scouts.filter(s=>s.yearsLeft>0);
  }
  replenishFreeAgents();
  addNews(`Season ${G.year} begins. Salary cap: ${money(G.config.cap)}. Board expectation: ${G.coach.expect.label}.`);
}
function updateAiClubFacilities(){
  if(!G || !G.teams || typeof ensureTeamFacilities !== 'function') return;
  const log = [];
  for(const t of G.teams){
    if(t.id === G.coach.teamId) continue;
    const fac = ensureTeamFacilities(t);
    const strength = typeof squadStrength === 'function' ? squadStrength(t) : (t.rep || 55);
    const ambition = clamp((strength - 50) / 30 + ((t.headCoach && t.headCoach.rep) || 40) / 110, 0.15, 1.35);
    const keys = Object.keys(FACILITY_DEFS);
    const avg = keys.reduce((s,k)=>s+(fac[k]||2),0) / keys.length;
    if(avg < 4.6 && rnd() < 0.18 + ambition * 0.12){
      const key = keys.slice().sort((a,b)=>(fac[a]||2)-(fac[b]||2))[0];
      fac[key] = clamp((fac[key] || 2) + 1, 1, FACILITY_MAX);
      log.push(`${t.nick} upgraded ${FACILITY_DEFS[key].label}`);
    }
    for(const key of keys){
      const lvl = fac[key] || 2;
      if(lvl > 1 && rnd() < 0.025 + lvl * 0.01){
        fac[key] = lvl - 1;
        log.push(`${t.nick} ${FACILITY_DEFS[key].label} degraded`);
        break;
      }
    }
  }
  G.aiFacilityLog = (G.aiFacilityLog || []).concat(log.map(x=>({year:G.year, text:x}))).slice(-30);
}

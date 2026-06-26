'use strict';

// Vendor revenue per attendee by level [unused, L1, L2, L3, L4, L5]
const VENDOR_FB_REV    = [0, 3, 5, 7, 10, 14];
const VENDOR_MERCH_REV = [0, 1.5, 2.5, 4, 6, 8];
// Upgrade cost FROM each level (index = current level)
const VENDOR_FB_COSTS    = [0, 100000, 200000, 350000, 600000];
const VENDOR_MERCH_COSTS = [0, 60000, 120000, 200000, 350000];

function generateOriginSchedule(totalRounds){
  const g1 = Math.max(8,  Math.round(totalRounds * 0.38));
  const g2 = Math.max(g1+3, Math.round(totalRounds * 0.52));
  const g3 = Math.max(g2+3, Math.round(totalRounds * 0.66));
  return {
    series: {qld:0, nsw:0, draws:0},
    games: [
      {num:1, round:g1, played:false, qldScore:0, nswScore:0, venue:'Suncorp Stadium'},
      {num:2, round:g2, played:false, qldScore:0, nswScore:0, venue:'Accor Stadium'},
      {num:3, round:g3, played:false, qldScore:0, nswScore:0, venue:'Suncorp Stadium'},
    ]
  };
}
function simOriginIfDue(roundIdx){
  if(!G.origin || !G.origin.games) return;
  const game = G.origin.games.find(g => g.round === roundIdx && !g.played);
  if(!game) return;
  const all = Object.values(G.players).filter(p => p && !p.injury);
  const qldPool = all.filter(p => p.stateRep === 'Queensland').sort((a,b)=>b.ovr-a.ovr);
  const nswPool = all.filter(p => p.stateRep === 'New South Wales').sort((a,b)=>b.ovr-a.ovr);
  if(qldPool.length < 13 || nswPool.length < 13){ game.played = true; return; }
  const qldXIII = qldPool.slice(0,13);
  const nswXIII = nswPool.slice(0,13);
  const qldAvg = qldXIII.reduce((s,p)=>s+p.ovr,0)/13;
  const nswAvg = nswXIII.reduce((s,p)=>s+p.ovr,0)/13;
  const diff = (qldAvg - nswAvg) * 0.18;
  const qldTries = Math.max(0, Math.round(gauss(3.8 + diff, 1.8)));
  const nswTries = Math.max(0, Math.round(gauss(3.8 - diff, 1.8)));
  game.qldScore = qldTries*4 + Math.round(qldTries*0.72)*2;
  game.nswScore = nswTries*4 + Math.round(nswTries*0.72)*2;
  game.played = true;
  const qWon = game.qldScore > game.nswScore;
  const nWon = game.nswScore > game.qldScore;
  if(qWon) G.origin.series.qld++;
  else if(nWon) G.origin.series.nsw++;
  else G.origin.series.draws++;
  // Condition hit for coached team's Origin-eligible players
  const mt = myTeam();
  if(mt){
    for(const id of mt.players){
      const p = G.players[id];
      if(p && (p.stateRep==='Queensland'||p.stateRep==='New South Wales'))
        p.cond = Math.max(40, p.cond - ri(5, 12));
    }
  }
  const s = G.origin.series;
  const result = qWon
    ? `Queensland ${game.qldScore} def. New South Wales ${game.nswScore}`
    : nWon
    ? `New South Wales ${game.nswScore} def. Queensland ${game.qldScore}`
    : `Drawn ${game.qldScore}-${game.nswScore}`;
  const seriesStatus = s.qld===s.nsw
    ? `Series level ${s.qld} all.`
    : `${s.qld>s.nsw?'Queensland':'New South Wales'} lead ${Math.max(s.qld,s.nsw)}-${Math.min(s.qld,s.nsw)}.`;
  const remaining = 3 - game.num;
  addNews(
    `${result} at ${game.venue}. ${seriesStatus}${remaining>0?` ${remaining} game${remaining>1?'s':''} to go.`:' Series concluded.'}`,
    {title:`State of Origin — Game ${game.num}`, type:'origin', tone:'neutral', tag:'State of Origin', r:roundIdx+1, y:G.year}
  );
  // Highlight coached team players in Origin
  if(mt){
    const mySelected = [...qldXIII, ...nswXIII].filter(p=>mt.players.includes(p.id));
    if(mySelected.length){
      addNews(
        `${mySelected.map(p=>p.name).join(', ')} ${mySelected.length===1?'is':'are'} representing ${mySelected[0].stateRep==='Queensland'?'Queensland':'New South Wales'} in Origin Game ${game.num}.`,
        {title:'Your Players in Origin', type:'origin', tone:'good', tag:'State of Origin', r:roundIdx+1, y:G.year}
      );
    }
  }
}
/* ---------- post-season international window (Pacific Championship) ---------- */
function intlNationSquad(repTeam, pool){
  return pool.filter(p => p.repTeam === repTeam).sort((a,b)=>b.ovr-a.ovr).slice(0,17);
}
function intlNationStrength(squad){
  if(!squad.length) return 0;
  return squad.reduce((s,p)=>s+p.ovr,0) / squad.length;
}
function simIntlMatch(a, b){
  const diff = (a.str - b.str) * 0.18;
  const aTries = Math.max(0, Math.round(gauss(3.6 + diff, 1.7)));
  const bTries = Math.max(0, Math.round(gauss(3.6 - diff, 1.7)));
  let as = aTries*4 + Math.round(aTries*0.72)*2;
  let bs = bTries*4 + Math.round(bTries*0.72)*2;
  if(as === bs){ // golden-point field goal, slight edge to the stronger side
    if(rnd() < (a.str >= b.str ? 0.55 : 0.45)) as += 1; else bs += 1;
  }
  const winner = as > bs ? a : b;
  return { a, b, as, bs, winner, label: `${a.repTeam} ${as}–${bs} ${b.repTeam}` };
}
function simInternationalWindow(){
  const pool = Object.values(G.players).filter(p => p && !p.injury);
  const fielded = [];
  for(const n of NATIONALITY_POOL){
    const squad = intlNationSquad(n.repTeam, pool);
    if(squad.length >= 13) fielded.push({ repTeam:n.repTeam, squad, str:intlNationStrength(squad) });
  }
  if(fielded.length < 2) return null;
  fielded.sort((a,b)=>b.str-a.str);
  const top = fielded.slice(0, Math.min(4, fielded.length));
  const results = [];
  let champion, runnerUp;
  if(top.length >= 4){
    const sf1 = simIntlMatch(top[0], top[3]);
    const sf2 = simIntlMatch(top[1], top[2]);
    const final = simIntlMatch(sf1.winner, sf2.winner);
    results.push({stage:'Semi-final', ...sf1}, {stage:'Semi-final', ...sf2}, {stage:'Final', ...final});
    champion = final.winner; runnerUp = final.winner === sf1.winner ? sf2.winner : sf1.winner;
  } else if(top.length === 3){
    const elim = simIntlMatch(top[1], top[2]);
    const final = simIntlMatch(top[0], elim.winner);
    results.push({stage:'Elimination', ...elim}, {stage:'Final', ...final});
    champion = final.winner; runnerUp = final.winner === top[0] ? elim.winner : top[0];
  } else {
    const final = simIntlMatch(top[0], top[1]);
    results.push({stage:'Final', ...final});
    champion = final.winner; runnerUp = final.winner === top[0] ? top[1] : top[0];
  }
  // Caps for everyone who featured; honours for finalists.
  const honour = (nation, title) => {
    for(const p of nation.squad){
      p.repCaps = (p.repCaps || 0) + 1;
      p.intlHonours = p.intlHonours || [];
      p.intlHonours.push({ y:G.year, team:nation.repTeam, title });
    }
  };
  const finalistTeams = new Set([champion.repTeam, runnerUp.repTeam]);
  for(const n of top){
    if(n.repTeam === champion.repTeam) honour(n, 'Champion');
    else if(n.repTeam === runnerUp.repTeam) honour(n, 'Runner-up');
    else for(const p of n.squad){ p.repCaps = (p.repCaps || 0) + 1; }
  }
  const intl = { year:G.year, champion:champion.repTeam, runnerUp:runnerUp.repTeam,
    standings: top.map(n=>({repTeam:n.repTeam, str:Math.round(n.str)})), results };
  // News, highlighting the coached team's representatives.
  const mt = myTeam();
  const myReps = mt ? top.flatMap(n=>n.squad).filter(p=>mt.players.includes(p.id)) : [];
  addNews(
    `${champion.repTeam} are crowned International Champions, defeating ${runnerUp.repTeam} in the final.`,
    {title:'International Window', type:'origin', tone:'neutral', tag:'International', y:G.year}
  );
  if(myReps.length){
    addNews(
      `${myReps.map(p=>p.name).join(', ')} earned international honours this window${myReps.some(p=>finalistTeams.has(p.repTeam))?', featuring in the championship decider':''}.`,
      {title:'Your Players on the Test Stage', type:'origin', tone:'good', tag:'International', y:G.year}
    );
  }
  return intl;
}

function vendorRevenuePerHead(){
  const v = (G.club && G.club.vendors) || {fb:1, merch:1};
  return (VENDOR_FB_REV[v.fb || 1] || 3) + (VENDOR_MERCH_REV[v.merch || 1] || 1.5);
}

/* ---------- weekly progression ---------- */
function completeRound(roundIdx){
  if(G.phase !== 'regular') return null;
  roundIdx = roundIdx == null ? G.round : roundIdx;
  const round = G.fixtures && G.fixtures[roundIdx];
  if(!round || round._completed) return null;
  const myM = round.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId);

  // Bye week: give coached team players a bonus rest boost
  const byeTeams = (G.byes && G.byes[roundIdx]) || [];
  const onBye = byeTeams.includes(G.coach.teamId);
  if(onBye){
    const mt = myTeam();
    for(const id of mt.players){
      const p = G.players[id];
      if(p && !p.injury) p.cond = Math.min(100, p.cond + 8);
    }
    addNews(`${mt.nick} have a bye in Round ${roundIdx+1}. Players take advantage of the rest week.`, {
      title:'Bye Round', type:'club', tone:'neutral', teamId:G.coach.teamId, tag:'Bye'
    });
  }

  round._completed = true;
  recordTeamOfWeek(round);
  weeklyRecoveryAndDev();
  payCoachWeekly();
  payClubWeekly(round);
  aiUseFreeAgents();
  auditContractPromises();
  coachWeekly(myM);
  generateWeeklyMedia(round, myM);
  generateStaffRecommendations();
  generatePlayerMessages();
  advanceScouting();
  checkAchievements('round', {round, myM});
  simOriginIfDue(roundIdx);
  G.round = Math.max(G.round, roundIdx + 1);
  if(G.round >= G.fixtures.length){ startFinals(); }
  return {type:'round', round, roundIdx, myM, onBye};
}
function completeRoundIfReady(roundIdx){
  if(G.phase !== 'regular') return null;
  roundIdx = roundIdx == null ? G.round : roundIdx;
  const round = G.fixtures && G.fixtures[roundIdx];
  if(!round || !round.length || !round.every(m=>m.played)) return null;
  return completeRound(roundIdx);
}
function advanceRound(){
  if(G.phase==='regular'){
    const roundIdx = G.round;
    const round = G.fixtures[roundIdx];
    for(const m of round) simMatch(m, false);
    return completeRound(roundIdx);
  }
  if(G.phase==='finals'){ return advanceFinals(); }
  return null;
}
function achievementUnlocked(key){
  return (G.achievements || []).some(a=>a.key===key);
}
function unlockAchievement(key){
  if(!G || G.godMode || G.achievementsLocked) return false;
  if(achievementUnlocked(key)) return false;
  const def = ACHIEVEMENTS.find(a=>a.key===key);
  if(!def) return false;
  G.achievements = G.achievements || [];
  G.achievements.unshift({key, year:G.year, season:G.season, round:G.round+1, at:Date.now()});
  addNews(`Achievement unlocked: ${def.name}.`, {title:'Achievement Unlocked', type:'achievement', tone:'good', tag:'Achievement'});
  if(typeof UI !== 'undefined' && UI.toast) UI.toast(`Achievement unlocked: ${def.name}`);
  return true;
}
function checkAchievements(type, ctx){
  if(!G || G.godMode || G.achievementsLocked) return;
  const mt = myTeam && myTeam();
  if(!mt) return;
  if(mt.players.some(id=>{ const p=G.players[id]; return p && playerTier(p.ovr).key==='immortal'; })) unlockAchievement('immortal_player');
  if(G.club && G.club.funds >= 5000000) unlockAchievement('debt_free');
  if(type === 'round' && ctx && ctx.myM){
    const m = ctx.myM;
    const mineHome = m.h === G.coach.teamId;
    const pf = mineHome ? m.hs : m.as;
    const pa = mineHome ? m.as : m.hs;
    const opp = G.teams[mineHome ? m.a : m.h];
    if(pf > pa && pf-pa >= 50) unlockAchievement('whitewash');
    if(pf >= 100) unlockAchievement('century');
    if(pf > pa && pa === 0) unlockAchievement('shutout');
    if(mineHome && m.det && m.det.crowd >= 40000) unlockAchievement('full_house');
    if(pf > pa && opp && squadStrength(opp) - squadStrength(mt) >= 20) unlockAchievement('upset');
    // Comeback: won from 20+ down at half-time
    if(pf > pa && m.det && m.det.htScore){
      const htMine = mineHome ? m.det.htScore.h : m.det.htScore.a;
      const htOpp  = mineHome ? m.det.htScore.a : m.det.htScore.h;
      if(htOpp - htMine >= 20) unlockAchievement('comeback');
    }
    // Scouting star: any of our scouted prospects has reached OVR 80+
    if(!achievementUnlocked('scouting_star')){
      const hasStar = mt.players.some(id=>{ const p=G.players[id]; return p && p.fromScouting && p.ovr>=80; });
      if(hasStar) unlockAchievement('scouting_star');
    }
  }
  if(type === 'season' && ctx){
    const lad = ctx.lad || ladder();
    const myPos = ctx.myPos || lad.findIndex(r=>r.id===G.coach.teamId)+1;
    if(G.finals && G.finals.minor === G.coach.teamId) unlockAchievement('minor');
    if(myPos === G.teams.length) unlockAchievement('wooden_spoon');
    const myRow = lad.find(r=>r.id===G.coach.teamId);
    if(myRow && myRow.l === 0) unlockAchievement('perfect_season');
    if(G.finals && G.finals.premier === G.coach.teamId){
      unlockAchievement('premiers');
      const streak = premiershipStreak();
      if(streak >= 2) unlockAchievement('repeat');
      if(streak >= 3) unlockAchievement('dynasty');
      const prev = G.history && G.history[1];
      if(prev && prev.myPos && prev.myPos > G.teams.length - 4) unlockAchievement('bottom_to_top');
    }
    if(G.season === 1 && G.finals && G.finals.gf && (G.finals.gf.h===G.coach.teamId || G.finals.gf.a===G.coach.teamId)) unlockAchievement('grand_final_debut');
    if(ctx.best && teamOf(ctx.best.id) === mt.nick) unlockAchievement('poty_winner');
    if(ctx.rookie && teamOf(ctx.rookie.id) === mt.nick) unlockAchievement('rookie_winner');
    if(G.season >= 10) unlockAchievement('10_seasons');
  }
}
function premiershipStreak(){
  let streak = (G.finals && G.finals.premier === G.coach.teamId) ? 1 : 0;
  for(const h of G.history || []){
    if(h.premier === G.coach.teamId) streak++;
    else break;
  }
  return streak;
}
function coachBadgeList(c){
  c = c || G.coach;
  const out = [];
  const add = (key, label, desc, tier) => out.push({key, label, desc, tier:tier||'bronze'});
  const wins = c.careerW || 0, losses = c.careerL || 0, games = wins + losses;
  if(c.rep >= 25) add('development', 'Development Badge', 'Built a recognised coaching reputation.', 'bronze');
  if(c.rep >= 55) add('professional', 'Professional Badge', 'Respected first-grade coach.', 'silver');
  if(c.rep >= 72) add('elite', 'Elite Badge', 'Elite-level coaching reputation.', 'gold');
  if(c.rep >= 88) add('international', 'International Badge', 'International calibre coach.', 'gold');
  if(wins >= 1) add('first_win', 'First Win', 'Recorded a first career win.', 'bronze');
  if(wins >= 50) add('fifty', '50 Wins', 'Reached 50 career wins.', 'silver');
  if(wins >= 100) add('century', '100 Wins', 'Reached 100 career wins.', 'gold');
  if(games >= 30 && wins > losses) add('winning_record', 'Winning Record', 'Career record is above .500.', 'silver');
  if((c.prems || 0) >= 1) add('premier_coach', 'Premiership Coach', 'Won a premiership.', 'gold');
  if((c.prems || 0) >= 3) add('dynasty_coach', 'Dynasty Coach', 'Won three premierships.', 'gold');
  if((c.seasonsAtClub || 0) >= 5) add('club_builder', 'Club Builder', 'Stayed at a club for five seasons.', 'silver');
  if(c.attrs){
    if(c.attrs.development >= 75) add('developer', 'Talent Developer', 'Development skill is 75+.', 'silver');
    if(c.attrs.manMgmt >= 75) add('manager', 'Player Manager', 'Man management skill is 75+.', 'silver');
    if(c.attrs.fitness >= 75) add('fitness', 'Conditioning Lead', 'Fitness skill is 75+.', 'silver');
    if(c.attrs.tactics >= 75) add('tactician', 'Tactician', 'Tactics skill is 75+.', 'silver');
  }
  return out;
}
// Weeks of construction per facility type
const FACILITY_BUILD_WEEKS = {stadium:8, training:5, gym:3, medical:3, academy:5};

function ensureClubFacilities(){
  if(!G.club) G.club = { funds: 1500000, seasonRevenue: 0, seasonWages: 0 };
  G.club.facilities = Object.assign({stadium:2, training:1, gym:1, medical:1, academy:1}, G.club.facilities || {});
  if(!G.club.construction) G.club.construction = {};
  if(G.club.gateRevenue === undefined) G.club.gateRevenue = 0;
  if(G.club.broadcastRevenue === undefined) G.club.broadcastRevenue = 0;
  if(G.club.ticketPrice === undefined) G.club.ticketPrice = 28;
  if(G.club.membershipPrice === undefined) G.club.membershipPrice = 160;
  if(!G.club.currency) G.club.currency = 'AUD';
  return G.club.facilities;
}
function facilityLevel(key){
  const f = ensureClubFacilities();
  return clamp(Math.round(f[key] || 1), 1, FACILITY_MAX);
}
function ensureTeamFacilities(t){
  if(!t) return {};
  t.facilities = Object.assign({stadium:2, training:2, gym:2, medical:2, academy:2}, t.facilities || {});
  for(const key of Object.keys(FACILITY_DEFS)) t.facilities[key] = clamp(Math.round(t.facilities[key] || 2), 1, FACILITY_MAX);
  return t.facilities;
}
function teamFacilityLevel(t, key){
  if(!t) return 1;
  if(G && G.coach && t.id === G.coach.teamId) return facilityLevel(key);
  const f = ensureTeamFacilities(t);
  return clamp(Math.round(f[key] || 2), 1, FACILITY_MAX);
}
function teamFacilityAverage(t){
  const keys = Object.keys(FACILITY_DEFS);
  return keys.reduce((s,k)=>s+teamFacilityLevel(t,k),0) / keys.length;
}
function facilityUnderConstruction(key){
  ensureClubFacilities();
  return !!(G.club.construction && G.club.construction[key]);
}
function stadiumCapacity(){
  const lvl = facilityLevel('stadium');
  // During stadium construction, capacity drops by one tier (one grandstand closed)
  if(facilityUnderConstruction('stadium')) return STADIUM_CAPACITY_BY_LEVEL[Math.max(0, lvl - 2)] || STADIUM_CAPACITY_BY_LEVEL[0];
  return STADIUM_CAPACITY_BY_LEVEL[lvl - 1] || STADIUM_CAPACITY_BY_LEVEL[0];
}
function tickConstruction(){
  ensureClubFacilities();
  if(!G.club.construction) return;
  for(const key of Object.keys(G.club.construction)){
    const c = G.club.construction[key];
    if(G.round >= c.completesRound){
      G.club.facilities[key] = c.targetLevel;
      delete G.club.construction[key];
      addNews(`Construction complete: ${FACILITY_DEFS[key] ? FACILITY_DEFS[key].label : key} upgraded to level ${c.targetLevel}.`, {
        title:'Facility Complete', type:'club', tone:'good', teamId:G.coach.teamId, tag:'Facilities'
      });
    }
  }
}
function facilityUpgradeCost(key){
  const def = FACILITY_DEFS[key]; if(!def) return 0;
  const lvl = facilityLevel(key);
  if(lvl >= FACILITY_MAX) return 0;
  return Math.round(def.baseCost * Math.pow(1.72, lvl - 1) / 50000) * 50000;
}
function facilityPrestige(){
  const f = ensureClubFacilities();
  const avg = Object.keys(FACILITY_DEFS).reduce((s,k)=>s+facilityLevel(k),0) / Object.keys(FACILITY_DEFS).length;
  if(avg >= 4.5) return {label:'World Class', cls:'good'};
  if(avg >= 3.5) return {label:'Elite', cls:'good'};
  if(avg >= 2.5) return {label:'Professional', cls:''};
  if(avg >= 1.5) return {label:'Developing', cls:'warn'};
  return {label:'Basic', cls:'bad'};
}
function clubPrestigeScore(t){
  if(!t) return 45;
  const strength = typeof squadStrength === 'function' ? squadStrength(t) : (t.rep || 55);
  const coachRep = t.headCoach ? (t.headCoach.rep || 35) : 35;
  const ladderRows = (G && G.fixtures && G.fixtures.length && typeof ladder === 'function') ? ladder() : [];
  const pos = ladderRows.length ? ladderRows.findIndex(r=>r.id===t.id)+1 : 0;
  const ladderScore = pos ? clamp(72 - (pos-1) * (38/Math.max(1,G.teams.length-1)), 30, 74) : 50;
  const historyBonus = (G.history || []).slice(0,5).reduce((s,h,i)=>s + (h.premier===t.id ? 7-i : h.minor===t.id ? 3-i*.4 : 0), 0);
  const facilityBonus = (Object.keys(FACILITY_DEFS).reduce((s,k)=>s+teamFacilityLevel(t,k),0) - 5) * 1.4;
  return Math.round(clamp(strength*.42 + coachRep*.18 + ladderScore*.22 + 18 + historyBonus + facilityBonus, 20, 99));
}
function clubPrestigeTier(t){
  const score = clubPrestigeScore(t);
  if(score >= 82) return {key:'dynasty', label:'Dynasty Club', icon:'C', score};
  if(score >= 72) return {key:'elite', label:'Elite Club', icon:'S', score};
  if(score >= 62) return {key:'strong', label:'Strong Club', icon:'G', score};
  if(score >= 50) return {key:'solid', label:'Established Club', icon:'B', score};
  if(score >= 38) return {key:'developing', label:'Developing Club', icon:'D', score};
  return {key:'rebuild', label:'Rebuild Club', icon:'R', score};
}
function aiTicketPrice(t){ return Math.round(clamp(14 + squadStrength(t) * 0.24, 15, 46)); }
function aiMembershipPrice(t){ return Math.round(clamp(95 + squadStrength(t) * 1.25, 100, 340)); }
function leagueTicketInfo(){
  const myPrice = G.club ? (G.club.ticketPrice || 28) : 28;
  const teamPrices = G.teams.map(t => t.id === G.coach.teamId ? myPrice : aiTicketPrice(t)).sort((a,b) => a - b);
  const avg = Math.round(teamPrices.reduce((s,p) => s+p, 0) / teamPrices.length);
  const cheaperCount = teamPrices.filter(p => p < myPrice).length;
  const moreExpensiveCount = teamPrices.filter(p => p > myPrice).length;
  return { avg, myPrice, rankFromCheapest: cheaperCount+1, rankFromMostExpensive: moreExpensiveCount+1, totalTeams: G.teams.length };
}
// Avg/min/max/rank for both home ticket and season membership prices across the league.
function leagueClubPrices(){
  const myTicket = G.club ? (G.club.ticketPrice || 28) : 28;
  const myMember = G.club ? (G.club.membershipPrice == null ? 160 : G.club.membershipPrice) : 160;
  const tickets = [], members = [];
  for(const t of G.teams){
    if(t.id === G.coach.teamId){ tickets.push(myTicket); members.push(myMember); }
    else { tickets.push(aiTicketPrice(t)); members.push(aiMembershipPrice(t)); }
  }
  const stat = (arr, mine) => {
    const sorted = arr.slice().sort((a,b)=>a-b);
    const avg = Math.round(arr.reduce((s,p)=>s+p,0)/arr.length);
    const cheaper = arr.filter(p => p < mine).length;
    return { avg, min: sorted[0], max: sorted[sorted.length-1], mine,
      rankFromCheapest: cheaper+1, total: arr.length };
  };
  return { ticket: stat(tickets, myTicket), membership: stat(members, myMember) };
}
function recentWinStreak(teamId){
  const played = [];
  (G.fixtures || []).forEach((round, rIdx) => {
    if(!round) return;
    for(const f of round){
      if(f && f.played && (f.h === teamId || f.a === teamId)) played.push({f, rIdx});
    }
  });
  played.sort((a, b) => b.rIdx - a.rIdx);
  let streak = 0;
  for(const {f} of played.slice(0, 8)){
    const won = f.h === teamId ? f.hScore > f.aScore : f.aScore > f.hScore;
    if(won) streak++;
    else break;
  }
  return streak;
}
function matchCrowd(homeTeam, isFinal){
  if(isFinal) return ri(52000, 82000);
  const isMine = homeTeam && homeTeam.id === G.coach.teamId;
  const cap = isMine ? stadiumCapacity() : (STADIUM_CAPACITY_BY_LEVEL[teamFacilityLevel(homeTeam, 'stadium') - 1] || ri(22000, 52000));
  const rep = homeTeam ? (homeTeam.rep || squadStrength(homeTeam)) : 55;
  const formBoost = homeTeam ? Math.max(-1800, Math.min(3000, ((homeTeam.cohesion || 50) - 50) * 90)) : 0;
  const price = isMine ? clamp(G.club.ticketPrice || 28, 10, 120) : 28;

  let priceDrag;
  if(isMine){
    const leagueAvg = leagueTicketInfo().avg;
    const prestige = clubPrestigeScore(homeTeam);
    const priceAboveAvg = price - leagueAvg;
    const sensitivity = clamp(1.8 - (prestige / 99) * 1.3, 0.35, 1.8);
    priceDrag = priceAboveAvg > 0 ? priceAboveAvg * 260 * sensitivity : priceAboveAvg * 160;
  } else {
    priceDrag = (price - 28) * 280;
  }

  const winStreak = homeTeam ? recentWinStreak(homeTeam.id) : 0;
  const streakBoost = Math.min(winStreak, 5) * 800;
  const demand = Math.round(8500 + rep * 360 + formBoost - priceDrag + streakBoost + rf(-3500, 4500));
  return clamp(demand, Math.min(9000, cap), cap);
}
function weeklyRecoveryAndDev(){
  for(const t of G.teams){
    const isMine = t.id === G.coach.teamId;
    const fitnessBonus = (isMine && G.coach.attrs) ? G.coach.attrs.fitness / 300 : 0;
    for(const id of t.players){
      const p = G.players[id];
      const facilityRecovery = (teamFacilityLevel(t, 'gym') - 1) * 1.4;
      const recBase = (t.focus==='recovery' ? 5 : 2) + facilityRecovery;
      p.cond = clamp(p.cond + recBase + p.attrs.stamina/20 + fitnessBonus*10, 0, 100);
      if(p.injury){
        p.injury.weeks--;
        // Medical quality: user club gets physio + facility; AI clubs use facility level.
        if(p.injury.weeks > 0){
          const medic = (G.staff||[]).find(s=>s.role==='medical');
          const medFacilityBonus = (teamFacilityLevel(t, 'medical') - 1) * .018;
          const medicBonus = isMine && medic ? medic.ability/220 : 0;
          if(rnd() < medicBonus + medFacilityBonus) p.injury.weeks = Math.max(0, p.injury.weeks-1);
        }
        if(p.injury.weeks<=0){ p.injury=null; p.playInjured=false; p.cond=Math.min(p.cond,80); }
      }
      if(p.suspended && p.suspended.weeks > 0){ p.suspended.weeks--; if(p.suspended.weeks<=0) p.suspended=null; }
      developPlayer(p, t);
    }
    if(!isMine) autoPick(t);
  }
}
function staffMultiplier(attrKey, playerPos){
  if(!G.staff) return 1;
  let mult = 1;
  for(const s of G.staff){
    const role = STAFF_ROLES.find(r=>r.key===s.role);
    if(role && role.trainingKeys.includes(attrKey)){
      mult = Math.max(mult, 1 + (s.ability / 90) * 0.35);
    }
    // Positional specialty gives a secondary key-skill boost for that position
    if(playerPos && s.posSpecialty === playerPos && POS_PROFILE[playerPos]){
      const posKeys = Object.entries(POS_PROFILE[playerPos]).filter(([,v])=>v[1]>=.07).map(([k])=>k);
      if(posKeys.includes(attrKey)){
        mult = Math.max(mult, 1 + (s.ability / 90) * 0.18);
      }
    }
  }
  return mult;
}
function positionalCoachMultiplier(pos){
  if(!G.staff || !pos) return 1;
  const coach = G.staff
    .filter(s => s.posSpecialty === pos)
    .sort((a,b) => b.ability - a.ability)[0];
  return coach ? 1 + coach.ability / 170 : 1;
}
const PHYSICAL_ATTRS = ['speed','acceleration','agility','stamina','strength','ballRunning'];
const TECHNICAL_ATTRS = ['ballRunning','finishing','shortPass','longPass','tackling','defRead','bigHit','lastDitch','markerDef','catching','ballSecurity'];
const MENTAL_ATTRS = ['composure','leadership','vision','decisionMaking','discipline','professionalism','workRate'];

// Returns attributes that most affect OVR for a position (weight >= 0.07 in POS_PROFILE)
function positionKeyAttrs(pos){
  const profile = POS_PROFILE[pos];
  if(!profile) return ATTRS;
  return Object.keys(profile).filter(k => profile[k][1] >= 0.07);
}

function developPlayer(p, t){
  const isMine = t.id===G.coach.teamId;
  handleIndividualTraining(p, t);
  const teamFocusBoost = {
    attack:['shortPass','longPass','kickAccuracy','kickPower','playmaking','ballRunning','finishing','ballSecurity'],
    defence:['tackling','defRead','bigHit','lastDitch','markerDef','workRate'],
    fitness:['stamina','speed','strength','acceleration','agility','injury'],
    youth:[],
    recovery:[],
    balanced:[]
  }[t.focus]||[];
  const individualBoost = isMine ? {
    attack:['shortPass','longPass','kickAccuracy','kickPower','playmaking','ballRunning','finishing','ballSecurity'],
    defence:['tackling','defRead','bigHit','lastDitch','markerDef','workRate'],
    physical:['stamina','speed','strength','acceleration','agility','injury','catching'],
    mental:['composure','leadership','vision','decisionMaking','discipline','professionalism'],
    balanced:[],
    position:[],
    specialist:[]
  }[p.training || 'balanced'] || [] : [];
  const focusBoost = individualBoost.length ? individualBoost : (isMine ? teamFocusBoost : []);
  const facilityDev = 0.92 + teamFacilityLevel(t, 'training')*.035 + (p.age<=21 ? teamFacilityLevel(t, 'academy')*.025 : 0);
  const devMod = ((isMine && G.coach.attrs) ? (0.7 + 0.6*(G.coach.attrs.development/100)) : 1) * facilityDev;
  const gamesProxy = p.squad==='dev' ? Math.min(p.s.g + 8, 20) : p.s.g;
  const profMod = clamp(0.6 + (p.attrs.professionalism || 50) / 200, 0.6, 1.05);
  const gameTimeMod = clamp(0.5 + gamesProxy / 20, 0.5, 1.0);
  const moraleMod = clamp(0.78 + (p.morale || 50) / 230, 0.78, 1.07);
  const injuryMod = p.injury ? 0.45 : 1.0;

  // ── GROWTH ───────────────────────────────────────────────────────────────
  // Expected attribute gains per week (Poisson rate). Higher rates mean visible
  // OVR progress: a 20yo on full game time should gain 2-5 OVR over a season.
  let growExpected = 0;
  if(p.age <= 17)       growExpected = 2.2;
  else if(p.age <= 19)  growExpected = 1.8;
  else if(p.age <= 21)  growExpected = 1.3;
  else if(p.age <= 23)  growExpected = 0.85;
  else if(p.age <= 25)  growExpected = 0.48;
  else if(p.age <= 27)  growExpected = 0.25;
  else if(p.age <= 30)  growExpected = 0.10;

  growExpected *= profMod * gameTimeMod * moraleMod * injuryMod * devMod;
  if(t.focus==='youth' && p.age<=21 && isMine) growExpected *= 1.5;

  const keyAttrs = positionKeyAttrs(p.pos);
  const growGains = Math.min(poisson(growExpected), 3);
  for(let _g = 0; _g < growGains && p.ovr < p.pot; _g++){
    // 72% chance to target position key attributes (high OVR weight), else use focus/random pool
    const pool = (keyAttrs.length && rnd() < 0.72) ? keyAttrs
               : (focusBoost.length && rnd() < 0.55) ? focusBoost : ATTRS;
    const a = pick(pool);
    const staffBonus = isMine ? staffMultiplier(a, p.pos) : 1;
    const gain = staffBonus > 1.15 && rnd() < (staffBonus - 1) ? 2 : 1;
    p.attrs[a] = clamp(p.attrs[a]+gain, 20, 99);
    const prevOvr = p.ovr;
    p.ovr = calcOvr(p);
    // Immortal cap: at most 3 active Immortal-tier players league-wide (OVR 92+)
    if(p.ovr >= 92 && prevOvr < 92){
      const immortalCount = Object.values(G.players).filter(x => x && x.id !== p.id && x.ovr >= 92).length;
      if(immortalCount >= 3){
        p.attrs[a] = clamp(p.attrs[a] - gain, 20, 99);
        p.ovr = calcOvr(p);
      } else {
        const t2 = G.teams ? G.teams.find(tm => tm.players && tm.players.includes(p.id)) : null;
        addNews(`${esc(p.name)} (${p.pos}, ${t2?esc(t2.nick):'Free Agent'}) has ascended to Immortal status — one of just ${immortalCount+1} players ever to reach this level.`,
          {title:'Immortal Player', type:'development', tone:'good', playerId:p.id, teamId:t2?t2.id:null, tag:'Development'});
      }
    }
    if(isMine && p.squad==='dev' && prevOvr < 60 && p.ovr >= 60){
      addNews(`Development: ${p.name} (${p.pos}, ${p.age}yo) has reached OVR ${p.ovr} and may be ready for top-squad promotion.`, {
        title: 'Pathway Player Ready',
        type: 'development',
        tone: 'good',
        playerId: p.id,
        tag: 'Development',
      });
    }
  }

  // ── VETERAN MENTAL GROWTH (ages 28–36) ──────────────────────────────────
  // Experienced players can still improve composure, leadership, vision etc.
  // even as physical skills begin to fade.
  if(p.age >= 28 && p.age <= 36 && !p.injury && gamesProxy >= 10){
    const mentalChance = clamp(0.036 + (p.age - 28) * 0.003, 0.036, 0.060) * moraleMod * devMod;
    if(rnd() < mentalChance){
      const a = pick(MENTAL_ATTRS);
      if(p.attrs[a] < 92){
        p.attrs[a] = clamp(p.attrs[a]+1, 20, 99);
        p.ovr = calcOvr(p);
      }
    }
  }

  // ── PHYSICAL DECLINE ─────────────────────────────────────────────────────
  // Gradual from age 29, accelerating sharply from 33+
  let physDecline = 0;
  if(p.age >= 36)       physDecline = 0.17 + (p.age - 36) * 0.025;
  else if(p.age >= 33)  physDecline = 0.07 + (p.age - 33) * 0.033;
  else if(p.age >= 31)  physDecline = 0.03 + (p.age - 31) * 0.020;
  else if(p.age >= 29)  physDecline = 0.012;
  // High professionalism slows decline slightly
  if(physDecline > 0 && (p.attrs.professionalism || 50) >= 75) physDecline *= 0.82;

  if(physDecline > 0 && rnd() < physDecline){
    const a = pick(PHYSICAL_ATTRS);
    p.attrs[a] = clamp(p.attrs[a]-1, 20, 99);
    p.ovr = calcOvr(p);
  }

  // ── TECHNICAL SKILL DECLINE (ages 35+) ──────────────────────────────────
  // Ball skills, tackling technique, and game awareness erode in the late career
  if(p.age >= 35 && rnd() < 0.020 + (p.age - 35) * 0.009){
    const a = pick(TECHNICAL_ATTRS);
    p.attrs[a] = clamp(p.attrs[a]-1, 20, 99);
    p.ovr = calcOvr(p);
  }
}
function handleIndividualTraining(p, t){
  if(t.id !== G.coach.teamId || !p.training) return;
  const devMod = G.coach.attrs ? (0.6 + G.coach.attrs.development/130) : 1;
  if(p.training === 'position' && p.retrainPos && p.retrainPos !== p.pos && p.retrainPos !== p.pos2){
    const chance = clamp((p.attrs.professionalism+p.attrs.decisionMaking+p.attrs.workRate)/360 * devMod * positionalCoachMultiplier(p.retrainPos), .04, .42);
    if(rnd() < chance){
      p.pos2 = p.retrainPos;
      p.retrainPos = null;
      addNews(`${p.name} has completed positional retraining and is now comfortable covering ${POS_NAME[p.pos2]}.`, {title:'Retraining Complete', type:'development', tone:'good', playerId:p.id, teamId:t.id, tag:'Training'});
    }
  }
  if(p.training === 'specialist' && p.retrainSpec && p.retrainSpec !== p.spec){
    const chance = clamp((p.attrs.professionalism+p.attrs.composure+p.attrs.workRate)/390 * devMod * positionalCoachMultiplier(p.pos), .05, .36);
    if(rnd() < chance){
      p.spec = p.retrainSpec;
      p.side = ['leftWing','leftCentre','leftEdge'].includes(p.spec) ? 'left' : ['rightWing','rightCentre','rightEdge'].includes(p.spec) ? 'right' : 'either';
      p.retrainSpec = null;
      addNews(`${p.name} has adapted to a new ${specialistLabel(p).toLowerCase()} specialist role.`, {title:'Role Retraining Complete', type:'development', tone:'good', playerId:p.id, teamId:t.id, tag:'Training'});
    }
  }
}
function payCoachWeekly(){
  if(!G.coach) return;
  const weeks = Math.max(1, (G.fixtures ? G.fixtures.length : 24) + 3);
  const pay = Math.round((G.coach.salary || 120000) / weeks);
  G.coach.cash = Math.round((G.coach.cash || 0) + pay);
  G.coach.weeklyPayEarned = (G.coach.weeklyPayEarned || 0) + pay;
}
function payClubWeekly(round){
  ensureClubFacilities();
  tickConstruction();
  const t = myTeam();
  const weeks = Math.max(1, (G.fixtures ? G.fixtures.length : 24) + 3);
  // Revenue: gate (per-match crowd) + broadcast deal
  const myM = round.find(m => m.h === G.coach.teamId || m.a === G.coach.teamId);
  const mineHome = myM && myM.h === G.coach.teamId;
  const crowd = myM && myM.det ? myM.det.crowd : 18000;
  const ticketPrice = myM && myM.det && myM.det.ticketPrice ? myM.det.ticketPrice : (G.club.ticketPrice || 28);
  const gateRevenue = mineHome ? Math.round(crowd * ticketPrice) : 0;
  const vendorRevenue = mineHome ? Math.round(crowd * vendorRevenuePerHead()) : 0;
  const broadcastRevenue = 75000;
  // Magic Round hosting windfall
  let magicRoundRevenue = 0;
  if(G.magicRound && G.round === G.magicRound.round && G.magicRound.hostTeamId === G.coach.teamId){
    magicRoundRevenue = 1500000;
    G.club.magicRoundRevenue = (G.club.magicRoundRevenue || 0) + magicRoundRevenue;
    const mrHost = myTeam();
    addNews(
      `Magic Round hosting payment received — $1,500,000 windfall from NRL for hosting all Round ${G.round+1} fixtures at ${G.magicRound.venue}.`,
      {title:'Magic Round Revenue', type:'club', tone:'good', teamId:G.coach.teamId, tag:'Magic Round'}
    );
  }
  const totalRevenue = gateRevenue + vendorRevenue + broadcastRevenue + magicRoundRevenue;
  // Wages: player salaries + staff salaries (weekly portion of annual)
  const playerWages = Math.round(teamSalary(t) / weeks);
  const staffWages = (G.staff || []).reduce((s, x) => s + Math.round((x.salary || 0) / weeks), 0);
  const totalWages = playerWages + staffWages;
  G.club.funds = Math.round((G.club.funds || 0) + totalRevenue - totalWages);
  G.club.seasonRevenue = (G.club.seasonRevenue || 0) + totalRevenue;
  G.club.gateRevenue = (G.club.gateRevenue || 0) + gateRevenue;
  G.club.vendorRevenue = (G.club.vendorRevenue || 0) + vendorRevenue;
  G.club.broadcastRevenue = (G.club.broadcastRevenue || 0) + broadcastRevenue;
  G.club.seasonWages = (G.club.seasonWages || 0) + totalWages;
}
function aiUseFreeAgents(){
  if(!G.freeAgents || !G.freeAgents.length) return;
  const market = () => (G.freeAgents || []).map(id=>G.players[id]).filter(p=>p && !G.teams.some(t=>t.players.includes(p.id)));
  for(const t of G.teams){
    if(t.id === G.coach.teamId) continue;
    const top = t.players.map(id=>G.players[id]).filter(p=>p && isTopSquadPlayer(p));
    const fit = top.filter(p=>!p.injury);
    const injuries = top.length - fit.length;
    if(top.length >= TOP_SQUAD_CAP) continue;
    if(top.length >= 25 && injuries < 4 && rnd() > .08) continue;
    const needPos = POS.slice().sort((a,b)=>fit.filter(p=>p.pos===a||p.pos2===a).length - fit.filter(p=>p.pos===b||p.pos2===b).length)[0];
    const room = G.config.cap - teamSalary(t);
    const cands = market().filter(p=>p.salary <= room && (p.pos===needPos || p.pos2===needPos || top.length<24)).sort((a,b)=>b.ovr-a.ovr);
    if(!cands.length) continue;
    const p = cands[Math.floor(rnd()*Math.min(3,cands.length))];
    setPlayerContract(p, Math.min(p.salary || salaryFor(p), Math.max(65000, room)), 1, 'flat');
    p.squad = 'top';
    p.everTopSquad = true;
    t.players.push(p.id);
    G.freeAgents = G.freeAgents.filter(id=>id!==p.id);
    addNews(`${p.name} has signed with the ${t.nick} as a mid-season free agent to cover ${needPos} depth.`, {title:'Free Agent Move', type:'recruitment', tone:'neutral', playerId:p.id, teamId:t.id, tag:'Market'});
  }
}
function auditContractPromises(){
  const t = myTeam();
  if(!t || G.phase !== 'regular') return;
  const active = new Set(t.lineup.slice(0,17).filter(id=>id!=null));
  const starters = new Set(t.lineup.slice(0,13).filter(id=>id!=null));
  for(const id of t.players){
    const p = G.players[id];
    if(!p || !p.promises || p.promiseTeam !== t.id) continue;
    let broken = false;
    if(p.promises.role === 'starter' && !starters.has(p.id)) broken = true;
    if(p.promises.role === 'bench' && !active.has(p.id)) broken = true;
    if(p.promises.role === 'superstar' && (!starters.has(p.id) || (p.s.g >= 4 && p.s.g ? p.s.rSum/p.s.g < 6.7 : false))) broken = true;
    if(p.promises.captain && t.roles.captain !== p.id) broken = true;
    // Minutes promise: must have appeared in ≥55% of rounds played after round 8
    if(p.promises.minutes && G.round >= 8){
      const gamesExpected = Math.floor(G.round * 0.55);
      if(p.s.g < gamesExpected) broken = true;
    }
    // Pathway promise: young players (≤22) must have appeared in ≥35% of rounds after round 10
    if(p.promises.pathway && p.age <= 22 && G.round >= 10){
      const gamesExpected = Math.floor(G.round * 0.35);
      if(p.s.g < gamesExpected) broken = true;
    }
    if(broken){
      p.promiseConcern = (p.promiseConcern || 0) + 1;
      p.morale = clamp(p.morale - (p.promiseConcern >= 4 ? 5 : 2), 5, 99);
      if(p.promiseConcern === 4){
        addNews(`${p.name} is frustrated that contract promises have not been kept and may consider asking for a release.`, {title:'Promise Pressure', type:'contract', tone:'bad', playerId:p.id, teamId:t.id, tag:'Contracts'});
      }
      if(p.promiseConcern >= 7 && !p.releaseRequest){
        p.releaseRequest = true;
        addNews(`${p.name} has requested a release after repeated broken promises.`, {title:'Release Request', type:'contract', tone:'bad', playerId:p.id, teamId:t.id, tag:'Contracts'});
      }
    } else {
      p.promiseConcern = Math.max(0, (p.promiseConcern || 0) - 1);
    }
  }
}
function coachWeekly(myM){
  if(!myM) return;
  const won = (myM.h===G.coach.teamId) ? myM.hs>myM.as : myM.as>myM.hs;
  const drew = myM.hs===myM.as;
  if(won){
    G.coach.rep = clamp(G.coach.rep+.4, 1, 99);
    G.coach.conf = clamp(G.coach.conf+3, 0, 100);
    G.coach.careerW++;
    if(G.coach.attrs && rnd()<0.2){
      const keys = ['development','manMgmt','fitness','tactics'];
      const k = keys[Math.floor(rnd()*keys.length)];
      G.coach.attrs[k] = clamp(G.coach.attrs[k]+1, 20, 99);
    }
  } else if(!drew){
    G.coach.rep = clamp(G.coach.rep-.2, 1, 99);
    G.coach.conf = clamp(G.coach.conf-4, 0, 100);
    G.coach.careerL++;
  }
  if(G.coach.conf < 20) addNews(`The ${myTeam().nick} board is losing patience with ${G.coach.name}. Results need to turn quickly.`, {
    title: 'Board Pressure Mounts',
    type: 'board',
    tone: 'bad',
    teamId: G.coach.teamId,
    tag: 'Board',
  });
}
function generateWeeklyMedia(round, myM){
  if(!myM) return;
  const mineHome = myM.h === G.coach.teamId;
  const mt = myTeam();
  const opp = G.teams[mineHome ? myM.a : myM.h];
  const pf = mineHome ? myM.hs : myM.as;
  const pa = mineHome ? myM.as : myM.hs;
  const won = pf > pa;
  const drew = pf === pa;
  const mineDet = mineHome ? myM.det.h : myM.det.a;
  const top = Object.entries(mineDet).map(([id,l])=>({p:G.players[id], l})).filter(x=>x.p).sort((a,b)=>b.l.r-a.l.r)[0];
  const resultWord = drew ? 'draw with' : won ? 'beat' : 'fall to';
  const margin = Math.abs(pf-pa);
  const topLine = top ? ` ${top.p.name} led the side with a ${top.l.r.toFixed(1)} rating${top.l.t ? ` and ${top.l.t} ${top.l.t===1?'try':'tries'}` : ''}.` : '';
  addNews(`${mt.nick} ${resultWord} ${opp.nick} ${pf}-${pa}${drew ? '' : ` by ${margin}`}.${topLine}`, {
    title: drew ? 'Points Shared' : won ? 'Result: Win Banked' : 'Result: Work To Do',
    type: 'match',
    tone: drew ? 'neutral' : won ? 'good' : 'bad',
    teamId: mt.id,
    playerId: top ? top.p.id : null,
    tag: `Round ${G.round+1}`,
  });

  const injuries = Object.entries(mineDet).filter(([id,l])=>l.inj).map(([id,l])=>({p:G.players[id], l}));
  if(injuries.length){
    const item = injuries[0];
    addNews(`${item.p.name} picked up ${item.l.inj} against ${opp.nick} and is expected to miss ${item.p.injury ? item.p.injury.weeks : 0} week${item.p.injury && item.p.injury.weeks===1?'':'s'}.`, {
      title: injuries.length > 1 ? 'Casualty Ward Fills' : 'Injury Report',
      type: 'injury',
      tone: 'bad',
      playerId: item.p.id,
      teamId: mt.id,
      tag: 'Medical',
    });
  }

  // Post-match analysis: richer item for the inbox
  if(myM.det){
    const oppDet = mineHome ? myM.det.a : myM.det.h;
    const topMine = Object.entries(mineDet).map(([id,l])=>({p:G.players[+id], l})).filter(x=>x.p).sort((a,b)=>b.l.r-a.l.r).slice(0,3);
    const topOpp  = Object.entries(oppDet).map(([id,l])=>({p:G.players[+id], l})).filter(x=>x.p).sort((a,b)=>b.l.r-a.l.r).slice(0,1);
    const myTk  = Object.values(mineDet).reduce((s,l)=>s+(l.tk||0), 0);
    const myErr = Object.values(mineDet).reduce((s,l)=>s+(l.err||0), 0);
    const myRuns= Object.values(mineDet).reduce((s,l)=>s+(l.runs||0), 0);
    const perfLines = topMine.map(x=>`${x.p.name} (${x.l.r.toFixed(1)}${x.l.t?', '+x.l.t+'T':''})`).join('; ');
    const oppStar = topOpp[0] ? ` Opponent standout: ${topOpp[0].p.name} (${topOpp[0].l.r.toFixed(1)}).` : '';
    const statsLine = `Tackles ${myTk} · Errors ${myErr} · Runs ${myRuns}.`;
    addNews(
      `${won?'Victory':'Defeat'} — ${pf}-${pa}${drew?' (draw)':''}. Standouts: ${perfLines||'-'}.${oppStar} ${statsLine}`,
      {
        title: 'Post-Match Analysis',
        type: 'analysis',
        tone: drew ? 'neutral' : won ? 'good' : 'bad',
        teamId: mt.id,
        tag: `Round ${G.round+1}`,
        matchId: G.round,
      }
    );
  }

  const fantasy = [];
  for(const m of round){
    if(!m.det) continue;
    for(const side of [m.det.h, m.det.a]){
      for(const [id,line] of Object.entries(side)){
        const p = G.players[+id];
        if(p && line.fp != null) fantasy.push({p, line});
      }
    }
  }
  fantasy.sort((a,b)=>b.line.fp-a.line.fp);
  const best = fantasy[0];
  if(best && best.line.fp >= 12){
    const club = G.teams.find(t=>t.players.includes(best.p.id));
    addNews(`${best.p.name} topped the fantasy charts with ${best.line.fp} FP${club ? ` for ${club.nick}` : ''}.`, {
      title: 'Fantasy Standout',
      type: 'fantasy',
      tone: best.p.id in mineDet ? 'good' : 'neutral',
      playerId: best.p.id,
      teamId: club ? club.id : null,
      tag: 'Fantasy',
    });
  }

  if((G.coach.shortlist || []).length && G.phase === 'regular' && (G.round+1) % 4 === 0){
    const offContract = (G.coach.shortlist || []).map(id=>G.players[id]).filter(p=>p && p.years<=1);
    if(offContract.length){
      addNews(`${offContract.length} shortlisted target${offContract.length===1?' is':'s are'} in the final year or off-contract. Recruitment staff recommend making approaches before the market moves.`, {
        title: 'Recruitment Watch',
        type: 'recruitment',
        tone: 'neutral',
        tag: 'Recruitment',
      });
    }
  }

  // Contract concern messages — fire every 3 rounds for relevant players
  if(G.phase === 'regular' && (G.round+1) % 3 === 0){
    const mt3 = myTeam();
    const squad = mt3.players.map(id=>G.players[id]).filter(p=>p && (p.squad==='top'||!p.squad));

    // Final-year unhappy players who might want out
    const wantsOut = squad.filter(p => p.years <= 1 && (p.morale||50) < 42 && p.age < 35 && rnd() < 0.5);
    if(wantsOut.length){
      const p = wantsOut[0];
      addNews(
        `${p.name} has one year remaining on his contract and club sources indicate he is unsettled. A new deal or release may need to be considered before the off-season.`,
        {title:'Contract Concern', type:'contract', tone:'bad', playerId:p.id, teamId:mt3.id, tag:'Contracts', r:G.round+1, y:G.year}
      );
    }

    // Release requests — very low morale in top squad
    const releaseRequest = squad.filter(p => (p.morale||50) < 28 && p.years >= 1 && rnd() < 0.45);
    if(releaseRequest.length){
      const p = releaseRequest[0];
      addNews(
        `${p.name}'s agent has contacted the club to request a formal release. His morale has dropped significantly and he wants to explore his options elsewhere.`,
        {title:'Release Request', type:'contract', tone:'bad', playerId:p.id, teamId:mt3.id, tag:'Contracts', r:G.round+1, y:G.year}
      );
    }

    // Expiring contracts no offer tabled — gentle nudge every 6 rounds
    if((G.round+1) % 6 === 0){
      const expiring = squad.filter(p => p.years <= 1 && (p.morale||50) >= 50 && p.age <= 32);
      if(expiring.length >= 3){
        addNews(
          `${expiring.length} top-squad players are heading into the final year of their contracts with no extension tabled. Club management should act before rivals start circling.`,
          {title:'Contract Queue Warning', type:'contract', tone:'neutral', teamId:mt3.id, tag:'Contracts', r:G.round+1, y:G.year}
        );
      }
    }
  }

  // Mid-season AI head coach sackings — two triggers:
  // 1. Early-season panic: round 8+ on a 5-game skid (12% chance)
  // 2. Standard: round 12+, bottom quartile, 3 losses from last 4 (22% chance)
  const sackedThisRound = new Set();
  const tryAISacking = (teams, recentThreshold, ladFloor, chance) => {
    const lad = ladder();
    const n = G.teams.length;
    for(const t of teams){
      if(t.id === G.coach.teamId) continue;
      if(sackedThisRound.has(t.id)) continue;
      if(!t.headCoach || (t.headCoach.seasons || 0) < 1) continue;
      const ladPos = lad.findIndex(r=>r.id===t.id);
      if(ladPos < Math.floor(n * ladFloor)) continue;
      const row = lad[ladPos];
      const recentLosses = (row.form || []).slice().reverse().slice(0, recentThreshold).filter(f=>f==='L').length;
      if(recentLosses < recentThreshold) continue;
      if(rnd() > chance) continue;
      const oldName = t.headCoach.name;
      const oldPhilosophy = t.headCoach.philosophy;
      const newCoach = genAIHeadCoach();
      t.headCoach = newCoach;
      // New coach may shift team plan toward their philosophy
      if(newCoach.plan && rnd() < 0.6) t.plan = newCoach.plan;
      // Brief cohesion drop — new voice in the sheds
      t.cohesion = clamp((t.cohesion || 50) - ri(5, 12), 10, 90);
      sackedThisRound.add(t.id);
      const philInfo = COACH_PHILOSOPHIES.find(p=>p.key===newCoach.philosophy);
      const quote = pick(COACH_PRESS_QUOTES);
      const reasonText = recentLosses >= 5
        ? `a disastrous run of ${recentLosses} consecutive losses`
        : `${recentLosses} losses from their last ${recentThreshold}`;
      addNews(
        `${oldName} has been sacked by ${t.nick} after ${reasonText}. ` +
        `${newCoach.name} takes over — ${philInfo ? philInfo.desc : 'a new direction for the club.'} ` +
        `"${quote}" — ${newCoach.name}.`,
        {title:'Coaching Change', type:'board', tone:'neutral', teamId:t.id, tag:'Coaching', r:G.round+1, y:G.year}
      );
      break;
    }
  };
  if(G.round >= 8 && G.round % 2 === 0)  tryAISacking(G.teams, 5, 0.55, 0.12);
  if(G.round >= 12 && G.round % 3 === 0) tryAISacking(G.teams, 4, 0.75, 0.22);

  // Form alerts: hot streak or form slump for key players
  const mt2 = myTeam();
  if(mt2 && rnd() < 0.55){
    const squad = mt2.players.map(id=>G.players[id]).filter(p=>p && p.form != null && !p.injury && (p.squad==='top' || !p.squad));
    const hotPlayer = squad.find(p=>p.form >= 82);
    const coldPlayer = squad.find(p=>p.form <= 26);
    if(hotPlayer && rnd() < 0.55){
      addNews(
        `${hotPlayer.name} is in outstanding form this season (${hotPlayer.form} rating) — a player to build around while momentum is high.`,
        {title:'Hot Streak', type:'form', tone:'good', playerId:hotPlayer.id, teamId:mt2.id, tag:'Form', r:G.round+1, y:G.year}
      );
    } else if(coldPlayer && rnd() < 0.65){
      addNews(
        `${coldPlayer.name} is struggling for form (${coldPlayer.form} rating) — coaching staff should consider rotation or a confidence-building run in reserves.`,
        {title:'Form Slump', type:'form', tone:'bad', playerId:coldPlayer.id, teamId:mt2.id, tag:'Form', r:G.round+1, y:G.year}
      );
    }
  }
}
function generateStaffRecommendations(){
  if(!G.staff || !G.staff.length || !myTeam()) return;
  const mt = myTeam();
  const topPlayers = mt.players.map(id=>G.players[id]).filter(p=>p && (p.squad==='top'||!p.squad));

  // Fitness coach: fatigue rotation warning
  const fitnessCoach = G.staff.find(s=>s.role==='fitness');
  if(fitnessCoach && rnd() < 0.38){
    const fatigued = topPlayers.filter(p=>p.cond<73 && !p.injury).sort((a,b)=>a.cond-b.cond);
    if(fatigued.length >= 2){
      addNews(
        `${fatigued[0].name} (${Math.round(fatigued[0].cond)}% cond) and ${fatigued[1].name} (${Math.round(fatigued[1].cond)}% cond) are showing fatigue — ${fitnessCoach.name} recommends rotation this week.`,
        {title:'Fitness Report', type:'recommendation', tone:'neutral', tag:'Staff', r:G.round+1, y:G.year}
      );
    }
  }

  // Development coach: youth ready for promotion
  const devCoach = G.staff.find(s=>s.role==='development');
  if(devCoach && G.round % 4 === 0){
    const prospects = mt.players.map(id=>G.players[id]).filter(p=>p && p.age<=21 && p.squad==='dev' && p.ovr>=56).sort((a,b)=>b.pot-a.pot);
    if(prospects.length){
      const pr = prospects[0];
      addNews(
        `${devCoach.name} recommends giving ${pr.name} (${pr.age} yo, OVR ${pr.ovr}, POT ${pr.pot}) top-squad exposure — development staff believe he is ready to step up.`,
        {title:'Development Report', type:'recommendation', tone:'good', playerId:pr.id, tag:'Staff', r:G.round+1, y:G.year}
      );
    }
  }

  // Attack coach: in-form player who isn't in the lineup
  const attackCoach = G.staff.find(s=>s.role==='attack');
  if(attackCoach && rnd() < 0.25){
    const hotBench = topPlayers.filter(p=>!p.injury && p.form>80 && !mt.lineup.includes(p.id)).sort((a,b)=>b.form-a.form);
    if(hotBench.length){
      const p = hotBench[0];
      addNews(
        `${attackCoach.name} flags that ${p.name} (${p.pos}, form ${Math.round(p.form)}) is in excellent form but not currently in the run-on side — worth considering for selection.`,
        {title:'Selection Tip', type:'recommendation', tone:'good', playerId:p.id, tag:'Staff', r:G.round+1, y:G.year}
      );
    }
  }

  // Defence coach: poor-morale key player — recommend man-management
  const defCoach = G.staff.find(s=>s.role==='defence');
  if(defCoach && rnd() < 0.22){
    const struggling = topPlayers.filter(p=>!p.injury && (p.morale||70)<55 && mt.lineup.slice(0,13).includes(p.id)).sort((a,b)=>(a.morale||70)-(b.morale||70));
    if(struggling.length){
      const p = struggling[0];
      addNews(
        `${defCoach.name} notes that ${p.name} (${p.pos}) has been disengaged in training — morale sits at ${Math.round(p.morale||70)}. A one-on-one check-in is recommended before next week.`,
        {title:'Player Welfare', type:'recommendation', tone:'bad', playerId:p.id, tag:'Staff', r:G.round+1, y:G.year}
      );
    }
  }

  // Medical physio: injury risk warning for high-load players
  const physio = G.staff.find(s=>s.role==='medical');
  if(physio && rnd() < 0.30){
    const atRisk = topPlayers.filter(p=>!p.injury && (p.load||0)>70 && p.cond<78).sort((a,b)=>(b.load||0)-(a.load||0));
    if(atRisk.length){
      const p = atRisk[0];
      addNews(
        `${physio.name} warns that ${p.name} is carrying a high training load (${Math.round(p.load||0)}) with only ${Math.round(p.cond)}% condition — injury risk is elevated. Consider reducing his minutes this week.`,
        {title:'Injury Risk Warning', type:'recommendation', tone:'bad', playerId:p.id, tag:'Staff', r:G.round+1, y:G.year}
      );
    }
  }
}
function generatePlayerMessages(){
  const mt = myTeam();
  if(!mt || G.phase !== 'regular') return;
  const round = G.round + 1;
  if(round < 3 || rnd() > 0.42) return;
  const players = mt.players.map(id=>G.players[id]).filter(p=>p && (p.squad==='top' || p.squad==='dev' || p.squad==='trial'));
  const eligible = players.filter(p=>!p.injury && (p._lastPlayerMessageRound == null || round - p._lastPlayerMessageRound >= 6));
  if(!eligible.length) return;
  const lowMorale = eligible.filter(p=>(p.morale||50) <= 38 && p.squad==='top').sort((a,b)=>(a.morale||50)-(b.morale||50));
  const youthPath = eligible.filter(p=>p.squad==='dev' && p.age<=20 && p.ovr>=54).sort((a,b)=>b.pot-a.pot);
  const inForm = eligible.filter(p=>p.squad==='top' && (p.form||50)>=78 && (p.s.g||0)>=3).sort((a,b)=>(b.form||50)-(a.form||50));
  let p, title, body, tone;
  if(lowMorale.length){
    p = lowMorale[0];
    title = 'Player Message';
    body = `${p.name} has asked for a one-on-one conversation. He feels his role and morale need attention before frustration becomes a bigger issue.`;
    tone = 'bad';
  } else if(youthPath.length){
    p = youthPath[0];
    title = 'Youth Pathway Message';
    body = `${p.name} has asked development staff what his pathway to first grade looks like. A training focus or controlled promotion plan could keep momentum high.`;
    tone = 'neutral';
  } else if(inForm.length){
    p = inForm[0];
    title = 'Player Confidence';
    body = `${p.name} says the group is responding well to his current role. His form is high and he believes the team can lean into that momentum.`;
    tone = 'good';
  }
  if(!p) return;
  p._lastPlayerMessageRound = round;
  addNews(body, {title, type:'player', tone, playerId:p.id, teamId:mt.id, tag:'Player Message', r:round, y:G.year});
}
function advanceScouting(){
  if(!G.scouting || !G.scouting.missions) return;
  const done = [];
  for(const mission of G.scouting.missions){
    mission.weeksLeft--;
    if(mission.weeksLeft > 0) continue;
    done.push(mission);
    const region = SCOUT_REGIONS.find(r=>r.key===mission.region);
    const scout = (G.scouting.scouts||[]).find(s=>s.id===mission.scoutId);
    const ability = scout ? scout.ability : 40;
    const age = ri(16, 19);
    const baseQ = clamp(30 + Math.floor(ability/4), 32, 58);
    const pool = region ? region.posPool : POS;
    let pos;
    const targetChance = mission.targetPos && pool.includes(mission.targetPos) ? scoutTargetChance(scout, mission.targetPos) : 0;
    const targetHit = !!(mission.targetPos && pool.includes(mission.targetPos) && rnd() < targetChance);
    if(targetHit){
      pos = mission.targetPos;
    } else {
      pos = pickScoutRegionPosition(region);
    }
    const fitBonus = targetHit ? (scout && scout.posSpecialty === pos ? 3 : 1) : 0;
    const p = genPlayer(pos, age, baseQ + fitBonus + ri(-8, 12));
    G.players[p.id] = p;
    p.squad = 'dev';
    // Set nationality from region and regenerate name to match
    if(region){
      const nat = NATIONALITY_POOL.find(n=>n.country===region.nationality);
      if(nat){ p.nationality = nat.country; p.repTeam = nat.repTeam||null; p.name = genPlayerName(nat.country); }
    }
    G.scouting.prospects = G.scouting.prospects||[];
    const BACKSTORIES = [
      `stands out in regional competition and has been turning heads with his physicality`,
      `was recommended by a local contact and fits our positional needs perfectly`,
      `was playing semi-professional football but has the tools to step up to the top level`,
      `comes from a strong rugby league family and has been developing rapidly`,
      `was spotted at a grassroots carnival — raw but with obvious upside`,
      `is coming off an impressive junior season and is seen as one of the brightest young talents in the region`,
      `has been training with the local NRL feeder club and caught our scout's eye immediately`,
      `is physically ahead of his age group and has the mental attributes to develop further`,
    ];
    const backstory = pick(BACKSTORIES);
    p.backstory = backstory;
    G.scouting.prospects.push({ playerId:p.id, scoutId:mission.scoutId, region:mission.region, targetPos:mission.targetPos||null, targetHit, foundYear:G.year, foundRound:G.round });
    const targetLine = mission.targetPos ? (targetHit ? ` Target request hit (${POS_NAME[mission.targetPos]||mission.targetPos}).` : ` Target request missed; best prospect was ${POS_NAME[p.pos]||p.pos}.`) : '';
    addNews(`${scout?scout.name:'Scout'} returns from ${region?region.label:mission.region} with a prospect: ${p.name} (${POS_NAME[p.pos]||p.pos}, ${age}yo) — ${backstory}.${targetLine}`, {title:'Scout Report', type:'scouting', tone:'good', playerId:p.id, tag:'Scouting'});
  }
  G.scouting.missions = G.scouting.missions.filter(m=>!done.includes(m));
}

'use strict';

/* ---------- game state ---------- */
let G = null;
/* genPlayer must register into G.players — wrap creation */
function makePlayer(G, pos, age, quality){ const p = genPlayer(pos, age, quality); G.players[p.id] = p; return p; }
function genTeamLogo(t){
  const shapes = ['shield','round','diamond','hex'];
  const shape = shapes[Math.abs((t.id || 0) + String(t.nick || '').length) % shapes.length];
  const letters = String(t.abbr || t.nick || 'TM').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || 'TM';
  const stripe = ((t.id || 0) * 17 + letters.length * 11) % 3;
  return {shape, letters, stripe};
}
function ensureTeamLogo(t){
  if(!t) return null;
  if(!t.logo) t.logo = genTeamLogo(t);
  if(!t.logo.shape) t.logo.shape = 'shield';
  if(!t.logo.letters) t.logo.letters = String(t.abbr || t.nick || 'TM').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || 'TM';
  if(t.logo.stripe === undefined) t.logo.stripe = 0;
  return t.logo;
}

/* rebuild genTeam to register properly */
function buildTeam(G, identity, id, strength){
  const coachRep = ri(20, 62);
  const baseFacility = clamp(Math.round(1 + (strength - 50) / 10 + rf(-0.8, 0.8)), 1, 4);
  const facilities = {
    stadium:clamp(baseFacility + ri(-1, 1), 1, 5),
    training:clamp(baseFacility + ri(-1, 1), 1, 5),
    gym:clamp(baseFacility + ri(-1, 1), 1, 5),
    medical:clamp(baseFacility + ri(-1, 1), 1, 5),
    academy:clamp(baseFacility + ri(-1, 1), 1, 5),
  };
  const t = { id, ...identity, players:[], lineup:Array(19).fill(null), plan:'balanced', focus:'balanced', rep:strength, cohesion:50,
    headCoach: genAIHeadCoach(coachRep),
    facilities,
    roles:{captain:null, goalKicker:null, primaryKicker:null, secondaryKicker:null, primaryPlaymaker:null, secondaryPlaymaker:null},
    positionRoles:{}, zoneTactics:{own20:'safe', own40:'balanced', mid:'balanced', opp40:'expansive', redZone:'balanced'},
    matchPrefs:{autoSubs:true, penalty:'auto', fieldGoal:true} };
  t.logo = genTeamLogo(t);
  for(const pos of SQUAD_TEMPLATE){
    const young = ri(0,9)<3;
    const age = young ? ri(17,21) : ri(20,33);
    const p = makePlayer(G, pos, age, strength);
    p.squad = 'top';
    p.everTopSquad = true;
    t.players.push(p.id);
  }
  for(const pos of DEV_SQUAD_TEMPLATE){
    const p = makePlayer(G, pos, ri(17,21), strength - 15);
    p.squad = 'dev';
    p.everTopSquad = false;
    t.players.push(p.id);
  }
  ensureTeamSpecialists(t);
  return t;
}
function ensureTeamSpecialists(t){
  const players = t.players.map(id=>G.players[id]).filter(Boolean);
  const goalPool = players.filter(p=>['HB','FE','FB','CE','WG'].includes(p.pos)).sort((a,b)=>roleScore(b,'goalKicker')-roleScore(a,'goalKicker'));
  if(goalPool[0] && goalPool[0].attrs.placeKick < 68) goalPool[0].attrs.placeKick = ri(68,82);
  if(goalPool[1] && rnd()<.45 && goalPool[1].attrs.placeKick < 58) goalPool[1].attrs.placeKick = ri(58,72);
  const protectedGoalKickers = new Set(goalPool.slice(0, goalPool[1] && goalPool[1].attrs.placeKick >= 65 ? 2 : 1).map(p=>p.id));
  for(const p of players){
    if(!protectedGoalKickers.has(p.id) && p.attrs.placeKick > 62) p.attrs.placeKick = ri(42,62);
  }
  const kickPool = players.filter(p=>['HB','FE','HK','FB'].includes(p.pos)).sort((a,b)=>roleScore(b,'kicker')-roleScore(a,'kicker'));
  for(const p of kickPool.slice(0,2)){
    p.attrs.kickPower = Math.max(p.attrs.kickPower, ri(62,82));
    p.attrs.kickAccuracy = Math.max(p.attrs.kickAccuracy, ri(62,82));
  }
  for(const p of players) p.ovr = calcOvr(p);
}
function startNewGame(cfg){
  srand(cfg.seed || Date.now());
  _pid = 1;
  G = { v:1, year:2026, season:1, round:0, phase:'regular', godMode:false, achievementsLocked:false,
    config:{ nTeams:cfg.nTeams, cap:cfg.cap, capGrowth:.03, leagueName: cfg.leagueName || 'Minto Premiership', seasonRounds:cfg.seasonRounds || null },
    players:{}, teams:[], freeAgents:[], news:[], history:[], hallOfFame:[], achievements:[], finals:null, offseason:null,
    calendar:{day:0, startISO:'2026-03-02', lastStop:{key:'training', label:'Training review', page:'training', tone:'neutral'}},
    staff: [genStaff('attacking', 52), genStaff('defensive', 52), genStaff('fitness', 48)],
    club: { funds: 1500000, seasonRevenue: 0, seasonWages: 0, gateRevenue: 0, broadcastRevenue: 0,
      currency:'AUD', ticketPrice:28, membershipPrice:160,
      facilities:{stadium:2, training:1, gym:1, medical:1, academy:1} },
    scouting: { scouts: [genScout(45)], missions: [], prospects: [] },
    coach:{ name:cfg.coachName, rep:30, teamId:null, conf:60, expect:null, history:[], seasonsAtClub:0, careerW:0, careerL:0, prems:0,
      shortlist:[], salary:120000, contractYears:2, cash:60000, attrs:{development:42, manMgmt:42, fitness:42, tactics:42} }
  };
  const idents = cfg.identities ? cfg.identities.slice(0, cfg.nTeams) : shuffle(IDENTITIES).slice(0, cfg.nTeams);
  const spread = []; for(let i=0;i<cfg.nTeams;i++) spread.push(54 + Math.round(i*14/(cfg.nTeams-1)));
  const strengths = shuffle(spread);
  idents.forEach((ident,i)=> G.teams.push(buildTeam(G, ident, i, strengths[i])));
  buildFreeAgentPool(G);
  for(const t of G.teams) fitCap(G, t);
  G.coach.teamId = cfg.teamId;
  const fixtResult = genFixtures(G.teams.map(t=>t.id), G.config.seasonRounds);
  G.fixtures = fixtResult.rounds;
  G.byes = fixtResult.byes;
  if(G.fixtures.length >= 10){
    const mrRound = clamp(Math.round(G.fixtures.length * 0.42 + Math.floor(rf(0,1) * G.fixtures.length * 0.16)), 7, G.fixtures.length - 4);
    const mrBids = G.teams.map(t => ({t, bid: squadStrength(t) + rf(0, 32)}));
    mrBids.sort((a, b) => b.bid - a.bid);
    const mrHost = mrBids[0].t;
    G.magicRound = {round: mrRound, hostTeamId: mrHost.id, venue: `${mrHost.city} Magic Round`};
  } else {
    G.magicRound = null;
  }
  G.origin = typeof generateOriginSchedule === 'function' ? generateOriginSchedule(G.fixtures.length) : null;
  for(const t of G.teams) autoPick(t);
  if(cfg.teamId != null){
    G.coach.expect = setExpectation();
    addNews(`Season ${G.year}: ${G.coach.name} appointed head coach of the ${teamName(G.teams[cfg.teamId])}. Board expectation: ${G.coach.expect.label}.`);
  }
  return G;
}
function buildFreeAgentPool(G){
  G.freeAgents = [];
  addFreeAgents(G, Math.max(18, Math.round(G.config.nTeams*2.2)));
}
function addFreeAgents(G, n){
  for(let i=0;i<n;i++){
    const pos = pick(SQUAD_TEMPLATE);
    const q = ri(0,9)<2 ? 52 : ri(0,9)<7 ? 45 : 38;
    const p = makePlayer(G, pos, ri(20,32), q);
    p.squad = 'top';
    p.everTopSquad = false;
    setPlayerContract(p, Math.round(clamp(salaryFor(p)*0.72, 65000, 280000)/5000)*5000, 0, 'flat');
    G.freeAgents.push(p.id);
  }
}
function replenishFreeAgents(){
  if(!G.freeAgents) G.freeAgents = [];
  G.freeAgents = G.freeAgents.filter(id=>G.players[id] && !G.teams.some(t=>t.players.includes(id)));
  const target = Math.max(18, Math.round(G.config.nTeams*2.3));
  if(G.freeAgents.length < target) addFreeAgents(G, target - G.freeAgents.length);
}
function teamName(t){ return t.city+' '+t.nick; }
function myTeam(){ return G.teams[G.coach.teamId]; }
function addNews(txt, opts){
  opts = opts || {};
  const story = typeof txt === 'object' ? txt : {
    title: opts.title || opts.tag || 'Club News',
    body: txt,
    txt,
    type: opts.type || 'general',
    tone: opts.tone || 'neutral',
    teamId: opts.teamId,
    playerId: opts.playerId,
    tag: opts.tag || opts.type || 'News',
  };
  if(!story.txt) story.txt = story.body || story.title || '';
  if(!story.body) story.body = story.txt;
  if(!story.title) story.title = story.tag || 'Club News';
  if(!story.type) story.type = 'general';
  if(!story.tone) story.tone = 'neutral';
  story.r = story.r || G.round+1;
  story.y = story.y || G.year;
  story.createdAt = story.createdAt || Date.now();
  if(story.read === undefined) story.read = false;
  G.news.unshift(story);
  if(G.news.length>160) G.news.pop();
}
function setExpectation(){
  const ranks = G.teams.slice().sort((a,b)=>squadStrength(b)-squadStrength(a)).map(t=>t.id);
  const r = ranks.indexOf(G.coach.teamId)+1, n = G.teams.length;
  if(r <= n*0.25) return {label:'Win the premiership', minPos:2};
  if(r <= n*0.5) return {label:'Reach the finals', minPos:Math.ceil(n/3)+1};
  if(r <= n*0.75) return {label:'Be competitive — push for finals', minPos:Math.ceil(n*0.66)};
  return {label:'Rebuild and develop young talent', minPos:n};
}
function squadStrength(t){
  const best = t.players.map(id=>G.players[id].ovr).sort((a,b)=>b-a).slice(0,17);
  return best.reduce((s,v)=>s+v,0)/17;
}

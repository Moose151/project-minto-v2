

/* ---------- split-match simulation (watch-game two-phase flow) ---------- */
function tacticalChannelEntries(t, focus, defending){
  const slots = defending
    ? {middle:[7,8,9,12], left:[3,4,11], right:[1,2,10]}[focus]
    : {middle:[7,8,9,12], left:[3,4,11], right:[1,2,10]}[focus];
  if(!slots) return [];
  return slots.map(i=>G.players[t.lineup[i]]).filter(Boolean);
}
function avgAttrs(players, keys){
  if(!players.length) return 56;
  return players.reduce((s,p)=>s + keys.reduce((a,k)=>a+(p.attrs[k]||50),0)/keys.length, 0) / players.length;
}
function tacticalFocusTryMod(att, def){
  const focus = att.matchPrefs && att.matchPrefs.attackFocus || 'balanced';
  if(focus === 'balanced') return 1;
  if(focus === 'territory') return 0.97;
  const attackSide = focus;
  // Attacking left runs at the opponent's right edge, and vice versa.
  const defendSide = focus === 'left' ? 'right' : focus === 'right' ? 'left' : 'middle';
  const atkKeys = focus === 'middle'
    ? ['strength','ballRunning','workRate','stamina']
    : ['speed','acceleration','ballRunning','finishing'];
  const defKeys = focus === 'middle'
    ? ['tackling','markerDef','strength','workRate']
    : ['tackling','defRead','markerDef','workRate'];
  const atkScore = avgAttrs(tacticalChannelEntries(att, attackSide, false), atkKeys);
  const defScore = avgAttrs(tacticalChannelEntries(def, defendSide, true), defKeys);
  return clamp(1 + (atkScore - defScore) / 420, 0.93, 1.08);
}
export function _matchSetup(m, isFinal){
  const th = G.teams[m.h], ta = G.teams[m.a];
  if(!validateLineup(th)) autoPick(th);
  if(!validateLineup(ta)) autoPick(ta);
  const isMagicRound = !isFinal && G.magicRound && G.magicRound.round === G.round;
  const mrHost = isMagicRound ? G.teams.find(t => t.id === G.magicRound.hostTeamId) : null;
  const venue = isFinal ? 'Grand Final Stadium'
    : isMagicRound ? (G.magicRound.venue || (mrHost ? mrHost.city + ' Magic Round' : 'Magic Round'))
    : (th.stadium || pick(STADIUM_NAMES));
  const slot = m.slot || {day:'Saturday', time:'afternoon', label:'Sat Afternoon'};
  const isNight = slot.time === 'night', isTwilight = slot.time === 'twilight';
  const weatherPool = [...WEATHER, isNight ? 'Light rain' : isTwilight ? 'Windy' : 'Humid'];
  const weather = m.projWeather || pick(weatherPool);
  const crowd = m.projCrowd || matchCrowd(isMagicRound ? mrHost || th : th, isFinal);
  const ticketPrice = th.id===G.coach.teamId && G.club ? (G.club.ticketPrice || 28) : 28;
  const timeOfDayMod = isNight ? 0.97 : isTwilight ? 1.00 : 1.03;
  const bwTryMod = (weather==='Heavy rain'?.84:weather==='Light rain'?.92:weather==='Windy'?.95:weather==='Humid'?.96:1)*timeOfDayMod;
  const bwKickMod = weather==='Heavy rain'?.88:weather==='Light rain'?.93:weather==='Windy'?.90:weather==='Humid'?.97:1;
  const badWeather = weather==='Heavy rain'||weather==='Windy';
  const coachId = G.coach ? G.coach.teamId : -1;
  const coachTeam = G.teams.find(t=>t.id===coachId);
  const conservative = badWeather && coachTeam && coachTeam.matchPrefs && coachTeam.matchPrefs.weatherTactics==='conservative';
  const isCoachH = th.id===coachId, isCoachA = ta.id===coachId;
  const adjTryMod = conservative ? 1+(bwTryMod-1)*0.5 : bwTryMod;
  const adjKickMod = conservative ? bwKickMod+(1-bwKickMod)*0.55 : bwKickMod;
  const crowdHomeMod = (isFinal||isMagicRound)?1:clamp(0.985+crowd/1200000,.985,1.035);
  th._prevLineup = th.lineup.slice(0,13);
  ta._prevLineup = ta.lineup.slice(0,13);
  const ph = lineupPower(th), pa = lineupPower(ta);
  const hAdj = isMagicRound?1:1.035;
  const ratH = Math.min((ph.atk*hAdj)/pa.def,1.65), ratA = Math.min(pa.atk/(ph.def*hAdj),1.65);
  const hTryMod = (isCoachH&&conservative)?adjTryMod*0.93:bwTryMod;
  const aTryMod = (isCoachA&&conservative)?adjTryMod*0.93:bwTryMod;
  const hKickMod = (isCoachH&&conservative)?adjKickMod:bwKickMod;
  const aKickMod = (isCoachA&&conservative)?adjKickMod:bwKickMod;
  const expH = clamp(2.85*Math.pow(ratH,1.65)*rf(.87,1.13)*hTryMod*crowdHomeMod*tacticalFocusTryMod(th, ta),0.7,9);
  const expA = clamp(2.85*Math.pow(ratA,1.65)*rf(.87,1.13)*aTryMod*tacticalFocusTryMod(ta, th)/Math.sqrt(crowdHomeMod),0.7,9);
  return {th, ta, venue, slot, weather, crowd, ticketPrice, bwTryMod, bwKickMod, crowdHomeMod, hTryMod, aTryMod, hKickMod, aKickMod, expH, expA, ph, pa, conservative, isCoachH, isCoachA, isMagicRound, mrHost, hAdj};
}

export function simMatchFirstHalf(m, isFinal){
  if(m.played || m._htPending) return {h1Events:[]};
  const s = _matchSetup(m, isFinal);
  const {th, ta, venue, slot, weather, crowd, ticketPrice, bwTryMod, bwKickMod, hTryMod, aTryMod, hKickMod, aKickMod, expH, expA, ph, pa, conservative, isCoachH, isCoachA} = s;
  const ctx_h = {weather, conservative: isCoachH&&conservative, kickMod: hKickMod};
  const ctx_a = {weather, conservative: isCoachA&&conservative, kickMod: aKickMod};
  const h1_triesH = poisson(expH * 0.5);
  const h1_triesA = poisson(expA * 0.5);
  const det1_h = {}, det1_a = {};
  const h1_goalsH = simTeamStats(th, h1_triesH, det1_h, ph.kick*hKickMod, ctx_h, {isHalf:true, skipStats:true});
  const h1_goalsA = simTeamStats(ta, h1_triesA, det1_a, pa.kick*aKickMod, ctx_a, {isHalf:true, skipStats:true});
  const h1_hs = h1_triesH*4 + h1_goalsH*2;
  const h1_as = h1_triesA*4 + h1_goalsA*2;
  // Store setup and first-half state for second half
  m._matchSetup = s;
  m._h1 = {det_h:det1_h, det_a:det1_a, goalsH:h1_goalsH, goalsA:h1_goalsA, triesH:h1_triesH, triesA:h1_triesA, hs1:h1_hs, as1:h1_as};
  m._htPending = true;
  // Set det with htScore so team-talk panel shows correct HT score
  m.det = {h:det1_h, a:det1_a, events:[], suspensions:[], venue, weather, crowd, ticketPrice, slot, weatherTryMod:bwTryMod, weatherKickMod:bwKickMod, htScore:{h:h1_hs, a:h1_as}, weatherEffects:weatherMatchEffects(weather)};
  return {h1Events: _buildHalfFeedEvents(det1_h, det1_a, th, ta, h1_hs, h1_as)};
}

/* ---------- second half: 40–60 minutes ---------- */
export function simMatchSecondHalf(m, isFinal, powerMod){
  if(!m._htPending) return {h2aEvents:[]};
  const prev = m._matchSetup;
  const {th, ta, weather, crowdHomeMod, hKickMod, aKickMod, hAdj, conservative, isCoachH, isCoachA} = prev;
  const h1 = m._h1;
  // Re-compute lineup power with current lineup (HT subs may have been applied)
  const ph2 = lineupPower(th), pa2 = lineupPower(ta);
  const ratH2 = Math.min((ph2.atk*hAdj)/pa2.def,1.65), ratA2 = Math.min(pa2.atk/(ph2.def*hAdj),1.65);
  const coachPM = powerMod || 1.0;
  m._htPowerMod = coachPM; // saved so simMatchFinalChunk can compound it
  const hTryMod2 = (isCoachH&&conservative)?prev.hTryMod*0.93:prev.hTryMod;
  const aTryMod2 = (isCoachA&&conservative)?prev.aTryMod*0.93:prev.aTryMod;
  const expH2 = clamp(2.85*Math.pow(ratH2,1.65)*rf(.87,1.13)*hTryMod2*crowdHomeMod*coachPM*tacticalFocusTryMod(th, ta),0.7,9);
  const expA2 = clamp(2.85*Math.pow(ratA2,1.65)*rf(.87,1.13)*aTryMod2*tacticalFocusTryMod(ta, th)/Math.sqrt(crowdHomeMod),0.7,9);
  // 40–60 min: one quarter of expected full-game tries
  const h2_triesH = poisson(expH2 * 0.25);
  const h2_triesA = poisson(expA2 * 0.25);
  const ctx_h2 = {weather, conservative:isCoachH&&conservative, kickMod:hKickMod};
  const ctx_a2 = {weather, conservative:isCoachA&&conservative, kickMod:aKickMod};
  const det2_h = {}, det2_a = {};
  const h2_goalsH = simTeamStats(th, h2_triesH, det2_h, ph2.kick*hKickMod, ctx_h2, {isHalf:true, isSecondHalf:true, isEarlySecond:true, skipStats:true});
  const h2_goalsA = simTeamStats(ta, h2_triesA, det2_a, pa2.kick*aKickMod, ctx_a2, {isHalf:true, isSecondHalf:true, isEarlySecond:true, skipStats:true});
  const hs2 = h1.hs1 + h2_triesH*4 + h2_goalsH*2;
  const as2 = h1.as1 + h2_triesA*4 + h2_goalsA*2;
  m._h2 = {det_h:det2_h, det_a:det2_a, goalsH:h2_goalsH, goalsA:h2_goalsA, triesH:h2_triesH, triesA:h2_triesA, hs2, as2};
  m._60Pending = true;
  delete m._htPending;
  const h2aEvents = _buildHalfFeedEvents(det2_h, det2_a, th, ta, hs2, as2,
    {lo:41, hi:59, startH:h1.hs1, startA:h1.as1});
  return {h2aEvents};
}

/* ---------- final chunk: 60–80 minutes ---------- */
export function simMatchFinalChunk(m, isFinal, extraPowerMod){
  if(!m._60Pending) return {h2bEvents:[]};
  const prev = m._matchSetup;
  const {th, ta, weather, crowdHomeMod, hKickMod, aKickMod, hAdj, conservative, isCoachH, isCoachA} = prev;
  const h1 = m._h1, h2 = m._h2;
  // Re-compute lineup power (60' subs may have been applied)
  const ph3 = lineupPower(th), pa3 = lineupPower(ta);
  const ratH3 = Math.min((ph3.atk*hAdj)/pa3.def,1.65), ratA3 = Math.min(pa3.atk/(ph3.def*hAdj),1.65);
  const htPM = m._htPowerMod || 1.0;
  const coachPM = htPM * (extraPowerMod || 1.0);
  const hTryMod3 = (isCoachH&&conservative)?prev.hTryMod*0.93:prev.hTryMod;
  const aTryMod3 = (isCoachA&&conservative)?prev.aTryMod*0.93:prev.aTryMod;
  const expH3 = clamp(2.85*Math.pow(ratH3,1.65)*rf(.87,1.13)*hTryMod3*crowdHomeMod*coachPM*tacticalFocusTryMod(th, ta),0.7,9);
  const expA3 = clamp(2.85*Math.pow(ratA3,1.65)*rf(.87,1.13)*aTryMod3*tacticalFocusTryMod(ta, th)/Math.sqrt(crowdHomeMod),0.7,9);
  // 60–80 min: one quarter of expected full-game tries
  const h3_triesH = poisson(expH3 * 0.25);
  const h3_triesA = poisson(expA3 * 0.25);
  const ctx_h3 = {weather, conservative:isCoachH&&conservative, kickMod:hKickMod};
  const ctx_a3 = {weather, conservative:isCoachA&&conservative, kickMod:aKickMod};
  const det3_h = {}, det3_a = {};
  const h3_goalsH = simTeamStats(th, h3_triesH, det3_h, ph3.kick*hKickMod, ctx_h3, {isHalf:true, isSecondHalf:true, isFinalChunk:true, skipStats:true});
  const h3_goalsA = simTeamStats(ta, h3_triesA, det3_a, pa3.kick*aKickMod, ctx_a3, {isHalf:true, isSecondHalf:true, isFinalChunk:true, skipStats:true});
  // Merge all three phases and finalise
  const mergedH = mergeStatDicts(mergeStatDicts(h1.det_h, h2.det_h), det3_h);
  const mergedA = mergeStatDicts(mergeStatDicts(h1.det_a, h2.det_a), det3_a);
  const triesH = h1.triesH + h2.triesH + h3_triesH;
  const triesA = h1.triesA + h2.triesA + h3_triesA;
  const goalsH = h1.goalsH + h2.goalsH + h3_goalsH;
  const goalsA = h1.goalsA + h2.goalsA + h3_goalsA;
  let hs = triesH*4 + goalsH*2, as = triesA*4 + goalsA*2;
  if(Math.abs(hs-as)<=1 && rnd()<.5){ if(rnd()<.5 && th.matchPrefs?.fieldGoal!==false){ hs+=1; awardFieldGoal(th,mergedH,m.det.events); } else if(ta.matchPrefs?.fieldGoal!==false){ as+=1; awardFieldGoal(ta,mergedA,m.det.events); } }
  if(isFinal && hs===as){ if(rnd()<.5 && th.matchPrefs?.fieldGoal!==false){ hs+=1; awardFieldGoal(th,mergedH,m.det.events); } else if(ta.matchPrefs?.fieldGoal!==false){ as+=1; awardFieldGoal(ta,mergedA,m.det.events); } }
  const det = m.det;
  det.h = mergedH; det.a = mergedA;
  setDerivedMatchStats(det, triesH, triesA);
  genInfringements(th, det, mergedH);
  genInfringements(ta, det, mergedA);
  applyMatchStats(th, mergedH);
  applyMatchStats(ta, mergedA);
  m.played = true; m.hs = hs; m.as = as;
  awardVotes(th, ta, det);
  postMatch(th, hs, as, mergedH); postMatch(ta, as, hs, mergedA);
  applyTribunalBans(det);
  delete m._60Pending;
  const h2bEvents = _buildHalfFeedEvents(det3_h, det3_a, th, ta, hs, as,
    {lo:62, hi:79, startH:h2.hs2, startA:h2.as2});
  return {h2bEvents};
}

// opts: {lo, hi, startH, startA}
// lo/hi: minute range for narrative events; startH/startA: cumulative score at start of this segment
export function _buildHalfFeedEvents(det_h, det_a, th, ta, finalScoreH, finalScoreA, opts){
  const evLo = opts && opts.lo != null ? opts.lo : null;
  const evHi = opts && opts.hi != null ? opts.hi : null;
  const tryEvs = [...(det_h._tryEvents||[]).map(e=>({...e,side:'h'})), ...(det_a._tryEvents||[]).map(e=>({...e,side:'a'}))].sort((a,b)=>a.min-b.min);
  const penEvs = [...(det_h._penGoalEvents||[]).map(e=>({...e,side:'h'})), ...(det_a._penGoalEvents||[]).map(e=>({...e,side:'a'}))].sort((a,b)=>a.min-b.min);
  const TRY_DESC = {FB:['weaves through to score','chips and catches it himself','sprints clear on the full back'],WG:['dives over in the corner','finishes brilliantly','plants it down in-goal'],CE:['powers through','steps inside to score','bulldozes over'],FE:['catches them napping','produces something special','beats the last defender'],HB:['darts from dummy half','slips through the gap','wrong-foots the defence'],PR:['crashes over from close range','powers through three defenders','rumbles over'],HK:['darts from dummy half to score','snipes from short range','catches the defence off guard'],SR:['barges over','charges over the line','takes the direct option'],LK:['leads from the front','charges over','shows his class to dot down'],BE:['finishes the move off','gets the reward','crashes over']};
  const tryDesc = pos => pick(TRY_DESC[pos]||TRY_DESC.BE);
  const ASSIST_VERBS = ['provides the scoring pass for','fires the ball to','puts','threads a perfect ball to'];
  const injMins = {};
  for(const [sKey, sObj] of [['h',det_h],['a',det_a]]) for(const [id,l] of Object.entries(sObj)) if(l&&typeof l==='object'&&!Array.isArray(l)&&l.injMin) injMins[sKey+':'+id]=l.injMin;
  // Score starts from the cumulative total at the start of this segment
  let sH = (opts && opts.startH) || 0;
  let sA = (opts && opts.startA) || 0;
  const all = [];
  for(const ev of tryEvs){
    const team=ev.side==='h'?th:ta, scorer=G.players[ev.scorerId], assist=ev.assistId?G.players[ev.assistId]:null, kicker=ev.kickerId?G.players[ev.kickerId]:null;
    if(!scorer) continue;
    if(ev.side==='h'){sH+=4+(ev.converted?2:0);}else{sA+=4+(ev.converted?2:0);}
    const sInjMin=injMins[(ev.side)+':'+ev.scorerId]; const tryMin=sInjMin?Math.min(ev.min,Math.max(1,sInjMin-1)):ev.min;
    const assistTxt=assist?` ${pick(ASSIST_VERBS)} ${assist.name},`:'';
    const convTxt=ev.converted?(kicker&&kicker.id!==scorer.id?` ${kicker.name} converts.`:' Conversion good.'):' Conversion missed.';
    all.push({min:tryMin, txt:`TRY — ${team.nick}:${assistTxt} ${scorer.name} ${tryDesc(scorer.pos)}.${convTxt} (${sH}–${sA})`});
  }
  for(const ev of penEvs){
    const team=ev.side==='h'?th:ta, kicker=G.players[ev.kickerId]; if(!kicker) continue;
    if(ev.made){if(ev.side==='h')sH+=2;else sA+=2; all.push({min:ev.min,txt:`${kicker.name} (${team.nick}) slots a penalty goal. (${sH}–${sA})`});}
    else all.push({min:ev.min,txt:`${kicker.name} (${team.nick}) misses the penalty attempt.`});
  }
  for(const [side,det,team] of [['h',det_h,th],['a',det_a,ta]]){
    for(const [id,l] of Object.entries(det)){
      const p=G.players[+id]; if(!p||typeof l!=='object'||!l||Array.isArray(l)) continue;
      const injMin=l.injMin||null; const maxKickMin=injMin?Math.max(8,injMin-1):evMaxForDet(det);
      if(l.inj) all.push({min:injMin||ri(10,75),txt:`Injury: ${p.name} (${team.nick}) leaves the field with ${l.inj}.`});
      if(l.k4020) for(let i=0;i<l.k4020;i++) all.push({min:ri(8,maxKickMin),txt:`${p.name} (${team.nick}) finds touch with a pinpoint 40/20 kick!`});
      if(l.fdo) for(let i=0;i<l.fdo;i++) all.push({min:ri(8,maxKickMin),txt:`${p.name} (${team.nick}) pins the opposition in-goal and forces a drop-out.`});
    }
  }
  // Narrative commentary events from aggregate stats
  const LINEBREAK_PHRASES = [
    'breaks the line and charges downfield!',
    'beats two defenders and surges forward!',
    'finds a gap and makes massive metres!',
    'shows great footwork to burst through the line!',
    'beats the first defender and gets into open space!',
  ];
  const TACKLE_PHRASES = [
    'makes another crunching tackle.',
    'puts in a big defensive hit.',
    'wraps up perfectly — another strong tackle.',
    'working relentlessly in the defensive line.',
  ];
  const ERROR_PHRASES = [
    'loses the ball in contact — costly knock-on.',
    'knocks on under pressure — referee signals repeat set.',
    'fails to secure the ball — handling error.',
  ];
  // Determine narrative event minute range from provided opts or detected half
  const isFirstHalf = evLo == null ? !tryEvs.some(e => e.min > 40) : (evLo < 41);
  const lo = evLo != null ? Math.max(evLo, evLo + 5) : (isFirstHalf ? 8 : 45);
  const hi = evHi != null ? evHi - 2 : (isFirstHalf ? 37 : 74);
  for(const [det, team] of [[det_h,th],[det_a,ta]]){
    let topBreaker = null, topLb = 0, topDefender = null, topTk = 0;
    const errPlayers = [];
    for(const [id, l] of Object.entries(det)){
      if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
      const p = G.players[+id]; if(!p) continue;
      if((l.lb||0) > topLb){ topLb = l.lb||0; topBreaker = p; }
      if((l.tk||0) > topTk){ topTk = l.tk||0; topDefender = p; }
      if((l.err||0) >= 1) errPlayers.push(p);
    }
    if(topBreaker && topLb >= 1)
      all.push({min: ri(lo, Math.min(lo+20, hi)), txt: `${topBreaker.name} (${team.nick}) ${pick(LINEBREAK_PHRASES)}`});
    if(topDefender && topTk >= 6)
      all.push({min: ri(lo+5, hi-5), txt: `${topDefender.name} (${team.nick}) ${pick(TACKLE_PHRASES)}`});
    if(errPlayers.length && rnd() < 0.6)
      all.push({min: ri(lo+8, hi), txt: `${errPlayers[0].name} (${team.nick}) ${pick(ERROR_PHRASES)}`});
  }

  all.sort((a,b)=>a.min-b.min);
  return all;
}
export function evMaxForDet(det){ const evs=det._tryEvents||[]; return evs.length?Math.max(...evs.map(e=>e.min)):72; }

/* ---------- match simulation ---------- */
export function lineupPower(t){
  let atk=0, def=0, kick=0, n=0;
  if(!t.roles) assignDefaultTeamRoles(t);
  const cap = G.players[t.roles && t.roles.captain];
  const capMod = cap ? 0.985 + (roleScore(cap,'captain')/100)*0.03 : 1;
  t.lineup.forEach((id,i)=>{
    const p = G.players[id]; if(!p) return;
    const fam = familiarity(p, SLOTS[i].pos) * slotSpecialistFit(p, i);
    const cond = 0.75 + 0.25*p.cond/100;
    const mor = 0.92 + 0.16*p.morale/100;
    const form = 0.965 + 0.07*((p.form == null ? 50 : p.form)/100);
    const weight = i<13 ? 1 : i<17 ? 0.45 : 0;
    const posRole = t.positionRoles && t.positionRoles[String(i)];
    const roleMod = positionRoleFit(p, SLOTS[i].pos, posRole);
    const a = (p.attrs.playmaking*.18 + p.attrs.ballRunning*.18 + p.attrs.finishing*.13 + p.attrs.shortPass*.12 + p.attrs.longPass*.08 + p.attrs.vision*.10 + p.attrs.decisionMaking*.10 + p.attrs.ballSecurity*.06 + p.attrs.speed*.05);
    const d = (p.attrs.tackling*.25 + p.attrs.defRead*.22 + p.attrs.markerDef*.13 + p.attrs.lastDitch*.13 + p.attrs.workRate*.12 + p.attrs.strength*.08 + p.attrs.bigHit*.07);
    atk += a*fam*cond*mor*form*weight*roleMod.a; def += d*fam*cond*mor*form*weight*roleMod.d;
    kick = Math.max(kick, (p.attrs.kickPower*.45 + p.attrs.kickAccuracy*.35 + p.attrs.fieldGoal*.12 + p.attrs.placeKick*.08)*fam);
    n += weight;
  });
  if(n===0) return {atk:50, def:50, kick:50};
  const planMod = {attacking:{a:1.07,d:.94}, balanced:{a:1,d:1}, grinding:{a:.93,d:1.07}}[t.plan||'balanced'];
  const cohMod = 0.97 + 0.06*((t.cohesion||50)/100);
  const tacMod = (t.id===G.coach.teamId && G.coach.attrs) ? (1 + 0.03*(G.coach.attrs.tactics/100)) : 1;
  const zone = zoneTacticsMod(t);
  return { atk: (atk/n)*planMod.a*cohMod*tacMod*capMod*zone.a, def: (def/n)*planMod.d*cohMod*tacMod*capMod*zone.d, kick: kick*zone.k };
}
export function positionRoleFit(p, pos, role){
  if(!role || role==='balanced') return {a:1,d:1};
  const A = p.attrs;
  const score = {
    attacking:(A.playmaking+A.ballRunning+A.finishing+A.vision)/400,
    defensive:(A.tackling+A.defRead+A.lastDitch+A.composure)/400,
    controlled:(A.shortPass+A.kickAccuracy+A.decisionMaking+A.composure)/400,
    opportunist:(A.acceleration+A.playmaking+A.vision+A.ballRunning)/400,
    yardage:(A.strength+A.ballRunning+A.ballSecurity+A.workRate)/400,
    finisher:(A.finishing+A.speed+A.acceleration+A.catching)/400,
    strike:(A.ballRunning+A.finishing+A.speed+A.strength)/400,
    enforcer:(A.bigHit+A.strength+A.tackling+A.workRate)/400,
    edgeRunner:(A.ballRunning+A.finishing+A.speed+A.strength)/400,
    workhorse:(A.workRate+A.stamina+A.tackling+A.markerDef)/400,
    ballPlaying:(A.shortPass+A.playmaking+A.vision+A.decisionMaking)/400,
  }[role] || .55;
  const bump = (score-.55)*0.08;
  const attackRoles = ['attacking','opportunist','yardage','finisher','strike','edgeRunner','ballPlaying'];
  const defRoles = ['defensive','controlled','enforcer','workhorse'];
  return {a:1 + (attackRoles.includes(role)?bump:bump*.35), d:1 + (defRoles.includes(role)?bump:bump*.25)};
}
export function zoneTacticsMod(t){
  const z = t.zoneTactics || {};
  const vals = Object.values(z);
  let a=1,d=1,k=1;
  for(const v of vals){
    if(v==='safe'){ a*=0.992; d*=1.006; k*=1.006; }
    if(v==='expansive'){ a*=1.008; d*=0.994; k*=0.997; }
  }
  return {a,d,k};
}
export function simMatch(m, isFinal){
  if(m.played || m._htPending) return m; // skip if already simulated or mid-watch-game
  const th = G.teams[m.h], ta = G.teams[m.a];
  if(!validateLineup(th)) autoPick(th);
  if(!validateLineup(ta)) autoPick(ta);
  const isMagicRound = !isFinal && G.magicRound && G.magicRound.round === G.round;
  const mrHost = isMagicRound ? G.teams.find(t => t.id === G.magicRound.hostTeamId) : null;
  const venue = isFinal ? 'Grand Final Stadium'
    : isMagicRound ? (G.magicRound.venue || (mrHost ? mrHost.city + ' Magic Round' : 'Magic Round'))
    : (th.stadium || pick(STADIUM_NAMES));
  const slot = m.slot || {day:'Saturday', time:'afternoon', label:'Sat Afternoon'};
  // Night games: cooler and dewier; afternoon games: heat/harder surface; twilight sits between.
  const isNight = slot.time === 'night';
  const isTwilight = slot.time === 'twilight';
  const weatherPool = [...WEATHER, isNight ? 'Light rain' : isTwilight ? 'Windy' : 'Humid'];
  const weather = m.projWeather || pick(weatherPool);
  const crowd = m.projCrowd || matchCrowd(isMagicRound ? mrHost || th : th, isFinal);
  const ticketPrice = th.id===G.coach.teamId && G.club ? (G.club.ticketPrice || 28) : 28;
  const timeOfDayMod = isNight ? 0.97 : isTwilight ? 1.00 : 1.03; // night dew, twilight neutral, afternoon opens up
  const baseWeatherTryMod = (weather==='Heavy rain' ? .84 : weather==='Light rain' ? .92 : weather==='Windy' ? .95 : weather==='Humid' ? .96 : 1) * timeOfDayMod;
  const baseWeatherKickMod = weather==='Heavy rain' ? .88 : weather==='Light rain' ? .93 : weather==='Windy' ? .90 : weather==='Humid' ? .97 : 1;
  const badWeather = weather === 'Heavy rain' || weather === 'Windy';
  const coachId = G.coach ? G.coach.teamId : -1;
  const coachTeam = G.teams.find(t => t.id === coachId);
  const conservative = badWeather && coachTeam && coachTeam.matchPrefs && coachTeam.matchPrefs.weatherTactics === 'conservative';
  const isCoachH = th.id === coachId, isCoachA = ta.id === coachId;
  // Conservative weather play: sacrifice some try-scoring (×0.93) in exchange for halving the kick penalty
  const adjTryMod = conservative ? 1 + (baseWeatherTryMod - 1) * 0.5 : baseWeatherTryMod;
  const adjKickMod = conservative ? baseWeatherKickMod + (1 - baseWeatherKickMod) * 0.55 : baseWeatherKickMod;
  const weatherTryMod = baseWeatherTryMod; // keep for det logging
  const weatherKickMod = baseWeatherKickMod;
  const crowdHomeMod = (isFinal || isMagicRound) ? 1 : clamp(0.985 + crowd / 1200000, .985, 1.035);
  th._prevLineup = th.lineup.slice(0,13);
  ta._prevLineup = ta.lineup.slice(0,13);
  const ph = lineupPower(th), pa = lineupPower(ta);
  const hAdj = isMagicRound ? 1 : 1.035;
  const ratH = Math.min((ph.atk*hAdj)/pa.def, 1.65);
  const ratA = Math.min(pa.atk/(ph.def*hAdj), 1.65);
  const hTryMod = (isCoachH && conservative) ? adjTryMod * 0.93 : baseWeatherTryMod;
  const aTryMod = (isCoachA && conservative) ? adjTryMod * 0.93 : baseWeatherTryMod;
  const hKickMod = (isCoachH && conservative) ? adjKickMod : baseWeatherKickMod;
  const aKickMod = (isCoachA && conservative) ? adjKickMod : baseWeatherKickMod;
  const expH = clamp(2.85 * Math.pow(ratH, 1.65) * rf(.87,1.13) * hTryMod * crowdHomeMod * tacticalFocusTryMod(th, ta), 0.7, 9);
  const expA = clamp(2.85 * Math.pow(ratA, 1.65) * rf(.87,1.13) * aTryMod * tacticalFocusTryMod(ta, th) / Math.sqrt(crowdHomeMod), 0.7, 9);
  let triesH = poisson(expH), triesA = poisson(expA);
  if(isFinal && triesH===triesA && rnd()<.5) (rnd()<.5? triesH++ : triesA++);
  // Approximate half-time split for HT score display (not used in final result)
  const htSplitH = ri(0, triesH), htSplitA = ri(0, triesA);
  const htGoalH = triesH > 0 ? Math.round((htSplitH / triesH) * (triesH * 0.65)) : 0;
  const htGoalA = triesA > 0 ? Math.round((htSplitA / triesA) * (triesA * 0.65)) : 0;
  const htScore = {h: htSplitH*4 + htGoalH*2, a: htSplitA*4 + htGoalA*2};
  const hConservative = isCoachH && conservative;
  const aConservative = isCoachA && conservative;
  const det = {h:{}, a:{}, events:[], suspensions:[], venue, weather, crowd, ticketPrice, weatherTryMod, weatherKickMod, htScore, slot,
    weatherEffects: weatherMatchEffects(weather)};
  const goalsH = simTeamStats(th, triesH, det.h, ph.kick * hKickMod, {weather, conservative:hConservative, kickMod:hKickMod});
  const goalsA = simTeamStats(ta, triesA, det.a, pa.kick * aKickMod, {weather, conservative:aConservative, kickMod:aKickMod});
  // Infringements (after stats so they don't affect scoring math)
  genInfringements(th, det, det.h);
  genInfringements(ta, det, det.a);
  let hs = triesH*4 + goalsH*2, as = triesA*4 + goalsA*2;
  if(Math.abs(hs-as)<=1 && rnd()<.5){ if(rnd()<.5 && th.matchPrefs?.fieldGoal!==false){ hs+=1; awardFieldGoal(th, det.h, det.events); } else if(ta.matchPrefs?.fieldGoal!==false){ as+=1; awardFieldGoal(ta, det.a, det.events); } }
  if(isFinal && hs===as){ if(rnd()<.5 && th.matchPrefs?.fieldGoal!==false){ hs+=1; awardFieldGoal(th, det.h, det.events); } else if(ta.matchPrefs?.fieldGoal!==false){ as+=1; awardFieldGoal(ta, det.a, det.events); } }
  setDerivedMatchStats(det, triesH, triesA);
  m.played = true; m.hs = hs; m.as = as; m.det = det;
  awardVotes(th, ta, det);
  postMatch(th, hs, as, det.h); postMatch(ta, as, hs, det.a);
  applyTribunalBans(det);
  return m;
}
export function weatherMatchEffects(weather){
  const handling = weather==='Heavy rain' ? 1.55 : weather==='Light rain' ? 1.25 : weather==='Windy' ? 1.14 : weather==='Humid' ? 1.10 : 1;
  const kickMeters = weather==='Heavy rain' ? 0.92 : weather==='Light rain' ? 0.96 : weather==='Windy' ? 0.88 : weather==='Humid' ? 0.98 : 1;
  const territoryKick = weather==='Heavy rain' ? 0.86 : weather==='Light rain' ? 0.93 : weather==='Windy' ? 0.78 : weather==='Humid' ? 0.96 : 1;
  return {handling, kickMeters, territoryKick};
}
function matchTeamTotals(det){
  const out = {runs:0, err:0, m:0, km:0, k4020:0, fdo:0};
  for(const l of Object.values(det)){
    if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
    out.runs += l.runs || 0;
    out.err += l.err || 0;
    out.m += l.m || 0;
    out.km += l.km || 0;
    out.k4020 += l.k4020 || 0;
    out.fdo += l.fdo || 0;
  }
  return out;
}
function pctShare(a, b, min, max){
  const total = Math.max(1, a + b);
  return clamp(Math.round((a / total) * 100), min, max);
}
function setDerivedMatchStats(det, triesH, triesA){
  const h = matchTeamTotals(det.h), a = matchTeamTotals(det.a);
  const possScoreH = Math.max(1, h.runs + h.fdo * 5 + h.k4020 * 2 + triesH * 2 - h.err * 3);
  const possScoreA = Math.max(1, a.runs + a.fdo * 5 + a.k4020 * 2 + triesA * 2 - a.err * 3);
  det.possH = pctShare(possScoreH, possScoreA, 32, 68);
  det.possA = 100 - det.possH;
  det.complH = h.runs > 0 ? Math.round(Math.max(0, h.runs - h.err) / h.runs * 100) : 70;
  det.complA = a.runs > 0 ? Math.round(Math.max(0, a.runs - a.err) / a.runs * 100) : 70;
  const territoryScoreH = Math.max(1, h.m + h.km * 0.22 + h.k4020 * 80 + h.fdo * 45 + triesH * 20 - h.err * 22);
  const territoryScoreA = Math.max(1, a.m + a.km * 0.22 + a.k4020 * 80 + a.fdo * 45 + triesA * 20 - a.err * 22);
  det.terrH = pctShare(territoryScoreH, territoryScoreA, 28, 72);
  det.terrA = 100 - det.terrH;
}
// opts: {isHalf, isSecondHalf, skipStats}
// isHalf: use ~40-min range for player minutes
// isSecondHalf: use minutes 42-78 for try/pen events (else 2-38 if isHalf, else 2-78)
// skipStats: skip p.s / p.career / club-bucket updates (physical updates always happen)
export function simTeamStats(t, tries, out, kickSkill, weatherCtx, opts){
  const isHalf = opts && opts.isHalf;
  const isSecondHalf = opts && opts.isSecondHalf;
  const isEarlySecond = opts && opts.isEarlySecond; // 40–60 min segment
  const isFinalChunk = opts && opts.isFinalChunk;   // 60–80 min segment
  const skipStats = opts && opts.skipStats;
  // First-half only uses starters; second-half and full-match use all 17
  const sliceEnd = (isHalf && !isSecondHalf) ? 13 : 17;
  const players = t.lineup.slice(0, sliceEnd).map((id,i)=>({p:G.players[id], slot:i})).filter(x=>x.p);
  if(!t.roles) assignDefaultTeamRoles(t);
  const tryW = {FB:1.4, WG:2.1, CE:1.5, FE:.9, HB:.8, PR:.45, HK:.6, SR:.95, LK:.7, BE:.4};
  let goals = 0;
  const kicker = rolePlayer(t, 'goalKicker', players.map(x=>x.p), 'goalKicker');
  const weatherEffects = weatherMatchEffects(weatherCtx && weatherCtx.weather);
  const handlingMod = weatherCtx && weatherCtx.conservative ? 1 + (weatherEffects.handling - 1) * 0.45 : weatherEffects.handling;
  simTerritoryKicks(t, players, out, weatherCtx);
  // Minute ranges for events — 80-minute game: 0–40 first half, 41–80 second half
  const evMinLo = isHalf ? (isFinalChunk ? 62 : isSecondHalf ? 41 : 2) : 2;
  const evMinHi = isHalf ? (isFinalChunk ? 79 : isEarlySecond ? 59 : isSecondHalf ? 79 : 39) : 79;
  const penMinLo = isHalf ? (isFinalChunk ? 62 : isSecondHalf ? 41 : 5) : 5;
  for(let i=0;i<tries;i++){
    const pool = players.map(x=>({x, w: (tryW[SLOTS[x.slot].pos]||.5) * (x.p.attrs.finishing+x.p.attrs.ballRunning+x.p.attrs.speed+x.p.attrs.acceleration)/240 }));
    const total = pool.reduce((s,e)=>s+e.w,0);
    let r = rnd()*total, scorer = pool[0].x;
    for(const e of pool){ r -= e.w; if(r<=0){ scorer = e.x; break; } }
    out[scorer.p.id] = out[scorer.p.id] || mkLine(); out[scorer.p.id].t++;
    let assistEntry = null;
    if(rnd()<.62){
      const aPool = players.filter(x=>x.p.id!==scorer.p.id && ['FE','HB','HK','FB'].includes(x.p.pos));
      if(aPool.length){
        assistEntry = aPool.sort((a,b)=>(b.p.attrs.vision+b.p.attrs.shortPass+b.p.attrs.playmaking)-(a.p.attrs.vision+a.p.attrs.shortPass+a.p.attrs.playmaking))[Math.floor(rnd()*Math.min(3,aPool.length))];
        out[assistEntry.p.id] = out[assistEntry.p.id] || mkLine(); out[assistEntry.p.id].ta++;
      }
    }
    let converted = false;
    if(kicker){
      const line = out[kicker.id]=out[kicker.id]||mkLine();
      line.ga++;
      if(rnd() < (.48 + (kicker.attrs.placeKick*.7+kicker.attrs.composure*.3)/230)){ goals++; line.gl++; converted=true; }
    }
    out._tryEvents = out._tryEvents || [];
    out._tryEvents.push({scorerId:scorer.p.id, assistId:assistEntry?assistEntry.p.id:null, kickerId:kicker?kicker.id:null, min:ri(evMinLo, evMinHi), converted});
  }
  if(kicker){
    const pref = t.matchPrefs && t.matchPrefs.penalty || 'auto';
    const penLambda = pref==='penaltyGoal' ? (tries===0 ? 1.55 : .75) : pref==='tap' ? .08 : pref==='kickTouch' ? .18 : (tries===0 ? 1.0 : .35);
    const pens = poisson(penLambda);
    if(pens){
      const line=out[kicker.id]=out[kicker.id]||mkLine();
      line.ga += pens;
      out._penGoalEvents = out._penGoalEvents || [];
      for(let i=0;i<pens;i++){
        const made = rnd() < (.62 + (kicker.attrs.placeKick*.7+kicker.attrs.composure*.3)/260);
        if(made){ goals++; line.gl++; }
        out._penGoalEvents.push({kickerId:kicker.id, min:ri(penMinLo, evMinHi), made});
      }
    }
  }
  for(const x of players){
    const line = out[x.p.id] = out[x.p.id] || mkLine();
    const grp = POS_GROUP[x.p.pos];
    const focus = t.matchPrefs && t.matchPrefs.attackFocus || 'balanced';
    const leftSlots = [3, 4, 11];
    const rightSlots = [1, 2, 10];
    const middleSlots = [7, 8, 9, 12];
    let focusRunMod = 1, focusErrMod = 1, focusLbMod = 1, focusKickMod = 1;
    if(focus === 'middle'){
      focusRunMod = middleSlots.includes(x.slot) ? 1.08 : 0.96;
      focusLbMod = middleSlots.includes(x.slot) ? 1.05 : 0.96;
      focusErrMod = 1.02;
    } else if(focus === 'left'){
      focusRunMod = leftSlots.includes(x.slot) ? 1.10 : rightSlots.includes(x.slot) ? 0.94 : 0.99;
      focusLbMod = leftSlots.includes(x.slot) ? 1.08 : 0.97;
      focusErrMod = leftSlots.includes(x.slot) ? 1.04 : 1;
    } else if(focus === 'right'){
      focusRunMod = rightSlots.includes(x.slot) ? 1.10 : leftSlots.includes(x.slot) ? 0.94 : 0.99;
      focusLbMod = rightSlots.includes(x.slot) ? 1.08 : 0.97;
      focusErrMod = rightSlots.includes(x.slot) ? 1.04 : 1;
    } else if(focus === 'territory'){
      focusRunMod = 0.97;
      focusErrMod = 0.94;
      focusKickMod = ['half','back','hk'].includes(grp) ? 1.10 : 1.03;
    }
    // Player minutes per segment (drives stat scaling via mins/80)
    // Full match: starters 68–80, bench 18–42
    // First half (40 min): starters 34–40, bench 0–8 (unlikely to play first half)
    // 40–60 and 60–80 segments (20 min each): starters 16–22, bench 4–14
    const mins = isHalf
      ? (isFinalChunk || isEarlySecond
          ? (x.slot<13 ? ri(16,22) : ri(4,14))
          : (x.slot<13 ? ri(34,40) : ri(0, 8)))
      : (x.slot<13 ? (grp==='fwd' && x.p.pos==='PR' ? ri(45,62) : ri(68,80)) : ri(18,42));
    line.min = (line.min||0) + mins;
    const runBase = {fwd:13, hk:7, half:6, back:12}[grp];
    line.runs = Math.max(0, Math.round(runBase * mins/80 * (x.p.attrs.workRate+x.p.attrs.ballRunning+x.p.attrs.stamina)/195 * rf(.65,1.35) * focusRunMod));
    const tkBase = {fwd:36, hk:40, half:22, back:14}[grp];
    line.tk = Math.max(0, Math.round(tkBase * mins/80 * (x.p.attrs.tackling+x.p.attrs.markerDef+x.p.attrs.workRate)/195 * rf(.7,1.3)));
    const mBase = {fwd:130, hk:80, half:70, back:140}[grp];
    line.m = Math.max(0, Math.round(mBase * mins/80 * (x.p.attrs.strength+x.p.attrs.speed+x.p.attrs.ballRunning)/195 * rf(.65,1.4) * focusRunMod));
    const formAdj = ((x.p.form == null ? 50 : x.p.form) - 50) / 100;
    const errChance = (1 - (x.p.attrs.ballSecurity*.55+x.p.attrs.catching*.25+x.p.attrs.composure*.20)/130) * clamp(1 - formAdj*.55, .72, 1.28) * handlingMod * focusErrMod;
    line.err = rnd() < errChance ? ri(1, weatherEffects.handling >= 1.45 && rnd() < .22 ? 3 : 2) : 0;
    const mtRate = clamp((90 - (x.p.attrs.tackling*0.55 + x.p.attrs.markerDef*0.35 + x.p.attrs.workRate*0.10)) / 120, 0.04, 0.35);
    line.mt = Math.max(0, Math.round(line.tk * mtRate * rf(0.5, 1.5)));
    const footwork = x.p.attrs.stepSkill != null ? x.p.attrs.stepSkill : (x.p.attrs.agility*.65 + x.p.attrs.ballRunning*.35);
    const lbSkill = (x.p.attrs.speed*0.35 + x.p.attrs.acceleration*0.30 + footwork*0.35);
    const lbRate = clamp((lbSkill - 48) / 500, 0.003, 0.10);
    line.lb = Math.max(0, Math.round(line.runs * lbRate * rf(0.4, 1.8) * focusLbMod));
    if(['FE','HB','HK','FB'].includes(x.p.pos)){
      const lbaBase = {HB:2.2, FE:1.8, HK:1.5, FB:0.8}[x.p.pos] || 0.8;
      const lbaSkill = (x.p.attrs.vision + x.p.attrs.shortPass + x.p.attrs.playmaking) / 195;
      line.lba = Math.max(0, Math.round(lbaBase * lbaSkill * rf(0.3, 1.8)));
    }
    const isPrimaryKicker = kicker && kicker.id === x.p.id;
    const ksBase = {half: isPrimaryKicker ? 22 : 14, hk: 4, back: 2, fwd: 1}[grp] || 1;
    line.ks = Math.max(0, Math.round(ksBase * rf(0.6, 1.4) * focusKickMod));
    const kickMeterMod = weatherEffects.kickMeters * (weatherCtx && weatherCtx.conservative ? 1.02 : 1);
    const avgKickM = clamp((30 + (x.p.attrs.kickPower*0.25 + x.p.attrs.kickAccuracy*0.15)) * kickMeterMod * focusKickMod, 25, 75);
    line.km = Math.max(0, Math.round(line.ks * avgKickM * rf(0.8, 1.2)));
    const baseline = x.slot < 13 ? 5.15 : 4.85;
    line.r = clamp(baseline + line.t*1.05 + line.ta*.75 + line.gl*.08 + line.fg*.28 + line.tk/30 + line.m/115 + line.runs/38 + line.lb*.35 + line.lba*.22 + line.k4020*.35 + (line.fdo||0)*.22 - line.err*1.05 - line.mt*.16 + (x.p.attrs.lastDitch-55)/150 + formAdj*.35 + gauss(0,.55), 1, 10);
    line.fp = line.t*4 + line.ta*2 + line.gl*2 + line.fg*2 + line.k4020*3 + (line.fdo||0)*2 + Math.floor(line.tk/10) + Math.floor(line.m/25) + Math.floor(line.runs/8) - line.err*2;
    // Physical updates always happen (affect next-half lineupPower via p.cond/load)
    const workload = mins/80*42 + (line.tk||0)/5 + (line.runs||0)/8 + (line.m||0)/180;
    x.p.load = clamp((x.p.load || 0) * 0.62 + workload, 0, 100);
    x.p.fatigue = clamp((100 - x.p.cond) * 0.72 + x.p.load * 0.48, 0, 100);
    x.p.lastPlayedDay = G.calendar ? G.calendar.day : G.round * 7 + 5;
    x.p.cond = clamp(x.p.cond - (26 - x.p.attrs.stamina/6) * mins/80 - x.p.load/32, 20, 100);
    const carrying = x.p.injury && x.p.playInjured;
    const injChance = .035 * (1 + (100 - x.p.attrs.injury)/70) * (x.p.cond<55 ? 1.5 : 1) * (1 + Math.max(0, x.p.load - 70)/120) * (carrying ? 3.2 : 1);
    if(rnd() < injChance){
      const inj = pick(INJURIES);
      x.p.injury = {n:inj.n, weeks: ri(inj.w[0], inj.w[1])};
      x.p.playInjured = false;
      x.p.injuries = x.p.injuries || [];
      x.p.injuries.unshift({y:G.year, r:G.round+1, n:inj.n, weeks:x.p.injury.weeks});
      if(x.p.injury.weeks >= 4) x.p.attrs.injury = clamp(x.p.attrs.injury - ri(1,3), 20, 99);
      line.inj = inj.n;
      line.injMin = isHalf
        ? (isFinalChunk ? ri(62,79) : isEarlySecond ? ri(41,59) : ri(10,39))
        : ri(10,79);
    }
    if(skipStats) continue;
    // Season stats, career, club bucket — deferred when skipStats=true
    const s = x.p.s; s.g++; s.t+=line.t; s.runs+=(line.runs||0); s.gl+=line.gl; s.ga+=(line.ga||0); s.fg+=(line.fg||0); s.ta+=line.ta; s.tk+=line.tk; s.m+=line.m; s.err+=line.err; s.k4020+=(line.k4020||0); s.fdo=(s.fdo||0)+(line.fdo||0); s.rSum+=line.r; s.fpts+=(line.fp||0); s.mins=(s.mins||0)+mins; s.mt=(s.mt||0)+line.mt; s.lb=(s.lb||0)+line.lb; s.lba=(s.lba||0)+line.lba; s.ks=(s.ks||0)+line.ks; s.km=(s.km||0)+line.km;
    if(x.p.squad === 'trial'){
      x.p.trialGames = (x.p.trialGames || 0) + 1;
      if(!x.p.trialBreakout && x.p.trialGames >= 2){
        const breakoutChance = (line.r >= 7.2 ? .055 : .018) + (x.p.age <= 24 ? .012 : 0);
        if(rnd() < breakoutChance){
          x.p.trialBreakout = true;
          const potGain = ri(6, 14);
          x.p.pot = clamp(Math.max(x.p.pot || x.p.ovr, x.p.ovr) + potGain, x.p.ovr, 97);
          for(const a of shuffle(['professionalism','workRate','composure','ballRunning','tackling','speed']).slice(0, ri(1,3))){
            if(x.p.attrs[a] != null) x.p.attrs[a] = clamp(x.p.attrs[a] + 1, 20, 99);
          }
          x.p.ovr = calcOvr(x.p);
          const club = G.teams.find(tm=>tm.players.includes(x.p.id));
          addNews(`${x.p.name} has had a train-and-trial breakout. Coaches now see a much higher ceiling after a sharp first-grade cameo.`,
            {title:'Train & Trial Breakout', type:'development', tone:'good', playerId:x.p.id, teamId:club?club.id:null, tag:'Development'});
        }
      }
    }
    ensurePlayerCareerStats(x.p);
    x.p.career.games++;
    x.p.career.tries += line.t;
    x.p.career.goals += line.gl;
    x.p.career.points += line.t*4 + line.gl*2 + (line.fg||0);
    x.p.career.ga += line.ga || 0;
    x.p.career.fg += line.fg || 0;
    x.p.career.ta += line.ta || 0;
    x.p.career.tk += line.tk || 0;
    x.p.career.m += line.m || 0;
    x.p.career.runs += line.runs || 0;
    x.p.career.err += line.err || 0;
    x.p.career.fpts += line.fp || 0;
    x.p.career.k4020 += line.k4020 || 0;
    x.p.career.fdo += line.fdo || 0;
    x.p.career.mins += mins;
    x.p.career.mt += line.mt || 0;
    x.p.career.lb += line.lb || 0;
    x.p.career.lba += line.lba || 0;
    x.p.career.ks += line.ks || 0;
    x.p.career.km += line.km || 0;
    x.p.career.rSum += line.r || 0;
    addLineToStatBucket(playerClubStatBucket(x.p, t), line);
    // Career milestone news — only for coached team to avoid inbox spam
    if(t.id === G.coach.teamId){
      const g = x.p.career.games, tr = x.p.career.tries;
      const prevG = g - 1, prevTr = tr - line.t;
      for(const ms of [50, 100, 150, 200, 250, 300]){
        if(prevG < ms && g >= ms)
          addNews(`${x.p.name} has now played ${ms} NRL games — a significant career milestone.`,
            {title:`${ms} Career Games`, type:'milestone', tone:'good', playerId:x.p.id, teamId:t.id, tag:'Milestones', r:G.round+1, y:G.year});
      }
      for(const ms of [50, 100, 150, 200]){
        if(prevTr < ms && tr >= ms)
          addNews(`${x.p.name} has crossed for ${ms} career tries — a remarkable achievement in the game.`,
            {title:`${ms} Career Tries`, type:'milestone', tone:'good', playerId:x.p.id, teamId:t.id, tag:'Milestones', r:G.round+1, y:G.year});
      }
    }
  }
  return goals;
}
/* ---------- stat merging + deferred application for split match ---------- */
export function mergeStatDicts(a, b){
  const NUM_KEYS = ['t','gl','ga','fg','ta','tk','m','runs','err','r','fp','k4020','fdo','mt','lb','lba','ks','km','inf'];
  const merged = {};
  const allIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for(const k of allIds){
    if(k === '_tryEvents' || k === '_penGoalEvents') continue;
    const la = a[k], lb = b[k];
    if(!la || typeof la !== 'object' || Array.isArray(la)){ if(lb && typeof lb === 'object' && !Array.isArray(lb)) merged[k] = {...lb}; continue; }
    if(!lb || typeof lb !== 'object' || Array.isArray(lb)){ merged[k] = {...la}; continue; }
    const m2 = {};
    for(const f of NUM_KEYS) m2[f] = (la[f]||0) + (lb[f]||0);
    // min: sum both halves
    m2.min = (la.min||0) + (lb.min||0);
    // Keep first-half injMin if present (injury happened earlier)
    if(la.injMin != null) m2.injMin = la.injMin; else if(lb.injMin != null) m2.injMin = lb.injMin;
    if(la.inj || lb.inj) m2.inj = la.inj || lb.inj;
    merged[k] = m2;
  }
  // Concatenate event arrays
  const evA = a._tryEvents||[], evB = b._tryEvents||[];
  if(evA.length||evB.length) merged._tryEvents = [...evA, ...evB];
  const peA = a._penGoalEvents||[], peB = b._penGoalEvents||[];
  if(peA.length||peB.length) merged._penGoalEvents = [...peA, ...peB];
  return merged;
}
export function applyMatchStats(t, statsMap){
  for(const [idStr, line] of Object.entries(statsMap)){
    if(typeof line !== 'object' || !line || Array.isArray(line)) continue;
    const p = G.players[+idStr]; if(!p) continue;
    const mins = line.min || 0;
    const s = p.s; s.g++; s.t+=line.t; s.runs+=(line.runs||0); s.gl+=line.gl; s.ga+=(line.ga||0); s.fg+=(line.fg||0); s.ta+=line.ta; s.tk+=line.tk; s.m+=line.m; s.err+=line.err; s.k4020+=(line.k4020||0); s.fdo=(s.fdo||0)+(line.fdo||0); s.rSum+=line.r; s.fpts+=(line.fp||0); s.mins=(s.mins||0)+mins; s.mt=(s.mt||0)+line.mt; s.lb=(s.lb||0)+line.lb; s.lba=(s.lba||0)+line.lba; s.ks=(s.ks||0)+line.ks; s.km=(s.km||0)+line.km;
    if(p.squad === 'trial'){
      p.trialGames = (p.trialGames || 0) + 1;
      if(!p.trialBreakout && p.trialGames >= 2){
        const breakoutChance = (line.r >= 7.2 ? .055 : .018) + (p.age <= 24 ? .012 : 0);
        if(rnd() < breakoutChance){
          p.trialBreakout = true;
          const potGain = ri(6, 14);
          p.pot = clamp(Math.max(p.pot || p.ovr, p.ovr) + potGain, p.ovr, 97);
          for(const a of shuffle(['professionalism','workRate','composure','ballRunning','tackling','speed']).slice(0, ri(1,3))){
            if(p.attrs[a] != null) p.attrs[a] = clamp(p.attrs[a] + 1, 20, 99);
          }
          p.ovr = calcOvr(p);
          const club = G.teams.find(tm=>tm.players.includes(p.id));
          addNews(`${p.name} has had a train-and-trial breakout. Coaches now see a much higher ceiling after a sharp first-grade cameo.`,
            {title:'Train & Trial Breakout', type:'development', tone:'good', playerId:p.id, teamId:club?club.id:null, tag:'Development'});
        }
      }
    }
    ensurePlayerCareerStats(p);
    p.career.games++; p.career.tries+=line.t; p.career.goals+=line.gl; p.career.points+=line.t*4+line.gl*2+(line.fg||0); p.career.ga+=line.ga||0; p.career.fg+=line.fg||0; p.career.ta+=line.ta||0; p.career.tk+=line.tk||0; p.career.m+=line.m||0; p.career.runs+=line.runs||0; p.career.err+=line.err||0; p.career.fpts+=line.fp||0; p.career.k4020+=line.k4020||0; p.career.fdo+=line.fdo||0; p.career.mins+=mins; p.career.mt+=line.mt||0; p.career.lb+=line.lb||0; p.career.lba+=line.lba||0; p.career.ks+=line.ks||0; p.career.km+=line.km||0; p.career.rSum+=line.r||0;
    addLineToStatBucket(playerClubStatBucket(p, t), line);
  }
}
export function awardFieldGoal(t, out, events){
  const active = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
  const kicker = rolePlayer(t, 'primaryKicker', active, 'kicker') || rolePlayer(t, 'secondaryKicker', active, 'kicker');
  if(!kicker) return;
  out[kicker.id] = out[kicker.id] || mkLine();
  out[kicker.id].fg++;
  out[kicker.id].fp = (out[kicker.id].fp || 0) + 2;
  out[kicker.id].r = clamp((out[kicker.id].r || 5) + .35, 1, 10);
  if(events) events.push({min:ri(68,80), team:t.id, pts:1, txt:`${kicker.name} snaps a field goal for ${t.nick}!`});
  if(kicker.s){
    kicker.s.fg = (kicker.s.fg||0) + 1;
    kicker.s.fpts = (kicker.s.fpts||0) + 2;
    kicker.s.rSum = (kicker.s.rSum||0) + .35;
  }
  ensurePlayerCareerStats(kicker);
  kicker.career.points += 1;
  kicker.career.fg += 1;
  kicker.career.fpts += 2;
  kicker.career.rSum += .35;
  const clubBucket = playerClubStatBucket(kicker, t);
  clubBucket.points += 1;
  clubBucket.fg += 1;
  clubBucket.fpts += 2;
  clubBucket.rSum += .35;
}
export function rolePlayer(t, key, pool, scoreRole){
  pool = pool || t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
  const wanted = G.players[t.roles && t.roles[key]];
  if(wanted && pool.some(p=>p.id===wanted.id) && (!wanted.injury || wanted.playInjured)) return wanted;
  return pool.filter(p=>!p.injury || p.playInjured).sort((a,b)=>roleScore(b,scoreRole)-roleScore(a,scoreRole))[0] || null;
}
export function simTerritoryKicks(t, players, out, weatherCtx){
  const pool = players.map(x=>x.p);
  const primary = rolePlayer(t, 'primaryKicker', pool, 'kicker');
  const secondary = rolePlayer(t, 'secondaryKicker', pool.filter(p=>!primary || p.id!==primary.id), 'kicker');
  const weatherEffects = weatherMatchEffects(weatherCtx && weatherCtx.weather);
  const territoryMod = weatherEffects.territoryKick * (weatherCtx && weatherCtx.conservative ? 1.08 : 1);
  for(const k of [primary, secondary].filter(Boolean)){
    const skill = k.attrs.kickPower*.45 + k.attrs.kickAccuracy*.35 + k.attrs.decisionMaking*.12 + k.attrs.composure*.08;
    const attempts = k===primary ? 1.2 : .45;
    if(rnd() < attempts * clamp((skill-62)/260, .005, .055) * territoryMod){
      out[k.id]=out[k.id]||mkLine(); out[k.id].k4020++;
    }
    if(rnd() < attempts * clamp((skill-68)/420, .002, .028) * territoryMod){
      out[k.id]=out[k.id]||mkLine(); out[k.id].k4020++;
    }
    const repeatSetPressure = attempts * clamp((skill-58)/150, .015, .24) * territoryMod;
    if(rnd() < repeatSetPressure){
      out[k.id]=out[k.id]||mkLine();
      out[k.id].fdo++;
    }
  }
}
export function mkLine(){ return {t:0,gl:0,ga:0,fg:0,ta:0,tk:0,m:0,runs:0,err:0,min:0,r:0,fp:0,k4020:0,fdo:0,mt:0,lb:0,lba:0,ks:0,km:0,inf:0}; }
export function awardVotes(th, ta, det){
  const all = [];
  for(const id in det.h) if(det.h[id] && det.h[id].r) all.push({id:+id, r:det.h[id].r});
  for(const id in det.a) if(det.a[id] && det.a[id].r) all.push({id:+id, r:det.a[id].r});
  all.sort((a,b)=>b.r-a.r);
  [3,2,1].forEach((v,i)=>{
    if(!all[i]) return;
    const p = G.players[all[i].id];
    p.s.votes += v;
    ensurePlayerCareerStats(p);
    p.career.votes += v;
    const t = G.teams.find(t=>t.players.includes(p.id));
    if(t) playerClubStatBucket(p, t).votes += v;
  });
}
export function postMatch(t, pf, pa, lines){
  const won = pf>pa;
  const mmBonus = (t.id===G.coach.teamId && G.coach.attrs) ? Math.round(G.coach.attrs.manMgmt/50) : 0;
  for(const id of t.players){ const p = G.players[id];
    const inTeam = t.lineup.includes(id);
    const delta = inTeam ? (won ? ri(2,5)+mmBonus : -(ri(2,5)-Math.min(mmBonus,2))) : -1;
    p.morale = clamp(p.morale + delta, 5, 99);
    updatePlayerForm(p, lines && lines[id], won, inTeam);
  }
  if(t._prevLineup){
    const curr = t.lineup.slice(0,13);
    let matches = 0;
    for(let i=0;i<13;i++) if(curr[i] && curr[i]===t._prevLineup[i]) matches++;
    const starters = curr.map(id=>G.players[id]).filter(Boolean);
    const avgForm = starters.length ? starters.reduce((s,p)=>s+(p.form == null ? 50 : p.form),0) / starters.length : 50;
    const delta = Math.round((matches/13)*5 - 1.5 + clamp((avgForm - 50) / 24, -2, 2));
    t.cohesion = clamp((t.cohesion||50) + delta, 0, 100);
    delete t._prevLineup;
  }
  updateCombinationChemistry(t);
}

function combinationGroupsForTeam(t){
  const ids = idxs => idxs.map(i => t.lineup && t.lineup[i]).filter(id => id != null);
  return {
    halves:{label:'Halves pairing', ids:ids([5,6])},
    hookerHalves:{label:'Hooker/halves', ids:ids([5,6,8])},
    spine:{label:'Spine', ids:ids([0,5,6,8])},
    leftEdge:{label:'Left edge', ids:ids([3,4,11])},
    rightEdge:{label:'Right edge', ids:ids([1,2,10])},
    middle:{label:'Middle rotation', ids:ids([7,8,9,12,13,14,15,16])},
    backThree:{label:'Back three', ids:ids([0,1,4])},
  };
}
function combinationSignature(ids){
  return ids.slice().sort((a,b)=>a-b).join('-');
}
function updateCombinationChemistry(t){
  if(!t || !t.lineup) return;
  t.combinations = t.combinations || {};
  const groups = combinationGroupsForTeam(t);
  for(const [key, group] of Object.entries(groups)){
    if(group.ids.length < 2) continue;
    const sig = combinationSignature(group.ids);
    const prev = t.combinations[key] || {rating:46, matches:0, sig:null};
    const same = prev.sig === sig;
    const base = same ? prev.rating : Math.round(prev.rating * 0.55 + 42 * 0.45);
    const gain = same ? 2.2 : 0.8;
    t.combinations[key] = {
      label:group.label,
      sig,
      ids:group.ids.slice(),
      matches:same ? (prev.matches || 0) + 1 : 1,
      rating:clamp(Math.round(base + gain + ((t.cohesion || 50) - 50) / 35), 25, 95),
      updatedRound:G.round,
      updatedYear:G.year,
    };
  }
}
export function updatePlayerForm(p, line, won, inTeam){
  if(!p) return;
  if(p.form == null) p.form = 50;
  let delta = 0;
  if(line && line.r){
    delta += line.r >= 8.2 ? 5 : line.r >= 7.2 ? 3 : line.r >= 6.4 ? 1 : line.r < 4.6 ? -5 : line.r < 5.4 ? -3 : -1;
    delta += won ? 1 : -1;
    if(line.t || line.ta || line.fg || line.k4020 || line.fdo) delta += 1;
    if(line.err >= 2) delta -= 1;
    if(line.inj) delta -= 3;
  } else if(inTeam){
    delta += won ? 1 : -2;
  } else {
    delta += p.form > 52 ? -1 : p.form < 48 ? 1 : 0;
  }
  p.form = clamp(Math.round(p.form + delta), 15, 95);
}

/* ---------- infringements ---------- */
export function genInfringements(t, det, out){
  const players = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
  for(const p of players){
    const discip = p.attrs && p.attrs.discipline != null ? p.attrs.discipline : 55;
    // Lower discipline = more infractions. Average team should land around 4-7 named penalties.
    const slot = t.lineup.indexOf(p);
    const workload = slot < 13 ? 1 : .55;
    const baseChance = clamp(((105 - discip) / 145) * workload, 0.045, 0.48);
    if(rnd() > baseChance) continue;
    const min = ri(3, 78);
    const isMinor = rnd() < 0.62;
    if(out){
      out[p.id] = out[p.id] || mkLine();
      out[p.id].inf = (out[p.id].inf || 0) + 1;
      out[p.id].r = clamp((out[p.id].r || 5) - .18, 1, 10);
    }
    if(p.s) p.s.inf = (p.s.inf||0) + 1;
    ensurePlayerCareerStats(p);
    p.career.inf += 1;
    playerClubStatBucket(p, t).inf += 1;
    if(isMinor){
      const inf = pick(INFRINGEMENT_MINOR);
      det.events.push({min, txt:`Penalty — ${p.name} (${t.nick}) penalised for ${inf.label.toLowerCase()}.`});
      continue;
    }
    // Graded infringement
    const inf = pick(INFRINGEMENT_GRADED);
    const gradeRoll = rnd();
    const grade = gradeRoll < 0.55 ? 1 : gradeRoll < 0.87 ? 2 : 3;
    const reckless = rnd() < 0.27;
    let card = 'none';
    if(grade===1 && reckless) card='sinBin';
    if(grade===2) card='sinBin';
    if(grade===3) card = reckless ? 'sendOff' : 'sinBin';
    if(inf.hipDropBonus && grade>=2) card = (grade===3 || reckless) ? 'sendOff' : 'sinBin';
    const gradeText = `Grade ${grade} ${reckless?'(reckless)':'(careless)'}`;
    const cardText = card==='sinBin' ? ' — SIN BINNED' : card==='sendOff' ? ' — SENT OFF' : '';
    det.events.push({min, txt:`${card==='sendOff'?'🟥':card==='sinBin'?'🟨':'⚠️'} ${p.name} (${t.nick}) — ${gradeText} ${inf.label}${cardText}.`});
    // Tribunal
    let banWeeks = 0;
    if(grade===1 && !reckless) banWeeks = rnd()<0.3 ? 1 : 0;
    else if(grade===1) banWeeks = ri(1,2);
    else if(grade===2 && !reckless) banWeeks = ri(1,3);
    else if(grade===2) banWeeks = ri(2,4);
    else if(grade===3 && !reckless) banWeeks = ri(3,6);
    else banWeeks = ri(5,10);
    if(inf.hipDropBonus) banWeeks += ri(1,2);
    if(card==='sendOff') banWeeks = Math.max(banWeeks, 2);
    if(banWeeks > 0){
      det.suspensions.push({pid: p.id, weeks: banWeeks, reason: `${gradeText} ${inf.label}`});
      det.events.push({min: min+1, txt:`📋 ${p.name} cited — ${inf.label}. Tribunal: ${banWeeks} week${banWeeks===1?'':'s'} expected.`});
    }
  }
}
export function applyTribunalBans(det){
  if(!det.suspensions || !det.suspensions.length) return;
  for(const s of det.suspensions){
    const p = G.players[s.pid]; if(!p) continue;
    if(p.suspended && p.suspended.weeks >= s.weeks) continue;
    p.suspended = {weeks: s.weeks, reason: s.reason};
    const isMine = myTeam() && myTeam().players.includes(p.id);
    addNews(`${p.name} cited for ${s.reason} — suspended for ${s.weeks} week${s.weeks===1?'':'s'}.`, {
      title:'Tribunal Outcome', type:'discipline', tone:'bad',
      playerId:s.pid, tag:'Discipline',
      teamId: isMine ? G.coach.teamId : undefined,
    });
  }
}

if (typeof window !== 'undefined') Object.assign(window, {
  simMatchFirstHalf, simMatchSecondHalf, simMatchFinalChunk, simMatch, lineupPower, positionRoleFit,
  zoneTacticsMod, simTeamStats, mergeStatDicts, applyMatchStats, awardFieldGoal,
  rolePlayer, postMatch, updatePlayerForm, genInfringements, applyTribunalBans,
  weatherMatchEffects, evMaxForDet,
});



export const CAL_WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const CAL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function ensureCalendar(){
  if(!G.calendar) G.calendar = {day:0, startISO:`${G.year}-03-02`, lastStop:null};
  if(G.calendar.day == null) G.calendar.day = Math.max(0, (G.round || 0) * 7);
  if(!G.calendar.startISO) G.calendar.startISO = `${G.year}-03-02`;
  return G.calendar;
}
export function calendarDayInWeek(day){
  const c = ensureCalendar();
  return ((day == null ? c.day : day) % 7 + 7) % 7;
}
export function calendarDateObj(day){
  const c = ensureCalendar();
  const d = new Date(`${c.startISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (day == null ? c.day : day));
  return d;
}
export function calendarDateLabel(day){
  const d = calendarDateObj(day);
  return `${CAL_WEEKDAYS[calendarDayInWeek(day)]} ${d.getUTCDate()} ${CAL_MONTHS[d.getUTCMonth()]}`;
}
export function calendarRoundForDay(day){
  const byDate = Math.floor((day == null ? ensureCalendar().day : day) / 7);
  const active = G && G.phase === 'regular' ? (G.round || 0) : byDate;
  return Math.max(0, Math.min((G.fixtures ? G.fixtures.length : 1) - 1, Math.max(active, byDate)));
}
export function calendarMyMatch(roundIdx){
  if(!G.fixtures || !G.fixtures[roundIdx]) return null;
  return G.fixtures[roundIdx].find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId) || null;
}
export function calendarStopForDay(day){
  if(!G || G.phase !== 'regular') return null;
  const dow = calendarDayInWeek(day);
  const r = calendarRoundForDay(day);
  const m = calendarMyMatch(r);
  const bye = ((G.byes && G.byes[r]) || []).includes(G.coach.teamId);
  const round = G.fixtures && G.fixtures[r];
  const gamesToday = round ? round.filter(mm=>!mm.played && slotDow(mm.slot) === dow) : [];
  const myGameToday = gamesToday.find(mm=>mm.h===G.coach.teamId || mm.a===G.coach.teamId);
  if(dow === 0) return {key:'training', label:'Training review', page:'training', tone:'neutral'};
  if(dow === 1) return {key:'selection', label:'Team list due Tuesday', page:'teamsheet', tone:'warn'};
  if(dow >= 3 && dow <= 6 && myGameToday && !bye){
    const label = myGameToday.slot ? `${myGameToday.slot.label} — Match day` : 'Match day';
    return {key:'match', label, page:'matchday', tone:'good'};
  }
  if(dow === 4 && m && !bye && m.a === G.coach.teamId && slotDow(m.slot) > dow) return {key:'travel', label:'Travel day', page:'calendar', tone:'neutral'};
  if(dow >= 3 && dow <= 6 && gamesToday.length){
    const dayName = Object.keys(SLOT_DAY_DOW).find(k=>SLOT_DAY_DOW[k]===dow) || 'Game';
    return {key:'gamenight', label:`${dayName} Football — ${gamesToday.length} game${gamesToday.length===1?'':'s'} today`, page:'calendar', tone:'neutral'};
  }
  if(dow === 5 && bye) return {key:'bye', label:'Bye weekend', page:'calendar', tone:'neutral'};
  if(dow === 6) return {key:'recovery', label:'Recovery and judiciary review', page:'injuryward', tone:'neutral'};
  return null;
}
export function dailyRecoveryAndFatigue(){
  const dow = calendarDayInWeek();
  const notes = [];
  for(const t of G.teams){
    const isMine = t.id === G.coach.teamId;
    const fitnessBonus = (isMine && G.coach.attrs) ? G.coach.attrs.fitness / 100 : 0;
    for(const id of t.players){
      const p = G.players[id];
      if(!p) continue;
      const load = Math.max(0, p.load || 0);
      const facilityRecovery = (teamFacilityLevel(t, 'gym') - 1) * 0.35;
      const dayBase = dow === 6 ? 5.2 : dow === 0 ? 3.6 : dow === 4 ? 2.2 : 3.0;
      const focusMod = t.focus === 'recovery' ? 1.55 : t.focus === 'fitness' ? 0.9 : 1;
      if(!p.injury){
        const rec = (dayBase + p.attrs.stamina / 55 + fitnessBonus + facilityRecovery) * focusMod;
        p.cond = clamp(p.cond + rec, 20, 100);
      }
      const decay = (dow === 6 ? 18 : 11) + p.attrs.stamina / 14 + (t.focus === 'recovery' ? 7 : 0);
      p.load = clamp(load - decay, 0, 100);
      p.fatigue = clamp((100 - p.cond) * 0.72 + p.load * 0.48, 0, 100);
      if(!p.injury && (p.load >= 76 || p.cond <= 55)){
        const risk = 0.004 + Math.max(0, p.load - 72) * 0.00055 + Math.max(0, 58 - p.cond) * 0.00065 + Math.max(0, 55 - p.attrs.injury) * 0.00025;
        if(rnd() < risk){
          const inj = pick(INJURIES);
          p.injury = {n:inj.n, weeks:ri(inj.w[0], inj.w[1])};
          p.playInjured = false;
          p.injuries = p.injuries || [];
          p.injuries.unshift({y:G.year, r:G.round+1, n:inj.n, weeks:p.injury.weeks});
          if(isMine) notes.push(p);
        }
      }
    }
  }
  if(notes.length){
    addNews(`${notes.slice(0,2).map(p=>p.name).join(', ')} ${notes.length===1?'has':'have'} broken down under accumulated fatigue. Review recovery and rotation before the next match.`,
      {title:'Fatigue Injury', type:'injury', tone:'bad', tag:'Medical', teamId:G.coach.teamId, playerId:notes[0].id});
  }
}
function addMatchResultNews(m){
  if(!m || !m.played || !m.det) return;
  const myT = G.coach.teamId;
  if(m.h !== myT && m.a !== myT) return;
  const th = G.teams[m.h], ta = G.teams[m.a];
  const mineIsH = m.h === myT;
  const oppT = mineIsH ? ta : th;
  const myScore = mineIsH ? m.hs : m.as;
  const oppScore = mineIsH ? m.as : m.hs;
  const won = myScore > oppScore, drew = myScore === oppScore;
  const tone = won ? 'good' : drew ? 'neutral' : 'bad';
  const result = won ? 'WIN' : drew ? 'DRAW' : 'LOSS';
  const homeAway = mineIsH ? 'Home' : 'Away';
  const myDet = mineIsH ? m.det.h : m.det.a;
  let topPerf = null, topR = 0;
  for(const [id, l] of Object.entries(myDet)){
    if(l && l.r && l.r > topR){ topR = l.r; topPerf = G.players[+id]; }
  }
  const ht = m.det.htScore || {h:0,a:0};
  const htMine = mineIsH ? ht.h : ht.a, htOpp = mineIsH ? ht.a : ht.h;
  const perfLine = topPerf ? ` Best: ${topPerf.name} (${topR.toFixed(1)}).` : '';
  // Board confidence news after big wins or shock losses
  const lad = typeof ladder === 'function' ? ladder() : [];
  const myPos = lad.findIndex(r=>r.id===myT) + 1;
  const myRow = lad.find(r=>r.id===myT);
  const ladLine = myPos && myRow ? ` Now ${ord(myPos)} (${myRow.w}W-${myRow.l}L).` : '';
  const body = `Round ${G.round} · ${homeAway} v ${oppT.nick} · HT: ${htMine}–${htOpp} · FT: ${myScore}–${oppScore}.${perfLine}${ladLine}`;
  addNews(body, {
    title: `Rd ${G.round}: ${result} ${myScore}–${oppScore} v ${oppT.nick}`,
    type: 'match', tone, tag: 'Results',
    teamId: myT, r: G.round, y: G.year
  });
  const oppPos = lad.findIndex(r=>r.id===oppT.id) + 1;
  const upset  = !won && !drew && myPos <= 4 && oppPos >= myPos + 4;
  const bigWin = won && oppPos <= 4 && myPos > oppPos + 3;
  if(bigWin){
    addNews(`The board is buoyed by the win over ${oppT.nick}. Board confidence has risen.`,
      {title:'Board Feedback', type:'board', tone:'good', tag:'Board', teamId:myT, r:G.round, y:G.year});
    G.coach.conf = clamp((G.coach.conf||50) + 5, 0, 100);
  } else if(upset){
    addNews(`The board expected more. Losing to ${oppT.nick} from your position is a concern.`,
      {title:'Board Feedback', type:'board', tone:'bad', tag:'Board', teamId:myT, r:G.round, y:G.year});
    G.coach.conf = clamp((G.coach.conf||50) - 6, 0, 100);
  }
}

// Map slot.day label to calendar day-of-week index (Mon=0 ... Sun=6)
export const SLOT_DAY_DOW = {Thursday:3, Friday:4, Saturday:5, Sunday:6};

export function slotDow(slot){
  return SLOT_DAY_DOW[slot && slot.day] == null ? 5 : SLOT_DAY_DOW[slot.day];
}
export function simGamesForDow(dow){
  if(!G.fixtures || !G.fixtures[G.round]) return [];
  const round = G.fixtures[G.round];
  const played = [];
  for(const m of sortMatchesBySlot(round)){
    if(m.played) continue;
    if(slotDow(m.slot) !== dow) continue;
    simMatch(m, false);
    played.push(m);
  }
  return played;
}

function generatePreMatchPreview(){
  const myM = calendarMyMatch(G.round);
  if(!myM || myM.played) return;
  const t = G.teams.find(tm => tm.id === G.coach.teamId);
  if(!t) return;
  const isHome = myM.h === t.id;
  const opp = G.teams[isHome ? myM.a : myM.h];
  if(!opp) return;
  // Guard: only generate once per round
  if(G.calendar && G.calendar.previewRound === G.round) return;
  if(G.calendar) G.calendar.previewRound = G.round;
  const lad = typeof ladder === 'function' ? ladder() : [];
  const oppRow = lad.find(r => r.id === opp.id);
  const myRow = lad.find(r => r.id === t.id);
  const oppPos = lad.findIndex(r => r.id === opp.id) + 1;
  const myPos = lad.findIndex(r => r.id === t.id) + 1;
  const formStr = oppRow && oppRow.form ? oppRow.form.slice(-5).join('') : '';
  const oppInjured = opp.players.map(id => G.players[id])
    .filter(p => p && p.injury && !p.playInjured).slice(0, 2);
  const report = buildOpponentAnalysis(t, opp, myM, {oppRow, myRow, oppPos, myPos, formStr, oppInjured});
  const slotLabel = myM.slot ? myM.slot.label : (isHome ? 'Home' : 'Away');
  const oppFormLine = formStr ? ` Recent form: ${formStr}.` : '';
  const injLine = oppInjured.length
    ? ` ${opp.nick} are missing ${oppInjured.map(p => p.name).join(' and ')}.`
    : '';
  const posLine = `${opp.nick} sit ${ord(oppPos)} (${oppRow ? oppRow.w+'-'+oppRow.l : '?'}).`;
  const upsetFlag = myPos > 8 && oppPos <= 4 ? ' A big scalp is on offer.' :
    myPos <= 4 && oppPos > 8 ? ' Favourites on paper — must-win to keep the pressure on.' : '';
  G.matchIntel = G.matchIntel || {};
  G.matchIntel[`${G.year}-R${G.round+1}`] = report;
  addNews(
    `${slotLabel} clash ahead. ${posLine}${oppFormLine}${injLine}${upsetFlag}\n\n${report.body}`,
    {title:`Preview: ${t.nick} v ${opp.nick}`, type:'analysis', tone:'neutral',
     tag:'Match Preview', teamId:t.id, r:G.round+1, y:G.year, intel:report}
  );
}

function staffForRole(role){
  const aliases = {
    attacking:['attacking','attack'],
    defensive:['defensive','defence'],
  }[role] || [role];
  return (G.staff || []).find(s => aliases.includes(s.role)) || null;
}
function bestScout(){
  const scouts = (G.scouting && G.scouting.scouts) || [];
  return scouts.slice().sort((a,b)=>(b.ability||0)-(a.ability||0))[0] || null;
}
function staffReportConfidence(){
  const attack = staffForRole('attacking');
  const defence = staffForRole('defensive');
  const scout = bestScout();
  const attackA = attack ? attack.ability : 38;
  const defenceA = defence ? defence.ability : 38;
  const scoutA = scout ? scout.ability : 34;
  const coachTactics = G.coach && G.coach.attrs ? G.coach.attrs.tactics || 42 : 42;
  const confidence = clamp(Math.round(attackA*.22 + defenceA*.28 + scoutA*.32 + coachTactics*.18), 25, 92);
  return {confidence, attack, defence, scout};
}
function activeLineupPlayers(t){
  if(!validateLineup(t)) autoPick(t);
  return t.lineup.slice(0,17).map((id,i)=>({p:G.players[id], slot:i})).filter(x=>x.p);
}
function attrScore(p, keys){
  if(!p || !p.attrs) return 50;
  return keys.reduce((s,k)=>s+(p.attrs[k]||50),0) / Math.max(1, keys.length);
}
function groupScore(entries, keys){
  const vals = entries.map(x=>attrScore(x.p, keys));
  return vals.length ? vals.reduce((s,v)=>s+v,0) / vals.length : 50;
}
function noisyRating(v, confidence){
  const spread = clamp((95 - confidence) / 5, 1, 12);
  return clamp(Math.round(v + gauss(0, spread)), 20, 99);
}
function reportConfidenceText(confidence){
  if(confidence >= 80) return 'The staff read is strong';
  if(confidence >= 62) return 'The staff read is reasonably clear';
  if(confidence >= 45) return 'The staff read is cautious';
  return 'The staff read is tentative';
}
function channelGradeText(v, high){
  if(high){
    if(v >= 78) return 'their clearest route to points';
    if(v >= 66) return 'a regular source of momentum';
    if(v >= 54) return 'part of their shape, but not dominant';
    return 'unlikely to be their first option';
  }
  if(v <= 42) return 'an area to attack early';
  if(v <= 54) return 'a channel worth testing';
  if(v <= 66) return 'fairly solid, but can be moved around';
  return 'one of their better-defended areas';
}
function playerReportTag(p){
  if(!p) return 'unknown';
  if(p.repTeam) return 'representative class';
  if(p.age <= 23 && p.pot >= 82) return 'high-upside';
  if(p.age >= 30) return 'senior';
  if((p.s && (p.s.t || p.s.ta || p.s.m > 900)) || p.form >= 65) return 'in-form';
  return 'first-grade';
}
function channelEntries(entries, channel){
  const slots = {
    middle:[7,8,9,12],
    left:[4,3,11],
    right:[1,2,10],
    spine:[0,5,6,8],
  }[channel] || [];
  return entries.filter(x=>slots.includes(x.slot));
}
function topBy(entries, fn){
  return entries.slice().sort((a,b)=>fn(b)-fn(a))[0] || null;
}
function describePlayer(p){
  return p ? `${p.name} (${p.pos}, ${playerReportTag(p)})` : 'unknown';
}
function buildOpponentAnalysis(myT, opp, match, ctx){
  const staff = staffReportConfidence();
  const confidence = staff.confidence;
  const entries = activeLineupPlayers(opp);
  const middleAtk = noisyRating(groupScore(channelEntries(entries, 'middle'), ['strength','ballRunning','workRate','stamina']), confidence);
  const leftAtk = noisyRating(groupScore(channelEntries(entries, 'left'), ['speed','acceleration','ballRunning','finishing']), confidence);
  const rightAtk = noisyRating(groupScore(channelEntries(entries, 'right'), ['speed','acceleration','ballRunning','finishing']), confidence);
  const spine = channelEntries(entries, 'spine');
  const kickThreat = noisyRating(groupScore(spine, ['kickPower','kickAccuracy','vision','decisionMaking']), confidence);
  const leftDef = noisyRating(groupScore(channelEntries(entries, 'left'), ['tackling','defRead','markerDef','workRate']), confidence);
  const rightDef = noisyRating(groupScore(channelEntries(entries, 'right'), ['tackling','defRead','markerDef','workRate']), confidence);
  const middleDef = noisyRating(groupScore(channelEntries(entries, 'middle'), ['tackling','markerDef','strength','workRate']), confidence);
  const attackChannels = [
    {key:'middle', label:'through the middle', rating:middleAtk},
    {key:'left', label:'down their left edge', rating:leftAtk},
    {key:'right', label:'down their right edge', rating:rightAtk},
    {key:'kicks', label:'through kicks/repeat sets', rating:kickThreat},
  ].sort((a,b)=>b.rating-a.rating);
  const weakChannels = [
    {key:'middle', label:'middle metres', rating:middleDef},
    {key:'left', label:'their left edge defence', rating:leftDef},
    {key:'right', label:'their right edge defence', rating:rightDef},
  ].sort((a,b)=>a.rating-b.rating);
  const strike = topBy(entries.filter(x=>['WG','CE','SR','FB'].includes(x.p.pos)),
    x=>attrScore(x.p, ['speed','acceleration','ballRunning','finishing']) + (x.p.s && x.p.s.t ? x.p.s.t*1.4 : 0));
  const playmaker = topBy(entries.filter(x=>['HB','FE','HK','FB'].includes(x.p.pos)),
    x=>attrScore(x.p, ['playmaking','vision','shortPass','kickAccuracy','decisionMaking']) + (x.p.s && x.p.s.ta ? x.p.s.ta*1.8 : 0));
  const yardage = topBy(entries.filter(x=>['PR','SR','LK','HK'].includes(x.p.pos)),
    x=>attrScore(x.p, ['strength','ballRunning','workRate','stamina']) + (x.p.s && x.p.s.m ? x.p.s.m/180 : 0));
  const weak = weakChannels[0];
  const primary = attackChannels[0];
  const lineupLine = entries.slice(0,13).map(x=>`${SLOTS[x.slot].n}. ${x.p.name}`).join(', ');
  const staffLine = `${reportConfidenceText(confidence)}. Notes compiled by ${staff.attack ? staff.attack.name : 'the attack staff'}, ${staff.defence ? staff.defence.name : 'the defensive staff'} and ${staff.scout ? staff.scout.name : 'the scouting desk'}.`;
  const attackLine = `How they score: ${primary.label} looks like ${channelGradeText(primary.rating, true)}. Secondary threats are ${attackChannels.slice(1,3).map(x=>`${x.label} (${channelGradeText(x.rating, true)})`).join(' and ')}.`;
  const threatLine = `Key threats: ${describePlayer(playmaker && playmaker.p)} organising shape; ${describePlayer(strike && strike.p)} as strike runner; ${describePlayer(yardage && yardage.p)} for yardage/ruck speed.`;
  const vulnLine = `Vulnerability: ${weak.label} looks like ${channelGradeText(weak.rating, false)}. Staff notes: middle is ${channelGradeText(middleDef, false)}, their left edge is ${channelGradeText(leftDef, false)}, and their right edge is ${channelGradeText(rightDef, false)}.`;
  const recommendation = weak.key === 'middle'
    ? 'Recommendation: start with a middle-dominance plan, use your best carriers, and chase fast play-the-balls before shifting wide.'
    : weak.key === 'left'
      ? 'Recommendation: lean attack at their left edge. Consider a defensive right centre/edge pairing if their strike threat lines up there.'
      : 'Recommendation: lean attack at their right edge. Use your left-side shape and back-row runners to test their reads.';
  const targetLine = playmaker && playmaker.p
    ? `Pressure call: make ${playmaker.p.name} defend and consider rush pressure, but mistimed line speed can create edge overlaps.`
    : 'Pressure call: no clear organiser identified; keep the defensive plan balanced.';
  const injuryLine = ctx.oppInjured && ctx.oppInjured.length
    ? `Selection note: ${opp.nick} are expected to be without ${ctx.oppInjured.map(p=>p.name).join(' and ')}.`
    : 'Selection note: no major outs identified by staff.';
  return {
    confidence,
    opponentId: opp.id,
    round: G.round + 1,
    attackChannels,
    weakChannels,
    keyThreats: [playmaker && playmaker.p && playmaker.p.id, strike && strike.p && strike.p.id, yardage && yardage.p && yardage.p.id].filter(Boolean),
    recommendation,
    body: `${staffLine}\nExpected XIII: ${lineupLine}\n${attackLine}\n${threatLine}\n${vulnLine}\n${injuryLine}\n${recommendation}\n${targetLine}`
  };
}

export function advanceCalendarDay(){
  if(!G || G.phase !== 'regular') return advanceRound();
  const c = ensureCalendar();
  const dow = calendarDayInWeek(c.day);
  const roundIdx = G.round;
  const playedToday = dow >= 3 && dow <= 6 ? simGamesForDow(dow) : [];
  dailyRecoveryAndFatigue();
  const completed = completeRoundIfReady(roundIdx);
  c.day++;
  // Fire mid-week preview when entering Wednesday (dow=2) of a week with an upcoming match
  const newDow = calendarDayInWeek(c.day);
  if(newDow === 2) generatePreMatchPreview();
  c.lastStop = calendarStopForDay(c.day);
  const res = completed || {type:'day'};
  res.day = c.day;
  res.stop = c.lastStop;
  if(playedToday.length){
    res.playedToday = playedToday;
    res.earlyMatches = playedToday.filter(m=>m.h!==G.coach.teamId && m.a!==G.coach.teamId);
    res.myM = playedToday.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId) || res.myM;
    if(res.myM) addMatchResultNews(res.myM);
  }
  return res;
}

// Watch-game split: simulate AI-only games for today, leave coached team's match pending.
// Does NOT advance c.day or finalize the round.
export function advanceCalendarDayForWatch(){
  if(!G || G.phase !== 'regular') return null;
  const c = ensureCalendar();
  const dow = calendarDayInWeek(c.day);
  if(dow < 3 || dow > 6) return {type:'day', earlyMatches:[]};
  if(!G.fixtures || !G.fixtures[G.round]) return {type:'day', earlyMatches:[]};
  const round = G.fixtures[G.round];
  const earlyMatches = [];
  for(const m of sortMatchesBySlot(round)){
    if(m.played || m._htPending) continue;
    if(slotDow(m.slot) !== dow) continue;
    if(m.h === G.coach.teamId || m.a === G.coach.teamId) continue; // skip coached match
    simMatch(m, false);
    earlyMatches.push(m);
  }
  return {type:'watchPrepared', earlyMatches};
}

// Called after the coached match completes in the watch-game flow.
// Runs daily recovery, finalizes the round if all games are done, advances the calendar.
export function finaliseCalendarDayAfterWatch(myM){
  if(!G || G.phase !== 'regular') return {type:'day'};
  const c = ensureCalendar();
  const roundIdx = G.round;
  dailyRecoveryAndFatigue();
  const completed = completeRoundIfReady(roundIdx);
  c.day++;
  c.lastStop = calendarStopForDay(c.day);
  const res = completed || {type:'day'};
  res.day = c.day;
  res.stop = c.lastStop;
  if(myM){ res.myM = myM; res.playedToday = [myM]; addMatchResultNews(myM); }
  return res;
}

if (typeof window !== 'undefined') Object.assign(window, {
  CAL_WEEKDAYS, CAL_MONTHS, ensureCalendar, calendarDayInWeek, calendarDateObj,
  calendarDateLabel, calendarRoundForDay, calendarMyMatch, calendarStopForDay,
  dailyRecoveryAndFatigue, SLOT_DAY_DOW, slotDow, simGamesForDow,
  advanceCalendarDay, advanceCalendarDayForWatch, finaliseCalendarDayAfterWatch,
});

'use strict';

const CAL_WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const CAL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ensureCalendar(){
  if(!G.calendar) G.calendar = {day:0, startISO:`${G.year}-03-02`, lastStop:null};
  if(G.calendar.day == null) G.calendar.day = Math.max(0, (G.round || 0) * 7);
  if(!G.calendar.startISO) G.calendar.startISO = `${G.year}-03-02`;
  return G.calendar;
}
function calendarDayInWeek(day){
  const c = ensureCalendar();
  return ((day == null ? c.day : day) % 7 + 7) % 7;
}
function calendarDateObj(day){
  const c = ensureCalendar();
  const d = new Date(`${c.startISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (day == null ? c.day : day));
  return d;
}
function calendarDateLabel(day){
  const d = calendarDateObj(day);
  return `${CAL_WEEKDAYS[calendarDayInWeek(day)]} ${d.getUTCDate()} ${CAL_MONTHS[d.getUTCMonth()]}`;
}
function calendarRoundForDay(day){
  const byDate = Math.floor((day == null ? ensureCalendar().day : day) / 7);
  const active = G && G.phase === 'regular' ? (G.round || 0) : byDate;
  return Math.max(0, Math.min((G.fixtures ? G.fixtures.length : 1) - 1, Math.max(active, byDate)));
}
function calendarMyMatch(roundIdx){
  if(!G.fixtures || !G.fixtures[roundIdx]) return null;
  return G.fixtures[roundIdx].find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId) || null;
}
function calendarStopForDay(day){
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
function dailyRecoveryAndFatigue(){
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
// Map slot.day label to calendar day-of-week index (Mon=0 ... Sun=6)
const SLOT_DAY_DOW = {Thursday:3, Friday:4, Saturday:5, Sunday:6};

function slotDow(slot){
  return SLOT_DAY_DOW[slot && slot.day] == null ? 5 : SLOT_DAY_DOW[slot.day];
}
function simGamesForDow(dow){
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

function advanceCalendarDay(){
  if(!G || G.phase !== 'regular') return advanceRound();
  const c = ensureCalendar();
  const dow = calendarDayInWeek(c.day);
  const roundIdx = G.round;
  const playedToday = dow >= 3 && dow <= 6 ? simGamesForDow(dow) : [];
  dailyRecoveryAndFatigue();
  const completed = completeRoundIfReady(roundIdx);
  c.day++;
  c.lastStop = calendarStopForDay(c.day);
  const res = completed || {type:'day'};
  res.day = c.day;
  res.stop = c.lastStop;
  if(playedToday.length){
    res.playedToday = playedToday;
    res.earlyMatches = playedToday.filter(m=>m.h!==G.coach.teamId && m.a!==G.coach.teamId);
    res.myM = playedToday.find(m=>m.h===G.coach.teamId || m.a===G.coach.teamId) || res.myM;
  }
  return res;
}

// Watch-game split: simulate AI-only games for today, leave coached team's match pending.
// Does NOT advance c.day or finalize the round.
function advanceCalendarDayForWatch(){
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
function finaliseCalendarDayAfterWatch(myM){
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
  if(myM){ res.myM = myM; res.playedToday = [myM]; }
  return res;
}

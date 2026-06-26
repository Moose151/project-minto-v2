'use strict';

/* ---------- selection ---------- */
function availablePlayers(t){
  return t.players
    .map(id=>G.players[id])
    .filter(p=>p && !isPlayerUnavailable(p) && selectionSquadEligible(p));
}
function isPlayerUnavailable(p){
  if(!p) return true;
  if(p.suspended && p.suspended.weeks > 0) return true;
  if(p.repDuty) return true;
  if(p.injury && !p.playInjured) return true;
  return false;
}
function selectionFormMod(p){
  return 0.94 + 0.12*((p && p.form != null ? p.form : 50)/100);
}
function autoPick(t){
  const avail = availablePlayers(t).sort((a,b)=>b.ovr*selectionFormMod(b)-a.ovr*selectionFormMod(a));
  const used = new Set();
  const lineup = Array(19).fill(null);
  // starting 13 by best positional fit
  for(let i=0;i<13;i++){
    const pos = SLOTS[i].pos;
    let best=null, bv=-1;
    for(const p of avail){ if(used.has(p.id)) continue;
      const v = p.ovr * familiarity(p,pos) * slotSpecialistFit(p, i) * (0.6 + 0.4*p.cond/100) * selectionFormMod(p);
      if(v>bv){ bv=v; best=p; } }
    if(best){ lineup[i]=best.id; used.add(best.id); }
  }
  // active bench 14-17 (indices 13-16): favour forwards + utility
  const benchOrder = avail.filter(p=>!used.has(p.id)).sort((a,b)=>{
    const fa = (POS_GROUP[a.pos]==='fwd'||POS_GROUP[a.pos]==='hk')?1.08:1;
    const fb = (POS_GROUP[b.pos]==='fwd'||POS_GROUP[b.pos]==='hk')?1.08:1;
    return b.ovr*fb*selectionFormMod(b) - a.ovr*fa*selectionFormMod(a); });
  for(let i=13;i<17;i++){ const p = benchOrder[i-13]; if(p){ lineup[i]=p.id; used.add(p.id); } }
  // named reserves 18-19 (indices 17-18): next best available
  const remaining = avail.filter(p=>!used.has(p.id)).sort((a,b)=>b.ovr*selectionFormMod(b)-a.ovr*selectionFormMod(a));
  for(let i=17;i<19;i++){ const p = remaining[i-17]; if(p){ lineup[i]=p.id; used.add(p.id); } }
  t.lineup = lineup;
  assignDefaultTeamRoles(t);
  return lineup;
}
function roleScore(p, role){
  if(!p) return 0;
  if(role==='captain') return p.attrs.leadership*.42 + p.attrs.composure*.20 + p.attrs.decisionMaking*.18 + p.attrs.professionalism*.12 + Math.min(p.career.games,180)*.08;
  if(role==='goalKicker') return p.attrs.placeKick*.60 + p.attrs.kickAccuracy*.18 + p.attrs.composure*.16 + p.attrs.fieldGoal*.06;
  if(role==='kicker') return p.attrs.kickPower*.36 + p.attrs.kickAccuracy*.30 + p.attrs.fieldGoal*.14 + p.attrs.decisionMaking*.10 + p.attrs.composure*.10;
  if(role==='playmaker') return p.attrs.playmaking*.32 + p.attrs.shortPass*.18 + p.attrs.longPass*.12 + p.attrs.vision*.18 + p.attrs.decisionMaking*.14 + p.attrs.composure*.06;
  return p.ovr;
}
function assignDefaultTeamRoles(t){
  t.roles = t.roles || {};
  t.positionRoles = t.positionRoles || {};
  t.zoneTactics = t.zoneTactics || {own20:'safe', own40:'balanced', mid:'balanced', opp40:'expansive', redZone:'balanced'};
  const active = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
  const starters = t.lineup.slice(0,13).map(id=>G.players[id]).filter(Boolean);
  const best = (role, pool, avoid) => {
    avoid = new Set(avoid || []);
    return (pool || active).filter(p=>!avoid.has(p.id)).sort((a,b)=>roleScore(b,role)-roleScore(a,role))[0] || null;
  };
  const captain = best('captain', starters) || best('captain', active);
  const goal = best('goalKicker', active);
  const pk = best('kicker', active);
  const sk = best('kicker', active, pk ? [pk.id] : []);
  const pp = best('playmaker', active);
  const sp = best('playmaker', active, pp ? [pp.id] : []);
  if(!t.roles.captain || !active.some(p=>p.id===t.roles.captain)) t.roles.captain = captain ? captain.id : null;
  if(!t.roles.goalKicker || !active.some(p=>p.id===t.roles.goalKicker)) t.roles.goalKicker = goal ? goal.id : null;
  if(!t.roles.primaryKicker || !active.some(p=>p.id===t.roles.primaryKicker)) t.roles.primaryKicker = pk ? pk.id : null;
  if(!t.roles.secondaryKicker || !active.some(p=>p.id===t.roles.secondaryKicker)) t.roles.secondaryKicker = sk ? sk.id : null;
  if(!t.roles.primaryPlaymaker || !active.some(p=>p.id===t.roles.primaryPlaymaker)) t.roles.primaryPlaymaker = pp ? pp.id : null;
  if(!t.roles.secondaryPlaymaker || !active.some(p=>p.id===t.roles.secondaryPlaymaker)) t.roles.secondaryPlaymaker = sp ? sp.id : null;
  for(let i=0;i<13;i++){
    const key = String(i);
    const pos = SLOTS[i].pos;
    if(!t.positionRoles[key]) t.positionRoles[key] = (POSITION_ROLES[pos] || ['balanced'])[0];
  }
}
function validateLineup(t){
  return lineupIssues(t).length === 0;
}
function lineupIssues(t){
  const issues = [];
  if(!t.lineup || t.lineup.length < 17) return ['Team sheet is missing active match-day slots.'];
  const seen = new Set();
  // first 17 slots (starters + active bench) must all be filled
  for(let i=0;i<17;i++){
    const id = t.lineup[i];
    const label = `#${SLOTS[i].n} ${SLOTS[i].pos==='BE'?'Bench':SLOTS[i].pos}`;
    if(id==null){ issues.push(`${label}: no player selected.`); continue; }
    if(seen.has(id)){ issues.push(`${label}: duplicate player selected.`); continue; }
    seen.add(id);
    const p = G.players[id];
    if(!p){ issues.push(`${label}: selected player no longer exists.`); continue; }
    if(!t.players.includes(id)) issues.push(`${label}: ${p.name} is not contracted to this club.`);
    if(!selectionSquadEligible(p)) issues.push(`${label}: ${p.name} is not eligible for match-day selection.`);
    if(p.injury && !p.playInjured) issues.push(`${label}: ${p.name} is injured (${p.injury.n}, ${p.injury.weeks}w).`);
    if(p.suspended && p.suspended.weeks > 0) issues.push(`${label}: ${p.name} is suspended (${p.suspended.weeks}w).`);
    if(p.repDuty) issues.push(`${label}: ${p.name} is away on representative duty.`);
  }
  // named reserves (indices 17-18) are optional
  for(let i=17;i<Math.min(t.lineup.length,19);i++){
    const id = t.lineup[i];
    if(id==null) continue;
    const label = `#${SLOTS[i].n} Reserve`;
    if(seen.has(id)){ issues.push(`${label}: duplicate player selected.`); continue; }
    seen.add(id);
    const p = G.players[id];
    if(!p){ issues.push(`${label}: selected player no longer exists.`); continue; }
    if(!t.players.includes(id)) issues.push(`${label}: ${p.name} is not contracted to this club.`);
    if(!selectionSquadEligible(p)) issues.push(`${label}: ${p.name} is not eligible for match-day selection.`);
    if(p.injury && !p.playInjured) issues.push(`${label}: ${p.name} is injured (${p.injury.n}, ${p.injury.weeks}w).`);
    if(p.suspended && p.suspended.weeks > 0) issues.push(`${label}: ${p.name} is suspended (${p.suspended.weeks}w).`);
    if(p.repDuty) issues.push(`${label}: ${p.name} is away on representative duty.`);
  }
  return issues;
}

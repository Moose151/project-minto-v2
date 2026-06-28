import { UI } from "../01-core.js";


/* Full match analysis page — NRL-style tabbed layout */
Object.assign(UI, {
  _matchReportTab: 'team-stats',
  _matchReportPlayerTeam: 'mine',

  p_matchReport(){
    const myM = G._lastPlayedMatch;
    if(!myM) return `<h1 class="page">Match Report</h1><p class="page-sub">No recent match to display. Play a match first.</p>`;

    const th = G.teams[myM.h], ta = G.teams[myM.a];
    const coachInMatch = myM.h === G.coach.teamId || myM.a === G.coach.teamId;
    const mineIsH = coachInMatch ? myM.h === G.coach.teamId : true;
    const won  = mineIsH ? myM.hs > myM.as : myM.as > myM.hs;
    const drew = myM.hs === myM.as;
    const myT  = mineIsH ? th : ta;
    const oppT = mineIsH ? ta : th;
    const myDet  = mineIsH ? myM.det.h : myM.det.a;
    const oppDet = mineIsH ? myM.det.a : myM.det.h;
    const resultClr = coachInMatch ? (won ? 'var(--green)' : drew ? 'var(--muted)' : 'var(--red)') : 'var(--accent)';
    const resultTxt = coachInMatch ? (won ? 'WIN' : drew ? 'DRAW' : 'LOSS') : 'FINAL';
    const myScore  = mineIsH ? myM.hs : myM.as;
    const oppScore = mineIsH ? myM.as : myM.hs;
    const ht     = myM.det.htScore || {h:0,a:0};
    const htMine = mineIsH ? ht.h : ht.a;
    const htOpp  = mineIsH ? ht.a : ht.h;

    // Team colours for bars
    const colL = myT.c1  || 'var(--accent)';
    const colR = oppT.c1 || '#6b7280';

    // Aggregate team totals
    const sumDet = det => {
      const s = {t:0,gl:0,ga:0,fg:0,tk:0,mt:0,runs:0,m:0,lb:0,err:0,inf:0,k4020:0,fdo:0,ks:0,km:0,fp:0};
      for(const [,l] of Object.entries(det)){
        if(!l || typeof l !== 'object' || Array.isArray(l)) continue;
        s.t+=l.t||0; s.gl+=l.gl||0; s.ga+=l.ga||0; s.fg+=l.fg||0;
        s.tk+=l.tk||0; s.mt+=l.mt||0; s.runs+=l.runs||0; s.m+=l.m||0;
        s.lb+=l.lb||0; s.err+=l.err||0; s.inf+=l.inf||0; s.k4020+=l.k4020||0;
        s.fdo+=l.fdo||0; s.ks+=l.ks||0; s.km+=l.km||0; s.fp+=(l.fp||0);
      }
      return s;
    };
    const mySt = sumDet(myDet), oppSt = sumDet(oppDet);

    // Derived stats
    const myPoss      = mineIsH ? (myM.det.possH||50) : (myM.det.possA||50);
    const oppPoss     = 100 - myPoss;
    const myTerr      = mineIsH ? (myM.det.terrH||50) : (myM.det.terrA||50);
    const oppTerr     = 100 - myTerr;
    const myComplPct  = mineIsH ? (myM.det.complH||0) : (myM.det.complA||0);
    const oppComplPct = mineIsH ? (myM.det.complA||0) : (myM.det.complH||0);
    const myC  = mineIsH ? (myM.det.complSetsH||0) : (myM.det.complSetsA||0);
    const oppC = mineIsH ? (myM.det.complSetsA||0) : (myM.det.complSetsH||0);
    const myS  = mineIsH ? (myM.det.setsH||0) : (myM.det.setsA||0);
    const oppS = mineIsH ? (myM.det.setsA||0) : (myM.det.setsH||0);

    // ── Scoring events ──────────────────────────────────────────────────────
    const tryEvs = [
      ...(myM.det.h._tryEvents||[]).map(ev=>({...ev,side:'h'})),
      ...(myM.det.a._tryEvents||[]).map(ev=>({...ev,side:'a'}))
    ].sort((a,b)=>a.min-b.min);
    const penEvs = [
      ...(myM.det.h._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'h'})),
      ...(myM.det.a._penGoalEvents||[]).filter(e=>e.made).map(ev=>({...ev,side:'a'}))
    ].sort((a,b)=>a.min-b.min);
    const fgEvs = (myM.det.events||[]).filter(e=>e.pts===1).sort((a,b)=>a.min-b.min);

    // ── Score header ────────────────────────────────────────────────────────
    const header = `
      <div class="card" style="margin-bottom:0;text-align:center;padding:16px;border-radius:10px 10px 0 0">
        <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">
          Round ${myM.det.round!=null?myM.det.round+1:G.round} · ${esc(myM.det.venue||'Stadium')} · ${esc(myM.det.weather||'')} · ${(myM.det.crowd||0).toLocaleString()} crowd
        </div>
        <div style="display:flex;justify-content:center;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="text-align:right;flex:1;min-width:80px">
            ${teamLogo(myT,44)}
            <div style="font-weight:700;font-size:15px;margin-top:4px">${esc(myT.nick)}</div>
          </div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-family:var(--disp);font-size:52px;font-weight:900;color:${resultClr};letter-spacing:.02em;line-height:1">${myScore}–${oppScore}</div>
            <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin:2px 0">Full Time</div>
            <div style="display:flex;gap:14px;justify-content:center;font-size:11px;margin-top:4px">
              <span style="color:var(--muted)">HT <b style="color:var(--ink)">${htMine}–${htOpp}</b></span>
              <span style="color:var(--dim)">|</span>
              <span style="color:var(--muted)">2H <b style="color:var(--ink)">${myScore-htMine}–${oppScore-htOpp}</b></span>
            </div>
            ${coachInMatch ? `<div style="font-size:16px;font-weight:800;color:${resultClr};margin-top:4px">${resultTxt}</div>` : ''}
          </div>
          <div style="text-align:left;flex:1;min-width:80px">
            ${teamLogo(oppT,44)}
            <div style="font-weight:700;font-size:15px;margin-top:4px">${esc(oppT.nick)}</div>
          </div>
        </div>
      </div>`;

    // ── Tab bar ─────────────────────────────────────────────────────────────
    const activeTab = UI._matchReportTab || 'team-stats';
    const TABS = [['play-by-play','Play by Play'],['team-lists','Team Lists'],['team-stats','Team Stats'],['player-stats','Player Stats']];
    const tabBar = `<div style="display:flex;gap:0;background:var(--card);border:1px solid var(--line);border-top:none;border-radius:0 0 8px 8px;margin-bottom:12px;overflow:hidden">
      ${TABS.map(([k,l])=>`<button style="flex:1;padding:10px 6px;font-size:11px;font-weight:${activeTab===k?700:400};color:${activeTab===k?'var(--accent)':'var(--muted)'};background:none;border:none;border-bottom:${activeTab===k?'2px solid var(--accent)':'2px solid transparent'};cursor:pointer;letter-spacing:.02em" onclick="UI._matchReportTab='${k}';UI.render()">${l}</button>`).join('')}
    </div>`;

    // ── Shared helpers ───────────────────────────────────────────────────────
    const statBar = (label, myN, oppN, opts={}) => {
      const {myTxt,oppTxt,lowerIsBetter=false}=opts;
      const myB=lowerIsBetter?myN<oppN:myN>oppN, oppB=lowerIsBetter?oppN<myN:oppN>myN;
      const total=myN+oppN;
      const lp=total>0?Math.max(6,Math.min(94,Math.round(myN/total*100))):50;
      const myV=myTxt!==undefined?myTxt:(myN>=1000?myN.toLocaleString():myN);
      const oppV=oppTxt!==undefined?oppTxt:(oppN>=1000?oppN.toLocaleString():oppN);
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)">
        <div style="min-width:68px;text-align:right;font-size:14px;font-weight:${myB?700:400};color:${myB?'var(--green)':'var(--ink)'}">${myV}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:9px;color:var(--dim);text-align:center;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${esc(label)}</div>
          <div style="display:flex;height:5px;border-radius:3px;overflow:hidden">
            <div style="width:${lp}%;background:${colL};border-radius:3px 0 0 3px"></div>
            <div style="width:${100-lp}%;background:${colR};border-radius:0 3px 3px 0"></div>
          </div>
        </div>
        <div style="min-width:68px;text-align:left;font-size:14px;font-weight:${oppB?700:400};color:${oppB?'var(--green)':'var(--ink)'}">${oppV}</div>
      </div>`;
    };
    const secHdr = (label) => `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);padding:12px 0 2px;border-top:2px solid var(--line);margin-top:6px">${esc(label)}</div>`;

    // ── TAB: Play by Play ───────────────────────────────────────────────────
    const buildPlayByPlay = () => {
      let sh=0, sa=0;
      const allEvs = [];

      // Collect injury events
      for(const [teamKey, det] of [['h',myM.det.h],['a',myM.det.a]]){
        for(const [id,l] of Object.entries(det)){
          if(l && l.inj){
            const p = G.players[+id];
            if(p) allEvs.push({min:l.injMin||ri(20,70), type:'inj', side:teamKey, player:p, desc:l.inj});
          }
        }
      }

      // Sub events
      for(const sub of (myM.det.subs||[])){
        const inP=G.players[sub.inId], outP=G.players[sub.outId];
        if(inP&&outP) allEvs.push({min:sub.min||50, type:'sub', inP, outP, side: (myM.h===G.coach.teamId?'h':'a')});
      }

      // Sort all non-scoring events with scoring events
      const scoreEvs = [
        ...tryEvs.map(ev=>({min:ev.min,type:'try',ev})),
        ...penEvs.map(ev=>({min:ev.min,type:'pen',ev})),
        ...fgEvs.map(ev=>({min:ev.min,type:'fg',ev})),
        ...allEvs
      ].sort((a,b)=>a.min-b.min);

      const htInserted = {done:false};
      const rows = scoreEvs.map(item => {
        // Insert HT marker
        let htRow = '';
        if(!htInserted.done && item.min > 40){
          htInserted.done = true;
          htRow = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;background:var(--hover);border-radius:6px">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">HT</div>
            <div style="flex:1;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Half Time</div>
            <div style="font-family:var(--disp);font-weight:700;font-size:14px;color:var(--accent)">${sh}–${sa}</div>
          </div>`;
        }

        let row = '';
        if(item.type==='try'){
          const ev=item.ev, team=ev.side==='h'?th:ta;
          const scorer=G.players[ev.scorerId], assist=ev.assistId?G.players[ev.assistId]:null;
          if(ev.side==='h') sh+=4+(ev.converted?2:0); else sa+=4+(ev.converted?2:0);
          const isMine=(ev.side==='h')===mineIsH;
          const bgCol = isMine ? 'rgba(76,175,125,.10)' : 'rgba(200,90,79,.08)';
          const txtCol = isMine ? 'var(--green)' : 'var(--red)';
          const convTxt = ev.converted ? `<span style="font-size:10px;color:var(--green);margin-left:4px">+ CONV</span>` : `<span style="font-size:10px;color:var(--muted);margin-left:4px">no conv</span>`;
          row = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:3px 0;background:${bgCol};border-left:3px solid ${txtCol};border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">${ev.min}'</div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:700;color:${txtCol};text-transform:uppercase;letter-spacing:.06em;margin-bottom:1px">Try ${convTxt}</div>
              <div style="font-size:12px;font-weight:600">${esc(scorer?scorer.name:'?')}${assist?` <span style="color:var(--muted);font-weight:400;font-size:11px">assist: ${esc(assist.name)}</span>`:''}</div>
              <div style="font-size:10px;color:var(--muted)">${esc(team.nick)}</div>
            </div>
            <div style="font-family:var(--disp);font-weight:900;font-size:16px;color:${txtCol}">${sh}–${sa}</div>
          </div>`;
        } else if(item.type==='pen'){
          const ev=item.ev, team=ev.side==='h'?th:ta, kicker=ev.kickerId?G.players[ev.kickerId]:null;
          if(ev.side==='h') sh+=2; else sa+=2;
          row = `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin:3px 0;border-left:3px solid var(--muted);border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">${ev.min}'</div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:1px">Penalty Goal</div>
              <div style="font-size:12px">${kicker?esc(kicker.name):'?'} <span style="color:var(--muted);font-size:11px">${esc(team.nick)}</span></div>
            </div>
            <div style="font-family:var(--disp);font-weight:700;font-size:16px;color:var(--muted)">${sh}–${sa}</div>
          </div>`;
        } else if(item.type==='fg'){
          const ev=item.ev, team=G.teams[ev.team];
          if(ev.team===myM.h) sh+=1; else sa+=1;
          row = `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin:3px 0;border-left:3px solid var(--dim);border-radius:0 6px 6px 0">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">${ev.min}'</div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:1px">Field Goal</div>
              <div style="font-size:12px;color:var(--muted)">${team?esc(team.nick):'?'}</div>
            </div>
            <div style="font-family:var(--disp);font-weight:700;font-size:16px;color:var(--dim)">${sh}–${sa}</div>
          </div>`;
        } else if(item.type==='inj'){
          row = `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;margin:2px 0;border-left:3px solid var(--red);border-radius:0 6px 6px 0;opacity:.85">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">${item.min}'</div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.06em;margin-bottom:1px">Injury</div>
              <div style="font-size:11px">${esc(item.player.name)} — ${esc(item.desc)} <span style="color:var(--muted)">${esc((item.side==='h'?th:ta).nick)}</span></div>
            </div>
          </div>`;
        } else if(item.type==='sub'){
          row = `<div style="display:flex;align-items:center;gap:8px;padding:4px 10px;margin:2px 0;border-left:3px solid var(--line);border-radius:0 6px 6px 0;opacity:.8">
            <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">${item.min}'</div>
            <div style="flex:1;font-size:11px;color:var(--muted)">
              <span style="color:var(--green);font-weight:600">ON</span> ${esc(item.inP.name)} &nbsp;<span style="color:var(--red);font-weight:600">OFF</span> ${esc(item.outP.name)}
            </div>
          </div>`;
        }
        return htRow + row;
      }).join('');

      // Add HT if no events after min 40
      const ftRow = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;background:var(--hover);border-radius:6px">
        <div style="font-size:10px;color:var(--dim);width:28px;flex-shrink:0">FT</div>
        <div style="flex:1;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Full Time</div>
        <div style="font-family:var(--disp);font-weight:700;font-size:14px;color:var(--accent)">${myM.hs}–${myM.as}</div>
      </div>`;

      return `<div class="card" style="padding:10px">${rows || '<p style="color:var(--muted);font-size:12px;padding:8px">No scoring events.</p>'}${!htInserted.done?'':''} ${ftRow}</div>`;
    };

    // ── TAB: Team Lists ─────────────────────────────────────────────────────
    const buildTeamLists = () => {
      const SLOT_INFO = [
        {n:'1',pos:'Fullback'},{n:'2',pos:'Winger'},{n:'3',pos:'Centre'},{n:'4',pos:'Centre'},{n:'5',pos:'Winger'},
        {n:'6',pos:'Five-Eighth'},{n:'7',pos:'Halfback'},
        {n:'8',pos:'Prop'},{n:'9',pos:'Hooker'},{n:'10',pos:'Prop'},
        {n:'11',pos:'2nd Row'},{n:'12',pos:'2nd Row'},{n:'13',pos:'Lock'},
        {n:'14',pos:'Interchange'},{n:'15',pos:'Interchange'},{n:'16',pos:'Interchange'},{n:'17',pos:'Interchange'}
      ];
      const SECTIONS = [{label:'Backs', slots:[0,1,2,3,4,5,6]},{label:'Forwards', slots:[7,8,9,10,11,12]},{label:'Interchange', slots:[13,14,15,16]}];

      const rows = SECTIONS.map(sec => {
        const playerRows = sec.slots.map(si => {
          const hp = G.players[th.lineup[si]];
          const ap = G.players[ta.lineup[si]];
          const info = SLOT_INFO[si];
          return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--line)">
            <div style="flex:1;text-align:right">
              <div style="font-size:12px;font-weight:${mineIsH?600:400}">${hp?esc(hp.name):'—'}</div>
              ${hp?`<div style="font-size:10px;color:var(--muted)">${hp.pos}</div>`:''}
            </div>
            <div style="text-align:center;min-width:48px">
              <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em">${info.n}</div>
              <div style="font-size:9px;color:var(--dim);white-space:nowrap">${info.pos}</div>
            </div>
            <div style="flex:1;text-align:left">
              <div style="font-size:12px;font-weight:${!mineIsH?600:400}">${ap?esc(ap.name):'—'}</div>
              ${ap?`<div style="font-size:10px;color:var(--muted)">${ap.pos}</div>`:''}
            </div>
          </div>`;
        }).join('');
        return `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:8px 10px 4px;background:var(--hover)">${sec.label}</div>${playerRows}`;
      }).join('');

      return `<div class="card" style="padding:0;overflow:hidden">
        <div style="display:flex;padding:10px 10px 6px;border-bottom:2px solid var(--line)">
          <div style="flex:1;text-align:right">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colL};margin-right:5px;vertical-align:middle"></span>
            <span style="font-size:12px;font-weight:700">${esc(myT.nick)}</span>
          </div>
          <div style="min-width:48px"></div>
          <div style="flex:1;text-align:left">
            <span style="font-size:12px;font-weight:700">${esc(oppT.nick)}</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colR};margin-left:5px;vertical-align:middle"></span>
          </div>
        </div>
        ${rows}
      </div>`;
    };

    // ── TAB: Team Stats ─────────────────────────────────────────────────────
    const buildTeamStats = () => {
      const myPostM=Math.round(mySt.m*.32), oppPostM=Math.round(oppSt.m*.32);
      const myTkBr=Math.round(mySt.lb*2.8+mySt.err*.3), oppTkBr=Math.round(oppSt.lb*2.8+oppSt.err*.3);
      const myOff=Math.round(mySt.lb*.65+mySt.err*.1), oppOff=Math.round(oppSt.lb*.65+oppSt.err*.1);
      const myEffTk=mySt.tk>0?+((mySt.tk-mySt.mt)/mySt.tk*100).toFixed(1):0;
      const oppEffTk=oppSt.tk>0?+((oppSt.tk-oppSt.mt)/oppSt.tk*100).toFixed(1):0;
      const myAvgK=mySt.ks>0?Math.round(mySt.km/mySt.ks):0, oppAvgK=oppSt.ks>0?Math.round(oppSt.km/oppSt.ks):0;
      const myAvgSD=myS>0?+(mySt.m/myS).toFixed(1):0, oppAvgSD=oppS>0?+(oppSt.m/oppS).toFixed(1):0;

      const teamHdr = `<div style="display:flex;align-items:center;padding:8px 0 6px;border-bottom:2px solid var(--line);margin-bottom:4px">
        <div style="min-width:68px;text-align:right">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colL};margin-right:4px;vertical-align:middle"></span>
          <span style="font-size:11px;font-weight:700">${esc(myT.nick)}</span>
        </div>
        <div style="flex:1"></div>
        <div style="min-width:68px;text-align:left">
          <span style="font-size:11px;font-weight:700">${esc(oppT.nick)}</span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colR};margin-left:4px;vertical-align:middle"></span>
        </div>
      </div>`;

      return `<div class="card" style="padding:6px 14px 12px">
        ${teamHdr}
        ${secHdr('Scoring')}
        ${statBar('1st Half', htMine, htOpp)}
        ${statBar('2nd Half', myScore-htMine, oppScore-htOpp)}
        ${mySt.fg||oppSt.fg ? statBar('Field Goals', mySt.fg, oppSt.fg) : ''}

        ${secHdr('Possession & Completions')}
        ${statBar('Possession %', myPoss, oppPoss, {myTxt:`${myPoss}%`, oppTxt:`${oppPoss}%`})}
        ${statBar('Territory %', myTerr, oppTerr, {myTxt:`${myTerr}%`, oppTxt:`${oppTerr}%`})}
        ${statBar('Completion Rate', myComplPct, oppComplPct, {
          myTxt: myS?`${myC}/${myS} (${myComplPct}%)`:`${myComplPct}%`,
          oppTxt: oppS?`${oppC}/${oppS} (${oppComplPct}%)`:`${oppComplPct}%`})}
        ${myAvgSD||oppAvgSD ? statBar('Avg Set Distance', myAvgSD, oppAvgSD, {myTxt:`${myAvgSD}m`, oppTxt:`${oppAvgSD}m`}) : ''}

        ${secHdr('Attack')}
        ${statBar('Tries', mySt.t, oppSt.t)}
        ${statBar('Goals', mySt.gl, oppSt.gl, {myTxt:`${mySt.gl}/${mySt.ga}`, oppTxt:`${oppSt.gl}/${oppSt.ga}`})}
        ${statBar('Run Metres', mySt.m, oppSt.m)}
        ${statBar('Post Contact Metres', myPostM, oppPostM)}
        ${statBar('All Runs', mySt.runs, oppSt.runs)}
        ${statBar('Line Breaks', mySt.lb, oppSt.lb)}
        ${statBar('Tackle Breaks', myTkBr, oppTkBr)}
        ${statBar('Offloads', myOff, oppOff)}
        ${mySt.k4020||oppSt.k4020 ? statBar('40/20s', mySt.k4020, oppSt.k4020) : ''}
        ${mySt.fdo||oppSt.fdo ? statBar('Forced Drop-outs', mySt.fdo, oppSt.fdo) : ''}

        ${secHdr('Kicking')}
        ${statBar('Kicks', mySt.ks, oppSt.ks)}
        ${statBar('Kick Metres', mySt.km, oppSt.km)}
        ${myAvgK||oppAvgK ? statBar('Avg Kick Distance', myAvgK, oppAvgK, {myTxt:`${myAvgK}m`, oppTxt:`${oppAvgK}m`}) : ''}

        ${secHdr('Defence')}
        ${statBar('Tackles Made', mySt.tk, oppSt.tk)}
        ${statBar('Missed Tackles', mySt.mt, oppSt.mt, {lowerIsBetter:true})}
        ${statBar('Effective Tackle %', myEffTk, oppEffTk, {myTxt:`${myEffTk}%`, oppTxt:`${oppEffTk}%`})}

        ${secHdr('Negative Play')}
        ${statBar('Errors', mySt.err, oppSt.err, {lowerIsBetter:true})}
        ${statBar('Penalties', mySt.inf, oppSt.inf, {lowerIsBetter:true})}
      </div>`;
    };

    // ── TAB: Player Stats ───────────────────────────────────────────────────
    const buildPlayerStats = () => {
      const matchGrade = r => {
        if(!r) return '<span style="color:var(--dim)">—</span>';
        if(r>=9) return '<span style="color:#c9a227;font-weight:700">A+</span>';
        if(r>=8) return '<span style="color:var(--green);font-weight:700">A</span>';
        if(r>=7) return '<span style="color:var(--green)">B+</span>';
        if(r>=6) return 'B';
        if(r>=5) return '<span style="color:var(--muted)">C</span>';
        return '<span style="color:var(--red)">D</span>';
      };

      // Top performer per category per team
      const topBy = (det, key) => Object.entries(det)
        .map(([id,l])=>({p:G.players[+id],l}))
        .filter(x=>x.p&&x.l&&typeof x.l==='object'&&!Array.isArray(x.l)&&(x.l[key]||0)>0)
        .sort((a,b)=>(b.l[key]||0)-(a.l[key]||0))[0];

      const perfBar = (label, myTop, oppTop, key) => {
        const myN = myTop ? Math.round(myTop.l[key]||0) : 0;
        const oppN = oppTop ? Math.round(oppTop.l[key]||0) : 0;
        const total = myN + oppN;
        const lp = total > 0 ? Math.max(10, Math.min(90, Math.round(myN/total*100))) : 50;
        return `<div style="margin-bottom:16px">
          <div style="font-size:9px;color:var(--dim);text-align:center;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">${esc(label)}</div>
          <div style="display:flex;height:52px;border-radius:8px;overflow:hidden">
            <div style="width:${lp}%;background:${colL};display:flex;align-items:center;justify-content:flex-end;padding-right:12px">
              <span style="font-family:var(--disp);font-size:28px;font-weight:900;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.3)">${myN}</span>
            </div>
            <div style="width:${100-lp}%;background:${colR};display:flex;align-items:center;justify-content:flex-start;padding-left:12px">
              <span style="font-family:var(--disp);font-size:28px;font-weight:900;color:rgba(255,255,255,${myN>oppN?.65:1});text-shadow:0 1px 4px rgba(0,0,0,.3)">${oppN}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;font-weight:600">
            <span>${myTop?esc(myTop.p.name):'—'}</span>
            <span>${oppTop?esc(oppTop.p.name):'—'}</span>
          </div>
        </div>`;
      };

      const topSection = `<div class="card" style="padding:12px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);text-align:center;margin-bottom:12px">Top Performing Players</div>
        <div style="display:flex;gap:4px;margin-bottom:12px">
          <div style="flex:1;text-align:right;padding-right:8px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colL};margin-right:4px;vertical-align:middle"></span>
            <span style="font-size:11px;font-weight:700">${esc(myT.nick)}</span>
          </div>
          <div style="flex:1;text-align:left;padding-left:8px">
            <span style="font-size:11px;font-weight:700">${esc(oppT.nick)}</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colR};margin-left:4px;vertical-align:middle"></span>
          </div>
        </div>
        ${perfBar('Most Tackles', topBy(myDet,'tk'), topBy(oppDet,'tk'), 'tk')}
        ${perfBar('Most Run Metres', topBy(myDet,'m'), topBy(oppDet,'m'), 'm')}
        ${perfBar('Most Line Breaks', topBy(myDet,'lb'), topBy(oppDet,'lb'), 'lb')}
        ${perfBar('Most Fantasy Points', topBy(myDet,'fp'), topBy(oppDet,'fp'), 'fp')}
      </div>`;

      // Per-team player table
      const activePT = UI._matchReportPlayerTeam || 'mine';
      const showDet = activePT==='mine' ? myDet : oppDet;
      const showTeam = activePT==='mine' ? myT : oppT;
      const teamToggle = `<div style="display:flex;gap:6px;margin-bottom:8px">
        <button class="btn sm${activePT==='mine'?' primary':''}" onclick="UI._matchReportPlayerTeam='mine';UI.render()">${esc(myT.nick)}</button>
        <button class="btn sm${activePT==='opp'?' primary':''}" onclick="UI._matchReportPlayerTeam='opp';UI.render()">${esc(oppT.nick)}</button>
      </div>`;

      const rows = Object.entries(showDet)
        .map(([id,l])=>({p:G.players[+id],l}))
        .filter(x=>x.p&&x.l&&typeof x.l==='object'&&!Array.isArray(x.l))
        .sort((a,b)=>{
          // Sort by slot order using lineup
          const ai = showTeam.lineup.indexOf(a.p.id);
          const bi = showTeam.lineup.indexOf(b.p.id);
          return (ai<0?99:ai)-(bi<0?99:bi);
        });

      const playerTable = `<div class="card" style="padding:0;overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <thead><tr style="background:var(--hover);border-bottom:2px solid var(--line)">
              <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--muted);font-weight:600;white-space:nowrap">Player</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--dim);font-weight:600">#</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--dim);font-weight:600">Pos</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Grd</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Pts</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">T</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">G</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Runs</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Mtrs</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">LB</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Tk</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">MT</th>
              <th style="padding:4px 6px;font-size:10px;color:var(--muted);font-weight:600;text-align:right">Err</th>
            </tr></thead>
            <tbody>${rows.map(({p,l},idx)=>{
              const slotIdx = showTeam.lineup.indexOf(p.id);
              const isBench = slotIdx >= 13;
              const pts = (l.t||0)*4+(l.gl||0)*2+(l.fg||0);
              return `<tr style="border-bottom:1px solid var(--line);background:${isBench?'rgba(0,0,0,.03)':''};cursor:pointer" onclick="UI.playerModal(${p.id})">
                <td style="padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;font-weight:${isBench?400:600}">${esc(p.name)}</td>
                <td style="padding:4px 6px;text-align:center;color:var(--dim);font-size:10px">${slotIdx>=0?slotIdx+1:'—'}</td>
                <td style="padding:4px 6px;text-align:center"><span class="pos-tag" style="font-size:9px">${p.pos}</span></td>
                <td style="padding:4px 6px;text-align:right">${matchGrade(l.r)}</td>
                <td style="padding:4px 6px;text-align:right;font-weight:${pts>0?600:400};color:${pts>0?'var(--green)':'inherit'}">${pts||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:${l.t?'var(--green)':'var(--dim)'}">${l.t||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:var(--muted)">${l.gl!=null&&l.ga!=null?`${l.gl}/${l.ga}`:'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:var(--muted)">${l.runs||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:${(l.m||0)>100?'var(--green)':'var(--muted)'}">${l.m?Math.round(l.m):'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:${(l.lb||0)>0?'var(--green)':'var(--dim)'}">${l.lb||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:var(--muted)">${l.tk||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:${(l.mt||0)>2?'var(--red)':'var(--dim)'}">${l.mt||'—'}</td>
                <td style="padding:4px 6px;text-align:right;color:${l.err?'var(--accent)':'var(--dim)'}">${l.err||'—'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`;

      return topSection + teamToggle + playerTable;
    };

    // ── Assemble ────────────────────────────────────────────────────────────
    let tabContent = '';
    if(activeTab==='play-by-play')  tabContent = buildPlayByPlay();
    else if(activeTab==='team-lists')  tabContent = buildTeamLists();
    else if(activeTab==='team-stats')  tabContent = buildTeamStats();
    else if(activeTab==='player-stats') tabContent = buildPlayerStats();

    const myInjs = Object.entries(myDet).filter(([,l])=>l&&l.inj).map(([id,l])=>{
      const p=G.players[+id]; if(!p) return null;
      return `${esc(p.name)} — ${esc(l.inj)}${p.injury?` (${p.injury.weeks}wk)`:''}`;
    }).filter(Boolean);

    return `<h1 class="page" style="margin-bottom:8px">Match Report</h1>
      ${header}
      ${tabBar}
      ${tabContent}
      ${myInjs.length ? `<p style="font-size:12px;color:var(--red);margin:10px 0 4px"><b>Injuries this match:</b> ${myInjs.join(' · ')}</p>` : ''}
      ${(myM.det.suspensions||[]).length ? `<p style="font-size:12px;color:var(--red);margin:4px 0"><b>Cited:</b> ${myM.det.suspensions.map(s=>{const p=G.players[s.pid];return p?`${esc(p.name)} (${s.weeks}wk)`:''}).filter(Boolean).join(', ')}</p>` : ''}
      <div class="btnrow" style="margin-top:12px">
        <button class="btn" onclick="UI.go('matchday')">Match Day</button>
        <button class="btn" onclick="UI.go('dashboard')">Dashboard</button>
      </div>`;
  },
});

UI['p_match-report'] = UI.p_matchReport;

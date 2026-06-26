'use strict';

/* ---------- data pools ---------- */
const FIRST = ['Jack','Tom','Ryan','Liam','Noah','Cooper','Mason','Tyler','Blake','Jordan','Kyle','Brodie','Lachlan','Hamish','Angus','Callum','Declan','Patrick','Sean','Connor','Dylan','Joel','Nathan','Aaron','Corey','Shane','Wade','Heath','Brett','Scott','Troy','Dean','Adam','Josh','Ben','Sam','Max','Eli','Kane','Jed','Toby','Archie','Harvey','Bailey','Reece','Darcy','Flynn','Cameron','Jesse','Luke','Zac','Beau','Sione','Tevita','Manu','Viliami','Taniela','Mosese','Semisi','Hosea','Junior','Apisai','Eroni','Suliasi','Maika','Ratu','Penioni','Nikau','Tane','Wiremu','Rangi','Manaia','Ariki','Mikaere','Hemi'];
const LAST = ['Smith','Walker','Thompson','Mitchell','Harris','Campbell','Stewart','Murray','Reid','Boyd','Carter','Doyle','Gallagher','Lynch','Ryan','Sullivan','Brennan','McAllister','Harrington','Coleman','Drysdale','Fairweather','Holloway','Irvine','Lawson','Merrick','Norwood','Prescott','Radford','Sinclair','Tanner','Underwood','Whitfield','Ashworth','Blackwood','Cresswell','Eastman','Farrow','Goodall','Hartigan','Tupou','Latu','Fonua','Taufa','Leota','Matagi','Su\'a','Faleolo','Havili','Paasi','Vaka','Moala','Tonga','Fekitoa','Ngata','Rapana','Kahu','Waerea','Herewini','Paki','Tamati','Hura','Koro','Sefo','Aiono','Tagaloa','Penisini'];
/* ---------- nationality-appropriate name pools ---------- */
const NAME_POOLS = {
  'Australia': {
    first:['Jack','Tom','Ryan','Liam','Noah','Cooper','Mason','Tyler','Blake','Jordan','Kyle','Brodie','Lachlan','Hamish','Angus','Callum','Declan','Patrick','Sean','Connor','Dylan','Joel','Nathan','Aaron','Corey','Shane','Wade','Heath','Brett','Scott','Troy','Dean','Adam','Josh','Ben','Sam','Max','Eli','Kane','Jed','Toby','Archie','Harvey','Bailey','Reece','Darcy','Flynn','Cameron','Jesse','Luke','Zac','Beau'],
    last:['Smith','Walker','Thompson','Mitchell','Harris','Campbell','Stewart','Murray','Reid','Boyd','Carter','Doyle','Gallagher','Lynch','Ryan','Sullivan','Brennan','McAllister','Harrington','Coleman','Drysdale','Fairweather','Holloway','Irvine','Lawson','Merrick','Norwood','Prescott','Radford','Sinclair','Tanner','Underwood','Whitfield','Ashworth','Blackwood','Cresswell','Eastman','Farrow','Goodall','Hartigan']
  },
  'New Zealand': {
    first:['Nikau','Tane','Wiremu','Rangi','Manaia','Ariki','Mikaere','Hemi','Kai','Rei','Matiu','Piripi','James','Jordan','Nathan','Adam','Craig','Kevin','Joseph','Jackson','Corey','Benji','Charnze','Briton','Hamiso','Roger','Shaun','Te Maire'],
    last:['Ngata','Rapana','Kahu','Waerea','Herewini','Paki','Tamati','Hura','Koro','Watene','Hughes','Johnson','Harris','Frizell','Bromwich','Pearce','Havili','Naden','Nicoll','Leniu','Williams','Johnson']
  },
  'Tonga': {
    first:['Sione','Tevita','Manu','Viliami','Taniela','Mosese','Semisi','Hosea','Junior','Apisai','Fifita','Langi','Tolutau','Siua','Moeaki','Siosaia','Siaosi','Tali','Mikaele','Atieli','Sitili','Felise','Meli','Noa','Penisimani','Sifa','Simote'],
    last:['Taufa','Latu','Fonua','Leota','Matagi','Faleolo','Havili','Paasi','Vaka','Moala','Tonga','Fekitoa','Taumalolo','Tupou','Fifita','Lopini','Katoa','Lolohea','Talataina','Seumanufagai','Moa']
  },
  'Samoa': {
    first:['Joseph','Bryan','Jarome','Josh','Robert','Michael','Jayson','Edrick','Anthony','Luciano','Alexander','Martin','Joey','Junior','Tim','Logan','Lagi','Sione','Darius','Frank','Zion','Herman','Dion','Nene'],
    last:['Paulo','Luai','Kaufusi','Niukore','Sua','Manu','Faamelino','Lenilave','Alaalatoa','Tiumalo','Mulitalo','Saifiti','Sefo','Aiono','Tagaloa','Penisini','Tuilagi','Nonu','Fai\'e']
  },
  'Papua New Guinea': {
    first:['Stanley','Frank','Watson','Noel','David','Moses','Ase','James','Kato','Reagan','Timothy','Gaius','Enock','Stanton','Edward','Richard','Paul','Charles','Daniel','Ephraim','Junior','Stargroth'],
    last:['Iseke','Kaupa','Kamiak','Okul','Nandex','Maki','Pangua','Alberts','Tanda','Bai','Saea','Ipota','Yalamu','Morea','Peter','Tom','Elias','Rikis','Gunn','Angra']
  },
  'England': {
    first:['Sam','Luke','Jack','Alex','Ben','George','James','Joseph','Ryan','Liam','Thomas','Chris','Harry','Will','Lewis','Danny','Mark','Jake','Mikey','Andy','Matty','Mason','Zak','Morgan','Gareth','Mike','Tommy','Elliot','Jamie'],
    last:['Williams','Jones','Davies','Evans','Brown','Wilson','Taylor','Moore','Thomas','Martin','Jackson','Lewis','Thompson','White','Roberts','Robinson','Clark','Hall','Lee','Hughes','Scott','Hill','Baker','Ward','Wood']
  },
  'Fiji': {
    first:['Viliame','Waisale','Apisai','Metuisela','Lepani','Seta','Maika','Ratu','Penioni','Eroni','Suliasi','Mosese','Isoa','Tomasi','Josua','Seru','Amenoni','Aminiasi','Adrea','Filimone','Jone'],
    last:['Tuivaga','Naqali','Radradra','Tabuai','Duvere','Sabu','Rasiga','Vakauta','Tikoisolomone','Navunivono','Dakuwaqa','Nakosi','Waqa','Talebula','Volavola','Rokosawa','Vunivalu']
  },
  'Cook Islands': {
    first:['Jayden','Tim','Timi','Isaac','Jesse','Ben','Willie','Junior','Kevin','Isaiah','Jordan','Patrick','Rima','Tere','Manu','Kavana','Teariki','Arana','Tangata','Ngatupu'],
    last:['Toema\'i','Makoare','Poihipi','Gubb','Boas','Nicholas','Manuel','Brown','James','Tangata','Tatuava','Piri','Kama','Saul','Rairi']
  },
  'Lebanon': {
    first:['Kayne','Josh','Liam','Mitchell','Matt','Adam','Brad','Ryan','Michael','Daniel','Christian','Mark','Joel','Nathan','Anthony','George','Chris','Joseph','Peter','Robert','Sam','Alex','Ahmad','Ibrahim'],
    last:['Maroun','Abdallah','El-Masri','Trad','Lichaa','Kassis','Nohra','Saleh','Saab','Hadchiti','Tayeh','Farhat','Hanna','Rahme','Nasser','Chalhoub','Waked','Mansour','Azzi']
  }
};
const IDENTITIES = [
  {city:'Sydney',       nick:'Stingrays',   abbr:'SYD', c1:'#0E7C7B', c2:'#0B2545', stadium:'Harbour Oval'},
  {city:'Brisbane',     nick:'Colliers',     abbr:'BRI', c1:'#F2B632', c2:'#2B2B2B', stadium:'Lang Park North'},
  {city:'Melbourne',    nick:'Marlins',      abbr:'MEL', c1:'#1B6CA8', c2:'#C0C7CE', stadium:'Marvel Rectangular'},
  {city:'Auckland',     nick:'Bulls',        abbr:'AKL', c1:'#6E1423', c2:'#1A1A1A', stadium:'Eden Arena'},
  {city:'Canberra',     nick:'Jackals',      abbr:'CBR', c1:'#5C6B73', c2:'#9DB4C0', stadium:'Civic Stadium'},
  {city:'Newcastle',    nick:'Scorpions',    abbr:'NEW', c1:'#B3541E', c2:'#2D241E', stadium:'Hunter Arena'},
  {city:'Townsville',   nick:'Breakers',     abbr:'TSV', c1:'#1F7A5C', c2:'#0B3D2E', stadium:'North Queensland Stadium'},
  {city:'Wollongong',   nick:'Stallions',    abbr:'WOL', c1:'#5B3A8E', c2:'#D9C66B', stadium:'WIN Dome'},
  {city:'Gold Coast',   nick:'Monarchs',     abbr:'GCT', c1:'#3E2A78', c2:'#C9A23A', stadium:'Coast Super Dome'},
  {city:'Parramatta',   nick:'Dingoes',      abbr:'PAR', c1:'#A4471F', c2:'#E2D3B3', stadium:'CommBank West Arena'},
  {city:'Penrith',      nick:'Hammerheads',  abbr:'PEN', c1:'#11507C', c2:'#76B0D6', stadium:'Mountains Stadium'},
  {city:'Christchurch', nick:'Comets',       abbr:'CHR', c1:'#FCA311', c2:'#14213D', stadium:'Jade Stadium'},
  {city:'Perth',        nick:'Barracudas',   abbr:'PER', c1:'#7A1E3C', c2:'#D8D8D8', stadium:'HBF Park West'},
  {city:'Adelaide',     nick:'Kestrels',     abbr:'ADL', c1:'#F26419', c2:'#2F4858', stadium:'Coopers Stadium'},
  {city:'Cairns',       nick:'Mavericks',    abbr:'CNS', c1:'#9BC53D', c2:'#1D3461', stadium:'Cazalys Arena'},
  {city:'Darwin',       nick:'Privateers',   abbr:'DRW', c1:'#B87333', c2:'#232B2B', stadium:'TIO Traeger Park'},
];
// NRL Standard league preset — 17 real NRL clubs
const NRL_IDENTITIES = [
  {city:'Brisbane',     nick:'Broncos',    abbr:'BRI', c1:'#5E1224', c2:'#F5A827', stadium:'Suncorp Stadium'},
  {city:'Sydney',       nick:'Roosters',   abbr:'SYD', c1:'#003087', c2:'#CC0000', stadium:'Allianz Stadium'},
  {city:'South Sydney', nick:'Rabbitohs',  abbr:'SOU', c1:'#007A4E', c2:'#CC0000', stadium:'Accor Stadium'},
  {city:'Melbourne',    nick:'Storm',      abbr:'MEL', c1:'#4B1B85', c2:'#E3B23C', stadium:'AAMI Park'},
  {city:'Penrith',      nick:'Panthers',   abbr:'PEN', c1:'#231F20', c2:'#D94F28', stadium:'BlueBet Stadium'},
  {city:'Parramatta',   nick:'Eels',       abbr:'PAR', c1:'#003DA5', c2:'#FFD700', stadium:'CommBank Stadium'},
  {city:'Canterbury',   nick:'Bulldogs',   abbr:'CBU', c1:'#003DA5', c2:'#FFFFFF', stadium:'Accor Stadium'},
  {city:'St George',    nick:'Dragons',    abbr:'DRA', c1:'#CD0000', c2:'#FFFFFF', stadium:'WIN Stadium'},
  {city:'Cronulla',     nick:'Sharks',     abbr:'CRO', c1:'#67B2C8', c2:'#2B2B2B', stadium:'PointsBet Stadium'},
  {city:'Manly',        nick:'Sea Eagles', abbr:'MAN', c1:'#6F263D', c2:'#D2A83A', stadium:'4 Pines Park'},
  {city:'North QLD',    nick:'Cowboys',    abbr:'NQL', c1:'#003087', c2:'#EDBA00', stadium:'QCB Stadium'},
  {city:'Gold Coast',   nick:'Titans',     abbr:'GCT', c1:'#013087', c2:'#F0A200', stadium:'Cbus Super Stadium'},
  {city:'Canberra',     nick:'Raiders',    abbr:'CBR', c1:'#69BE28', c2:'#9BC53D', stadium:'GIO Stadium'},
  {city:'New Zealand',  nick:'Warriors',   abbr:'WZL', c1:'#2B5797', c2:'#B0BEC5', stadium:'Go Media Stadium'},
  {city:'Wests',        nick:'Tigers',     abbr:'WTI', c1:'#F36A23', c2:'#231F20', stadium:'CommBank Stadium'},
  {city:'Newcastle',    nick:'Knights',    abbr:'NEW', c1:'#003DA5', c2:'#C0272D', stadium:'McDonald Jones Stadium'},
  {city:'Redcliffe',    nick:'Dolphins',   abbr:'DOL', c1:'#E21F26', c2:'#1E3A6E', stadium:'Moreton Daily Stadium'},
];
const STADIUM_NAMES = ['Central Stadium','Riverside Park','Harbour Ground','Civic Stadium','Lang Park South','Showgrounds Stadium','Coastal Arena','National Football Park'];
const WEATHER = ['Clear','Fine','Humid','Light rain','Heavy rain','Windy'];
const FACILITY_DEFS = {
  stadium:{label:'Stadium Capacity', desc:'Raises the attendance cap for home matches and improves gate revenue ceiling.', baseCost:850000},
  training:{label:'Training Ground', desc:'Improves weekly player development and keeps the squad sharper.', baseCost:650000},
  gym:{label:'Performance Gym', desc:'Improves physical training outcomes and conditioning.', baseCost:520000},
  medical:{label:'Medical Centre', desc:'Improves injury recovery support alongside your physio staff.', baseCost:560000},
  academy:{label:'Youth Academy', desc:'Improves development pathways and future scouting/youth systems.', baseCost:700000},
};
const FACILITY_MAX = 5;
const STADIUM_CAPACITY_BY_LEVEL = [18000, 26000, 34000, 42000, 52000];
const POS = ['FB','WG','CE','FE','HB','PR','HK','SR','LK'];
const POS_NAME = {FB:'Fullback', WG:'Winger', CE:'Centre', FE:'Five-Eighth', HB:'Halfback', PR:'Prop', HK:'Hooker', SR:'Second Rower', LK:'Lock'};
const SLOTS = [
  {n:1,pos:'FB'},{n:2,pos:'WG'},{n:3,pos:'CE'},{n:4,pos:'CE'},{n:5,pos:'WG'},
  {n:6,pos:'FE'},{n:7,pos:'HB'},{n:8,pos:'PR'},{n:9,pos:'HK'},{n:10,pos:'PR'},
  {n:11,pos:'SR'},{n:12,pos:'SR'},{n:13,pos:'LK'},
  {n:14,pos:'BE'},{n:15,pos:'BE'},{n:16,pos:'BE'},{n:17,pos:'BE'}, // active bench (4 used, 8 subs max)
  {n:18,pos:'BE'},{n:19,pos:'BE'}  // named reserves (dress, don't play)
];
const DEV_SQUAD_TEMPLATE = ['FB','WG','CE','FE','HB','PR','PR','HK','SR','LK'];
const POS_GROUP = {FB:'back', WG:'back', CE:'back', FE:'half', HB:'half', PR:'fwd', SR:'fwd', LK:'fwd', HK:'hk'};
const ATTR_GROUPS = {
  offensive:['shortPass','longPass','kickAccuracy','kickPower','placeKick','fieldGoal','playmaking','ballRunning','finishing','ballSecurity'],
  defensive:['tackling','defRead','bigHit','lastDitch','markerDef'],
  physical:['speed','stamina','acceleration','catching','injury','strength','agility'],
  mental:['composure','leadership','vision','decisionMaking','workRate','discipline','professionalism']
};
const ATTRS = [].concat(ATTR_GROUPS.offensive, ATTR_GROUPS.defensive, ATTR_GROUPS.physical, ATTR_GROUPS.mental);
const ATTR_LABEL = {
  shortPass:'Short Pass', longPass:'Long Pass', kickAccuracy:'Kick Accuracy', kickPower:'Kick Power',
  placeKick:'Goal Kicking', fieldGoal:'Field Goals', playmaking:'Playmaking', ballRunning:'Ball Running',
  finishing:'Finishing', ballSecurity:'Ball Security',
  tackling:'Tackling', defRead:'Defensive Read', bigHit:'Big Hit', lastDitch:'Last-Ditch Effort', markerDef:'Marker Defence',
  speed:'Speed', stamina:'Stamina', acceleration:'Acceleration', catching:'Catching', injury:'Durability',
  strength:'Strength', agility:'Agility',
  composure:'Composure', leadership:'Leadership', vision:'Vision', decisionMaking:'Decision Making',
  workRate:'Work Rate', discipline:'Discipline', professionalism:'Professionalism'
};
/* per-position attribute profile: [mean offset vs base, weight in overall] */
const POS_PROFILE = {
  FB:{speed:[10,.10], acceleration:[8,.08], agility:[8,.08], catching:[10,.09], ballSecurity:[8,.08], playmaking:[6,.08], vision:[7,.08], decisionMaking:[6,.08], ballRunning:[7,.08], finishing:[4,.05], defRead:[4,.07], lastDitch:[5,.07], shortPass:[2,.05], kickPower:[2,.03], kickAccuracy:[1,.03], tackling:[-4,.05]},
  WG:{speed:[14,.14], acceleration:[12,.10], finishing:[13,.13], catching:[7,.09], ballRunning:[9,.09], agility:[7,.07], strength:[3,.06], ballSecurity:[4,.07], lastDitch:[2,.06], tackling:[-4,.05], defRead:[-2,.06], stamina:[1,.06], composure:[0,.05], kickPower:[-22,.01], kickAccuracy:[-22,.01], placeKick:[-24,0], fieldGoal:[-24,0]},
  CE:{speed:[8,.09], acceleration:[6,.07], strength:[7,.08], ballRunning:[9,.10], finishing:[8,.09], catching:[4,.06], ballSecurity:[4,.06], defRead:[6,.10], tackling:[4,.08], lastDitch:[4,.06], agility:[5,.06], shortPass:[2,.05], decisionMaking:[2,.06], vision:[0,.04], kickPower:[-18,.01], kickAccuracy:[-18,.01], placeKick:[-20,0], fieldGoal:[-20,0]},
  FE:{shortPass:[12,.12], longPass:[10,.10], playmaking:[13,.13], vision:[12,.12], decisionMaking:[10,.10], kickAccuracy:[10,.08], kickPower:[8,.08], fieldGoal:[8,.04], placeKick:[4,.03], composure:[8,.08], ballRunning:[4,.05], agility:[5,.05], ballSecurity:[5,.05], defRead:[-2,.05]},
  HB:{shortPass:[14,.12], longPass:[12,.10], playmaking:[14,.13], vision:[14,.12], decisionMaking:[12,.11], kickAccuracy:[13,.09], kickPower:[13,.09], fieldGoal:[11,.05], placeKick:[7,.04], composure:[8,.08], ballSecurity:[5,.05], defRead:[-2,.04], speed:[0,.04]},
  PR:{strength:[16,.15], ballRunning:[7,.08], tackling:[11,.12], markerDef:[8,.09], bigHit:[8,.08], defRead:[6,.08], workRate:[7,.08], stamina:[3,.08], lastDitch:[3,.05], ballSecurity:[-2,.05], speed:[-14,.04], acceleration:[-12,.04], agility:[-10,.03], shortPass:[-4,.03], discipline:[0,.05], kickPower:[-28,0], kickAccuracy:[-30,0], placeKick:[-32,0], fieldGoal:[-32,0]},
  HK:{stamina:[12,.12], workRate:[12,.12], shortPass:[12,.12], playmaking:[8,.08], decisionMaking:[8,.08], markerDef:[10,.10], tackling:[10,.10], defRead:[7,.08], vision:[7,.07], acceleration:[-2,.04], agility:[3,.05], ballSecurity:[5,.05], kickAccuracy:[1,.03], kickPower:[-2,.03], fieldGoal:[-4,.01], placeKick:[-10,0]},
  SR:{strength:[10,.10], ballRunning:[7,.08], tackling:[9,.11], defRead:[7,.09], bigHit:[7,.08], lastDitch:[5,.06], workRate:[8,.09], stamina:[6,.08], finishing:[4,.05], ballSecurity:[2,.05], speed:[-3,.05], agility:[-1,.04], shortPass:[0,.04]},
  LK:{tackling:[10,.11], markerDef:[7,.08], defRead:[9,.10], workRate:[12,.12], stamina:[8,.09], strength:[6,.07], shortPass:[6,.07], playmaking:[4,.06], vision:[6,.07], decisionMaking:[6,.07], ballSecurity:[4,.05], ballRunning:[3,.05], speed:[-6,.04], leadership:[3,.05], kickPower:[-10,.01], kickAccuracy:[-10,.01], placeKick:[-16,0], fieldGoal:[-12,0]}
};
const TEAM_ROLE_KEYS = ['captain','goalKicker','primaryKicker','secondaryKicker','primaryPlaymaker','secondaryPlaymaker'];
const POSITION_ROLES = {
  FB:['balanced','attacking','defensive'],
  WG:['balanced','yardage','finisher'],
  CE:['balanced','strike','defensive'],
  FE:['controlled','opportunist','attacking'],
  HB:['controlled','opportunist','attacking'],
  HK:['controlled','opportunist','attacking'],
  PR:['balanced','yardage','enforcer'],
  SR:['balanced','edgeRunner','workhorse'],
  LK:['balanced','ballPlaying','defensive']
};
const SLOT_SIDE = {1:'right',2:'right',3:'left',4:'left',10:'left',11:'right'};
const SPECIALIST_BY_POS = {
  FB:['support','attacking','defensive'],
  WG:['leftWing','rightWing','yardage','finisher'],
  CE:['leftCentre','rightCentre','strike','defensive'],
  FE:['running','passing','organiser'],
  HB:['organiser','passing','running'],
  PR:['strong','mobile','workhorse'],
  HK:['passing','running','defensive'],
  SR:['leftEdge','rightEdge','middle','workhorse'],
  LK:['ballPlaying','defensive','middle']
};
const SPECIALIST_LABEL = {
  support:'Support', attacking:'Attacking', defensive:'Defensive',
  leftWing:'Left wing', rightWing:'Right wing', yardage:'Yardage', finisher:'Finisher',
  leftCentre:'Left centre', rightCentre:'Right centre', strike:'Strike',
  running:'Running', passing:'Passing', organiser:'Organiser',
  strong:'Strong', mobile:'Mobile', workhorse:'Workhorse',
  leftEdge:'Left edge', rightEdge:'Right edge', middle:'Middle',
  ballPlaying:'Ball-playing'
};
const REALISTIC_RETRAIN = {
  FB:['WG','CE','FE'],
  WG:['FB','CE'],
  CE:['WG','FB','SR'],
  FE:['HB','HK','FB'],
  HB:['FE','HK'],
  PR:['SR','LK'],
  HK:['HB','FE','LK'],
  SR:['PR','LK','CE'],
  LK:['PR','SR','HK']
};
const INDIVIDUAL_TRAINING = {
  balanced:'Balanced',
  mental:'Decision making',
  attack:'Attacking',
  defence:'Defensive',
  physical:'Physical',
  position:'Position retraining',
  specialist:'Specialist retraining'
};
const FIELD_ZONES = [
  ['own20','Own 0-20'],
  ['own40','Own 20-40'],
  ['mid','Midfield'],
  ['opp40','Opp. 40-20'],
  ['redZone','Attacking red zone']
];
const ZONE_PLANS = ['safe','balanced','expansive'];
const STYLE_BY_POS = {
  FB:['Support fullback','Ball-playing fullback','Counter-attacking fullback'],
  WG:['Finishing winger','Power winger','Yardage winger'],
  CE:['Strike centre','Defensive centre','Ball-playing centre'],
  FE:['Creative half','Running half','Game manager'],
  HB:['Game manager','Creative half','Kicking general'],
  PR:['Power runner','Workhorse middle','Impact forward'],
  HK:['High-energy hooker','Control hooker','Crafty rake'],
  SR:['Edge backrower','Workhorse middle','Impact forward'],
  LK:['Ball-playing lock','Workhorse middle','Defensive organiser']
};
const INJURIES = [
  {n:'Bruised ribs',w:[1,1]},{n:'Cork (thigh)',w:[1,1]},{n:'HIA / concussion',w:[1,2]},
  {n:'Ankle sprain',w:[1,3]},{n:'Hamstring strain',w:[2,4]},{n:'Shoulder (AC joint)',w:[2,5]},
  {n:'MCL sprain',w:[3,6]},{n:'Calf tear',w:[2,4]},{n:'Syndesmosis',w:[4,8]},
  {n:'Broken hand',w:[3,6]},{n:'Pectoral tear',w:[6,10]},{n:'ACL rupture',w:[20,30]}
];
const BADGES = [[0,'Community Badge'],[25,'Development Badge'],[40,'Semi-Pro Badge'],[55,'Professional Badge'],[72,'Elite Badge'],[88,'International Badge']];

/* ---------- infringements ---------- */
const INFRINGEMENT_MINOR = [
  {key:'offside',      label:'Offside'},
  {key:'slowRuck',     label:'Slowing the ruck'},
  {key:'strip',        label:'Ball strip'},
  {key:'incorrectPTB', label:'Incorrect play the ball'},
  {key:'interference', label:'Obstruction/interference'},
  {key:'forward',      label:'Forward pass'},
];
const INFRINGEMENT_GRADED = [
  {key:'highTackle',      label:'high tackle',             hipDropBonus:false},
  {key:'dangerousTackle', label:'dangerous tackle',        hipDropBonus:false},
  {key:'hipDrop',         label:'hip drop tackle',         hipDropBonus:true},
  {key:'punching',        label:'punching/fighting',       hipDropBonus:false},
  {key:'professFoul',     label:'professional foul',       hipDropBonus:false},
  {key:'unsporting',      label:'unsportsmanlike conduct', hipDropBonus:false},
];

/* ---------- player quality tiers ---------- */
const QUALITY_TIERS = [
  {key:'park',          label:'Park Level',     minOvr:0,  color:'#888888'},
  {key:'colts',         label:'Colts Grade',    minOvr:45, color:'#5a9945'},
  {key:'firstGrade',    label:'First Grade',    minOvr:55, color:'#2878c0'},
  {key:'topFlight',     label:'Top Flight',     minOvr:63, color:'var(--blue)'},
  {key:'star',          label:'Star Player',    minOvr:70, color:'var(--brass)'},
  {key:'rep',           label:'Representative', minOvr:76, color:'#D8BE54'},
  {key:'international', label:'International',  minOvr:81, color:'#C47830'},
  {key:'immortal',      label:'Immortal',       minOvr:92, color:'#E8C84A'},
];
function playerTier(ovr){
  for(let i=QUALITY_TIERS.length-1;i>=0;i--) if(ovr>=QUALITY_TIERS[i].minOvr) return QUALITY_TIERS[i];
  return QUALITY_TIERS[0];
}

/* ---------- birth towns by nationality / state ---------- */
const BIRTH_TOWNS = {
  'Australia': {
    'Queensland':        ['Brisbane','Townsville','Cairns','Rockhampton','Mackay','Toowoomba','Gold Coast','Bundaberg','Ipswich','Sunshine Coast','Mount Isa','Charters Towers','Hervey Bay','Gladstone','Emerald','Maryborough','Warwick'],
    'New South Wales':   ['Sydney','Newcastle','Wollongong','Gosford','Parramatta','Penrith','Campbelltown','Orange','Wagga Wagga','Dubbo','Tamworth','Coffs Harbour','Lismore','Bathurst','Albury','Armidale','Goulburn','Broken Hill'],
  },
  'New Zealand':     ['Auckland','Wellington','Christchurch','Hamilton','Dunedin','Tauranga','Palmerston North','Rotorua','Napier','New Plymouth','Gisborne','Nelson','Invercargill'],
  'Tonga':           ["Nuku'alofa",'Neiafu','Pangai','Ohonua','Tofoa','Haveluloto','Pea','Lapaha'],
  'Samoa':           ['Apia','Faleolo','Salelologa','Mulifanua','Faleasiu','Siusega','Vaitele','Fagalii'],
  'Papua New Guinea':['Port Moresby','Lae','Mount Hagen','Goroka','Madang','Wewak','Kimbe','Kokopo','Popondetta','Mendi'],
  'England':         ['Leeds','Hull','Wigan','Warrington','St Helens','Bradford','Castleford','Featherstone','Leigh','Widnes','Salford','Dewsbury','Wakefield','Halifax','Batley','Oldham'],
  'Fiji':            ['Suva','Nadi','Lautoka','Labasa','Ba','Sigatoka','Korovou','Savusavu'],
  'Cook Islands':    ['Avarua','Arorangi','Matavera','Ngatangiia','Titikaveka','Arutanga'],
  'Lebanon':         ['Beirut','Tripoli','Sidon','Zahle','Baalbek','Jounieh','Byblos','Tyre'],
};
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ---------- nationalities ---------- */
const NATIONALITY_POOL = [
  {country:'Australia',       weight:50, repTeam:'Kangaroos',       stateReps:['Queensland','New South Wales']},
  {country:'New Zealand',     weight:20, repTeam:'Kiwis'},
  {country:'Tonga',           weight:8,  repTeam:"Mate Ma'a Tonga"},
  {country:'Samoa',           weight:7,  repTeam:'Toa Samoa'},
  {country:'Papua New Guinea',weight:5,  repTeam:'PNG Kumuls'},
  {country:'England',         weight:4,  repTeam:'England'},
  {country:'Fiji',            weight:3,  repTeam:'Bati (Fiji)'},
  {country:'Cook Islands',    weight:2,  repTeam:'Cook Islands'},
  {country:'Lebanon',         weight:1,  repTeam:'Cedars (Lebanon)'},
];

const ACHIEVEMENTS = [
  {key:'premiers', name:'Premiers', desc:'Win the premiership.'},
  {key:'repeat', name:'Back-to-Back', desc:'Win two consecutive premierships.'},
  {key:'dynasty', name:'Dynasty', desc:'Win three or more consecutive premierships.'},
  {key:'minor', name:'Minor Premiers', desc:'Finish 1st after the regular season.'},
  {key:'wooden_spoon', name:'Wooden Spoon', desc:'Finish last.'},
  {key:'perfect_season', name:'Undefeated', desc:'Win every regular season game.'},
  {key:'grand_final_debut', name:'Grand Final Debut', desc:'Reach the grand final in your first season.'},
  {key:'whitewash', name:'Whitewash', desc:'Win a match by 50+ points.'},
  {key:'century', name:'Century', desc:'Score 100+ points in a match.'},
  {key:'shutout', name:'Clean Sheet', desc:'Win without conceding a point.'},
  {key:'poty_winner', name:"Coach's Player", desc:'Your player wins Player of the Year.'},
  {key:'rookie_winner', name:'Early Bloomer', desc:'Your player wins Rookie of the Year.'},
  {key:'immortal_player', name:'Immortal', desc:'Have an Immortal-tier player in your squad.'},
  {key:'10_seasons', name:'Veteran Manager', desc:'Complete 10 seasons.'},
  {key:'full_house', name:'Sold Out', desc:'Play a home game with 40,000+ attendance.'},
  {key:'debt_free', name:'In the Black', desc:'Have $5M+ in club funds.'},
  {key:'bottom_to_top', name:'From the Ashes', desc:'Win the premiership after finishing bottom 4 the prior season.'},
  {key:'upset', name:'Giant Killer', desc:'Beat a team rated 20+ OVR above you.'},
  {key:'comeback', name:'Great Escape', desc:'Win a match after trailing by 20+ points at half-time.'},
  {key:'scouting_star', name:'Diamond Scout', desc:'A player signed from your scouting pipeline reaches OVR 80+.'},
];

/* ---------- staff / assistant coaches ---------- */
// Roles that can have a positional specialization (medical/physio does not)
const COACH_PHILOSOPHIES = [
  {key:'attacking',  label:'Attacking',  plan:'attacking',  desc:'Free-flowing attack, tries from anywhere — concedes points but scores plenty.'},
  {key:'defensive',  label:'Defensive',  plan:'grinding',   desc:'Field position and defence first — low scores, grind out wins.'},
  {key:'expansive',  label:'Expansive',  plan:'attacking',  desc:'Wide game, offloads and line speed — high-octane but can leak.'},
  {key:'balanced',   label:'Balanced',   plan:'balanced',   desc:'No clear weakness — pragmatic and adaptable.'},
  {key:'methodical', label:'Methodical', plan:'grinding',   desc:'Structured sets, conservative kicking game — clinical in the red zone.'},
];
const COACH_PRESS_QUOTES = [
  'We\'ll work hard, play for each other, and the results will come.',
  'There\'s plenty of talent in this squad — I can\'t wait to unleash it.',
  'The culture has to change first. Results follow culture.',
  'I\'ve analysed the squad closely. We know exactly what we need to fix.',
  'This club deserves better and we\'re going to deliver it.',
  'I want us to play fast, play smart, and play together.',
  'Defence wins games and we\'ll make that our identity.',
  'The players here are hungry. You\'ll see a different side of this team.',
  'I\'ve been waiting for a shot like this. This group will not let this club down.',
  'We\'re going back to basics — effort, discipline, and execution.',
];
const COACHING_ROLES_WITH_SPECIALTY = ['attacking','defensive','fitness','kicking','youth'];
const STAFF_ROLES = [
  {key:'attacking',  label:'Attack Coach',       desc:'Improves ball running, playmaking, finishing, and passing. Positional specialty boosts retraining and key-skill development for that position group.', trainingKeys:['ballRunning','playmaking','finishing','shortPass','longPass','vision'], canHaveSpecialty:true},
  {key:'defensive',  label:'Defence Coach',      desc:'Improves tackling, defensive reads, marker defence, and last-ditch. Positional specialty focuses on that position group.', trainingKeys:['tackling','defRead','markerDef','lastDitch','bigHit'], canHaveSpecialty:true},
  {key:'fitness',    label:'Fitness Coach',      desc:'Improves conditioning recovery speed, stamina, and durability. Positional specialty focuses conditioning work on that position group.', trainingKeys:['stamina','workRate','speed','acceleration','injury'], canHaveSpecialty:true},
  {key:'kicking',    label:'Kicking Coach',      desc:'Improves kick power, kick accuracy, goal kicking, and field goal skill. Positional specialty focuses on that position group.', trainingKeys:['kickPower','kickAccuracy','placeKick','fieldGoal'], canHaveSpecialty:true},
  {key:'youth',      label:'Development Coach',  desc:'Boosts development of under-23 players and improves youth scouting quality. Positional specialty focuses development on that position group.', trainingKeys:[], canHaveSpecialty:true},
  {key:'medical',    label:'Team Physio',         desc:'Accelerates injury recovery. Each week there is a chance of reducing a player\'s recovery time by 1 additional week.', trainingKeys:[]},
];

/* ---------- scouting regions ---------- */
const SCOUT_REGIONS = [
  {key:'seq',         label:'South-East Queensland',  nationality:'Australia',       weeks:2, posPool:['FB','WG','CE','FE','HB','PR','HK','SR','LK']},
  {key:'qld_country', label:'North Queensland',       nationality:'Australia',       weeks:3, posPool:['PR','HK','SR','LK','WG','CE']},
  {key:'nsw',         label:'NSW & ACT',              nationality:'Australia',       weeks:3, posPool:['FB','WG','CE','FE','HB','PR','HK','SR','LK']},
  {key:'nsw_country', label:'NSW Country',            nationality:'Australia',       weeks:3, posPool:['PR','HK','SR','LK','WG','CE','FE']},
  {key:'victoria',    label:'Victoria & SA',          nationality:'Australia',       weeks:3, posPool:['FB','WG','CE','FE','HB','PR','SR']},
  {key:'nz',          label:'New Zealand',            nationality:'New Zealand',     weeks:4, posPool:['PR','SR','LK','WG','CE','HK','FB']},
  {key:'samoa',       label:'Samoa',                  nationality:'Samoa',           weeks:5, posPool:['PR','SR','LK','WG','CE','HK']},
  {key:'tonga',       label:'Tonga',                  nationality:'Tonga',           weeks:5, posPool:['PR','SR','LK','WG','CE','HK']},
  {key:'fiji',        label:'Fiji',                   nationality:'Fiji',            weeks:5, posPool:['WG','CE','FB','PR','HK','SR','LK']},
  {key:'png',         label:'Papua New Guinea',       nationality:'Papua New Guinea',weeks:5, posPool:['WG','CE','PR','HK','SR','LK']},
  {key:'england',     label:'England',                nationality:'England',         weeks:6, posPool:['HB','FE','FB','CE','PR','SR']},
  {key:'france',      label:'France',                 nationality:'France',          weeks:6, posPool:['PR','HK','SR','LK','FE']},
  {key:'ireland',     label:'Ireland & Scotland',     nationality:'England',         weeks:7, posPool:['PR','SR','LK','HB','FE']},
  {key:'cook',        label:'Cook Islands',           nationality:'Cook Islands',     weeks:5, posPool:['WG','CE','PR','HK','SR','FB']},
  {key:'lebanon',     label:'Lebanon',                nationality:'Lebanon',          weeks:6, posPool:['HB','FE','CE','PR','SR','HK']},
  {key:'polynesia',   label:'Polynesia (wider)',      nationality:'Samoa',            weeks:6, posPool:['PR','SR','LK','WG','CE','HK','FB']},
  {key:'americas',    label:'Americas & Canada',      nationality:'Australia',        weeks:7, posPool:['PR','SR','LK','FB','WG','CE']},
  {key:'japan',       label:'Japan & Asia',           nationality:'Australia',        weeks:8, posPool:['HB','FE','CE','FB','PR','SR']},
  {key:'south_sydney',label:'South Sydney',           nationality:'Australia',        weeks:2, posPool:['HB','FE','HK','FB','WG','CE']},
  {key:'west_sydney', label:'Western Sydney',         nationality:'Australia',        weeks:2, posPool:['PR','HK','SR','LK','WG','CE','FE']},
  {key:'vic_country', label:'Victoria Country',       nationality:'Australia',        weeks:4, posPool:['PR','SR','LK','WG','CE','FB']},
];
function genStaff(role, abilityBase, posSpecialty){
  const ability = clamp(Math.round(abilityBase + (Math.random()-0.5)*16), 25, 90);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const salary = Math.round((40000 + Math.pow(ability/90, 2.2)*260000)/5000)*5000;
  const roleInfo = STAFF_ROLES.find(r=>r.key===role);
  const spec = posSpecialty || (roleInfo && roleInfo.canHaveSpecialty ? pick(POS) : null);
  const s = {id: ++_staffId, name, role, ability, salary, yearsLeft:ri(1,3)};
  if(spec) s.posSpecialty = spec;
  return s;
}
function genScout(abilityBase){
  const ability = clamp(Math.round(abilityBase + (Math.random()-0.5)*16), 20, 90);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const salary = Math.round((20000 + Math.pow(ability/90, 2)*90000)/5000)*5000;
  return {id: ++_staffId, name, ability, salary, yearsLeft:ri(1,3), posSpecialty:pick(POS)};
}
function scoutTargetChance(scout, targetPos){
  if(!targetPos) return 0;
  const ability = scout ? (scout.ability || 40) : 40;
  const specialtyBonus = scout && scout.posSpecialty === targetPos ? 0.08 : 0;
  return clamp(0.52 + ability / 220 + specialtyBonus, 0.58, 0.95);
}
function scoutRegionPositionWeights(region){
  const pool = region && region.posPool ? region.posPool : POS;
  return pool.map((pos, i)=>({pos, w:Math.max(1, pool.length - i) + (i < 3 ? 2 : 0)}));
}
function pickScoutRegionPosition(region){
  const weights = scoutRegionPositionWeights(region);
  const total = weights.reduce((s,x)=>s+x.w,0);
  let r = rnd() * total;
  for(const x of weights){ r -= x.w; if(r <= 0) return x.pos; }
  return weights[0] ? weights[0].pos : pick(POS);
}
function genAIHeadCoach(repBase){
  const rep = repBase != null ? repBase : ri(20, 60);
  const philosophy = pick(COACH_PHILOSOPHIES);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  return {name, rep, seasons:0, philosophy: philosophy.key, plan: philosophy.plan};
}
// Mutable staff ID counter (set to large base to avoid collisions)
let _staffId = 9000;

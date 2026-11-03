// ===================== 스토브리그 — 코어 (A: 데이터/선수/구단/가치/편성) =====================
const SL=(function(){
'use strict';
const VERSION=1;
// ---------- 밸런스 상수 (여기서만 수정) ----------
const BAL={
  SEASON_GAMES:28, DIV_TEAMS:8, DIVS:3, OFFSEASON_WEEKS:6,
  LEVEL_OVR:{KR1:66,KR2:59,KR3:52,JP:64,US:71,ROOKIE:44,FA:50}, LEVEL_SD:6,
  START_CASH:{1:1500000,2:500000,3:160000},                 // 만원
  TICKET:{1:9000,2:3500,3:1300},                          // 홈경기당 기본 입장수입(만원)
  SPONSOR:{1:300000,2:130000,3:45000}, OVERHEAD:{1:200000,2:60000,3:15000},                    // 시즌 스폰서(만원)
  DIVIDEND:{1:[150000,120000,100000,80000,60000,50000,40000,30000],
            2:[50000,40000,33000,27000,22000,18000,15000,12000],
            3:[16000,13000,11000,9000,7500,6500,5500,5000]},
  OVERSEAS_CASH:{JP:1500000,US:4000000},
  FACILITY:{train:{cost:20000,upkeep:1500},youth:{cost:15000,upkeep:1200},scout:{cost:10000,upkeep:1000}},
  SCOUT_COST:[800,2500,6000], SCOUT_N:[3,5,8], SCOUT_CONF:[0.12,0.25,0.4],
  VALUE_BASE:2000, VALUE_STEP:3.5,                        // ovr45=2000만, +10마다 x3.5
  SALARY_RATE:0.22, SALARY_MIN:1500,
  LEAGUE_VALUE:{1:1.15,2:1.0,3:0.9,JP:1.6,US:2.4},
  GROWTH_TICK:10, DECLINE_PER_TICK:0.55, XP_TARGET_BAT:26, XP_TARGET_PIT:20,
  MIN_ROSTER:20, MAX_ROSTER:30, MIN_PITCHERS:9,
  SELL_LOCK:10, SELL_ON:0.1, OFFER_EXPIRE:3, LOAN_CAP:30000, LOAN_RATE:0.1,
  FATIGUE_RECOVER:14,
  DEV_BASE:4, DEV_EXP:0.75, DRAFT_POOL:48, DRAFT_ROUNDS:2,
};
let S=null;
const POS_BAT=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const POS_W={C:[.25,.2,.12,.05,.25,.13],'1B':[.3,.3,.15,.04,.15,.06],'2B':[.27,.15,.13,.13,.22,.1],'3B':[.27,.22,.12,.07,.2,.12],SS:[.25,.15,.12,.13,.25,.1],LF:[.28,.24,.13,.1,.15,.1],CF:[.27,.17,.12,.15,.2,.09],RF:[.28,.24,.13,.1,.15,.1],DH:[.35,.35,.2,.05,.03,.02]};
const POS_SHAPE={C:{defense:8,arm:6,speed:-10},SS:{defense:8,speed:6,power:-8},'2B':{defense:5,speed:5,power:-6},CF:{speed:10,defense:6,power:-5},'3B':{power:4,arm:5},LF:{power:5,defense:-4},RF:{power:5,arm:6,defense:-3},'1B':{power:8,contact:3,speed:-8,defense:-5},DH:{power:10,contact:4,speed:-8,defense:-15,arm:-8},SP:{stamina:15,stuff:-2},RP:{stamina:-18,stuff:5}};
const BAT_KEYS=['contact','power','eye','speed','defense','arm'];
const PIT_KEYS=['stuff','control','movement','stamina'];
const ATTR_KO={contact:'컨택',power:'파워',eye:'선구안',speed:'주력',defense:'수비',arm:'송구',stuff:'구위',control:'제구',movement:'변화구',stamina:'체력'};
const FOCUS_BAT={balance:'균형',contact:'컨택',power:'장타',eye:'선구안',speed:'주루',defense:'수비'};
const FOCUS_PIT={balance:'균형',stuff:'구위',control:'제구',movement:'변화구',stamina:'체력'};
const TRAITS={'성실':'성장 속도 증가','게으름':'성장 속도 감소','강철체력':'피로 회복 빠름·노화 완만','클러치':'득점권에서 집중력 상승','장타본능':'홈런 확률 증가','빠른발':'진루 판단 우수','강심장':'해외 적응·협상에 유리','유리멘탈':'큰 무대에서 흔들림','리더':'팀 사기 유지'};
const ROSTER_TEMPLATE=['SP','SP','SP','SP','SP','RP','RP','RP','RP','RP','RP','RP','C','C','1B','2B','3B','SS','LF','CF','RF','DH','2B','SS','CF','1B'];
const NEED_TEMPLATE={SP:5,RP:7,C:2,'1B':2,'2B':2,'3B':1,SS:2,LF:1,CF:2,RF:1,DH:1};

// ---------- 난수 (시드 기반, 상태 저장) ----------
function rnd(){S.rng=(S.rng+0x6D2B79F5)|0;let t=S.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
function ri(a,b){return a+Math.floor(rnd()*(b-a+1));}
function pick(a){return a[Math.floor(rnd()*a.length)];}
function gauss(){let u=0,v=0;while(u===0)u=rnd();while(v===0)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function clamp(x,a,b){return x<a?a:x>b?b:x;}
function r1(x){return Math.round(x*10)/10;}
function nid(){return S.nextId++;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// ---------- 이름 ----------
const KS=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍','전','고','문','양','손','배','백','허','유','남','심','노','하','곽','성','차','주','우','구','민','진','나','지','엄','채','원','천','방','공','현','함','변','염','여','추','도','소','석','선','설','마','길','연','위','표','명','기','반','왕','금','옥','육','인','맹','제','모','탁','국'];
const KG=['민준','서준','도윤','예준','시우','하준','주원','지호','지후','준서','준우','현우','도현','지훈','건우','우진','선우','서진','민재','현준','연우','유준','정우','승우','승현','시윤','준혁','은우','지환','승민','지우','유찬','윤우','민성','준영','시후','진우','지원','수호','재윤','태윤','시현','민규','지안','재원','하율','이준','윤호','재민','태민','성민','영호','상현','동현','성진','경민','대성','기현','용준','창민','태양','명수','철민','영수','광수','성호','진호','민호','석현','수민','현수','상민','형준','병호','종현','영진','희준','규민','승준','찬희','동민','우석','기범','태현','준호','성준','재혁','병찬','용호','정훈','원준','상우','재성','하늘','바다','도영'];
const JS=['사토','스즈키','다카하시','다나카','와타나베','이토','야마모토','나카무라','고바야시','가토','요시다','야마다','사사키','야마구치','마쓰모토','이노우에','기무라','하야시','시미즈','야마자키','모리','이케다','하시모토','아베','이시카와','나카지마','마에다','후지타','오가와','고토','오카다','하세가와','무라카미','곤도','이시이','사이토','사카모토','엔도','아오키','후지이','니시무라','후쿠다','오타','미우라','후지와라','오카모토','마쓰다','나카가와','나카노','하라다'];
const JG=['히로시','다쿠야','겐타','유타','쇼타','다이키','류세이','하루토','소타','가이토','렌','유키','고타','신지','나오키','마사토','료타','겐지','다이스케','다쿠미','료','가즈키','유야','슈헤이','고헤이','유토','리쿠','쇼','아키라','유스케'];
const UF=['제임스','존','마이클','데이비드','크리스','맷','조시','제이크','타일러','라이언','오스틴','코디','브랜든','카일','잭','루이스','카를로스','호세','미겔','후안','알렉스','닉','조던','트레버','로건','헌터','딜런','코너','메이슨','블레이크'];
const UL=['스미스','존슨','윌리엄스','브라운','존스','밀러','데이비스','가르시아','로드리게스','마르티네스','에르난데스','로페스','윌슨','앤더슨','토머스','테일러','무어','잭슨','마틴','리','페레스','톰슨','화이트','해리스','클라크','루이스','로빈슨','워커','영','앨런','킹','라이트','스콧','토레스','힐','플로레스','그린','애덤스','넬슨','베이커','홀','리베라','캠벨','미첼','카터','로버츠','고메스','필립스','에번스','터너'];
function genName(nat){if(nat==='JP')return pick(JS)+' '+pick(JG);if(nat==='US')return pick(UF)+' '+pick(UL);return pick(KS)+pick(KG);}
const TEAM_NAMES={
  KR:[['한강 유니콘스','#1d4ed8'],['해운 돌핀스','#0e7490'],['서라벌 피닉스','#b91c1c'],['금강 썬더스','#ca8a04'],['남한산 호크스','#7c3aed'],['청해 마린스','#0369a1'],['달구벌 블레이즈','#ea580c'],['태백 그리즐리','#78350f'],
      ['영산 스톰','#4338ca'],['울림 팰컨스','#be123c'],['서해 세일러스','#0f766e'],['가야 워리어스','#9a3412'],['소백 울브스','#475569'],['설악 콘도르스','#1e3a8a'],['한라 오션스','#0891b2'],['동해 라이트닝','#a16207'],
      ['비슬 스패로우스','#15803d'],['금호 레드폭스','#dc2626'],['낙동 캣피시','#3f6212'],['수성 비버스','#92400e'],['팔공 램스','#6d28d9'],['영일 시걸스','#0e7490'],['강화 머스탱스','#b45309'],['진주 펄스','#be185d']],
  JP:[['도쿄 선라이즈','#dc2626'],['오사카 타이푼','#1d4ed8'],['삿포로 스노우즈','#0ea5e9'],['후쿠오카 플레임즈','#ea580c'],['나고야 샤치','#eab308'],['히로시마 레드윙스','#b91c1c']],
  US:[['뉴저지 메트로스','#2563eb'],['텍사스 롱혼스','#9a3412'],['캘리포니아 서퍼스','#0891b2'],['시카고 윈즈','#1e40af'],['플로리다 게이터즈','#15803d'],['애틀랜타 피치스','#db2777']]
};

// ---------- 등급/능력 ----------
function isPitcher(p){return p.pos==='SP'||p.pos==='RP';}
function gradeOf(v){return v>=80?'S':v>=70?'A':v>=60?'B':v>=50?'C':'D';}
function calcOvr(p){
  const a=p.attrs;
  if(isPitcher(p)){return p.pos==='SP'?a.stuff*.33+a.control*.3+a.movement*.25+a.stamina*.12:a.stuff*.4+a.control*.3+a.movement*.25+a.stamina*.05;}
  const w=POS_W[p.pos]||POS_W.DH;
  return a.contact*w[0]+a.power*w[1]+a.eye*w[2]+a.speed*w[3]+a.defense*w[4]+a.arm*w[5];
}
function posPenalty(p,pos){
  if(pos===p.pos||isPitcher(p)||pos==='DH')return 0;
  if(pos==='C')return 30;
  if(pos==='1B')return p.pos==='DH'?10:5;
  if(p.pos==='DH'||p.pos==='1B')return pos==='LF'||pos==='RF'?14:20;
  const inf=['2B','3B','SS'],of=['LF','CF','RF'];
  if(of.includes(pos)&&of.includes(p.pos))return pos==='CF'?12:7;
  if(inf.includes(pos)&&inf.includes(p.pos))return pos==='SS'?12:8;
  if(p.pos==='C')return 16;
  return 18;
}
const POS_KO={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발투수',RP:'구원투수'};
function josa(w,a,b){w=String(w);const base=w.replace(/\s*\([^()]*\)\s*$/,'')||w;const ch=base.charAt(base.length-1);let code=ch.charCodeAt(0);const dig={'0':1,'1':8,'2':0,'3':16,'4':0,'5':0,'6':1,'7':8,'8':8,'9':0};let jong;
  if(code>=0xAC00&&code<=0xD7A3)jong=(code-0xAC00)%28;else if(dig[ch]!=null)jong=dig[ch];else if(/[a-zA-Z]/.test(ch))jong=/[lmnr]/i.test(ch)?(ch.toLowerCase()==='l'?8:4):0;else jong=0;
  if(a==='으로')return w+(jong===0||jong===8?'로':'으로');return w+(jong?a:b);}
function posOvr(p,pos){
  const a=p.attrs,w=POS_W[pos]||POS_W.DH,pen=posPenalty(p,pos);
  return a.contact*w[0]+a.power*w[1]+a.eye*w[2]+a.speed*w[3]+clamp(a.defense-pen,10,99)*w[4]+clamp(a.arm-pen*0.5,10,99)*w[5];
}
function velocity(p){return Math.round(132+(p.attrs.stuff-50)*0.33+(p.velo||0));}

// ---------- 선수 생성 ----------
function makeScout(p,conf){
  const noise=gauss()*(1-conf)*12;const est=clamp(p.pot+noise,30,99);const w=(1-conf)*11+2;
  return {est:Math.round(est),lo:Math.round(clamp(est-w,30,99)),hi:Math.round(clamp(est+w,30,99)),conf:Math.round(conf*100)/100};
}
function improveScout(p,d){
  const c=clamp(p.scout.conf+d,0,0.95);const k=Math.min(0.6,d*1.5);
  const est=clamp(p.scout.est*(1-k)+(p.pot+gauss()*(1-c)*5)*k,30,99);const w=(1-c)*11+2;
  p.scout={est:Math.round(est),lo:Math.round(clamp(est-w,30,99)),hi:Math.round(clamp(est+w,30,99)),conf:Math.round(c*100)/100};
}
function genAge(){const r=rnd();return r<0.18?ri(18,21):r<0.5?ri(22,25):r<0.82?ri(26,30):ri(31,35);}
function genPlayer(o){
  const pos=o.pos;const isP=pos==='SP'||pos==='RP';const nat=o.nat||'KR';
  const age=o.age!=null?o.age:genAge();
  let target=o.lvl+gauss()*BAL.LEVEL_SD;
  if(age<=21)target-=(22-age)*2.5;if(age>=33)target-=(age-32)*1.2;
  target=clamp(target,30,91);
  const attrs={};const keys=isP?PIT_KEYS:BAT_KEYS;const shape=POS_SHAPE[pos]||{};
  for(const k of keys)attrs[k]=target+(shape[k]||0)+gauss()*7;
  const p={id:nid(),name:genName(nat),nat,age,pos,bats:isP?'R':pick(['R','R','L','L','S']),throws:pick(['R','R','R','L']),attrs,velo:gauss()*3,traits:[],teamId:null,contract:null,focus:'balance',xp:0,fatigue:0,cond:0,morale:60,cur:newStat(),hist:[],log:[],transfers:[],valHist:[],retired:false};
  for(let i=0;i<3;i++){const d=target-calcOvr(p);for(const k of keys)attrs[k]=clamp(attrs[k]+d,15,99);}
  for(const k of keys)attrs[k]=r1(attrs[k]);
  let pot=calcOvr(p)+Math.max(0,(27-age)*2.0+gauss()*7+(o.potBoost||0));
  if(age<=22&&rnd()<0.08)pot+=ri(5,12);
  p.pot=r1(clamp(Math.max(pot,calcOvr(p)),30,96));
  p.growthType=pick(['early','normal','normal','late']);
  p.peakAge=p.growthType==='early'?ri(24,26):p.growthType==='normal'?ri(27,29):ri(29,31);
  const tnames=Object.keys(TRAITS);p.traits=[pick(tnames)];if(rnd()<0.35){const t=pick(tnames);if(!p.traits.includes(t)&&!((t==='성실'&&p.traits[0]==='게으름')||(t==='게으름'&&p.traits[0]==='성실')))p.traits.push(t);}
  p.scout=makeScout(p,o.conf!=null?o.conf:0.3);
  p.base=JSON.parse(JSON.stringify(attrs));
  S.players[p.id]=p;
  p.snap={s:S.season||1,ovr:r1(calcOvr(p)),val:0,attrs:JSON.parse(JSON.stringify(attrs))};
  return p;
}
function newStat(){return {g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,so:0,r:0,rbi:0,pG:0,pGS:0,pOuts:0,pH:0,pR:0,pER:0,pBB:0,pSO:0,pPit:0,pW:0,pL:0,pSV:0};}

// ---------- 가치/연봉 ----------
function baseVal(ovr){return BAL.VALUE_BASE*Math.pow(BAL.VALUE_STEP,(ovr-45)/10);}
function perfFactor(p){
  const s=p.hist.length?p.hist[p.hist.length-1].st:null;if(!s)return 1;
  if(isPitcher(p)){if(s.pOuts<30)return 1;const era=s.pER*27/s.pOuts;return clamp(1.15-(era-3.8)*0.06,0.85,1.15);}
  if(s.pa<40)return 1;const ops=ops_(s);return clamp(1+(ops-0.72)*0.8,0.85,1.15);
}
function ops_(s){const ab=s.ab||1,h=s.h,bb=s.bb;const obp=(h+bb)/Math.max(1,s.ab+s.bb);const slg=(h+s.d2+2*s.d3+3*s.hr)/ab;return obp+slg;}
function calcValue(p){
  const ovr=calcOvr(p);let v=baseVal(ovr);const a=p.age;
  v*=a<=23?1.0:a<=27?1.05:a<=30?0.9:a<=33?0.6:a<=35?0.38:0.25;
  if(a<=26)v*=1+Math.max(0,p.pot-ovr)/22*(a<=22?1:a<=24?0.7:0.4);
  const yrs=p.contract?p.contract.years:1;v*=yrs<=1?0.85:yrs===2?1:1.08;
  if(['C','SS','CF','SP'].includes(p.pos))v*=1.1;
  v*=perfFactor(p);
  const t=p.teamId!=null?S.teams[p.teamId]:null;v*=t?(t.league==='KR'?BAL.LEAGUE_VALUE[t.div]:BAL.LEAGUE_VALUE[t.league]):1;
  return Math.max(500,Math.round(v/10)*10);
}
function salaryFor(p){const v=baseVal(calcOvr(p))*BAL.SALARY_RATE*(p.age<=23?0.75:1)*(p.age>=33?0.8:1);return Math.max(BAL.SALARY_MIN,Math.round(v/10)*10);}
function money(m){const neg=m<0;m=Math.abs(Math.round(m));let s;if(m>=10000){const e=m/10000;s=(e>=100?Math.round(e):Math.round(e*10)/10).toLocaleString()+'억원';}else s=m.toLocaleString()+'만원';return (neg?'-':'')+s;}

// ---------- 구단 ----------
function genTeam(name,color,league,div,isUser){
  const t={id:nid(),name,color,league,div,cash:0,rep:0,fac:{train:1,youth:1,scout:1},roster:[],lineup:[],pos:{},rotation:[],bullpen:[],closer:null,rotIdx:0,rec:{w:0,l:0,rs:0,ra:0},fin:newFin(),isUser:!!isUser,loan:0,lastRank:null,dev:[]};
  if(league==='KR'){t.cash=BAL.START_CASH[div]*(0.9+rnd()*0.3);t.rep=div===1?ri(60,85):div===2?ri(40,58):ri(20,38);}
  else{t.cash=BAL.OVERSEAS_CASH[league];t.rep=league==='US'?ri(85,98):ri(70,85);}
  t.cash=Math.round(t.cash);
  return t;
}
function newFin(){return {tickets:0,sponsor:0,dividend:0,sales:0,salary:0,buys:0,scout:0,facility:0,other:0};}
function levelOf(t){return t.league==='KR'?BAL.LEVEL_OVR['KR'+t.div]:BAL.LEVEL_OVR[t.league];}
function addToTeam(p,t,contract,dev){p.teamId=t.id;(dev?t.dev:t.roster).push(p.id);p.contract=contract;}
function devCap(t){return BAL.DEV_BASE+(t.fac?t.fac.youth:1);}
function fillRoster(t){
  const lvl=levelOf(t);const nat=t.league==='KR'?'KR':t.league;
  const have={};for(const pid of t.roster)have[S.players[pid].pos]=(have[S.players[pid].pos]||0)+1;
  for(const pos of ROSTER_TEMPLATE){if(have[pos]>0){have[pos]--;continue;}
    const p=genPlayer({pos,lvl,nat:(t.league==='KR'?(rnd()<0.08?pick(['US','JP']):'KR'):(rnd()<0.1?'KR':nat))});
    addToTeam(p,t,{salary:Math.round(salaryFor(p)*(0.85+rnd()*0.3)/10)*10,years:ri(1,4)});
  }
}
function countPos(t,pos){let n=0;for(const pid of t.roster)if(S.players[pid].pos===pos)n++;return n;}
function needOf(t){const need=[];for(const pos in NEED_TEMPLATE){const n=countPos(t,pos);if(n<NEED_TEMPLATE[pos])need.push(pos);}return need;}

// ---------- 자동 편성 ----------
const LINEUP_POS=['C','SS','CF','2B','3B','RF','LF','1B','DH'];
const DEFW={C:1.3,SS:1.4,CF:1.3,'2B':1.2,'3B':1.0,RF:0.9,LF:0.8,'1B':0.6,DH:0};
function offVal(p){const a=p.attrs;return a.contact*.36+a.power*.34+a.eye*.18+a.speed*.12;}
function defAt(p,pos){const pen=posPenalty(p,pos);return {d:clamp(p.attrs.defense-pen,10,99),ar:clamp(p.attrs.arm-pen*0.5,10,99),pen};}
function fitScore(p,pos,opt){
  let s=offVal(p);if(pos!=='DH'){const x=defAt(p,pos);s+=DEFW[pos]*((x.d-50)*0.55+(x.ar-50)*0.15);if(x.pen>=12)s-=3;}else if(p.pos!=='DH')s-=1.5;
  if(opt){if(opt.mode==='youth'&&p.age<=24)s+=Math.max(0,Math.min(25,(p.scout?p.scout.est:p.pot)-calcOvr(p)))*0.45+3;
    if(opt.mode==='rest'&&(p.fatigue||0)>50)s-=((p.fatigue||0)-50)*0.5;if((p.fatigue||0)>85)s-=10;}
  return s;}
function bestLineup(bats,opt){
  opt=opt||{};const locks=opt.locks||{};const pool=bats.filter(p=>p&&!p.retired);const asg={};const used=new Set();
  for(const pid in locks){const p=pool.find(x=>x.id===+pid);if(p&&!used.has(p.id)&&!Object.values(asg).includes(locks[pid])){asg[p.id]=locks[pid];used.add(p.id);}}
  const lockedIds=new Set(Object.keys(asg).map(Number));
  for(const pos of LINEUP_POS){if(Object.values(asg).includes(pos))continue;let best=null,bv=-1e9;for(const p of pool){if(used.has(p.id))continue;const v=fitScore(p,pos,opt);if(v>bv){bv=v;best=p;}}if(best){asg[best.id]=pos;used.add(best.id);}}
  const total=()=>{let t=0;for(const id in asg)t+=fitScore(pool.find(x=>x.id===+id),asg[id],opt);return t;};
  for(let it=0;it<40;it++){let bestGain=0.01,act=null;const ids=Object.keys(asg).map(Number).filter(id=>!lockedIds.has(id));
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=pool.find(x=>x.id===ids[i]),b=pool.find(x=>x.id===ids[j]);const pa=asg[a.id],pb=asg[b.id];const g=fitScore(a,pb,opt)+fitScore(b,pa,opt)-fitScore(a,pa,opt)-fitScore(b,pb,opt);if(g>bestGain){bestGain=g;act=['swap',a.id,b.id];}}
    for(const id of ids){const a=pool.find(x=>x.id===id);const pos=asg[id];for(const b of pool){if(used.has(b.id))continue;const g=fitScore(b,pos,opt)-fitScore(a,pos,opt);if(g>bestGain){bestGain=g;act=['rep',id,b.id];}}}
    if(!act)break;if(act[0]==='swap'){const t=asg[act[1]];asg[act[1]]=asg[act[2]];asg[act[2]]=t;}else{const pos=asg[act[1]];delete asg[act[1]];used.delete(act[1]);asg[act[2]]=pos;used.add(act[2]);}}
  // 타순
  const chosen=Object.keys(asg).map(id=>pool.find(x=>x.id===+id));const rest=[...chosen].sort((a,b)=>offVal(b)-offVal(a));const order=new Array(chosen.length);
  const take=(fn,slot)=>{if(!rest.length)return;let bi=0,bv=-1e9;rest.slice(0,Math.min(rest.length,6)).forEach((p,i)=>{const v=fn(p);if(v>bv){bv=v;bi=i;}});order[slot]=rest.splice(bi,1)[0];};
  take(p=>p.attrs.power*.6+p.attrs.contact*.4,3);take(p=>offVal(p),2);take(p=>p.attrs.contact*.4+p.attrs.eye*.35+p.attrs.speed*.25,0);take(p=>p.attrs.contact*.6+p.attrs.speed*.2+p.attrs.eye*.2,1);
  for(let k=4;k<order.length;k++)take(p=>offVal(p),k);
  return {order:order.filter(Boolean).map(p=>p.id),pos:asg,score:total()};
}
function autoLineup(t,opt){
  opt=opt||{mode:t.lineupMode||'win',locks:t.isUser?(t.locks||{}):{}};
  const ps=t.roster.map(id=>S.players[id]).filter(p=>p&&!p.retired);
  const bats=ps.filter(p=>!isPitcher(p)),pits=ps.filter(isPitcher);
  const r=bestLineup(bats,opt);t.lineup=r.order;t.pos=r.pos;
  const fat=p=>opt.mode==='rest'?(p.fatigue||0)*0.2:0;
  const sps=pits.filter(p=>p.pos==='SP').sort((a,b)=>calcOvr(b)-fat(b)-calcOvr(a)+fat(a));const rps=pits.filter(p=>p.pos==='RP').sort((a,b)=>calcOvr(b)-calcOvr(a));
  let rot=sps.slice(0,5).map(p=>p.id);const extra=[...sps.slice(5),...rps];
  while(rot.length<5&&extra.length)rot.push(extra.shift().id);
  t.rotation=rot;t.bullpen=pits.filter(p=>!rot.includes(p.id)).sort((a,b)=>calcOvr(b)-calcOvr(a)).map(p=>p.id);
  t.closer=t.bullpen.length?t.bullpen[0]:null;
  if(t.rotIdx>=t.rotation.length)t.rotIdx=0;
}
function teamPower(t,exclude){
  const ps=t.roster.filter(id=>id!==exclude).map(id=>S.players[id]).filter(p=>p&&!p.retired);
  const bats=ps.filter(p=>!isPitcher(p)),pits=ps.filter(isPitcher);const r=bestLineup(bats,{});
  let la=0,n=0;for(const id in r.pos){const p=S.players[id];la+=r.pos[id]==='DH'?offVal(p):posOvr(p,r.pos[id]);n++;}la=n?la/n:40;
  const sp=pits.filter(p=>p.pos==='SP').map(calcOvr).sort((a,b)=>b-a);const allp=pits.map(calcOvr).sort((a,b)=>b-a);
  const spA=sp.length>=5?sp.slice(0,5):sp.concat(allp.filter(x=>!sp.includes(x)).slice(0,5-sp.length));const spAvg=spA.length?spA.reduce((a,b)=>a+b,0)/spA.length:40;
  const rp=pits.filter(p=>p.pos==='RP').map(calcOvr).sort((a,b)=>b-a).slice(0,5);const rpAvg=rp.length?rp.reduce((a,b)=>a+b,0)/rp.length:40;
  return {power:r1(la*0.55+spAvg*0.3+rpAvg*0.15),lineup:r,spIds:pits.filter(p=>p.pos==='SP').sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,5).map(p=>p.id)};
}
// 유저 팀: 빠진 선수만 교체(기존 편성 유지)
function fixLineup(t){
  const alive=new Set(t.roster.filter(id=>S.players[id]&&!S.players[id].retired));
  const before=JSON.stringify([t.lineup,t.rotation,t.bullpen,t.closer]);
  t.lineup=t.lineup.filter(id=>alive.has(id));for(const id in t.pos)if(!alive.has(+id))delete t.pos[id];
  t.rotation=t.rotation.filter(id=>alive.has(id));t.bullpen=t.bullpen.filter(id=>alive.has(id));
  if(t.closer!=null&&!alive.has(t.closer))t.closer=null;
  const ps=[...alive].map(id=>S.players[id]);
  const needPos=['C','SS','2B','CF','3B','RF','LF','1B','DH'].filter(ps_=>!Object.values(t.pos).includes(ps_));
  for(const ps_ of needPos){let best=null,bv=-1e9;for(const p of ps){if(isPitcher(p)||t.lineup.includes(p.id))continue;const v=fitScore(p,ps_,{});if(v>bv){bv=v;best=p;}}if(best){t.lineup.push(best.id);t.pos[best.id]=ps_;}}
  if(t.locks)for(const id in t.locks)if(!alive.has(+id))delete t.locks[id];
  const pits=ps.filter(isPitcher);
  for(const p of pits)if(!t.rotation.includes(p.id)&&!t.bullpen.includes(p.id))t.bullpen.push(p.id);
  while(t.rotation.length<5&&t.bullpen.length){const sp=t.bullpen.find(id=>S.players[id].pos==='SP')||t.bullpen[0];t.bullpen=t.bullpen.filter(id=>id!==sp);t.rotation.push(sp);}
  if(t.closer==null&&t.bullpen.length)t.closer=[...t.bullpen].sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]))[0];
  if(t.rotIdx>=t.rotation.length)t.rotIdx=0;
  return before!==JSON.stringify([t.lineup,t.rotation,t.bullpen,t.closer]);
}

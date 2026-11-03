
// ===================== 스토브리그 — 코어 (A: 데이터/선수/구단/가치/편성) =====================
const SL=(function(){
'use strict';
const VERSION=3;
// ---------- 밸런스 상수 (여기서만 수정) ----------
const BAL={
  SEASON_GAMES:28, DIV_TEAMS:8, DIVS:3, OFFSEASON_WEEKS:6,
  LEVEL_OVR:{KR1:66,KR2:59,KR3:52,JP:64,US:71,TW:57,MX:58,AU:50,CB:55,ROOKIE:44,FA:50}, LEVEL_SD:6,
  START_CASH:{1:1500000,2:500000,3:160000},                 // 만원
  TICKET:{1:9000,2:3500,3:1300},                          // 홈경기당 기본 입장수입(만원)
  SPONSOR:{1:300000,2:130000,3:45000}, OVERHEAD:{1:200000,2:60000,3:15000},                    // 시즌 스폰서(만원)
  DIVIDEND:{1:[150000,120000,100000,80000,60000,50000,40000,30000],
            2:[50000,40000,33000,27000,22000,18000,15000,12000],
            3:[16000,13000,11000,9000,7500,6500,5500,5000]},
  OVERSEAS_CASH:{JP:1500000,US:4000000,TW:300000,MX:400000,AU:120000,CB:180000},
  FACILITY:{train:{cost:20000,upkeep:1500},youth:{cost:15000,upkeep:1200},scout:{cost:10000,upkeep:1000}},
  SCOUT_COST:[800,2500,6000], SCOUT_N:[3,5,8], SCOUT_CONF:[0.12,0.25,0.4],
  VALUE_BASE:2000, VALUE_STEP:3.5,                        // ovr45=2000만, +10마다 x3.5
  SALARY_RATE:0.22, SALARY_MIN:1500,
  LEAGUE_VALUE:{1:1.15,2:1.0,3:0.9,JP:1.6,US:2.4,TW:1.1,MX:1.1,AU:0.85,CB:0.95},
  // 해외 가상 무대 (실존 리그·구단과 무관한 가상 설정)
  LEAGUES:{JP:{name:'동양 프로리그',style:'일본풍',games:140,roster:26},US:{name:'대륙 리그',style:'북미풍',games:140,roster:26},
    TW:{name:'포모사 리그',style:'대만풍',games:120,roster:24},MX:{name:'아즈텍 리그',style:'멕시코풍',games:90,roster:24},
    AU:{name:'남십자성 윈터리그',style:'호주풍',games:40,roster:22,winter:true},CB:{name:'카리브 윈터리그',style:'카리브풍',games:50,roster:22,winter:true}},
  BUY_MIN:{US:70,JP:64,TW:58,MX:59},
  // 감독으로 맡을 수 있는 해외 무대의 경제 (만원)
  ECON:{JP:{ticket:8000,sponsor:250000,overhead:120000,dividend:[120000,100000,80000,60000,50000,40000]},TW:{ticket:2500,sponsor:60000,overhead:25000,dividend:[40000,30000,22000,16000]}},
  JOB_LEAGUES:['TW','JP'], REP_NEED:{1:58,2:44,3:32,TW:47,JP:63},
  DISPATCH:{max:4,fee:{AU:300,CB:500},maxAge:25,share:{'주전':0.95,'주전 경쟁':0.6,'백업':0.3,'벤치':0.1}},
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
const TWS=['천','린','황','장','리','왕','우','류','차이','양','쉬','정','셰','훙','궈','쩡','랴오','라이','저우','예'];
const TWG=['즈하오','웨이','쥔제','청언','보원','위천','관위','쯔쉬안','자하오','이천','핀루이','칭룽','젠훙','밍제','성안','쉬안','하오위','쥔훙'];
const ESF=['호세','루이스','카를로스','미겔','후안','라파엘','펠릭스','라몬','훌리오','안드레스','에두아르도','빅토르','레오넬','라울','다니엘','헤수스','마누엘','프란시스코','오마르','엔리케'];
const ESL=['로드리게스','마르티네스','곤살레스','에르난데스','페레스','산체스','라미레스','토레스','플로레스','디아스','크루스','레예스','모랄레스','오르티스','구티에레스','차베스','멘도사','바르가스','카스티요','게레로'];
function genName(nat){if(nat==='JP')return pick(JS)+' '+pick(JG);if(nat==='US'||nat==='AU')return pick(UF)+' '+pick(UL);if(nat==='TW')return pick(TWS)+' '+pick(TWG);if(nat==='MX'||nat==='CB')return pick(ESF)+' '+pick(ESL);return pick(KS)+pick(KG);}
const NAT_KO={KR:'한국',JP:'일본',US:'미국',TW:'대만',MX:'멕시코',AU:'호주',CB:'카리브'};
const TEAM_NAMES={
  KR:[['한강 유니콘스','#1d4ed8'],['해운 돌핀스','#0e7490'],['서라벌 피닉스','#b91c1c'],['금강 썬더스','#ca8a04'],['남한산 호크스','#7c3aed'],['청해 마린스','#0369a1'],['달구벌 블레이즈','#ea580c'],['태백 그리즐리','#78350f'],
      ['영산 스톰','#4338ca'],['울림 팰컨스','#be123c'],['서해 세일러스','#0f766e'],['가야 워리어스','#9a3412'],['소백 울브스','#475569'],['설악 콘도르스','#1e3a8a'],['한라 오션스','#0891b2'],['동해 라이트닝','#a16207'],
      ['비슬 스패로우스','#15803d'],['금호 레드폭스','#dc2626'],['낙동 캣피시','#3f6212'],['수성 비버스','#92400e'],['팔공 램스','#6d28d9'],['영일 시걸스','#0e7490'],['강화 머스탱스','#b45309'],['진주 펄스','#be185d']],
  JP:[['도쿄 선라이즈','#dc2626'],['오사카 타이푼','#1d4ed8'],['삿포로 스노우즈','#0ea5e9'],['후쿠오카 플레임즈','#ea580c'],['나고야 샤치','#eab308'],['히로시마 레드윙스','#b91c1c']],
  US:[['뉴저지 메트로스','#2563eb'],['텍사스 롱혼스','#9a3412'],['캘리포니아 서퍼스','#0891b2'],['시카고 윈즈','#1e40af'],['플로리다 게이터즈','#15803d'],['애틀랜타 피치스','#db2777']],
  TW:[['타이베이 드래곤스','#b91c1c'],['가오슝 오션스','#0369a1'],['타이중 라이온스','#ca8a04'],['타이난 버팔로스','#3f6212']],
  MX:[['몬테레이 술타네스','#1e3a8a'],['멕시코시티 디아블로스','#dc2626'],['과달라하라 마리아치스','#7c3aed'],['티후아나 토로스','#92400e'],['칸쿤 티부로네스','#0e7490'],['유카탄 레오네스','#b45309']],
  AU:[['시드니 웨이브','#0ea5e9'],['멜버른 스톰','#4338ca'],['퍼스 히트','#ea580c'],['브리즈번 쿠카스','#15803d']],
  CB:[['산토도밍고 티그레스','#b91c1c'],['카라카스 아길라스','#1d4ed8'],['산후안 크리오요스','#be185d'],['파나마 카누테로스','#0f766e']]
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
  else{t.cash=BAL.OVERSEAS_CASH[league];t.rep=league==='US'?ri(85,98):league==='JP'?ri(70,85):league==='AU'?ri(30,45):ri(45,65);}
  t.cash=Math.round(t.cash);
  return t;
}
function newFin(){return {tickets:0,sponsor:0,dividend:0,sales:0,salary:0,buys:0,scout:0,facility:0,other:0,dispatch:0};}
function levelOf(t){return t.league==='KR'?BAL.LEVEL_OVR['KR'+t.div]:BAL.LEVEL_OVR[t.league];}
function addToTeam(p,t,contract,dev){p.teamId=t.id;(dev?t.dev:t.roster).push(p.id);p.contract=contract;}
function devCap(t){return BAL.DEV_BASE+(t.fac?t.fac.youth:1);}
function fillRoster(t){
  const lvl=levelOf(t);const nat=t.league==='KR'?'KR':t.league;
  const have={};for(const pid of t.roster)have[S.players[pid].pos]=(have[S.players[pid].pos]||0)+1;
  const size=t.league==='KR'?26:(BAL.LEAGUES[t.league]?BAL.LEAGUES[t.league].roster:26);
  for(const pos of ROSTER_TEMPLATE){if(t.roster.length>=size)break;if(have[pos]>0){have[pos]--;continue;}
    const p=genPlayer({pos,lvl,nat:(t.league==='KR'?(rnd()<0.08?pick(['US','JP','TW','MX']):'KR'):(rnd()<0.1?pick(['KR','US','MX']):nat))});
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

// ===================== 코어 (B: 경기 엔진) =====================
function ensureBox(lg,pid){if(!lg.box[pid])lg.box[pid]={g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,so:0,r:0,rbi:0,pG:0,pGS:0,pOuts:0,pH:0,pR:0,pER:0,pBB:0,pSO:0,pPit:0,pW:0,pL:0,pSV:0};return lg.box[pid];}
function effAttr(p,k){let v=p.attrs[k]+(p.cond||0)+((p.morale||60)-60)*0.04;const f=p.fatigue||0;if(f>70)v-=(f-70)*0.25;return clamp(v,10,99);}
function pitchLimit(p){return p.pos==='SP'?p.attrs.stamina*0.9+30:p.attrs.stamina*0.45+14;}
function pitEff(lg,p){const pc=lg.pc[p.id]||0;const over=Math.max(0,pc-pitchLimit(p));return clamp(1-over*0.006,0.6,1);}
function teamSide(lg,side){return S.teams[side===1?lg.home:lg.away];}
function teamDef(lg,side){let s=0,w=0;const wt={C:1.3,SS:1.4,'2B':1.2,CF:1.3,'3B':1,LF:0.8,RF:0.9,'1B':0.7};for(const pid of lg.lineup[side]){const pos=lg.pos[side][pid];if(!pos||pos==='DH')continue;const p=S.players[pid];const d=clamp(p.attrs.defense-posPenalty(p,pos),10,99);const k=wt[pos]||1;s+=d*k;w+=k;}return w?s/w:50;}

function createGame(homeId,awayId,userGame){
  const H=S.teams[homeId],A=S.teams[awayId];
  const lg={home:homeId,away:awayId,inn:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],innScores:[[],[]],halfRuns:0,
    lineup:[[...A.lineup],[...H.lineup]],pos:[{...A.pos},{...H.pos}],bat:[0,0],pitcher:[null,null],used:[[],[]],subbed:[[],[]],pc:{},box:{},log:[],done:false,finalized:false,
    por:[null,null],lossP:null,leadSide:-1,entryLead:{},userGame:!!userGame,paCount:0,hits:[0,0],last:null};
  for(const side of [0,1]){const t=side===1?H:A;let sp=t.rotation.length?t.rotation[t.rotIdx%t.rotation.length]:null;
    if(sp==null||!S.players[sp]){sp=t.roster.map(id=>S.players[id]).filter(isPitcher)[0]?.id;}
    if(t.rotation.length)t.rotIdx=(t.rotIdx+1)%t.rotation.length;
    lg.pitcher[side]=sp;lg.used[side].push(sp);const b=ensureBox(lg,sp);b.pGS=1;b.pG=1;lg.entryLead[sp]=0;}
  for(const side of [0,1])for(const pid of lg.lineup[side]){const b=ensureBox(lg,pid);b.g=1;}
  glog(lg,`경기 시작: ${A.name} (원정) vs ${H.name} (홈)`,'info');
  return lg;
}
function glog(lg,text,type){lg.log.push({inn:lg.inn,half:lg.half,text,type:type||'n'});if(lg.log.length>400)lg.log.splice(0,lg.log.length-400);}
function curBatter(lg){return S.players[lg.lineup[lg.half][lg.bat[lg.half]]];}
function curPitcher(lg){return S.players[lg.pitcher[1-lg.half]];}

function scoreRun(lg,bs,runner,rbi,batterBox){
  lg.score[bs]++;lg.halfRuns++;
  const rb=ensureBox(lg,runner.pid);rb.r++;
  if(rbi&&batterBox)batterBox.rbi++;
  const pb=ensureBox(lg,runner.resp);pb.pR++;pb.pER++;
  const diff=lg.score[1]-lg.score[0];const ls=diff>0?1:diff<0?0:-1;
  if(ls!==lg.leadSide){if(ls!==-1){lg.por[ls]=lg.pitcher[ls];lg.lossP=lg.pitcher[1-ls];}lg.leadSide=ls;}
}
function addOut(lg,n){const pb=ensureBox(lg,lg.pitcher[1-lg.half]);lg.outs+=n;pb.pOuts+=n;}
function spd(pid){return S.players[pid]?effAttr(S.players[pid],'speed'):50;}
function fast(pid){const p=S.players[pid];return p&&p.traits.includes('빠른발')?8:0;}

function doPitch(lg){
  if(lg.done)return null;
  const bs=lg.half,fs=1-bs;
  const B=curBatter(lg),P=curPitcher(lg);
  const bb=ensureBox(lg,B.id),pb=ensureBox(lg,P.id);
  const eff=pitEff(lg,P);
  const ctl=effAttr(P,'control')*eff,stf=effAttr(P,'stuff')*eff,mov=effAttr(P,'movement')*eff;
  let con=effAttr(B,'contact'),pow=effAttr(B,'power'),eye=effAttr(B,'eye'),sp=effAttr(B,'speed');
  const risp=lg.bases[1]||lg.bases[2];
  if(risp&&B.traits.includes('클러치')){con+=4;pow+=4;}
  if(risp&&B.traits.includes('유리멘탈')){con-=3;eye-=3;}
  lg.pc[P.id]=(lg.pc[P.id]||0)+1;pb.pPit++;
  let zone=clamp(0.40+ctl*0.0032,0.45,0.78);if(lg.balls>=2)zone+=0.06;if(lg.strikes===2)zone-=0.07;if(lg.balls===3)zone+=0.05;
  const inZone=rnd()<zone;
  let swing;
  if(inZone)swing=0.62+(lg.strikes===2?0.25:0)-(lg.balls===3&&lg.strikes<2?0.2:0)+(lg.balls===0&&lg.strikes===0?-0.15:0);
  else swing=0.25-(eye-50)*0.004+(lg.strikes===2?0.15:0)-(lg.balls===3?0.12:0)+(lg.balls===0&&lg.strikes===0?-0.1:0);
  swing=clamp(swing,0.05,0.95);
  let res;
  if(rnd()>=swing)res=inZone?'strike':'ball';
  else{let cp=clamp(0.76+(con-50)*0.0045-(stf-50)*0.004+(inZone?0.06:-0.14),0.3,0.95);if(rnd()>=cp)res='whiff';else res=rnd()<0.46?'foul':'inplay';}
  let ev={type:res,text:'',paEnd:false};
  const cnt=()=>`(${lg.balls}B-${lg.strikes}S)`;
  if(res==='ball'){lg.balls++;ev.text=`볼 ${cnt()}`;if(lg.balls===4){doWalk(lg,B,bb,pb);ev.type='walk';ev.text=`${B.name} 볼넷`;ev.paEnd=true;}}
  else if(res==='strike'||res==='whiff'){lg.strikes++;ev.text=(res==='whiff'?'헛스윙 ':'')+`스트라이크 ${cnt()}`;if(lg.strikes===3){bb.ab++;bb.so++;pb.pSO++;addOut(lg,1);ev.type='so';ev.text=`${B.name} 삼진 아웃 (${lg.outs}아웃)`;ev.paEnd=true;}}
  else if(res==='foul'){if(lg.strikes<2)lg.strikes++;ev.text=`파울 ${cnt()}`;}
  else{ev=resolveInPlay(lg,B,P,bb,pb,con,pow,sp,stf,mov);ev.paEnd=true;}
  lg.last=ev;
  if(ev.paEnd)endPA(lg,ev);
  else glog(lg,ev.text,'p');
  return ev;
}
function doWalk(lg,B,bb,pb){
  bb.bb++;pb.pBB++;const b=lg.bases,P=lg.pitcher[1-lg.half];
  if(b[0]){if(b[1]){if(b[2])scoreRun(lg,lg.half,b[2],true,bb);b[2]=b[1];}b[1]=b[0];}
  b[0]={pid:B.id,resp:P};
}
function advRunners(lg,hitType,B,bb,def){
  const bs=lg.half,b=lg.bases,P=lg.pitcher[1-lg.half];const nb=[null,null,null];let runs=0;
  const score=(r)=>{scoreRun(lg,bs,r,true,bb);runs++;};
  if(hitType==='hr'){for(const r of [b[2],b[1],b[0]])if(r)score(r);score({pid:B.id,resp:P});}
  else if(hitType==='3b'){for(const r of [b[2],b[1],b[0]])if(r)score(r);nb[2]={pid:B.id,resp:P};}
  else if(hitType==='2b'){if(b[2])score(b[2]);if(b[1])score(b[1]);if(b[0]){if(rnd()<0.45+(spd(b[0].pid)+fast(b[0].pid)-50)*0.006-(def-50)*0.003)score(b[0]);else nb[2]=b[0];}nb[1]={pid:B.id,resp:P};}
  else{ // single
    if(b[2])score(b[2]);
    if(b[1]){if(rnd()<0.62+(spd(b[1].pid)+fast(b[1].pid)-50)*0.006-(def-50)*0.003)score(b[1]);else nb[2]=b[1];}
    if(b[0]){if(!nb[2]&&rnd()<0.28+(spd(b[0].pid)+fast(b[0].pid)-50)*0.005)nb[2]=b[0];else nb[1]=b[0];}
    nb[0]={pid:B.id,resp:P};
  }
  lg.bases=nb;return runs;
}
function resolveInPlay(lg,B,P,bb,pb,con,pow,sp,stf,mov){
  bb.ab++;const bs=lg.half,fs=1-bs;const def=teamDef(lg,fs);const before=lg.outs;
  let hrP=clamp(0.015+(pow-50)*0.0015-(stf-50)*0.0005-(mov-50)*0.0003,0.002,0.14);if(B.traits.includes('장타본능'))hrP*=1.25;
  const ev={type:'',text:'',paEnd:true};
  const ro=()=>lg.outs>0?` (${lg.outs}아웃)`:'';
  if(rnd()<hrP){bb.h++;bb.hr++;pb.pH++;const runs=advRunners(lg,'hr',B,bb,def);lg.hits[bs]++;ev.type='hr';ev.text=`${B.name} ${runs>1?runs+'점 ':''}홈런!`;return ev;}
  const hitP=clamp(0.34+(con-50)*0.003+(sp-50)*0.001-(def-50)*0.003-(mov-50)*0.0018,0.15,0.5);
  if(rnd()<hitP){
    bb.h++;pb.pH++;lg.hits[bs]++;
    const xb=clamp(0.17+(pow-50)*0.0035+(sp-50)*0.0012,0.05,0.45);const r=rnd();
    let type='1b';if(r<xb*0.1+Math.max(0,(sp-50))*0.0006)type='3b';else if(r<xb)type='2b';
    if(type==='3b'){bb.d3++;}else if(type==='2b'){bb.d2++;}
    const runs=advRunners(lg,type,B,bb,def);
    ev.type=type;ev.text=`${B.name} ${type==='3b'?'3루타':type==='2b'?'2루타':'안타'}${runs?` (${runs}득점)`:''}`;return ev;
  }
  const gP=clamp(0.52+(mov-50)*0.003-(pow-50)*0.002,0.3,0.75);const b=lg.bases;
  if(rnd()<gP){
    if(before<2&&b[0]){
      const dp=clamp(0.36-(sp-50)*0.005-(spd(b[0].pid)-50)*0.002+(def-50)*0.003,0.08,0.7);
      if(rnd()<dp){addOut(lg,2);if(before===0){if(b[2])scoreRun(lg,bs,b[2],false,bb);lg.bases=[null,null,b[1]||null];}else lg.bases=[null,null,null];
        ev.type='dp';ev.text=`${B.name} 병살타${ro()}`;return ev;}
    }
    addOut(lg,1);ev.type='go';let extra='';
    if(before<2){const nb=[b[0],null,null];if(b[2]){if(rnd()<0.5){scoreRun(lg,bs,b[2],true,bb);extra=' (1득점)';}else nb[2]=b[2];}if(b[1]){if(!nb[2]&&rnd()<0.5)nb[2]=b[1];else nb[1]=b[1];}lg.bases=nb;}
    ev.text=`${B.name} 땅볼 아웃${extra}${ro()}`;return ev;
  }
  addOut(lg,1);ev.type='fo';let extra='';
  if(before<2){const nb=[b[0],b[1],null];if(b[2]){if(rnd()<0.65){scoreRun(lg,bs,b[2],true,bb);extra=' 희생플라이 (1득점)';}else nb[2]=b[2];}if(b[1]&&!nb[2]&&rnd()<0.22){nb[2]=b[1];nb[1]=null;}lg.bases=nb;}
  ev.text=`${B.name} 뜬공 아웃${extra}${ro()}`;return ev;
}
function endPA(lg,ev){
  const bs=lg.half;const bb=ensureBox(lg,lg.lineup[bs][lg.bat[bs]]);bb.pa++;lg.paCount++;
  lg.balls=0;lg.strikes=0;lg.bat[bs]=(lg.bat[bs]+1)%lg.lineup[bs].length;
  glog(lg,ev.text,ev.type);
  if(lg.half===1&&lg.inn>=9&&lg.score[1]>lg.score[0]){finishGameState(lg,true);return;}
  if(lg.outs>=3){endHalf(lg);return;}
  aiPitchCheck(lg,1-bs,false);
}
function endHalf(lg){
  const bs=lg.half;lg.innScores[bs][lg.inn-1]=lg.halfRuns;lg.halfRuns=0;lg.outs=0;lg.bases=[null,null,null];lg.balls=0;lg.strikes=0;
  if(bs===0){if(lg.inn>=9&&lg.score[1]>lg.score[0]){finishGameState(lg,false);return;}lg.half=1;}
  else{if(lg.inn>=9&&lg.score[0]!==lg.score[1]){finishGameState(lg,false);return;}lg.inn++;lg.half=0;}
  glog(lg,`${lg.inn}회 ${lg.half===0?'초':'말'} — ${S.teams[lg.away].name} ${lg.score[0]} : ${lg.score[1]} ${S.teams[lg.home].name}`,'inn');
  aiPitchCheck(lg,1-lg.half,true);
}
function finishGameState(lg,walkoff){
  lg.done=true;const w=lg.score[1]>lg.score[0]?1:0;
  const wp=lg.por[w],lp=lg.lossP;if(wp!=null)ensureBox(lg,wp).pW=1;if(lp!=null)ensureBox(lg,lp).pL=1;
  const fp=lg.pitcher[w];if(fp!=null&&fp!==wp){const el=lg.entryLead[fp];if(el!=null&&el>0&&el<=3)ensureBox(lg,fp).pSV=1;}
  glog(lg,`경기 종료${walkoff?' (끝내기)':''}: ${S.teams[lg.away].name} ${lg.score[0]} : ${lg.score[1]} ${S.teams[lg.home].name}`,'end');
}
function availableBullpen(lg,side){const t=teamSide(lg,side);return t.bullpen.filter(id=>!lg.used[side].includes(id)&&S.players[id]&&!S.players[id].retired&&(S.players[id].fatigue||0)<78);}
function bench(lg,side){const t=teamSide(lg,side);return t.roster.filter(id=>{const p=S.players[id];return p&&!p.retired&&!isPitcher(p)&&!lg.lineup[side].includes(id)&&!lg.subbed[side].includes(id);});}
function changePitcher(lg,side,newPid){
  if(lg.done||lg.pitcher[side]===newPid)return false;
  const t=teamSide(lg,side);if(!t.roster.includes(newPid)||lg.used[side].includes(newPid))return false;
  const old=S.players[lg.pitcher[side]];const np=S.players[newPid];
  lg.pitcher[side]=newPid;lg.used[side].push(newPid);const b=ensureBox(lg,newPid);b.pG=1;lg.entryLead[newPid]=lg.score[side]-lg.score[1-side];
  glog(lg,`${t.name} 투수 교체: ${old?old.name:'?'} → ${np.name}`,'sub');return true;
}
function pinchHit(lg,side,benchPid){
  if(lg.done||lg.half!==side)return false;
  const t=teamSide(lg,side);if(!bench(lg,side).includes(benchPid))return false;
  const idx=lg.bat[side];const old=lg.lineup[side][idx];lg.lineup[side][idx]=benchPid;lg.pos[side][benchPid]=lg.pos[side][old];delete lg.pos[side][old];lg.subbed[side].push(old);
  const b=ensureBox(lg,benchPid);b.g=1;glog(lg,`${t.name} 대타: ${S.players[old].name} → ${S.players[benchPid].name}`,'sub');return true;
}
function aiPitchCheck(lg,side,halfStart){
  if(lg.done)return;const t=teamSide(lg,side);const P=S.players[lg.pitcher[side]];if(!P)return;
  const pc=lg.pc[P.id]||0,lim=pitchLimit(P),pb=ensureBox(lg,P.id);
  const lead=lg.score[side]-lg.score[1-side];const avail=availableBullpen(lg,side);if(!avail.length)return;
  const closer=t.closer!=null&&avail.includes(t.closer)?t.closer:null;
  const saveSpot=halfStart&&lg.inn>=9&&lead>0&&lead<=3&&closer!=null&&P.id!==closer;
  let need=false;
  if(pc>lim+12)need=true;else if(pc>lim&&(halfStart||lg.outs===0))need=true;
  else if(P.pos==='SP'&&pb.pR>=6&&lg.inn>=4)need=true;else if(P.pos==='RP'&&pb.pR>=3&&lg.outs<3)need=true;
  if(saveSpot&&(pc>lim*0.75||P.pos==='RP')){changePitcher(lg,side,closer);return;}
  if(!need)return;
  let pickId;if(lg.inn>=9&&lead>0&&lead<=3&&closer!=null)pickId=closer;else{const nonC=avail.filter(id=>id!==closer);const pool=nonC.length?nonC:avail;pool.sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]));pickId=lg.inn>=7?pool[0]:pool[Math.min(pool.length-1,Math.floor(pool.length/2))];}
  changePitcher(lg,side,pickId);
}
// ---- 진행 단위 (모두 동일 엔진) ----
function stepPitch(lg){return doPitch(lg);}
function stepPA(lg){const c=lg.paCount;let ev=null;while(!lg.done&&lg.paCount===c)ev=doPitch(lg);return ev;}
function stepHalf(lg){const h=lg.inn*2+lg.half;let ev=null;while(!lg.done&&lg.inn*2+lg.half===h)ev=doPitch(lg);return ev;}
function stepGame(lg){let n=0;while(!lg.done&&n<20000){doPitch(lg);n++;}return lg.last;}
// ---- 기록 반영 (중복 방지) ----
function finalizeGame(lg){
  if(!lg.done||lg.finalized)return;lg.finalized=true;
  const H=S.teams[lg.home],A=S.teams[lg.away];
  const hw=lg.score[1]>lg.score[0];
  H.rec[hw?'w':'l']++;A.rec[hw?'l':'w']++;H.rec.rs+=lg.score[1];H.rec.ra+=lg.score[0];A.rec.rs+=lg.score[0];A.rec.ra+=lg.score[1];
  for(const pid in lg.box){const p=S.players[pid];if(!p)continue;const b=lg.box[pid];const c=p.cur;for(const k in b)c[k]=(c[k]||0)+b[k];
    if(b.pG){p.fatigue=Math.min(100,(p.fatigue||0)+b.pPit*0.55);p.xp+=b.pOuts;}
    else if(b.g){p.fatigue=Math.min(100,(p.fatigue||0)+5);p.xp+=b.pa;}
  }
  if(lg.gameRef){const g=S.schedule[lg.gameRef];if(g&&!g.res)g.res={hs:lg.score[1],as:lg.score[0]};}
}

// ===================== 코어 (C: 시즌/육성/경제/이적/해외/저장) =====================
function userTeam(){return S.teams[S.userTeamId];}
function P_(id){return S.players[id];}
function krTeams(){return Object.values(S.teams).filter(t=>t.league==='KR');}
function divTeams(div){return krTeams().filter(t=>t.div===div);}
function compOf(t){return t.league==='KR'?t.div:t.league;}
function compTeams(c){return typeof c==='number'?divTeams(c):Object.values(S.teams).filter(t=>t.league===c);}
function compName(c){return typeof c==='number'?c+'부':(BAL.LEAGUES[c]?BAL.LEAGUES[c].name:String(c));}
function playLg(){const t=userTeam();return t&&t.league!=='KR'?t.league:null;}
function liveTeams(){const pl=playLg();return pl?krTeams().concat([userTeam()]):krTeams();}
function econ(t){if(t.league==='KR')return {ticket:BAL.TICKET[t.div],sponsor:BAL.SPONSOR[t.div],overhead:BAL.OVERHEAD[t.div],dividend:BAL.DIVIDEND[t.div]};return BAL.ECON[t.league]||{ticket:2000,sponsor:50000,overhead:20000,dividend:[20000]};}
function news(text,kind){S.news.unshift({s:S.season,d:S.phase==='season'?S.day:'OFF'+S.week,text,kind:kind||'n'});if(S.news.length>120)S.news.length=120;}
function warn(text){S.warn.push(text);}

// ---------- 새 게임 ----------
function newGame(seed,userIdx){
  S={version:VERSION,seed:seed|0,rng:seed|0,nextId:1,season:1,day:1,phase:'season',week:0,clock:1,userTeamId:null,teams:{},players:{},schedule:[],liveGame:null,fa:[],
     market:{listed:[],offers:[],negs:[],attempts:{},scoutResults:null},youth:[],pendingFA:[],news:[],history:[],overseas:{hist:[]},tutorialDone:false,nextOfferId:1,warn:[],lastSummary:null,draft:null,settings:{stopOnOffer:true},pins:[],dispatch:null,mgr:{seasons:[],cur:null}};
  TEAM_NAMES.KR.forEach(([n,c],i)=>{const t=genTeam(n,c,'KR',Math.floor(i/8)+1,false);S.teams[t.id]=t;});
  for(const lg in BAL.LEAGUES)TEAM_NAMES[lg].forEach(([n,c])=>{const t=genTeam(n,c,lg,0,false);S.teams[t.id]=t;});
  const d3=divTeams(3);const ut=d3[clamp(userIdx|0,0,d3.length-1)];ut.isUser=true;S.userTeamId=ut.id;
  for(const t of Object.values(S.teams)){fillRoster(t);autoLineup(t);}
  for(const id in S.players){const p=S.players[id];p.snap=snapOf(p);}
  for(const pid of ut.roster){const p=P_(pid);p.userLink=true;if(p.age<=23)p.devStart=r1(calcOvr(p));p.ovrStart=r1(calcOvr(p));if(p.contract.years<2)p.contract.years=2;p.scout=makeScout(p,0.45);p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([1,calcValue(p)]);}
  for(let i=0;i<40;i++){const p=genPlayer({pos:pick(ROSTER_TEMPLATE),lvl:BAL.LEVEL_OVR.FA,nat:rnd()<0.1?pick(['US','JP']):'KR'});S.players[p.id]=p;S.fa.push(p.id);}
  genSchedule();
  for(const t of krTeams())applySponsor(t);
  mgrStart();
  news(`${ut.name}의 단장으로 부임했습니다. 3부 리그에서 기적을 만들어 보세요.`,'sys');
  return S;
}
function registerPlayer(p){S.players[p.id]=p;return p;}
function genSchedule(){
  S.schedule=[];
  for(let div=1;div<=3;div++){
    const arr=divTeams(div).map(t=>t.id);const rounds=[];
    for(let r=0;r<7;r++){const pairs=[];for(let i=0;i<4;i++){const a=arr[i],b=arr[7-i];pairs.push(((r+i)%2===0)?[a,b]:[b,a]);}rounds.push(pairs);arr.splice(1,0,arr.pop());}
    for(let c=0;c<4;c++)for(let r=0;r<7;r++){const day=c*7+r+1;for(const [h,a] of rounds[r]){const flip=(c===1||c===2);S.schedule.push({day,div,home:flip?a:h,away:flip?h:a,res:null});}}
  }
  const pl=playLg();if(pl){const arr=compTeams(pl).map(t=>t.id);const n=arr.length;const R=n-1,half=n/2;const rounds=[];
    for(let r=0;r<R;r++){const pairs=[];for(let i=0;i<half;i++){const a=arr[i],b=arr[n-1-i];pairs.push(((r+i)%2===0)?[a,b]:[b,a]);}rounds.push(pairs);arr.splice(1,0,arr.pop());}
    for(let d=1;d<=BAL.SEASON_GAMES;d++){const c=Math.floor((d-1)/R),r=(d-1)%R;for(const [h,a] of rounds[r]){const flip=c%2===1;S.schedule.push({day:d,div:pl,home:flip?a:h,away:flip?h:a,res:null});}}}
  S.schedule.sort((a,b)=>a.day-b.day||a.div-b.div);
}
function h2h(a,b){let w=0;for(const g of S.schedule){if(!g.res)continue;if(g.home===a&&g.away===b){if(g.res.hs>g.res.as)w++;}else if(g.home===b&&g.away===a){if(g.res.as>g.res.hs)w++;}}return w;}
function standings(div){const ts=compTeams(div);ts.sort((a,b)=>b.rec.w-a.rec.w||h2h(b.id,a.id)-h2h(a.id,b.id)||(b.rec.rs-b.rec.ra)-(a.rec.rs-a.rec.ra)||b.rec.rs-a.rec.rs||a.id-b.id);return ts;}
function rankOf(t){return standings(compOf(t)).findIndex(x=>x.id===t.id)+1;}
function isUserGame(g){return g.home===S.userTeamId||g.away===S.userTeamId;}
function userGameToday(){return S.schedule.find(g=>g.day===S.day&&isUserGame(g))||null;}
function payroll(t){let s=0;for(const pid of t.roster.concat(t.dev||[])){const p=P_(pid);if(p&&p.contract)s+=p.contract.salary;}return s;}

// ---------- 경기일 진행 ----------
function startDay(){
  if(S.phase!=='season')return null;if(S.liveGame)return S.liveGame;
  S.schedule.forEach((g,i)=>{if(g.day!==S.day||g.res||isUserGame(g))return;const lg=createGame(g.home,g.away,false);lg.gameRef=i;stepGame(lg);finalizeGame(lg);});
  const idx=S.schedule.findIndex(g=>g.day===S.day&&isUserGame(g));
  if(idx>=0&&!S.schedule[idx].res){const g=S.schedule[idx];fixLineup(userTeam());const lg=createGame(g.home,g.away,true);lg.gameRef=idx;S.liveGame=lg;return lg;}
  return null;
}
function endUserGame(){const lg=S.liveGame;if(!lg||!lg.done)return null;finalizeGame(lg);const summary={lg};S.liveGame=null;finishDay();return summary;}
function finishDay(){
  S.warn=[];const d=S.day;
  for(const t of liveTeams()){const pay=Math.round(payroll(t)/BAL.SEASON_GAMES);t.cash-=pay;t.fin.salary+=pay;}
  for(const g of S.schedule){if(g.day!==d||!g.res)continue;const h=S.teams[g.home];if(h.league!=='KR'&&!h.isUser)continue;const inc=ticketIncome(h);h.cash+=inc;h.fin.tickets+=inc;}
  for(const pid in S.players){const p=S.players[pid];if(p.retired||p.teamId==null)continue;const t=S.teams[p.teamId];if(!t||(t.league!=='KR'&&t.league!==playLg()))continue;
    const rec=BAL.FATIGUE_RECOVER+(t.fac.train-1)*2+(p.traits.includes('강철체력')?6:0);p.fatigue=Math.max(0,(p.fatigue||0)-rec);
    p.cond=clamp((p.cond||0)*0.85+gauss()*1.3,-6,6);}
  marketTick(0.12);
  if(d%7===0){for(const t of liveTeams()){for(const pid of t.roster)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t});for(const pid of t.dev)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t,dev:true});}
    for(const pid of userTeam().roster)improveScout(P_(pid),0.06);}
  if(d===14){checkPromises();interestCheck();}
  S.day++;S.clock++;
  const ut=userTeam();if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 선수 판매, 긴급 대출(재정 탭) 등 회복 조치가 필요합니다.`);
  if(S.day>BAL.SEASON_GAMES)endSeason();
}
function ticketIncome(t){const wp=(t.rec.w+t.rec.l)?t.rec.w/(t.rec.w+t.rec.l):0.5;return Math.round(econ(t).ticket*(0.7+t.rep/100*0.6)*(0.8+wp*0.4)*(0.9+rnd()*0.2));}
function applySponsor(t){const inc=Math.round(econ(t).sponsor*(0.7+t.rep/100*0.6));t.cash+=inc;t.fin.sponsor+=inc;}
function playDayAuto(){const lg=startDay();if(lg){stepGame(lg);return endUserGame();}else{finishDay();return null;}}

// ---------- 육성 ----------
function growthTick(p,ctx){
  if(!p||p.retired)return;const ovr0=calcOvr(p);const isP=isPitcher(p);const ovr=calcOvr(p);const peak=p.peakAge;const f=[];
  let expF;
  if(ctx.kind==='winter'){expF=0.7;f.push('국내 동계 훈련');}
  else if(ctx.kind==='dispatch'){const dd=ctx.dd;const lvlF=clamp(1+((BAL.LEVEL_OVR[dd.lg]||55)-ovr0)*0.02,0.8,1.25);expF=0.3+0.8*dd.share*lvlF;f.push(`${BAL.LEAGUES[dd.lg].name} 파견 (${dd.role})`);if(dd.share<0.35)f.push('파견지 출장 부족');else if(lvlF>1.05)f.push('수준 높은 실전 경험');}
  else if(ctx.dev){expF=BAL.DEV_EXP;f.push('육성군 경기 출장');}
  else{const target=isP?BAL.XP_TARGET_PIT:BAL.XP_TARGET_BAT;const ratio=(p.xp||0)/target;expF=0.4+0.6*Math.pow(Math.min(1,ratio),0.7);
    if(ratio>1.7){expF-=0.15;f.push('과도한 출장(피로)');}else if(ratio>=0.8)f.push('주전 출장');else if(ratio>=0.3)f.push('일부 출장');else f.push('출장 기회 부족');
    if(ctx.team&&ctx.team.locks&&ctx.team.locks[p.id]&&p.age<=24){expF+=0.05;f.push('출장 보장(육성 약속)');}
    if(ratio<0.3&&p.age>=23&&p.age<peak)p.pot=Math.max(ovr,p.pot-0.25);}
  const fat=p.fatigue||0;if(fat>80){expF*=0.8;f.push('피로 누적');}
  const gap=p.pot-ovr;const gapF=clamp(gap/18,0,1.3);const a=p.age;
  let ageF=a<peak-1?1:a<=peak+1?0.45:0;if(a<=21)ageF*=1.15;
  const fac=ctx.team?ctx.team.fac.train:1;const facF=1+(fac-1)*0.12;if(fac>=2)f.push(`훈련장 Lv.${fac} 효과`);
  let traitF=1;if(p.traits.includes('성실')){traitF+=0.3;f.push('성실한 태도');}if(p.traits.includes('게으름')){traitF-=0.3;f.push('훈련 태만');}
  const wint=ctx.kind==='winter'||ctx.kind==='dispatch';
  let pts=BAL.GROWTH_TICK*(wint?1.8:1)*expF*gapF*ageF*facF*traitF*(0.7+rnd()*0.6);
  if(gap<=0.5&&ageF>0)pts=rnd()*0.25;
  const keys=isP?PIT_KEYS:BAT_KEYS;const focus=p.focus||'balance';const ch={};
  const fkey=focus==='balance'?null:focus;
  for(const k of keys){const w=fkey?(k===fkey?0.4:0.6/(keys.length-1)):1/keys.length;const hiF=clamp(1-(p.attrs[k]-60)/55,0.25,1);const dlt=pts*w*(0.6+rnd()*0.8)*hiF;p.attrs[k]=Math.min(99,p.attrs[k]+dlt);ch[k]=dlt;}
  if(fkey&&pts>0.3)f.unshift(`${(isP?FOCUS_PIT:FOCUS_BAT)[focus]} 집중 훈련`);
  if(a>peak+1){const yrs=Math.min(6,a-peak-1);let dec=BAL.DECLINE_PER_TICK*yrs*(wint?2.2:1)*(0.7+rnd()*0.6);if(p.traits.includes('강철체력'))dec*=0.7;f.push('노화');
    const dw=isP?{stuff:.4,stamina:.3,control:.1,movement:.2}:{speed:.35,defense:.2,contact:.15,power:.1,eye:.05,arm:.15};
    for(const k in dw){const dlt=dec*dw[k];p.attrs[k]=Math.max(10,p.attrs[k]-dlt);ch[k]=(ch[k]||0)-dlt;}}
  for(const k of keys)p.attrs[k]=r1(p.attrs[k]);
  p.xp=0;
  if(p.userLink){const chR={};let any=false;for(const k in ch){const v=Math.round(ch[k]*10)/10;if(Math.abs(v)>=0.1){chR[k]=v;any=true;}}
    p.log.unshift({s:S.season,label:ctx.label,ch:chR,f,ovr:r1(calcOvr(p)),d:r1(calcOvr(p)-ovr0)});if(p.log.length>14)p.log.length=14;}
}

// ---------- 시장가치/제안 ----------
function aiAsk(t,p){const v=calcValue(p);let m=1.15;const sorted=t.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a));const rank=sorted.findIndex(x=>x.id===p.id);
  if(rank<5)m+=0.3;if(t.cash<0)m-=0.25;if(countPos(t,p.pos)>(NEED_TEMPLATE[p.pos]||1))m-=0.1;if(t.div>0&&userTeam().div>t.div&&rank<3)m+=0.25;return Math.round(v*clamp(m,0.8,2)/100)*100;}
function playerDemand(p,t){let base=Math.max(salaryFor(p),p.contract?p.contract.salary*1.1:0);const from=p.teamId!=null?S.teams[p.teamId]:null;
  if(from&&from.league==='KR'&&t.league==='KR'){if(t.div>from.div)base*=1+0.25*(t.div-from.div);else if(t.div<from.div)base*=0.95;}
  if(p.homecoming===t.id)base*=0.7;return Math.round(base/10)*10;}
function willingInfo(p,t){const from=p.teamId!=null?S.teams[p.teamId]:null;let pw=0.75;const r=[];
  if(from&&from.league==='KR'&&t.league==='KR'){if(t.div<from.div){pw=0.92;r.push('상위 리그 진출 선호');}else if(t.div>from.div){pw=p.age>=31?0.6:0.35;r.push(p.age>=31?'하위 리그지만 베테랑이라 수용 가능':'하위 리그 이동 기피');}else{pw=0.7;r.push('동급 리그 이동에 소극적');}}
  else if(from){const lf=levelOf(from),lt=levelOf(t);if(lt>=lf+3){pw=0.85;r.push('더 높은 무대 진출 희망');}else if(lt<=lf-3){pw=p.age>=31?0.55:0.3;r.push(p.age>=31?'수준은 낮지만 출장 기회를 원하는 베테랑':'수준 낮은 무대로의 이동 기피');}else{pw=0.55;r.push('비슷한 수준 무대 — 조건 중시');}
    if(from.league!=='KR'&&t.league==='KR'&&p.nat!=='KR'){pw-=0.08;r.push('타국 생활 부담');}}
  else r.push('FA — 조건 우선');
  const starter=t.roster.map(P_).filter(x=>x&&x.pos===p.pos&&x.id!==p.id).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  if(!starter||calcOvr(p)>=calcOvr(starter)){pw+=0.08;r.push('주전 출장 가능');}else{pw-=0.12;r.push('출장 역할 보장 필요 (현 주전보다 낮음)');}
  if(p.homecoming===t.id){pw=0.95;r.length=0;r.push('친정 복귀 희망');}
  if(p.traits.includes('강심장')){pw+=0.05;}
  if(t.isUser&&t.rep>=50){pw+=0.05;r.push('구단 명성 양호');}
  pw=clamp(pw,0.05,0.97);return {pw,level:pw>=0.65?'긍정적':pw>=0.4?'보통':'부정적',reasons:r};}
function willingToJoin(p,t){const from=p.teamId!=null?S.teams[p.teamId]:null;let pw=0.75;if(from&&from.league==='KR'){if(t.div<from.div)pw=0.92;else if(t.div>from.div)pw=p.age>=31?0.6:0.35;}
  if(p.homecoming===t.id)pw=0.95;if(p.traits.includes('강심장'))pw+=0.05;return pw;}

function listPlayer(pid){const p=P_(pid);if(!p||p.teamId!==S.userTeamId)return '선수를 찾을 수 없습니다.';if((p.lockUntil||0)>S.clock)return `영입 직후에는 판매 등록할 수 없습니다 (${p.lockUntil-S.clock}일 후 가능).`;if(S.market.listed.includes(pid))return '이미 등록되어 있습니다.';if(S.pendingFA.includes(pid))return '계약이 만료된 선수는 판매할 수 없습니다. 먼저 재계약하세요.';if(p.dispatch)return '겨울리그 파견 중에는 판매 등록할 수 없습니다. 복귀 후 가능합니다.';S.market.listed.push(pid);return null;}
function unlistPlayer(pid){S.market.listed=S.market.listed.filter(x=>x!==pid);}
function marketTick(rate){
  const m=S.market;
  m.offers=m.offers.filter(o=>{if(o.expires<=S.clock){if(o.type==='overseas'){const p=P_(o.pid);if(p&&p.interest)p.interest.stage=1;}return false;}return true;});
  m.negs=m.negs.filter(n=>n.expires>S.clock);
  m.listed=m.listed.filter(pid=>P_(pid)&&P_(pid).teamId===S.userTeamId);
  const ut=userTeam();
  for(const pid of m.listed){const p=P_(pid);if(m.offers.filter(o=>o.pid===pid).length>=3)continue;
    for(const t of krTeams()){if(t.isUser)continue;if(rnd()>rate)continue;if(m.offers.some(o=>o.pid===pid&&o.team===t.id))continue;makeAIOffer(t,p,false);}}
}
function makeAIOffer(t,p,unsolicited){
  const v=calcValue(p);const need=needOf(t).includes(p.pos);const starter=t.roster.map(P_).filter(x=>x.pos===p.pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  const upgrade=!starter||calcOvr(p)>calcOvr(starter)+3;
  if(!need&&!upgrade&&!unsolicited)return null;
  if(t.cash<payroll(t)*0.25+v*0.7)return null;
  let fee=v*(0.8+rnd()*0.3)*(need?1.08:1)*(t.div<userTeam().div?1.05:1);
  if((p.acquired&&p.acquired.s===S.season))fee*=0.85;
  fee=Math.min(fee,t.cash*0.5);fee=Math.round(fee/100)*100;if(fee<500)return null;
  const wi=willingInfo(p,t);const o={id:S.nextOfferId++,type:'buy',pid:p.id,team:t.id,fee,max:Math.round(fee*(1.15+rnd()*0.2)/100)*100,expires:S.clock+BAL.OFFER_EXPIRE,counters:0,status:'open',willing:rnd()<wi.pw,pw:wi.pw,reasons:wi.reasons,unsolicited:!!unsolicited};
  S.market.offers.push(o);news(`${josa(t.name,'이','가')} ${p.name}에게 ${money(fee)} 이적 제안`,'offer');return o;
}
function respondOffer(id,action,amt){
  const o=S.market.offers.find(x=>x.id===id);if(!o)return {ok:false,msg:'제안이 만료되었습니다.'};const p=P_(o.pid);const t=S.teams[o.team];
  if(!p||p.teamId!==S.userTeamId){S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:false,msg:'해당 선수가 더 이상 우리 구단 소속이 아닙니다.'};}
  if(action==='reject'){S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:true,msg:'제안을 거절했습니다.'};}
  if(action==='counter'){
    if(o.counters>=2)return {ok:false,msg:'더 이상 재협상할 수 없습니다.'};o.counters++;amt=Math.round(+amt||0);
    if(amt<=o.fee)return {ok:false,msg:'현재 제안보다 높은 금액을 제시해야 합니다.'};
    if(amt<=o.max){o.fee=amt;o.status='agreed';return {ok:true,msg:`${josa(t.name,'이','가')} ${money(amt)}에 동의했습니다. 이제 수락할 수 있습니다.`};}
    if(amt<=o.max*1.2&&o.counters<2){o.fee=o.max;o.status='agreed';return {ok:true,msg:`${t.name}의 최종 제안: ${money(o.max)}. 수락 여부를 결정하세요.`};}
    S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:true,msg:`${josa(t.name,'이','가')} 협상을 중단했습니다.`};
  }
  if(action==='accept'){if(p.dispatch)return {ok:false,msg:`${p.name} 선수는 겨울리그 파견 중이라 복귀 후 이적할 수 있습니다.`};
    if(o.type==='overseas'){const ok=rnd()<o.pw;S.market.offers=S.market.offers.filter(x=>x!==o);if(!ok){if(p.interest)p.interest.stage=1;news(`${josa(p.name,'이','가')} ${t.name} 이적을 거부했습니다.`,'offer');return {ok:false,msg:`${p.name} 선수가 개인 조건에 합의하지 않아 이적이 무산되었습니다.`};}
      transferPlayer(p.id,t.id,o.fee,{salary:o.salary,years:o.years},'해외 이적');return {ok:true,msg:`${p.name} 선수가 ${josa(t.name,'으로')} 이적했습니다. 이적료 ${money(o.fee)} 입금.`};}
    S.market.offers=S.market.offers.filter(x=>x!==o);
    if(!o.willing){news(`${josa(p.name,'이','가')} ${t.name} 이적을 거부했습니다.`,'offer');return {ok:false,msg:`${p.name} 선수가 ${t.name} 이적을 원하지 않아 무산되었습니다.`};}
    if(t.cash<o.fee)return {ok:false,msg:`${t.name}의 자금이 부족해 거래가 무산되었습니다.`};
    transferPlayer(p.id,t.id,o.fee,{salary:Math.round(salaryFor(p)*1.05/10)*10,years:ri(2,4)},'이적');return {ok:true,msg:`${p.name} 선수를 ${t.name}에 ${money(o.fee)}에 판매했습니다.`};
  }
  return {ok:false,msg:'알 수 없는 동작'};
}
// 유저 영입 협상 (구단 합의 → 선수 합의)
// ---------- 협상 테이블 ----------
function agentName(p){return p.agent||(p.agent=pick(['김','이','박','최','정','한','송','유'])+pick(['상무','에이전트','대리인']));}
function tableLines(p,neg,kind,x){
  const ut=userTeam();const agent=!!neg.agent;const who=agent?'agent':'player';const L=[];const push=(t,w)=>L.push({who:w||who,text:t});
  const T=p.traits;const young=p.age<=23,old=p.age>=33;
  if(kind==='greet'){
    if(neg.mode==='renew'){push(old?'어쩌면 제 마지막 계약일지도 모릅니다. 안정적인 기간을 원합니다.':'구단과 함께한 시간이 좋았습니다. 그래도 제 가치는 인정받고 싶습니다.');if(p.contract&&p.contract.years<=0)push('다른 구단에서도 연락이 옵니다. 2주차 안에 결론을 내고 싶어요.');}
    else if(neg.mode==='club'){push(`${josa(p.name,'은','는')} 우리 ${x.key?'핵심 전력':'선수'}입니다. 이적료 얘기부터 하시죠.`,'club');if(x.poor)push('솔직히 구단 사정이 넉넉지 않아 합리적인 제안이면 검토하겠습니다.','club');}
    else{if(p.homecoming===ut.id)push(`다시 ${ut.name}에서 뛰고 싶었습니다. 조건은 무리하게 부르지 않겠습니다.`);
      else if(neg.mode==='sign')push(agent?'제 선수는 시장에서 관심이 많습니다. 좋은 조건이면 빨리 끝낼 수 있습니다.':'자유계약 신분이라 여러 구단을 보고 있습니다. 조건을 들어보죠.');
      else push(agent?`구단 간 합의는 됐으니 이제 ${p.name} 선수의 조건입니다. 지금 연봉보다는 올라야 합니다.`:'구단끼리 얘기가 됐다고 들었습니다. 제 조건을 말씀드리죠.');
      if(young)push('솔직히 돈보다 경기에 나가는 게 더 중요합니다.');
      if(T.includes('강심장'))push('돌려 말하지 않겠습니다. 숫자로 얘기하죠.');if(T.includes('유리멘탈'))push('…(불안한 표정으로 손을 만지작거린다)','sys');if(T.includes('성실'))push('어디서든 열심히 할 자신은 있습니다.');}
  }
  else if(kind==='club_accept')push(`좋습니다. ${money(x.fee)}에 보내드리죠. 선수 본인과 얘기하시죠.`,'club');
  else if(kind==='club_counter')push(`${josa(money(x.ask),'은','는')} 받아야 합니다. 그 아래로는 어렵습니다.`,'club');
  else if(kind==='club_reject')push('그 돈으로는 안 팝니다. 다음에 다시 얘기하죠.','club');
  else if(kind==='counter'){push(agent?`${josa(money(x.dem),'은','는')} 받아야 합니다. 더 낮으면 다른 구단과 얘기하겠습니다.`:`연봉 ${money(x.dem)} 이상이면 사인하겠습니다.`);if(x.wantPromise&&!x.promise)push(young?'주전으로 뛸 수 있다는 약속이 있으면 금액은 조금 양보할 수 있어요.':'출장 기회만 보장되면 조건은 맞출 수 있습니다.');}
  else if(kind==='low'){push(T.includes('강심장')?'그 금액은 제 가치와 거리가 멉니다.':'그 금액은… 조금 실망스럽네요.');if(x.mood<35)push('(분위기가 차갑게 식었다)','sys');}
  else if(kind==='walk'){push(agent?'이 정도면 얘기가 안 되겠네요. 일어나겠습니다.':'죄송하지만 여기까지인 것 같습니다.');}
  else if(kind==='timeout')push('오늘은 여기까지 하죠. 다음에 다시 보겠습니다.');
  else if(kind==='accept'){push(T.includes('강심장')?'좋습니다. 사인하죠.':'좋습니다. 잘 부탁드립니다!');if(x.promise)push('주전 약속, 꼭 지켜주세요.');if(T.includes('성실'))push('기대에 보답하겠습니다.');if(T.includes('게으름'))push('그럼… 훈련 얘기는 나중에 하죠. 하하.');if(p.homecoming===ut.id)push('돌아오게 돼서 기쁩니다.');}
  else if(kind==='cash')push('현금이 부족하시다고요? 준비되면 다시 연락 주세요.');
  return L;
}
function moodOf(p,neg){if(neg.mode==='renew')return clamp(40+(p.morale-60)*0.6,20,85);if(p.homecoming===userTeam().id)return 80;return neg.mode==='sign'?55:60;}
function openTable(pid){
  const p=P_(pid);const ut=userTeam();if(!p||p.retired)return {ok:false,msg:'선수를 찾을 수 없습니다.'};
  const mine=p.teamId===S.userTeamId;const from=p.teamId!=null?S.teams[p.teamId]:null;const isFA=!from;
  let neg=S.market.negs.find(n=>n.pid===pid);if(neg)return {ok:true,neg};
  if(mine){const key='renew'+pid+':'+S.season;if((S.market.attempts[key]||0)>=3)return {ok:false,msg:'이번 시즌 재계약 협상 기회(3회)를 모두 사용했습니다.'};
    let dem=Math.max(salaryFor(p),(p.contract?p.contract.salary:0)*1.05);if(calcOvr(p)>=68&&ut.div===3&&p.age<=29)dem*=1.25;if(p.age>=33)dem*=0.85;
    neg={id:S.nextOfferId++,pid,mode:'renew',stage:'player',demand:Math.round(dem/10)*10,fee:0,ask:0,rounds:0,maxRounds:3,expires:S.clock+3,log:[],promise:false};}
  else{if(ut.roster.length>=BAL.MAX_ROSTER)return {ok:false,msg:`선수단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`};
    const key=pid+':'+S.season;if((S.market.attempts[key]||0)>=2)return {ok:false,msg:'이번 시즌 이 선수와의 협상 기회(2회)를 모두 사용했습니다.'};
    if(!isFA){const wi=willingInfo(p,ut);if(rnd()>wi.pw*1.1){S.market.attempts[key]=2;return {ok:false,msg:`${p.name} 선수는 우리 구단으로의 이적에 관심이 없습니다. (${wi.reasons.join(', ')})`};}}
    neg={id:S.nextOfferId++,pid,mode:isFA?'sign':'club',stage:isFA?'player':'club',ask:isFA?0:aiAsk(from,p),demand:playerDemand(p,ut),fee:0,rounds:0,maxRounds:4,expires:S.clock+3,log:[],promise:false};
    if(!isFA&&from.league!=='KR')neg.ask=Math.round(neg.ask*1.3/100)*100;}
  neg.agent=calcValue(p)>=10000?agentName(p):null;neg.mood=Math.round(moodOf(p,neg));
  const wi=mine?null:willingInfo(p,ut);neg.wantPromise=!!(wi&&wi.reasons.some(r=>r.startsWith('출장')))||p.age<=23;
  neg.hint=[Math.round(neg.demand*0.85/10)*10,Math.round(neg.demand*1.15/10)*10];
  const key=from?from.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===pid)<5:false;
  neg.log=tableLines(p,neg,'greet',{key,poor:from&&from.cash<0});
  S.market.negs.push(neg);return {ok:true,neg};
}
function tableOffer(pid,offer){
  const p=P_(pid);const ut=userTeam();const neg=S.market.negs.find(n=>n.pid===pid);if(!neg||!p)return {ok:false,msg:'진행 중인 협상이 없습니다. 테이블을 다시 여세요.'};
  const from=p.teamId!=null&&p.teamId!==S.userTeamId?S.teams[p.teamId]:null;const isFA=p.teamId==null;
  const fee=Math.round(+offer.fee||0),salary=Math.round(+offer.salary||0),years=clamp(Math.round(+offer.years||1),1,4),bonus=Math.max(0,Math.round(+offer.bonus||0)),promise=!!offer.promise;
  const end=()=>{S.market.negs=S.market.negs.filter(n=>n!==neg);};const lines=[];
  neg.expires=S.clock+3;
  if(neg.stage==='club'){neg.rounds++;neg.log.push({who:'me',text:`이적료 ${josa(money(fee),'을','를')} 제안합니다.`});
    if(fee>=neg.ask){neg.stage='player';neg.fee=fee;const L=tableLines(p,neg,'club_accept',{fee});neg.log.push(...L);neg.log.push(...tableLines(p,neg,'greet',{}));neg.rounds=0;return {ok:true,neg};}
    if(fee>=neg.ask*0.8&&neg.rounds<3){neg.log.push(...tableLines(p,neg,'club_counter',{ask:neg.ask}));return {ok:true,neg};}
    neg.log.push(...tableLines(p,neg,'club_reject',{}));end();S.market.attempts[pid+':'+S.season]=(S.market.attempts[pid+':'+S.season]||0)+1;return {ok:true,ended:true,neg,msg:`${josa(from.name,'이','가')} 협상을 끝냈습니다.`};}
  // 선수 단계
  const bonusEq=years?bonus/years*0.8:0;const eff=salary+bonusEq;
  const totalCost=neg.fee+bonus+(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0);
  if(neg.mode!=='renew'&&ut.cash<totalCost){return {ok:false,msg:`현금이 부족합니다. 필요 ${money(totalCost)} / 보유 ${money(ut.cash)}`,neg};}
  neg.rounds++;neg.log.push({who:'me',text:`연봉 ${money(salary)} × ${years}년${bonus?` + 계약금 ${money(bonus)}`:''}${promise?' + 주전 출장 약속':''}`});
  let dem=neg.demand*(years>=3?0.95:years===1?1.08:1)*(neg.mood<35?1.08:neg.mood>=75?0.96:1)*(promise&&neg.wantPromise?0.92:1);dem=Math.round(dem/10)*10;
  if(eff>=dem){
    const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;
    neg.log.push(...tableLines(p,neg,'accept',{promise}));end();
    if(promise){p.promise={s:S.phase==='season'?S.season:S.season+1};}
    if(neg.mode==='renew'){p.contract={salary,years:years+(S.phase==='season'?1:0)};p.renewed=S.season;S.pendingFA=S.pendingFA.filter(x=>x!==pid);if(bonus){ut.cash-=bonus;ut.fin.buys+=bonus;}p.morale=Math.min(100,p.morale+8);news(`${p.name} 재계약 (${years}년, ${money(salary)}${bonus?', 계약금 '+money(bonus):''})`,'contract');return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 ${years}년 재계약했습니다.`};}
    const sb=(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0)+bonus;transferPlayer(pid,ut.id,neg.fee+sb,{salary,years},neg.mode==='sign'?'FA 영입':'영입');
    return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 계약했습니다. (${years}년, 연봉 ${money(salary)}${neg.fee?`, 이적료 ${money(neg.fee)}`:''}${sb?`, 계약금 ${money(sb)}`:''})`};}
  if(eff>=dem*0.85){neg.mood=clamp(neg.mood-4,0,100);neg.revealed=dem;neg.log.push(...tableLines(p,neg,'counter',{dem,wantPromise:neg.wantPromise,promise}));}
  else{neg.mood=clamp(neg.mood-18,0,100);neg.log.push(...tableLines(p,neg,'low',{mood:neg.mood}));}
  if(neg.mood<20){neg.log.push(...tableLines(p,neg,'walk',{}));end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(neg.mode==='renew'?3:2);return {ok:true,ended:true,neg,msg:`${p.name} 선수가 협상 테이블을 떠났습니다. 이번 시즌엔 다시 앉지 않습니다.`};}
  if(neg.rounds>=neg.maxRounds){neg.log.push(...tableLines(p,neg,'timeout',{}));end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;return {ok:true,ended:true,neg,msg:'협상이 종료되었습니다. 기회가 남아 있으면 다시 테이블을 열 수 있습니다.'};}
  return {ok:true,neg};
}
function tableLeave(pid){const neg=S.market.negs.find(n=>n.pid===pid);if(!neg)return;S.market.negs=S.market.negs.filter(n=>n!==neg);const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;}
function tableLeft(neg){const key=neg.mode==='renew'?'renew'+neg.pid+':'+S.season:neg.pid+':'+S.season;return Math.max(0,(neg.mode==='renew'?3:2)-(S.market.attempts[key]||0)-1);}
// 하위 호환 래퍼
function negotiate(pid,offer){const o=openTable(pid);if(!o.ok)return o;return tableOffer(pid,offer);}
function cancelNeg(pid){tableLeave(pid);}
function renewContract(pid,salary,years){const o=openTable(pid);if(!o.ok)return o;const r=tableOffer(pid,{salary,years});return r;}
function checkPromises(){const ut=userTeam();for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p||!p.promise||p.promise.s!==S.season)continue;const kept=ut.lineup.includes(pid)||ut.rotation.includes(pid)||ut.closer===pid;
  if(kept){p.morale=Math.min(100,p.morale+10);news(`${p.name}: 주전 약속이 지켜져 사기가 올랐습니다.`,'contract');}else{p.morale=Math.max(0,p.morale-25);news(`${p.name}: 주전 출장 약속이 지켜지지 않아 사기가 크게 떨어졌습니다.`,'contract');}p.promise=null;}}
function releasePlayer(pid){const p=P_(pid);const ut=userTeam();if(!p||p.teamId!==S.userTeamId)return '우리 구단 선수가 아닙니다.';if(p.dispatch)return '파견 중인 선수는 방출할 수 없습니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;
  const sev=Math.round((p.contract?p.contract.salary*Math.max(1,p.contract.years)*0.3:0)/10)*10;ut.cash-=sev;ut.fin.other+=sev;removeFromTeam(ut,p);S.fa.push(pid);p.exUser=true;p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'방출'});fixLineup(ut);news(`${p.name} 방출 (위약금 ${money(sev)})`,'contract');return null;}
function removeFromTeam(t,p){t.roster=t.roster.filter(id=>id!==p.id);t.dev=(t.dev||[]).filter(id=>id!==p.id);t.lineup=t.lineup.filter(id=>id!==p.id);delete t.pos[p.id];t.rotation=t.rotation.filter(id=>id!==p.id);t.bullpen=t.bullpen.filter(id=>id!==p.id);if(t.closer===p.id)t.closer=null;p.teamId=null;p.contract=null;
  S.market.listed=S.market.listed.filter(x=>x!==p.id);S.market.offers=S.market.offers.filter(o=>o.pid!==p.id);S.market.negs=S.market.negs.filter(n=>n.pid!==p.id);}
function transferPlayer(pid,toId,fee,contract,kind){
  const p=P_(pid);const to=S.teams[toId];const from=p.teamId!=null?S.teams[p.teamId]:null;
  if(to.cash<fee&&!to.isUser&&to.league==='KR')return false;
  S.pendingFA=S.pendingFA.filter(x=>x!==pid);
  if(from)removeFromTeam(from,p);else{S.fa=S.fa.filter(x=>x!==pid);S.youth=S.youth.filter(x=>x!==pid);if(S.market.scoutResults)S.market.scoutResults.ids=S.market.scoutResults.ids.filter(x=>x!==pid);}
  if(from){from.cash+=fee;from.fin.sales+=fee;}
  to.cash-=fee;to.fin.buys+=fee;addToTeam(p,to,contract);
  if(fee>0&&p.sellOn&&from&&p.sellOn.team!==from.id&&S.teams[p.sellOn.team]){const share=Math.round(fee*p.sellOn.pct/10)*10;const ex=S.teams[p.sellOn.team];from.cash-=share;from.fin.sales-=share;ex.cash+=share;ex.fin.sales+=share;
    if(ex.isUser)news(`[셀온] 우리 출신 ${josa(p.name,'이','가')} ${josa(to.name,'으로')} 이적 — 이적료 ${money(fee)}의 ${Math.round(p.sellOn.pct*100)}%, ${money(share)} 입금!`,'alumni');p.sellOn=null;}
  else if(p.exUser&&from&&!from.isUser&&!to.isUser)news(`[출신] ${p.name}: ${from.name} → ${to.name}${fee?` (${money(fee)})`:''}`,'alumni');
  if(from&&from.isUser)p.coached=true;
  if(from&&from.isUser&&kind!=='방출'){p.exUser=true;if(fee>0)p.sellOn={team:from.id,pct:BAL.SELL_ON};}
  if(to.isUser){p.exUser=false;if(p.age<=23&&p.devStart==null)p.devStart=r1(calcOvr(p));}
  if(from&&from.isUser&&fee>0&&S.mgr&&S.mgr.cur){S.mgr.cur.sales.push({pid:p.id,fee,cost:(p._acqFee||0)});}
  if(to.isUser)p._acqFee=fee;
  p.transfers.push({s:S.season,from:from?from.name:(p.homecoming?'FA(친정 복귀)':'FA'),to:to.name,fee,kind});
  p.acquired={s:S.season,d:S.day,fee};p.base=JSON.parse(JSON.stringify(p.attrs));p.ovrStart=r1(calcOvr(p));p.lockUntil=S.clock+BAL.SELL_LOCK;p.homecoming=null;p.scouted=false;
  if(to.league!=='KR'){p.interest=null;}else if(p.interest&&!to.isUser)p.interest=null;
  if(to.isUser||(from&&from.isUser)){p.userLink=true;p.valHist.push([S.season,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}
  if(from){if(from.isUser)fixLineup(from);else autoLineup(from);}
  if(to.isUser)fixLineup(to);else autoLineup(to);
  if(to.isUser||(from&&from.isUser))news(`${p.name}: ${from?from.name:'FA'} → ${to.name} (${kind}${fee?', '+money(fee):''})`,'transfer');
  return true;
}
function takeLoan(amt){const ut=userTeam();amt=Math.round(+amt||0);if(amt<=0)return '금액을 확인하세요.';if(ut.loan+amt>BAL.LOAN_CAP)return `대출 한도(${money(BAL.LOAN_CAP)})를 초과합니다.`;ut.cash+=amt;ut.loan+=Math.round(amt*(1+BAL.LOAN_RATE));ut.rep=Math.max(5,ut.rep-2);news(`긴급 대출 ${money(amt)} (다음 시즌 시작 시 ${money(Math.round(amt*(1+BAL.LOAN_RATE)))} 상환)`,'fin');return null;}
function upgradeFacility(key){const ut=userTeam();const f=BAL.FACILITY[key];if(!f)return '잘못된 시설';const lvl=ut.fac[key];if(lvl>=5)return '최대 레벨입니다.';const cost=f.cost*lvl;if(ut.cash<cost)return `자금 부족 (필요 ${money(cost)})`;ut.cash-=cost;ut.fin.facility+=cost;ut.fac[key]=lvl+1;news(`${key==='train'?'훈련장':key==='youth'?'유소년 센터':'스카우트 조직'} Lv.${lvl+1} 완료`,'fin');return null;}

// ---------- 스카우트 ----------
function runScout(kind,level,filter){
  const ut=userTeam();level=clamp(level|0,0,2);const cost=BAL.SCOUT_COST[level];if(ut.cash<cost)return {ok:false,msg:`자금 부족 (필요 ${money(cost)})`};
  const key='scout:'+S.season+':'+(S.phase==='season'?S.day:'w'+S.week);S.market.attempts[key]=(S.market.attempts[key]||0)+1;if(S.market.attempts[key]>2)return {ok:false,msg:'오늘은 더 이상 스카우트를 보낼 수 없습니다. 다음 날 다시 시도하세요.'};
  ut.cash-=cost;ut.fin.scout+=cost;
  const n=BAL.SCOUT_N[level]+(ut.fac.scout>=3?1:0);const conf=BAL.SCOUT_CONF[level]+(ut.fac.scout-1)*0.05;filter=filter||{};
  if(S.market.scoutResults&&S.market.scoutResults.kind==='youth')for(const id of S.market.scoutResults.ids){const p=P_(id);if(p&&p.teamId==null&&p.scouted)delete S.players[id];}
  let ids=[];
  const match=p=>{if(filter.pos&&filter.pos!=='ALL'&&!(filter.pos==='P'?isPitcher(p):filter.pos==='B'?!isPitcher(p):p.pos===filter.pos))return false;if(filter.maxAge&&p.age>filter.maxAge)return false;if(filter.minAge&&p.age<filter.minAge)return false;
    if(filter.grade&&filter.grade!=='ALL'&&gradeOf(calcOvr(p))!==filter.grade)return false;if(filter.minPot&&filter.minPot!=='ALL'&&'DCBAS'.indexOf(gradeOf(p.scout.est))<'DCBAS'.indexOf(filter.minPot))return false;if(filter.maxValue&&calcValue(p)>filter.maxValue)return false;return true;};
  if(kind==='youth'){for(let i=0;i<n;i++){let pos=filter.pos&&!['ALL','P','B'].includes(filter.pos)?filter.pos:filter.pos==='P'?pick(['SP','RP']):filter.pos==='B'?pick(POS_BAT):pick(ROSTER_TEMPLATE);
      const p=genPlayer({pos,age:ri(17,21),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.scout*1.5+level*1.5,potBoost:ut.fac.scout*1.5+level*2,conf});p.scouted=true;registerPlayer(p);ids.push(p.id);}}
  else{let pool;if(kind==='fa')pool=S.fa.map(P_);else if(kind==='domestic')pool=krTeams().filter(t=>!t.isUser).flatMap(t=>t.roster.map(P_));else pool=Object.values(S.teams).filter(t=>t.league!=='KR'&&(!filter.league||filter.league==='ALL'||t.league===filter.league)).flatMap(t=>t.roster.map(P_));
    pool=pool.filter(p=>p&&!p.retired&&match(p));shuffle(pool);pool.sort((a,b)=>(calcValue(b)*(0.6+rnd()*0.8))-(calcValue(a)*(0.6+rnd()*0.8)));
    pool=pool.slice(0,n);for(const p of pool){improveScout(p,conf);ids.push(p.id);}}
  S.market.scoutResults={kind,level,ids,s:S.season,d:S.day};
  return {ok:true,msg:`스카우트 보고서 ${ids.length}건이 도착했습니다.`,ids};
}
function signScouted(pid,salary,years){const p=P_(pid);if(!p||!p.scouted||p.teamId!=null)return {ok:false,msg:'계약 가능한 선수가 아닙니다.'};return negotiate(pid,{fee:0,salary,years});}
function scoutReport(p){
  const lines=[];const dg=diagnose(p);
  lines.push(`${dg.arch} — ${josa(dg.bestTxt,'이','가')} 가장 돋보입니다.`+(dg.weak?` ${josa(ATTR_KO[dg.weak],'은','는')} 보완이 필요합니다.`:' 뚜렷한 약점은 없습니다.'));
  const est=p.scout.est,ovr=calcOvr(p);
  if(p.age<=23&&est-ovr>=10)lines.push('현재 실력은 부족하지만 꾸준한 출장 시 큰 성장이 기대됩니다.');else if(p.age<=26&&est-ovr>=5)lines.push('아직 성장 여지가 남아 있다고 판단됩니다.');else if(p.age>=31)lines.push('성장보다는 현재 전력으로 평가해야 하는 베테랑입니다.');else lines.push('현재 능력이 거의 완성 단계로 보입니다.');
  if(p.scout.conf<0.35)lines.push('관찰 기간이 짧아 평가 신뢰도가 낮습니다.');
  for(const t of p.traits)if(TRAITS[t])lines.push(`특성 ${t}: ${TRAITS[t]}.`);
  return lines;
}
function confText(c){return c<0.35?'낮음':c<0.65?'보통':'높음';}

// ---------- 해외 ----------
function overseasTeams(){return Object.values(S.teams).filter(t=>t.league!=='KR');}
function interestCheck(){
  const ut=userTeam();
  for(const pid of ut.roster){const p=P_(pid);if(!p||p.retired)continue;if(S.market.offers.some(o=>o.pid===pid&&o.type==='overseas'))continue;
    const ovr=calcOvr(p);let sc=ovr;const s=p.cur;
    if(isPitcher(p)){if(s.pOuts>=30){const era=s.pER*27/s.pOuts;if(era<3.0)sc+=4;else if(era>5.5)sc-=3;}}else if(s.pa>=40){const o=ops_(s);if(o>0.85)sc+=4;else if(o<0.62)sc-=3;}
    if(p.exposure===S.season||p.exposure===S.season-1)sc+=3;
    const vet=p.age>30;if(vet)sc-=8;if(p.age<=23&&p.pot>=80&&ovr>=60)sc=Math.max(sc,66);
    const myLv=levelOf(ut);let lg=null;if(sc>=72&&p.age<=30)lg='US';else if(sc>=65&&p.age<=31)lg='JP';else if(sc>=59&&p.age<=31)lg=rnd()<0.5?'TW':'MX';else if(vet&&ovr>=58&&p.age<=34)lg='MX';
    if(lg&&BAL.LEVEL_OVR[lg]<=myLv+2)lg=null;
    if(lg){if(!p.interest||p.interest.lg!==lg){const t=pick(overseasTeams().filter(x=>x.league===lg&&!x.isUser));p.interest={team:t.id,lg,stage:p.interest?Math.max(0,p.interest.stage-1):0};}
      if(rnd()<0.55){p.interest.stage=Math.min(3,p.interest.stage+1);if(p.interest.stage===1)news(`${S.teams[p.interest.team].name} 스카우트가 ${josa(p.name,'을','를')} 관찰하기 시작했습니다.`,'overseas');}
      if(p.interest.stage===3)makeOverseasOffer(p);}
    else if(p.interest&&rnd()<0.4){p.interest.stage--;if(p.interest.stage<=0)p.interest=null;}
  }
}
function makeOverseasOffer(p){
  const t=S.teams[p.interest.team];if(!t)return null;if(t.cash<calcValue(p))return null;
  const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)return null;
  const LM={US:[1.3,3.5,0.1],JP:[1,2.5,0],TW:[0.8,1.6,-0.05],MX:[0.75,1.4,-0.05]}[t.league]||[0.7,1.2,-0.1];
  let fee=calcValue(p)*(1.5+rnd()*0.6)*LM[0];fee=Math.min(fee,t.cash*0.4);fee=Math.round(fee/100)*100;
  const salary=Math.round(salaryFor(p)*LM[1]/10)*10;const years=ri(2,4);
  const incumbent=t.roster.map(P_).filter(x=>x.pos===p.pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  let pw=0.55+LM[2]-(p.age>=32?0.2:0)+(p.traits.includes('강심장')?0.15:0)-(p.traits.includes('유리멘탈')?0.15:0);
  if(incumbent&&calcOvr(incumbent)-calcOvr(p)>6)pw-=0.25;if(p.contract&&salary/p.contract.salary>3)pw+=0.1;pw=clamp(pw,0.1,0.95);
  const o={id:S.nextOfferId++,type:'overseas',pid:p.id,team:t.id,fee,salary,years,pw,expires:S.clock+(S.phase==='season'?4:3),status:'open',counters:0,max:Math.round(fee*1.15/100)*100};
  S.market.attempts[key]=1;S.market.offers.push(o);news(`${josa(t.name,'이','가')} ${p.name}에게 공식 영입 제안! 이적료 ${money(fee)}, 연봉 ${money(salary)}`,'overseas');return o;
}
function summaryStat(p,lg,share){const L=BAL.LEAGUES[lg]||{games:140};const g=L.games/140;const st=newStat();const a=p.attrs;const lv=(BAL.LEVEL_OVR[lg]||60)-60;
  if(!isPitcher(p)){const pa=Math.max(4,Math.round(560*g*share+ri(-20,20)*g));const avg=clamp(0.2+(a.contact-50)*0.0028+(a.power-50)*0.0004+gauss()*0.02-lv*0.0018,0.12,0.38);
    st.pa=pa;st.bb=Math.round(pa*clamp(0.06+(a.eye-50)*0.0015,0.02,0.15));st.ab=pa-st.bb;st.h=Math.round(st.ab*avg);st.hr=Math.round(pa*clamp(0.008+(a.power-50)*0.0009-lv*0.0003,0.002,0.06));st.d2=Math.round(st.h*0.2);st.d3=Math.round(st.h*0.02);st.so=Math.round(pa*clamp(0.2-(a.contact-50)*0.0015+lv*0.002,0.08,0.38));st.g=Math.max(1,Math.round(pa/4.2));st.r=Math.round(st.h*0.5);st.rbi=Math.round(st.h*0.45+st.hr);}
  else{const sp=p.pos==='SP';st.pOuts=Math.max(3,Math.round((sp?170:65)*g*share+ri(-8,8)*g))*3;const era=clamp(4.5-(calcOvr(p)-60)*0.09+gauss()*0.6+lv*0.06,1.2,9);st.pER=Math.round(st.pOuts/27*era);st.pR=st.pER;st.pH=Math.round(st.pOuts/3*(1.05-(a.movement-50)*0.004));st.pBB=Math.round(st.pOuts/3*clamp(0.4-(a.control-50)*0.004,0.15,0.7));st.pSO=Math.round(st.pOuts/3*clamp(0.85+(a.stuff-50)*0.012,0.4,1.5));
    st.pG=sp?Math.max(1,Math.round(30*g*share)):Math.max(1,Math.round(55*g*share));st.pGS=sp?st.pG:0;st.pW=Math.round((sp?10:3)*g*share*(5/Math.max(2,era)));st.pL=Math.round((sp?8:3)*g*share*(Math.max(2,era)/4.5));st.pPit=Math.round(st.pOuts*5.2);}
  return st;}
function overseasSeasonSummary(winter,skip,skipRows){
  const tables={};
  if(skip&&skipRows)tables[skip]=skipRows;
  for(const lg of Object.keys(BAL.LEAGUES).filter(k=>!!BAL.LEAGUES[k].winter===!!winter&&k!==skip)){const ts=overseasTeams().filter(t=>t.league===lg);if(!ts.length)continue;const G=BAL.LEAGUES[lg].games;const str=ts.map(t=>{const ps=t.roster.map(P_).filter(Boolean);const b=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,9);const pi=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,8);const avg=a=>a.length?a.reduce((s,p)=>s+calcOvr(p),0)/a.length:50;return {t,s:avg(b)*0.55+avg(pi)*0.45};});
    const mean=str.reduce((s,x)=>s+x.s,0)/str.length;const rows=str.map(x=>{const w=clamp(Math.round(G/2+(x.s-mean)*2.5*G/140+gauss()*6*G/140),Math.round(G*0.25),Math.round(G*0.75));return {id:x.t.id,name:x.t.name,w,l:G-w};}).sort((a,b)=>b.w-a.w);
    rows.forEach((r,i)=>{r.rank=i+1;const t=S.teams[r.id];t.rec={w:r.w,l:r.l,rs:0,ra:0};t.lastRank=i+1;});tables[lg]=rows;
    for(const t of ts){const ps=t.roster.map(P_).filter(Boolean);const bats=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));const pits=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a));
      bats.forEach((p,i)=>{const st=summaryStat(p,lg,i<9?0.92:i<13?0.4:0.14);p.hist.push({s:S.season,team:t.id,tn:t.name,lg,st,w:winter?1:0});if(p.hist.length>15)p.hist.shift();p.cur=newStat();});
      pits.forEach((p,i)=>{const sp=p.pos==='SP'&&i<5;const st=summaryStat(p,lg,sp||i<8?0.9:0.35);if(!sp&&i===5)st.pSV=Math.round(ri(15,38)*G/140);
        p.hist.push({s:S.season,team:t.id,tn:t.name,lg,st,w:winter?1:0});if(p.hist.length>15)p.hist.shift();p.cur=newStat();
        if(p.userLink)news(`[해외] ${p.name}(${t.name}) 시즌 성적: ${st.pW}승 ${st.pL}패 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`,'overseas');});
      bats.forEach(p=>{if(p.userLink){const h=p.hist[p.hist.length-1].st;news(`[해외] ${p.name}(${t.name}) 시즌 성적: 타율 ${(h.h/Math.max(1,h.ab)).toFixed(3)}, ${h.hr}홈런`,'overseas');}});
    }}
  const key=winter?'whist':'hist';S.overseas[key]=S.overseas[key]||[];S.overseas[key].push({s:S.season,tables});if(S.overseas[key].length>8)S.overseas[key].shift();
}

// ---------- AI 구단 운영 ----------
function aiSignFA(t,maxN){
  let n=0;const need=needOf(t);const pool=S.fa.map(P_).filter(p=>p&&!p.retired);
  pool.sort((a,b)=>calcValue(b)-calcValue(a));
  for(const p of pool){if(n>=maxN||t.roster.length>=26)break;const sal=salaryFor(p);if(t.cash<sal*2+payroll(t)*0.15)continue;
    const want=need.includes(p.pos)||(t.roster.length<BAL.MIN_ROSTER+2);if(!want)continue;if(calcOvr(p)<levelOf(t)-12&&t.roster.length>=BAL.MIN_ROSTER)continue;
    transferPlayer(p.id,t.id,0,{salary:Math.round(sal/10)*10,years:ri(1,3)},'FA 영입');n++;const ni=need.indexOf(p.pos);if(ni>=0)need.splice(ni,1);}
  return n;
}
function aiFillRookies(t){let guard=0;while((t.roster.length<BAL.MIN_ROSTER+4||rosterCheck(t).length)&&guard++<30){const ps=t.roster.map(P_);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;const need=needOf(t);const pos=c<1?'C':pit<BAL.MIN_PITCHERS?pick(['SP','RP']):need.length?need[0]:pick(ROSTER_TEMPLATE);const p=genPlayer({pos,age:ri(18,22),lvl:BAL.LEVEL_OVR.ROOKIE+(t.div===1?6:t.div===2?3:0),potBoost:t.fac.youth});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
function aiWeek(t){
  if(t.cash<0){const ps=t.roster.map(P_).sort((a,b)=>calcValue(b)-calcValue(a));for(const p of ps.slice(0,3)){const buyers=krTeams().filter(x=>!x.isUser&&x.id!==t.id&&x.cash>calcValue(p)*1.3+payroll(x)*0.3).sort((a,b)=>b.cash-a.cash);
      if(buyers.length){const b=buyers[0];const fee=Math.round(calcValue(p)*0.95/100)*100;transferPlayer(p.id,b.id,fee,{salary:Math.round(salaryFor(p)/10)*10,years:ri(2,3)},'이적');if(t.cash>=0)break;}
      else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});if(t.cash>=0)break;}}}
  if(t.roster.length<26)aiSignFA(t,2);
  if(t.roster.length>=24&&t.cash>payroll(t)*1.3&&rnd()<0.3){
    const need=needOf(t);const weakPos=need.length?need[0]:(()=>{let worst=null,wv=999;for(const pos of POS_BAT.concat(['SP'])){const best=t.roster.map(P_).filter(p=>p.pos===pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const v=best?calcOvr(best):0;if(v<wv){wv=v;worst=pos;}}return worst;})();
    const starter=t.roster.map(P_).filter(p=>p.pos===weakPos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const minO=starter?calcOvr(starter)+5:0;
    const cands=krTeams().filter(x=>!x.isUser&&x.id!==t.id).flatMap(x=>x.roster.map(P_)).filter(p=>p.pos===weakPos&&calcOvr(p)>=minO&&calcValue(p)<=t.cash*0.35&&(p.lockUntil||0)<=S.clock);
    if(cands.length){const p=pick(cands);const seller=S.teams[p.teamId];const rank=seller.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===p.id);
      if(rank>=3||seller.cash<0||rnd()<0.3){const fee=aiAsk(seller,p);if(t.cash>=fee)transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*1.05/10)*10,years:ri(2,4)},'이적');}}}
  while(t.roster.length>28){const ps=t.roster.map(P_).sort((a,b)=>calcValue(a)-calcValue(b));const p=ps[0];if(t.dev.length<devCap(t)&&p.age<=25){t.roster=t.roster.filter(x=>x!==p.id);t.dev.push(p.id);}else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});}}
  autoLineup(t);
}
function overseasWeek(){
  for(const t of overseasTeams()){if(!BAL.BUY_MIN[t.league]||t.isUser)continue;if(rnd()>(t.league==='US'||t.league==='JP'?0.18:0.06))continue;const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)continue;
    const cands=krTeams().filter(x=>!x.isUser).flatMap(x=>x.roster.map(P_)).filter(p=>p.age<=(t.league==='MX'?33:29)&&calcOvr(p)>=BAL.BUY_MIN[t.league]&&(p.lockUntil||0)<=S.clock);
    if(!cands.length)continue;const p=pick(cands);const seller=S.teams[p.teamId];const fee=Math.min(t.cash*0.4,Math.round(calcValue(p)*(t.league==='US'||t.league==='JP'?1.6:1.15)/100)*100);
    if(t.cash<fee)continue;S.market.attempts[key]=1;transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*(t.league==='US'?3.5:t.league==='JP'?2.5:1.5)/10)*10,years:ri(2,4)},'해외 이적');news(`${p.exUser?'[출신] ':''}${seller.name} ${josa(p.name,'이','가')} ${josa(t.name,'으로')} 해외 진출 (이적료 ${money(fee)})`,p.exUser?'alumni':'overseas');}
}


// ---------- 육성군 ----------
function promoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.dev.includes(pid))return '육성군 선수가 아닙니다.';if(ut.roster.length>=BAL.MAX_ROSTER)return `1군 명단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`;ut.dev=ut.dev.filter(x=>x!==pid);ut.roster.push(pid);fixLineup(ut);news(`${p.name} 1군 등록`,'contract');return null;}
function demoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.roster.includes(pid))return '1군 선수가 아닙니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `1군 최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;if(ut.dev.length>=devCap(ut))return `육성군이 가득 찼습니다 (최대 ${devCap(ut)}명, 유소년 센터 Lv↑로 확장).`;if(S.market.listed.includes(pid))return '판매 등록 중인 선수는 말소할 수 없습니다.';
  ut.roster=ut.roster.filter(x=>x!==pid);ut.dev.push(pid);fixLineup(ut);news(`${p.name} 육성군으로 이동`,'contract');return null;}
// ---------- 고교 드래프트 ----------
function createDraft(){
  const ut=userTeam();const pool=[];
  for(let i=0;i<BAL.DRAFT_POOL;i++){const g=gauss();const p=genPlayer({pos:pick(ROSTER_TEMPLATE),age:ri(18,19),lvl:BAL.LEVEL_OVR.ROOKIE-3,potBoost:Math.max(0,g*6),conf:0.2+ut.fac.scout*0.05});p.draft=true;p.school=pick(['경북고','부산고','광주일고','대구상원고','서울고','덕수고','천안북일고','유신고','마산용마고','인천고','강릉고','청주고','군산상고','세광고','장충고','휘문고','성남고','북일고','야탑고','제주고']);pool.push(p.id);}
  const teams=krTeams().sort((a,b)=>b.div-a.div||(b.lastRank||8)-(a.lastRank||8)||a.id-b.id);const order=[];for(let r=0;r<BAL.DRAFT_ROUNDS;r++)for(const t of teams)order.push(t.id);
  S.draft={s:S.season,pool,order,idx:0,picks:[],done:false};
  news(`${S.season}시즌 고교 드래프트 시작 — 지명 순서는 하위 리그·하위 순위부터입니다.`,'sys');
}
function draftAvail(){return S.draft?S.draft.pool.map(P_).filter(p=>p&&p.teamId==null):[];}
function draftSign(t,p,dest){const dev=dest==='dev'||(dest!=='roster'&&t.roster.length>=26);if(dev&&t.dev.length>=devCap(t)){if(t.roster.length>=BAL.MAX_ROSTER)return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},false);}else if(!dev&&t.roster.length>=BAL.MAX_ROSTER){if(t.dev.length>=devCap(t))return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},true);}else addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},dev);
  p.draft=false;p.transfers.push({s:S.season,from:p.school||'고교',to:t.name,fee:0,kind:`드래프트 ${S.draft.picks.length+1}순위`});if(t.isUser){p.userLink=true;p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([S.season,calcValue(p)]);}
  S.draft.picks.push({team:t.id,pid:p.id,no:S.draft.picks.length+1,dev:t.dev.includes(p.id)});return true;}
function draftStep(){
  const D=S.draft;if(!D||D.done)return 'done';
  while(D.idx<D.order.length){const t=S.teams[D.order[D.idx]];if(t.isUser)return 'user';
    const avail=draftAvail();if(!avail.length)break;const need=needOf(t);
    avail.sort((a,b)=>(b.scout.est*0.7+calcOvr(b)*0.3+(need.includes(b.pos)?3:0)+rnd()*4)-(a.scout.est*0.7+calcOvr(a)*0.3+(need.includes(a.pos)?3:0)+rnd()*4));
    if(!draftSign(t,avail[0],'auto'))D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true});D.idx++;}
  D.done=true;for(const id of D.pool){const p=P_(id);if(p&&p.teamId==null)delete S.players[id];}
  const mine=D.picks.filter(x=>x.team===S.userTeamId&&x.pid);news(`드래프트 종료. 우리 구단 지명: ${mine.map(x=>P_(x.pid).name).join(', ')||'없음'}`,'sys');return 'done';}
function draftPick(pid,dest){const D=S.draft;if(!D||D.done)return {ok:false,msg:'진행 중인 드래프트가 없습니다.'};const t=S.teams[D.order[D.idx]];if(!t||!t.isUser)return {ok:false,msg:'우리 구단 차례가 아닙니다.'};
  if(pid==null){D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true});D.idx++;draftStep();return {ok:true,msg:'지명을 포기했습니다.'};}
  const p=P_(pid);if(!p||p.teamId!=null||!D.pool.includes(pid))return {ok:false,msg:'지명할 수 없는 선수입니다.'};
  if(!draftSign(t,p,dest))return {ok:false,msg:'1군·육성군 모두 가득 찼습니다. 선수를 정리하거나 지명을 포기하세요.'};
  const no=D.picks.length;D.idx++;news(`${no}순위 ${p.name}(${p.school}) 지명 — ${t.dev.includes(pid)?'육성군':'1군'}`,'contract');draftStep();return {ok:true,msg:`${p.name} 선수를 ${no}순위로 지명했습니다.`};}
function draftAuto(){const D=S.draft;if(!D||D.done)return;const t=userTeam();const avail=draftAvail();if(avail.length&&D.order[D.idx]===t.id){const need=needOf(t);avail.sort((a,b)=>(b.scout.est*0.7+calcOvr(b)*0.3+(need.includes(b.pos)?3:0))-(a.scout.est*0.7+calcOvr(a)*0.3+(need.includes(a.pos)?3:0)));draftPick(avail[0].id,'auto');}else draftPick(null);if(!D.done&&D.order[D.idx]===t.id)draftAuto();}
function draftTurn(){const D=S.draft;return D&&!D.done&&S.teams[D.order[D.idx]]&&S.teams[D.order[D.idx]].isUser;}

function alumniReport(s){const rows=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&p.teamId!==S.userTeamId&&p.hist.length&&p.hist[p.hist.length-1].s===s);
  rows.sort((a,b)=>calcValue(b)-calcValue(a));for(const p of rows.slice(0,5)){const t=S.teams[p.teamId];const st=p.hist[p.hist.length-1].st;const starter=t.lineup.includes(p.id)||t.rotation.includes(p.id);
    const line=isPitcher(p)?(st.pOuts?`${st.pW}승 ${st.pL}패 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:''):(st.ab?`타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'');
    news(`[출신] ${p.name} (${t.name}${t.league==='KR'?' '+t.div+'부':''}) ${line}${starter?` — 주전 ${POS_KO[t.pos[p.id]||p.pos]||''}`.trimEnd():''}`,'alumni');}
  for(const p of rows)if(p.interest==null&&calcOvr(p)>=66&&p.age<=29){const t=S.teams[p.teamId];if(t.league==='KR')news(`[출신] ${josa(p.name,'이','가')} 해외 구단의 관심을 받고 있다는 소문입니다.`,'alumni');}}
// ---------- 리그 내 위상 ----------
function leagueKey(t){return t.league==='KR'?'KR'+t.div:t.league;}
function leagueTeams(key){return Object.values(S.teams).filter(t=>leagueKey(t)===key);}
function roleVal(p,pos){return isPitcher(p)?calcOvr(p):posOvr(p,pos||p.pos);}
const _lgCache={};
function leagueBase(key){const c=_lgCache[key];if(c&&c.clock===S.clock&&c.n===Object.keys(S.players).length)return c;const ts=leagueTeams(key);const bat={},pit={SP:[],RP:[]},all=[];
  for(const t of ts){for(const id of t.lineup){const x=P_(id);const pos=t.pos[id];if(!x||!pos)continue;const v=pos==='DH'?offVal(x)+5:posOvr(x,pos);(bat[pos]=bat[pos]||[]).push(v);all.push(v);}
    for(const id of t.rotation){const x=P_(id);if(x){pit.SP.push(calcOvr(x));all.push(calcOvr(x));}}for(const id of t.bullpen.slice(0,4)){const x=P_(id);if(x){pit.RP.push(calcOvr(x));all.push(calcOvr(x));}}}
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;const o={clock:S.clock,n:Object.keys(S.players).length,all:avg(all),pos:{}};
  for(const k in bat)o.pos[k]={avg:avg(bat[k]),n:bat[k].length};o.pos.SP={avg:avg(pit.SP),n:pit.SP.length};o.pos.RP={avg:avg(pit.RP),n:pit.RP.length};_lgCache[key]=o;return o;}
function leagueStanding(p,key){const b=leagueBase(key);if(b.all==null)return {label:'-',cls:''};const ps=b.pos[isPitcher(p)?p.pos:p.pos]||{avg:null,n:0};const K=8;
  const avg=ps.avg==null?b.all:(ps.avg*ps.n+b.all*K)/(ps.n+K);const v=roleVal(p);
  return v>=avg+6?{label:'리그 정상급',cls:'g',avg}:v>=avg-2?{label:'리그 주전급',cls:'g',avg}:v>=avg-8?{label:'리그 백업급',cls:'',avg}:{label:'리그 수준 미달',cls:'r',avg};}
function expectedRole(p,t){const mine=roleVal(p);const slots=isPitcher(p)?(p.pos==='SP'?5:4):1;
  const others=t.roster.map(P_).filter(x=>x&&x.id!==p.id&&!x.retired&&(isPitcher(p)?(p.pos==='SP'?x.pos==='SP':isPitcher(x)):x.pos===p.pos)).map(x=>roleVal(x,p.pos)).sort((a,b)=>b-a);
  const k=others.filter(v=>v>mine).length;
  if(k<slots){const c=others[slots-1];return c==null||mine>=c+3?'주전':'주전 경쟁';}
  const gap=others[slots-1]-mine;if(gap<=3)return '주전 경쟁';if(k<slots*2+1)return '백업';return '벤치';}
function standingAll(p){return ['KR1','KR2','KR3','JP','US','TW','MX','AU','CB'].map(k=>({key:k,name:k.startsWith('KR')?k[2]+'부':BAL.LEAGUES[k].name,lvl:k.startsWith('KR')?BAL.LEVEL_OVR[k]:BAL.LEVEL_OVR[k],...leagueStanding(p,k)}));}

// ---------- 겨울리그 파견 (비시즌 전용, 동계훈련 대체) ----------
function winterTeams(){return overseasTeams().filter(t=>BAL.LEAGUES[t.league].winter);}
function dispatchEligible(p){const ut=userTeam();if(!p||p.retired)return false;if(!ut.roster.includes(p.id)&&!ut.dev.includes(p.id))return false;
  return p.age<=BAL.DISPATCH.maxAge&&!S.pendingFA.includes(p.id)&&!(p.contract&&p.contract.years<=0)&&!S.market.listed.includes(p.id);}
function dispatchFee(t){return BAL.DISPATCH.fee[t.league]||400;}
function dispatchOptions(p){return winterTeams().map(t=>{const role=expectedRole(p,t);const share=BAL.DISPATCH.share[role];const lvlF=clamp(1+(BAL.LEVEL_OVR[t.league]-calcOvr(p))*0.02,0.8,1.25);const exp=0.3+0.8*share*lvlF;
  return {team:t,role,share,fee:dispatchFee(t),growth:exp>=0.82?'국내보다 높음':exp>=0.6?'국내와 비슷':'국내보다 낮음',gcls:exp>=0.82?'g':exp>=0.6?'':'r',need:needOf(t).includes(p.pos)};}).sort((a,b)=>b.share-a.share||a.fee-b.fee);}
function createDispatch(){createDispatchFor(userTeam());}
function createDispatchFor(ut){S.dispatch={s:S.season,phase:'open',reqs:[],list:[],declined:[]};
  const cands=ut.roster.concat(ut.dev).map(P_).filter(p=>dispatchEligible(p)&&(p.scout.est-calcOvr(p))>=4).sort((a,b)=>(b.scout.est-calcOvr(b))-(a.scout.est-calcOvr(a))).slice(0,3);
  for(const p of cands){const opts=dispatchOptions(p).filter(o=>o.role==='주전'||o.role==='주전 경쟁');const o=opts.find(x=>x.need)||opts[0];if(o)S.dispatch.reqs.push({pid:p.id,team:o.team.id});}
  if(S.dispatch.reqs.length)news(`겨울리그에서 파견 요청 ${S.dispatch.reqs.length}건이 왔습니다. 2주차까지 결정하세요.`,'sys');}
function dispatchPlayer(pid,teamId){const D=S.dispatch;const ut=userTeam();const p=P_(pid);const t=S.teams[teamId];
  if(!D||D.phase!=='open')return '파견 결정 기간(스토브리그 1~2주차)이 아닙니다.';if(!t||!BAL.LEAGUES[t.league]||!BAL.LEAGUES[t.league].winter)return '겨울리그 구단이 아닙니다.';
  if(!dispatchEligible(p))return `${BAL.DISPATCH.maxAge}세 이하이고 계약이 남은 우리 선수만 파견할 수 있습니다.`;if(p.dispatch)return '이미 파견이 정해진 선수입니다.';
  if(D.list.length>=BAL.DISPATCH.max)return `한 시즌에 최대 ${BAL.DISPATCH.max}명까지 파견할 수 있습니다.`;const fee=dispatchFee(t);if(ut.cash<fee)return `파견비가 부족합니다 (${money(fee)}).`;
  const role=expectedRole(p,t);ut.cash-=fee;ut.fin.dispatch=(ut.fin.dispatch||0)+fee;p.dispatch={s:D.s,team:t.id,role,fee,lg:t.league};D.list.push({pid,team:t.id,role,fee});D.reqs=D.reqs.filter(r=>r.pid!==pid);
  news(`${josa(p.name,'을','를')} ${t.name}(${BAL.LEAGUES[t.league].name})에 파견합니다. 예상 역할: ${role}`,'contract');return null;}
function cancelDispatch(pid){const D=S.dispatch;const p=P_(pid);if(!D||D.phase!=='open'||!p||!p.dispatch)return '취소할 수 없습니다.';const ut=userTeam();ut.cash+=p.dispatch.fee;ut.fin.dispatch=(ut.fin.dispatch||0)-p.dispatch.fee;D.list=D.list.filter(x=>x.pid!==pid);p.dispatch=null;return null;}
function declineDispatch(pid){const D=S.dispatch;if(!D)return;D.reqs=D.reqs.filter(r=>r.pid!==pid);if(!D.declined.includes(pid))D.declined.push(pid);}
function dispatchWeek(){const D=S.dispatch;if(!D)return;
  if(D.phase==='open'&&S.week>=2){D.phase='running';D.reqs=[];if(D.list.length)news(`겨울리그 개막 — 우리 선수 ${D.list.length}명 출전`,'sys');}
  else if(D.phase==='running'&&S.week>=4)resolveDispatch();}
function resolveDispatch(){const D=S.dispatch;if(!D||D.phase==='done')return;
  overseasSeasonSummary(true);
  for(const x of D.list){const p=P_(x.pid);if(!p||!p.dispatch)continue;const t=S.teams[x.team];const base=BAL.DISPATCH.share[p.dispatch.role];const share=clamp(base*(0.8+rnd()*0.4),0.05,1);
    const st=summaryStat(p,t.league,share);p.winter=p.winter||[];p.winter.push({s:D.s,tn:t.name,lg:t.league,role:p.dispatch.role,share:r1(share),st});if(p.winter.length>8)p.winter.shift();
    p.dispatchDone={s:D.s,lg:t.league,role:p.dispatch.role,share};p.morale=clamp(p.morale+(share>=0.6?5:share<0.3?-6:0),0,100);
    const good=isPitcher(p)?(st.pOuts>=30&&st.pER*27/st.pOuts<3.6):(st.pa>=40&&ops_(st)>0.78);
    const line=isPitcher(p)?`${st.pW}승 ${st.pL}패 ERA ${st.pOuts?(st.pER*27/st.pOuts).toFixed(2):'-'}`:`타율 ${st.ab?(st.h/st.ab).toFixed(3).replace(/^0/,''):'-'} ${st.hr}홈런`;
    news(`${p.name} ${BAL.LEAGUES[t.league].name} 파견 종료 (${t.name}, ${p.dispatch.role}): ${line}${good?' — 현지 호평!':''}`,'contract');
    if(good&&share>=0.5){p.exposure=D.s;improveScout(p,0.05);if(!p.interest&&calcOvr(p)>=54){const lg=calcOvr(p)>=62?'JP':pick(['TW','MX']);const ot=pick(overseasTeams().filter(o=>o.league===lg));p.interest={team:ot.id,lg,stage:1};news(`${ot.name} 스카우트가 겨울리그에서 ${josa(p.name,'을','를')} 눈여겨봤습니다.`,'overseas');}}
    p.dispatch=null;}
  D.phase='done';}

// ---------- 감독 실적 (2단계 평판용) ----------
function mgrStart(){S.mgr=S.mgr||{seasons:[],cur:null};const ut=userTeam();const c=compOf(ut);const ts=compTeams(c).map(t=>({t,pw:teamPower(t).power})).sort((a,b)=>b.pw-a.pw);const er=ts.findIndex(x=>x.t.id===ut.id)+1;
  S.mgr.cur={s:S.season,div:c,expRank:er,powerStart:ts.find(x=>x.t.id===ut.id).pw,sales:[],goal:goalFor(ut,er,ts.length)};ensureCareer();}
function mgrEnd(s,rec){if(!S.mgr)S.mgr={seasons:[],cur:null};const ut=userTeam();const c=S.mgr.cur&&S.mgr.cur.s===s?S.mgr.cur:{s,div:rec.user.div,expRank:null,powerStart:null,sales:[]};
  let dev=0;for(const id of ut.roster){const p=P_(id);if(!p||p.devCredited||p.devStart==null)continue;const starter=ut.lineup.includes(id)||ut.rotation.includes(id)||ut.closer===id;if(starter&&calcOvr(p)-p.devStart>=8){p.devCredited=s;dev++;news(`[육성 성과] ${josa(p.name,'이','가')} 우리 구단에서 주전으로 성장했습니다 (${Math.round(p.devStart)} → ${Math.round(calcOvr(p))}).`,'sys');}}
  const abroad=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR'&&!BAL.LEAGUES[S.teams[p.teamId].league].winter&&(S.teams[p.teamId].lineup.includes(p.id)||S.teams[p.teamId].rotation.includes(p.id))).length;
  const salesFee=c.sales.reduce((a,x)=>a+x.fee,0),salesProfit=c.sales.reduce((a,x)=>a+x.fee-x.cost,0);
  const goal=c.goal||null;S.mgr.seasons.push({s,team:ut.id,tn:ut.name,goal:goal?goal.text:null,goalMet:goal?rec.user.rank<=goal.target:null,div:c.div,expRank:c.expRank,rank:rec.user.rank,promoted:S.lastSummary?S.lastSummary.promoted:false,relegated:S.lastSummary?S.lastSummary.relegated:false,powerStart:c.powerStart,powerEnd:teamPower(ut).power,sales:c.sales.length,salesFee,salesProfit,devHits:dev,abroad});
  for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(p)p.coached=true;}
  if(S.mgr.seasons.length>40)S.mgr.seasons.shift();S.mgr.cur=null;S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];S.mgr.repHist.push([s,S.mgr.rep]);if(S.mgr.repHist.length>40)S.mgr.repHist.shift();}

// ---------- 감독 평판 · 이직 (2단계) ----------
function goalFor(t,r,n){if(r<=1)return {text:'우승',target:1};if(t.league==='KR'&&t.div>1&&r<=Math.ceil(n/2))return {text:'승격권 (2위 이내)',target:2};if(r<=Math.ceil(n/3))return {text:'상위 2위 이내',target:2};
  if(t.league==='KR'&&t.div<3&&r>n-2)return {text:`잔류 (${n-2}위 이내)`,target:n-2};return {text:`${Math.ceil(n/2)}위 이내 (재건)`,target:Math.ceil(n/2)};}
function ensureCareer(){S.mgr.career=S.mgr.career||[];const ut=userTeam();const last=S.mgr.career[S.mgr.career.length-1];if(!last||last.team!==ut.id)S.mgr.career.push({team:ut.id,name:ut.name,comp:compOf(ut),from:S.season,to:null});}
const REP_TIER={3:0.8,2:1.0,1:1.25,TW:1.0,JP:1.3,MX:1.0,US:1.5};
function repScore(m){let sc=0;if(m.expRank!=null)sc+=(m.expRank-m.rank)*3;else sc+=(m.rank<=2?3:m.rank>=7?-2:0);if(m.rank===1)sc+=6;if(m.promoted)sc+=8;if(m.relegated)sc-=8;
  if(m.goalMet===true)sc+=4;else if(m.goalMet===false)sc-=3;sc+=(m.devHits||0)*4+(m.abroad||0)*2;
  if(m.powerStart!=null&&m.powerEnd!=null){const d=m.powerEnd-m.powerStart;sc+=clamp(d*1.5,-10,6);if(d>=-1.5&&m.salesProfit>0)sc+=Math.min(4,m.salesProfit/50000);}
  return sc*(REP_TIER[m.div]||1)*0.5;}
function calcRep(){const ms=(S.mgr&&S.mgr.seasons)||[];let sum=0;ms.forEach((m,i)=>{sum+=repScore(m)*Math.pow(0.85,ms.length-1-i);});return Math.round(clamp(25+sum+(S.mgr.loyalty||0),0,100));}
function repGrade(r){return r>=75?'전설적 명장':r>=62?'명장':r>=50?'유능한 감독':r>=35?'주목받는 신예':'무명';}
function repParts(){const ms=(S.mgr&&S.mgr.seasons)||[];const P={perf:0,dev:0,ops:0,abroad:0};ms.forEach((m,i)=>{const w=Math.pow(0.85,ms.length-1-i)*(REP_TIER[m.div]||1)*0.5;
  let pf=0;if(m.expRank!=null)pf+=(m.expRank-m.rank)*3;else pf+=(m.rank<=2?3:m.rank>=7?-2:0);if(m.rank===1)pf+=6;if(m.promoted)pf+=8;if(m.relegated)pf-=8;if(m.goalMet===true)pf+=4;else if(m.goalMet===false)pf-=3;
  P.perf+=pf*w;P.dev+=(m.devHits||0)*4*w;P.abroad+=(m.abroad||0)*2*w;if(m.powerStart!=null&&m.powerEnd!=null){const d=m.powerEnd-m.powerStart;let o=clamp(d*1.5,-10,6);if(d>=-1.5&&m.salesProfit>0)o+=Math.min(4,m.salesProfit/50000);P.ops+=o*w;}});
  for(const k in P)P[k]=r1(P[k]);P.loyalty=S.mgr.loyalty||0;return P;}
function teamOutlook(t){const c=compOf(t);const ts=compTeams(c).map(x=>({x,pw:teamPower(x).power})).sort((a,b)=>b.pw-a.pw);const r=ts.findIndex(y=>y.x.id===t.id)+1;return {rank:r,n:ts.length,power:ts[r-1].pw,goal:goalFor(t,r,ts.length)};}
function genJobOffers(){S.jobOffers=[];const ut=userTeam();const rep=S.mgr.rep!=null?S.mgr.rep:calcRep();ensureCareer();const cand=[];const devTot=S.mgr.seasons.reduce((a,m)=>a+(m.devHits||0),0);
  const tenure=S.season-(S.mgr.career[S.mgr.career.length-1].from)+1;if(tenure<1)return;
  const former=new Set(S.mgr.career.map(c=>c.team));const lm=S.mgr.seasons[S.mgr.seasons.length-1];const nMy=compTeams(compOf(ut)).length;
  const lastGood=!lm||lm.promoted||lm.rank<=Math.ceil(nMy/2)||(lm.expRank!=null&&lm.expRank-lm.rank>=1)||lm.goalMet===true;
  const facSum=t=>t.fac.train+t.fac.youth+t.fac.scout;const ok=(need)=>lastGood?rep>=need:rep>=need+12;
  for(const t of krTeams()){if(t.id===ut.id||former.has(t.id))continue;const need=BAL.REP_NEED[t.div];const unhappy=(t.lastRank||5)>=4||(t._relegatedAt===S.season);
    const sameTier=ut.league==='KR'&&t.div===ut.div;if(sameTier&&!(lastGood&&(t.cash>ut.cash*1.2||facSum(t)>facSum(ut))))continue;
    if(ok(need)&&unhappy&&(ut.league!=='KR'||t.div<=ut.div))cand.push({t,kind:'job',w:rep-need+(ut.league==='KR'&&t.div<ut.div?12:0)});}
  for(const t of overseasTeams().filter(x=>BAL.JOB_LEAGUES.includes(x.league)&&!x.isUser&&!former.has(x.id))){const need=BAL.REP_NEED[t.league];const n=compTeams(t.league).length;
    if((ok(need)||(t.league==='TW'&&devTot>=3&&rep>=40&&lastGood))&&(t.lastRank||n)>=Math.ceil(n/2))cand.push({t,kind:'job',w:rep-need+6});}
  for(const c of S.mgr.career){if(c.team===ut.id)continue;const t=S.teams[c.team];if(!t)continue;const n=compTeams(compOf(t)).length;const struggling=t.league==='KR'?((t.lastRank||0)>=n-1||t._relegatedAt===S.season):(t.lastRank||0)>=n-1;
    if(struggling&&rep>=30&&!cand.some(x=>x.t.id===t.id))cand.push({t,kind:'return',w:40});}
  const seen=new Set();cand.sort((a,b)=>(b.kind==='return')-(a.kind==='return')||(b.w+rnd()*8)-(a.w+rnd()*8));
  for(const c of cand){if(S.jobOffers.length>=3)break;if(seen.has(c.t.id))continue;const pr=c.kind==='return'?1:clamp(0.2+c.w/40,0.15,0.85);if(rnd()>pr)continue;seen.add(c.t.id);
    const o=teamOutlook(c.t);S.jobOffers.push({id:S.nextOfferId++,team:c.t.id,kind:c.kind,goal:o.goal,rankExp:o.rank,n:o.n,expires:2,reason:c.kind==='return'?'친정 구단의 복귀 요청':c.t.league!=='KR'?'해외 구단의 감독 제의':c.t.div<ut.div?'상위 리그 구단의 감독 제의':'국내 구단의 감독 제의'});}
  if(S.jobOffers.length)news(`감독 제의 ${S.jobOffers.length}건이 도착했습니다 (평판 ${rep} · ${repGrade(rep)}). 스토브리그 2주차까지 결정하세요.`,'sys');}
function declineJob(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return;S.jobOffers=S.jobOffers.filter(x=>x!==o);const t=S.teams[o.team];
  S.mgr.loyalty=Math.min(5,(S.mgr.loyalty||0)+1);const ut=userTeam();ut.rep=clamp(ut.rep+1,5,100);news(`${t.name}의 제의를 거절하고 ${ut.name}에 남기로 했습니다. 팬들이 환영합니다.`,'sys');}
function moveManager(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return '유효한 제의가 아닙니다.';if(S.phase!=='offseason')return '이직은 스토브리그 중에만 할 수 있습니다.';
  const old=userTeam();const nt=S.teams[o.team];if(!nt||nt.isUser)return '대상 구단을 찾을 수 없습니다.';
  if(S.dispatch&&S.dispatch.phase==='open')for(const x of [...S.dispatch.list])cancelDispatch(x.pid);
  for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==old.id)continue;if(rnd()<0.6&&p.age<35)p.contract={salary:Math.round(salaryFor(p)*(0.95+rnd()*0.2)/10)*10,years:ri(1,3)};else{removeFromTeam(old,p);S.fa.push(pid);p.transfers.push({s:S.season,from:old.name,to:'FA',fee:0,kind:'계약 만료'});}}
  S.pendingFA=[];S.market.listed=[];S.market.offers=[];S.market.negs=[];S.market.scoutResults=null;
  for(const pid of old.roster.concat(old.dev)){const p=P_(pid);if(!p)continue;p.coached=true;p.exUser=true;p.promise=null;}
  old.isUser=false;old.locks={};old.lineupMode='win';autoLineup(old);
  const last=S.mgr.career[S.mgr.career.length-1];if(last&&last.team===old.id)last.to=S.season;
  nt.isUser=true;S.userTeamId=nt.id;nt.locks={};nt.dev=nt.dev||[];nt.loan=nt.loan||0;nt.fin=Object.assign(newFin(),nt.fin||{});
  if(nt.league!=='KR'){const e=econ(nt);nt.cash=Math.min(nt.cash,e.sponsor*1.5);}
  const reun=[];for(const pid of nt.roster.concat(nt.dev)){const p=P_(pid);if(!p)continue;if(p.coached)reun.push(p.name);p.userLink=true;p.exUser=false;p.base=JSON.parse(JSON.stringify(p.attrs));p.snap=snapOf(p);p.valHist=p.valHist||[];p.valHist.push([S.season,calcValue(p)]);if(p.age<=23&&p.devStart==null)p.devStart=r1(calcOvr(p));if(p.scout.conf<0.45)p.scout=makeScout(p,0.45);}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];const yn=2+nt.fac.youth;for(let i=0;i<yn;i++){const need=needOf(nt);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+nt.fac.youth*1.2,potBoost:nt.fac.youth*2.5,conf:0.4,nat:nt.league==='KR'?'KR':nt.league});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  autoLineup(nt);S.mgr.career.push({team:nt.id,name:nt.name,comp:compOf(nt),from:S.season+1,to:null});S.jobOffers=[];
  if(S.dispatch&&S.dispatch.phase==='open'){S.dispatch.list=[];createDispatchFor(nt);}
  news(`${josa(old.name,'을','를')} 떠나 ${nt.name}(${compName(compOf(nt))}) 감독으로 취임했습니다.`,'sys');if(reun.length)news(`옛 제자와 재회: ${reun.join(', ')}`,'alumni');
  return null;}
function formerClubReport(s,rec){if(!S.mgr||!S.mgr.career)return;const ut=userTeam();const seen=new Set();for(const c of S.mgr.career){if(c.team===ut.id||seen.has(c.team))continue;seen.add(c.team);const t=S.teams[c.team];if(!t)continue;
  const pro=rec.promoted.includes(t.name),rel=rec.relegated.includes(t.name);if(rel)t._relegatedAt=s;
  news(`[친정] ${t.name}: ${s}시즌 ${compName(rec.user&&t.league==='KR'?(pro?t.div+1:rel?t.div-1:t.div):compOf(t))} ${t.lastRank||'-'}위${pro?' — 승격!':rel?' — 강등':''}`,'alumni');}}
// ---------- 시즌 종료 / 스토브리그 / 새 시즌 ----------
function endSeason(){
  const s=S.season;const ut=userTeam();const rec={s,tables:{},user:null,promoted:[],relegated:[]};
  const tables={};for(let d=1;d<=3;d++)tables[d]=standings(d);
  for(let d=1;d<=3;d++){tables[d].forEach((t,i)=>{t.lastRank=i+1;const dv=BAL.DIVIDEND[d][i];t.cash+=dv;t.fin.dividend+=dv;t.rep=clamp(t.rep+(i<2?3:i>=6?-3:0),5,100);});
    rec.tables[d]=tables[d].map((t,i)=>({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1}));}
  const pl=playLg();let plRows=null;if(pl){const st=standings(pl);st.forEach((t,i)=>{t.lastRank=i+1;});const dv=econ(ut).dividend[ut.lastRank-1]||0;ut.cash+=dv;ut.fin.dividend+=dv;ut.rep=clamp(ut.rep+(ut.lastRank<=2?2:ut.lastRank>=st.length-1?-2:0),5,100);
    plRows=st.map((t,i)=>({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1}));rec.tables[pl]=plRows;}
  rec.user={div:compOf(ut),rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,cash:ut.cash,fin:{...ut.fin}};
  const up2=tables[2].slice(0,2),dn1=tables[1].slice(6),up3=tables[3].slice(0,2),dn2=tables[2].slice(6);
  for(const t of up2){t.div=1;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 1부 승격!`,'league');}
  for(const t of dn1.concat(dn2))t._relegatedAt=s;
  for(const t of dn1){t.div=2;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 2부 강등`,'league');}
  for(const t of up3){t.div=2;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 2부 승격!`,'league');}
  for(const t of dn2){t.div=3;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 3부 강등`,'league');}
  // 유저 시즌 결산
  const ups=ut.roster.map(P_);const bb=ups.filter(p=>!isPitcher(p)&&p.cur.pa>=40).sort((a,b)=>ops_(b.cur)-ops_(a.cur))[0];const bp=ups.filter(p=>isPitcher(p)&&p.cur.pOuts>=30).sort((a,b)=>(a.cur.pER/a.cur.pOuts)-(b.cur.pER/b.cur.pOuts))[0];
  S.lastSummary={s,div:rec.user.div,rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,bestBat:bb?`${bb.name} 타율 ${(bb.cur.h/Math.max(1,bb.cur.ab)).toFixed(3)} ${bb.cur.hr}홈런`:'-',bestPit:bp?`${bp.name} ${bp.cur.pW}승 ERA ${(bp.cur.pER*27/bp.cur.pOuts).toFixed(2)}`:'-',promoted:up3.concat(up2).some(t=>t.isUser),relegated:dn1.concat(dn2).some(t=>t.isUser),fin:{...ut.fin}};
  S.history.push(rec);
  // 선수 시즌 기록 보존
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;const t=p.teamId!=null?S.teams[p.teamId]:null;if(t&&t.league!=='KR'&&t.league!==pl)continue;
    if(p.cur.g>0||p.cur.pG>0)p.hist.push({s,team:t?t.id:null,tn:t?t.name:'FA',lg:t?leagueKey(t):'FA',st:p.cur});if(p.hist.length>15)p.hist.shift();p.cur=newStat();p.fatigue=0;
    if(p.userLink){p.valHist.push([s,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}}
  overseasSeasonSummary(false,pl,plRows);
  alumniReport(s);
  formerClubReport(s,rec);
  mgrEnd(s,rec);
  // 나이/은퇴
  const retired=[];
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;p.age++;
    const ovr=calcOvr(p);let pr=p.age>=38?1:p.age>=33?(p.age-32)*0.13+(ovr<48?0.3:0):0;if(p.teamId==null&&!p.scouted&&p.age>=30)pr+=0.3;
    if(rnd()<pr){const t=p.teamId!=null?S.teams[p.teamId]:null;if(t)removeFromTeam(t,p);S.fa=S.fa.filter(x=>x!==p.id);S.pendingFA=S.pendingFA.filter(x=>x!==p.id);p.retired=true;p.retiredSeason=s;
      if(p.userLink){retired.push(p.name);news(`${p.name} 은퇴 (${p.age}세)`,'contract');}else delete S.players[pid];}}
  // 계약 갱신
  for(const t of liveTeams()){for(const pid of [...t.roster,...t.dev]){const p=P_(pid);if(!p.contract)continue;p.contract.years--;
      if(p.contract.years<=0){if(t.isUser){S.pendingFA.push(pid);news(`${p.name} 계약 만료 — 스토브리그 2주차까지 우선 협상 가능`,'contract');}
        else{if(rnd()<0.7&&p.age<35&&calcOvr(p)>=levelOf(t)-10){p.contract={salary:Math.round(salaryFor(p)*(0.9+rnd()*0.3)/10)*10,years:ri(1,3)};}
          else{removeFromTeam(t,p);S.fa.push(pid);p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});}}}}}
  // 해외 소속 유저 연계 선수 계약
  for(const t of overseasTeams()){if(t.isUser)continue;for(const pid of [...t.roster]){const p=P_(pid);if(!p.contract||!p.userLink)continue;p.contract.years--;
      if(p.contract.years<=0){if(rnd()<0.6&&p.age<34){p.contract={salary:p.contract.salary,years:ri(1,3)};news(`[해외] ${p.name} ${josa(t.name,'과','와')} 재계약`,'overseas');}
        else{removeFromTeam(t,p);if(p.age<=36){S.fa.push(pid);p.homecoming=S.userTeamId;p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} ${josa(t.name,'과','와')} 계약 만료. 친정 복귀를 희망하며 FA로 나왔습니다!`,'overseas');}else{p.retired=true;p.retiredSeason=s;}}}}
    for(const pid of [...t.roster]){const p=P_(pid);if(p.age>=37||(p.age>=34&&rnd()<0.25)){removeFromTeam(t,p);if(p.userLink){p.retired=true;p.retiredSeason=s;}else delete S.players[pid];}}}
  // 유소년/신인
  for(const t of krTeams()){if(t.isUser)continue;for(let i=0;i<1;i++){const need=needOf(t);const p=genPlayer({pos:need.length?pick(need):pick(ROSTER_TEMPLATE),age:ri(18,21),lvl:BAL.LEVEL_OVR.ROOKIE+(t.div===1?5:t.div===2?2:0),potBoost:t.fac.youth*1.5});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  const yn=2+ut.fac.youth;for(let i=0;i<yn;i++){const need=needOf(ut);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.youth*1.2,potBoost:ut.fac.youth*2.5,conf:0.35+ut.fac.youth*0.05});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  for(const t of overseasTeams()){if(t.isUser)continue;const RS=BAL.LEAGUES[t.league].roster;while(t.roster.length<RS){const need=needOf(t);const p=genPlayer({pos:need.length?need[0]:pick(ROSTER_TEMPLATE),age:ri(19,26),lvl:levelOf(t)-4,nat:t.league});registerPlayer(p);addToTeam(p,t,{salary:Math.round(salaryFor(p)*(t.league==='US'?3:t.league==='JP'?2.5:1.3)/10)*10,years:ri(1,4)});}
    t.cash=Math.min(BAL.OVERSEAS_CASH[t.league],t.cash+BAL.OVERSEAS_CASH[t.league]*0.5);autoLineup(t);}
  // FA 풀 정리: 2시즌 이상 미계약자 제거
  S.fa=S.fa.filter(id=>{const p=P_(id);if(!p)return false;p.faSeasons=(p.faSeasons||0)+1;if(p.faSeasons>=2&&!p.userLink&&!p.homecoming){delete S.players[id];return false;}return true;});
  S.market.attempts={};S.market.negs=[];S.market.listed=[];
  S.market.offers=S.market.offers.filter(o=>o.type==='overseas');
  interestCheck();
  S.phase='offseason';S.week=1;S.clock++;
  createDraft();draftStep();
  createDispatch();
  for(const t of krTeams())if(!t.isUser)autoLineup(t);fixLineup(userTeam());
  genJobOffers();
  news(`${s}시즌 종료. 스토브리그가 시작됩니다.`,'sys');
  return S.lastSummary;
}
function advanceWeek(){
  if(S.phase!=='offseason')return false;S.warn=[];
  const ut=userTeam();
  if(S.draft&&!S.draft.done){if(draftTurn())draftAuto();draftStep();}
  dispatchWeek();
  if(S.jobOffers&&S.jobOffers.length&&S.week>=2){for(const o of S.jobOffers)news(`${S.teams[o.team].name}의 감독 제의가 만료되었습니다.`,'sys');S.jobOffers=[];}
  if(S.week===3){for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==ut.id)continue;removeFromTeam(ut,p);S.fa.push(pid);p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} FA로 떠났습니다.`,'contract');}S.pendingFA=[];fixLineup(ut);}
  for(const t of shuffle(krTeams().filter(t=>!t.isUser)))aiWeek(t);
  overseasWeek();
  marketTick(0.2);
  if(S.week<=4){const cands=ut.roster.map(P_).filter(p=>!S.market.listed.includes(p.id)&&(p.lockUntil||0)<=S.clock).sort((a,b)=>calcValue(b)-calcValue(a)).slice(0,4);
    for(const p of cands){if(p.dispatch)continue;if(rnd()<0.12){const buyers=krTeams().filter(t=>!t.isUser&&t.div<=ut.div&&t.cash>calcValue(p)*1.5);if(buyers.length)makeAIOffer(pick(buyers),p,true);}}}
  if(S.week===2)interestCheck();
  S.week++;S.clock++;
  if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 시즌 시작 전 회복 조치가 필요합니다.`);
  return true;
}
function rosterCheck(t){const ps=t.roster.map(P_).filter(Boolean);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;const issues=[];
  if(ps.length<BAL.MIN_ROSTER)issues.push(`선수 ${ps.length}명 (최소 ${BAL.MIN_ROSTER}명)`);if(pit<BAL.MIN_PITCHERS)issues.push(`투수 ${pit}명 (최소 ${BAL.MIN_PITCHERS}명)`);if(c<1)issues.push('포수 없음');return issues;}
function autoFillUser(){const ut=userTeam();const added=[];let guard=0;
  while(rosterCheck(ut).length&&guard++<20){const ps=ut.roster.map(P_);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;
    const pos=c<1?'C':pit<BAL.MIN_PITCHERS?pick(['SP','RP']):(needOf(ut)[0]||pick(ROSTER_TEMPLATE));
    const p=genPlayer({pos,age:ri(19,24),lvl:BAL.LEVEL_OVR.ROOKIE+2,conf:0.4});registerPlayer(p);p.userLink=true;addToTeam(p,ut,{salary:BAL.SALARY_MIN,years:2});p.transfers.push({s:S.season,from:'긴급 보강',to:ut.name,fee:0,kind:'최소 인원 보충'});added.push(p.name);}
  fixLineup(ut);return added;}
function startNewSeason(){
  if(S.phase!=='offseason')return {ok:false,msg:'시즌 진행 중입니다.'};
  const ut=userTeam();
  while(S.week<=BAL.OFFSEASON_WEEKS)advanceWeek();
  const issues=rosterCheck(ut);if(issues.length)return {ok:false,msg:'선수단 요건 미달: '+issues.join(', '),issues};
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  if(S.market.scoutResults&&S.market.scoutResults.kind==='youth'){for(const id of S.market.scoutResults.ids){const p=P_(id);if(p&&p.teamId==null)delete S.players[id];}}S.market.scoutResults=null;
  S.market.offers=S.market.offers.filter(o=>o.type==='overseas'&&o.expires>S.clock);
  S.season++;S.day=1;S.phase='season';S.week=0;S.clock++;
  const pl=playLg();if(pl)for(const t of compTeams(pl)){t.rec={w:0,l:0,rs:0,ra:0};t.rotIdx=0;if(!t.isUser)autoLineup(t);}
  for(const t of liveTeams()){t.rec={w:0,l:0,rs:0,ra:0};t.fin=newFin();t.rotIdx=0;
    if(t.loan>0){t.cash-=t.loan;t.fin.other+=t.loan;news(`대출 ${money(t.loan)} 상환`,'fin');t.loan=0;}
    applySponsor(t);let up=econ(t).overhead;for(const k in t.fac)up+=BAL.FACILITY[k].upkeep*t.fac[k];t.cash-=up;t.fin.facility+=up;
    if(!t.isUser&&t.cash>payroll(t)*2.5){const k=pick(['train','youth','scout']);if(t.fac[k]<5){const c=BAL.FACILITY[k].cost*t.fac[k];t.cash-=c;t.fin.facility+=c;t.fac[k]++;}}
    if(!t.isUser){aiFillRookies(t);autoLineup(t);}
    for(const pid of t.roster.concat(t.dev)){const p=P_(pid);const dd=p.dispatchDone&&p.dispatchDone.s===S.season-1?p.dispatchDone:null;
      if(dd){growthTick(p,{kind:'dispatch',label:`${S.season-1}시즌 겨울리그 파견`,team:t,dd});p.fatigue=Math.round(30+dd.share*35);p.cond=-(2+dd.share*3);}
      else{growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:t});p.fatigue=0;}
      p.xp=0;p.ovrStart=r1(calcOvr(p));}}
  for(const t of overseasTeams()){if(t.isUser)continue;for(const pid of t.roster){const p=P_(pid);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null});}}
  for(const id of S.fa){const p=P_(id);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null});}
  const keepAttrs=new Set();for(const id of ut.roster.concat(ut.dev))keepAttrs.add(+id);for(const id of S.pins||[])keepAttrs.add(+id);
  for(const id in S.players){const p=S.players[id];if(p.retired){p.snapPrev=null;p.snap=null;continue;}const rich=keepAttrs.has(+id)||p.userLink||p.exUser;
    p.snapPrev=p.snap?(rich?p.snap:{s:p.snap.s,ovr:p.snap.ovr,val:p.snap.val}):null;p.snap=snapOf(p);if(!rich){delete p.snap.attrs;if(!p.userLink)delete p.base;}}
  S.dispatch=null;mgrStart();
  fixLineup(ut);genSchedule();S.lastSummary=null;
  news(`${S.season}시즌 개막! ${compName(compOf(ut))} ${BAL.SEASON_GAMES}경기 일정이 확정되었습니다.`,'sys');
  return {ok:true};
}

// ---------- 저장/불러오기 ----------
const STAT_KEYS=['cur','st'];
function serialize(){return JSON.stringify(S,function(k,v){if((k==='cur'||k==='st')&&v&&typeof v==='object'&&!Array.isArray(v)){const o={};for(const kk in v)if(v[kk])o[kk]=v[kk];return o;}return v;});}
function validateSave(o){const e=[];if(!o||typeof o!=='object')return ['JSON 객체가 아닙니다'];if(![1,2,VERSION].includes(o.version))e.push(`지원하지 않는 버전(${o.version})`);if(!o.teams||typeof o.teams!=='object')e.push('구단 데이터 없음');if(!o.players||typeof o.players!=='object')e.push('선수 데이터 없음');
  if(o.teams&&!o.teams[o.userTeamId])e.push('유저 구단 정보 없음');if(!Array.isArray(o.schedule))e.push('일정 데이터 없음');if(typeof o.rng!=='number')e.push('난수 상태 없음');return e;}
function hydrate(){const fill=st=>Object.assign(newStat(),st||{});
  for(const id in S.players){const p=S.players[id];p.cur=fill(p.cur);for(const h of p.hist||[])h.st=fill(h.st);for(const w of p.winter||[])w.st=fill(w.st);p.log=p.log||[];p.transfers=p.transfers||[];p.valHist=p.valHist||[];}
  if(S.liveGame&&S.liveGame.box)for(const id in S.liveGame.box)S.liveGame.box[id]=fill(S.liveGame.box[id]);}
function migrate(){const from=S.version;
  for(const id in S.teams){const t=S.teams[id];t.dev=t.dev||[];t.fin=Object.assign(newFin(),t.fin||{});}
  if(S.draft===undefined)S.draft=null;S.settings=S.settings||{stopOnOffer:true};S.pins=S.pins||[];if(S.dispatch===undefined)S.dispatch=null;S.overseas=S.overseas||{hist:[]};
  const have=new Set(Object.values(S.teams).map(t=>t.league));const added=[];
  for(const lg in BAL.LEAGUES)if(!have.has(lg)){TEAM_NAMES[lg].forEach(([n,c])=>{const t=genTeam(n,c,lg,0,false);S.teams[t.id]=t;fillRoster(t);autoLineup(t);for(const pid of t.roster){const p=S.players[pid];p.snap={s:S.season,ovr:r1(calcOvr(p)),val:calcValue(p)};}});added.push(BAL.LEAGUES[lg].name);}
  if(!S.mgr){S.mgr={seasons:(S.history||[]).map(r=>({s:r.s,div:r.user.div,expRank:null,rank:r.user.rank,promoted:false,relegated:false,powerStart:null,powerEnd:null,sales:0,salesFee:0,salesProfit:0,devHits:0,abroad:0,legacy:true})),cur:null};
    if(S.phase==='season'){const ut=userTeam();S.mgr.cur={s:S.season,div:ut.div,expRank:null,powerStart:teamPower(ut).power,sales:[]};}}
  const ut=userTeam();for(const id of ut.roster.concat(ut.dev)){const p=S.players[id];if(p&&p.devStart==null&&p.age<=24&&p.base){const b={...p,attrs:p.base};p.devStart=r1(calcOvr(b));}}
  S.jobOffers=S.jobOffers||[];if(S.mgr){S.mgr.loyalty=S.mgr.loyalty||0;if(S.mgr.rep==null)S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];ensureCareer();if(S.mgr.cur&&!S.mgr.cur.goal){const o=teamOutlook(userTeam());S.mgr.cur.goal=o.goal;}}
  for(const id of userTeam().roster.concat(userTeam().dev)){const p=S.players[id];if(p)p.coached=true;}for(const id in S.players){const p=S.players[id];if(p.exUser)p.coached=true;}
  if(from!==VERSION){S.version=VERSION;if(added.length)news(`세계가 넓어졌습니다: ${added.join(', ')} 추가 (가상 리그)`,'sys');}}
function load(json){let o;try{o=JSON.parse(json);}catch(err){throw new Error('JSON 형식이 아닙니다.');}const e=validateSave(o);if(e.length)throw new Error(e.join(', '));const prev=S;S=o;try{hydrate();migrate();}catch(err){S=prev;throw new Error('세이브 변환 실패: '+err.message);}return S;}
function state(){return S;}
function setState(o){S=o;}

// ---------- 표시 보조 ----------
function statLine(p,st){st=st||p.cur;if(isPitcher(p)){const ip=st.pOuts/3;return {ip:Math.floor(ip)+'.'+(st.pOuts%3),era:st.pOuts?(st.pER*27/st.pOuts).toFixed(2):'-',w:st.pW,l:st.pL,sv:st.pSV,so:st.pSO,bb:st.pBB,h:st.pH,g:st.pG,gs:st.pGS};}
  const avg=st.ab?(st.h/st.ab):0;return {avg:st.ab?avg.toFixed(3).replace(/^0/,''):'-',hr:st.hr,rbi:st.rbi,ops:st.pa?ops_(st).toFixed(3).replace(/^0/,''):'-',g:st.g,pa:st.pa,h:st.h,bb:st.bb,so:st.so,r:st.r,d2:st.d2,d3:st.d3};}
function potText(p){return `${gradeOf(p.scout.lo)}~${gradeOf(p.scout.hi)}`;}
function contractText(p){if(!p.contract)return '계약 없음';const y=p.contract.years;if(S.phase==='season'){if(y<=1)return `이번 시즌(${S.season}) 종료 후 FA`;return `${S.season+y-1}시즌 종료 후 FA`;}if(y<=0)return `계약 만료 — 스토브리그 2주차까지 우선협상`;return `${S.season+y}시즌 종료 후 FA`;}
function diagnose(p){
  const isP=isPitcher(p);const a=p.attrs;const ut=userTeam();const mine=p.teamId===S.userTeamId;
  const bestTxtM={contact:'정확한 타격',power:'장타력',eye:'선구안',speed:'주력',defense:'수비 범위',arm:'송구',stuff:'구위',control:'제구',movement:'변화구 구사',stamina:'체력'};
  const fk=k=>({contact:'contact',power:'power',eye:'eye',speed:'speed',defense:'defense',arm:'defense',stuff:'stuff',control:'control',movement:'movement',stamina:'stamina'}[k]);
  let arch,core,weak=null,lines=[],best;
  if(isP){core=['stuff','control','movement'];if(p.pos==='SP')core.push('stamina');best=[...core].sort((x,y)=>a[y]-a[x])[0];
    arch=p.pos==='SP'?(best==='stuff'?'파워형 선발':best==='control'?'제구형 선발':best==='movement'?'변화구형 선발':'이닝이터'):(best==='stuff'?'파워 불펜':best==='control'?'제구형 불펜':'변화구형 불펜');
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[best]-12||a[lo]<40)weak=lo;}
  else{core=['contact','power','eye'];const off=[...core].sort((x,y)=>a[y]-a[x]);best=off[0];
    const prem=['C','SS','2B','CF'].includes(p.pos);if(prem&&a.defense>=Math.max(a.contact,a.power))best='defense';else if(a.speed>a[off[0]]+5)best='speed';
    arch={contact:'교타형',power:'장타형',eye:'선구안형',speed:'주루형',defense:'수비형'}[best]+' '+(POS_KO[p.pos]||p.pos);
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[off[0]]-12)weak=lo;if(!weak&&prem&&a.defense<45)weak='defense';}
  const young=p.age<=24;const est=p.scout?p.scout.est:p.pot;const ovr=calcOvr(p);
  const target=isP?(p.pos==='SP'?'1~3선발':'필승조·마무리'):(best==='power'?'주전 중심타자':best==='contact'||best==='eye'?'주전 테이블세터':best==='speed'?'주전 리드오프':'주전 '+(POS_KO[p.pos]||''));
  const goal=young&&est-ovr>=5?`${arch.split(' ')[0]} 유망주 → ${target}`:ovr>=65?`${target} (전성기 유지)`:`${arch} → ${target} 경쟁`;
  // 타격/투구 진단
  const st=(p.cur.pa>0||p.cur.pOuts>0)&&S.phase==='season'?p.cur:(p.hist.length?p.hist[p.hist.length-1].st:null);
  const small=!st||(isP?st.pOuts<30:st.pa<40);const n=st?(isP?Math.floor(st.pOuts/3)+'이닝':st.pa+'타석'):'0';
  if(isP){let t=weak==='control'?'구위에 비해 제구가 흔들려 볼넷이 많아집니다':weak==='movement'?'변화구가 단조로워 장타를 허용하기 쉽습니다':weak==='stuff'?'구위가 약해 헛스윙을 끌어내기 어렵습니다':weak==='stamina'?'체력이 부족해 긴 이닝을 버티기 어렵습니다':'구종·제구가 고르게 갖춰져 있습니다';
    if(st&&!small){const era=st.pER*27/st.pOuts;t=`ERA ${era.toFixed(2)} — `+t;}lines.push({k:'투구',t});}
  else{let t=weak==='contact'?'파워 대비 컨택이 부족해 타율이 낮아집니다':weak==='power'?'정확도는 좋지만 장타가 적어 타점 생산이 약합니다':weak==='eye'?'선구안이 부족해 삼진이 많고 볼넷이 적습니다':weak==='defense'?`${POS_KO[p.pos]}에 필요한 수비력이 부족합니다`:'타격 능력이 고르게 갖춰져 있습니다';
    if(st&&!small){const avg=st.ab?(st.h/st.ab):0;t=`타율 ${avg.toFixed(3).replace(/^0/,'')} ${st.hr}홈런 — `+t;}lines.push({k:'타격',t});
    const cur=mine?ut.pos[p.id]:null;if(cur&&cur!=='DH'&&cur!==p.pos){const pen=posPenalty(p,cur);lines.push({k:'수비',t:`현재 ${POS_KO[cur]} 배치는 적성 밖이라 수비가 ${pen} 낮아집니다 → ${POS_KO[p.pos]} 복귀 검토`,warn:true});}
    else if(mine&&cur)lines.push({k:'수비',t:`${POS_KO[cur]} 배치 — 적성에 맞습니다`});}
  lines.push({k:'판단 신뢰도',t:small?`표본 부족 (${n}) — 성적보다 능력치로 판단하세요`:`충분한 표본 (${n})`,warn:small});
  const rec=weak?fk(weak):young&&est-ovr>=5?fk(best==='arm'?'defense':best):'balance';
  const F=isP?FOCUS_PIT:FOCUS_BAT;const recText=rec==='balance'?'균형 훈련 유지':`${F[rec]} 훈련 추천`+(weak?` (${ATTR_KO[weak]} 보완)`:` (강점 강화)`);
  return {arch,goal,weak,best,bestTxt:bestTxtM[best],lines,rec,recText,small};
}
function advice(p){const d=diagnose(p);return {text:d.lines.map(l=>l.t).join(' '),goal:d.rec==='balance'?null:d.rec,goalKo:d.rec==='balance'?null:(isPitcher(p)?FOCUS_PIT:FOCUS_BAT)[d.rec]};}
function nextCheck(){return S.phase==='season'?(7-((S.day-1)%7)):null;}
function seasonDelta(p){const b=p.snap;if(!b)return null;return {d:Math.round(calcOvr(p))-Math.round(b.ovr),v:b.val?calcValue(p)-b.val:null};}
function saleImpact(pid){const ut=userTeam();const p=P_(pid);if(!p||p.teamId!==ut.id)return null;const before=teamPower(ut),after=teamPower(ut,pid);
  const res={before:before.power,after:after.power,delta:r1(after.power-before.power),newcomers:[]};
  if(isPitcher(p)){if(before.spIds.includes(pid)){for(const id of after.spIds)if(!before.spIds.includes(id))res.newcomers.push({p:P_(id),pos:'선발 로테이션'});}}
  else{const bl=before.lineup.pos,al=after.lineup.pos;for(const id in al)if(bl[id]==null)res.newcomers.push({p:P_(+id),pos:POS_KO[al[id]]});
    if(!res.newcomers.length&&bl[pid])res.newcomers=[];}
  return res;}
function facEffect(k,lv){if(k==='train')return [`성장 속도 +${(lv-1)*12}%`,`피로 회복 ${BAL.FATIGUE_RECOVER+(lv-1)*2}/일`];if(k==='youth')return [`유소년 후보 ${2+lv}명/시즌`,`육성군 정원 ${BAL.DEV_BASE+lv}명`,`유망주 잠재 보너스 +${(lv*2.5).toFixed(1)}`];return [`보고서 정확도 +${(lv-1)*5}%`,`후보 수 ${lv>=3?'+1':'기본'}`];}
function growthTop(n){const ut=userTeam();const label=S.phase==='season'?null:null;const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p||!p.log.length)continue;const l=p.log[0];let d=0;for(const k in l.ch)d+=l.ch[k];const since=p.ovrStart!=null?r1(calcOvr(p)-p.ovrStart):0;rows.push({p,d:r1(d),since,label:l.label});}rows.sort((a,b)=>b.d-a.d);return rows.slice(0,n||3);}
function snapOf(p){return {s:S.season,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs))};}
function baseSnap(p){if(S.phase==='season')return p.snapPrev||p.snap||null;return p.snap||null;}
function report(p){const b=baseSnap(p);if(!b)return null;const now=calcOvr(p);const ch={};let bestK=null,bestD=-99;for(const k in p.attrs){const d=r1(p.attrs[k]-(b.attrs[k]!=null?b.attrs[k]:p.attrs[k]));ch[k]=d;if(d>bestD){bestD=d;bestK=k;}}
  return {s:b.s,from:Math.round(b.ovr),to:Math.round(now),d:Math.round(now)-Math.round(b.ovr),valFrom:b.val||null,valTo:calcValue(p),ch,bestK,bestD,bestFrom:b.attrs[bestK]};}
function growthReport(n){const ut=userTeam();const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p)continue;const r=report(p);if(r&&r.d>0)rows.push({p,r});}rows.sort((a,b)=>b.r.d-a.r.d||b.r.bestD-a.r.bestD);return rows.slice(0,n||3);}
function togglePin(pid){if(S.pins.includes(pid))S.pins=S.pins.filter(x=>x!==pid);else{S.pins.unshift(pid);if(S.pins.length>5)S.pins.length=5;}}
function interestText(p){if(!p.interest)return null;const t=S.teams[p.interest.team];if(!t)return null;const st=['관심 없음','관찰 중','영입 검토','공식 제안'][p.interest.stage]||'관찰 중';return `${t.name} — ${st}`;}

return {BAL,VERSION,ATTR_KO,FOCUS_BAT,FOCUS_PIT,TRAITS,POS_BAT,BAT_KEYS,PIT_KEYS,NEED_TEMPLATE,
  newGame,state,setState,load,serialize,validateSave,
  startDay,endUserGame,finishDay,playDayAuto,stepPitch,stepPA,stepHalf,stepGame,finalizeGame,changePitcher,pinchHit,availableBullpen,bench,curBatter,curPitcher,
  standings,rankOf,userTeam,userGameToday,payroll,ticketIncome,isUserGame,
  calcOvr,posOvr,gradeOf,calcValue,salaryFor,money,isPitcher,velocity,statLine,ops_,potText,confText,scoutReport,interestText,needOf,countPos,
  autoLineup,fixLineup,rosterCheck,autoFillUser,
  listPlayer,unlistPlayer,respondOffer,negotiate,cancelNeg,renewContract,releasePlayer,takeLoan,upgradeFacility,runScout,signScouted,aiAsk,playerDemand,
  endSeason,advanceWeek,startNewSeason,growthTick,interestCheck,
  promoteDev,demoteDev,devCap,draftAvail,draftPick,draftAuto,draftTurn,draftStep,
  willingInfo,contractText,advice,growthTop,togglePin,openTable,tableOffer,tableLeave,tableLeft,report,growthReport,
  diagnose,nextCheck,seasonDelta,saleImpact,facEffect,teamPower,bestLineup,posPenalty,josa,POS_KO,NAT_KO,
  compOf,compTeams,compName,playLg,calcRep,repGrade,repParts,teamOutlook,genJobOffers,declineJob,moveManager,econ,
  leagueKey,leagueStanding,expectedRole,standingAll,winterTeams,dispatchEligible,dispatchOptions,dispatchPlayer,cancelDispatch,declineDispatch,resolveDispatch,levelOf,
  P:P_,krTeams,overseasTeams,rnd};
})();
if(typeof module!=='undefined')module.exports=SL;


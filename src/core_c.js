// ===================== 코어 (C: 시즌/육성/경제/이적/해외/저장) =====================
function userTeam(){return S.teams[S.userTeamId];}
function P_(id){return S.players[id];}
function krTeams(){return Object.values(S.teams).filter(t=>t.league==='KR');}
function divTeams(div){return krTeams().filter(t=>t.div===div);}
// 경쟁 단위: 국내는 부(1~3), 해외는 리그 또는 리그/지구('JP/0' = 일본 센트럴리그)
function lgOf(c){return typeof c==='string'?c.split('/')[0]:c;}
function activeT(t){return !(t.since>S.season);}
function compOf(t){if(t.league==='KR')return t.div;const L=BAL.LEAGUES[t.league];if(!L||!L.subs||t.sub==null)return t.league;if(S.compLegacy&&S.compLegacy.s===S.season&&S.compLegacy.lg===t.league)return t.league;return t.league+'/'+t.sub;}
function compTeams(c){if(typeof c==='number')return divTeams(c);const [lg,sub]=String(c).split('/');return Object.values(S.teams).filter(t=>t.league===lg&&activeT(t)&&(sub==null||t.sub===+sub));}
function compName(c){if(typeof c==='number')return c+'부';const [lg,sub]=String(c).split('/');const L=BAL.LEAGUES[lg];if(!L)return String(c);return sub!=null&&L.subs?L.name+' '+L.subs[+sub]:L.name;}
function leagueComps(lg){const L=BAL.LEAGUES[lg];if(!L||!L.subs)return [lg];if(S.compLegacy&&S.compLegacy.s===S.season&&S.compLegacy.lg===lg)return [lg];return L.subs.map((_,i)=>lg+'/'+i);}
function playLg(){const t=userTeam();return t&&t.league!=='KR'?t.league:null;}
function liveTeams(){const pl=playLg();return pl?krTeams().concat([userTeam()]):krTeams();}
function econ(t){if(t.league==='KR')return {ticket:BAL.TICKET[t.div],sponsor:BAL.SPONSOR[t.div],overhead:BAL.OVERHEAD[t.div],dividend:BAL.DIVIDEND[t.div]};return BAL.ECON[t.league]||{ticket:2000,sponsor:50000,overhead:20000,dividend:[20000]};}
function news(text,kind){S.news.unshift({s:S.season,d:S.phase==='season'?S.day:'OFF'+S.week,text,kind:kind||'n'});if(S.news.length>120)S.news.length=120;}
function warn(text){S.warn.push(text);}

// ---------- 새 게임 ----------
function newGame(seed,userIdx,opt){opt=opt||{};
  S={version:VERSION,seed:seed|0,rng:seed|0,nextId:1,season:1,day:1,phase:'season',week:0,clock:1,userTeamId:null,teams:{},players:{},schedule:[],liveGame:null,fa:[],
     market:{listed:[],offers:[],negs:[],attempts:{},scoutResults:null},youth:[],pendingFA:[],news:[],history:[],overseas:{hist:[]},tutorialDone:false,nextOfferId:1,warn:[],lastSummary:null,draft:null,settings:{stopOnOffer:true},pins:[],dispatch:null,mgr:{seasons:[],cur:null}};
  TEAM_NAMES.KR.forEach(([n,c],i)=>{const t=genTeam(n,c,'KR',Math.floor(i/8)+1,false);presInit(t,i);S.teams[t.id]=t;});
  for(const lg in BAL.LEAGUES)TEAM_NAMES[lg].forEach(([n,c,sub])=>{const t=genTeam(n,c,lg,0,false);if(sub!=null)t.sub=sub;S.teams[t.id]=t;});
  const d3=divTeams(3);const ut=d3[clamp(userIdx|0,0,d3.length-1)];ut.isUser=true;S.userTeamId=ut.id;
  for(const t of Object.values(S.teams)){fillRoster(t);autoLineup(t);}
  for(const id in S.players){const p=S.players[id];p.snap=snapOf(p);}
  presBoostRosters();
  if(opt.arch)applyArch(ut,opt.arch===true?BAL.ARCH_OF[clamp(userIdx|0,0,7)]:opt.arch);
  ut.staff=starterStaff(ut);refreshStaffPool();
  for(const pid of ut.roster){const p=P_(pid);p.userLink=true;if(p.age<=23)p.devStart=r1(calcOvr(p));p.ovrStart=r1(calcOvr(p));if(p.contract.years<2)p.contract.years=2;p.scout=makeScout(p,0.45);p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([1,calcValue(p)]);}
  for(let i=0;i<40;i++){const p=genPlayer({pos:pick(ROSTER_TEMPLATE),lvl:BAL.LEVEL_OVR.FA,nat:rnd()<0.1?pick(['US','JP']):'KR'});S.players[p.id]=p;S.fa.push(p.id);}
  for(const id in S.players){const p=S.players[id];if(!p.userLink){delete p.snap.attrs;delete p.base;}}
  genSchedule();
  ensureSpon(ut);
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
  const pl=playLg();if(pl)genOverseasSchedule(pl);
  S.schedule.sort((a,b)=>a.day-b.day||String(a.div).localeCompare(String(b.div)));
}
function rrRounds(ids){const arr=ids.slice();if(arr.length%2)arr.push(null);const n=arr.length,R=n-1,half=n/2,rounds=[];
  for(let r=0;r<R;r++){const pairs=[];for(let i=0;i<half;i++){const a=arr[i],b=arr[n-1-i];if(a!=null&&b!=null)pairs.push(((r+i)%2===0)?[a,b]:[b,a]);}rounds.push(pairs);arr.splice(1,0,arr.pop());}return rounds;}
// 유저가 해외 구단을 맡은 경우의 압축 일정 (28경기). 양대 리그면 같은 리그 22경기 + 교류전 6경기
function genOverseasSchedule(pl){const G=BAL.SEASON_GAMES;const comps=leagueComps(pl);const groups=comps.map(c=>compTeams(c).map(t=>t.id));
  const push=(day,h,a)=>S.schedule.push({day,div:pl,home:h,away:a,res:null});
  const inter=groups.length===2&&groups[0].length===groups[1].length?groups[0].length:0;const interStart=Math.floor((G-inter)/2)+1;
  const intraDays=[];for(let d=1;d<=G;d++)if(!(inter&&d>=interStart&&d<interStart+inter))intraDays.push(d);
  for(const g of groups){const rounds=rrRounds(g);const R=rounds.length;intraDays.forEach((d,k)=>{const c=Math.floor(k/R),r=k%R;for(const [h,a] of rounds[r]){const flip=c%2===1;push(d,flip?a:h,flip?h:a);}});}
  if(inter){const [A,B]=groups,m=A.length;for(let r=0;r<m;r++){const d=interStart+r;for(let i=0;i<m;i++){const a=A[i],b=B[(i+r)%m];if((i+r)%2)push(d,a,b);else push(d,b,a);}}}}
function h2h(a,b){let w=0;for(const g of S.schedule){if(!g.res||g.post)continue;if(g.home===a&&g.away===b){if(g.res.hs>g.res.as)w++;}else if(g.home===b&&g.away===a){if(g.res.as>g.res.hs)w++;}}return w;}
function standings(div){const ts=compTeams(div);ts.sort((a,b)=>b.rec.w-a.rec.w||h2h(b.id,a.id)-h2h(a.id,b.id)||(b.rec.rs-b.rec.ra)-(a.rec.rs-a.rec.ra)||b.rec.rs-a.rec.rs||a.id-b.id);return ts;}
function rankOf(t){return standings(compOf(t)).findIndex(x=>x.id===t.id)+1;}
function isUserGame(g){return g.home===S.userTeamId||g.away===S.userTeamId;}
function userGameToday(){return S.schedule.find(g=>g.day===S.day&&isUserGame(g))||null;}
function payroll(t){let s=0;for(const pid of t.roster.concat(t.dev||[])){const p=P_(pid);if(p&&p.contract)s+=p.contract.salary*(p.loan&&p.loan.to===t.id?p.loan.pay:1);}
  for(const pid of (t.loaned||[])){const p=P_(pid);if(p&&p.contract&&p.loan&&p.loan.from===t.id)s+=p.contract.salary*(1-p.loan.pay);}return Math.round(s);}

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
  const recAdd={};for(const t of liveTeams()){if(d>BAL.SEASON_GAMES)break;const pay=Math.round(payroll(t)/BAL.SEASON_GAMES);t.cash-=pay;t.fin.salary+=pay;
    if(t.isUser&&t.staff){const sp=Math.round(staffPay(t)/BAL.SEASON_GAMES);t.cash-=sp;t.fin.staff=(t.fin.staff||0)+sp;recAdd[t.id]=staffFx(t).rec;}}
  for(const g of S.schedule){if(g.day!==d||!g.res)continue;const h=S.teams[g.home];if(h.league!=='KR'&&!h.isUser)continue;const inc=ticketIncome(h);h.cash+=inc;h.fin.tickets+=inc;if(h.isUser)boardGate(h,inc);}
  for(const pid in S.players){const p=S.players[pid];if(p.retired||p.teamId==null)continue;const t=S.teams[p.teamId];if(!t||(t.league!=='KR'&&t.league!==playLg()))continue;
    const rec=BAL.FATIGUE_RECOVER+(t.fac.train-1)*2+(p.traits.includes('강철체력')?6:0)+(recAdd[t.id]||0);p.fatigue=Math.max(0,(p.fatigue||0)-rec);
    p.cond=clamp((p.cond||0)*0.85+gauss()*1.3,-6,6);}
  marketTick(0.12);
  if(d===10||d===17)for(const t of krTeams())presCrisis(t);
  if(d===15)endorseOffers();endorseTick();
  if(d%7===0&&d<=BAL.SEASON_GAMES)reserveWeek();
  if(d%7===0&&d<=BAL.SEASON_GAMES){for(const t of liveTeams()){for(const pid of t.roster)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t});for(const pid of t.dev)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t,dev:true});}
    for(const pid of userTeam().roster)improveScout(P_(pid),0.06);scoutWatch();}
  promiseTick();grievanceTick();
  if(d===14){interestCheck();}
  S.day++;S.clock++;
  const ut=userTeam();if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 선수 판매, 긴급 대출(재정 탭) 등 회복 조치가 필요합니다.`);
  if(S.day===BAL.SEASON_GAMES+1&&!S.post)createPost();
  else if(S.day>BAL.SEASON_GAMES)endSeason();
}
function ticketIncome(t){const wp=(t.rec.w+t.rec.l)?t.rec.w/(t.rec.w+t.rec.l):0.5;return Math.round(econ(t).ticket*(0.7+t.rep/100*0.6)*presIncome(t)*(0.8+wp*0.4)*(0.9+rnd()*0.2));}
function applySponsor(t){if(t.isUser)return sponPay(t);const inc=Math.round(econ(t).sponsor*(0.7+t.rep/100*0.6)*presIncome(t));t.cash+=inc;t.fin.sponsor+=inc;}
function playDayAuto(){const lg=startDay();if(lg){stepGame(lg);return endUserGame();}else{finishDay();return null;}}

// ---------- 육성 ----------
function growthTick(p,ctx){
  if(!p||p.retired)return;const ovr0=calcOvr(p);const isP=isPitcher(p);const ovr=calcOvr(p);const peak=p.peakAge;const f=[];
  let expF;
  if(ctx.kind==='winter'){expF=0.7;f.push('국내 동계 훈련');}
  else if(ctx.kind==='rest'){expF=0.25;f.push('겨울 휴식 (성장 대신 회복)');}
  else if(ctx.kind==='dispatch'){const dd=ctx.dd;const lvlF=clamp(1+((BAL.LEVEL_OVR[dd.lg]||55)-ovr0)*0.02,0.8,1.25);expF=0.3+0.8*dd.share*lvlF;f.push(`${BAL.LEAGUES[dd.lg].name} 파견 (${dd.role})`);if(dd.share<0.35)f.push('파견지 출장 부족');else if(lvlF>1.05)f.push('수준 높은 실전 경험');}
  else if(ctx.dev){expF=BAL.DEV_EXP;f.push('육성군(2군) 경기 출장');}
  else{const target=isP?BAL.XP_TARGET_PIT:BAL.XP_TARGET_BAT;const ratio=(p.xp||0)/target;expF=0.4+0.6*Math.pow(Math.min(1,ratio),0.7);
    if(ratio>1.7){expF-=0.15;f.push('과도한 출장(피로)');}else if(ratio>=0.8)f.push('주전 출장');else if(p.resWeek&&expF<BAL.RES_EXP){expF=BAL.RES_EXP;f.push(ratio>=0.3?'1군 일부 출장 + 2군 경기':'2군 경기 출장');}else if(ratio>=0.3)f.push('일부 출장');else f.push('출장 기회 부족');
    if(ctx.team&&ctx.team.locks&&ctx.team.locks[p.id]&&p.age<=24){expF+=0.05;f.push('출장 보장(육성 약속)');}
    if(ratio<0.3&&p.age>=23&&p.age<peak)p.pot=Math.max(ovr,p.pot-0.25);}
  const fat=p.fatigue||0;if(fat>80){expF*=0.8;f.push('피로 누적');}
  const gap=p.pot-ovr;const gapF=clamp(gap/18,0,1.3);const a=p.age;
  let ageF=a<peak-1?1:a<=peak+1?0.45:0;if(a<=21)ageF*=1.15;
  const fac=ctx.team?ctx.team.fac.train:1;const facF=1+(fac-1)*0.12;if(fac>=2)f.push(`훈련장 Lv.${fac} 효과`);
  const fx=ctx.team&&ctx.team.staff?staffFx(ctx.team):null;let devM=1;if(fx&&(p.age<=23||ctx.dev)){devM=fx.dev*(staffTrait(ctx.team,'dev','u20')&&p.age<=20?1.08:1)*(ctx.dev&&staffTrait(ctx.team,'dev','devsq')?1.08:1);}
  let traitF=1;if(p.traits.includes('성실')){traitF+=0.3;f.push('성실한 태도');}if(p.traits.includes('게으름')){traitF-=0.3;f.push('훈련 태만');}
  const wint=ctx.kind==='winter'||ctx.kind==='dispatch'||ctx.kind==='rest';
  let pts=BAL.GROWTH_TICK*(wint?1.8:1)*expF*gapF*ageF*facF*traitF*devM*(0.7+rnd()*0.6);
  if(gap<=0.5&&ageF>0)pts=rnd()*0.25;
  const keys=isP?PIT_KEYS:BAT_KEYS;const focus=p.focus||'balance';const ch={};
  const fkey=focus==='balance'?null:focus;
  for(const k of keys){const w=fkey?(k===fkey?0.4:0.6/(keys.length-1)):1/keys.length;const hiF=clamp(1-(p.attrs[k]-60)/55,0.25,1);const dlt=pts*w*(0.6+rnd()*0.8)*hiF*(fx?attrMul(ctx.team,p,k,fx):1);p.attrs[k]=Math.min(99,p.attrs[k]+dlt);ch[k]=dlt;}
  if(fx&&pts>0.3){const ks=isP?PIT_KEYS:BAT_KEYS;const am=ks.reduce((s,k)=>s+attrMul(ctx.team,p,k,fx),0)/ks.length*devM;if(am>=1.04)f.push(`코치진 지도 (+${Math.round((am-1)*100)}%)`);else if(am<=0.96)f.push(`코치진 부족 (${Math.round((am-1)*100)}%)`);}
  if(fkey&&pts>0.3)f.unshift(`${(isP?FOCUS_PIT:FOCUS_BAT)[focus]} 집중 훈련`);
  if(a>peak+1){const yrs=Math.min(6,a-peak-1);let dec=BAL.DECLINE_PER_TICK*yrs*(wint?2.2:1)*(0.7+rnd()*0.6);if(p.traits.includes('강철체력'))dec*=0.7;if(fx){dec*=fx.aging;if(fx.aging<=0.95)f.push('트레이너 관리로 노화 완화');}if(ctx.kind==='rest'){dec*=0.5;f.push('휴식으로 노화 완화');}f.push('노화');
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
  if(p.homecoming===t.id)base*=0.7;else if(t.league==='KR'&&presOf(t)>=80)base*=0.93;if(p.endorse)base*=BAL.SPON.endorse.demand;return Math.round(base/10)*10;}
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
  if(p.homecoming!==t.id){const pd=presPull(p,t);if(pd.d){pw+=pd.d;if(pd.why)r.push(pd.why);}}
  pw=clamp(pw,0.05,0.97);return {pw,level:pw>=0.65?'긍정적':pw>=0.4?'보통':'부정적',reasons:r};}
function willingToJoin(p,t){const from=p.teamId!=null?S.teams[p.teamId]:null;let pw=0.75;if(from&&from.league==='KR'){if(t.div<from.div)pw=0.92;else if(t.div>from.div)pw=p.age>=31?0.6:0.35;}
  if(p.homecoming===t.id)pw=0.95;else pw+=presPull(p,t).d;if(p.traits.includes('강심장'))pw+=0.05;return pw;}

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
  let fee=v*(0.8+rnd()*0.3)*(need?1.08:1)*(t.div<userTeam().div?1.05:1)*(p.wantsOut===S.season?0.88:1);
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
  if(p.loan)return {ok:false,msg:p.loan.from===S.userTeamId?'임대 보낸 우리 선수입니다. 시즌이 끝나면 돌아옵니다.':'임대 중인 선수는 영입할 수 없습니다.'};
  const mine=p.teamId===S.userTeamId;const from=p.teamId!=null?S.teams[p.teamId]:null;const isFA=!from;
  let neg=S.market.negs.find(n=>n.pid===pid);if(neg)return {ok:true,neg};
  if(mine){const key='renew'+pid+':'+S.season;if((S.market.attempts[key]||0)>=3)return {ok:false,msg:'이번 시즌 재계약 협상 기회(3회)를 모두 사용했습니다.'};
    let dem=Math.max(salaryFor(p),(p.contract?p.contract.salary:0)*1.05);if(calcOvr(p)>=68&&ut.div===3&&p.age<=29)dem*=1.25;if(p.age>=33)dem*=0.85;if(p.grudge)dem*=1.15;
    neg={id:S.nextOfferId++,pid,mode:'renew',stage:'player',demand:Math.round(dem/10)*10,fee:0,ask:0,rounds:0,maxRounds:3,expires:S.clock+3,log:[],promise:false};}
  else{if(ut.roster.length>=BAL.MAX_ROSTER)return {ok:false,msg:`선수단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`};
    const key=pid+':'+S.season;if((S.market.attempts[key]||0)>=2)return {ok:false,msg:'이번 시즌 이 선수와의 협상 기회(2회)를 모두 사용했습니다.'};
    if(!isFA){const wi=willingInfo(p,ut);if(wi.level==='부정적'){return {ok:false,msg:`${p.name} 선수는 우리 구단으로의 이적에 관심이 없습니다 (이적 의향: 부정적 — ${wi.reasons.join(', ')}).`};}}
    neg={id:S.nextOfferId++,pid,mode:isFA?'sign':'club',stage:isFA?'player':'club',ask:isFA?0:aiAsk(from,p),demand:playerDemand(p,ut),fee:0,rounds:0,maxRounds:4,expires:S.clock+3,log:[],promise:false};
    if(!isFA&&from.league!=='KR')neg.ask=Math.round(neg.ask*1.3/100)*100;}
  neg.agent=calcValue(p)>=10000?agentName(p):null;neg.mood=Math.round(moodOf(p,neg));
  const mk=negKey(neg);const mem=(S.market.negMem||{})[mk];
  if(mem){neg.mood=Math.min(neg.mood,mem.mood);neg.second=true;if(mem.stage==='player'&&neg.stage==='club'){neg.stage='player';neg.fee=mem.fee;}neg.rounds=0;neg.maxRounds=Math.max(1,Math.min(2,neg.maxRounds-mem.used));}
  const wi=mine?null:willingInfo(p,ut);neg.wantPromise=!!(wi&&wi.reasons.some(r=>r.startsWith('출장')))||p.age<=23;
  neg.hint=[Math.round(neg.demand*0.85/10)*10,Math.round(neg.demand*1.15/10)*10];
  const key=from?from.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===pid)<5:false;
  neg.log=tableLines(p,neg,'greet',{key,poor:from&&from.cash<0});if(mine&&p.grudge)neg.log.push({who:neg.agent?'agent':'player',text:'솔직히 말씀드리면, 그때 주전 약속 안 지키신 거 아직 마음에 걸립니다. 이번엔 조건으로 보여 주셔야 합니다.'});
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
    neg.log.push(...tableLines(p,neg,'club_reject',{}));end();S.market.attempts[pid+':'+S.season]=2;return {ok:true,ended:true,neg,msg:`${josa(from.name,'이','가')} 협상을 끝냈습니다. 이번 시즌엔 이 선수 이적 협상에 다시 응하지 않습니다.`};}
  // 선수 단계
  const bonusEq=years?bonus/years*0.8:0;const eff=salary+bonusEq;
  const totalCost=neg.fee+bonus+(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0);
  if(neg.mode!=='renew'&&ut.cash<totalCost){return {ok:false,msg:`현금이 부족합니다. 필요 ${money(totalCost)} / 보유 ${money(ut.cash)}`,neg};}
  neg.rounds++;neg.log.push({who:'me',text:`연봉 ${money(salary)} × ${years}년${bonus?` + 계약금 ${money(bonus)}`:''}${promise?' + 주전 출장 약속':''}`});
  let dem=neg.demand*(years>=3?0.95:years===1?1.08:1)*(neg.mood<35?1.08:neg.mood>=75?0.96:1)*(promise&&neg.wantPromise?0.92:1);dem=Math.round(dem/10)*10;
  if(eff>=dem){
    const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;
    neg.log.push(...tableLines(p,neg,'accept',{promise}));end();
    if(promise){p.promise={s:S.phase==='season'?S.season:S.season+1,n:0,on:0};p.apology=null;}
    if(neg.mode==='renew'){p.grudge=null;p.contract={salary,years:years+(S.phase==='season'?1:0)};p.renewed=S.season;S.pendingFA=S.pendingFA.filter(x=>x!==pid);if(bonus){ut.cash-=bonus;ut.fin.buys+=bonus;}p.morale=Math.min(100,p.morale+8);news(`${p.name} 재계약 (${years}년, ${money(salary)}${bonus?', 계약금 '+money(bonus):''})`,'contract');return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 ${years}년 재계약했습니다.`};}
    const sb=(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0)+bonus;transferPlayer(pid,ut.id,neg.fee+sb,{salary,years},neg.mode==='sign'?'FA 영입':'영입');
    return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 계약했습니다. (${years}년, 연봉 ${money(salary)}${neg.fee?`, 이적료 ${money(neg.fee)}`:''}${sb?`, 계약금 ${money(sb)}`:''})`};}
  if(eff>=dem*0.85){neg.mood=clamp(neg.mood-4,0,100);neg.revealed=dem;neg.log.push(...tableLines(p,neg,'counter',{dem,wantPromise:neg.wantPromise,promise}));}
  else{neg.mood=clamp(neg.mood-18,0,100);neg.log.push(...tableLines(p,neg,'low',{mood:neg.mood}));}
  if(neg.mood<20){neg.log.push(...tableLines(p,neg,'walk',{}));end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(neg.mode==='renew'?3:2);return {ok:true,ended:true,neg,msg:`${p.name} 선수가 협상 테이블을 떠났습니다. 이번 시즌엔 다시 앉지 않습니다.`};}
  if(neg.rounds>=neg.maxRounds){neg.log.push(...tableLines(p,neg,'timeout',{}));negRemember(neg);end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;return {ok:true,ended:true,neg,msg:'협상이 종료되었습니다. 기회가 남아 있으면 다시 테이블을 열 수 있습니다.'};}
  return {ok:true,neg};
}
function negKey(neg){return (neg.mode==='renew'?'renew':'')+neg.pid+':'+S.season;}
function negRemember(neg){S.market.negMem=S.market.negMem||{};const k=negKey(neg);const old=S.market.negMem[k];S.market.negMem[k]={mood:neg.mood,stage:neg.stage,fee:neg.fee,used:(old?old.used:0)+neg.rounds};}
function tableLeave(pid){const neg=S.market.negs.find(n=>n.pid===pid);if(!neg)return;negRemember(neg);S.market.negs=S.market.negs.filter(n=>n!==neg);const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;}
function tableLeft(neg){const key=neg.mode==='renew'?'renew'+neg.pid+':'+S.season:neg.pid+':'+S.season;return Math.max(0,(neg.mode==='renew'?3:2)-(S.market.attempts[key]||0)-1);}
// 하위 호환 래퍼
function negotiate(pid,offer){const o=openTable(pid);if(!o.ok)return o;return tableOffer(pid,offer);}
function cancelNeg(pid){tableLeave(pid);}
function renewContract(pid,salary,years){const o=openTable(pid);if(!o.ok)return o;const r=tableOffer(pid,{salary,years});return r;}
// 주전 약속: 기용은 감독이 정한다. 14일차에 주전(라인업·로테이션·마무리·필승조)으로 쓰고 있는지 점검해 사기에 반영
function promiseKept(t,p){return t.lineup.includes(p.id)||t.rotation.includes(p.id)||t.closer===p.id||(p.pos==='RP'&&t.bullpen.indexOf(p.id)>=0&&t.bullpen.indexOf(p.id)<4);}
// 주전 약속 이행: 약속 이후 우리 경기에서 주전으로 쓴 비율로 판정 (13경기째 또는 시즌 끝, 60% 이상이면 지킴)
// 못 지키면 선수가 면담을 요청 → 감독이 사과(기회 약속) / 트레이드 요청 수용 / 무시 중 선택
const PROMISE_N=13,PROMISE_RATE=0.6;
function promiseTick(){const ut=userTeam();if(!userGameToday())return;
  for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p)continue;
    const pr=p.promise;if(pr&&pr.s===S.season){pr.n=(pr.n||0)+1;pr.on=(pr.on||0)+(promiseKept(ut,p)?1:0);if(pr.n>=PROMISE_N||S.day>=BAL.SEASON_GAMES)promiseJudge(p);}
    const ap=p.apology;if(ap&&ap.s===S.season){ap.n++;ap.on+=promiseKept(ut,p)?1:0;if(ap.n>=7||S.day>=BAL.SEASON_GAMES){if(ap.on>=4){p.morale=clamp(p.morale+8,0,100);news(`${p.name}: 약속대로 기회를 줘서 마음이 풀렸습니다.`,'contract');}else{p.morale=clamp(p.morale-15,0,100);p.grudge=S.season;news(`${p.name}: 사과 뒤에도 기회가 없어 감독을 믿지 않게 됐습니다.`,'contract');}p.apology=null;}}}}
function promiseJudge(p){const pr=p.promise;if(!pr)return;const rate=pr.n?pr.on/pr.n:0;p.promise=null;
  if(rate>=PROMISE_RATE){p.morale=clamp(p.morale+10,0,100);news(`${p.name}: 주전 약속이 지켜졌습니다 (${pr.n}경기 중 ${pr.on}경기 주전). 사기 상승.`,'contract');return;}
  p.morale=clamp(p.morale-15,0,100);S.grievances=(S.grievances||[]).filter(g=>g.pid!==p.id);S.grievances.push({pid:p.id,s:S.season,on:pr.on,n:pr.n,exp:S.clock+3});
  news(`${p.name}: 주전 약속이 지켜지지 않았습니다 (${pr.n}경기 중 ${pr.on}경기 주전). 감독 면담을 요청합니다.`,'contract');}
function promiseStatus(p){const pr=p.promise;if(pr&&pr.s===S.season&&S.phase==='season')return {kind:'promise',on:pr.on||0,n:pr.n||0,need:Math.ceil(PROMISE_N*PROMISE_RATE),of:PROMISE_N};if(pr)return {kind:'promise',on:0,n:0,need:Math.ceil(PROMISE_N*PROMISE_RATE),of:PROMISE_N,pending:true};
  const ap=p.apology;if(ap)return {kind:'apology',on:ap.on,n:ap.n,need:4,of:7};return null;}
function grievanceAnswer(pid,choice){const g=(S.grievances||[]).find(x=>x.pid===pid);const p=P_(pid);if(!g||!p)return '면담 요청이 없습니다.';S.grievances=S.grievances.filter(x=>x!==g);
  if(choice==='apology'){p.morale=clamp(p.morale+8,0,100);p.apology={s:S.season,n:0,on:0};news(`${p.name}에게 사과하고 기회를 약속했습니다 (7경기 중 4경기 이상 주전 기용).`,'contract');return null;}
  if(choice==='trade'){p.wantsOut=S.season;p.morale=clamp(p.morale+5,0,100);p.lockUntil=0;if(!S.market.listed.includes(pid))S.market.listed.push(pid);news(`${p.name}의 트레이드 요청을 받아들여 판매 목록에 올렸습니다. 사정을 아는 구단들이 값을 조금 낮게 부를 수 있습니다.`,'contract');return null;}
  p.morale=clamp(p.morale-10,0,100);p.grudge=S.season;news(`${p.name}의 면담 요청을 무시했습니다. 선수가 서운함을 품었습니다.`,'contract');return null;}
function grievanceTick(){for(const g of [...(S.grievances||[])])if(S.clock>=g.exp){const p=P_(g.pid);S.grievances=S.grievances.filter(x=>x!==g);if(p&&p.teamId===S.userTeamId){p.morale=clamp(p.morale-10,0,100);p.grudge=S.season;news(`${p.name}: 면담 요청에 답이 없어 서운함을 품었습니다.`,'contract');}}}
function releasePlayer(pid){const p=P_(pid);const ut=userTeam();if(!p||p.teamId!==S.userTeamId)return '우리 구단 선수가 아닙니다.';if(p.dispatch)return '파견 중인 선수는 방출할 수 없습니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;
  const sev=Math.round((p.contract?p.contract.salary*Math.max(1,p.contract.years)*0.3:0)/10)*10;ut.cash-=sev;ut.fin.other+=sev;removeFromTeam(ut,p);S.fa.push(pid);p.exUser=true;p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'방출'});fixLineup(ut);news(`${p.name} 방출 (위약금 ${money(sev)})`,'contract');return null;}
function removeFromTeam(t,p){t.roster=t.roster.filter(id=>id!==p.id);t.dev=(t.dev||[]).filter(id=>id!==p.id);t.lineup=t.lineup.filter(id=>id!==p.id);delete t.pos[p.id];t.rotation=t.rotation.filter(id=>id!==p.id);t.bullpen=t.bullpen.filter(id=>id!==p.id);if(t.closer===p.id)t.closer=null;p.teamId=null;p.contract=null;
  S.market.listed=S.market.listed.filter(x=>x!==p.id);S.market.offers=S.market.offers.filter(o=>o.pid!==p.id);S.market.negs=S.market.negs.filter(n=>n.pid!==p.id);}
function transferPlayer(pid,toId,fee,contract,kind){
  const p=P_(pid);const to=S.teams[toId];const from=p.teamId!=null?S.teams[p.teamId]:null;
  if(to.cash<fee&&!to.isUser&&to.league==='KR')return false;
  S.pendingFA=S.pendingFA.filter(x=>x!==pid);
  const wasStarter=!!from&&(from.lineup.includes(p.id)||from.rotation.includes(p.id)||from.closer===p.id);
  if(from)removeFromTeam(from,p);else{S.fa=S.fa.filter(x=>x!==pid);S.youth=S.youth.filter(x=>x!==pid);if(S.market.scoutResults)S.market.scoutResults.ids=S.market.scoutResults.ids.filter(x=>x!==pid);}
  if(from){from.cash+=fee;from.fin.sales+=fee;}
  to.cash-=fee;to.fin.buys+=fee;addToTeam(p,to,contract);
  if(fee>0&&p.sellOn&&from&&p.sellOn.team!==from.id&&S.teams[p.sellOn.team]){const share=Math.round(fee*p.sellOn.pct/10)*10;const ex=S.teams[p.sellOn.team];from.cash-=share;from.fin.sales-=share;ex.cash+=share;ex.fin.sales+=share;
    if(ex.isUser)news(`[셀온] 우리 출신 ${josa(p.name,'이','가')} ${josa(to.name,'으로')} 이적 — 이적료 ${money(fee)}의 ${Math.round(p.sellOn.pct*100)}%, ${money(share)} 입금!`,'alumni');p.sellOn=null;}
  else if(p.exUser&&from&&!from.isUser&&!to.isUser)news(`[출신] ${p.name}: ${from.name} → ${to.name}${fee?` (${money(fee)})`:''}`,'alumni');
  if(from&&from.isUser)p.coached=true;
  if(from&&from.isUser&&kind!=='방출'){p.exUser=true;if(fee>0)p.sellOn={team:from.id,pct:BAL.SELL_ON};}
  if(to.isUser){p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs))};p.exUser=false;if(p.age<=23&&p.devStart==null)p.devStart=r1(calcOvr(p));if(!p.base)p.base=JSON.parse(JSON.stringify(p.attrs));if(p.snap&&!p.snap.attrs){p.snap.attrs=JSON.parse(JSON.stringify(p.attrs));p.snap.join=1;}}
  if(from&&from.isUser&&fee>0&&S.mgr&&S.mgr.cur){S.mgr.cur.sales.push({pid:p.id,fee,cost:(p._acqFee||0),st:wasStarter?1:0});}
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
  const sfx=staffFx(ut);const n=BAL.SCOUT_N[level]+(ut.fac.scout>=3?1:0)+sfx.scoutN;const conf=clamp(BAL.SCOUT_CONF[level]+(ut.fac.scout-1)*0.05+sfx.conf+(kind==='overseas'&&staffTrait(ut,'scout','abroad')?0.1:0),0.05,0.8);filter=filter||{};
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
  lines.push(`${dg.arch} — ${josa(dg.bestTxt,'이','가')} 가장 돋보입니다.`+(dg.weak?` ${josa(ATTR_KO[dg.weak],'은','는')} 보완이 필요합니다.`:isPitcher(p)?' 구위·제구·변화구 쪽으로는 뚜렷한 약점이 없습니다.':' 타격 쪽으로는 뚜렷한 약점이 없습니다.')+(dg.fieldWeak&&dg.fieldWeak.length?` 다만 ${dg.fieldWeak.map(k=>ATTR_KO[k]+' '+Math.round(p.attrs[k])).join('·')}로 수비·주루가 크게 부족합니다.`:''));
  const est=p.scout.est,ovr=calcOvr(p);
  if(p.age<=23&&est-ovr>=10)lines.push('지금 능력보다 잠재력이 크게 남아 있어, 꾸준히 출장하면 큰 성장이 기대됩니다.');else if(p.age<=26&&est-ovr>=5)lines.push('아직 성장 여지가 남아 있다고 판단됩니다.');else if(p.age>=31)lines.push('성장보다는 현재 전력으로 평가해야 하는 베테랑입니다.');else lines.push('현재 능력이 거의 완성 단계로 보입니다.');
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
  for(const lg of Object.keys(BAL.LEAGUES).filter(k=>!!BAL.LEAGUES[k].winter===!!winter&&k!==skip)){const ts=overseasTeams().filter(t=>t.league===lg&&activeT(t));if(!ts.length)continue;const G=BAL.LEAGUES[lg].games;const str=ts.map(t=>{const ps=t.roster.map(P_).filter(Boolean);const b=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,9);const pi=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,8);const avg=a=>a.length?a.reduce((s,p)=>s+calcOvr(p),0)/a.length:50;return {t,s:avg(b)*0.55+avg(pi)*0.45};});
    const mean=str.reduce((s,x)=>s+x.s,0)/str.length;const all=str.map(x=>{const w=clamp(Math.round(G/2+(x.s-mean)*2.5*G/140+gauss()*6*G/140),Math.round(G*0.25),Math.round(G*0.75));return {id:x.t.id,name:x.t.name,w,l:G-w,sub:x.t.sub};});
    const rows=[];const subs=BAL.LEAGUES[lg].subs;for(let si=0;si<(subs?subs.length:1);si++){const grp=all.filter(r=>!subs||r.sub===si).sort((a,b)=>b.w-a.w);grp.forEach((r,i)=>{r.rank=i+1;const t=S.teams[r.id];t.rec={w:r.w,l:r.l,rs:0,ra:0};t.lastRank=i+1;rows.push(r);});}tables[lg]=rows;
    for(const t of ts){const ps=t.roster.map(P_).filter(Boolean);const bats=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));const pits=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a));
      bats.forEach((p,i)=>{const st=summaryStat(p,lg,i<9?0.92:i<13?0.4:0.14);p.hist.push({s:S.season,team:t.id,tn:t.name,lg,st,w:winter?1:0});while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();});
      pits.forEach((p,i)=>{const sp=p.pos==='SP'&&i<5;const st=summaryStat(p,lg,sp||i<8?0.9:0.35);if(!sp&&i===5)st.pSV=Math.round(ri(15,38)*G/140);
        p.hist.push({s:S.season,team:t.id,tn:t.name,lg,st,w:winter?1:0});while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();
        if(p.userLink){const ms=[];if(sp||i<8){if(!p.osStart){p.osStart=S.season;ms.push('해외 첫 주전 시즌');}}news(`[해외] ${p.name}(${t.name}) 시즌 성적: ${st.pW}승 ${st.pL}패 ERA ${(st.pER*27/st.pOuts).toFixed(2)}${ms.length?' — '+ms.join(', '):''}`,p.exUser&&ms.length?'alumni':'overseas');}});
      bats.forEach((p,i)=>{if(p.userLink){const h=p.hist[p.hist.length-1].st;const ms=[];if(i<9&&!p.osStart){p.osStart=S.season;ms.push('해외 첫 주전 시즌');}if(h.hr>0&&!p.osHr){p.osHr=S.season;ms.push('해외 무대 첫 홈런');}news(`[해외] ${p.name}(${t.name}) 시즌 성적: 타율 ${(h.h/Math.max(1,h.ab)).toFixed(3)}, ${h.hr}홈런${ms.length?' — '+ms.join(', '):''}`,p.exUser&&ms.length?'alumni':'overseas');}});
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
function aiWeek(t){presCrisis(t);
  if(t.cash<0){const ps=t.roster.map(P_).sort((a,b)=>calcValue(b)-calcValue(a));for(const p of ps.filter(x=>!x.loan).slice(0,3)){const buyers=krTeams().filter(x=>!x.isUser&&x.id!==t.id&&x.cash>calcValue(p)*1.3+payroll(x)*0.3).sort((a,b)=>b.cash-a.cash);
      if(buyers.length){const b=buyers[0];const fee=Math.round(calcValue(p)*0.95/100)*100;transferPlayer(p.id,b.id,fee,{salary:Math.round(salaryFor(p)/10)*10,years:ri(2,3)},'이적');if(t.cash>=0)break;}
      else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});if(t.cash>=0)break;}}}
  if(t.roster.length<26)aiSignFA(t,2);
  if(t.roster.length>=24&&t.cash>payroll(t)*1.3&&rnd()<0.3){
    const need=needOf(t);const weakPos=need.length?need[0]:(()=>{let worst=null,wv=999;for(const pos of POS_BAT.concat(['SP'])){const best=t.roster.map(P_).filter(p=>p.pos===pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const v=best?calcOvr(best):0;if(v<wv){wv=v;worst=pos;}}return worst;})();
    const starter=t.roster.map(P_).filter(p=>p.pos===weakPos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const minO=starter?calcOvr(starter)+5:0;
    const cands=krTeams().filter(x=>!x.isUser&&x.id!==t.id).flatMap(x=>x.roster.map(P_)).filter(p=>!p.loan&&p.pos===weakPos&&calcOvr(p)>=minO&&calcValue(p)<=t.cash*0.35&&(p.lockUntil||0)<=S.clock);
    if(cands.length){const p=pick(cands);const seller=S.teams[p.teamId];const rank=seller.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===p.id);
      if(rank>=3||seller.cash<0||rnd()<0.3){const fee=aiAsk(seller,p);if(t.cash>=fee)transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*1.05/10)*10,years:ri(2,4)},'이적');}}}
  while(t.roster.length>28){const ps=t.roster.map(P_).filter(x=>!x.loan).sort((a,b)=>calcValue(a)-calcValue(b));const p=ps[0];if(!p)break;if(t.dev.length<devCap(t)&&p.age<=25){t.roster=t.roster.filter(x=>x!==p.id);t.dev.push(p.id);}else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});}}
  autoLineup(t);
}
function overseasWeek(){
  for(const t of overseasTeams()){if(!BAL.BUY_MIN[t.league]||t.isUser)continue;const nL=compTeams(t.league).length||6;if(rnd()>(t.league==='US'||t.league==='JP'?0.18:0.06)*6/nL)continue;const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)continue;
    const cands=krTeams().filter(x=>!x.isUser).flatMap(x=>x.roster.map(P_)).filter(p=>!p.loan&&p.age<=(t.league==='MX'?33:29)&&calcOvr(p)>=BAL.BUY_MIN[t.league]&&(p.lockUntil||0)<=S.clock);
    if(!cands.length)continue;const p=pick(cands);const seller=S.teams[p.teamId];const fee=Math.min(t.cash*0.4,Math.round(calcValue(p)*(t.league==='US'||t.league==='JP'?1.6:1.15)/100)*100);
    if(t.cash<fee)continue;S.market.attempts[key]=1;transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*(t.league==='US'?3.5:t.league==='JP'?2.5:1.5)/10)*10,years:ri(2,4)},'해외 이적');news(`${p.exUser?'[출신] ':''}${seller.name} ${josa(p.name,'이','가')} ${josa(t.name,'으로')} 해외 진출 (이적료 ${money(fee)})`,p.exUser?'alumni':'overseas');}
}


// ---------- 육성군 ----------
function promoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.dev.includes(pid))return '육성군 선수가 아닙니다.';if(ut.roster.length>=BAL.MAX_ROSTER)return `1군 명단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`;ut.dev=ut.dev.filter(x=>x!==pid);ut.roster.push(pid);fixLineup(ut);news(`${p.name} 1군 등록`,'contract');return null;}
function demoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.roster.includes(pid))return '1군 선수가 아닙니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `1군 최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;if(ut.dev.length>=devCap(ut))return `육성군이 가득 찼습니다 (최대 ${devCap(ut)}명, 유소년 센터 Lv↑로 확장).`;if(S.market.listed.includes(pid))return '판매 등록 중인 선수는 말소할 수 없습니다.';
  ut.roster=ut.roster.filter(x=>x!==pid);ut.dev.push(pid);fixLineup(ut);news(`${p.name} 육성군으로 이동`,'contract');return null;}
// ---------- 고교 드래프트 ----------
function createDraft(){
  const ut=userTeam();const pool=[];const sfx=staffFx(ut);const hs=staffTrait(ut,'scout','draft');
  for(let i=0;i<BAL.DRAFT_POOL;i++){const g=gauss();const p=genPlayer({pos:pick(ROSTER_TEMPLATE),age:ri(18,19),lvl:BAL.LEVEL_OVR.ROOKIE-3,potBoost:Math.max(0,g*6),conf:clamp(0.2+ut.fac.scout*0.05+sfx.conf+(hs?0.1:0),0.05,0.8)});p.draft=true;p.school=pick(['경북고','부산고','광주일고','대구상원고','서울고','덕수고','천안북일고','유신고','마산용마고','인천고','강릉고','청주고','군산상고','세광고','장충고','휘문고','성남고','북일고','야탑고','제주고']);pool.push(p.id);}
  const teams=krTeams().sort((a,b)=>b.div-a.div||(b.lastRank||8)-(a.lastRank||8)||a.id-b.id);const order=[];for(let r=0;r<BAL.DRAFT_ROUNDS;r++)for(const t of teams)order.push(t.id);
  S.draft={s:S.season,pool,order,idx:0,picks:[],done:false};
  news(`${S.season}시즌 고교 드래프트 시작 — 지명 순서는 하위 리그·하위 순위부터입니다.`,'sys');
}
function draftAvail(){return S.draft?S.draft.pool.map(P_).filter(p=>p&&p.teamId==null):[];}
function draftSign(t,p,dest){const dev=dest==='dev'||(dest!=='roster'&&t.roster.length>=26);if(dev&&t.dev.length>=devCap(t)){if(t.roster.length>=BAL.MAX_ROSTER)return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},false);}else if(!dev&&t.roster.length>=BAL.MAX_ROSTER){if(t.dev.length>=devCap(t))return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},true);}else addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},dev);
  p.draft=false;p.transfers.push({s:S.season,from:p.school||'고교',to:t.name,fee:0,kind:`드래프트 ${S.draft.picks.length+1}순위`});if(t.isUser){p.userLink=true;p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs))};p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([S.season,calcValue(p)]);}
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
  const no=D.picks.length;D.idx++;news(`${no}순위 ${p.name}(${p.school}) 지명 — ${t.dev.includes(pid)?'육성군':'1군'}`,'contract');draftStep();return {ok:true,no,pid,dev:t.dev.includes(pid),msg:`${p.name} 선수를 ${no}순위로 지명했습니다.`};}
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
  const mine=roleVal(p);const others=t.roster.map(P_).filter(x=>x&&x.id!==p.id&&!x.retired&&(isPitcher(p)?(p.pos==='SP'?x.pos==='SP':isPitcher(x)):x.pos===p.pos)).map(x=>roleVal(x,p.pos));const k=others.filter(v=>v>mine).length;const slots=isPitcher(p)?(p.pos==='SP'?5:4):1;
  const what=isPitcher(p)?(p.pos==='SP'?'선발 자원':'불펜 투수'):(POS_KO[p.pos]||p.pos);const why=`${what} ${others.length+1}명 중 ${k+1}번째 실력 (자리 ${slots}개)`;
  const back={fat:Math.round(30+share*35),cond:r1(2+share*3)};
  return {team:t,role,share,why,back,fee:dispatchFee(t),growth:exp>=0.82?'국내보다 높음':exp>=0.6?'국내와 비슷':'국내보다 낮음',gcls:exp>=0.82?'g':exp>=0.6?'':'r',need:needOf(t).includes(p.pos)};}).sort((a,b)=>b.share-a.share||a.fee-b.fee);}
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
  let dev=0;for(const id of ut.roster){const p=P_(id);if(!p||p.devCredited||p.devStart==null)continue;const starter=ut.lineup.includes(id)||ut.rotation.includes(id)||ut.closer===id;if(dev<3&&starter&&calcOvr(p)-p.devStart>=8&&calcOvr(p)>=levelOf(ut)-2){p.devCredited=s;dev++;news(`[육성 성과] ${josa(p.name,'이','가')} 우리 구단에서 주전으로 성장했습니다 (${Math.round(p.devStart)} → ${Math.round(calcOvr(p))}).`,'sys');}}
  const abroad=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR'&&!BAL.LEAGUES[S.teams[p.teamId].league].winter&&(S.teams[p.teamId].lineup.includes(p.id)||S.teams[p.teamId].rotation.includes(p.id))).length;
  const salesFee=c.sales.reduce((a,x)=>a+x.fee,0),salesProfit=c.sales.reduce((a,x)=>a+x.fee-x.cost,0);
  const goal=c.goal||null;S.mgr.seasons.push({s,team:ut.id,tn:ut.name,goal:goal?goal.text:null,goalMet:goal?goalCheck(goal,ut,rec.user.rank).met:null,goalKind:goal?goal.kind||'rank':null,young:youngGrown(ut),div:c.div,expRank:c.expRank,rank:rec.user.rank,promoted:S.lastSummary?S.lastSummary.promoted:false,relegated:S.lastSummary?S.lastSummary.relegated:false,powerStart:c.powerStart,powerEnd:teamPower(ut).power,sales:c.sales.length,starterSales:c.sales.filter(x=>x.st).length,salesFee,salesProfit,devHits:dev,abroad});
  for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(p)p.coached=true;}
  if(S.mgr.seasons.length>40)S.mgr.seasons.shift();S.mgr.cur=null;S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];S.mgr.repHist.push([s,S.mgr.rep]);if(S.mgr.repHist.length>40)S.mgr.repHist.shift();}

// ---------- 감독 평판 · 이직 (2단계) ----------
// 구단 유형별 목표: 부임 후 첫 2시즌은 유형이 고른 운영 방식으로 평가 (유망주=육성, 재정난=흑자, 인기=높은 순위)
function archSeasons(t){return ((S.mgr&&S.mgr.seasons)||[]).filter(m=>m.team===t.id).length;}
function goalFor(t,r,n){const g=goalFor0(t,r,n);if(!t.isUser||!t.arch||t.league!=='KR')return g;const early=archSeasons(t)<2;
  if(t.arch==='popular'&&g.target>2){const tg=Math.max(2,g.target-2);return {text:`${tg}위 이내 (팬들의 기대)`,target:tg,kind:'rank'};}
  if(t.arch==='youth'&&early){const tg=Math.max(g.target,6);return {text:`육성 — 23세 이하 3명 종합 +5 이상 (${tg}위 이내)`,target:tg,kind:'youth',young:3};}
  if(t.arch==='poor'&&early){const tg=Math.max(g.target,5);return {text:`재정 — 시즌 말 현금 흑자 (${tg}위 이내)`,target:tg,kind:'cash'};}
  return g;}
// 목표 진행 상황 (홈·감독 탭 표시용)
function youngGrown(t){return t.roster.concat(t.dev).map(P_).filter(p=>{if(!p||p.age>23+(S.phase==='offseason'?1:0))return false;const B=growthBase(p);return B&&B.ovr!=null&&calcOvr(p)-B.ovr>=5;}).length;}
function goalCheck(goal,t,rank){if(!goal)return null;const pre=S.phase==='season'&&t.rec.w+t.rec.l===0;const parts=[pre?{ok:null,text:`개막 전 (목표 ${goal.target}위 이내)`}:{ok:rank<=goal.target,text:`${rank}위 (목표 ${goal.target}위 이내)`}];
  if(goal.kind==='youth'){const n=youngGrown(t);parts.push({ok:n>=goal.young,text:`육성 ${n}/${goal.young}명`});}
  if(goal.kind==='cash')parts.push({ok:t.cash>=0,text:`현금 ${money(t.cash)}`});
  return {met:parts.every(x=>x.ok===true),parts};}
function goalProgress(){const ut=userTeam();const g=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;if(!g)return null;return goalCheck(g,ut,S.phase==='season'?rankOf(ut):(S.lastSummary?S.lastSummary.rank:rankOf(ut)));}
function goalFor0(t,r,n){if(r<=1)return {text:'우승',target:1};if(t.league==='KR'&&t.div>1&&r<=Math.ceil(n/2))return {text:'승격권 (2위 이내)',target:2};if(r<=Math.ceil(n/3))return {text:'상위 2위 이내',target:2};
  if(t.league==='KR'&&t.div<3&&r>n-2)return {text:`잔류 (${n-2}위 이내)`,target:n-2};return {text:`${Math.ceil(n/2)}위 이내 (재건)`,target:Math.ceil(n/2)};}
function ensureCareer(){S.mgr.career=S.mgr.career||[];const ut=userTeam();const last=S.mgr.career[S.mgr.career.length-1];if(!last||last.team!==ut.id)S.mgr.career.push({team:ut.id,name:ut.name,comp:compOf(ut),from:S.season,to:null});}
const REP_TIER={3:0.8,2:1.0,1:1.25,TW:1.0,JP:1.3,MX:1.0,US:1.5};
function repScore(m){let sc=0;if(m.expRank!=null)sc+=(m.expRank-m.rank)*3;else sc+=(m.rank<=2?3:m.rank>=7?-2:0);if(m.rank===1)sc+=6;if(m.promoted)sc+=8;if(m.relegated)sc-=8;
  if(m.goalMet===true)sc+=4;else if(m.goalMet===false)sc-=3;sc+=(m.devHits||0)*4+(m.abroad||0)*2;
  sc+=opsScore(m);
  return sc*(REP_TIER[lgOf(m.div)]||1)*0.5;}
// 운영 점수: 전력 변화 + 흑자 판매 보너스 − 시즌 중 주전 대량 매각(3명째부터) 감점
function opsScore(m){let o=0;if(m.powerStart!=null&&m.powerEnd!=null){const d=m.powerEnd-m.powerStart;o=clamp(d*1.5,-10,6);if(d>=-1.5&&m.salesProfit>0)o+=Math.min(4,m.salesProfit/50000);}o-=Math.max(0,(m.starterSales||0)-2)*2.5;return o;}
function calcRep(){const ms=(S.mgr&&S.mgr.seasons)||[];let sum=0;ms.forEach((m,i)=>{sum+=repScore(m)*Math.pow(0.85,ms.length-1-i);});return Math.round(clamp(25+sum+(S.mgr.loyalty||0),0,100));}
function repGrade(r){return r>=75?'전설적 명장':r>=62?'명장':r>=50?'유능한 감독':r>=35?'주목받는 신예':'무명';}
function repParts(){const ms=(S.mgr&&S.mgr.seasons)||[];const P={perf:0,dev:0,ops:0,abroad:0};ms.forEach((m,i)=>{const w=Math.pow(0.85,ms.length-1-i)*(REP_TIER[lgOf(m.div)]||1)*0.5;
  let pf=0;if(m.expRank!=null)pf+=(m.expRank-m.rank)*3;else pf+=(m.rank<=2?3:m.rank>=7?-2:0);if(m.rank===1)pf+=6;if(m.promoted)pf+=8;if(m.relegated)pf-=8;if(m.goalMet===true)pf+=4;else if(m.goalMet===false)pf-=3;
  P.perf+=pf*w;P.dev+=(m.devHits||0)*4*w;P.abroad+=(m.abroad||0)*2*w;P.ops+=opsScore(m)*w;});
  for(const k in P)P[k]=r1(P[k]);P.loyalty=S.mgr.loyalty||0;return P;}
function teamOutlook(t){const c=compOf(t);const ts=compTeams(c).map(x=>({x,pw:teamPower(x).power})).sort((a,b)=>b.pw-a.pw);const r=ts.findIndex(y=>y.x.id===t.id)+1;return {rank:r,n:ts.length,power:ts[r-1].pw,goal:goalFor(t,r,ts.length)};}
function genJobOffers(){S.jobOffers=[];const ut=userTeam();const rep=S.mgr.rep!=null?S.mgr.rep:calcRep();ensureCareer();const cand=[];const devTot=S.mgr.seasons.reduce((a,m)=>a+(m.devHits||0),0);
  const tenure=S.season-(S.mgr.career[S.mgr.career.length-1].from)+1;if(tenure<1)return;
  const former=new Set(S.mgr.career.map(c=>c.team));const lm=S.mgr.seasons[S.mgr.seasons.length-1];const nMy=compTeams(compOf(ut)).length;
  const lastGood=!lm||lm.promoted||lm.rank<=Math.ceil(nMy/2)||(lm.expRank!=null&&lm.expRank-lm.rank>=1)||lm.goalMet===true;
  const facSum=t=>t.fac.train+t.fac.youth+t.fac.scout;const ok=(need)=>lastGood?rep>=need:rep>=need+12;
  for(const t of krTeams()){if(t.id===ut.id||former.has(t.id))continue;const need=BAL.REP_NEED[t.div]+(presOf(t)>=80?10:presOf(t)>=60?4:0);const unhappy=(t.lastRank||5)>=4||(t._relegatedAt===S.season);
    const sameTier=ut.league==='KR'&&t.div===ut.div;if(sameTier&&!(lastGood&&(t.cash>ut.cash*1.2||facSum(t)>facSum(ut))))continue;
    if(ok(need)&&unhappy&&(ut.league!=='KR'||t.div<=ut.div))cand.push({t,kind:'job',w:rep-need+(ut.league==='KR'&&t.div<ut.div?12:0)});}
  for(const t of overseasTeams().filter(x=>BAL.JOB_LEAGUES.includes(x.league)&&!x.isUser&&!former.has(x.id))){const need=BAL.REP_NEED[t.league];const n=compTeams(compOf(t)).length;
    if((ok(need)||(t.league==='TW'&&devTot>=3&&rep>=40&&lastGood))&&(t.lastRank||n)>=Math.ceil(n/2))cand.push({t,kind:'job',w:rep-need+6});}
  for(const c of S.mgr.career){if(c.team===ut.id)continue;const t=S.teams[c.team];if(!t)continue;const n=compTeams(compOf(t)).length;const struggling=t.league==='KR'?((t.lastRank||0)>=n-1||t._relegatedAt===S.season):(t.lastRank||0)>=n-1;
    if(struggling&&rep>=30&&!cand.some(x=>x.t.id===t.id))cand.push({t,kind:'return',w:40});}
  const seen=new Set();cand.sort((a,b)=>(b.kind==='return')-(a.kind==='return')||(b.w+rnd()*8)-(a.w+rnd()*8));
  for(const c of cand){if(S.jobOffers.length>=3)break;if(seen.has(c.t.id))continue;const pr=c.kind==='return'?1:clamp(0.2+c.w/40,0.15,0.85);if(rnd()>pr)continue;seen.add(c.t.id);
    const o=teamOutlook(c.t);S.jobOffers.push({id:S.nextOfferId++,team:c.t.id,kind:c.kind,goal:o.goal,rankExp:o.rank,n:o.n,expires:2,reason:jobReason(c.t,c.kind)});}
  if(S.jobOffers.length)news(`감독 제의 ${S.jobOffers.length}건이 도착했습니다 (평판 ${rep} · ${repGrade(rep)}). 스토브리그 2주차까지 결정하세요.`,'sys');}
// 감독 제의 이유: 내 강점(평판 구성) × 그 구단의 사정
function jobReason(t,kind){if(kind==='return')return '친정 구단이 어려움에 빠져 당신의 복귀를 요청합니다';const P=repParts();const top=Object.entries({dev:P.dev,perf:P.perf,ops:P.ops,abroad:P.abroad}).sort((a,b)=>b[1]-a[1])[0][0];
  const ps=t.roster.map(P_).filter(Boolean);const age=ps.reduce((a,p)=>a+p.age,0)/Math.max(1,ps.length);const n=compTeams(compOf(t)).length;
  const sit=age>=28.5?'세대교체 중인':(t.lastRank||0)>=n-1?'재건이 필요한':t.cash>payroll(t)*3?'투자 여력이 있는':'도약을 노리는';
  const me={dev:'유망주를 주전으로 키워 낸 당신을',perf:'성적을 내는 당신을',ops:'적자 없이 팀을 강하게 만든 당신을',abroad:'선수를 해외로 보낸 안목을 가진 당신을'}[top];
  return `${me} ${sit} ${t.name}${t.league!=='KR'?'('+BAL.LEAGUES[t.league].short+')':''}${josa(t.name,'이','가').slice(-1)} 원합니다`;}
function declineJob(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return;S.jobOffers=S.jobOffers.filter(x=>x!==o);const t=S.teams[o.team];
  S.mgr.loyalty=Math.min(5,(S.mgr.loyalty||0)+1);const ut=userTeam();ut.rep=clamp(ut.rep+1,5,100);news(`${t.name}의 제의를 거절하고 ${ut.name}에 남기로 했습니다. 팬들이 환영합니다.`,'sys');}
function moveManager(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return '유효한 제의가 아닙니다.';if(S.phase!=='offseason')return '이직은 스토브리그 중에만 할 수 있습니다.';
  const old=userTeam();const nt=S.teams[o.team];if(!nt||nt.isUser)return '대상 구단을 찾을 수 없습니다.';
  if(S.dispatch&&S.dispatch.phase==='open')for(const x of [...S.dispatch.list])cancelDispatch(x.pid);
  for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==old.id)continue;if(rnd()<0.6&&p.age<35)p.contract={salary:Math.round(salaryFor(p)*(0.95+rnd()*0.2)/10)*10,years:ri(1,3)};else{removeFromTeam(old,p);S.fa.push(pid);p.transfers.push({s:S.season,from:old.name,to:'FA',fee:0,kind:'계약 만료'});}}
  S.pendingFA=[];S.market.listed=[];S.market.offers=[];S.market.negs=[];S.market.scoutResults=null;
  for(const pid of old.roster.concat(old.dev)){const p=P_(pid);if(!p)continue;p.coached=true;p.exUser=true;p.promise=null;}
  old.isUser=false;old.locks={};old.lineupMode='win';autoLineup(old);for(const c of old.staff||[])if(c.years<=0){c.years=1;c.expiring=false;}if(!nt.staff)nt.staff=starterStaff(nt);
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
  for(let d=1;d<=3;d++){tables[d].forEach((t,i)=>{t.lastRank=i+1;const dv=BAL.DIVIDEND[d][i];t.cash+=dv;t.fin.dividend+=dv;t.rep=clamp(t.rep+(i<2?3:i>=6?-3:0),5,100);if(!t.isUser){const cap=Math.max(BAL.AI_CASH_CAP[d],payroll(t)*1.5);if(t.cash>cap)t.cash=Math.round(cap+(t.cash-cap)*0.3);}});
    rec.tables[d]=tables[d].map((t,i)=>({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1}));}
  const pl=playLg();let plRows=null;if(pl){plRows=[];for(const c of leagueComps(pl)){const st=standings(c);st.forEach((t,i)=>{t.lastRank=i+1;plRows.push({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1,sub:t.sub});});}
    const n=compTeams(compOf(ut)).length;const dv=econ(ut).dividend[ut.lastRank-1]||0;ut.cash+=dv;ut.fin.dividend+=dv;ut.rep=clamp(ut.rep+(ut.lastRank<=2?2:ut.lastRank>=n-1?-2:0),5,100);rec.tables[pl]=plRows;}
  rec.user={div:compOf(ut),rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,cash:ut.cash,fin:{...ut.fin}};
  const up2=tables[2].slice(0,2),dn1=tables[1].slice(6),up3=tables[3].slice(0,2),dn2=tables[2].slice(6);
  // 결정전 결과: 승강 결정전에서 하위 부 3위가 이기면 상위 부 6위와 자리를 바꾼다. 우승 결정전 승자는 챔피언(상금·명성)
  rec.post=null;if(S.post&&S.post.s===s){const pg=S.schedule.filter(g=>g.post&&g.res);const win=g=>g.res.hs>=g.res.as?g.home:g.away;rec.post={final:{},promo:{}};
    for(const g of pg){const w=win(g),l=w===g.home?g.away:g.home;
      if(g.post==='final'){rec.post.final[g.div]={w,l,score:`${g.res.hs}:${g.res.as}`};const T=S.teams[w];const pz=BAL.POST_PRIZE[g.div];T.cash+=pz;T.fin.dividend+=pz;T.rep=clamp(T.rep+3,5,100);T.champ=(T.champ||[]).concat(s);news(`${T.name}, ${g.div}부 우승 결정전 승리 — ${s}시즌 챔피언! (상금 ${money(pz)})`,'league');}
      else{rec.post.promo[g.div]={w,l,score:`${g.res.hs}:${g.res.as}`,up:g.away,down:g.home};const upT=S.teams[g.away],dnT=S.teams[g.home];
        if(w===g.away){if(g.div==='P12'){up2.push(upT);dn1.push(dnT);}else{up3.push(upT);dn2.push(dnT);}news(`승강 결정전: ${upT.name} 승리 — 승격, ${dnT.name} 강등`,'league');}
        else news(`승강 결정전: ${dnT.name} 잔류 확정 (${upT.name} 승격 실패)`,'league');}}}
  S.post=null;
  for(const t of up2){t.div=1;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 1부 승격!`,'league');}
  for(const t of dn1.concat(dn2))t._relegatedAt=s;
  for(const t of dn1){t.div=2;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 2부 강등`,'league');}
  for(const t of up3){t.div=2;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 2부 승격!`,'league');}
  for(const t of dn2){t.div=3;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 3부 강등`,'league');}
  const presCh=presSeasonEnd(s,tables,rec);
  // 유저 시즌 결산
  const ups=ut.roster.map(P_);const bb=ups.filter(p=>!isPitcher(p)&&p.cur.pa>=40).sort((a,b)=>ops_(b.cur)-ops_(a.cur))[0];const bp=ups.filter(p=>isPitcher(p)&&p.cur.pOuts>=30).sort((a,b)=>(a.cur.pER/a.cur.pOuts)-(b.cur.pER/b.cur.pOuts))[0];
  S.lastSummary={s,div:rec.user.div,rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,bestBat:bb?`${bb.name} 타율 ${(bb.cur.h/Math.max(1,bb.cur.ab)).toFixed(3)} ${bb.cur.hr}홈런`:'-',bestPit:bp?`${bp.name} ${bp.cur.pW}승 ERA ${(bp.cur.pER*27/bp.cur.pOuts).toFixed(2)}`:'-',promoted:up3.concat(up2).some(t=>t.isUser),relegated:dn1.concat(dn2).some(t=>t.isUser),fin:{...ut.fin}};
  if(S.lastSummary)S.lastSummary.pres=presCh[ut.id]||null;
  if(rec.post){const ui_=ut.id;let pt=null;for(const d in rec.post.final){const f=rec.post.final[d];if(f.w===ui_)pt=`${d}부 우승 결정전 승리 — 챔피언!`;else if(f.l===ui_)pt=`${d}부 우승 결정전 패배 (준우승)`;}
    for(const k in rec.post.promo){const f=rec.post.promo[k];if(f.up===ui_)pt=f.w===ui_?'승강 결정전 승리 — 승격!':'승강 결정전 패배 — 잔류';if(f.down===ui_)pt=f.w===ui_?'승강 결정전 승리 — 잔류 확정':'승강 결정전 패배 — 강등';}
    if(S.lastSummary)S.lastSummary.post=pt;}
  sponSettle(s,rec);
  S.history.push(rec);
  // 선수 시즌 기록 보존
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;const t=p.teamId!=null?S.teams[p.teamId]:null;if(t&&t.league!=='KR'&&t.league!==pl)continue;
    if(p.cur.g>0||p.cur.pG>0)p.hist.push({s,team:t?t.id:null,tn:t?t.name:'FA',lg:t?leagueKey(t):'FA',st:p.cur});while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();p.fatigue=0;
    if(p.userLink){p.valHist.push([s,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}}
  overseasSeasonSummary(false,pl,plRows);
  alumniReport(s);
  formerClubReport(s,rec);
  mgrEnd(s,rec);
  S.lastRecap=buildRecap(s,rec);
  returnLoans(s);reserveSeasonEnd(s);
  // 나이/은퇴
  const retired=[];
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;p.age++;
    const ovr=calcOvr(p);let pr=p.age>=38?1:p.age>=33?(p.age-32)*0.13+(ovr<48?0.3:0):0;if(p.teamId==null&&!p.scouted&&p.age>=30)pr+=0.3;
    if(rnd()<pr){const t=p.teamId!=null?S.teams[p.teamId]:null;if(t)removeFromTeam(t,p);S.fa=S.fa.filter(x=>x!==p.id);S.pendingFA=S.pendingFA.filter(x=>x!==p.id);p.retired=true;p.retiredSeason=s;
      if(p.userLink){retired.push(p.name);news(`${p.name} 은퇴 (${p.age}세)`,'contract');alumniRetire(p);}else delete S.players[pid];}}
  // 계약 갱신
  for(const t of liveTeams()){for(const pid of [...t.roster,...t.dev]){const p=P_(pid);if(!p.contract)continue;p.contract.years--;
      if(p.contract.years<=0){if(t.isUser){S.pendingFA.push(pid);news(`${p.name} 계약 만료 — 스토브리그 2주차까지 우선 협상 가능`,'contract');}
        else{if(rnd()<0.7&&p.age<35&&calcOvr(p)>=levelOf(t)-10){p.contract={salary:Math.round(salaryFor(p)*(0.9+rnd()*0.3)/10)*10,years:ri(1,3)};}
          else{removeFromTeam(t,p);S.fa.push(pid);p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});}}}}}
  // 해외 소속 유저 연계 선수 계약
  for(const t of overseasTeams()){if(t.isUser)continue;for(const pid of [...t.roster]){const p=P_(pid);if(!p.contract||!p.userLink)continue;p.contract.years--;
      if(p.contract.years<=0){if(rnd()<0.6&&p.age<34){p.contract={salary:p.contract.salary,years:ri(1,3)};news(`[해외] ${p.name} ${josa(t.name,'과','와')} 재계약`,'overseas');}
        else{removeFromTeam(t,p);if(p.age<=36){S.fa.push(pid);p.homecoming=S.userTeamId;p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} ${josa(t.name,'과','와')} 계약 만료. 친정 복귀를 희망하며 FA로 나왔습니다!`,'overseas');}else{p.retired=true;p.retiredSeason=s;}}}}
    for(const pid of [...t.roster]){const p=P_(pid);if(p.age>=37||(p.age>=34&&rnd()<0.25)){removeFromTeam(t,p);if(p.userLink){p.retired=true;p.retiredSeason=s;news(`[출신] ${p.name} ${t.name}에서 은퇴 (${p.age}세)`,'alumni');alumniRetire(p);}else delete S.players[pid];}}}
  // 유소년/신인
  for(const t of krTeams()){if(t.isUser)continue;for(let i=0;i<1;i++){const need=needOf(t);const p=genPlayer({pos:need.length?pick(need):pick(ROSTER_TEMPLATE),age:ri(18,21),lvl:BAL.LEVEL_OVR.ROOKIE+(t.div===1?5:t.div===2?2:0),potBoost:t.fac.youth*1.5});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  staffSeasonEnd();const sfx=staffFx(ut);
  const yn=2+ut.fac.youth;for(let i=0;i<yn;i++){const need=needOf(ut);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.youth*1.2,potBoost:ut.fac.youth*2.5+Math.max(0,sfx.P.scout-0.4)*0.6,conf:clamp(0.35+ut.fac.youth*0.05+sfx.conf,0.1,0.8)});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  for(const t of overseasTeams()){if(t.isUser)continue;const RS=BAL.LEAGUES[t.league].roster;while(t.roster.length<RS){const need=needOf(t);const p=genPlayer({pos:need.length?need[0]:pick(ROSTER_TEMPLATE),age:ri(19,26),lvl:levelOf(t)-4,nat:t.league});registerPlayer(p);addToTeam(p,t,{salary:Math.round(salaryFor(p)*(t.league==='US'?3:t.league==='JP'?2.5:1.3)/10)*10,years:ri(1,4)});}
    t.cash=Math.min(BAL.OVERSEAS_CASH[t.league],t.cash+BAL.OVERSEAS_CASH[t.league]*0.5);autoLineup(t);}
  // FA 풀 정리: 2시즌 이상 미계약자 제거
  S.fa=S.fa.filter(id=>{const p=P_(id);if(!p)return false;p.faSeasons=(p.faSeasons||0)+1;if(p.faSeasons>=2&&!p.userLink&&!p.homecoming){delete S.players[id];return false;}return true;});
  S.grievances=[];S.market.attempts={};S.market.negMem={};S.market.negs=[];S.market.listed=[];
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
  dispatchWeek();scoutWatch();grievanceTick();if(S.week===3)staffWeek3();
  if(S.jobOffers&&S.jobOffers.length&&S.week>=2){for(const o of S.jobOffers)news(`${S.teams[o.team].name}의 감독 제의가 만료되었습니다.`,'sys');S.jobOffers=[];}
  if(S.week===3){for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==ut.id)continue;removeFromTeam(ut,p);S.fa.push(pid);p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} FA로 떠났습니다.`,'contract');}S.pendingFA=[];fixLineup(ut);}
  for(const t of shuffle(krTeams().filter(t=>!t.isUser)).sort((a,b)=>presTierIdx(a)-presTierIdx(b)))aiWeek(t);
  overseasWeek();
  marketTick(0.2);
  if(S.week<=4){const cands=ut.roster.map(P_).filter(p=>!S.market.listed.includes(p.id)&&(p.lockUntil||0)<=S.clock).sort((a,b)=>calcValue(b)-calcValue(a)).slice(0,4);
    for(const p of cands){if(p.dispatch)continue;if(rnd()<0.12){const buyers=krTeams().filter(t=>!t.isUser&&t.div<=ut.div&&t.cash>calcValue(p)*1.5);if(buyers.length)makeAIOffer(pick(buyers),p,true);}}}
  if(S.week===2){interestCheck();endorseOffers();}endorseTick();
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
  sponAutoPick();
  S.season++;S.day=1;S.phase='season';S.week=0;S.clock++;
  const pl=playLg();if(pl)for(const t of compTeams(pl)){t.rec={w:0,l:0,rs:0,ra:0};t.rotIdx=0;if(!t.isUser)autoLineup(t);}
  for(const t of liveTeams()){t.rec={w:0,l:0,rs:0,ra:0};t.fin=newFin();t.rotIdx=0;
    if(t.loan>0){t.cash-=t.loan;t.fin.other+=t.loan;news(`대출 ${money(t.loan)} 상환`,'fin');t.loan=0;}
    applySponsor(t);let up=econ(t).overhead;if(t.isUser&&t.staff)up=Math.max(0,up-Math.min(up*0.8,BAL.STAFF_CREDIT[staffTier(t)]));for(const k in t.fac)up+=BAL.FACILITY[k].upkeep*t.fac[k];t.cash-=up;t.fin.facility+=up;
    if(!t.isUser&&t.cash>payroll(t)*2.5){const k=pick(['train','youth','scout']);if(t.fac[k]<5){const c=BAL.FACILITY[k].cost*t.fac[k];t.cash-=c;t.fin.facility+=c;t.fac[k]++;}}
    if(!t.isUser){aiFillRookies(t);autoLineup(t);}
    for(const pid of t.roster.concat(t.dev)){const p=P_(pid);const dd=p.dispatchDone&&p.dispatchDone.s===S.season-1?p.dispatchDone:null;
      if(dd){growthTick(p,{kind:'dispatch',label:`${S.season-1}시즌 겨울리그 파견`,team:t,dd});p.fatigue=Math.round(30+dd.share*35);p.cond=-(2+dd.share*3);}
      else if(p.winterPlan==='rest'){growthTick(p,{kind:'rest',label:`${S.season}시즌 겨울 휴식`,team:t});p.fatigue=0;p.cond=3;p.morale=clamp(p.morale+3,0,100);}
      else{growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:t});p.fatigue=0;}
      p.winterPlan=null;
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

// ---------- 홈: 이번 주 이야기 · 코치 한마디 · 기간 보고서 (모두 실제 기록 기반) ----------
// 시작 구단 유형 적용 (유저 구단만, 새 게임 시점)
function applyArch(t,k){if(!BAL.ARCH[k])return;t.arch=k;const ps=t.roster.map(P_);const byO=(a,b)=>calcOvr(b)-calcOvr(a);const scale=(p,d)=>{for(const x in p.attrs)p.attrs[x]=clamp(p.attrs[x]+d,20,99);};
  if(k==='youth'){const core=new Set(ps.slice().sort(byO).slice(0,5).map(p=>p.id));for(const p of ps){if(core.has(p.id)||p.age<=24)continue;if(rnd()<0.75){p.age=ri(19,23);scale(p,-3);p.pot=clamp(calcOvr(p)+ri(10,20),40,92);p.peakAge=ri(26,28);p.scout=makeScout(p,0.45);}}t.fac.youth=2;}
  else if(k==='popular'){t.rep=clamp(t.rep+28,5,100);t.cash=Math.round(t.cash*1.35);t.pres=34;}
  else if(k==='poor'){t.cash=Math.round(t.cash*0.45);const top=ps.slice().sort(byO).slice(0,2);for(const p of top){scale(p,5);p.contract={salary:Math.round(salaryFor(p)*2.2/10)*10,years:2};}t.rep=clamp(t.rep-8,5,100);}
  else if(k==='vet'){for(const p of ps.slice().sort(byO).slice(0,9)){p.age=Math.max(p.age,ri(31,34));scale(p,4);p.pot=Math.min(p.pot,calcOvr(p)+1);p.peakAge=Math.min(p.peakAge,29);p.scout=makeScout(p,0.6);}for(const p of ps.filter(p=>p.age<=23))scale(p,-2);}
  for(const p of t.roster.map(P_))p.snap=snapOf(p);autoLineup(t);}
// 시즌 결산: 기록에 근거한 요약 (최고 성장·최고 영입·판매 수익·팬/구단주 평가·감독 평판)
function buildRecap(s,rec){const ut=userTeam();const m=(S.mgr&&S.mgr.seasons||[]).slice(-1)[0]||{};const ids=ut.roster.concat(ut.dev);
  const grow=ids.map(P_).filter(p=>p&&growthBase(p)).map(p=>{const B=growthBase(p);return {id:p.id,name:p.name,from:Math.round(B.ovr),to:Math.round(calcOvr(p)),d:r1(calcOvr(p)-B.ovr),vFrom:B.val,vTo:calcValue(p),join:!!B.join};}).sort((a,b)=>b.d-a.d)[0]||null;
  const newcomers=ids.map(P_).filter(p=>p&&(p.transfers||[]).some(t=>t.s===s&&t.to===ut.name));
  const sc=p=>{const st=p.hist.length&&p.hist[p.hist.length-1].s===s?p.hist[p.hist.length-1].st:p.cur;if(isPitcher(p))return st.pOuts>=30?{v:(st.pOuts/3)*(4.5-st.pER*27/st.pOuts),line:`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`}:null;return st.pa>=30?{v:st.pa*(ops_(st)-0.68),line:`타율 ${(st.h/Math.max(1,st.ab)).toFixed(3).replace(/^0/,'')} ${st.hr}홈런 OPS ${ops_(st).toFixed(3).replace(/^0/,'')}`}:null;};
  const bs=newcomers.map(p=>({p,x:sc(p)})).filter(o=>o.x).sort((a,b)=>b.x.v-a.x.v)[0];
  const exp=m.expRank,rank=rec.user.rank;const fans=exp==null?(rank<=2?'열광':rank>=7?'실망':'무난'):rank<exp?'열광':rank===exp?'무난':rank>exp+1?'실망':'아쉬움';
  const fanText={열광:'예상을 뛰어넘은 시즌에 팬들이 열광합니다.',무난:'기대만큼의 시즌이었다는 평가입니다.',아쉬움:'조금 더 위를 기대했던 팬들이 아쉬워합니다.',실망:'기대에 못 미친 성적에 팬들이 실망했습니다.'}[fans];
  const owner=m.goalMet===true?'구단주: "목표를 달성했습니다. 다음 시즌도 맡기겠습니다."':m.goalMet===false?(ut.cash>0?'구단주: "목표는 놓쳤지만 재정은 건전합니다. 다음 시즌엔 결과를 보여주세요."':'구단주: "목표도 재정도 놓쳤습니다. 각성이 필요합니다."'):'구단주: "수고했습니다."';
  const rh=(S.mgr&&S.mgr.repHist)||[];const repFrom=rh.length>=2?rh[rh.length-2][1]:25,repTo=S.mgr?S.mgr.rep:25;
  return {s,comp:rec.user.div,rank,w:rec.user.w,l:rec.user.l,expRank:exp,goal:m.goal||null,goalMet:m.goalMet,promoted:!!(S.lastSummary&&S.lastSummary.promoted),relegated:!!(S.lastSummary&&S.lastSummary.relegated),
    grow,bestSign:bs?{id:bs.p.id,name:bs.p.name,line:bs.x.line}:null,sales:m.sales||0,salesFee:m.salesFee||0,salesProfit:m.salesProfit||0,devHits:m.devHits||0,fans,fanText,owner,repFrom,repTo,seen:false};}
// 겨울의 결과: 파견 복귀 · 동계훈련 성장 · 신인 합류 · 출신 코치 복귀 (개막 첫 주 홈 카드)
function winterResults(){const ut=userTeam();const out=[];const ps=ut.roster.concat(ut.dev).map(P_).filter(Boolean);const prev=S.season-1;
  const starterAt=p=>{if(isPitcher(p))return p.pos==='SP'?ut.rotation.map(P_).filter(x=>x&&x.id!==p.id).sort((a,b)=>calcOvr(a)-calcOvr(b))[0]:P_(ut.closer);const id=ut.lineup.find(id=>ut.pos[id]===p.pos&&id!==p.id);return id!=null?P_(id):null;};
  for(const p of ps){const l=(p.log||[]).find(x=>x.s===S.season&&/겨울리그 파견/.test(x.label));if(!l)continue;const w=(p.winter||[]).slice(-1)[0];let bk=null,bd=0;for(const k in l.ch)if(l.ch[k]>bd){bd=l.ch[k];bk=k;}
    const role=rosterRole(ut,p.id);const st=starterAt(p);const pos=isPitcher(p)?(p.pos==='SP'?'선발':'불펜'):(POS_KO[p.pos]||p.pos);const from=Math.round(l.ovr-l.d),to=Math.round(l.ovr);const where=w?(BAL.LEAGUES[w.lg]?BAL.LEAGUES[w.lg].short:w.tn):'겨울리그';
    const inRole=['bat','sp','cl','rp'].includes(role.key);
    out.push({score:30+l.d,pid:p.id,title:`${where}에서 돌아온 ${p.name}, ${inRole?`${pos} 주전으로 개막을 맞습니다`:`${pos} 주전에 도전합니다`}`,lines:[`종합 ${from} → ${to}${bk&&bd>=0.5?` · ${ATTR_KO[bk]} 성장`:''} · 복귀 피로 ${Math.round(p.fatigue||0)}`,w?`겨울리그 ${w.tn} · ${w.role}${w.st&&w.st.pa?` · 타율 ${(w.st.h/Math.max(1,w.st.ab)).toFixed(3).replace(/^0/,'')}`:w.st&&w.st.pOuts?` · ERA ${(w.st.pER*27/w.st.pOuts).toFixed(2)}`:''}`:''].filter(Boolean),
      short:`${p.name} 파견 ${l.d>0?'+':''}${l.d}`,acts:[st&&!inRole?{label:'현재 주전과 비교',cmp:[p.id,st.id]}:null,{label:'개막 편성하기',go:['roster','lineup']}].filter(Boolean)});}
  for(const p of ps){const L=p.loanDone;if(!L||L.s!==prev)continue;const role=rosterRole(ut,p.id);const inRole=['bat','sp','cl','rp'].includes(role.key);const pos=isPitcher(p)?(p.pos==='SP'?'선발':'불펜'):(POS_KO[p.pos]||p.pos);const st=L.st;
    const line=st?(isPitcher(p)?(st.pOuts?`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:''):(st.ab?`${st.g}경기 타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'')):'';const starter=starterAt(p);
    out.push({score:31+(L.to-L.from),pid:p.id,title:`${L.div}부 ${L.tn} 임대에서 돌아온 ${p.name}, ${inRole?`${pos} 주전으로 개막을 맞습니다`:`${pos} 주전에 도전합니다`}`,lines:[`종합 ${Math.round(L.from)} → ${Math.round(calcOvr(p))} · 임대 역할 ${L.role}`,line?`임대 시즌 ${line}`:''].filter(Boolean),short:`${p.name} 임대 복귀`,acts:[starter&&!inRole?{label:'현재 주전과 비교',cmp:[p.id,starter.id]}:null,{label:'개막 편성하기',go:['roster','lineup']}].filter(Boolean)});}
  for(const c of (ut.staff||[]))if(c.alumni&&c.hiredFor===S.season){const op=P_(c.alumni);out.push({score:22,pid:op?op.id:null,title:`${c.name}, 이제 ${BAL.STAFF[c.dept].name}로 돌아왔습니다`,lines:[`우리 구단 출신 · 코치 평점 ${c.rating} (${gradeOf(c.rating)}급)`,`${BAL.STAFF[c.dept].what}`],short:`${c.name} 코치 복귀`,acts:[{label:'코치진 보기',go:['club','staff']}]});}
  const wg=ps.map(p=>({p,l:(p.log||[]).find(x=>x.s===S.season&&/동계훈련|겨울 휴식/.test(x.label))})).filter(x=>x.l&&x.l.d>=1.5).sort((a,b)=>b.l.d-a.l.d)[0];
  if(wg)out.push({score:14+wg.l.d,pid:wg.p.id,title:`${wg.p.name}, 겨울 동안 ${wg.l.d>=3?'크게 ':''}성장했습니다`,lines:[`종합 ${Math.round(wg.l.ovr-wg.l.d)} → ${Math.round(wg.l.ovr)} · ${wg.l.f.slice(0,2).join(', ')}`],short:`동계훈련 ${wg.p.name} +${wg.l.d}`,acts:[{label:'성장 과정 보기',open:wg.p.id}]});
  const rook=ps.filter(p=>(p.transfers||[]).some(t=>t.s===prev&&/드래프트/.test(t.kind)));
  if(rook.length)out.push({score:10,pid:rook[0].id,title:`신인 ${rook.length}명이 합류했습니다`,lines:[rook.map(p=>`${p.name}(${POS_KO[p.pos]||p.pos}, 잠재 ${gradeOf(p.scout.lo)}~${gradeOf(p.scout.hi)})`).join(', ')],short:`신인 ${rook.length}명 합류`,acts:[{label:'육성 보기',go:['dev','train']}]});
  return out.sort((a,b)=>b.score-a.score);}
function teamStreak(t){const gs=S.schedule.filter(g=>g.res&&(g.home===t.id||g.away===t.id)).sort((a,b)=>b.day-a.day);let k=0,w=null;for(const g of gs){const win=(g.home===t.id?g.res.hs>g.res.as:g.res.as>g.res.hs);if(w==null)w=win;if(win!==w)break;k++;}return {n:k,win:w};}
function weeklyStory(){const ut=userTeam();const C=[];const F=p=>isPitcher(p)?FOCUS_PIT:FOCUS_BAT;
  for(const id of ut.roster.concat(ut.dev)){const p=P_(id);const B=p&&growthBase(p);if(!B)continue;const now=calcOvr(p);const d=now-B.ovr;const val=calcValue(p);const dv=B.val!=null?val-B.val:0;
    if(d>=1){let bk=null,bd=0;if(B.attrs)for(const k in p.attrs){const x=p.attrs[k]-B.attrs[k];if(x>bd){bd=x;bk=k;}}
      const what=p.focus&&p.focus!=='balance'?F(p)[p.focus]+' 훈련':'꾸준한 출장';const lines=[];if(bk&&bd>=1)lines.push(`${ATTR_KO[bk]} ${Math.round(B.attrs[bk])} → ${Math.round(p.attrs[bk])}`);lines.push(`종합 ${Math.round(B.ovr)} → ${Math.round(now)}`);if(Math.abs(dv)>=500)lines.push(`시장 가치 ${money(B.val)} → ${money(val)}`);
      const it=p.interest&&p.interest.stage>=1&&S.teams[p.interest.team]?`${S.teams[p.interest.team].name}(${BAL.LEAGUES[p.interest.lg]?BAL.LEAGUES[p.interest.lg].short:''}) 스카우트가 지켜보고 있습니다.`:(p.log&&p.log[0]?`최근 성장 요인: ${p.log[0].f.slice(0,3).join(', ')}`:'');
      C.push({score:d*3+Math.max(0,dv)/20000+(p.age<=23?2:0)+((S.pins||[]).includes(p.id)?3:0),kind:'growth',pid:p.id,title:`${p.name}의 ${josa(what,'이','가')} 성과를 내고 있습니다`,lines,sub:it,since:B.label});}
    if(d<=-2&&(ut.lineup.includes(id)||ut.rotation.includes(id)))C.push({score:-d*2,kind:'decline',pid:p.id,title:`${p.name}의 기량이 떨어지고 있습니다`,lines:[`종합 ${Math.round(B.ovr)} → ${Math.round(now)}`],sub:p.log&&p.log[0]?`요인: ${p.log[0].f.slice(0,3).join(', ')}`:'',since:B.label});}
  if(S.phase==='season'){const st=teamStreak(ut);if(st.n>=4)C.push({score:6+st.n,kind:'streak',title:`${st.n}${st.win?'연승':'연패'} 중입니다`,lines:[`${compName(compOf(ut))} ${rankOf(ut)}위 · ${ut.rec.w}승 ${ut.rec.l}패`],sub:st.win?'흐름을 탔을 때 주전을 무리시키지 않도록 피로를 확인하세요.':'라인업과 선발 순서를 점검해 볼 때입니다.'});
    const goal=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;if(goal&&S.day>=18){const st2=standings(compOf(ut));const r=rankOf(ut);const tgt=st2[goal.target-1];const gap=tgt?tgt.rec.w-ut.rec.w:0;C.push({score:7,kind:'race',title:r<=goal.target?`목표(${goal.text}) 안에 있습니다`:`목표(${goal.text})까지 ${gap}승 차`,lines:[`현재 ${r}위 · 남은 ${BAL.SEASON_GAMES-S.day+1}경기`],sub:''});}}
  for(const n of S.news.slice(0,12))if(n.kind==='alumni'&&n.s===S.season&&(S.phase!=='season'||n.d==='OFF'||+n.d>=S.day-7)){C.push({score:6.5,kind:'alumni',title:'우리가 키운 선수의 소식',lines:[n.text.replace(/^\[(출신|셀온|친정)\] /,'')],sub:''});break;}
  if(S.phase==='offseason'&&S.lastSummary&&S.week<=2){const L=S.lastSummary;C.push({score:9,kind:'season',title:`${L.s}시즌 ${compName(L.div)} ${L.rank}위${L.promoted?' — 승격!':L.relegated?' — 강등':''}`,lines:[`${L.w}승 ${L.l}패${L.post?' · '+L.post:''}`,`최고 타자 ${L.bestBat}`,`최고 투수 ${L.bestPit}`],sub:'스토브리그: 재계약·드래프트·파견을 결정하세요.'});}
  if(S.phase==='offseason'&&S.lastSummary&&S.lastSummary.pres&&S.week<=3){const P=S.lastSummary.pres;if(P.tierFrom!==P.tierTo){const up=P.to>P.from;C.push({score:up?20:12,kind:'pres',title:up?`${ut.name}, 이제 「${P.tierTo}」 구단입니다`:`${ut.name}의 위상이 「${P.tierTo}」로 내려갔습니다`,lines:[`구단 위상 ${Math.round(P.from)} → ${Math.round(P.to)}`,up?(P.tierTo==='명문'?'선수들이 먼저 찾아오고, 연봉·코치 비용이 줄고, 위기에는 모기업이 지원합니다.':'선수 영입 의향과 수입이 좋아집니다.'):'수입과 선수 영입 의향이 조금 줄어듭니다.'],sub:'구단 → 구단 위상에서 자세히 볼 수 있습니다.',acts:[{label:'구단 위상 보기',go:['club','pres']}]});}}
  if(S.season>=2&&S.phase==='season'&&S.day<=7){const W=winterResults();if(W.length){const m=W[0];C.push({score:40,kind:'winter',pid:m.pid,title:m.title,lines:m.lines,sub:W.slice(1,4).map(x=>x.short).join(' · '),since:`${S.season-1}시즌 겨울 결과`,acts:m.acts});}}
  if(S.season===1&&S.phase==='season'&&S.day<=7){const A=ut.arch&&BAL.ARCH[ut.arch];const yp=ut.roster.concat(ut.dev).map(P_).filter(p=>p&&p.age<=23).sort((a,b)=>b.scout.est-a.scout.est)[0];const g=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;
    C.push({score:30,kind:'start',pid:yp?yp.id:null,title:`${ut.name} 감독 첫 시즌${A?' — '+A.name:''}`,lines:[A?A.pitch:'작은 구단에서 시작하는 첫 시즌입니다.',yp?`주목할 유망주: ${yp.name} (${POS_KO[yp.pos]||yp.pos}, 예상 잠재 ${gradeOf(yp.scout.lo)}~${gradeOf(yp.scout.hi)})`:''].filter(Boolean),sub:(A?A.tip+' ':'')+(g?`시즌 목표: ${g.text}`:'')});}
  C.sort((a,b)=>b.score-a.score);return C[0]||{kind:'quiet',title:S.phase==='season'?'조용한 한 주입니다':'스토브리그가 진행 중입니다',lines:[],sub:S.phase==='season'?`다음 성장 점검까지 ${nextCheck()}경기`:''};}
function coachNotes(){const ut=userTeam();const out=[];const st=ut.staff||[];const who=d=>{const c=st.filter(x=>x.dept===d&&(x.years>0||x.expiring)).sort((a,b)=>b.rating-a.rating)[0];return c?`${BAL.STAFF[d].name} ${c.name}`:null;};
  const ps=ut.roster.map(P_).filter(Boolean);
  const bat=ps.filter(p=>!isPitcher(p)&&p.log&&p.log[0]&&p.log[0].s===S.season).sort((a,b)=>(b.log[0].d||0)-(a.log[0].d||0))[0];
  if(bat&&who('bat')&&bat.log[0].d>0)out.push({who:who('bat'),pid:bat.id,text:`${josa(bat.name,'이','가')} 최근 점검에서 +${bat.log[0].d} 올랐습니다. 지금 훈련을 유지하겠습니다.`});
  const tired=ps.filter(p=>(p.fatigue||0)>=70).sort((a,b)=>b.fatigue-a.fatigue)[0];
  if(tired)out.push({who:who('med')||who('pit')||'트레이너',pid:tired.id,text:`${p_n(tired)} 피로가 ${Math.round(tired.fatigue)}입니다. 한두 경기 쉬게 하는 게 좋겠습니다.`});
  const pit=ps.filter(p=>isPitcher(p)&&p.log&&p.log[0]&&p.log[0].s===S.season).sort((a,b)=>(b.log[0].d||0)-(a.log[0].d||0))[0];
  if(pit&&who('pit')&&pit.log[0].d>0)out.push({who:who('pit'),pid:pit.id,text:`${josa(pit.name,'의','의').replace('의의','의')} 공이 좋아지고 있습니다 (최근 +${pit.log[0].d}).`});
  const mis=ut.lineup.filter(id=>{const p=P_(id);const pos=ut.pos[id];return p&&pos&&pos!=='DH'&&pos!==p.pos&&posPenalty(p,pos)>=12;});
  if(mis.length)out.push({who:who('def')||who('bat')||'수석코치',pid:mis[0],text:`${josa(P_(mis[0]).name,'이','가')} ${POS_KO[ut.pos[mis[0]]]} 수비를 어려워합니다 (적성 밖 −${posPenalty(P_(mis[0]),ut.pos[mis[0]])}).`});
  if(S.phase==='offseason'&&S.draft&&!S.draft.done&&who('scout')){const top=S.draft.pool.map(P_).filter(Boolean).sort((a,b)=>b.scout.est-a.scout.est)[0];if(top)out.push({who:who('scout'),pid:top.id,text:`드래프트 후보 중 ${top.name}(${top.school||''} ${POS_KO[top.pos]||top.pos})의 잠재력을 높게 봅니다.`});}
  return out.slice(0,3);}
function p_n(p){return josa(p.name,'의','의').replace('의의','의');}
function reportStart(){const ut=userTeam();const pl={};for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(!p)continue;const c=p.cur;pl[id]={ovr:calcOvr(p),val:calcValue(p),pa:c.pa,ab:c.ab,h:c.h,hr:c.hr,bb:c.bb,rbi:c.rbi,o:c.pOuts,er:c.pER,so:c.pSO,w:c.pW};}
  return {s:S.season,day:S.day,w:ut.rec.w,l:ut.rec.l,rs:ut.rec.rs,ra:ut.rec.ra,rank:S.phase==='season'?rankOf(ut):null,cash:ut.cash,pl};}
function reportEnd(r0){const ut=userTeam();if(!r0||r0.s!==S.season)return null;const g=(ut.rec.w-r0.w)+(ut.rec.l-r0.l);if(g<=0)return null;const ended=S.phase!=='season';
  // 시즌이 끝났으면 승강 뒤 새 부 순위가 아니라 그 시즌 최종 순위로 고정
  const rep={s:r0.s,ended,games:g,w:ut.rec.w-r0.w,l:ut.rec.l-r0.l,rs:ut.rec.rs-r0.rs,ra:ut.rec.ra-r0.ra,rankFrom:r0.rank,rankTo:ended&&S.lastSummary&&S.lastSummary.s===r0.s?S.lastSummary.rank:rankOf(ut),cash:ut.cash-r0.cash,bat:null,pit:null,grow:[]};
  let bb=null,bp=null;for(const id in r0.pl){const p=P_(+id);if(!p||p.teamId!==ut.id)continue;const a=r0.pl[id],c=p.cur;const pa=c.pa-a.pa,ab=c.ab-a.ab,h=c.h-a.h,hr=c.hr-a.hr,rbi=c.rbi-a.rbi;
    if(pa>=Math.max(6,g*2.5)){const sc=(h+hr*2+(c.bb-a.bb)*0.6)/pa+rbi*0.03;if(!bb||sc>bb.sc)bb={sc,p,line:`${ab}타수 ${h}안타${hr?` ${hr}홈런`:''}${rbi?` ${rbi}타점`:''}`};}
    const o=c.pOuts-a.o,er=c.pER-a.er;if(o>=9){const sc=(o/3)*(1-er*27/o/9)+(c.pW-a.w)*2;if(!bp||sc>bp.sc)bp={sc,p,line:`${Math.floor(o/3)}.${o%3}이닝 ${er}자책${c.pW-a.w?` ${c.pW-a.w}승`:''} ${c.pSO-a.so}탈삼진`};}
    const d=calcOvr(p)-a.ovr;if(Math.abs(d)>=0.5)rep.grow.push({p,d:r1(d),val:calcValue(p)-a.val});}
  rep.bat=bb;rep.pit=bp;rep.grow.sort((x,y)=>y.d-x.d);return rep;}

// ---------- 테스트 도구 (주소에 ?test=1 일 때만 화면에 노출) ----------
function testInfo(){const ut=userTeam();return [`게임 ${GAME_VER} (저장 형식 ${VERSION})`,`시드 ${S.seed} · 구단 ${ut.name}${ut.arch?' ('+BAL.ARCH[ut.arch].name+')':''}`,`${S.season}시즌 ${S.phase==='season'?S.day+'일차':'스토브리그 '+S.week+'주차'} · ${compName(compOf(ut))}`,`현금 ${money(ut.cash)} · 선수 ${ut.roster.length}명 + 육성군 ${ut.dev.length}명 · 코치 ${(ut.staff||[]).length}명`].join('\n');}
function testCmd(k){const ut=userTeam();
  if(k==='cash'){ut.cash+=100000;return '현금 +10억';}
  if(k==='reveal'){for(const id in S.players){const p=S.players[id];if(p.scout)p.scout={est:Math.round(p.pot),lo:Math.round(p.pot),hi:Math.round(p.pot),conf:0.95};}return '모든 선수 잠재력 공개';}
  if(k==='endSeason'){if(S.liveGame){stepGame(S.liveGame);endUserGame();}let g=0;while(S.phase==='season'&&g++<60){const lg=startDay();if(lg){stepGame(lg);endUserGame();}else finishDay();}return '시즌 종료';}
  if(k==='nextSeason'){if(S.phase==='season')testCmd('endSeason');while(S.week<=BAL.OFFSEASON_WEEKS)advanceWeek();let r=startNewSeason();if(!r.ok){autoFillUser();r=startNewSeason();}return r.ok?`${S.season}시즌 개막`:r.msg;}
  return '알 수 없는 명령';}

// ---------- 2군(퓨처스) 리그 ----------
// 육성군 + 1군에서 주전·필승조가 아닌 선수가 매주 2군 7경기를 치른다(요약 시뮬). 기록·순위가 쌓이고, 1군 출장이 적어도 성장이 덜 막힌다.
function reserveIds(t){const top=new Set(t.lineup.concat(t.rotation,t.closer!=null?[t.closer]:[],t.bullpen.slice(0,4)));return t.roster.filter(id=>!top.has(id)).concat(t.dev||[]);}
function addStat(a,b,k){for(const x in b){const v=b[x]*k;const n=Math.floor(v)+(rnd()<v-Math.floor(v)?1:0);a[x]=(a[x]||0)+n;}}
function reserveWeek(){if(!S.res||S.res.s!==S.season)S.res={s:S.season,rec:{}};const K=7/140;const str={};
  for(const t of krTeams()){const res=new Set(reserveIds(t));for(const id of t.roster.concat(t.dev||[])){const p=P_(id);if(p)p.resWeek=res.has(id);}
    const ps=[...res].map(P_).filter(Boolean);const bats=ps.filter(p=>!isPitcher(p)).sort((a,b)=>roleVal(b)-roleVal(a)),pits=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a));
    bats.forEach((p,i)=>{p.res=Object.assign(newStat(),p.res||{});addStat(p.res,summaryStat(p,'KR3',i<9?0.9:0.35),K);});
    pits.forEach((p,i)=>{p.res=Object.assign(newStat(),p.res||{});addStat(p.res,summaryStat(p,'KR3',i<6?0.9:0.35),K);});
    const avg=a=>a.length?a.reduce((x,p)=>x+roleVal(p),0)/a.length:35;str[t.id]=avg(bats.slice(0,9))*0.55+avg(pits.slice(0,6))*0.45;}
  const ids=krTeams().map(t=>t.id);for(const id of ids)S.res.rec[id]=S.res.rec[id]||{w:0,l:0};
  // 하루 한 경기씩 7일: 매일 무작위로 짝을 지어 맞붙는다 (승패 합이 맞도록)
  for(let g=0;g<7;g++){const o=ids.slice();for(let i=o.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[o[i],o[j]]=[o[j],o[i]];}
    for(let i=0;i+1<o.length;i+=2){const a=o[i],b=o[i+1];const pw=clamp(0.5+(str[a]-str[b])*0.03,0.2,0.8);const [w,l]=rnd()<pw?[a,b]:[b,a];S.res.rec[w].w++;S.res.rec[l].l++;}}}
function reserveTable(){if(!S.res)return [];return Object.entries(S.res.rec).map(([id,r])=>({t:S.teams[id],w:r.w,l:r.l})).filter(x=>x.t).sort((a,b)=>(b.w/(b.w+b.l||1))-(a.w/(a.w+a.l||1))||b.w-a.w);}
function reserveSeasonEnd(s){for(const id in S.players){const p=S.players[id];if(!p.res)continue;const st=p.res;if(st.g||st.pG){p.rhist=(p.rhist||[]);const t=p.teamId!=null?S.teams[p.teamId]:null;p.rhist.push({s,tn:t?t.name:'-',st});while(p.rhist.length>((p.userLink||p.exUser)?4:1))p.rhist.shift();}delete p.res;p.resWeek=false;}
  const tb=reserveTable();S.resHist=S.resHist||[];if(tb[0])S.resHist.push({s,champ:tb[0].t.name,w:tb[0].w,l:tb[0].l});if(S.resHist.length>20)S.resHist.shift();S.res=null;}

// ---------- 임대 ----------
// 시즌 단위로 국내 구단에 보낸다. 소유·계약은 우리, 연봉은 역할에 따라 임대 구단이 부담. 시즌 끝에 기록과 함께 돌아온다.
function loanCheck(p){const ut=userTeam();if(!p||p.retired)return '선수를 찾을 수 없습니다.';if(!ut.roster.includes(p.id)&&!ut.dev.includes(p.id))return '우리 구단 선수만 임대 보낼 수 있습니다.';
  if(S.phase==='season'&&S.day>BAL.LOAN.deadline)return `시즌 중 임대는 ${BAL.LOAN.deadline}일차까지입니다. 스토브리그에 다음 시즌 임대를 보낼 수 있습니다.`;
  if(p.age>BAL.LOAN.maxAge)return `${BAL.LOAN.maxAge}세 이하만 임대 보낼 수 있습니다.`;if(p.dispatch)return '겨울리그 파견 중인 선수입니다.';if(S.pendingFA.includes(p.id))return '계약 만료 선수는 먼저 재계약하세요.';
  if(p.promise||p.apology)return '주전 약속(또는 기회 약속) 중인 선수는 임대 보낼 수 없습니다.';
  if(ut.roster.includes(p.id)){if(ut.roster.length-1<BAL.MIN_ROSTER)return `1군 최소 인원(${BAL.MIN_ROSTER}명) 밑으로 줄일 수 없습니다.`;if(isPitcher(p)&&ut.roster.map(P_).filter(isPitcher).length-1<BAL.MIN_PITCHERS)return `투수 최소 인원(${BAL.MIN_PITCHERS}명)이 부족해집니다.`;if(p.pos==='C'&&ut.roster.map(P_).filter(x=>x.pos==='C').length<=1)return '포수가 한 명뿐입니다.';}
  return null;}
function loanOptions(pid){const p=P_(pid);if(!p)return [];return krTeams().filter(t=>!t.isUser&&t.roster.length<28).map(t=>{const role=expectedRole(p,t);const pay=BAL.LOAN.payShare[role];const share=BAL.DISPATCH.share[role];const lvlF=clamp(1+(levelOf(t)-calcOvr(p))*0.02,0.8,1.25);const exp=0.4+0.6*share*lvlF;
    return {team:t,role,pay,share,growth:exp>=0.85?'2군보다 높음':exp>=BAL.RES_EXP?'2군과 비슷':'2군보다 낮음',gcls:exp>=0.85?'g':exp>=BAL.RES_EXP?'':'r'};}).filter(o=>o.pay!=null).sort((a,b)=>b.share-a.share||a.team.div-b.team.div).slice(0,12);}
function loanPlayer(pid,tid){const p=P_(pid);const ut=userTeam();const e=loanCheck(p);if(e)return e;const o=loanOptions(pid).find(x=>x.team.id===tid);if(!o)return '이 구단은 임대를 받지 않습니다 (자리 없음).';const t=o.team;
  S.market.listed=S.market.listed.filter(x=>x!==pid);S.market.offers=S.market.offers.filter(x=>x.pid!==pid);removeFromTeam(ut,p);t.roster.push(pid);p.teamId=t.id;
  p.loan={from:ut.id,to:t.id,s:S.phase==='season'?S.season:S.season+1,pay:o.pay,role:o.role,ovr0:r1(calcOvr(p)),start:S.phase==='season'?S.day:0};ut.loaned=(ut.loaned||[]).concat(pid);autoLineup(t);fixLineup(ut);
  news(`${josa(p.name,'을','를')} ${t.name}(${t.div}부)에 ${S.phase==='season'?'이번':'다음'} 시즌 임대 보냈습니다 — 예상 역할 ${o.role}, 연봉 ${Math.round(o.pay*100)}% 임대 구단 부담`,'contract');return null;}
function returnLoans(s){for(const t of Object.values(S.teams)){for(const pid of [...(t.loaned||[])]){const p=P_(pid);if(!p||p.retired||!p.loan){t.loaned=t.loaned.filter(x=>x!==pid);if(p)p.loan=null;continue;}if(p.loan.s>s)continue;
    const b=S.teams[p.loan.to];if(b){removeFromTeam(b,p);if(!b.isUser)autoLineup(b);}const toDev=t.roster.length>=BAL.MAX_ROSTER;(toDev?t.dev:t.roster).push(pid);p.teamId=t.id;
    const h=(p.hist||[]).slice(-1)[0];const st=h&&h.s===s&&h.team===(b&&b.id)?h.st:null;p.loanDone={s,tn:b?b.name:'',div:b?b.div:null,role:p.loan.role,from:p.loan.ovr0,to:r1(calcOvr(p)),st};
    const line=st?(isPitcher(p)?(st.pOuts?`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:'출장 없음'):(st.ab?`${st.g}경기 타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'출장 없음')):'기록 없음';
    if(t.isUser)news(`임대 복귀: ${p.name} — ${b?b.name:''}에서 ${line}, 종합 ${Math.round(p.loan.ovr0)} → ${Math.round(calcOvr(p))}`,'contract');p.loan=null;t.loaned=t.loaned.filter(x=>x!==pid);}}}

// ---------- 시즌 결정전 ----------
// 정규 28경기 뒤 29일차: 부별 우승 결정전(1위 vs 2위), 승강 결정전(1부 6위 vs 2부 3위, 2부 6위 vs 3부 3위). 정규 순위 기록에는 넣지 않는다.
function createPost(){const T={};for(let d=1;d<=3;d++)T[d]=standings(d);const day=BAL.SEASON_GAMES+1;const G=[];
  for(let d=1;d<=3;d++)G.push({day,div:d,home:T[d][0].id,away:T[d][1].id,res:null,post:'final'});
  G.push({day,div:'P12',home:T[1][5].id,away:T[2][2].id,res:null,post:'promo'});G.push({day,div:'P23',home:T[2][5].id,away:T[3][2].id,res:null,post:'promo'});
  S.schedule.push(...G);S.post={s:S.season,day};const ut=userTeam();const mine=G.find(g=>g.home===ut.id||g.away===ut.id);
  news(`정규 시즌 종료 — 29일차 결정전: 부별 우승 결정전(1위 vs 2위)과 승강 결정전${mine?' · 우리 구단 출전!':''}`,'league');}
function postInfo(g){if(!g||!g.post)return null;const ut=userTeam();const me=g.home===ut.id?'home':g.away===ut.id?'away':null;
  if(g.post==='final')return {title:`${g.div}부 우승 결정전`,stake:me?'이기면 챔피언 (상금·명성)':'1위 vs 2위 단판',me};
  const upDiv=g.div==='P12'?1:2;return {title:`승강 결정전 (${upDiv}부 6위 vs ${upDiv+1}부 3위)`,stake:me==='away'?`이기면 ${upDiv}부 승격`:me==='home'?`지면 ${upDiv+1}부 강등`:'단판 승부',me};}

// ---------- 구단 위상 (명문도) ----------
// 명성(rep)은 그해 인기, 위상(pres)은 쌓아 온 전통. 시즌마다 「시즌 점수」(소속 부·순위·우승·승강) 쪽으로 20%씩 다가가고,
// 1부 우승은 바닥(전통)을 올린다. 명문은 선수·코치가 오고 싶어 하고, 수입이 많고, 강등 위기에 모기업이 긴급 투자한다.
function presOf(t){return t?(t.league==='KR'?(t.pres!=null?t.pres:30):t.rep):30;}
function presTierIdx(t){const v=presOf(t);return BAL.PRES_TIER.findIndex(x=>v>=x[0]);}
function presTier(t){return BAL.PRES_TIER[presTierIdx(t)][1];}
function presTierOf(v){return BAL.PRES_TIER.find(x=>v>=x[0])[1];}
function presInit(t,i){t.pres=BAL.PRES0[i]!=null?BAL.PRES0[i]:BAL.PRES_NORM[t.div];t.presFloor=t.pres>=80?60:t.pres>=70?45:0;t.titles=t.pres>=80?ri0(i):0;t.presLog=[];}
function ri0(i){return [6,4,3][i]||0;}  // 명문의 과거 1부 우승 횟수(설정값, 난수 아님)
function presIncome(t){if(t.league!=='KR'||t.pres==null)return 1;return clamp(1+(t.pres-BAL.PRES_NORM[t.div])*0.004,0.85,1.2);}
function presPull(p,t){if(t.league!=='KR')return {d:0};const from=p.teamId!=null?S.teams[p.teamId]:null;if(from&&from.id===t.id)return {d:0};
  const pf=from?(from.league==='KR'?presOf(from):Math.min(60,from.rep)):30;const pt=presOf(t);const d=clamp((pt-pf)*0.004,-0.12,0.15);
  let why='';if(pt>=80&&d>0)why='명문 구단 입단 희망';else if(d>=0.06)why=`${presTierOf(pt)} 구단으로 옮기는 데 긍정적`;else if(d<=-0.06)why=`구단 위상 차이 (${presTierOf(pf)} → ${presTierOf(pt)})`;
  return {d,why};}
// 시작 시 명문 구단 전력 보강 (난수를 쓰지 않아 기존 시드의 선수 생성은 그대로)
function presBoostRosters(){for(const t of krTeams()){const b=t.pres>=80?1.5:t.pres>=70?2:0;if(!b)continue;for(const pid of t.roster){const p=P_(pid);for(const x in p.attrs)p.attrs[x]=clamp(p.attrs[x]+b,20,99);p.snap=snapOf(p);}autoLineup(t);}}
function presSeasonEnd(s,tables,rec){const out={};const champ=new Set();const P=rec.post;if(P)for(const d in P.final)champ.add(P.final[d].w+':'+d);
  for(let d=1;d<=3;d++)tables[d].forEach((t,i)=>{if(t.pres==null)return;const parts=[[`${d}부 ${i+1}위`,BAL.PRES_BASE[d]+BAL.PRES_RANK[i]]];
    if(champ.has(t.id+':'+d))parts.push([`${d}부 우승`,10]);if(rec.promoted.includes(t.name))parts.push(['승격',6]);if(rec.relegated.includes(t.name))parts.push(['강등',-8]);
    const score=parts.reduce((a,x)=>a+x[1],0);const from=t.pres;let to=from+(score-from)*BAL.PRES_RATE;
    if(d===1&&champ.has(t.id+':1')){t.titles=(t.titles||0)+1;to+=3;t.presFloor=Math.min(BAL.PRES_FLOOR_MAX,Math.max(t.presFloor||0,(t.presFloor||0)+BAL.PRES_FLOOR_TITLE));}
    to=r1(clamp(Math.max(to,t.presFloor||0),5,99));t.pres=to;t.presLog=(t.presLog||[]).concat([{s,from:r1(from),to,score,parts}]).slice(-8);
    const tf=presTierOf(from),tt=presTierOf(to);out[t.id]={from:r1(from),to,tierFrom:tf,tierTo:tt,score,parts};
    if(tf!==tt){const up=presTierIdx({league:'KR',pres:to})<presTierIdx({league:'KR',pres:from});if(t.isUser)news(up?`${t.name}, 이제 「${tt}」 구단으로 불립니다 (위상 ${Math.round(from)} → ${Math.round(to)})`:`${t.name}의 위상이 「${tt}」(으)로 내려갔습니다`,'league');
      else if(tt==='명문'||tf==='명문')news(up?`${t.name}, 명문 구단 반열에`:`한때의 명문 ${t.name}, 「${tt}」로 내려앉다`,'league');}});
  return out;}
// 명문의 저력: 시즌 중 강등권(6위 이하)이면 모기업 긴급 투자 + 보강, 2부 이하로 떨어진 명가는 스토브리그에 재건 투자
function presCrisis(t){if(t.league!=='KR'||presOf(t)<60)return;const key=S.phase==='season'?'c'+S.season:'r'+S.season;if(t._presAct===key)return;
  let why=null;if(S.phase==='season'&&S.day>=8&&S.day<=BAL.SEASON_GAMES){const r=standings(t.div).findIndex(x=>x.id===t.id)+1;if(r>=6&&t.div<3)why='강등 위기';}
  else if(S.phase==='offseason'&&t.div>1&&S.week<=3)why='재건';
  if(!why)return;t._presAct=key;const inj=Math.round(econ(t).sponsor*0.3*(presOf(t)-50)/40/100)*100;t.cash+=inj;t.fin.sponsor+=inj;
  if(t.isUser){news(`모기업이 ${why==='재건'?'1부 복귀를 위해':'강등 위기의'} ${presTier(t)} 구단 ${t.name}에 긴급 지원금 ${money(inj)}을 보냈습니다`,'league');return;}
  const got=[];for(let k=0;k<2;k++){const ps=t.roster.map(P_);let worst=null,wv=999;for(const pos of POS_BAT.concat(['SP','SP','RP'])){const best=ps.filter(p=>p.pos===pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[k===1&&pos==='SP'?1:0];const v=best?calcOvr(best):0;if(v<wv){wv=v;worst=pos;}}
    const cands=krTeams().filter(x=>!x.isUser&&x.id!==t.id&&presOf(x)<presOf(t)).flatMap(x=>x.roster.map(P_)).filter(p=>p&&!p.loan&&p.pos===worst&&calcOvr(p)>=wv+3&&(p.lockUntil||0)<=S.clock&&!got.includes(p.id)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,4);
    for(const p of cands){const seller=S.teams[p.teamId];const fee=aiAsk(seller,p);if(fee>t.cash*0.6)continue;if(seller.roster.length<=BAL.MIN_ROSTER+1)continue;
      transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*1.1/10)*10,years:ri(2,3)},'이적');got.push(p.id);break;}}
  if(t.roster.length>28){while(t.roster.length>28){const ps=t.roster.map(P_).filter(x=>!x.loan).sort((a,b)=>calcValue(a)-calcValue(b));const p=ps[0];if(!p)break;removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});}}
  autoLineup(t);news(`${presTier(t)} ${t.name}, ${why==='재건'?'1부 복귀를 위한 재건 투자':'강등권 위기에 모기업 긴급 투자'} (${money(inj)})${got.length?' — '+got.map(id=>P_(id).name).join(', ')+' 영입':''}`,'league');}
function presMigrate(){const idx={};TEAM_NAMES.KR.forEach(([n],i)=>idx[n]=i);for(const t of krTeams()){if(t.pres!=null)continue;const i=idx[t.name];presInit(t,i!=null?i:99);
    if(i==null||Math.floor(i/8)+1!==t.div)t.pres=r1((t.pres*0.5)+BAL.PRES_NORM[t.div]*0.5);}}
function presTable(){return krTeams().map(t=>({t,v:presOf(t),tier:presTier(t)})).sort((a,b)=>b.v-a.v);}

// ---------- 스폰서 · 광고 ----------
// 메인 스폰서(3~4가지 계약 유형 중 선택) + 광고판(고정형/관중 연동형) + 선수 개인 광고(구단 수수료). 유저 구단만 — AI는 기존 자동 수입.
// 기대 총액은 예전 자동 스폰서와 비슷하게(메인 0.8 + 광고판 약 0.15), 선택에 따라 위험과 보상이 달라진다.
function sponBase(t){return econ(t).sponsor*(0.7+t.rep/100*0.6)*presIncome(t);}
function sponTier(t){const v=presOf(t);return v>=80?'big':v>=40?'mid':'local';}
function sponPick(pool,used){const c=pool.filter(x=>!used.has(x[0]));const x=c.length?pick(c):pick(pool);used.add(x[0]);return x;}
function boardSlots(t){const SP=BAL.SPON;return t.league==='KR'?SP.boards[t.div]+(presOf(t)>=80?1:0):SP.boards.os;}
function ensureSpon(t){if(!t||t.spon)return;t.spon={main:null,offers:[],boards:[],boardOffers:[]};const B=sponBase(t);
  if(S.phase==='season'){const [co,sec]=pick(BAL.SPON.co[sponTier(t)==='big'?'mid':'local']);t.spon.main={co,sector:sec,kind:'base',years:1,base:Math.round(B*0.85/10)*10,since:S.season,first:true};
    sponGenBoards(t);t.spon.boards=t.spon.boardOffers.filter(o=>o.type==='fixed').slice(0,boardSlots(t)).map(o=>({...o,auto:true}));t.spon.boardOffers=[];}
  else{sponGenOffers(t);sponGenBoards(t);}}
function sponGenOffers(t){const SP=BAL.SPON;const B=sponBase(t);const used=new Set();const tier=sponTier(t);const n=compTeams(compOf(t)).length||8;const tgt=t.league==='KR'?4:Math.ceil(n/2);
  const O=[];const mk=(kind,coTier)=>{const K=SP.kinds[kind];const [co,sector]=sponPick(SP.co[coTier],used);const o={id:S.nextOfferId++,co,sector,kind,years:K.years,base:Math.round(B*K.base*(0.95+rnd()*0.1)/10)*10};
    if(kind==='perf')o.bonus=Object.fromEntries(Object.entries(SP.perfBonus).map(([k,v])=>[k,Math.round(B*v/10)*10]));if(kind==='short'){o.target=tgt;o.penalty=Math.round(B*K.miss/10)*10;}if(kind==='big')o.clause='relegate';return o;};
  if(tier==='big')O.push(mk('big','big'));const ct=tier==='big'?'mid':tier==='mid'?'mid':'local';O.push(mk('stable',ct),mk('perf',tier==='local'?'local':'mid'),mk('short',ct));t.spon.offers=O;}
function sponGenBoards(t){const SP=BAL.SPON;const B=sponBase(t);const n=boardSlots(t)+2;const used=new Set();const estT=econ(t).ticket*(0.7+t.rep/100*0.6)*presIncome(t)*BAL.SEASON_GAMES/2;const O=[];
  const pool=SP.co.local.concat(SP.co.mid);for(let i=0;i<n;i++){const [co,sector]=sponPick(pool,used);const val=Math.round(B*SP.boardShare*(0.8+rnd()*0.4)/10)*10;
    if(i%3===2)O.push({id:S.nextOfferId++,co,sector,type:'gate',rate:r1(Math.min(0.4,val*(0.95+rnd()*0.35)/Math.max(1,estT))*100)/100,est:Math.round(val*1.1/10)*10});
    else O.push({id:S.nextOfferId++,co,sector,type:'fixed',val});}
  t.spon.boardOffers=O;}
function sponSign(oid){const t=userTeam();ensureSpon(t);const sp=t.spon;if(S.phase!=='offseason')return '스폰서 계약은 스토브리그에만 할 수 있습니다.';if(sp.main)return `이미 ${sp.main.co}와 계약 중입니다 (${sp.main.years}년 남음).`;
  const o=sp.offers.find(x=>x.id===oid);if(!o)return '제안이 없습니다.';sp.main={...o,since:S.season+1};sp.offers=[];
  sp.boards=sp.boards.filter(b=>b.sector!==o.sector);news(`메인 스폰서 계약: ${o.co} — ${BAL.SPON.kinds[o.kind].name} ${o.years}년, 시즌당 ${money(o.base)}`,'fin');return null;}
function boardSign(oid){const t=userTeam();ensureSpon(t);const sp=t.spon;if(S.phase!=='offseason')return '광고판 계약은 스토브리그에만 할 수 있습니다.';const o=sp.boardOffers.find(x=>x.id===oid);if(!o)return '제안이 없습니다.';
  if(sp.boards.length>=boardSlots(t))return `광고판 자리가 모두 찼습니다 (${boardSlots(t)}자리).`;if(sp.main&&sp.main.sector===o.sector)return `메인 스폰서(${sp.main.co})와 같은 업종(${o.sector})은 받을 수 없습니다.`;if(sp.boards.some(b=>b.sector===o.sector))return `같은 업종(${o.sector}) 광고가 이미 있습니다.`;
  sp.boards.push({...o});sp.boardOffers=sp.boardOffers.filter(x=>x.id!==oid);return null;}
function boardDrop(oid){const sp=userTeam().spon;if(S.phase!=='offseason')return '시즌 중에는 뺄 수 없습니다.';const b=sp.boards.find(x=>x.id===oid);if(!b)return '없는 광고입니다.';sp.boards=sp.boards.filter(x=>x.id!==oid);sp.boardOffers.push(b);return null;}
function sponAutoPick(){const t=userTeam();ensureSpon(t);const sp=t.spon;
  if(!sp.main&&sp.offers.length){const o=sp.offers.find(x=>x.kind==='stable')||sp.offers[0];sp.main={...o,since:S.season+1,auto:true};sp.offers=[];news(`메인 스폰서를 고르지 않아 ${o.co}(${BAL.SPON.kinds[o.kind].name})와 자동 계약했습니다`,'fin');}
  const free=boardSlots(t)-sp.boards.length;if(free>0){const c=sp.boardOffers.filter(o=>o.type==='fixed'&&!(sp.main&&sp.main.sector===o.sector)&&!sp.boards.some(b=>b.sector===o.sector)).sort((a,b)=>b.val-a.val);let k=0;
    for(const o of c){if(k>=free)break;if(sp.boards.some(b=>b.sector===o.sector))continue;sp.boards.push({...o,val:Math.round(o.val*0.8/10)*10,auto:true});k++;}if(k)news(`빈 광고판 ${k}자리는 대행사가 기본 단가(80%)로 채웠습니다`,'fin');}
  sp.boardOffers=[];}
function sponPay(t){ensureSpon(t);const sp=t.spon;let inc=0;if(sp.main){inc+=sp.main.base;}else inc+=Math.round(sponBase(t)*0.6);t.cash+=inc;t.fin.sponsor+=inc;
  let ads=0;for(const b of sp.boards)if(b.type==='fixed')ads+=b.val;t.cash+=ads;t.fin.ads=(t.fin.ads||0)+ads;
  let com=0;for(const id of t.roster.concat(t.dev)){const p=P_(id);if(p&&p.endorse&&p.endorse.years>0&&p.endorse.paid!==S.season){const c=Math.round(p.endorse.fee*BAL.SPON.endorse.comm/10)*10;com+=c;p.endorse.paid=S.season;}}t.cash+=com;t.fin.endorse=(t.fin.endorse||0)+com;}
function boardGate(t,ticket){const sp=t.spon;if(!sp)return;let a=0;for(const b of sp.boards)if(b.type==='gate')a+=Math.round(ticket*b.rate);if(a){t.cash+=a;t.fin.ads=(t.fin.ads||0)+a;}}
function sponStatus(t){t=t||userTeam();ensureSpon(t);const m=t.spon.main;if(!m)return null;const n=compTeams(compOf(t)).length||8;const r=standings(compOf(t)).findIndex(x=>x.id===t.id)+1;const played=t.rec.w+t.rec.l>0;
  if(m.kind==='perf'){const b=m.bonus;const now=!played?0:r===1?b.r1:r===2?b.r2:r<=4?b.r4:0;return {text:played?`지금 ${r}위 → 순위 보너스 ${money(now)}${t.league==='KR'&&t.div>1?` (+승격 시 ${money(b.promo)})`:''}`:'개막 전',ok:now>0};}
  if(m.kind==='short')return {text:played?`목표 ${m.target}위 이내 · 지금 ${r}위${r<=m.target?' (달성 중)':` — 이대로면 위약금 ${money(m.penalty)}`}`:`목표 ${m.target}위 이내`,ok:played?r<=m.target:null};
  if(m.kind==='big')return {text:'강등되면 계약 해지',ok:null};return null;}
function sponSettle(s,rec){const t=userTeam();if(!t.spon)return;const sp=t.spon;const m=sp.main;const L=S.lastSummary||{};const out=[];const n=compTeams(L.div!=null?L.div:compOf(t)).length||8;const r=L.rank||t.lastRank||n;
  const champ=rec.post&&Object.values(rec.post.final||{}).some(f=>f.w===t.id);
  if(m&&m.since<=s){if(m.kind==='perf'){const b=m.bonus;let x=r===1?b.r1:r===2?b.r2:r<=4?b.r4:0;if(L.promoted)x+=b.promo;if(champ)x+=b.champ;if(x){t.cash+=x;t.fin.sponsor+=x;out.push(`${m.co} 성적 보너스 +${money(x)}`);}else out.push(`${m.co} 성적 보너스 없음 (${r}위)`);}
    if(m.kind==='short'){if(r>m.target){t.cash-=m.penalty;t.fin.other+=m.penalty;out.push(`${m.co} 목표(${m.target}위) 미달 위약금 −${money(m.penalty)}`);}else out.push(`${m.co} 목표(${m.target}위 이내) 달성`);}
    m.years--;if(m.clause==='relegate'&&L.relegated&&m.years>0){out.push(`강등으로 ${m.co} 계약 해지 (남은 ${m.years}년 소멸)`);m.years=0;}
    if(m.years<=0){if(!out.some(x=>/해지/.test(x)))out.push(`${m.co} 계약 만료 — 새 스폰서 제안 도착`);sp.main=null;}}
  sp.boards=[];sponGenBoards(t);if(!sp.main)sponGenOffers(t);
  for(const id of t.roster.concat(t.dev)){const p=P_(id);if(p&&p.endorse){p.endorse.years--;if(p.endorse.years<=0){out.push(`${p.name} 개인 광고(${p.endorse.co}) 계약 종료`);p.endorse=null;}}}
  if(out.length){for(const x of out)news(x,'fin');if(S.lastSummary)S.lastSummary.spon=out;}}
// 선수 개인 광고: 실력·성적·나이로 「인기 점수」를 매겨 제안. 수락하면 사기↑·재계약 요구↑, 구단은 광고료의 30%를 시즌마다 수수료로 받음(판매하면 끊김)
function starScore(p,t){const st=p.cur&&(p.cur.pa||p.cur.pOuts)?p.cur:((p.hist||[]).slice(-1)[0]||{}).st||{};let sc=calcOvr(p)-levelOf(t)+(p.age<=25?2:0);
  if(isPitcher(p)){if((st.pW||0)>=5)sc+=2;if((st.pSV||0)>=5)sc+=1.5;if(st.pOuts>=60&&st.pER*27/st.pOuts<3)sc+=2;}else{if((st.hr||0)>=6)sc+=2;if(st.ab>=60&&st.h/st.ab>=0.32)sc+=2;}return r1(sc);}
function endorseOffers(){const t=userTeam();S.endorseOffers=S.endorseOffers||[];const E=BAL.SPON.endorse;if(S.endorseOffers.length>=2)return;
  const c=t.roster.map(P_).filter(p=>p&&!p.endorse&&!S.endorseOffers.some(o=>o.pid===p.id)&&!p.loan).map(p=>({p,sc:starScore(p,t)})).filter(x=>x.sc>=E.minScore).sort((a,b)=>b.sc-a.sc).slice(0,2);
  const used=new Set();for(const {p,sc} of c){if(rnd()>clamp(0.4+(sc-BAL.SPON.endorse.minScore)*0.05,0.4,0.9))continue;const [co,sector]=sponPick(BAL.SPON.co[sc>=14&&presOf(t)>=60?'mid':'local'].concat(sc>=16?BAL.SPON.co.mid:[]),used);
    const fee=Math.round(econ(t).sponsor*E.feeShare*(1+(sc-E.minScore)*0.1)*(0.9+rnd()*0.2)/10)*10;S.endorseOffers.push({id:S.nextOfferId++,pid:p.id,co,sector,fee,years:rnd()<0.5?1:2,sc,exp:S.clock+7});
    news(`${p.name}에게 개인 광고 제안: ${co} (연 ${money(fee)})`,'contract');}}
function endorseTick(){S.endorseOffers=(S.endorseOffers||[]).filter(o=>{const p=P_(o.pid);if(!p||p.teamId!==S.userTeamId)return false;if(o.exp<=S.clock){news(`${p.name}의 ${o.co} 광고 제안이 기간 만료되었습니다`,'contract');return false;}return true;});}
function endorseAnswer(oid,yes){const o=(S.endorseOffers||[]).find(x=>x.id===oid);if(!o)return '제안이 없습니다.';const p=P_(o.pid);const t=userTeam();const E=BAL.SPON.endorse;S.endorseOffers=S.endorseOffers.filter(x=>x.id!==oid);if(!p||p.teamId!==t.id)return '선수가 팀에 없습니다.';
  if(yes){p.endorse={co:o.co,sector:o.sector,fee:o.fee,years:o.years,since:S.season,paid:S.phase==='season'?S.season:null};p.morale=clamp(p.morale+E.morale,0,100);
    let com=0;if(S.phase==='season'){com=Math.round(o.fee*E.comm/10)*10;t.cash+=com;t.fin.endorse=(t.fin.endorse||0)+com;}
    news(`${p.name}, ${o.co} 광고 모델 계약 (${o.years}년, 연 ${money(o.fee)}) — 구단 수수료 ${Math.round(E.comm*100)}%${com?` ${money(com)} 입금`:' (개막 때 입금)'}`,'contract');}
  else{p.morale=clamp(p.morale+E.decline,0,100);news(`${p.name}의 ${o.co} 광고 제안을 거절했습니다 (선수 실망)`,'contract');}return null;}

// ---------- 코치진 ----------
// 부서 역량 P: 상위 코치부터 가중 합산(1, .7, .5, .35, .25) × (평점-40)/40. 효과는 포화형 곡선, 기준 역량(STAFF_REF) 대비 상대값.
// AI 구단은 코치 목록이 없고 기준 역량(효과 ±0)으로 간주 → 기존 밸런스 유지, 유저만 투자에 따라 차이가 생김.
const CW=[1,0.7,0.5,0.35,0.25];const sat=(P,k)=>1-Math.exp(-P/k);
function staffP(t,d){if(!t||!t.staff)return BAL.STAFF_REF[d];const rs=t.staff.filter(c=>c.dept===d&&(c.years>0||c.expiring)).map(c=>c.rating).sort((a,b)=>b-a);return rs.reduce((s,r,i)=>s+(CW[i]||0.2)*Math.max(0,(r-40)/40),0);}
function staffTrait(t,d,key){return !!(t&&t.staff&&t.staff.some(c=>c.dept===d&&(c.years>0||c.expiring)&&c.trait&&BAL.STAFF_TRAITS[d][c.trait]===key));}
function growMul(P,ref){const f=x=>0.9+0.3*sat(x,1.2);return f(P)/f(ref);}
function staffFx(t){const R=BAL.STAFF_REF;const P={};for(const d in BAL.STAFF)P[d]=staffP(t,d);
  const devF=x=>0.94+0.25*sat(x,1.0);const recF=x=>Math.round(8*sat(x,1.5));const ageF=x=>1-0.3*sat(x,1.5);const scF=x=>0.15*sat(x,1.5);
  return {P,bat:growMul(P.bat,R.bat),pit:growMul(P.pit,R.pit),def:growMul(P.def,R.def),dev:devF(P.dev)/devF(R.dev),
    rec:recF(P.med)-recF(R.med)+(staffTrait(t,'med','fatigue')?2:0),aging:ageF(P.med)/ageF(R.med)*(staffTrait(t,'med','aging')?0.9:1),
    conf:Math.round((scF(P.scout)-scF(R.scout))*100)/100,watch:Math.floor(P.scout*1.5)+(staffTrait(t,'scout','watch')?1:0),scoutN:P.scout>=3?2:P.scout>=1.5?1:0,devCapUp:P.dev>=1.2?1:0};}
function attrMul(t,p,k,fx){if(!t||!t.staff)return 1;const isP=isPitcher(p);let m=isP?fx.pit:(['speed','defense','arm'].includes(k)?fx.def:fx.bat);const d=isP?'pit':(['speed','defense','arm'].includes(k)?'def':'bat');if(staffTrait(t,d,k))m*=1.2;return m;}
const COACH_BIO={bat:['전 1부 4번 타자 출신','전 2부 타격코치','독립리그 감독 출신','타격 분석원 출신','전 해외리그 타격코치'],pit:['전 1부 에이스 출신','전 2부 투수코치','불펜 포수 출신','전 해외리그 투수코치','투구 분석원 출신'],def:['전 골든글러브 유격수','전 2부 수비코치','전 도루왕 출신','전 대표팀 주루코치'],
  dev:['전 고교 감독','전 대학 감독','전 2군 감독','유소년 아카데미 원장 출신'],scout:['전 스카우트 팀장','전 고교 감독','전력분석원 출신','전 해외 스카우트'],med:['전 대표팀 트레이너','재활센터 출신','스포츠의학 전공','전 1부 수석 트레이너']};
function genCoach(dept,grade){const R={S:[80,92],A:[70,79],B:[60,69],C:[50,59],D:[38,49]};if(!grade){const x=rnd();grade=x<0.04?'S':x<0.17?'A':x<0.45?'B':x<0.8?'C':'D';}
  const rating=ri(R[grade][0],R[grade][1]);const nat=rating>=70&&rnd()<0.25?pick(['JP','US']):'KR';const tr=Object.keys(BAL.STAFF_TRAITS[dept]);const trait=rnd()<(rating>=70?0.7:0.35)?pick(tr):null;
  S.nextCoachId=(S.nextCoachId||1);return {id:S.nextCoachId++,name:genName(nat),nat,age:ri(36,63),dept,rating,trait,salary:Math.round(BAL.STAFF_PAY[gradeOf(rating)]*(0.85+rnd()*0.3)/10)*10,years:0,bio:pick(COACH_BIO[dept])};}
// 우리와 인연 있는 선수가 은퇴하면 코치 후보로 시장에 나온다
function alumniRetire(p){if(!(p.exUser||p.coached||p.userLink)||p.age<31)return;const isP=isPitcher(p);const a=p.attrs;const dept=isP?'pit':(Math.max(a.defense,a.speed)>Math.max(a.contact,a.power)?'def':'bat');
  const best=Math.max(calcOvr(p),...(p.hist||[]).map(h=>0));const rating=clamp(Math.round(42+(calcOvr(p)-45)*0.6+ri(-3,5)),40,78);const abroad=(p.transfers||[]).some(t=>/해외/.test(t.kind));
  S.alumniCoach=(S.alumniCoach||[]);S.nextCoachId=S.nextCoachId||1;S.alumniCoach.push({id:S.nextCoachId++,name:p.name,nat:p.nat,age:p.age+1,dept,rating,trait:null,salary:Math.round(BAL.STAFF_PAY[gradeOf(rating)]*0.85/10)*10,years:0,bio:`우리 구단 출신 · ${abroad?'해외 무대 경험':'현역 '+(p.hist||[]).length+'시즌'}`,alumni:p.id});
  news(`[출신] ${josa(p.name,'이','가')} 은퇴 후 지도자의 길을 원합니다 — 코치 시장에 나왔습니다.`,'alumni');}
function refreshStaffPool(){S.staffPool=[];for(const d in BAL.STAFF){const n=d==='scout'||d==='med'?5:4;for(let i=0;i<n;i++)S.staffPool.push(genCoach(d));}
  // 등급 다양성 보장: 부서마다 B 이상 1명
  for(const d in BAL.STAFF)if(!S.staffPool.some(c=>c.dept===d&&c.rating>=60))S.staffPool.push(genCoach(d,'B'));
  if(S.alumniCoach&&S.alumniCoach.length){S.staffPool.unshift(...S.alumniCoach);S.alumniCoach=[];}}
function staffTier(t){return t.league==='KR'?t.div:(t.league==='JP'||t.league==='US'?1:2);}
// 부임 시 기본 코치진: 기준 역량 수준(효과 ±0 근처). 상위 무대일수록 조금 더 탄탄
function starterStaff(t){const lv=staffTier(t);const R={1:[64,58],2:[58,55],3:[54,52]}[lv];const st=[];
  for(const d of ['bat','pit','scout','med']){const c=genCoach(d,'C');c.rating=clamp((d==='bat'||d==='pit'?R[0]:R[1])+ri(-1,1),40,90);c.trait=null;c.salary=Math.round(BAL.STAFF_PAY[gradeOf(c.rating)]*0.9/10)*10;c.years=d==='bat'||d==='pit'?2:1;c.since=S.season;st.push(c);}
  if(lv===1){const c=genCoach('def','C');c.rating=55;c.trait=null;c.salary=1800;c.years=2;c.since=S.season;st.push(c);}return st;}
function coachTerms(c,t){t=t||userTeam();const tier=t.league==='KR'?t.div:(t.league==='JP'||t.league==='US'?1:2);const g=gradeOf(c.rating);let mult=1,ok=true,why='';
  if(g==='S'){if(tier>=3){ok=false;why='3부 구단 제의는 받지 않습니다';}else if(tier===2){mult=1.4;why='2부라 연봉 40% 더 요구';}}
  else if(g==='A'&&tier===3){mult=1.25;why='3부라 연봉 25% 더 요구';}
  if(!ok&&g==='S'&&presOf(t)>=60){ok=true;mult=1.5;why=`${presTier(t)} 구단이라 3부여도 수락 (연봉 50% 더)`;}
  if(ok&&t.league==='KR'&&presOf(t)>=80){mult*=0.93;why=why?why+' (명문 구단이라 일부 할인)':'명문 구단 지도 경력 — 7% 할인';}
  else if(ok&&t.rep>=70){mult*=0.95;why=why?why+' (구단 명성으로 일부 할인)':'구단 명성 덕분에 5% 할인';}
  return {ok,salary:Math.round(c.salary*mult/10)*10,why};}
function deptCount(t,d){return (t.staff||[]).filter(c=>c.dept===d&&c.years>0).length;}
function hireCoach(cid,years){const ut=userTeam();ut.staff=ut.staff||[];const c=(S.staffPool||[]).find(x=>x.id===cid);if(!c)return '이미 다른 곳과 계약했거나 없는 코치입니다.';years=clamp(years|0,1,3);
  if(deptCount(ut,c.dept)>=BAL.STAFF[c.dept].max)return `${BAL.STAFF[c.dept].name} 정원(${BAL.STAFF[c.dept].max}명)이 찼습니다. 기존 코치를 해임한 뒤 영입하세요.`;
  const tm=coachTerms(c,ut);if(!tm.ok)return `${c.name}: ${tm.why}`;if(ut.cash<tm.salary*0.25)return `자금 부족 — 최소 첫 분기 연봉(${money(Math.round(tm.salary*0.25))})은 있어야 합니다.`;
  c.salary=tm.salary;c.years=years;c.since=S.season;c.hiredFor=S.phase==='offseason'?S.season+1:S.season;S.staffPool=S.staffPool.filter(x=>x!==c);ut.staff.push(c);
  news(`${BAL.STAFF[c.dept].name} ${c.name}(${gradeOf(c.rating)}급) 영입 — 연봉 ${money(c.salary)}, ${years}년 계약`,'contract');return null;}
function fireCoach(cid){const ut=userTeam();const c=(ut.staff||[]).find(x=>x.id===cid);if(!c)return '없는 코치입니다.';const sev=severanceOf(c);ut.cash-=sev;ut.fin.other+=sev;ut.staff=ut.staff.filter(x=>x!==c);
  news(`${BAL.STAFF[c.dept].name} ${josa(c.name,'을','를')} 해임했습니다${sev?` (잔여 연봉 보상 ${money(sev)})`:''}.`,'contract');return null;}
function severanceOf(c){if(c.years<=0)return 0;const left=c.years-(S.phase==='season'?(S.day-1)/BAL.SEASON_GAMES:0);return Math.round(c.salary*0.5*Math.max(0,left)/10)*10;}
function renewDemand(c){return Math.round(BAL.STAFF_PAY[gradeOf(c.rating)]*(c.rating>=70?1.05:1)/10)*10;}
function renewCoach(cid,years){const ut=userTeam();const c=(ut.staff||[]).find(x=>x.id===cid);if(!c)return '없는 코치입니다.';if(c.years>0)return '아직 계약 기간이 남았습니다.';
  if(c.age>=67)return `${c.name}: 은퇴를 결심했습니다.`;years=clamp(years|0,1,3);c.salary=renewDemand(c);c.years=years;c.expiring=false;news(`${c.name} 코치와 ${years}년 재계약 (연봉 ${money(c.salary)})`,'contract');return null;}
function staffPay(t){return (t.staff||[]).filter(c=>c.years>0).reduce((s,c)=>s+c.salary,0);}
function staffSeasonEnd(){const ut=userTeam();for(const t of Object.values(S.teams)){if(!t.staff)continue;for(const c of t.staff){c.age++;c.rating=clamp(c.rating+(c.age<46?ri(0,2):c.age>60?-ri(0,2):ri(-1,1)),30,95);if(t===ut&&c.years>0){c.years--;if(c.years<=0){c.expiring=true;news(`${BAL.STAFF[c.dept].name} ${c.name} 계약 만료 — 스토브리그 2주차까지 재계약할 수 있습니다.`,'contract');}}}}
  refreshStaffPool();}
function staffWeek3(){const ut=userTeam();if(!ut.staff)return;const gone=ut.staff.filter(c=>c.years<=0);for(const c of gone)news(`${BAL.STAFF[c.dept].name} ${josa(c.name,'이','가')} 계약 만료로 팀을 떠났습니다.`,'contract');ut.staff=ut.staff.filter(c=>c.years>0);}
// 스카우트 상시 관찰: 매주 역량만큼 우리 선수·육성군·유망주·드래프트 후보의 잠재력 판별을 정밀화
function scoutWatch(){const ut=userTeam();if(!ut.staff)return;const fx=staffFx(ut);if(fx.watch<=0)return;
  const pool=ut.roster.concat(ut.dev,S.youth||[],(S.draft&&!S.draft.done?S.draft.pool:[])).map(P_).filter(p=>p&&p.scout&&p.scout.conf<0.9);shuffle(pool);
  for(const p of pool.slice(0,fx.watch))improveScout(p,0.05);}
function staffSummary(t){const fx=staffFx(t);const pct=m=>{const v=Math.round((m-1)*100);return (v>0?'+':'')+v+'%';};const out={};
  for(const d in BAL.STAFF){const n=deptCount(t,d);let eff;
    if(d==='bat')eff=`컨택·파워·선구안 성장 ${pct(fx.bat)}`;else if(d==='pit')eff=`투수 성장 ${pct(fx.pit)}`;else if(d==='def')eff=`주력·수비·송구 성장 ${pct(fx.def)}`;
    else if(d==='dev')eff=`23세 이하·육성군 성장 ${pct(fx.dev)}${fx.devCapUp?' · 육성군 정원 +1':''}`;
    else if(d==='scout')eff=`판별 정확도 ${fx.conf>=0?'+':''}${Math.round(fx.conf*100)}%p · 매주 ${fx.watch}명 정밀 관찰${fx.scoutN?` · 탐색 후보 +${fx.scoutN}`:''}`;
    else eff=`피로 회복 ${fx.rec>=0?'+':''}${fx.rec}/일 · 노화 속도 ${pct(fx.aging)}`;
    const sc=d==='scout'?fx.conf*100+fx.watch:d==='med'?fx.rec+(1-fx.aging)*20:(fx[d]-1)*100;const tone=sc>0.5?'up':sc<-0.5?'dn':'';
    out[d]={name:BAL.STAFF[d].name,n,exp:(t.staff||[]).filter(c=>c.dept===d&&c.years<=0).length,tone,max:BAL.STAFF[d].max,P:r1(fx.P[d]),ref:BAL.STAFF_REF[d],eff,what:BAL.STAFF[d].what,pay:(t.staff||[]).filter(c=>c.dept===d&&c.years>0).reduce((s,c)=>s+c.salary,0)};}
  return out;}

// ---------- 저장/불러오기 ----------
const STAT_KEYS=['cur','st'];
function serialize(){return JSON.stringify(S,function(k,v){if((k==='cur'||k==='st'||k==='res')&&v&&typeof v==='object'&&!Array.isArray(v)){const o={};for(const kk in v)if(v[kk])o[kk]=v[kk];return o;}return v;});}
function validateSave(o){const e=[];if(!o||typeof o!=='object')return ['JSON 객체가 아닙니다'];if(![1,2,3,VERSION].includes(o.version))e.push(`지원하지 않는 버전(${o.version})`);if(!o.teams||typeof o.teams!=='object')e.push('구단 데이터 없음');if(!o.players||typeof o.players!=='object')e.push('선수 데이터 없음');
  if(o.teams&&!o.teams[o.userTeamId])e.push('유저 구단 정보 없음');if(!Array.isArray(o.schedule))e.push('일정 데이터 없음');if(typeof o.rng!=='number')e.push('난수 상태 없음');return e;}
function hydrate(){const fill=st=>Object.assign(newStat(),st||{});
  for(const id in S.players){const p=S.players[id];p.cur=fill(p.cur);if(p.res)p.res=fill(p.res);for(const h of p.rhist||[])h.st=fill(h.st);for(const h of p.hist||[])h.st=fill(h.st);for(const w of p.winter||[])w.st=fill(w.st);p.log=p.log||[];p.transfers=p.transfers||[];p.valHist=p.valHist||[];}
  if(S.liveGame&&S.liveGame.box)for(const id in S.liveGame.box)S.liveGame.box[id]=fill(S.liveGame.box[id]);}
function migrate(){const from=S.version;
  for(const id in S.teams){const t=S.teams[id];t.dev=t.dev||[];t.fin=Object.assign(newFin(),t.fin||{});}
  if(S.draft===undefined)S.draft=null;S.settings=S.settings||{stopOnOffer:true};S.pins=S.pins||[];if(S.dispatch===undefined)S.dispatch=null;S.overseas=S.overseas||{hist:[]};
  const added=[],renamed=[];
  // v4: 실존 구단명과 겹치던 해외 구단 개명 + 소속 리그/지구 배정 + 실제 리그 규모로 구단 추가
  for(const id in S.teams){const t=S.teams[id];if(t.league==='KR')continue;const nn=TEAM_RENAME[t.name];if(nn){renamed.push(t.name+'→'+nn);t.name=nn;}
    const def=(TEAM_NAMES[t.league]||[]).find(x=>x[0]===t.name);if(def){t.color=def[1];if(def[2]!=null)t.sub=def[2];}}
  const pl0=playLg();
  for(const lg in BAL.LEAGUES){const L=BAL.LEAGUES[lg];const mine=Object.values(S.teams).filter(t=>t.league===lg);const names=new Set(mine.map(t=>t.name));
    if(L.subs)for(const t of mine)if(t.sub==null){const cnt=L.subs.map((_,i)=>mine.filter(x=>x.sub===i).length);t.sub=cnt.indexOf(Math.min(...cnt));}
    const fresh=TEAM_NAMES[lg].filter(x=>!names.has(x[0]));if(!fresh.length)continue;const midUser=pl0===lg&&S.phase==='season';
    for(const [n,c,sub] of fresh){const t=genTeam(n,c,lg,0,false);if(sub!=null)t.sub=sub;if(midUser)t.since=S.season+1;S.teams[t.id]=t;fillRoster(t);autoLineup(t);for(const pid of t.roster){const p=S.players[pid];p.snap={s:S.season,ovr:r1(calcOvr(p)),val:calcValue(p)};}}
    if(midUser&&L.subs)S.compLegacy={s:S.season,lg};
    added.push(`${L.name} ${fresh.length}개 구단`);}
  if(!S.mgr){S.mgr={seasons:(S.history||[]).map(r=>({s:r.s,div:r.user.div,expRank:null,rank:r.user.rank,promoted:false,relegated:false,powerStart:null,powerEnd:null,sales:0,salesFee:0,salesProfit:0,devHits:0,abroad:0,legacy:true})),cur:null};
    if(S.phase==='season'){const ut=userTeam();S.mgr.cur={s:S.season,div:ut.div,expRank:null,powerStart:teamPower(ut).power,sales:[]};}}
  const ut=userTeam();for(const id of ut.roster.concat(ut.dev)){const p=S.players[id];if(p&&p.devStart==null&&p.age<=24&&p.base){const b={...p,attrs:p.base};p.devStart=r1(calcOvr(b));}}
  {const u=userTeam();if(!u.staff)u.staff=starterStaff(u);for(const c of u.staff)if(c.years==null)c.years=1;if(!S.staffPool)refreshStaffPool();}
  presMigrate();ensureSpon(userTeam());S.endorseOffers=S.endorseOffers||[];
  S.jobOffers=S.jobOffers||[];S.grievances=S.grievances||[];if(S.mgr){S.mgr.loyalty=S.mgr.loyalty||0;if(S.mgr.rep==null)S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];ensureCareer();if(S.mgr.cur&&!S.mgr.cur.goal){const o=teamOutlook(userTeam());S.mgr.cur.goal=o.goal;}}
  for(const id of userTeam().roster.concat(userTeam().dev)){const p=S.players[id];if(p)p.coached=true;}for(const id in S.players){const p=S.players[id];if(p.exUser)p.coached=true;}
  // 구버전 기록 복원: 판매 이력·옛 제자를 선수 이적 기록에서 다시 연결
  {const ut0=userTeam();const nm=ut0.name;for(const id in S.players){const p=S.players[id];if(p.teamId!==ut0.id&&(p.transfers||[]).some(t=>t.from===nm)){p.coached=true;if(!p.retired&&p.teamId!=null)p.exUser=true;}}
    for(const m of (S.mgr&&S.mgr.seasons)||[])if(m.legacy&&!m.sales){const tr=[];for(const id in S.players)for(const t of S.players[id].transfers||[])if(t.s===m.s&&t.from===nm&&t.fee>0)tr.push(t);if(tr.length){m.sales=tr.length;m.salesFee=tr.reduce((a,t)=>a+t.fee,0);}}}
  if(from!==VERSION){S.version=VERSION;if(added.length)news(`해외 리그가 실제 규모로 개편되었습니다: ${added.join(', ')} 추가`,'sys');if(renamed.length)news(`해외 구단 명칭 변경: ${renamed.join(', ')}`,'sys');}}
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
  let arch,core,weak=null,lines=[],best,fieldWeak=[];
  if(isP){core=['stuff','control','movement'];if(p.pos==='SP')core.push('stamina');best=[...core].sort((x,y)=>a[y]-a[x])[0];
    arch=p.pos==='SP'?(best==='stuff'?'파워형 선발':best==='control'?'제구형 선발':best==='movement'?'변화구형 선발':'이닝이터'):(best==='stuff'?'파워 불펜':best==='control'?'제구형 불펜':'변화구형 불펜');
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[best]-12||a[lo]<40)weak=lo;}
  else{core=['contact','power','eye'];const off=[...core].sort((x,y)=>a[y]-a[x]);best=off[0];
    const prem=['C','SS','2B','CF'].includes(p.pos);if(prem&&a.defense>=Math.max(a.contact,a.power))best='defense';else if(a.speed>a[off[0]]+5)best='speed';
    arch={contact:'교타형',power:'장타형',eye:'선구안형',speed:'주루형',defense:'수비형'}[best]+' '+(POS_KO[p.pos]||p.pos);
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[off[0]]-12)weak=lo;if(!weak&&prem&&a.defense<45)weak='defense';
    fieldWeak=['speed','defense','arm'].filter(k=>a[k]<35&&k!==weak);}
  const young=p.age<=24;const est=p.scout?p.scout.est:p.pot;const ovr=calcOvr(p);
  const target=isP?(p.pos==='SP'?'1~3선발':'필승조·마무리'):(best==='power'?'주전 중심타자':best==='contact'||best==='eye'?'주전 테이블세터':best==='speed'?'주전 리드오프':'주전 '+(POS_KO[p.pos]||''));
  const goal=young&&est-ovr>=5?`${arch.split(' ')[0]} 유망주 → ${target}`:ovr>=65?`${target} (전성기 유지)`:`${arch} → ${target} 경쟁`;
  // 타격/투구 진단
  const st=(p.cur.pa>0||p.cur.pOuts>0)&&S.phase==='season'?p.cur:(p.hist.length?p.hist[p.hist.length-1].st:null);
  const small=!st||(isP?st.pOuts<30:st.pa<40);const mid=!small&&(isP?st.pOuts<90:st.pa<100);const n=st?(isP?Math.floor(st.pOuts/3)+'이닝':st.pa+'타석'):'0';
  // 실제 성적의 좋고 나쁨(표본이 있을 때만): 성적과 능력치 진단이 서로 모순되지 않게 문장을 고른다
  const perf=(!st||small)?0:isP?(()=>{const era=st.pER*27/st.pOuts;return era<=3.2?1:era>=5.2?-1:0;})():(()=>{const avg=st.ab?st.h/st.ab:0;const ops=ops_(st);return (avg>=.300||ops>=.850)?1:(avg<=.230&&ops<=.650)?-1:0;})();
  const wk=isP?{control:['제구','볼넷'],movement:['변화구','장타 허용'],stuff:['구위','피안타'],stamina:['체력','긴 이닝 소화']}:{contact:['컨택','타율'],power:['장타력','타점 생산'],eye:['선구안','삼진·볼넷'],defense:['수비','실점']};
  const weakLine=()=>{const w=wk[weak];if(!w)return isP?'구종·제구가 고르게 갖춰져 있습니다':'타격 능력이 고르게 갖춰져 있습니다';
    if(perf>0)return `지금 성적은 좋지만 능력치상 ${josa(w[0],'이','가')} 약점이라, 상대 수준이 오르면 ${w[1]} 쪽에서 흔들릴 수 있습니다`;
    if(perf<0)return `${w[0]} 약점이 ${w[1]}에서 그대로 드러나고 있습니다`;
    return `능력치상 ${josa(w[0],'이','가')} 상대적 약점입니다 (${w[1]}에 영향)`;};
  if(isP){let t=weakLine();
    if(st&&!small){const era=st.pER*27/st.pOuts;t=`ERA ${era.toFixed(2)} — `+t;}lines.push({k:'투구',t});}
  else{let t=weak==='defense'?`${POS_KO[p.pos]}에 필요한 수비력이 부족합니다`:weakLine();
    if(st&&!small){const avg=st.ab?(st.h/st.ab):0;t=`타율 ${avg.toFixed(3).replace(/^0/,'')} ${st.hr}홈런 — `+t;}lines.push({k:'타격',t});
    if(fieldWeak.length){const dw=fieldWeak.includes('defense')||fieldWeak.includes('arm');lines.push({k:'수비·주루',t:`${fieldWeak.map(k=>ATTR_KO[k]+' '+Math.round(a[k])).join(' · ')} — ${dw?'수비에서 실점 위험이 크고':''}${dw&&fieldWeak.includes('speed')?', ':''}${fieldWeak.includes('speed')?'주루·병살에서 손해가 큽니다':'지명타자·1루 기용이 현실적입니다'}`,warn:true});}
    const cur=mine?ut.pos[p.id]:null;if(cur&&cur!=='DH'&&cur!==p.pos){const pen=posPenalty(p,cur);lines.push({k:'수비',t:`현재 ${POS_KO[cur]} 배치는 적성 밖이라 수비가 ${pen} 낮아집니다 → ${POS_KO[p.pos]} 복귀 검토`,warn:true});}
    else if(mine&&cur)lines.push({k:'수비',t:`${POS_KO[cur]} 배치 — 적성에 맞습니다`});}
  const tm=p.teamId!=null?S.teams[p.teamId]:null;if(tm){const ls=leagueStanding(p,leagueKey(tm));if(ls.label!=='-')lines.push({k:'리그 내 위상',t:`${tm.league==='KR'?tm.div+'부':compName(tm.league)}에서는 ${ls.label.replace('리그 ','')}입니다`+(weak&&ls.cls==='g'?` — 더 높은 무대를 노린다면 ${(wk[weak]||[ATTR_KO[weak]])[0]} 보완이 필요합니다`:'')});}
  lines.push({k:'판단 신뢰도',t:small?`표본 부족 (${n}) — 성적보다 능력치로 판단하세요`:mid?`참고 수준 (${n}) — 성적과 능력치를 함께 보세요`:`표본 충분 (${n})`,warn:small});
  const rec=weak?fk(weak):young&&est-ovr>=5?fk(best==='arm'?'defense':best):'balance';
  const F=isP?FOCUS_PIT:FOCUS_BAT;const recText=rec==='balance'?'균형 훈련 유지':`${F[rec]} 훈련 추천`+(weak?` (${ATTR_KO[weak]} 보완)`:` (강점 강화)`);
  return {arch,goal,weak,fieldWeak,best,bestTxt:bestTxtM[best],lines,rec,recText,small};
}
function advice(p){const d=diagnose(p);return {text:d.lines.map(l=>l.t).join(' '),goal:d.rec==='balance'?null:d.rec,goalKo:d.rec==='balance'?null:(isPitcher(p)?FOCUS_PIT:FOCUS_BAT)[d.rec]};}
function nextCheck(){return S.phase==='season'?(7-((S.day-1)%7)):null;}
function seasonDelta(p){const b=growthBase(p);if(!b)return null;return {d:Math.round(calcOvr(p))-Math.round(b.ovr),v:b.val?calcValue(p)-b.val:null};}
// 판매 영향: 실제 편성 기준으로 역할을 판정하고, 그 자리를 누가 메우는지 표시
function rosterRole(t,pid){const p=P_(pid);if(!p)return {key:'none',text:'-'};if((t.dev||[]).includes(pid))return {key:'dev',text:'육성군'};
  if(isPitcher(p)){const ri=t.rotation.indexOf(pid);if(ri>=0)return {key:'sp',text:`선발 ${ri+1}번`,slot:ri};if(t.closer===pid)return {key:'cl',text:'마무리'};
    const bi=t.bullpen.indexOf(pid);if(bi>=0&&bi<4)return {key:'rp',text:'필승조 불펜'};return {key:'bp',text:'추격조·대기 투수'};}
  if(t.lineup.includes(pid))return {key:'bat',text:`주전 ${POS_KO[t.pos[pid]]||t.pos[pid]}`,pos:t.pos[pid]};return {key:'bench',text:'벤치 야수'};}
function saleImpact(pid){const ut=userTeam();const p=P_(pid);if(!p||p.teamId!==ut.id)return null;const before=teamPower(ut),after=teamPower(ut,pid);
  const role=rosterRole(ut,pid);const res={before:before.power,after:after.power,delta:r1(after.power-before.power),newcomers:[],role:role.text,roleKey:role.key};
  const pool=ut.roster.filter(id=>id!==pid).map(P_).filter(x=>x&&!x.retired);
  if(role.key==='sp'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)).sort((a,b)=>(b.pos==='SP')-(a.pos==='SP')||calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:`선발 로테이션${cand.pos==='RP'?' (불펜에서 전환)':''}`});}
  else if(role.key==='cl'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)).sort((a,b)=>(b.pos==='RP')-(a.pos==='RP')||calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:'마무리'});}
  else if(role.key==='rp'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)&&ut.closer!==x.id&&ut.bullpen.indexOf(x.id)>=4||(isPitcher(x)&&!ut.rotation.includes(x.id)&&!ut.bullpen.includes(x.id)&&ut.closer!==x.id)).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:'필승조 불펜'});}
  else if(role.key==='bat'){const bl=before.lineup.pos,al=after.lineup.pos;for(const id in al)if(bl[id]==null&&+id!==pid)res.newcomers.push({p:P_(+id),pos:POS_KO[al[id]]||al[id]});
    if(!res.newcomers.length){const cand=pool.filter(x=>!isPitcher(x)&&!ut.lineup.includes(x.id)).sort((a,b)=>posOvr(b,role.pos)-posOvr(a,role.pos))[0];if(cand)res.newcomers.push({p:cand,pos:POS_KO[role.pos]||role.pos});}}
  res.gap=['sp','cl','rp','bat'].includes(role.key)&&!res.newcomers.length;
  return res;}
function facEffect(k,lv){if(k==='train')return [`성장 속도 +${(lv-1)*12}%`,`피로 회복 ${BAL.FATIGUE_RECOVER+(lv-1)*2}/일`];if(k==='youth')return [`유소년 후보 ${2+lv}명/시즌`,`육성군 정원 ${BAL.DEV_BASE+lv}명`,`유망주 잠재 보너스 +${(lv*2.5).toFixed(1)}`];return [`보고서 정확도 +${(lv-1)*5}%`,`후보 수 ${lv>=3?'+1':'기본'}`];}
function growthTop(n){const ut=userTeam();const label=S.phase==='season'?null:null;const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p||!p.log.length)continue;const l=p.log[0];let d=0;for(const k in l.ch)d+=l.ch[k];const since=p.ovrStart!=null?r1(calcOvr(p)-p.ovrStart):0;rows.push({p,d:r1(d),since,label:l.label});}rows.sort((a,b)=>b.d-a.d);return rows.slice(0,n||3);}
// 기록 보관 시즌 수: 우리와 인연 있는 선수는 길게, 나머지는 최근 5시즌
function histCap(p){return (p.userLink||p.exUser||p.coached||(S.pins||[]).includes(p.id))?15:5;}
function snapOf(p){return {s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs))};}
function baseSnap(p){return growthBase(p);}
// 성장 비교 기준: 시즌 시작 스냅숏. 그 뒤에 우리 팀에 합류한 선수는 합류(입단) 시점 기준 — 홈·상세·보고서 공통
function joinedAfterSnap(p){const sn=p.snap;if(!sn||p.teamId!==S.userTeamId)return false;if(p.joinClock!=null)return sn.c==null||sn.c<p.joinClock;return !!sn.join||(S.phase==='offseason'&&sn.s===S.season&&(p.transfers||[]).some(t=>t.s===S.season&&/드래프트/.test(t.kind)));}
function growthBase(p){if(joinedAfterSnap(p)){const j=p.joinSnap;if(j)return {s:j.s,ovr:j.ovr,val:j.val,attrs:j.attrs,join:true,label:'입단 대비'};if(p.base){return {s:S.season,ovr:r1(calcOvr({...p,attrs:p.base})),val:null,attrs:p.base,join:true,label:'입단 대비'};}return null;}
  return p.snap?{...p.snap,label:S.phase==='season'?'시즌 시작 대비':p.snap.s+'시즌 시작 대비'}:null;}
function report(p){const b=baseSnap(p);if(!b||!b.attrs)return null;const now=calcOvr(p);const ch={};let bestK=null,bestD=-99;for(const k in p.attrs){const d=r1(p.attrs[k]-(b.attrs[k]!=null?b.attrs[k]:p.attrs[k]));ch[k]=d;if(d>bestD){bestD=d;bestK=k;}}
  return {s:b.s,from:Math.round(b.ovr),to:Math.round(now),d:Math.round(now)-Math.round(b.ovr),valFrom:b.val||null,valTo:calcValue(p),ch,bestK,bestD,bestFrom:b.attrs[bestK]};}
function growthReport(n){const ut=userTeam();const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p)continue;const r=report(p);if(r&&r.d>0)rows.push({p,r});}rows.sort((a,b)=>b.r.d-a.r.d||b.r.bestD-a.r.bestD);return rows.slice(0,n||3);}
function togglePin(pid){if(S.pins.includes(pid))S.pins=S.pins.filter(x=>x!==pid);else{S.pins.unshift(pid);if(S.pins.length>5)S.pins.length=5;}}
function interestText(p){if(!p.interest)return null;const t=S.teams[p.interest.team];if(!t)return null;const st=['관심 없음','관찰 중','영입 검토','공식 제안'][p.interest.stage]||'관찰 중';return `${t.name} — ${st}`;}

return {BAL,VERSION,GAME_VER,ATTR_KO,FOCUS_BAT,FOCUS_PIT,TRAITS,POS_BAT,BAT_KEYS,PIT_KEYS,NEED_TEMPLATE,
  newGame,state,setState,load,serialize,validateSave,
  startDay,endUserGame,finishDay,playDayAuto,stepPitch,stepPA,stepHalf,stepGame,finalizeGame,changePitcher,pinchHit,availableBullpen,bench,curBatter,curPitcher,
  standings,rankOf,userTeam,userGameToday,payroll,ticketIncome,isUserGame,
  calcOvr,posOvr,gradeOf,calcValue,salaryFor,money,isPitcher,velocity,statLine,ops_,potText,confText,scoutReport,interestText,needOf,countPos,
  autoLineup,fixLineup,rosterCheck,autoFillUser,
  listPlayer,unlistPlayer,respondOffer,negotiate,cancelNeg,renewContract,releasePlayer,takeLoan,upgradeFacility,runScout,signScouted,aiAsk,playerDemand,
  endSeason,advanceWeek,startNewSeason,growthTick,interestCheck,
  promoteDev,demoteDev,devCap,draftAvail,draftPick,draftAuto,draftTurn,draftStep,
  willingInfo,contractText,advice,growthTop,togglePin,openTable,tableOffer,tableLeave,tableLeft,report,growthReport,
  diagnose,nextCheck,seasonDelta,saleImpact,rosterRole,growthBase,promiseKept,promiseStatus,grievanceAnswer,offVal,weeklyStory,coachNotes,reportStart,reportEnd,teamStreak,winterResults,facEffect,teamPower,bestLineup,posPenalty,josa,POS_KO,NAT_KO,
  compOf,compTeams,leagueComps,lgOf,sponSettle,sponBase,sponSign,boardSign,boardDrop,boardSlots,sponStatus,starScore,endorseOffers,endorseAnswer,ensureSpon,sponAutoPick,presSeasonEnd,presOf,presTier,presTierOf,presTierIdx,presTable,presIncome,presPull,reserveTable,reserveIds,loanCheck,loanOptions,loanPlayer,postInfo,goalProgress,goalCheck,youngGrown,testInfo,testCmd,TEAM_NAMES,staffSummary,staffFx,staffP,hireCoach,fireCoach,renewCoach,coachTerms,severanceOf,renewDemand,deptCount,staffPay,refreshStaffPool,compName,playLg,calcRep,repGrade,repParts,teamOutlook,genJobOffers,declineJob,moveManager,econ,
  leagueKey,leagueStanding,expectedRole,standingAll,winterTeams,dispatchEligible,dispatchOptions,dispatchPlayer,cancelDispatch,declineDispatch,resolveDispatch,levelOf,
  P:P_,krTeams,overseasTeams,rnd};
})();
if(typeof module!=='undefined')module.exports=SL;

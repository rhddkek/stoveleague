// ===================== 코어 (C: 시즌/육성/경제/이적/해외/저장) =====================
function userTeam(){return S.teams[S.userTeamId];}
function P_(id){return S.players[id];}
function krTeams(){return Object.values(S.teams).filter(t=>t.league==='KR');}
function divTeams(div){return krTeams().filter(t=>t.div===div);}
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
  S.schedule.sort((a,b)=>a.day-b.day||a.div-b.div);
}
function h2h(a,b){let w=0;for(const g of S.schedule){if(!g.res)continue;if(g.home===a&&g.away===b){if(g.res.hs>g.res.as)w++;}else if(g.home===b&&g.away===a){if(g.res.as>g.res.hs)w++;}}return w;}
function standings(div){const ts=divTeams(div);ts.sort((a,b)=>b.rec.w-a.rec.w||h2h(b.id,a.id)-h2h(a.id,b.id)||(b.rec.rs-b.rec.ra)-(a.rec.rs-a.rec.ra)||b.rec.rs-a.rec.rs||a.id-b.id);return ts;}
function rankOf(t){return standings(t.div).findIndex(x=>x.id===t.id)+1;}
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
  for(const t of krTeams()){const pay=Math.round(payroll(t)/BAL.SEASON_GAMES);t.cash-=pay;t.fin.salary+=pay;}
  for(const g of S.schedule){if(g.day!==d||!g.res)continue;const h=S.teams[g.home];const inc=ticketIncome(h);h.cash+=inc;h.fin.tickets+=inc;}
  for(const pid in S.players){const p=S.players[pid];if(p.retired||p.teamId==null)continue;const t=S.teams[p.teamId];if(!t||t.league!=='KR')continue;
    const rec=BAL.FATIGUE_RECOVER+(t.fac.train-1)*2+(p.traits.includes('강철체력')?6:0);p.fatigue=Math.max(0,(p.fatigue||0)-rec);
    p.cond=clamp((p.cond||0)*0.85+gauss()*1.3,-6,6);}
  marketTick(0.12);
  if(d%7===0){for(const t of krTeams()){for(const pid of t.roster)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t});for(const pid of t.dev)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t,dev:true});}
    for(const pid of userTeam().roster)improveScout(P_(pid),0.06);}
  if(d===14){checkPromises();interestCheck();}
  S.day++;S.clock++;
  const ut=userTeam();if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 선수 판매, 긴급 대출(재정 탭) 등 회복 조치가 필요합니다.`);
  if(S.day>BAL.SEASON_GAMES)endSeason();
}
function ticketIncome(t){const wp=(t.rec.w+t.rec.l)?t.rec.w/(t.rec.w+t.rec.l):0.5;return Math.round(BAL.TICKET[t.div]*(0.7+t.rep/100*0.6)*(0.8+wp*0.4)*(0.9+rnd()*0.2));}
function applySponsor(t){const inc=Math.round(BAL.SPONSOR[t.div]*(0.7+t.rep/100*0.6));t.cash+=inc;t.fin.sponsor+=inc;}
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
    let lg=null;if(sc>=72&&p.age<=30)lg='US';else if(sc>=65&&p.age<=31)lg='JP';else if(sc>=59&&p.age<=31)lg=rnd()<0.5?'TW':'MX';else if(vet&&ovr>=58&&p.age<=34)lg='MX';
    if(lg){if(!p.interest||p.interest.lg!==lg){const t=pick(overseasTeams().filter(x=>x.league===lg));p.interest={team:t.id,lg,stage:p.interest?Math.max(0,p.interest.stage-1):0};}
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
function overseasSeasonSummary(winter){
  const tables={};
  for(const lg of Object.keys(BAL.LEAGUES).filter(k=>!!BAL.LEAGUES[k].winter===!!winter)){const ts=overseasTeams().filter(t=>t.league===lg);if(!ts.length)continue;const G=BAL.LEAGUES[lg].games;const str=ts.map(t=>{const ps=t.roster.map(P_).filter(Boolean);const b=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,9);const pi=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,8);const avg=a=>a.length?a.reduce((s,p)=>s+calcOvr(p),0)/a.length:50;return {t,s:avg(b)*0.55+avg(pi)*0.45};});
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
  for(const t of overseasTeams()){if(!BAL.BUY_MIN[t.league])continue;if(rnd()>(t.league==='US'||t.league==='JP'?0.18:0.06))continue;const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)continue;
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
function createDispatch(){const ut=userTeam();S.dispatch={s:S.season,phase:'open',reqs:[],list:[],declined:[]};
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
function mgrStart(){S.mgr=S.mgr||{seasons:[],cur:null};const ut=userTeam();const ts=divTeams(ut.div).map(t=>({t,pw:teamPower(t).power})).sort((a,b)=>b.pw-a.pw);
  S.mgr.cur={s:S.season,div:ut.div,expRank:ts.findIndex(x=>x.t.id===ut.id)+1,powerStart:ts.find(x=>x.t.id===ut.id).pw,sales:[]};}
function mgrEnd(s,rec){if(!S.mgr)S.mgr={seasons:[],cur:null};const ut=userTeam();const c=S.mgr.cur&&S.mgr.cur.s===s?S.mgr.cur:{s,div:rec.user.div,expRank:null,powerStart:null,sales:[]};
  let dev=0;for(const id of ut.roster){const p=P_(id);if(!p||p.devCredited||p.devStart==null)continue;const starter=ut.lineup.includes(id)||ut.rotation.includes(id)||ut.closer===id;if(starter&&calcOvr(p)-p.devStart>=8){p.devCredited=s;dev++;news(`[육성 성과] ${josa(p.name,'이','가')} 우리 구단에서 주전으로 성장했습니다 (${Math.round(p.devStart)} → ${Math.round(calcOvr(p))}).`,'sys');}}
  const abroad=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR'&&!BAL.LEAGUES[S.teams[p.teamId].league].winter&&(S.teams[p.teamId].lineup.includes(p.id)||S.teams[p.teamId].rotation.includes(p.id))).length;
  const salesFee=c.sales.reduce((a,x)=>a+x.fee,0),salesProfit=c.sales.reduce((a,x)=>a+x.fee-x.cost,0);
  S.mgr.seasons.push({s,div:c.div,expRank:c.expRank,rank:rec.user.rank,promoted:S.lastSummary?S.lastSummary.promoted:false,relegated:S.lastSummary?S.lastSummary.relegated:false,powerStart:c.powerStart,powerEnd:teamPower(ut).power,sales:c.sales.length,salesFee,salesProfit,devHits:dev,abroad});
  if(S.mgr.seasons.length>40)S.mgr.seasons.shift();S.mgr.cur=null;}

// ---------- 시즌 종료 / 스토브리그 / 새 시즌 ----------
function endSeason(){
  const s=S.season;const ut=userTeam();const rec={s,tables:{},user:null,promoted:[],relegated:[]};
  const tables={};for(let d=1;d<=3;d++)tables[d]=standings(d);
  for(let d=1;d<=3;d++){tables[d].forEach((t,i)=>{t.lastRank=i+1;const dv=BAL.DIVIDEND[d][i];t.cash+=dv;t.fin.dividend+=dv;t.rep=clamp(t.rep+(i<2?3:i>=6?-3:0),5,100);});
    rec.tables[d]=tables[d].map((t,i)=>({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1}));}
  rec.user={div:ut.div,rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,cash:ut.cash,fin:{...ut.fin}};
  const up2=tables[2].slice(0,2),dn1=tables[1].slice(6),up3=tables[3].slice(0,2),dn2=tables[2].slice(6);
  for(const t of up2){t.div=1;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 1부 승격!`,'league');}
  for(const t of dn1){t.div=2;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 2부 강등`,'league');}
  for(const t of up3){t.div=2;t.rep=clamp(t.rep+8,5,100);rec.promoted.push(t.name);news(`${t.name} 2부 승격!`,'league');}
  for(const t of dn2){t.div=3;t.rep=clamp(t.rep-6,5,100);rec.relegated.push(t.name);news(`${t.name} 3부 강등`,'league');}
  // 유저 시즌 결산
  const ups=ut.roster.map(P_);const bb=ups.filter(p=>!isPitcher(p)&&p.cur.pa>=40).sort((a,b)=>ops_(b.cur)-ops_(a.cur))[0];const bp=ups.filter(p=>isPitcher(p)&&p.cur.pOuts>=30).sort((a,b)=>(a.cur.pER/a.cur.pOuts)-(b.cur.pER/b.cur.pOuts))[0];
  S.lastSummary={s,div:rec.user.div,rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,bestBat:bb?`${bb.name} 타율 ${(bb.cur.h/Math.max(1,bb.cur.ab)).toFixed(3)} ${bb.cur.hr}홈런`:'-',bestPit:bp?`${bp.name} ${bp.cur.pW}승 ERA ${(bp.cur.pER*27/bp.cur.pOuts).toFixed(2)}`:'-',promoted:up3.concat(up2).some(t=>t.isUser),relegated:dn1.concat(dn2).some(t=>t.isUser),fin:{...ut.fin}};
  S.history.push(rec);
  // 선수 시즌 기록 보존
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;const t=p.teamId!=null?S.teams[p.teamId]:null;if(t&&t.league!=='KR')continue;
    if(p.cur.g>0||p.cur.pG>0)p.hist.push({s,team:t?t.id:null,tn:t?t.name:'FA',lg:t?'KR'+t.div:'FA',st:p.cur});if(p.hist.length>15)p.hist.shift();p.cur=newStat();p.fatigue=0;
    if(p.userLink){p.valHist.push([s,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}}
  overseasSeasonSummary();
  alumniReport(s);
  mgrEnd(s,rec);
  // 나이/은퇴
  const retired=[];
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;p.age++;
    const ovr=calcOvr(p);let pr=p.age>=38?1:p.age>=33?(p.age-32)*0.13+(ovr<48?0.3:0):0;if(p.teamId==null&&!p.scouted&&p.age>=30)pr+=0.3;
    if(rnd()<pr){const t=p.teamId!=null?S.teams[p.teamId]:null;if(t)removeFromTeam(t,p);S.fa=S.fa.filter(x=>x!==p.id);S.pendingFA=S.pendingFA.filter(x=>x!==p.id);p.retired=true;p.retiredSeason=s;
      if(p.userLink){retired.push(p.name);news(`${p.name} 은퇴 (${p.age}세)`,'contract');}else delete S.players[pid];}}
  // 계약 갱신
  for(const t of krTeams()){for(const pid of [...t.roster,...t.dev]){const p=P_(pid);if(!p.contract)continue;p.contract.years--;
      if(p.contract.years<=0){if(t.isUser){S.pendingFA.push(pid);news(`${p.name} 계약 만료 — 스토브리그 2주차까지 우선 협상 가능`,'contract');}
        else{if(rnd()<0.7&&p.age<35&&calcOvr(p)>=levelOf(t)-10){p.contract={salary:Math.round(salaryFor(p)*(0.9+rnd()*0.3)/10)*10,years:ri(1,3)};}
          else{removeFromTeam(t,p);S.fa.push(pid);p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});}}}}}
  // 해외 소속 유저 연계 선수 계약
  for(const t of overseasTeams()){for(const pid of [...t.roster]){const p=P_(pid);if(!p.contract||!p.userLink)continue;p.contract.years--;
      if(p.contract.years<=0){if(rnd()<0.6&&p.age<34){p.contract={salary:p.contract.salary,years:ri(1,3)};news(`[해외] ${p.name} ${josa(t.name,'과','와')} 재계약`,'overseas');}
        else{removeFromTeam(t,p);if(p.age<=36){S.fa.push(pid);p.homecoming=S.userTeamId;p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} ${josa(t.name,'과','와')} 계약 만료. 친정 복귀를 희망하며 FA로 나왔습니다!`,'overseas');}else{p.retired=true;p.retiredSeason=s;}}}}
    for(const pid of [...t.roster]){const p=P_(pid);if(p.age>=37||(p.age>=34&&rnd()<0.25)){removeFromTeam(t,p);if(p.userLink){p.retired=true;p.retiredSeason=s;}else delete S.players[pid];}}}
  // 유소년/신인
  for(const t of krTeams()){if(t.isUser)continue;for(let i=0;i<1;i++){const need=needOf(t);const p=genPlayer({pos:need.length?pick(need):pick(ROSTER_TEMPLATE),age:ri(18,21),lvl:BAL.LEVEL_OVR.ROOKIE+(t.div===1?5:t.div===2?2:0),potBoost:t.fac.youth*1.5});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  const yn=2+ut.fac.youth;for(let i=0;i<yn;i++){const need=needOf(ut);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.youth*1.2,potBoost:ut.fac.youth*2.5,conf:0.35+ut.fac.youth*0.05});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  for(const t of overseasTeams()){const RS=BAL.LEAGUES[t.league].roster;while(t.roster.length<RS){const need=needOf(t);const p=genPlayer({pos:need.length?need[0]:pick(ROSTER_TEMPLATE),age:ri(19,26),lvl:levelOf(t)-4,nat:t.league});registerPlayer(p);addToTeam(p,t,{salary:Math.round(salaryFor(p)*(t.league==='US'?3:t.league==='JP'?2.5:1.3)/10)*10,years:ri(1,4)});}
    t.cash=Math.min(BAL.OVERSEAS_CASH[t.league],t.cash+BAL.OVERSEAS_CASH[t.league]*0.5);autoLineup(t);}
  // FA 풀 정리: 2시즌 이상 미계약자 제거
  S.fa=S.fa.filter(id=>{const p=P_(id);if(!p)return false;p.faSeasons=(p.faSeasons||0)+1;if(p.faSeasons>=2&&!p.userLink&&!p.homecoming){delete S.players[id];return false;}return true;});
  S.market.attempts={};S.market.negs=[];S.market.listed=[];
  S.market.offers=S.market.offers.filter(o=>o.type==='overseas');
  interestCheck();
  S.phase='offseason';S.week=1;S.clock++;
  createDraft();draftStep();
  createDispatch();
  for(const t of krTeams())if(!t.isUser)autoLineup(t);else fixLineup(t);
  news(`${s}시즌 종료. 스토브리그가 시작됩니다.`,'sys');
  return S.lastSummary;
}
function advanceWeek(){
  if(S.phase!=='offseason')return false;S.warn=[];
  const ut=userTeam();
  if(S.draft&&!S.draft.done){if(draftTurn())draftAuto();draftStep();}
  dispatchWeek();
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
  for(const t of krTeams()){t.rec={w:0,l:0,rs:0,ra:0};t.fin=newFin();t.rotIdx=0;
    if(t.loan>0){t.cash-=t.loan;t.fin.other+=t.loan;news(`대출 ${money(t.loan)} 상환`,'fin');t.loan=0;}
    applySponsor(t);let up=BAL.OVERHEAD[t.div];for(const k in t.fac)up+=BAL.FACILITY[k].upkeep*t.fac[k];t.cash-=up;t.fin.facility+=up;
    if(!t.isUser&&t.cash>payroll(t)*2.5){const k=pick(['train','youth','scout']);if(t.fac[k]<5){const c=BAL.FACILITY[k].cost*t.fac[k];t.cash-=c;t.fin.facility+=c;t.fac[k]++;}}
    if(!t.isUser){aiFillRookies(t);autoLineup(t);}
    for(const pid of t.roster.concat(t.dev)){const p=P_(pid);const dd=p.dispatchDone&&p.dispatchDone.s===S.season-1?p.dispatchDone:null;
      if(dd){growthTick(p,{kind:'dispatch',label:`${S.season-1}시즌 겨울리그 파견`,team:t,dd});p.fatigue=Math.round(30+dd.share*35);p.cond=-(2+dd.share*3);}
      else{growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:t});p.fatigue=0;}
      p.xp=0;p.ovrStart=r1(calcOvr(p));}}
  for(const t of overseasTeams())for(const pid of t.roster){const p=P_(pid);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null});}
  for(const id of S.fa){const p=P_(id);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null});}
  const keepAttrs=new Set();for(const id of ut.roster.concat(ut.dev))keepAttrs.add(+id);for(const id of S.pins||[])keepAttrs.add(+id);
  for(const id in S.players){const p=S.players[id];if(p.retired){p.snapPrev=null;p.snap=null;continue;}const rich=keepAttrs.has(+id)||p.userLink||p.exUser;
    p.snapPrev=p.snap?(rich?p.snap:{s:p.snap.s,ovr:p.snap.ovr,val:p.snap.val}):null;p.snap=snapOf(p);if(!rich){delete p.snap.attrs;if(!p.userLink)delete p.base;}}
  S.dispatch=null;mgrStart();
  fixLineup(ut);genSchedule();S.lastSummary=null;
  news(`${S.season}시즌 개막! ${ut.div}부 리그 ${BAL.SEASON_GAMES}경기 일정이 확정되었습니다.`,'sys');
  return {ok:true};
}

// ---------- 저장/불러오기 ----------
const STAT_KEYS=['cur','st'];
function serialize(){return JSON.stringify(S,function(k,v){if((k==='cur'||k==='st')&&v&&typeof v==='object'&&!Array.isArray(v)){const o={};for(const kk in v)if(v[kk])o[kk]=v[kk];return o;}return v;});}
function validateSave(o){const e=[];if(!o||typeof o!=='object')return ['JSON 객체가 아닙니다'];if(o.version!==1&&o.version!==VERSION)e.push(`지원하지 않는 버전(${o.version})`);if(!o.teams||typeof o.teams!=='object')e.push('구단 데이터 없음');if(!o.players||typeof o.players!=='object')e.push('선수 데이터 없음');
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
  leagueKey,leagueStanding,expectedRole,standingAll,winterTeams,dispatchEligible,dispatchOptions,dispatchPlayer,cancelDispatch,declineDispatch,resolveDispatch,levelOf,
  P:P_,krTeams,overseasTeams,rnd};
})();
if(typeof module!=='undefined')module.exports=SL;

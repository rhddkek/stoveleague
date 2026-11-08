// v69 (R053): EA2011 비교 반영 — 트레이드 거절 이유 · 협상 미리 보기 = 실제 결과 · 비용 분리 · 확정 재검사 · 단계 안내 · 재계약 이유 · 받은 제안 영향 · 예산표 · 작전 성공률
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
SL.newGame(6969,1,{games:144});let S=SL.state();let ut=SL.userTeam();const P=id=>SL.state().players[id];
const snap=()=>JSON.stringify(SL.state());const restore=j=>{SL.setState(JSON.parse(j));S=SL.state();ut=SL.userTeam();};

console.log('[1] 트레이드: 거절 이유 한 줄 = 실제 판정');
{const t=SL.krTeams().find(x=>!x.isUser);const give=[ut.roster.map(P).sort((a,b)=>SL.calcValue(a)-SL.calcValue(b))[0].id];const get=[t.roster.map(P).sort((a,b)=>SL.calcValue(b)-SL.calcValue(a))[3].id];
  const e=SL.tradeEval(t.id,give,get,0);(!e.ok&&e.kind==='손해'&&e.short>0)?ok(`손해 거절 · 부족 ${SL.money(e.short)}`):bad('kind '+e.kind+' short '+e.short);
  e.hint.some(h=>h.includes('부족')&&h.includes(SL.money(e.cashNeed)))?ok('안내 문구에 현금 환산 '+SL.money(e.cashNeed)):bad('hint '+e.hint.join('|'));
  ut.cash=Math.max(ut.cash,e.cashNeed+1);const e2=SL.tradeEval(t.id,give,get,e.cashNeed);e2.ok?ok('안내한 현금을 얹으면 실제로 응함'):bad('현금 얹어도 거절 '+e2.why.join('|'));
  const e3=SL.tradeEval(t.id,give,get,Math.max(0,e.cashNeed-2000));!e3.ok?ok('안내보다 적으면 여전히 거절'):bad('적게 얹어도 응함 — 안내가 과함');
  const W=SL.tradeWants(t);const nc=SL.needCats(t);W.every(x=>nc.short.includes(x)||nc.upgrade.includes(x))?ok('원하는 자리 = 실제 공백·보강 자리 ('+(W.join(',')||'없음')+')'):bad('wants '+W);
  const r=SL.tradePropose(t.id,give,get,0);(!r.ok&&r.ev&&r.ev.hint&&r.ev.hint.length)?ok('제안 거절 결과에 안내가 함께 옴'):bad('propose ev');}

// 겨울로
while(S.phase!=='offseason'){SL.playDayAuto();if(S.phase==='post'||S.phase==='postseason'){while(S.phase!=='offseason'&&SL.playDayAuto());}}
ut=SL.userTeam();
if(S.pendingFA.length<3){const add=[ut.lineup[0],ut.rotation[0],...ut.roster.filter(id=>!ut.lineup.includes(id)&&!ut.rotation.includes(id)).slice(0,3)].filter(id=>id!=null&&!S.pendingFA.includes(id));for(const id of add){P(id).contract.years=0;P(id).grudge=null;S.pendingFA.push(id);}}

console.log('[2] 협상 미리 보기 = 실제 결과 (재계약)');
{const pid=S.pendingFA.find(id=>!P(id).grudge);const base=snap();let n=0,good=0;
  for(const k of [1.05,1.0,0.95,0.9,0.86,0.8,0.6]){restore(base);const o=SL.openTable(pid);if(!o.ok){bad('테이블 '+o.msg);break;}const neg=o.neg;const yrs=2;const sal=Math.round(neg.demand*k/10)*10;const offer={salary:sal,years:yrs,bonus:0};
    const pv=SL.negPreview(pid,offer);const m0=neg.mood;const r=SL.tableOffer(pid,offer);n++;
    const z=r.done?'sure':(neg.mood===m0-4||(r.ended&&pv.zone==='close'))?'close':'low';
    if(pv.zone===z&&(!pv.dMood||neg.mood===Math.max(0,m0+pv.dMood)))good++;else bad(`k=${k}: 미리 보기 ${pv.zone}(${pv.dMood}) / 실제 ${z} mood ${m0}→${neg.mood}`);}
  good===n?ok(`${n}가지 조건 모두 미리 보기와 실제 결과 일치`):0;restore(base);}
{const base=snap();const ids=Object.keys(S.faM&&S.faM.m||{}).map(Number).filter(id=>!SL.isFgn(P(id)));let n=0,good=0;
  for(const id of ids.slice(0,3))for(const k of [1.25,1.0,0.95,0.88,0.7]){restore(base);ut=SL.userTeam();ut.cash=Math.max(ut.cash,500000);SL.budgetInfo();S.budget.wage+=300000;S.budget.xfer+=300000;const F=SL.faM(id);if(!F)continue;const o=SL.openTable(id);if(!o.ok||!o.neg.major)continue;const neg=o.neg;
    const offer={salary:Math.round(F.ask.sal*k/10)*10,years:F.ask.yrs,bonus:Math.round(F.ask.bonus*k/100)*100};if(SL.preCheck(id,offer).length)continue;const pv=SL.negPreview(id,offer);const m0=neg.mood;const r=SL.tableOffer(id,offer);n++;
    const z=r.done?'sure':r.pending?'wait':neg.mood===m0-5?'close':neg.mood===m0-15?'low':'?';if(z===pv.zone)good++;else bad(`주요 FA k=${k}: 미리 보기 ${pv.zone} / 실제 ${z}`);}
  n?(good===n?ok(`주요 FA ${n}가지 조건 모두 일치 (바로 사인·결정 대기·근접·차이 큼)`):0):ok('주요 FA 없음 — 건너뜀');restore(base);}

console.log('[3] 비용 분리: 바로 지출 · 연봉 · 첫해 지급 · 총보장');
{const base=snap();const pid=S.pendingFA[0];const o=SL.openTable(pid);const c=SL.negCost(pid,{salary:12000,years:3,bonus:3000});
  (c.now===3000&&c.total===12000*3+3000&&c.year1===12000+3000&&c.off&&c.season===S.season+1)?ok('재계약: 바로 지출 = 계약금, 첫해 = 연봉 + 계약금, 총보장 = 3년 연봉 + 계약금'):bad(JSON.stringify(c));restore(base);
  const fa=S.fa.map(P).find(p=>p&&!SL.faM(p.id)&&!p.retired&&!SL.isFgn(p));if(fa){const o2=SL.openTable(fa.id);if(o2.ok&&o2.neg.mode==='sign'){const c2=SL.negCost(fa.id,{salary:5000,years:2,bonus:0});c2.signFee===Math.round(SL.calcValue(fa)*0.1)&&c2.now===c2.signFee?ok('일반 FA: 자동 영입 비용(가치 10%)도 바로 지출에 포함 '+SL.money(c2.signFee)):bad(JSON.stringify(c2));}else ok('일반 FA 테이블 없음 — 건너뜀');}restore(base);}

console.log('[4] 확정 직전 재검사');
{const base=snap();const pid=S.pendingFA[0];SL.openTable(pid);const I=SL.budgetInfo();const L=SL.preCheck(pid,{salary:I.wageLeft+50000,years:2,bonus:0});const w=L.find(x=>x.k==='wage');
  w&&w.room===Math.max(0,I.wageLeft)?ok('연봉 예산 초과를 미리 잡고 맞출 수 있는 여유('+SL.money(w.room)+')를 알려 줌'):bad(JSON.stringify(L));
  const L2=SL.preCheck(pid,{salary:Math.min(SL.renewDemandOf(P(pid)),Math.max(0,I.wageLeft)),years:2,bonus:0});!L2.some(x=>x.k==='wage')?ok('여유 안이면 경고 없음'):bad('false wage '+JSON.stringify(L2));
  const e=SL.budgetCheck(P(pid),I.wageLeft+50000,0);e?ok('엔진도 같은 조건을 막음 (재검사와 일치)'):bad('engine allows');restore(base);}

console.log('[5] 단계 안내: 단계가 바뀌는 주에 한 번');
{const base=snap();const x1=SL.stageInfo();(x1&&x1.k==='w1'&&!x1.seen&&x1.todo.length>=3)?ok('1주차: '+x1.title+' — '+x1.due):bad(JSON.stringify(x1));SL.stageSeen(x1.key);SL.stageInfo().seen?ok('확인하면 다시 뜨지 않음'):bad('seen');
  SL.advanceWeek();const x2=SL.stageInfo();(x2&&x2.k==='w2'&&!x2.seen)?ok('2주차: '+x2.title):bad(JSON.stringify(x2));SL.advanceWeek();const x3=SL.stageInfo();(x3&&x3.k==='w3')?ok('3주차: '+x3.title):bad(JSON.stringify(x3));SL.advanceWeek();SL.stageInfo()===null?ok('4주차는 새 단계 없음'):bad('w4');
  const keys=Object.keys(S.stageSeen||{});keys.every(k=>k.startsWith(S.season+':'))?ok('지난 시즌 확인 기록은 지움'):bad(keys);restore(base);}

console.log('[6] 재계약 요구 이유 = 실제 요구 계산');
{for(const id of S.pendingFA.slice(0,4)){const p=P(id);const w=SL.renewWhy(p);const base=w.base==='mk'?w.mk:w.cur*1.05;let m=1;if(w.mods.some(x=>x.startsWith('스타')))m*=1.25;if(w.mods.some(x=>x.startsWith('33세')))m*=0.85;if(w.mods.some(x=>x.startsWith('서운함')))m*=1.15;
  Math.round(base*m/10)*10===w.dem&&w.dem===SL.renewDemandOf(p)?ok(`${p.name}: 능력 ${w.ovr0}→${w.ovr1} · ${w.base==='mk'?'시세':'현 연봉+5%'} → ${SL.money(w.dem)}`):bad(`${p.name} ${JSON.stringify(w)}`);}}

console.log('[7] 받은 판매 제안: 받으면 전력 변화');
{const base=snap();const p=ut.lineup.map(P).filter(Boolean).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];const buyer=SL.krTeams().find(t=>!t.isUser);
  S.market.offers.push({id:S.nextOfferId++,pid:p.id,team:buyer.id,fee:SL.calcValue(p),expires:S.clock+3,willing:true,reasons:[]});const o=S.market.offers[S.market.offers.length-1];const im=SL.offerImpact(o.id);const si=SL.saleImpact(p.id);
  (im&&im.delta===si.delta&&im.before===si.before&&im.cash1===ut.cash+o.fee)?ok(`${p.name} 판매 시 전력 ${im.before} → ${im.after} (${im.delta}) · 대체 ${im.rep?im.rep.name:'없음'}`):bad(JSON.stringify(im));restore(base);}

console.log('[8] 예산 규칙표 = makeBudget 숫자');
{const R=SL.budgetRule();(R.base===1.12&&R.rank[0][1]==='+5%'&&R.rank[2][1]==='−3%'&&R.cash[2][1]==='−12%')?ok('순위·자금·인기 배율 표'):bad(JSON.stringify(R));}

console.log('[9] 작전 성공률 = 판정 값');
{SL.newGame(4242,1,{games:36});S=SL.state();let lg=null;for(let d=0;d<10&&!lg;d++){lg=SL.startDay();if(!lg)SL.finishDay();}
  if(!lg){bad('경기 없음');}else{let found=0;for(let i=0;i<300&&!lg.done&&found<2;i++){const side=lg.half;if(SL.tacOk(lg,side,'steal').ok){const od=SL.tacOdds(lg,'steal');const b=lg.bases;const lead=b[1]&&!b[2]?b[1]:b[0];const from=b.indexOf(lead);const pr=Math.round(Math.max(0,Math.min(1,SL.stealP(lg,lead.pid)-(from===1?0.06:0)))*100);od===pr?ok(`도루 성공률 ${od}% = 판정 값`):bad(`odds ${od} vs ${pr}`);found++;}SL.stepPA(lg);}if(!found)ok('도루 상황 없음 — 건너뜀');}
  const T=SL.TACTICS;Object.keys(T).every(k=>T[k].g2&&T[k].c2)?ok('모든 작전에 이득·대가 한 줄'):bad('g2/c2 누락');}

console.log(fails?`v69 검증 실패 ${fails}건`:'v69 검증 모두 통과');process.exit(fails?1:0);

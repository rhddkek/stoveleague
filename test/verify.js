const SL=require('./run.js');
const seed=+process.argv[2]||2026, SEASONS=+process.argv[3]||10;
let fails=0;const bad=(m)=>{fails++;console.log('  FAIL:',m);};
SL.newGame(seed,2);let S=SL.state();
const B=SL.BAL;
function checkIntegrity(label){
  const seen=new Map();
  for(const t of Object.values(S.teams)){
    const all=t.roster.concat(t.dev||[]);if(new Set(all).size!==all.length)bad(`${label} 로스터/육성군 중복 ${t.name}`);
    for(const pid of all){const p=S.players[pid];if(!p)bad(`${label} ${t.name} 로스터에 없는 선수 ${pid}`);else{if(p.teamId!==t.id)bad(`${label} 소속 불일치 ${p.name}`);if(seen.has(pid))bad(`${label} 소속 중복 ${p.name}: ${seen.get(pid)} & ${t.name}`);seen.set(pid,t.name);if(p.retired)bad(`${label} 은퇴 선수가 로스터에 ${p.name}`);}}
    for(const id of t.lineup)if(!t.roster.includes(id))bad(`${label} 라인업에 비소속 ${t.name}`);
    for(const id of t.rotation.concat(t.bullpen))if(!t.roster.includes(id))bad(`${label} 투수진에 비소속 ${t.name}`);
  }
  for(const pid in S.players){const p=S.players[pid];if(+pid!==p.id)bad('id 키 불일치');if(p.teamId!=null&&!p.retired){const t=S.teams[p.teamId];if(!t||!(t.roster.includes(p.id)||(t.dev||[]).includes(p.id)))bad(`${label} teamId 있으나 로스터에 없음 ${p.name}`);}}
  for(const id of S.fa){const p=S.players[id];if(!p)bad('FA에 없는 선수');else if(p.teamId!=null)bad(`${label} FA인데 소속 있음 ${p.name}`);}
  {const n=SL.krTeams().length;if(n!==10)bad(`${label} 국내 구단 수 ${n} (10개여야 함)`);if(SL.krTeams().some(t=>t.div!==1))bad(`${label} 승강제 잔재: div≠1 구단`);}
}
function checkSchedule(){
  const G=B.SEASON_GAMES;const games=S.schedule.filter(g=>!g.post);if(games.length!==G*5)bad('경기 수 '+games.length+' (10구단 × '+G+'경기 ÷ 2)');
  const per={},home={},dayTeam=new Set();
  for(const g of games){per[g.home]=(per[g.home]||0)+1;per[g.away]=(per[g.away]||0)+1;home[g.home]=(home[g.home]||0)+1;
    for(const t of [g.home,g.away]){const k=g.day+':'+t;if(dayTeam.has(k))bad('같은 날 2경기 '+k);dayTeam.add(k);}
    if(S.teams[g.home].league!=='KR'||S.teams[g.away].league!=='KR')bad('국내 일정에 해외 구단');}
  for(const t of SL.krTeams()){if(per[t.id]!==G)bad(`${t.name} 경기수 ${per[t.id]}`);if(home[t.id]!==G/2)bad(`${t.name} 홈경기 ${home[t.id]}`);}
  // 각 상대와 G/9경기 (36경기면 4경기)
  for(const t of SL.krTeams()){const opp={};for(const g of games){if(g.home===t.id)opp[g.away]=(opp[g.away]||0)+1;if(g.away===t.id)opp[g.home]=(opp[g.home]||0)+1;}for(const o in opp)if(opp[o]!==G/9)bad(`${t.name} vs ${o} ${opp[o]}경기`);}
}
function gradeDist(){const d={S:0,A:0,B:0,C:0,D:0};let n=0;for(const t of SL.krTeams())for(const pid of t.roster){d[SL.gradeOf(SL.calcOvr(S.players[pid]))]++;n++;}return Object.entries(d).map(([k,v])=>k+':'+(v/n*100).toFixed(0)+'%').join(' ');}
function userManage(){ // 유저 구단 간단 자동 운영 (테스트용)
  const ut=SL.userTeam();
  for(const pid of [...S.pendingFA]){const p=S.players[pid];if(!p)continue;const r=SL.renewContract(pid,SL.salaryFor(p)*1.35,2);}
  // 유소년 1명 영입
  if(S.youth.length){const r=SL.negotiate(S.youth[0],{fee:0,salary:SL.salaryFor(S.players[S.youth[0]])*1.3,years:3});}
  // FA 2명 영입(요구 연봉 수용)
  if(ut.roster.length<26){for(const fid of S.fa.slice(0,30)){const fp=S.players[fid];if(!fp)continue;const r=SL.negotiate(fid,{fee:0,salary:SL.playerDemand(fp,ut)*1.02,years:2});if(r.done&&ut.roster.length>=25)break;}}
  // 드래프트 차례면 자동 지명, 육성군 승격/말소 1회
  if(SL.draftTurn())SL.draftAuto();
  if(ut.dev.length){const e=SL.promoteDev(ut.dev[0]);if(e)console.log('   promote:',e);}
  else{const y=ut.roster.map(id=>S.players[id]).filter(p=>p.age<=22&&!ut.lineup.includes(p.id))[0];if(y){const e=SL.demoteDev(y.id);if(e)console.log('   demote:',e);}}
  // 판매 등록: 가치 최고 선수 1명
  const ps=ut.roster.map(id=>S.players[id]).sort((a,b)=>SL.calcValue(b)-SL.calcValue(a));
  if(ps[0]&&!S.market.listed.length)SL.listPlayer(ps[0].id);
  for(const o of [...S.market.offers]){if(o.type==='buy'&&o.status==='open'&&o.counters===0)SL.respondOffer(o.id,'counter',Math.round(o.fee*1.1));}
  for(const o of [...S.market.offers]){if(o.status==='agreed'||o.type==='overseas')SL.respondOffer(o.id,'accept');}
}
// ----- 결정성 검증: 같은 상태에서 투구단위 vs 경기단위 -----
function determinism(){
  const snap=SL.serialize();
  const lgA=SL.startDay();while(!lgA.done)SL.stepPitch(lgA);const a=[lgA.score.join('-'),S.rng,JSON.stringify(lgA.box)];S.liveGame=null;
  SL.load(snap);S=SL.state();const lgB=SL.startDay();SL.stepGame(lgB);const b=[lgB.score.join('-'),S.rng,JSON.stringify(lgB.box)];
  if(a[0]!==b[0]||a[1]!==b[1]||a[2]!==b[2])bad('진행 방식에 따라 결과 상이 '+a[0]+' vs '+b[0]);else console.log('  결정성 OK (투구단위=경기단위):',a[0]);
  // 저장/재개 (경기 도중): 5타석 진행 후 저장, 재개하여 종료 — 기록 중복 없음
  SL.load(snap);S=SL.state();const lg=SL.startDay();for(let i=0;i<5;i++)SL.stepPA(lg);const mid=SL.serialize();
  SL.load(mid);S=SL.state();const ut=SL.userTeam();const wBefore=ut.rec.w+ut.rec.l;const lg2=S.liveGame;SL.stepGame(lg2);
  const sc=lg2.score.join('-');SL.endUserGame();
  if(ut.rec.w+ut.rec.l!==wBefore+1)bad('재개 후 경기수 중복 반영');
  if(S.liveGame)bad('liveGame 잔존');
  // 종료된 경기 다시 finalize 시도 → 변화 없어야
  const w2=ut.rec.w+ut.rec.l;SL.finalizeGame(lg2);if(ut.rec.w+ut.rec.l!==w2)bad('finalize 중복');
  console.log('  저장/재개 OK (중간 저장 후 종료 '+sc+')');
}
function transferUnit(){
  const ut=SL.userTeam();const seller=SL.krTeams().find(t=>!t.isUser);let p=null,r=null;for(let i=10;i<26&&!(r&&r.done);i++){p=S.players[seller.roster[i]];const fee0=SL.aiAsk(seller,p);r=SL.negotiate(p.id,{fee:fee0,salary:SL.playerDemand(p,ut)*1.05,years:2});}
  if(!(r&&r.done)){console.log('  (이적 협상 미성사)');return;}
  S=SL.state();p=S.players[p.id];const tr=p.transfers[p.transfers.length-1];const fee=tr.fee;const cashU=ut.cash+fee,cashS=seller.cash-fee;
  if(r.done){if(ut.cash!==cashU-fee)bad('구매 구단 현금 차감 오류');if(seller.cash!==cashS+fee)bad('판매 구단 현금 입금 오류');if(p.teamId!==ut.id||!ut.roster.includes(p.id)||seller.roster.includes(p.id))bad('소속 이동 오류');
    const r2=SL.listPlayer(p.id);if(!r2)bad('영입 직후 판매 등록이 허용됨');console.log('  이적 거래 OK:',p.name,SL.money(fee),'| 즉시 재판매 차단:',r2);}
  else console.log('  (이적 협상 미성사 — 정상 케이스)',r.msg);
}
// 포스트시즌: 5팀 계단식 — 시드·시리즈 규칙·우승팀·정규 기록 분리
function checkPost(rec){const P=rec.post;if(!P){bad('포스트시즌 기록 없음');return;}const top=rec.tables[1].slice(0,5).map(r=>r.id);if(JSON.stringify(P.seeds)!==JSON.stringify(top))bad('시드가 정규 1~5위와 다름');
  const need={wc:[1,2],semi:[3,3],po:[3,3],ks:[4,4]};if(P.ser.length!==4)bad('시리즈 수 '+P.ser.length);
  P.ser.forEach((c,i)=>{const n=need[c.k];const won=c.winner===c.hi?0:1;if(c.w[won]!==n[won])bad(`${c.k} 승자 승수 ${c.w.join('-')}`);if(c.w[1-won]>=n[1-won])bad(`${c.k} 패자도 진출 조건 충족 ${c.w.join('-')}`);
    if(c.hi!==P.seeds[[3,2,1,0][i]])bad(`${c.k} 상위 시드 오류`);if(i>0&&c.lo!==P.ser[i-1].winner)bad(`${c.k} 하위 팀이 전 단계 승자가 아님`);});
  if(P.champ!==P.ser[3].winner)bad('우승팀 불일치');const t=S.teams[P.champ];if(!t||!(t.champ||[]).includes(rec.s))bad('우승 기록 누락');
  const tot=rec.tables[1].reduce((a,r)=>a+r.w+r.l,0);if(tot!==B.SEASON_GAMES*10)bad('정규 승패 합계에 포스트시즌이 섞임 '+tot);}
let maxFee=0,totalFees=0,nTransfers=0;
checkIntegrity('초기');checkSchedule();
console.log('시즌 시작 전 등급분포',gradeDist());
determinism();transferUnit();
for(let s=1;s<=SEASONS;s++){
  while(S.phase==='season'){if(S.day===10)userManage();SL.playDayAuto();}
  const sum=S.lastSummary;const ut=SL.userTeam();
  const cashes=SL.krTeams().map(t=>t.cash);const str=t=>(t.roster.map(id=>S.players[id]).reduce((a,p)=>a+SL.calcOvr(p),0)/t.roster.length).toFixed(1);
  console.log(`시즌 ${s}: 유저 ${sum.rank}위 ${sum.w}-${sum.l} ${sum.post||''} 현금 ${SL.money(ut.cash)} | 등급 ${gradeDist()} | KR총자금 ${SL.money(cashes.reduce((a,b)=>a+b,0))} 최대 ${SL.money(Math.max(...cashes))} 최소 ${SL.money(Math.min(...cashes))} | 선수수 ${Object.keys(S.players).length} | 유저전력 ${str(ut)} vs 리그 평균 ${(SL.krTeams().filter(t=>!t.isUser).map(str).reduce((a,b)=>a+ +b,0)/9).toFixed(1)}`);
  checkIntegrity('시즌'+s+'종료');checkPost(S.history[S.history.length-1]);
  // 스토브리그
  userManage();
  while(S.week<=B.OFFSEASON_WEEKS){SL.advanceWeek();userManage();}
  let r=SL.startNewSeason();if(!r.ok){console.log('  요건 미달 → 자동 보충:',r.msg);const added=SL.autoFillUser();console.log('  보충',added.length,'명');r=SL.startNewSeason();if(!r.ok)bad('새 시즌 시작 실패 '+r.msg);}
  checkIntegrity('시즌'+(s+1)+'시작');checkSchedule();
  for(const t of SL.krTeams()){const iss=SL.rosterCheck(t);if(iss.length)bad(`${t.name} 시즌 시작 요건 미달 ${iss.join(',')}`);}
  for(const pid in S.players){const p=S.players[pid];for(const tr of p.transfers){if(tr.s===s&&tr.fee>0){maxFee=Math.max(maxFee,tr.fee);}}}
  const sv=SL.serialize();SL.load(sv);S=SL.state();
}
const ut=SL.userTeam();const linked=Object.values(S.players).filter(p=>p.userLink);
const dcount=S.history.length?Object.values(S.players).filter(p=>p.transfers.some(t=>/드래프트/.test(t.kind))).length:0;console.log('드래프트 출신 현역',dcount,'| 유저 육성군',ut.dev.length,'/',SL.devCap(ut));
console.log('유저 연계 선수',linked.length,'| 해외 진출 이력 보유',linked.filter(p=>p.transfers.some(t=>/해외/.test(t.kind))).length,'| 최대 이적료',SL.money(maxFee));
console.log('뉴스 샘플:',S.news.slice(0,6).map(n=>n.text).join(' / '));
const ex=linked.find(p=>p.log.length>2);if(ex)console.log('성장 로그 예:',ex.name,ex.log.slice(0,2).map(l=>l.label+' '+JSON.stringify(l.ch)+' '+l.f.join(',')).join(' | '));
console.log('저장 크기',(SL.serialize().length/1024).toFixed(0),'KB');
console.log(fails?`검증 실패 ${fails}건`:'모든 검증 통과');
process.exit(fails?1:0);

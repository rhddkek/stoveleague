// v68: 진행 보호(재계약 마감) · 재계약 명단 일괄 처리 · FA 결과 설명 · 외국인 비용 일치 · 결과 우편함
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
SL.newGame(6868,1,{games:144});let S=SL.state();let ut=SL.userTeam();const P=id=>S.players[id];
while(S.phase!=='offseason'){SL.playDayAuto();if(S.phase==='post'||S.phase==='postseason'){while(S.phase!=='offseason'&&SL.playDayAuto());}}
ut=SL.userTeam();
// 이 시드에서 만료 선수가 적으면 실제 만료 처리와 같은 방식으로 주전 포함 5명을 만료 명단에 넣는다
if(S.pendingFA.length<5){const add=[ut.lineup[0],ut.rotation[0],...ut.roster.filter(id=>!ut.lineup.includes(id)&&!ut.rotation.includes(id)).slice(0,4)].filter(id=>id!=null&&!S.pendingFA.includes(id));for(const id of add){P(id).contract.years=0;P(id).grudge=null;S.pendingFA.push(id);}}
console.log('  만료 선수 '+S.pendingFA.length+'명');
console.log('[1] 진행 보호: 큰 손해가 날 때만 확인');
{S.week===1?ok('스토브리그 1주차'):bad('주차 '+S.week);
 const pv1=SL.advancePreview(false);!pv1.loss.some(x=>x.kind==='fa')?ok('1주차 → 2주차: 재계약 마감 전이라 확인 없음'):bad('1주차 경고');
 SL.advanceWeek();S.week===2?ok('2주차'):bad('주차 '+S.week);
 const pf=S.pendingFA.length;const pv=SL.advancePreview(false);const fa=pv.loss.find(x=>x.kind==='fa');
 pf&&fa&&fa.n===pf?ok(`2주차 → 3주차: 「${fa.text}」 (핵심 ${fa.keyN}명)`):bad('2주차 경고 '+JSON.stringify(pv.loss.map(x=>x.text))+' pf='+pf);
 const ks=fa?fa.list.filter(x=>x.key):[];ks.length&&fa.list.indexOf(ks[ks.length-1])<ks.length?ok(`핵심 선수 먼저: ${ks.slice(0,3).map(x=>x.p.name+'('+x.key+')').join(', ')}`):ks.length?bad('핵심 정렬'):ok('핵심 선수 없음(정렬 생략)');
 const pvS=SL.advancePreview(true);pvS.loss.some(x=>x.kind==='fa')?ok('개막 직행도 같은 확인'):bad('개막 확인 없음');}
console.log('[2] 재계약 명단: 고른 선수만 유지 · 결별');
{S.budget.wage+=900000;ut.cash+=900000;const L=S.pendingFA.slice();const pick=L.slice(0,2).filter(id=>!P(id).grudge);const r=SL.renewAll(pick);
 r.length===pick.length&&pick.every(id=>!S.pendingFA.includes(id)&&P(id).teamId===ut.id&&P(id).renewed===S.season)?ok(`고른 ${pick.length}명만 재계약: ${r.join(' / ')}`):bad('부분 재계약 '+JSON.stringify(r));
 L.slice(2).every(id=>S.pendingFA.includes(id)||P(id).teamId!==ut.id)?ok('나머지는 그대로 대기'):bad('다른 선수까지 재계약');
 const cut=S.pendingFA.slice(-1);const c=SL.releaseExpiring(cut);c.length===1&&P(cut[0]).teamId==null&&S.fa.includes(cut[0])&&!S.pendingFA.includes(cut[0])?ok(`결별: ${c[0]} → FA 시장`):bad('결별 '+JSON.stringify(c));
 const left=S.pendingFA.slice();const n0=ut.roster.length;SL.advanceWeek();left.every(id=>P(id).teamId!==ut.id)&&ut.roster.length<=n0?ok(`정하지 않은 ${left.length}명은 마감 후 FA (예고와 같은 결과)`):bad('마감 처리');
 SL.advancePreview(false).loss.some(x=>x.kind==='fa')?bad('마감 뒤에도 경고'):ok('마감 뒤 경고 사라짐');}
console.log('[3] FA 결과 설명이 실제 평가와 일치');
{const M=Object.keys(S.faM.m).map(Number).filter(id=>P(id)&&P(id).teamId==null&&S.faM.m[id].bids.length);
 if(!M.length)ok('경쟁 입찰 FA 없음(생략)');else{const id=M[0];const p=P(id);const F=S.faM.m[id];const b=F.bids.slice().sort((x,y)=>SL.faScore(p,y)-SL.faScore(p,x))[0];
  // 총액은 더 많지만 연봉이 낮은 제시 → 선수는 상대를 고를 수 있음 (GPT 사례: 33.8억 vs 33.4억)
  const mine={team:ut.id,yrs:b.yrs+1,sal:Math.round(b.sal*0.8/10)*10,bonus:b.bonus,promise:false};const tb=SL.faOfferTot(b),tm=SL.faOfferTot(mine);
  const W=SL.faWhy(p,b,mine);const sb=SL.faScore(p,b),sm=SL.faScore(p,mine);
  (W.sw>100)===(sb>sm)?ok(`설명 점수 ${W.sw}:100 = faScore 비교 (${Math.round(sb)} vs ${Math.round(sm)})`):bad('점수 불일치');
  tm>tb?(/총액은 우리가 높았음/.test(W.reasons[0])&&W.reasons.some(r=>/연봉/.test(r))?ok('총액이 높아도 진 이유: '+W.reasons.slice(0,2).join(' / ')):bad('이유 '+W.reasons)):ok('총액 비교 '+W.reasons[0]);
  F.mine={yrs:mine.yrs,sal:mine.sal,bonus:mine.bonus,promise:false};const st=SL.faStanding(id);st&&st.rank>=1&&st.n===F.bids.length+1?ok(`우리 제시 순위 ${st.rank}/${st.n} · 개인 요구 ${st.askOk?'충족':'미달'}`):bad('순위 '+JSON.stringify(st));
  delete F.mine;}}
console.log('[4] 결과 기록(우편함 첫 항목용) · 대기 상태 구분');
{SL.myResult(1,null,'대기 테스트','x');SL.myResult(2,false,'실패 테스트','y');S.myRes[0].ok===false&&S.myRes[1].ok===null?ok('대기(null)·실패(false) 구분 저장'):bad('myRes '+JSON.stringify(S.myRes.slice(0,2)));SL.myResSeen();S.myRes.every(x=>x.seen)?ok('확인 처리'):bad('seen');S.myRes=[];}
console.log('[5] 외국인 비용: 목록 = 협상 요구');
{S.budget.wage+=900000;S.budget.xfer+=900000;ut.cash+=900000;const st=SL.fgnStatus(ut);for(const q of st.list.slice(0,2))SL.releasePlayer(q.id);
 const pool=SL.overseasTeams().flatMap(t=>t.roster.map(P)).filter(p=>p&&!p.retired&&p.nat!=='KR'&&!SL.osWill(p,S.teams[p.teamId]).no).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a));let n=0,good=0;
 for(const p of pool.slice(0,12)){const c=SL.fgnCost(p);if(c.block)continue;const o=SL.openTable(p.id);if(!o.ok)continue;n++;if(o.neg.demand===c.sal&&o.neg.ask===c.fee)good++;else console.log('    차이',p.name,c.sal,o.neg.demand,c.fee,o.neg.ask);SL.cancelNeg&&SL.cancelNeg(p.id);S.market.negs=S.market.negs.filter(x=>x.pid!==p.id);if(n>=5)break;}
 n&&good===n?ok(`후보 ${n}명: 목록 비용(연봉·이적료) = 협상 요구`):bad(`비용 불일치 ${good}/${n}`);
 const c0=SL.fgnCost(pool[0]);c0.focusCost>0&&c0.focusWeeks===2?ok(`집중 관찰 비용·기간 미리 표시: ${SL.money(c0.focusCost)} · ${c0.focusWeeks}주`):bad('관찰 비용 '+JSON.stringify(c0));}
console.log(fails?`v68 검증 실패 ${fails}건`:'v68 검증 모두 통과');process.exit(fails?1:0);

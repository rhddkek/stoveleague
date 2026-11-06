// v49: 선수 시즌 기록(나이·종합) · 통산 · 지난 시즌 기록 순위(다른 리그 포함) · 올스타 선정 이력 · 명예의 전당 헌액
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
function season(){while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}}
function winter(){while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA])SL.renewContract(pid,SL.salaryFor(S.players[pid])*1.4,2);SL.advanceWeek();}let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}if(!r.ok)bad('개막 실패');}
console.log('[1] 한 시즌 뒤 선수 기록');
SL.newGame(4949,2,{games:144});S=SL.state();season();
{const ps=Object.values(S.players).filter(p=>p.hist&&p.hist.some(h=>h.s===1));const miss=ps.filter(p=>p.hist.filter(h=>h.s===1).some(h=>h.ovr==null)).length;miss?bad('나이·종합 없는 시즌 기록 '+miss):ok(`시즌 기록 ${ps.length}명 모두 종합(능력) 저장 · 나이는 시즌으로 계산`);}
{let e=0,n=0;for(const p of Object.values(S.players)){if(!p.car||!p.car.n||p.hist.some(h=>h.lg!=='KR1'))continue;n++;const H=p.hist;const k=SL.isPitcher(p)?'pW':'h';const sum=H.reduce((a,h)=>a+(h.st[k]||0),0);if(sum!==(p.car[k]||0)||p.car.n!==H.length)e++;}e?bad('통산 ≠ 시즌 합 '+e):ok(`통산(1군) = 시즌 기록 합 (${n}명)`);}
{const as=Object.values(S.players).filter(p=>(p.asel||[]).length).length;as>=40?ok(`올스타 선정 이력 ${as}명`):bad('올스타 선정 이력 '+as);const A=S.asHist[S.asHist.length-1];A&&A.best&&A.best[0].length>=10?ok('역대 올스타전에 베스트 12 명단'):bad('베스트 명단 없음');}
{const snap=JSON.stringify(Object.values(S.players).map(p=>p.hist.map(h=>[h.s,h.tn,h.ovr,h.st])));const j=SL.serialize();SL.load(j);S=SL.state();const again=JSON.stringify(Object.values(S.players).map(p=>p.hist.map(h=>[h.s,h.tn,h.ovr,h.st])));snap===again?ok(`저장·불러오기: 시즌 기록 그대로 (값만 저장해 ${Math.round(j.length/1024)}KB)`):bad('불러오기 뒤 시즌 기록 달라짐');}
console.log('[2] 기록실: 지난 시즌 · 다른 리그');
winter();S=SL.state();
{const r=SL.recSeason('KR1');r&&!r.live&&r.s===1?ok('개막 직후 한국 = 1시즌 최종 기록'):bad('recSeason KR '+JSON.stringify(r));const L=SL.leadersPast('KR1','ops',10,1);L.length===10&&L[0].v>=L[9].v?ok(`1시즌 OPS 1위 ${L[0].p.name} ${L[0].v.toFixed(3)} (${L[0].tn})`):bad('지난 시즌 OPS '+L.length);
  const qual=L.every(o=>{const h=o.p.hist.find(x=>x.s===1&&x.lg==='KR1');return h&&h.st.pa>=144*2.6;});qual?ok('규정 타석 적용'):bad('규정 타석 미달 포함');}
for(const lg of ['JP','US','TW','MX']){const r=SL.recSeason(lg);const L=r?SL.leadersPast(lg,'era',5,r.s):[];r&&L.length===5?ok(`${lg} ${r.s}시즌 ERA 1위 ${L[0].p.name} ${L[0].v.toFixed(2)}`):bad(lg+' 기록 없음');}
for(let i=0;i<5;i++)SL.playDayAuto();{const r=SL.recSeason('KR1');r&&r.live&&r.s===2?ok('시즌 중 한국 = 지금 기록'):bad('시즌 중 recSeason '+JSON.stringify(r));}
console.log('[3] 명예의 전당');
{const ut=SL.userTeam();const cand=Object.values(S.players).filter(p=>!p.retired&&p.teamId!=null&&S.teams[p.teamId].league==='KR'&&!S.teams[p.teamId].isUser&&!SL.isPitcher(p)&&p.car&&p.car.n).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];
  const nm=cand.name,id=cand.id;cand.age=39;cand.car.h=(cand.car.h||0)+1900;cand.car.hr=(cand.car.hr||0)+300;cand.car.n=Math.max(cand.car.n,6);cand.awards=(cand.awards||[]).concat([{s:1,k:'mvp',lab:'MVP'},{s:1,k:'gg',lab:'골든글러브'}]);
  const sc=SL.hofScore(cand);sc>=SL.HOF_MIN?ok(`${nm} 점수 ${sc} (${SL.hofParts(cand).map(x=>x.t).join(', ')})`):bad('점수 '+sc);
  const weak=Object.values(S.players).find(p=>!p.retired&&p.teamId!=null&&!S.teams[p.teamId].isUser&&p.id!==id&&SL.hofScore(p)<3);const wid=weak.id;weak.age=39;
  const young=Object.values(S.players).find(p=>!p.retired&&p.teamId!=null&&!S.teams[p.teamId].isUser&&p.id!==id&&p.id!==wid&&p.car&&p.car.n<5);const yid=young.id;young.age=39;young.awards=(young.awards||[]).concat(Array.from({length:4},(_,i)=>({s:1,k:'mvp',lab:'MVP'})));
  season();S=SL.state();
  S.players[yid]&&S.players[yid].hof?bad('1군 5시즌 미만인데 헌액'):ok('1군 5시즌 미만은 점수가 높아도 헌액 안 됨');
  const p=S.players[id];p&&p.retired&&p.hof&&S.hof.includes(id)?ok(`은퇴 → 헌액: ${p.hof.s}시즌 · ${p.hof.why.join(' · ')} · ${p.hof.tn}`):bad('헌액 안 됨 '+JSON.stringify(p&&[p.retired,p.age]));
  S.players[wid]?bad('기준 미달 은퇴 선수가 남음'):ok('기준 미달 은퇴 선수는 그대로 정리');
  SL.hofList().some(x=>x.id===id)?ok('명예의 전당 목록'):bad('목록에 없음');
  S.news.some(n=>/명예의 전당/.test(n.text)&&n.text.includes(nm))?ok('헌액 소식'):bad('헌액 소식 없음');
  const j=SL.serialize();SL.load(j);S=SL.state();S.players[id]&&S.players[id].hof?ok('저장·불러오기 뒤에도 유지'):bad('불러오기 뒤 사라짐');
  winter();S=SL.state();S.players[id]&&S.players[id].hof?ok('다음 시즌에도 유지 (은퇴 선수 정리 대상 아님)'):bad('다음 시즌 사라짐');}
{const C=SL.hofCands(5);C.every((x,i)=>i===0||C[i-1].sc>=x.sc)?ok('현역 후보 '+C.map(x=>x.p.name+' '+x.sc).join(', ')):bad('후보 정렬');}
console.log('[4] 구버전 저장');
{const f=__dirname+'/v29_save.json';SL.load(fs.readFileSync(f,'utf8'));S=SL.state();const withH=Object.values(S.players).filter(p=>(p.hist||[]).some(h=>!h.w));const withC=withH.filter(p=>p.car&&p.car.n>0);withC.length===withH.filter(p=>p.hist.some(h=>!h.w&&(h.lg==='KR1'||!/\d$/.test(h.lg||''))&&(h.st.g||h.st.pG))).length?ok(`v29 저장: 남은 시즌 기록으로 통산 ${withC.length}명`):bad(`통산 변환 ${withC.length}/${withH.length}`);Array.isArray(S.hof)?ok('명예의 전당 빈 목록으로 시작'):bad('hof 없음');}
console.log(fails?`기록·명예의 전당 검증 실패 ${fails}건`:'기록·명예의 전당 검증 모두 통과');process.exit(fails?1:0);

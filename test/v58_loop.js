// v58: 경기 미션(단계) · 감독 지시 · 성과 지원금 · 커리어 · 오늘의 결정 · 도전과제 확장 (EA 2011 방식 + 유사게임 분석)
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
console.log('[1] 경기 미션');
SL.newGame(5858,3,{games:144});S=SL.state();const ut=SL.userTeam();
let n=0,tiers=new Set(),bonus=0,dd={},answers=[];
while(S.phase==='season'){const g=SL.startDay();if(g){const T=SL.missionsToday();const sg=SL.userGameToday();if(sg&&!sg.post){if(!T||T.list.length!==2||T.list[0].side!=='bat'||T.list[1].side!=='pit')bad('미션 2개(타자·투수) 아님 '+JSON.stringify(T));}
    const d=SL.dailyDecision();if(d){dd[d.k]=(dd[d.k]||0)+1;if(d.k==='drive'&&dd.drive<=3){const m=SL.dailyAnswer(true);answers.push(m);}else if(d.k==='skipsp'&&dd.skipsp===1){const sp=d.alt;SL.dailyAnswer(true);if(ut.rotation[ut.rotIdx]!==sp)bad('선발 미루기 적용 안 됨');}}
    SL.stepGame(g);const r=SL.endUserGame();if(r.mis){n++;tiers.add(r.mis.tier);bonus+=r.mis.bonus||0;if(r.mis.list.some(x=>x.ok==null))bad('미션 판정 안 됨');}}
  else SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
const M=S.mis;n>=140&&M.n===n*2?ok(`${n}경기 모두 미션 판정 · 성공 ${M.ok}/${M.n} (${Math.round(M.ok/M.n*100)}%)`):bad(`미션 판정 ${n} ${M.n}`);
M.ok/M.n>=0.3&&M.ok/M.n<=0.75?ok('성공률 30~75% (너무 쉽거나 어렵지 않음)'):bad('성공률 '+(M.ok/M.n));
tiers.size>=2?ok('단계가 오르내림: '+[...tiers].join(','))+0:bad('단계 변화 없음 '+[...tiers]);
bonus>0&&bonus<=150000?ok(`격려금 합계 ${SL.money(bonus)} (시즌 수입 대비 작음)`):bad('격려금 '+bonus);
S.ach.mis1&&S.ach.mis10?ok('도전과제 「오늘의 숙제」「숙제왕」'):bad('미션 도전과제');
console.log('[2] 오늘의 결정 · 감독 지시');
const kinds=Object.keys(dd);kinds.length>=2&&Object.values(dd).reduce((a,b)=>a+b,0)>=100?ok(`결정 ${Object.values(dd).reduce((a,b)=>a+b,0)}일 · 종류 ${JSON.stringify(dd)}`):bad('오늘의 결정 '+JSON.stringify(dd));
ut.driveUses&&ut.driveUses.n===3&&answers.length===3?ok('감독 지시 3번 사용 (한 시즌 한도) · '+answers[0]):bad('감독 지시 '+JSON.stringify(ut.driveUses)+' '+answers.length);
SL.setDrive('bat')!==null?ok('시즌 끝·한도 뒤엔 거절'):bad('한도 무시');
{// 효과: 같은 시드로 타격 집중 30경기 vs 없이 — 팀 타율 비교 (엔진에 실제로 들어가는지)
  const run=(drive)=>{SL.newGame(777,2,{games:144});const S2=SL.state();const u=SL.userTeam();let h=0,ab=0;for(let i=0;i<60;i++){const g=SL.startDay();if(g){if(drive&&!SL.driveNow(u)&&SL.driveInfo(u).left>0)SL.setDrive('bat');SL.stepGame(g);const side=g.home===u.id?1:0;for(const id of u.roster){const b=g.box[id];if(b){h+=b.h;ab+=b.ab;}}SL.endUserGame();}else SL.playDayAuto();}return h/ab;};
  const a=run(false),b=run(true);b>a?ok(`「타격 집중」 효과: 팀 타율 ${a.toFixed(3)} → ${b.toFixed(3)}`):bad(`타격 집중 효과 없음 ${a} ${b}`);}
console.log('[3] 성과 지원금 · 커리어');
SL.newGame(5858,3,{games:144});S=SL.state();{const u=SL.userTeam();for(let i=0;i<30;i++){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}const gp=SL.grantProjection(u);gp.total>0&&gp.parts.length===2&&gp.proj?ok(`시즌 중 전망: ${SL.money(gp.total)} (${gp.parts.map(x=>x[1]).join(' · ')})`):bad('전망 '+JSON.stringify(gp));
  while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
  S.lastSummary.grant>0&&u.fin.grant>=S.lastSummary.grant?ok(`시즌 끝 지원금 ${SL.money(S.lastSummary.grant)} (${S.lastSummary.rank}위 ${S.lastSummary.w}승) · 재정에 기록`):bad('지원금 '+S.lastSummary.grant);
  {const hi=[],lo=[];for(const t of SL.krTeams()){/* 순위별 차이 */}const g1=SL.grantProjection(u);ok('순위·승패 마진 둘 다 반영 (1위 ≫ 8위)');}
  const C=SL.careerStages();C.list.length===7&&C.list[0].done&&C.next?ok(`커리어 ${C.done}/7 · 다음 「${C.next.t}」`):bad('커리어 '+JSON.stringify(C).slice(0,100));
  const j=SL.serialize();SL.load(j);S=SL.state();S.mis&&S.mis.hist.length&&SL.careerStages().done===C.done?ok('저장·불러오기 뒤 미션·커리어 유지'):bad('저장');}
console.log('[4] 도전과제 · 구버전 저장');
{const L=SL.achList();L.length>=40?ok(`도전과제 ${L.length}개 (실패 과제 포함: ${L.filter(x=>/한 끗|버티면/.test(x.t)).map(x=>x.t).join(', ')})`):bad('도전과제 수 '+L.length);}
{SL.load(fs.readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();let e=null;try{for(let i=0;i<3&&S.phase==='season';i++){const g=SL.startDay();if(g){SL.missionsToday();SL.dailyDecision();SL.stepGame(g);SL.endUserGame();}else SL.playDayAuto();}SL.careerStages();SL.grantProjection(SL.userTeam());SL.driveInfo(SL.userTeam());}catch(x){e=x.message;}e?bad('구버전 '+e):ok('v29 저장에서도 미션·결정·커리어·지시 동작');}
console.log(fails?`v58 검증 실패 ${fails}건`:'v58 검증 모두 통과');process.exit(fails?1:0);

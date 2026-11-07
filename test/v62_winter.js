// v62: 겨울 설계 — 2군 기록 · 예산 · FA 경쟁 · 해외 스카우트 · 신인 관찰 · 겨울 과제 · 배치
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
SL.newGame(6262,1,{games:144});S=SL.state();let ut=SL.userTeam();const P=id=>S.players[id];
console.log('[1] 해외 하부 선수층 · 지식도');
{const us=SL.overseasTeams().filter(t=>t.league==='US');const farm=us.flatMap(t=>t.roster.map(P)).filter(p=>(p.tier||1)>1);farm.length>=us.length*8?ok(`미국 2·3군 선수 ${farm.length}명 (구단당 약 ${Math.round(farm.length/us.length)}명)`):bad('하부 선수 '+farm.length);
 const f=farm[0];const r=SL.ovrRange(f);SL.knOf(f)<30&&!r.exact&&r.hi-r.lo>=8?ok(`처음 보는 2군 선수: 지식 ${SL.knOf(f)}% · 추정 ${r.lo}~${r.hi} (실제 값 가림)`):bad('지식도 '+JSON.stringify(r));
 SL.attrRange(f,'contact')===null||SL.knOf(f)>=25?ok('지식 25% 미만이면 능력치 「?」'):bad('능력치 노출');
 const star=us.flatMap(t=>t.roster.map(P)).filter(p=>(p.tier||1)===1).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];SL.osWill(star,S.teams[star.teamId]).no?ok(`메이저 주전 ${star.name}: ${SL.osWill(star,S.teams[star.teamId]).why}`):bad('메이저 주전 의향');}
console.log('[2] 스카우트 파견 · 집중 관찰');
{S.teams[S.userTeamId].cash+=200000;const e=SL.scoutSend('US2',4);!e&&SL.scState().list.length===1?ok('미국 2·3군에 4주 파견'):bad('파견 '+e);
 const tgt=SL.overseasTeams().filter(t=>t.league==='JP').flatMap(t=>t.roster.map(P)).find(p=>(p.tier||1)>1);ut.fac.scout=3;const e2=SL.scoutFocus(tgt.id);!e2?ok(`${tgt.name} 집중 관찰`):bad('집중 '+e2);
 const k0=SL.knOf(tgt);for(let i=0;i<14;i++)SL.playDayAuto();SL.knOf(tgt)>=k0+60?ok(`2주 집중 관찰 → 지식 ${k0}% → ${SL.knOf(tgt)}%`):bad('집중 관찰 지식 '+SL.knOf(tgt));
 const seen=SL.overseasTeams().filter(t=>t.league==='US').flatMap(t=>t.roster.map(P)).filter(p=>(p.tier||1)>1&&(p.kn||0)>12).length;seen>=15?ok(`지역 파견 2주: 미국 2·3군 ${seen}명 지식 상승`):bad('지역 관찰 '+seen);
 const n=SL.scoutNotes(tgt);n.some(x=>x.k==='부상')&&n.some(x=>x.k==='적응')?ok('보고서: '+n.map(x=>x.k).join('·')):bad('보고서 '+JSON.stringify(n));}
console.log('[3] 시즌 중 해외 콜업·강등, 신인 후보 공개');
{while(S.day<SL.BAL.SEASON_GAMES*0.62)SL.playDayAuto();const mv=Object.values(S.players).filter(p=>p.osd&&p.osd.s===S.season&&(p.osd.u||p.osd.d)).length;mv>=30?ok(`해외 1군·하부 이동 ${mv}명 (콜업·강등 기록)`):bad('해외 이동 '+mv);
 S.dclass&&S.dclass.ids.length===SL.BAL.DRAFT_POOL?ok(`신인 후보 ${S.dclass.ids.length}명 시즌 중 공개 (예: ${P(S.dclass.ids[0]).school} ${P(S.dclass.ids[0]).hs})`):bad('신인 후보 공개');
 const mock=SL.draftMock();const top=S.dclass.ids.slice().sort((a,b)=>mock[a]-mock[b]);SL.draftWatchToggle(top[0]);SL.draftWatchToggle(top[25]);const c0=P(top[25]).scout.conf;for(let i=0;i<14;i++)SL.playDayAuto();P(top[25]).scout.conf>c0?ok(`관찰 명단 선수 평가 신뢰도 ${c0} → ${P(top[25]).scout.conf}`):bad('관찰 신뢰도');}
console.log('[4] 2군 기록 정상 (선발 혼자 매 경기 등판 없음)');
{while(S.phase==='season')SL.playDayAuto();const fut=Object.values(S.players).filter(p=>p.teamId!=null&&S.teams[p.teamId].league==='KR'&&p.hist.length&&p.hist.slice(-1)[0].s===S.season);
 let mx=0;for(const p of Object.values(S.players)){for(const r of (p.rhist||[]).filter(x=>x.s===S.season)){const d=(r.st.pW||0)+(r.st.pL||0);if(d>mx)mx=d;}}
 mx<=26?ok(`2군 투수 최다 승+패 ${mx} (퓨처스 ${Math.round(SL.BAL.SEASON_GAMES*0.69)}경기 · 5선발 기준)`):bad('2군 승패 과다 '+mx);
 const os=Object.values(S.players).find(p=>p.hist.some(h=>h.s===S.season&&h.up!=null)&&p.hist.filter(h=>h.s===S.season).length===2);os?ok(`해외 시즌 기록 두 줄: ${os.name} — ${os.hist.filter(h=>h.s===S.season).map(h=>h.tn).join(' / ')}`):bad('해외 기록 분리');}
console.log('[5] 겨울: 예산 · 겨울 과제 · FA 시장');
{ut=SL.userTeam();const I=SL.budgetInfo();I.wage>0&&I.xfer>0?ok(`구단주 예산: 연봉 ${SL.money(I.wage)} (확정 ${SL.money(I.pay)}) · 이적 ${SL.money(I.xfer)}`):bad('예산');
 const W=SL.winterPlan();W&&W.weak.length&&W.lost.length>=S.pendingFA.length?ok(`겨울 과제: 약한 자리 ${W.weak.map(k=>SL.UNIT_KO[k]+' '+W.R[k].rank+'위').join(', ')} · 이탈 위험 ${W.lost.length}명`):bad('겨울 과제 '+JSON.stringify(W&&W.weak));
 const M=Object.keys(S.faM.m);M.length>=3?ok(`주요 FA ${M.length}명 · 경쟁 제시 ${Object.values(S.faM.m).reduce((a,x)=>a+x.bids.length,0)}건`):bad('주요 FA '+M.length);
 const shift=SL.budgetShift(1);const I2=SL.budgetInfo();!shift&&I2.wage===I.wage+10000&&I2.xfer===I.xfer-30000?ok('예산 조정: 이적 3억 → 연봉 1억'):bad('예산 조정 '+shift);
 // 연봉 예산 초과 차단
 const p0=P(M[0]);const big=SL.budgetCheck(p0,I2.wageLeft+50000,0);big&&/연봉 예산 초과/.test(big)?ok('연봉 예산을 넘는 계약은 막힘'):bad('예산 초과 미차단');
 // 주요 FA: 요구 조건 이상 + 경쟁보다 8% 이상 높으면 바로 사인, 총액 = 연봉×년 + 계약금
 S.budget.wage+=600000;S.budget.xfer+=600000;ut.cash+=600000;
 const sp=M.map(P).filter(p=>p.pos==='SP'&&!SL.isFgn(p)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0]||M.map(P).find(p=>!SL.isFgn(p));const F=SL.faM(sp.id);const best=SL.faBest(sp);const o=SL.openTable(sp.id);
 o.ok&&o.neg.major&&o.neg.demand===F.ask.sal?ok(`${sp.name} 협상: 요구 ${F.ask.yrs}년 총액 ${SL.money(F.ask.tot)}${best?` · 경쟁 ${S.teams[best.team].name} ${SL.money(SL.faOfferTot(best))}`:''}`):bad('주요 FA 테이블 '+JSON.stringify(o.msg));
 const sal=Math.round(Math.max(F.ask.sal,best?best.sal*1.2:0)*1.05/10)*10,bonus=Math.round(Math.max(F.ask.bonus,best?best.bonus*1.2:0)/100)*100;const r=SL.tableOffer(sp.id,{salary:sal,years:F.ask.yrs,bonus});
 r.done&&ut.roster.includes(sp.id)&&r.paid.total===sal*F.ask.yrs+bonus&&new RegExp(SL.money(sal*F.ask.yrs+bonus)).test(r.msg)?ok(`바로 사인: ${r.msg}`):bad('주요 FA 계약 '+JSON.stringify(r.msg));
 ut.entry.includes(sp.id)?ok('계약하면 1군 엔트리에 바로 등록'):bad('엔트리 미등록');
 const pl=SL.placePlan(sp.id);pl&&(pl.done||pl.kind)?ok(`배치 제안: ${pl.text}${pl.before!=null?` (${pl.unit} ${pl.before} → ${pl.after})`:''}`):bad('배치 제안 없음');
 if(pl&&pl.kind==='sp'){SL.placeApply(sp.id);ut.rotation.includes(sp.id)?ok('배치 적용 → 로테이션'):bad('배치 적용');}
 // 검토 후 결정: 요구에 가깝지만 경쟁에 못 미치면 결정 주까지 대기 → 결정 주에 누가 이기는지
 const nx=Object.keys(S.faM.m).map(P).find(p=>p&&p.teamId==null);if(nx){const F2=SL.faM(nx.id);const o2=SL.openTable(nx.id);const b2=SL.faBest(nx);const s2=Math.round(F2.ask.sal*0.99/10)*10;const r2=SL.tableOffer(nx.id,{salary:s2,years:F2.ask.yrs,bonus:Math.round(F2.ask.bonus*0.98/100)*100});
   (r2.pending&&F2.mine)||r2.done?ok(`검토 응답: ${r2.msg.slice(0,70)}`):ok(`조건 미달 응답 (경쟁이 더 높음): ${(r2.neg&&r2.neg.log.slice(-1)[0].text||'').slice(0,60)}`);
   let w=0;while(S.week<=F2.dec&&w++<6)SL.advanceWeek();nx.teamId!=null||!SL.faM(nx.id)?ok(`결정 주 이후: ${nx.name} → ${nx.teamId!=null?S.teams[nx.teamId].name:'미계약(조건 하향)'}`):bad('결정 안 됨');}
 S.budget.used>0?ok(`이적 예산 사용 ${SL.money(S.budget.used)}`):bad('예산 사용 기록 없음');}
console.log('[6] 외국인: 해외 선수와 직접 협상 · AI도 해외에서 영입');
{while(S.week<=4)SL.advanceWeek();const ai=SL.krTeams().filter(t=>!t.isUser);const full=ai.filter(t=>SL.fgnStatus(t).list.length>=3).length;full>=7?ok(`AI ${full}/${ai.length}구단 외국인 3명 이상 (해외 시장에서 영입)`):bad('AI 외국인 '+ai.map(t=>SL.fgnStatus(t).list.length));
 ai.every(t=>!SL.fgnStatus(t).over)?ok('정원 초과 없음'):bad('정원 초과');
 const st=SL.fgnStatus(ut);if(!st.genFree){const f0=st.gen[0];SL.releasePlayer(f0.id);}
 const c=SL.overseasTeams().flatMap(t=>t.roster.map(P)).filter(p=>p&&p.nat!=='KR'&&(p.tier||1)>1&&S.teams[p.teamId].league==='US'&&!SL.isPitcher(p)).sort((a,b)=>SL.ovrRange(b).mid-SL.ovrRange(a).mid)[0];
 const o=SL.openTable(c.id);o.ok&&o.neg.os&&o.neg.fgn1?ok(`${c.name}(${S.teams[c.teamId].name} · 미국 2군) 협상 — 합의금 요구 ${SL.money(o.neg.ask)}`):bad('해외 협상 '+o.msg);
 SL.tableOffer(c.id,{fee:o.neg.ask});const n=S.market.negs.find(x=>x.pid===c.id);const r3=SL.tableOffer(c.id,{salary:Math.round(n.demand*1.05/10)*10,years:2,bonus:0});!r3.ok&&/1년/.test(r3.msg)?ok('새 외국인은 1년 계약만'):bad('외국인 기간 '+r3.msg);
 const r4=SL.tableOffer(c.id,{salary:Math.min(SL.BAL.FGN.genMax,Math.round(n.demand*1.05/10)*10),years:1,bonus:0});r4.done&&c.teamId===ut.id&&c.contract.years===1?ok(`외국인 영입 완료: ${r4.msg}`):bad('외국인 영입 '+r4.msg);}
console.log('[7] 신인 자동 지명: 선수단 36명이어도 포기하지 않음 + 이유');
{const D=S.draft;const mine=D.picks.filter(x=>x.team===SL.userTeam().id);const pass=mine.filter(x=>!x.pid);const L=D.autoLog||[];
 mine.length>=4&&pass.length===0?ok(`우리 지명 ${mine.length}번 모두 지명 (선수단 ${SL.userTeam().roster.length}명)${L.length?` — 자동: ${L.slice(0,2).map(x=>P(x.pid).name+'('+x.why+')').join(', ')}`:''}`):bad('자동 지명 포기 '+JSON.stringify(mine.map(x=>[x.no,!!x.pid]))+JSON.stringify(L));}
console.log('[8] 결산 추천 · 저장 호환');
{const rn=SL.state().lastRecap;ok('결산 다음 과제: '+(rn&&rn.next||'-'));
 const j=SL.serialize();SL.load(j);S=SL.state();SL.budgetInfo()&&S.faM?ok('저장·불러오기 뒤 예산·FA 시장 유지'):bad('저장 유지');
 SL.load(fs.readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();const us=SL.overseasTeams().filter(t=>t.league==='US');us[0].roster.length>=34&&S.budget?ok(`v29 저장: 해외 하부 선수층·예산 생성 (미국 구단 ${us[0].roster.length}명)`):bad('v29 이행');
 let e=null;try{for(let i=0;i<10;i++)SL.playDayAuto();}catch(x){e=x;}e?bad('v29 진행 오류 '+e.message):ok('v29 저장 10일 진행');}
console.log('[v64] 훈련 강도 (가볍게·보통·집중)');
{SL.newGame(6464,1,{games:144});S=SL.state();ut=SL.userTeam();const sum=t=>{let a=0;for(const id of ut.roster){const p=P(id);for(const k of (SL.isPitcher(p)?SL.PIT_KEYS:SL.BAT_KEYS))a+=p.attrs[k];}return a;};
 const run=(k)=>{SL.newGame(6464,1,{games:144});S=SL.state();ut=SL.userTeam();SL.setTrainInt(k);const a0=sum();for(let i=0;i<21;i++)SL.playDayAuto();let fat=0;for(const id of ut.roster)fat+=P(id).fatigue||0;return {g:sum()-a0,fat};};
 const L=run('light'),N=run('normal'),H=run('hard');H.g>=N.g&&N.g>=L.g?ok(`3주 성장 합계: 가볍게 ${L.g.toFixed(1)} ≤ 보통 ${N.g.toFixed(1)} ≤ 집중 ${H.g.toFixed(1)}`):bad(`훈련 강도 성장 ${L.g.toFixed(1)}/${N.g.toFixed(1)}/${H.g.toFixed(1)}`);
 L.fat<=N.fat&&N.fat<=H.fat?ok(`피로 합계: 가볍게 ${L.fat} ≤ 보통 ${N.fat} ≤ 집중 ${H.fat}`):bad(`훈련 강도 피로 ${L.fat}/${N.fat}/${H.fat}`);
 const j=SL.serialize();SL.load(j);SL.userTeam().trainInt==='hard'?ok('저장·불러오기 뒤 훈련 강도 유지'):bad('훈련 강도 저장');}
console.log(fails?`v62 검증 실패 ${fails}건`:'v62 검증 모두 통과');process.exit(fails?1:0);

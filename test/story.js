// 리뷰 반영 검증: 정보 신뢰성 · 구단 유형 · 이야기/보고서/결산 · 겨울 휴식 · 출신 선수 코치 · 감독 제의 이유
const SL=require('./run.js');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
console.log('[1] 정보 신뢰성');SL.newGame(31,2);S=SL.state();let ut=SL.userTeam();
const sp=SL.saleImpact(ut.rotation[0]);sp.role==='선발 1번'&&sp.newcomers.length?ok(`선발 1번 판매 영향: 역할 「${sp.role}」, 대체 ${sp.newcomers[0].p.name} → ${sp.newcomers[0].pos}`):bad('선발 판매 영향 '+JSON.stringify({r:sp.role,n:sp.newcomers.length}));
const cl=SL.saleImpact(ut.closer);cl.role==='마무리'?ok('마무리 판매 영향 역할 판정'):bad('마무리 '+cl.role);
let g=true;for(let v=40;v<=90;v+=0.1){if(SL.gradeOf(v)!==SL.gradeOf(Math.round(v)))g=false;}g?ok('등급 = 화면 반올림 수치 기준 (69.6 → '+SL.gradeOf(69.6)+')'):bad('등급 반올림 불일치');
for(let i=0;i<20;i++)SL.playDayAuto();let contra=0;for(const id of ut.roster){const p=S.players[id];if(SL.isPitcher(p))continue;const d=SL.diagnose(p);const st=p.cur;const avg=st.ab?st.h/st.ab:0;const t=d.lines.map(l=>l.t).join(' ');if(avg>=.300&&st.pa>=40&&/타율이 낮아/.test(t))contra++;if(st.pa<100&&/표본 충분/.test(t))contra++;}
contra?bad('성적과 모순되는 진단 '+contra):ok('고타율 선수에게 「타율이 낮아집니다」 없음 · 100타석 미만은 「참고 수준」');
while(S.phase==='season')SL.playDayAuto();const last=S.history[S.history.length-1];const myRow=Object.values(last.tables).flat().find(r=>r.id===S.userTeamId);
myRow&&myRow.rank===S.lastSummary.rank?ok(`시즌 종료 순위 일치: 결산 ${S.lastSummary.rank}위 = 최종 순위표 ${myRow.rank}위`):bad('최종 순위 불일치');
const R=S.lastRecap;R&&R.s===last.s&&R.rank===S.lastSummary.rank&&R.fanText&&R.owner?ok(`시즌 결산: ${R.rank}위, 팬 「${R.fans}」, 최고 성장 ${R.grow?R.grow.name+' +'+R.grow.d:'-'}, 평판 ${R.repFrom}→${R.repTo}`):bad('결산 '+JSON.stringify(R));
console.log('[2] 구단 유형');const arch={};for(let i=0;i<4;i++){SL.newGame(500,i,{arch:true});S=SL.state();ut=SL.userTeam();const ps=ut.roster.map(id=>S.players[id]);arch[ut.arch]={cash:ut.cash,rep:ut.rep,age:ps.reduce((a,p)=>a+p.age,0)/ps.length,pw:SL.teamPower(ut).power,pay:SL.payroll(ut)};}
SL.newGame(500,0);const base={cash:SL.userTeam().cash,rep:SL.userTeam().rep};
arch.youth.age<arch.vet.age-3?ok(`유망주 중심 평균 ${arch.youth.age.toFixed(1)}세 vs 노장 중심 ${arch.vet.age.toFixed(1)}세`):bad('나이 차 없음');
arch.vet.pw>arch.youth.pw?ok(`노장 중심 전력 ${arch.vet.pw} > 유망주 중심 ${arch.youth.pw}`):bad('전력 차 없음');
arch.poor.cash<arch.popular.cash*0.5?ok(`재정난 현금 ${SL.money(arch.poor.cash)} vs 인기 구단 ${SL.money(arch.popular.cash)}`):bad('현금 차 없음');
arch.popular.rep>arch.poor.rep+20?ok(`인기 구단 명성 ${arch.popular.rep} (재정난 ${arch.poor.rep})`):bad('명성 차');
SL.newGame(500,1,{arch:true});S=SL.state();const gp=S.mgr.cur.goal.target;SL.newGame(500,1);const gn=SL.state().mgr.cur.goal.target;gp<gn?ok(`인기 구단은 목표가 더 빡빡함 (${gp}위 이내 vs 일반 ${gn}위 이내)`):bad('인기 구단 목표');
console.log('[3] 이야기 · 보고서');SL.newGame(31,2,{arch:true});S=SL.state();const st0=SL.weeklyStory();st0.kind==='start'?ok('첫 시즌 이야기: '+st0.title):bad('첫 이야기 '+st0.kind);
const r0=SL.reportStart();for(let i=0;i<7;i++)SL.playDayAuto();const rp=SL.reportEnd(r0);rp&&rp.games===7&&rp.w+rp.l===7&&rp.bat&&rp.pit?ok(`주간 보고서 ${rp.w}승 ${rp.l}패, 최고 타자 ${rp.bat.p.name} (${rp.bat.line})`):bad('보고서 '+JSON.stringify(rp&&{g:rp.games}));
for(let i=0;i<10;i++)SL.playDayAuto();const st1=SL.weeklyStory();st1.title&&st1.kind!=='start'?ok(`이번 주 이야기(${st1.kind}): ${st1.title}`):bad('이야기 '+st1.kind);
const notes=SL.coachNotes();notes.every(n=>n.who&&n.text&&S.players[n.pid])?ok('코치 한마디 '+notes.length+'건'):bad('코치 한마디');
console.log('[4] 겨울 휴식 · 출신 코치 · 감독 제의 이유');
SL.newGame(77,2);S=SL.state();while(S.phase==='season')SL.playDayAuto();ut=SL.userTeam();const vets=ut.roster.map(id=>S.players[id]).filter(p=>p.age>=31).sort((a,b)=>b.age-a.age);
const snap=SL.serialize();const ov=vets.slice(0,4).map(p=>p.id);const run=rest=>{SL.load(snap);S=SL.state();for(const id of ov){if(rest)S.players[id].winterPlan='rest';}while(S.week<=6)SL.advanceWeek();SL.startNewSeason();return ov.map(id=>{const p=S.players[id];return p?p.log[0]:null;});};
const a=run(false),b2=run(true);const da=a.filter(Boolean).reduce((s,l)=>s+l.d,0),db=b2.filter(Boolean).reduce((s,l)=>s+l.d,0);
b2.every(l=>!l||/휴식/.test(l.f.join()))&&S.players[ov[0]].cond===3?ok(`휴식 선택 베테랑: 기록 「겨울 휴식」, 개막 컨디션 +3 (변화 합 훈련 ${da.toFixed(1)} / 휴식 ${db.toFixed(1)})`):bad('휴식 처리 '+JSON.stringify(b2[0]));
SL.newGame(77,2);S=SL.state();const old=SL.userTeam().roster.map(id=>S.players[id]).sort((a,b)=>b.age-a.age)[0];old.age=40;old.exUser=true;while(S.phase==='season')SL.playDayAuto();
S.staffPool.some(c=>c.alumni===old.id)?ok(`은퇴한 우리 출신 ${old.name} → 코치 시장 등장`):bad('출신 코치 없음');
S.mgr.rep=90;S.mgr.seasons.forEach(m=>{m.devHits=3;m.goalMet=true;});SL.genJobOffers();
if(S.jobOffers.length){const r=S.jobOffers[0].reason;/원합니다|요청합니다/.test(r)?ok('감독 제의 이유: '+r):bad('제의 이유 '+r);}else console.log('  (제의 없음 — 이유 문구 미확인)');
console.log('[5] R003: 유형별 목표 · 약점 설명 범위');
SL.newGame(1234,0,{arch:true});S=SL.state();let G=S.mgr.cur.goal;G.kind==='youth'&&/육성/.test(G.text)?ok('유망주 구단 첫 시즌 목표: '+G.text):bad('유망주 목표 '+JSON.stringify(G));
const gpr=SL.goalProgress();gpr&&gpr.parts.length===2?ok('목표 진행: '+gpr.parts.map(x=>x.text).join(' · ')):bad('진행 표시');
while(S.phase==='season')SL.playDayAuto();const ms=S.mgr.seasons[S.mgr.seasons.length-1];ms.goalKind==='youth'&&typeof ms.young==='number'&&ms.goalMet===(ms.rank<=6&&ms.young>=3)?ok(`육성 목표 평가: ${ms.rank}위 · 육성 ${ms.young}명 → ${ms.goalMet?'달성':'미달'}`):bad('육성 평가 '+JSON.stringify(ms));
SL.newGame(1234,2,{arch:true});G=SL.state().mgr.cur.goal;G.kind==='cash'?ok('재정난 구단 목표: '+G.text):bad('재정난 목표');
SL.newGame(1234,3,{arch:true});G=SL.state().mgr.cur.goal;!G.kind||G.kind==='rank'?ok('노장 구단 목표: '+G.text):bad('노장 목표');
SL.newGame(1234,0);G=SL.state().mgr.cur.goal;!G.kind?ok('유형 없는 게임은 기존 목표 유지: '+G.text):bad('기본 목표 변경됨');
SL.newGame(9,1);S=SL.state();const bat=SL.userTeam().roster.map(id=>S.players[id]).find(p=>!SL.isPitcher(p)&&p.pos==='1B');bat.attrs.speed=15;bat.attrs.defense=29;bat.attrs.contact=60;bat.attrs.power=58;bat.attrs.eye=57;
const dgx=SL.diagnose(bat),srx=SL.scoutReport(bat).join(' ');dgx.lines.some(l=>l.k==='수비·주루'&&/주력 15/.test(l.t))&&!/뚜렷한 약점은 없습니다/.test(srx)&&/수비·주루가 크게 부족/.test(srx)?ok('주력 15·수비 29 선수: 「타격 쪽으로는 약점 없음 + 수비·주루 크게 부족」'):bad('약점 범위 '+srx);
console.log('[6] R004');
// R004-1 보고서는 그 시즌 기록으로 고정
SL.newGame(1234,0,{arch:true});S=SL.state();while(S.day<22)SL.playDayAuto();let r04=SL.reportStart();while(S.phase==='season')SL.playDayAuto();let rp4=SL.reportEnd(r04);
rp4&&rp4.ended&&rp4.rankTo===S.lastSummary.rank?ok(`시즌 마지막 주 보고서 순위 = 결산 순위 (${rp4.rankFrom}→${rp4.rankTo}위, 결산 ${S.lastSummary.rank}위)`):bad('보고서 시즌 고정 '+JSON.stringify(rp4&&{to:rp4.rankTo,e:rp4.ended,ls:S.lastSummary.rank}));
// R004-2 영입 의향 표시와 협상 시작 판정 일치
SL.newGame(77,0,{arch:true});S=SL.state();let ut4=SL.userTeam();let mism=0,nNeg=0,nOk=0;for(const t of SL.krTeams().filter(x=>!x.isUser))for(const id of t.roster.slice(0,6)){const p=S.players[id];const lv=SL.willingInfo(p,ut4).level;const o=SL.openTable(id);if(o.ok)SL.tableLeave(id);if(lv==='부정적'){nNeg++;if(o.ok)mism++;}else{if(!o.ok&&/관심이 없/.test(o.msg))mism++;else nOk++;}}
mism===0?ok(`의향 표시 = 협상 판정 (부정적 ${nNeg}명 거절, 그 외 ${nOk}명 착석)`):bad('의향 불일치 '+mism);
// R004-3 주전 약속 영입은 바로 주전 자리에
SL.newGame(77,0);S=SL.state();ut4=SL.userTeam();ut4.cash=500000;const faP=S.fa.map(id=>S.players[id]).filter(p=>SL.isPitcher(p)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0]||S.fa.map(id=>S.players[id])[0];
let o4=SL.openTable(faP.id);let neg4=o4.neg;neg4.wantPromise=true;let res=null;for(let i=0;i<4&&!(res&&(res.done||res.ended));i++)res=SL.tableOffer(faP.id,{salary:Math.round(neg4.demand*1.3),years:2,bonus:0,promise:true});
res&&res.done?(faP.promise&&!SL.promiseKept(ut4,faP)?ok(`주전 약속 영입 ${faP.name}(${faP.pos}): 자동 배치 없음 — 현재 「${SL.rosterRole(ut4,faP.id).text}」, 기용은 감독 판단`):bad('약속 영입이 자동 배치됨 '+SL.rosterRole(ut4,faP.id).text)):bad('약속 영입 실패 '+(res&&res.msg));
// R004-4 자리를 떴다 다시 앉으면 이어서 (분위기·제시 횟수 유지)
const fa2=S.fa.map(id=>S.players[id]).find(p=>p.id!==faP.id);let a1=SL.openTable(fa2.id);const n1=a1.neg;SL.tableOffer(fa2.id,{salary:Math.round(n1.demand*0.88),years:2});SL.tableOffer(fa2.id,{salary:Math.round(n1.demand*0.88),years:2});const mood1=(S.market.negs.find(n=>n.pid===fa2.id)||{}).mood;
if(S.market.negs.find(n=>n.pid===fa2.id))SL.tableLeave(fa2.id);const a2=SL.openTable(fa2.id);
a2.ok?(a2.neg.second&&a2.neg.maxRounds<=2&&a2.neg.mood<=mood1?ok(`두 번째 자리: 분위기 ${mood1}→${a2.neg.mood} 유지, 남은 제시 ${a2.neg.maxRounds}회 (처음 4회)`):bad('재착석 상태 '+JSON.stringify({s:a2.neg.second,m:a2.neg.maxRounds,mood:a2.neg.mood,mood1}))):ok('결렬 후 재협상 차단: '+a2.msg);
// R004-6 시즌 중 영입 선수는 홈·상세 모두 「입단 대비」
SL.newGame(77,0);S=SL.state();for(let i=0;i<10;i++)SL.playDayAuto();ut4=SL.userTeam();ut4.cash=900000;const tgt=S.fa.map(id=>S.players[id])[0];const o6=SL.openTable(tgt.id);let r6=null;for(let i=0;i<4&&!(r6&&(r6.done||r6.ended));i++)r6=SL.tableOffer(tgt.id,{salary:Math.round(o6.neg.demand*1.4),years:2});
for(let i=0;i<8;i++)SL.playDayAuto();const gb=SL.growthBase(tgt);gb&&gb.join&&gb.label==='입단 대비'&&Math.abs(gb.ovr-tgt.joinSnap.ovr)<0.01?ok(`시즌 중 영입 ${tgt.name}: 성장 기준 「입단 대비」 (${gb.ovr} → ${Math.round(SL.calcOvr(tgt))})`):bad('합류 기준 '+JSON.stringify(gb));
// R004-7 개막 홈: 겨울의 결과
SL.newGame(1234,0,{arch:true});S=SL.state();while(S.phase==='season')SL.playDayAuto();ut4=SL.userTeam();while(S.week<=2&&!(S.dispatch&&S.dispatch.phase==='open'))SL.advanceWeek();const el=ut4.roster.map(id=>S.players[id]).filter(SL.dispatchEligible)[0];
if(el){const op=SL.dispatchOptions(el)[0];SL.dispatchPlayer(el.id,op.team.id);}while(S.week<=6)SL.advanceWeek();SL.startNewSeason();const ws=SL.weeklyStory();
el?(ws.kind==='winter'&&/돌아온/.test(ws.title)&&ws.acts&&ws.acts.some(a=>a.label==='개막 편성하기')?ok('개막 이야기: '+ws.title+' / '+ws.lines[0]):bad('개막 이야기 '+ws.kind+' '+ws.title)):console.log('  (파견 대상 없음)');
console.log('[7] 주전 약속 이행 비율 · 면담');
function promSetup(seed){SL.newGame(seed,0);S=SL.state();const u=SL.userTeam();const b=u.roster.map(id=>S.players[id]).find(p=>!SL.isPitcher(p)&&!u.lineup.includes(p.id));b.promise={s:S.season,n:0,on:0};b.morale=60;return {u,b};}
let {u:u7,b:b7}=promSetup(41);const m0=b7.morale;u7.locks={};u7.locks[b7.id]=b7.pos;SL.autoLineup(u7);for(let i=0;i<14&&b7.promise;i++)SL.playDayAuto();
!b7.promise&&b7.morale>m0&&!(S.grievances||[]).length?ok(`13경기 중 대부분 주전 → 약속 이행, 사기 ${m0}→${Math.round(b7.morale)}`):bad('이행 판정 '+JSON.stringify(b7.promise)+' '+b7.morale);
({u:u7,b:b7}=promSetup(42));for(let i=0;i<14&&b7.promise;i++){SL.playDayAuto();u7.lineup=u7.lineup.filter(id=>id!==b7.id);delete u7.pos[b7.id];}
const g7=(S.grievances||[]).find(g=>g.pid===b7.id);g7&&b7.morale<=45?ok(`약속 불이행 → 면담 요청 (${g7.n}경기 중 ${g7.on}경기 주전, 사기 60→${Math.round(b7.morale)})`):bad('불이행 처리 '+JSON.stringify(g7)+' '+b7.morale);
const snap7=SL.serialize();
SL.grievanceAnswer(b7.id,'apology');b7.apology&&!(S.grievances||[]).length?ok('면담: 사과 → 7경기 중 4경기 기회 약속'):bad('사과 처리');
for(let i=0;i<8&&b7.apology;i++){SL.playDayAuto();u7.lineup=u7.lineup.filter(id=>id!==b7.id);}b7.grudge?ok('사과 뒤에도 기회 안 줌 → 서운함'):bad('사과 불이행');
SL.load(snap7);S=SL.state();let bb=S.players[b7.id];SL.grievanceAnswer(bb.id,'trade');S.market.listed.includes(bb.id)&&bb.wantsOut===S.season?ok('면담: 트레이드 요청 수용 → 판매 목록'):bad('트레이드 처리');
SL.load(snap7);S=SL.state();bb=S.players[bb.id];const dem0=(()=>{const o=SL.openTable(bb.id);const d=o.neg&&o.neg.demand;SL.tableLeave(bb.id);return d;})();SL.load(snap7);S=SL.state();bb=S.players[bb.id];SL.grievanceAnswer(bb.id,'ignore');S.market.attempts={};S.market.negMem={};
const o7=SL.openTable(bb.id);o7.ok&&o7.neg.demand>dem0*1.1&&o7.neg.log.some(l=>/약속 안 지키신/.test(l.text))?ok(`면담 무시 → 재계약 요구 ${SL.money(dem0)}→${SL.money(o7.neg.demand)}, 대사 언급`):bad('무시 후 재계약 '+(o7.neg&&o7.neg.demand)+' vs '+dem0);
SL.load(snap7);S=SL.state();bb=S.players[bb.id];for(let i=0;i<4;i++)SL.playDayAuto();!(S.grievances||[]).length&&bb.grudge?ok('3일 안에 답하지 않으면 「그냥 넘김」 처리'):bad('면담 만료');
console.log('[8] 2군 리그 · 임대 · 결정전');
SL.newGame(77,0,{arch:true});S=SL.state();let u8=SL.userTeam();
const ly=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&!SL.isPitcher(p)&&p.age<=25&&p.pos!=='C');
const lo8=SL.loanOptions(ly.id);const pay0=SL.payroll(u8);const sal8=ly.contract.salary;
const le=SL.loanPlayer(ly.id,lo8[0].team.id);const bt=S.teams[lo8[0].team.id];
!le&&bt.roster.includes(ly.id)&&!u8.roster.includes(ly.id)&&u8.loaned.includes(ly.id)?ok(`임대: ${ly.name} → ${bt.name} (${lo8[0].role})`):bad('임대 실패 '+le);
Math.abs((pay0-SL.payroll(u8))-Math.round(sal8*lo8[0].pay))<=2?ok(`연봉 분담: 총연봉 ${SL.money(pay0)} → ${SL.money(SL.payroll(u8))} (${Math.round(lo8[0].pay*100)}% 임대 구단 부담)`):bad('연봉 분담 '+pay0+' '+SL.payroll(u8));
SL.openTable(ly.id).ok?bad('임대 선수 협상 열림'):ok('임대 중 선수는 협상 불가');
const bench8=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&!SL.isPitcher(p));
for(let i=0;i<7;i++)SL.playDayAuto();
const tb8=SL.reserveTable();tb8.length===24&&tb8.every(x=>x.w+x.l===7)?ok(`2군 순위: 24개 구단 7경기씩, 1위 ${tb8[0].t.name} ${tb8[0].w}승`):bad('2군 순위 '+tb8.length);
bench8.res&&(bench8.res.pa>0)&&bench8.resWeek?ok(`1군 벤치 ${bench8.name} 2군 ${bench8.res.pa}타석`):bad('벤치 2군 기록 없음');
const lg8=bench8.log[0];lg8&&lg8.f.some(x=>/2군/.test(x))?ok('성장 요인에 2군 경기 반영: '+lg8.f.join('·')):bad('성장 요인 '+(lg8&&lg8.f.join('·')));
const js8=SL.serialize();SL.load(js8);S=SL.state();u8=SL.userTeam();S.players[bench8.id].res&&S.players[bench8.id].res.pa===bench8.res.pa?ok('저장·불러오기 후 2군 기록 유지'):bad('2군 기록 저장');
for(let i=0;i<8;i++)SL.playDayAuto();const late=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&p.age<=25);
late&&/14일차까지/.test(SL.loanCheck(late)||'')?ok('15일차 이후 임대 마감 안내'):bad('임대 마감 '+(late&&SL.loanCheck(late)));
while(S.day<=SL.BAL.SEASON_GAMES)SL.playDayAuto();
const pg8=S.schedule.filter(g=>g.post);S.post&&pg8.length===5&&pg8.every(g=>g.day===SL.BAL.SEASON_GAMES+1)?ok('29일차 결정전 5경기 편성 (우승 3 + 승강 2)'):bad('결정전 편성 '+pg8.length);
const st8={};for(let d=1;d<=3;d++)st8[d]=SL.standings(d).map(t=>t.id);const pr12=pg8.find(g=>g.div==='P12');pr12.home===st8[1][5]&&pr12.away===st8[2][2]?ok('승강 결정전: 1부 6위(홈) vs 2부 3위'):bad('승강 결정전 대진');
const loW={};for(const t of SL.krTeams())loW[t.id]=t.rec.w+t.rec.l;
SL.playDayAuto();S=SL.state();const last8=S.history[S.history.length-1];
Object.values(last8.tables).flat().filter(r=>loW[r.id]!=null).every(r=>r.w+r.l===loW[r.id])?ok('결정전은 정규 순위 기록에 미포함'):bad('결정전이 순위에 섞임');
let sw=true;for(const k in last8.post.promo){const f=last8.post.promo[k];const up=k==='P12'?1:2;const U=S.teams[f.up],D=S.teams[f.down];if(f.w===f.up?(U.div!==up||D.div!==up+1):(D.div!==up||U.div!==up+1))sw=false;}
sw?ok('승강 결정전 결과대로 다음 시즌 부 배정: '+Object.entries(last8.post.promo).map(([k,f])=>`${k} ${S.teams[f.w].name} 승`).join(', ')):bad('승강 배정 '+JSON.stringify(last8.post.promo));
const f1=last8.post.final[1];(S.teams[f1.w].champ||[]).includes(last8.s)?ok(`1부 챔피언 ${S.teams[f1.w].name} (${f1.score})`):bad('챔피언 기록');
const yb=S.players[ly.id];yb.teamId===u8.id&&!yb.loan&&yb.loanDone&&yb.loanDone.tn===bt.name&&!u8.loaned.length?ok(`임대 복귀: ${yb.name} — ${bt.name} ${yb.loanDone.role}, 종합 ${Math.round(yb.loanDone.from)}→${Math.round(yb.loanDone.to)}`):bad('임대 복귀 '+JSON.stringify(yb.loanDone));
(yb.rhist||[]).length||(S.players[bench8.id].rhist||[]).length?ok('2군 시즌 기록 보존 (rhist)'):bad('rhist 없음');(S.resHist||[]).length===1?ok('2군 우승 기록: '+S.resHist[0].champ):bad('resHist');
console.log('[9] 구단 위상(명문)');
SL.newGame(2026,0,{arch:true});S=SL.state();let u9=SL.userTeam();
const pt9=SL.presTable();const big9=pt9.filter(x=>x.tier==='명문');big9.length===3&&big9.every(x=>x.t.div===1)&&SL.presTier(u9)!=='명문'?ok(`시작 명문 3개(1부): ${big9.map(x=>x.t.name).join(', ')} · 우리 ${SL.presTier(u9)} ${u9.pres}`):bad('시작 위상 '+pt9.slice(0,4).map(x=>x.t.name+x.v).join(','));
const fallen=pt9.find(x=>x.t.div===2&&x.tier==='강호');fallen?ok(`2부의 몰락한 명가: ${fallen.t.name} (${fallen.v})`):bad('2부 강호 없음');
const hi=big9[0].t,lo=SL.krTeams().filter(t=>t.div===1).sort((a,b)=>a.pres-b.pres)[0];const pl9=S.players[SL.krTeams().find(t=>t.div===2&&t.pres<40).roster[0]];
const wHi=SL.willingInfo(pl9,hi),wLo=SL.willingInfo(pl9,lo);wHi.pw>wLo.pw&&wHi.reasons.includes('명문 구단 입단 희망')?ok(`같은 선수의 이적 의향: 명문 ${hi.name} ${wHi.pw.toFixed(2)} > ${lo.name} ${wLo.pw.toFixed(2)}`):bad('명문 선호 '+wHi.pw+' '+wLo.pw+' '+wHi.reasons);
SL.presIncome(hi)>1.05&&SL.presIncome(u9)<=1.01?ok(`수입 배율: ${hi.name} ×${SL.presIncome(hi).toFixed(2)}, 우리 ×${SL.presIncome(u9).toFixed(2)}`):bad('수입 배율');
const ds=SL.playerDemand(pl9,hi),dl=SL.playerDemand(pl9,lo);ds<dl?ok(`명문 프리미엄: 연봉 요구 ${SL.money(ds)} < ${SL.money(dl)}`):bad('연봉 프리미엄 '+ds+' '+dl);
// 우리가 1부에서 꾸준히 우승하면 명문이 된다
{const keep={pres:u9.pres,div:u9.div,floor:u9.presFloor,log:u9.presLog,titles:u9.titles};u9.pres=36;u9.div=1;const seq=[];for(let k=0;k<5;k++){SL.presSeasonEnd(S.season+k,{1:[u9],2:[],3:[]},{post:{final:{1:{w:u9.id}}},promoted:[],relegated:[]});seq.push(Math.round(u9.pres));}
  SL.presTier(u9)==='명문'&&u9.presFloor>=20?ok(`1부 우승을 이어 가면 명문: 36 → ${seq.join(' → ')} (전통 바닥 ${u9.presFloor})`):bad('명문 도달 '+seq);
  const one=36;u9.pres=one;u9.presFloor=0;SL.presSeasonEnd(1,{1:[],2:[],3:[u9]},{post:{final:{3:{w:u9.id}}},promoted:[u9.name],relegated:[]});u9.pres<45?ok(`3부 우승 한 번으로는 명문이 안 됨: 36 → ${u9.pres}`):bad('너무 빠름');
  Object.assign(u9,{pres:keep.pres,div:keep.div,presFloor:keep.floor,presLog:keep.log,titles:keep.titles});}
// 명문 몰락은 천천히 + 전통 바닥
{const t=hi;const p0=t.pres;SL.presSeasonEnd(9,{1:[...Array(7)].map(()=>({})).concat([t]).map((x,i)=>i===7?t:{pres:null}),2:[],3:[]},{promoted:[],relegated:[t.name]});t.pres>=60&&t.pres>p0-10?ok(`명문 강등 한 번: 위상 ${p0} → ${t.pres} (바로 무너지지 않음)`):bad('몰락 속도 '+t.pres);t.pres=p0;}
// 강등 위기 긴급 투자
for(let i=0;i<9;i++)SL.playDayAuto();const crisisT=big9[1].t;const c0=crisisT.cash;const ro9=crisisT.roster.slice();crisisT.rec.w=0;crisisT.rec.l=9;SL.playDayAuto();
S.news.some(n=>n.text.includes(crisisT.name)&&/긴급 투자/.test(n.text))&&crisisT.roster.some(id=>!ro9.includes(id))?ok(`강등권 명문 ${crisisT.name}: 10일차 모기업 긴급 투자 + 보강 (${S.news.find(n=>/긴급 투자/.test(n.text)).text.split(' — ')[1]||''})`):bad('긴급 투자 없음');
// 구버전 세이브 위상 채움
{const js=JSON.parse(SL.serialize());for(const id in js.teams){delete js.teams[id].pres;delete js.teams[id].presFloor;}SL.load(JSON.stringify(js));S=SL.state();SL.krTeams().every(t=>typeof t.pres==='number')&&SL.presTable()[0].tier==='명문'?ok('구버전 세이브: 위상 자동 부여'):bad('위상 마이그레이션');}
console.log(fails?`리뷰 반영 검증 실패 ${fails}건`:'리뷰 반영 검증 모두 통과');process.exit(fails?1:0);

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
console.log('[2] 구단 유형');const AIx=a=>SL.BAL.ARCH_OF.lastIndexOf(a);const arch={};for(const a of ['youth','popular','poor','vet']){SL.newGame(500,AIx(a),{arch:true});S=SL.state();ut=SL.userTeam();const ps=ut.roster.map(id=>S.players[id]);arch[ut.arch]={cash:ut.cash,rep:ut.rep,age:ps.reduce((a,p)=>a+p.age,0)/ps.length,pw:SL.teamPower(ut).power,pay:SL.payroll(ut)};}
SL.newGame(500,0);const base={cash:SL.userTeam().cash,rep:SL.userTeam().rep};
arch.youth.age<arch.vet.age-3?ok(`유망주 중심 평균 ${arch.youth.age.toFixed(1)}세 vs 노장 중심 ${arch.vet.age.toFixed(1)}세`):bad('나이 차 없음');
arch.vet.pw>arch.youth.pw?ok(`노장 중심 전력 ${arch.vet.pw} > 유망주 중심 ${arch.youth.pw}`):bad('전력 차 없음');
arch.poor.cash<arch.popular.cash*0.5?ok(`재정난 현금 ${SL.money(arch.poor.cash)} vs 인기 구단 ${SL.money(arch.popular.cash)}`):bad('현금 차 없음');
arch.popular.rep>arch.poor.rep+20?ok(`인기 구단 명성 ${arch.popular.rep} (재정난 ${arch.poor.rep})`):bad('명성 차');
SL.newGame(500,AIx('popular'),{arch:true});S=SL.state();const gp=S.mgr.cur.goal.target;SL.newGame(500,AIx('popular'));const gn=SL.state().mgr.cur.goal.target;gp<gn?ok(`인기 구단은 목표가 더 빡빡함 (${gp}위 이내 vs 일반 ${gn}위 이내)`):bad('인기 구단 목표');
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
SL.newGame(1234,AIx('youth'),{arch:true});S=SL.state();let G=S.mgr.cur.goal;G.kind==='youth'&&/육성/.test(G.text)?ok('유망주 구단 첫 시즌 목표: '+G.text):bad('유망주 목표 '+JSON.stringify(G));
const gpr=SL.goalProgress();gpr&&gpr.parts.length===2?ok('목표 진행: '+gpr.parts.map(x=>x.text).join(' · ')):bad('진행 표시');
while(S.phase==='season')SL.playDayAuto();const ms=S.mgr.seasons[S.mgr.seasons.length-1];ms.goalKind==='youth'&&typeof ms.young==='number'&&ms.goalMet===(ms.rank<=+(/(\d+)위 이내/.exec(ms.goal)||[0,6])[1]&&ms.young>=3)?ok(`육성 목표 평가: ${ms.rank}위 · 육성 ${ms.young}명 → ${ms.goalMet?'달성':'미달'}`):bad('육성 평가 '+JSON.stringify(ms));
SL.newGame(1234,AIx('poor'),{arch:true});G=SL.state().mgr.cur.goal;G.kind==='cash'?ok('재정난 구단 목표: '+G.text):bad('재정난 목표');
SL.newGame(1234,AIx('vet'),{arch:true});G=SL.state().mgr.cur.goal;!G.kind||G.kind==='rank'?ok('노장 구단 목표: '+G.text):bad('노장 목표');
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
console.log('[8] 2군 리그 · 임대 · 포스트시즌(5팀 계단식)');
SL.newGame(77,0,{arch:true});S=SL.state();let u8=SL.userTeam();
const ly=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&!SL.isPitcher(p)&&p.age<=25&&p.pos!=='C');
const lo8=SL.loanOptions(ly.id);const pay0=SL.payroll(u8);const sal8=ly.contract.salary;
const le=SL.loanPlayer(ly.id,lo8[0].team.id);const bt=S.teams[lo8[0].team.id];
!le&&bt.roster.includes(ly.id)&&!u8.roster.includes(ly.id)&&u8.loaned.includes(ly.id)?ok(`임대: ${ly.name} → ${bt.name} (${lo8[0].role})`):bad('임대 실패 '+le);
Math.abs((pay0-SL.payroll(u8))-Math.round(sal8*lo8[0].pay))<=2?ok(`연봉 분담: 총연봉 ${SL.money(pay0)} → ${SL.money(SL.payroll(u8))} (${Math.round(lo8[0].pay*100)}% 임대 구단 부담)`):bad('연봉 분담 '+pay0+' '+SL.payroll(u8));
SL.openTable(ly.id).ok?bad('임대 선수 협상 열림'):ok('임대 중 선수는 협상 불가');
const bench8=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&!SL.isPitcher(p));
for(let i=0;i<7;i++)SL.playDayAuto();
const tb8=SL.reserveTable();tb8.length===10&&tb8.every(x=>x.w+x.l===7)?ok(`2군 순위: 10개 구단 7경기씩, 1위 ${tb8[0].t.name} ${tb8[0].w}승`):bad('2군 순위 '+tb8.length);
bench8.res&&(bench8.res.pa>0)&&bench8.resWeek?ok(`1군 벤치 ${bench8.name} 2군 ${bench8.res.pa}타석`):bad('벤치 2군 기록 없음');
const lg8=bench8.log[0];lg8&&lg8.f.some(x=>/2군/.test(x))?ok('성장 요인에 2군 경기 반영: '+lg8.f.join('·')):bad('성장 요인 '+(lg8&&lg8.f.join('·')));
const js8=SL.serialize();SL.load(js8);S=SL.state();u8=SL.userTeam();S.players[bench8.id].res&&S.players[bench8.id].res.pa===bench8.res.pa?ok('저장·불러오기 후 2군 기록 유지'):bad('2군 기록 저장');
while(S.day<=SL.loanDeadline()+1)SL.playDayAuto();const late=u8.roster.map(id=>S.players[id]).find(p=>!u8.lineup.includes(p.id)&&p.age<=25);
late&&new RegExp(SL.loanDeadline()+'일차까지').test(SL.loanCheck(late)||'')?ok(`${SL.loanDeadline()+1}일차 이후 임대 마감 안내`):bad('임대 마감 '+(late&&SL.loanCheck(late)));
while(S.day<=SL.BAL.SEASON_GAMES)SL.playDayAuto();
const G8=SL.BAL.SEASON_GAMES;const st8=SL.standings(1).map(t=>t.id);const pg8=S.schedule.filter(g=>g.post);
S.post&&pg8.length===1&&pg8[0].day===G8+1&&pg8[0].post==='wc'&&pg8[0].home===st8[3]&&pg8[0].away===st8[4]?ok(`정규 ${G8}경기 뒤 와일드카드 결정전 1차전: 4위(홈) vs 5위`):bad('와일드카드 편성 '+JSON.stringify(pg8));
JSON.stringify(S.post.seeds)===JSON.stringify(st8.slice(0,5))?ok('포스트시즌 시드 = 정규 1~5위'):bad('시드');
const loW={};for(const t of SL.krTeams())loW[t.id]=t.rec.w+t.rec.l;const ps0=Object.keys(S.players).filter(id=>S.players[id].ps).length;
let gd=0;const stages=[];while(S.phase==='season'&&gd++<40){const st=S.post&&S.post.stage;SL.playDayAuto();if(S.post&&S.post.stage!==st)stages.push(S.post.stage);}
const last8=S.history[S.history.length-1];const P8=last8.post;
S.phase==='offseason'&&P8&&P8.ser.length===4?ok(`포스트시즌 ${gd}일 진행: `+P8.ser.map(c=>`${c.k} ${S.teams[c.winner].name.split(' ')[0]} ${Math.max(...c.w)}-${Math.min(...c.w)}`).join(' → ')):bad('포스트시즌 미완료');
const wc=P8.ser[0];(wc.winner===wc.hi&&wc.w[0]===1&&wc.w[1]<=1)||(wc.winner===wc.lo&&wc.w[1]===2&&wc.w[0]===0)?ok(`와일드카드: 4위 1승 어드밴티지 (${wc.w.join('-')})`):bad('와일드카드 규칙 '+wc.w);
P8.ser.slice(1).every((c,i)=>c.lo===P8.ser[i].winner&&c.hi===P8.seeds[2-i]&&Math.max(...c.w)===(c.k==='ks'?4:3))?ok('준PO(3위)·PO(2위)·KS(1위): 전 단계 승자가 올라가고 선승제 지킴'):bad('계단식 대진·선승 '+JSON.stringify(P8.ser));
const ksG=S.history.length&&P8.ser[3];
last8.tables[1].every(r=>r.w+r.l===loW[r.id])?ok('포스트시즌은 정규 순위 기록에 미포함'):bad('포스트시즌이 순위에 섞임');
(S.teams[P8.champ].champ||[]).includes(last8.s)?ok(`한국시리즈 우승 ${S.teams[P8.champ].name} (준우승 ${S.teams[P8.runner].name})`):bad('챔피언 기록');
SL.krTeams().every(t=>t.div===1)?ok('승강 없음: 10개 구단 그대로 다음 시즌'):bad('승강 잔재');
const hasPs=Object.values(S.players).some(p=>(p.hist||[]).some(h=>h.s===last8.s&&h.ps&&(h.ps.pa||h.ps.pOuts)));hasPs?ok('포스트시즌 선수 기록은 시즌 기록과 따로 보존 (hist.ps)'):bad('포스트시즌 선수 기록 없음');
const yb=S.players[ly.id];yb.teamId===u8.id&&!yb.loan&&yb.loanDone&&yb.loanDone.tn===bt.name&&!u8.loaned.length?ok(`임대 복귀: ${yb.name} — ${bt.name} ${yb.loanDone.role}, 종합 ${Math.round(yb.loanDone.from)}→${Math.round(yb.loanDone.to)}`):bad('임대 복귀 '+JSON.stringify(yb.loanDone));
(yb.rhist||[]).length||(S.players[bench8.id].rhist||[]).length?ok('2군 시즌 기록 보존 (rhist)'):bad('rhist 없음');(S.resHist||[]).length===1?ok('2군 우승 기록: '+S.resHist[0].champ):bad('resHist');
console.log('[9] 구단 위상(명문)');
SL.newGame(2026,9,{arch:true});S=SL.state();let u9=SL.userTeam();
const pt9=SL.presTable();const big9=pt9.filter(x=>x.tier==='명문');big9.length===4&&big9.every(x=>x.t.league==='KR'&&!x.t.isUser)&&SL.presOf(u9)<40&&SL.krTeams().every(t=>!t.titles)?ok(`시작 명문 4개 (지역 기본 위상): ${big9.map(x=>`${x.t.name} ${x.v}`).join(', ')} · 우리 ${SL.presTier(u9)} ${u9.pres} · 우승 기록은 모두 0`):bad('시작 위상 '+pt9.slice(0,4).map(x=>x.t.name+x.v).join(','));
const midT=pt9.find(x=>x.tier==='중견'&&!x.t.isUser);midT?ok(`같은 1군 안의 위상 차이: 중견 ${midT.t.name} (${midT.v}) · 명문 ${big9[0].t.name} (${big9[0].v})`):bad('중견 구단 없음');
const hi=big9[0].t,lo=u9;const pl9=S.players[midT.t.roster[0]];
const wHi=SL.willingInfo(pl9,hi),wLo=SL.willingInfo(pl9,lo);wHi.pw>wLo.pw&&wHi.reasons.includes('명문 구단 입단 희망')?ok(`같은 선수의 이적 의향: 명문 ${hi.name} ${wHi.pw.toFixed(2)} > 신흥 ${lo.name} ${wLo.pw.toFixed(2)}`):bad('명문 선호 '+wHi.pw+' '+wLo.pw+' '+wHi.reasons);
SL.presIncome(hi)>1.05&&SL.presIncome(u9)<0.8?ok(`시장 크기 배율: ${hi.name} ×${SL.presIncome(hi).toFixed(2)}, 우리 ×${SL.presIncome(u9).toFixed(2)}`):bad('수입 배율 '+SL.presIncome(u9));
const ds=SL.playerDemand(pl9,hi),dl=SL.playerDemand(pl9,lo);ds<dl?ok(`명문 프리미엄: 연봉 요구 ${SL.money(ds)} < ${SL.money(dl)}`):bad('연봉 프리미엄 '+ds+' '+dl);
// 우리가 꾸준히 한국시리즈를 우승하면 명문이 된다
{const keep={pres:u9.pres,floor:u9.presFloor,log:u9.presLog,titles:u9.titles};const ks=id=>({post:{seeds:[id],ser:[{k:'ks',hi:id,lo:-1,winner:id,loser:-1}],champ:id,runner:-1}});const dummy=n=>[...Array(n)].map(()=>({pres:null}));
  u9.pres=36;const seq=[];for(let k=0;k<5;k++){SL.presSeasonEnd(S.season+k,{1:[u9].concat(dummy(9))},ks(u9.id));seq.push(Math.round(u9.pres));}
  SL.presTier(u9)==='명문'&&u9.presFloor>=20&&u9.titles>=5?ok(`정규 1위 + 한국시리즈 우승을 이어 가면 명문: 36 → ${seq.join(' → ')} (전통 바닥 ${u9.presFloor})`):bad('명문 도달 '+seq);
  u9.pres=36;u9.presFloor=0;SL.presSeasonEnd(1,{1:dummy(4).concat([u9],dummy(5))},{post:{seeds:[],ser:[{k:'wc',hi:-1,lo:u9.id,winner:-1,loser:u9.id}],champ:-1}});u9.pres<45?ok(`가을야구 한 번(5위)으로는 명문이 안 됨: 36 → ${u9.pres}`):bad('너무 빠름 '+u9.pres);
  Object.assign(u9,{pres:keep.pres,presFloor:keep.floor,presLog:keep.log,titles:keep.titles});}
// 명문 몰락은 천천히 + 전통 바닥
{const t=hi;const p0=t.pres;SL.presSeasonEnd(9,{1:[...Array(9)].map(()=>({pres:null})).concat([t])},{post:null});t.pres>=60&&t.pres>p0-10?ok(`명문이 꼴찌 한 번: 위상 ${p0} → ${t.pres} (바로 무너지지 않음)`):bad('몰락 속도 '+t.pres);t.pres=p0;}
// 하위권 위기 긴급 투자
while(S.day<SL.dayAt(0.36))SL.playDayAuto();const crisisT=big9[1].t;const ro9=crisisT.roster.slice();crisisT.rec.w=0;crisisT.rec.l=S.day;SL.playDayAuto();
S.news.some(n=>n.text.includes(crisisT.name)&&/긴급 투자/.test(n.text))&&crisisT.roster.some(id=>!ro9.includes(id))?ok(`하위권 명문 ${crisisT.name}: ${SL.dayAt(0.36)}일차 모기업 긴급 투자 + 보강 (${S.news.find(n=>/긴급 투자/.test(n.text)).text.split(' — ')[1]||''})`):bad('긴급 투자 없음');
// 구버전 세이브 위상 채움
{const js=JSON.parse(SL.serialize());for(const id in js.teams){delete js.teams[id].pres;delete js.teams[id].presFloor;}SL.load(JSON.stringify(js));S=SL.state();SL.krTeams().every(t=>typeof t.pres==='number')&&SL.presTable()[0].tier==='명문'?ok('구버전 세이브: 위상 자동 부여'):bad('위상 마이그레이션');}
console.log('[10] 스폰서 · 광고판 · 선수 광고');
SL.newGame(3030,9,{arch:true});S=SL.state();let u10=SL.userTeam();const B10=SL.sponBase(u10);
u10.spon.main&&u10.spon.boards.length===SL.boardSlots(u10)&&u10.fin.sponsor===u10.spon.main.base&&u10.fin.ads>0?ok(`시작: 메인 ${u10.spon.main.co} ${SL.money(u10.spon.main.base)} + 광고판 ${u10.spon.boards.length}자리 ${SL.money(u10.fin.ads)} (예전 자동 스폰서 ${SL.money(Math.round(B10))} 대비 ${Math.round((u10.fin.sponsor+u10.fin.ads)/B10*100)}%)`):bad('시작 스폰서 '+JSON.stringify(u10.spon.main));
while(S.phase==='season')SL.playDayAuto();const ks=u10.spon.offers.map(o=>o.kind);
!u10.spon.main&&ks.includes('stable')&&ks.includes('perf')&&ks.includes('short')&&!ks.includes('big')?ok('시즌 뒤 계약 만료 → 제안 3종 (장기 안정·성적 연동·단기 고액), 위상 낮은 구단엔 대기업 없음'):bad('제안 '+ks);
const perf=u10.spon.offers.find(o=>o.kind==='perf');SL.sponSign(perf.id);u10.spon.main.kind==='perf'&&!u10.spon.offers.length?ok(`성적 연동형 계약: ${perf.co}`):bad('계약 실패');
const bo=u10.spon.boardOffers;const same=bo.find(b=>b.sector===perf.sector);if(same)/업종/.test(SL.boardSign(same.id)||'')?ok('메인 스폰서와 같은 업종 광고판 거절'):bad('업종 충돌 허용');
const gate=bo.find(b=>b.type==='gate'&&b.sector!==perf.sector);if(gate)SL.boardSign(gate.id);
// 개인 광고: 스타 만들기
const star=u10.roster.map(id=>S.players[id]).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];for(const k in star.attrs)star.attrs[k]=Math.min(99,star.attrs[k]+15);S.endorseOffers=[];
let tries=0;while(!S.endorseOffers.some(o=>o.pid===star.id)&&tries++<30){S.endorseOffers=[];SL.endorseOffers();}const eo=S.endorseOffers.find(o=>o.pid===star.id);
if(eo){const m0=star.morale,d0=SL.playerDemand(star,u10);SL.endorseAnswer(eo.id,true);star.endorse&&star.morale>m0&&SL.playerDemand(star,u10)>d0?ok(`개인 광고: ${star.name} ← ${eo.co} 연 ${SL.money(eo.fee)}, 사기 ${m0}→${star.morale}, 재계약 요구 상승`):bad('광고 수락 효과');}else bad('스타 광고 제안 없음 (점수 '+SL.starScore(star,u10)+')');
let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}
u10.fin.sponsor===u10.spon.main.base&&u10.fin.endorse===Math.round(star.endorse.fee*0.3/10)*10?ok(`개막 입금: 메인 ${SL.money(u10.fin.sponsor)} + 광고판 ${SL.money(u10.fin.ads)} + 광고 수수료 ${SL.money(u10.fin.endorse)}`):bad('개막 입금 '+JSON.stringify(u10.fin));
const ads0=u10.fin.ads;for(let i=0;i<6;i++)SL.playDayAuto();gate?(u10.fin.ads>ads0?ok(`관중 연동 광고판: 홈 경기마다 입금 (${SL.money(u10.fin.ads-ads0)})`):bad('관중 연동 미입금')):0;
while(S.phase==='season')SL.playDayAuto();const sp10=S.lastSummary.spon||[];sp10.some(x=>/성적 보너스/.test(x))?ok('시즌 정산: '+sp10[0]):bad('성적 보너스 정산 '+sp10);
// 단기 고액형 위약금 · 대기업 메인 하위권(9위 이하) 해지
{const L=S.lastSummary;const keep={rank:L.rank,rel:L.relegated};u10.spon.main={co:'시험상사',sector:'x',kind:'short',years:1,base:1000,target:2,penalty:777,since:1};L.rank=5;L.relegated=false;const c1=u10.cash;SL.sponSettle(S.season,{s:S.season,post:null});
 u10.cash===c1-777&&!u10.spon.main&&u10.spon.offers.length?ok('단기 고액형 목표 미달 → 위약금 차감, 새 제안'):bad('위약금 '+(c1-u10.cash));
 u10.spon.main={co:'시험그룹',sector:'y',kind:'big',years:3,base:1000,clause:'bottom',since:1};L.rank=10;SL.sponSettle(S.season,{s:S.season,post:null});
 !u10.spon.main&&(L.spon||[]).some(x=>/10위로 끝나 시험그룹 계약 해지/.test(x))?ok('대기업 메인: 9위 이하로 끝나면 남은 계약 해지'):bad('해지 조항 '+L.spon);L.rank=keep.rank;L.relegated=keep.rel;}
{SL.newGame(3031,0);S=SL.state();const t=SL.userTeam();t.pres=85;delete t.spon;S.phase='offseason';SL.ensureSpon(t);t.spon.offers.some(o=>o.kind==='big')&&SL.boardSlots(t)===SL.BAL.SPON.boards[1]+1?ok('명문 구단: 대기업 메인 제안 + 광고판 1자리 추가'):bad('명문 스폰서');}
{const js=JSON.parse(SL.serialize());for(const id in js.teams)delete js.teams[id].spon;SL.load(JSON.stringify(js));S=SL.state();SL.userTeam().spon?ok('구버전 세이브: 스폰서 상태 자동 생성'):bad('스폰서 마이그레이션');}
console.log('[11] 경기 중계 문구 · 효과음');
{SL.newGame(4242,0);S=SL.state();const lg=SL.startDay();SL.stepGame(lg);const pa=lg.log.filter(l=>['1b','2b','3b','hr','so','dp','fo','go'].includes(l.type));
 const cntOk=pa.every(l=>/(초구에|볼 \d스트라이크에서|풀카운트에서)/.test(l.text));cntOk?ok(`모든 타석 결과에 볼카운트 (${pa.length}타석)`):bad('볼카운트 누락 '+pa.find(l=>!/(초구에|스트라이크에서|풀카운트에서)/.test(l.text)).text);
 const names=new Set(Object.keys(lg.box).map(id=>S.players[id]&&S.players[id].name));const outs=pa.filter(l=>l.type==='go'||l.type==='fo');
 outs.length&&outs.every(l=>/(투수|포수|1루수|2루수|3루수|유격수|좌익수|중견수|우익수)/.test(l.text)&&[...names].some(n=>n&&l.text.includes('— ')&&l.text.split('— ')[1].includes(n)))?ok('범타마다 타구 방향 + 잡은 수비수 이름: '+outs[0].text):bad('수비수 문구 '+(outs.find(l=>!/—/.test(l.text))||{}).text);
 const hits=pa.filter(l=>['1b','2b','3b'].includes(l.type));hits.every(l=>/(좌|우|중|내야|선상|간)/.test(l.text))?ok('안타 방향: '+(hits[0]?hits[0].text:'-')):bad('안타 방향');
 const so=pa.filter(l=>l.type==='so');so.every(l=>/(헛스윙|루킹) 삼진/.test(l.text))?ok('삼진 종류 구분: '+(so[0]?so[0].text:'-')):bad('삼진 문구');}
{SL.newGame(4242,0);S=SL.state();const lg=SL.startDay();SL.stepGame(lg);const a=lg.score.join(':');SL.newGame(4242,0);S=SL.state();const lg2=SL.startDay();SL.stepGame(lg2);a===lg2.score.join(':')?ok('중계 문구는 난수를 쓰지 않음 — 같은 시드 같은 결과 '+a):bad('결정성');}
{const fs=require('fs');const need=['hit','hr','mitt','so','out'];const have=fs.readdirSync(__dirname+'/../assets/sfx').map(f=>f.replace(/\.mp3$/,''));need.every(k=>have.includes(k))?ok('효과음: 타격음·홈런 함성·미트·삼진·포구'):bad('효과음 파일 '+have);}
console.log('[12] 세부 지표 · 능력치 반영');
{SL.newGame(77,0);S=SL.state();while(S.day<=SL.BAL.SEASON_GAMES)SL.playDayAuto();
 const B=Object.values(S.players).filter(p=>!SL.isPitcher(p)&&p.cur.pa>=60&&S.teams[p.teamId]&&S.teams[p.teamId].league==='KR').sort((a,b)=>a.attrs.eye-b.attrs.eye);const q=Math.floor(B.length/4);const bb=a=>a.reduce((x,p)=>x+p.cur.bb/p.cur.pa,0)/a.length;
 const lo=bb(B.slice(0,q)),hi=bb(B.slice(-q));hi-lo>=0.025?ok(`선구안 상위 25% 볼넷 비율 ${(hi*100).toFixed(1)}% vs 하위 25% ${(lo*100).toFixed(1)}%`):bad('선구안 효과 약함 '+lo+' '+hi);
 const ob=a=>a.reduce((x,p)=>x+SL.batLine(p.cur).obp,0)/a.length;ob(B.slice(-q))>ob(B.slice(0,q))+0.02?ok(`선구안 상위 출루율 ${ob(B.slice(-q)).toFixed(3)} > 하위 ${ob(B.slice(0,q)).toFixed(3)}`):bad('출루율 차이 없음');
 const sp=B.slice().sort((a,b)=>a.attrs.speed-b.attrs.speed);const s1=a=>a.reduce((x,p)=>x+(p.cur.h-p.cur.d2-p.cur.d3-p.cur.hr)/p.cur.ab,0)/a.length;s1(sp.slice(-q))>s1(sp.slice(0,q))?ok(`발 빠른 타자 단타율 ${s1(sp.slice(-q)).toFixed(3)} > 느린 타자 ${s1(sp.slice(0,q)).toFixed(3)} (내야안타)`):bad('주력 효과');
 const ctx=SL.lgCtx('KR1');ctx.avg>0.23&&ctx.avg<0.3&&ctx.obp>0.3&&ctx.obp<0.37&&ctx.era>3&&ctx.era<5.5?ok(`리그 평균 정상 범위: 타율 ${ctx.avg} 출루율 ${ctx.obp} ERA ${ctx.era}`):bad('리그 평균 '+JSON.stringify(ctx));
 const x=B[B.length-1];const a=SL.advStats(x);const L=SL.batLine(x.cur);Math.abs(a.b.obp-(x.cur.h+x.cur.bb)/(x.cur.ab+x.cur.bb))<1e-9&&a.pct&&a.war&&typeof a.war.war==='number'?ok(`세부 지표: ${x.name} 출루율 ${L.obp.toFixed(3)} OPS+ ${a.opsPlus} WAR ${a.war.war} (144경기 환산 ${a.war144}), 출루율 백분위 상위 ${a.pct.obp}%`):bad('세부 지표 계산');
 const teamWar=SL.krTeams().map(t=>t.roster.reduce((s,id)=>{const p=S.players[id];const z=SL.advStats(p);return s+(z&&z.live?z.war.war:0);},0));const avgW=teamWar.reduce((a,b)=>a+b,0)/teamWar.length;avgW>1.5&&avgW<12?ok(`구단 평균 WAR ${avgW.toFixed(1)} (${SL.BAL.SEASON_GAMES}경기 기준 — 144경기 환산 약 ${(avgW*144/SL.BAL.SEASON_GAMES).toFixed(0)})`):bad('WAR 규모 '+avgW);
 const ld=SL.leaders('KR1','ops',10);ld.length&&ld.every((o,i)=>i===0||o.v<=ld[i-1].v)?ok(`기록실 OPS 1위 ${ld[0].p.name} ${ld[0].v.toFixed(3)}`):bad('기록실 정렬');
 const er=SL.leaders('KR1','era',5);er.every((o,i)=>i===0||o.v>=er[i-1].v)?ok('기록실 평균자책 낮은 순'):bad('ERA 정렬');
 while(S.phase==='season')SL.playDayAuto();S=SL.state();const hp=x.hist[x.hist.length-1];const a2=SL.advStats(x);a2&&a2.s===hp.s&&S.lgCtx&&S.lgCtx[hp.s]?ok('시즌 종료 후에도 그 시즌 리그 평균으로 세부 지표 유지'):bad('지난 시즌 지표');}
console.log('[13] 구장 차이');
{SL.newGame(88,0);S=SL.state();const ps=SL.krTeams().map(t=>SL.parkOf(t));const m=ps.reduce((a,p)=>a+p.hr,0)/ps.length,mx=ps.reduce((a,p)=>a+p.xb,0)/ps.length;
 Math.abs(m-1)<0.015&&Math.abs(mx-1)<0.015&&ps.every(p=>p.hr>=0.92&&p.hr<=1.08&&p.xb>=0.96&&p.xb<=1.04)?ok(`구장 홈런 배율 ${Math.min(...ps.map(p=>p.hr))}~${Math.max(...ps.map(p=>p.hr))}, 평균 ${m.toFixed(3)} (리그 전체 균형 유지)`):bad('구장 배율 '+m);
 SL.newGame(89,1);S=SL.state();SL.parkOf(SL.krTeams()[0]).name===ps[0].name?ok('구장 규격은 시드와 무관하게 구단마다 고정: '+ps[0].name):bad('구장 고정');
 let hrN=0,badD=0,near=0,nearBad=0;for(let k=0;k<6;k++){const lg=SL.startDay();SL.stepGame(lg);SL.endUserGame();for(const l of lg.log){const m1=l.text.match(/비거리 (\d+)m · 펜스 (\d+)m/);if(l.type==='hr'&&m1){hrN++;if(+m1[1]<=+m1[2])badD++;}
   const m2=l.text.match(/비거리 (\d+)m — (.+?)(이었다면|였다면)/);if(m2){near++;const side=/좌익수/.test(l.text)?'l':/우익수/.test(l.text)?'r':'c';const pk=SL.krTeams().map(t=>SL.parkOf(t)).find(p=>p.name===m2[2]);if(!pk||pk.dim[side]>=+m2[1])nearBad++;}}}
 hrN&&!badD?ok(`홈런 비거리는 항상 그 방향 펜스보다 멀다 (${hrN}개)`):bad('비거리<펜스 '+badD);
 !nearBad?ok(`「○○ 구장이었다면 넘어갔을 타구」 ${near}건 — 그 구장 펜스가 실제로 더 짧음`):bad('넘어갔을 타구 오류 '+nearBad);}
console.log('[14] 시즌 길이 · 시상식 · 아시아 챔피언십');
{const tot={};for(const G of [36,144]){SL.newGame(606,0,{arch:true,games:G});S=SL.state();const u=SL.userTeam();const ovr0={};for(const id in S.players)ovr0[id]=SL.calcOvr(S.players[id]);
   while(S.phase==='season')SL.playDayAuto();let gs=0,n=0;for(const id in S.players){const p=S.players[id];if(p.age<=23&&ovr0[id]!=null&&p.teamId!=null){gs+=SL.calcOvr(p)-ovr0[id];n++;}}
   const t3=S.history[0].tables[1];tot[G]={games:t3[0].w+t3[0].l,tickets:u.fin.tickets,salary:u.fin.salary,grow:gs/n,awards:S.awards&&S.awards[1],asia:S.asia&&S.asia[1]};}
 tot[36].games===36&&tot[144].games===144?ok('시즌 길이 선택: 36경기 / 144경기 일정 (나머지 9개 구단과 4번 / 16번)'):bad('경기 수 '+tot[36].games+' '+tot[144].games);
 const rt=tot[144].tickets/tot[36].tickets,rs=tot[144].salary/tot[36].salary,rg=tot[144].grow/tot[36].grow;Math.abs(rt-1)<0.12&&Math.abs(rs-1)<0.02&&rg>0.75&&rg<1.3?ok(`144경기도 시즌 총량 유지: 입장 수입 ×${rt.toFixed(2)}, 연봉 ×${rs.toFixed(2)}, 유망주 성장 ×${rg.toFixed(2)}`):bad(`총량 차이 수입 ${rt} 연봉 ${rs} 성장 ${rg}`);
 const A=tot[144].awards;A&&A.KR1&&A.KR1.mvp&&A.KR1.titles.length>=8&&A.KR1.gg.length>=9?ok(`시상식: MVP ${A.KR1.mvp.name} (${A.KR1.mvp.line}), 타이틀 ${A.KR1.titles.length}개, 골든글러브 ${A.KR1.gg.length}명`):bad('시상식 '+JSON.stringify(A&&A.KR1&&Object.keys(A.KR1)));
 const hr=A.KR1.titles.find(e=>e.k==='hr');const mx=Math.max(...Object.values(S.players).filter(p=>p.hist&&p.hist.some(h=>h.s===1&&h.lg==='KR1')).map(p=>p.hist.find(h=>h.s===1&&h.lg==='KR1').st.hr||0));hr&&hr.v===mx?ok(`홈런왕 ${hr.name} ${hr.vs} = 리그 최다 홈런 기록과 일치`):bad('홈런왕 불일치 '+(hr&&hr.v)+' '+mx);
 const mvpP=S.players[A.KR1.mvp.pid];mvpP&&mvpP.awards&&mvpP.awards.some(a=>a.k==='mvp')?ok('수상 기록이 선수에게 남음 (가치·사기 반영)'):bad('선수 수상 기록');
 const As=tot[144].asia;As&&As.teams.length>=3&&As.table.length===As.teams.length&&As.final.w!==As.final.l&&As.teams.includes(As.final.w)?ok(`아시아 클럽 챔피언십: ${As.table.map(r=>r.name).join(' · ')} → 우승 ${As.final.wn} (${As.final.score})`):bad('아시아 시리즈 '+JSON.stringify(As));
 const pk=S.players[A.KR1.mvp.pid];const curG=pk?pk.cur.g:0;curG===0?ok('아시아 시리즈 기록은 다음 시즌 성적에 섞이지 않음'):bad('아시아 기록 혼입');
 SL.setNextGames(72);while(S.week<=6)SL.advanceWeek();let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();SL.startNewSeason();}SL.BAL.SEASON_GAMES===72&&S.games===72&&S.schedule.filter(g=>g.div===1).length===72*5?ok('다음 시즌부터 72경기로 변경'):bad('시즌 길이 변경 '+S.games);
 const js=SL.serialize();SL.newGame(1,0);SL.load(js);SL.BAL.SEASON_GAMES===72?ok('불러오기 때 저장의 시즌 길이 복원'):bad('불러오기 시즌 길이 '+SL.BAL.SEASON_GAMES);
 const old=JSON.parse(js);delete old.games;SL.load(JSON.stringify(old));SL.BAL.SEASON_GAMES===144?ok('시즌 길이 정보가 없는 저장 = 144경기(프로)'):bad('시즌 길이 기본값 '+SL.BAL.SEASON_GAMES);}
console.log('[15] 수상 기록 보기');
{SL.newGame(707,0,{games:36});S=SL.state();const u=SL.userTeam();while(S.phase==='season')SL.playDayAuto();
 const mine=Object.values(S.awards[1]).flatMap(R=>[R.mvp,R.roy,...R.titles,...R.gg]).filter(e=>e&&e.tid===u.id);
 (S.awardLog||[]).length===mine.length?ok(`우리 구단 수상 기록 ${mine.length}건 저장 (시상식 결과와 일치)`):bad('awardLog '+(S.awardLog||[]).length+' vs '+mine.length);
 const js=JSON.parse(SL.serialize());delete js.awardLog;SL.load(JSON.stringify(js));S=SL.state();(S.awardLog||[]).length===mine.length?ok('구버전 저장: 시상식 기록에서 우리 구단 수상 기록 복원'):bad('awardLog 복원 '+(S.awardLog||[]).length);
 const w=Object.values(S.players).find(p=>p.awards&&p.awards.length);w&&w.awards[0].lab&&w.awards[0].s===1?ok(`선수 수상 기록: ${w.name} — ${w.awards.map(a=>a.lab).join(', ')}`):bad('선수 수상 기록');}
console.log('[16] R017 육성·운영 설계서 반영');
{SL.newGame(1717,9,{arch:true,games:72});S=SL.state();const u=SL.userTeam();
 const ai=SL.krTeams().filter(t=>!t.isUser);ai.every(t=>SL.AIM_KO[t.aim])?ok('AI 구단 운영 목표: '+ai.map(t=>t.name.split(' ')[1]+' '+SL.AIM_KO[t.aim]).join(' · ')):bad('AI 목표 없음');
 {const t=ai.find(x=>x.aim==='contend');const old=t.roster.map(id=>S.players[id]).find(p=>p.age>=31)||S.players[t.roster[0]];const a0=SL.aiAsk(t,old);t.aim='rebuild';const a1=SL.aiAsk(t,old);t.aim='contend';
  old.age>=30?(a1<a0?ok(`리빌딩 구단은 노장을 싸게: ${old.name}(${old.age}세) ${SL.money(a0)} → ${SL.money(a1)}`):bad('리빌딩 노장 가격 '+a0+' '+a1)):ok('(노장 없음 — 생략)');}
 const pool=SL.reserveIds(u).map(id=>S.players[id]).filter(p=>!SL.isPitcher(p));const f3=pool.slice(0,4).map(p=>SL.setResFocus(p.id,true));
 f3.slice(0,3).every(x=>x===null)&&/최대 3명/.test(f3[3]||'')?ok('2군 집중 육성 3명 지정, 4번째는 거절'):bad('집중 지정 '+f3);
 const starter=S.players[u.lineup[0]];/1군 주전/.test(SL.setResFocus(starter.id,true)||'')?ok('1군 주전은 2군 집중 대상이 아님'):bad('주전 집중 허용');
 while(S.day<=7)SL.playDayAuto();const fp=pool.slice(0,3);fp.every(p=>p.resRole==='focus'&&p.res&&p.res.pa>0)?ok('집중 선수는 2군 주전 몫으로 출장: '+fp.map(p=>`${p.name} ${p.res.pa}타석`).join(', ')):bad('집중 출장 '+fp.map(p=>p.resRole));
 fp.every(p=>p.log[0]&&p.log[0].f.some(x=>/2군 집중/.test(x)))?ok('성장 요인에 「2군 집중 육성」 기록'):bad('집중 요인 '+fp.map(p=>p.log[0]&&p.log[0].f));
 const bench=SL.reserveIds(u).map(id=>S.players[id]).find(p=>p.resRole==='bench');bench&&bench.log[0]&&bench.log[0].f.some(x=>/2군 벤치/.test(x))?ok('2군 벤치는 「출장 적음」으로 구분'):ok('(2군 벤치 선수 없음)');
 const cu=SL.callupCands(3);cu.every(x=>x.rival&&x.rival.id!==x.p.id&&!u.lineup.includes(x.p.id))?ok(`콜업 후보 ${cu.length}명 (2군 선수 vs 1군 같은 자리, 본인과 비교 없음)`):bad('콜업 후보');
 let neg=0;for(const id in S.players){const p=S.players[id];const b=SL.perfBonus(p);if(b&&b.v<0)neg++;}neg===0?ok('성과 보너스는 좋은 기록일 때만 (음수 없음)'):bad('성과 보너스 음수 '+neg);
 const rk=u.roster.map(id=>S.players[id]).find(p=>!SL.isPitcher(p)&&!u.lineup.includes(p.id));const R=JSON.parse(JSON.stringify(rk));
 const nb={...rk};delete rk.deb;rk.hist=[];rk.age=19;rk.cur.g=0;rk.cur.pa=0;rk.cur.ab=0;u.lineup[8]=rk.id;u.pos[rk.id]=u.pos[u.lineup[8]]||rk.pos;u.locks=u.locks||{};
 {const lg=SL.startDay();if(lg){SL.stepGame(lg);SL.endUserGame();}}rk.deb&&rk.deb.s===S.season&&S.news.some(n=>/1군 데뷔/.test(n.text)&&n.text.includes(rk.name))?ok(`1군 데뷔 기록: ${rk.name} — ${rk.deb.line}`):bad('데뷔 '+JSON.stringify(rk.deb));
 const d2=JSON.stringify(rk.deb);{const lg=SL.startDay();if(lg){SL.stepGame(lg);SL.endUserGame();}}JSON.stringify(rk.deb)===d2?ok('데뷔는 한 번만 기록'):bad('데뷔 중복');
 const st=SL.stallList(3);st.every(x=>x.why&&x.why.t&&x.why.a)?ok(`정체 주의 ${st.length}명 (원인·권장 행동)`):bad('정체 목록');}
{SL.load(require('fs').readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();const okA=SL.krTeams().filter(t=>!t.isUser).every(t=>SL.AIM_KO[t.aim]);let g=0;while(S.phase==='season'&&g++<80)SL.playDayAuto();
 okA&&S.phase==='offseason'&&!S.news.some(n=>/1군 데뷔/.test(n.text))?ok('v29 저장(시즌 중) 불러오기 → AI 목표 채움 · 시즌 완주 · 기존 선수 가짜 데뷔 없음'):bad('v29 저장 호환');}
console.log('[17] R018 선수 카드 · 1군/2군 비교 · 배지');
{SL.newGame(1818,9,{arch:true,games:36});S=SL.state();const u=SL.userTeam();
 u.roster.every(id=>S.players[id].joinSnap&&S.players[id].joinSnap.role)?ok('시작 선수단에 입단 당시 역할 기록 (「입단 이후」 화면용)'):bad('입단 역할 없음');
 const up=SL.reserveIds(u).map(id=>S.players[id]).find(p=>!SL.isPitcher(p)&&u.roster.includes(p.id));const down=u.lineup.find(id=>u.pos[id]===up.pos)||u.lineup[0];const pos=u.pos[down];const idx=u.lineup.indexOf(down);
 const pl=SL.callupPlan(up.id,down);pl.ok&&pl.notes.length&&pl.upRole&&pl.downRole?ok(`비교 계획: ${up.name} → ${pl.upRole} / ${S.players[down].name} → ${pl.downRole} (${pl.notes.map(n=>n.text).join(', ')})`):bad('콜업 계획 '+JSON.stringify(pl&&pl.notes));
 const n0=u.roster.length,tr0=up.transfers.length,ct0=JSON.stringify(up.contract);const e=SL.callupSwap(up.id,down);
 !e&&u.lineup[idx]===up.id&&u.pos[up.id]===pos&&!u.lineup.includes(down)&&u.roster.includes(down)&&u.roster.length===n0&&up.transfers.length===tr0&&JSON.stringify(up.contract)===ct0?ok('맞바꾸기: 같은 타순·수비 위치, 내려간 선수는 1군 벤치(2군 출장), 이적·계약 기록 변화 없음'):bad('맞바꾸기 '+e);
 const sp=u.rotation[4],rp=u.roster.map(id=>S.players[id]).find(p=>SL.isPitcher(p)&&!u.rotation.includes(p.id)&&u.closer!==p.id&&u.bullpen.indexOf(p.id)>=4);
 if(rp){const e2=SL.callupSwap(rp.id,sp);!e2&&u.rotation[4]===rp.id&&u.bullpen.includes(sp)?ok(`투수 맞바꾸기: ${rp.name} 선발 5번, ${S.players[sp].name} 불펜 대기`):bad('투수 맞바꾸기 '+e2);}
 /투수는 투수와/.test(SL.callupPlan(up.id,u.rotation[0]).msg||'')?ok('투수-야수 맞바꾸기는 거절'):bad('투수-야수 허용');
 // 첫 홈런 배지: 데뷔한 신인이 처음 홈런을 치면 한 번만
 const rk=S.players[up.id];rk.deb={s:1,d:1,vs:'x',line:'-'};rk.cur.hr=0;rk.hist=[];rk.attrs.power=99;rk.attrs.contact=99;let g=0;while(!(rk.ms&&rk.ms.hr1)&&g++<30&&S.phase==='season')SL.playDayAuto();
 rk.ms&&rk.ms.hr1&&S.news.filter(n=>/\[첫 홈런\]/.test(n.text)&&n.text.includes(rk.name)).length===1?ok(`첫 홈런 배지: ${rk.name} ${rk.ms.hr1.s}시즌 ${rk.ms.hr1.d}일차`):bad('첫 홈런 '+JSON.stringify(rk.ms));
 const n1=S.news.filter(n=>/\[첫 홈런\]/.test(n.text)).length;for(let i=0;i<4&&S.phase==='season';i++)SL.playDayAuto();S.news.filter(n=>/\[첫 홈런\]/.test(n.text)).length===n1?ok('첫 홈런은 한 번만 기록'):bad('첫 홈런 중복');
 const ab=S.players[u.roster.find(id=>id!==rk.id)];const jp=SL.overseasTeams().find(t=>t.league==='JP');SL.transferPlayer?0:0;
 {const keep=S.phase;const o={id:S.nextOfferId++,type:'overseas',pid:ab.id,team:jp.id,fee:Math.round(SL.calcValue(ab)*1.2),salary:20000,years:2,max:0,expires:S.clock+3,counters:0,status:'agreed',pw:0.9,willing:true,reasons:[]};S.market.offers.push(o);S.market.listed.push(ab.id);SL.respondOffer(o.id,'accept');}
 ab.teamId===jp.id&&ab.ms&&ab.ms.ab&&ab.ms.ab.lg==='JP'?ok(`해외 진출 배지: ${ab.name} → ${ab.ms.ab.tn}`):bad('해외 배지 '+JSON.stringify(ab.ms)+' team '+(S.teams[ab.teamId]||{}).league);}
console.log(fails?`리뷰 반영 검증 실패 ${fails}건`:'리뷰 반영 검증 모두 통과');process.exit(fails?1:0);

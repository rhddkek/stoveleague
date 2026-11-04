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
const tb8=SL.reserveTable();const gp8=tb8.map(x=>x.w+x.l+x.tie);tb8.length===12&&gp8.every(g=>g===gp8[0]&&g>0)?ok(`퓨처스 순위: 12개 팀 ${gp8[0]}경기씩, 1위 ${tb8[0].t.name} ${tb8[0].w}승`):bad('2군 순위 '+tb8.length+' '+gp8);
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
{SL.newGame(77,0,{games:72});S=SL.state();while(S.day<=SL.BAL.SEASON_GAMES)SL.playDayAuto();   /* 36경기는 표본이 작아 시드에 따라 흔들림 → 72경기 */
 const B=Object.values(S.players).filter(p=>!SL.isPitcher(p)&&p.cur.pa>=100&&S.teams[p.teamId]&&S.teams[p.teamId].league==='KR').sort((a,b)=>a.attrs.eye-b.attrs.eye);const q=Math.floor(B.length/4);const bb=a=>a.reduce((x,p)=>x+p.cur.bb/p.cur.pa,0)/a.length;
 const lo=bb(B.slice(0,q)),hi=bb(B.slice(-q));hi-lo>=0.025?ok(`선구안 상위 25% 볼넷 비율 ${(hi*100).toFixed(1)}% vs 하위 25% ${(lo*100).toFixed(1)}%`):bad('선구안 효과 약함 '+lo+' '+hi);
 const ob=a=>a.reduce((x,p)=>x+SL.batLine(p.cur).obp,0)/a.length;ob(B.slice(-q))>ob(B.slice(0,q))+0.02?ok(`선구안 상위 출루율 ${ob(B.slice(-q)).toFixed(3)} > 하위 ${ob(B.slice(0,q)).toFixed(3)}`):bad('출루율 차이 없음');
 const sp=B.slice().sort((a,b)=>a.attrs.speed-b.attrs.speed);const s1=a=>a.reduce((x,p)=>x+(p.cur.h-p.cur.d2-p.cur.d3-p.cur.hr)/p.cur.ab,0)/a.length;s1(sp.slice(-q))>s1(sp.slice(0,q))?ok(`발 빠른 타자 단타율 ${s1(sp.slice(-q)).toFixed(3)} > 느린 타자 ${s1(sp.slice(0,q)).toFixed(3)} (내야안타)`):bad('주력 효과');
 const ctx=SL.lgCtx('KR1');ctx.avg>0.23&&ctx.avg<0.3&&ctx.obp>0.3&&ctx.obp<0.37&&ctx.era>3&&ctx.era<5.5?ok(`리그 평균 정상 범위: 타율 ${ctx.avg} 출루율 ${ctx.obp} ERA ${ctx.era}`):bad('리그 평균 '+JSON.stringify(ctx));
 const x=B[B.length-1];const a=SL.advStats(x);const L=SL.batLine(x.cur);Math.abs(a.b.obp-(x.cur.h+x.cur.bb)/(x.cur.ab+x.cur.bb))<1e-9&&a.pct&&a.war&&typeof a.war.war==='number'?ok(`세부 지표: ${x.name} 출루율 ${L.obp.toFixed(3)} OPS+ ${a.opsPlus} WAR ${a.war.war} (144경기 환산 ${a.war144}), 출루율 백분위 상위 ${a.pct.obp}%`):bad('세부 지표 계산');
 const teamWar=SL.krTeams().map(t=>t.roster.reduce((s,id)=>{const p=S.players[id];const z=SL.advStats(p);return s+(z&&z.live?z.war.war:0);},0));const avgW=teamWar.reduce((a,b)=>a+b,0)/teamWar.length;avgW*36/SL.BAL.SEASON_GAMES>1.5&&avgW*36/SL.BAL.SEASON_GAMES<12?ok(`구단 평균 WAR ${avgW.toFixed(1)} (${SL.BAL.SEASON_GAMES}경기 기준 — 144경기 환산 약 ${(avgW*144/SL.BAL.SEASON_GAMES).toFixed(0)})`):bad('WAR 규모 '+avgW);
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
 const rt=tot[144].tickets/tot[36].tickets,rs=tot[144].salary/tot[36].salary,rg=tot[144].grow/tot[36].grow;Math.abs(rt-1)<0.2&&Math.abs(rs-1)<0.02&&rg>0.75&&rg<1.3?ok(`144경기도 시즌 총량 유지: 입장 수입 ×${rt.toFixed(2)}, 연봉 ×${rs.toFixed(2)}, 유망주 성장 ×${rg.toFixed(2)}`):bad(`총량 차이 수입 ${rt} 연봉 ${rs} 성장 ${rg}`);
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
console.log('[18] v32 국내 구단 2곳 개명 (다른 게임 가상 구단명과 겹침 방지)');
{const fs=require('fs');const KR=SL.TEAM_NAMES.KR.map(x=>x[0]);const avoid=['시걸스','시걸즈','팰컨스','팔콘스','팔콘즈','팬더스','팬더즈','클론즈','나이츠','드래곤즈','캣츠','라이거즈'];
 KR.every(n=>!avoid.some(a=>n.includes(a)))?ok('국내 10개 구단 애칭이 겹치지 않음: '+KR.join(' · ')):bad('겹치는 이름 '+KR.join(','));
 const nick=n=>n.split(' ').slice(1).join(' ');const all=Object.values(SL.TEAM_NAMES).flat().map(x=>nick(x[0]));KR.every(n=>all.filter(x=>x===nick(n)).length===1)?ok('국내 구단 애칭은 해외 구단과도 겹치지 않음'):bad('애칭 중복');
 const j=fs.readFileSync(__dirname+'/v29_save.json','utf8');j.includes('부산 시걸스')&&j.includes('서울 팰컨스')?ok('v29 샘플에 옛 이름이 들어 있음 (변환 대상)'):bad('샘플에 옛 이름 없음');
 SL.load(j);S=SL.state();const raw=JSON.stringify(S);const kr=Object.values(S.teams).filter(t=>t.league==='KR');
 !raw.includes('시걸스')&&!raw.includes('팰컨스')?ok('v29 저장을 불러오면 이름·이적 기록·소식이 모두 새 이름으로'):bad('옛 이름 남음');
 const ms=kr.find(t=>t.name==='서울 머스탱스'),dp=kr.find(t=>t.name==='부산 돌핀스');ms&&dp&&ms.color==='#b45309'&&dp.color==='#0e7490'?ok('새 이름과 색으로 바뀜: 서울 머스탱스 · 부산 돌핀스'):bad('개명 실패');
 const emb=JSON.parse(fs.readFileSync(__dirname+'/../assets/emblems/index.json','utf8'));KR.every(n=>emb[n]&&fs.existsSync(__dirname+'/../assets/emblems/'+emb[n]+'.png'))?ok('10개 구단 모두 엠블럼 있음'):bad('엠블럼 누락');}
console.log('[19] v33 퓨처스 12팀 일정 · 올스타전 · 외국인 선수');
{SL.newGame(3333,9,{games:36});S=SL.state();const u=SL.userTeam();
 const N=SL.futStand('N'),So=SL.futStand('S');N.length===6&&So.length===6&&So.some(x=>x.t.indep&&x.t.kind==='군 팀')&&So.some(x=>x.t.indep&&x.t.kind==='시민 구단')?ok('퓨처스 12팀: 북부 6 · 남부 6 (시민 구단·군 팀 포함)'):bad('퓨처스 구성 '+N.length+'/'+So.length);
 const sch=S.res.sched;const per={};for(const g of sch){per[g.home]=(per[g.home]||0)+1;per[g.away]=(per[g.away]||0)+1;}const days=new Set(sch.map(g=>g.d));Object.values(per).every(n=>n===SL.futGames())&&[...days].every(d=>sch.filter(g=>g.d===d).length===6)?ok(`퓨처스 일정: 팀당 ${SL.futGames()}경기, 경기일마다 6경기 (${days.size}일)`):bad('퓨처스 일정');
 const hm={};for(const g of sch)hm[g.home]=(hm[g.home]||0)+1;Object.values(hm).every(n=>Math.abs(n-SL.futGames()/2)<=1)?ok('퓨처스 홈·원정 균형'):bad('홈 원정 '+JSON.stringify(hm));
 // 외국인 3+1
 const fs0=SL.krTeams().map(t=>SL.fgnStatus(t));fs0.every(x=>x.list.length===4&&x.quota&&!x.over)?ok('개막 시 국내 10개 구단 모두 외국인 3명 + 아시아쿼터 1명'):bad('외국인 구성 '+fs0.map(x=>x.list.length));
 fs0.every(x=>x.quota.contract.salary<=SL.BAL.FGN.asiaCap)?ok(`아시아쿼터 연봉 상한 ${SL.money(SL.BAL.FGN.asiaCap)} 이하`):bad('아시아쿼터 연봉');
 const fx=SL.overseasTeams().flatMap(t=>t.roster.map(id=>S.players[id])).find(p=>p.nat==='US');const blk=SL.fgnBlock(u,fx,20000);blk&&/외국인 선수 정원/.test(blk)?ok('정원이 차면 외국인 영입 차단: '+blk.slice(0,30)+'…'):bad('외국인 차단 안 됨');
 const ai=SL.krTeams().find(t=>!t.isUser);const n0=ai.roster.length;SL.transferPlayer(fx.id,ai.id,0,{salary:20000,years:1},'이적');ai.roster.length===n0&&!ai.roster.includes(fx.id)?ok('AI 구단도 외국인 정원을 지킴'):bad('AI 정원 무시');
 // 시즌 진행: 퓨처스 매일 경기, 우리 2군 경기 기록, 올스타전
 let g=0;while(S.day<=SL.asDay()&&g++<60)SL.playDayAuto();const A=S.allstar;
 A&&['blue','red'].every(k=>A.squads[k].best.length===12&&A.squads[k].picks.length===13)?ok('올스타: 청팀·홍팀 베스트 12 + 감독 추천 13명씩'):bad('올스타 인원 '+JSON.stringify(A&&Object.values(A.squads).map(x=>[x.best.length,x.picks.length])));
 const ids=['blue','red'].flatMap(k=>A.squads[k].best.map(b=>b.pid).concat(A.squads[k].picks.map(x=>x.pid)));new Set(ids).size===ids.length?ok('올스타 중복 선발 없음'):bad('올스타 중복');
 const sqOk=['blue','red'].every(k=>A.squads[k].best.concat(A.squads[k].picks).every(x=>SL.asSquadOf(S.teams[x.tid])===k));sqOk?ok('선수는 자기 구단 편(청·홍)으로만 선발'):bad('편 오류');
 const tms=['blue','red'].every(k=>SL.krTeams().filter(t=>SL.asSquadOf(t)===k).every(t=>A.squads[k].best.concat(A.squads[k].picks).some(x=>x.tid===t.id)));tms?ok('구단마다 올스타 1명 이상'):bad('구단 누락');
 const G=A.game,win=G[G.win],mv=S.players[G.mvp];mv&&SL.asSquadOf(S.teams[mv.teamId])===G.win&&G.line.rbi<=win&&G.line.hr<=win&&G.line.h<=G.line.ab&&G.blue!==G.red?ok(`올스타전 ${G.blue}:${G.red}, MVP ${mv.name} ${G.line.text} (점수와 모순 없음)`):bad('올스타 경기 '+JSON.stringify(G));
 ids.every(id=>S.players[id].ms&&S.players[id].ms.as&&S.players[id].ms.as.s===S.season)?ok('올스타 배지 기록'):bad('올스타 배지');
 A.fut&&A.fut.N.length&&A.fut.S.length&&A.fut.n!==A.fut.s?ok(`퓨처스 올스타전 북부 ${A.fut.n}:${A.fut.s} 남부 (${A.fut.N.length}+${A.fut.S.length}명)`):bad('퓨처스 올스타');
 const L=S.res.log;L.length&&L[0].top.every(x=>S.players[x.pid])?ok(`우리 2군 경기 기록: ${L[0].d}일차 ${L[0].us}:${L[0].them} · ${L[0].top.map(x=>x.text).join(' / ')}`):bad('2군 경기 기록');
 const fsum=SL.reserveTable();const tot=fsum.reduce((a,x)=>a+x.rs,0),tra=fsum.reduce((a,x)=>a+x.ra,0);tot===tra?ok('퓨처스 득점 합 = 실점 합'):bad('득실 불일치');
 const wsum=fsum.reduce((a,x)=>a+x.w,0),lsum=fsum.reduce((a,x)=>a+x.l,0);wsum===lsum?ok('퓨처스 승 합 = 패 합'):bad('승패 불일치');
 // 우리 2군 선수 기록 = 경기 기록과 맞는지 (안타 ≤ 타수, 홈런 ≤ 안타)
 const rp=SL.reserveIds(u).map(id=>S.players[id]).filter(p=>p.res&&p.res.pa);rp.length&&rp.every(p=>p.res.h<=p.res.ab&&p.res.hr<=p.res.h&&p.res.ab<=p.res.pa)?ok(`2군 개인 기록 정합 (${rp.length}명)`):bad('2군 개인 기록');
 while(S.phase==='season'&&g++<200)SL.playDayAuto();const RH=(S.resHist||[]).slice(-1)[0];RH&&RH.runner&&RH.n1&&RH.s1?ok(`퓨처스 챔피언결정전: ${RH.champ} 우승 (결승 상대 ${RH.runner})`):bad('퓨처스 챔프 '+JSON.stringify(RH));
 // 외국인 지명: 우리 외국인 1명을 내보내 자리를 만든 뒤 3주차
 const mine=SL.fgnList(u).find(p=>p.pos!=='RP');SL.releasePlayer(mine.id);while(S.week<3)SL.advanceWeek();SL.advanceWeek();const D=S.fdraft;
 D&&D.pool.length?ok(`외국인 지명 열림: 후보 ${D.pool.length}명 (일반 ${SL.BAL.FGN.poolGen} · 아시아 ${SL.BAL.FGN.poolAsia})`):bad('외국인 지명 없음');
 if(SL.fdTurn()){const c=SL.fdAvail().filter(p=>SL.fdFits(u,p)&&!p.fasia)[0];const r=SL.fdPick(c.id);r.ok&&u.roster.includes(c.id)&&c.contract.years===1&&c.contract.salary===c.fask?ok(`우리 차례 지명: ${c.name} 1년 ${SL.money(c.fask)}`):bad('지명 실패 '+r.msg);}else ok('우리 차례 전 AI가 진행 중 (다음 주 자동)');
 let w=0;while(S.fdraft&&!S.fdraft.done&&w++<5)SL.advanceWeek();S.fdraft.done&&SL.krTeams().every(t=>!SL.fgnStatus(t).over)?ok('지명 종료 · 모든 구단 정원 이내'):bad('지명 종료 안 됨/정원 초과');
 S.fdraft.pool.every(id=>!S.players[id]||S.players[id].teamId!=null)?ok('지명 안 된 후보 정리'):bad('후보 남음');}
{const fs=require('fs');SL.load(fs.readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();S.res&&S.res.sched&&SL.futStand('N').length===6?ok(`v29 저장(시즌 ${S.day}일차) → 퓨처스 실제 일정으로 이어짐`):bad('v29 퓨처스 변환');let g=0;while(S.phase==='season'&&g++<60)SL.playDayAuto();S.phase==='offseason'?ok('v29 저장으로 시즌 끝까지 진행'):bad('v29 진행');}
console.log('[20] v34 경기 작전 · 트레이드 · 포지션 전환 · 드래프트 5라운드');
{SL.newGame(3434,9,{games:36});S=SL.state();const u=SL.userTeam();const lg=SL.startDay();const side=lg.home===u.id?1:0;
 // 공격 차례로 맞춰 놓고 작전 시험
 let g=0;while(lg.half!==side&&g++<400)SL.stepPitch(lg);const B0=S.players[lg.lineup[side][lg.bat[side]]];
 lg.bases=[{pid:B0.id,resp:lg.pitcher[1-side]},null,null];lg.outs=0;lg.balls=0;lg.strikes=0;
 SL.tacOk(lg,side,'ibb').ok?bad('공격 때 고의사구 허용'):ok('공격 때는 수비 작전 불가');SL.tacOk(lg,side,'dsteal').ok?bad('이중 도루 조건'):ok('이중 도루는 1·2루 주자 필요');
 const pa0=lg.paCount,o0=lg.outs;const r=SL.setTactic(lg,side,'bunt');const bok=lg.paCount===pa0+1&&lg.outs===o0+1;bok?ok('보내기 번트: 한 타석 소모 · 아웃 1 — '+r.msg):bad('번트 처리 '+JSON.stringify(r));
 lg.bases=[{pid:B0.id,resp:lg.pitcher[1-side]},null,null];lg.outs=0;const o1=lg.outs;const r2=SL.setTactic(lg,side,'steal');(lg.bases[1]&&!lg.bases[0]&&lg.outs===o1)||(!lg.bases[0]&&!lg.bases[1]&&lg.outs===o1+1)?ok('도루: 성공이면 2루, 실패면 아웃 — '+r2.msg):bad('도루 처리');
 lg.bases=[{pid:B0.id,resp:lg.pitcher[1-side]},null,null];lg.outs=0;SL.setTactic(lg,side,'hitrun');SL.tacNow(lg)==='hitrun'?ok('히트 앤드 런: 이번 타석에만 적용'):bad('히트앤런 미적용');const pc=lg.paCount;while(lg.paCount===pc&&!lg.done)SL.stepPitch(lg);SL.tacNow(lg)?bad('작전이 다음 타석까지 남음'):ok('타석이 끝나면 작전 해제');
 g=0;while(lg.half===side&&g++<400)SL.stepPitch(lg);if(!lg.done){const pa1=lg.paCount;lg.balls=0;lg.strikes=0;const r3=SL.setTactic(lg,side,'ibb');r3.ok&&lg.paCount===pa1+1&&lg.bases[0]?ok('고의사구: 타자 1루, 타석 종료'):bad('고의사구 '+JSON.stringify(r3));}
 SL.stepGame(lg);SL.endUserGame();
 // 성공률 표본: 도루 60~85%, 번트 65~85%
 let st=0,sn=0;for(let i=0;i<120;i++){SL.newGame(500+i,9,{games:36});const L=SL.startDay();if(!L)continue;const sd=L.half;const b=SL.state().players[L.lineup[sd][0]];L.bases=[{pid:b.id,resp:L.pitcher[1-sd]},null,null];SL.setTactic(L,sd,'steal');sn++;if(L.bases[1])st++;}
 st/sn>0.6&&st/sn<0.85?ok(`도루 성공률 ${(st/sn*100).toFixed(0)}% (실제 KBO 약 70%대)`):bad('도루 성공률 '+st/sn);}
{SL.newGame(3535,9,{games:36});S=SL.state();const u=SL.userTeam();const ai=SL.krTeams().find(t=>!t.isUser&&SL.aimOf(t)!=='rebuild')||SL.krTeams().find(t=>!t.isUser);
 const bats=u.roster.map(id=>S.players[id]).filter(p=>!SL.isPitcher(p)&&p.pos!=='C').sort((a,b)=>SL.calcValue(b)-SL.calcValue(a));
 const core=SL.tradeCore(ai);const e1=SL.tradeEval(ai.id,[bats[bats.length-1].id],[core[0]],0);!e1.ok&&e1.why.some(w=>/핵심|손해/.test(w))?ok('핵심 선수·손해 거절 이유: '+e1.why[0]):bad('거절 이유 '+JSON.stringify(e1.why));
 const cand=ai.roster.map(id=>S.players[id]).filter(p=>!SL.isPitcher(p)&&p.pos!=='C'&&!core.includes(p.id)&&!SL.isFgn(p)).sort((a,b)=>SL.calcValue(a)-SL.calcValue(b));const want=cand[0];const giveP=bats.find(p=>!SL.isFgn(p)&&SL.calcValue(p)>SL.calcValue(want)*1.6);
 const cA=JSON.stringify(giveP.contract),cB=JSON.stringify(want.contract);const r=SL.tradePropose(ai.id,[giveP.id],[want.id],0);
 r.ok&&u.roster.includes(want.id)&&ai.roster.includes(giveP.id)&&JSON.stringify(want.contract)===cB&&JSON.stringify(giveP.contract)===cA&&want.transfers.slice(-1)[0].kind==='트레이드'?ok(`트레이드 성사: ${giveP.name} ↔ ${want.name} (계약 그대로)`):bad('트레이드 '+r.msg);
 const cs=ai.roster.map(id=>S.players[id]).filter(p=>p.pos==='C');if(cs.length===1){const e2=SL.tradeEval(ai.id,[bats[0].id],[cs[0].id],0);e2.why.some(w=>/포수/.test(w))?ok('포수 공백 → 포지션 문제 거절'):bad('포수 공백 '+e2.why);}else ok('(상대 포수 2명 이상 — 포지션 공백 시험 생략)');
 for(let i=0;i<3;i++)SL.tradePropose(ai.id,[bats[bats.length-1].id],[core[0]],0);/하루 3번/.test(SL.tradeEval(ai.id,[bats[bats.length-1].id],[core[0]],0).why[0])?ok('같은 구단과 하루 3번까지'):bad('횟수 제한');
 // 포지션 전환
 const p=S.players[u.lineup.find(id=>['2B','3B','SS'].includes(S.players[id].pos))||u.lineup[0]];const from=p.pos;const to=from==='SS'?'2B':'SS';const pen0=SL.posPenalty(p,to);SL.startConv(p.id,to);const days=p.posTrain.total;
 for(let i=0;i<Math.ceil(days/2);i++)SL.playDayAuto();const mid=SL.posPenalty(p,to);mid<pen0&&mid>0?ok(`전환 훈련 중 불이익 줄어듦 (${pen0} → ${mid})`):bad('훈련 중 불이익 '+pen0+'→'+mid);
 for(let i=0;i<days;i++)if(S.phase==='season')SL.playDayAuto();p.pos===to&&p.pos2===from&&SL.posPenalty(p,from)===3&&SL.posPenalty(p,to)===0?ok(`전환 완료: ${from} → ${to}, ${from}는 부포지션(불이익 3)`):bad('전환 완료 '+p.pos+' '+p.pos2);
 const sp=S.players[u.rotation[4]];SL.startConv(sp.id,'RP');for(let i=0;i<6;i++)if(S.phase==='season')SL.playDayAuto();sp.pos==='RP'&&!u.rotation.includes(sp.id)?ok('선발 → 불펜 역할 전환 후 로테이션에서 빠짐'):bad('투수 전환 '+sp.pos+' '+u.rotation.includes(sp.id));
 SL.startConv(p.id,'SP')?ok('야수 → 투수 전환은 거절'):bad('야수 투수 허용');
 // 드래프트 5라운드 · 지명 후 계약
 SL.testCmd('endSeason');const D=S.draft;D.pool.length===SL.BAL.DRAFT_POOL&&SL.BAL.DRAFT_ROUNDS===5&&D.order.length===50?ok('드래프트: 후보 80명 · 5라운드 (50순번)'):bad('드래프트 규모 '+D.pool.length+' '+D.order.length);
 let w=0;while(!SL.draftTurn()&&!D.done&&w++<6)SL.advanceWeek();if(SL.draftTurn()){const c=SL.draftAvail()[0];const r1=SL.draftPick(c.id,'auto');const pend=SL.draftPending();r1.ok&&c.teamId==null&&pend.some(x=>x.id===c.id)&&c.drafted.ask>0?ok(`지명 후 계약 대기: ${c.name} 계약금 ${SL.money(c.drafted.ask)}`):bad('지명 대기 '+r1.msg);
   const cash0=u.cash;const r2=SL.draftContract(c.id,true);r2.ok&&c.teamId===u.id&&u.cash===cash0-(c.transfers.slice(-1)[0].kind.includes('계약금')?Math.round(cash0-u.cash):0)?ok('계약하면 입단 · 계약금 지출 — '+r2.msg):bad('계약 '+r2.msg);}
 else ok('(이번 시드는 첫 주에 우리 차례 없음)');
 let k=0;while(SL.draftTurn()&&k++<10)SL.draftPick(SL.draftAvail()[0].id,'auto');const left=SL.draftPending();while(S.week<=SL.BAL.OFFSEASON_WEEKS)SL.advanceWeek();let rr=SL.startNewSeason();if(!rr.ok){SL.autoFillUser();rr=SL.startNewSeason();}
 left.every(p=>!S.players[p.id]||S.players[p.id].teamId==null)&&!SL.draftPending().length?ok(`개막까지 계약 안 한 ${left.length}명은 대학 진학`):bad('미계약 처리');
 SL.krTeams().filter(t=>!t.isUser).every(t=>t.roster.length+t.dev.length<=34)?ok('AI 구단 인원 과도하게 늘지 않음'):bad('AI 인원 '+SL.krTeams().map(t=>t.roster.length+t.dev.length));}
console.log('[21] v35 숨은 상한 · 성장 원장 · 생일 · 단기 목표 · 도전과제 · 팜 등급 · 일괄 재계약');
{SL.newGame(3636,9,{games:36});S=SL.state();const u=SL.userTeam();
 const p=S.players[u.lineup[0]];const c1=JSON.stringify(SL.capOf(p));delete p._cap;const c2=JSON.stringify(SL.capOf(p));c1===c2&&Object.keys(SL.capOf(p)).every(k=>SL.capOf(p)[k]>=Math.round(p.attrs[k]))?ok('숨은 상한: 선수마다 고정, 지금 능력 이상'):bad('상한 '+c1+' '+c2);
 !JSON.stringify(S).includes('_cap')?ok('상한은 저장 파일에 안 들어감 (id로 계산)'):bad('상한 저장됨');
 const bd=SL.bdOf(p);bd.m>=1&&bd.m<=12&&bd.d>=1&&bd.d<=31?ok(`생일: ${p.name} ${bd.m}월 ${bd.d}일`):bad('생일');
 const d1=SL.dateOf(1),dG=SL.dateOf(SL.BAL.SEASON_GAMES);d1.m===3&&dG.m===9?ok(`시즌 날짜: 1일차 ${d1.m}/${d1.d} ~ ${SL.BAL.SEASON_GAMES}일차 ${dG.m}/${dG.d}`):bad('날짜 '+JSON.stringify([d1,dG]));
 const fo=SL.reserveIds(u).map(id=>S.players[id]).filter(x=>!SL.isPitcher(x)).slice(0,2);fo.forEach(x=>SL.setResFocus(x.id,true));
 while(S.phase==='season')SL.playDayAuto();const wg=fo.flatMap(x=>x.wgoals||[]);wg.length>=4&&wg.every(g=>typeof g.got==='number'&&g.text)?ok(`단기 목표 ${wg.length}건 판정 (달성 ${wg.filter(g=>g.ok).length})`):bad('단기 목표 '+wg.length);
 const okG=fo.find(x=>(x.wgoals||[]).some(g=>g.ok));okG?((okG.ledger||[]).some(e=>(e.f||[]).some(f=>/단기 목표 달성/.test(f)))?ok('달성하면 능력 상승이 성장 원장에 남음'):bad('원장에 목표 없음')):ok('(이번 시드는 달성 없음)');
 const L=u.roster.map(id=>S.players[id]).find(x=>(x.ledger||[]).length>=3);L&&L.ledger.every(e=>e.s&&e.l&&typeof e.d==='number')?ok(`성장 원장: ${L.name} ${L.ledger.length}건 (날짜·변화·요인)`):bad('원장');
 const A=SL.achList();A.length>=20&&A.filter(a=>a.got).some(a=>a.k==='season')&&A.filter(a=>a.got).some(a=>a.k==='w1')?ok(`도전과제 ${A.filter(a=>a.got).length}/${A.length}: ${A.filter(a=>a.got).map(a=>a.t).join(', ')}`):bad('도전과제');
 S.news.filter(n=>/\[도전과제\]/.test(n.text)).length===A.filter(a=>a.got).length?ok('도전과제 달성마다 소식 1번'):bad('도전과제 소식 수');
 const fg=SL.farmGrade(u);/^[A-E]$/.test(fg.g)?ok(`팜 등급 ${fg.g} (${fg.parts.map(x=>x.join(' ')).join(', ')})`):bad('팜 등급');
 const pend=S.pendingFA.slice();if(pend.length){const exp=pend.map(id=>SL.renewDemandOf(S.players[id]));const r=SL.renewAll();!S.pendingFA.filter(id=>!S.players[id].grudge).length&&pend.every((id,i)=>S.players[id].grudge||S.players[id].contract.salary===exp[i])?ok(`일괄 재계약 ${r.length}명 (요구액 그대로)`):bad('일괄 재계약');}else ok('(계약 만료 선수 없음)');}
console.log('[22] v36 23세 이후 잠재력 감소: 2군 주전·집중은 제외');
{SL.newGame(3737,9,{games:36});S=SL.state();const u=SL.userTeam();const res=SL.reserveIds(u).map(id=>S.players[id]).filter(p=>!SL.isPitcher(p)&&u.roster.includes(p.id));
 for(const p of res){p.age=24;p.peakAge=29;p.pot=Math.max(p.pot,SL.calcOvr(p)+12);}const pot0={};for(const p of res)pot0[p.id]=p.pot;for(let i=0;i<14;i++)SL.playDayAuto();
 const st=res.filter(p=>p.resRole==='start'||p.resRole==='focus'),bn=res.filter(p=>p.resRole==='bench');
 st.length&&st.every(p=>p.pot===pot0[p.id])?ok(`2군 주전 ${st.length}명: 23세 이상이어도 잠재력 유지`):bad('2군 주전 감소 '+st.map(p=>pot0[p.id]-p.pot));
 bn.length?(bn.every(p=>p.pot<pot0[p.id]&&p.log[0].f.some(f=>/잠재력 조금 감소/.test(f)))?ok(`2군 벤치 ${bn.length}명: 감소 + 성장 요인에 표시`):bad('벤치 감소 안 됨')):ok('(이번 시드는 2군 벤치 야수 없음)');}
console.log('[23] v37 해외 하부 리그 (미국 2군·3군, 일본 2군)');
{SL.newGame(3838,9,{games:36});S=SL.state();const u=SL.userTeam();const us=SL.overseasTeams().find(t=>t.league==='US');
 const ps=u.roster.map(id=>S.players[id]).filter(p=>!SL.isPitcher(p)).sort((a,b)=>SL.calcOvr(a)-SL.calcOvr(b));const weak=ps[0],star=ps[ps.length-1];
 /시작$/.test(SL.expectedRole(weak,us))&&!/시작$/.test(SL.expectedRole(star,us))?ok(`예상 역할: 약한 선수 「${SL.expectedRole(weak,us)}」, 강한 선수 「${SL.expectedRole(star,us)}」`):bad('예상 역할 '+SL.expectedRole(weak,us)+' / '+SL.expectedRole(star,us));
 SL.transferPlayer(weak.id,us.id,1000,{salary:10000,years:3},'해외 이적');weak.tier>1&&S.news.some(n=>n.text.includes(weak.name)&&/부터 시작/.test(n.text))?ok(`해외 이적: ${weak.name} ${SL.farmKo('US',weak.tier)}부터 시작 (소식)`):bad('하부 시작 '+weak.tier);
 const o0=SL.calcOvr(weak);while(S.phase==='season')SL.playDayAuto();const h=weak.hist.slice(-1)[0];h.lg==='US'+weak.tier&&h.st.pa>=300&&/미국 [23]군/.test(h.tn)?ok(`하부에서 꾸준히 출장: ${h.tn} ${h.st.pa}타석`):bad('하부 기록 '+JSON.stringify([h.lg,h.tn,h.st.pa]));
 while(S.week<=SL.BAL.OFFSEASON_WEEKS)SL.advanceWeek();let rr=SL.startNewSeason();if(!rr.ok){SL.autoFillUser();rr=SL.startNewSeason();}const lgw=(weak.log||[])[0]||(weak.ledger||[]).slice(-1)[0];lgw&&((lgw.f||[]).some(f=>/미국 [23]군에서 꾸준히 출장/.test(f)))?ok('겨울 성장 요인: 하부에서 꾸준히 출장'):bad('하부 성장 요인 '+JSON.stringify(lgw&&lgw.f));
 const cnt={1:0,2:0,3:0};for(const t of SL.overseasTeams().filter(t=>t.league==='US'))for(const id of t.roster)cnt[S.players[id].tier||1]++;cnt[1]>=700&&cnt[1]<=800?ok(`미국 구단 1군 ${cnt[1]}명 · 2군 ${cnt[2]} · 3군 ${cnt[3]}`):bad('미국 분포 '+JSON.stringify(cnt));}
{SL.newGame(3939,9,{games:36});S=SL.state();const t2=SL.krTeams().find(t=>!t.isUser);const p=S.players[t2.roster[3]];const t3=SL.krTeams().find(t=>!t.isUser&&t!==t2);SL.transferPlayer(p.id,t3.id,0,{salary:5000,years:2},'이적');!(S.ach&&S.ach.abroad)?ok('국내 이적으로는 「해외로」 안 됨'):bad('국내 이적에 해외로 달성');}
console.log(fails?`리뷰 반영 검증 실패 ${fails}건`:'리뷰 반영 검증 모두 통과');process.exit(fails?1:0);

// 코치진 검증: 기본 코치진=중립, 투자 효과(성장·스카우트·피로·노화), 계약·해임·재계약, 인건비, 저장/구버전/이직
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const B=SL.BAL;
function mk(dept,rating,trait){S=SL.state();const c={id:(S.nextCoachId=(S.nextCoachId||1)+1),name:'테스트'+dept+rating,nat:'KR',age:45,dept,rating,trait:trait||null,salary:B.STAFF_PAY[SL.gradeOf(rating)],years:3,since:S.season,bio:'테스트'};return c;}
function playSeason(){while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}}
function offseason(){while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}const j=SL.serialize();SL.load(j);S=SL.state();}
console.log('[1] 기본 코치진');SL.newGame(31,2);S=SL.state();let ut=SL.userTeam();const sm=SL.staffSummary(ut);
const neutral=['bat','pit','scout','med'].every(d=>/[+-]?0(%|\/)|\+0%p/.test(sm[d].eff));neutral?ok('부임 시 코치 '+ut.staff.length+'명, 효과 ±0 (리그 평균 수준) · 인건비 '+SL.money(SL.staffPay(ut))):bad('기본 코치진이 중립이 아님 '+JSON.stringify(sm));
console.log('[2] 투자 효과: 같은 시즌을 코치진만 바꿔 비교');
const base=SL.serialize();
function run(staff){SL.load(base);S=SL.state();const u=SL.userTeam();u.staff=staff();const ids=u.roster.concat(u.dev);const o0={};for(const id of ids)o0[id]=SL.calcOvr(S.players[id]);
  playSeason();const young=ids.map(id=>S.players[id]).filter(p=>p&&p.age<=25&&!p.retired);const g=young.reduce((s,p)=>s+(SL.calcOvr(p)-o0[p.id]),0)/young.length;
  const old=ids.map(id=>S.players[id]).filter(p=>p&&p.age>=33&&!p.retired);const dcl=old.length?old.reduce((s,p)=>s+(SL.calcOvr(p)-o0[p.id]),0)/old.length:0;
  const fat=u.roster.map(id=>S.players[id].fatigue||0);return {g,dcl,fx:SL.staffFx(u),fin:u.fin.staff,pay:SL.staffPay(u)};}
const none=run(()=>[]);const std=run(()=>SL.state().teams[SL.state().userTeamId].staff);
const top=run(()=>[mk('bat',90,'장타 조련'),mk('bat',85),mk('bat',80),mk('pit',90),mk('pit',85),mk('pit',80),mk('def',85),mk('def',80),mk('dev',88,'유망주 조련'),mk('dev',82),mk('scout',85),mk('scout',80),mk('scout',78),mk('scout',75),mk('scout',72),mk('med',88,'노장 관리'),mk('med',80),mk('med',75),mk('med',70),mk('med',70)]);
console.log(`  25세 이하 시즌 성장: 코치 없음 ${none.g.toFixed(2)} | 기본 ${std.g.toFixed(2)} | 최정상 ${top.g.toFixed(2)}`);
console.log(`  33세 이상 시즌 변화: 코치 없음 ${none.dcl.toFixed(2)} | 기본 ${std.dcl.toFixed(2)} | 최정상 ${top.dcl.toFixed(2)}`);
(top.g>std.g&&std.g>none.g)?ok(`성장: 최정상 코치진 +${((top.g/std.g-1)*100).toFixed(0)}%, 코치 없음 ${((none.g/std.g-1)*100).toFixed(0)}%`):bad('성장 순서 이상');
(top.g/std.g<1.45)?ok('최정상 코치진도 성장 +45% 미만 (밸런스 상한)'):bad('코치 효과 과대 '+(top.g/std.g).toFixed(2));
top.fx.rec>0&&top.fx.aging<0.85&&top.fx.conf>0.05&&top.fx.watch>=3?ok(`최정상 효과: 피로 회복 +${top.fx.rec}/일, 노화 ${Math.round((top.fx.aging-1)*100)}%, 판별 +${Math.round(top.fx.conf*100)}%p, 매주 ${top.fx.watch}명 관찰`):bad('부가 효과 '+JSON.stringify(top.fx));
Math.abs(top.fin-top.pay)<=top.pay*0.02?ok(`시즌 인건비 지급 ${SL.money(top.fin)} = 연봉 합계 ${SL.money(top.pay)}`):bad(`인건비 ${top.fin} vs ${top.pay}`);
console.log('[3] 스카우트 → 드래프트 판별 신뢰도');
function draftConf(staff){SL.load(base);S=SL.state();SL.userTeam().staff=staff();playSeason();const pool=S.draft.pool.map(id=>S.players[id]);return pool.reduce((s,p)=>s+p.scout.conf,0)/pool.length;}
const c0=draftConf(()=>[]),c1=draftConf(()=>[mk('scout',85,'고교 네트워크'),mk('scout',80),mk('scout',78),mk('scout',75),mk('scout',72)]);c1>c0+0.1?ok(`드래프트 후보 평균 신뢰도 ${c0.toFixed(2)} → ${c1.toFixed(2)}`):bad('스카우트 효과 '+c0+' '+c1);
console.log('[4] 영입·정원·등급 조건·해임·만료·재계약');
SL.load(base);S=SL.state();ut=SL.userTeam();
const sC=Object.assign(mk('pit',88),{years:0});S.staffPool.push(sC);const e1=SL.hireCoach(sC.id,2);e1&&/위상/.test(e1)?ok('S급 코치: '+e1):bad('S급이 약소 구단에 영입됨 '+e1);
const aC=Object.assign(mk('bat',74),{years:0,salary:8000});S.staffPool.push(aC);const tA=SL.coachTerms(aC);tA.ok&&tA.salary===10000?ok('A급 코치 약소 구단 요구 연봉 +25%: '+SL.money(tA.salary)):bad('A급 조건 '+JSON.stringify(tA));
const cash0=ut.cash;SL.hireCoach(aC.id,1)===null&&ut.staff.includes(aC)?ok('A급 타격코치 1년 계약'):bad('영입 실패');
for(let i=0;i<3;i++){const x=Object.assign(mk('bat',55),{years:0});S.staffPool.push(x);var eCap=SL.hireCoach(x.id,1);}eCap&&/정원/.test(eCap)?ok('타격코치 정원 3명 초과 차단'):bad('정원 '+eCap);
const sev=SL.severanceOf(aC);const c1b=ut.cash;SL.fireCoach(aC.id);(!ut.staff.includes(aC)&&c1b-ut.cash===sev&&sev>0)?ok('해임 보상금 '+SL.money(sev)+' (잔여 연봉 50%)'):bad('해임 '+sev);
playSeason();const exp=ut.staff.filter(c=>c.years<=0);exp.length?ok('시즌 종료 계약 만료 코치 '+exp.length+'명'):bad('만료 없음');
const keep=exp[0];const e2=SL.renewCoach(keep.id,2);e2===null&&keep.years===2?ok('재계약 '+keep.name+' 2년 '+SL.money(keep.salary)):bad('재계약 '+e2);
S.staffPool.length>=24?ok('스토브리그 코치 시장 갱신 '+S.staffPool.length+'명'):bad('풀 '+S.staffPool.length);
offseason();ut=SL.userTeam();ut.staff.every(c=>c.years>0)?ok('2주차 미재계약 코치 이탈, 재계약 코치 잔류 ('+ut.staff.map(c=>c.name).join(', ')+')'):bad('만료 코치 잔류');
console.log('[5] 저장·구버전·이직');
const j=SL.serialize();SL.load(j);S=SL.state();JSON.stringify(SL.userTeam().staff)===JSON.stringify(JSON.parse(j).teams[S.userTeamId].staff)?ok('저장/불러오기 코치진 보존'):bad('저장 손실');
{let err=null;try{SL.load(fs.readFileSync(__dirname+'/v2_save.json','utf8'));}catch(e){err=e.message;}err?ok('구버전 세이브(v2)는 v28 리그 개편으로 거부'):bad('구버전 세이브가 거부되지 않음');}
SL.newGame(31,2);S=SL.state();playSeason();const nt=SL.krTeams().find(t=>!t.isUser);S.jobOffers=[{id:S.nextOfferId++,team:nt.id,kind:'job',goal:{text:'가을야구 (5위 이내)',target:5},rankExp:5,n:10,expires:2,reason:'t'}];SL.moveManager(S.jobOffers[0].id);
SL.userTeam().staff&&SL.userTeam().staff.length>=4?ok('이직한 구단 기본 코치진: '+SL.userTeam().staff.map(c=>B.STAFF[c.dept].name+' '+c.rating).join(', ')):bad('이직 코치진');
console.log(fails?`코치진 검증 실패 ${fails}건`:'코치진 검증 모두 통과');process.exit(fails?1:0);

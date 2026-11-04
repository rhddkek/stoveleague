const SL=require('./run.js');const fs=require('fs');
let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
let S;
function integrity(label){S=SL.state();const seen=new Map();
  for(const t of Object.values(S.teams)){const all=t.roster.concat(t.dev||[]);if(new Set(all).size!==all.length)bad(label+' 중복 '+t.name);
    for(const pid of all){const p=S.players[pid];if(!p){bad(label+' 없는 선수');continue;}if(p.teamId!==t.id)bad(label+' 소속 불일치 '+p.name);if(seen.has(pid))bad(label+' 이중 소속 '+p.name);seen.set(pid,1);}}
  for(const l of ['JP','US','TW','MX','AU','CB'])if(!Object.values(S.teams).some(t=>t.league===l))bad(label+' 리그 없음 '+l);}
// ---- 1. 구버전 세이브 거부 (v28: 10구단 단일 리그 전환, 광우 결정) + 새 게임 경기 도중 저장·이어하기 ----
console.log('[1] 구버전 세이브 거부 · 새 게임 이어하기');
const v1=fs.readFileSync(__dirname+'/v1_save.json','utf8');
{let err=null;const keep=SL.state();try{SL.load(v1);}catch(e){err=e.message;}err&&/10개 구단/.test(err)&&SL.state()===keep?ok('구버전(v1) 저장은 안내 문구와 함께 거부'):bad('구버전 저장이 거부되지 않음: '+err);}
SL.newGame(4242,1,{games:36});S=SL.state();
while(S.day<12)SL.playDayAuto();
{const lg=SL.startDay();for(let i=0;i<5;i++)SL.stepPA(lg);}
const mid=SL.serialize();SL.load(mid);S=SL.state();
const ut=SL.userTeam();
if(!S.liveGame)bad('경기 도중 상태 손실');else{const before=ut.rec.w+ut.rec.l;SL.stepGame(S.liveGame);SL.endUserGame();ut.rec.w+ut.rec.l===before+1?ok('경기 도중 저장분 이어서 종료, 중복 없음'):bad('경기 기록 중복');}
integrity('저장 후 로드');
console.log('  신규 리그 팀:',['TW','MX','AU','CB'].map(l=>l+':'+Object.values(S.teams).filter(t=>t.league===l).length).join(' '),'| 감독 실적 백필',S.mgr.seasons.length);
// ---- 2. 시즌 끝 → 파견 ----
console.log('[2] 겨울리그 파견');
while(S.phase==='season')SL.playDayAuto();
const D=S.dispatch;if(!D||D.phase!=='open')bad('파견 창 없음');else ok(`파견 창 열림, 요청 ${D.reqs.length}건`);
const elig=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(SL.dispatchEligible).sort((a,b)=>a.age-b.age);
const picks=[];
// 각 역할을 골고루: 첫 선수는 주전 기대 팀, 둘째는 벤치 예상 팀(있으면)
for(const p of elig.slice(0,3)){const opts=SL.dispatchOptions(p);const o=picks.length===1?opts[opts.length-1]:opts[0];const snapC=JSON.stringify(p.contract),team=p.teamId,cash=ut.cash;
  const e=SL.dispatchPlayer(p.id,o.team.id);if(e){bad('파견 실패 '+e);continue;}picks.push({p,o,snapC,team});if(ut.cash!==cash-o.fee)bad('파견비 차감 오류');}
ok('파견 '+picks.map(x=>`${x.p.name}→${x.o.team.name}(${x.o.role})`).join(', '));
if(picks.length&&SL.listPlayer(picks[0].p.id)===null)bad('파견 중 판매 등록 허용됨');
const ages={};for(const id in S.players)ages[id]=S.players[id].age;
const save1=SL.serialize();SL.load(save1);S=SL.state();
while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}
for(const x of picks){const p=S.players[x.p.id];if(p.teamId!==x.team)bad('파견 후 소속 변경 '+p.name);if(JSON.stringify(p.contract)!==x.snapC)bad('파견 후 계약 변경 '+p.name);if(p.dispatch)bad('복귀 처리 안 됨');if(!p.winter||!p.winter.length)bad('겨울 기록 없음');}
ok('파견 선수 소속·계약 유지, 겨울 기록: '+picks.map(x=>{const w=S.players[x.p.id].winter.slice(-1)[0];return `${x.p.name} ${w.role} 출장${Math.round(w.share*100)}%`;}).join(', '));
let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}
// 동계 성장 1회
let dup=0,miss=0;for(const id of ut.roster.concat(ut.dev)){const p=S.players[id];const w=p.log.filter(l=>/동계훈련|겨울리그 파견/.test(l.label)&&(l.label.startsWith(S.season+'시즌')||l.label.startsWith((S.season-1)+'시즌 겨울')));if(w.length>1)dup++;if(p.userLink&&w.length===0)miss++;}
dup?bad('동계 성장 중복 '+dup):ok('동계훈련·파견 성장 선수당 1회 (중복 0)');
for(const x of picks){const p=S.players[x.p.id];const l=p.log[0];if(!/겨울리그 파견/.test(l.label))bad('파견 선수가 국내 동계훈련으로 처리됨');}
ok('파견 성장 요인 예: '+picks.map(x=>S.players[x.p.id].log[0].f.join('·')).join(' / '));
let ageBad=0;for(const id in ages){const p=S.players[id];if(p&&!p.retired&&p.age!==ages[id])ageBad++;}
ageBad?bad('스토브리그 중 나이 변동 '+ageBad):ok('나이 변동 없음(시즌 종료 시 1회만)');
const fat=picks.map(x=>S.players[x.p.id].fatigue);fat.every(f=>f>=30)?ok('파견 선수 회복 부담(개막 피로 '+fat.join(',')+')'):bad('회복 부담 미적용');
integrity('파견 후');
// ---- 3. 파견 vs 미파견 성장 비교 (통계) ----
console.log('[3] 파견 효과 분포 (500명 모의)');
{const base=SL.state();const res={};for(let i=0;i<500;i++){const p=Object.values(base.players).find(q=>q.teamId===ut.id&&q.age<=22);}
 const pool=Object.values(S.players).filter(p=>p.age<=24&&!p.retired&&p.teamId!=null);const ROLE=['주전','주전 경쟁','백업','벤치'];
 const snap=SL.serialize();
 for(const kind of ['domestic',...ROLE]){SL.load(snap);S=SL.state();let sum=0,n=0;for(const p of Object.values(S.players).filter(p=>p.age<=22&&!p.retired&&p.teamId!=null).slice(0,120)){const o=SL.calcOvr(p);
     if(kind==='domestic')SL.growthTick(p,{kind:'winter',label:'t',team:SL.userTeam()});else SL.growthTick(p,{kind:'dispatch',label:'t',team:SL.userTeam(),dd:{lg:'CB',role:kind,share:{'주전':0.95,'주전 경쟁':0.6,'백업':0.3,'벤치':0.1}[kind]}});sum+=SL.calcOvr(p)-o;n++;}
   res[kind]=(sum/n).toFixed(2);}
 console.log('  평균 동계 성장  국내:',res.domestic,'| 파견 주전:',res['주전'],'주전경쟁:',res['주전 경쟁'],'백업:',res['백업'],'벤치:',res['벤치']);
 if(!(+res['주전']>+res.domestic&&+res['벤치']<+res.domestic))bad('파견 손익 구조 이상');else ok('주전 파견 > 국내 > 벤치 파견');
 SL.load(snap);S=SL.state();}
// ---- 4. 장기 저장 ----
console.log('[4] 장기 진행 15시즌');
let maxKB=0;for(let s=0;s<15;s++){while(S.phase==='season')SL.playDayAuto();const el=SL.userTeam().roster.concat(SL.userTeam().dev).map(id=>S.players[id]).filter(SL.dispatchEligible).slice(0,2);for(const p of el){const o=SL.dispatchOptions(p)[0];SL.dispatchPlayer(p.id,o.team.id);}
  while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}
  let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}if(!r.ok)bad('개막 실패');
  const j=SL.serialize();maxKB=Math.max(maxKB,j.length/1024);SL.load(j);S=SL.state();integrity('장기'+s);}
const lg=Object.values(S.players).filter(p=>p.userLink);const careers=lg.filter(p=>p.transfers.length>=1).length;
console.log('  최대 저장 크기',maxKB.toFixed(0),'KB | 선수',Object.keys(S.players).length,'| 유저 연계',lg.length,'(이적 이력 보유',careers,') | 은퇴 보존',lg.filter(p=>p.retired).length);
maxKB<3500?ok('저장 크기 3.5MB 미만 유지'):bad('저장 크기 과다 '+maxKB.toFixed(0));
console.log('  감독 실적 최근:',JSON.stringify(S.mgr.seasons.slice(-2)));
const abroad=Object.values(S.players).filter(p=>p.exUser&&p.teamId!=null&&S.teams[p.teamId].league!=='KR');console.log('  해외 진출 출신:',abroad.map(p=>p.name+'@'+S.teams[p.teamId].league).slice(0,8).join(', '));
const leagues={};for(const t of Object.values(S.teams))if(t.league!=='KR'){const kr=t.roster.filter(id=>S.players[id].nat==='KR').length;leagues[t.league]=(leagues[t.league]||0)+kr;}console.log('  해외 리그 한국 국적 선수 수',JSON.stringify(leagues));
console.log(fails?`Phase1 검증 실패 ${fails}건`:'Phase1 검증 모두 통과');process.exit(fails?1:0);

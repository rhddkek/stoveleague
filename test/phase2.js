const SL=require('./run.js');const fs=require('fs');
let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);let S;
function integrity(label){S=SL.state();const seen=new Map();let users=0;
  for(const t of Object.values(S.teams)){if(t.isUser)users++;const all=t.roster.concat(t.dev||[]);if(new Set(all).size!==all.length)bad(label+' 중복 '+t.name);
    for(const pid of all){const p=S.players[pid];if(!p){bad(label+' 없는 선수 '+t.name);continue;}if(p.teamId!==t.id)bad(label+' 소속 불일치 '+p.name);if(seen.has(pid))bad(label+' 이중 소속 '+p.name);seen.set(pid,1);}
    for(const id of t.lineup)if(!t.roster.includes(id))bad(label+' 라인업 비소속 '+t.name);}
  if(users!==1)bad(label+' 유저 구단 수 '+users);if(S.teams[S.userTeamId].isUser!==true)bad(label+' userTeamId 불일치');
  if(SL.compTeams(1).length!==10)bad(label+' 국내 구단 수 '+SL.compTeams(1).length);}
function checkSched(label){const per={},home={},dt=new Set();for(const g of S.schedule){for(const t of [g.home,g.away]){per[t]=(per[t]||0)+1;const k=g.day+':'+t;if(dt.has(k))bad(label+' 같은 날 2경기');dt.add(k);}home[g.home]=(home[g.home]||0)+1;}
  const G=SL.BAL.SEASON_GAMES;const ut=SL.userTeam();if(per[ut.id]!==G)bad(label+' 유저 경기 수 '+per[ut.id]);const comp=SL.compTeams(SL.compOf(ut));for(const t of comp){if(per[t.id]!==G)bad(label+' '+t.name+' 경기수 '+per[t.id]);if(Math.abs(home[t.id]-G/2)>1)bad(label+' 홈경기 불균형 '+t.name+' '+home[t.id]);}
  for(const t of SL.krTeams())if(per[t.id]!==G)bad(label+' KR '+t.name+' '+per[t.id]);}
function playSeason(){while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}}
function offseason(beforeStart){while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}if(beforeStart&&S.week===1)beforeStart();SL.advanceWeek();}
  let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}if(!r.ok)bad('개막 실패 '+r.msg);const j=SL.serialize();SL.load(j);S=SL.state();return j.length/1024;}
// ---- A. 구버전 세이브 ----
console.log('[A] 구버전 세이브');
// v28: 10구단 단일 리그 전환으로 구버전 저장은 안내와 함께 거부 (광우 결정 R015)
for(const f of ['v1_save.json','v2_save.json']){let err=null;try{SL.load(fs.readFileSync(__dirname+'/'+f,'utf8'));}catch(e){err=e.message;}err&&/새 게임/.test(err)?ok(f+' 거부 (안내 문구)'):bad(f+' 가 거부되지 않음');}
// ---- B. 이직 왕복 커리어 ----
console.log('[B] 감독 커리어 시뮬레이션');
SL.newGame(4242,3);S=SL.state();const H0=SL.userTeam().id;const T=id=>SL.state().teams[id];
playSeason();offseason();integrity('1시즌');
// 평판을 강제로 높여 해외(대만) 제의를 받게 함
S.mgr.loyalty=0;S.mgr.seasons.push({s:0,div:1,expRank:10,rank:1,ps:'champ',powerStart:50,powerEnd:53,sales:1,salesFee:50000,salesProfit:40000,devHits:3,abroad:1,goalMet:true});
playSeason();console.log('  평판',S.mgr.rep,SL.repGrade(S.mgr.rep),'제의',S.jobOffers.map(o=>S.teams[o.team].name+'('+S.teams[o.team].league+(S.teams[o.team].div||'')+')').join(', '));
let tw=S.jobOffers.find(o=>S.teams[o.team].league==='TW');
if(!tw){const t=SL.overseasTeams().find(x=>x.league==='TW');S.jobOffers.push({id:9999,team:t.id,kind:'job',goal:SL.teamOutlook(t).goal,expires:2,reason:'테스트'});tw=S.jobOffers.find(o=>o.id===9999);console.log('  (TW 제의 수동 생성)');}
const oldIds=T(H0).roster.slice();const TW=tw.team;
const e=SL.moveManager(tw.id);e?bad('이직 실패 '+e):ok(`이직: ${T(H0).name} → ${T(TW).name}`);
if(T(H0).isUser||!T(TW).isUser||S.userTeamId!==TW)bad('유저 구단 전환 오류');
if(oldIds.some(id=>S.players[id]&&S.players[id].teamId===H0&&!S.players[id].exUser))bad('옛 구단 선수 옛 제자 표시 누락');
integrity('이직 직후');
const sz1=offseason();integrity('대만 개막');checkSched('대만');
console.log('  대만 일정: 유저 경기',S.schedule.filter(g=>g.home===TW||g.away===TW).length,'| KR 경기',S.schedule.filter(g=>typeof g.div==='number').length);
const cash0=T(TW).cash;playSeason();
const h=T(TW).roster.map(id=>S.players[id]).filter(p=>p.hist.length&&p.hist[p.hist.length-1].s===S.season);
const dupH=T(TW).roster.map(id=>S.players[id]).filter(p=>p.hist.filter(x=>x.s===S.season&&!x.w).length>1).length;
h.length>15?ok(`대만 시즌 실제 경기 기록 ${h.length}명 (중복 ${dupH})`):bad('대만 시즌 기록 누락 '+h.length);if(dupH)bad('시즌 기록 중복');
const tbl=S.overseas.hist[S.overseas.hist.length-1].tables.TW;tbl&&tbl.find(r=>r.id===TW).w+tbl.find(r=>r.id===TW).l===SL.BAL.SEASON_GAMES?ok('대만 순위표 = 실제 '+SL.BAL.SEASON_GAMES+'경기 결과'):bad('대만 순위표 이상');
console.log('  대만 재정: 개막 현금',SL.money(cash0),'→',SL.money(T(TW).cash),'| 수입',JSON.stringify(T(TW).fin));
console.log('  옛 구단',T(H0).name,'AI 운영:',T(H0).roster.length+'명, 라인업 '+T(H0).lineup.length);
T(H0).roster.length>=20&&T(H0).lineup.length===9?ok('옛 구단 AI 정상 운영'):bad('옛 구단 운영 이상');
// 친정 복귀 요청 강제: 옛 구단을 꼴찌로
T(H0).lastRank=10;S.mgr.rep=Math.max(S.mgr.rep,35);SL.genJobOffers();const ret=S.jobOffers.find(o=>o.team===H0);
ret?ok('친정 복귀 요청: '+ret.reason+' / 목표 '+ret.goal.text):bad('복귀 요청 없음');
if(ret){SL.moveManager(ret.id);S.userTeamId===H0?ok('친정 복귀'):bad('복귀 실패');}
integrity('복귀');offseason();integrity('복귀 후 개막');checkSched('복귀');
// 몇 시즌 더
let maxKB=0;for(let i=0;i<6;i++){playSeason();if(S.jobOffers.length&&i===2){const o=S.jobOffers[0];SL.moveManager(o.id);console.log('  추가 이직 →',S.teams[o.team].name);}const kb=offseason();maxKB=Math.max(maxKB,kb);integrity('추가'+i);checkSched('추가'+i);}
console.log('  경력:',S.mgr.career.map(c=>`${c.name}(${c.from}~${c.to||''})`).join(' → '));
console.log('  평판 추이:',S.mgr.repHist.map(x=>x.join(':')).join(' '),'| 최대 저장',maxKB.toFixed(0),'KB');
const coached=Object.values(S.players).filter(p=>p.coached&&!p.retired&&p.teamId!==S.userTeamId).length;ok('옛 제자 추적 '+coached+'명');
// ---- C. 평판 악용 방지 ----
console.log('[C] 주전 전부 판매 vs 정상 운영 평판');
function sim(gut){SL.newGame(777,2);S=SL.state();const ut=SL.userTeam();let n=0;
  for(let s=0;s<3;s++){while(S.phase==='season'){if(gut&&S.day===3){for(const id of [...ut.lineup.slice(0,7),...ut.rotation.slice(0,3)]){const p=S.players[id];const b=SL.krTeams().filter(t=>!t.isUser&&t.cash>SL.calcValue(p)*2)[0];if(b){S.market.listed.push(id);const o={id:S.nextOfferId++,type:'buy',pid:id,team:b.id,fee:Math.round(SL.calcValue(p)*1.3),max:0,expires:S.clock+3,counters:0,status:'open',willing:true,reasons:[]};S.market.offers.push(o);SL.respondOffer(o.id,'accept');n++;}}}
      SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
    offseason(()=>{});}
  return {rep:S.mgr.rep,sold:n,parts:SL.repParts()};}
const a=sim(false),b=sim(true);console.log('  정상:',a.rep,JSON.stringify(a.parts),'| 주전 판매('+b.sold+'명):',b.rep,JSON.stringify(b.parts));
b.rep<a.rep?ok('주전을 팔아 팀을 무너뜨리면 평판이 더 낮음'):bad('판매 악용 가능');
console.log(fails?`Phase2 검증 실패 ${fails}건`:'Phase2 검증 모두 통과');process.exit(fails?1:0);

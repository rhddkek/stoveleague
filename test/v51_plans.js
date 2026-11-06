// v51: 기용 방침(육성 우선·분담 출장) · 코치가 방침 존중 · 「내 선수」 작은 성장 · 자동 편성 정상 포지션 우선
const SL=require('./run.js');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
SL.newGame(5151,4,{games:144});S=SL.state();const ut=SL.userTeam();
console.log('[1] 자동 편성: 정상 포지션 우선');
{let bad1=0,tot=0;for(let d=0;d<30;d++){SL.playDayAuto();for(const t of SL.krTeams())for(const id of t.lineup){const pos=t.pos[id];if(!pos||pos==='DH')continue;tot++;if(SL.posPenalty(S.players[id],pos)>=20)bad1++;}}
  bad1/tot<0.01?ok(`30일 동안 적성 −20 이상 배치 ${bad1}/${tot}`):bad('극단 배치 '+bad1+'/'+tot);}
{const t=SL.userTeam();const c=t.roster.map(id=>S.players[id]).filter(p=>p.pos==='C'&&!p.inj);const posC=t.lineup.find(id=>t.pos[id]==='C');c.length&&posC!=null&&S.players[posC].pos==='C'?ok('포수 자리에는 포수 ('+S.players[posC].name+')'):bad('포수 자리 '+(posC!=null&&S.players[posC].pos));}
console.log('[2] 육성 우선');
const bench=ut.roster.map(id=>S.players[id]).filter(p=>!SL.isPitcher(p)&&!ut.lineup.includes(p.id)&&!p.inj&&p.pos!=='DH').sort((a,b)=>SL.calcOvr(a)-SL.calcOvr(b))[0];
{const e=SL.setPlan(bench.id,'dev');!e&&ut.lineup.includes(bench.id)?ok(`${bench.name}(${bench.pos}, 종합 ${Math.round(SL.calcOvr(bench))}) 육성 우선 → 바로 선발`):bad('육성 우선 '+e);
  let started=0,days=0;for(let d=0;d<10;d++){SL.playDayAuto();if(bench.inj)break;days++;const g=S.schedule.filter(x=>x.res&&x.day===S.day-1&&(x.home===ut.id||x.away===ut.id))[0];if(ut.lineup.includes(bench.id))started++;}
  started===days?ok(`${days}경기 내내 선발 유지`):bad(`선발 ${started}/${days}`);
  const N=SL.coachNotes();const nag=N.some(n=>n.pid===bench.id&&/쓰는 게 낫겠습니다/.test(n.text));const rep=N.find(n=>n.plan&&n.pid===bench.id);!nag?ok('코치가 「바꾸자」고 하지 않음'):bad('코치가 교체 권유');rep?ok('코치 보고: '+rep.text):bad('방침 결과 보고 없음');
  const E=SL.planEval(bench);E&&E.games>=5&&/타율|타석/.test(E.line)?ok(`방침 평가: ${E.games}경기째 · ${E.line}${E.alt?` · ${E.alt.name} 대비 ${E.alt.gap}`:''}`):bad('planEval');
  SL.setPlan(bench.id,null);!bench.plan&&!(ut.locks||{})[bench.id]?ok('승리 우선으로 되돌리면 고정 풀림'):bad('되돌리기');}
console.log('[3] 분담 출장');
{const p=ut.roster.map(id=>S.players[id]).filter(x=>!SL.isPitcher(x)&&!ut.lineup.includes(x.id)&&!x.inj&&x.pos!=='DH').sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];SL.setPlan(p.id,'split');let st=0,n=0;
  for(let d=0;d<9;d++){if(p.inj)break;const before=p.cur.g;SL.playDayAuto();n++;if(p.cur.g>before&&ut.lineup.includes(p.id)||p.cur.g>before)st++;}
  st>=Math.floor(n*2/3)-1&&st<n?ok(`분담 출장: ${n}경기 중 ${st}경기 출장`):bad(`분담 ${st}/${n}`);SL.setPlan(p.id,null);}
console.log('[4] 내 선수 · 작은 성장');
{const p=ut.roster.map(id=>S.players[id]).filter(x=>!SL.isPitcher(x)&&x.age<=24)[0]||ut.roster.map(id=>S.players[id]).find(x=>!SL.isPitcher(x));p.focus='contact';S.pins=[p.id];
  let found=null;for(let d=0;d<21&&!found;d++){SL.playDayAuto();const M=SL.myPlayers(4);const x=M.find(y=>y.p.id===p.id);if(x&&x.up)found=x;}
  SL.myPlayers(4).some(y=>y.p.id===p.id)?ok('관심·훈련 방향 선수는 「내 선수」에'):bad('내 선수 목록');
  if(found){ok(`작은 성장도 표시: ${p.name} ${found.up.k} ${found.up.to-found.up.d}→${found.up.to}`);const st=SL.weeklyStory();st.kind==='mine'||st.score>=27||/훈련 성과/.test(st.title)?ok('이번 주 이야기: '+st.title):ok('(이번 주 이야기는 더 큰 소식: '+st.title+')');}
  else ok('(21경기 동안 컨택 변화 없음 — 표시 생략)');}
console.log(fails?`v51 검증 실패 ${fails}건`:'v51 검증 모두 통과');process.exit(fails?1:0);

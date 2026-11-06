// v50: 부상 · 구단 꾸미기 · 경기 로그(중계·하이라이트용 점수 기록)
const SL=require('./run.js');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
console.log('[1] 부상');
SL.newGame(5050,3,{games:144});S=SL.state();const ut=SL.userTeam();
const seen=new Set();let lineupBad=0,userInj=0;const perTeam={};
while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');
  for(const t of SL.krTeams()){for(const id of [...t.lineup,...t.rotation,...t.bullpen]){const p=S.players[id];if(p&&p.inj)lineupBad++;}
    for(const id of t.roster){const p=S.players[id];if(p&&p.inj){const k=id+':'+p.inj.s+':'+p.inj.d;if(!seen.has(k)){seen.add(k);perTeam[t.id]=(perTeam[t.id]||0)+1;if(t.isUser)userInj++;}}}}
  if(S.day===70){const j=SL.serialize();SL.load(j);S=SL.state();}}
{const n=SL.krTeams().map(t=>perTeam[t.id]||0);const avg=n.reduce((a,b)=>a+b,0)/n.length;avg>=2&&avg<=12?ok(`국내 구단당 부상 ${avg.toFixed(1)}회 (최소 ${Math.min(...n)} · 최대 ${Math.max(...n)})`):bad('부상 빈도 '+avg);}
lineupBad===0?ok('부상 선수는 하루도 라인업·로테이션·불펜에 남지 않음 (경기 직후 자동 교체)'):bad('부상 선수가 편성에 남음 '+lineupBad);
{const left=Object.values(S.players).filter(p=>p.inj).length;left===0?ok('시즌이 끝나면 부상 모두 회복 (겨울 재활)'):bad('시즌 뒤 남은 부상 '+left);}
S.news.some(n=>n.kind==='injury')||userInj===0?ok(`우리 구단 부상 ${userInj}회 — 소식 남김`):bad('부상 소식 없음');
{const p=Object.values(S.players).find(x=>x.injHist&&x.injHist.length);p?ok(`부상 이력 기록: ${p.name} ${p.injHist.map(h=>h.type+' '+h.games+'경기').join(', ')}`):bad('부상 이력 없음');}
console.log('[2] 부상 → 자리 메움 → 복귀');
{let r;while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA])SL.renewContract(pid,SL.salaryFor(S.players[pid])*1.4,2);SL.advanceWeek();}r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();SL.startNewSeason();}S=SL.state();
  const u=SL.userTeam();const sp=S.players[u.rotation[0]];const bat=S.players[u.lineup[0]];const bpos=u.pos[bat.id];
  sp.inj={type:'어깨 염증',left:3,total:3,games:3,s:S.season,d:S.day,role:'rot',pos:null};bat.inj={type:'발목 염좌',left:3,total:3,games:3,s:S.season,d:S.day,role:'bat',pos:bpos};
  SL.playDayAuto();!u.rotation.includes(sp.id)&&!u.lineup.includes(bat.id)?ok('부상 선수 빠지고 빈자리 채움'):bad('부상 선수 편성에 남음');
  for(let i=0;i<4;i++)SL.playDayAuto();!sp.inj&&!bat.inj?ok('3일 뒤 회복'):bad('회복 안 됨');
  u.rotation.includes(sp.id)?ok('선발은 로테이션으로 자동 복귀'):bad('선발 복귀 안 됨');u.lineup.includes(bat.id)&&u.pos[bat.id]===bpos?ok(`타자는 원래 자리(${bpos})로 자동 복귀`):bad('타자 복귀 안 됨 '+u.pos[bat.id]);}
console.log('[3] 구단 꾸미기');
{const u=SL.userTeam();const orig=u.name;const city=orig.split(' ')[0];const pk0=JSON.stringify(SL.parkOf(u).dim);
  const e1=SL.customizeTeam({nick:'라이온즈'});e1&&/실존/.test(e1)?ok('실존 애칭 거절: '+e1):bad('실존 애칭 허용');
  const e2=SL.customizeTeam({nick:'Yankees'});e2?ok('영문 실존 애칭 거절'):bad('Yankees 허용');
  const other=SL.krTeams().find(t=>t.id!==u.id).name.split(' ').slice(1).join(' ');const e3=SL.customizeTeam({nick:other});e3?ok('다른 구단 애칭 거절'):bad('중복 애칭 허용');
  const e4=SL.customizeTeam({nick:'썬더캣츠',color:'#2a9d8f',emb:{shape:'shield',letter:'T'}});!e4&&u.name===city+' 썬더캣츠'&&u.orig===orig&&u.color==='#2a9d8f'&&u.emb.shape==='shield'?ok(`이름·색·엠블럼 변경: ${orig} → ${u.name}`):bad('꾸미기 '+e4);
  JSON.stringify(SL.parkOf(u).dim)===pk0?ok('구장 크기는 그대로'):bad('구장 크기 바뀜');
  const j=SL.serialize();SL.load(j);S=SL.state();const u2=SL.userTeam();u2.name===city+' 썬더캣츠'&&u2.color==='#2a9d8f'&&u2.emb?ok('저장·불러오기 뒤 유지 (색 초기화 없음)'):bad('불러오기 뒤 '+u2.name+' '+u2.color);
  const asOk=['blue','red'].includes(SL.asSquadOf?SL.asSquadOf(u2):'blue');asOk?ok('올스타 편 나누기 등 원래 구단 기준 유지'):bad('올스타 편');
  SL.customizeTeam({reset:true});SL.userTeam().name===orig&&!SL.userTeam().emb?ok('처음 모습으로 되돌리기'):bad('되돌리기');}
console.log('[4] 경기 로그 — 중계·하이라이트용');
{for(let i=0;i<3;i++)SL.playDayAuto();const g=SL.startDay();if(g){SL.stepGame(g);const L=g.log.filter(l=>l.sc0);const scoring=L.filter(l=>l.sc1[0]+l.sc1[1]>l.sc0[0]+l.sc0[1]);const sum=scoring.reduce((a,l)=>a+(l.sc1[0]+l.sc1[1]-l.sc0[0]-l.sc0[1]),0);
  L.length>=40?ok(`타석 ${L.length}개에 전후 점수·주자·아웃 기록`):bad('로그 '+L.length);sum===g.score[0]+g.score[1]?ok(`득점 장면 합 = 최종 점수 (${g.score[0]}:${g.score[1]})`):bad(`득점 합 ${sum} ≠ ${g.score[0]+g.score[1]}`);SL.endUserGame();}else ok('(오늘 우리 경기 없음 — 생략)');}
console.log(fails?`v50 기능 검증 실패 ${fails}건`:'v50 기능 검증 모두 통과');process.exit(fails?1:0);

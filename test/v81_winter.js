// v81 (R065): 겨울 「처리할 일」 하나로 — 처리하면 모든 목록에서 함께 사라짐 · 숨은 마감 없음 · 바로가기 정확 · 신인 계약+훈련 한 창 · 광고 제안 바로 결정 · 한 화면
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();let k=0;while(SL.state().phase==='season'&&k++<400){UI.autoDays(999);UI.closeModal();const S=SL.state();if(S.liveGame){UI.step('game');UI.endGame();UI.closeModal();}}UI.closeModal();UI.setTab('home');});
  const T=()=>p.evaluate(()=>({titles:[...document.querySelectorAll('.mkcard.todo .mail.td .t')].map(e=>e.textContent),all:document.body.innerText,sh:document.documentElement.scrollHeight,ih:innerHeight}));
  // 1. 겨울 감독실 구성: 맨 위 주차·마감 / 처리할 일 / 보강 목표 / 하단 진행 · 예전 중복 칸 없음
  {const r=await p.evaluate(()=>({wk:(document.querySelector('.wkbar')||{}).innerText||'',todo:!!document.querySelector('.mkcard.todo'),goal:!!document.querySelector('.mkcard.wgoal'),go:!!document.querySelector('.gobar .mkgo'),old:/이번 주 결정할 일|진행 중인 영입|할 일 보드/.test(document.querySelector('.content').innerText),steps:!!document.querySelector('.content .osteps')}));
    /겨울 \d주차/.test(r.wk)&&r.todo&&r.go&&!r.old&&!r.steps?ok(`겨울 감독실: 「${r.wk.replace(/\s+/g,' ')}」 · 처리할 일 하나 · 하단 진행 · 예전 목록(이번 주 결정·진행 중 영입·할 일 보드) 없음`):bad('겨울 감독실 구성 '+JSON.stringify(r));}
  // 2. 숨은 마감 없음: 코치 계약 만료 · 겨울리그 파견 요청 · 스폰서가 처리할 일에 (접힌 칸이 아니라)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();if(ut.staff&&ut.staff[0])ut.staff[0].years=0;UI.setTab('home');const ex=(ut.staff||[]).filter(c=>c.years<=0).length;const disp=S.dispatch&&S.dispatch.phase==='open'?S.dispatch.reqs.length:0;const t=[...document.querySelectorAll('.mkcard.todo .mail.td')].map(e=>e.innerText).join('\n');return {ex,disp,t,spon:!!(ut.spon&&!ut.spon.main&&ut.spon.offers.length)};});
    const okC=!r.ex||/재계약 코치/.test(r.t),okD=!r.disp||/파견/.test(r.t),okS=!r.spon||/개막 전까지|스폰서/.test(r.t);okC&&okD&&okS?ok(`마감 있는 일은 처리할 일에: 코치 만료 ${r.ex} · 파견 요청 ${r.disp} · 스폰서 ${r.spon?'있음':'없음'}`):bad('숨은 마감 '+JSON.stringify(r));}
  // 3. 계약 → 배치 정하기 → (제안과 다른 자리라도) 정하면 감독실·영입 현황·결정할 일 모두에서 사라짐. 지난 시즌 계약은 남지 않음
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const lin=ut.lineup.map(id=>S.players[id]);
      const cand=SL.krTeams().filter(t=>!t.isUser).flatMap(t=>t.lineup.map(id=>S.players[id])).filter(x=>x&&!SL.isPitcher(x)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a));let pick=null;
      for(const x of cand.slice(0,40)){const from=S.teams[x.teamId];from.roster=from.roster.filter(i=>i!==x.id);from.lineup=from.lineup.filter(i=>i!==x.id);x.teamId=ut.id;ut.roster.push(x.id);const pl=SL.placePlan(x.id);if(pl&&!pl.done&&!pl.none){pick=x;break;}}
      if(!pick)return {skip:true};S.signQ=(S.signQ||[]);S.signQ.push({pid:pick.id,c:S.clock});
      // 지난 시즌에 계약한 선수(오래된 기록)
      const old=cand.find(x=>x.teamId!==ut.id);let oldId=null;if(old){const from=S.teams[old.teamId];from.roster=from.roster.filter(i=>i!==old.id);from.lineup=from.lineup.filter(i=>i!==old.id);old.teamId=ut.id;ut.roster.push(old.id);S.signQ.push({pid:old.id,c:S.clock-60});oldId=old.id;}
      UI.setTab('home');const t1=[...document.querySelectorAll('.mkcard.todo .mail.td .t')].map(e=>e.textContent);const d1=decCount();
      UI.placeRole(pick.id,'bench');UI.setTab('home');const t2=[...document.querySelectorAll('.mkcard.todo .mail.td .t')].map(e=>e.textContent);
      UI.go('market','deals');const prog=[...document.querySelectorAll('.mkcard')].filter(c=>/답변 필요|기다리는 중/.test(c.innerText));const inProg=prog.some(c=>[...c.querySelectorAll(':scope>.deal')].some(d=>d.innerText.includes(pick.name)));const inDone=[...document.querySelectorAll('details.tdone .deal')].some(d=>d.textContent.includes(pick.name));
      UI.setTab('home');return {name:pick.name,old:oldId?S.players[oldId].name:null,t1,t2,inProg,inDone};
      function decCount(){return 0;}});
    if(r.skip)ok('배치 시험: 이 시드엔 배치 제안이 생기는 선수가 없음');
    else{const a=r.t1.some(t=>t.includes(r.name+' 배치')),b2=!r.t2.some(t=>t.includes(r.name)),c=!r.old||!r.t1.some(t=>t.includes(r.old));a&&b2&&!r.inProg&&r.inDone&&c?ok(`계약 직후 「${r.name} 배치 정하기」 → 다른 자리(벤치)로 정해도 감독실·영입 현황 진행 중에서 사라지고 「완료」 접힘으로 · 지난 시즌 계약(${r.old})은 안 뜸`):bad('배치 완료 동기화 '+JSON.stringify(r));}}
  // 4. 바로가기: 보강 목표 「후보 찾기」 → FA 목록(빈 영입 현황이 아님) · 「대기 N」은 대기 창
  {const r=await p.evaluate(()=>{UI.setTab('home');const g=[...document.querySelectorAll('.wgoal .goal2')].find(b=>/보강 ›/.test(b.innerText));if(!g)return {none:true};g.click();const sub=UI&&document.querySelector('.stv')?document.body.innerText:'';const at=(window.__ui_sub||'');UI.setTab('home');return {on:g.getAttribute('onclick'),ok:/market','fa'/.test(g.getAttribute('onclick'))};});
    r.none||r.ok?ok(`보강 목표 바로가기: ${r.none?'(진행 중·완료라 후보 찾기 없음)':r.on}`):bad('보강 목표 바로가기 '+JSON.stringify(r));}
  // 5. 개인 광고 제안: 처리할 일에서 바로 수락·거절 창
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const pid=ut.lineup[0];S.endorseOffers=(S.endorseOffers||[]).concat([{id:98765,pid,co:'시험식품',fee:20000000,years:2,exp:S.clock+3}]);UI.setTab('home');const row=[...document.querySelectorAll('.mkcard.todo .mail.td')].find(e=>/개인 광고|시험식품/.test(e.innerText));if(!row)return {row:false};
      row.querySelector('button').click();let m=document.querySelector('#modal');if(m&&/개인 광고 제안 \d/.test(m.innerText)){const b=[...m.querySelectorAll('.mail.td button')].find(x=>x.closest('.mail').innerText.includes('시험식품'));b.click();m=document.querySelector('#modal');}
      const has=m&&/수락/.test(m.innerText)&&/거절/.test(m.innerText);const acc=[...(m?m.querySelectorAll('button'):[])].find(x=>x.textContent==='거절');if(acc)acc.click();const gone=!(S.endorseOffers||[]).some(o=>o.id===98765);UI.setTab('home');const still=/시험식품/.test(document.querySelector('.mkcard.todo').innerText);return {row:true,has,gone,still};});
    r.row&&r.has&&r.gone&&!r.still?ok('개인 광고 제안: 처리할 일 → 바로 수락·거절 창 → 거절하면 목록에서 사라짐'):bad('광고 제안 '+JSON.stringify(r));}
  // 6. 스폰서·광고판: 관리 화면 대신 고르는 창
  {const r=await p.evaluate(()=>{UI.sponView('main');const a=(document.querySelector('#modal')||{}).innerText||'';UI.sponView('board');const c=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();return {a:/메인 스폰서 고르기/.test(a),c:/광고판/.test(c)};});
    r.a&&r.c?ok('스폰서·광고판: 처리할 일에서 바로 고르는 창'):bad('스폰서 창 '+JSON.stringify(r));}
  // 7. 신인 지명 → 계약+훈련 방향 한 창 → 다음 신인
  {const r=await p.evaluate(()=>{const S=SL.state();let g=0;while(S.draft&&!S.draft.done&&SL.draftMyLeft()>0&&g++<5){UI.draftAutoGo();UI.closeModal();}const pd=SL.draftPending().sort((a,b)=>a.drafted.no-b.drafted.no);if(pd.length<2)return {skip:pd.length};
      UI.setTab('home');const row=[...document.querySelectorAll('.mkcard.todo .mail.td')].find(e=>/신인 계약/.test(e.innerText));if(!row)return {row:false};row.querySelector('button').click();const m1=document.querySelector('#modal').innerText;
      const p0=pd[0];const F=SL.isPitcher(p0)?SL.FOCUS_PIT:SL.FOCUS_BAT;const keys=Object.keys(F);const k=keys.find(x=>x!==SL.diagnose(p0).rec)||keys[0];UI.dsFocus(p0.id,k);UI.dsGo(p0.id,true);const m2=(document.querySelector('#modal')||{}).innerText||'';
      return {n:pd.length,m1:m1.slice(0,40),signed:!p0.drafted&&p0.teamId===SL.userTeam().id,focus:p0.focus===k,next:/신인 계약 1\/\d/.test(m2)&&m2.includes(pd[1].name),k:F[k]};});
    if(r.skip!=null)ok('신인 계약 창: 이 시드에선 계약 대기 '+r.skip+'명');else r.signed&&r.focus&&r.next?ok(`신인 계약 창: 계약 + 훈련 「${r.k}」 지정 → 바로 다음 신인 (${r.n}명)`):bad('신인 계약 창 '+JSON.stringify(r));
    await p.evaluate(()=>UI.closeModal());}
  // 9 (v82). 구직·구인 겨울 지원: 평판 부족 → 서류 탈락 / 평판 충분 → 감독 제의가 처리할 일에
  {const r=await p.evaluate(()=>{const S=SL.state();if(S.week>2)return {skip:true};const B=SL.jobBoard();if(!B.list.length)return {skip:true};const rep0=S.mgr.rep;const lo=B.list.find(x=>!x.ok);let e1=null;if(lo)e1=SL.applyJob(lo.t.id);
      S.mgr.rep=99;const B2=SL.jobBoard();const hi=B2.list.find(x=>x.ok&&!x.applied);const e2=hi?SL.applyJob(hi.t.id):'없음';const offered=hi&&S.jobOffers.some(o=>o.team===hi.t.id);const again=hi?SL.applyJob(hi.t.id):null;UI.setTab('home');const t=document.querySelector('.mkcard.todo').innerText;
      S.jobOffers=S.jobOffers.filter(o=>!hi||o.team!==hi.t.id);S.mgr.rep=rep0;return {e1,e2,offered,again,inTodo:/감독 제의|감독 구인/.test(t),hi:hi&&hi.t.name};});
    r.skip?ok('구직 지원: 이 시드·주차엔 해당 없음'):(r.e2===null&&r.offered&&r.again&&r.inTodo&&(r.e1===null||/평판이 부족/.test(r.e1))?ok(`구직 지원: 평판 부족은 「${(r.e1||'-').slice(0,26)}…」 · 충분하면 ${r.hi} 감독 제의 → 처리할 일 · 같은 구단 재지원 막힘`):bad('구직 지원 '+JSON.stringify(r)));}
  // 8. 390×844 · 360×740 에서 겨울 감독실 「다음 주로」가 스크롤 없이 보임 (v120: 한 화면 → 단추 고정)
  for(const [w,h] of [[390,844],[360,740]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>UI.setTab('home'));await p.waitForTimeout(60);const r=await T();const g=await p.evaluate(()=>{scrollTo(0,0);const b=document.querySelector('.gobar .mkgo').getBoundingClientRect();const n=document.querySelector('.nav').getBoundingClientRect();return {b:Math.round(b.bottom),n:Math.round(n.top),t:Math.round(b.top)};});/* v120 (R102): 시안대로 그림을 크게 — 할 일이 많으면 내려 보되 「다음 주로」는 늘 화면 아래에 붙어 보임 */g.t>0&&g.b<=g.n+1?ok(`겨울 감독실 ${w}×${h} 「다음 주로」 스크롤 없이 보임 (처리할 일 ${r.titles.length}줄)`):bad(`겨울 감독실 ${w}×${h} 단추 ${g.t}~${g.b} / 아래 메뉴 ${g.n} `+r.titles.join(' / '));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v81 겨울 검사 실패 ${fails}건`:'v81 겨울 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

// v176 (R147): 직접 본 경기 끝 → 창 없음 · 진행 방식 기본 = 이닝(공수교대 화면 건너뜀) · 라이벌 = 가까운 연고
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
// 1. 라이벌 짝 — 가까운 연고 · 서로 짝 · 예전 저장(v2)은 다시 고름
{const want={KR:[['부산 돌핀스','창원 스톰'],['서울 머스탱스','서울 콘도르스'],['인천 세일러스','서울 피닉스']],TW:[['타이베이 매그파이즈','신베이 오키드스'],['가오슝 오션스','타이난 버팔로스']],JP:[['사이타마 블리츠','치바 서프스'],['도쿄 선라이즈','도쿄 나이츠']],US:[['애너하임 선셋츠','로스앤젤레스 스타라이트'],['마이애미 플라밍고스','탬파베이 펠리컨스']]};
  for(const lg of Object.keys(want)){SL.newGame(17601,2,{games:36,league:lg});const S=SL.state();const by=n=>Object.values(S.teams).find(t=>t.name===n);const miss=want[lg].filter(([a,b])=>{const A=by(a),B=by(b);return !A||!B||SL.rivalOfTeam(A).id!==B.id||SL.rivalOfTeam(B).id!==A.id;});
    const ut=SL.userTeam();const id0=SL.rivalId();S.rival={v:2,me:ut.id,id:-1,hist:[]};const id1=SL.rivalId();
    !miss.length&&id1===id0&&S.rival.v===3&&id0===SL.rivalOfTeam(ut).id?ok(`${lg}: ${want[lg].map(x=>x.join(' ↔ ')).join(' · ')} · 예전 저장 다시 고름`):bad(`${lg} 짝 `+JSON.stringify({miss,id0,id1}));}}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html');
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860,m:0}]){const c=await b.newContext(vp.m?{viewport:{width:vp.width,height:vp.height},isMobile:true,hasTouch:true}:{viewport:{width:vp.width,height:vp.height}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(4);UI.newGame();const t=document.querySelector('.tut button.primary,.tut button:last-child');if(t)t.click();UI.closeModal();});await p.waitForTimeout(300);
    await p.evaluate(()=>{let k=0;while(!SL.userGameToday()&&k++<6){UI.autoDays(1);UI.closeModal();}UI.setTab('home');UI.startGame();});await p.waitForTimeout(500);
    // 2. 기본 = 이닝 · 큰 단추만 눌러 끝까지 — 공수교대 화면은 처음 한 번만
    let taps=0,inter=0,first=null,md0=null;
    for(let i=0;i<200;i++){const st=await p.evaluate(()=>{const lg=SL.state().liveGame;if(!lg||lg.done)return {done:1};const m=document.querySelector('#modal');if(m){UI.closeModal();return {modal:1};}const it=document.querySelector('.cmint');if(it){const x=document.querySelector('.cmpick button');const t=x.querySelector('small').textContent;x.click();return {inter:1,t};}const g=document.querySelector('.cmgo .gold');const md=(document.querySelector('.cmmd')||{}).innerText||'';g.click();return {tap:1,md,g:g.textContent};});
      if(st.done)break;if(st.inter){inter++;if(!first)first=st.t;await p.waitForTimeout(520);}if(st.tap){taps++;if(!md0)md0=st.md.replace(/\s+/g,' ').trim()+' / '+st.g.trim();}await p.waitForTimeout(30);}
    const done=await p.evaluate(()=>{const lg=SL.state().liveGame;return !!(lg&&lg.done);});
    done&&/이닝 ▾ \/ 이닝 끝까지 ▶/.test(md0||'')&&inter<=1&&(!first||/이닝마다/.test(first))&&taps>=16&&taps<=30?ok(`${vp.width}px: 진행 방식 [${md0}] · 한 경기 ${taps}번 · 공수교대 화면 ${inter}번${first?` 「${first}」`:''}`):bad(`${vp.width}px 이닝 진행 `+JSON.stringify({done,md0,taps,inter,first}));
    // 3. 경기 끝 → 창 없이 감독실
    await p.evaluate(()=>UI.endGame());await p.waitForTimeout(800);
    const r=await p.evaluate(()=>({modal:!!document.querySelector('#modal'),live:!!SL.state().liveGame,home:!!document.querySelector('.content')&&document.body.classList.contains('ingame')===false}));
    !r.modal&&!r.live&&r.home?ok(`${vp.width}px: 경기 끝 → 창 없음 · 감독실`):bad(`${vp.width}px 경기 끝 `+JSON.stringify(r));
    // 4. 자동 진행 결과 창은 그대로(휴대폰)
    if(vp.m){await p.evaluate(()=>{UI.autoRun(1);});await p.waitForTimeout(1500);const a=await p.evaluate(()=>({rs:!!document.querySelector('#modal .rsheet')}));a.rs?ok('자동 진행 결과 창은 그대로'):bad('자동 결과 창 '+JSON.stringify(a));}
    await c.close();}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v176 통과');process.exit(fails?1:0);})();

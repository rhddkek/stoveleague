// v153 (R124): 2시즌 전수 점검 — 요구대로 = 실제 요구 · 육성군 단추 이름 · 코치 재계약 창 · 파견 창 닫기 · 알약 숨김 · 남은 지명 추천대로 · 캠프 안내
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const boot=async()=>{const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();});await p.waitForTimeout(300);return p;};
  const click=(p,re,sel)=>p.evaluate(([re,sel])=>{const b=[...document.querySelectorAll(sel)].filter(x=>x.offsetParent&&!x.disabled).find(x=>new RegExp(re).test(x.textContent.trim()));if(b){b.click();return b.textContent.replace(/\s+/g,' ').trim();}return '';},[re,sel]);
  // 1. 요구대로 → 계약 확정 → 실제 계약 (국내 영입 3명) · 1년으로 바꾸면 요구가 같이 오르고 그 값으로도 성사
  {const p=await boot();const ids=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();return Object.values(S.players).filter(q=>q.teamId!=null&&q.teamId!==ut.id&&S.teams[q.teamId].league==='KR'&&!SL.isFgn(q)&&SL.calcOvr(q)<60&&q.age>=24).slice(0,30).map(q=>q.id);});
    const out=[];for(const id of ids){if(out.length>=3)break;await p.evaluate(id=>{UI.closeModal();while(document.querySelector('.pv'))UI.back();UI.openTable(id);},id);await p.waitForTimeout(200);if(!(await p.evaluate(()=>!!document.querySelector('.pv'))))continue;
      if(await click(p,'^요구대로$','.pv button'))await p.waitForTimeout(120);if(await click(p,'^이적료 제안','.pv button')){await p.waitForTimeout(300);await click(p,'.','#modal button.primary');await p.waitForTimeout(250);}
      const st=await p.evaluate(id=>{const n=SL.state().market.negs.find(x=>x.pid===id);return n?n.stage:null;},id);if(st!=='player')continue;
      await p.evaluate(id=>{UI.closeModal();if(!document.querySelector('.pv'))UI.openTable(id);},id);await p.waitForTimeout(200);
      const one=out.length===2;   // 세 번째는 1년 계약으로: 요구가 +8% 올라야 하고 「요구액」 단추로 맞추면 성사
      let a2=null;if(one){a2=await p.evaluate(id=>{const n=SL.state().market.negs.find(x=>x.pid===id);const a0=SL.negAsk(id,{years:2}).sal;UI.setF('years',1);const a1=SL.negAsk(id,{years:1}).sal;const t=document.querySelector('.pv').innerText;UI.setF('salary',a1);return {a0,a1,shown:t.includes(SL.money?'' :'')};},id);}
      else await click(p,'^요구대로$','.pv button');await p.waitForTimeout(150);
      const lbl=await p.evaluate(()=>{const go=[...document.querySelectorAll('.pv .gobar button')].pop();return go?go.textContent.trim():'';});await click(p,'^계약 확정$|^제안하기$','.pv .gobar button');await p.waitForTimeout(350);
      out.push({lbl,signed:await p.evaluate(id=>SL.state().players[id].teamId===SL.userTeam().id,id),a2});}
    out.length===3&&out.every(x=>x.lbl==='계약 확정'&&x.signed)&&out[2].a2.a1>out[2].a2.a0?ok(`요구대로: 3명 모두 단추 「계약 확정」 → 실제 계약 · 1년 계약은 요구 ${out[2].a2.a0} → ${out[2].a2.a1}(만원)로 같이 오르고 그 값으로 성사`):bad('요구대로 '+JSON.stringify(out));
    // 2. 육성군 단추 이름
    const d=await p.evaluate(()=>{const ut=SL.userTeam();const S=SL.state();if(!ut.dev.length){const y=ut.roster.map(id=>S.players[id]).filter(q=>!ut.lineup.includes(q.id)&&!ut.rotation.includes(q.id)&&!SL.isFgn(q)).sort((a,b)=>a.age-b.age);for(const q of y){if(!SL.demoteDev(q.id))break;}}UI.closeModal();while(document.querySelector('.pv'))UI.back();UI.setTab('dev');UI.setSub('dev','dev');const t=document.querySelector('#app').innerText;const n=ut.dev.length;return {n,up:/2군 등록/.test(t),old:[...document.querySelectorAll('#app button')].some(x=>x.textContent.trim()==='1군 등록'&&/promote/.test(x.getAttribute('onclick')||''))};});
    !d.n?ok('육성군 선수가 없어 단추 이름 검사는 건너뜀'):d.up&&!d.old?ok('육성군: 단추 「2군 등록」 (1군 등록이라 쓰지 않음)'):bad('육성군 단추 '+JSON.stringify(d));await p.context().close();}
  // 3~6. 겨울
  {const p=await boot();await p.evaluate(()=>{const S=SL.state();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();UI.setTab('home');});await p.waitForTimeout(300);
    // 3. 코치 재계약: 하나씩 처리 → 재계약 ▶ → 창(1/n) → 재계약 → 다음 코치 → 보내기(두 번 눌러 확정) → 다음 할 일 창
    const c0=await p.evaluate(()=>{const ut=SL.userTeam();const ex=ut.staff.filter(c=>c.years<=0);if(ex.length<2){const more=ut.staff.filter(c=>c.years>0).slice(0,2-ex.length);more.forEach(c=>c.years=0);}UI.chainEnd();UI.setTab('home');return {ex:ut.staff.filter(c=>c.years<=0).length,n:ut.staff.length};});
    await p.evaluate(()=>{UI.taskNext();});await p.waitForTimeout(200);
    for(let i=0;i<6;i++){const t=await p.evaluate(()=>(document.querySelector('#modal .tsc b')||{}).textContent||'');if(/재계약 코치/.test(t))break;await click(p,'^나중에$','#modal button');await p.waitForTimeout(150);}
    const t0=await click(p,'재계약 ▶','#modal button');await p.waitForTimeout(300);
    const s1=await p.evaluate(()=>{const m=document.querySelector('#modal .core');return m?{ttl:m.querySelector('.mt').textContent.replace(/\s+/g,' ').trim(),dem:/요구 연봉/.test(m.innerText),prim:[...m.querySelectorAll('button.primary')].map(x=>x.textContent.trim()),y:[...m.querySelectorAll('.seg button')].length}:null;});
    await click(p,'년 재계약 ▶','#modal button');await p.waitForTimeout(300);
    const s2=await p.evaluate(()=>{const m=document.querySelector('#modal .core');const ut=SL.userTeam();return {ttl:m?m.querySelector('.mt').textContent.replace(/\s+/g,' ').trim():'',ex:ut.staff.filter(c=>c.years<=0).length};});
    await click(p,'^보내기$','#modal button');await p.waitForTimeout(200);const arm=await p.evaluate(()=>({n:SL.userTeam().staff.length,b:[...document.querySelectorAll('#modal button')].map(x=>x.textContent.trim()).find(x=>/정말 보내기/.test(x))||''}));
    await click(p,'^정말 보내기$','#modal button');await p.waitForTimeout(400);
    const s3=await p.evaluate(()=>{const ut=SL.userTeam();const m=document.querySelector('#modal');return {ex:ut.staff.filter(c=>c.years<=0).length,n:ut.staff.length,task:!!(m&&m.querySelector('.tsk')),coach:!!(m&&m.querySelector('.core')),left:m?[...m.querySelectorAll('.tsc b')].map(x=>x.textContent).join(''):''};});
    /재계약 ▶/.test(t0)&&s1&&/코치 재계약 1\/\d/.test(s1.ttl)&&s1.dem&&s1.prim.length===1&&s1.y===3&&/2\/\d/.test(s2.ttl)&&s2.ex===c0.ex-1&&arm.n===c0.n&&arm.b&&s3.ex===c0.ex-2&&s3.n===c0.n-1&&s3.task&&!s3.coach&&!/재계약 코치/.test(s3.left)
      ?ok(`코치 재계약: [${t0}] → 「${s1.ttl}」 요구 연봉 · 기간 3칸 · 노란 단추 1개 → 재계약하면 「${s2.ttl}」 → 보내기는 두 번 눌러 확정 → 다음 할 일 창`):bad('코치 재계약 '+JSON.stringify({t0,s1,s2,arm,s3,c0}));
    // 4. 파견 창: 닫기는 테두리, 노랑은 「파견」
    const dp=await p.evaluate(()=>{UI.closeModal();UI.chainEnd();const S=SL.state();const n=(S.dispatch&&S.dispatch.phase==='open'?S.dispatch.reqs.length:0);if(!n)return {n};UI.todoGrp('disp');const m=document.querySelector('#modal');const B=[...m.querySelectorAll('button')].filter(x=>x.offsetParent);const cl=B.filter(x=>x.textContent.trim()==='닫기'&&x.closest('.btns'))[0];return {n,cl:cl?cl.className:'',y:B.filter(x=>/primary/.test(x.className)).map(x=>x.textContent.trim())};});
    !dp.n?ok('파견 요청이 없어 파견 창 검사는 건너뜀'):/ghost/.test(dp.cl)&&dp.y.length&&dp.y.every(x=>x==='파견')?ok(`파견 창: 아래 「닫기」는 테두리 · 노란 단추는 「파견」 ${dp.y.length}개뿐`):bad('파견 창 '+JSON.stringify(dp));
    // 5. 알약: 지명 화면에서는 숨김 · 다른 화면에서는 보임
    const pl=await p.evaluate(async()=>{UI.closeModal();UI.chainEnd();UI.setTab('home');if(!SL.draftTurn())return {skip:1};UI.taskNext();const x=[...document.querySelectorAll('#modal button')].find(b=>/지명 ▶/.test(b.textContent));if(!x)return {skip:2};x.click();await new Promise(r=>setTimeout(r,250));const on=!!document.querySelector('.chainpill');UI.setTab('roster');await new Promise(r=>setTimeout(r,150));const other=!!document.querySelector('.chainpill');UI.go('dev','draft');await new Promise(r=>setTimeout(r,150));return {on,other,go:[...document.querySelectorAll('#app .gobar button.primary')].map(b=>b.textContent.trim()).pop()||''};});
    pl.skip?ok('지명 차례가 아니라 알약 검사는 건너뜀'):!pl.on&&pl.other&&/지명$/.test(pl.go)?ok(`알약: 지명 화면에서는 숨김(화면 단추 「${pl.go}」가 다음 걸음) · 다른 화면에서는 보임`):bad('알약 '+JSON.stringify(pl));
    // 6. 지명 확정 창 → 「남은 지명 n명 — 코치 추천대로」 → 자동 지명 → 결과 창 끝 단추 「다음 할 일 ▶」 · 뒤 목록에 계약 끝난 선수의 「계약」 단추 없음
    if(!pl.skip){const left0=await p.evaluate(()=>SL.draftMyLeft());await click(p,'지명$','#app .gobar button.primary');await p.waitForTimeout(500);
      const cr=await p.evaluate(()=>{const m=document.querySelector('#modal');const r=m&&m.querySelector('.rkrest');const done=m&&/계약 완료/.test(m.innerText);const stale=SL.draftPending().length===0&&[...document.querySelectorAll('#app button')].some(x=>/dsignView/.test(x.getAttribute('onclick')||''));return {rest:r?r.textContent.replace(/\s+/g,' ').trim():'',done,stale,left:SL.draftMyLeft()};});
      await click(p,'코치 추천대로','#modal button');await p.waitForTimeout(250);await click(p,'^자동 지명$','#modal button');await p.waitForTimeout(500);
      const ar=await p.evaluate(()=>{const m=document.querySelector('#modal');return {left:SL.draftMyLeft(),ttl:m?(m.querySelector('h3')||{}).textContent:'',end:m?[...m.querySelectorAll('button.primary')].map(x=>x.textContent.trim()).pop():''};});
      cr.left===left0-1&&new RegExp(`남은 지명 ${cr.left}명 — 코치 추천대로`).test(cr.rest)&&!cr.stale&&ar.left===0&&/자동 지명 결과/.test(ar.ttl)&&/다음 할 일 ▶/.test(ar.end)?ok(`지명: 확정 창에 「${cr.rest}」 → 누르면 남은 ${cr.left}명 한 번에 → 결과 창 끝 단추 「${ar.end}」 · 뒤 목록에 남은 「계약」 단추 없음`):bad('지명 '+JSON.stringify({left0,cr,ar}));}
    await p.context().close();}
  // 7. 스프링캠프: 3 → 4주차로 넘어오면 안 정한 캠프를 한 번 묻는다 (정했으면 묻지 않음)
  {const p=await boot();const r=await p.evaluate(async()=>{const S=SL.state();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();['draft','rook','coach','disp','comp','sd'].forEach(k=>{try{SL.setAuto(k,true);}catch(e){}});let g=0;while(S.week<3&&g++<5)SL.advanceWeek();UI.closeModal();UI.setTab('home');const w0=S.week;
      for(let i=0;i<5&&S.week===w0;i++){UI.closeModal();UI.set('guardOk',true);UI.advanceWeek();await new Promise(r=>setTimeout(r,250));}
      const m=document.querySelector('#modal');return {w0,wk:S.week,ttl:m?(m.querySelector('h3')||{}).textContent:'',B:m?[...m.querySelectorAll('.shbar button')].map(x=>x.textContent.trim()):[],prim:m?m.querySelectorAll('button.primary').length:0,set:SL.campOf(SL.userTeam()).set};});
    r.w0!==3||r.wk!==4?ok(`캠프 안내: 3 → 4주차로 넘기지 못해 건너뜀 (${r.w0} → ${r.wk}주차)`):/스프링캠프/.test(r.ttl||'')&&r.B.join('|')==='그대로 두기|캠프 정하기 ▶'&&r.prim===1&&!r.set?ok(`캠프 안내: 4주차에 「${r.ttl}」 [${r.B.join('] [')}]`):bad('캠프 안내 '+JSON.stringify(r));await p.context().close();}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v153 통과');process.exit(fails?1:0);})();

// v179 (R150): 처음 하는 사람 — 손가락 따라가기. 고리 친 단추만 눌러 첫 경기 → 7경기 자동 → 끝 · 건너뛰기 · 다시 보기 · 누름을 막지 않음
const path=require('path');const {chromium}=require('playwright');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
(async()=>{const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html');
  const st=p=>p.evaluate(()=>{const T=SL.state().tour;const r=document.getElementById('tourring'),t=document.getElementById('tourtip');const vis=!!r&&r.style.display!=='none';const rb=vis?r.getBoundingClientRect():null,tb=vis?t.getBoundingClientRect():null;
    return {i:T?T.i:-1,done:!!(T&&T.done),vis,txt:vis?t.innerText.replace(/\n/g,' | '):'',rb:rb&&[rb.x,rb.y,rb.width,rb.height],tb:tb&&[tb.x,tb.y,tb.width,tb.height],ok:vis&&!!t.querySelector('.ok'),modal:!!document.getElementById('modal'),pe:vis?getComputedStyle(r).pointerEvents:'',W:innerWidth,H:innerHeight};});
  for(const [w,h,m] of [[390,844,1],[1280,860,0]]){const c=await b.newContext(m?{viewport:{width:w,height:h},isMobile:true,hasTouch:true}:{viewport:{width:w,height:h}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();});await p.waitForTimeout(250);const t0=await p.evaluate(()=>document.querySelector('.tut').innerText);
    await p.click('.tut .primary');await p.waitForTimeout(500);
    // 1. 고리만 눌러 끝까지
    const seen=[];let last=-1,same=0,out=0,long=0,sent=0,pe=0;
    for(let k=0;k<120;k++){const s=await st(p);if(s.done)break;if(s.i!==last){last=s.i;same=0;if(s.vis)seen.push(s.txt.split(' | ')[0]);}else if(++same>45){bad(`${w}px 멈춤 `+JSON.stringify(s));break;}
      if(s.modal){await p.evaluate(()=>{const md=document.getElementById('modal');const x=[...md.querySelectorAll('button')].filter(e=>e.offsetParent).find(e=>/닫기|감독실|확인/.test(e.textContent));if(x)x.click();else UI.closeModal();});await p.waitForTimeout(250);continue;}
      if(!s.vis){await p.waitForTimeout(350);continue;}
      if(s.tb[0]<0||s.tb[1]<0||s.tb[0]+s.tb[2]>s.W+1||s.tb[1]+s.tb[3]>s.H+1)out++;const tx=s.txt.split(' | ');if(tx[0].length>18)long++;if(/습니다|하세요|!/.test(s.txt))sent++;if(s.pe!=='none')pe++;
      if(s.ok)await p.click('#tourtip .ok');else{const x=s.rb[0]+s.rb[2]/2,y=s.rb[1]+s.rb[3]/2;if(m)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);}
      await p.waitForTimeout(s.i===7?2200:400);}
    const e=await p.evaluate(()=>({done:!!(SL.state().tour&&SL.state().tour.done),day:SL.state().day,live:!!SL.state().liveGame,ring:(document.getElementById('tourring')||{style:{}}).style.display}));
    /시작하기/.test(t0)&&e.done&&e.day>=8&&!e.live&&e.ring==='none'&&seen.length>=8&&!out&&!long&&!sent&&!pe?ok(`${w}px: 고리만 눌러 ${seen.length}걸음(${seen.join(' → ')}) · ${e.day}일차 · 말풍선 화면 안 · 문장 0`):bad(`${w}px 따라가기 `+JSON.stringify({e,seen,out,long,sent,pe}));
    // 2. 다시 보기 → 건너뛰기 · 다른 곳을 눌러도 게임은 그대로
    const r2=await p.evaluate(()=>{UI.closeModal();UI.setTab('home');UI.tourStart();const a=SL.state().tour;const i0=a&&a.i;UI.go('league','standings');const on=!!SL.state().tour&&!SL.state().tour.done;UI.tourSkip();return {i0,on,done:!!SL.state().tour.done,ring:document.getElementById('tourring').style.display,tab:document.querySelector('.content')?1:0};});
    r2.i0===0&&r2.on&&r2.done&&r2.ring==='none'?ok(`${w}px: 「따라가기」 다시 시작 · 다른 화면으로 가도 그대로 · 건너뛰기 → 꺼짐`):bad(`${w}px 다시 보기 `+JSON.stringify(r2));
    await c.close();}
  // 3. 부임 창 「건너뛰기」 → 안내 없음 · 예전 저장(S.tour 없음)도 없음
  {const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();UI.tutSkip();UI.setTab('roster');UI.setTab('home');return {tour:SL.state().tour||null,ring:!!document.getElementById('tourring')};});
    !r.tour&&!r.ring?ok('부임 창 「건너뛰기」 → 안내 없음'):bad('건너뛰기 '+JSON.stringify(r));await p.close();}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v179 통과');process.exit(fails?1:0);})();

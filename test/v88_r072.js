// v88 (R072): 유저 친화 조작 — 휴대폰 뒤로 가기 · 보던 자리 · 좌우로 밀기 · 같은 탭 다시 누르기 · 맨 위로 · 손가락 크기 · PC 선수 미리보기
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const start=async p=>{await p.goto(url);await p.waitForTimeout(300);await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(3);UI.closeModal();});};
  const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});p.on('pageerror',e=>errs.push(e.message));await start(p);
  const st=()=>p.evaluate(()=>({tab:(document.querySelector('.nav .on')||{}).textContent||'',sub:((document.querySelector('.htabs2 .on')||document.querySelector('.htabs .on')||{}).textContent||'').trim(),view:!!document.querySelector('.pv'),modal:!!document.querySelector('#modal'),y:Math.round(scrollY),url:location.href}));
  // 1. 뒤로 가기: 선수 상세 → 목록(보던 자리 그대로) → 전 화면 → 전 화면 → 감독실 → 「한 번 더 누르면 나감」
  {await p.evaluate(()=>UI.setTab('roster'));await p.evaluate(()=>UI.go('market','fa'));await p.evaluate(()=>UI.go('market','buy'));await p.evaluate(()=>window.scrollTo(0,500));await p.evaluate(()=>UI.openPlayer(SL.userTeam().roster[0]));
    const s0=await st();await p.goBack();await p.waitForTimeout(120);const s1=await st();await p.goBack();await p.waitForTimeout(120);const s2=await st();await p.goBack();await p.waitForTimeout(120);const s3=await st();await p.goBack();await p.waitForTimeout(120);const s4=await st();
    await p.goBack();await p.waitForTimeout(150);const s5=await st();const tt=await p.evaluate(()=>(document.querySelector('#toast')||{}).textContent||'');
    s0.view&&!s1.view&&s1.sub==='국내 선수'&&s1.y===500&&s2.sub==='FA'&&/선수단/.test(s3.tab)&&/감독실/.test(s4.tab)&&/감독실/.test(s5.tab)&&/한 번 더/.test(tt)&&s5.url===s0.url
      ?ok(`뒤로 가기: 선수 상세 → 선수 찾기(보던 자리 ${s1.y}px 그대로) → FA → 선수단 → 감독실 → 「${tt.slice(0,22)}…」 (게임 밖으로 안 나감)`):bad('뒤로 '+JSON.stringify([s0,s1,s2,s3,s4,s5,tt]));}
  // 2. 창(시트)이 열려 있으면 뒤로 가기 = 창 닫기 · 경기 중엔 뒤로 가기로 경기를 벗어나지 않음
  {await p.evaluate(()=>{UI.go('club','fin');UI.menu();});const a=await st();await p.goBack();await p.waitForTimeout(120);const c=await st();
    await p.evaluate(()=>{let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}});const g0=await p.evaluate(()=>!!SL.state().liveGame);await p.goBack();await p.waitForTimeout(120);const g1=await p.evaluate(()=>!!SL.state().liveGame&&!!document.querySelector('.cmv'));
    await p.evaluate(()=>{UI.step&&UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();});
    a.modal&&!c.modal&&/구단/.test(c.tab)&&g0&&g1?ok('뒤로 가기: ☰ 메뉴 창 → 닫힘(재정 화면 그대로) · 경기 중엔 경기 화면 그대로'):bad('창·경기 '+JSON.stringify({a,c,g0,g1}));}
  // 3. 아래 탭: 지금 탭을 다시 누르면 맨 위로 → (맨 위에서) 그 탭 첫 화면
  {await p.evaluate(()=>UI.go('market','buy'));await p.evaluate(()=>window.scrollTo(0,700));await p.evaluate(()=>[...document.querySelectorAll('.nav .in button')].find(b=>/이적/.test(b.textContent)).click());await p.waitForTimeout(700);const y=await p.evaluate(()=>Math.round(scrollY));
    await p.evaluate(()=>[...document.querySelectorAll('.nav .in button')].find(b=>/이적/.test(b.textContent)).click());await p.waitForTimeout(100);const s=await st();
    y===0&&s.sub==='진행 중'?ok('같은 아래 탭 다시 누름: 맨 위로 → 한 번 더 누르면 이적 첫 화면(영입 현황)'):bad('다시 누름 '+y+' '+JSON.stringify(s));}
  // 4. 좌우로 밀기: 옆 화면 / 나눈 화면이면 옆 쪽 / 표 위에서 민 건 무시
  {const swipe=async(sel,dx)=>{await p.evaluate(([sel,dx])=>{const el=document.querySelector(sel);const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+Math.min(r.height/2,40);const T=(cx)=>new Touch({identifier:1,target:el,clientX:cx,clientY:y});el.dispatchEvent(new TouchEvent('touchstart',{touches:[T(x)],changedTouches:[T(x)],bubbles:true}));el.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[T(x+dx)],bubbles:true}));},[sel,dx]);await p.waitForTimeout(80);};
    await p.evaluate(()=>UI.go('roster','list'));await swipe('.content .mkcard, .content .card',-140);const a=await st();await swipe('.content .mksec, .content .mkh, .content .card',140);const b2=await st();
    await p.evaluate(()=>UI.go('club','fin'));await swipe('.content .stv,.content .card',-140);const pg=await p.evaluate(()=>(document.querySelector('.pgtabs .on')||{}).textContent||'');
    await p.evaluate(()=>UI.go('market','buy'));await swipe('.content table',-140);const c=await st();
    a.sub==='타순·수비'&&b2.sub==='선수'&&/^2/.test(pg)&&c.sub==='국내 선수'?ok(`좌우로 밀기: 선수 ← → 타순·수비 · 재정은 다음 쪽(${pg}) · 표 위에서 민 건 그대로`):bad('밀기 '+JSON.stringify({a,b2,pg,c}));}
  // 5. 맨 위로 단추: 600px 넘게 내리면 보임 · 누르면 맨 위
  {await p.evaluate(()=>{UI.go('market','buy');window.scrollTo(0,900);});await p.waitForTimeout(100);const on=await p.evaluate(()=>document.querySelector('#totop').classList.contains('on'));await p.evaluate(()=>document.querySelector('#totop').click());await p.waitForTimeout(700);const y=await p.evaluate(()=>Math.round(scrollY));const off=await p.evaluate(()=>!document.querySelector('#totop').classList.contains('on'));
    on&&y===0&&off?ok('「↑ 맨 위」: 길게 내리면 오른쪽 아래에 나타남 → 누르면 맨 위, 단추 사라짐'):bad('맨 위 '+JSON.stringify({on,y,off}));}
  // 6. 손가락 크기: 아래 줄 칩 32px 이상 · 켜진 칩은 줄 안에 보임
  {const r=await p.evaluate(()=>{UI.go('club','data');const row=document.querySelector('.htabs2');const on=row.querySelector('.on');const rb=row.getBoundingClientRect(),ob=on.getBoundingClientRect();const hs=[...document.querySelectorAll('.htabs2 button')].map(b=>b.offsetHeight);return {min:Math.min(...hs),vis:ob.left>=rb.left-1&&ob.right<=rb.right+1,t:on.textContent};});
    r.min>=32&&r.vis?ok(`칩 높이 ${r.min}px 이상 · 줄 끝에 있던 「${r.t}」도 켜지면 보이게 밀려 옴`):bad('칩 '+JSON.stringify(r));}
  await p.close();
  // 7. PC: 선수 이름에 마우스 → 선수 미리보기 카드 (이름·나이·종합)
  {const q=await b.newPage({viewport:{width:1280,height:800}});q.on('pageerror',e=>errs.push(e.message));await start(q);await q.evaluate(()=>UI.go('roster','list'));await q.waitForTimeout(100);
    const el=await q.$('.pname');const nm=await el.textContent();const bb=await el.boundingBox();await q.mouse.move(bb.x+8,bb.y+5);await q.waitForTimeout(600);
    const r=await q.evaluate(()=>{const c=document.getElementById('hovcard');return c?{on:c.classList.contains('on'),t:c.innerText}:null;});await q.mouse.down();await q.mouse.up();
    r&&r.on&&r.t.includes(nm.trim())&&/종합/.test(r.t)&&/세/.test(r.t)?ok(`PC 선수 미리보기: 「${nm.trim()}」에 마우스 → ${r.t.replace(/\n/g,' ').slice(0,46)}`):bad('미리보기 '+JSON.stringify(r)+nm);await q.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v88 검사 실패 ${fails}건`:'v88 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

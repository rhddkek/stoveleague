// v91 (R075): 타순·수비 끌어다 놓기 + 눌러서 옮기기 · 기본 어두운 테마
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();});
  // 1. 기본 테마 어두움 (새 브라우저) · 설정에 「밝은 색 / 어두운 색」 그대로
  {const r=await p.evaluate(()=>{const t=document.documentElement.dataset.theme;const bg=getComputedStyle(document.querySelector('#app')).backgroundColor;UI.go('club','data');const all=document.body.innerText+[...document.querySelectorAll('.pghide')].map(e=>e.textContent).join('');const has=/밝은 색/.test(all)&&/어두운 색/.test(all);UI.setTab('home');return {t,bg,has};});
    r.t==='dark'&&r.has?ok(`기본 테마 어두움 (#app 바탕 ${r.bg}) · 설정에서 밝은 색으로 바꿀 수 있음`):bad('테마 '+JSON.stringify(r));}
  // 2. 마우스 끌기: 1번 타자 손잡이를 4번 줄에 놓으면 순서 교환
  {await p.evaluate(()=>{UI.go('roster','lineup');UI.pgGo('roster:lineup',1);});await p.waitForTimeout(150);
    const r=await p.evaluate(()=>{const rows=[...document.querySelectorAll('tr.lurow')];const h=rows[0].querySelector('.luh').getBoundingClientRect();const t=rows[3].getBoundingClientRect();return {hx:h.x+h.width/2,hy:h.y+h.height/2,tx:t.x+t.width/2,ty:t.y+t.height/2,l0:SL.userTeam().lineup.slice(),pos0:Object.assign({},SL.userTeam().pos)};});
    await p.mouse.move(r.hx,r.hy);await p.mouse.down();await p.mouse.move(r.hx+6,r.hy+6);const ghost=await p.evaluate(()=>!!document.querySelector('.lughost'));await p.mouse.move(r.tx,r.ty,{steps:6});const hl=await p.evaluate(()=>document.querySelectorAll('tr.lurow.ludrop').length);await p.mouse.up();await p.waitForTimeout(200);
    const l1=await p.evaluate(()=>({l:SL.userTeam().lineup.slice(),pos:Object.assign({},SL.userTeam().pos),modal:!!document.querySelector('#modal')}));
    const posSame=r.l0.every(id=>r.pos0[id]===l1.pos[id]);
    ghost&&hl===1&&l1.l[3]===r.l0[0]&&l1.l[0]===r.l0[3]&&posSame&&!l1.modal?ok('끌기(마우스): 1번 타자 → 4번 줄에 놓으니 1·4번 교환, 수비 위치는 그대로, 끄는 동안 이름표·놓을 줄 강조'):bad('끌기 '+JSON.stringify({ghost,hl,l0:r.l0.slice(0,4),l1:l1.l.slice(0,4),posSame}));}
  await p.waitForTimeout(400);
  // 3. 눌러서 옮기기: ⋮⋮ 누르면 「옮기는 중」 → 다른 줄 누르면 교환 · 취소 가능
  {const r=await p.evaluate(()=>{const l0=SL.userTeam().lineup.slice();document.querySelectorAll('tr.lurow .luh')[1].click();const mv=!!document.querySelector('.lumv');const tgt=document.querySelectorAll('tr.lurow.tgt').length;document.querySelectorAll('tr.lurow')[5].click();const l1=SL.userTeam().lineup.slice();const gone=!document.querySelector('.lumv');
      document.querySelectorAll('tr.lurow .luh')[0].click();UI.luCancel();const l2=SL.userTeam().lineup.slice();return {mv,tgt,sw:l1[5]===l0[1]&&l1[1]===l0[5],gone,cancel:l2.join()===l1.join()};});
    r.mv&&r.tgt===8&&r.sw&&r.gone&&r.cancel?ok('눌러서 옮기기: ⋮⋮ → 「옮기는 중」 띠(다른 8줄 선택 가능) → 6번 줄 누르니 2·6번 교환 · 취소하면 그대로'):bad('눌러서 '+JSON.stringify(r));}
  // 4. 터치: 수비 자리를 길게 눌러 다른 자리에 놓으면 포지션 교환 (타순은 그대로)
  {await p.evaluate(()=>UI.pgGo('roster:lineup',0));await p.waitForTimeout(150);
    const r=await p.evaluate(()=>{const s=[...document.querySelectorAll('.dia .dslot:not(.empty)')];const a=s.find(x=>/LF/.test(x.textContent)),b2=s.find(x=>/RF/.test(x.textContent));const ra=a.getBoundingClientRect(),rb=b2.getBoundingClientRect();const ut=SL.userTeam();const lf=ut.lineup.find(id=>ut.pos[id]==='LF'),rf=ut.lineup.find(id=>ut.pos[id]==='RF');return {ax:ra.x+ra.width/2,ay:ra.y+ra.height/2,bx:rb.x+rb.width/2,by:rb.y+rb.height/2,lf,rf,l0:ut.lineup.slice()};});
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.ax,y:r.ay}]});await p.waitForTimeout(320);
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.ax+(r.bx-r.ax)*i/6,y:r.ay+(r.by-r.ay)*i/6}]});await p.waitForTimeout(30);}
    const ghost=await p.evaluate(()=>!!document.querySelector('.lughost'));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);
    const q=await p.evaluate(()=>{const ut=SL.userTeam();return {lf:ut.lineup.find(id=>ut.pos[id]==='LF'),rf:ut.lineup.find(id=>ut.pos[id]==='RF'),l1:ut.lineup.slice(),modal:!!document.querySelector('#modal')};});
    ghost&&q.lf===r.rf&&q.rf===r.lf&&q.l1.join()===r.l0.join()&&!q.modal?ok('끌기(터치 길게): 좌익수 자리 → 우익수 자리에 놓으니 두 선수 포지션 교환, 타순 그대로, 선수 고르기 창은 안 열림'):bad('터치 끌기 '+JSON.stringify({ghost,q,lf:r.lf,rf:r.rf}));}
  await p.waitForTimeout(400);
  // 5. 그냥 톡 누르면 예전대로 (줄 → 선택, 자리 → 선수 고르기 창)
  {const r=await p.evaluate(()=>{const s=document.querySelector('.dia .dslot');s.click();const m=!!document.querySelector('#modal');UI.closeModal();UI.pgGo('roster:lineup',1);const row=document.querySelectorAll('tr.lurow')[4];const pid=+row.dataset.pid;row.click();const sel=(SL.userTeam().lineup[4]===pid&&document.querySelectorAll('tr.lurow')[4].classList.contains('sel'));return {m,sel};});
    r.m&&r.sel?ok('톡 누름은 그대로: 자리 → 선수 고르기 창 · 줄 → 선택'):bad('톡 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v91 검사 실패 ${fails}건`:'v91 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

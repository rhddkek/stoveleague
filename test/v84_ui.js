// v84 (R068) 화면: 장비(상점 · 장비관리) · 코치관리(부서 칸 · EMPTY → 후보 카드 ◀ ▶ → 영입)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();});
  {const r=await p.evaluate(()=>{UI.go('dev','equip');UI.eqF('v','shop');const g=document.querySelectorAll('.eqgrid button').length;const t=document.querySelector('.eqsel').innerText;const c0=SL.userTeam().cash;UI.eqBuyAsk('b_pow');const ask=document.querySelector('#modal').innerText;UI.eqBuyGo('b_pow');const done=document.querySelector('#modal').innerText;UI.closeModal();
      UI.eqF('v','on');const pid=SL.userTeam().lineup[0];UI.eqF('pid',pid);const inv=[...document.querySelectorAll('.eqgrid.inv button')];inv[0].click();const slot=document.querySelector('.eqslots .full');const fx=document.querySelector('.eqfx').innerText;return {g,t,ask:/이대로 사시겠습니까/.test(ask),done:/장비관리/.test(done),paid:c0-SL.userTeam().cash,slot:!!slot,fx,ow:document.documentElement.scrollWidth-innerWidth};});
    r.g===6&&/파워 배트/.test(r.t)&&r.ask&&r.done&&r.paid===25000&&r.slot&&/파워 \+2/.test(r.fx)&&r.ow<=0?ok(`장비: 상점 격자 ${r.g}칸 · ◀ 파워 배트 ▶ · 사기 확인 → 구매 완료(「장비관리」로) · 보관함 눌러 끼우기 → 「${r.fx}」`):bad('장비 화면 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{UI.go('club','staff');const rows=document.querySelectorAll('.cod').length;const emp=document.querySelector('.co.emp');const d=emp.getAttribute('onclick').match(/'(\w+)'/)[1];emp.click();const m1=document.querySelector('#modal').innerText;const n0=(SL.userTeam().staff||[]).length;
      const nx=[...document.querySelectorAll('.cosc .card3>button')][1];if(nx&&!nx.disabled)nx.click();const m2=document.querySelector('#modal').innerText;const hire=[...document.querySelectorAll('#modal button')].find(x=>/영입/.test(x.textContent)&&!x.disabled);if(!hire)return {rows,m1,none:true};hire.click();const conf=document.querySelector('#modal').innerText;[...document.querySelectorAll('#modal button')].find(x=>x.textContent==='영입').click();
      return {rows,carousel:/1\/\d/.test(m1)&&/2\/\d/.test(m2),conf:/영입하시겠습니까/.test(conf),hired:(SL.userTeam().staff||[]).length===n0+1};});
    r.rows===6&&r.carousel&&r.conf&&r.hired?ok('코치관리: 부서 6칸 · EMPTY → 후보 카드 ◀ ▶ (1/N → 2/N) → 영입 확인 → 코치진에 들어감'):bad('코치관리 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v84 화면 검사 실패 ${fails}건`:'v84 화면 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

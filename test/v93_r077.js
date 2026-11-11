// v93 (R077): unslop 전광판 방향 — 밤색 바탕 · 강조 노랑 하나 · 선택은 회백색 · 이모지 → 선 아이콘 · 굵기 600 이하 · 기울임 없음 · 이름 링크 모양 없음 · 경기 화면은 그대로
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(5);UI.closeModal();});
  const allScreens=()=>p.evaluate(()=>{const keys=[];for(const t of ['home','roster','dev','market','league','club']){keys.push([t,null]);UI.setTab(t);[...document.querySelectorAll('.htabs button,.htabs2 button')].forEach(b=>{const m=(b.getAttribute('onclick')||'').match(/setSub\('(\w+)','(\w+)'\)/);if(m)keys.push([m[1],m[2]]);});}return keys;});
  const keys=await allScreens();
  // 1. 바탕: 밤색(채도 낮음) · 카드도 무채색에 가까움
  {const r=await p.evaluate(()=>{UI.setTab('home');const hsl=c=>{const [r,g,b]=c.match(/\d+/g).map(Number).map(x=>x/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;return {s:mx===mn?0:(l>.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn)),l};};
      const app=getComputedStyle(document.querySelector('#app')).backgroundColor;const card=getComputedStyle(document.querySelector('.card,.mkcard,.tile')).backgroundColor;return {app,card,a:hsl(app),c:hsl(card),theme:document.documentElement.dataset.theme};});
    r.theme==='dark'&&r.a.s<.2&&r.c.s<.2&&r.a.l<.12?ok(`밤색 바탕 ${r.app} · 카드 ${r.card} (예전 남색 #0d1a36 · #15264b)`):bad('바탕 '+JSON.stringify(r));}
  // 2. 모든 화면: 이모지 0개 · 아래 탭 아이콘은 선 아이콘
  {const r=await p.evaluate(keys=>{const RE=/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}☀-⛿✀-➿⬆⬇⭐⏳]/u;const KEEP=/[★☆✓✕✗↔↕]/g;const hit=[];
      for(const [t,s] of keys){UI.closeModal();s?UI.go(t,s):UI.setTab(t);const tx=document.querySelector('#app').innerText.replace(KEEP,'');const m=tx.match(RE);if(m)hit.push(t+'/'+s+':'+m[0]);}
      UI.setTab('home');UI.menu();const mt=document.querySelector('#modal').innerText.replace(KEEP,'');const mm=mt.match(RE);UI.closeModal();
      const nav=[...document.querySelectorAll('.nav .in button svg')];const stroke=nav.length&&nav.every(s=>s.getAttribute('fill')==='none'&&s.getAttribute('stroke')==='currentColor');
      const li=document.querySelectorAll('svg.li').length;return {hit,mm:mm&&mm[0],stroke,n:keys.length,li};},keys);
    !r.hit.length&&!r.mm&&r.stroke?ok(`이모지: ${r.n}개 화면 + ☰ 메뉴 창에서 0개 · 아래 탭 6개 모두 선 아이콘`):bad('이모지 '+JSON.stringify(r));}
  // 3. 선택 상태는 회백색 + 어두운 글자, 주 단추는 노랑 + 어두운 글자 (대비 4.5 이상)
  {const r=await p.evaluate(()=>{const L=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      UI.go('market','fa');const sgs=getComputedStyle(document.querySelector('.htabs2 .sg.on'));const out={sel:sgs.backgroundColor,selCr:cr(sgs.color,sgs.backgroundColor)};UI.setTab('home');const go=[...document.querySelectorAll('.content button')].find(x=>/경기 보기|하루 진행/.test(x.textContent));if(go){const gs=getComputedStyle(go);out.go=gs.backgroundColor;out.goImg=gs.backgroundImage;out.goCr=cr(gs.color,gs.backgroundColor);}
      UI.go('dev','train');const tg=document.querySelector('button.tgl.primary');out.tg=tg&&getComputedStyle(tg).backgroundColor;return out;});
    const off=c=>{const [a,b2,c2]=c.match(/\d+/g).map(Number);return a>220&&b2>220&&c2>220;};
    /242, 193, 78/.test(r.sel)&&r.selCr>=4.5&&/242, 193, 78/.test(r.go||'')&&r.goImg==='none'&&r.goCr>=4.5&&r.tg&&/242, 193, 78/.test(r.tg)?ok(`선택 칩 ${r.sel}(대비 ${r.selCr.toFixed(1)}) · 「경기 보기」 노랑 평면 ${r.go}(대비 ${r.goCr.toFixed(1)}) · 훈련 「전체」 고르기도 노랑 (v119: 시안대로 고른 칸은 노란 칸)`):bad('강조 '+JSON.stringify(r));}
  // 4. 굵기 600 이하 · 기울임 없음 (모든 화면, 글자가 있는 요소)
  {const r=await p.evaluate(keys=>{const heavy={},ital={};for(const [t,s] of keys){UI.closeModal();s?UI.go(t,s):UI.setTab(t);for(const e of document.querySelectorAll('#app *')){if(!e.offsetWidth)continue;if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const cs=getComputedStyle(e);const k=e.tagName+'.'+e.className;if(+cs.fontWeight>600)heavy[k]=t+'/'+s;if(cs.fontStyle==='italic')ital[k]=t+'/'+s;}}return {heavy:Object.entries(heavy).slice(0,6),ital:Object.entries(ital).slice(0,6)};},keys);
    !r.heavy.length&&!r.ital.length?ok('글씨: 모든 화면 굵기 600 이하 · 기울임 0'):bad('글씨 '+JSON.stringify(r));}
  // 5. 선수 이름: 밑줄·파랑 없음 (본문 글자색)
  {const r=await p.evaluate(()=>{UI.go('roster','list');const n=document.querySelector('.pname');const cs=getComputedStyle(n);const tx=getComputedStyle(document.querySelector('.content')).color;return {u:cs.textDecorationLine,c:cs.color,tx};});
    r.u==='none'&&r.c===r.tx?ok(`선수 이름: 밑줄 없음 · 글자색 ${r.c}`):bad('이름 '+JSON.stringify(r));}
  // 6. 알림 띠: 올린 면(무채색) · 반짝이 그림자 없음
  {const r=await p.evaluate(()=>{UI.go('market','buy');UI.setFocus(SL.userTeam().lineup[0],'balance');const t=document.querySelector('#toast');const cs=getComputedStyle(t);return {bg:cs.backgroundColor,pe:cs.pointerEvents};});
    /33, 36, 43/.test(r.bg)&&r.pe==='none'?ok(`알림 띠 바탕 ${r.bg} · 손가락 통과`):bad('알림 '+JSON.stringify(r));}
  // 7. 경기 화면은 그대로: 경기 중엔 body.ingame → 예전 남색 토큰·주황 그대로, 이모지 처리도 안 함
  {const r=await p.evaluate(()=>{let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}const cs=getComputedStyle(document.body);const g={ingame:document.body.classList.contains('ingame'),bg:cs.getPropertyValue('--bg').trim(),or:cs.getPropertyValue('--orange').trim(),li:document.querySelectorAll('.gamev svg.li').length};
      UI.step&&UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();const cs2=getComputedStyle(document.body);g.after=document.body.classList.contains('ingame');g.bg2=cs2.getPropertyValue('--bg').trim();return g;});
    r.ingame&&r.bg==='#0d1a36'&&r.or==='#ff7a1a'&&r.li===0&&!r.after&&r.bg2==='#111317'?ok(`경기 화면: 예전 색 그대로(바탕 ${r.bg} · 주황 ${r.or}) · 경기가 끝나면 다시 밤색 ${r.bg2}`):bad('경기 '+JSON.stringify(r));}
  // 8. 밝은 테마도 같은 규칙: 밝은 바탕 · 선택은 먹색 · 주 단추 노랑
  {const r=await p.evaluate(()=>{UI.setTheme('light');UI.go('market','fa');const sel=getComputedStyle(document.querySelector('.htabs2 .sg.on')).backgroundColor;const app=getComputedStyle(document.querySelector('.stv')||document.querySelector('#app')).backgroundColor;UI.setTab('home');const go=[...document.querySelectorAll('.content button')].find(x=>/경기 보기|하루 진행/.test(x.textContent));const g=go&&getComputedStyle(go).backgroundColor;UI.setTheme('ea');return {sel,app,g};});
    /30, 32, 39/.test(r.sel)&&/242, 193, 78/.test(r.g||'')&&!/30, 32, 39/.test(r.app)?ok(`밝은 테마: 선택 ${r.sel} · 「경기 보기」 ${r.g} · 바탕 ${r.app}`):bad('밝은 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v93 검사 실패 ${fails}건`:'v93 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

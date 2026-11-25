// v194 (R166): 육성 · 이적 · 구단 첫 화면 = 큰 그림 타일(휴대폰) — 타일 → 예전 화면 · 아래 메뉴 → 다시 타일 · 상태 줄 = 실제 값 · PC는 그대로
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(()=>{UI.setSeed(24680);UI.pickLg('KR');UI.pickTeam(9);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();for(let i=0;i<9;i++)SL.playDayAuto();UI.setTab('home');});await p.waitForTimeout(300);return p;};
  const p=await mk(390,844);
  const hub=t=>p.evaluate(t=>{UI.closeModal();UI.navTap(t);const a=document.querySelector('#app');const T=[...a.querySelectorAll('.hubt')];const vis=[...a.querySelectorAll('button,select,summary,input')].filter(e=>e.offsetParent&&!e.disabled).length;
    return {n:T.length,names:T.map(x=>x.querySelector('b').firstChild.textContent.trim()),st:T.map(x=>(x.querySelector('em')||{}).textContent||''),pic:T.every(x=>{const bg=getComputedStyle(x.querySelector('.hubp')).backgroundImage;return /^url\(/.test(bg)&&bg.length>200;}),tabs:a.querySelectorAll('.htabs button').length,h:document.documentElement.scrollHeight,vis,title:(a.querySelector('.pgh b')||{}).textContent,chars:a.innerText.replace(/\s+/g,'').length};},t);
  // 1. 세 화면: 타일 수 · 그림 · 한 화면 · 위 탭 없음
  const want={dev:['훈련','성장','2군·유망주','겨울리그','장비'],market:['영입','내 선수','협상','결과'],club:['감독','재정','연봉 · 계약','스폰서·광고','시설','투자','구단 위상','옛 제자','설정·저장']};const ko={dev:'육성',market:'이적',club:'구단'};
  for(const t of ['dev','market','club']){const r=await hub(t);JSON.stringify(r.names)===JSON.stringify(want[t])&&r.pic&&r.tabs===0&&r.h<=844&&r.title===ko[t]&&r.vis<=20?ok(`${ko[t]}: 타일 ${r.n}개 · 그림 모두 · 위 탭 없음 · 한 화면 · 단추 ${r.vis}개 · 글자 ${r.chars}자`):bad(`${ko[t]} 타일 `+JSON.stringify(r));}
  // 2. 상태 줄 = 실제 값
  {const d=await hub('dev');const m=await hub('market');const c=await hub('club');const R=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();return {dev:`육성군 ${ut.dev.length}/${SL.devCap(ut)}`,fa:`FA ${(S.fa||[]).length}명`,rank:`${SL.rankOf(ut)}위 · ${ut.rec.w}승 ${ut.rec.l}패`,pres:`${SL.presTier(ut)} 구단`,listed:`매물 ${(S.market.listed||[]).length}명`};});
    d.st[2]===R.dev&&m.st[0]===R.fa&&m.st[1]===R.listed&&c.st[0]===R.rank&&c.st[6]===R.pres&&/^자금 /.test(c.st[1])&&/^연봉 /.test(c.st[2])&&d.st[3]==='겨울에 열림'?ok(`상태 줄 = 실제: ${R.dev} · ${R.fa} · ${R.listed} · ${R.rank} · ${c.st[1]} · ${R.pres}`):bad('상태 줄 '+JSON.stringify({d:d.st,m:m.st,c:c.st,R}));}
  // 3. 타일 → 예전 화면(위 탭 그대로) → 아래 메뉴 → 다시 타일 · 옆 탭으로 옮긴 뒤엔 그 묶음 타일이 마지막 화면으로
  {const r=await p.evaluate(()=>{UI.navTap('market');[...document.querySelectorAll('.hubt')][0].click();const a=document.querySelector('#app');const o={hub1:!!a.querySelector('.hubv'),tabs:[...a.querySelectorAll('.htabs button')].map(x=>x.firstChild.textContent.trim()).join('|'),on:(a.querySelector('.htabs button.on')||{}).textContent,sub:ui_sub()};
      [...a.querySelectorAll('.htabs2 button')].find(x=>/^FA/.test(x.textContent.trim())).click();o.sub2=ui_sub();UI.navTap('market');o.hub2=!!document.querySelector('#app .hubv');[...document.querySelectorAll('.hubt')][0].click();o.sub3=ui_sub();
      UI.navTap('home');UI.go('market','renew');o.direct=!document.querySelector('#app .hubv');UI.navTap('roster');o.roster=!document.querySelector('#app .hubv')&&!!document.querySelector('#app .htabs');return o;function ui_sub(){return (UI.curScreen?UI.curScreen():[])[1]||(document.querySelector('#app .htabs2 button.on')||{}).textContent;}});
    !r.hub1&&/영입\|내 선수\|협상\|결과/.test(r.tabs)&&r.hub2&&r.direct&&r.roster&&String(r.sub3)===String(r.sub2)?ok(`타일 → 화면(위 탭 ${r.tabs}) → 아래 메뉴 → 타일 → 마지막 본 화면(${r.sub3}) · 바로 가기(UI.go) · 선수단은 타일 없음`):bad('오가기 '+JSON.stringify(r));}
  // 4. 급한 일은 타일 테두리 + 상태 줄 (받은 제안)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const o=S.teams[Object.keys(S.teams).find(k=>S.teams[k].league==='KR'&&!S.teams[k].isUser)];const pid=ut.roster[5];S.market.offers.push({id:S.nextOfferId++,from:o.id,pid,fee:10000,exp:S.clock+5,day:S.day});UI.navTap('home');UI.navTap('market');const t=[...document.querySelectorAll('.hubt')][2];const r={hot:t.classList.contains('hot'),st:t.querySelector('em').textContent};S.market.offers.pop();return r;});
    r.hot&&/받은 제안 1/.test(r.st)?ok(`받은 제안: 협상 타일 강조 · 「${r.st}」`):bad('강조 '+JSON.stringify(r));}
  // 5. 알림: 탭을 옮겨도 머리줄 단추를 가리지 않음
  {const r=await p.evaluate(async()=>{UI.navTap('home');UI.toast('시험 알림 — 긴 문구 긴 문구 긴 문구 긴 문구');UI.navTap('dev');await new Promise(r=>setTimeout(r,60));const t=document.getElementById('toast').getBoundingClientRect();const bs=[...document.querySelectorAll('.club .r1 button')].map(x=>x.getBoundingClientRect()).filter(x=>x.width);return {hit:bs.filter(x=>x.left<t.right-1&&x.right>t.left+1).length,n:bs.length};});
    r.hit===0&&r.n>=2?ok(`탭을 옮긴 뒤 알림: 머리줄 단추 ${r.n}개 안 가림`):bad('알림 다시 맞춤 '+JSON.stringify(r));}
  // 6. PC · 검사 주소는 예전 그대로
  {const q=await mk(1280,860);const r=await q.evaluate(()=>{UI.navTap('dev');const a=!document.querySelector('#app .hubv')&&!!document.querySelector('#app .htabs');UI.navTap('club');return a&&!document.querySelector('#app .hubv');});r?ok('PC: 타일 화면 없음(예전 화면 그대로)'):bad('PC에 타일');}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v194 검사 통과');process.exit(fails?1:0);})();

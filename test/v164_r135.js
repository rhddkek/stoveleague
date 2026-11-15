// v164 (R135): 다른 리그 보기를 탭으로 — 해외 구단을 맡으면 「다른 리그」에 한국 2군 리그가 따로 뜨지 않고, 「해외」 탭에 한국 · 일본 · 대만 …(우리 리그 빼고) + 수준 비교
// 순위표는 우리 리그만(한국 순위 · 한국 가을야구 설명이 밑에 붙지 않음) · 미국 순위표는 「우리 지구 · 와일드카드 · 다른 지구」 · 리그 수준표의 「우리 리그」는 맡은 리그
const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const txt=()=>document.querySelector('.content').innerText;const btns=s=>[...document.querySelectorAll(s)].map(x=>x.textContent.trim());const o={};
      UI.pickLg('US');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();for(let i=0;i<12;i++)SL.playDayAuto();
      UI.go('league','overseas');await w();o.hub=btns('.htabs2 button');o.tabs=btns('.ovseg button');o.pg=!!document.querySelector('.content .pgtabs');o.kr=/한국 프로야구/.test(txt())&&/한국 퓨처스/.test(txt());
      UI.ovLg('JP');await w();o.jp=/센트럴리그/.test(txt())&&/일본 선수 찾기/.test(txt());UI.ovLg('LV');await w();o.lv=(document.querySelector('.lvrow.me .ln')||{}).textContent||'';o.lvTxt=(document.querySelector('.lvrow.me')||{}).textContent||'';
      UI.go('league','table');await w();o.tab=txt();o.seg=btns('.content .seg button');UI.set('usSt','W');await w();o.wc=/와일드카드/.test(txt())&&!/우리 \d위 ·/.test(txt());UI.set('usSt','A');await w();o.all=(txt().match(/미국 프로야구 [EW]L/g)||[]).length;UI.set('usSt','D');
      // 한국 구단: 2군 리그 그대로 · 해외 탭에 한국 없음 · 미국 있음
      UI.pickLg('KR');UI.pickTeam(1);UI.newGame();const b2=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b2)b2.click();UI.closeModal();UI.go('league','overseas');await w();o.hubK=btns('.htabs2 button');o.tabsK=btns('.ovseg button');UI.ovLg('LV');await w();o.lvK=(document.querySelector('.lvrow.me .ln')||{}).textContent||'';
      return o;});
    const t=r.tabs.join('|');
    r.hub.join('|')==='해외|올스타전|아시아 챔피언십'?ok(`${tag} 미국 구단 「다른 리그」: ${r.hub.join(' · ')} (한국 2군 리그 탭 없음)`):bad(tag+' 다른 리그 칸 '+r.hub);
    /^한국\|일본\|대만\|멕시코\|호주\|도미니카\|중국\|수준 비교$/.test(t)&&!r.pg&&r.kr&&r.jp?ok(`${tag} 해외 탭 「${r.tabs.join(' · ')}」 — 우리 리그(미국) 빠짐 · 한국 탭 = 한국 프로야구 + 퓨처스 · 일본 탭 = 지금 순위 · 쪽 나누기 없음`):bad(tag+' 해외 탭 '+JSON.stringify({t,pg:r.pg,kr:r.kr,jp:r.jp}));
    r.lv==='미국 메이저'&&/우리 리그/.test(r.lvTxt)&&r.lvK==='한국 1군'?ok(`${tag} 리그 수준표 「우리 리그」 줄: 미국 구단 「${r.lv}」 · 한국 구단 「${r.lvK}」`):bad(tag+' 수준표 '+JSON.stringify({lv:r.lv,lvK:r.lvK}));
    !/한국 프로야구|가을야구 진출 방식/.test(r.tab)&&/미국 프로야구 WL|미국 프로야구 EL/.test(r.tab)&&(vp.m?/최근 5경기/.test(r.tab):!/최근 5경기/.test(r.tab))&&r.seg.join('|')==='우리 지구|와일드카드|다른 지구'&&r.wc&&r.all===5?ok(`${tag} 미국 구단 순위표: 우리 리그만 · 「우리 지구 · 와일드카드 · 다른 지구」(다른 지구 ${r.all}개) · ${vp.m?'최근 5경기 카드':'최근 경기는 오른쪽 칸(PC)'}`):bad(tag+' 순위표 '+JSON.stringify({seg:r.seg,wc:r.wc,all:r.all,kr:/한국 프로야구/.test(r.tab)}));
    r.hubK.join('|')==='2군 리그|올스타전|해외|아시아 챔피언십'&&!r.tabsK.includes('한국')&&r.tabsK.includes('미국')?ok(`${tag} 한국 구단은 그대로: ${r.hubK.join(' · ')} · 해외 탭 「${r.tabsK.join(' · ')}」`):bad(tag+' 한국 구단 '+JSON.stringify({h:r.hubK,t:r.tabsK}));
    await c.close();}
  // 겨울: 미국 구단 순위표에 한국 최종 순위가 붙지 않고, 해외 → 한국 탭에 한국 최종 순위
  {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));SL.newGame(31,0,{league:'US',games:24});const S=SL.state();S.mgr.noSack=1;S.auto=S.auto||{};let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();UI.closeModal();UI.render();
      UI.go('league','table');await w();const tab=document.querySelector('.content').innerText;UI.go('league','overseas');UI.ovLg('KR');await w();const kr=document.querySelector('.content').innerText;return {ph:S.phase,tab:/한국 프로야구/.test(tab),kr:/한국 프로야구/.test(kr)&&/최종/.test(kr)};});
    r.ph==='offseason'&&!r.tab&&r.kr?ok('겨울: 미국 구단 순위표엔 한국 최종 순위 없음 · 해외 → 한국 탭에 「한국 프로야구 … 최종」'):bad('겨울 '+JSON.stringify(r));await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v164 통과');process.exit(fails?1:0);})();

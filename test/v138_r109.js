// v138 (R109): 모바일 — 버튼 → 아래에서 올라오는 창 → 다음으로 이어지기
//   선수 카드 창(‹ › 넘기기 · 상세는 따로) · 하나씩 처리(할 일 n/N · 맡기기 · 나중에 · 아래 알약 · 할 일 끝 → 다음 주) · 경기 결과 창(다음 목표 · 다음 경기 ▶)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);
  // 화면에서 새 게임(대구) — S.auto가 생기는 실제 흐름
  await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();const S=SL.state();S.settings.stopOnOffer=false;S.settings.stopOnCheck=false;});await p.waitForTimeout(300);
  // 1. 선수 카드 창: 명단 줄 → 아래 창(능력 · 이번 시즌 · 보직 단추) · ‹ › 로 다음 선수 · 「자세히」만 상세 화면
  {await p.evaluate(()=>UI.go('roster','list'));await p.waitForTimeout(200);await p.locator('.rosterq2 tbody tr').nth(1).click();await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{const m=document.querySelector('#modal .pck');const o={card:!!m,anim:m?getComputedStyle(document.querySelector('#modal .modal')).animationName:'',nav:(document.querySelector('#modal .pcnav small')||{}).textContent,nm:(document.querySelector('#modal .pch b')||{}).textContent,attrs:document.querySelectorAll('#modal .pca').length,btn:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent).join('|'),view:!!document.querySelector('.pv'),selwrap:!!document.querySelector('.selwrap')};
      document.querySelectorAll('#modal .pcnav button')[1].click();o.nm2=(document.querySelector('#modal .pch b')||{}).textContent;o.nav2=(document.querySelector('#modal .pcnav small')||{}).textContent;document.querySelector('#modal .pcmore').click();o.full=!!document.querySelector('.pv')&&!document.querySelector('#modal');UI.back();return o;});
    r.card&&r.anim==='shUp'&&/^2 \/ \d+$/.test(r.nav)&&r.attrs>=4&&/^관리 ⋯\|재계약\|(보직|라인업|타순·수비)$/.test(r.btn)&&!r.view&&!r.selwrap&&r.nm2&&r.nm2!==r.nm&&/^3 \//.test(r.nav2)&&r.full?ok(`명단 줄 → 아래 창 「${r.nm}」(${r.nav} · 능력 ${r.attrs}칸 · [${r.btn}]) → › 「${r.nm2}」 → 「자세히」만 상세 화면`):bad('선수 카드 '+JSON.stringify(r));}
  // 2. 자동 진행 뒤 결과 창: 결과 + 다음 목표 + [7경기 자동][다음 경기 ▶] → 다음 경기 = 경기 화면
  {await p.evaluate(()=>{UI.setTab('home');UI.autoDays(7);});await p.waitForTimeout(700);
    const r=await p.evaluate(()=>{const m=document.querySelector('#modal .rsheet');const o={sheet:!!m,btn:[...document.querySelectorAll('#modal .rsheet .shbar button')].map(x=>x.textContent).join('|'),hk:[...document.querySelectorAll('#modal .hk b')].map(x=>x.textContent).join(' / '),fold:m?[...m.querySelectorAll('button')].filter(x=>/접기/.test(x.textContent)&&x.offsetParent).length:-1};
      const b=[...document.querySelectorAll('#modal .rsheet .shbar button')].pop();if(b)b.click();o.live=!!SL.state().liveGame;return o;});
    r.sheet&&r.btn==='7경기 자동|다음 경기 ▶'&&r.fold===0&&r.live?ok(`7경기 자동 → 결과 창이 저절로 · 다음 목표 「${r.hk||'(없음)'}」 · [${r.btn}] → 다음 경기 화면`):bad('결과 창 '+JSON.stringify(r));}
  // 3. 경기를 끝내도 결과 창 → [다음 경기 ▶]로 이어짐
  {await p.evaluate(()=>{const lg=SL.state().liveGame;let g=0;while(lg&&!lg.done&&g++<400)SL.stepGame(lg);UI.endGame();});await p.waitForTimeout(700);
    const r=await p.evaluate(()=>({sheet:!!document.querySelector('#modal .nxs'),t:((document.querySelector('#modal .nxs .nxh')||{}).innerText||'').replace(/\s+/g,' '),btn:[...document.querySelectorAll('#modal .nxs .shbar button')].map(x=>x.textContent).join('|')}));   /* v139: 직접 본 경기는 결과를 다시 띄우지 않고 「다음 경기」 창 */
    r.sheet&&r.t&&/다음 경기 ▶|감독실/.test(r.btn)?ok(`경기 끝 → 결과 창 「${r.t}」 · [${r.btn}]`):bad('경기 끝 결과 '+JSON.stringify(r));await p.evaluate(()=>UI.closeModal());}
  // 4. 다음 목표: 연승이면 「n연승 중 — n+1연승 도전」(실제 기록)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const gs=S.schedule.filter(g=>g.res&&!g.post&&(g.home===ut.id||g.away===ut.id)).sort((a,b)=>b.day-a.day).slice(0,3);for(const g of gs){if(g.home===ut.id){g.res.hs=Math.max(g.res.hs,g.res.as+1);}else{g.res.as=Math.max(g.res.as,g.res.hs+1);}}const st=SL.teamStreak(ut);UI.sheet('result');const hk=[...document.querySelectorAll('#modal .hk b')].map(x=>x.textContent);UI.closeModal();return {n:st.n,hk};});
    r.n>=3&&r.hk.some(x=>x===`${r.n}연승 중 — ${r.n+1}연승 도전`)?ok(`다음 목표: 「${r.hk.join(' / ')}」`):bad('다음 목표 '+JSON.stringify(r));}
  // 5. 겨울: 「하나씩 처리 ▶」 → 할 일 1/N → [코치진에 맡기기]면 그 일은 빠지고 다음 → [나중에] → 다른 화면으로 가면 아래 알약 → 할 일 끝 → [다음 주 ▶]
  {await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='season'&&g++<40){if(S.half&&!S.half.seen)SL.halfSeen();SL.testCmd('endSeason');UI.closeModal();}UI.closeModal();UI.setTab('home');});await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{const S=SL.state();const o={ph:S.phase,w:S.week,btn:!!document.querySelector('.wchain')};if(!o.btn)return o;document.querySelector('.wchain').click();const head=()=>(document.querySelector('#modal .tsh b')||{}).textContent||'';o.h1=head();o.t1=(document.querySelector('#modal .tsc b')||{}).textContent;
      const au=document.querySelector('#modal .tsauto');o.au=!!au;if(au)au.click();o.h2=head();o.t2=(document.querySelector('#modal .tsc b')||{}).textContent;
      return o;});
    await p.waitForTimeout(300);
    const r2=await p.evaluate(()=>{const o={};const pr=document.querySelector('#modal .tsk:not(.done) .shbar .primary');o.has=!!pr;if(!pr)return o;o.tt=(document.querySelector('#modal .tsc b')||{}).textContent;pr.click();
      if(document.querySelector('#modal .todo')){o.inl=0;let g=0;let st;while((st=[...document.querySelectorAll('#modal .todo button')].find(x=>x.textContent==='국내 잔류'))&&g++<6){st.click();o.inl++;}o.next=(document.querySelector('#modal .tsh b')||{}).textContent||(document.querySelector('#modal .tsd')||{}).textContent||'';
        const pr2=document.querySelector('#modal .tsk:not(.done) .shbar .primary');if(pr2){o.tt2=(document.querySelector('#modal .tsc b')||{}).textContent;pr2.click();}}return o;});
    await p.waitForTimeout(400);
    const r3=await p.evaluate(()=>{const pill=document.querySelector('.chainpill');const o={pill:pill?pill.innerText:'',away:!!(document.querySelector('.pv')||document.querySelector('.subtabs .on'))};if(pill)pill.click();o.back=(document.querySelector('#modal .tsh b')||{}).textContent||((document.querySelector('#modal .tsd')||{}).textContent)||'';
      let g=0;while(document.querySelector('#modal .tsk:not(.done)')&&g++<12)document.querySelector('#modal .shbar .ghost').click();o.done=(document.querySelector('#modal .tsd')||{}).textContent;o.go=((document.querySelector('#modal .tsk.done .shbar .primary')||{}).innerText||'').replace(/\s+/g,' ');const w=SL.state().week;const b=document.querySelector('#modal .tsk.done .shbar .primary');if(b)b.click();o.w0=w;return o;});
    await p.waitForTimeout(700);
    const r4=await p.evaluate(()=>{const S=SL.state();const o={w:S.week,stage:!!document.querySelector('#modal')};const ok=[...document.querySelectorAll('#modal button')].find(x=>/^확인/.test(x.textContent.trim()))||null;o.okb=ok&&ok.textContent;UI.stageOk();return o;});
    await p.waitForTimeout(400);
    const r5=await p.evaluate(()=>({task:(document.querySelector('#modal .tsh b')||{}).textContent||((document.querySelector('#modal .tsd')||{}).textContent)||''}));
    const R={r,r2,r3,r4,r5};
    r.ph==='offseason'&&r.btn&&/^할 일 1 \/ \d+$/.test(r.h1)&&(!r.au||r.t2!==r.t1)&&(r2.inl==null||(r2.inl>0&&/^할 일 \d|할 일 끝/.test(r2.next)))&&(!r2.tt2||/남음/.test(r3.pill))&&r3.done==='할 일 끝'&&/^다음 주 ▶/.test(r3.go)&&r4.w===r3.w0+1&&(r5.task===''||/^할 일 1 \//.test(r5.task)||r5.task==='할 일 끝')?ok(`겨울 「하나씩 처리 ▶」 → 「${r.h1} ${r.t1}」 → 맡기기 → 「${r.t2}」 → [${r2.tt||'-'}]${r2.inl!=null?` 목록에서 국내 잔류 ${r2.inl}건 → 바로 「${r2.next}」`:''} → [${r2.tt2||'-'}] 다른 화면 알약 「${r3.pill||'-'}」 → 나중에… → 「할 일 끝」 [${r3.go}] → ${r4.w}주차 → 안내 닫으면 「${r5.task||'없음'}」`):bad('하나씩 처리 '+JSON.stringify(R));}
  // 6. PC 폭은 예전 그대로(명단 줄 = 아래 선택 카드 · 자동 진행 뒤 창 없음)
  await p.setViewportSize({width:1280,height:900});
  {const r=await p.evaluate(()=>{const S=SL.state();UI.closeModal();UI.go('roster','list');const tr=document.querySelectorAll('.rosterq2 tbody tr')[1];tr.click();return {pc:!!document.querySelector('#modal .pck'),sel:!!document.querySelector('.selcard')};});
    !r.pc&&r.sel?ok('PC 폭: 명단 줄 → 아래 선택 카드(창 안 뜸)'):bad('PC '+JSON.stringify(r));}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v138 통과');process.exit(fails?1:0);})();

// v166 (R137): 선수 카드 「바로 하기」 — 관리 ⋯ 창에 숨어 있던 일(1군 등록 · 말소 · 육성군 · 40인 · 단계 · 임대 · 매물 · 외국인 교체 · 코치 제의 · 지명할당 · 관심 · 방출)을 카드에 바로 · 방출은 맨 끝 · 상세 개요에도
const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const acts=()=>[...document.querySelectorAll('#modal .pcacts button')].map(x=>x.querySelector('span').textContent);const o={};
      const start=lg=>{UI.pickLg(lg);UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();SL.state().tutorialDone=true;for(let i=0;i<3;i++)SL.playDayAuto();UI.go('roster','list');};
      start('KR');const S=SL.state();const ut=SL.userTeam();const id=ut.lineup[0];UI.openPlayer(id);await w();o.kr=acts();o.btn=[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim());
      const g=document.querySelector('#modal .pcacts').getBoundingClientRect(),st=document.querySelector('#modal .pcd').getBoundingClientRect();o.above=g.bottom<=st.top+1;
      o.menu=[...(()=>{UI.pmenu(id);return document.querySelectorAll('#modal .prow.act .nm');})()].map(x=>x.textContent);UI.closeModal();
      UI.openPlayer(id);await w();[...document.querySelectorAll('#modal .pcacts button')].find(x=>/관심/.test(x.textContent)).click();await w();o.pinStay=!!document.querySelector('#modal .pcacts')&&acts().includes('관심 해제')&&S.pins.includes(id);
      [...document.querySelectorAll('#modal .pcacts button')].find(x=>/매물 등록/.test(x.textContent)).click();await w();o.listed=S.market.listed.includes(id);UI.openPlayer(id);await w();o.kr2=acts();UI.closeModal();
      const fp=ut.roster.find(x=>SL.isFgn(S.players[x])&&SL.isPitcher(S.players[x]));if(fp!=null){UI.openPlayer(fp);await w();o.fg=acts();UI.closeModal();}
      UI.openPlayerFull(id);await w();o.full=[...document.querySelectorAll('.pv .pcacts button')].map(x=>x.querySelector('span').textContent);UI.back&&UI.back();
      start('US');const u2=SL.userTeam();UI.openPlayer(u2.lineup[0]);await w();o.us=acts();UI.closeModal();UI.openPlayer(u2.dev[0]);await w();o.usd=acts();o.usdBtn=[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim());UI.closeModal();return o;});
    const exp=r.menu.filter(t=>!/^선수 정보|^라인업|^선발|^투수진|^재계약|^훈련|타순/.test(t)).length;
    r.kr.includes('2군으로')&&r.kr.includes('육성군으로')&&r.kr.includes('매물 등록')&&r.kr[r.kr.length-1]==='방출'&&r.kr.length===exp&&r.btn.join('|')==='재계약|타순·수비'&&r.above?ok(`${tag} 한국 타자 카드 바로 하기 「${r.kr.join(' · ')}」(관리 ⋯ 창 ${r.menu.length}줄 중 카드 아래 단추 · 훈련 칸에 있는 것 빼고 모두) · 능력 · 기록 바로 아래 · 아래 단추 「${r.btn.join(' · ')}」`):bad(tag+' 한국 카드 '+JSON.stringify({kr:r.kr,menu:r.menu,btn:r.btn,above:r.above}));
    r.pinStay&&r.listed&&r.kr2.includes('매물 해제')?ok(`${tag} 「관심」은 카드에 머문 채 「관심 해제」로 · 「매물 등록」 → 다시 열면 「매물 해제」`):bad(tag+' 누름 '+JSON.stringify({p:r.pinStay,l:r.listed,k:r.kr2}));
    !r.fg||r.fg.includes('외국인 교체')?ok(`${tag} 외국인 투수 카드에 「외국인 교체」${r.fg?'':' (외국인 투수 없음)'}`):bad(tag+' 외국인 '+r.fg);
    /* v169: 선수 상세 개요는 한 화면(ui_layout 852px)이라 「바로 하기」 칸을 두지 않음 — 위 ⋯ 메뉴 · 카드에서 */
    r.us.includes('챌린저스로')&&r.us.includes('40인 빼기')&&r.us.includes('지명할당')&&r.usd.includes('40인 넣기')&&r.usdBtn.join('|')==='상세 보기'?ok(`${tag} 미국 메이저 선수 「${r.us.join(' · ')}」 · 40인 밖 선수 「${r.usd.join(' · ')}」`):bad(tag+' 미국 '+JSON.stringify({us:r.us,usd:r.usd,b:r.usdBtn}));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v166 통과');process.exit(fails?1:0);})();

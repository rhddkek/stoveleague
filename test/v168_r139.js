// v168 (R139): 선수 카드 창 크기 고정 — 정보 · 기록 · 계약 탭을 바꿔도, 기록이 한 줄뿐이어도 창 높이 · 위치가 같음 (우리 선수 · 다른 구단 선수 · 다음 선수로 넘겨도)
const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,350));const box=()=>{const m=document.querySelector('#modal .modal').getBoundingClientRect();const s=document.querySelector('#modal .shbar');return [Math.round(m.top),Math.round(m.height),s?Math.round(s.getBoundingClientRect().top):0];};const o={H:innerHeight,L:[]};
      UI.pickLg('US');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();const S=SL.state();S.tutorialDone=true;UI.go('roster','list');const ut=SL.userTeam();
      const young=ut.roster.map(i=>S.players[i]).sort((a,c)=>a.age-c.age)[0];const other=Object.values(S.teams).find(t=>t.league==='US'&&!t.isUser);
      for(const id of [young.id,ut.lineup[0],other.lineup[0],ut.dev[0]]){UI.openPlayer(id);await w();for(const t of ['info','rec','con']){UI.pcTab(t);await w();o.L.push(box());}UI.pcTab('info');UI.closeModal();}
      UI.openPlayer(ut.lineup[0]);await w();const nx=document.querySelectorAll('#modal .pcnav button')[1];if(nx){nx.click();await w();o.L.push(box());}UI.closeModal();return o;});
    const tops=new Set(r.L.map(x=>x[0])),hs=new Set(r.L.map(x=>x[1])),bars=new Set(r.L.filter(x=>x[2]).map(x=>x[2]));
    tops.size===1&&hs.size===1&&bars.size<=1&&r.L[0][1]>=r.H*0.6?ok(`${tag} 선수 카드 ${r.L.length}번(선수 4명 × 정보 · 기록 · 계약 + 다음 선수) 모두 창 위 ${r.L[0][0]}px · 높이 ${r.L[0][1]}px · 아래 단추 줄 자리도 같음`):bad(tag+' 창 크기 '+JSON.stringify(r.L));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v168 통과');process.exit(fails?1:0);})();

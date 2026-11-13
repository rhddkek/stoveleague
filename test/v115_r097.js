// v115 (R097): 선수단 목록 — 필터 한 줄(정렬 옆 ▼/▲) · 목록만 스크롤(머리 고정) · 설명 줄 없음 · 컨디션 → 없앰 / 순위표 제목을 누르면 리그 바꾸기 · 해외 리그 간이 순위
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. 선수단 → 명단 (v119 시안): 필터는 칩 한 줄(전체·타자·투수·부상) · 고르는 상자(select) 없음 · 「이름을 누르면…」 설명 없음 · 표는 선수 | 포지션 | 종합 | 상태
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:144,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.go('roster','list');
      const f=document.querySelector('.sqchips');const kids=[...f.children].filter(e=>e.offsetHeight);const tb=kids.map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2;});const t=document.querySelector('.content').innerText;
      return {rows:Math.max(...tb)-Math.min(...tb)<12?1:2,chips:kids.map(e=>e.textContent.replace(/[\s\d]+$/,'')).join(','),sel:document.querySelectorAll('.content select').length,th:[...document.querySelectorAll('.rosterq2 thead th')].map(x=>x.textContent.replace(/[▼▲\s]/g,'')).join(','),hint:/이름을 누르면/.test(t),arrow:/→ \d+%/.test(t)};});
    r.rows===1&&r.chips.replace(/,$/,'')==='전체,타자,투수,부상'&&r.sel===0&&r.th==='선수,포지션,종합,나이,잠재,상태'&&!r.hint&&!r.arrow?ok(`명단: 칩 한 줄 「${r.chips}」 · 표 「${r.th}」 · 고르는 상자 없음`):bad('필터 '+JSON.stringify(r));}

  // 2. 목록만 스크롤: 타자 14명 → 목록 칸에 최대 높이 · 머리줄 고정 · 페이지는 거의 안 움직임 · 목록을 끝까지 내려도 위 탭·필터와 아래 단추 그대로
  {const r=await p.evaluate(()=>{UI.sqf('kind','B');const f=document.querySelector('.fitl');const th=f.querySelector('thead th');const tabs=document.querySelector('.htabs').getBoundingClientRect().top;const bar=document.querySelector('.selmg').getBoundingClientRect().top;
      f.scrollTop=9999;const fr=f.getBoundingClientRect();const at=document.elementFromPoint(fr.left+60,fr.top+6);const th2=at&&at.closest('th')?0:99;return {fitx:f.classList.contains('fitx'),scrolled:f.scrollTop>0,thTop:Math.round(th2),page:document.scrollingElement.scrollHeight-innerHeight,tabs2:document.querySelector('.htabs').getBoundingClientRect().top===tabs,bar2:document.querySelector('.selmg').getBoundingClientRect().top===bar,pos:getComputedStyle(th).position};});
    r.fitx&&r.scrolled&&Math.abs(r.thTop)<=1&&r.pos==='sticky'&&r.page<=40&&r.tabs2&&r.bar2?ok(`목록만 스크롤 (머리줄 고정 · 페이지 여유 ${r.page}px · 탭·단추 그대로)`):bad('목록 스크롤 '+JSON.stringify(r));}

  // 3. 순위표: 「한국 프로야구 ▾」를 누르면 한국·일본·미국·대만 → 일본을 고르면 일본 리그 순위(경기가 쌓여 있음) → 한국으로 돌아옴 · 국내 결과는 그대로
  {const r=await p.evaluate(()=>{const S=SL.state();UI.autoDays(20);UI.closeModal();const kr=SL.standings(1).map(t=>t.rec.w).join();UI.go('league','table');document.querySelector('.lgsw').click();const chips=[...document.querySelectorAll('.chiprow button')].map(x=>x.textContent);
      [...document.querySelectorAll('.chiprow button')].find(x=>x.textContent==='일본').click();const t=document.querySelector('.content').innerText;const jp=SL.leagueComps('JP').map(c=>SL.standings(c).reduce((a,x)=>a+x.rec.w+x.rec.l,0));
      [...document.querySelectorAll('.chiprow button')].find(x=>x.textContent==='한국').click();const back=/한국 프로야구/.test(document.querySelector('.content').innerText);UI.set('lgPick',false);UI.set('lgView','KR');return {chips,jpT:/일본 프로야구/.test(t)&&/간이 순위/.test(t),jp,back,kr};});
    r.chips.join()==='한국,일본,미국,대만'&&r.jpT&&r.jp.every(n=>n>=100)&&r.back?ok(`리그 칩 ${r.chips.join('·')} → 일본 간이 순위(구분별 ${r.jp.join('/')}경기분) → 한국으로`):bad('리그 바꾸기 '+JSON.stringify(r));}

  // 4. 간이 순위는 시즌이 끝나면 정해진 경기 수 · 새 시즌에 0부터 · 국내 순위·기록은 따로 (해외 팀 선수 기록은 안 쌓임)
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;S.settings.stopOnOffer=false;UI.closeModal();let k=0;while(S.phase==='season'&&!S.post&&k++<20){UI.autoDays(999);UI.closeModal();}
      const G=SL.lgGames('JP');const jp=Object.values(S.teams).filter(t=>t.league==='JP').map(t=>t.rec.w+t.rec.l);const pst=Object.values(S.players).filter(q=>q.teamId!=null&&S.teams[q.teamId]&&S.teams[q.teamId].league==='JP').reduce((a,q)=>a+((q.cur&&q.cur.pa)||0),0);
      while(S.phase==='season'&&k++<40){UI.autoDays(999);UI.closeModal();}SL.testCmd('nextSeason');UI.closeModal();const jp0=Object.values(S.teams).filter(t=>t.league==='JP').every(t=>t.rec.w+t.rec.l===0);return {G,jp:[Math.min(...jp),Math.max(...jp)],pst,jp0};});
    r.jp[0]>=r.G-1&&r.jp[1]<=r.G&&r.pst===0&&r.jp0?ok(`시즌 끝 일본 팀 ${r.jp.join('~')}경기(정규 ${r.G}) · 해외 선수 기록 안 쌓임 · 새 시즌 0부터`):bad('간이 순위 시즌 '+JSON.stringify(r));}

  // 5. 예전 저장 · 버전
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.load(s);UI.closeModal();UI.autoDays(7);UI.closeModal();UI.go('roster','list');UI.go('league','table');return {ver:SL.GAME_VER};},j);
    /^v1\d\d$/.test(r.ver)?ok('예전 저장: 목록·순위표 정상 · '+r.ver):bad('예전 저장 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v115 검사 실패 ${fails}건`:'v115 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

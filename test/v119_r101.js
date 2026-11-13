// v119 (R101): 광우·GPT 시안 1차 — 전체 스킨(고른 칸 = 노란 칸, 영역 탭 = 붙은 상자) · 선수단 명단 · 겨울 감독실
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);
  const gold=c=>/242, 193, 78/.test(c||'');

  // 1. 스킨: 영역 탭·보기 전환·칩에서 고른 칸은 모두 노란 바탕 + 검은 글자 · 영역 탭은 테두리 있는 한 줄 상자
  {const r=await p.evaluate(()=>{SL.newGame(4096,1,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.setTheme('ea');UI.closeModal();UI.autoDays(4);UI.closeModal();UI.go('roster','list');const cs=s=>{const e=document.querySelector(s);return e?[getComputedStyle(e).backgroundColor,getComputedStyle(e).color]:null;};
      const ht=document.querySelector('.htabs');return {tab:cs('.htabs button.on'),seg:cs('.grptab button.on'),chip:cs('.sqchips button.on'),box:getComputedStyle(ht).borderTopWidth,tabs:[...ht.querySelectorAll('button')].map(x=>x.textContent.trim()).join(','),nav:getComputedStyle(document.querySelector('.nav button.on')).color};});
    gold(r.tab&&r.tab[0])&&gold(r.seg&&r.seg[0])&&gold(r.chip&&r.chip[0])&&/21, 23, 28/.test(r.tab[1])&&r.box==='1px'&&r.tabs==='명단,타순,투수진,운영'&&gold(r.nav)?ok(`스킨: 영역 탭 「${r.tabs}」 · 고른 탭·1군/2군·칩 모두 노란 칸 · 아래 메뉴 고른 칸 노란 글자`):bad('스킨 '+JSON.stringify(r));}

  // 2. 명단: 상태 칸 = 글자 + 막대 + % · 줄을 누르면 아래 카드 「이름 / 포지션 · 나이 · 역할 · 종합」 + [상세][2군 이동] · 부상 칩
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const bars=document.querySelectorAll('.rosterq2 .cbar').length,rows=document.querySelectorAll('.rosterq2 tbody tr').length;const lab=[...new Set([...document.querySelectorAll('.rosterq2 .cbar .cl')].map(x=>x.textContent.replace(/\s*\d+일$/,'')))];
      const empty=(document.querySelector('.selmg')||{}).innerText||'';document.querySelector('.rosterq2 tbody tr').click();const c=document.querySelector('.selcard');const t=c.innerText.replace(/\n+/g,' | ');const bs=[...c.querySelectorAll('button')].map(x=>x.textContent.trim());
      S.players[ut.entry[0]].inj={left:5,name:'테스트'};UI.sqf('kind','I');/* v125: 부상 칩은 부상·회복 화면 */const inj=document.querySelectorAll('.injt button').length;const injLab=inj?'부상 '+document.querySelector('.injt .d').textContent:'';delete S.players[ut.entry[0]].inj;UI.sqf('kind','A');return {bars,rows,lab,empty,t,bs,inj,injLab,ow:document.documentElement.scrollWidth-innerWidth};});
    r.bars===r.rows&&r.rows>20&&r.lab.every(x=>['컨디션 좋음','피로 누적','벤치','부상'].includes(x))&&/선택\s*0명/.test(r.empty)&&/· \d+세 \| .+ · 종합 [SABCD]?\d+/.test(r.t)&&r.bs.join(',')==='상세,2군 이동'&&r.inj===1&&/^부상 5일/.test(r.injLab)&&r.ow<=0?ok(`명단 ${r.rows}줄 상태 막대(${r.lab.join('·')}) · 고르면 「${r.t.slice(0,40)}」 [${r.bs.join('][')}] · 부상 칩 ${r.inj}명`):bad('명단 '+JSON.stringify(r));}

  // 3. 겨울 감독실: 그림 + 돈 세 칸(현금·영입·연봉 여유) + 「오늘 할 일 n」 노란 단추 + 전력 보강 [찾기] + 큰 「다음 주로」 — 한 화면
  {const r=await p.evaluate(()=>{const S=SL.state();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();UI.setTab('home');const hero=document.querySelector('.whero');const m=[...document.querySelectorAll('.wmoney small')].map(x=>x.textContent);const vals=[...document.querySelectorAll('.wmoney b')].map(x=>x.textContent);const I=SL.budgetInfo();
      const tb=document.querySelector('.todo .mail.td button');const go=document.querySelector('.gobar .mkgo');return {hero:!!hero&&hero.offsetHeight>0&&/url\(/.test(hero.getAttribute('style')||''),m:m.join(','),cash:vals[0]===SL.money(SL.userTeam().cash).replace('원',''),wage:vals[2],todo:/오늘 할 일\s*\d+/.test(document.querySelector('.todo').innerText),tb:tb?getComputedStyle(tb).backgroundColor:'',goal:[...document.querySelectorAll('.goal2 .gbtn')].map(x=>x.textContent).join(','),go:go.innerText.replace(/\s+/g,' '),sh:document.documentElement.scrollHeight,ih:innerHeight,ow:document.documentElement.scrollWidth-innerWidth};});
    r.m==='현금,영입,연봉여유'&&/억|만/.test(r.wage)&&gold(r.tb)&&/^다음 주 .*\d → \d주차/.test(r.go)&&r.ow<=0/* v123: 시안 09로 바뀜 — 그림·보강 카드 없음 */?ok(`겨울 감독실: 그림 · 「${r.m}」 · 오늘 할 일 노란 단추 · 전력 보강 [${r.goal}] · 「${r.go}」`):bad('겨울 감독실 '+JSON.stringify(r));}

  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v119 검사 실패 ${fails}건`:'v119 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

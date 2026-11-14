// v116 (R098): 순위표 「n위까지 가을야구」 줄 삭제 · 대만/미국 순위가 제 리그로 · 7시즌 화면 점검에서 찾은 것
//   (코치 위임 재계약이 0명 되던 문제 · 인원 부족 개막 막힘 · 겨울 선수 목록 지난 기록 · 개막 전 확인 단추 · 결산 「내년」 · 트레이드 시장 표 폭 · 「이 경기 자동」)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. 순위표: 「▲ n위까지 가을야구」 줄 없음 · 시즌 중 오늘 경기 「이 경기 자동」
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();
      const auto=[...document.querySelectorAll('.content button')].map(x=>x.textContent.trim()).filter(t=>/자동/.test(t));UI.autoDays(5);UI.closeModal();UI.go('league','table');const t=document.querySelector('.content').innerText;
      return {cut:document.querySelectorAll('tr.pcut').length,txt:/▲|\d위까지 가을야구/.test(t),auto};});
    !r.cut&&!r.txt&&(r.auto.includes('이 경기 자동')||r.auto.includes('7경기 자동')) /* v150: [자동] [⋯] 두 단추 */&&!r.auto.some(x=>/▶▶ 자동 진행/.test(x))?ok(`순위표 컷 줄 없음 · 홈 단추 「${r.auto.join(' / ')}」`):bad('순위표·단추 '+JSON.stringify(r));}

  // 2. 다른 리그: 대만·미국·일본을 고르면 첫 표가 그 리그 구단 · 국내 「라인업 보기」 없음 · 제목이 「한국」이 아님
  {const r=await p.evaluate(()=>{const S=SL.state();const out={};for(const lg of ['TW','US','JP']){UI.set('lgView',lg);const c=document.querySelector('.content');const first=(c.querySelector('table .tfn')||{}).textContent||'';
        const t=c.innerText;const nm=Object.values(S.teams).filter(x=>x.league===lg).map(x=>x.name);out[lg]={first:first.trim(),own:nm.some(n=>first.includes(n)),kr:/한국 프로야구/.test(t.slice(0,200)),lu:/라인업 보기/.test(t),fmt:/교류전|전반기|후반기/.test(t)};}UI.set('lgView','KR');return out;});
    Object.values(r).every(x=>x.own&&!x.kr&&!x.lu&&!x.fmt)?ok('다른 리그: '+Object.entries(r).map(([k,x])=>`${k} 첫 줄 「${x.first}」`).join(' · ')+' · 라인업 단추·형식 설명 없음'):bad('다른 리그 '+JSON.stringify(r));}

  // 3. 겨울 선수 목록: 마지막 칸이 지난 시즌 기록 한 덩이(「ERA 3.21 · 9승」 / 「.287 · 12홈런」)로 칸 밖으로 안 넘침
  {const r=await p.evaluate(()=>{const S=SL.state();SL.userTeam().roster.slice(0,12).forEach(id=>{S.players[id].contract.years=1;});let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();UI.go('roster','list');
      const cells=[...document.querySelectorAll('.content table tbody tr')].slice(0,8).map(tr=>tr.lastElementChild);const txt=cells.map(c=>c.innerText.trim());const over=cells.filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>[c.innerText,c.scrollWidth,c.clientWidth,c.className,getComputedStyle(c).overflow]);
      return {ph:S.phase,txt,over,pw:document.scrollingElement.scrollWidth-innerWidth};});
    r.ph==='offseason'&&r.txt.length>=5&&r.txt.every(x=>/^(\d+\.\d\d · \d+승|[.\d]+ · \d+홈런|-)$/.test(x))&&!r.over.length&&r.pw<=0?ok(`겨울 선수 목록 지난 기록 「${r.txt.slice(0,2).join('」「')}」 · 넘침 없음`):bad('겨울 목록 '+JSON.stringify(r));}

  // 4. 개막 전 확인: 체크된 핵심 선수 n명 → 「코치에게 위임하고 진행」이 실제로 n명 재계약 (전에는 0명) · 「돌아가기」 없음(위 닫기와 중복)
  {const r=await p.evaluate(async()=>{const S=SL.state();UI.setTab('home');const pf=S.pendingFA.length;UI.startSeason();const m=document.querySelector('#modal');const bs=[...m.querySelectorAll('button')].map(x=>x.textContent.trim());
      const ck=m.querySelectorAll('input[type=checkbox]:checked').length;const bt=[...m.querySelectorAll('button')].find(x=>/코치에게 위임/.test(x.textContent));bt.click();await new Promise(r=>setTimeout(r,200));
      const m2=document.querySelector('#modal');const rv=m2?m2.innerText:'';const go=m2&&[...m2.querySelectorAll('button')].map(x=>x.textContent.trim());UI.closeModal();return {pf,ck,left:S.pendingFA.length,bs,cnt:(m.innerText.match(/개막 인원 \d+명 \(최소 \d+\)/)||[''])[0],rv:/개막 전 점검/.test(rv),go};});
    r.ck>0&&r.cnt&&r.pf-r.left===r.ck&&!r.bs.includes('돌아가기')&&r.rv&&JSON.stringify(r.go)===JSON.stringify(['닫기','개막'])?ok(`개막 전 확인: 체크 ${r.ck}명 → 위임 후 만료 ${r.pf}→${r.left}명 · 단추 「${r.bs.filter(x=>x!=='닫기').join(' / ')}」 · 「${r.cnt}」 · 다음 창 [개막] 하나`):bad('위임 재계약 '+JSON.stringify(r));}

  // 5. 인원 부족으로 개막 불가 → 토스트가 아니라 창: 이유 + [FA 시장에서 채우기] [최소 인원 자동 보충 후 개막] → 보충하면 개막
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const cut=ut.roster.filter(id=>SL.isPitcher(S.players[id]));for(const id of cut){ut.roster=ut.roster.filter(x=>x!==id);S.players[id].teamId=null;}
      UI.startSeasonGo();const m=document.querySelector('#modal');const t=m?m.innerText:'';const bs=m?[...m.querySelectorAll('button')].map(x=>x.textContent.trim()):[];const f=m&&[...m.querySelectorAll('button')].find(x=>/자동 보충/.test(x.textContent));if(f)f.click();
      return {t:t.slice(0,200),bs,ph:S.phase,n:ut.roster.length,issues:SL.rosterCheck?SL.rosterCheck(ut).length:-1};});
    /요건 미달/.test(r.t)&&/투수 \d+명/.test(r.t)&&r.bs.includes('FA 시장에서 채우기')&&r.bs.includes('최소 인원 자동 보충 후 개막')&&r.ph==='season'?ok(`인원 부족: 「${r.t.split('\n').slice(1,3).join(' · ')}」 → 자동 보충 후 개막 (선수 ${r.n}명)`):bad('인원 부족 '+JSON.stringify(r));}

  // 6. 결산 「내년」: 가을야구 실패 → 가을야구 재도전 · 준PO 등 탈락 → 상위권 도전 · 준우승 → 우승 재도전 · 우승 → 2연패 도전
  {const r=await p.evaluate(()=>{const S=SL.state();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');const L=S.lastSummary;const out={};UI.set('rcTab','rec');/* v123: 올해/내년 표는 「기록」 칸 */for(const ps of [null,'semi','ks','champ']){L.ps=ps;UI.seasonRecap();const m=document.querySelector('#modal');const row=[...m.querySelectorAll('tr')].find(x=>/순위/.test(x.textContent));out[ps||'none']=row?row.lastElementChild.textContent.trim():'';UI.closeModal();}return out;});
    r.none==='가을야구 재도전'&&r.semi==='상위권 도전'&&r.ks==='우승 재도전'&&r.champ==='2연패 도전'?ok('결산 내년: '+Object.values(r).join(' / ')):bad('결산 내년 '+JSON.stringify(r));}

  // 7. 트레이드 시장 「구단별 수요」 표가 폰 폭 안에 들어감 (가로 스크롤 없음)
  {const r=await p.evaluate(()=>{UI.go('market','thub');const t=document.querySelector('table.thub');return t?{tw:Math.round(t.getBoundingClientRect().right),w:innerWidth,pw:document.scrollingElement.scrollWidth-innerWidth}:null;});
    r&&r.tw<=r.w&&r.pw<=0?ok(`트레이드 시장 표 폭 ${r.tw}/${r.w}`):bad('트레이드 표 '+JSON.stringify(r));}

  // 8. 겨울을 건너뛰어 개막: 「남은 우리 차례는 자동 지명 · 입단 계약」 → 지명 신인이 실제로 입단 (전에는 지명 직후 대학 진학 처리)
  {const r=await p.evaluate(()=>{SL.newGame(4096,5,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();UI.setTab('home');
      const left=SL.draftMyLeft();UI.startSeason();let m=document.querySelector('#modal');let txt=m?m.innerText:'';const g=m&&[...m.querySelectorAll('button')].find(x=>/코치에게 위임/.test(x.textContent));if(g){g.click();m=document.querySelector('#modal');txt=m?m.innerText:'';}
      const go=m&&[...m.querySelectorAll('button')].find(x=>x.textContent.trim()==='개막');if(go)go.click();UI.closeModal();const ut=SL.userTeam();const rk=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(p=>p&&p.transfers.some(t=>/드래프트/.test(t.kind||'')&&t.s===S.season-1||/드래프트/.test(t.kind||'')&&p.age<=19)).length;
      return {left,auto:/자동 지명 · 입단 계약/.test(txt),ph:S.phase,s:S.season,rk};});
    r.left>0&&r.auto&&r.ph==='season'&&r.rk>=Math.min(r.left,3)?ok(`겨울 건너뛰기: 남은 우리 차례 ${r.left}번 → 「자동 지명 · 입단 계약」 → 신인 ${r.rk}명 입단 후 개막`):bad('건너뛰기 지명 '+JSON.stringify(r));}

  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v116 검사 실패 ${fails}건`:'v116 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

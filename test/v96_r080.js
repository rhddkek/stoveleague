// v96 (R080): 선수단 고정 · 성씨 비율 · 결정적 장면 · 트레이드 시장 · 코치에게 맡김 · 선수 이름 바꾸기 · 아시아 챔피언십 기록 · 가장 오른 선수 · 구단 라인업
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  // 1. 선수단 고정: 시드·맡은 구단이 달라도 모든 구단 선수(이름·나이·능력치)가 같음. 「무작위」면 달라짐. 한국 성씨 비율
  {const r=await p.evaluate(()=>{const snap=(seed,idx,lg,rand)=>{SL.newGame(seed,idx,{arch:true,games:144,league:lg,randRoster:rand});const S=SL.state();const o={};for(const t of Object.values(S.teams))o[t.name]=t.roster.map(id=>{const q=S.players[id];return q.name+'/'+q.age+'/'+SL.calcOvr(q).toFixed(1);}).join(',');return o;};
      const a=snap(111,0,'KR'),b2=snap(98765,4,'KR'),c=snap(5,7,'KR'),d=snap(111,0,'KR',true);const ns=Object.keys(a);const same=(x,y)=>ns.filter(n=>x[n]===y[n]).length;
      const S=SL.state();const kr=Object.values(S.players).filter(q=>q.nat==='KR');const sur={};for(const q of kr)sur[q.name[0]]=(sur[q.name[0]]||0)+1;
      return {n:ns.length,ab:same(a,b2),ac:same(a,c),ad:same(a,d),kim:sur['김']/kr.length,lee:sur['이']/kr.length,rare:(sur['탁']||0)/kr.length};});
    r.ab===r.n&&r.ac===r.n&&r.ad<r.n/2&&r.kim>0.15&&r.kim<0.3&&r.lee>0.09&&r.rare<0.01?ok(`선수단 고정: ${r.n}개 구단 모두 시드·맡은 구단이 달라도 같은 선수(무작위 선수단이면 ${r.n-r.ad}개 구단이 다름) · 성씨 김 ${(r.kim*100).toFixed(0)}% 이 ${(r.lee*100).toFixed(0)}%`):bad('고정 '+JSON.stringify(r));}
  // 2. 결정적 장면: 경기 결과에 한 장 — 내용은 그 경기 기록과 같음
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();});
  {const r=await p.evaluate(()=>{const out=[];for(let k=0;k<16&&out.length<4;k++){UI.setTab('home');if(!SL.userGameToday()){UI.autoDays(1);UI.closeModal();continue;}UI.startGame();const S=SL.state();const lg=S.liveGame;if(!lg)break;UI.set('stepMode','game');UI.step('game');
        const km=SL.keyMoment(lg);const box=JSON.parse(JSON.stringify(lg.box));UI.endGame();UI.closeModal();UI.setTab('home');const ban=(document.querySelector('.rbanner')||{}).innerText||'';UI.sheet('result');const el=document.querySelector('.kmom');
        if(km){const b=box[km.pid]||{};let okv=true;if(/(\d+)홈런/.test(km.k))okv=b.hr===+km.k.match(/(\d+)홈런/)[1];if(/(\d+)탈삼진/.test(km.k))okv=b.pSO===+km.k.match(/(\d+)탈삼진/)[1];if(/(\d+)안타$/.test(km.k))okv=b.h===+km.k.match(/(\d+)안타/)[1];if(km.k==='노히트')okv=b.pH===0&&b.pOuts>=27;if(/결승타|끝내기/.test(km.k))okv=(b.pa||0)>=1;out.push({k:km.k,okv,shown:!!(el&&el.innerText.includes(km.k))&&(!ban||ban.includes(km.k))});}
        UI.closeModal();UI.clearResult&&UI.clearResult();}return out;});
    r.length&&r.every(x=>x.okv&&x.shown)?ok(`결정적 장면 ${r.length}경기: ${r.map(x=>x.k).join(' · ')} — 결과 카드에 보이고 그 경기 기록과 같음`):bad('결정적 장면 '+JSON.stringify(r));}
  // 3. 트레이드 시장: 구단 9곳 사정 · 「교환」 누르면 선수 교환 화면에 그 구단 · 거절 이유 첫 줄에 구단 사정
  {const r=await p.evaluate(()=>{const S=SL.state();if(S.liveGame){UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();}UI.go('market','thub');const rows=document.querySelectorAll('table.thub tbody tr').length;const tabs=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());
      const M=SL.tradeMarket();const t=M.teams[0];UI.thubGo(t.id);const onTrade=SL.state()&&document.body.innerText.includes('트레이드 제안');const ut=SL.userTeam();const give=[ut.roster[ut.roster.length-1]];const tt=S.teams[t.id];const ev=SL.tradeEval(t.id,give,[tt.roster[0]],0);
      return {rows,tabs,onTrade,hint:(ev.hint||[])[0]||'',aim:t.aimKo};});
    r.rows===9&&r.tabs.includes('트레이드 시장')&&r.onTrade&&/사정:/.test(r.hint)?ok(`트레이드 시장: 구단 ${r.rows}곳 사정 표 · 「교환」 → 선수 교환 화면 · 거절 이유 첫 줄 「${r.hint.slice(0,40)}…」`):bad('트레이드 시장 '+JSON.stringify(r));}
  // 4. 코치에게 맡김(라인업): 켜면 다음 경기 전에 코치가 다시 짬 · 설정 화면에 두 가지
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();SL.setDlg('lineup',true);const rev=ut.lineup.slice().reverse();ut.lineup=rev.slice();let k=0;while(!SL.userGameToday()&&k++<5){UI.autoDays(1);UI.closeModal();}UI.setTab('home');UI.startGame();const changed=JSON.stringify(ut.lineup)!==JSON.stringify(rev);
      const lg=S.liveGame;if(lg){UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();}SL.setDlg('lineup',false);UI.openMenu&&UI.openMenu();UI.setTab('club');UI.go('club','data');const n=document.querySelectorAll('input[id^="dl_"]').length;return {changed,n,on:SL.dlgOn('lineup')};});
    r.changed&&!r.on&&r.n===2?ok(`코치에게 맡김: 라인업을 맡기면 다음 경기 전 코치가 다시 짬 · 끄면 직접 (설정 화면 토글 ${r.n}개)`):bad('맡김 '+JSON.stringify(r));}
  // 5. 선수 이름 바꾸기: 우리 선수만 · 규칙
  {const r=await p.evaluate(()=>{const ut=SL.userTeam();const S=SL.state();const pid=ut.roster[0];const old=S.players[pid].name;const e1=SL.renamePlayer(pid,'가');const e2=SL.renamePlayer(pid,'홍길동7');const other=SL.krTeams().find(t=>!t.isUser).roster[0];const e3=SL.renamePlayer(other,'홍길동');const e4=SL.renamePlayer(pid,'한별빛');
      UI.go('club','look');const card=[...document.querySelectorAll('.card')].some(c=>/선수 이름 바꾸기/.test(c.innerText));return {e1,e2,e3,e4,now:S.players[pid].name,old,aka:S.players[pid].akaOld,card};});
    r.e1&&r.e2&&r.e3&&!r.e4&&r.now==='한별빛'&&r.aka===r.old&&r.card?ok(`이름 바꾸기: ${r.old} → 한별빛 (처음 이름 기억) · 1자·숫자·다른 구단 선수는 거부 · 구단 꾸미기 화면에 카드`):bad('이름 '+JSON.stringify(r));}
  // 6. 리그 → 다른 리그 → 아시아 챔피언십 · 순위표 아래 1위 구단 라인업 = 그 구단 실제 타순
  {const r=await p.evaluate(()=>{UI.go('league','asia');const asia=document.body.innerText.includes('아시아 클럽 챔피언십');UI.go('league','table');const btn=[...document.querySelectorAll('.lnbtns button')].find(x=>/1위/.test(x.textContent));if(btn)btn.click();
      const top=SL.standings(SL.compOf(SL.userTeam()))[0];const S=SL.state();const names=[...document.querySelectorAll('#modal table.tsht')[0].querySelectorAll('tbody tr td.tn')].map(x=>x.textContent);const want=top.lineup.map(id=>S.players[id].name);UI.closeModal();return {asia,btn:!!btn,match:JSON.stringify(names)===JSON.stringify(want),n:names.length};});
    r.asia&&r.btn&&r.match&&r.n===9?ok(`다른 리그 → 아시아 챔피언십 화면 · 순위표 「1위 구단 라인업 보기」 = 그 구단 지금 타순 ${r.n}명`):bad('리그 '+JSON.stringify(r));}
  // 7. 최근 30일 가장 오른 선수: 숫자 = 성장 기록 합
  {const r=await p.evaluate(()=>{UI.autoDays(20);UI.closeModal();const S=SL.state();const L=SL.risers(5);const chk=L.every(x=>{const q=S.players[x.pid];const s=(q.log||[]).filter(e=>e.s===S.season&&e.dd!=null&&e.dd>S.day-30).reduce((a,e)=>a+(e.d||0),0);return Math.abs(Math.round(s*10)/10-x.d)<0.05;});UI.go('dev','grow');const shown=document.body.innerText.includes('최근 30일 가장 오른 선수');return {n:L.length,chk,shown};});
    r.chk&&(r.n===0||r.shown)?ok(`가장 오른 선수 ${r.n}명 — 성장 기록 합과 같음${r.n?' · 육성 → 성장정보 맨 위':''}`):bad('오른 선수 '+JSON.stringify(r));}
  // 8. 코치에게 맡김(재계약): FA로 떠나기 직전 주에 코치가 고른 선수만 요구액대로 재계약 · 소식에 남음
  {const q=await b.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url);await q.waitForTimeout(300);
    const r=await q.evaluate(()=>{SL.newGame(77,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;SL.setDlg('renew',true);{const u=SL.userTeam();for(const id of u.roster.slice(0,10))S.players[id].contract.years=1;}SL.testCmd('endSeason');let g=0;while(S.week<2&&g++<5)SL.advanceWeek();const pend=S.pendingFA.slice();const ut=SL.userTeam();
      SL.advanceWeek();const kept=pend.filter(id=>S.players[id].teamId===ut.id&&S.players[id].renewed===S.season);const left=pend.filter(id=>S.players[id].teamId!==ut.id);const nw=S.news.some(n=>/코치에게 맡김/.test(n.text||n.t||''));return {pend:pend.length,kept:kept.length,left:left.length,nw,week:S.week};});await q.close();
    r.pend>0&&r.kept>0&&r.kept+r.left===r.pend&&r.nw?ok(`재계약 맡김: 계약 만료 ${r.pend}명 중 코치가 ${r.kept}명 재계약, ${r.left}명은 FA로 · 소식에 기록`):bad('재계약 맡김 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v96 검사 실패 ${fails}건`:'v96 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

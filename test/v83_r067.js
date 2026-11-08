// v83 (R067): 해외 선수 찾기 — 리그 → 구단 → 선수단을 직접 보기 · 선수/구단/지역에 스카우트 보내기 · 관찰 명단
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.go('market','fgn');});
  {const r=await p.evaluate(()=>{const v=[...document.querySelectorAll('.fgv button')].map(b=>b.textContent.replace(/\s+\d.*$/,''));UI.fgV('club');const lg=[...document.querySelectorAll('.fglg button')].map(b=>b.innerText.trim());const rows=document.querySelectorAll('.stvt tbody tr').length;const jp=SL.overseasTeams().filter(t=>t.league==='JP').length;return {v,lg,rows,jp,badges:document.querySelectorAll('.fglg .lgb').length};});
    r.v.join('|').includes('리그·구단')&&r.lg.length===6&&r.rows===r.jp&&r.badges===6?ok(`해외 선수 찾기: ${r.v.join(' · ')} / 리그 6개(마크) → 일본 구단 ${r.rows}개 목록`):bad('목록 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{const t=SL.overseasTeams().find(t=>t.league==='US');UI.fgLg('US');UI.fgTeam(t.id);const head=document.querySelector('.fgth').innerText;const n=document.querySelectorAll('.stvt tbody tr').length;UI.fgSide('B');const n2=document.querySelectorAll('.stvt tbody tr').length;const tot=t.roster.length;
      const row=document.querySelector('.stvt tbody tr');row.click();const m=document.querySelector('#modal').innerText;UI.closeModal();return {head,ok:head.includes(t.name),n,n2,tot,menu:/스카우트 보고서/.test(m)&&/(집중 관찰|관찰 중)/.test(m)&&/관심 선수/.test(m)};});
    r.ok&&r.n+r.n2>=r.tot-2&&r.menu?ok(`구단 선수단 직접 보기: 「${r.head.split('\n')[0]}」 투수 ${r.n} + 타자 ${r.n2}명 · 선수 누르면 보고서 · 집중 관찰 · 관심 선수`):bad('구단 선수단 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{const S=SL.state();const t=SL.overseasTeams().find(t=>t.league==='JP');const ps=t.roster.map(id=>S.players[id]);const k0=ps.map(p=>SL.knOf(p));const cash0=SL.userTeam().cash;const e=SL.scoutTeam(t.id,2);const e2=SL.scoutTeam(t.id,2);const cost=cash0-SL.userTeam().cash;UI.autoDays(7);UI.closeModal();const up=ps.filter((p,i)=>SL.knOf(p)>k0[i]).length;
      UI.go('market','fgn');UI.fgV('sc');const sc=document.querySelector('.fgsc').innerText;return {e,e2,cost,exp:SL.scTeamCost(t)*2,up,n:ps.length,sc:sc.includes(t.name+' 구단 관찰')};});
    r.e===null&&r.e2&&r.cost===r.exp&&r.up>=Math.floor(r.n*0.8)&&r.sc?ok(`구단 관찰: 비용 ${r.cost} (주당 ${r.exp/2}) · 1주 뒤 ${r.n}명 중 ${r.up}명 지식 상승 · 스카우트 탭에 「구단 관찰」 · 같은 구단 중복 파견 막힘`):bad('구단 관찰 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{const X=SL.scState();const t=SL.overseasTeams().find(t=>t.league==='TW');const pid=t.roster[0];if(!(SL.state().pins||[]).includes(pid))UI.pin(pid);UI.go('market','fgn');UI.fgV('list');const txt=document.querySelector('.stvt').innerText;return {pin:txt.includes(SL.state().players[pid].name),rep:(X.rep||[]).every(r=>!SL.state().players[r.pid]||!SL.scRegOf(SL.state().players[r.pid])||txt.includes(SL.state().players[r.pid].name))};});
    r.pin&&r.rep?ok('관찰 명단: ★ 관심 선수 + 스카우트 보고서 온 선수가 한 표에'):bad('관찰 명단 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v83 검사 실패 ${fails}건`:'v83 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

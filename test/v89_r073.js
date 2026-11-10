// v89 (R073): 누르면 이어지게 — FA 줄 → 선수 상세 바로 · 상세 주 단추 아래 고정 · 「이 조건으로 계약」 · 배치 화면 결정 먼저 · ⋯ → 「관리」 · 알림이 단추를 막지 않음
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(3);UI.closeModal();});
  // 1. FA 목록 줄을 누르면 중간 창 없이 선수 상세 → 「FA 협상」 단추가 화면 안에 (스크롤 없이)
  {const r=await p.evaluate(()=>{UI.go('market','fa');const trs=[...document.querySelectorAll('.stvt tbody tr')];let tr=trs[0];for(const t of trs){t.click();if([...document.querySelectorAll('.pvact button')].some(x=>/협상/.test(x.textContent))){tr=t;break;}UI.back();UI.go('market','fa');}tr.click();const pv=!!document.querySelector('.pv');const md=!!document.querySelector('#modal');const btn=[...document.querySelectorAll('.pvact button')].find(x=>/협상/.test(x.textContent));const bb=btn&&btn.getBoundingClientRect();const sticky=btn&&getComputedStyle(btn.closest('.pvact')).position==='sticky';return {pv,md,btn:!!btn,vis:bb&&bb.bottom<=innerHeight&&bb.top>=0,sticky,t:btn&&btn.textContent.trim()};});
    r.pv&&!r.md&&r.btn&&r.vis&&r.sticky?ok(`FA 줄 → 선수 상세 바로 (중간 창 없음) · 「${r.t}」 단추가 아래 고정, 스크롤 없이 보임`):bad('FA 줄 '+JSON.stringify(r));}
  // 2. 협상: 요구대로 맞추면 단추가 「✍ 이 조건으로 계약」 · 누르면 바로 계약 → 배치 화면 (결정이 먼저, 라인업 표는 접힘)
  {const r=await p.evaluate(()=>{let t0='',t1='';UI.back();   // 요구대로 맞추면 바로 수락하는 FA를 찾아 (경쟁 중이거나 더 바라는 선수는 「제안 보내기」가 맞음)
      for(let i=0;i<12;i++){UI.go('market','fa');const tr=document.querySelectorAll('.stvt tbody tr')[i];if(!tr)break;tr.click();const nb=[...document.querySelectorAll('.pvact button')].find(x=>/협상/.test(x.textContent));if(!nb){UI.back();continue;}nb.click();const b0=[...document.querySelectorAll('.content button')].find(x=>/제안 보내기|이 조건으로 계약/.test(x.textContent));t0=b0&&b0.textContent.trim();
        [...document.querySelectorAll('.content button')].find(x=>/요구대로/.test(x.textContent)).click();const b1=[...document.querySelectorAll('.content button')].find(x=>/^(제안하기|계약 확정)$/.test(x.textContent.trim()));t1=b1.textContent.trim();if(/계약 확정/.test(t1)){b1.click();break;}UI.back();UI.back();}
      return {t0,t1};});
    await p.waitForTimeout(400);
    const q=await p.evaluate(()=>{const title=(document.querySelector('.pvbar .t')||{}).textContent||'';const c=document.querySelector('.content');const kids=[...c.children];const iRole=kids.findIndex(e=>/역할/.test(e.textContent)&&e.querySelector('.mktabs3'));const iBtn=kids.findIndex(e=>e.querySelector&&e.querySelector('button.primary.big'));const det=c.querySelector('details.pldet');const roles=[...c.querySelectorAll('.mktabs3 button')].map(x=>x.textContent.replace('추천','').trim());const dup=roles.length!==new Set(roles).size;const btn=c.querySelector('button.primary.big');const bb=btn&&btn.getBoundingClientRect();
      return {title,iRole,iBtn,det:!!det&&!det.open,roles,dup,vis:bb&&bb.bottom<=innerHeight};});
    /계약 확정/.test(r.t1)&&/배치/.test(q.title)&&q.iRole>=0&&q.iBtn>q.iRole&&q.det&&!q.dup&&q.vis?ok(`협상: 요구대로 → 단추 「${r.t1}」 → 누르면 바로 「${q.title}」 — 역할(${q.roles.join('·')}) → 결과 → 배치 단추가 스크롤 없이 보임, 라인업 표는 「현재 라인업 보기」로 접힘`):bad('협상·배치 '+JSON.stringify([r,q]));
    await p.evaluate(()=>{const b=document.querySelector('.content button.primary.big');b&&b.click();});}
  // 3. 내 선수 상세: 「⋯ 관리」 글자 단추 · 누르면 조치 창
  {const r=await p.evaluate(()=>{UI.closeModal();UI.openPlayer(SL.userTeam().lineup[0]);const b=document.querySelector('.pvbar .pmg');const t=b&&b.textContent.trim();if(b)b.closest('button').click();const md=document.querySelector('#modal');const acts=md?md.querySelectorAll('.prow.act').length:0;UI.closeModal();UI.back();return {t,acts};});
    r.t==='⋯ 관리'&&r.acts>=5?ok(`선수 상세 위 「${r.t}」 → 조치 ${r.acts}개 창`):bad('관리 '+JSON.stringify(r));}
  // 4. 알림 띠: 누름을 막지 않음 · 위 머리띠나 아래 탭을 가리지 않음
  {const r=await p.evaluate(()=>{UI.go('market','buy');UI.setFocus(SL.userTeam().lineup[0],'balance');const t=document.querySelector('#toast');if(!t)return {no:1};const cs=getComputedStyle(t);const r=t.getBoundingClientRect();const club=document.querySelector('.club').getBoundingClientRect();const nav=document.querySelector('.nav').getBoundingClientRect();return {pe:cs.pointerEvents,above:r.top>club.bottom,below:r.bottom<nav.top};});
    r.pe==='none'&&r.above&&r.below?ok('알림 띠: 손가락이 통과(pointer-events none) · 머리띠·아래 탭 사이에 뜸'):bad('알림 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v89 검사 실패 ${fails}건`:'v89 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

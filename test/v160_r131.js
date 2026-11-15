// v160 (R131): 중국 프로야구 — 겨울리그(4개 구단 · 15경기 · 반프로) · 중국 선수 이름 · 아시아쿼터 · 파견 · 해외 선수 찾기 · 리그 마크 · 엠블럼
const path=require('path');const fs=require('fs');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
{SL.newGame(31,0);const S=SL.state();const L=SL.BAL.LEAGUES.CN;const cn=Object.values(S.teams).filter(t=>t.league==='CN');const ps=cn.flatMap(t=>t.roster.map(id=>S.players[id]));const ov=ps.map(SL.calcOvr);const av=ov.reduce((a,b)=>a+b,0)/ov.length;
  L&&L.winter&&cn.length===4&&cn.every(t=>t.roster.length>=20)&&av>44&&av<SL.BAL.LEVEL_OVR.RES?ok(`${L.name}: ${cn.map(t=>t.name).join(' · ')} · 선수 ${ps.length}명 평균 종합 ${av.toFixed(1)} (한국 퓨처스 ${SL.BAL.LEVEL_OVR.RES}보다 아래)`):bad('중국 리그 '+JSON.stringify({L,n:cn.length,av}));
  const cnp=ps.filter(p=>p.nat==='CN');cnp.length>60&&cnp.every(p=>/^[가-힣]+ [가-힣]+$/.test(p.name))?ok(`중국 선수 ${cnp.length}명 · 이름 예 「${cnp.slice(0,3).map(p=>p.name).join(' · ')}」`):bad('중국 이름 '+cnp.slice(0,5).map(p=>p.name));
  const sal=cnp.map(p=>p.contract.salary).sort((a,b)=>a-b);sal[sal.length>>1]<=1000?ok(`연봉 가운데 ${SL.money(sal[sal.length>>1])} (실제: 한 시즌 2만~4만 위안)`):bad('중국 연봉 '+sal[sal.length>>1]);
  const real=['선전 블루삭스','상하이 드래곤스','샤먼 돌핀스','푸저우 나이츠'];cn.every(t=>!real.includes(t.name))?ok('실제 구단 이름과 겹치지 않음'):bad('실제 이름');
  const d=SL.dispatchOptions(S.players[SL.userTeam().roster[20]]);d.some(o=>o.team.league==='CN')?ok(`겨울리그 파견 후보에 중국 구단 (${d.filter(o=>o.team.league==='CN').length}곳)`):bad('파견 후보');
  const q=cnp.sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];const c=SL.fgnCost(q);c.asia!==undefined?ok(`한국 구단의 중국 선수 영입: ${q.name} 종합 ${SL.calcOvr(q).toFixed(0)} · 아시아쿼터 가능 ${c.asia?'예':'아니오(자리 조건)'} · 연봉 ${SL.money(c.sal)}`):bad('영입 비용');
  fs.existsSync(path.join(__dirname,'../assets/leagues/CN.png'))?ok('리그 마크 assets/leagues/CN.png'):bad('리그 마크 없음');
  const idx=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/emblems/index.json'),'utf8'));cn.every(t=>idx[t.name]&&fs.existsSync(path.join(__dirname,'../assets/emblems/'+idx[t.name]+'.png')))?ok('중국 구단 엠블럼 4개'):bad('엠블럼');
  // 예전 저장: 중국 구단이 생김
  const j=fs.readFileSync(path.join(__dirname,'v158_us_save.json'),'utf8');SL.load(j);const S2=SL.state();const c2=Object.values(S2.teams).filter(t=>t.league==='CN');c2.length===4&&c2.every(t=>t.roster.length>=20)?ok('예전 저장을 불러오면 중국 4개 구단이 생김'):bad('예전 저장 중국 '+c2.length);
  // 겨울 한 번 — 중국 리그 시즌 기록이 남음
  SL.newGame(32,0,{games:36});const S3=SL.state();S3.mgr.noSack=1;let g=0;while(S3.phase==='season'&&g++<200)SL.playDayAuto();let k=0;while(S3.phase==='offseason'&&k++<12)SL.advanceWeek();
  const h=Object.values(S3.players).some(p=>(p.hist||[]).some(x=>x.lg==='CN'));h?ok('겨울을 보내면 중국 리그 기록이 선수 기록에 남음'):bad('중국 기록 없음');
  console.log(fails?`실패 ${fails}건`:'v160 엔진 통과');}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();});await p.waitForTimeout(300);
  const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const S=SL.state();const q=Object.values(S.players).find(x=>x.nat==='CN'&&x.teamId!=null);UI.openPlayer(q.id);await w();const card=(document.querySelector('#modal')||document.body).innerText;UI.closeModal();
    UI.go('league','level');await w();const lv=document.querySelector('.content').innerText;return {card:card.replace(/\s+/g,' ').slice(0,160),lv:/중국 프로야구/.test(lv),nm:q.name};});
  r.card.includes(r.nm)&&/중국|🇨🇳|레드윙스|타이드|에그렛츠|반얀스/.test(r.card)?ok(`중국 선수 카드: 「${r.card.slice(0,70)}」`):bad('선수 카드 '+JSON.stringify(r));
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v160 통과');process.exit(fails?1:0);})();

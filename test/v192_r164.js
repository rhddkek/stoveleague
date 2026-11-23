// v192 (R164): 첫 10분 — 새 게임 세 걸음(리그 → 구단 → 시작) · 짧은 구단 이름(같은 도시면 애칭) · 휴대폰 알림 = 머리줄 왼쪽 칸
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h,q)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F+(q||''));await p.waitForTimeout(600);return p;};
  const vis=p=>p.evaluate(()=>[...document.querySelectorAll('button,select,summary,input')].filter(e=>e.offsetParent&&!e.disabled).length);
  const p=await mk(390,844);
  // 1. 첫 걸음: 리그 4칸만
  {const r=await p.evaluate(()=>({lg:document.querySelectorAll('.nglg').length,team:document.querySelectorAll('.tsel5 button').length,opt:!!document.querySelector('.ngopt'),st:[...document.querySelectorAll('.ngst button')].map(x=>x.className+':'+x.disabled).join(','),h:document.documentElement.scrollHeight}));const n=await vis(p);
    r.lg===4&&r.team===0&&!r.opt&&n<=10&&r.h<=844?ok(`첫 걸음: 리그 4칸 · 구단/난이도 없음 · 단추 ${n}개 · 한 화면`):bad('첫 걸음 '+JSON.stringify(r)+' n='+n);}
  // 2. 둘째 걸음: 구단 10 + 미리 보기 + [고르기]
  await p.click('.nglg >> nth=0');await p.waitForTimeout(250);
  {const r=await p.evaluate(()=>({team:document.querySelectorAll('.tsel5 button').length,det:!!document.querySelector('.tdetail'),opt:!!document.querySelector('.ngopt'),nx:(document.querySelector('.ngnext')||{}).textContent,lg:!!document.querySelector('.nglg'),h:document.documentElement.scrollHeight}));
    r.team===10&&r.det&&!r.opt&&!r.lg&&/고르기/.test(r.nx||'')&&r.h<=844?ok(`둘째 걸음: 구단 10 · 미리 보기 · 「${r.nx}」 · 한 화면`):bad('둘째 걸음 '+JSON.stringify(r));}
  await p.evaluate(()=>UI.pickTeam(3));await p.waitForTimeout(150);const pick=await p.evaluate(()=>SL.TEAM_NAMES.KR[3][0]);
  await p.click('.ngnext');await p.waitForTimeout(250);
  // 3. 셋째 걸음: 고른 구단 · 난이도 3 · 도전 5 · 시작 — 노랑 채움은 시작 단추 하나
  {const r=await p.evaluate(()=>{const fill=e=>{const c=getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number);return c.length<4||c[3]>0?(c[0]>200&&c[1]>150&&c[2]<120):false;};const B=[...document.querySelectorAll('.ngp button')].filter(e=>e.offsetParent);
      return {sum:(document.querySelector('.ngsum b')||{}).textContent,df:document.querySelectorAll('.ngopt .dfsel:not(.scsel) button').length,sc:document.querySelectorAll('.ngopt .scsel button').length,go:(document.querySelector('.ngp .go.big')||{}).textContent,yel:B.filter(fill).map(x=>x.textContent.trim().slice(0,14)),team:!!document.querySelector('.tsel5'),dn:document.querySelectorAll('.ngst button.dn').length,h:document.documentElement.scrollHeight};});
    r.sum===pick&&r.df===3&&r.sc===5&&/감독으로 시작/.test(r.go||'')&&r.yel.length===1&&!r.team&&r.dn===2&&r.h<=844?ok(`셋째 걸음: 「${r.sum}」 · 난이도 3 · 도전 5 · 노랑 채움 1(${r.yel[0]})`):bad('셋째 걸음 '+JSON.stringify(r)+' pick='+pick);}
  // 되돌아가기: 걸음 줄 「2 구단」 → 구단 목록, 고른 구단 그대로
  {await p.click('.ngst button.dn >> nth=1');await p.waitForTimeout(200);const r=await p.evaluate(()=>({on:(document.querySelector('.tsel5 button.on')||{getAttribute(){return null;}}).getAttribute('aria-label')}));r.on===pick?ok('걸음 줄로 되돌아가기: 고른 구단 그대로'):bad('되돌아가기 '+JSON.stringify(r));
    await p.click('.ngnext');await p.waitForTimeout(200);}
  await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  {const r=await p.evaluate(()=>({nm:SL.userTeam().name,lg:SL.userTeam().league,auto:!!SL.state().auto}));r.nm===pick&&r.lg==='KR'&&r.auto?ok(`시작: ${r.nm} 감독 부임`):bad('시작 '+JSON.stringify(r));}
  await p.evaluate(()=>{UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.setTab('home');});await p.waitForTimeout(300);
  // 4. 짧은 구단 이름: 같은 리그 안에서 겹치지 않음 · 도시가 하나뿐이면 도시
  {const r=await p.evaluate(()=>{const S=SL.state();const by={};const dup=[];let city=0,nick=0;for(const t of Object.values(S.teams)){const s=UI.tShort(t);const k=t.league+'|'+(t.div==null?'':'')+s;if(by[k])dup.push(t.name+' = '+by[k]);by[k]=t.name;if(s===t.name.split(' ')[0])city++;else nick++;}
      const seoul=Object.values(S.teams).filter(t=>t.league==='KR'&&/^서울 /.test(t.name)).map(t=>UI.tShort(t));const busan=Object.values(S.teams).find(t=>t.league==='KR'&&/^부산 /.test(t.name));return {dup,city,nick,seoul,busan:busan&&UI.tShort(busan)};});
    r.dup.length===0&&r.seoul.length>=2&&r.seoul.every(x=>x!=='서울')&&r.busan==='부산'?ok(`짧은 이름: 겹침 0 · 서울 구단 = ${r.seoul.join(' · ')} · 부산 = 부산 (도시 ${r.city} · 애칭 ${r.nick})`):bad('짧은 이름 '+JSON.stringify(r).slice(0,300));}
  // 감독실 큰 글자 · 중계 점수판: 양쪽 이름이 다름 (서울 구단끼리 붙는 날까지 넘겨 봄)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const same=[];const g=S.schedule.find(x=>!x.res&&SL.isUserGame(x)&&S.teams[x.home].name.split(' ')[0]===S.teams[x.away].name.split(' ')[0]);return {has:!!g,a:g&&UI.tShort(S.teams[g.away]),h:g&&UI.tShort(S.teams[g.home]),gxt:(document.querySelector('.gxt')||{}).textContent};});
    const two=(r.gxt||'').split(' vs ');two.length===2&&two[0]!==two[1]&&(!r.has||r.a!==r.h)?ok(`감독실 「${r.gxt}」${r.has?` · 같은 도시 맞대결 「${r.a} vs ${r.h}」`:''}`):bad('감독실 이름 '+JSON.stringify(r));}
  {await p.evaluate(()=>UI.startGame());await p.waitForTimeout(700);const r=await p.evaluate(()=>{const g=SL.state().liveGame||{};const T=[...document.querySelectorAll('.gamev .sbt b,.gamev .sbn,.gamev .cmsb .nm,.gamev .tn')].map(e=>e.textContent.trim()).filter(Boolean);return {T:T.slice(0,4),html:(document.querySelector('.gamev')||{}).innerText.slice(0,120).replace(/\s+/g,' ')};});
    /서울\s*\d+[\s\S]{0,30}\d+\s*서울/.test(r.html)?bad('중계 점수판 서울 vs 서울 '+r.html):ok('중계 점수판: '+r.html.slice(0,60));
    await p.evaluate(()=>{UI.quickFinish&&UI.quickFinish();});}
  await b.close().catch(()=>{});
  // 5. 알림 = 머리줄 왼쪽 칸 (새 판)
  {const b2=await chromium.launch();const c=await b2.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message.slice(0,160)));await q.goto(F);await q.waitForTimeout(600);
    await q.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.setTab('home');});await q.waitForTimeout(300);
    for(const [tab,nm] of [['home','감독실'],['roster','선수단'],['market','이적']]){const r=await q.evaluate(tab=>{UI.closeModal();UI.navTap(tab);UI.toast('시험 알림 — 도전과제 「대포 3방」 외 1');const t=document.getElementById('toast').getBoundingClientRect();const h=document.querySelector('.club').getBoundingClientRect();const nm=document.querySelector('.club .nm').getBoundingClientRect();const bs=[...document.querySelectorAll('.club .r1 button')].map(x=>x.getBoundingClientRect());const tabs=document.querySelector('#app .htabs');const tb=tabs?tabs.getBoundingClientRect().top:999;
        return {thd:document.getElementById('toast').classList.contains('thd'),top:Math.round(t.top),hh:Math.round(Math.abs(t.height-h.height)),coverNm:t.left<=nm.left+1&&t.right>=nm.right-1&&t.top<=nm.top+1&&t.bottom>=nm.bottom-1,hitBtn:bs.some(x=>x.left<t.right-1),overTabs:t.bottom>tb+1,w:Math.round(t.width)};},tab);
      r.thd&&r.top===0&&r.hh<=2&&r.coverNm&&!r.hitBtn&&!r.overTabs&&r.w>=180?ok(`알림(${nm}): 머리줄 높이 · 이름 칸 통째 · 단추 안 가림 · 폭 ${r.w}`):bad(`알림(${nm}) `+JSON.stringify(r));}
    {const r=await q.evaluate(()=>{UI.openPlayerFull(SL.userTeam().roster[0]);UI.toast('우리 지명 차례');const t=document.getElementById('toast');const q=t.getBoundingClientRect();const bk=document.querySelector('#app .pvbar button').getBoundingClientRect();const bs=[...document.querySelectorAll('#app .pvbar button')].map(x=>x.getBoundingClientRect());return {thd:t.classList.contains('thd'),hit:bs.filter(x=>x.width&&x.left<q.right-1&&x.right>q.left+1).length,bk:Math.round(bk.right),l:Math.round(q.left)};});
      r.thd&&!r.hit&&r.l>=r.bk?ok(`알림(선수 상세): 뒤로 단추 오른쪽부터(${r.l}px) · 단추 안 가림`):bad('알림(하위 화면) '+JSON.stringify(r));await q.evaluate(()=>{UI.back&&UI.back();UI.setTab('home');});}
    {const r=await q.evaluate(()=>{UI.closeModal();UI.setTab('home');UI.taskNext();UI.closeModal();UI.setTab('home');const home=!!document.querySelector('.chainpill');UI.setTab('roster');const away=!!document.querySelector('.chainpill');const n=document.querySelector('.chainpill')?1:0;UI.setTab('home');return {pill:home,away,txt:''};});
      !r.pill?ok(`감독실에는 알약 없음(다른 화면 ${r.away?'있음':'할 일 없어 없음'})`):bad('감독실 알약 '+JSON.stringify(r));}
    {const r=await q.evaluate(()=>{UI.navTap('home');UI.menu();UI.toast('창 위 알림');return document.getElementById('toast').classList.contains('thd');});!r?ok('창이 떠 있으면 예전 자리(머리줄 칸 안 씀)'):bad('창 위 알림 thd');const r2=await q.evaluate(()=>{UI.closeModal();return document.getElementById('toast').classList.contains('thd');});r2?ok('창을 닫으면 떠 있던 알림이 머리줄 칸으로'):bad('창 닫은 뒤 알림 자리');}
    await b2.close();}
  // 6. PC: 알림 예전 자리 · 새 게임 세 걸음(리그 2열)
  {const b3=await chromium.launch();const c=await b3.newContext({viewport:{width:1280,height:860}});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message.slice(0,160)));await q.goto(F);await q.waitForTimeout(600);
    const r0=await q.evaluate(()=>({lg:document.querySelectorAll('.nglg').length,cols:getComputedStyle(document.querySelector('.nglgs')).gridTemplateColumns.split(' ').length}));r0.lg===4&&r0.cols===2?ok('PC 새 게임: 리그 4칸 2열'):bad('PC 새 게임 '+JSON.stringify(r0));
    const r=await q.evaluate(()=>{UI.pickLg('US');const dv=document.querySelectorAll('.divrow button').length;UI.set('newDiv',2);const first=(document.querySelector('.tsel5 button')||{getAttribute(){}}).getAttribute('aria-label');UI.ngStep(3);const sum=(document.querySelector('.ngsum b')||{}).textContent;UI.newGame();const nm=SL.userTeam().name;UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.toast('PC 알림');return {dv,first,sum,nm,thd:document.getElementById('toast').classList.contains('thd')};});
    r.dv===6&&r.first===r.sum&&r.sum===r.nm&&!r.thd?ok(`미국: 지구 6 · 셋째 걸음 「${r.sum}」 = 부임 구단 · PC 알림 예전 자리`):bad('미국/PC '+JSON.stringify(r));await b3.close();}
  // 7. 검사 주소(?test=1)는 예전 한 장
  {const b4=await chromium.launch();const c=await b4.newContext({viewport:{width:390,height:844}});const q=await c.newPage();await q.goto(F+'?test=1');await q.waitForTimeout(500);
    const r=await q.evaluate(()=>({lg:document.querySelectorAll('.lgseg button').length,team:document.querySelectorAll('.tsel5 button').length,opt:!!document.querySelector('.ngopt'),st:!!document.querySelector('.ngst')}));r.lg===4&&r.team===10&&r.opt&&!r.st?ok('?test=1: 예전 한 장(리그 · 구단 · 난이도 함께)'):bad('test=1 '+JSON.stringify(r));await b4.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  console.log(fails?`실패 ${fails}`:'v192 검사 통과');process.exit(fails?1:0);})();

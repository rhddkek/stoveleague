// v87 (R071): 기본 화면 조작 정리 — 탭 두 줄 · ☰ 전체 메뉴 · PC 왼쪽 메뉴 · 단축키 · 한 화면씩 나누기 · 촘촘히 보기 · 일정 오늘 앞뒤
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const start=async p=>{await p.goto(url);await p.waitForTimeout(300);await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(12);UI.closeModal();});};
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await start(p);
  // 1. 탭은 두 줄까지 (큰 탭 + 한 줄) · 주황 세부 탭 줄 없음 · 세부는 아래 줄 앞쪽
  {const r=await p.evaluate(()=>{const out=[];for(const t of ['roster','dev','market','league','club']){UI.setTab(t);const keys=[...document.querySelectorAll('.htabs button,.htabs2 button')].map(b=>(b.getAttribute('onclick')||'').match(/setSub\('(\w+)','(\w+)'\)/)).filter(Boolean).map(m=>m[2]);for(const k of new Set(keys)){UI.go(t,k);out.push({k:t+'/'+k,rows:document.querySelectorAll('.content .htabs, .content .htabs2').length,hseg:document.querySelectorAll('.content .hseg').length});}}
      UI.go('market','buy');const seg=[...document.querySelectorAll('.htabs2 .sg')].map(b=>b.textContent);return {out,seg};});
    const badR=r.out.filter(x=>x.rows>2||x.hseg);!badR.length&&r.seg.join(',')==='국내 구단,FA,해외·외국인'?ok(`탭 두 줄까지: ${r.out.length}개 화면 모두 (예: 선수 찾기 → 아래 줄 앞쪽에 ${r.seg.join('·')})`):bad('탭 줄 '+JSON.stringify(badR.slice(0,4))+' '+r.seg);}
  // 2. 휴대폰 ☰ 메뉴: 모든 화면이 한 창에 · 누르면 바로 그 화면 (어느 화면이든 두 번)
  {const r=await p.evaluate(()=>{UI.setTab('roster');const mb=document.querySelector('.club .menub');if(!mb)return {mb:false};mb.click();const btns=[...document.querySelectorAll('#modal .msec .mi button')];const n=btns.length;const heads=document.querySelectorAll('#modal .msec .mh').length;const srch=!!document.querySelector('#modal input[type=search]');
      const tgt=btns.find(x=>x.textContent.trim()==='명예의 전당');tgt.click();const closed=!document.querySelector('#modal .msec');const now=SL.state()&&document.querySelector('.htabs2 .on')?document.querySelector('.htabs2 .on').textContent:'';
      let reach=0,total=0;document.querySelector('.club .menub').click();const all=[...document.querySelectorAll('#modal .msec .mi button')].map(x=>(x.getAttribute('onclick')||'').match(/UI\.go\('(\w+)','(\w+)'\)/)).filter(Boolean);UI.closeModal();
      for(const m of all){total++;UI.go(m[1],m[2]);const on=document.querySelector('.htabs2 .on,.htabs .on');if(on)reach++;}return {mb:true,n,heads,srch,closed,now,reach,total};});
    r.mb&&r.heads===6&&r.n>=30&&r.srch&&r.closed&&/명예의 전당/.test(r.now)&&r.reach===r.total?ok(`☰ 메뉴: 6개 묶음 · 화면 ${r.n}개 단추 + 선수 검색 → 「명예의 전당」 한 번에 이동 (모든 단추 ${r.total}개 이동 확인)`):bad('메뉴 '+JSON.stringify(r));}
  // 3. 한 화면씩: 재정·설정·2군·시설·해외 … 휴대폰에선 위 칩으로 묶음 전환, 보이는 묶음만 / 칩을 누르면 바뀜
  {const r=await p.evaluate(()=>{const out={};for(const sc of ['club:fin','club:data','dev:res','league:overseas','club:fac','roster:lineup']){const [t,s]=sc.split(':');UI.go(t,s);const chips=[...document.querySelectorAll('.pgtabs button')];const hid=document.querySelectorAll('.pghide').length;out[sc]={n:chips.length,l:chips.map(c=>c.textContent.replace(/^\d/,'')),hid};}
      UI.go('club','fin');const before=document.querySelector('.content').innerText;document.querySelectorAll('.pgtabs button')[1].click();const on=document.querySelector('.pgtabs .on').textContent;const after=document.querySelector('.content').innerText;UI.pgGo('club:fin',0);
      return {out,switched:before!==after&&/^2/.test(on)};});
    const okAll=Object.values(r.out).every(x=>x.n>=2&&x.hid>0);okAll&&r.switched?ok('한 화면씩 나눔: '+Object.entries(r.out).map(([k,v])=>`${k} [${v.l.join(' | ')}]`).join(' · ')+' — 칩 누르면 그 묶음으로'):bad('나눔 '+JSON.stringify(r));}
  // 4. 일정: 기본은 오늘 앞뒤 15경기 · 「전체 144경기」 누르면 모두
  {const r=await p.evaluate(()=>{UI.go('league','sched');const a=document.querySelectorAll('.content table tr').length-1;const me=!!document.querySelector('.content table tr.me');const btn=[...document.querySelectorAll('.content button')].find(x=>/전체 \d+경기/.test(x.textContent));if(btn)btn.click();const all=document.querySelectorAll('.content table tr').length-1;UI.set('schedAll',false);return {a,me,all,n:SL.state().schedule.filter(g=>SL.isUserGame(g)).length};});
    r.a===15&&r.me&&r.all===r.n?ok(`일정: 처음엔 오늘 앞뒤 ${r.a}경기(오늘 줄 강조) → 「전체」 ${r.all}경기`):bad('일정 '+JSON.stringify(r));}
  // 5. 촘촘히 보기 (기본 켬): 선수 목록 한 줄 34px · 끄면 원래 48px
  {const r=await p.evaluate(()=>{UI.go('roster','list');const h1=document.querySelector('.rosterq tbody tr').offsetHeight;const d1=document.documentElement.classList.contains('dense');UI.setPref('dense',false);const h0=document.querySelector('.rosterq tbody tr').offsetHeight;UI.setPref('dense',true);return {h1,h0,d1};});
    r.d1&&r.h1<=36&&r.h0>=46?ok(`촘촘히 보기(기본): 선수 목록 한 줄 ${r.h1}px (끄면 ${r.h0}px) — ☰ 메뉴·PC 왼쪽 아래에서 끄고 켬`):bad('촘촘 '+JSON.stringify(r));}
  // 6. 도전과제 두 칸 격자
  {const r=await p.evaluate(()=>{UI.go('league','ach');const g=document.querySelector('.achg');if(!g)return null;const a=[...g.children].slice(0,2).map(e=>e.getBoundingClientRect());return {cols:Math.round(a[0].top)===Math.round(a[1].top)&&a[1].left>a[0].left,n:g.children.length};});
    r&&r.cols?ok(`도전과제 ${r.n}개 두 칸 격자 (높이 절반)`):bad('도전과제 '+JSON.stringify(r));}
  // 7. 스크롤 총량: 37개 화면 넘침 합계가 예전(v86 측정 19,027px)의 40% 아래
  {const r=await p.evaluate(()=>{let sum=0,n=0;for(const t of ['roster','dev','market','league','club']){UI.setTab(t);const keys=[...document.querySelectorAll('.htabs button,.htabs2 button')].map(b=>(b.getAttribute('onclick')||'').match(/setSub\('(\w+)','(\w+)'\)/)).filter(Boolean).map(m=>m[2]);for(const k of new Set(keys)){UI.go(t,k);window.scrollTo(0,0);sum+=Math.max(0,document.scrollingElement.scrollHeight-innerHeight);n++;}}return {sum,n};});
    r.sum<19027*0.4?ok(`휴대폰 390×844: ${r.n}개 화면 아래로 넘친 길이 합 ${r.sum}px (v86 19,027px → ${Math.round((1-r.sum/19027)*100)}% 줄어듦)`):bad('넘침 합 '+r.sum);}
  // 8. 가로 넘침 없음 (메뉴 창·나눈 화면)
  {const r=await p.evaluate(()=>{UI.go('club','fin');const a=document.documentElement.scrollWidth-innerWidth;UI.menu();const m=document.querySelector('#modal .sheetc,#modal');const b2=m?m.scrollWidth-m.clientWidth:0;UI.closeModal();return {a,b2};});r.a<=0&&r.b2<=2?ok('가로 넘침 없음 (재정 화면 · ☰ 메뉴 창)'):bad('가로 '+JSON.stringify(r));}
  await p.close();
  // 9. PC: 왼쪽 메뉴(모든 화면 한 번에) · 아래 6칸 탭 감춤 · 나누기 없음 · 단축키 1~6 / Q·E
  {const q=await b.newPage({viewport:{width:1280,height:800}});q.on('pageerror',e=>errs.push(e.message));await start(q);
    const r=await q.evaluate(()=>{UI.setTab('home');const side=document.querySelector('.side');const navHidden=getComputedStyle(document.querySelector('.nav .in')).display==='none';const heads=side?side.querySelectorAll('.mh').length:0;
      const lg=[...side.querySelectorAll('.mh')].find(x=>/리그/.test(x.textContent));lg.click();const exp=[...document.querySelectorAll('.side .msec.on .mi button')].map(x=>x.textContent.trim());const hof=[...document.querySelectorAll('.side .msec.on .mi button')].find(x=>/명예의 전당/.test(x.textContent));hof.click();const onHof=/명예의 전당/.test((document.querySelector('.side .mi button.on')||{}).textContent||'');
      UI.go('club','fin');const pg=document.querySelectorAll('.pgtabs').length;return {side:!!side,navHidden,heads,exp:exp.length,onHof,pg,keys:!!document.querySelector('.side .skeys')};});
    await q.keyboard.press('3');const k3=await q.evaluate(()=>document.querySelector('.side .msec.on .mh').textContent.trim());
    await q.keyboard.press('e');const kE=await q.evaluate(()=>(document.querySelector('.side .mi button.on')||{}).textContent);await q.keyboard.press('q');const kQ=await q.evaluate(()=>(document.querySelector('.side .mi button.on')||{}).textContent);
    r.side&&r.navHidden&&r.heads===6&&r.exp>=8&&r.onHof&&r.pg===0&&r.keys&&/육성/.test(k3)&&kE&&kQ&&kE!==kQ?ok(`PC 1280: 왼쪽 메뉴 6묶음 (리그 펼치면 ${r.exp}개 화면 · 「명예의 전당」 한 번에) · 아래 탭 감춤 · 키 3 → ${k3} · E → ${kE} · Q → ${kQ}`):bad('PC '+JSON.stringify(r)+k3+'/'+kE+'/'+kQ);
    await q.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v87 검사 실패 ${fails}건`:'v87 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

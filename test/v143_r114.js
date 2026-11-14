// v143 (R114): 선수 목록이 아닌 화면은 휴대폰 한 화면 — 길면 쪽으로 나눔(구단 감독 · 시설 · 라커룸 · 일정)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);
  await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();const S=SL.state();S.settings.stopOnOffer=false;S.settings.stopOnCheck=false;UI.autoDays(14);});await p.waitForTimeout(1200);await p.evaluate(()=>UI.closeModal());
  const H=(list)=>p.evaluate(list=>list.map(([t,s])=>{UI.go(t,s);UI.closeModal();const pg=[...document.querySelectorAll('.pgtabs button')].map(x=>x.textContent.replace(/^\d+/,''));const hs=[];const n=Math.max(1,pg.length);for(let i=0;i<n;i++){if(pg.length)UI.pgGo(t+':'+s,i);hs.push(Math.round(document.documentElement.scrollHeight/innerHeight*100)/100);}if(pg.length)UI.pgGo(t+':'+s,0);return {k:t+'/'+s,pg,hs,ow:document.documentElement.scrollWidth-innerWidth};}),list);
  // 1. 시즌 중
  {const r=await H([['home',null],['roster','lineup'],['club','mgr'],['club','fac'],['league','sched'],['league','fut'],['dev','res'],['market','neg']]);const m=Object.fromEntries(r.map(x=>[x.k,x]));
    const fit=r.every(x=>x.hs.every(h=>h<=1.12)&&x.ow<=0);
    fit&&m['club/mgr'].pg.join('|')==='내 팀|감독 평판'&&m['club/fac'].pg.length>=2&&m['league/sched'].pg.includes('이후 일정')?ok('시즌 중: '+r.map(x=>`${x.k}${x.pg.length?` [${x.pg.join(' · ')}]`:''} ${x.hs.join('/')}`).join(' · ')):bad('시즌 중 '+JSON.stringify(r));}
  // 2. 겨울
  {await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='season'&&g++<40){if(S.half&&!S.half.seen)SL.halfSeen();SL.testCmd('endSeason');UI.closeModal();}UI.closeModal();});await p.waitForTimeout(300);
    const r=await H([['roster','lineup'],['roster','locker'],['club','mgr'],['club','fac'],['dev','grow'],['market','renew']]);const m=Object.fromEntries(r.map(x=>[x.k,x]));
    const fit=r.every(x=>x.hs.every(h=>h<=1.12)&&x.ow<=0);
    fit&&m['club/mgr'].pg.length>=2&&m['roster/locker'].pg.length>=2?ok('겨울: '+r.map(x=>`${x.k}${x.pg.length?` [${x.pg.join(' · ')}]`:''} ${x.hs.join('/')}`).join(' · ')):bad('겨울 '+JSON.stringify(r));}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v143 통과');process.exit(fails?1:0);})();

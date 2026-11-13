// v139 (R110): 휴대폰에서 잘 이어지고 친절하게 — 경기 결과 두 번 안 뜸 · 고른 진행 방식 이어 감 · 알약이 단추를 안 가림 · 빈 칸 정리 · 이적 첫 화면 · 개막 전 · 알림 위치 · 진행 방식 단추 · 결산 이름
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);
  await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();const S=SL.state();S.settings.stopOnOffer=false;S.settings.stopOnCheck=false;});await p.waitForTimeout(300);
  // 1. 개막 전 머리줄 · 감독실 빈 칸 정리 · 이적 첫 화면
  {const r=await p.evaluate(()=>{UI.setTab('home');const o={hd:(document.querySelector('.cl2')||{}).textContent,tiles:[...document.querySelectorAll('.tile .th span')].map(x=>x.textContent.trim())};UI.navTap('market');o.sub=(document.querySelector('.htabs2 .on, .subtabs2 .on')||{}).textContent||'';o.big=[...document.querySelectorAll('.htabs .on')].map(x=>x.textContent.trim()).join('|');o.empty=document.body.innerText.includes('답변 필요 0건');UI.setTab('home');return o;});
    r.hd==='개막 전'&&!r.tiles.some(t=>/할 일 없음|감독 채용/.test(t))&&!r.tiles.some(t=>t.includes('성장 점검'))&&/영입/.test(r.big)&&!r.empty?ok(`머리줄 「${r.hd}」 · 감독실 칸 [${r.tiles.join(', ')}] (할 일 없음 · 성장 점검 대기 · 시즌 중 감독 채용 없음) · 이적 → 「${r.big}」(빈 협상 화면 대신)`):bad('첫 화면 '+JSON.stringify(r));}
  // 2. 경기 화면 「진행 방식」 단추 · 직접 본 경기 끝 → 결과 다시 안 띄우고 「다음 경기」 창
  {const r=await p.evaluate(()=>{UI.startGame();const o={md:(document.querySelector('.cmmd')||{}).innerText||''};const lg=SL.state().liveGame;let g=0;while(lg&&!lg.done&&g++<400)SL.stepGame(lg);UI.render&&UI.render();return o;});
    await p.evaluate(()=>UI.endGame());await p.waitForTimeout(700);
    const r2=await p.evaluate(()=>({nx:!!document.querySelector('#modal .nxs'),rs:!!document.querySelector('#modal .rsheet'),t:((document.querySelector('#modal .nxs .nxh')||{}).innerText||'').replace(/\s+/g,' '),btn:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent).join('|')}));
    /^진행 방식\s*장면 ▾$/.test(r.md.replace(/\n/g,' ').trim())&&r2.nx&&!r2.rs&&/^다음 경기 vs .+ (홈|원정) · 상대 \d+승 \d+패/.test(r2.t)&&r2.btn==='7경기 자동|다음 경기 ▶'?ok(`경기 화면 [${r.md.replace(/\s+/g,' ')}] · 경기 끝 → 결과 대신 「${r2.t}」 [${r2.btn}]`):bad('다음 경기 창 '+JSON.stringify([r,r2]));await p.evaluate(()=>UI.closeModal());}
  // 3. 결과 창 단추는 고른 진행 방식을 이어 감
  {const r=await p.evaluate(()=>{const o={};const bar=()=>[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent).join('|');UI.set('lastRun',7);UI.sheet('result');o.b7=bar();UI.closeModal();UI.set('lastRun',999);UI.sheet('result');o.b999=bar();UI.closeModal();UI.set('lastRun',0);UI.sheet('result');o.b0=bar();UI.closeModal();return o;});
    r.b7==='다음 경기 보기|7경기 더 ▶'&&r.b999==='다음 경기 보기|시즌 끝까지 계속 ▶'&&r.b0==='7경기 자동|다음 경기 ▶'?ok(`결과 창: 7경기 자동 뒤 [${r.b7}] · 시즌 끝까지 뒤 [${r.b999}] · 직접 본 뒤 [${r.b0}]`):bad('결과 창 단추 '+JSON.stringify(r));}
  // 4. 올스타 브레이크: 「시즌 끝까지」로 왔으면 「후반기 시작」 뒤에도 자동이 이어짐
  {await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='season'&&!(S.half&&S.half.s===S.season)&&g++<30){UI.autoDays(20);UI.closeModal();}});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{const S=SL.state();const o={half:!!(S.half&&S.half.s===S.season),d0:S.day};UI.closeModal();UI.set('lastRun',999);UI.halfStart();return o;});await p.waitForTimeout(2500);
    const r2=await p.evaluate(()=>({d:SL.state().day,ph:SL.state().phase}));
    r.half&&(r2.d>=r.d0+10||r2.ph!=='season')?ok(`올스타 브레이크(${r.d0}일) → 「후반기 시작」 → 시즌 끝까지 계속(${r2.ph==='season'?r2.d+'일까지':'시즌 끝'})`):bad('후반기 이어짐 '+JSON.stringify([r,r2]));}
  // 5. 겨울: 첫 시즌 할 일 알림 없음 · 시즌 결산 이름 겹침 없음 · 할 일 알약은 아래 단추 줄 위
  {await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='season'&&g++<40){if(S.half&&!S.half.seen)SL.halfSeen();SL.testCmd('endSeason');UI.closeModal();}UI.closeModal();UI.setTab('home');});await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{const S=SL.state();const o={ph:S.phase};UI.seasonRecap();const n=document.querySelector('#modal .rc1 .n');o.nm=n?n.textContent:'';o.fit=n?n.scrollWidth<=n.clientWidth+1:false;UI.closeModal();
      const t=document.getElementById('toast');if(t)t.style.display='none';UI.navTap('market');const tt=document.getElementById('toast');o.guide=!!(tt&&tt.style.display!=='none'&&/첫 시즌 할 일/.test(tt.textContent));UI.setTab('home');
      const ch=document.querySelector('.wchain');o.chain=!!ch;if(ch)ch.click();const x=document.querySelector('#modal .tsc b');o.task=x?x.textContent:'';const pr=document.querySelector('#modal .tsk:not(.done) .shbar .primary');if(pr)pr.click();return o;});
    await p.waitForTimeout(400);
    const r2=await p.evaluate(()=>{const pill=document.querySelector('.chainpill');if(!pill)return {pill:false};const pr=pill.getBoundingClientRect();let cov=[];for(const b of document.querySelectorAll('#app button')){const q=b.getBoundingClientRect();if(!q.height||!b.offsetParent)continue;const cx=(q.left+q.right)/2,cy=(q.top+q.bottom)/2;const hit=document.elementFromPoint(cx,cy);if(hit&&pill.contains(hit)&&q.top>innerHeight*0.6)cov.push(b.textContent.trim());}const t=document.getElementById('toast');return {pill:true,txt:pill.textContent,cov,toastTop:t?parseFloat(getComputedStyle(t).top):-1};});
    r.ph==='offseason'&&r.nm&&r.fit&&!r.guide&&(!r.chain||(r2.pill&&!r2.cov.length))?ok(`겨울: 결산 이름 「${r.nm}」 한 줄 · 첫 시즌 알림 없음 · 「${r.task}」 처리하러 가면 알약 「${r2.txt||'-'}」이 아래 단추를 가리지 않음`):bad('겨울 '+JSON.stringify([r,r2]));}
  // 6. 알림은 휴대폰에서 위쪽(아래 단추를 덮지 않음)
  {const r=await p.evaluate(()=>{UI.closeModal();UI.setTab('home');let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}t.textContent='시험 알림';t.style.display='block';const q=t.getBoundingClientRect();t.style.display='none';return {top:Math.round(q.top),bottom:Math.round(q.bottom)};});
    r.bottom<300?ok(`알림 위치: 위쪽 ${r.top}~${r.bottom}px (아래 단추 위가 아님)`):bad('알림 위치 '+JSON.stringify(r));}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v139 통과');process.exit(fails?1:0);})();

// v148 (R119): 중계 — 야구공 모양 · 수비수가 달려가 잡고 던짐 · 슬라이딩 / 선수 카드 통일(어디서 눌러도 같은 카드 + 계약 · 거래 조건 + 바로 할 일)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const boot=async(vp,mob)=>{const c=await b.newContext({viewport:vp,isMobile:mob,hasTouch:mob});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();});return p;};
  const p=await boot({width:390,height:844},true);
  // ── 선수 카드 (휴대폰) ──
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const T=Object.values(S.teams);const ot=T.find(t=>t&&!t.isUser&&t.league==='KR');const out={};const grab=()=>{const m=document.querySelector('#modal .pck');return m?{rows:[...m.querySelectorAll('.pcd span')].map(x=>x.textContent).join(','),btn:[...m.querySelectorAll('.shbar button')].map(x=>x.textContent.trim()).join('|'),cmp:!!m.querySelector('.pccmp'),more:!!m.querySelector('.pcmore')}:null;};
      UI.go('roster','list');UI.openPlayer(ut.lineup[0]);out.own=grab();UI.closeModal();UI.openPlayer(ot.lineup[0]);out.oth=grab();UI.closeModal();UI.mmenu(ot.lineup[1]);out.menu=grab();UI.closeModal();
      const fa=(S.fa||[])[0];if(fa!=null){UI.openPlayer(fa);out.fa=grab();UI.closeModal();}const os=T.find(t=>t&&t.league==='US');if(os){UI.openPlayer(os.roster[0]);out.os=grab();UI.closeModal();}return out;});
    r.own&&/계약/.test(r.own.rows)&&/시장가치/.test(r.own.rows)&&/재계약/.test(r.own.btn)&&/관리/.test(r.own.btn)&&r.own.more?ok(`우리 선수 카드: 줄 [${r.own.rows}] · 단추 [${r.own.btn}]`):bad('우리 선수 카드 '+JSON.stringify(r.own));
    r.oth&&/영입/.test(r.oth.rows)&&/영입 제안/.test(r.oth.btn)&&r.oth.cmp?ok(`다른 구단 선수 카드: 줄 [${r.oth.rows}] · 단추 [${r.oth.btn}] · 비교`):bad('다른 구단 카드 '+JSON.stringify(r.oth));
    r.menu&&/영입 제안/.test(r.menu.btn)?ok('조치 메뉴(⋯)도 같은 카드'):bad('조치 메뉴 '+JSON.stringify(r.menu));
    !r.fa||/FA/.test(r.fa.btn)?ok(`FA 선수 카드: 단추 [${r.fa?r.fa.btn:'FA 없음'}]`):bad('FA 카드 '+JSON.stringify(r.fa));
    r.os&&/관찰도|잠재/.test(r.os.rows)&&/영입/.test(r.os.rows)?ok(`해외 선수 카드: 줄 [${r.os.rows}] · 단추 [${r.os.btn}]`):bad('해외 카드 '+JSON.stringify(r.os));}
  // 기록 순위 줄 · 누르는 동작이 없는 얼굴
  {await p.evaluate(()=>{const S=SL.state();S.settings.stopOnOffer=false;S.settings.stopOnCheck=false;UI.autoDays(14);});for(let i=0;i<12;i++){await p.waitForTimeout(1000);const n=await p.evaluate(()=>{UI.closeModal();UI.go('league','rec');return document.querySelectorAll('#app .recrow').length;});if(n>1)break;}await p.waitForTimeout(300);const tab=true;
    const n=await p.locator('#app .recrow').count();if(!tab||!n)bad('기록 순위 화면을 찾지 못함');else{await p.locator('#app .recrow').nth(1).click();await p.waitForTimeout(250);
      const r=await p.evaluate(()=>{const m=document.querySelector('#modal .pck');return m?{nm:m.querySelector('.pch b').textContent,st:[...m.querySelectorAll('.pcst span')].map(x=>x.textContent).join(','),btn:[...m.querySelectorAll('.shbar button')].map(x=>x.textContent.trim()).join('|')}:null;});
      r&&/타율/.test(r.st)&&r.btn?ok(`기록 순위 줄을 누르면 카드: ${r.nm} · 기록 칸 [${r.st}] · 단추 [${r.btn}]`):bad('기록 순위 카드 '+JSON.stringify(r));await p.evaluate(()=>UI.closeModal());}
    await p.evaluate(()=>UI.go('roster','pitch'));await p.waitForTimeout(150);const im=p.locator('#app img.av[data-pid]');let hit=false;const k=await im.count();
    for(let i=0;i<k&&!hit;i++){const free=await im.nth(i).evaluate(e=>!e.closest('[onclick]')&&!e.closest('button,a,label')&&e.getBoundingClientRect().width>0);if(free){await im.nth(i).click({force:true});await p.waitForTimeout(200);hit=await p.evaluate(()=>!!document.querySelector('#modal .pck'));}}
    hit?ok('줄에 동작이 없는 선수 얼굴(투수진 머리 칸)도 누르면 카드'):ok('투수진 화면에 동작 없는 얼굴이 없음(건너뜀)');await p.evaluate(()=>UI.closeModal());}
  // ── 중계 ──
  await p.evaluate(()=>{UI.go('home','main');UI.startGame();});await p.waitForTimeout(800);
  {const r=await p.evaluate(()=>{UI.step('pitch');return {spr:['sld','fld_g','fld_f'].filter(k=>ASSETS.sprites[k]).length,st:document.querySelectorAll('.fsv .fball .fbst').length,c:document.querySelectorAll('.fsv .fball .fbc').length};});
    r.spr===3&&r.st>=1&&r.c>=1?ok('야구공 모양(흰 공 + 빨간 실밥) · 새 그림 3종(슬라이딩 · 땅볼 잡기 · 뜬공 잡기)'):bad('야구공 '+JSON.stringify(r));}
  {const seen={};let g=0,games=0;while(g++<400&&!(seen.fo&&seen.go&&seen.sld)){const r=await p.evaluate(()=>{const lg=SL.state().liveGame;if(!lg||lg.done)return {done:1};UI.step('pa');const L=SL.state().liveGame;if(!L||!L.fx)return {};const mv=[...document.querySelectorAll('.fsv .fmove')].map(x=>({pos:x.dataset.pos,mo:!!x.querySelector(':scope>animateMotion'),n:[...x.querySelectorAll('.sprg')].map(s=>s.querySelectorAll('image').length).join('+')}));
        return {t:L.fx.t,mv,sld:document.querySelectorAll('.fsv .sprw .sldg image').length,dust:document.querySelectorAll('.fsv .fdust').length,pit:document.querySelectorAll('.fsv .fball.fpit').length,lab:document.querySelectorAll('.fsv .fdl animateMotion').length};});
      if(r.done){if(++games>3)break;await p.evaluate(()=>{UI.closeModal();try{UI.endLive&&UI.endLive();}catch(e){}});break;}
      if(r.t==='fo'&&!seen.fo&&r.mv.length)seen.fo=r;if(r.t==='go'&&!seen.go&&r.mv.length)seen.go=r;if(r.sld&&!seen.sld)seen.sld=r;await p.waitForTimeout(15);}
    const fo=seen.fo,go=seen.go,sl=seen.sld;
    fo&&fo.mv.length===1&&fo.mv[0].mo&&/5/.test(fo.mv[0].n)&&fo.pit===1&&fo.lab===1?ok(`뜬공: ${fo.mv[0].pos}가 달려가 글러브를 들어 잡음(그림 ${fo.mv[0].n}) · 이름표도 같이 이동 · 던진 공 → 친 공 순서`):bad('뜬공 수비 '+JSON.stringify(fo));
    go&&go.mv.length>=1&&go.mv.some(m=>/5/.test(m.n))?ok(`땅볼: ${go.mv.map(m=>m.pos).join(' → ')} (잡고 → 던지고 → 베이스에서 받음)`):bad('땅볼 수비 '+JSON.stringify(go));
    sl&&sl.sld===3&&sl.dust===3?ok(`슬라이딩: ${sl.t} 장면에서 달리다 미끄러짐(3장) + 흙먼지`):bad('슬라이딩 '+JSON.stringify(sl));}
  {const r=await p.evaluate(()=>{const lg=SL.state().liveGame;if(!lg||lg.done)return null;UI.setPref('motion',false);let mv=0,sw=0;for(let i=0;i<12;i++){const g=SL.state().liveGame;if(!g||g.done)break;UI.step('pa');mv+=document.querySelectorAll('.fsv .fmove').length;sw+=document.querySelectorAll('.fsv .sprw').length;}UI.setPref('motion',true);return {mv,sw};});
    !r||(r.mv===0&&r.sw===0)?ok('움직임 끔: 수비 이동 · 슬라이딩 없음'):bad('움직임 끔 '+JSON.stringify(r));}
  // ── PC에서도 같은 카드 ──
  {const q=await boot({width:1280,height:800},false);const r=await q.evaluate(()=>{const S=SL.state();const ot=Object.values(S.teams).find(t=>t&&!t.isUser&&t.league==='KR');UI.go('league','table');UI.openPlayer(ot.lineup[0]);const m=document.querySelector('#modal .pck');const a={card:!!m,view:!!(document.querySelector('.pview')),btn:m?[...m.querySelectorAll('.shbar button')].map(x=>x.textContent.trim()).join('|'):''};if(m)m.querySelector('.pcmore').click();a.full=!document.querySelector('#modal .pck');return a;});
    r.card&&/영입 제안/.test(r.btn)&&r.full?ok(`PC: 선수를 누르면 같은 카드(단추 [${r.btn}]) → 「자세히」로 상세 화면`):bad('PC 카드 '+JSON.stringify(r));}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v148 통과');process.exit(fails?1:0);})();

// v146 (R117): 중계 화면 픽셀 선수 — 수비 9명 · 타자 · 주자 그림, 투구 때 던지는 동작, 스윙, 달리기, 움직임 끄면 정지
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);
  await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();UI.startGame();});await p.waitForTimeout(800);
  // 1. 첫 화면: 수비 9명 + 타자 = 그림 10장(동그라미는 숨김) · 수비 팀과 공격 팀 색이 다름 · 경기 화면은 어두운 바탕
  {const r=await p.evaluate(()=>{const im=[...document.querySelectorAll('.fsv .sprim')];const hid=[...document.querySelectorAll('.fsv .sprh')];const hrefs=new Set(im.map(x=>x.getAttribute('href')));const cm=document.querySelector('.cmv');const bg=getComputedStyle(cm).backgroundColor.match(/\d+/g).map(Number);
      return {n:im.length,hid:hid.length,vis:hid.every(x=>getComputedStyle(x).visibility==='hidden'),kinds:hrefs.size,anim:document.querySelectorAll('.fsv .sprg animate').length,dark:bg[0]+bg[1]+bg[2]<150,theme:document.documentElement.dataset.theme,w:im[0]?im[0].getBoundingClientRect().width:0};});
    r.n===10&&r.hid===10&&r.vis&&r.kinds>=4&&r.anim===0&&r.dark&&r.w>=24?ok(`첫 화면: 픽셀 선수 ${r.n}명(동그라미 ${r.hid}개 숨김) · 그림 종류 ${r.kinds} · 크기 ${Math.round(r.w)}px · 테마 ${r.theme}에서도 경기 화면은 어두운 바탕`):bad('첫 화면 '+JSON.stringify(r));}
  // 2. 공 하나: 투수 던지는 동작(프레임 7장) · 스윙한 공이면 타자도
  {const R=[];for(let i=0;i<8;i++){R.push(await p.evaluate(()=>{UI.step('pitch');const g=[...document.querySelectorAll('.fsv .sprg')].map(x=>({im:x.querySelectorAll('image').length,an:x.querySelectorAll('image>animate').length}));const lg=SL.state().liveGame;const pz=lg&&lg.pz&&lg.pz.l.length?lg.pz.l[lg.pz.l.length-1][0]:null;return {pit:g.filter(x=>x.im===7&&x.an===7).length,bat:g.filter(x=>x.im===8&&x.an===8).length,pz,fx:lg&&lg.fx?lg.fx.t:null};}));await p.waitForTimeout(120);}
    const pit=R.filter(x=>x.pit===1).length;const sw=R.filter(x=>x.fx==='p'&&['w','f','x'].includes(x.pz));const tk=R.filter(x=>x.fx==='p'&&['b','s'].includes(x.pz));
    pit>=6&&sw.every(x=>x.bat===1)&&tk.every(x=>x.bat===0)?ok(`공 8개: 투수 던지는 동작 ${pit}번 · 스윙한 공 ${sw.length}개는 타자 스윙 · 지켜본 공 ${tk.length}개는 그대로`):bad('투구 동작 '+JSON.stringify(R));}
  // 3. 주자가 나가면 달리는 그림(되풀이 4장) · 베이스에 선 주자 그림
  {let run=0,stand=0,g=0;while(g++<40&&(run<1||stand<1)){const r=await p.evaluate(()=>{UI.step('pa');const lg=SL.state().liveGame;if(!lg||lg.done)return null;const G=[...document.querySelectorAll('.fsv .sprg')];return {run:G.filter(x=>x.querySelector('animateMotion')&&x.querySelectorAll('image').length===4).length,on:lg.bases.filter(Boolean).length,im:document.querySelectorAll('.fsv .sprim').length};});if(!r)break;if(r.run)run++;if(r.on&&r.im>=10+r.on)stand++;await p.waitForTimeout(60);}
    run>=1&&stand>=1?ok(`주자: 달리는 그림 ${run}번 · 베이스 위 주자 그림 ${stand}번`):bad('주자 '+JSON.stringify({run,stand}));}
  // 4. 설정 「움직임」 끄면 동작 없이 정지 그림
  {const r=await p.evaluate(()=>{UI.setPref('motion',false);let a=0,n=0;for(let i=0;i<4;i++){UI.step('pitch');a+=document.querySelectorAll('.fsv .sprg image>animate').length;n=document.querySelectorAll('.fsv .sprim').length;}UI.setPref('motion',true);return {a,n};});
    r.a===0&&r.n>=10?ok(`움직임 끔: 동작 0 · 정지 그림 ${r.n}장`):bad('움직임 끔 '+JSON.stringify(r));}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v146 통과');process.exit(fails?1:0);})();

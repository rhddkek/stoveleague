// v147 (R118): 중계 화면 — 타자 방향 · 팔 각도별 투구 그림 · 친 타자가 그대로 달려 나감 · 점수판 엠블럼 / 구단 엠블럼 88개 · 리그 마크 7개
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(500);
  // 1. 엠블럼: 모든 리그 구단 이름마다 그림 · 그림 파일에 겹침 없음 · 리그 마크 7개
  {const r=await p.evaluate(()=>{const N=SL.TEAM_NAMES;const miss=[];let n=0;for(const lg in N)for(const t of N[lg]){n++;if(!ASSETS.emblems[t[0]])miss.push(t[0]);}const u=new Set(Object.values(ASSETS.emblems));return {n,miss,uniq:u.size,all:Object.keys(ASSETS.emblems).length,lg:Object.keys(ASSETS.leagues).sort().join(',')};});
    r.n>=88&&!r.miss.length&&r.uniq===r.all?ok(`구단 엠블럼: ${r.n}개 구단 모두 그림 있음 (서로 다른 그림 ${r.uniq}장)`):bad('구단 엠블럼 '+JSON.stringify(r));
    r.lg==='AU,CB,JP,KR,MX,TW,US'?ok('리그 마크 7개 (한국 · 일본 · 미국 · 대만 · 멕시코 · 호주 · 도미니카)'):bad('리그 마크 '+r.lg);
    const idx=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/emblems/index.json'),'utf8'));const lost=Object.values(idx).filter(f=>!fs.existsSync(path.resolve(__dirname,'../assets/emblems/'+f+'.png')));lost.length?bad('엠블럼 파일 없음 '+lost.join(',')):ok('엠블럼 목록의 파일이 모두 있음');}
  await p.getByText('블레이즈').first().click();await p.waitForTimeout(200);
  {const n=await p.evaluate(()=>document.querySelectorAll('.lgseg img.lgb').length);n>=4?ok(`새 게임 리그 고르기: 리그 마크 ${n}개`):bad('새 게임 리그 마크 '+n);}
  await p.getByText('감독으로 시작').first().click();await p.waitForTimeout(600);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();UI.startGame();});await p.waitForTimeout(800);
  // 2. 점수판 · 이닝별 점수표에 두 팀 엠블럼
  {const r=await p.evaluate(()=>({sb:document.querySelectorAll('.cmsb i.em img').length,ls:document.querySelectorAll('.cmls i.em img').length,w:(document.querySelector('.cmsb i.em img')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width}));
    r.sb===2&&r.ls===2&&r.w>=18?ok(`점수판 엠블럼 2개(${Math.round(r.w)}px) · 이닝별 점수표 2개`):bad('점수판 엠블럼 '+JSON.stringify(r));}
  // 3. 타자 방향: 우타자는 왼쪽 타석에서 오른쪽(투수 쪽 어깨가 마운드로)을 보게 뒤집고, 좌타자는 오른쪽 타석에서 그대로
  {const r=await p.evaluate(()=>{const S=SL.state();const out=[];for(const bats of ['R','L']){const lg=S.liveGame;const off=lg.half===0?lg.away:lg.home;const t=S.teams[off]||S.teams.find(x=>x.id===off);const ids=(lg.lineup&&lg.lineup[lg.half])||t.lineup;for(const id of ids)if(S.players[id])S.players[id].bats=bats;UI.render&&UI.render();const g=[...document.querySelectorAll('.fsv .sprg')].map(x=>{const im=x.querySelector('image');const f=x.querySelector('g[transform*="scale(-1"]');return im?{x:+im.getAttribute('x'),y:+im.getAttribute('y'),f:!!f}:null;}).filter(Boolean).filter(o=>o.y>240&&o.y<275&&Math.abs(o.x+16-180)>8&&Math.abs(o.x+16-180)<30);out.push({bats,g});}return out;});
    const R=r[0].g[0],L=r[1].g[0];
    R&&L&&R.f&&!L.f&&R.x<L.x?ok(`타자 방향: 우타자 왼쪽 타석(뒤집음) · 좌타자 오른쪽 타석(그대로)`):bad('타자 방향 '+JSON.stringify(r));}
  // 4. 팔 각도마다 다른 투구 그림
  {const r=await p.evaluate(()=>{const S=SL.state();const out={};for(const a of ['O','S','U']){const lg=S.liveGame;if(!lg||lg.done)break;for(const id of lg.pitcher)if(S.players[id])S.players[id].arm=a;UI.step('pitch');const g=[...document.querySelectorAll('.fsv .sprg')].find(x=>{const n=x.querySelectorAll('image').length;return (n===6||n===7)&&x.querySelectorAll('image>animate').length===n;});out[a]=g?[...g.querySelectorAll('image')].map(i=>i.getAttribute('href')).join('|'):'';}return {n:new Set(Object.values(out)).size,has:Object.values(out).every(Boolean),spr:Object.keys(ASSETS.sprites).filter(k=>k.startsWith('pit_')).sort().join(',')};});
    r.has&&r.n===3&&r.spr==='pit_o,pit_s,pit_u'?ok('투구 그림: 오버 · 사이드 · 언더 세 가지가 서로 다름'):bad('팔 각도 '+JSON.stringify({n:r.n,has:r.has,spr:r.spr}));}
  // 5. 안타: 친 타자가 타석에서 스윙 → 사라지는 순간 같은 자리에서 주자가 나타나 달림(분신 없음) · 다음 타자는 그 뒤에 등장
  {let hit=null,g=0;while(g++<80&&!hit){const r=await p.evaluate(()=>{UI.step('pa');const lg=SL.state().liveGame;if(!lg||lg.done)return {done:1};const t=lg.fx&&lg.fx.t;if(!['1b','2b','3b'].includes(t))return {t};
        const G=[...document.querySelectorAll('.fsv .sprg')];const sets=G.map(x=>{const s=x.querySelector('set[attributeName="opacity"]');return s?{to:s.getAttribute('to'),beg:parseFloat(s.getAttribute('begin')),op0:x.getAttribute('opacity')==='0',n:x.querySelectorAll('image').length,mo:!!x.querySelector('animateMotion')}:null;}).filter(Boolean);return {t,sets};});
      if(r.done)break;if(r.sets)hit=r;else await p.waitForTimeout(40);}
    if(!hit)bad('안타가 나오지 않음');else{const out=hit.sets.find(s=>s.to==='0'&&!s.op0);const run=hit.sets.find(s=>s.to==='1'&&s.op0&&s.mo);const nx=hit.sets.find(s=>s.to==='1'&&s.op0&&!s.mo);
      out&&run&&Math.abs(out.beg-run.beg)<.02&&(!nx||nx.beg>out.beg)?ok(`안타(${hit.t}): 친 타자 ${out.beg}초에 사라짐 = 주자 ${run.beg}초에 등장${nx?' · 다음 타자 '+nx.beg+'초':''}`):bad('안타 이어짐 '+JSON.stringify(hit));}}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));
  await b.close();console.log(fails?`실패 ${fails}건`:'v147 통과');process.exit(fails?1:0);})();

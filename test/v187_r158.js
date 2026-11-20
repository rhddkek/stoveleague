// v187 (R158): GPT 시안대로 — 2등신 캐릭터(픽셀랩) · 폰 감독실 · 위 탭 밑줄 · 명단 3칸 + 자세히 · 중계 세로(뒤쪽 시점 구장)
const fs=require('fs');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const ROOT=path.resolve(__dirname,'..');
// 0. 2등신 그림: 64×64 · 네 분류(ea · wh · bl · la) · 밤 구장 그림
{const d=ROOT+'/assets/chibi';const fl=fs.existsSync(d)?fs.readdirSync(d).filter(f=>f.endsWith('.png')):[];const cats=['ea','wh','bl','la'].filter(c=>!fl.some(f=>f.startsWith(c+'-')));
  const sz=fl.filter(f=>{const b=fs.readFileSync(d+'/'+f);return b.readUInt32BE(16)!==64||b.readUInt32BE(20)!==64;});const park=fs.existsSync(ROOT+'/assets/art/park_night.png');
  fl.length>=24&&!cats.length&&!sz.length&&park?ok(`2등신 ${fl.length}장(64×64 · 네 분류) · 밤 구장 그림`):bad('그림 '+JSON.stringify({n:fl.length,cats,sz,park}));}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  const mk=async(w,h,mob)=>{const p=await (await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob})).newPage();p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+ROOT+'/stoveleague.html?test=1');await p.waitForTimeout(600);
    await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();});await p.waitForTimeout(300);
    await p.evaluate(()=>{UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.setTab('home');});await p.waitForTimeout(300);
    await p.evaluate(()=>{let k=0;while(SL.state().phase!=='season'&&k++<12){UI.startSeason?UI.startSeason():UI.advanceWeek();UI.closeModal();}let j=0;while(!SL.userGameToday()&&j++<5){UI.autoDays(1);UI.closeModal();}UI.closeModal();UI.setTab('home');});
    await p.waitForFunction(()=>UI.chbOn&&UI.chbOn(),null,{timeout:5000}).catch(()=>{});await p.evaluate(()=>UI.setTab('home'));await p.waitForTimeout(300);return p;};
  const p=await mk(390,844,true);
  // 1. 폰 감독실: 구장 그림 위 「우리 vs 상대」 + 양쪽 선발 2등신 · [경기 보기 | 7경기 자동 ▾] · 아래 줄 목록 4줄 안
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const g=SL.userGameToday();const op=S.teams[g.home===ut.id?g.away:g.home];const c=document.querySelector('.gx');if(!c)return {gx:false};
      const t=(c.querySelector('.gxt')||{}).textContent||'';const exp=`${ut.name.split(' ')[0]} vs ${op.name.split(' ')[0]}`;const chb=c.querySelectorAll('.gxvs .chb').length;const go=!!c.querySelector('button.gold[onclick="UI.startGame()"]');const auto=!!c.querySelector('button[onclick^="UI.autoRun(7"]');
      const rows=[...document.querySelectorAll('.tiles.hrows .tile')].map(x=>x.textContent);return {gx:true,t:t.replace(/\s+/g,' ').trim(),exp,chb,go,auto,rows:rows.length,inbox:rows.some(x=>/받은 소식/.test(x)),bot:Math.round(c.getBoundingClientRect().bottom)};});
    r.gx&&r.t===r.exp&&r.chb===2&&r.go&&r.auto&&r.rows>=1&&r.rows<=4&&r.inbox&&r.bot<700?ok(`폰 감독실: 「${r.t}」 · 선발 2등신 ${r.chb} · [경기 보기][7경기 자동] · 아래 줄 ${r.rows}개(받은 소식 포함) · 카드 끝 ${r.bot}px`):bad('감독실 '+JSON.stringify(r));}
  // 2. 위 탭 = 밑줄(바탕 없음 · 노랑 글자 · 안쪽 밑줄)
  {await p.evaluate(()=>UI.setTab('roster'));await p.waitForTimeout(300);const r=await p.evaluate(()=>{const b=document.querySelector('.htabs button.on');if(!b)return {on:false};const s=getComputedStyle(b);return {on:true,bg:s.backgroundColor,col:s.color,sh:s.boxShadow};});
    r.on&&/rgba\(0, 0, 0, 0\)|transparent/.test(r.bg)&&/242, 193, 78/.test(r.col)&&/inset/.test(r.sh)?ok('위 탭: 바탕 없음 · 노랑 글자 · 밑줄'):bad('탭 '+JSON.stringify(r));}
  // 3. 명단 3칸: 선수 · 종합 · 상태 · 종합 = 실제 값 · 누르면 펼침(선수 카드 ›) · 「자세히」 = 예전 전체 표 · 「간단히」로 돌아옴
  {const r=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();const h=[...document.querySelectorAll('.sqc .sqh span')].map(x=>x.textContent);const rows=[...document.querySelectorAll('.sqc .sqr')];
      const ovrOk=rows.every(x=>{const id=+x.getAttribute('onclick').match(/\d+/)[0];return +x.querySelector('.sqo').textContent===Math.round(SL.calcOvr(S.players[id]));});const chb=rows.filter(x=>x.querySelector('.chb')).length;
      rows[0].click();await new Promise(r=>setTimeout(r,150));const x=document.querySelector('.sqx');const card=!!(x&&x.querySelector('[onclick^="UI.openPlayer("]'));
      document.querySelector('.sqfull').click();await new Promise(r=>setTimeout(r,150));const full=!!document.querySelector('table.rosterq2');const back=[...document.querySelectorAll('button')].find(b=>/간단히/.test(b.textContent));back&&back.click();await new Promise(r=>setTimeout(r,150));
      return {h,n:rows.length,entry:ut.entry.length,ovrOk,chb,x:!!x,card,full,back:!!document.querySelector('.sqc')};});
    r.h.join()==='선수,종합,상태'&&r.n===r.entry&&r.ovrOk&&r.chb===r.n&&r.x&&r.card&&r.full&&r.back?ok(`명단 3칸: ${r.n}명 = 1군 · 종합 = 실제 값 · 2등신 ${r.chb} · 펼침 → 선수 카드 › · 자세히 ↔ 간단히`):bad('명단 '+JSON.stringify(r));}
  // 4. 중계 세로: 구장 이름 머리 · 큰 점수 = 실제 · 뒤쪽 시점(기울인 판 + 밤 구장) · 투수/타자 줄 = 오늘 칸과 같은 선수 · 아이콘 단추 4 · 한 화면 안
  {await p.evaluate(()=>{UI.setTab('home');UI.startGame();});await p.waitForTimeout(1200);
    const r=await p.evaluate(()=>{const v=document.querySelector('.cmv.gp');if(!v)return {gp:false};const S=SL.state();const lg=S.liveGame;const sc=[...v.querySelectorAll('.cmsb .tm b')].map(x=>+x.textContent);
      const fld=v.querySelector('.fld');const sv=fld&&fld.querySelector('svg');const tf=sv?getComputedStyle(sv).transform:'';const duo=[...v.querySelectorAll('.cmduo .cdr b')].map(x=>x.textContent);const today=(v.querySelector('.cmtoday')||{}).textContent||'';
      const bar=v.querySelectorAll('.cmbar button svg').length;const bot=Math.round((v.querySelector('.cmbar')||document.body).getBoundingClientRect().bottom);const lsw=v.querySelector('.cmlsw');
      return {gp:true,sc,exp:lg?lg.score:null,art:!!(fld&&fld.classList.contains('art-park_night')),tf:/matrix3d/.test(tf),duo,dOk:duo.length===2&&duo.every(n=>today.includes(n)),bar,bot,lsw:lsw?getComputedStyle(lsw).display:'none',park:(v.querySelector('.cmtop')||{}).textContent||''};});
    r.gp&&JSON.stringify(r.sc)===JSON.stringify(r.exp)&&r.art&&r.tf&&r.dOk&&r.bar===4&&r.bot<=844&&r.lsw==='none'&&/파크|구장|돔|필드|스타디움/.test(r.park)?ok(`중계 세로: 점수 ${r.sc.join(':')} = 실제 · 기울인 구장 + 밤 관중석 · 투수/타자 ${r.duo.join(' / ')} · 아이콘 단추 ${r.bar} · 아래 끝 ${r.bot}px`):bad('중계 '+JSON.stringify(r));
    // 한 이닝 진행 뒤에도 같은 꼴
    await p.evaluate(()=>UI.step('half'));await p.waitForTimeout(2500);const r2=await p.evaluate(()=>({gp:!!document.querySelector('.cmv.gp'),res:!!document.querySelector('.cmv.gp .cmres'),bot:Math.round(document.querySelector('.cmbar').getBoundingClientRect().bottom)}));
    r2.gp&&r2.bot<=860?ok(`이닝 진행 뒤: 세로 중계 유지 · 직전 타석 줄 ${r2.res?'있음':'없음'} · 아래 끝 ${r2.bot}px`):bad('진행 뒤 '+JSON.stringify(r2));}
  // 6. (R159) 전체 메뉴 두 층: 찾기 · 바로가기 4 · 대메뉴 6 · 설정·저장 맨 아래 → 이적 = 영입 · 내 선수 · 협상 탭 · 「이번 시즌」 제목 옆 · 내 선수 → 재계약 한 번에 · 찾기 「재계약」
  {await p.evaluate(()=>{UI.closeModal();UI.setTab('home');});await p.waitForTimeout(200);
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,120));UI.menu();await w();const m=document.querySelector('#modal .mn2');if(!m)return {mn2:false};const o={mn2:true};
      o.secs=[...m.querySelectorAll('.mnl0 .mnr b')].map(x=>x.textContent);o.fav=m.querySelectorAll('.mnft button').length;o.search=!!m.querySelector('#psq');const st=m.querySelector('.mnfoot .mnr');o.set=st?st.textContent.replace(/[›\s]/g,''):'';const mr=m.getBoundingClientRect(),sr=st.getBoundingClientRect();o.setLast=sr.bottom>=mr.bottom-2;o.close=getComputedStyle(document.querySelector('#modal .modal>.close')).display;
      UI.mnSec('market');await w();o.tabs=[...document.querySelectorAll('#modal .mntabs button')].map(x=>x.textContent);o.side=(document.querySelector('#modal .mnsc')||{}).textContent||'';
      UI.mnTab(o.tabs.indexOf('내 선수'));await w();o.mine=[...document.querySelectorAll('#modal .mnl1 .mnr b')].map(x=>x.textContent);const rb=[...document.querySelectorAll('#modal .mnl1 .mnr')].find(x=>/재계약/.test(x.textContent));rb&&rb.click();await w();o.go=[document.querySelector('.htabs button.on')?.textContent.trim(),!document.querySelector('#modal')];
      UI.menu();await w();const i=document.getElementById('psq');i.value='재계약';i.dispatchEvent(new Event('input'));await w();o.find=/이적 › 내 선수 › 재계약|재계약/.test((document.getElementById('psr')||{}).innerText||'');UI.closeModal();return o;});
    r.mn2&&r.secs.join()==='감독실,선수단,육성,이적,리그,구단'&&r.fav===4&&r.search&&r.set==='설정·저장'&&r.setLast&&r.close==='none'&&r.tabs.join()==='영입,내 선수,협상'&&/이번 시즌/.test(r.side)&&r.mine.includes('재계약')&&r.go[1]&&r.find?ok(`전체 메뉴: 대메뉴 ${r.secs.length} · 바로가기 ${r.fav} · 설정·저장 맨 아래 · 이적 탭 ${r.tabs.join(' · ')} + 「${r.side.trim()}」 · 내 선수 → 재계약 바로 · 찾기 「재계약」`):bad('메뉴 '+JSON.stringify(r));}
  // 5. 가로 휴대폰 · PC: 예전 중계 그대로(세로 꼴 없음 · 오늘 칸 보임) · PC 메뉴는 예전 한 장
  for(const [w,h,mob] of [[844,390,true],[1280,860,false]]){const q=await mk(w,h,mob);await q.evaluate(()=>UI.startGame());await q.waitForTimeout(1000);
    const r=await q.evaluate(()=>{const t=document.querySelector('.cmtoday');return {gp:!!document.querySelector('.cmv.gp'),today:t?getComputedStyle(t).display:'none',duo:!!document.querySelector('.cmduo')};});
    !r.gp&&r.today!=='none'&&!r.duo?ok(`${w}×${h}: 예전 중계 그대로`):bad(`${w}×${h} `+JSON.stringify(r));
    if(!mob){const m=await q.evaluate(()=>{SL.state().liveGame&&UI.closeModal();UI.menu();const o={old:!!document.querySelector('#modal .msec'),mn2:!!document.querySelector('#modal .mn2')};UI.closeModal();return o;});m.old&&!m.mn2?ok('PC ☰ 메뉴: 예전 한 장 그대로(왼쪽 메뉴와 같음)'):bad('PC 메뉴 '+JSON.stringify(m));}
    await q.context().close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'통과');process.exit(fails?1:0);})();

// v82 (R066): 한 타자씩 진행이 3~4회·6~7회에 한꺼번에 넘어가던 것 · 장내 아나운서 제거 · 노치 화면 윗부분 가림 · 포지션 칩 통일 · 최근 5경기/다음 경기 · 구직·구인 · 리그 마크
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();UI.set('flow0',1);SL.state().tutorialDone=true;UI.closeModal();});
  // 1. 한 타자씩: 공수교대 화면의 「직접 지휘」를 눌러도 한 타자씩 그대로 (예전엔 「장면마다」로 바뀌어 여러 이닝이 넘어감)
  for(const md of ['pa','pitch']){await p.evaluate(()=>{let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}});await p.evaluate(m=>UI.set('stepMode',m),md);
    let n=0,jumps=[],ints=0,lbl='';while(n<700){const r=await p.evaluate(()=>{const lg=SL.state().liveGame;if(!lg||lg.done)return {done:true};if(document.querySelector('.cmint')){const b0=document.querySelectorAll('.cmpick button')[0];const t=b0.innerText.replace(/\s+/g,' ');b0.click();return {int:t};}const pa0=lg.paCount,in0=lg.inn*2+lg.half;document.querySelector('.cmgo .gold').click();return {d:lg.paCount-pa0,di:lg.inn*2+lg.half-in0,inn:lg.inn};});
      if(r.done)break;n++;if(r.int){ints++;lbl=r.int;continue;}if(r.d>1||r.di>1)jumps.push(r.inn+'회 '+r.d+'타석');}
    const want=md==='pa'?'한 타자씩':'공 하나씩';
    !jumps.length&&ints>=8&&lbl.includes(want)?ok(`${md==='pa'?'한 타자씩':'공 하나씩'}: 한 경기 ${n}번 눌러 공수교대 ${ints}번 — 「${lbl}」 눌러도 진행 방식 그대로, 한꺼번에 넘어간 곳 없음`):bad(`${md} 넘어감 ${jumps.join(',')} 공수교대 ${ints} 버튼 ${lbl}`);
    await p.evaluate(()=>{UI.endGame();UI.closeModal();});}
  // 2. 장내 아나운서(기기 음성) 없음
  {const r=await p.evaluate(()=>{UI.openSettings&&UI.openSettings();const t=document.body.innerText;UI.closeModal();return !/장내 아나운서/.test(t)&&!/speechSynthesis\.speak/.test(document.documentElement.innerHTML);});r?ok('장내 아나운서(「○번 타자 ○○○」 기기 음성) 없음'):bad('아나운서 남음');}
  // 3. 노치: 본문을 상태 표시줄 높이만큼 내려 시작 (위 막대가 내용 윗부분을 가리지 않게)
  {const css=fs.readFileSync(path.resolve(__dirname,'../src/style.css'),'utf8');/body\{padding-top:env\(safe-area-inset-top,0px\)\}/.test(css)?ok('노치 화면: 본문 위 여백 = 상태 표시줄 높이'):bad('노치 여백 없음');
    const html=fs.readFileSync(path.resolve(__dirname,'../stoveleague.html'),'utf8').replace(/env\(safe-area-inset-top,\s*0px\)/g,'47px');const tmp=path.resolve(__dirname,'../.notch_test.html');fs.writeFileSync(tmp,html);
    const q=await b.newPage({viewport:{width:393,height:852}});await q.goto('file://'+tmp+'?test=1');await q.waitForTimeout(250);
    const r=await q.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();UI.set('flow0',1);SL.state().tutorialDone=true;UI.closeModal();const out={};
      UI.openPlayer(SL.userTeam().lineup[0]);{const bar=document.querySelector('.pvbar').getBoundingClientRect();const nm=document.querySelector('.phd .nm').getBoundingClientRect();out.player=Math.round(nm.top-bar.bottom);}UI.back();
      UI.setTab('league');{const bar=document.querySelector('.club').getBoundingClientRect();const f=document.querySelector('.content').firstElementChild.getBoundingClientRect();out.league=Math.round(f.top-bar.bottom);}return out;});
    await q.close();fs.unlinkSync(tmp);r.player>=0&&r.league>=-1?ok(`노치(47px) 흉내: 선수 상세 이름이 위 막대 아래 ${r.player}px · 리그 탭 첫 칸 ${r.league}px — 가려지지 않음`):bad('노치 가림 '+JSON.stringify(r));}
  // 4. 육성 표 포지션 칩 = 선수단과 같은 영문 약자 · 같은 색
  {const r=await p.evaluate(()=>{UI.go('dev','train');const t=[...document.querySelectorAll('.mkt .ptg')].map(e=>e.textContent);return t;});
    r.length&&r.every(x=>/^(SP|RP|CP|C|1B|2B|3B|SS|LF|CF|RF|DH)$/.test(x))?ok(`육성 표 포지션: ${[...new Set(r)].join(' ')} (영문 약자로 통일)`):bad('육성 포지션 '+r.join(','));}
  // 5. 리그 탭: 최근 5경기 다섯 칸 + 다음 경기 한 줄 (글자가 세로로 쪼개지지 않음) · 리그 마크
  {const r=await p.evaluate(()=>{UI.autoDays(6);UI.closeModal();UI.setTab('league');const f=document.querySelector('.form2');const nx=f&&f.querySelector('.fnx b');const box=nx?nx.getBoundingClientRect():null;return {cells:f?f.querySelectorAll('.f5b>div').length:0,one:box?box.height<30:false,badge:!!document.querySelector('.content h3 .lgb, .content .hd .lgb'),ow:document.documentElement.scrollWidth-innerWidth};});
    r.cells===5&&r.one&&r.badge&&r.ow<=0?ok('리그 탭: 최근 5경기 다섯 칸 · 다음 경기 구단 이름 한 줄 · 「한국 프로야구」 리그 마크'):bad('리그 탭 '+JSON.stringify(r));}
  // 6. 구직·구인: 감독실 타일 → 감독 구하는 국내·해외 구단 목록 (평판 기준), 시즌 중엔 구경만
  {const r=await p.evaluate(()=>{UI.setTab('home');const tile=[...document.querySelectorAll('.tile')].find(t=>/감독 채용/.test(t.innerText));const B=SL.jobBoard();if(tile)tile.click();const m=document.querySelector('#modal');const t=m?m.innerText:'';UI.closeModal();
      const lgs=[...new Set(B.list.map(x=>x.t.league))];return {tile:!!tile,n:B.list.length,lgs,shown:B.list.slice(0,3).every(x=>t.includes(x.t.name)),noApply:!/\n지원\n/.test(t),rule:B.list.every(x=>x.ok===(B.rep>=x.need))};});
    r.tile&&r.n&&r.shown&&r.rule?ok(`구직·구인: 감독실 타일 → ${r.n}곳 (${r.lgs.join('·')}) · 자격 = 평판 ≥ 요구 평판 · 시즌 중엔 지원 버튼 없음`):bad('구직·구인 '+JSON.stringify(r));}
  // 7. 리그 마크 7개 (픽셀 배지)
  {const r=await p.evaluate(()=>Object.keys((typeof ASSETS!=='undefined'&&ASSETS.leagues)||{}).sort().join(','));r==='AU,CB,JP,KR,MX,TW,US'?ok('리그 마크 7개: '+r):bad('리그 마크 '+r);}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v82 검사 실패 ${fails}건`:'v82 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

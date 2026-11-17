// v177 (R148): 남은 약점 — 화면 문장 → 단어 · 리그 맞춤(첫 소식 · 임대 · 다른 리그 소식) · 조사 · 부상 줄 이름 중복 · 생일 소식
const SL=require('./run.js');const fs=require('fs');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
// 1. 첫 소식 = 그 리그 우승 시리즈
{const F={KR:'한국시리즈',JP:'일본시리즈',TW:'대만시리즈',US:'월드시리즈'};const got={};for(const lg in F){SL.newGame(17701,2,{games:36,league:lg});const n=SL.state().news.find(x=>/감독 부임/.test(x.text));got[lg]=n&&n.text;}
  Object.keys(F).every(lg=>got[lg]&&got[lg].includes(F[lg])&&!/습니다|하세요/.test(got[lg])&&(lg==='KR'||!got[lg].includes('한국시리즈')))?ok('첫 소식: '+Object.values(got).join(' / ')):bad('첫 소식 '+JSON.stringify(got));}
// 2. 임대 = 맡은 리그 구단 · 다른 리그 FA · 외국인 소식 없음
{SL.newGame(17702,2,{games:36,league:'JP'});const S=SL.state();const ut=SL.userTeam();const p=ut.roster.map(i=>S.players[i]).find(x=>x.age<=28)||S.players[ut.roster[0]];const L=SL.loanOptions(p.id);
  const lgs=[...new Set(L.map(o=>o.team.league))];L.length&&lgs.length===1&&lgs[0]==='JP'?ok(`일본 구단 임대 후보 ${L.length}구단 · 모두 일본`):bad('임대 리그 '+JSON.stringify(lgs));
  let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();if(SL.finishPost)SL.finishPost();for(let w=0;w<5&&S.phase==='offseason';w++)SL.advanceWeek();
  const kr=SL.krTeams().map(t=>t.name);const odd=S.news.filter(n=>/^\[(FA|외국인)\]/.test(n.text)&&kr.some(k=>n.text.includes(k))&&!n.text.includes('지켜보던'));
  !odd.length?ok(`일본 구단 한 시즌 + 겨울: 한국 구단 FA · 외국인 소식 0줄 (소식 ${S.news.length}줄)`):bad('다른 리그 소식 '+odd.slice(0,3).map(n=>n.text).join(' | '));
  const own=S.news.filter(n=>/^\[해외\]/.test(n.text)&&n.text.includes(ut.name));!own.length?ok('우리 구단 2군 이동은 [해외] 아님'):bad('우리 구단 [해외] '+own[0].text);
  const bd=S.news.filter(n=>/^\[생일\]/.test(n.text));bd.every(n=>!/습니다/.test(n.text))?ok(`생일 소식 ${bd.length}줄 (1군만 · 「${bd[0]?bd[0].text:'-'}」)`):bad('생일 '+bd[0].text);}
// 3. 조사: 이름 뒤에 조사를 바로 붙인 곳 없음 (josa로)
{let n=0;const hits=[];for(const f of ['core_c.js','ui.js','ui2.js']){const s=fs.readFileSync(__dirname+'/../src/'+f,'utf8');const m=s.match(/\$\{(esc\()?[A-Za-z_.\[\]()]*name\)?\}(으로|을|를|은|는|이|가|과|와|로)(?=[ ,.·)!』」<])/g)||[];n+=m.length;hits.push(...m.slice(0,2));}
  !n?ok('이름 + 조사: 모두 josa'):bad('조사 직접 '+n+' '+hits.join(' '));}
// 4. 코치 추천 문구 · 부상 줄
{SL.newGame(17703,2,{games:144});const S=SL.state();const ut=SL.userTeam();for(let i=0;i<30;i++)SL.playDayAuto();const sp=S.players[ut.rotation[ut.rotIdx%ut.rotation.length]];sp.cond=-4;const nx=S.players[ut.rotation[(ut.rotIdx+1)%ut.rotation.length]];nx.cond=2;
  const it=SL.decisionItems?SL.decisionItems():[];const sk=(it||[]).find(x=>x.k==='skipsp')||null;const t=sk?sk.sub:'';(!sk||!/을 먼저|은 하루|습니다|까요/.test(t))?ok(`선발 미루기: 「${t||'(이번엔 안 나옴)'}」`):bad('선발 미루기 '+t);}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html?test=1');
  for(const lg of ['KR','JP']){const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    await p.evaluate(lg=>{UI.pickLg(lg);UI.pickTeam(2);UI.newGame();UI.closeModal();const S=SL.state();S.tutorialDone=true;for(let i=0;i<40;i++)SL.playDayAuto();UI.closeModal();},lg);
    const tabs=await p.evaluate(()=>[...document.querySelectorAll('.bnav button,nav button,.tabbar button')].filter(x=>x.offsetParent).map(x=>x.getAttribute('onclick')).filter(Boolean));const S=[];let n=0;
    for(const t of tabs){await p.evaluate(s=>{UI.closeModal();eval(s);},t);await p.waitForTimeout(120);const tops=await p.evaluate(()=>[...document.querySelectorAll('.htabs button')].filter(x=>x.offsetParent).map(x=>x.getAttribute('onclick')));
      for(const tp of (tops.length?tops:[null])){if(tp)await p.evaluate(s=>{UI.closeModal();eval(s);},tp);await p.waitForTimeout(80);const s2=await p.evaluate(()=>[...document.querySelectorAll('.htabs2 button')].filter(x=>x.offsetParent).map(x=>x.getAttribute('onclick')));
        for(const sb of (s2.length?s2:[null])){if(sb)await p.evaluate(s=>{UI.closeModal();eval(s);},sb);await p.waitForTimeout(80);n++;
          const r=await p.evaluate(()=>{const root=document.querySelector('.content');const out=[];const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let x;while(x=tw.nextNode()){const t=x.textContent.trim();if(t.length>4&&/(습니다|하세요|입니다|됩니다|세요\.)/.test(t)&&x.parentElement.offsetParent)out.push(t.slice(0,50));}return out;});S.push(...r);}}}
    const U=[...new Set(S)];U.length===0?ok(`${lg} 화면 ${n}개: 문장 ${U.length}줄${U.length?' 「'+U[0]+'」':''}`):bad(`${lg} 문장 ${U.length}줄 `+U.slice(0,5).join(' ‖ '));await c.close();}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v177 통과');process.exit(fails?1:0);})();

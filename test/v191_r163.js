// v191 (R163): GPT 플레이 후기 — 해외 선수 「자리 관리」 연결(닫으면 고른 후보 · 포지션 · 정렬 그대로) · 고르기 3개 한 줄 · 명단 펼침 기용/훈련 · 겨울 감독실 마감 줄/맡긴 일
const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const ROOT=path.resolve(__dirname,'..');
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+ROOT+'/stoveleague.html?test=1');await p.waitForTimeout(600);
  await p.evaluate(()=>{UI.pickLg('TW');UI.pickTeam(2);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();});await p.waitForTimeout(300);
  const w=()=>new Promise(r=>setTimeout(r,150));
  // 1. 해외 선수(대만 구단): 쿼터 = 대만 규정(외국인 n/4) + 「자리 관리 ›」 · 고르기 3개 한 줄 · 자리 관리를 닫아도 고른 후보 · 포지션 · 정렬 그대로 · 자리가 차도 관찰 단추
  {const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const S=SL.state();const ut=SL.userTeam();UI.go('market','fgn');await w();const o={};
      const chip=document.querySelector('.fgseat');o.chip=chip?chip.textContent.replace(/\s+/g,' ').trim():'';const n=ut.roster.concat(ut.dev||[]).filter(id=>SL.isFgnIn(S.players[id],'TW')).length;o.n=n;
      const sels=[...document.querySelectorAll('.fg3 select')];o.sels=sels.map(x=>x.getAttribute('aria-label'));o.row=new Set(sels.map(x=>Math.round(x.getBoundingClientRect().top))).size;o.chips=document.querySelectorAll('.stvsort.fgv').length;
      const ps=document.querySelector('.fg3 select[aria-label="포지션"]');ps.value='SP|P';ps.dispatchEvent(new Event('change'));await w();const so=document.querySelector('.fg3 select[aria-label="정렬"]');so.value='young';so.dispatchEvent(new Event('change'));await w();
      const cards=[...document.querySelectorAll('.fgcd')];cards[2].click();await w();const pick=+document.querySelector('.fgcd.on').dataset.pid;
      document.querySelector('.fgseat').click();await w();o.modal=!!document.querySelector('#modal .fgsl');o.rows=document.querySelectorAll('#modal .fgsr').length;o.card=!!document.querySelector('#modal .fgsr [onclick^="UI.openPlayer("]');
      [...document.querySelectorAll('#modal button')].find(x=>/후보로 돌아가기/.test(x.textContent)).click();await w();
      o.keep=[+((document.querySelector('.fgcd.on')||{dataset:{}}).dataset.pid)===pick,document.querySelector('.fg3 select[aria-label="포지션"]').value,document.querySelector('.fg3 select[aria-label="정렬"]').value];
      o.sp=[...document.querySelectorAll('.fgcd .a small')].every(x=>/SP/.test(x.textContent));o.scout=!![...document.querySelectorAll('.fgsel button')].find(x=>/관찰/.test(x.textContent));return o;});
    r.chip===`외국인 ${r.n}/4 · 자리 관리 ›`&&r.sels.join()==='보기,포지션,정렬'&&r.row===1&&r.chips===0&&r.modal&&r.rows===r.n&&(r.card||r.n===0)&&r.keep[0]&&r.keep[1]==='SP|P'&&r.keep[2]==='young'&&r.sp&&r.scout?ok(`해외 선수: 「${r.chip}」 · 고르기 3개 한 줄 · 자리 관리 ${r.rows}명 → 닫아도 후보 · 선발 · 나이순 그대로 · 관찰 단추`):bad('해외 선수 '+JSON.stringify(r));}
  // 2. 명단 펼침: 「주 포지션 · 지금 기용」 = 실제 라인업 · [기용 변경] · 훈련 고르기 = 실제 반영 · 선수 카드 ›
  {const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const S=SL.state();const ut=SL.userTeam();UI.go('roster','list');await w();const id=ut.lineup[3];const row=[...document.querySelectorAll('.sqr')].find(x=>x.getAttribute('onclick').includes('('+id+')'));row.click();await w();
      const x=document.querySelector('.sqx');const o={t:x.querySelector('.sqxi span').textContent.replace(/\s+/g,' ').trim(),exp:`주 포지션 ${S.players[id].pos} · 선발 ${ut.pos[id]} · 4번`,use:!!x.querySelector('.sqxb1'),card:!!x.querySelector('.sqxg')};
      const sel=x.querySelector('.sqxt select');const v=[...sel.options].map(q=>q.value).find(q=>q!==S.players[id].focus);sel.value=v;sel.dispatchEvent(new Event('change'));await w();o.focus=S.players[id].focus===v;o.open=!!document.querySelector('.sqx');
      document.querySelector('.sqx .sqxb1').click();await w();o.go=(document.querySelector('.htabs button.on')||{}).textContent;return o;});
    r.t.endsWith(r.exp)&&r.use&&r.card&&r.focus&&/타순/.test(r.go||'')?ok(`명단 펼침: 「${r.exp}」 · 훈련 고르기 반영 · [기용 변경] → 타순`):bad('명단 '+JSON.stringify(r));}
  // 3. 겨울 감독실: 마감 있는 내 일 = 맨 위 + 노란 줄 · 맡긴 일 = 「자동 ○○ 예정」(단추 없음, 아래) · 선택 업무 맨 끝
  {await p.evaluate(()=>{const S=SL.state();let k=0;while(S.phase!=='season'&&k++<12){UI.startSeason?UI.startSeason():UI.advanceWeek();UI.closeModal();}let n=0;while(SL.state().phase==='season'&&n++<500){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...SL.state().market.offers])SL.respondOffer(o.id,'reject');}UI.closeModal();});
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const S=SL.state();const ut=SL.userTeam();S.auto={};for(const k of Object.keys(SL.AUTO_KEYS||{}))S.auto[k]=true;
      if(!S.pendingFA.length){const q=ut.roster.map(id=>S.players[id]).find(q=>q&&q.contract);S.pendingFA.push(q.id);}UI.closeModal();UI.setTab('home');await w();
      const rows=[...document.querySelectorAll('.wtd .wrow')];const kind=x=>x.classList.contains('wmr')?'M':x.classList.contains('wauto')?'A':/선택 업무/.test(x.textContent)?'L':'N';const seq=rows.map(kind).join('');
      const m=rows.find(x=>x.classList.contains('wmr'));const a=rows.filter(x=>x.classList.contains('wauto'));
      return {seq,m:m?m.textContent.replace(/\s+/g,' ').trim():'',mb:m?getComputedStyle(m).borderTopColor:'',au:a.map(x=>(x.querySelector('.wau')||{}).textContent),ab:a.some(x=>x.querySelector('button'))};});
    /^M+N*A+L?$/.test(r.seq)&&/재계약/.test(r.m)&&/242, 193, 78/.test(r.mb)&&r.au.length&&r.au.every(t=>/^(평가 \d+ 미만 · )?자동 .+ 예정$/.test(t))&&!r.ab?ok(`겨울 감독실: 줄 순서 ${r.seq}(마감 → 그 밖 → 맡긴 일 → 선택) · 「${r.m.slice(0,24)}」 노란 줄 · 맡긴 일 「${r.au[0]}」`):bad('겨울 감독실 '+JSON.stringify(r));}
  // 4. PC: 해외 선수는 예전 칩 줄 그대로
  {const q=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto('file://'+ROOT+'/stoveleague.html?test=1');await q.waitForTimeout(500);
    const r=await q.evaluate(async()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.go('market','fgn');await new Promise(r=>setTimeout(r,200));return {chips:document.querySelectorAll('.stvsort.fgv button').length,fg3:!!document.querySelector('.fg3')};});
    r.chips===5&&!r.fg3?ok('PC: 해외 선수 보기 칩 5개 그대로'):bad('PC '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v191 검사 통과');process.exit(fails?1:0);})();

// v99 (R083 묶음 1): 한눈에 — 앞으로 2주 띠 · 경기 전 준비 · 스쿼드 플래너 · 수신함 할 일·새 소식 · 찾기(화면·용어) · 자주 가는 화면
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:144,league:'KR'});SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(10);UI.closeModal();UI.clearResult&&UI.clearResult();});
  // 1. 앞으로 2주: 칸마다 실제 일정(상대·홈/원정) · 트레이드 마감 같은 큰 날 · 감독실에 띠
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const K=SL.keyDays(14);let bad=0;for(const x of K){const g=S.schedule.find(g=>g.day===x.d&&(g.home===ut.id||g.away===ut.id));if(!!g!==(x.opp!=null))bad++;if(g&&((g.home===ut.id?g.away:g.home)!==x.opp||(g.home===ut.id)!==x.home))bad++;}
      const S2=S.day;S.day=SL.tradeDeadline()-3;const K2=SL.keyDays(14);const dl=K2.find(x=>x.big.includes('트레이드 마감'));S.day=S2;UI.setTab('home');const g=SL.userGameToday()||S.schedule.find(x=>x.day>=S.day&&(x.home===ut.id||x.away===ut.id));UI.prematch(S.schedule.indexOf(g));const cells=document.querySelectorAll('#modal .dstrip .dcell').length;UI.closeModal();return {n:K.length,bad,dl:dl&&dl.d===SL.tradeDeadline(),cells};});
    r.n===14&&!r.bad&&r.dl&&r.cells===14?ok(`앞으로 2주 ${r.n}칸: 상대·홈/원정이 일정과 같음 · 트레이드 마감일 표시 · 폰은 경기 전 준비 창 맨 위에 띠`):bad('2주 '+JSON.stringify(r));}
  // 2. 경기 전 준비: 팀 지표 = 선수 기록 합 · 맞대결 = 일정 결과 · 오늘 상대 선발 = 실제 경기에 나온 선발
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();let k=0;while(!SL.userGameToday()&&k++<5){UI.autoDays(1);UI.closeModal();}const g=SL.userGameToday();const gi=S.schedule.indexOf(g);const M=SL.preMatch(gi);const opp=S.teams[M.op.id];
      let ab=0,h=0;for(const id of opp.roster){const q=S.players[id];ab+=q.cur.ab||0;h+=q.cur.h||0;}const avgOk=Math.abs(M.op.agg.avg-(ab?h/ab:0))<1e-9;
      const hh=S.schedule.filter(x=>x.res&&!x.post&&((x.home===ut.id&&x.away===opp.id)||(x.home===opp.id&&x.away===ut.id)));
      UI.setTab('home');const btn=[...document.querySelectorAll('.today button')].find(x=>/경기 전 준비/.test(x.textContent));if(btn)btn.click();const shown=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();
      UI.startGame();const lg=S.liveGame;const oppSide=lg.home===opp.id?1:0;const usedSp=lg.pitcher[oppSide];const usedMy=lg.pitcher[1-oppSide];UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();
      return {avgOk,h2h:M.h2h.g===hh.length,sp:M.op.sp&&M.op.sp.sure?M.op.sp.pid===usedSp:'na',mysp:M.me.sp&&M.me.sp.sure?M.me.sp.pid===usedMy:'na',btn:!!btn,shown:/경기 전 준비/.test(shown)&&/상대 경계 타자/.test(shown)};});
    r.avgOk&&r.h2h&&r.sp===true&&r.mysp===true&&r.btn&&r.shown?ok('경기 전 준비: 팀 타율 = 선수 기록 합 · 맞대결 = 일정 결과 · 오늘 양 팀 선발 = 실제로 나온 선발 · 오늘 경기 카드 단추로 열림'):bad('경기 전 준비 '+JSON.stringify(r));}
  // 3. 스쿼드 플래너: 올해 주전은 그 자리 최고 종합 · 계약 끝나는 해 표시 · 다음 해부터 계약 끝난 선수 빠짐 · 지명타자는 다른 자리 주전과 겹치지 않음
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const P=SL.squadPlan();const ps=ut.roster.concat(ut.dev).map(id=>S.players[id]);let bad=[];
      for(const row of P.rows){if(['DH','SP','RP'].includes(row.pos))continue;const best=ps.filter(q=>q.pos===row.pos).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];if(best&&row.ys[0].top[0]&&SL.calcOvr(S.players[row.ys[0].top[0].pid])<SL.calcOvr(best)-0.05)bad.push(row.pos);   /* 종합이 같은 선수끼리는 누가 와도 맞음 */}
      for(let y=1;y<3;y++)for(const row of P.rows)for(const t of row.ys[y].top){const q=S.players[t.pid];if(!(q.contract&&q.contract.years>y))bad.push('계약 '+q.name);}
      for(let y=0;y<3;y++){const st=new Set(P.rows.filter(r=>!['SP','RP','DH'].includes(r.pos)).flatMap(r=>r.ys[y].top.map(t=>t.pid)));const dh=P.rows.find(r=>r.pos==='DH').ys[y].top[0];if(dh&&st.has(dh.pid))bad.push('DH 겹침 '+y);}
      UI.go('roster','plan');const rows=document.querySelectorAll('table.plant tbody tr').length;const tab=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());return {bad,rows,tab};});
    !r.bad.length&&r.rows===11&&r.tab.includes('팀 운영')?ok(`스쿼드 플래너(선수단 → 팀 운영 → 스쿼드 플래너): ${r.rows}자리 × 올해·내년·2년 뒤 — 올해 주전 = 그 자리 최고 종합, 계약 끝난 해부터 빠짐, 지명타자 겹침 없음`):bad('플래너 '+JSON.stringify(r));}
  // 4. 수신함: 새 소식 수 = 지난번 연 뒤 생긴 소식 · 열면 감독실 「받은 소식」 사라짐 · 필터 칩(전체·할 일·새 소식…)
  {const r=await p.evaluate(()=>{const S=SL.state();UI.go('home','inbox');UI.go('home','main');const before=SL.unreadN();let kk=0;while(SL.unreadN()===0&&kk++<6){UI.autoDays(1);UI.closeModal();UI.clearResult&&UI.clearResult();}UI.setTab('home');const n=SL.unreadN();const tile=[...document.querySelectorAll('.tile')].find(x=>/받은 소식/.test(x.textContent));
      UI.go('home','inbox');const chips=[...document.querySelectorAll('.chiprow.inbf button')].map(x=>x.textContent.trim());const newChip=chips.find(x=>/^새 소식/.test(x));UI.inboxF('new');const rows=document.querySelectorAll('table.inbox tbody tr').length;UI.inboxF('all');UI.go('home','main');UI.setTab('home');const after=SL.unreadN();const tile2=[...document.querySelectorAll('.tile')].find(x=>/받은 소식/.test(x.textContent));
      return {before,n,tile:!!tile,newChip,rows,after,tile2:!!tile2};});
    r.before===0&&r.n>0&&r.tile&&r.newChip===`새 소식 ${r.n}`&&r.rows===Math.min(14,r.n)&&r.after===0&&!r.tile2?ok(`수신함: 며칠 사이 새 소식 ${r.n}건 → 감독실 「받은 소식 · 안 읽음 ${r.n}」 → 수신함 「새 소식 ${r.n}」 칩 → 열고 나오면 0`):bad('수신함 '+JSON.stringify(r));}
  // 5. 찾기: 화면 이름·용어도 찾음 · 용어집 · 자주 가는 화면 넣기/빼기
  {const r=await p.evaluate(()=>{const s1=UI.searchList('재정');const s2=UI.searchList('관찰도');UI.go('club','fin');UI.menu();const fav0=[...document.querySelectorAll('.mfav button')].map(x=>x.textContent.trim());UI.favToggle();const fav1=[...document.querySelectorAll('.mfav button')].map(x=>x.textContent.trim());UI.favToggle();UI.closeModal();UI.glossary();const g=document.querySelectorAll('#modal .gls').length;UI.closeModal();
      return {scr:/구단 › 재정/.test(s1),term:/관찰도/.test(s2),fav0:fav0.length,add:fav1.includes('재정'),g};});
    r.scr&&r.term&&r.add&&r.g>=20?ok(`찾기: 「재정」 → 화면 구단 › 재정 · 「지식」 → 용어 지식 % · 용어집 ${r.g}개 · 메뉴 「자주 가는 화면」에 지금 화면 넣기·빼기`):bad('찾기 '+JSON.stringify(r));}
  // 6. PC 폭: 앞으로 2주 띠가 타일로 접히지 않고 그대로
  {const q=await b.newPage({viewport:{width:1280,height:800}});await q.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await q.waitForTimeout(300);
    const r=await q.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:144,league:'KR'});SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(10);UI.closeModal();UI.setTab('home');const vis=[...document.querySelectorAll('.dstrip .dcell')].filter(e=>e.offsetParent).length;if(vis)return {vis};
      const t=[...document.querySelectorAll('.tile2')].find(x=>/2주 일정/.test(x.textContent));if(!t)return {vis:0,tile:false};const pv=t.innerText;t.click();const n=document.querySelectorAll('#modal .dstrip .dcell').length;UI.closeModal();return {vis:0,tile:true,pv,n};});await q.close();
    r.vis===14||(r.tile&&r.n===14&&/다음 /.test(r.pv))?ok(r.vis?'PC: 감독실 앞으로 2주 띠 14칸':`PC: 감독실이 한 화면을 넘어 「앞으로 2주」가 타일로 접힘(미리보기 「${r.pv.replace(/\s+/g,' ').slice(0,40)}」) → 누르면 14칸`):bad('PC 띠 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v99 검사 실패 ${fails}건`:'v99 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

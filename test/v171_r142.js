// v171 (R142): GPT 2시즌 후기 — 외국인 교체 계약(경쟁 입찰 FA)이 확정 뒤에 막히던 것 · 감독실 진단 · 알림 무게
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const play=S=>{let k=0;while(S.phase==='season'&&k++<500){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();}};
// 1. 외국인 정원이 찬 채로 경쟁 입찰 FA 외국인을 영입 — 교체 선수를 고르면 계약 + 방출이 한 번에
{let done=0,blocked=0,kept=0,tried=0;
 for(const seed of [1421,1422,1423,1424,1425,1426]){SL.newGame(seed,2,{games:36});const S=SL.state();play(S);let g=0;while(S.phase!=='offseason'&&g++<60)SL.advanceWeek?SL.playDayAuto():0;if(S.phase!=='offseason')continue;
  const ut=SL.userTeam();ut.cash=9e6;if(S.budget)S.budget=null;const M=S.faM&&S.faM.m||{};const ids=Object.keys(M).map(Number).filter(id=>{const p=S.players[id];return p&&p.teamId==null&&SL.isFgn(p);});if(!ids.length)continue;
  const pid=ids[0];const p=S.players[pid];const F=M[pid];const fl=()=>ut.roster.concat(ut.dev||[]).map(i=>S.players[i]).filter(x=>x&&SL.isFgn(x));
  const sal=Math.round(F.ask.sal*1.6/100)*100,yrs=F.ask.yrs;if(!SL.fgnBlock(ut,p,sal)){continue;}tried++;
  const o=SL.openTable(pid);if(!o||o.ok===false){bad(`테이블 열기 ${seed}: ${o&&o.msg}`);continue;}
  const neg=S.market.negs.find(n=>n.pid===pid);const n0=fl().length;const off={salary:sal,years:yrs,bonus:F.ask.bonus||0};
  // 교체 선수 없이 보내면: 테이블 · 기회 그대로, 이유는 정원 한 가지
  const at0=S.market.attempts[pid+':'+S.season]||0;const r0=SL.tableOffer(pid,off);
  if(r0.ok===false&&!r0.done&&S.market.negs.includes(neg)&&(S.market.attempts[pid+':'+S.season]||0)===at0&&/외국인 정원 초과 — (일반 \d+\/\d+명|\d+명 \/ \d+명)/.test(r0.msg))blocked++;else bad(`교체 없이 보냄 ${seed}: ${JSON.stringify({ok:r0.ok,done:r0.done,msg:r0.msg})}`);
  if(SL.preCheck(pid,off).some(x=>x.k==='fgn'))kept++;else bad('확정 전 검사가 정원을 못 잡음');
  const C=SL.fgnSwapCands(pid).filter(x=>x.ok);if(!C.length){continue;}const q=C[0].q;const e=SL.negSwap(pid,q.id);if(e){bad('교체 선수 지정 '+e);continue;}
  if(SL.preCheck(pid,off).length){bad('교체 선수를 골랐는데 확정 전 검사가 막음 '+JSON.stringify(SL.preCheck(pid,off)));continue;}
  const cash0=ut.cash;const sev=SL.swapSev(q);const r=SL.tableOffer(pid,off);
  if(r.done&&r.ok!==false){const sq=(S.signQ||[]).slice().reverse().find(x=>x.pid===pid);(p.teamId===ut.id&&q.teamId==null&&fl().length===n0&&sq&&sq.sev===sev&&/방출/.test(r.msg)&&cash0-ut.cash>=sev)?done++:bad(`계약은 됐는데 교체가 안 맞음 ${seed}: `+JSON.stringify({in:p.teamId===ut.id,out:q.teamId,n:[n0,fl().length],sev:sq&&sq.sev,msg:r.msg}));}
  else if(r.pending){SL.state();const F2=S.faM.m[pid];(F2&&F2.mine&&F2.mine.swap===q.id)?done++:bad('결정 대기 제안에 교체 선수가 안 실림');}
  else bad(`교체 선수를 골랐는데 계약 실패 ${seed}: ${r.msg}`);}
 tried>=2&&done===tried&&blocked===tried?ok(`정원이 찬 구단의 경쟁 입찰 외국인 영입 ${tried}번: 교체 없이 보내면 테이블 · 기회 그대로 「외국인 정원 초과 — 일반 n/3명」, 교체 선수를 고르면 계약 + 방출 + 위약금이 한 번에`):bad(`외국인 교체 ${JSON.stringify({tried,done,blocked,kept})}`);}
// 2. 화면 — 교체 확정 단추 이름 · 감독실 진단(결과와 전력을 따로) · 소식 무게 · 첫 시즌 안내 접기 · 겨울 첫 줄 마감 · 작전 결과 한 줄
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
  const r=await p.evaluate(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms||120));const o={};const txt=q=>{const e=document.querySelector(q);return e?e.textContent.replace(/\s+/g,' ').trim():'';};
    UI.pickLg('KR');UI.pickTeam(2);UI.newGame();const sb=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(sb)sb.click();UI.closeModal();const S=SL.state();S.tutorialDone=true;S.mgr.noSack=1;const ut=SL.userTeam();
    // 작전 결과 한 줄
    UI.startGame();await w();{const lg=S.liveGame;let g=0;const my=lg.home===ut.id?1:0;while(lg&&!lg.done&&g++<200){if(lg.half===my){const ks=Object.keys(SL.TACTICS).filter(k=>!SL.TACTICS[k].now);let set=null;for(const k of ks){const r=SL.setTactic(lg,my,k);if(r.ok){set=k;break;}}if(set){document.querySelectorAll('.toast').forEach(x=>x.remove());UI.step('half');await w(60);if(!txt('.toast')){UI.step('half');await w(60);}o.tac=txt('.toast');o.tacPa=lg.paCount;break;}}SL.stepPA(lg);}
      o.pulse=0;let h=0;while(!lg.done&&h++<60){UI.step('pa');if(document.querySelector('svg .fpulse')){o.pulse=1;break;}}let z=0;while(!lg.done&&z++<400)SL.stepPA(lg);UI.step('game');await w();UI.closeModal();}
    for(let i=0;i<24;i++){SL.playDayAuto();}UI.closeModal();
    // 감독실 진단: 실점 꼴찌로 만들면 결과 줄 + 전력 줄이 따로
    const ts=SL.compTeams(SL.compOf(ut));for(const t of ts){t.rec.ra=t.id===ut.id?400:100;}UI.setTab('home');UI.recAll&&UI.recAll();await w();o.rec=[...document.querySelectorAll('.rcr .a b')].map(x=>x.textContent);o.recS=[...document.querySelectorAll('.rcr .a small')].map(x=>x.textContent);UI.closeModal();
    // 받은 소식 타일
    UI.setTab('home');await w();{const t=[...document.querySelectorAll('.tile')].find(x=>/받은 소식/.test(x.textContent));o.inbox=t?[t.textContent.replace(/\s+/g,' '),t.classList.contains('hot')]:null;}
    // 정규 시즌이 끝나면 첫 시즌 안내 접힘
    o.g0=!!SL.unreadN;{let k=0;while(S.phase==='season'&&S.day<=SL.lgGames(ut.league)&&k++<400){SL.playDayAuto();SL.halfSeen&&SL.halfSeen();}}UI.closeModal();UI.setTab('home');await w();o.guidePost=S.phase==='season'?[...document.querySelectorAll('.tile')].some(x=>/첫 시즌 할 일/.test(x.textContent)):false;o.phase=S.phase+':'+S.day;
    {let k=0;while(S.phase==='season'&&k++<80){SL.playDayAuto();}}o.un0=SL.unreadN();o.news=S.news.length;UI.closeModal();
    // 겨울 2주차: 계약 끝난 코치 → 감독실 첫 줄
    S.auto={};for(const k of Object.keys(SL.AUTO_KEYS))S.auto[k]=true;SL.autoRun();S.auto.coach=false;const st=ut.staff||[];if(st[0]){st[0].years=0;st[0].letGo=false;st[0].age=Math.min(st[0].age,50);}if(st[1]){st[1].years=0;st[1].letGo=false;st[1].age=Math.min(st[1].age,50);}S.week=2;UI.closeModal();UI.setTab('home');await w();
    const m=document.querySelector('.wmust');o.must=m?m.textContent.replace(/\s+/g,' ').trim():'';o.mustTop=m?!!m.closest('.whead'):false;o.mustW=m?[Math.round(m.getBoundingClientRect().right),innerWidth]:null;
    if(m){m.click();await w(300);o.mustModal=txt('#modal .modal').slice(0,60);UI.closeModal();}
    return o;});
  /^\d+회[초말] \d사 .+ → .+ → .+ · /.test(r.tac||'')&&(r.tac||'').length<70?ok(`작전 결과 한 줄: 「${r.tac}」`):bad('작전 결과 '+JSON.stringify(r.tac));
  r.pulse?ok('타구가 떨어진 자리 강조(.fpulse)'):bad('타구 강조 없음');
  (r.rec||[]).some(x=>/^경기당 실점 [\d.]+ — 리그 \d+위$/.test(x))&&!(r.rec||[]).some(x=>/^[가-힣]+ 리그 \d+위 — 약점$/.test(x))&&(r.recS||[]).some(x=>/최근 결과/.test(x))?ok(`감독실 진단: 결과 줄 「${r.rec.find(x=>/실점/.test(x))}」(${r.recS.find(x=>/최근 결과/.test(x))}) · 전력 줄은 「○○ 전력 리그 n위」`):bad('진단 '+JSON.stringify([r.rec,r.recS]));
  r.inbox&&/새 소식 (\d+|99\+)/.test(r.inbox[0])&&!r.inbox[1]?ok(`받은 소식 타일: 「${r.inbox[0].trim().slice(0,22)}」 · 강조 없음`):bad('소식 타일 '+JSON.stringify(r.inbox));
  r.guidePost===false?ok(`정규 시즌이 끝나면(${r.phase}) 첫 시즌 안내 타일 없음`):bad('첫 시즌 안내가 남음 '+r.phase);
  r.un0<40?ok(`겨울로 넘어가면 지난 소식은 읽은 것으로 — 새 소식 ${r.un0}건(전체 ${r.news})`):bad('안 읽음 '+r.un0);
  /^이번 주 마감 \d+건 · 코치 재계약 2명 ›$/.test(r.must)&&r.mustTop&&r.mustW&&r.mustW[0]<=r.mustW[1]&&/재계약|코치/.test(r.mustModal||'')?ok(`겨울 감독실 첫 줄: 「${r.must}」 → 누르면 「${r.mustModal.slice(0,20)}…」`):bad('겨울 마감 줄 '+JSON.stringify([r.must,r.mustTop,r.mustW,r.mustModal]));
  // 교체 확정 단추
  const src=require('fs').readFileSync(path.resolve(__dirname,'../src/ui2.js'),'utf8');/\$\{esc\(q\.name\)\} 방출 · \$\{esc\(p\.name\)\} 영입/.test(src)&&!/영입·교체 확정/.test(src)?ok('교체 확정 단추 = 「나가는 선수 방출 · 들어오는 선수 영입」'):bad('교체 확정 단추 이름');
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();
  console.log(fails?`실패 ${fails}건`:'v171 통과');process.exit(fails?1:0);})();

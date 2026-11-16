// v165 (R136): 육성의 맛 — 지명 기록 · 우리가 키운 선수 · 지명 동기 · 프랜차이즈(관중 · 재계약 할인 · 떠나보낼 때 팬 실망 · 은퇴식 · 영구결번)
// · 해외 진출 요청(실제 이적료 규정 20% · 17.5% · 15%) · 각성(출전 기회) · 시즌 결산 「육성」 칸 · 선수 이야기
const path=require('path');const fs=require('fs');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
// 1. 이적료 계산식 (보장액 2,500만 달러 = 70만 · 5,000만 달러 = 140만)
SL.postFee(700000)===140000&&SL.postFee(1400000)===262500&&SL.postFee(2000000)===352500&&SL.postFee(100000)===20000?ok('이적료 = 계약 총액의 20% · 2,500만 달러 넘는 부분 17.5% · 5,000만 달러 넘는 부분 15%'):bad('이적료 식');
// 2. 새 게임: 게임 전 지명 기록 · 우리가 키운 선수 · 프랜차이즈 진행
{SL.newGame(31,3,{games:36});const S=SL.state();S.mgr.noSack=1;const ut=SL.userTeam();const ps=ut.roster.map(id=>S.players[id]);const hg=ps.filter(p=>SL.homegrown(p));const d=hg[0]&&SL.dftOf(hg[0]);
  hg.length>=3&&d&&d.k==='p'&&d.team===ut.id&&S.frV===2?ok(`게임 전부터 있던 선수 중 우리 구단 지명 ${hg.length}명 · 예 ${hg[0].name} ${2025+d.s} ${d.r}라운드`):bad('게임 전 지명 '+JSON.stringify({n:hg.length,d,frV:S.frV}));
  const rng0=S.rng;const aw=SL.awakenSeasonEnd(0);S.rng===rng0?ok(`각성 계산은 게임 난수를 쓰지 않음 (시즌 0 기록 기준 ${aw.length}명)`):bad('각성 난수');for(const p of aw){delete p.ms.awk;}
  // 3. 한 시즌 → 결산 「육성」 · 새 프랜차이즈 · 해외 진출 요청
  let g=0;while(S.phase==='season'&&g++<200)SL.playDayAuto();const D=S.lastRecap&&S.lastRecap.dev;
  D&&D.fr.length>=1&&D.post.length>=1&&SL.postReqs().length===D.post.length?ok(`시즌 결산 육성: 새 프랜차이즈 ${D.fr.map(x=>x.name+' '+x.n+'시즌').join(', ')} · 해외 진출 요청 ${D.post.map(x=>x.name+' → '+x.tg).join(', ')} · 각성 ${D.aw.length}명`):bad('결산 육성 '+JSON.stringify(D));
  const all=Object.values(S.players).filter(p=>p.ms&&p.ms.awk&&p.ms.awk.s===1);const st=all.filter(p=>p.ms.awk.w===0).length;all.length>=5&&all.length<=80&&st>=all.length/2?ok(`각성 리그 전체 ${all.length}명 (주전으로 뛴 선수 ${st}명 — 출전 기회가 클수록 잘 깨어남) · 잠재 +3~6`):bad('각성 수 '+all.length+' 주전 '+st);
  // 4. 프랜차이즈 효과: 관중 · 재계약 할인
  const fr=ut.roster.map(id=>S.players[id]).find(p=>SL.isFr(p,ut));const n=SL.frCount(ut);Math.abs(SL.frTicketF(ut)-(1+0.02*Math.min(3,n)))<1e-9?ok(`프랜차이즈 ${n}명 → 입장 수입 ×${SL.frTicketF(ut).toFixed(2)}`):bad('관중');
  const dm1=SL.renewDemandOf(fr);const F=fr.fr;delete fr.fr;const hgF=SL.homegrown(fr);const dm0=SL.renewDemandOf(fr);fr.fr=F;const r=dm1/dm0;Math.abs(r-0.92/(hgF?0.96:1))<0.02?ok(`${fr.name} 재계약 요구 ${SL.money(dm0)} → ${SL.money(dm1)} (원클럽 −8%)`):bad('재계약 할인 '+[dm0,dm1]);
  // 5. 해외 진출 요청: 미리 본 조건 = 실제 계약 · 이적료 입금
  const R=SL.postReqs()[0];const I=SL.postReqInfo(R.pid);const I2=SL.postReqInfo(R.pid);const b=I.best;const c0=ut.cash;const rep0=ut.rep;const wasFr=SL.isFr(I.p,ut);
  JSON.stringify(I.bids)===JSON.stringify(I2.bids)&&b?ok(`${I.p.name} → ${I.lgName}: 입찰 ${I.bids.length}곳 · 최고 ${b.tn} ${b.yrs}년 연봉 ${SL.money(b.sal)} · 이적료 ${SL.money(b.fee)} (두 번 봐도 같음)`):bad('입찰 '+JSON.stringify(I.bids));
  const res=SL.postDecide(R.pid,true);const q=S.players[R.pid];const tm=S.teams[q.teamId];
  res.ok&&tm.id===b.team&&q.contract.salary===b.sal&&q.contract.years===b.yrs&&ut.cash-c0===b.fee&&q.homecoming===ut.id&&q.ms.ab&&q.transfers.slice(-1)[0].kind==='해외 진출(포스팅)'?ok(`허락 → ${tm.name} ${q.contract.years}년 ${SL.money(q.contract.salary)} · 우리 구단 +${SL.money(ut.cash-c0)} · 해외 진출 배지 · 돌아오면 우리 우선${wasFr?` · 팬 응원 인기 ${rep0}→${ut.rep}`:''}`):bad('허락 '+JSON.stringify({res,team:tm.id,b,cash:ut.cash-c0}));
  const R2=SL.postReqs()[0];if(R2){const p2=S.players[R2.pid];const m0=p2.morale==null?60:p2.morale;SL.postDecide(R2.pid,false);(p2.morale===Math.max(0,m0-12)&&p2.teamId===ut.id)?ok(`거절 → ${p2.name} 남음 · 사기 ${m0} → ${p2.morale}`):bad('거절 '+[m0,p2.morale]);}
  // 6. 프랜차이즈를 다른 구단에 보내면 팬 실망
  const f2=ut.roster.map(id=>S.players[id]).find(p=>SL.isFr(p,ut));if(f2){const r0=ut.rep;const to=SL.krTeams().find(t=>!t.isUser);SL.transferPlayer?0:0;SL.frLeave(f2,ut,'move');ut.rep===Math.max(0,r0-3)?ok(`프랜차이즈 ${f2.name}을 떠나보내면 구단 인기 ${r0} → ${ut.rep}`):bad('떠나보냄 '+[r0,ut.rep]);
    // 7. 은퇴식 · 영구결번
    const no=f2.no||1;SL.frRetire(f2,S.season);const A=(S.retAsk||[]).find(x=>x.pid===f2.id);const other=ut.roster.map(id=>S.players[id]).find(p=>p.id!==f2.id);other.no=A.no;const rr=SL.retNoDo(f2.id,true);
      A&&rr.ok&&ut.retNo.some(x=>x.no===A.no&&x.pid===f2.id)&&other.no!==A.no?ok(`은퇴식 → ${A.no}번 영구결번 · 같은 번호를 쓰던 ${other.name}는 ${other.no}번으로`):bad('영구결번 '+JSON.stringify({A,rr,o:other.no}));}
  // 8. 겨울: 신인 계약 → 지명 기록 · 지명 동기
  let k=0;while(S.phase==='offseason'&&S.week<6&&k++<10)SL.advanceWeek();for(const p of SL.draftPending())SL.draftContract(p.id,true);const C=SL.draftClasses();const c1=C.find(c=>!c.y&&c.s===S.season);
  c1&&c1.rows.length>=3&&c1.rows.every(r=>r.d.k==='d'&&r.d.r>=1&&r.d.n>=1)?ok(`지명 동기 ${2025+c1.s}: ${c1.rows.map(r=>r.name+' '+r.dl).slice(0,3).join(' · ')} …`):bad('지명 동기 '+JSON.stringify(C.map(c=>[c.s,c.rows.length])));
  const sz=JSON.stringify(S).length;sz<4.1e6?ok(`저장 크기 ${(sz/1024).toFixed(0)}KB`):bad('저장 크기 '+sz);}
// 9. 답하지 않으면 2주차에 거절로
{SL.newGame(31,3,{games:36});const S=SL.state();S.mgr.noSack=1;let g=0;while(S.phase==='season'&&g++<200)SL.playDayAuto();const R=SL.postReqs();let k=0;while(S.week<=2&&k++<4)SL.advanceWeek();
  R.length&&!SL.postReqs().length&&R.every(r=>r.st==='no'&&r.auto)?ok(`답하지 않은 요청 ${R.length}건 → 2주차에 거절로 처리`):bad('자동 거절 '+JSON.stringify(R));}
// 10. 예전 저장
{for(const f of ['v29_save.json','v158_us_save.json']){SL.load(fs.readFileSync(path.join(__dirname,f),'utf8'));const S=SL.state();const A=SL.albumRows();S.frV===2&&Array.isArray(A)?ok(`예전 저장 ${f}: 우리가 키운 선수 ${A.length}명 · 프랜차이즈 ${SL.frCount(SL.userTeam())}명`):bad('예전 저장 '+f);}}
console.log(fails?`실패 ${fails}건`:'v165 엔진 통과');
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const txt=s=>(document.querySelector(s)||document.body).innerText.replace(/\s+/g,' ');SL.newGame(31,3,{games:36});const S=SL.state();S.mgr.noSack=1;S.tutorialDone=true;S.auto=S.auto||{};let g=0;while(S.phase==='season'&&g++<200)SL.playDayAuto();UI.closeModal();UI.render();const o={};
      UI.seasonRecap();await w();o.rtabs=[...document.querySelectorAll('#modal .grtab button')].map(x=>x.textContent.trim());UI.rcTab('dev');await w();o.rdev=txt('#modal');UI.set('rcTab','sum');UI.closeModal();
      UI.go('dev','album');await w();o.chips=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());o.album=txt('.content');o.rows=document.querySelectorAll('.content .prow').length;
      UI.go('dev','class');await w();o.cls=txt('.content');
      UI.setTab('home');await w();UI.sheet('dec');await w();const tx=document.body.innerText;UI.closeModal();o.todo=(tx.match(/해외 진출 요청[^\n]*/g)||[]);
      const R=SL.postReqs()[0];UI.postView(R.pid);await w();o.post=txt('#modal');o.btn=[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim());UI.postGo(R.pid,1);await w();o.post2=txt('#modal');UI.closeModal();
      const ut=SL.userTeam();const f=ut.roster.map(id=>S.players[id]).find(x=>x.fr);UI.openPlayer(f.id);await w();o.card=txt('#modal');UI.pcTab('rec');await w();o.story=txt('#modal .pcl.story');UI.pcTab('con');await w();o.con=txt('#modal');UI.pcTab('info');UI.closeModal();return o;});
    r.rtabs.join('|')==='요약|육성|시상|기록'&&/새 프랜차이즈/.test(r.rdev)&&/해외 진출 요청/.test(r.rdev)?ok(`${tag} 시즌 결산 칸 「${r.rtabs.join(' · ')}」 · 육성: 「${r.rdev.slice(r.rdev.indexOf('새 프랜'),r.rdev.indexOf('새 프랜')+50)}…」`):bad(tag+' 결산 '+JSON.stringify({t:r.rtabs,d:r.rdev.slice(0,200)}));
    r.chips.join('|')==='선수 성장|육성 앨범|지명 동기'&&/우리가 키운 선수 \d+명/.test(r.album)&&/프랜차이즈 \d/.test(r.album)&&r.rows>=5?ok(`${tag} 육성 → 성장 「${r.chips.join(' · ')}」 · 우리가 키운 선수 ${r.rows}줄`):bad(tag+' 앨범 '+JSON.stringify({c:r.chips,a:r.album.slice(0,200),n:r.rows}));
    /신인 드래프트|게임에서 지명한 선수가 아직 없습니다/.test(r.cls)?ok(`${tag} 지명 동기 화면`):bad(tag+' 지명 동기 '+r.cls.slice(0,120));
    r.todo.length>=1&&/입찰 구단 \d+곳/.test(r.post)&&/우리가 받는 이적료/.test(r.post)&&r.btn.join('|')==='거절|허락'&&/이적료 .+ 입금/.test(r.post2)&&/다음 할 일/.test(r.post2)?ok(`${tag} 할 일 「${r.todo[0]}」 → 요청 창 [거절 · 허락] → 「${r.post2.slice(r.post2.indexOf('해외 진출 ·'),r.post2.indexOf('해외 진출 ·')+60)}」`):bad(tag+' 요청 창 '+JSON.stringify({t:r.todo,p:r.post.slice(0,200),b:r.btn,p2:r.post2.slice(0,160)}));
    /프랜차이즈/.test(r.card)&&/1군 데뷔/.test(r.story)&&/프랜차이즈 스타/.test(r.story)&&/프랜차이즈 \d{4} 시즌부터 · 재계약 −8%/.test(r.con)?ok(`${tag} 선수 카드: 이름 옆 「프랜차이즈」 · 이야기 「${r.story.slice(0,70)}…」 · 계약 탭 프랜차이즈 줄`):bad(tag+' 카드 '+JSON.stringify({s:r.story,c:r.con.slice(0,200)}));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v165 통과');process.exit(fails?1:0);})();

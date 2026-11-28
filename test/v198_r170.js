// v198 (R170): GPT 두 시즌 후기 — 숫자 오류 · 부임 직후 연봉 · 대만 이직 선수단 · 써 보기 2탭 · 계속 단추 하나 · 해임 직후 감독실
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{
  // 0. 엔진: 한국 → 대만 이직 = 예산 새로 · 선수단 리그 수까지 · 외국인 빈자리는 그 리그 외국인으로
  {const SL=require('./run.js');SL.newGame(9100,2,{});let S=SL.state();let n=0;while(S.phase==='season'&&n++<500){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
    S.budget.wage=SL.budgetInfo().pay-500000;const before=SL.budgetInfo().wageLeft;
    const nt=Object.values(S.teams).filter(t=>t.league==='TW'&&!t.isUser).sort((a,b)=>a.roster.length-b.roster.length)[0];const r0=nt.roster.length;
    S.jobOffers=[{id:S.nextOfferId++,team:nt.id,kind:'job',goal:{text:'-'},rankExp:3,n:6,expires:2,reason:'검사'}];const e=SL.moveManager(S.jobOffers[0].id);S=SL.state();const ut=SL.userTeam();const I=SL.budgetInfo();
    const st=SL.fgnStatus(ut);const own=st.list.filter(p=>p.nat==='TW').length;const fg=ut.roster.map(id=>S.players[id]).filter(p=>p&&SL.isFgnIn(p,'TW')).length;
    !e&&ut.id===nt.id&&before<0&&I.wageLeft>=0&&ut.roster.length>=SL.BAL.LR.TW.roster&&own===0&&st.genFree===Math.max(0,4-fg)?ok(`이직: 연봉 여유 ${before} → ${I.wageLeft}(새 구단 예산) · 선수 ${r0} → ${ut.roster.length}명(대만 ${SL.BAL.LR.TW.roster}) · 외국인 ${fg} · 빈자리 ${st.genFree}`):bad('이직 '+JSON.stringify({e,before,left:I.wageLeft,r0,n:ut.roster.length,own,free:st.genFree,fg}));}
  const b=await chromium.launch();const errs=[];
  const mk=async(seed,team)=>{const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(([s,t])=>{UI.setSeed(s);UI.pickLg('KR');UI.pickTeam(t);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();},[seed,team]);return p;};
  const p=await mk(24680,9);
  // 1. 자동 진행 멈춤 → 결과 창 아래 단추 하나 + 남은 경기(실제 일정) · 결정은 보고서 위 · 경기 기록은 접힘
  {let r=null;for(let k=0;k<10&&!r;k++){await p.evaluate(()=>{UI.closeModal();UI.autoDays(999);});await p.waitForTimeout(500);
      r=await p.evaluate(()=>{const m=document.querySelector('#modal .modal');if(!m||!m.querySelector('.shbar .sb2'))return null;const S=SL.state();const rem=S.schedule.filter(g=>!g.res&&!g.post&&SL.isUserGame(g)).length;
        const B=[...m.querySelectorAll('.shbar button')].filter(e=>e.offsetParent);const sm=(m.querySelector('.shbar small')||{}).textContent||'';const rep=m.querySelector('.report')||m;const H=rep.innerHTML;
        const iDec=H.indexOf('decbox')>=0?H.indexOf('decbox'):H.indexOf('결정 '),iStat=H.indexOf('성적');const det=m.querySelector('details.rpmore');
        return {n:B.length,t:B.map(e=>e.innerText.replace(/\n/g,' ')).join('|'),sm,rem,dec:iDec>=0&&iDec<iStat,det:!!det,detOpen:det?det.open:null,best:det?/최고 타자|최고 투수/.test(det.innerText):null};});}
    r&&r.n===1&&(r.sm===`시즌 종료까지 ${r.rem}경기`||new RegExp(`^남은 \\d+경기$`).test(r.sm))&&r.dec&&r.det&&r.detOpen===false?ok(`멈춤 창: 단추 하나 「${r.t}」 · 남은 일정 ${r.rem}경기 · 결정 칸이 성적 위 · 경기 기록 접힘`):bad('멈춤 창 '+JSON.stringify(r));}
  // 1-1. 멈춤 칸 남은 경기 = 실제 일정(예전 978경기)
  {const r=await p.evaluate(()=>{const S=SL.state();const rem=S.schedule.filter(g=>!g.res&&!g.post&&SL.isUserGame(g)).length;const L=UI.chk198.stopLeft({left:999});const L7=UI.chk198.stopLeft({left:7});return {rem,n:L.n,end:L.end,n7:L7.n,e7:L7.end};});
    r.n===r.rem&&r.end&&r.n7===Math.min(7,r.rem)&&!r.e7?ok(`남은 경기 계산: 시즌 끝까지 ${r.n} = 일정 ${r.rem} · 7경기 진행은 ${r.n7}`):bad('남은 경기 '+JSON.stringify(r));}
  // 2. 시즌 끝 → 한도를 넘긴 상태에서 해외 후보: 카드 「지금 가능」 · 구단 단계 확인도 예상 연봉으로
  {const r=await p.evaluate(()=>{UI.closeModal();const S=SL.state();let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}UI.closeModal();
      const B=S.budget;B.wage=SL.budgetInfo().pay-557000;const I=SL.budgetInfo();
      const os=Object.values(S.players).filter(p=>p.teamId!=null&&S.teams[p.teamId].league==='JP'&&SL.isPitcher(p)&&!SL.osWill(p,S.teams[p.teamId]).no).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[3];
      UI.openPlayer(os.id);const m=document.querySelector('#modal');const now=[...m.querySelectorAll('*')].find(e=>e.children.length<=2&&/^지금 가능/.test(e.textContent.trim()));const pri=[...m.querySelectorAll('button.primary')].filter(e=>e.offsetParent).map(e=>e.textContent.trim());
      UI.closeModal();SL.openTable(os.id);const pc=SL.preCheck(os.id,{salary:0,years:2,bonus:0});const w=pc.find(x=>x.k==='wage');UI.closeModal();
      return {left:I.wageLeft,now:now?now.textContent.trim():'',pri,msg:w&&w.msg,sal:w&&w.sal,need:w&&w.need};});
    r.left<0&&/^지금 가능/.test(r.now)&&r.pri.includes('연봉 정리 ›')&&/^연봉 한도 이미 .+ 초과 · 예상 연봉 .+ → .+ 줄여야$/.test(r.msg||'')&&r.sal>0?ok(`한도 초과(${r.left}): 카드 「${r.now}」 · 노란 「연봉 정리 ›」 · 확인 「${r.msg}」`):bad('한도 '+JSON.stringify(r));}
  // 3. 연봉 정리 → 매물 화면 머리에 돌아가는 줄
  {const r=await p.evaluate(()=>{const S=SL.state();const neg=S.market.negs[S.market.negs.length-1];UI.wageFix(neg.pid,300000);const h=document.querySelector('#app .retneg');const t=h?h.innerText:'';const bt=h&&h.querySelector('button');const nm=S.players[neg.pid].name;if(bt)bt.click();const A=document.querySelector('#app');const op=!!document.querySelector('#modal .modal')||(!A.querySelector('.retneg')&&A.innerText.includes(nm));UI.closeModal();UI.go('home');return {t,op};});
    /‹ .+ (협상으로|다시 보기)/.test(r.t)&&/연봉 .+ 더 줄여야|연봉 정리 끝/.test(r.t)&&r.op?ok(`연봉 정리: 매물 화면 머리 「${r.t.replace(/\n/g,' · ')}」 → 눌러 그 선수로`):bad('연봉 정리 '+JSON.stringify(r));}
  // 4. 겨울: 코치 맡김 문구 = 개막 요약 문구(평가 60 미만은 떠남)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();S.auto=S.auto||{};S.auto.coach=true;const cs=ut.staff||[];if(!cs.length)return {none:1};for(const c of cs){c.years=1;c.expiring=false;c.letGo=false;}const c=cs[0];c.years=0;c.expiring=true;c.rating=50;c.age=50;
      const t=UI.chk198.wAutoTxt({title:'재계약 코치 1명',btn:'재계약'});const h=UI.chk198.skipSummary();return {t,sk:/평가 낮은 코치 1명은 떠남/.test(h)};});
    r.t==='평가 60 미만 · 자동 보냄 1명 예정'&&r.sk?ok(`코치 맡김: 감독실 「${r.t}」 = 개막 요약 「평가 낮은 코치 1명은 떠남」`):bad('코치 '+JSON.stringify(r));}
  // 5. 해임 직후 감독실 = 새 구단 고르기만(구단마다 한 줄 · 노란 채움 없음 · 주요 업무 중복 없음)
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const ts=Object.values(S.teams).filter(t=>!t.isUser&&(t.league==='KR'||t.league==='TW')&&t.lastRank).slice(0,3);
      S.jobOffers=ts.map(t=>({id:S.nextOfferId++,team:t.id,kind:'sack',goal:{text:'가을야구'},rankExp:3,n:10,expires:2,reason:'검사'}));S.mgr.sacked={s:S.season,why:'2년 연속 목표 미달',from:ut.name,team:ut.id,done:false};UI.closeModal();UI.go('home');
      const a=document.querySelector('#app');const rows=[...a.querySelectorAll('.skc .sko')];const yel=[...a.querySelectorAll('button.primary')].filter(e=>e.offsetParent).length;const nm=ts.map(t=>[...a.querySelectorAll('*')].filter(e=>!e.children.length&&e.textContent.trim()===t.name).length);
      const line=rows.map(x=>x.querySelector('small').textContent);const todo=!!a.querySelector('.wtd'),money=!!a.querySelector('.wmoney');rows[0].click();const jv=!!document.querySelector('#app .pv');S.mgr.sacked.done=true;S.jobOffers=[];UI.go('home');return {n:rows.length,yel,nm,line,todo,money,jv};});
    r.n===3&&r.yel===0&&r.nm.every(x=>x===1)&&!r.todo&&!r.money&&r.line.every(x=>/^(한국|대만) · 지난 \d+위 · 목표 /.test(x))?ok(`해임 직후: 구단 3줄(${r.line[0]}) · 이름마다 한 번 · 주요 업무 · 돈 칸 없음 · 노란 채움 0`):bad('해임 '+JSON.stringify(r));}
  // 6. 써 보기 2탭: 시범경기 창 → 빠지는 선수 → 들어가는 선수 → [기용] → 같은 자리 · 같은 포지션 · 「n번 배치 후」 기록
  {const r=await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='offseason'&&g++<12){if(SL.autoRun)SL.autoRun();if(SL.draftTurn&&SL.draftTurn())SL.draftAuto();if(S.week>=SL.BAL.OFFSEASON_WEEKS)break;SL.advanceWeek();}let k=SL.startNewSeason();if(!k.ok){SL.autoFillUser();k=SL.startNewSeason();}
      const E=S.exh;if(!E)return {noexh:1};const ut=SL.userTeam();const reg=new Set(ut.lineup.concat(ut.rotation));const cand=Object.keys(E.st).map(Number).filter(id=>!reg.has(id)&&S.players[id]&&!SL.isPitcher(S.players[id])&&ut.roster.includes(id));if(!cand.length)return {nocand:1};E.sup=cand[0];
      UI.closeModal();UI.exhOpen();const b1=[...document.querySelectorAll('#modal .shbar button')].find(e=>/써 보기$/.test(e.textContent.trim()));b1.click();const m=document.querySelector('#modal .tryo');if(!m)return {nosheet:1};
      const plan=UI.chk198.tryPlan(E.sup);const out=plan.out.id,i=plan.i,ps=ut.pos[out];const txt=m.innerText.replace(/\n/g,' ');const B=[...m.querySelectorAll('.shbar button')].map(e=>e.textContent.trim());
      m.querySelector('.shbar .primary').click();const a=(S.acts||[])[0];const sameSlot=ut.lineup[i]===E.sup&&ut.pos[E.sup]===ps&&!ut.lineup.includes(out);
      for(let d=0;d<8;d++){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();}const R=SL.actResults().find(x=>x.p.id===E.sup);
      return {txt,B,sameSlot,act:a&&a.k+':'+a.slot,i,closed:!document.querySelector('#modal .modal'),R:R&&R.head};});
    r.B&&r.B.length===2&&r.B[1]==='기용'&&/→/.test(r.txt)&&r.sameSlot&&r.act===`order:${r.i+1}`&&r.closed&&r.R&&new RegExp(`^${r.i+1}번 배치 후 \\d+경기$`).test(r.R)?ok(`써 보기: 「${r.txt.slice(0,60)}…」 → 기용(2탭) · ${r.i+1}번 같은 포지션 · 보고서 「${r.R}」`):bad('써 보기 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v198 검사 통과');process.exit(fails?1:0);})();

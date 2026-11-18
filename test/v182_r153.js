// v182 (R153): GPT v179 교체 두 건 — 교체 연봉 여유(나가는 선수 연봉 반영) · 최종 확인 즉시 지출 = 영입비 + 위약금 · 구원 투수 배치 = 불펜 보기 · 외국인 관리 하단 「투수진 보기」
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const play=S=>{let k=0;while(S.phase==='season'&&k++<500){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();}};
// 1. 연봉을 줄이는 교체: 여유 < 새 연봉이지만 여유 + 나가는 연봉 ≥ 새 연봉 → 막히지 않음 / 모자라면 막힘(같은 계산)
{let tried=0,okN=0,blk=0;const log=[];
 for(const seed of [1421,1422,1423,1424,1425,1426,1427,1428]){SL.newGame(seed,2,{games:36});const S=SL.state();play(S);if(S.phase!=='offseason')continue;
  const ut=SL.userTeam();ut.cash=9e6;const M=S.faM&&S.faM.m||{};const ids=Object.keys(M).map(Number).filter(id=>{const p=S.players[id];return p&&p.teamId==null&&SL.isFgn(p);});
  for(const pid of ids){const p=S.players[pid];const F=M[pid];const sal=Math.round(F.ask.sal*1.6/100)*100,yrs=F.ask.yrs;if(!SL.fgnBlock(ut,p,sal))continue;
    const o=SL.openTable(pid);if(!o||o.ok===false)continue;const C=SL.fgnSwapCands(pid).filter(x=>x.ok&&x.q.contract&&x.q.contract.salary>sal&&!S.pendingFA.includes(x.q.id));if(!C.length){S.market.negs=S.market.negs.filter(n=>n.pid!==pid);continue;}
    const q=C[0].q;SL.negSwap(pid,q.id);const off={salary:sal,years:yrs,bonus:F.ask.bonus||0};
    // 예산: 여유를 새 연봉보다 작게(교체로 풀리는 연봉을 더하면 넉넉)
    const I0=SL.budgetInfo();const B=S.budget;B.wage=I0.pay+Math.round(sal*0.5);const I=SL.budgetInfo();const cr=SL.swapPayCredit(ut,q.id);
    const L=SL.preCheck(pid,off);const wage=L.find(x=>x.k==='wage');tried++;
    if(I.wageLeft<sal&&I.wageLeft+cr>=sal&&!wage){okN++;}else{bad('여유 계산 '+JSON.stringify({left:I.wageLeft,cr,sal,L}));continue;}
    const r=SL.tableOffer(pid,off);if(r.ok===false&&/연봉 예산 초과/.test(r.msg||''))bad('계약 승인에서 막힘 '+r.msg);else log.push(`여유 ${SL.money(I.wageLeft)} + ${q.name} ${SL.money(cr)} ≥ ${p.name} ${SL.money(sal)} → ${r.done?'계약':r.pending?'결정 대기':'진행'}`);
    // 모자라면 막힘
    SL.newGame(seed,2,{games:36});break;}
  if(tried>=2)break;}
 // 모자란 경우: 같은 함수가 막는지
 {SL.newGame(1429,2,{games:36});const S=SL.state();const ut=SL.userTeam();const q=ut.roster.map(i=>S.players[i]).find(x=>SL.isFgn(x)&&x.contract);const B=S.budget||(SL.budgetInfo(),S.budget);const I0=SL.budgetInfo();B.wage=I0.pay+1000;const e1=SL.budgetCheck(q,q.contract.salary+3000,0,q.contract.salary),e2=SL.budgetCheck(q,q.contract.salary-1000+999999,0,q.contract.salary);if(!e1&&e2)blk++;else bad('예산 검사 경계 '+JSON.stringify([e1,e2]));}
 tried>=1&&okN===tried&&blk?ok(`교체 연봉 여유 ${okN}건: ${log.join(' · ')} · 모자라면 그대로 막힘`):bad(`교체 여유 ${JSON.stringify({tried,okN,blk})}`);}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const [w,h] of [[390,844],[1280,860]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    // 2. 최종 확인 즉시 지출 = 내역 합 (FA 영입비 포함)
    const r=await p.evaluate(()=>{const out={};for(const seed of [1421,1422,1423,1424,1425,1426]){SL.newGame(seed,2,{games:36});const S=SL.state();S.tutorialDone=true;let k=0;while(S.phase==='season'&&k++<500){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();}if(S.phase!=='offseason')continue;
        const ut=SL.userTeam();ut.cash=9e6;S.budget=null;const M=S.faM.m;const pid=Object.keys(M).map(Number).find(id=>{const x=S.players[id];return x&&x.teamId==null&&SL.isFgn(x)&&SL.fgnBlock(ut,x,M[id].ask.sal);});if(pid==null)continue;
        SL.openTable(pid);const C=SL.fgnSwapCands(pid).filter(x=>x.ok);if(!C.length)continue;const q=C[0].q;UI.openTable(pid);
        UI.swapSet(pid,q.id,false);UI.swapConfirm(pid);const m=document.getElementById('modal');if(!m)continue;const d=m.querySelector('details.swtot');if(!d)return {nodet:1};const sum=d.querySelector('summary').innerText.replace(/\s+/g,' ');d.open=true;const rows=[...d.querySelectorAll(':scope>div')].map(x=>x.innerText.replace(/\s+/g,' '));d.open=false;
        const num=s=>{const m=s.replace(/,/g,'').match(/([\d.]+)억(?:\s*([\d.]+)만)?|([\d.]+)만/);if(!m)return 0;return m[1]?(+m[1]*1e8+(m[2]?+m[2]*1e4:0)):+m[3]*1e4;};
        const btn=m.querySelector('.swgo').textContent;Object.assign(out,{sum,rows,tot:num(sum.split('즉시 지출')[1]||''),parts:rows.map(num).reduce((a,x)=>a+x,0),fa:rows.some(x=>/FA 영입비/.test(x)),sev:rows.some(x=>/위약금/.test(x)),btn,closed:!d.open});break;}return out;});
    r.sum&&Math.abs(r.tot-r.parts)<=1e6&&r.sev&&r.closed&&/방출 · .+ 영입/.test(r.btn)?ok(`${w}px 최종 확인 「${r.sum}」 → 펼침 ${r.rows.join(' / ')} · 단추 「${r.btn}」`):bad(`${w}px 즉시 지출 `+JSON.stringify(r));
    // 3. 배치 화면: 구원 투수 = 「현재 불펜 보기」(보직) · 선발 = 로테이션 · 4. 외국인 다 차면 「투수진 보기」
    const r2=await p.evaluate(()=>{UI.closeModal();SL.newGame(1430,2,{games:36});const S=SL.state();S.tutorialDone=true;const ut=SL.userTeam();const rp=ut.bullpen.map(i=>S.players[i]).find(x=>x.pos!=='SP');const sp=S.players[ut.rotation[0]];const o={};
      for(const [k,x] of [['rp',rp],['sp',sp]]){UI.place(x.id);const d=document.querySelector('details.pldet');o[k]=d?d.querySelector('summary').textContent:'';if(d){d.open=true;o[k+'T']=d.innerText.replace(/\s+/g,' ').slice(0,120);}UI.back&&UI.back();}
      UI.fgnOpen();const vs=[...document.querySelectorAll('.gobar button')].map(x=>x.textContent.trim());o.btns=vs;o.full=SL.fgnSlots(ut).every(x=>x.p);o.pinfo=[...document.querySelectorAll('.pinfo')].map(x=>x.textContent).join('|');return o;});
    r2.rp==='현재 불펜 보기'&&/마무리|셋업/.test(r2.rpT||'')&&r2.sp==='현재 선발 로테이션 보기'?ok(`${w}px 배치 화면: 구원 「${r2.rp}」(${(r2.rpT||'').slice(0,60)}) · 선발 「${r2.sp}」`):bad(`${w}px 배치 `+JSON.stringify(r2));
    (!r2.full||(r2.btns.includes('투수진 보기')&&!/모두 채웠습니다/.test(r2.pinfo)))?ok(`${w}px 외국인 관리: ${r2.full?'다 참 → [투수진 보기] · 문장 없음':'빈자리 있음(건너뜀)'}`):bad(`${w}px 외국인 관리 `+JSON.stringify(r2));}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v182 통과');process.exit(fails?1:0);})();

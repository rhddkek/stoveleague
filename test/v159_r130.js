// v159 (R130): 리그 돈 규모를 실제에 맞춤 — 미국 1군 연봉 ×4.2(하부는 그대로, 메이저 최저 76만 달러) · 일본 ×1.8 · 대만 ×2.4, 수입 · 구단 자금도 같은 비율(ECON_R)
// 한국은 그대로 · 한국 구단의 외국인 영입 비용 그대로 · 해외 리그도 구단주 예산(그 리그 평균 · 살림 크기) · 예전 저장은 한 번 변환
const path=require('path');const fs=require('fs');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const W=SL.BAL.WON,eok=x=>Math.round(x*W/1e4);   // 내부 값 → 억
const pay=(S,t)=>t.roster.concat(t.dev||[]).map(id=>S.players[id]).filter(Boolean).reduce((a,p)=>a+(p.contract?p.contract.salary:0),0);
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1];};
// 1. 리그별 구단 연봉 총액 — 실제 범위 (미국 2025: 6,870만~3억 4,530만 달러 · 일본: 구단 평균 약 30억 엔 · 대만: 약 1~2억 대만달러 · 한국 상위 40명 44억~132억)
{const R={};for(const lg of ['US','JP','TW','KR']){SL.newGame(31,0,lg==='KR'?{}:{league:lg});const S=SL.state();R[lg]=med(Object.values(S.teams).filter(t=>t.league===lg).map(t=>eok(pay(S,t))));}
  R.US>=1500&&R.US<=2800&&R.JP>=200&&R.JP<=380&&R.TW>=50&&R.TW<=120&&R.KR>=90&&R.KR<=135?ok(`구단 연봉 총액 가운데 값: 미국 ${R.US}억 · 일본 ${R.JP}억 · 대만 ${R.TW}억 · 한국 ${R.KR}억(그대로)`):bad('연봉 총액 '+JSON.stringify(R));}
// 2. 미국: 1군은 메이저 최저(11억) 이상 · 2 · 3군은 하부 수준 · 스타 연봉
{SL.newGame(31,0,{league:'US'});const S=SL.state();const ts=Object.values(S.teams).filter(t=>t.league==='US');const ps=ts.flatMap(t=>t.roster.map(id=>S.players[id])).filter(p=>p&&p.contract);
  const t1=ps.filter(p=>(p.tier||1)===1),fm=ps.filter(p=>(p.tier||1)>1);const lo1=t1.filter(p=>p.contract.salary<22000).length;const fmMed=eok(med(fm.map(p=>p.contract.salary))*1e4)/1e4;const top=eok(Math.max(...ps.map(p=>p.contract.salary)));
  lo1<=t1.length*0.05&&fm.length>100&&med(fm.map(p=>p.contract.salary))<6000&&top>=200?ok(`미국 1군 ${t1.length}명 중 ${t1.length-lo1}명 11억 이상(나머지는 시즌 중 올라온 선수 — 계약 그대로) · 하부 ${fm.length}명 가운데 ${SL.money(med(fm.map(p=>p.contract.salary)))} · 최고 연봉 ${top}억`):bad('미국 연봉 '+JSON.stringify({lo1,fm:fm.length,fmMed:med(fm.map(p=>p.contract.salary)),top}));
  const u=SL.userTeam();const B=SL.budgetInfo();const U=SL.bsUnit();B.xfer>0&&B.wage>=B.pay&&U.x>=30000*10?ok(`미국 구단주 예산: 연봉 ${eok(B.wage)}억(지금 ${eok(B.pay)}억) · 영입 ${eok(B.xfer)}억 · 예산 전환 한 묶음 ${eok(U.x)}억 → ${eok(U.w)}억`):bad('미국 예산 '+JSON.stringify({B,U}));
  const cb=SL.cbtInfo(u);eok(cb.th)>=1500?ok(`사치세 기준선 ${eok(cb.th)}억 (리그 상위 20% 경계)`):bad('사치세 '+JSON.stringify(cb));}
// 3. 한 시즌 살림: 수입 / 연봉 비율이 예전(미국 0.6~0.95)과 비슷 · AI 구단 빚 없음 · 드래프트 계약금을 두 번 곱하지 않음
{SL.newGame(31,0,{league:'US',games:144});const S=SL.state();S.mgr.noSack=1;const u=SL.userTeam();const c0=u.cash,p0=pay(S,u);const ai=Object.values(S.teams).filter(t=>t.league==='US'&&!t.isUser);const a0=ai.map(t=>t.cash),b0=ai.map(t=>t.fin.buys||0);
  let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();const r=(u.cash-c0)/p0;const debt=ai.filter(t=>t.cash<0).length;const dr=Math.max(...ai.map((t,i)=>((t.fin.buys||0)-b0[i])/pay(S,t)));
  r>0.3&&r<1.5&&!debt&&dr<0.2?ok(`미국 한 시즌: 우리 자금 +${r.toFixed(2)}×연봉 총액 · AI 빚 0곳 · AI 드래프트 계약금 최대 ${(dr*100).toFixed(0)}% (연봉 총액 대비)`):bad('미국 살림 '+JSON.stringify({r,debt,dr}));}
// 4. 한국: 외국인(미국 2군) 영입 비용은 예전 그대로 · 한국 선수 연봉 그대로
{SL.newGame(31,0);const S=SL.state();const ut=SL.userTeam();const q=Object.values(S.players).find(p=>p.teamId!=null&&S.teams[p.teamId].league==='US'&&(p.tier||1)>1&&SL.calcOvr(p)>=66);const c=SL.fgnCost(q);
  c.sal>=SL.BAL.FGN.genMin&&c.sal<=SL.BAL.FGN.genMax&&c.fee<100000?ok(`한국 구단이 미국 2군 ${q.name} 영입: 연봉 ${SL.money(c.sal)} · 이적료 ${SL.money(c.fee)} (외국인 상한 안)`):bad('외국인 비용 '+JSON.stringify(c));}
// 5. 예전 저장(v158 미국): 1군 계약 ×4.2 · 하부 그대로 · 구단 자금 ×4.13 · 알림
{const j=fs.readFileSync(path.join(__dirname,'v158_us_save.json'),'utf8');const o=JSON.parse(j);const u0=o.teams[o.userTeamId];const ids=u0.roster.filter(id=>o.players[id].contract);const one=ids.find(id=>!(o.players[id].tier>1)&&o.players[id].contract.salary*4.2>22000),far=Object.keys(o.players).find(id=>o.players[id].tier>1&&o.players[id].contract&&o.players[id].teamId!=null&&o.teams[o.players[id].teamId].league==='US');
  const b1=o.players[one].contract.salary,b2=o.players[far].contract.salary,cash0=u0.cash;SL.load(j);const S=SL.state();const a1=S.players[one].contract.salary,a2=S.players[far].contract.salary,cash1=SL.userTeam().cash;
  Math.abs(a1/b1-4.2)<0.02&&(a2===b2||a2===1100)&&Math.abs(cash1/cash0-4.07)<0.01&&S.payV===1&&S.news.some(n=>/리그 연봉/.test(n.text))?ok(`예전 미국 저장: 1군 ${SL.money(b1)} → ${SL.money(a1)} · 하부 ${SL.money(b2)} → ${SL.money(a2)} · 자금 ${eok(cash0)}억 → ${eok(cash1)}억 · 소식 한 줄`):bad('저장 변환 '+JSON.stringify({b1,a1,b2,a2,cash0,cash1,payV:S.payV}));
  const j2=SL.serialize();SL.load(j2);SL.state().players[one].contract.salary===a1?ok('다시 불러와도 한 번만 변환'):bad('두 번 변환');}
console.log(fails?`실패 ${fails}건`:'v159 엔진 통과');
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    await p.evaluate(()=>{UI.pickLg('US');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();});await p.waitForTimeout(300);
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));UI.go('club','fin');await w();const t=document.querySelector('.content')?document.querySelector('.content').innerText:document.body.innerText;const B=SL.budgetInfo();const U=SL.bsUnit();return {t:t.replace(/\s+/g,' ').slice(0,400),x:B.xferLeft,ux:U.x};});
    /영입 예산/.test(r.t)&&!/영입 예산 0 /.test(r.t)&&/예산 조정/.test(r.t)?ok(`${tag} 미국 구단 재정: 「${r.t.match(/영입 예산[^가-힣]*[\d,.]+억/)||''}」 · 예산 조정 칸`):bad(tag+' 재정 '+r.t);
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v159 통과');process.exit(fails?1:0);})();

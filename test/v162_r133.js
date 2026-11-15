// v162 (R133): 미국 하부 = 트리플A · 더블A — 우리 미국 구단 명단 「메이저 · 트리플A · 더블A」 · 40인 · 단계 옮기기 · 하부 경기 기록 / 메이저 끝자락 선수가 한국으로(실제 바이아웃) · 한국을 휩쓴 외국인은 메이저 복귀
const path=require('path');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
{SL.newGame(31,0,{league:'US',games:144});const S=SL.state();S.mgr.noSack=1;const u=SL.userTeam();const e=new Set(u.entry);const mi=u.roster.filter(id=>!e.has(id)).concat(u.dev);
  const n2=mi.filter(id=>SL.uTier(S.players[id],u)===2).length,n3=mi.filter(id=>SL.uTier(S.players[id],u)===3).length;
  u.entry.length===26&&u.roster.length===40&&u.dev.length>=8&&n2>=8&&n3>=8?ok(`우리 미국 구단: 메이저 26 · 40인 ${u.roster.length} · 트리플A ${n2} · 더블A ${n3}(40인 밖 마이너 계약 ${u.dev.length} 포함)`):bad('미국 구단 '+JSON.stringify({e:u.entry.length,r:u.roster.length,d:u.dev.length,n2,n3}));
  SL.farmKo('US',1)==='메이저'&&SL.farmKo('US',2)==='트리플A'&&SL.farmKo('US',3)==='더블A'?ok('단계 이름: 메이저 · 트리플A · 더블A'):bad('단계 이름');
  const q=S.players[mi.find(id=>SL.uTier(S.players[id],u)===2)];const e1=SL.setTier(q.id,3);const t1=SL.uTier(q,u);const e2=SL.setTier(u.entry[0],3);!e1&&t1===3&&e2?ok(`트리플A → 더블A 옮기기 · 메이저 선수는 「${e2}」`):bad('단계 옮기기 '+JSON.stringify({e1,t1,e2}));SL.setTier(q.id,2);
  const fl=mi.map(id=>S.players[id]).filter(p=>p.contract&&p.contract.salary<900).length;!fl?ok('하부 연봉은 그 단계 최저(트리플A 5,500만 · 더블A 4,500만) 이상'):bad('하부 연봉 '+fl);
  let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();const rh=mi.map(id=>S.players[id]).filter(p=>p&&(p.rhist||[]).some(h=>h.s===1&&/트리플A|더블A/.test(h.tn)));
  const ex=rh[0];const h=ex&&ex.rhist.find(x=>x.s===1);const rows=ex?SL.careerRows(ex):[];
  rh.length>=12&&h&&(h.st.g>=20||h.st.pG>=10)&&rows.some(r=>r.s===1&&/트리플A|더블A/.test(r.tn)&&!r.t1)?ok(`하부 시즌 기록 ${rh.length}명 · 예 ${ex.name} 「${h.tn}」 ${h.st.g||h.st.pG}경기 · 선수 기록 탭 줄에도`):bad('하부 기록 '+JSON.stringify({n:rh.length,h}));}
// 한국: 메이저 끝자락 선수 영입 · 이적료는 실제 바이아웃 수준 · 한국을 휩쓴 외국인은 메이저 복귀
{SL.newGame(31,0,{games:144});const S=SL.state();S.mgr.noSack=1;const us1=Object.values(S.players).filter(p=>p.teamId!=null&&S.teams[p.teamId].league==='US'&&!(p.tier>1)&&p.age>26&&SL.calcOvr(p)<SL.BAL.LEVEL_OVR.US-1);const fees=us1.slice(0,40).map(p=>SL.fgnCost(p).fee);
  Math.max(...fees)<=40000&&Math.min(...fees)>=8000?ok(`메이저 끝자락 이적료 ${SL.money(Math.min(...fees))} ~ ${SL.money(Math.max(...fees))} (실제 바이아웃 30만 ~ 140만 달러)`):bad('바이아웃 '+[Math.min(...fees),Math.max(...fees)]);
  let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();let k=0;while(S.phase==='offseason'&&k++<20)SL.advanceWeek();
  const ns=S.news.filter(n=>/^\[외국인\]/.test(n.text)).map(n=>n.text);const maj=ns.filter(t=>/ 메이저 · /.test(t)).length;const fg=SL.krTeams().flatMap(t=>t.roster.map(id=>S.players[id]).filter(p=>p&&p.nat!=='KR')).map(SL.calcOvr);const av=fg.reduce((a,b)=>a+b,0)/fg.length;
  const kr=SL.krTeams().flatMap(t=>t.lineup.concat(t.rotation).map(id=>S.players[id]).filter(p=>p&&p.nat==='KR')).map(SL.calcOvr);const ak=kr.reduce((a,b)=>a+b,0)/kr.length;
  maj>=3&&av>ak+3?ok(`한국 구단 외국인 영입 ${ns.length}건 중 메이저 출신 ${maj}건 · 외국인 평균 종합 ${av.toFixed(1)} > 한국 주전 평균 ${ak.toFixed(1)}`):bad('메이저 출신 '+JSON.stringify({n:ns.length,maj,av,ak}));
  const rt=S.news.filter(n=>/메이저 복귀/.test(n.text));rt.length>=1?ok(`메이저 복귀 ${rt.length}건 — 「${rt[0].text.slice(0,60)}」`):bad('메이저 복귀 없음');}
console.log(fails?`실패 ${fails}건`:'v162 엔진 통과');
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    await p.evaluate(()=>{UI.pickLg('US');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();UI.go('roster','list');});await p.waitForTimeout(300);
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const g=[...document.querySelectorAll('.grptab button')].map(x=>x.textContent.trim());const c40=(document.querySelector('.sq40')||{}).textContent||'';UI.sqf('grp','D');await w();const aa=document.querySelectorAll('.rosterq2 tbody tr').length;const out40=document.querySelectorAll('.rosterq2 .r40').length;
      const ut=SL.userTeam();const e=new Set(ut.entry);const id=ut.roster.find(x=>!e.has(x));UI.pmenu(id);await w();const m=(document.querySelector('#modal')||document.body).innerText;UI.closeModal();return {g,c40,aa,out40,menu:/더블A로|트리플A로/.test(m)&&/메이저 등록/.test(m)&&/40인 명단에서 빼기/.test(m)&&!/2군 집중 육성/.test(m)};});
    /^메이저 26\/26$/.test(r.g[0])&&r.g[1]==='트리플A'&&r.g[2]==='더블A'&&/40인 40\/40/.test(r.c40)&&r.aa>=8&&r.out40>=1&&r.menu?ok(`${tag} 미국 구단 명단: 「${r.g.join(' · ')}」 · 「${r.c40}」 · 더블A ${r.aa}명(40인 밖 ${r.out40}명 표시) · 관리 메뉴 「트리플A ↔ 더블A · 메이저 등록 · 40인 명단에서 빼기」`):bad(tag+' 명단 '+JSON.stringify(r));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v162 통과');process.exit(fails?1:0);})();

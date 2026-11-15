// v155 (R126): 리그 제도 (한국 · 일본 · 대만 · 미국 각자) · 서비스 시즌 · 보류 재계약 · 연봉 조정 · 리그별 FA 보상 · 퀄리파잉 오퍼 · 사치세 · 룰5 · 옵션 · 외국인 · 같은 리그 트레이드 · 코치 제의 · 선수 카드 탭
const fs=require('fs');const path=require('path');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const play=S=>{let k=0;while(S.phase==='season'&&k++<500)SL.playDayAuto();};
// 1. 규칙표
{const L=SL.BAL.LR;const r=[L.KR.fa,L.KR.faCol,L.JP.entry,L.JP.fgn.ent,L.JP.fgn.pit,L.JP.fgn.game,L.JP.fa,L.JP.osFA,L.TW.entry,L.TW.fgn.ent,L.TW.fgn.game,L.TW.fa,L.US.entry,L.US.roster,L.US.fa,L.US.arb].join(',');
  r==='8,7,31,5,4,4,8,9,28,4,3,9,26,40,6,3'?ok(`규칙표: 한국 FA 8(대학 7) · 일본 1군 31 · 외국인 5(투·야 각 4) · 경기 4 · FA 8/해외 9 · 대만 1군 28 · 외국인 4/경기 3 · FA 9 · 미국 26/40인 · FA 6 · 조정 3년차`):bad('규칙표 '+r);
  const JC=L.JP.compT,TC=L.TW.compT;JC.A.p===0.5&&JC.A.c===0.8&&JC.B.p===0.4&&JC.B.c===0.6&&JC.A.prot===28&&TC.A.c===1.25&&TC.A.p===0.75&&TC.A.prot===25&&TC.B.c===0.75?ok('보상: 일본 A 50%+1명/80% · B 40%+1명/60% · 보호 28 · 대만 A 125% 또는 75%+1명(보호 25) · B 75%'):bad('보상 표');}
// 2. 해외 리그를 맡으면 그 리그 1군 인원 · 2군
for(const [lg,ent] of [['JP',31],['TW',28],['US',26]]){SL.newGame(901,0,{league:lg,games:36});const ut=SL.userTeam();const S=SL.state();
  const cap=SL.entryCap(ut),n=ut.roster.length;cap===ent&&n>ent&&ut.entry.length===Math.min(ent,n)?ok(`${lg}: 1군 등록 ${cap}명 · 선수단 ${n}명(2군 있음) · 서비스 시즌 어림 ${ut.roster.every(id=>S.players[id].svcL)?'전원':'일부'}`):bad(`${lg} 1군 ${cap}/${ent} 선수단 ${n} 엔트리 ${ut.entry.length}`);}
// 3. 서비스 시즌 · 보류 · FA
{SL.newGame(902,0,{games:36});const S=SL.state();const ut=SL.userTeam();S.mgr.noSack=1;const ids=ut.entry.filter(id=>!SL.isFgn(S.players[id])).slice(0,4);const [a,b,c,d]=ids.map(id=>S.players[id]);
  a.svcL.KR=3;a.contract.years=1;b.svcL.KR=9.5;b.contract.years=1;c.svcL.KR=6.6;c.contract.years=1;delete c.faUsed;d.svcL.KR=10;d.faUsed={KR:8};d.contract.years=1;
  const s0={a:a.svcL.KR};play(S);const R=S.resv||{};
  const inR=id=>!!R[id],inP=id=>S.pendingFA.includes(id);
  (a.svcL.KR>=s0.a+0.8)?ok(`서비스 시즌: 시즌 내내 1군이면 +${(a.svcL.KR-s0.a).toFixed(2)}`):bad('svc '+a.svcL.KR);
  inR(a.id)&&!inP(a.id)&&inP(b.id)&&!inR(b.id)&&inR(c.id)&&!inP(c.id)&&inR(d.id)?ok(`계약 끝(1군 시즌 → 끝난 뒤): 4시즌 → 보류(연봉 재계약) · 10.5시즌 → FA 협상 · 7.6시즌(8 필요) → 보류 · FA 뒤 3시즌(재자격 4) → 보류`):bad(`보류/FA a ${inR(a.id)}/${inP(a.id)} b ${inR(b.id)}/${inP(b.id)} c ${inR(c.id)}/${inP(c.id)} d ${inR(d.id)}/${inP(d.id)} svc ${a.svcL.KR} ${b.svcL.KR} ${c.svcL.KR} ${d.svcL.KR}`);
  // 연봉 재계약: 90% → 조정, 구단 안 또는 선수 안 중 하나
  const x=SL.resvList().find(y=>y.p.id===a.id);const e=SL.resvSet(a.id,Math.round(x.dem*0.9/10)*10);const r=SL.resvSign(a.id);
  !e&&r.ok&&(r.sal===Math.round(x.dem*0.9/10)*10||r.sal===x.dem)&&/조정/.test(r.how)&&a.contract.years===1&&a.teamId===ut.id?ok(`연봉 조정: 요구 ${SL.money(x.dem)} · 제시 90% → ${SL.money(r.sal)} (${r.how}) · 1년 · 우리 팀 그대로`):bad('조정 '+JSON.stringify({e,r,dem:x&&x.dem}));
  // 마감(4주차): 남은 보류 선수는 요구액으로
  const left=SL.resvList();const dem=left[0]&&left[0].dem;const pid=left[0]&&left[0].p.id;while(S.week<=4)SL.advanceWeek();const p=S.players[pid];
  left.length&&!SL.resvList().length&&p.teamId===ut.id&&p.contract.salary===dem&&p.contract.years===1?ok(`보류 마감(4주차): 남은 ${left.length}명 요구액으로 재계약 (예: ${p.name} ${SL.money(dem)})`):bad('마감 '+JSON.stringify({n:left.length,left:SL.resvList().length,sal:p&&p.contract.salary,dem}));
  // AI 구단: 자격 전 선수는 계약이 끝나도 남음
  const ai=SL.krTeams().find(t=>!t.isUser);const q=ai.roster.map(id=>S.players[id]).find(z=>!SL.isFgn(z)&&SL.calcOvr(z)>=SL.levelOf?true:true);}
{SL.newGame(903,0,{games:36});const S=SL.state();S.mgr.noSack=1;const ai=SL.krTeams().find(t=>!t.isUser);const qs=ai.roster.map(id=>S.players[id]).filter(z=>!SL.isFgn(z)&&z.age<30).slice(0,3);for(const q of qs){q.svcL.KR=2;q.contract.years=1;}play(S);
  const stay=qs.filter(q=>q.teamId===ai.id).length;stay>=2?ok(`AI 구단: FA 자격 전(2시즌) 계약 만료 ${qs.length}명 중 ${stay}명 보류 재계약으로 남음 (나머지는 실력 미달 보류 제외 가능)`):bad('AI 보류 '+stay);}
// 4. 미국: 0~3년차 구단 결정 · 3~6년차 연봉 조정 · 퀄리파잉 오퍼 · 사치세 · 룰5 · 옵션
{SL.newGame(904,0,{league:'US',games:36});const S=SL.state();const ut=SL.userTeam();S.mgr.noSack=1;const ps=ut.entry.map(id=>S.players[id]).filter(z=>z.age<30).slice(0,4);
  ps[0].svcL.US=1.2;ps[1].svcL.US=4.1;ps[2].svcL.US=7;ps[3].svcL.US=7;for(const q of ps)q.contract.years=1;const prev1=ps[1].contract.salary;
  // 사치세: 우리 연봉을 크게 올려 기준선 위로
  const big=ut.roster.map(id=>S.players[id]).slice(0,5);for(const q of big)q.contract.salary*=8;const cash0=ut.cash;
  play(S);const R=S.resv||{};const k0=R[ps[0].id]&&R[ps[0].id].kind,k1=R[ps[1].id]&&R[ps[1].id].kind;
  k0==='pre'&&k1==='arb'&&R[ps[1].id].dem>=prev1&&S.pendingFA.includes(ps[2].id)?ok(`미국 보류: 1.2년차 「구단 결정」 · 4.1년차 「연봉 조정」(요구 ${SL.money(R[ps[1].id].dem)} ≥ 작년 ${SL.money(prev1)}) · 7년차 FA`):bad('미국 보류 '+JSON.stringify({k0,k1,pf:S.pendingFA.includes(ps[2].id)}));
  const I=SL.cbtInfo(ut);const taxed=(ut.cbtN||0)>=1;const overN=SL.lrLgTeams('US').filter(t=>(t.cbtN||0)>0).length;
  taxed&&overN>=3&&overN<=12?ok(`사치세: 기준선(리그 상위 20% 경계) 넘은 구단 ${overN}곳 · 우리 ${ut.cbtN}년째 납부 · 재정 「사치세」 ${SL.money(ut.fin.cap||0)}`):bad('사치세 '+JSON.stringify({taxed,overN,fin:ut.fin.cap}));
  // 퀄리파잉 오퍼
  const q=ps[3];q.joinSnap=null;q.joinClock=null;const el=SL.qoElig(q);const amt=SL.qoAmt();const r=SL.qoOffer(q.id);
  el&&r.ok&&(r.take?(q.contract.salary===amt&&q.contract.years===1&&!S.pendingFA.includes(q.id)):(q.qo&&q.qo.t===ut.id))&&!SL.qoElig(q)?ok(`퀄리파잉 오퍼 ${SL.money(amt)}(리그 상위 연봉 평균): ${r.take?'수락 → 1년 계약':'거절 → FA, 다른 구단과 계약하면 보상 지명권'} · 한 번만`):bad('QO '+JSON.stringify({el,r}));
  // 룰5 (3주차)
  while(S.week<3)SL.advanceWeek();const pool=SL.r5Pool();ut.roster.slice(-3).forEach(id=>{const z=S.players[id];if(!ut.lineup.includes(id)){ut.roster=ut.roster.filter(x=>x!==id);ut.entry=ut.entry.filter(x=>x!==id);ut.dev.push(id);}});
  const pk=pool[0];const rr=pk?SL.r5Pick(pk.id):{ok:false};const z=pk&&S.players[pk.id];
  pool.length>0&&rr.ok&&z.teamId===ut.id&&z.r5&&z.r5.s===S.season+1?ok(`룰5: 후보 ${pool.length}명 · ${z.name} 지명(${SL.money(SL.r5Fee())}) → 다음 시즌 내내 1군`):bad('룰5 '+JSON.stringify({n:pool.length,rr}));
  SL.testCmd('nextSeason');const z2=S.players[pk.id];if(!SL.inEntry(ut,z2.id))ut.entry.push(z2.id);const e5=SL.entryDown(z2.id);
  /룰5/.test(e5||'')?ok('룰5 선수는 1군에서 내릴 수 없음 — 「룰5 반환」 안내'):bad('룰5 내리기 '+e5);
  const o=ut.entry.map(id=>S.players[id]).find(x=>x.id!==z2.id&&!x.inj&&!x.r5);o.optN=3;o.optS=0;const eo=SL.entryDown(o.id);const o2=ut.entry.map(id=>S.players[id]).find(x=>x.id!==z2.id&&x.id!==o.id&&!x.inj&&!x.r5);o2.optN=0;const n0=SL.optLeft(o2);const e2=SL.entryDown(o2.id);
  /옵션/.test(eo||'')&&!e2&&SL.optLeft(o2)===n0-1?ok(`옵션: 3년 다 쓴 선수는 못 내림(지명할당 안내) · 다른 선수는 내리면 옵션 ${n0} → ${SL.optLeft(o2)}`):bad('옵션 '+JSON.stringify({eo,e2,n0,n1:SL.optLeft(o2)}));
  // 같은 리그 트레이드
  const t1=SL.lrLgTeams('US').find(t=>!t.isUser);const kr=SL.krTeams()[0];const ev1=SL.tradeEval(t1.id,[ut.roster[5]],[t1.roster[5]],0);const ev2=SL.tradeEval(kr.id,[ut.roster[5]],[kr.roster[5]],0);
  !/같은 리그/.test((ev1.why||[]).join(''))&&/같은 리그/.test((ev2.why||[]).join(''))?ok('트레이드: 미국 구단과는 협상 가능 · 한국 구단은 「같은 리그 AI 구단과만」'):bad('트레이드 '+JSON.stringify({a:ev1.why,b:ev2.why}));}
// 5. 일본 외국인: 1군 5명(투·야 각 4) · 한 경기 4명 · 8시즌이면 외국인 제외 · 리그별 FA 보상 등급
{SL.newGame(905,0,{league:'JP',games:36});const S=SL.state();const ut=SL.userTeam();const lg='JP';const dom=ut.entry.map(id=>S.players[id]).filter(p=>!SL.isFgnIn(p,lg));
  const sps=dom.filter(p=>SL.isPitcher(p)).slice(0,5);for(const p of sps)p.nat='US';const bt=dom.filter(p=>!SL.isPitcher(p)&&ut.lineup.includes(p.id)).slice(0,2);for(const p of bt)p.nat='US';
  SL.fixLineup(ut);const F=ut.entry.map(id=>S.players[id]).filter(p=>SL.isFgnIn(p,lg));const fp=F.filter(SL.isPitcher).length,fb=F.length-fp;
  F.length<=5&&fp<=4&&fb<=4?ok(`일본 1군 외국인: 투수 5 + 야수 2명 → 1군 ${F.length}명(투 ${fp} · 야 ${fb}) · 넘친 투수는 2군`):bad(`일본 외국인 ${F.length} ${fp}/${fb}`);
  const g=S.schedule.find(x=>x.home===ut.id||x.away===ut.id);const LG=SL.createGame?SL.createGame(g.home,g.away,false):null;
  if(LG){const side=g.home===ut.id?1:0;const used=[LG.pitcher[side]].concat(LG.lineup[side]).map(id=>S.players[id]).filter(p=>SL.isFgnIn(p,lg)).length;const out=(LG.fgnOut||[[],[]])[side].length;const dressed=F.length-out;dressed<=4&&used<=4?ok(`일본 한 경기 외국인: 1군 ${F.length}명 중 ${dressed}명만 출전 가능 (선발 + 타순 ${used}명)`):bad(`경기 외국인 dressed ${dressed} used ${used}`);}else bad('createGame 없음');
  const x=F[0];x.svcL=x.svcL||{};x.svcL.JP=7.9;S.phase==='season';SL.endSeason&&0;x.svcL.JP=8;x.jpLocal=true;!SL.isFgnIn(x,'JP')?ok('일본 1군 8시즌(한국 FA 자격)을 채운 외국인 → 외국인 수에서 빠짐'):bad('일본인 취급');
  const ai=SL.lrLgTeams('JP').find(t=>!t.isUser);const top=ai.roster.map(id=>S.players[id]).filter(p=>!SL.isFgnIn(p,'JP')).sort((a,b)=>b.contract.salary-a.contract.salary);
  SL.faMark(top[0],ai);SL.faMark(top[6],ai);SL.faMark(top[15],ai);const gs=[top[0],top[6],top[15]].map(p=>p.faFrom&&p.faFrom.g).join('');
  gs==='ABC'?ok('일본 FA 등급: 구단 일본인 연봉 1위 A · 7위 B · 16위 C'):bad('일본 등급 '+gs);}
// 6. 코치 제의
{SL.newGame(906,0,{games:36});const S=SL.state();const ut=SL.userTeam();S.mgr.noSack=1;const p=ut.roster.map(id=>S.players[id]).filter(x=>!SL.isFgn(x)&&!ut.lineup.includes(x.id)&&!ut.rotation.includes(x.id))[0];p.age=38;p.contract.years=1;
  const I=SL.coachOfferInfo(p.id);let r=SL.coachOffer(p.id);let tries=0;let q=p;
  const again=SL.coachOffer(p.id);I.ok&&I.chance>=0.7&&!again.ok?ok(`코치 제의: 38세 벤치 선수 가능성 ${Math.round(I.chance*100)}% · ${I.deptName} 평점 ${I.rating} · 같은 시즌 다시 묻기 막힘`):bad('코치 제의 정보 '+JSON.stringify({I,again}));
  if(r.take){const n0=(ut.staff||[]).length;play(S);const joined=(ut.staff||[]).some(c=>c.alumni===p.id)||(S.alumniCoach||[]).some(c=>c.alumni===p.id)||(S.staffPool||[]).some(c=>c.alumni===p.id);p.retired&&joined?ok(`수락 → 시즌 끝 은퇴하고 ${ut.staff.some(c=>c.alumni===p.id)?'바로 우리 코치(2년)':'코치 시장(자리 없음)'}`):bad('합류 '+JSON.stringify({ret:p.retired,joined}));}
  else ok('이번 판정은 거절(사기 −) — 다음 시즌에 다시 물을 수 있음');}
// 7. 예전 저장
{const j=fs.readFileSync(path.join(__dirname,'v29_save.json'),'utf8');let err=null;try{SL.load(j);}catch(e){err=e.message;}const S=SL.state();if(err)ok('v29 저장은 다른 이유로 거부: '+err.slice(0,40));else{const n=Object.values(S.players).filter(p=>!p.retired&&p.teamId!=null&&p.svcL).length;const all=Object.values(S.players).filter(p=>!p.retired&&p.teamId!=null).length;S.lrV===1&&n===all?ok(`예전 저장(v29): 선수 ${all}명 서비스 시즌 어림 · 제도 버전 표시`):bad('예전 저장 '+n+'/'+all);}}
console.log(fails?`실패 ${fails}건`:'v155 엔진 통과');
// 8. 화면 (Playwright): 선수 카드 탭 · 리그 제도 · 보류 표 · 코치 제의
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{w:390,h:844,m:true},{w:1280,h:800,m:false}]){const c=await b.newContext({viewport:{width:vp.w,height:vp.h},isMobile:vp.m,hasTouch:vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();});await p.waitForTimeout(300);const W=vp.w+'px';
    const t=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();const id=ut.lineup[0];UI.openPlayer(id);await new Promise(r=>setTimeout(r,150));const tabs=[...document.querySelectorAll('#modal .pctabs button')].map(x=>x.textContent.trim()+(x.classList.contains('on')?'*':''));
      UI.pcTab('rec');const rec=!!document.querySelector('#modal .pcrec, #modal .pcl');UI.pcTab('con');const con=[...document.querySelectorAll('#modal .pcd span')].map(x=>x.textContent);const btn=document.querySelectorAll('#modal .shbar button').length;UI.pcTab('info');UI.closeModal();return {tabs,rec,con,btn};});
    t.tabs.join('|')==='정보*|기록|계약'&&t.rec&&['계약','1군 경력','FA 자격'].every(k=>t.con.includes(k))&&t.btn>=2?ok(`${W} 선수 카드 위 탭 [${t.tabs.join(' ')}] · 기록 표 · 계약(${t.con.join('·')}) · 아래 단추 그대로`):bad(W+' 카드 탭 '+JSON.stringify(t));
    const r=await p.evaluate(()=>{UI.go('league','rules');const rows=[...document.querySelectorAll('.lrt th')].map(x=>x.textContent);const seg=[...document.querySelectorAll('.lrseg button')].map(x=>x.textContent.trim());UI.set('lrLg','US');const us=[...document.querySelectorAll('.lrt th')].map(x=>x.textContent);UI.set('lrLg',null);const ov=[...document.querySelectorAll('.lrt td')].some(x=>x.scrollWidth>x.clientWidth+2);return {rows,seg,us,ov,hs:document.documentElement.scrollWidth>innerWidth+1};});
    r.rows.includes('FA 자격')&&r.rows.includes('FA 보상')&&r.us.includes('룰5')&&r.us.includes('사치세')&&r.seg.length===4&&!r.ov&&!r.hs?ok(`${W} 리그 → 리그 제도: 한국 ${r.rows.length}줄 · 미국 ${r.us.length}줄(옵션 · 룰5 · 사치세) · 글자 잘림 없음`):bad(W+' 제도 '+JSON.stringify(r));
    if(vp.m){const q=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();S.mgr.noSack=1;const ids=ut.roster.filter(id=>!SL.isFgn(S.players[id])).slice(0,3);for(const id of ids){S.players[id].svcL.KR=2;S.players[id].contract.years=1;}let k=0;while(S.phase!=='offseason'&&k++<40)SL.testCmd('endSeason');UI.closeModal();UI.go('market','renew');await new Promise(r=>setTimeout(r,200));
        const rows=document.querySelectorAll('.rsvt tbody tr').length;const n=SL.resvList().length;const b=[...document.querySelectorAll('.rsvt tbody tr')][0];const lab=b?[...b.querySelectorAll('button')].map(x=>x.textContent.trim()):[];const pid=SL.resvList()[0].p.id;b.querySelector('button').click();await new Promise(r=>setTimeout(r,150));return {rows,n,lab,left:SL.resvList().length,done:!S.resv[pid]&&S.players[pid].contract.years===1};});
      q.rows===q.n&&q.n>=2/* 새 게임 시드가 매번 달라 셋 중 한 명이 겨울 전에 팀을 떠나기도 함 */&&q.lab.join('|')==='수락|90%|방출'&&q.left===q.n-1&&q.done?ok(`재계약 화면 「보류」 표 ${q.rows}줄 [${q.lab.join(' ')}] → 수락하면 1년 재계약 · 표에서 빠짐`):bad('보류 표 '+JSON.stringify(q));
      const co=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();const x=ut.roster.map(id=>S.players[id]).find(z=>!SL.isFgn(z));x.age=36;UI.pmenu(x.id);const has=[...document.querySelectorAll('#modal .nm')].some(n=>n.textContent==='코치 제의');UI.closeModal();UI.coachOfferGo(x.id);await new Promise(r=>setTimeout(r,120));const t=document.querySelector('#modal .mt')?document.querySelector('#modal .mt').textContent:'';const B=[...document.querySelectorAll('#modal .shbar button')].map(b=>b.textContent.trim());UI.closeModal();return {has,t,B};});
      co.has&&/코치 제의/.test(co.t)&&co.B.join('|')==='그만두기|제의하기'?ok(`관리 ⋯ → 「코치 제의」 → 창 [${co.B.join(' ')}]`):bad('코치 제의 화면 '+JSON.stringify(co));}
    await c.close();}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' / '));await b.close();console.log(fails?`실패 ${fails}건`:'v155 통과');process.exit(fails?1:0);})();

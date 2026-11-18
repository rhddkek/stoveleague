// v178 (R149): 겨울리그 — 성장 기대 한 함수(수준 맞음 × 경기 수) · 리그 돈 규모 파견비 · 3주차 중간 · 4주차 끝 · 우리 리그 밖 관심 · 「한국」 고정 문구 없음
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const toWinter=(lg)=>{SL.newGame(17901,2,{games:144,league:lg});const S=SL.state();let g=0;while(S.phase==='season'&&g++<500)SL.playDayAuto();if(SL.finishPost)SL.finishPost();return S;};
// 1. 추천이 한 리그로 쏠리지 않음 · 수준 한참 낮은 리그는 훈련보다 못함
{const S=toWinter('KR');const ut=SL.userTeam();const el=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(SL.dispatchEligible);
  const top=el.map(p=>SL.dispatchOptions(p)[0]);const cn=el.filter(p=>SL.calcOvr(p)>=62).map(p=>SL.dispatchOptions(p).find(o=>o.team.league==='CN'));
  const cnTop=top.filter(o=>o.team.league==='CN').length;
  cnTop<=el.length/3&&cn.every(o=>o.vs<0)?ok(`추천 1순위 중국 ${cnTop}/${el.length} · 62 이상 선수의 중국 파견 = 훈련보다 ↓ (${cn.slice(0,3).map(o=>o.growth).join(' · ')})`):bad('중국 쏠림 '+JSON.stringify({cnTop,n:el.length,cn:cn.map(o=>o.vs)}));
  const sorted=SL.dispatchOptions(el[0]);sorted.every((o,i)=>!i||sorted[i-1].exp>=o.exp)?ok('파견 구단 = 성장 큰 순'):bad('정렬');
  const req=S.dispatch.reqs.map(r=>SL.dispatchOptions(S.players[r.pid]).find(o=>o.team.id===r.team));req.every(o=>o&&o.vs>0)?ok(`파견 요청 ${req.length}건 · 모두 훈련보다 ↑`):bad('요청 '+JSON.stringify(req.map(o=>o&&o.vs)));
  // 2. 진행: 2주 개막 · 3주 중간(끝의 절반) · 4주 끝 → 개막 성장 = 같은 함수
  const pick=el.map(p=>({p,o:SL.dispatchOptions(p)[0]})).filter(x=>x.o.vs>0).slice(0,2);for(const x of pick)SL.dispatchPlayer(x.p.id,x.o.team.id);
  SL.advanceWeek();SL.advanceWeek();const D=S.dispatch;const x0=D.list[0];const p0=S.players[x0.pid];const n2=SL.dispNow(x0);
  SL.advanceWeek();const mid=S.news.find(n=>n.text.startsWith(`[겨울리그] ${p0.name} · 중간`));const n3=SL.dispNow(x0);
  SL.advanceWeek();const fin=S.news.find(n=>n.text.startsWith(`[겨울리그] ${p0.name} · 끝`));const n4=SL.dispNow(x0);
  const gk=SL.isPitcher(p0)?'pG':'g';const half=n3&&n4&&n3.st&&Math.abs(n3.st[gk]-n4.st[gk]/2)<=0.5;
  mid&&fin&&half&&n2&&n2.k==='개막'&&n3.k==='중간'&&n4.k==='끝'&&!/습니다|!/.test(mid.text+fin.text)?ok(`「${mid.text}」 → 「${fin.text}」`):bad('진행 '+JSON.stringify({mid:mid&&mid.text,fin:fin&&fin.text,n3,n4}));
  const ov0=SL.calcOvr(p0);while(S.week<=6)SL.advanceWeek();SL.startNewSeason();const lg=p0.log&&p0.log[0];
  lg&&/겨울리그 파견/.test(lg.label)?ok(`개막 성장 기록 「${lg.label}」 · ${Math.round(ov0)} → ${Math.round(SL.calcOvr(p0))}`):bad('성장 기록 '+JSON.stringify(lg));
  const tr=Object.values(S.players).find(p=>p.teamId===ut.id&&p.log&&p.log[0]&&/동계/.test(p.log[0].label));const reason=tr&&(tr.log[0].why||tr.log[0].f||[]).join?((tr.log[0].why||tr.log[0].f).join(' ')):JSON.stringify(tr&&tr.log[0]);
  !/한국 동계/.test(reason||'')?ok('동계훈련 이유에 「한국」 없음'):bad('한국 동계 '+reason);}
// 3. 파견비 = 리그 돈 규모 · 우리 리그 밖 관심 · 홈 캠프 이름
{const S=toWinter('JP');const ut=SL.userTeam();const p=ut.roster.concat(ut.dev).map(id=>S.players[id]).find(SL.dispatchEligible);const o=SL.dispatchOptions(p).find(o=>o.team.league==='CB');
  o.fee>SL.BAL.DISPATCH.fee.CB?ok(`일본 구단 도미니카 파견비 ${SL.money(o.fee)} (한국 ${SL.money(SL.BAL.DISPATCH.fee.CB)})`):bad('파견비 '+o.fee);
  SL.BAL.CAMP.loc.home.n==='미야자키 캠프'?ok('일본 구단 홈 캠프 「미야자키 캠프」'):bad('캠프 '+SL.BAL.CAMP.loc.home.n);
  const bads=Object.values(S.players).filter(q=>q.interest&&q.teamId===ut.id&&S.teams[q.interest.team].league==='JP');!bads.length?ok('우리 선수 해외 관심 = 일본 밖'):bad('일본 구단이 관심 '+bads.length);}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  for(const [w,h] of [[390,844],[1280,860]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html?test=1'));await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{UI.pickLg('JP');UI.pickTeam(2);UI.newGame();UI.closeModal();const S=SL.state();S.tutorialDone=true;let g=0;while(S.phase==='season'&&g++<500)SL.playDayAuto();if(SL.finishPost)SL.finishPost();UI.closeModal();UI.go('dev','winter');
      const t=document.querySelector('.content').innerText;const st=!!document.querySelector('.wlsteps span.on');const id=SL.userTeam().roster.concat(SL.userTeam().dev).find(i=>SL.dispatchEligible(SL.P(i)));UI.dispatchView(id);const t2=document.querySelector('.content').innerText;
      return {steps:st,sort:/성장 큰 순/.test(t),vs:/훈련 [+−]\d+%/.test(t),kr:/한국/.test(t+t2),btn:[...document.querySelectorAll('.content button')].some(x=>x.textContent.trim()==='동계훈련'),ow:document.documentElement.scrollWidth>innerWidth+1};});
    r.steps&&r.sort&&r.vs&&!r.kr&&r.btn&&!r.ow?ok(`${w}px 일본 구단 겨울리그: 일정 줄 · 성장 큰 순 · 「훈련 ±n%」 · 「한국」 없음 · [동계훈련]`):bad(`${w}px `+JSON.stringify(r));}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v178 통과');process.exit(fails?1:0);})();

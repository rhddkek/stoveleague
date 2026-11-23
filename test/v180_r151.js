// v180 (R151): 팀 전략(맞는 선수만 덤 · 실제 경기 결과가 달라짐) · 선수 이벤트(실제 기록 · 화면 확률 = 실제) · 난이도 자금 · 도전(전 리그 · 꼴찌 재건)
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const season=(seed,st,opt)=>{SL.newGame(seed,2,Object.assign({games:144},opt||{}));const S=SL.state();const ut=SL.userTeam();if(st)SL.styleSet(st);let g=0;while(S.phase==='season'&&S.day<=144&&g++<400){if(S.pev&&S.pev.open){const o=SL.pevOptions();SL.pevAnswer(o[0].k);}SL.playDayAuto();}return {S,ut,q:SL.styleStat(ut)};};
// 1. 팀 전략: 도루 · 홈런이 실제로 달라짐 · AI 구단은 그대로 · 균형은 예전과 같음
{const a=season(18101,null),w0=a.ut.rec.w,q0=a.q;const b=season(18101,'bal');const r=season(18101,'run'),qr=r.q;const g=season(18101,'big'),qg=g.q;
  b.ut.rec.w===w0&&b.q.sb===q0.sb&&b.q.hr===q0.hr?ok(`균형 = 전략 없음과 같은 시즌 (${w0}승 · 도루 ${q0.sb} · 홈런 ${q0.hr})`):bad('균형이 다름 '+JSON.stringify([w0,b.ut.rec.w,q0,b.q]));
  qr.sb+qr.cs>(q0.sb+q0.cs)*1.3?ok(`뛰는 야구: 도루 시도 ${q0.sb+q0.cs} → ${qr.sb+qr.cs}`):bad('뛰는 야구 '+JSON.stringify([q0,qr]));
  qg.sb+qg.cs<(q0.sb+q0.cs)*0.75&&qg.hr>=q0.hr-6?ok(`빅볼: 도루 시도 ${q0.sb+q0.cs} → ${qg.sb+qg.cs} · 홈런 ${q0.hr} → ${qg.hr}`):bad('빅볼 '+JSON.stringify([q0,qg]));
  const ai=Object.values(r.S.teams).find(t=>!t.isUser&&t.league==='KR');ai.style='run';SL.styleOf(ai)===null&&SL.styleOf(r.ut)==='run'?ok('AI 구단은 전략 효과 없음(기준값)'):bad('AI 전략');
  const R=SL.styleRows(r.ut);const f=R.find(x=>x.k==='run').fit;const real=r.ut.lineup.filter(id=>r.S.players[id].attrs.speed>=SL.STYLE_FX.th).length;f.n===real&&f.of===r.ut.lineup.length&&R.length===5?ok(`맞는 타자 ${f.n} / ${f.of} = 실제 주력 ${SL.STYLE_FX.th} 이상 수`):bad('적합 '+JSON.stringify([f,real]));
  // 2. 선수 이벤트: 시즌 5건 안 · 한 선수 한 번 · 문장 없음
  const ev=a.S.news.filter(n=>/^\[선수 이벤트\]/.test(n.text)).map(n=>n.text);const open=ev.filter(t=>/· (슬럼프|특훈 요청|스킬 조짐)$/.test(t));const names=open.map(t=>t.split(' ')[2]);
  open.length>=2&&open.length<=SL.PEV.max&&new Set(names).size===names.length&&ev.every(t=>!/습니다|하세요|!/.test(t))?ok(`선수 이벤트 ${open.length}건 · 「${ev[ev.length-1]}」 → 「${ev[ev.length-2]}」`):bad('이벤트 '+JSON.stringify(ev));}
// 3. 화면 확률 = 실제 · 비용 · 답 없으면 맨 끝 선택
{SL.newGame(18102,2,{games:144});const S=SL.state();const ut=SL.userTeam();let g=0;while(!(S.pev&&S.pev.open)&&g++<140)SL.playDayAuto();const v=SL.pevInfo();
  if(!v)bad('이벤트가 안 생김');else{const o=v.opts;const p=S.players[v.pid];const okText=o.every(x=>x.odds==null||x.d.includes(`성공 ${Math.round(x.odds*100)}%`));const last=o[o.length-1];
    okText&&o.length===3&&last.odds==null?ok(`${v.name} · ${v.ko} · ${o.map(x=>x.t+'('+x.d+')').join(' / ')}`):bad('선택지 '+JSON.stringify(o));
    const c0=S.clock;let k=0;while(S.pev.open&&k++<8)SL.playDayAuto();const ln=S.news.find(n=>n.text.includes('(답 없음)'));!S.pev.open&&ln&&ln.text.includes(last.t)?ok(`답 없음 ${S.clock-c0}일 뒤 → 「${ln.text}」`):bad('자동 선택 '+JSON.stringify([S.pev,ln&&ln.text]));}
  // 스킬: 비용 차감 · 획득
  S.pev.open={id:99,k:'skill',pid:ut.lineup[0],d:S.day,exp:S.clock+3,sk:(()=>{const p=S.players[ut.lineup[0]];p.sk=[];return SL.SK_ROWS.find(r=>r[1]==='C')[0];})()};const p=S.players[ut.lineup[0]];const c1=ut.cash;const o=SL.pevOptions()[0];const r=SL.pevAnswer('coach');
  r.ok&&ut.cash===c1-o.cost&&(r.win?p.sk.some(x=>x[0]===S.pev.last.res.replace(/[「」 획득]/g,'')||true):true)&&(r.win===(p.sk.length===1))?ok(`전담 코치: ${SL.money(o.cost)} 차감 · ${r.res}`):bad('스킬 '+JSON.stringify([r,p.sk,c1-ut.cash]));}
// 4. 난이도 자금 · 도전: 전 리그 · 꼴찌 재건
{const cash=d=>{SL.newGame(18103,2,{games:36,diff:d});return SL.userTeam().cash;};const n=cash('normal'),e=cash('easy'),h=cash('hard');Math.abs(e/n-1.2)<0.01&&Math.abs(h/n-0.8)<0.01?ok(`시작 자금 쉬움 ${SL.money(e)} · 보통 ${SL.money(n)} · 어려움 ${SL.money(h)}`):bad('난이도 자금 '+[e,n,h]);
  const out=[];for(const lg of ['KR','JP','US','TW']){SL.newGame(18104,4,{games:36,league:lg,scen:'rebuild'});const S=SL.state();const ut=SL.userTeam();const st=SL.standings(SL.compOf(ut));const str=t=>{const ids=t.lineup.concat(t.rotation);return ids.reduce((a,i)=>a+SL.calcOvr(S.players[i]),0)/ids.length;};const weakest=st.slice().sort((a,b)=>str(a)-str(b))[0];
    if(weakest.id!==ut.id||!S.scen||S.scen.k!=='rebuild'||ut.lineup.length!==9||!S.budget)bad(`${lg} 꼴찌 재건 `+JSON.stringify([ut.name,weakest.name,S.scen]));out.push(`${lg} ${ut.name}(${SL.scenGoal('rebuild')})`);}
  ok('꼴찌 재건 = 최약체 구단 부임: '+out.join(' · '));
  SL.newGame(18105,2,{games:36,league:'JP',scen:'inj'});const S=SL.state();S.scen&&S.scen.k==='inj'&&S.scen.who.length===5&&SL.scenGoal('inj')==='3위 안'?ok('일본 구단 「부상 병동」 · 목표 3위 안'):bad('일본 부상 병동 '+JSON.stringify(S.scen));
  // 재건 판정: 1 · 2년째 실패면 계속, 3년째 실패 확정 / 성공은 바로
  SL.newGame(18106,2,{games:36,scen:'rebuild'});const X=SL.state().scen;const J=(s,r)=>{SL.state().season=s;SL.scenJudge({user:{rank:r}});return X.res;};const a=J(1,9),b=J(2,8),c=J(3,8);!a&&!b&&c&&c.ok===false?ok('재건 판정: 1 · 2년째 계속 → 3년째 실패'):bad('재건 판정 '+JSON.stringify([a,b,c]));
  SL.newGame(18106,2,{games:36,scen:'rebuild'});const X2=SL.state().scen;SL.state().season=2;SL.scenJudge({user:{rank:4}});X2.res&&X2.res.ok?ok('재건 판정: 2년째 4위 → 성공'):bad('재건 성공 '+JSON.stringify(X2.res));}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html');
  for(const [w,h] of [[390,844],[1280,860]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    // 5. 새 게임 화면: 난이도 · 도전이 고급 설정 밖
    const n=await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/새 야구 인생|새 게임/.test(e.textContent));if(x)x.click();UI.set('newDiff','hard');UI.set('newScen','rebuild');UI.ngStep(3);   /* v192: 난이도 · 도전 = 셋째 걸음 */const o=document.querySelector('.ngopt');const d=document.querySelector('details.adv');return {out:!!o&&!o.closest('details'),chips:o?[...o.querySelectorAll('button')].map(x=>x.textContent).join('|'):'',why:o?[...o.querySelectorAll('.dfwhy')].map(x=>x.textContent).join(' / '):'',adv:d?/난이도|도전/.test(d.textContent):null,vis:o?o.getBoundingClientRect().height>40:false};});
    n.out&&/쉬움\|보통\|어려움\|없음\|꼴찌 재건\|부상 병동\|지원 중단\|중반 구원/.test(n.chips)&&/자금 −20%/.test(n.why)&&/최약체/.test(n.why)&&n.adv===false&&n.vis&&!/습니다/.test(n.why)?ok(`${w}px 새 게임: 난이도 · 도전 바로 보임 (${n.why})`):bad(`${w}px 새 게임 `+JSON.stringify(n));
    // 6. 팀 전략 화면 · 선수 이벤트 창
    const r=await p.evaluate(()=>{UI.set('newDiff','normal');UI.set('newScen','');UI.pickLg('KR');UI.pickTeam(2);UI.newGame();UI.tutSkip();const S=SL.state();UI.setTab('home');const rec=[...document.querySelectorAll('.content *')].some(e=>e.children.length===0&&/^팀 전략 · /.test(e.textContent));
      UI.go('roster','style');const rows=[...document.querySelectorAll('.styler')];const t0=document.querySelector('.content').innerText;const btn=rows[1].querySelector('button');btn.click();const on=document.querySelector('.styler.on .nm').textContent;const st=SL.userTeam().style;
      let g=0;while(!(S.pev&&S.pev.open)&&g++<140)SL.playDayAuto();UI.closeModal();UI.setTab('home');const todo=[...document.querySelectorAll('.content *')].some(e=>e.children.length===0&&/선수 이벤트/.test(e.textContent));UI.pev();const m=document.getElementById('modal');const opts=m?[...m.querySelectorAll('.gopt')].map(x=>x.innerText.replace(/\n/g,' = ')):[];const mh=m?m.innerText:'';if(m)m.querySelector('.gopt:last-child').click();
      return {rec,rows:rows.length,fit:/맞는 타자 \d+ \/ 9/.test(t0)&&/맞는 투수 \d+ \/ \d+/.test(t0),on,st,todo,opts,sent:/습니다|하세요/.test(t0+mh),closed:!document.getElementById('modal'),open:!!S.pev.open,ow:document.documentElement.scrollWidth>innerWidth+1};});
    r.rows===5&&r.fit&&/뛰는 야구/.test(r.on)&&r.st==='run'&&r.todo&&r.opts.length===3&&!r.sent&&r.closed&&!r.open&&!r.ow?ok(`${w}px: 팀 전략 5줄 · 선택 → 「${r.on.trim()}」 · 할 일에 선수 이벤트 · 선택지 ${r.opts.length}개 → 답하면 닫힘${r.rec?' · 감독실 추천 줄':''}`):bad(`${w}px 화면 `+JSON.stringify(r));}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v180 통과');process.exit(fails?1:0);})();

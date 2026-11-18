// v183 (R154): 구단 재력(모기업 · 연고 시장) — 부자 · 보통 · 가난이 시작 현금 · 지원금 · FA 입찰 · 현금 한도에 실제로 반영 · 화면 표시
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
// 1. 나뉨 · 시작 현금
{const out=[];for(const lg of ['KR','JP','US','TW']){SL.newGame(18301,0,{games:36,league:lg});const S=SL.state();const ts=Object.values(S.teams).filter(t=>t.league===lg&&!t.farm&&t.roster.length>=20&&(t.tier==null||t.tier===1));const g={1:[],2:[],3:[]};for(const t of ts)g[SL.wealthOf(t)].push(t.cash);
  const r=g[3].length&&g[1].length?avg(g[3])/avg(g[1]):0;if(!g[1].length||!g[3].length||r<1.4)bad(`${lg} 나뉨 `+JSON.stringify({n:[g[1].length,g[2].length,g[3].length],r}));out.push(`${lg} 가난 ${g[1].length} · 보통 ${g[2].length} · 부자 ${g[3].length} (현금 ×${r.toFixed(2)})`);}
  ok('재력 나뉨 · 시작 현금 부자/가난: '+out.join(' / '));
  const S=SL.state();const by=n=>Object.values(S.teams).find(t=>t.name===n);const ny=by('뉴욕 스카이라인스'),kc=by('캔자스시티 스모크스');SL.wealthOf(ny)===3&&SL.wealthOf(kc)===1?ok('미국: 뉴욕 부자 · 캔자스시티 가난(연고 시장)'):bad('미국 시장 '+[SL.wealthOf(ny),SL.wealthOf(kc)]);}
// 2. 지원금: 같은 성적이면 부자 1.3 · 가난 0.75 배
{SL.newGame(18302,0,{games:144});const S=SL.state();const by=n=>Object.values(S.teams).find(t=>t.name===n);const R=by('서울 머스탱스'),P=by('서울 피닉스'),M=by('수원 울브스');const g=t=>SL.grantFor(t,80,64,3,10).total;
  Math.abs(g(R)/g(M)-1.3)<0.02&&Math.abs(g(P)/g(M)-0.75)<0.02?ok(`지원금(80승 64패 · 3위): 부자 ${SL.money(g(R))} · 보통 ${SL.money(g(M))} · 가난 ${SL.money(g(P))}`):bad('지원금 '+[g(R),g(M),g(P)]);}
// 3. FA 입찰: 부자 구단이 더 자주 · 더 높게
{const n={1:0,2:0,3:0},c={1:0,2:0,3:0},sal={1:[],2:[],3:[]};for(const seed of [18303,18304]){SL.newGame(seed,2,{games:36});const S=SL.state();let k=0;while(S.phase==='season'&&k++<300)SL.playDayAuto();if(SL.finishPost)SL.finishPost();const seen=new Set();
  for(const t of SL.krTeams()){if(t.isUser)continue;c[SL.wealthOf(t)]++;}
  for(let w=0;w<4&&S.phase==='offseason';w++){for(const id in (S.faM&&S.faM.m)||{}){const F=S.faM.m[id];for(const b of F.bids||[]){const key=id+':'+b.team+':'+b.w;if(seen.has(key))continue;seen.add(key);const t=S.teams[b.team];if(!t||t.isUser||t.league!=='KR')continue;const w=SL.wealthOf(t);n[w]++;sal[w].push(b.sal/F.ask.sal);}}SL.advanceWeek();}
  for(const x of S.news.filter(x=>/^\[FA\] /.test(x.text)))0;}
  const per=w=>n[w]/Math.max(1,c[w]);per(3)>per(1)?ok(`FA 제시(구단당): 부자 ${per(3).toFixed(1)} · 보통 ${per(2).toFixed(1)} · 가난 ${per(1).toFixed(1)} · 요구 대비 연봉 부자 ${avg(sal[3]).toFixed(2)} · 가난 ${avg(sal[1]).toFixed(2)}`):bad('FA 입찰 '+JSON.stringify({n,c}));}
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  for(const [w,h] of [[390,844],[1280,860]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html'));await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/새 야구 인생|새 게임/.test(e.textContent));x&&x.click();UI.pickLg('KR');UI.pickTeam(9);const o={pick:(document.querySelector('.tdetail .wltag')||{}).textContent};UI.pickLg('US');UI.pickTeam(0);o.us=(document.querySelector('.tdetail .wltag')||{}).textContent;
      UI.pickLg('KR');UI.pickTeam(0);UI.newGame();UI.tutSkip();UI.go('club','mgr');o.mgr=[...document.querySelectorAll('.wll')].map(e=>e.innerText.replace(/\s+/g,' ')).join('');const t=Object.values(SL.state().teams).find(t=>t.name==='서울 피닉스');UI.teamSheet(t.id);o.sheet=(document.querySelector('#modal .wltag')||{}).textContent;UI.closeModal();UI.go('club','pres');o.pres=[...document.querySelectorAll('.wlrow')].map(e=>e.innerText.replace(/\s+/g,' ')).join('');o.ow=document.documentElement.scrollWidth>innerWidth+1;return o;});
    r.pick==='모기업 ★☆☆'&&r.us==='시장 ★★★'&&/모기업 ★★★ 지원금 \+30% · 시작 자금 \+30%/.test(r.mgr)&&r.sheet==='모기업 ★☆☆'&&!r.ow?ok(`${w}px: 새 게임 피닉스 「${r.pick}」 · 뉴욕 「${r.us}」 · 내 팀 「${r.mgr}」 · 구단 창 「${r.sheet}」${r.pres?` · 위상 「${r.pres}」`:''}`):bad(`${w}px 화면 `+JSON.stringify(r));}
  await b.close();if(errs.length)bad('화면 오류 '+errs.slice(0,3).join(' | '));console.log(fails?`실패 ${fails}`:'v183 통과');process.exit(fails?1:0);})();

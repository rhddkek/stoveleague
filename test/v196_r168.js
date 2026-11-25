// v196 (R168): 감독실 대시보드(휴대폰 시즌) — 진행 막대 · 팀 전력(순위) · 일정 띠 · BEST 타자/투수 · 미니 순위표 = 실제 값
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h,days)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(d=>{UI.setSeed(24680);UI.pickLg('KR');UI.pickTeam(9);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();for(let i=0;i<d;i++)SL.playDayAuto();UI.closeModal();UI.setTab('home');UI.closeModal();},days);await p.waitForTimeout(300);return p;};
  const p=await mk(390,844,20);
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const G=S.schedule.filter(g=>SL.isUserGame(g)&&!g.post);const done=G.filter(g=>g.res).length;const a=document.querySelector('#app');
      const ts=Object.values(S.teams).filter(t=>t.league==='KR'&&SL.krTeams().some(x=>x.id===t.id));const pw=ts.map(t=>UI.teamPower(t)).sort((x,y)=>y-x);const me=UI.teamPower(ut);
      const chips=[...a.querySelectorAll('.dss .dsc')];const past=G.filter(g=>g.res).slice(-2);const nx=G.filter(g=>!g.res)[0];const opp=S.teams[nx.home===ut.id?nx.away:nx.home];
      const res0=past.map(g=>{const h=g.home===ut.id;const m=h?g.res.hs:g.res.as,o=h?g.res.as:g.res.hs;return `${m>o?'승':m<o?'패':'무'} ${m}:${o}`;});
      return {pl:(a.querySelector('.dspl')||{}).textContent,want:`시즌 ${done}/${G.length}경기`,pw:(a.querySelector('.dspw')||{}).textContent,wantPw:`팀 전력 ${me.toLocaleString()} · ${pw.findIndex(x=>x<=me)+1}위`,n:chips.length,c0:chips.slice(0,2).map(x=>x.querySelector('b').textContent),res0,now:(a.querySelector('.dsc.now i')||{}).textContent,opp:UI.tShort(opp),
        mis:!!a.querySelector('.misl')&&getComputedStyle(a.querySelector('.misl')).display!=='none',rows:[...a.querySelectorAll('.hrows .tile')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.querySelector('.th span').textContent.trim()),hide:a.querySelectorAll('.fithide').length};});
    r.pl===r.want&&r.pw===r.wantPw&&r.n===6&&JSON.stringify(r.c0)===JSON.stringify(r.res0)&&r.now===r.opp&&r.mis&&r.hide===0&&r.rows.some(x=>/받은 소식/.test(x))&&!r.rows.some(x=>/순위 경쟁/.test(x))?ok(`「${r.pl}」 · 「${r.pw}」 · 일정 띠 6칸(지난 ${r.c0.join(', ')} · 오늘 ${r.now}) · 미션 줄 · 줄 목록 [${r.rows.join(', ')}] · 감춘 것 0`):bad('대시보드 위 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const a=document.querySelector('#app');const B=UI.bestOf();const rows=[...a.querySelectorAll('.dsbr')];const st=SL.standings(SL.compOf(ut));const i=st.findIndex(t=>t.id===ut.id);
      const sr=[...a.querySelectorAll('.dsr')];const me=a.querySelector('.dsr.me');
      return {bat:B.bat&&B.bat.name,pit:B.pit&&B.pit.name,shown:rows.map(x=>x.querySelector('b').textContent),line:rows[0]&&rows[0].querySelector('em').textContent,want:B.bat?(L=>`${L.avg} · ${L.hr}홈런 · OPS ${L.ops}`)(SL.statLine(B.bat,B.bat.cur)):'',sr:sr.length,meRank:me&&+me.querySelector('b').textContent,rank:i+1,meRec:me&&me.querySelector('i').textContent,rec:`${ut.rec.w}승 ${ut.rec.l}패`};});
    JSON.stringify(r.shown)===JSON.stringify([r.bat,r.pit].filter(Boolean))&&r.line===r.want&&r.sr===5&&r.meRank===r.rank&&r.meRec===r.rec?ok(`BEST 타자 ${r.bat}(${r.line}) · 투수 ${r.pit} · 미니 순위 5줄 · 우리 ${r.meRank}위 ${r.meRec}`):bad('대시보드 아래 '+JSON.stringify(r));}
  {const r=await p.evaluate(()=>{document.querySelector('#app .dsst').click();const a=(document.querySelector('#app .htabs2 button.on')||document.querySelector('#app .htabs button.on')||{}).textContent;UI.setTab('home');document.querySelector('#app .dss').click();const b2=(document.querySelector('#app .htabs button.on')||{}).textContent;UI.setTab('home');document.querySelector('#app .dsbr').click();const m=!!document.querySelector('#modal .pck');UI.closeModal();return {a,b2,m};});
    /순위/.test(r.a||'')&&/일정/.test(r.b2||'')&&r.m?ok(`누르면: 순위표 · 일정 · 선수 카드`):bad('누름 '+JSON.stringify(r));}
  // 개막 첫날(기록 없음): BEST 없음 · 띠는 오늘부터
  {const q=await mk(390,844,0);const r=await q.evaluate(()=>{const a=document.querySelector('#app');return {best:!!a.querySelector('.dsbest'),n:a.querySelectorAll('.dss .dsc').length,now:!!a.querySelector('.dsc.now'),pl:(a.querySelector('.dspl')||{}).textContent};});
    !r.best&&r.n===4&&r.now&&/^시즌 0\//.test(r.pl)?ok(`개막 첫날: BEST 없음 · 띠 ${r.n}칸(오늘부터) · 「${r.pl}」`):bad('개막 첫날 '+JSON.stringify(r));}
  // PC는 그대로
  {const q=await mk(1280,860,5);const r=await q.evaluate(()=>!document.querySelector('#app .dshb')&&!document.querySelector('#app .dsst'));r?ok('PC 감독실 그대로'):bad('PC에 대시보드');}
  // 경기 준비: 양 팀 선발 라인업 = 실제 타순 · [결과만 │ 하이라이트 │ ▶ 직접 보기]
  {const q=await mk(390,844,3);const r=await q.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const g=SL.userGameToday();const gi=S.schedule.indexOf(g);UI.prematch(gi);const m=document.querySelector('#modal');const O=S.teams[g.home===ut.id?g.away:g.home];
      const cols=[...m.querySelectorAll('.pmlc')].map(c=>[...c.querySelectorAll('.pmlr b')].map(x=>x.textContent));const want=[ut,O].map(t=>t.lineup.slice(0,9).map(id=>S.players[id].name));
      return {same:JSON.stringify(cols)===JSON.stringify(want),n:cols.map(c=>c.length),btn:[...m.querySelectorAll('.pmgo3 button b')].map(x=>x.textContent)};});
    r.same&&r.btn.join('|')==='결과만|하이라이트|▶ 직접 보기'?ok(`경기 준비: 선발 라인업 ${r.n.join(' · ')}명 = 실제 타순 · [${r.btn.join(' │ ')}]`):bad('경기 준비 '+JSON.stringify(r));
    const h=await q.evaluate(()=>{[...document.querySelectorAll('#modal .pmgo3 button')][1].click();const lg=SL.state().liveGame;const t=(document.querySelector('.cmgo .gold')||{}).textContent||'';return {live:!!lg,t};});
    h.live&&/다음 장면/.test(h.t)?ok(`하이라이트 → 경기 화면 · 진행 「${h.t.trim()}」`):bad('하이라이트 '+JSON.stringify(h));
    const f=await q.evaluate(()=>{UI.step('game');UI.endGame&&UI.endGame();UI.closeModal();UI.setTab('home');const S=SL.state();const g=SL.userGameToday();if(!g)return {no:1};const r0=SL.userTeam().rec.w+SL.userTeam().rec.l;UI.prematch(S.schedule.indexOf(g));[...document.querySelectorAll('#modal .pmgo3 button')][0].click();return {d:SL.userTeam().rec.w+SL.userTeam().rec.l-r0,live:!!S.liveGame};});
    f.no||(f.d===1&&!f.live)?ok('결과만 → 한 경기 자동 · 경기 화면 없음'):bad('결과만 '+JSON.stringify(f));}
  // 작전 창: 큰 단추 격자 · 쓸 수 있는 것 먼저 · 못 쓰는 것은 흐리게 + 이유 · 전부 보임(접지 않음)
  {const q=await mk(390,844,3);const r=await q.evaluate(()=>{UI.startGame();const S=SL.state();const lg=S.liveGame;const my=lg.home===SL.userTeam().id?1:0;let g=0;while(lg.half!==my&&!lg.done&&g++<40)UI.step('pa');UI.cmSheet('tac');const m=document.querySelector('#modal');const B=[...m.querySelectorAll('.tacg .tacbig')];
      const keys=Object.keys(SL.TACTICS).filter(x=>SL.TACTICS[x].side==='off');const k=B.findIndex(x=>x.disabled);return {n:B.length,want:keys.length,fold:!!m.querySelector('details.tacno'),order:k<0||B.slice(k).every(x=>x.disabled),why:B.filter(x=>x.disabled).every(x=>x.querySelector('small').textContent.length>0),cols:getComputedStyle(m.querySelector('.tacg')).gridTemplateColumns.split(' ').length};});
    r.n===r.want&&!r.fold&&r.order&&r.why&&r.cols===2?ok(`작전 창: 큰 단추 ${r.n}개 2열 · 쓸 수 있는 것 먼저 · 못 쓰는 것 이유 한 줄 · 접힘 없음`):bad('작전 창 '+JSON.stringify(r));}
  // 시설: 건물 그림 + 별 5칸 = 실제 레벨
  {const q=await mk(390,844,1);const r=await q.evaluate(()=>{UI.go('club','fac');const ut=SL.userTeam();const I=SL.invOf(ut);const ks=Object.keys(SL.BAL.FACILITY).concat(Object.keys(SL.INV.fac));const F=[...document.querySelectorAll('#app .facgrid.fpic .fac')];
      return {n:F.length,want:ks.length,pic:F.every(x=>{const e=x.querySelector('.fpp');return e&&/^url\(/.test(getComputedStyle(e).backgroundImage);}),stars:F.map(x=>x.querySelectorAll('.fstar i').length+'/'+x.querySelectorAll('.fstar i.on').length).join(' '),lv:ks.map(k=>'5/'+(SL.INV.fac[k]?(I[k]||0):ut.fac[k])).join(' ')};});
    r.n===r.want&&r.pic&&r.stars===r.lv?ok(`시설: 건물 그림 ${r.n}칸 · 별 = 레벨 [${r.stars}]`):bad('시설 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v196 검사 통과');process.exit(fails?1:0);})();

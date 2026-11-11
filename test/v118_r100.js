// v118 (R100): 리그 경쟁 · 감독 · 기록 현실화 — FA 요구액(최대 1.9배, 대형은 1.3배) · AI 구단의 대형 FA 제시·더 나은 FA 영입 · 은퇴 늦춤 ·
//   능력 82 초과분 절반 반영 · 상대 감독 보기 · 성적 부진 해임(경고 → 해임 → 새 구단) · 은퇴 선수가 코치 후보로
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. FA 요구액: 종합이 높을수록 배율이 줄어 84 이상은 평소 연봉의 1.3배 (전에는 2.6배) · 중간급은 1.9배를 넘지 않음
  {const r=await p.evaluate(()=>{SL.newGame(4096,1,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const kr=SL.krTeams().flatMap(t=>t.roster.map(id=>S.players[id])).filter(q=>(q.nat||'KR')==='KR'&&q.age>=24&&q.age<=32);
      const ratio=q=>SL.faAskOf(q).sal/SL.salaryFor(q);const o=q=>SL.calcOvr(q);const top=kr.filter(q=>o(q)>=84).map(ratio),mid=kr.filter(q=>o(q)>=66&&o(q)<=74).map(ratio);return {top:top.map(x=>+x.toFixed(2)),midMax:+Math.max(...mid).toFixed(2),midMin:+Math.min(...mid).toFixed(2)};});
    r.midMax<=1.92&&r.midMin>=1.6&&r.top.every(x=>x<=1.32)?ok(`FA 요구액 배율: 종합 66~74 ${r.midMin}~${r.midMax}배 · 84 이상 ${r.top.join(',')||'(해당 선수 없음)'}배`):bad('FA 요구액 '+JSON.stringify(r));}

  // 2. 상대 감독: 리그 → 순위표에서 구단 줄을 누르면 구단 창(팝업)에 「순위 · 성적 · 감독 이름 · 나이 · n년차 · 성향」 · 경기 전 준비에 「상대 감독」
  {const r=await p.evaluate(()=>{const S=SL.state();UI.autoDays(3);UI.closeModal();const t=SL.krTeams().find(x=>!x.isUser);const B=SL.bossInfo(t.id);UI.go('league','table');const row=[...document.querySelectorAll('.content table tr')].find(tr=>tr.innerText.includes(t.name));row.click();const pn=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();
      const g=SL.userGameToday();let pm='';if(g){UI.prematch(S.schedule.indexOf(g));pm=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();}return {B,pn:(pn.match(/[^\n]*감독 [^\n]+/)||[''])[0],pm:(pm.match(/상대 감독 [^\n]+/)||[''])[0],mine:SL.bossInfo(SL.userTeam().id)};});
    r.B&&r.B.name&&r.pn.includes(r.B.name)&&/\d+세 · \d+년차 · /.test(r.pn)&&/상대 감독 \S+/.test(r.pm)&&r.mine===null?ok(`상대 감독: 구단 정보 「${r.pn}」 · 경기 전 준비 「${r.pm}」`):bad('상대 감독 '+JSON.stringify(r));}

  // 3. 해임: 첫 해 「목표 미달 + 최하위권」 → 결산에 구단주 경고 / 둘째 해도 같으면 해임 → 감독실 맨 위 「새 구단 선택」, 진행 단추는 선택 창 → [부임] → 새 구단, 옛 구단엔 새 감독
  {const r=await p.evaluate(()=>{const S=SL.state();const out={};const weak=()=>{const ut=SL.userTeam();for(const id of ut.roster){const q=S.players[id];for(const k in q.attrs)if(typeof q.attrs[k]==='number')q.attrs[k]=Math.min(q.attrs[k],32);}};const end=()=>{let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');};
      weak();end();const m1=S.mgr.seasons.slice(-1)[0];out.s1={rank:m1.rank,met:m1.goalMet,sack:SL.sackPending()};UI.seasonRecap();out.recap1=(document.querySelector('#modal').innerText.match(/구단주 경고[^\n]*/)||[''])[0];UI.closeModal();
      SL.renewAll();SL.testCmd('nextSeason');weak();end();out.sack=SL.sackPending();out.offers=(S.jobOffers||[]).map(o=>o.kind);UI.seasonRecap();out.recap2=(document.querySelector('#modal').innerText.match(/해임 · [^\n]*/)||[''])[0];UI.closeModal();
      UI.setTab('home');out.home=/감독 해임/.test(document.querySelector('.content').innerText)&&/새 구단 선택/.test(document.querySelector('.content').innerText);const old=SL.userTeam();UI.advanceWeek();const m=document.querySelector('#modal');out.block=!!m&&/감독 해임/.test(m.innerText)&&S.week===1;out.stay=[...document.querySelectorAll('#modal button')].some(x=>/잔류/.test(x.textContent));
      [...m.querySelectorAll('button')].find(x=>x.textContent.trim()==='부임').click();out.moved=SL.userTeam().id!==old.id;out.pend=SL.sackPending();out.oldBoss=SL.bossInfo(old.id);UI.closeModal();return out;});
    r.s1.rank>=9&&r.s1.met===false&&!r.s1.sack&&/구단주 경고/.test(r.recap1)&&r.sack&&r.offers.length>=2&&r.offers.every(k=>k==='sack')&&/해임 · \d년 연속 목표 미달/.test(r.recap2)&&r.home&&r.block&&!r.stay&&r.moved&&!r.pend&&r.oldBoss&&r.oldBoss.name
      ?ok(`해임: 1년차 ${r.s1.rank}위 「${r.recap1}」 → 2년차 「${r.recap2}」 → 감독실 「새 구단 선택」 ${r.offers.length}곳 · 진행 막힘 → [부임] → 옛 구단 새 감독 ${r.oldBoss.name}`):bad('해임 '+JSON.stringify(r));}

  // 4. 은퇴 선수가 코치 후보로: 은퇴 명단이 있으면 후보 가운데 「선수 출신 · 前 구단 포지션」
  {const r=await p.evaluate(()=>{const S=SL.state();S.exPool=[];for(let i=0;i<30;i++)S.exPool.push({name:'은퇴선수'+i,pos:i%2?'SP':'SS',age:36,team:'대구 블레이즈',s:S.season,link:i%5===0,used:0});SL.refreshStaffPool();const ex=S.staffPool.filter(c=>c.ex);UI.go('roster','staff');const d=ex[0]?ex[0].dept:'bat';UI.coachScout(d);let seen='';for(let i=0;i<8;i++){const t=(document.querySelector('#modal')||{}).innerText||'';const mm=t.match(/선수 출신 · 前 [^\n]+/);if(mm){seen=mm[0];break;}const nx=document.querySelector('#modal [aria-label="다음 후보"]');if(!nx||nx.disabled)break;nx.click();}UI.closeModal();
      return {n:ex.length,pit:ex.filter(c=>c.dept==='pit').every(c=>/선발|불펜|투수|SP/.test(c.bio)),bio:ex[0]&&ex[0].bio,seen,used:S.exPool.filter(x=>x.used).length};});
    r.n>0&&r.used===r.n&&/선수 출신 · 前 대구 블레이즈/.test(r.bio)&&r.seen?ok(`은퇴 선수 코치 후보 ${r.n}명 — 「${r.seen}」`):bad('은퇴 선수 코치 '+JSON.stringify(r));}

  // 5. 한 시즌(144경기) 기록: 홈런 1위 ≤ 55 · 규정 타석 타율 1위 ≤ .395 · 규정 이닝 평균자책 1위 ≥ 1.50 · 리그 타율 .245~.285
  {const r=await p.evaluate(()=>{SL.newGame(2026,2,{arch:true,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();let k=0;while(S.phase!=='offseason'&&k++<40)SL.testCmd('endSeason');UI.closeModal();const s=S.season;const ids=new Set(SL.krTeams().map(t=>t.id));let ab=0,h=0;const L=[];for(const id in S.players){const q=S.players[id];const hs=(q.hist||[]).find(x=>x.s===s);if(!hs||!ids.has(hs.team))continue;L.push(hs.st);ab+=hs.st.ab||0;h+=hs.st.h||0;}
      return {hr:Math.max(...L.map(st=>st.hr||0)),avg:Math.max(...L.filter(st=>st.pa>=446).map(st=>st.h/st.ab)),era:Math.min(...L.filter(st=>st.pOuts>=432).map(st=>st.pER*27/st.pOuts)),lg:h/ab};});
    r.hr<=55&&r.hr>=28&&r.avg<=0.395&&r.era>=1.5&&r.lg>=0.245&&r.lg<=0.285?ok(`한 시즌 기록: 홈런 1위 ${r.hr} · 타율 1위 ${r.avg.toFixed(3)} · 평균자책 1위 ${r.era.toFixed(2)} · 리그 타율 ${r.lg.toFixed(3)}`):bad('기록 '+JSON.stringify(r));}

  // 6. 겨울 FA 시장: 종합 76 이상 국내 주요 FA에도 AI 구단 제시가 붙음 (전에는 거의 「경쟁 0」) · 개막 때 종합 75 이상 국내 FA가 무소속으로 남지 않음(외국인 정원 제외)
  {const r=await p.evaluate(()=>{const S=SL.state();const o=q=>SL.calcOvr(q);let big=0,bid=0;for(let w=0;w<3;w++){for(const id in ((S.faM&&S.faM.m)||{})){const q=S.players[+id];const F=S.faM.m[id];if(q&&(q.nat||'KR')==='KR'&&o(q)>=76){big++;if(F.bids.length)bid++;}}SL.advanceWeek();UI.closeModal();}
      SL.renewAll();SL.testCmd('nextSeason');UI.closeModal();const left=S.fa.map(id=>S.players[id]).filter(q=>q&&(q.nat||'KR')==='KR'&&o(q)>=75&&q.age<=33).map(q=>q.age+'/'+Math.round(o(q)));return {big,bid,left};});
    (r.big===0||r.bid>0)&&r.left.length<=1?ok(`겨울 FA: 종합 76 이상 국내 FA ${r.big}번 가운데 ${r.bid}번에 제시가 붙음 · 개막 때 무소속 대형 FA ${r.left.length}명`):bad('FA 경쟁 '+JSON.stringify(r));}

  // 7. 시작 화면(시안): 그림 + 「최근 플레이」 구단·시즌·지금 할 일 + [이어하기] / [새 커리어][불러오기] / 설정 — 폰 한 화면 안
  {await p.evaluate(()=>{UI.setTab('home');});await p.reload();await p.waitForTimeout(500);const r=await p.evaluate(()=>{const t=document.body.innerText;const bs=[...document.querySelectorAll('button')].filter(x=>x.offsetParent).map(x=>x.textContent.replace(/\s+/g,' ').trim());const hero=document.querySelector('.t3hero');return {lab:/최근 플레이/.test(t),now:(document.querySelector('.t3now')||{}).innerText||'',bs,img:!!hero&&/url\(/.test(hero.getAttribute('style')||''),h:document.documentElement.scrollHeight,ih:innerHeight,ow:document.documentElement.scrollWidth-innerWidth};});
    r.lab&&r.img&&/\S+\s*\n?\s*\S+/.test(r.now)&&r.bs.some(x=>/^이어하기/.test(x))&&r.bs.includes('새 커리어')&&r.bs.includes('불러오기')&&r.bs.includes('설정')&&r.h<=r.ih+2&&r.ow<=0?ok(`시작 화면: 최근 플레이 「${r.now.replace(/\s*\n\s*/g,' | ')}」 · 단추 ${r.bs.join(' / ')} · 높이 ${r.h}/${r.ih}`):bad('시작 화면 '+JSON.stringify(r));}

  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v118 검사 실패 ${fails}건`:'v118 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

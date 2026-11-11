// v102 (R084-3): FM 묶음 3 — 도전 시나리오 3개 · 구단주 요청 · 계약 조항(연봉 인상·바이아웃) · 「구해요」 영입 공고 · 트레이드 마감 카운트다운 · 감독 칭호
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  const wide=async()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  // 1. 도전 시나리오: 시작 화면 고급 설정 「도전」 줄 · 부상 병동 = 주전 5명 부상 · 지원 중단 = 현금 20% · 이적 예산 0
  {const r=await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);const row=document.querySelector('.dfsel.scsel');const bs=row?[...row.querySelectorAll('button')].map(x=>x.textContent):[];
      SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const c0=SL.userTeam().cash;
      SL.newGame(4096,3,{arch:true,games:36,league:'KR',scen:'inj'});const S=SL.state();const ut=SL.userTeam();const inj=S.scen.who.map(id=>S.players[id]).filter(q=>q.inj&&q.inj.left>0).length;const top=ut.lineup.map(id=>S.players[id]).some(q=>S.scen.who.includes(q.id));
      SL.newGame(4096,3,{arch:true,games:36,league:'KR',scen:'broke'});const c1=SL.userTeam().cash;const B=SL.budgetInfo();
      return {bs,inj,top,ratio:c1/c0,xfer:B.xfer,news:SL.state().news.some(n=>/도전 시나리오\] 모기업/.test(n.text||n.t||''))};});
    r.bs.length===4&&r.inj===5&&!r.top&&Math.abs(r.ratio-0.2)<0.01&&r.xfer===0&&r.news?ok(`도전 시나리오: 고급 설정 「${r.bs.join('·')}」 · 부상 병동 주전 ${r.inj}명 부상(라인업에서 빠짐) · 지원 중단 현금 ${Math.round(r.ratio*100)}% · 이적 예산 0`):bad('시나리오 '+JSON.stringify(r));}
  // 2. 시즌 중반 구원 투입: 전반기는 AI → 반 지난 날 최하위 구단을 맡음 · 우리 구단은 한 곳 · 감독 → 내 실적에 시나리오 카드 · 시즌 끝 판정
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR',scen:'mid'});const S=SL.state();S.tutorialDone=true;const first=SL.userTeam().name;let k=0;while(!SL.scenMidStep(4).done&&k++<50);
      const st0=SL.standings(SL.compOf(SL.userTeam()));const last=st0[st0.length-1];const nt=SL.scenMidFinish();const users=Object.values(S.teams).filter(t=>t.isUser).length;
      UI.setTab('home');UI.closeModal();UI.go('club','mgr');const card=(document.querySelector('.scenc')||{}).innerText||'';const day=S.day;const rec=nt.rec.w+'-'+nt.rec.l;
      SL.testCmd('endSeason');const res=S.scen.res;return {first,nt:nt.name,last:last.name,users,day,card:card.slice(0,300),rec,res,pend:S.scen.pend};});
    r.nt===r.last&&r.users===1&&r.day===19&&/시즌 중반 구원 투입/.test(r.card)&&/부임할 때/.test(r.card)&&r.res&&typeof r.res.ok==='boolean'&&!r.pend
      ?ok(`구원 투입: ${r.first}로 시작 → 18일 AI 운영 → 최하위 ${r.nt}(${r.rec}) 부임 · 우리 구단 ${r.users}곳 · 내 실적 카드 · 시즌 끝 판정 ${r.res.ok?'성공':'실패'} (${r.res.why})`):bad('구원 투입 '+JSON.stringify(r));}
  // 3. 구단주 요청: 시즌 20% 지점에 요청 → 할 일 목록 · 해내면 이적 예산 +5억 · 기록
  {const r=await p.evaluate(()=>{SL.newGame(77,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();let k=0;while(!S.oreq&&k++<12){UI.autoDays(1);UI.closeModal();}
      const o=SL.oreqInfo();UI.inbox&&UI.inbox();const todo=(typeof decisionItems==='function'?[]:[]);UI.go('club','mgr');const card=(document.querySelector('.oreqc')||{}).innerText||'';const x0=SL.budgetInfo().xfer;
      S.oreq.k='youth';S.oreq.need=1;S.oreq.cur=0;S.oreq.to=S.day+5;k=0;while(S.oreq&&k++<6){UI.autoDays(1);UI.closeModal();}const H=(S.oreqH||[]).slice(-1)[0];
      return {day:o&&o.d0,at:SL.dayAt(0.2),ko:o&&o.ko,card:card.slice(0,60),done:!S.oreq,ok:H&&H.ok,dx:SL.budgetInfo().xfer-x0,news:S.news.some(n=>/구단주 요청\] 「.*」 해냈습니다/.test(n.text||n.t||''))};});
    r.day===r.at&&/구단주 요청/.test(r.card)&&r.done&&r.ok&&r.dx===10000&&r.news?ok(`구단주 요청: ${r.at}일차 「${r.ko}」 → 감독 화면 카드 · 해내면 이적 예산 +5억 · 소식`):bad('구단주 요청 '+JSON.stringify(r));}
  // 4. 계약 조항: 연봉 인상·바이아웃을 걸면 선수가 더 낮은 연봉에 응함 · 계약에 남고 시즌이 바뀌면 연봉 인상 · 바이아웃 금액을 내는 구단이 나오면 이적
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const q=ut.roster.map(id=>S.players[id]).filter(x=>!SL.isFgn(x)&&x.contract.years>=2).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[3];q.contract.years=1;
      SL.testCmd('endSeason');UI.closeModal();const o=SL.openTable(q.id);const neg=S.market.negs.find(n=>n.pid===q.id);if(!neg)return {noneg:true,o};const v=SL.calcValue(q);
      const dem=neg.demand;const sal=Math.round(dem*0.93/10)*10;const p0=SL.negPreview(q.id,{salary:sal,years:3,bonus:0});const p1=SL.negPreview(q.id,{salary:sal,years:3,bonus:0,raise:0.1,buy:Math.round(v*0.5/100)*100});
      UI.openTable(q.id);const rows=[...document.querySelectorAll('tr.clz')].length;const w1=document.documentElement.scrollWidth<=innerWidth+1;window._sw=[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,4).map(e=>e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().right));
      const low=SL.tableOffer(q.id,{salary:sal,years:3,bonus:0,raise:0.1,buy:Math.round(v*0.3/100)*100});
      const res=SL.tableOffer(q.id,{salary:sal,years:3,bonus:0,raise:0.1,buy:Math.round(v*0.5/100)*100});UI.closeModal();
      const c=JSON.parse(JSON.stringify(q.contract));const txt=SL.contractText(q);delete q.contract.buy;SL.testCmd('nextSeason');SL.testCmd('endSeason');UI.closeModal();const sal2=q.contract.salary;
      q.contract.buy=Math.round(SL.calcValue(q)*0.5/100)*100;let k=0;while(q.teamId===ut.id&&k++<60)SL.buyoutWeek();const moved=q.teamId!==ut.id;const nw=S.news.some(n=>/\[바이아웃\]/.test(n.text||n.t||''));
      return {z0:p0&&p0.zone,z1:p1&&p1.zone,rows,w1,low:low&&low.msg,done:res&&res.done,rmsg:res&&(res.msg||res.ok),sw:window._sw,c,txt,sal,sal2,moved,nw};});
    r.z0!=='sure'&&r.z1==='sure'&&r.rows===2&&r.w1&&/절반/.test(r.low||'')&&r.done&&r.c.raise===0.1&&r.c.buy>0&&/해마다 연봉 \+10% · 바이아웃/.test(r.txt)&&r.sal2===Math.round(r.sal*1.1/10)*10&&r.moved&&r.nw
      ?ok(`계약 조항: 요구의 93% 연봉 — 조항 없이는 「${r.z0}」, 인상 10%+바이아웃이면 「sure」 → 계약(「${r.txt}」) · 계약 2년째 ${r.sal*5}만 → ${r.sal2*5}만 · 시장가치 절반 미만 바이아웃 거부 · 바이아웃 발동 이적`):bad('계약 조항 '+JSON.stringify(r));}
  // 5. 「구해요」: 자리·연봉·나이 공고 → 2일 뒤 후보 ≤5명 (조건에 맞음) · 할 일 · 협상 단추
  {const r=await p.evaluate(()=>{SL.newGame(77,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.go('market','want');const tabs=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());UI.wantF('pos','RP');UI.wantF('age','34');UI.wantF('sal','20000');UI.wantPost();
      let k=0;while(!(S.want&&S.want.cands)&&k++<5){UI.autoDays(1);UI.closeModal();}const W=SL.wantInfo();const okm=W.list.every(x=>x.p.pos==='RP'&&x.p.age<=34&&x.ask<=20000);
      UI.go('market','want');const btn=document.querySelectorAll('.stv .prow button').length;const w=document.documentElement.scrollWidth<=innerWidth+1;return {tabs,n:W.list.length,okm,btn,w,srcs:[...new Set(W.list.map(x=>x.src))],news:S.news.some(n=>/\[구해요\] 답장/.test(n.text||n.t||''))};});
    r.tabs.includes('영입 요청')&&r.n>=1&&r.n<=5&&r.okm&&r.btn===r.n&&r.w&&r.news?ok(`구해요: 선수 찾기 → 구해요 · 불펜 34세 이하 연봉 10억 이하 공고 → 후보 ${r.n}명(${r.srcs.join('·')}) 모두 조건 맞음 · 협상 단추 · 소식`):bad('구해요 '+JSON.stringify(r));}
  // 6. 트레이드 마감: D-3이면 시장 띠 · 할 일 · 정리하려는 구단 기준 5% 낮음 · D-7/D-3/D-1 소식
  {const r=await p.evaluate(()=>{const S=SL.state();const dl=SL.tradeDeadline();let k=0;while(S.day<dl-3&&k++<40){UI.autoDays(1);UI.closeModal();}const left=SL.ddlLeft();UI.go('market','thub');const band=(document.querySelector('.ddlb')||{}).innerText||'';
      const ut=SL.userTeam();const t=SL.krTeams().find(x=>!x.isUser&&['rebuild','money'].includes(x.aim))||SL.krTeams().find(x=>!x.isUser);if(!['rebuild','money'].includes(t.aim))t.aim='rebuild';
      const give=[ut.roster[ut.roster.length-1]],get=[t.roster[t.roster.length-1]];const e1=SL.tradeEval(t.id,give,get,0);const d0=S.day;S.day=1;const e0=SL.tradeEval(t.id,give,get,0);S.day=d0;
      const nw=[7,3].every(n=>S.news.some(x=>(x.text||x.t||'').includes('트레이드 마감 D-'+n)));return {left,band:band.slice(0,40),n0:e0.needPct,n1:e1.needPct,hint:(e1.hint||[]).some(h=>/마감/.test(h)),nw};});
    r.left===3&&/D-3/.test(r.band)&&r.n0-r.n1===5&&r.hint&&r.nw?ok(`트레이드 마감 D-3: 시장 띠 「${r.band}」 · 정리하려는 구단 기준 ${r.n0}% → ${r.n1}% · 거절 이유에 마감 안내 · D-7·D-3 소식`):bad('마감 '+JSON.stringify(r));}
  // 7. 감독 칭호: 14가지 · 새내기는 처음부터 · 못 얻은 칭호는 못 검 · 대표 칭호가 감독 평판 옆에
  {const r=await p.evaluate(()=>{const L=SL.titleList();const e=SL.titleSet('dyn');const e2=SL.titleSet('rookie');UI.go('club','mgr');/* v120 (R103): 시안 — 평판 옆 「새내기 감독 · 무명」, 칭호는 [칭호 보기]를 눌러 펼침 */const head=/새내기 감독 · /.test((document.querySelector('.mgtop')||{}).innerText||'');const tb=document.querySelector('.mgbox .ob');if(tb&&!document.querySelector('.ttlc'))tb.click();const chips=document.querySelectorAll('.ttlc .chiprow button').length;
      return {n:L.length,rk:L.find(x=>x.k==='rookie').got,e,e2,head,chips,w:document.documentElement.scrollWidth<=innerWidth+1};});
    r.n===14&&r.rk&&r.e&&!r.e2&&r.head&&r.chips>=1&&r.w?ok(`감독 칭호 ${r.n}가지: 새내기 감독 처음부터 · 못 얻은 「왕조 설계자」는 못 검 · 감독 평판 옆 「새내기 감독」`):bad('칭호 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v102 검사 실패 ${fails}건`:'v102 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

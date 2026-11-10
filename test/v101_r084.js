// v101 (R084-1·2): 돈 규모 현실화(내부 1 = 5만원, 화면 ×5) · 최저 연봉 3,000만 · 외국인/아시아쿼터 상한 · 예전 저장 이어짐 · 샐러리캡(경쟁균형세)
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  // 1. 새 게임 연봉 분포가 2025 KBO 실제 규모 (평균 1.6억(전체)·상위 40명 평균 2.8억 · 최저 3,000만 · 최고 30억 안팎) · 화면 금액 = 내부 × 5
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const W=SL.BAL.WON;
      const sal=[];for(const t of SL.krTeams())for(const id of t.roster.concat(t.dev)){const q=S.players[id];if(!SL.isFgn(q))sal.push(q.contract.salary*W);}sal.sort((a,b)=>a-b);
      const fg=SL.krTeams().flatMap(t=>t.roster.map(id=>S.players[id])).filter(q=>SL.isFgn(q)).map(q=>q.contract.salary*W);
      const use=SL.krTeams().map(t=>SL.capUse(t)*W);return {W,avg:sal.reduce((a,x)=>a+x,0)/sal.length,min:sal[0],max:sal[sal.length-1],fgMax:Math.max(...fg),m1:SL.money(20000),m2:SL.money(600),lim:SL.capLimit()*W,umin:Math.min(...use),umax:Math.max(...use)};});
    r.W===5&&r.avg>=20000&&r.avg<=40000&&r.min>=3000&&r.max>=250000&&r.max<=450000&&r.fgMax<=250000&&r.m1==='10억원'&&r.m2==='3,000만원'&&Math.abs(r.lim-1439725)<10&&r.umin>=600000&&r.umax<r.lim
      ?ok(`연봉: 국내 평균 ${(r.avg/1e4).toFixed(1)}억 · 최저 ${r.min}만 · 최고 ${(r.max/1e4).toFixed(1)}억 · 외국인 최고 ${(r.fgMax/1e4).toFixed(1)}억 · 구단 상위 40명 ${(r.umin/1e4).toFixed(0)}~${(r.umax/1e4).toFixed(0)}억 (상한 ${(r.lim/1e4).toFixed(1)}억) · 내부 20000 = ${r.m1}`):bad('연봉 분포 '+JSON.stringify(r));}
  // 2. 협상 입력칸은 화면 단위(만원): 칸 값 = 내부 × 5, 칸에 쓴 값 ÷ 5가 제시액 · 협상표에 샐러리캡 줄
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const p=S.players[ut.roster[5]];UI.openTable(p.id);const inp=document.querySelector('#tf_sal');const v0=+inp.value;const f0=UI&&SL.state().market.negs.find(n=>n.pid===p.id);
      inp.value='123450';inp.dispatchEvent(new Event('change'));const cap=(document.querySelector('.capl')||{}).innerText||'';const ff=+document.querySelector('#tf_sal').value;UI.leaveTable&&UI.leaveTable();UI.closeModal();return {v0,ff,cap};});
    r.v0>0&&r.v0%5===0&&r.ff===123450&&/샐러리캡 .*→ .*\/ 상한 144억/.test(r.cap)?ok(`협상 입력칸: 처음 ${r.v0}만(내부×5) · 123,450 입력 → 그대로 · 「${r.cap.slice(0,50)}」`):bad('입력칸 '+JSON.stringify(r));}
  // 3. 샐러리캡 정산: 우리 구단이 상한을 넘으면 시즌 끝에 초과분 30% → 다음 시즌도 넘으면 50% · 재정 화면 카드 · 구단별 표 10줄
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();UI.go('club','fin');const card=document.querySelector('.capc');const rows=card?card.querySelectorAll('tbody tr').length:0;
      const star=S.players[ut.roster[0]];star.contract.salary+=SL.capLimit()-SL.capUse(ut)+20000;star.contract.years=3;const over=SL.capUse(ut,{all:true})-SL.capLimit();const cash0=ut.cash;
      SL.testCmd('endSeason');const h1=(ut.capHist||[]).slice(-1)[0];const n1=S.news.find(n=>/경쟁균형세\] /.test(n.text||n.t||'')&&(n.text||n.t||'').includes(ut.name));
      const tax1=h1?h1.tax:0;SL.testCmd('nextSeason');UI.closeModal();star.contract.years=Math.max(2,star.contract.years);if(star.teamId!==ut.id)return {gone:true};star.contract.salary+=SL.capLimit()-SL.capUse(ut,{all:true})+20000;const over2=SL.capUse(ut,{all:true})-SL.capLimit();const I=SL.capInfo(ut);SL.testCmd('endSeason');const h2=ut.capHist.slice(-1)[0];
      return {rows,over,tax1,exp1:Math.round(over*0.3),news:!!n1,over2,tax2:h2.tax,exp2:Math.round(over2*0.5),streak:I.streak,rate:I.rate,fin:ut.fin.cap||0};});
    r.rows===10&&r.over>0&&Math.abs(r.tax1-r.exp1)<=1&&r.news&&r.over2>0&&Math.abs(r.tax2-r.exp2)<=1&&r.rate===0.5
      ?ok(`샐러리캡: 재정 화면 구단 ${r.rows}곳 표 · 1회 초과 ${r.over} → 30% ${r.tax1} 납부(소식) · 2회 연속 초과 ${r.over2} → 50% ${r.tax2}`):bad('샐러리캡 '+JSON.stringify(r));}
  // 4. 최저 연봉: 2시즌(2027년)부터 3,300만 — 계약 중인 국내 선수 모두 그 이상
  {const r=await p.evaluate(()=>{const S=SL.state();const low=SL.krTeams().flatMap(t=>t.roster.concat(t.dev).map(id=>S.players[id])).filter(q=>q&&q.contract&&q.contract.years>0&&q.contract.salary<660).length;return {s:S.season,low,min:SL.minSal()};});
    r.s>=2&&r.low===0&&r.min===660?ok(`${r.s}시즌: 최저 연봉 ${r.min*5}만 — 밑도는 계약 0명`):bad('최저 연봉 '+JSON.stringify(r));}
  // 5. 예전 저장(v29 샘플): 불러오면 금액이 같은 비율(×5)로 보이고, 최저 연봉 아래 선수만 조정 · 안내 소식 · 저장 형식 그대로
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const o=JSON.parse(j);const ut0=o.teams[o.userTeamId];
    const r=await p.evaluate(s=>{SL.load(s);const S=SL.state();const ut=SL.userTeam();const nw=S.news.some(n=>/금액 단위가 바뀌었습니다/.test(n.text||n.t||''));const W=SL.BAL.WON;
      const krP=SL.krTeams().flatMap(t=>t.roster.map(id=>S.players[id]));return {moneyV:S.moneyV,nw,cash:ut.cash,shown:SL.money(ut.cash),below:krP.filter(q=>q.contract&&q.contract.salary<600).length,ver:S.version};},j);
    const exp=(()=>{let m=Math.abs(Math.round(r.cash*5));if(m>=10000){const e=m/10000;return (e>=100?Math.round(e):Math.round(e*10)/10).toLocaleString()+'억원';}return m.toLocaleString()+'만원';})();
    r.moneyV===2&&r.nw&&r.cash===ut0.cash&&r.shown===(r.cash<0?'-':'')+exp&&r.below===0?ok(`v29 저장: 구단 자금 내부 ${ut0.cash} 그대로 → 화면 ${r.shown} (×5) · 최저 연봉 밑 0명 · 안내 소식 · 저장 형식 ${r.ver}`):bad('예전 저장 '+JSON.stringify(r));}
  // 6. 폰 폭: 재정 화면 가로 넘침 없음
  {const r=await p.evaluate(()=>{UI.go('club','fin');return {sw:document.documentElement.scrollWidth,cw:innerWidth};});r.sw<=r.cw+1?ok('재정 화면 폰 390px 가로 넘침 없음'):bad('넘침 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v101 검사 실패 ${fails}건`:'v101 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

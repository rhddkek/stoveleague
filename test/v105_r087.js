// v105 (R087): 리그 수준 맞춤 — 한국 1군 주전 평균을 정한 수준(66)에 맞춤(트리플A와 비슷, 일본·메이저보다 아래) · 연봉·몸값은 그대로 · 리그 수준 화면 = 지금 선수단으로 잰 값
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  // 1. 새 게임: 리그 순서 메이저 > 일본 > 한국 ≈ 트리플A(미국 2군) > 멕시코 > 대만 > 한국 퓨처스 · 한국 1군 주전 평균 66~67.5
  {const r=await p.evaluate(()=>{const out=[];for(const seed of [11,4096]){SL.newGame(seed,3,{arch:true,games:36,league:'KR'});out.push(SL.lvLive());}return out;});
    const okv=r.every(v=>v.US>v.JP&&v.JP>v.KR1+3&&Math.abs(v.KR1-v.US2)<=1.5&&v.KR1>v.MX&&v.MX>v.TW&&v.TW>v.RES&&v.KR1>=66&&v.KR1<=67.5);
    okv?ok(`리그 수준(주전 평균): 메이저 ${r[0].US} > 일본 ${r[0].JP} > 한국 ${r[0].KR1} ≈ 미국 2군 ${r[0].US2} > 멕시코 ${r[0].MX} > 대만 ${r[0].TW} > 한국 퓨처스 ${r[0].RES} (시드 두 개)`):bad('리그 수준 '+JSON.stringify(r));}
  // 2. 능력은 내렸지만 연봉·몸값(화면 금액)은 예전 규모 그대로: 국내 평균 연봉 2.4~3.2억 · 최고 25~40억 · 구단 상위 40명 합 상한 안
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();const W=SL.BAL.WON;const sal=[];for(const t of SL.krTeams())for(const id of t.roster.concat(t.dev)){const q=S.players[id];if(!SL.isFgn(q))sal.push(q.contract.salary*W);}sal.sort((a,b)=>a-b);
      const use=SL.krTeams().map(t=>SL.capUse(t));const q=S.players[SL.userTeam().roster[0]];return {adj:S.krAdj,shift:S.krShift,avg:sal.reduce((a,x)=>a+x,0)/sal.length,max:sal[sal.length-1],over:use.filter(u=>u>SL.capLimit()).length,dem:SL.salaryFor?null:null};});
    r.adj>1&&r.shift<0&&r.avg>=24000&&r.avg<=32000&&r.max>=250000&&r.max<=400000&&!r.over?ok(`국내 선수 능력 ${r.shift} → 연봉·몸값 곡선 ×${r.adj}: 평균 연봉 ${(r.avg/1e4).toFixed(1)}억 · 최고 ${(r.max/1e4).toFixed(1)}억 (예전 규모 그대로) · 샐러리캡 넘는 구단 0`):bad('연봉 '+JSON.stringify(r));}
  // 3. 예전 저장(v29 샘플)은 선수 능력·연봉 계산을 그대로 (krAdj 없음)
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.load(s);const S=SL.state();return {adj:S.krAdj||null};},j);
    r.adj===null?ok('예전 저장: 국내 능력·연봉 곡선 그대로 (새 게임부터 적용)'):bad('예전 저장 '+JSON.stringify(r));}
  // 4. 리그 → 다른 리그 → 해외 → 리그 수준 비교: 화면 숫자 = 지금 선수단으로 잰 값 · 큰 값부터
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();UI.go('league','overseas');const pg=document.querySelectorAll('.pgtabs button');if(pg[0])pg[0].click();
      const rows=[...document.querySelectorAll('.lvrow')].map(x=>({n:x.querySelector('.ln').textContent,v:+x.querySelector('b').textContent}));const V=SL.lvLive();const kr=rows.find(x=>x.n==='한국 1군');return {rows:rows.length,kr:kr&&kr.v,live:V.KR1,sorted:rows.every((x,i)=>i===0||rows[i-1].v>=x.v),first:rows[0]&&rows[0].n};});
    r.rows>=10&&r.kr===r.live&&r.sorted&&r.first==='메이저리그'?ok(`리그 수준 비교 ${r.rows}줄: 한국 1군 ${r.kr} = 지금 잰 값 · 큰 값부터(맨 위 ${r.first})`):bad('리그 수준 화면 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v105 검사 실패 ${fails}건`:'v105 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

// v95 (R079): 리그별 타격 환경 — 경기당 득점·타율이 실제 최근 시즌(2025) 수준
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  // 리그별 범위: 실제 2025 (KBO 4.6점·.259 / NPB 3.3점·.244) ± 시드 차이
  const want={KR:{r:[4.1,5.1],avg:[.250,.275],real:'4.6점 · .259'},JP:{r:[2.9,3.8],avg:[.228,.255],real:'3.3점 · .244'}};
  for(const L of Object.keys(want)){const p=await b.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
    const r=await p.evaluate(L=>{SL.newGame(11,0,{arch:true,games:144,league:L});const S=SL.state();S.tutorialDone=true;
      const left=()=>S.schedule.filter(g=>!g.res&&S.teams[g.home].league===L).length;let k=0;while(left()>12&&k++<80){UI.autoDays(3);UI.closeModal&&UI.closeModal();}
      let R=0,G=0;for(const g of S.schedule)if(g.res&&S.teams[g.home].league===L){R+=g.res.hs+g.res.as;G++;}
      let ab=0,h=0;for(const id in S.players){const pl=S.players[id];const tm=S.teams[pl.teamId];if(!tm||tm.league!==L||!pl.cur)continue;ab+=pl.cur.ab||0;h+=pl.cur.h||0;}
      return {G,rpg:R/G/2,avg:h/ab,env:!!(SL.BAL.ENV&&SL.BAL.ENV[L])};},L);await p.close();
    const w=want[L];const inR=(v,[a,c])=>v>=a&&v<=c;
    r.env&&r.G>300&&inR(r.rpg,w.r)&&inR(r.avg,w.avg)?ok(`${L} 한 시즌 ${r.G}경기: 팀당 경기당 ${r.rpg.toFixed(2)}점 · 타율 ${r.avg.toFixed(3)} (실제 2025 ${w.real})`):bad(L+' '+JSON.stringify(r));}
  // 리그 환경이 없는 경기(예전 저장·알 수 없는 리그)는 기본값 1배
  {const p=await b.newPage();await p.goto(url);await p.waitForTimeout(300);
    const r=await p.evaluate(()=>Object.keys(SL.BAL.ENV).sort().join()+'|'+['hit','hr','zone','con'].every(k=>Object.values(SL.BAL.ENV).every(e=>typeof e[k]==='number')));await p.close();
    r==='JP,KR,TW,US|true'?ok('BAL.ENV: KR·JP·TW·US 네 리그 모두 안타·홈런·존·컨택 값'):bad('ENV '+r);}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v95 검사 실패 ${fails}건`:'v95 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

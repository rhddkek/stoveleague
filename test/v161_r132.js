// v161 (R132): 한국 AI 구단 외국인 — 해외 후보(미국 메이저 끝자락 · 트리플A · 멕시코 · 도미니카 · 일본 · 대만 · 호주 · 중국)는 넘치는데 겨울 내내 3명을 못 채우던 것
// 겨울 5주차까지 9구단 모두(시드마다 많아야 1구단 예외) 일반 외국인 3명 이상 · 개막 때는 모두
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const res=[];for(const seed of [31,77,5]){SL.newGame(seed,0,{games:144});const S=SL.state();S.mgr.noSack=1;let g=0;while(S.phase==='season'&&g++<400)SL.playDayAuto();
  const cnt=()=>SL.krTeams().filter(t=>!t.isUser).map(t=>t.roster.map(id=>S.players[id]).filter(p=>p&&p.nat!=='KR').length);let w5=null,k=0;
  while(S.phase==='offseason'&&k++<20){SL.advanceWeek();if(S.week===5&&!w5)w5=cnt();}const op=cnt();res.push({seed,w5,op});}
const w5ok=res.every(r=>r.w5&&r.w5.filter(n=>n>=3).length>=8),opok=res.every(r=>r.op.every(n=>n>=3));
w5ok?ok('겨울 5주차 외국인 수: '+res.map(r=>`시드 ${r.seed} ${r.w5.join('')}`).join(' · ')):bad('5주차 '+JSON.stringify(res));
opok?ok('개막 때 외국인 수: '+res.map(r=>`시드 ${r.seed} ${r.op.join('')}`).join(' · ')):bad('개막 '+JSON.stringify(res));
console.log(fails?`실패 ${fails}건`:'v161 통과');process.exit(fails?1:0);

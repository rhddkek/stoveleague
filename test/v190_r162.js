// v190 (R162): 맡은 리그 AI 구단 — 돈이 한국 AI처럼 돎(연봉 · 입장 수입 · 스폰서 · 유지비 · 시즌 끝 한도/바닥, 겨울 고정값 충전 없음)
//   성장은 예전 해외 방식(겨울 한 번) 그대로 · 계약 햇수는 겨울에 한 번만 줄어듦 · 맡지 않은 리그는 예전과 같음
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
for(const lg of ['TW','JP']){
  SL.newGame(19001,2,{games:60,league:lg});let S=SL.state();S.auto={};for(const k of Object.keys(SL.AUTO_KEYS||{}))S.auto[k]=true;
  const ut=SL.userTeam();const ai=Object.values(S.teams).filter(t=>t.league===lg&&!t.isUser&&t.roster.length>=20);
  const cash0=ai.map(t=>t.cash);const yrs={};for(const t of ai)for(const id of t.roster){const c=S.players[id].contract;if(c&&c.years>=3)yrs[id]=c.years;}const att0={};for(const t of ai)for(const id of t.roster){const p=S.players[id];att0[id]=JSON.stringify(p.attrs);}
  let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
  // 1. 시즌 동안 돈이 돎
  const tk=ai.filter(t=>t.fin&&t.fin.tickets>0).length,sal=ai.filter(t=>t.fin&&t.fin.salary>0).length,moved=ai.filter((t,i)=>t.cash!==cash0[i]).length;
  tk===ai.length&&sal===ai.length&&moved===ai.length?ok(`${lg}: AI ${ai.length}구단 모두 입장 수입 · 연봉 지급 · 현금 변화`):bad(`${lg} 돈 `+JSON.stringify({n:ai.length,tk,sal,moved}));
  // 2. 시즌 중 성장 없음(예전 해외 방식) — 부상 · 나이 말고 능력이 그대로
  let same=0,tot=0;for(const t of ai)for(const id of t.roster){if(att0[id]==null)continue;tot++;if(JSON.stringify(S.players[id].attrs)===att0[id])same++;}
  same/tot>=0.95?ok(`${lg}: 시즌 중 AI 선수 능력 그대로 ${same}/${tot}`):bad(`${lg} 시즌 중 성장 ${same}/${tot}`);
  let one=0,two=0,chk=0;for(const id of Object.keys(yrs)){const p=S.players[id];if(!p||!p.contract||!ai.some(t=>t.id===p.teamId))continue;chk++;const d=yrs[id]-p.contract.years;if(d===1)one++;else if(d>=2)two++;}
  two===0&&one>=chk*0.9&&chk>10?ok(`${lg}: 계약 햇수 시즌 끝에 1년씩 (${one}/${chk}, 두 번 깎임 0)`):bad(`${lg} 계약 `+JSON.stringify({one,two,chk}));
  // 3. 겨울: 현금은 고정값으로 깎이지 않음
  if(S.mgr&&S.mgr.sacked&&!S.mgr.sacked.done){S.mgr.sacked=null;S.jobOffers=[];}
  let g=0;while(S.phase==='offseason'&&g++<12){if(SL.autoRun)SL.autoRun();if(SL.draftTurn&&SL.draftTurn())SL.draftAuto();if(S.week>=SL.BAL.OFFSEASON_WEEKS)break;SL.advanceWeek();}
  let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}S=SL.state();
  const oc=t=>SL.BAL.OVERSEAS_CASH[lg]*((SL.ECON_R||{})[lg]||1);const capped=ai.filter(t=>Math.abs(t.cash-oc(t))<1).length;
  capped<ai.length?ok(`${lg}: 겨울 현금 고정값 충전 없음(고정값과 같은 구단 ${capped}/${ai.length})`):bad(`${lg} 현금 고정 `+capped);
}
// 4. 맡지 않은 리그(한국을 맡았을 때 대만 AI)는 예전처럼 입장 수입 없음 · 겨울 고정값
{SL.newGame(19002,2,{games:36,league:'KR'});const S=SL.state();let n=0;while(S.phase==='season'&&n++<300){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
  const tw=Object.values(S.teams).filter(t=>t.league==='TW');const tk=tw.filter(t=>t.fin&&t.fin.tickets>0).length;
  tk===0?ok('한국을 맡으면 대만 AI는 예전 그대로(입장 수입 0)'):bad('맡지 않은 리그 수입 '+tk);}
console.log(fails?`실패 ${fails}`:'v190 검사 통과');process.exit(fails?1:0);

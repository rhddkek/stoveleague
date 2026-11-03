// v3(효과음 v8 빌드) 코드로 세이브 2종 생성: (a) 국내 3부 시즌 중 (b) 일본 구단 감독으로 이직 후 시즌 중
const fs=require('fs');const vm=require('vm');
const src=fs.readFileSync(__dirname+'/../src_v3/core_all.js','utf8');
const ctx={module:{exports:{}},console};vm.createContext(ctx);vm.runInContext(src,ctx);const SL=ctx.module.exports;
SL.newGame(5151,1);let S=SL.state();
while(S.phase==='season')SL.playDayAuto();
while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}
let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();SL.startNewSeason();}
for(let i=0;i<9;i++)SL.playDayAuto();
fs.writeFileSync(__dirname+'/v3_save.json',SL.serialize());
// (b) 일본 구단 감독: 시즌 종료 후 일본 구단으로 강제 이직
while(S.phase==='season')SL.playDayAuto();
const jp=Object.values(S.teams).find(t=>t.league==='JP');S.jobOffers=[{id:S.nextOfferId++,team:jp.id,kind:'job',goal:{text:'3위 이내',target:3},rankExp:4,n:6,expires:2,reason:'test'}];
const e=SL.moveManager(S.jobOffers[0].id);if(e)throw e;
while(S.week<=6){if(SL.draftTurn())SL.draftAuto();SL.advanceWeek();}
r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();SL.startNewSeason();}
for(let i=0;i<6;i++)SL.playDayAuto();
fs.writeFileSync(__dirname+'/v3_jp_save.json',SL.serialize());
console.log('v3 saves ok; jp team',SL.userTeam().name,SL.userTeam().league,'day',S.day);

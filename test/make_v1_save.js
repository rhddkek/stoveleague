// 구버전(v1) 코드로 세이브 생성: 2시즌 9일차, 판매·육성군·드래프트 포함
const fs=require('fs');const vm=require('vm');
const src=['core_a','core_b','core_c'].map(n=>fs.readFileSync(__dirname+'/../src_v1/'+n+'.js','utf8')).join('\n');
const ctx={module:{exports:{}},console};vm.createContext(ctx);vm.runInContext(src,ctx);const SL=ctx.module.exports;
SL.newGame(4242,3);const S=SL.state();const ut=SL.userTeam();
const ps=ut.roster.map(id=>S.players[id]).sort((a,b)=>SL.calcValue(b)-SL.calcValue(a));SL.listPlayer(ps[0].id);
while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers]){if(o.type==='buy'&&o.willing)SL.respondOffer(o.id,'accept');}}
const y=ut.roster.map(id=>S.players[id]).find(p=>p.age<=21&&!ut.lineup.includes(p.id));if(y)SL.demoteDev(y.id);
while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}
let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();SL.startNewSeason();}
for(let i=0;i<8;i++)SL.playDayAuto();
const lg=SL.startDay();for(let i=0;i<10;i++)SL.stepPA(lg); // 경기 도중 저장
fs.writeFileSync(__dirname+'/v1_save.json',SL.serialize());
console.log('v1 save',S.season,'day',S.day,'live',!!S.liveGame,'size KB',(SL.serialize().length/1024).toFixed(0),'exUser',Object.values(S.players).filter(p=>p.exUser).length);

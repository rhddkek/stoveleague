const fs=require('fs');const path=require('path');
const src=['core_a','core_b','core_c'].map(n=>fs.readFileSync(path.join(__dirname,'../src',n+'.js'),'utf8')).join('\n');
let srcX=src;if(process.env.SL_DEBUG)srcX=src.replace("function addToTeam(p,t,contract){","function addToTeam(p,t,contract){for(const x of Object.values(S.teams)){if(x.roster.includes(p.id)){console.log('DUP ADD',p.name,'already in',x.name,'adding to',t.name,'teamId',p.teamId);console.log(new Error().stack.split('\\n').slice(2,7).join('\\n'));process.exit(1);}}");
const vm=require('vm');const ctx={module:{exports:{}},console,process};vm.createContext(ctx);vm.runInContext(srcX,ctx);
const SL=ctx.module.exports;
module.exports=SL;
if(require.main===module){
  const seed=+process.argv[2]||12345;
  SL.newGame(seed,0);
  let S=SL.state();
  const ut=SL.userTeam();
  console.log('user team',ut.name,'players',Object.keys(S.players).length);
  // engine calibration: play one full season auto, gather league totals
  const t0=Date.now();
  SL.autoAll=()=>{};
  while(S.phase==='season'){SL.playDayAuto();}
  console.log('season done in',Date.now()-t0,'ms');
  let pa=0,ab=0,h=0,hr=0,bb=0,so=0,runs=0,games=0,d2=0,d3=0;
  for(const t of SL.krTeams()){games+=t.rec.w+t.rec.l;runs+=t.rec.rs;}
  for(const pid in S.players){const p=S.players[pid];const st=p.hist.length?p.hist[p.hist.length-1].st:null;if(!st||st.lg)continue;}
  for(const h_ of S.history){}
  // player hist stats of season 1 for KR players
  for(const pid in S.players){const p=S.players[pid];for(const hh of p.hist){if(hh.s!==1||!hh.lg||!hh.lg.startsWith('KR'))continue;const st=hh.st;pa+=st.pa;ab+=st.ab;h+=st.h;hr+=st.hr;bb+=st.bb;so+=st.so;d2+=st.d2;d3+=st.d3;}}
  console.log('games',games/2,'runs/game/team',(runs/games).toFixed(2),'AVG',(h/ab).toFixed(3),'HR/G',(hr/(games/2)).toFixed(2),'BB%',(bb/pa*100).toFixed(1),'K%',(so/pa*100).toFixed(1),'2B/G',(d2/(games/2)).toFixed(2),'3B/G',(d3/(games/2)).toFixed(2),'PA/G',(pa/games).toFixed(1));
  for(let d=1;d<=3;d++){console.log('DIV',d,SL.standings(d).map(t=>`${t.name} ${t.rec.w}-${t.rec.l}`).join(' | '));}
  console.log('user cash',SL.money(ut.name&&ut.cash),'fin',ut.fin);
}

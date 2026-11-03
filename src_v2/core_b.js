// ===================== 코어 (B: 경기 엔진) =====================
function ensureBox(lg,pid){if(!lg.box[pid])lg.box[pid]={g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,so:0,r:0,rbi:0,pG:0,pGS:0,pOuts:0,pH:0,pR:0,pER:0,pBB:0,pSO:0,pPit:0,pW:0,pL:0,pSV:0};return lg.box[pid];}
function effAttr(p,k){let v=p.attrs[k]+(p.cond||0)+((p.morale||60)-60)*0.04;const f=p.fatigue||0;if(f>70)v-=(f-70)*0.25;return clamp(v,10,99);}
function pitchLimit(p){return p.pos==='SP'?p.attrs.stamina*0.9+30:p.attrs.stamina*0.45+14;}
function pitEff(lg,p){const pc=lg.pc[p.id]||0;const over=Math.max(0,pc-pitchLimit(p));return clamp(1-over*0.006,0.6,1);}
function teamSide(lg,side){return S.teams[side===1?lg.home:lg.away];}
function teamDef(lg,side){let s=0,w=0;const wt={C:1.3,SS:1.4,'2B':1.2,CF:1.3,'3B':1,LF:0.8,RF:0.9,'1B':0.7};for(const pid of lg.lineup[side]){const pos=lg.pos[side][pid];if(!pos||pos==='DH')continue;const p=S.players[pid];const d=clamp(p.attrs.defense-posPenalty(p,pos),10,99);const k=wt[pos]||1;s+=d*k;w+=k;}return w?s/w:50;}

function createGame(homeId,awayId,userGame){
  const H=S.teams[homeId],A=S.teams[awayId];
  const lg={home:homeId,away:awayId,inn:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],innScores:[[],[]],halfRuns:0,
    lineup:[[...A.lineup],[...H.lineup]],pos:[{...A.pos},{...H.pos}],bat:[0,0],pitcher:[null,null],used:[[],[]],subbed:[[],[]],pc:{},box:{},log:[],done:false,finalized:false,
    por:[null,null],lossP:null,leadSide:-1,entryLead:{},userGame:!!userGame,paCount:0,hits:[0,0],last:null};
  for(const side of [0,1]){const t=side===1?H:A;let sp=t.rotation.length?t.rotation[t.rotIdx%t.rotation.length]:null;
    if(sp==null||!S.players[sp]){sp=t.roster.map(id=>S.players[id]).filter(isPitcher)[0]?.id;}
    if(t.rotation.length)t.rotIdx=(t.rotIdx+1)%t.rotation.length;
    lg.pitcher[side]=sp;lg.used[side].push(sp);const b=ensureBox(lg,sp);b.pGS=1;b.pG=1;lg.entryLead[sp]=0;}
  for(const side of [0,1])for(const pid of lg.lineup[side]){const b=ensureBox(lg,pid);b.g=1;}
  glog(lg,`경기 시작: ${A.name} (원정) vs ${H.name} (홈)`,'info');
  return lg;
}
function glog(lg,text,type){lg.log.push({inn:lg.inn,half:lg.half,text,type:type||'n'});if(lg.log.length>400)lg.log.splice(0,lg.log.length-400);}
function curBatter(lg){return S.players[lg.lineup[lg.half][lg.bat[lg.half]]];}
function curPitcher(lg){return S.players[lg.pitcher[1-lg.half]];}

function scoreRun(lg,bs,runner,rbi,batterBox){
  lg.score[bs]++;lg.halfRuns++;
  const rb=ensureBox(lg,runner.pid);rb.r++;
  if(rbi&&batterBox)batterBox.rbi++;
  const pb=ensureBox(lg,runner.resp);pb.pR++;pb.pER++;
  const diff=lg.score[1]-lg.score[0];const ls=diff>0?1:diff<0?0:-1;
  if(ls!==lg.leadSide){if(ls!==-1){lg.por[ls]=lg.pitcher[ls];lg.lossP=lg.pitcher[1-ls];}lg.leadSide=ls;}
}
function addOut(lg,n){const pb=ensureBox(lg,lg.pitcher[1-lg.half]);lg.outs+=n;pb.pOuts+=n;}
function spd(pid){return S.players[pid]?effAttr(S.players[pid],'speed'):50;}
function fast(pid){const p=S.players[pid];return p&&p.traits.includes('빠른발')?8:0;}

function doPitch(lg){
  if(lg.done)return null;
  const bs=lg.half,fs=1-bs;
  const B=curBatter(lg),P=curPitcher(lg);
  const bb=ensureBox(lg,B.id),pb=ensureBox(lg,P.id);
  const eff=pitEff(lg,P);
  const ctl=effAttr(P,'control')*eff,stf=effAttr(P,'stuff')*eff,mov=effAttr(P,'movement')*eff;
  let con=effAttr(B,'contact'),pow=effAttr(B,'power'),eye=effAttr(B,'eye'),sp=effAttr(B,'speed');
  const risp=lg.bases[1]||lg.bases[2];
  if(risp&&B.traits.includes('클러치')){con+=4;pow+=4;}
  if(risp&&B.traits.includes('유리멘탈')){con-=3;eye-=3;}
  lg.pc[P.id]=(lg.pc[P.id]||0)+1;pb.pPit++;
  let zone=clamp(0.40+ctl*0.0032,0.45,0.78);if(lg.balls>=2)zone+=0.06;if(lg.strikes===2)zone-=0.07;if(lg.balls===3)zone+=0.05;
  const inZone=rnd()<zone;
  let swing;
  if(inZone)swing=0.62+(lg.strikes===2?0.25:0)-(lg.balls===3&&lg.strikes<2?0.2:0)+(lg.balls===0&&lg.strikes===0?-0.15:0);
  else swing=0.25-(eye-50)*0.004+(lg.strikes===2?0.15:0)-(lg.balls===3?0.12:0)+(lg.balls===0&&lg.strikes===0?-0.1:0);
  swing=clamp(swing,0.05,0.95);
  let res;
  if(rnd()>=swing)res=inZone?'strike':'ball';
  else{let cp=clamp(0.76+(con-50)*0.0045-(stf-50)*0.004+(inZone?0.06:-0.14),0.3,0.95);if(rnd()>=cp)res='whiff';else res=rnd()<0.46?'foul':'inplay';}
  let ev={type:res,text:'',paEnd:false};
  const cnt=()=>`(${lg.balls}B-${lg.strikes}S)`;
  if(res==='ball'){lg.balls++;ev.text=`볼 ${cnt()}`;if(lg.balls===4){doWalk(lg,B,bb,pb);ev.type='walk';ev.text=`${B.name} 볼넷`;ev.paEnd=true;}}
  else if(res==='strike'||res==='whiff'){lg.strikes++;ev.text=(res==='whiff'?'헛스윙 ':'')+`스트라이크 ${cnt()}`;if(lg.strikes===3){bb.ab++;bb.so++;pb.pSO++;addOut(lg,1);ev.type='so';ev.text=`${B.name} 삼진 아웃 (${lg.outs}아웃)`;ev.paEnd=true;}}
  else if(res==='foul'){if(lg.strikes<2)lg.strikes++;ev.text=`파울 ${cnt()}`;}
  else{ev=resolveInPlay(lg,B,P,bb,pb,con,pow,sp,stf,mov);ev.paEnd=true;}
  lg.last=ev;
  if(ev.paEnd)endPA(lg,ev);
  else glog(lg,ev.text,'p');
  return ev;
}
function doWalk(lg,B,bb,pb){
  bb.bb++;pb.pBB++;const b=lg.bases,P=lg.pitcher[1-lg.half];
  if(b[0]){if(b[1]){if(b[2])scoreRun(lg,lg.half,b[2],true,bb);b[2]=b[1];}b[1]=b[0];}
  b[0]={pid:B.id,resp:P};
}
function advRunners(lg,hitType,B,bb,def){
  const bs=lg.half,b=lg.bases,P=lg.pitcher[1-lg.half];const nb=[null,null,null];let runs=0;
  const score=(r)=>{scoreRun(lg,bs,r,true,bb);runs++;};
  if(hitType==='hr'){for(const r of [b[2],b[1],b[0]])if(r)score(r);score({pid:B.id,resp:P});}
  else if(hitType==='3b'){for(const r of [b[2],b[1],b[0]])if(r)score(r);nb[2]={pid:B.id,resp:P};}
  else if(hitType==='2b'){if(b[2])score(b[2]);if(b[1])score(b[1]);if(b[0]){if(rnd()<0.45+(spd(b[0].pid)+fast(b[0].pid)-50)*0.006-(def-50)*0.003)score(b[0]);else nb[2]=b[0];}nb[1]={pid:B.id,resp:P};}
  else{ // single
    if(b[2])score(b[2]);
    if(b[1]){if(rnd()<0.62+(spd(b[1].pid)+fast(b[1].pid)-50)*0.006-(def-50)*0.003)score(b[1]);else nb[2]=b[1];}
    if(b[0]){if(!nb[2]&&rnd()<0.28+(spd(b[0].pid)+fast(b[0].pid)-50)*0.005)nb[2]=b[0];else nb[1]=b[0];}
    nb[0]={pid:B.id,resp:P};
  }
  lg.bases=nb;return runs;
}
function resolveInPlay(lg,B,P,bb,pb,con,pow,sp,stf,mov){
  bb.ab++;const bs=lg.half,fs=1-bs;const def=teamDef(lg,fs);const before=lg.outs;
  let hrP=clamp(0.015+(pow-50)*0.0015-(stf-50)*0.0005-(mov-50)*0.0003,0.002,0.14);if(B.traits.includes('장타본능'))hrP*=1.25;
  const ev={type:'',text:'',paEnd:true};
  const ro=()=>lg.outs>0?` (${lg.outs}아웃)`:'';
  if(rnd()<hrP){bb.h++;bb.hr++;pb.pH++;const runs=advRunners(lg,'hr',B,bb,def);lg.hits[bs]++;ev.type='hr';ev.text=`${B.name} ${runs>1?runs+'점 ':''}홈런!`;return ev;}
  const hitP=clamp(0.34+(con-50)*0.003+(sp-50)*0.001-(def-50)*0.003-(mov-50)*0.0018,0.15,0.5);
  if(rnd()<hitP){
    bb.h++;pb.pH++;lg.hits[bs]++;
    const xb=clamp(0.17+(pow-50)*0.0035+(sp-50)*0.0012,0.05,0.45);const r=rnd();
    let type='1b';if(r<xb*0.1+Math.max(0,(sp-50))*0.0006)type='3b';else if(r<xb)type='2b';
    if(type==='3b'){bb.d3++;}else if(type==='2b'){bb.d2++;}
    const runs=advRunners(lg,type,B,bb,def);
    ev.type=type;ev.text=`${B.name} ${type==='3b'?'3루타':type==='2b'?'2루타':'안타'}${runs?` (${runs}득점)`:''}`;return ev;
  }
  const gP=clamp(0.52+(mov-50)*0.003-(pow-50)*0.002,0.3,0.75);const b=lg.bases;
  if(rnd()<gP){
    if(before<2&&b[0]){
      const dp=clamp(0.36-(sp-50)*0.005-(spd(b[0].pid)-50)*0.002+(def-50)*0.003,0.08,0.7);
      if(rnd()<dp){addOut(lg,2);if(before===0){if(b[2])scoreRun(lg,bs,b[2],false,bb);lg.bases=[null,null,b[1]||null];}else lg.bases=[null,null,null];
        ev.type='dp';ev.text=`${B.name} 병살타${ro()}`;return ev;}
    }
    addOut(lg,1);ev.type='go';let extra='';
    if(before<2){const nb=[b[0],null,null];if(b[2]){if(rnd()<0.5){scoreRun(lg,bs,b[2],true,bb);extra=' (1득점)';}else nb[2]=b[2];}if(b[1]){if(!nb[2]&&rnd()<0.5)nb[2]=b[1];else nb[1]=b[1];}lg.bases=nb;}
    ev.text=`${B.name} 땅볼 아웃${extra}${ro()}`;return ev;
  }
  addOut(lg,1);ev.type='fo';let extra='';
  if(before<2){const nb=[b[0],b[1],null];if(b[2]){if(rnd()<0.65){scoreRun(lg,bs,b[2],true,bb);extra=' 희생플라이 (1득점)';}else nb[2]=b[2];}if(b[1]&&!nb[2]&&rnd()<0.22){nb[2]=b[1];nb[1]=null;}lg.bases=nb;}
  ev.text=`${B.name} 뜬공 아웃${extra}${ro()}`;return ev;
}
function endPA(lg,ev){
  const bs=lg.half;const bb=ensureBox(lg,lg.lineup[bs][lg.bat[bs]]);bb.pa++;lg.paCount++;
  lg.balls=0;lg.strikes=0;lg.bat[bs]=(lg.bat[bs]+1)%lg.lineup[bs].length;
  glog(lg,ev.text,ev.type);
  if(lg.half===1&&lg.inn>=9&&lg.score[1]>lg.score[0]){finishGameState(lg,true);return;}
  if(lg.outs>=3){endHalf(lg);return;}
  aiPitchCheck(lg,1-bs,false);
}
function endHalf(lg){
  const bs=lg.half;lg.innScores[bs][lg.inn-1]=lg.halfRuns;lg.halfRuns=0;lg.outs=0;lg.bases=[null,null,null];lg.balls=0;lg.strikes=0;
  if(bs===0){if(lg.inn>=9&&lg.score[1]>lg.score[0]){finishGameState(lg,false);return;}lg.half=1;}
  else{if(lg.inn>=9&&lg.score[0]!==lg.score[1]){finishGameState(lg,false);return;}lg.inn++;lg.half=0;}
  glog(lg,`${lg.inn}회 ${lg.half===0?'초':'말'} — ${S.teams[lg.away].name} ${lg.score[0]} : ${lg.score[1]} ${S.teams[lg.home].name}`,'inn');
  aiPitchCheck(lg,1-lg.half,true);
}
function finishGameState(lg,walkoff){
  lg.done=true;const w=lg.score[1]>lg.score[0]?1:0;
  const wp=lg.por[w],lp=lg.lossP;if(wp!=null)ensureBox(lg,wp).pW=1;if(lp!=null)ensureBox(lg,lp).pL=1;
  const fp=lg.pitcher[w];if(fp!=null&&fp!==wp){const el=lg.entryLead[fp];if(el!=null&&el>0&&el<=3)ensureBox(lg,fp).pSV=1;}
  glog(lg,`경기 종료${walkoff?' (끝내기)':''}: ${S.teams[lg.away].name} ${lg.score[0]} : ${lg.score[1]} ${S.teams[lg.home].name}`,'end');
}
function availableBullpen(lg,side){const t=teamSide(lg,side);return t.bullpen.filter(id=>!lg.used[side].includes(id)&&S.players[id]&&!S.players[id].retired&&(S.players[id].fatigue||0)<78);}
function bench(lg,side){const t=teamSide(lg,side);return t.roster.filter(id=>{const p=S.players[id];return p&&!p.retired&&!isPitcher(p)&&!lg.lineup[side].includes(id)&&!lg.subbed[side].includes(id);});}
function changePitcher(lg,side,newPid){
  if(lg.done||lg.pitcher[side]===newPid)return false;
  const t=teamSide(lg,side);if(!t.roster.includes(newPid)||lg.used[side].includes(newPid))return false;
  const old=S.players[lg.pitcher[side]];const np=S.players[newPid];
  lg.pitcher[side]=newPid;lg.used[side].push(newPid);const b=ensureBox(lg,newPid);b.pG=1;lg.entryLead[newPid]=lg.score[side]-lg.score[1-side];
  glog(lg,`${t.name} 투수 교체: ${old?old.name:'?'} → ${np.name}`,'sub');return true;
}
function pinchHit(lg,side,benchPid){
  if(lg.done||lg.half!==side)return false;
  const t=teamSide(lg,side);if(!bench(lg,side).includes(benchPid))return false;
  const idx=lg.bat[side];const old=lg.lineup[side][idx];lg.lineup[side][idx]=benchPid;lg.pos[side][benchPid]=lg.pos[side][old];delete lg.pos[side][old];lg.subbed[side].push(old);
  const b=ensureBox(lg,benchPid);b.g=1;glog(lg,`${t.name} 대타: ${S.players[old].name} → ${S.players[benchPid].name}`,'sub');return true;
}
function aiPitchCheck(lg,side,halfStart){
  if(lg.done)return;const t=teamSide(lg,side);const P=S.players[lg.pitcher[side]];if(!P)return;
  const pc=lg.pc[P.id]||0,lim=pitchLimit(P),pb=ensureBox(lg,P.id);
  const lead=lg.score[side]-lg.score[1-side];const avail=availableBullpen(lg,side);if(!avail.length)return;
  const closer=t.closer!=null&&avail.includes(t.closer)?t.closer:null;
  const saveSpot=halfStart&&lg.inn>=9&&lead>0&&lead<=3&&closer!=null&&P.id!==closer;
  let need=false;
  if(pc>lim+12)need=true;else if(pc>lim&&(halfStart||lg.outs===0))need=true;
  else if(P.pos==='SP'&&pb.pR>=6&&lg.inn>=4)need=true;else if(P.pos==='RP'&&pb.pR>=3&&lg.outs<3)need=true;
  if(saveSpot&&(pc>lim*0.75||P.pos==='RP')){changePitcher(lg,side,closer);return;}
  if(!need)return;
  let pickId;if(lg.inn>=9&&lead>0&&lead<=3&&closer!=null)pickId=closer;else{const nonC=avail.filter(id=>id!==closer);const pool=nonC.length?nonC:avail;pool.sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]));pickId=lg.inn>=7?pool[0]:pool[Math.min(pool.length-1,Math.floor(pool.length/2))];}
  changePitcher(lg,side,pickId);
}
// ---- 진행 단위 (모두 동일 엔진) ----
function stepPitch(lg){return doPitch(lg);}
function stepPA(lg){const c=lg.paCount;let ev=null;while(!lg.done&&lg.paCount===c)ev=doPitch(lg);return ev;}
function stepHalf(lg){const h=lg.inn*2+lg.half;let ev=null;while(!lg.done&&lg.inn*2+lg.half===h)ev=doPitch(lg);return ev;}
function stepGame(lg){let n=0;while(!lg.done&&n<20000){doPitch(lg);n++;}return lg.last;}
// ---- 기록 반영 (중복 방지) ----
function finalizeGame(lg){
  if(!lg.done||lg.finalized)return;lg.finalized=true;
  const H=S.teams[lg.home],A=S.teams[lg.away];
  const hw=lg.score[1]>lg.score[0];
  H.rec[hw?'w':'l']++;A.rec[hw?'l':'w']++;H.rec.rs+=lg.score[1];H.rec.ra+=lg.score[0];A.rec.rs+=lg.score[0];A.rec.ra+=lg.score[1];
  for(const pid in lg.box){const p=S.players[pid];if(!p)continue;const b=lg.box[pid];const c=p.cur;for(const k in b)c[k]=(c[k]||0)+b[k];
    if(b.pG){p.fatigue=Math.min(100,(p.fatigue||0)+b.pPit*0.55);p.xp+=b.pOuts;}
    else if(b.g){p.fatigue=Math.min(100,(p.fatigue||0)+5);p.xp+=b.pa;}
  }
  if(lg.gameRef){const g=S.schedule[lg.gameRef];if(g&&!g.res)g.res={hs:lg.score[1],as:lg.score[0]};}
}

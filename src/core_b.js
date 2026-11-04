// ===================== 코어 (B: 경기 엔진) =====================
function ensureBox(lg,pid){if(!lg.box[pid])lg.box[pid]={g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,so:0,r:0,rbi:0,pG:0,pGS:0,pOuts:0,pH:0,pR:0,pER:0,pBB:0,pSO:0,pPit:0,pW:0,pL:0,pSV:0,pHR:0};return lg.box[pid];}
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
function glog(lg,text,type,x){const e={inn:lg.inn,half:lg.half,text,type:type||'n'};if(x){e.pid=x.pid;e.pit=x.pit;}lg.log.push(e);if(lg.log.length>400)lg.log.splice(0,lg.log.length-400);}
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
  const tk=tacNow(lg);if(tk==='hitrun'){con+=3;pow-=5;}else if(tk==='team'){pow-=8;con+=2;}else if(tk==='gb'){/* 아래 resolveInPlay에서 */}
  lg.pc[P.id]=(lg.pc[P.id]||0)+1;pb.pPit++;
  let zone=clamp(0.40+ctl*0.0032,0.45,0.78);if(lg.balls>=2)zone+=0.06;if(lg.strikes===2)zone-=0.07;if(lg.balls===3)zone+=0.05;
  const inZone=rnd()<zone;
  let swing;
  if(inZone)swing=0.62+(lg.strikes===2?0.25:0)-(lg.balls===3&&lg.strikes<2?0.2:0)+(lg.balls===0&&lg.strikes===0?-0.15:0);
  else swing=0.26-(eye-50)*0.0085+(lg.strikes===2?0.15:0)-(lg.balls===3?0.12:0)+(lg.balls===0&&lg.strikes===0?-0.1:0);  // 선구안: 볼에 덜 따라감 → 볼넷↑ 삼진↓
  if(tk==='wait'&&lg.strikes<2)swing*=inZone?0.7:0.55;if(tk==='hitrun')swing=Math.max(swing,inZone?0.85:0.5);
  swing=clamp(swing,0.05,0.95);
  let res;
  if(rnd()>=swing)res=inZone?'strike':'ball';
  else{let cp=clamp(0.76+(con-50)*0.0045-(stf-50)*0.004+(inZone?0.06:-0.14),0.3,0.95);if(rnd()>=cp)res='whiff';else res=rnd()<0.46?'foul':'inplay';}
  let ev={type:res,text:'',paEnd:false};lg.c0=[lg.balls,lg.strikes];
  const cnt=()=>`(${lg.balls}B-${lg.strikes}S)`;
  if(res==='ball'){lg.balls++;ev.text=`볼 ${cnt()}`;if(lg.balls===4){doWalk(lg,B,bb,pb);ev.type='walk';ev.text=`${B.name} 볼넷${lg.c0[1]===2?' (풀카운트 승부)':''}`;ev.paEnd=true;}}
  else if(res==='strike'||res==='whiff'){lg.strikes++;ev.text=(res==='whiff'?'헛스윙 ':'')+`스트라이크 ${cnt()}`;if(lg.strikes===3){bb.ab++;bb.so++;pb.pSO++;addOut(lg,1);ev.type='so';ev.text=`${B.name}, ${cntWord(lg)} ${res==='whiff'?'헛스윙':'루킹'} 삼진 아웃 (${lg.outs}아웃)`;ev.paEnd=true;
    if(tk==='hitrun'&&lg.bases[0]&&!lg.bases[1]&&lg.outs<3){const r=lg.bases[0];if(rnd()<stealP(lg,r.pid)){lg.bases[1]=r;lg.bases[0]=null;ev.text+=' · 1루 주자 2루 진루';}else{lg.bases[0]=null;addOut(lg,1);ev.text+=` · 1루 주자도 2루에서 아웃 (${lg.outs}아웃)`;}}}}
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
  const tk=tacNow(lg);let hrP=clamp(0.015+(pow-50)*0.0015-(stf-50)*0.0005-(mov-50)*0.0003,0.002,0.14);if(tk==='gb')hrP*=1.15;if(B.traits.includes('장타본능'))hrP*=1.25;const PK=parkOf(S.teams[lg.home]);hrP*=PK.hr;
  const ev={type:'',text:'',paEnd:true};
  const ro=()=>lg.outs>0?` (${lg.outs}아웃)`:'';
  if(rnd()<hrP){bb.h++;bb.hr++;pb.pH++;pb.pHR++;const runs=advRunners(lg,'hr',B,bb,def);lg.hits[bs]++;ev.type='hr';const hd=playDir(lg,B);const fz=PK.dim[hd.side];const dist=Math.round(fz+2+hd.r*16+Math.max(0,pow-50)*0.18);ev.text=`${B.name}, ${cntWord(lg)} ${hd.hr} ${runs===4?'만루':runs>1?runs+'점':'솔로'} 홈런! (비거리 ${dist}m · 펜스 ${fz}m)`;return ev;}
  const hitP=clamp(0.34+(con-50)*0.003+(sp-50)*0.001-(def-50)*0.003-(mov-50)*0.0018,0.15,0.5);
  if(rnd()<hitP){
    bb.h++;pb.pH++;lg.hits[bs]++;
    const xb=clamp((0.17+(pow-50)*0.0035+(sp-50)*0.0012)*PK.xb,0.05,0.45);const r=rnd();
    let type='1b';if(r<xb*0.1+Math.max(0,(sp-50))*0.0006)type='3b';else if(r<xb)type='2b';
    if(type==='3b'){bb.d3++;}else if(type==='2b'){bb.d2++;}
    const b0=lg.bases[0];const runs=advRunners(lg,type,B,bb,def);if(tk==='hitrun'&&type==='1b'&&b0&&lg.bases[1]===b0&&!lg.bases[2]){lg.bases[2]=b0;lg.bases[1]=null;}
    ev.type=type;const dd=playDir(lg,B);const inf=type==='1b'&&dd.r<0.12&&sp>=60;ev.text=`${B.name}, ${cntWord(lg)} ${inf?`${dd.inf} 깊은 곳 내야안타`:type==='3b'?dd.x3:type==='2b'?dd.x2:dd.x1}${runs?` (${runs}득점)`:''}`;return ev;
  }
  const gP=clamp(0.52+(mov-50)*0.003-(pow-50)*0.002+(tk==='gb'?0.1:0)+(tk==='team'?0.08:0),0.3,0.82);const b=lg.bases;
  if(rnd()<gP){
    if(before<2&&b[0]){
      const dp=tk==='hitrun'?0:clamp(0.36-(sp-50)*0.005-(spd(b[0].pid)-50)*0.002+(def-50)*0.003+(tk==='gb'?0.08:0),0.08,0.75);
      if(rnd()<dp){addOut(lg,2);if(before===0){if(b[2])scoreRun(lg,bs,b[2],false,bb);lg.bases=[null,null,b[1]||null];}else lg.bases=[null,null,null];
        ev.type='dp';const d=playDir(lg,B);ev.text=`${B.name}, ${cntWord(lg)} ${d.dp} 병살타${ro()}`;return ev;}
    }
    {const ih=Math.max(0,sp-55)*0.0045+(B.traits.includes('빠른발')?0.03:0);if(ih>0&&rnd()<ih){bb.h++;pb.pH++;lg.hits[bs]++;const runs=advRunners(lg,'1b',B,bb,def);const d=playDir(lg,B);ev.type='1b';ev.text=`${B.name}, ${cntWord(lg)} ${d.inf} 쪽 땅볼 — 빠른 발로 내야안타${runs?` (${runs}득점)`:''}`;return ev;}}
    addOut(lg,1);ev.type='go';let extra='';
    if(before<2){const adv=tk==='team'||tk==='hitrun';const nb=[b[0],null,null];if(tk==='hitrun'&&b[0]){nb[1]=b[0];nb[0]=null;}if(b[2]){if(rnd()<(adv?0.75:0.5)){scoreRun(lg,bs,b[2],true,bb);extra=' (1득점)';}else nb[2]=b[2];}if(b[1]){if(!nb[2]&&rnd()<(adv?0.9:0.5))nb[2]=b[1];else nb[1]=b[1];}lg.bases=nb;}
    {const d=playDir(lg,B);ev.text=`${B.name}, ${cntWord(lg)} ${d.go} 땅볼 아웃 — ${d.goBy}${extra}${ro()}`;}return ev;
  }
  addOut(lg,1);ev.type='fo';let extra='';
  if(before<2){const nb=[b[0],b[1],null];if(b[2]){if(rnd()<(tk==='team'?0.82:0.65)){scoreRun(lg,bs,b[2],true,bb);extra=' sf';}else nb[2]=b[2];}if(b[1]&&!nb[2]&&rnd()<0.22){nb[2]=b[1];nb[1]=null;}lg.bases=nb;}
  {const d=playDir(lg,B);let nm='';if(d.deep){const fz=PK.dim[d.side];const dist=Math.round(fz-1-hr01(lg,B,6)*5);const alt=parkNear(d.side,dist,lg.home);if(alt&&hr01(lg,B,7)<0.6)nm=` · 비거리 ${dist}m — ${josa(alt.name,'이었다면','였다면')} 넘어갔을 타구`;else nm=` · 비거리 ${dist}m`;}ev.text=`${B.name}, ${cntWord(lg)} ${d.foW} ${extra?'희생플라이 (1득점)':'뜬공 아웃'} — ${d.foBy}${nm}${ro()}`;}return ev;
}
// 타구 방향·잡은 수비수·볼카운트 문구 (난수 대신 타석 번호로 정해 경기 결과·밸런스에 영향 없음)
function cntWord(lg){const c=lg.c0||[0,0];const [b,s]=c;if(!b&&!s)return '초구에';if(b===3&&s===2)return '풀카운트에서';return `${b}볼 ${s}스트라이크에서`;}
function hr01(lg,B,k){let x=(lg.paCount*2654435761+B.id*40503+lg.inn*97+k*7919+(lg.pc[lg.pitcher[1-lg.half]]||0)*131)>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x=(x^(x>>>13))>>>0;return (x%10000)/10000;}
function fielder(lg,pos){const fs=1-lg.half;if(pos==='P'){const p=S.players[lg.pitcher[fs]];return p?p.name:'';}const pid=lg.lineup[fs].find(id=>lg.pos[fs][id]===pos);return pid!=null&&S.players[pid]?S.players[pid].name:'';}
function playDir(lg,B){const P=S.players[lg.pitcher[1-lg.half]];const bats=B.bats==='S'?(P&&P.throws==='L'?'R':'L'):B.bats;const r=hr01(lg,B,1),r2=hr01(lg,B,2);
  const dir=r<0.45?'pull':r<0.75?'mid':'oppo';const side=dir==='mid'?'C':(dir==='pull')===(bats!=='L')?'L':'R';  // L=좌측(3루 쪽), R=우측(1루 쪽)
  const F=k=>{const n=fielder(lg,k);return n?`${KO_POS[k]} ${n}`:KO_POS[k];};
  const goPos=side==='L'?(r2<0.5?'3B':'SS'):side==='R'?(r2<0.5?'2B':'1B'):(r2<0.25?'P':r2<0.65?'SS':'2B');
  const foPos=r2<0.22?(side==='L'?'3B':side==='R'?'1B':'SS'):side==='L'?'LF':side==='R'?'RF':'CF';
  const out={r:hr01(lg,B,3),side:side==='L'?'l':side==='R'?'r':'c'};
  out.go=`${KO_POS[goPos]} ${goPos==='P'?'앞':'쪽'}`;out.goBy=goPos==='1B'?`${F('1B')} 직접 처리`:`${F(goPos)} → 1루 송구`;
  out.deep=foPos.endsWith('F')&&r2>=0.4&&out.r>0.7;out.foW=foPos.endsWith('F')?`${KO_POS[foPos]} ${r2<0.4?'앞':out.r>0.7?'펜스 앞까지 가는':'쪽'}`:`${KO_POS[foPos]} 쪽 내야`;out.foBy=`${F(foPos)} 포구`;
  out.dp=side==='L'?`${KO_POS[goPos==='3B'?'3B':'SS']} 땅볼 → 2루 → 1루로 이어지는`:side==='R'?'2루수 땅볼 → 유격수 → 1루로 이어지는':'유격수 땅볼 → 2루수 → 1루로 이어지는';
  out.inf=KO_POS[side==='R'?'2B':'SS'];
  out.x1=side==='L'?(r2<0.5?'3유간 빠지는 좌전 안타':'좌전 안타'):side==='R'?(r2<0.5?'1·2루간 빠지는 우전 안타':'우전 안타'):(r2<0.4?'투수 옆 빠지는 중전 안타':'중전 안타');
  out.x2=side==='L'?(r2<0.4?'좌익선상 2루타':'좌중간 가르는 2루타'):side==='R'?(r2<0.4?'우익선상 2루타':'우중간 가르는 2루타'):'중견수 키 넘기는 2루타';
  out.x3=side==='L'?'좌중간 깊숙한 3루타':side==='R'?(r2<0.5?'우익선상 3루타':'우중간 깊숙한 3루타'):'가운데 펜스 맞히는 3루타';
  out.hr=side==='L'?'좌측 담장 넘기는':side==='R'?'우측 담장 넘기는':'가운데 담장 넘기는';return out;}
// ---------- 구장 ----------
// 구단마다 홈구장 규격(좌·중·우 펜스)이 조금씩 다르다. 홈런은 평균보다 최대 ±8%, 2·3루타는 ±4% 정도로만 차이를 둔다 (국내 10개 구장 평균 ≈ 1.00).
// 규격은 구단 이름에서 정해지는 가상 값이라 저장이 필요 없고 시드와 무관하게 늘 같다 (실제 구장 규격·이름은 쓰지 않음).
const PARK_SFX=['스타디움','볼파크','필드','야구장','파크','돔'];
function strHash(str){let h=2166136261>>>0;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
function parkDim0(name){const h=strHash(name);const f=k=>((h>>>(k*5))&31)/31;const l=Math.round(95+f(0)*6),r=Math.round(95+f(1)*6),c=Math.round(117+f(2)*8);const sfx=PARK_SFX[(h>>>20)%PARK_SFX.length];const fence=f(3)>0.75?'높은 펜스':'';const wind=f(4)>0.8&&sfx!=='돔'?'강바람':'';return {l,c,r,sfx,fence,wind};}
let PARK_REF=null;
function parkRef(){if(PARK_REF)return PARK_REF;const ds=TEAM_NAMES.KR.map(x=>parkDim0(x[0]));const m=k=>ds.reduce((a,d)=>a+d[k],0)/ds.length;const eff=d=>(d.l+d.r)*0.3+d.c*0.4+(d.fence?2:0)-(d.wind?1.5:0);PARK_REF={eAvg:ds.reduce((a,d)=>a+eff(d),0)/ds.length,c:m('c'),eff};return PARK_REF;}
const PARK_MEMO={};
function parkOf(t){if(!t)return {hr:1,xb:1,dim:{l:98,c:121,r:98},name:'구장'};const key=t.name;if(PARK_MEMO[key])return PARK_MEMO[key];const d=parkDim0(t.name);const R=parkRef();
  const hr=Math.round(clamp(1+(R.eAvg-R.eff(d))*0.028,0.92,1.08)*100)/100;const xb=Math.round(clamp(1+(d.c-R.c)*0.012,0.96,1.04)*100)/100;
  const city=t.name.split(' ')[0];const nick=t.name.split(' ').slice(1).join(' ');const shared=t.league==='KR'&&TEAM_NAMES.KR.filter(x=>x[0].split(' ')[0]===city).length>1;const notes=[];if(d.l<=96)notes.push('좌측 펜스가 가깝습니다');if(d.r<=96)notes.push('우측 펜스가 가깝습니다');if(d.c>=123)notes.push('중앙이 깊어 2·3루타가 잘 나옵니다');if(d.fence)notes.push('외야 펜스가 높습니다');if(d.wind)notes.push('외야 쪽으로 부는 바람이 잦아 타구가 잘 뻗습니다');if(!notes.length)notes.push('표준 규격 구장입니다');
  return PARK_MEMO[key]={name:shared?`${nick} ${d.sfx}`:`${city} ${d.sfx}`,hr,xb,dim:{l:d.l,c:d.c,r:d.r},fence:!!d.fence,wind:!!d.wind,notes,tag:hr>=1.04?'타자 친화':hr<=0.96?'투수 친화':'중립'};}
// 비거리 dist가 다른 국내 구장에선 넘어갔을지 (그 방향 펜스가 더 가까운 구장 중 가장 유명한 곳)
function parkNear(side,dist,homeId){const home=S.teams[homeId];const c=krTeams().filter(t=>t.id!==homeId).map(t=>({t,p:parkOf(t)})).filter(x=>x.p.dim[side]+(x.p.fence?1:0)<dist).sort((a,b)=>presOf(b.t)-presOf(a.t)||a.p.dim[side]-b.p.dim[side]);return c[0]?c[0].p:null;}
const KO_POS={P:'투수',C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수'};
function endPA(lg,ev){
  const bs=lg.half;const bid=lg.lineup[bs][lg.bat[bs]];const bb=ensureBox(lg,bid);bb.pa++;lg.paCount++;
  lg.balls=0;lg.strikes=0;lg.bat[bs]=(lg.bat[bs]+1)%lg.lineup[bs].length;
  glog(lg,ev.text,ev.type,lg.userGame?{pid:bid,pit:lg.pitcher[1-bs]}:null);
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
// ---------- 경기 작전 (EA 2011의 「이득 / 대가」 한 줄 설명 방식을 우리 식으로) ----------
// 유저 경기에서만 쓴다 (AI 구단은 기존 엔진 그대로라 밸런스 기준값 유지). 작전은 그 타석에만 적용
const TACTICS={
  bunt:{ko:'보내기 번트',side:'off',now:true,gain:'주자 한 베이스 진루',cost:'타자는 아웃 · 실패하면 앞 주자가 잡힘'},
  steal:{ko:'도루',side:'off',now:true,gain:'주자 한 베이스 진루 (발 빠를수록 성공↑)',cost:'실패하면 주자 아웃 · 포수 어깨가 좋으면 위험'},
  dsteal:{ko:'이중 도루',side:'off',now:true,gain:'1·2루 주자 동시 진루',cost:'실패하면 앞 주자 아웃'},
  hitrun:{ko:'히트 앤드 런',side:'off',gain:'안타 때 1루 주자 3루까지 · 병살 없음',cost:'장타 감소 · 삼진이면 주자도 위험'},
  team:{ko:'팀배팅',side:'off',gain:'아웃돼도 주자 진루 · 희생플라이 잘 나옴',cost:'장타 크게 감소'},
  wait:{ko:'공 기다리기',side:'off',gain:'볼넷 증가',cost:'루킹 삼진 증가'},
  ibb:{ko:'고의사구',side:'def',now:true,gain:'강타자를 피함',cost:'주자를 공짜로 내보냄'},
  gb:{ko:'땅볼 유도',side:'def',gain:'땅볼·병살 증가',cost:'맞으면 장타 위험 증가'}};
function catcherDef(lg,fs){for(const pid of lg.lineup[fs]){if(lg.pos[fs][pid]==='C'){const p=S.players[pid];return p?p.attrs.defense:50;}}return 50;}
function stealP(lg,pid){const fs=1-lg.half;const P=S.players[lg.pitcher[fs]];return clamp(0.62+(spd(pid)-50)*0.012+fast(pid)*0.012-(catcherDef(lg,fs)-50)*0.006+(P&&P.throws==='L'?-0.04:0),0.2,0.93);}
function tacOk(lg,side,k){const T=TACTICS[k];if(!T||lg.done)return {ok:false,why:'경기 중이 아닙니다.'};const atBat=lg.half===side;const b=lg.bases;
  if(T.side==='off'&&!atBat)return {ok:false,why:'공격 때만 쓸 수 있습니다.'};if(T.side==='def'&&atBat)return {ok:false,why:'수비 때만 쓸 수 있습니다.'};
  if(k==='bunt'){if(!(b[0]||b[1]))return {ok:false,why:'1루나 2루에 주자가 있어야 합니다.'};if(lg.outs>=2)return {ok:false,why:'2아웃에는 보내기 번트를 하지 않습니다.'};if(lg.strikes>=2)return {ok:false,why:'2스트라이크에는 번트가 위험합니다 (파울이면 삼진).'};}
  if(k==='steal'){if(!((b[0]&&!b[1])||(b[1]&&!b[2])))return {ok:false,why:'앞 베이스가 빈 1루·2루 주자가 있어야 합니다.'};}
  if(k==='dsteal'){if(!(b[0]&&b[1]&&!b[2]))return {ok:false,why:'1·2루에 주자가 있고 3루가 비어야 합니다.'};}
  if(k==='hitrun'){if(!b[0]||b[1])return {ok:false,why:'1루에만 주자가 있을 때 씁니다.'};if(lg.outs>=2)return {ok:false,why:'2아웃에는 의미가 적습니다.'};}
  if(k==='team'){if(!(b[1]||b[2]))return {ok:false,why:'득점권(2·3루)에 주자가 있을 때 씁니다.'};}
  if(k==='ibb'){if(lg.balls||lg.strikes)return {ok:false,why:'타석 시작 때만 고의사구를 할 수 있습니다.'};}
  return {ok:true};}
function setTactic(lg,side,k){const c=tacOk(lg,side,k);if(!c.ok)return {ok:false,msg:c.why};const T=TACTICS[k];
  if(!T.now){lg.tac={k,pa:lg.paCount};glog(lg,`[작전] ${T.ko}`,'tac');return {ok:true,msg:`${T.ko} 지시 — 이번 타석에 적용`};}
  const bs=lg.half,b=lg.bases;const B=curBatter(lg),P=curPitcher(lg);const bb=ensureBox(lg,B.id),pb=ensureBox(lg,P.id);const nm=r=>S.players[r.pid]?S.players[r.pid].name:'주자';
  if(k==='ibb'){doWalk(lg,B,bb,pb);endPA(lg,{type:'walk',text:`[작전] 고의사구 — ${B.name} 1루로`,paEnd:true});return {ok:true,msg:'고의사구'};}
  if(k==='steal'||k==='dsteal'){const lead=k==='dsteal'?b[1]:(b[1]&&!b[2]?b[1]:b[0]);const from=b.indexOf(lead);const pr=stealP(lg,lead.pid)-(k==='dsteal'?0.05:0)-(from===1?0.06:0);let txt;
    if(rnd()<pr){if(k==='dsteal'){b[2]=b[1];b[1]=b[0];b[0]=null;txt=`[작전] 이중 도루 성공 — ${nm(b[2])} 3루, ${nm(b[1])} 2루`;}else{b[from+1]=lead;b[from]=null;txt=`[작전] ${nm(lead)} ${from===0?'2루':'3루'} 도루 성공`;}glog(lg,txt,'tac');}
    else{addOut(lg,1);if(k==='dsteal'){b[1]=b[0];b[0]=null;b[2]=null;txt=`[작전] 이중 도루 실패 — 앞 주자 ${nm(lead)} 3루에서 아웃 (${lg.outs}아웃)`;}else{b[from]=null;txt=`[작전] ${nm(lead)} 도루 실패 — 아웃 (${lg.outs}아웃)`;}glog(lg,txt,'tac');if(lg.outs>=3)endHalf(lg);}
    return {ok:true,msg:txt.replace('[작전] ','')};}
  if(k==='bunt'){const pr=clamp(0.68+(effAttr(B,'contact')-50)*0.004+(B.traits.includes('빠른발')?0.03:0),0.45,0.9);let txt;
    if(rnd()<pr){addOut(lg,1);const nb=[null,b[0]||null,b[1]||null];let sq='';if(b[2]){if(nb[2]){scoreRun(lg,bs,b[2],true,bb);sq=' · 3루 주자 홈인';}else nb[2]=b[2];}lg.bases=nb;txt=`[작전] ${B.name} 보내기 번트 성공 — 주자 진루${sq} (${lg.outs}아웃)`;endPA(lg,{type:'sac',text:txt,paEnd:true});}
    else if(rnd()<0.5){bb.ab++;addOut(lg,1);txt=`[작전] ${B.name} 번트 실패 — 뜬공 아웃 (${lg.outs}아웃)`;endPA(lg,{type:'fo',text:txt,paEnd:true});}
    else{bb.ab++;addOut(lg,1);const bat={pid:B.id,resp:P.id};let nb,where;if(b[0]&&b[1]&&b[2]){nb=[bat,b[0],b[1]];where='홈';}else if(b[0]&&b[1]){nb=[bat,b[0],null];where='3루';}else if(b[0]){nb=[bat,null,b[2]];where='2루';}else{nb=[bat,null,b[2]];where='3루';}txt=`[작전] ${B.name} 번트 — 앞 주자 ${where}에서 아웃, 타자 1루 (${lg.outs}아웃)`;lg.bases=nb;endPA(lg,{type:'go',text:txt,paEnd:true});}
    return {ok:true,msg:txt.replace('[작전] ','')};}
  return {ok:false,msg:'알 수 없는 작전'};}
function tacNow(lg){const t=lg.tac;return t&&t.pa===lg.paCount?t.k:null;}
function stepPitch(lg){return doPitch(lg);}
function stepPA(lg){const c=lg.paCount;let ev=null;while(!lg.done&&lg.paCount===c)ev=doPitch(lg);return ev;}
function stepHalf(lg){const h=lg.inn*2+lg.half;let ev=null;while(!lg.done&&lg.inn*2+lg.half===h)ev=doPitch(lg);return ev;}
function stepGame(lg){let n=0;while(!lg.done&&n<20000){doPitch(lg);n++;}return lg.last;}
// ---- 기록 반영 (중복 방지) ----
// 1군 데뷔: 우리 구단 선수가 프로 첫 1군 경기에 나서면 한 번만 기록 (등록만으로는 데뷔가 아님)
function debutCheck(p,lg,b){if(p.deb||p.teamId!==S.userTeamId||p.age>25)return;if((p.hist||[]).some(h=>h.st&&(h.st.g||h.st.pG)))return;if((p.cur.g||0)+(p.cur.pG||0)>0){p.deb=1;return;}
  const opp=S.teams[lg.home===S.userTeamId?lg.away:lg.home];const line=b.pG?`${Math.floor(b.pOuts/3)}${b.pOuts%3?'.'+b.pOuts%3:''}이닝 ${b.pR}실점 ${b.pSO}삼진`:`${b.ab}타수 ${b.h}안타${b.hr?' '+b.hr+'홈런':''}${b.rbi?' '+b.rbi+'타점':''}`;
  p.deb={s:S.season,d:S.day,vs:opp?opp.name:'',line};news(`[1군 데뷔] ${p.name}(${p.age}세), ${opp?opp.name.split(' ')[0]:''}전 첫 1군 경기 — ${line}`,'growth');}
function finalizeGame(lg){
  if(!lg.done||lg.finalized)return;lg.finalized=true;
  const H=S.teams[lg.home],A=S.teams[lg.away];
  const hw=lg.score[1]>lg.score[0];const sg=lg.gameRef!=null?S.schedule[lg.gameRef]:null;
  // 포스트시즌(post) 경기는 정규 시즌 순위·선수 시즌 기록에 넣지 않는다 (선수 기록은 p.ps에 따로)
  if(!(sg&&sg.post)){H.rec[hw?'w':'l']++;A.rec[hw?'l':'w']++;H.rec.rs+=lg.score[1];H.rec.ra+=lg.score[0];A.rec.rs+=lg.score[0];A.rec.ra+=lg.score[1];}
  const isPost=!!(sg&&sg.post);
  for(const pid in lg.box){const p=S.players[pid];if(!p)continue;const b=lg.box[pid];if(!isPost&&(lg.home===S.userTeamId||lg.away===S.userTeamId)&&(b.g||b.pG)){debutCheck(p,lg,b);if(b.hr&&p.deb&&p.deb.s&&!(p.ms&&p.ms.hr1)&&!(p.cur.hr>0)&&!(p.hist||[]).some(h=>h.st&&h.st.hr)){const opp=S.teams[lg.home===S.userTeamId?lg.away:lg.home];p.ms=Object.assign(p.ms||{},{hr1:{s:S.season,d:S.day,vs:opp?opp.name:''}});news(`[첫 홈런] ${p.name}, 1군 첫 홈런! (${opp?opp.name.split(' ')[0]:''}전)`,'growth');}}const c=isPost?(p.ps=p.ps||newStat()):p.cur;for(const k in b)c[k]=(c[k]||0)+b[k];
    if(b.pG){p.fatigue=Math.min(100,(p.fatigue||0)+b.pPit*0.55);p.xp+=b.pOuts;}
    else if(b.g){p.fatigue=Math.min(100,(p.fatigue||0)+5);p.xp+=b.pa;}
  }
  if(lg.gameRef!=null){const g=S.schedule[lg.gameRef];if(g&&!g.res)g.res={hs:lg.score[1],as:lg.score[0]};}
}

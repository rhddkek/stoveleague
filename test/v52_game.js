// v52: 홀드·세이브·블론세이브(실제 기록 규칙) · 자동 도루와 도루 기록 · 타석 단위 진행에서 도루·공수교대가 따로 멈춤
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
console.log('[1] 우리 경기 기록 규칙 (매 경기 검사)');
SL.newGame(5252,3,{games:144});S=SL.state();
let games=0,e={wsv:0,svhd:0,svNotLast:0,svStarter:0,svLoser:0,hdLast:0,hdNoOut:0,svNoOut:0,svBig:0},stealLogs=0,sbBox=0,svN=0,hdN=0,bsN=0,stopSteal=0,paChecks=0;
while(S.phase==='season'&&S.day<=100){const g=SL.startDay();if(g){
    // 타석 단위로 진행: 도루가 나오면 그 장면에서 멈추고, 3아웃이면 이닝이 바뀌는 데서 멈춘다
    while(!g.done){const h0=g.inn*2+g.half,c0=g.paCount;const ev=SL.stepPA(g);paChecks++;if(ev&&ev.steal){stopSteal++;if(g.paCount!==c0)bad('도루 장면에서 타석이 같이 진행됨');}
      if(!g.done&&g.inn*2+g.half!==h0&&g.balls+g.strikes>0)bad('이닝이 바뀐 뒤 다음 타석 공까지 진행됨');}
    games++;const w=g.score[1]>g.score[0]?1:0;const wt=w?g.home:g.away;const last=g.pitcher[w];
    for(const pid in g.box){const b=g.box[pid];const p=S.players[pid];if(!p)continue;const side=p.teamId===g.home?1:0;
      if(b.pW&&b.pSV)e.wsv++;if(b.pSV&&b.pHD)e.svhd++;if(b.pSV&&+pid!==last)e.svNotLast++;if(b.pSV&&b.pGS)e.svStarter++;if(b.pSV&&side!==w)e.svLoser++;
      if(b.pHD&&+pid===g.pitcher[side])e.hdLast++;if(b.pHD&&!(b.pOuts>=1))e.hdNoOut++;if(b.pSV&&!(b.pOuts>=1))e.svNoOut++;
      if(b.pSV){const sv=g.svs[pid];if(!(sv&&sv.lead>0&&((sv.lead<=3&&b.pOuts>=3)||sv.tie||b.pOuts>=9)))e.svBig++;}
      svN+=b.pSV||0;hdN+=b.pHD||0;bsN+=b.pBS||0;sbBox+=b.sb||0;}
    stealLogs+=g.log.filter(l=>l.type==='sb').length;SL.endUserGame();}else SL.playDayAuto();
  for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
const E=Object.entries(e).filter(([k,v])=>v);E.length?bad('규칙 위반 '+JSON.stringify(e)):ok(`${games}경기: 승리·세이브 중복 없음 · 세이브는 이긴 팀 마지막 투수(선발 아님, 3점 이내 1이닝↑ / 동점 주자 상황 / 3이닝↑) · 홀드는 아웃 1개 이상 잡고 리드 지킨 채 교체된 불펜`);
svN>0&&hdN>0?ok(`우리 경기 세이브 ${svN} · 홀드 ${hdN} · 블론 ${bsN}`):bad(`세이브 ${svN} 홀드 ${hdN}`);
stealLogs>0&&sbBox>=stealLogs?ok(`도루 ${sbBox}개 기록 · 도루 장면에서 따로 멈춘 진행 ${stopSteal}번`):bad(`도루 로그 ${stealLogs} 기록 ${sbBox}`);
console.log('[2] 한 시즌 리그 기록 (현실 범위)');
while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
{const T=SL.krTeams();const ps=Object.values(S.players).filter(p=>p.hist&&p.hist.some(h=>h.s===1&&h.lg==='KR1'));const st=p=>p.hist.find(h=>h.s===1&&h.lg==='KR1').st;
  let sb=0,cs=0,rs=0,g=0,sv=0,hd=0;for(const p of ps){const s=st(p);sb+=s.sb||0;cs+=s.cs||0;sv+=s.pSV||0;hd+=s.pHD||0;}for(const t of T){rs+=t.rec.rs;g+=t.rec.w+t.rec.l+(t.rec.tie||0);}
  const top=k=>Math.max(...ps.map(p=>st(p)[k]||0));const rpg=rs/g,sbg=sb/g,rate=sb/(sb+cs);
  rpg>=4.3&&rpg<=5.3?ok(`경기당 득점 ${rpg.toFixed(2)}`):bad('득점 '+rpg);
  sbg>=0.5&&sbg<=1.4&&rate>=0.66&&rate<=0.82?ok(`팀 경기당 도루 ${sbg.toFixed(2)} · 성공률 ${(rate*100).toFixed(0)}% · 도루 1위 ${top('sb')}개`):bad(`도루 ${sbg} 성공률 ${rate}`);
  top('sb')>=25&&top('sb')<=75?ok('도루왕 개수 현실 범위'):bad('도루 1위 '+top('sb'));
  const tsv=sv/T.length,thd=hd/T.length;tsv>=25&&tsv<=55&&thd>=35&&thd<=95?ok(`구단당 세이브 ${tsv.toFixed(0)} · 홀드 ${thd.toFixed(0)} · 세이브 1위 ${top('pSV')} · 홀드 1위 ${top('pHD')}`):bad(`세이브 ${tsv} 홀드 ${thd}`);
  top('pSV')>=20&&top('pSV')<=55&&top('pHD')>=18&&top('pHD')<=50?ok('세이브왕·홀드왕 현실 범위'):bad(`1위 세이브 ${top('pSV')} 홀드 ${top('pHD')}`);
  const A=S.awards[1]&&S.awards[1].KR1;A&&A.titles.some(t=>t.k==='hd')&&A.titles.some(t=>t.k==='sb')?ok(`시상: ${A.titles.filter(t=>['hd','sb'].includes(t.k)).map(t=>SL.AWARD_LABEL[t.k]+' '+t.name+' '+t.vs).join(', ')}`):bad('홀드왕·도루왕 시상 없음');
  const L=SL.leadersPast('KR1','hd',3,1),L2=SL.leadersPast('KR1','sb',3,1);L.length===3&&L[0].v>=L[2].v&&L2.length===3?ok(`기록실 홀드·도루 순위 (${L[0].p.name} ${L[0].v} · ${L2[0].p.name} ${L2[0].v})`):bad('기록실 홀드·도루');
  const j=SL.serialize();SL.load(j);S=SL.state();const again=Object.values(S.players).filter(p=>p.hist&&p.hist.some(h=>h.s===1&&h.lg==='KR1'));let s2=0,h2=0;for(const p of again){const x=st(p);s2+=x.sb||0;h2+=x.pHD||0;}s2===sb&&h2===hd?ok('저장·불러오기 뒤 도루·홀드 기록 그대로'):bad(`불러오기 뒤 ${s2}/${sb} ${h2}/${hd}`);}
console.log('[3] 다른 리그 요약 기록 · 구버전 저장');
{const os=Object.values(S.players).filter(p=>p.hist&&p.hist.some(h=>h.s===1&&h.lg==='JP'));const sb=os.reduce((a,p)=>a+(p.hist.find(h=>h.s===1&&h.lg==='JP').st.sb||0),0),hd=os.reduce((a,p)=>a+(p.hist.find(h=>h.s===1&&h.lg==='JP').st.pHD||0),0);sb>0&&hd>0?ok(`일본 리그 요약에도 도루 ${sb} · 홀드 ${hd}`):bad(`일본 요약 도루 ${sb} 홀드 ${hd}`);}
{SL.load(fs.readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();let n=0;for(let i=0;i<5&&S.phase==='season';i++){SL.playDayAuto();n++;}const p=Object.values(S.players).find(x=>x.teamId!=null&&!SL.isPitcher(x));const l=SL.statLine(p);l.sb!=null&&!isNaN(l.sb)?ok(`v29 저장 이어서 ${n}일 진행 · 새 기록 칸 0부터`):bad('구버전 statLine '+JSON.stringify(l));}
console.log('[4] v55 불펜 보직');
{SL.newGame(5555,4,{games:144});S=SL.state();const u=SL.userTeam();const bp=u.bullpen.slice().sort((a,b)=>SL.calcOvr(S.players[b])-SL.calcOvr(S.players[a]));
  const roles=u.bullpen.map(id=>SL.rpRoleOf(u,id));roles.filter(r=>r==='setup').length===2&&roles.filter(r=>r==='closer').length<=1?ok('지정 안 하면 셋업 2명 자동 (능력 순) · '+roles.join(' ')):bad('자동 보직 '+roles.join(' '));
  const x=bp[bp.length-1];SL.setRpRole(u,x,'setup');SL.rpRoleOf(u,x)==='setup'&&u.bullpen.map(id=>SL.rpRoleOf(u,id)).filter(r=>r==='setup').length===2?ok('셋업 지정하면 자동 셋업 한 자리 줄어 총 2명 유지'):bad('셋업 지정');
  SL.setRpRole(u,x,'closer');u.closer===x&&SL.rpRoleOf(u,x)==='closer'?ok('마무리 지정'):bad('마무리 지정');SL.setRpRole(u,x,'long');u.closer==null&&SL.rpRoleOf(u,x)==='long'?ok('마무리 → 롱릴리프 바꾸면 마무리 비움'):bad('보직 변경');
  let setupHd=0,otherHd=0,longEarly=0,n=0;const st=u.bullpen.find(id=>SL.rpRoleOf(u,id)==='setup');
  while(S.phase==='season'&&n++<60){const g=SL.startDay();if(g){SL.stepGame(g);for(const pid in g.box){const b=g.box[pid];if(!b.pHD||!u.bullpen.includes(+pid))continue;if(SL.rpRoleOf(u,+pid)==='setup')setupHd++;else otherHd++;}
      const e=g.log.find(l=>l.type==='sub'&&/투수 교체/.test(l.text)&&l.inn<=5);SL.endUserGame();}else SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
  setupHd>=otherHd?ok(`홀드는 셋업이 주로 챙김 (셋업 ${setupHd} · 그 외 ${otherHd})`):bad(`홀드 분배 셋업 ${setupHd} 그 외 ${otherHd}`);
  const j=SL.serialize();SL.load(j);S=SL.state();SL.userTeam().rpRole&&SL.rpRoleOf(SL.userTeam(),x)==='long'?ok('저장·불러오기 뒤 보직 유지'):bad('보직 저장');
  SL.load(fs.readFileSync(__dirname+'/v29_save.json','utf8'));S=SL.state();const t0=SL.userTeam();t0.rpRole&&t0.bullpen.every(id=>['setup','long','mid','closer'].includes(SL.rpRoleOf(t0,id)))?ok('구버전 저장: 보직 자동 배정'):bad('구버전 보직');}
console.log(fails?`v52 검증 실패 ${fails}건`:'v52 검증 모두 통과');process.exit(fails?1:0);

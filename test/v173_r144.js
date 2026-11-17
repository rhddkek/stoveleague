// v173 (R144): 구단주 회수를 빼고 돈 쓸 곳 — 새 시설(의료센터 · 전력분석실 · 2군 구장) · 구장 증축 · 해외 아카데미 · 팬 마케팅 · 성과 보너스
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const season=S=>{let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}};
function offseason(S){let g=0;while(S.phase==='offseason'&&g++<12){if(SL.draftTurn&&SL.draftTurn())SL.draftAuto();for(const pid of [...(S.pendingFA||[])]){const p=S.players[pid];if(p)SL.renewContract(pid,SL.salaryFor(p)*1.2,2);}if(S.week>=SL.BAL.OFFSEASON_WEEKS)break;SL.advanceWeek();}let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}return r;}
const V=SL.INV;
// 1. 구단주 회수 없음
{SL.newGame(17301,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=20000000;season(S);(SL.ownerSweep===undefined&&ut.cash>19000000&&!S.news.some(n=>/^\[구단주\] 보유 현금/.test(n.text)))?ok(`현금 1조를 들고 시즌을 넘겨도 회수 없음(${SL.money(ut.cash)})`):bad('회수 '+ut.cash);}
// 2. 새 시설
{SL.newGame(17302,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=9e6;const c0=ut.cash;const costs=[];for(let i=0;i<5;i++){const b=ut.cash;const e=SL.invFacUp('med');if(e)bad('의료센터 '+e);costs.push(b-ut.cash);}
  const e6=SL.invFacUp('med');(costs.join()===[1,2,3,4,5].map(x=>V.fac.med.cost*x).join()&&e6==='최대 레벨입니다.'&&SL.invOf(ut).med===5)?ok(`의료센터 0 → 5레벨: ${costs.map(SL.money).join(' · ')} (모두 ${SL.money(c0-ut.cash)}) · 6번째는 「${e6}」`):bad('의료센터 값 '+costs.join());
  SL.invFacUp('lab');SL.invFacUp('farm');SL.invFacUp('farm');const up=SL.invUpkeep(ut);up===V.fac.med.up*5+V.fac.lab.up+V.fac.farm.up*2?ok(`한 해 유지비 ${SL.money(up)} (의료 5 · 분석 1 · 2군 2)`):bad('유지비 '+up);
  const R=SL.invFacRows('med',5);R[0][1]==='−25%'&&R[1][1]==='−25%'&&SL.invFacRows('farm',2)[0][1]==='+8%'&&SL.invFacRows('lab',1)[0][1]==='+8%'?ok('화면 수치: 의료 5레벨 부상 확률 · 기간 −25% · 2군 구장 2레벨 성장 +8% · 분석실 1레벨 관찰 +8%'):bad('표 '+JSON.stringify(R));
  ut.cash=10;SL.invFacUp('lab')&&/자금 부족/.test(SL.invFacUp('lab'))?ok('돈이 모자라면 「자금 부족」'):bad('자금 검사');}
{const inj=lv=>{SL.newGame(17303,2,{games:144});const S=SL.state();const ut=SL.userTeam();SL.invOf(ut).med=lv;let d=0,n=0;const seen=new Set();let k=0;while(S.phase==='season'&&k++<200){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const id of ut.roster){const p=S.players[id];if(p&&p.inj){d++;const key=id+':'+p.inj.d;if(!seen.has(key)){seen.add(key);n++;}}}}return {d,n};};const a=inj(0),b=inj(5);
  b.d<a.d?ok(`같은 시드 한 시즌: 의료센터 없음 부상 ${a.n}건 · 결장 ${a.d}일 → 5레벨 ${b.n}건 · ${b.d}일`):bad('의료센터 효과 '+JSON.stringify([a,b]));}
{SL.newGame(17304,2,{games:72});const S=SL.state();const ut=SL.userTeam();SL.invOf(ut).farm=5;season(S);const hit=ut.dev.concat(ut.roster).map(i=>S.players[i]).filter(p=>p&&JSON.stringify(p).includes('2군 구장 Lv.5')).length;hit>=1?ok(`2군 구장 5레벨: 시즌 끝 성장 기록에 「2군 구장 Lv.5」가 붙은 선수 ${hit}명`):bad('2군 구장 효과 없음');}
// 3. 구장 증축
{SL.newGame(17305,2,{games:36});let S=SL.state();let ut=SL.userTeam();ut.cash=9e6;const b=ut.cash;const i0=SL.seatInfo(ut);const e=SL.seatBuild();const e2=SL.seatBuild();
  (!e&&b-ut.cash===V.seat[0].cost&&e2==='이미 공사 중입니다.'&&SL.invTicketF(ut)===1&&i0.next.open===2&&S.news.some(n=>/^\[구장\] 외야석 증축 착공/.test(n.text)))?ok(`외야석 증축 착공 ${SL.money(V.seat[0].cost)} · 공사 중에는 수입 그대로 · 또 누르면 「${e2}」`):bad('착공 '+JSON.stringify([e,e2,b-ut.cash]));
  season(S);offseason(S);S=SL.state();ut=SL.userTeam();(SL.invOf(ut).seat===1&&!SL.invOf(ut).build&&Math.abs(SL.invTicketF(ut)-1.1)<1e-9&&S.news.some(n=>/^\[구장\] 외야석 증축 완공 — 입장 수입 \+10%/.test(n.text)))?ok('다음 개막에 완공 — 입장 수입 ×1.10'):bad('완공 '+JSON.stringify(SL.invOf(ut)));
  const a=SL.ticketIncome?1:0;SL.invOf(ut).seat=3;Math.abs(SL.invTicketF(ut)-1.4)<1e-9&&SL.seatInfo(ut).next===null?ok('새 구장까지 지으면 ×1.40 · 더 지을 것 없음'):bad('새 구장');}
// 4. 해외 아카데미
{SL.newGame(17306,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=9e6;const b=ut.cash;const e=SL.acadOpen('CB');SL.acadOpen('AU');SL.acadOpen('MX');const dup=SL.acadOpen('CB');const badN=SL.acadOpen('JP');
  (!e&&b-ut.cash===V.acad.set*3&&dup==='이미 운영 중입니다.'&&/세울 수 없는/.test(badN)&&SL.invUpkeep(ut)===V.acad.run*3)?ok(`아카데미 3곳 설립 ${SL.money(V.acad.set)}씩 · 운영비 한 해 ${SL.money(SL.invUpkeep(ut))}`):bad('아카데미 설립 '+JSON.stringify([e,dup,badN]));
  season(S);const ys=S.youth.map(i=>S.players[i]).filter(p=>p&&p.acad===ut.id);const nats=ys.map(p=>p.nat).sort().join();const p=ys[0];
  (ys.length===3&&nats==='AU,CB,MX'&&ys.every(q=>q.natv&&!SL.isFgn(q)&&q.age>=17&&q.age<=19&&q.pot>SL.calcOvr(q)+8)&&SL.fgnBlock(ut,p,3000)===null&&S.news.some(n=>/^\[아카데미\] 유망주 3명 도착/.test(n.text)))?ok(`겨울에 유망주 3명(${ys.map(q=>`${q.name} ${q.nat} ${q.age}세 ${Math.round(SL.calcOvr(q))}/${Math.round(q.pot)}`).join(' · ')}) — 외국인 정원에 들지 않음`):bad('아카데미 유망주 '+JSON.stringify(ys.map(q=>[q.nat,q.natv,q.age,q.pot])));
  SL.acadClose('AU');Object.keys(SL.invOf(ut).acad).length===2?ok('닫으면 운영비에서 빠짐 '+SL.money(SL.invUpkeep(ut))):bad('닫기');}
// 5. 마케팅 · 보너스
{SL.newGame(17307,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=9e6;const b=ut.cash;const e=SL.mktSet(2);const e2=SL.mktSet(3);const rep0=ut.rep;
  (!e&&b-ut.cash===V.mkt[2].cost&&/이미 정했습니다/.test(e2)&&Math.abs(SL.invTicketF(ut)-1.06)<1e-9)?ok(`시즌 캠페인 ${SL.money(V.mkt[2].cost)} — 입장 수입 ×1.06 · 한 해에 한 번`):bad('마케팅 '+JSON.stringify([e,e2]));
  const m0=ut.roster.map(i=>S.players[i].morale);const b2=ut.cash;const eb=SL.bonusSet('champ');const m1=ut.roster.map(i=>S.players[i].morale);const up=m1.filter((x,i)=>x===Math.min(100,m0[i]+V.bonus.champ.mor)).length;
  (!eb&&ut.cash===b2&&up===m0.length&&/이미 약속/.test(SL.bonusSet('ps')))?ok(`우승 보너스 ${SL.money(V.bonus.champ.cost)} 약속 — 돈은 아직 그대로 · 선수단 사기 +${V.bonus.champ.mor}`):bad('보너스 약속 '+JSON.stringify([eb,up,m0.length]));
  const c1=ut.cash;SL.invSeasonEnd({post:{champ:ut.id,ser:[]}});(c1-ut.cash===V.bonus.champ.cost&&ut.rep>=rep0+V.mkt[2].rep&&S.news.some(n=>/^\[보너스\] 우승 달성 — 약속한/.test(n.text))&&S.news.some(n=>/^\[마케팅\] 시즌 캠페인 효과 — 팬 평판 \+2/.test(n.text)))?ok('시즌 끝: 우승하면 보너스 지급 · 마케팅 팬 평판 +2'):bad('시즌 끝 '+JSON.stringify([c1-ut.cash,ut.rep,rep0]));
  const c2=ut.cash;SL.invSeasonEnd({post:{champ:ut.id,ser:[]}});c2===ut.cash?ok('두 번 불러도 한 번만'):bad('중복 지급');}
{SL.newGame(17308,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=9e6;for(let i=0;i<V.bonusDay+2;i++)SL.playDayAuto();const e=SL.bonusSet('ps');/일차까지만/.test(e||'')?ok(`개막 ${V.bonusDay}일차가 지나면 보너스 약속 마감`):bad('보너스 마감 '+e);
  SL.bonusOpen()===false?0:bad('bonusOpen');}
{SL.newGame(17309,2,{games:36});const S=SL.state();const ut=SL.userTeam();ut.cash=9e6;SL.bonusSet('ps');const c=ut.cash;SL.invSeasonEnd({post:{champ:-1,ser:[]}});(c===ut.cash&&S.news.some(n=>/^\[보너스\] 가을야구 진출 실패/.test(n.text)))?ok('못 이루면 지급 없음'):bad('실패 처리');}
// 6. 리그 돈 규모
{SL.newGame(17310,2,{games:36,league:'JP'});const ut=SL.userTeam();const f=SL.invCost(ut,V.seat[0].cost)/V.seat[0].cost;f>1.5?ok(`일본 구단은 금액이 리그 돈 규모만큼(×${f.toFixed(2)}): 외야석 증축 ${SL.money(SL.invCost(ut,V.seat[0].cost))}`):bad('리그 규모 '+f);}
// 7. 화면
(async()=>{const path=require('path');const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:360,height:780,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰 360':'PC';
    const r=await p.evaluate(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms||150));const o={};const txt=q=>{const e=document.querySelector(q);return e?e.textContent.replace(/\s+/g,' ').trim():'';};
      UI.pickLg('KR');UI.pickTeam(2);UI.newGame();const sb=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(sb)sb.click();UI.closeModal();const S=SL.state();S.tutorialDone=true;const ut=SL.userTeam();ut.cash=4e6;
      UI.go('club','fac');await w();o.chips=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());o.grid=[...document.querySelectorAll('.facgrid .fac .nm')].map(x=>x.textContent);
      [...document.querySelectorAll('.facgrid .fac')].find(x=>/의료센터/.test(x.textContent)).click();await w();o.sec=txt('.mkcard .mksec');const c0=ut.cash;document.querySelector('.mkcard button.primary').click();await w();o.med=SL.invOf(ut).med;o.paid=c0-ut.cash;o.sec2=txt('.mkcard .mksec');o.ow1=document.documentElement.scrollWidth-innerWidth;
      UI.go('club','inv');await w();o.title=txt('.mkh .t');o.h=document.documentElement.scrollHeight/innerHeight;o.ow2=document.documentElement.scrollWidth-innerWidth;const sbn=[...document.querySelectorAll('button')].find(x=>/외야석 증축 ·/.test(x.textContent)&&x.offsetParent);sbn.click();await w();o.sure=txt('#modal .modal');[...document.querySelectorAll('#modal button')].find(x=>x.textContent.trim()==='착공').click();await w();o.build=!!SL.invOf(ut).build;o.seatRow=document.body.textContent.includes('공사 중');
      const pg=[...document.querySelectorAll('.pgtabs button')];o.pg=pg.map(x=>x.textContent.replace(/^\d+/,''));const clickTxt=async(re)=>{for(const t of [null].concat([...document.querySelectorAll('.pgtabs button')])){if(t){t.click();await w();}const bt=[...document.querySelectorAll('button')].find(x=>re.test(x.textContent)&&x.offsetParent);if(bt){bt.click();await w();return true;}}return false;};
      o.a=await clickTxt(/^설립 ·/);o.m=await clickTxt(/^15억$/);o.b=await clickTxt(/^약속 · 20억/);const I=SL.invOf(ut);o.acad=Object.keys(I.acad).length;o.mkt=I.mkt&&I.mkt.lv;o.bonus=I.bonus&&I.bonus.k;o.body=document.body.textContent.replace(/\s+/g,' ');o.primary=[...document.querySelectorAll('button.primary.big')].filter(x=>x.offsetParent).length;return o;});
    r.chips.join()==='시설,투자,구단 위상,옛 제자'&&r.grid.join()==='훈련장,유소년 센터,스카우트 조직,의료센터,전력분석실,2군 구장'?ok(`${tag} 구단 → 구단: 칩 「${r.chips.join(' · ')}」 · 시설 6칸`):bad(`${tag} 칩/시설 `+JSON.stringify([r.chips,r.grid]));
    /의료센터 신설 · Lv\.0 → 1/.test(r.sec)&&r.med===1&&r.paid===V.fac.med.cost&&/의료센터 증설 · Lv\.1 → 2/.test(r.sec2)&&r.ow1<=0?ok(`${tag} 의료센터 신설 단추 → Lv.1 (${SL.money(r.paid)})`):bad(`${tag} 의료센터 `+JSON.stringify([r.sec,r.med,r.paid,r.sec2,r.ow1]));
    r.title==='구단 투자'&&/공사비는 지금 나가고/.test(r.sure)&&r.build&&r.seatRow&&r.ow2<=0&&(!vp.m||r.h<=1.02)?ok(`${tag} 투자: 구장 착공은 확인 창 뒤에 · 「공사 중」 줄${vp.m?` · 한 화면(${r.h.toFixed(2)}) · 쪽 「${r.pg.join(' / ')}」`:''}`):bad(`${tag} 투자 `+JSON.stringify([r.title,r.sure.slice(0,40),r.build,r.seatRow,r.ow2,r.h]));
    r.a&&r.m&&r.b&&r.acad===1&&r.mkt===1&&r.bonus==='ps'&&r.primary<=1?ok(`${tag} 아카데미 설립 · 지역 광고 · 가을야구 보너스 단추 동작 · 노란 큰 단추 ${r.primary}개`):bad(`${tag} 단추 `+JSON.stringify([r.a,r.m,r.b,r.acad,r.mkt,r.bonus,r.primary]));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();
  console.log(fails?`실패 ${fails}건`:'v173 통과');process.exit(fails?1:0);})();

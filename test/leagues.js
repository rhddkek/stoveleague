// 해외 리그 검증: 실제 규모·지구 배정, 구버전 세이브 거부(v28 10구단 전환), 일본 감독 일정(같은 리그 125 + 교류전 18 = 143)
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const B=SL.BAL;const EXPECT={JP:[12,[6,6]],US:[30,[5,5,5,5,5,5]],TW:[6],MX:[20,[10,10]],AU:[4],CB:[6]};
function structure(label){S=SL.state();for(const lg in EXPECT){const ts=Object.values(S.teams).filter(t=>t.league===lg);if(ts.length!==EXPECT[lg][0])bad(`${label} ${lg} 구단 수 ${ts.length}`);
  if(EXPECT[lg][1]){const c=EXPECT[lg][1].map((_,i)=>ts.filter(t=>t.sub===i).length);if(c.join()!==EXPECT[lg][1].join())bad(`${label} ${lg} 지구 배정 ${c.join()}`);}
  for(const t of ts){if(t.roster.length<B.LEAGUES[lg].roster-2)bad(`${label} ${t.name} 로스터 ${t.roster.length}`);for(const id of t.roster){const p=S.players[id];if(!p||p.teamId!==t.id)bad(`${label} 소속 불일치 ${t.name}`);}}}
  const real=['술타네스','디아블로스','티부로네스','레오네스','토로스','퍼스 히트','멜버른 스톰','티그레스','드래곤스','라이온스','게이터즈','롱혼스','마리아치스'];
  for(const t of Object.values(S.teams))if(real.some(r=>t.name.includes(r)))bad(`${label} 실존 유사 구단명 남음 ${t.name}`);
  const names=Object.values(S.teams).map(t=>t.name);if(new Set(names).size!==names.length)bad(label+' 구단명 중복');}
function playOut(){while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}}
function offseason(){while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}if(!r.ok)bad('개막 실패 '+r.msg);const j=SL.serialize();SL.load(j);S=SL.state();}
function jpSchedule(label){const ut=SL.userTeam();const G=SL.lgGames('JP'),I=Math.round(18*G/143);const ts=SL.compTeams('JP');const games=S.schedule.filter(g=>g.div==='JP');
  for(const t of ts){const mine=games.filter(g=>g.home===t.id||g.away===t.id);const inter=mine.filter(g=>S.teams[g.home].sub!==S.teams[g.away].sub).length;if(mine.length!==G||inter!==I)bad(`${label} ${t.name} 경기 ${mine.length} 교류전 ${inter}`);
    const days=new Set(mine.map(g=>g.day));if(days.size!==mine.length)bad(`${label} ${t.name} 하루 2경기`);}
  ok(`${label} 일본 12구단 × ${G}경기 (리그 ${G-I} + 교류전 ${I}) · 우리 리그 ${SL.compName(SL.compOf(ut))}`);}
console.log('[1] 새 게임 구조');SL.newGame(99,1);structure('새 게임');ok('일본 12(6/6) · 미국 30(5×6) · 대만 6 · 멕시코 20(10/10) · 호주 4 · 도미니카 6');
playOut();const h=S.overseas.hist[S.overseas.hist.length-1].tables;
for(const lg of ['JP','US','MX']){const subs=B.LEAGUES[lg].subs;for(let i=0;i<subs.length;i++){const rows=h[lg].filter(r=>r.sub===i);const ranks=rows.map(r=>r.rank).sort((a,b)=>a-b).join();if(ranks!==rows.map((_,k)=>k+1).join())bad(`${lg} ${subs[i]} 순위 ${ranks}`);}}
ok('해외 시즌 결산: 지구별 순위 산정 ('+h.US.filter(r=>r.sub===0).map(r=>r.name.split(' ').pop()+' '+r.w+'-'+r.l).join(', ')+')');
if(h.JP[0].w+h.JP[0].l!==143||h.US[0].w+h.US[0].l!==162)bad('해외 경기 수');else ok('일본 143경기 · 미국 162경기 시즌');
console.log('[2] 구버전 세이브 거부');for(const f of ['v3_save.json','v3_jp_save.json']){let err=null;try{SL.load(fs.readFileSync(__dirname+'/'+f,'utf8'));}catch(e){err=e.message;}err&&/10개 구단/.test(err)?ok(f+' 안내와 함께 거부'):bad(f+' 거부 안 됨');}
console.log('[3] 일본 구단 감독으로 이직');SL.newGame(5151,1);S=SL.state();playOut();
{const jp=Object.values(S.teams).find(t=>t.league==='JP');S.jobOffers=[{id:S.nextOfferId++,team:jp.id,kind:'job',goal:{text:'3위 이내',target:3},rankExp:4,n:6,expires:2,reason:'test'}];const e=SL.moveManager(S.jobOffers[0].id);e?bad('이직 실패 '+e):ok('일본 '+jp.name+' 감독 취임');}
offseason();jpSchedule('개편 후 첫 시즌');const sub=SL.compTeams(SL.compOf(SL.userTeam()));sub.length===6?ok('우리 리그 6구단: '+sub.map(t=>t.name).join(', ')):bad('지구 구단 수 '+sub.length);
playOut();const L2=S.history[S.history.length-1];const sw=SL.standings(SL.compOf(SL.userTeam()));if(sw[L2.user.rank-1].id!==SL.userTeam().id)bad('리그 순위 불일치');else ok(`센트럴/퍼시픽 순위 결산 (${L2.user.rank}위)`);
console.log(fails?`리그 개편 검증 실패 ${fails}건`:'리그 개편 검증 모두 통과');process.exit(fails?1:0);

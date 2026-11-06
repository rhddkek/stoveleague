// v48: 한국·일본·대만·미국 어느 구단이든 처음부터 맡아 한 시즌 → 스토브리그 → 다음 시즌까지
// 리그마다 실제 경기 수·구조(교류전, 전·후반기, 지구) · 가을야구 방식 · 드래프트 · 올스타 · 외국인 규정, 그리고 구버전 저장 호환
const SL=require('./run.js');const fs=require('fs');let S;let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
function playOut(){let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}}
function offseason(){while(S.week<=6){if(SL.draftTurn())SL.draftAuto();for(const pid of [...S.pendingFA]){const p=S.players[pid];SL.renewContract(pid,SL.salaryFor(p)*1.4,2);}SL.advanceWeek();}let r=SL.startNewSeason();if(!r.ok){SL.autoFillUser();r=SL.startNewSeason();}if(!r.ok)bad('개막 실패 '+r.msg);const j=SL.serialize();SL.load(j);S=SL.state();}
const per=(lg)=>{const c={},h={};for(const g of S.schedule){if(g.post||(lg==='KR'?g.div!==1:g.div!==lg))continue;for(const t of [g.home,g.away])c[t]=(c[t]||0)+1;h[g.home]=(h[g.home]||0)+1;}return {c,h};};
const EXP={KR:144,JP:143,TW:120,US:162};
for(const lg of ['JP','TW','US']){
  console.log(`[${lg}] 새 게임`);SL.newGame(4800+lg.charCodeAt(0),1,{games:144,league:lg});S=SL.state();const ut=SL.userTeam();
  ut.league===lg&&ut.isUser?ok(`${ut.name} (${SL.compName(SL.compOf(ut))}) 단장으로 시작`):bad('우리 리그 '+ut.league);
  SL.BAL.SEASON_GAMES===Math.max(144,EXP[lg])?ok(`달력 ${SL.BAL.SEASON_GAMES}일`):bad('달력 '+SL.BAL.SEASON_GAMES);
  SL.userGames()===EXP[lg]?ok(`정규 시즌 ${EXP[lg]}경기`):bad('경기 수 '+SL.userGames());
  {const {c,h}=per(lg);const ts=SL.compTeams(lg==='JP'?'JP/0':lg==='US'?'US/0':'TW').length?Object.values(S.teams).filter(t=>t.league===lg):[];let e=0;for(const t of ts){if(c[t.id]!==EXP[lg])e++;if(Math.abs(h[t.id]-EXP[lg]/2)>2)e++;}e?bad(`${lg} 구단별 경기·홈 불일치 ${e}`):ok(`${ts.length}개 구단 모두 ${EXP[lg]}경기 · 홈 절반`);}
  {const {c}=per('KR');const k=SL.krTeams().filter(t=>c[t.id]!==144).length;k?bad('한국 경기 수 불일치 '+k):ok('한국 리그도 그대로 144경기 (결과만 진행)');}
  {const d=new Set();let dup=0;for(const g of S.schedule)for(const t of [g.home,g.away]){const k=g.day+':'+t;if(d.has(k))dup++;d.add(k);}dup?bad('하루 2경기 '+dup):ok('하루 1경기');}
  if(lg==='JP'){const mine=S.schedule.filter(g=>g.div==='JP'&&(g.home===ut.id||g.away===ut.id));const inter=mine.filter(g=>g.inter).length;inter===18?ok('교류전 18경기 (같은 리그 125)'):bad('교류전 '+inter);}
  if(lg==='TW'){const mine=S.schedule.filter(g=>g.div==='TW'&&(g.home===ut.id||g.away===ut.id));const h1=mine.filter(g=>g.half===1).length;h1===60?ok('전반기 60 · 후반기 60'):bad('전반기 '+h1);}
  {const t=SL.fgnRuleText(lg);(lg==='JP'?/1군 등록 외국인 4명/:lg==='TW'?/4명/:/제한 없음/).test(t)?ok('외국인 규정: '+t):bad('외국인 규정 '+t);}
  // 경기 중간 저장·불러오기
  for(let i=0;i<40;i++)SL.playDayAuto();{const j=SL.serialize();SL.load(j);S=SL.state();SL.userTeam().league===lg&&SL.userGames()===EXP[lg]?ok('시즌 중 저장·불러오기'):bad('불러오기 뒤 리그·경기 수');}
  if(lg==='JP'){const t=SL.userTeam();const on=t.roster.map(id=>S.players[id]).filter(p=>p&&SL.isFgnIn(p,'JP'));on.length<=4?ok(`1군 외국인 ${on.length}명 (4명 이내)`):bad('1군 외국인 '+on.length);}
  // 정규 시즌 끝 → 우리 리그 가을야구
  let saw=null;{let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');if(S.lpost&&!saw){saw=JSON.parse(JSON.stringify(S.lpost));const j=SL.serialize();SL.load(j);S=SL.state();}}}
  saw?ok(`가을야구 시작: ${saw.rounds[0].name} (${saw.seedsTxt})`):bad('가을야구가 열리지 않음');
  const rec=S.history[S.history.length-1];
  rec&&rec.lpost&&rec.lpost.champ!=null?ok(`우승 ${S.teams[rec.lpost.champ].name} · 라운드 ${rec.lpost.rounds.map(R=>R.name).join(' → ')}`):bad('가을야구 기록 없음');
  if(rec&&rec.lpost){const names=rec.lpost.rounds.map(R=>R.name).join();const want={JP:/클라이맥스.*파이널.*일본시리즈/,US:/와일드카드.*디비전.*챔피언십.*월드시리즈/,TW:/플레이오프.*대만시리즈/}[lg];want.test(names)?ok('리그 방식대로 진행'):bad('라운드 '+names);
    for(const R of rec.lpost.rounds)for(const c of R.ser){if(c.winner==null)bad('승자 없는 시리즈 '+c.name);}
    const fin=rec.lpost.rounds[rec.lpost.rounds.length-1].ser[0];(Math.max(...fin.w)===4)?ok(`결승 ${fin.w.join(':')}`):bad('결승 승수 '+fin.w);}
  rec&&rec.post&&rec.post.champ!=null?ok('한국 가을야구 결과도 기록'):bad('한국 가을야구 기록 없음');
  const L=S.lastSummary;L&&L.post?ok('시즌 결산: '+L.post):bad('결산 문구 없음');
  const m=S.mgr.seasons[S.mgr.seasons.length-1];m&&(m.ps==null||m.pst)?ok('감독 실적 기록 '+(m.pst||'가을야구 진출 실패')+' · 목표 '+m.goal):bad('감독 실적 '+JSON.stringify(m&&[m.ps,m.pst]));
  const A=S.allstar;A&&A.lg===lg&&A.names?ok(`올스타전 ${A.names.blue} vs ${A.names.red}`):bad('올스타 리그 '+(A&&A.lg));
  S.draft&&S.draft.lg===lg&&S.draft.n===Object.values(S.teams).filter(t=>t.league===lg).length?ok(`${S.draft.name} (${S.draft.n}개 구단)`):bad('드래프트 '+JSON.stringify(S.draft&&[S.draft.lg,S.draft.n]));
  S.draftKR&&S.draftKR.lg==='KR'&&S.draftKR.done?ok('한국 고교 드래프트는 AI끼리 끝남'):bad('한국 드래프트');
  {const pool=S.draft.pool.map(id=>S.players[id]).filter(Boolean);pool.every(p=>p.nat===lg)?ok('지명 후보 국적 '+lg):bad('지명 후보 국적');}
  offseason();
  SL.userTeam().league===lg&&SL.userGames()===EXP[lg]&&S.season===2?ok('2시즌 개막 (같은 리그·경기 수)'):bad('2시즌 '+SL.userGames());
}
console.log('[KR] 한국 구단은 그대로');
{SL.newGame(4848,9,{arch:true,games:144});S=SL.state();const ut=SL.userTeam();ut.league==='KR'&&SL.BAL.SEASON_GAMES===144&&SL.userGames()===144?ok('한국 144경기 · '+ut.name):bad('한국 새 게임');}
console.log('[저장] 구버전 저장 호환');
for(const f of fs.readdirSync(__dirname).filter(x=>/_save\.json$/.test(x))){let err=null;try{SL.load(fs.readFileSync(__dirname+'/'+f,'utf8'));}catch(e){err=e.message;}
  if(err){/새 게임|10개 구단/.test(err)?ok(f+' (예전부터 안내와 함께 거부)'):bad(f+' '+err);continue;}
  S=SL.state();S.kg>0&&SL.BAL.SEASON_GAMES>=S.kg?ok(`${f}: 한국 ${S.kg}경기로 불러옴`):bad(f+' kg '+S.kg);for(let i=0;i<3&&S.phase==='season';i++)SL.playDayAuto();ok(f+' 이어서 진행');}
console.log(fails?`리그별 플레이 검증 실패 ${fails}건`:'리그별 플레이 검증 모두 통과');process.exit(fails?1:0);

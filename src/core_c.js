// ===================== 코어 (C: 시즌/육성/경제/이적/해외/저장) =====================
function userTeam(){return S.teams[S.userTeamId];}
function P_(id){return S.players[id];}
function krTeams(){return Object.values(S.teams).filter(t=>t.league==='KR');}
function divTeams(){return krTeams();}   // 국내는 단일 리그 (예전 부별 호출 호환)
// 경쟁 단위: 국내는 1(10개 구단 단일 리그), 해외는 리그 또는 리그/지구('JP/0' = 일본 센트럴리그)
function lgOf(c){return typeof c==='string'?c.split('/')[0]:c;}
function activeT(t){return !(t.since>S.season);}
function compOf(t){if(t.league==='KR')return 1;const L=BAL.LEAGUES[t.league];if(!L||!L.subs||t.sub==null)return t.league;if(S.compLegacy&&S.compLegacy.s===S.season&&S.compLegacy.lg===t.league)return t.league;return t.league+'/'+t.sub;}
function compTeams(c){if(typeof c==='number')return divTeams(c);const [lg,sub]=String(c).split('/');return Object.values(S.teams).filter(t=>t.league===lg&&activeT(t)&&(sub==null||t.sub===+sub));}
function compName(c){if(typeof c==='number')return '한국 프로야구';const [lg,sub]=String(c).split('/');const L=BAL.LEAGUES[lg];if(!L)return String(c);return sub!=null&&L.subs?L.name+' '+L.subs[+sub]:L.name;}
function leagueComps(lg){const L=BAL.LEAGUES[lg];if(!L||!L.subs)return [lg];if(S.compLegacy&&S.compLegacy.s===S.season&&S.compLegacy.lg===lg)return [lg];return L.subs.map((_,i)=>lg+'/'+i);}
function playLg(){const t=userTeam();return t&&t.league!=='KR'?t.league:null;}
function liveTeams(){const pl=playLg();return pl?krTeams().concat([userTeam()]):krTeams();}
function econ(t){const e=econ0(t);return gf()===1?e:{...e,ticket:e.ticket/gf()};}
// 리그 경제: 한국 기준값 × 리그 규모(선수 연봉 총액 비율). 우리 리그가 어디든 「연봉 대비 수입」 감각은 같게
const LG_ECON={JP:1.6,TW:0.35,US:2.9};
function econ0(t){if(t.league==='KR')return {ticket:BAL.TICKET[1],sponsor:BAL.SPONSOR[1],overhead:BAL.OVERHEAD[1]*presIncome(t),dividend:BAL.DIVIDEND[1]};const f=LG_ECON[t.league];if(f){const g=(BAL.LEAGUES[t.league]&&BAL.LEAGUES[t.league].games||144)/144;return {ticket:BAL.TICKET[1]*f/g,sponsor:BAL.SPONSOR[1]*f,overhead:BAL.OVERHEAD[1]*f,dividend:BAL.DIVIDEND[1].map(x=>Math.round(x*f))};}return BAL.ECON[t.league]||{ticket:2000,sponsor:50000,overhead:20000,dividend:[20000]};}
function news(text,kind){S.news.unshift({s:S.season,d:S.phase==='season'?S.day:'OFF'+S.week,text,kind:kind||'n'});if(S.news.length>120)S.news.length=120;}
function warn(text){S.warn.push(text);}

// ---------- 새 게임 ----------
function newGame(seed,userIdx,opt){opt=opt||{};const kg=BAL.SEASON_OPTIONS.includes(+opt.games)?+opt.games:144;setGames(kg);const ulg=opt.league&&opt.league!=='KR'&&BAL.LEAGUES[opt.league]&&TEAM_NAMES[opt.league]?opt.league:'KR';
  S={version:VERSION,lvlV:BAL.LVL_VER,seed:seed|0,rng:seed|0,nextId:1,season:1,day:1,phase:'season',week:0,clock:1,userTeamId:null,teams:{},players:{},schedule:[],liveGame:null,fa:[],
     games:BAL.SEASON_GAMES,kg,market:{listed:[],offers:[],negs:[],attempts:{},scoutResults:null},youth:[],pendingFA:[],news:[],history:[],overseas:{hist:[]},tutorialDone:false,nextOfferId:1,warn:[],lastSummary:null,draft:null,settings:{stopOnOffer:true},pins:[],dispatch:null,mgr:{seasons:[],cur:null}};
  // 한국 프로야구 10개 구단 (실제 연고 도시 + 가상 애칭). 유저는 그중 하나를 맡는다
  const ui=clamp(userIdx|0,0,TEAM_NAMES.KR.length-1);
  TEAM_NAMES.KR.forEach(([n,c],i)=>{const t=genTeam(n,c,'KR',1,false);presInit(t,i);t.rep=clamp(Math.round(30+t.pres*0.55)+ri(-5,5),5,100);S.teams[t.id]=t;});
  for(const lg in BAL.LEAGUES)TEAM_NAMES[lg].forEach(([n,c,sub])=>{const t=genTeam(n,c,lg,0,false);if(sub!=null)t.sub=sub;S.teams[t.id]=t;});
  const ut=ulg==='KR'?krTeams().find(t=>t.name===TEAM_NAMES.KR[ui][0]):Object.values(S.teams).find(t=>t.league===ulg&&t.name===TEAM_NAMES[ulg][clamp(userIdx|0,0,TEAM_NAMES[ulg].length-1)][0]);ut.isUser=true;S.userTeamId=ut.id;
  for(const t of Object.values(S.teams)){fillRoster(t);autoLineup(t);}
  if(opt.arch&&ulg==='KR')applyArch(ut,opt.arch===true?BAL.ARCH_OF[ui]:opt.arch);
  if(ulg!=='KR'){ut.fin=Object.assign(newFin(),ut.fin||{});ut.dev=ut.dev||[];ut.loan=0;ut.cash=Math.round(BAL.START_CASH[1]*(LG_ECON[ulg]||1));if(!(ut.rep>0))ut.rep=60;S.mgr.career=[{team:ut.id,name:ut.name,comp:compOf(ut),from:1,to:null}];}
  setGames(calDays());S.games=BAL.SEASON_GAMES;   // 유형은 선수 구성을 바꾸고, 전력 수준은 아래에서 실제 순위에 맞춘다
  calibrateKR();
  for(const id in S.players){const p=S.players[id];p.snap=snapOf(p);if(p.teamId!=null&&p.age<=25)p.deb=1;}   // 시작 선수단은 이미 데뷔한 선수로 본다
  ut.staff=starterStaff(ut,true);refreshStaffPool();
  for(const pid of ut.roster){const p=P_(pid);p.joinSnap={s:1,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),role:rosterRole(ut,pid).text};p.userLink=true;if(p.age<=23)p.devStart=r1(calcOvr(p));p.ovrStart=r1(calcOvr(p));if(p.contract.years<2)p.contract.years=2;p.scout=makeScout(p,0.45);p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([1,calcValue(p)]);}
  for(let i=0;i<40;i++){const p=genPlayer({pos:pick(ROSTER_TEMPLATE),lvl:BAL.LEVEL_OVR.FA,nat:ulg==='KR'?(rnd()<0.1?pick(['US','JP']):'KR'):(rnd()<0.75?ulg:pick(['US','KR','JP','MX'].filter(x=>x!==ulg)))});S.players[p.id]=p;S.fa.push(p.id);}
  for(const id in S.players){const p=S.players[id];if(!p.userLink){delete p.snap.attrs;delete p.base;}}
  genSchedule();
  aiAims(true);
  ensureSpon(ut);
  for(const t of krTeams())applySponsor(t);
  mgrStart();
  news(`${ut.name}의 단장으로 부임했습니다. ${presTier(ut)} 구단 — 가을야구, 그리고 한국시리즈 우승에 도전하세요.`,'sys');
  return S;
}
function registerPlayer(p){S.players[p.id]=p;return p;}
// 시작 전력: 기본 위상에 맞춰 주전 전력을 조금씩 벌린다 (리그 평균은 그대로). 실제 성적은 쓰지 않는다
function calibrateKR(){const ts=krTeams();
  for(let pass=0;pass<3;pass++){const pw=ts.map(t=>teamPower(t).power);const mean=pw.reduce((a,b)=>a+b,0)/pw.length;
    ts.forEach((t,k)=>{const tgt=mean+(presOf(t)-BAL.PRES_NORM[1])*BAL.KR_STR_K;const d=tgt-pw[k];if(Math.abs(d)<0.05)return;
      for(const pid of t.roster){const p=P_(pid);for(const x in p.attrs)p.attrs[x]=clamp(p.attrs[x]+d,20,99);}});}
  for(const t of ts)autoLineup(t);}
// 시즌 길이: 36(빠르게)·72(보통)·144(프로, 실제 한국 프로야구). 일정·수입·성장은 경기 수에 맞춰 환산해 시즌 전체 총량은 같게 유지
function setGames(g){BAL.SEASON_GAMES=g;}
function gf(){return ((S&&S.kg)||BAL.SEASON_GAMES)/28;}
// 리그마다 실제 경기 수 (한국 144 · 일본 143 · 대만 120 · 미국 162). 테스트용 짧은 시즌이면 같은 비율로 줄인다
function lgGames(lg){const kg=(S&&S.kg)||BAL.SEASON_GAMES;if(!lg||lg==='KR'||lg===1)return kg;const L=BAL.LEAGUES[lg];return L?Math.max(6,Math.round(L.games*kg/144)):kg;}
// 달력(시즌 일수) = 한국 경기 수와 우리 리그 경기 수 중 큰 쪽. 경기 수가 적은 리그는 그만큼 쉬는 날이 고르게 끼어든다
function calDays(){const pl=playLg();return Math.max((S&&S.kg)||BAL.SEASON_GAMES,pl?lgGames(pl):0);}
function spreadDays(n,D){const out=[];for(let k=0;k<n;k++)out.push(1+Math.floor(k*D/n));return out;}
function userGames(t){t=t||userTeam();return lgGames(t.league);}
function dayAt(fr){return Math.max(1,Math.round(BAL.SEASON_GAMES*fr));}
function loanDeadline(){return dayAt(0.5);}
function setNextGames(g){g=+g;if(!BAL.SEASON_OPTIONS.includes(g))return BAL.SEASON_OPTIONS.join('·')+'경기 중에서 고르세요.';if(S.phase==='offseason'&&g!==S.games){S.nextGames=g;return null;}if(S.phase==='season'){S.nextGames=g===S.games?null:g;return null;}S.nextGames=null;return null;}
function genSchedule(){
  S.schedule=[];
  // 10개 구단 풀리그: 9라운드 × (경기 수 ÷ 9) 사이클. 하루에 5경기, 모든 구단이 매일 1경기. 사이클마다 홈·원정을 바꾼다
  const ids=krTeams().map(t=>t.id);const rounds=rrRounds(ids);const R=rounds.length;
  const C=Math.max(1,Math.round(lgGames('KR')/R));const days=spreadDays(C*R,BAL.SEASON_GAMES);let k=0;for(let c=0;c<C;c++)for(let r=0;r<R;r++){const day=days[k++];for(const [h,a] of rounds[r]){const flip=c%2===1;S.schedule.push({day,div:1,home:flip?a:h,away:flip?h:a,res:null});}}
  const pl=playLg();if(pl)genLeagueSchedule(pl);
  S.schedule.sort((a,b)=>a.day-b.day||String(a.div).localeCompare(String(b.div)));
  futInit();
}
function rrRounds(ids){const arr=ids.slice();if(arr.length%2)arr.push(null);const n=arr.length,R=n-1,half=n/2,rounds=[];
  for(let r=0;r<R;r++){const pairs=[];for(let i=0;i<half;i++){const a=arr[i],b=arr[n-1-i];if(a!=null&&b!=null)pairs.push(((r+i)%2===0)?[a,b]:[b,a]);}rounds.push(pairs);arr.splice(1,0,arr.pop());}return rounds;}
// 우리 리그가 해외일 때의 정규 시즌 일정 — 실제 경기 수와 구조를 따른다
//  일본: 같은 리그 5팀과 25경기씩(125) + 교류전(상대 리그 6팀과 3경기씩, 18) = 143
//  미국: 30개 구단 162경기 (전 구단 맞대결 반복) · 대만: 6개 구단 120경기, 앞 60경기 전반기 / 뒤 60경기 후반기
function genLeagueSchedule(pl){const D=BAL.SEASON_GAMES;const G=lgGames(pl);const comps=leagueComps(pl);const groups=comps.map(c=>compTeams(c).map(t=>t.id));const all=[].concat(...groups);const seq=[];
  const rrSeq=(ids,n)=>{const rr=rrRounds(ids);const R=rr.length;const out=[];for(let k=0;k<n;k++){const c=Math.floor(k/R),r=k%R;out.push(rr[r].map(([h,a])=>c%2?[a,h]:[h,a]));}return out;};
  if(pl==='JP'&&groups.length===2&&groups[0].length===groups[1].length){const inter=Math.round(18*G/143);const intra=G-inter;const rr=groups.map(g=>rrRounds(g));const R=rr[0].length;
    const intraSeq=[];for(let k=0;k<intra;k++){const c=Math.floor(k/R),r=k%R;const day=[];for(const rs of rr)for(const [h,a] of rs[r])day.push(c%2?[a,h]:[h,a]);intraSeq.push(day);}
    const [A,B]=groups;const m=A.length;const interSeq=[];for(let k=0;k<inter;k++){const r=k%m;const day=[];for(let i=0;i<m;i++){const a=A[i],b=B[(i+r)%m];day.push((i+r+Math.floor(k/m))%2?[a,b]:[b,a]);}interSeq.push(day);}
    const cut=Math.floor(intra*0.42);seq.push(...intraSeq.slice(0,cut),...interSeq.map(d=>d.map(x=>x.concat(['inter']))),...intraSeq.slice(cut));}
  else seq.push(...rrSeq(all,G));
  const days=spreadDays(seq.length,D);seq.forEach((pairs,k)=>{for(const x of pairs){const g={day:days[k],div:pl,home:x[0],away:x[1],res:null};if(x[2])g.inter=1;if(pl==='TW')g.half=k<seq.length/2?1:2;S.schedule.push(g);}});
  balanceHome(S.schedule.filter(g=>g.div===pl));}
function genOverseasSchedule(pl){const G=BAL.SEASON_GAMES;const comps=leagueComps(pl);const groups=comps.map(c=>compTeams(c).map(t=>t.id));
  const push=(day,h,a)=>S.schedule.push({day,div:pl,home:h,away:a,res:null});
  const inter=groups.length===2&&groups[0].length===groups[1].length?groups[0].length:0;const interStart=Math.floor((G-inter)/2)+1;
  const intraDays=[];for(let d=1;d<=G;d++)if(!(inter&&d>=interStart&&d<interStart+inter))intraDays.push(d);
  for(const g of groups){const rounds=rrRounds(g);const R=rounds.length;intraDays.forEach((d,k)=>{const c=Math.floor(k/R),r=k%R;for(const [h,a] of rounds[r]){const flip=c%2===1;push(d,flip?a:h,flip?h:a);}});}
  if(inter){const [A,B]=groups,m=A.length;for(let r=0;r<m;r++){const d=interStart+r;for(let i=0;i<m;i++){const a=A[i],b=B[(i+r)%m];if((i+r)%2)push(d,a,b);else push(d,b,a);}}}
  balanceHome(S.schedule.filter(g=>g.div===pl));}
// 홈·원정 균형: 사이클 수가 홀수로 끝나 생기는 치우침을 홈·원정 맞바꾸기로 줄인다 (난수 없음)
function balanceHome(gs){const h={},n={};for(const g of gs){h[g.home]=(h[g.home]||0)+1;n[g.home]=(n[g.home]||0)+1;n[g.away]=(n[g.away]||0)+1;}const ex=id=>(h[id]||0)-n[id]/2;
  for(let pass=0;pass<6;pass++){let ch=0;for(const g of gs){if(ex(g.home)>=1&&ex(g.away)<=-1){h[g.home]--;h[g.away]=(h[g.away]||0)+1;const t=g.home;g.home=g.away;g.away=t;ch++;}}if(!ch)break;}}
function h2h(a,b){let w=0;for(const g of S.schedule){if(!g.res||g.post)continue;if(g.home===a&&g.away===b){if(g.res.hs>g.res.as)w++;}else if(g.home===b&&g.away===a){if(g.res.as>g.res.hs)w++;}}return w;}
function standings(div){const ts=compTeams(div);ts.sort((a,b)=>b.rec.w-a.rec.w||h2h(b.id,a.id)-h2h(a.id,b.id)||(b.rec.rs-b.rec.ra)-(a.rec.rs-a.rec.ra)||b.rec.rs-a.rec.rs||a.id-b.id);return ts;}
function rankOf(t){return standings(compOf(t)).findIndex(x=>x.id===t.id)+1;}
function isUserGame(g){return g.home===S.userTeamId||g.away===S.userTeamId;}
function userGameToday(){return S.schedule.find(g=>g.day===S.day&&isUserGame(g))||null;}
function payroll(t){let s=0;for(const pid of t.roster.concat(t.dev||[])){const p=P_(pid);if(p&&p.contract)s+=p.contract.salary*(p.loan&&p.loan.to===t.id?p.loan.pay:1);}
  for(const pid of (t.loaned||[])){const p=P_(pid);if(p&&p.contract&&p.loan&&p.loan.from===t.id)s+=p.contract.salary*(1-p.loan.pay);}return Math.round(s);}

// ---------- 구단 꾸미기: 애칭·색·엠블럼 (연고 도시는 그대로) ----------
// 실존 구단 애칭(국내·일본·미국·대만, 옛 구단 포함)과 같은 말은 쓸 수 없다
const REAL_NICK=['라이온즈','타이거즈','타이거스','베어스','트윈스','자이언츠','이글스','히어로즈','다이노스','위즈','랜더스','와이번스','유니콘스','돌핀스','레이더스','핀토스','슈퍼스타즈','청룡','해태','빙그레','키움','넥센',
  '드래곤즈','스왈로즈','스왈로스','카프','베이스타즈','호크스','파이터즈','마린즈','버펄로즈','버팔로즈','골든이글스','블루웨이브',
  '양키스','레드삭스','블루제이스','레이스','오리올스','가디언스','화이트삭스','로열스','애스트로스','레인저스','매리너스','에인절스','애슬레틱스','브레이브스','메츠','필리스','말린스','내셔널스','컵스','카디널스','브루어스','레즈','파이리츠','다저스','파드리스','로키스','다이아몬드백스','디백스','엑스포스',
  '몽키스','브라더스','엘리펀츠','유니라이온스','라미고','퉁이','중신','웨이취안','푸방',
  'lions','tigers','bears','twins','giants','eagles','heroes','dinos','wiz','landers','wyverns','dragons','swallows','carp','baystars','hawks','fighters','marines','buffaloes','yankees','redsox','bluejays','rays','orioles','guardians','whitesox','royals','astros','rangers','mariners','angels','athletics','braves','mets','phillies','marlins','nationals','cubs','cardinals','brewers','reds','pirates','dodgers','padres','rockies','diamondbacks','monkeys','brothers','elephants'];
const EMB_SHAPES=['cap','shield','circle','diamond'];
function nickCheck(nick,t){nick=String(nick||'').trim().replace(/\s+/g,' ');if(!nick)return '애칭을 입력하세요.';if(nick.length>10)return '애칭은 10자 이내로 정해 주세요.';
  if(!/^[가-힣A-Za-z0-9 ]+$/.test(nick))return '애칭은 한글·영문·숫자만 쓸 수 있습니다.';const flat=nick.replace(/\s/g,'').toLowerCase();
  const hit=REAL_NICK.find(w=>flat.includes(w.toLowerCase()));if(hit)return `「${hit}」${josa(hit,'은','는').slice(hit.length)} 실존 구단 이름이라 쓸 수 없습니다.`;
  const city=t.name.split(' ')[0];const full=city+' '+nick;if(Object.values(S.teams).some(x=>x.id!==t.id&&(x.name===full||(x.name.split(' ').slice(1).join(' ')===nick))))return '다른 구단이 쓰는 애칭입니다.';return null;}
function customizeTeam(o){const t=userTeam();o=o||{};const city=t.name.split(' ')[0];const ch=[];
  if(o.nick!=null){const nick=String(o.nick).trim().replace(/\s+/g,' ');const cur=t.name.split(' ').slice(1).join(' ');if(nick!==cur){const e=nickCheck(nick,t);if(e)return e;t.orig=t.orig||t.name;const old=t.name;t.name=city+' '+nick;ch.push(`구단 이름 ${old} → ${t.name}`);}}
  if(o.color!=null&&/^#[0-9a-fA-F]{6}$/.test(o.color)&&o.color!==t.color){t.color=o.color;t.cc=true;ch.push('구단 색 변경');}
  if(o.emb!==undefined){if(o.emb===null){if(t.emb){delete t.emb;ch.push('원래 엠블럼으로');}}else if(EMB_SHAPES.includes(o.emb.shape)){const L=String(o.emb.letter||'').trim().slice(0,2)||t.name.split(' ')[1][0];t.emb={shape:o.emb.shape,letter:L};ch.push('엠블럼 변경');}}
  if(o.reset){const d=(TEAM_NAMES[t.league]||[]).find(x=>x[0]===(t.orig||t.name));if(t.orig){t.name=t.orig;delete t.orig;}delete t.emb;delete t.cc;if(d)t.color=d[1];ch.push('처음 모습으로 되돌림');}
  if(ch.length)news(`[구단] ${ch.join(' · ')}`,'sys');return null;}
// ---------- 기용 방침 (선수마다): 승리 우선(자동) · 육성 우선(선발 고정) · 분담 출장(3경기 중 2경기) ----------
// 감독이 「키우려고 쓰는 선수」를 정하면 자동 편성·코치 조언이 그 뜻을 존중하고, 점검마다 결과를 따로 보여 준다
function planPosOf(p,t){return isPitcher(p)?'SP':(t.pos[p.id]&&t.lineup.includes(p.id)?t.pos[p.id]:p.pos==='DH'?'DH':p.pos);}
function setPlan(pid,k){const t=userTeam();const p=P_(pid);if(!p||!t.roster.includes(pid))return '1군 선수만 정할 수 있습니다.';if(k&&isPitcher(p)&&(k==='split'||p.pos!=='SP'))return '투수는 선발 투수의 「육성 우선」(로테이션 고정)만 정할 수 있습니다.';
  t.locks=t.locks||{};if(!k){if(p.plan&&!isPitcher(p))delete t.locks[pid];delete p.plan;return null;}
  const pos=planPosOf(p,t);p.plan={k,pos,s:S.season,d:S.day,n:0,ovr:r1(calcOvr(p)),attrs:{...p.attrs},ab:p.cur.ab||0,h:p.cur.h||0,hr:p.cur.hr||0,o:p.cur.pOuts||0,er:p.cur.pER||0};
  if(!isPitcher(p))t.locks[pid]=pos;planPut(p,t,true);return null;}
// 오늘 경기에 방침대로 넣거나(분담 출장은 세 경기에 한 번 쉼) 뺀다
function planPut(p,t,force){if(p.inj)return;const P=p.plan;if(!P)return;
  if(isPitcher(p)){if(!t.rotation.includes(p.id)){const w=t.rotation.map(P_).filter(Boolean).sort((a,b)=>calcOvr(a)-calcOvr(b))[0];t.bullpen=t.bullpen.filter(x=>x!==p.id);if(t.closer===p.id)t.closer=null;if(t.rotation.length<5)t.rotation.push(p.id);else if(w){t.rotation[t.rotation.indexOf(w.id)]=p.id;t.bullpen.push(w.id);}}return;}
  const rest=P.k==='split'&&!force&&P.n%3===2;
  if(rest){if(t.lineup.includes(p.id)){delete t.locks[p.id];const alt=t.roster.map(P_).filter(q=>q&&!q.inj&&!isPitcher(q)&&!t.lineup.includes(q.id)).sort((a,b)=>fitScore(b,P.pos)-fitScore(a,P.pos))[0];if(alt){t.lineup[t.lineup.indexOf(p.id)]=alt.id;delete t.pos[p.id];t.pos[alt.id]=P.pos;}}return;}
  t.locks[p.id]=P.pos;if(!t.lineup.includes(p.id)){const cur=t.lineup.find(id=>t.pos[id]===P.pos);if(cur!=null){t.lineup[t.lineup.indexOf(cur)]=p.id;delete t.pos[cur];}else if(t.lineup.length<9)t.lineup.push(p.id);t.pos[p.id]=P.pos;}}
function applyPlans(t){for(const id of t.roster){const p=P_(id);if(p&&p.plan){planPut(p,t,false);p.plan.n++;}}}
// 방침을 정한 뒤 결과: 능력 변화 · 그동안 성적 · 같은 자리 대안과의 차이
function planEval(p){const P=p.plan;if(!P)return null;const t=userTeam();const ch=[];for(const k in p.attrs){const d=Math.round(p.attrs[k]-(P.attrs[k]!=null?P.attrs[k]:p.attrs[k]));if(d)ch.push({k,d});}ch.sort((a,b)=>b.d-a.d);
  const f=p.focus&&p.focus!=='balance'?p.focus:null;const fd=f&&p.attrs[f]!=null?{k:f,from:Math.round(P.attrs[f]),to:Math.round(p.attrs[f])}:null;
  const pit=isPitcher(p);const ab=(p.cur.ab||0)-(P.s===S.season?P.ab:0),h=(p.cur.h||0)-(P.s===S.season?P.h:0),o=(p.cur.pOuts||0)-(P.s===S.season?P.o:0),er=(p.cur.pER||0)-(P.s===S.season?P.er:0);
  const line=pit?(o?`평균자책 ${(er*27/o).toFixed(2)} (${Math.floor(o/3)}이닝)`:'아직 등판 없음'):(ab?`타율 ${(h/ab).toFixed(3).replace(/^0/,'')} (${ab}타수 ${h}안타)`:'아직 타석 없음');
  const alt=pit?null:t.roster.map(P_).filter(q=>q&&q.id!==p.id&&!q.inj&&!isPitcher(q)&&posPenalty(q,P.pos)<12).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  return {k:P.k,games:P.n,since:P.d,ovrFrom:Math.round(P.ovr),ovrTo:Math.round(calcOvr(p)),ch:ch.slice(0,3),fd,line,alt:alt?{name:alt.name,ovr:Math.round(calcOvr(alt)),gap:Math.round(calcOvr(alt)-calcOvr(p))}:null};}
const PLAN_KO={dev:'육성 우선',split:'분담 출장'};
// 이번 시즌 앞선 점검에서 이 능력의 보이는 숫자가 오른 적이 있는지 (첫 성과 판단)
function intGainBefore(p,k){let v=p.attrs[k];const L=(p.log||[]).filter(l=>l.s===S.season);for(let i=0;i<L.length;i++){const d=(L[i].ch&&L[i].ch[k])||0;const v0=v-d;if(i>0&&Math.round(v)>Math.round(v0))return true;v=v0;}return false;}
// 「내 선수」: 감독이 직접 손댄 선수 (관심 ★ · 훈련 방향 · 기용 방침 · 우리가 지명한 2년 안 신인)
function myPlayers(n){const t=userTeam();const pins=new Set(S.pins||[]);return t.roster.concat(t.dev||[]).map(P_).filter(p=>p&&(pins.has(p.id)||p.plan||(p.focus&&p.focus!=='balance')||(p.transfers||[]).some(x=>/드래프트/.test(x.kind)&&x.s>=S.season-1)))
  .map(p=>{const L=(p.log||[])[0];const fresh=L&&L.s===S.season&&L.dd!=null&&S.phase==='season'&&S.day-L.dd<=7;const f=p.focus&&p.focus!=='balance'?p.focus:null;
    // 화면에 보이는 정수 능력치가 오른 것만 (속값 0.5 상승은 표시하지 않음). 집중 훈련 능력을 먼저
    let up=null;if(fresh&&L.ch){const ks=Object.keys(L.ch).filter(k=>p.attrs[k]!=null&&Math.round(p.attrs[k])>Math.round(p.attrs[k]-L.ch[k]));ks.sort((a,b)=>(b===f)-(a===f)||L.ch[b]-L.ch[a]);if(ks[0]){const k=ks[0];const to=Math.round(p.attrs[k]);up={k,d:to-Math.round(p.attrs[k]-L.ch[k]),to,first:!intGainBefore(p,k)};}}return {p,up,ev:planEval(p),pin:pins.has(p.id),score:(up?10+up.d:0)+(p.plan?5:0)+(pins.has(p.id)?3:0)+(t.lineup.includes(p.id)||t.rotation.includes(p.id)?1:0)};})
  .sort((a,b)=>b.score-a.score).slice(0,n||4);}
// ---------- 부상 ----------
// 1군 경기를 뛴 선수마다 경기 뒤 판정. 피로·나이·체력 특성이 위험을 바꾸고, 의무 코치(트레이너)가 회복 기간을 줄인다.
// 부상 중에는 라인업·로테이션·불펜·대타에서 빠지고(1군 등록은 유지), 다 나으면 돌아온다. AI 구단도 똑같이 적용.
const INJ_T={bat:[['햄스트링 통증',3,10],['옆구리 근육 손상',8,20],['손목 염좌',4,12],['발목 염좌',3,9],['허리 통증',3,10],['손가락 골절',25,45],['무릎 인대 부분 파열',40,80]],
  pit:[['손가락 물집',2,6],['어깨 염증',8,20],['팔꿈치 통증',10,25],['옆구리 근육 손상',10,22],['허리 통증',4,12],['팔꿈치 인대 손상',45,90]]};
function injRisk(p,b){const f=(p.fatigue||0);let r=b.pG?0.0012+(b.pPit||0)*0.000035:b.g?0.0018:0;if(!r)return 0;r*=1+f/70;if(p.age>=31)r*=1+(p.age-30)*0.07;if(p.traits.includes('강철체력'))r*=0.5;return r;}
function injRoll(p,b,lg){if(!p||p.inj||p.retired||!(b.g||b.pG))return;const t=S.teams[p.teamId];if(!t)return;if(rnd()>=injRisk(p,b))return;
  const L=INJ_T[isPitcher(p)?'pit':'bat'];const x=rnd();const pool=x<0.62?L.filter(e=>e[2]<=12):x<0.92?L.filter(e=>e[1]>=8&&e[2]<40):L.filter(e=>e[1]>=25);const e=pick(pool.length?pool:L);
  const mul=t.staff||t.isUser?staffFx(t).inj:1;const games=Math.max(1,Math.round(ri(e[1],e[2])*mul));const days=Math.max(1,Math.round(games*((S.kg||BAL.SEASON_GAMES)/144)*(BAL.SEASON_GAMES/Math.max(1,lgGames(t.league==='KR'?'KR':t.league)))));
  p.inj={type:e[0],left:days,total:days,games,s:S.season,d:S.day,major:e[1]>=25,role:t.rotation.includes(p.id)?'rot':t.lineup.includes(p.id)?'bat':null,pos:t.pos[p.id]||null};p.injHist=(p.injHist||[]).concat([{s:S.season,type:e[0],games}]).slice(-8);
  if(p.inj.major){const ks=isPitcher(p)?['stuff','stamina','control']:['speed','power','arm'];const k=pick(ks.filter(k=>p.attrs[k]!=null));if(k){const d=ri(1,2);p.attrs[k]=Math.max(20,p.attrs[k]-d);p.inj.loss={k,d};}}
  S.injToday=S.injToday||[];if(t.isUser){S.injToday.push(p.id);news(`[부상] ${p.name} — ${e[0]}, 약 ${games}경기 결장 예상${p.inj.loss?` (${ATTR_KO[p.inj.loss.k]} −${p.inj.loss.d})`:''}`,'injury');}
  else if(t.league==='KR'&&calcOvr(p)>=levelOf(t)+4&&p.inj.games>=15)news(`[부상] ${t.name} ${p.name} ${e[0]} — 약 ${games}경기 결장`,'league');}
function injAfter(lg){for(const id of [lg.home,lg.away]){const t=S.teams[id];if(!t)continue;const hurt=[...t.lineup,...t.rotation,...t.bullpen].some(pid=>{const p=S.players[pid];return p&&p.inj;});if(!hurt)continue;if(t.isUser)fixLineup(t);else autoLineup(t);}}
function injTick(p,t){if(!p.inj)return false;p.inj.left--;if(p.inj.left>0)return false;const I=p.inj;delete p.inj;if(t.isUser){const back=injReturn(p,t,I);news(`[복귀] ${p.name} ${I.type}에서 회복${back?` — ${back}`:' — 다시 경기에 나설 수 있습니다'}`,'injury');}return true;}
// 우리 구단: 다 나은 선수는 다친 날 맡던 자리로 자동 복귀 (그 자리를 메우던 선수는 벤치·불펜으로)
function injReturn(p,t,I){if(!t.roster.includes(p.id))return null;
  if(I.role==='rot'&&!t.rotation.includes(p.id)){t.bullpen=t.bullpen.filter(x=>x!==p.id);if(t.closer===p.id)t.closer=null;if(t.rotation.length<5){t.rotation.push(p.id);return '선발 로테이션 복귀';}
    const fill=t.rotation.map(P_).filter(x=>x&&x.pos!=='SP').sort((a,b)=>calcOvr(a)-calcOvr(b))[0]||t.rotation.map(P_).filter(Boolean).sort((a,b)=>calcOvr(a)-calcOvr(b))[0];if(fill&&calcOvr(fill)<=calcOvr(p)+3){t.rotation[t.rotation.indexOf(fill.id)]=p.id;t.bullpen.push(fill.id);return `선발 로테이션 복귀 (${fill.name} 불펜으로)`;}t.bullpen.push(p.id);return null;}
  if(I.role==='bat'&&I.pos&&!t.lineup.includes(p.id)){const cur=t.lineup.find(id=>t.pos[id]===I.pos);if(cur!=null&&!(t.locks&&t.locks[cur])){const q=P_(cur);t.lineup[t.lineup.indexOf(cur)]=p.id;delete t.pos[cur];t.pos[p.id]=I.pos;return `${POS_KO[I.pos]||I.pos} 선발 복귀${q?` (${q.name} 벤치로)`:''}`;}}
  return null;}
function injList(t){return t.roster.concat(t.dev||[]).map(P_).filter(p=>p&&p.inj);}
// ---------- 경기일 진행 ----------
function startDay(){
  if(S.phase!=='season')return null;if(S.liveGame)return S.liveGame;S.injToday=[];
  S.schedule.forEach((g,i)=>{if(g.day!==S.day||g.res||isUserGame(g))return;const lg=createGame(g.home,g.away,false);lg.gameRef=i;stepGame(lg);finalizeGame(lg);});
  const idx=S.schedule.findIndex(g=>g.day===S.day&&isUserGame(g));
  if(idx>=0&&!S.schedule[idx].res){const g=S.schedule[idx];{const ut=userTeam();if(rosterCheck(ut).length){const add=autoFillUser();if(add.length)news(`선수단이 경기를 치를 수 없을 만큼 줄어 최소 인원을 자동으로 보충했습니다: ${add.join(', ')}`,'contract');}}applyPlans(userTeam());fixLineup(userTeam());const lg=createGame(g.home,g.away,true);lg.gameRef=idx;S.liveGame=lg;return lg;}
  return null;
}
function endUserGame(){const lg=S.liveGame;if(!lg||!lg.done)return null;finalizeGame(lg);const summary={lg};S.liveGame=null;finishDay();return summary;}
function finishDay(){
  S.warn=[];const d=S.day;const healed=new Set();
  const recAdd={};for(const t of liveTeams()){if(d>BAL.SEASON_GAMES)break;const pay=Math.round(payroll(t)/BAL.SEASON_GAMES);t.cash-=pay;t.fin.salary+=pay;
    if(t.isUser&&t.staff){const sp=Math.round(staffPay(t)/BAL.SEASON_GAMES);t.cash-=sp;t.fin.staff=(t.fin.staff||0)+sp;recAdd[t.id]=staffFx(t).rec;}}
  for(const g of S.schedule){if(g.day!==d||!g.res)continue;const h=S.teams[g.home];if(h.league!=='KR'&&!h.isUser)continue;const inc=Math.round(ticketIncome(h)*(g.post?gf()*0.35:1));/* 포스트시즌 홈 경기: 시즌 길이와 무관하게 같은 가치 */h.cash+=inc;h.fin.tickets+=inc;if(h.isUser)boardGate(h,inc);}
  for(const pid in S.players){const p=S.players[pid];if(p.retired||p.teamId==null)continue;const t=S.teams[p.teamId];if(!t||(t.league!=='KR'&&t.league!==playLg()))continue;
    const rec=BAL.FATIGUE_RECOVER+(t.fac.train-1)*2+(p.traits.includes('강철체력')?6:0)+(recAdd[t.id]||0);p.fatigue=Math.max(0,(p.fatigue||0)-rec);
    if(p.inj&&injTick(p,t)&&!t.isUser)healed.add(t.id);
    p.cond=clamp((p.cond||0)*0.85+gauss()*1.3,-6,6);}
  for(const id of healed)autoLineup(S.teams[id]);
  marketTick(0.12/gf());
  if(d===dayAt(0.36)||d===dayAt(0.6))for(const t of krTeams())presCrisis(t);
  if(d===dayAt(0.54))endorseOffers();endorseTick();
  if(d<=BAL.SEASON_GAMES)futDay(d);
  if(d%7===0&&d<=BAL.SEASON_GAMES){for(const t of liveTeams()){for(const pid of t.roster)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t});for(const pid of t.dev)growthTick(P_(pid),{kind:'season',label:`${S.season}시즌 ${d}일차`,team:t,dev:true});}
    for(const pid of userTeam().roster)improveScout(P_(pid),0.06);scoutWatch();}
  promiseTick();grievanceTick();convTick(1);if(d<=BAL.SEASON_GAMES){bdayTick(d);if(d%7===0)wgoalTick(d);}achCheck();
  if(d===dayAt(0.5)){interestCheck();aiAims(false);farmCheck();}
  if(d===asDay()&&(asLg()!=='KR'||krTeams().length===BAL.KR_TEAMS)&&(!S.allstar||S.allstar.s!==S.season))allStar();
  S.day++;S.clock++;
  const ut=userTeam();if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 선수 판매, 긴급 대출(재정 탭) 등 회복 조치가 필요합니다.`);
  const plg=playLg();
  if(plg&&LPOST_LG.includes(plg)){
    if(S.day===BAL.SEASON_GAMES+1&&!S.lpost){if(!S.post)krPostInstant();S.lpost=lpostCreate(plg);if(S.lpost){news(`정규 시즌 종료 — ${BAL.LEAGUES[plg].name} 가을야구: ${S.lpost.seedsTxt}`,'league');lpostSchedule();}else endSeason();}
    else if(S.lpost&&S.lpost.s===S.season&&!S.lpost.done){lpostAdvance();if(S.lpost.done)endSeason();}
    else if(S.day>BAL.SEASON_GAMES)endSeason();}
  else if(S.day===BAL.SEASON_GAMES+1&&!S.post)createPost();
  else if(S.post&&S.post.s===S.season&&!S.post.done){postAdvance();if(S.post.done)endSeason();}
  else if(S.day>BAL.SEASON_GAMES)endSeason();
}
function ticketIncome(t){const wp=(t.rec.w+t.rec.l)?t.rec.w/(t.rec.w+t.rec.l):0.5;return Math.round(econ(t).ticket*(0.7+t.rep/100*0.6)*presIncome(t)*(0.8+wp*0.4)*(0.9+rnd()*0.2));}
function applySponsor(t){if(t.isUser)return sponPay(t);const inc=Math.round(econ(t).sponsor*(0.7+t.rep/100*0.6)*presIncome(t));t.cash+=inc;t.fin.sponsor+=inc;}
function playDayAuto(){const lg=startDay();if(lg){stepGame(lg);return endUserGame();}else{finishDay();return null;}}

// ---------- 육성 ----------
// 성과 보너스: 시즌 누적 기록이 리그 평균보다 좋을 때만 작게 더한다 (부진해도 깎지 않음 — 단기 부진은 컨디션 문제)
function perfBonus(p){const c=p.cur;if(!c)return null;const L=lgCtx('KR1');if(isPitcher(p)){if((c.pOuts||0)<30*gf())return null;const era=c.pER*27/c.pOuts;const v=clamp((L.era-era)/L.era*0.25,0,0.1);return v>=0.02?{v,text:`좋은 투구 성과 (ERA ${era.toFixed(2)})`}:null;}
  if((c.pa||0)<36*gf())return null;const ops=ops_(c),lo=L.obp+L.slg;const v=clamp((ops-lo)/lo*0.35,0,0.1);return v>=0.02?{v,text:`좋은 타격 성과 (OPS ${ops.toFixed(3).replace(/^0/,'')})`}:null;}
function growthTick(p,ctx){
  if(!p||p.retired)return;const ovr0=calcOvr(p);const isP=isPitcher(p);const ovr=calcOvr(p);const peak=p.peakAge;const f=[];
  let expF;
  if(ctx.kind==='winter'&&ctx.os){expF=ctx.os==='start'?0.8:ctx.os==='farm'?0.72:0.55;f.push(ctx.os==='start'?'해외 1군 주전으로 한 시즌':ctx.os==='farm'?`${farmKo(ctx.osLg,p.tier||2)}에서 꾸준히 출장`:'해외 1군 벤치 (출장 부족)');}
  else if(ctx.kind==='winter'){expF=0.7;f.push('국내 동계 훈련');}
  else if(ctx.kind==='rest'){expF=0.25;f.push('겨울 휴식 (성장 대신 회복)');}
  else if(ctx.kind==='dispatch'){const dd=ctx.dd;const lvlF=clamp(1+((BAL.LEVEL_OVR[dd.lg]||55)-ovr0)*0.02,0.8,1.25);expF=0.3+0.8*dd.share*lvlF;f.push(`${BAL.LEAGUES[dd.lg].name} 파견 (${dd.role})`);if(dd.share<0.35)f.push('파견지 출장 부족');else if(lvlF>1.05)f.push('수준 높은 실전 경험');}
  else if(ctx.dev){expF=BAL.DEV_EXP;f.push('육성군(2군) 경기 출장');if(ctx.kind==='season'&&p.age>=23&&p.age<p.peakAge&&p.resRole==='bench'){p.pot=Math.max(ovr,p.pot-0.25);f.push('23세 이상 실전 부족 — 잠재력 조금 감소');}}
  else{const target=isP?BAL.XP_TARGET_PIT:BAL.XP_TARGET_BAT;const ratio=(p.xp||0)/target;expF=0.4+0.6*Math.pow(Math.min(1,ratio),0.7);
    if(ratio>1.7){expF-=0.15;f.push('과도한 출장(피로)');}else if(ratio>=0.8)f.push('주전 출장');else if(p.resWeek&&expF<BAL.RES_EXP){const rr=p.resRole||'start';expF=BAL.RES_EXP*(rr==='focus'?1.12:rr==='bench'?0.85:1.02);f.push(rr==='focus'?'2군 집중 육성 (매 경기 출장)':rr==='bench'?'2군 벤치 (출장 적음)':ratio>=0.3?'1군 일부 출장 + 2군 주전':'2군 주전 출장');}else if(ratio>=0.3)f.push('일부 출장');else f.push('출장 기회 부족');
    if(ctx.team&&ctx.team.locks&&ctx.team.locks[p.id]&&p.age<=24){expF+=0.05;f.push('출장 보장(육성 약속)');}
    {const pf=perfBonus(p);if(pf){expF+=pf.v;f.push(pf.text);}}
    if(ratio<0.3&&p.age>=23&&p.age<peak&&!(p.resWeek&&(p.resRole==='start'||p.resRole==='focus'))){p.pot=Math.max(ovr,p.pot-0.25);f.push('23세 이상 실전 부족 — 잠재력 조금 감소');}}
  const fat=p.fatigue||0;if(fat>80){expF*=0.8;f.push('피로 누적');}
  const gap=p.pot-ovr;const gapF=clamp(gap/18,0,1.3);const a=p.age;
  let ageF=a<peak-1?1:a<=peak+1?0.45:0;if(a<=21)ageF*=1.15;
  const fac=ctx.team?ctx.team.fac.train:1;const facF=1+(fac-1)*0.12;if(fac>=2)f.push(`훈련장 Lv.${fac} 효과`);
  const fx=ctx.team&&ctx.team.staff?staffFx(ctx.team):null;let devM=1;if(fx&&(p.age<=23||ctx.dev)){devM=fx.dev*(staffTrait(ctx.team,'dev','u20')&&p.age<=20?1.08:1)*(ctx.dev&&staffTrait(ctx.team,'dev','devsq')?1.08:1);}
  let traitF=1;if(p.traits.includes('성실')){traitF+=0.3;f.push('성실한 태도');}if(p.traits.includes('게으름')){traitF-=0.3;f.push('훈련 태만');}
  const wint=ctx.kind==='winter'||ctx.kind==='dispatch'||ctx.kind==='rest';
  let pts=BAL.GROWTH_TICK*(wint?1.8:1/gf())*expF*gapF*ageF*facF*traitF*devM*(0.7+rnd()*0.6);
  if(gap<=0.5&&ageF>0)pts=rnd()*0.25/(wint?1:gf());
  const keys=isP?PIT_KEYS:BAT_KEYS;const focus=p.focus||'balance';const ch={};
  const fkey=focus==='balance'?null:focus;
  // 능력별 숨은 상한: 상한에 가까운 능력은 덜 오르고, 그만큼 다른 능력으로 돌아간다 (총 성장량은 그대로)
  const cap=capOf(p);const w0={},cw={};let sw=0,scw=0;for(const k of keys){w0[k]=fkey?(k===fkey?0.4:0.6/(keys.length-1)):1/keys.length;cw[k]=w0[k]*clamp((cap[k]-p.attrs[k])/5,0.15,1);sw+=w0[k];scw+=cw[k];}
  if(pts>0.3&&fkey&&cw[fkey]<w0[fkey]*0.5)f.push(`${ATTR_KO[fkey]} 한계 근접 — 다른 능력으로 성장이 분산`);
  for(const k of keys){const w=scw>0?cw[k]*sw/scw:w0[k];const hiF=clamp(1-(p.attrs[k]-60)/55,0.25,1);const dlt=pts*w*(0.6+rnd()*0.8)*hiF*(fx?attrMul(ctx.team,p,k,fx):1);p.attrs[k]=Math.min(99,p.attrs[k]+dlt);ch[k]=dlt;}
  if(fx&&pts>0.3){const ks=isP?PIT_KEYS:BAT_KEYS;const am=ks.reduce((s,k)=>s+attrMul(ctx.team,p,k,fx),0)/ks.length*devM;if(am>=1.04)f.push(`코치진 지도 (+${Math.round((am-1)*100)}%)`);else if(am<=0.96)f.push(`코치진 부족 (${Math.round((am-1)*100)}%)`);}
  if(fkey&&pts>0.3)f.unshift(`${(isP?FOCUS_PIT:FOCUS_BAT)[focus]} 집중 훈련`);
  if(a>peak+1){const yrs=Math.min(6,a-peak-1);let dec=BAL.DECLINE_PER_TICK*yrs*(wint?2.2:1/gf())*(0.7+rnd()*0.6);if(p.traits.includes('강철체력'))dec*=0.7;if(fx){dec*=fx.aging;if(fx.aging<=0.95)f.push('트레이너 관리로 노화 완화');}if(ctx.kind==='rest'){dec*=0.5;f.push('휴식으로 노화 완화');}f.push('노화');
    const dw=isP?{stuff:.4,stamina:.3,control:.1,movement:.2}:{speed:.35,defense:.2,contact:.15,power:.1,eye:.05,arm:.15};
    for(const k in dw){const dlt=dec*dw[k];p.attrs[k]=Math.max(10,p.attrs[k]-dlt);ch[k]=(ch[k]||0)-dlt;}}
  for(const k of keys)p.attrs[k]=r1(p.attrs[k]);
  p.xp=0;
  if(p.userLink){const chR={};let any=false;for(const k in ch){const v=Math.round(ch[k]*10)/10;if(Math.abs(v)>=0.1){chR[k]=v;any=true;}}
    p.log.unshift({s:S.season,label:ctx.label,ch:chR,f,ovr:r1(calcOvr(p)),d:r1(calcOvr(p)-ovr0),dd:S.phase==='season'?S.day:null});if(p.log.length>14)p.log.length=14;ledgerAdd(p,{s:S.season,l:ctx.label,d:r1(calcOvr(p)-ovr0),o:r1(calcOvr(p)),c:chR,f:f.slice(0,3)});}
}

// ---------- AI 구단 운영 목표 ----------
// 시즌 전(예상 전력)과 시즌 중반(실제 순위)에만 정한다: 우승 도전 · 가을야구 경쟁 · 리빌딩 · 재정 회복.
// 효과는 거래에만 작게: 우승 도전은 주전을 비싸게 지키고, 리빌딩은 노장을 싸게 내놓고 젊은 선수를 아끼며, 재정 회복은 조금 싸게 판다.
const AIM_KO={contend:'우승 도전',race:'가을야구 경쟁',rebuild:'리빌딩',money:'재정 회복'};
function aiAims(pre){const ts=krTeams();const n=ts.length;const order=pre?ts.map(t=>({t,v:teamPower(t).power})).sort((a,b)=>b.v-a.v).map(x=>x.t):standings(1);
  order.forEach((t,i)=>{if(t.isUser){t.aim=null;return;}const r=i+1;const was=t.aim;const aim=t.cash<payroll(t)*0.6?'money':r<=3?'contend':r<=Math.ceil(n*0.6)?'race':'rebuild';t.aim=aim;
    if(!pre&&was&&was!==aim&&(aim==='rebuild'||aim==='contend'))news(aim==='rebuild'?`[구단 동향] ${t.name}, 리빌딩으로 방향 전환 — 베테랑을 싸게 내놓을 수 있습니다`:`[구단 동향] ${t.name}, 우승 도전 선언 — 주전 판매는 어렵고 보강을 노립니다`,'league');});}
function aimOf(t){return t&&!t.isUser&&t.league==='KR'?(t.aim||'race'):null;}
function aimAskMul(t,p,starter){const a=aimOf(t);if(!a)return 1;if(a==='contend')return starter?1.12:1;if(a==='rebuild')return p.age>=30?0.85:p.age<=24?1.12:1;if(a==='money')return 0.92;return 1;}
// ---------- 시장가치/제안 ----------
function aiAsk(t,p){const v=calcValue(p);let m=1.15;const sorted=t.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a));const rank=sorted.findIndex(x=>x.id===p.id);
  if(rank<5)m+=0.3;if(t.cash<0)m-=0.25;if(countPos(t,p.pos)>(NEED_TEMPLATE[p.pos]||1))m-=0.1;m*=aimAskMul(t,p,rank<9);return Math.round(v*clamp(m,0.8,2)/100)*100;}
function playerDemand(p,t){let base=Math.max(salaryFor(p),p.contract?p.contract.salary*1.1:0);const from=p.teamId!=null?S.teams[p.teamId]:null;
  if(p.homecoming===t.id)base*=0.7;else if(t.league==='KR'&&presOf(t)>=80)base*=0.93;if(p.endorse)base*=BAL.SPON.endorse.demand;return Math.round(base/10)*10;}
function willingInfo(p,t){const from=p.teamId!=null?S.teams[p.teamId]:null;let pw=0.75;const r=[];
  if(from&&from.league==='KR'&&t.league==='KR'){pw=0.7;r.push('국내 구단 간 이적에 소극적');}
  else if(from){const lf=levelOf(from),lt=levelOf(t);if(lt>=lf+3){pw=0.85;r.push('더 높은 무대 진출 희망');}else if(lt<=lf-3){pw=p.age>=31?0.55:0.3;r.push(p.age>=31?'수준은 낮지만 출장 기회를 원하는 베테랑':'수준 낮은 무대로의 이동 기피');}else{pw=0.55;r.push('비슷한 수준 무대 — 조건 중시');}
    if(from.league!=='KR'&&t.league==='KR'&&p.nat!=='KR'){pw-=0.08;r.push('타국 생활 부담');}}
  else r.push('FA — 조건 우선');
  const starter=t.roster.map(P_).filter(x=>x&&x.pos===p.pos&&x.id!==p.id).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  if(!starter||calcOvr(p)>=calcOvr(starter)){pw+=0.08;r.push('주전 출장 가능');}else{pw-=0.12;r.push('출장 역할 보장 필요 (현 주전보다 낮음)');}
  if(p.homecoming===t.id){pw=0.95;r.length=0;r.push('친정 복귀 희망');}
  if(p.traits.includes('강심장')){pw+=0.05;}
  if(t.isUser&&t.rep>=50){pw+=0.05;r.push('구단 명성 양호');}
  if(p.homecoming!==t.id){const pd=presPull(p,t);if(pd.d){pw+=pd.d;if(pd.why)r.push(pd.why);}}
  pw=clamp(pw,0.05,0.97);return {pw,level:pw>=0.65?'긍정적':pw>=0.4?'보통':'부정적',reasons:r};}
function willingToJoin(p,t){const from=p.teamId!=null?S.teams[p.teamId]:null;let pw=0.75;
  if(p.homecoming===t.id)pw=0.95;else pw+=presPull(p,t).d;if(p.traits.includes('강심장'))pw+=0.05;return pw;}

function listPlayer(pid){const p=P_(pid);if(!p||p.teamId!==S.userTeamId)return '선수를 찾을 수 없습니다.';if((p.lockUntil||0)>S.clock)return `영입 직후에는 판매 등록할 수 없습니다 (${p.lockUntil-S.clock}일 후 가능).`;if(S.market.listed.includes(pid))return '이미 등록되어 있습니다.';if(S.pendingFA.includes(pid))return '계약이 만료된 선수는 판매할 수 없습니다. 먼저 재계약하세요.';if(p.dispatch)return '겨울리그 파견 중에는 판매 등록할 수 없습니다. 복귀 후 가능합니다.';S.market.listed.push(pid);return null;}
function unlistPlayer(pid){S.market.listed=S.market.listed.filter(x=>x!==pid);}
function marketTick(rate){
  const m=S.market;
  m.offers=m.offers.filter(o=>{if(o.expires<=S.clock){if(o.type==='overseas'){const p=P_(o.pid);if(p&&p.interest)p.interest.stage=1;}return false;}return true;});
  m.negs=m.negs.filter(n=>n.expires>S.clock);
  m.listed=m.listed.filter(pid=>P_(pid)&&P_(pid).teamId===S.userTeamId);
  const ut=userTeam();
  for(const pid of m.listed){const p=P_(pid);if(m.offers.filter(o=>o.pid===pid).length>=3)continue;
    for(const t of krTeams()){if(t.isUser)continue;if(rnd()>rate)continue;if(m.offers.some(o=>o.pid===pid&&o.team===t.id))continue;makeAIOffer(t,p,false);}}
}
function makeAIOffer(t,p,unsolicited){
  const v=calcValue(p);const need=needOf(t).includes(p.pos);const starter=t.roster.map(P_).filter(x=>x.pos===p.pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  const upgrade=!starter||calcOvr(p)>calcOvr(starter)+3;
  if(!need&&!upgrade&&!unsolicited)return null;
  if(t.cash<payroll(t)*0.25+v*0.7)return null;const aim=aimOf(t);if(aim==='rebuild'&&p.age>=30&&!unsolicited)return null;if(aim==='money'&&!need)return null;
  let fee=v*(0.8+rnd()*0.3)*(need?1.08:1)*(p.wantsOut===S.season?0.88:1)*(aim==='contend'?1.05:aim==='rebuild'&&p.age<=24?1.05:aim==='money'?0.9:1);
  if((p.acquired&&p.acquired.s===S.season))fee*=0.85;
  fee=Math.min(fee,t.cash*0.5);fee=Math.round(fee/100)*100;if(fee<500)return null;
  const wi=willingInfo(p,t);const o={id:S.nextOfferId++,type:'buy',pid:p.id,team:t.id,fee,max:Math.round(fee*(1.15+rnd()*0.2)/100)*100,expires:S.clock+BAL.OFFER_EXPIRE,counters:0,status:'open',willing:rnd()<wi.pw,pw:wi.pw,reasons:wi.reasons,unsolicited:!!unsolicited};
  S.market.offers.push(o);news(`${josa(t.name,'이','가')} ${p.name}에게 ${money(fee)} 이적 제안`,'offer');return o;
}
function respondOffer(id,action,amt){
  const o=S.market.offers.find(x=>x.id===id);if(!o)return {ok:false,msg:'제안이 만료되었습니다.'};const p=P_(o.pid);const t=S.teams[o.team];
  if(!p||p.teamId!==S.userTeamId){S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:false,msg:'해당 선수가 더 이상 우리 구단 소속이 아닙니다.'};}
  if(action==='reject'){S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:true,msg:'제안을 거절했습니다.'};}
  if(action==='counter'){
    if(o.counters>=2)return {ok:false,msg:'더 이상 재협상할 수 없습니다.'};o.counters++;amt=Math.round(+amt||0);
    if(amt<=o.fee)return {ok:false,msg:'현재 제안보다 높은 금액을 제시해야 합니다.'};
    if(amt<=o.max){o.fee=amt;o.status='agreed';return {ok:true,msg:`${josa(t.name,'이','가')} ${money(amt)}에 동의했습니다. 이제 수락할 수 있습니다.`};}
    if(amt<=o.max*1.2&&o.counters<2){o.fee=o.max;o.status='agreed';return {ok:true,msg:`${t.name}의 최종 제안: ${money(o.max)}. 수락 여부를 결정하세요.`};}
    S.market.offers=S.market.offers.filter(x=>x!==o);return {ok:true,msg:`${josa(t.name,'이','가')} 협상을 중단했습니다.`};
  }
  if(action==='accept'){if(p.dispatch)return {ok:false,msg:`${p.name} 선수는 겨울리그 파견 중이라 복귀 후 이적할 수 있습니다.`};
    if(o.type==='overseas'){const ok=rnd()<o.pw;S.market.offers=S.market.offers.filter(x=>x!==o);if(!ok){if(p.interest)p.interest.stage=1;news(`${josa(p.name,'이','가')} ${t.name} 이적을 거부했습니다.`,'offer');return {ok:false,msg:`${p.name} 선수가 개인 조건에 합의하지 않아 이적이 무산되었습니다.`};}
      transferPlayer(p.id,t.id,o.fee,{salary:o.salary,years:o.years},'해외 이적');return {ok:true,msg:`${p.name} 선수가 ${josa(t.name,'으로')} 이적했습니다. 이적료 ${money(o.fee)} 입금.`};}
    S.market.offers=S.market.offers.filter(x=>x!==o);
    if(!o.willing){news(`${josa(p.name,'이','가')} ${t.name} 이적을 거부했습니다.`,'offer');return {ok:false,msg:`${p.name} 선수가 ${t.name} 이적을 원하지 않아 무산되었습니다.`};}
    if(t.cash<o.fee)return {ok:false,msg:`${t.name}의 자금이 부족해 거래가 무산되었습니다.`};
    transferPlayer(p.id,t.id,o.fee,{salary:Math.round(salaryFor(p)*1.05/10)*10,years:ri(2,4)},'이적');return {ok:true,msg:`${p.name} 선수를 ${t.name}에 ${money(o.fee)}에 판매했습니다.`};
  }
  return {ok:false,msg:'알 수 없는 동작'};
}
// 유저 영입 협상 (구단 합의 → 선수 합의)
// ---------- 협상 테이블 ----------
function agentName(p){return p.agent||(p.agent=pick(['김','이','박','최','정','한','송','유'])+pick(['상무','에이전트','대리인']));}
function tableLines(p,neg,kind,x){
  const ut=userTeam();const agent=!!neg.agent;const who=agent?'agent':'player';const L=[];const push=(t,w)=>L.push({who:w||who,text:t});
  const T=p.traits;const young=p.age<=23,old=p.age>=33;
  if(kind==='greet'){
    if(neg.mode==='renew'){push(old?'어쩌면 제 마지막 계약일지도 모릅니다. 안정적인 기간을 원합니다.':'구단과 함께한 시간이 좋았습니다. 그래도 제 가치는 인정받고 싶습니다.');if(p.contract&&p.contract.years<=0)push('다른 구단에서도 연락이 옵니다. 2주차 안에 결론을 내고 싶어요.');}
    else if(neg.mode==='club'){push(`${josa(p.name,'은','는')} 우리 ${x.key?'핵심 전력':'선수'}입니다. 이적료 얘기부터 하시죠.`,'club');if(x.poor)push('솔직히 구단 사정이 넉넉지 않아 합리적인 제안이면 검토하겠습니다.','club');}
    else{if(p.homecoming===ut.id)push(`다시 ${ut.name}에서 뛰고 싶었습니다. 조건은 무리하게 부르지 않겠습니다.`);
      else if(neg.mode==='sign')push(agent?'제 선수는 시장에서 관심이 많습니다. 좋은 조건이면 빨리 끝낼 수 있습니다.':'자유계약 신분이라 여러 구단을 보고 있습니다. 조건을 들어보죠.');
      else push(agent?`구단 간 합의는 됐으니 이제 ${p.name} 선수의 조건입니다. 지금 연봉보다는 올라야 합니다.`:'구단끼리 얘기가 됐다고 들었습니다. 제 조건을 말씀드리죠.');
      if(young)push('솔직히 돈보다 경기에 나가는 게 더 중요합니다.');
      if(T.includes('강심장'))push('돌려 말하지 않겠습니다. 숫자로 얘기하죠.');if(T.includes('유리멘탈'))push('…(불안한 표정으로 손을 만지작거린다)','sys');if(T.includes('성실'))push('어디서든 열심히 할 자신은 있습니다.');}
  }
  else if(kind==='club_accept')push(`좋습니다. ${money(x.fee)}에 보내드리죠. 선수 본인과 얘기하시죠.`,'club');
  else if(kind==='club_counter')push(`${josa(money(x.ask),'은','는')} 받아야 합니다. 그 아래로는 어렵습니다.`,'club');
  else if(kind==='club_reject')push('그 돈으로는 안 팝니다. 다음에 다시 얘기하죠.','club');
  else if(kind==='counter'){push(agent?`${josa(money(x.dem),'은','는')} 받아야 합니다. 더 낮으면 다른 구단과 얘기하겠습니다.`:`연봉 ${money(x.dem)} 이상이면 사인하겠습니다.`);if(x.wantPromise&&!x.promise)push(young?'주전으로 뛸 수 있다는 약속이 있으면 금액은 조금 양보할 수 있어요.':'출장 기회만 보장되면 조건은 맞출 수 있습니다.');}
  else if(kind==='low'){push(T.includes('강심장')?'그 금액은 제 가치와 거리가 멉니다.':'그 금액은… 조금 실망스럽네요.');if(x.mood<35)push('(분위기가 차갑게 식었다)','sys');}
  else if(kind==='walk'){push(agent?'이 정도면 얘기가 안 되겠네요. 일어나겠습니다.':'죄송하지만 여기까지인 것 같습니다.');}
  else if(kind==='timeout')push('오늘은 여기까지 하죠. 다음에 다시 보겠습니다.');
  else if(kind==='accept'){push(T.includes('강심장')?'좋습니다. 사인하죠.':'좋습니다. 잘 부탁드립니다!');if(x.promise)push('주전 약속, 꼭 지켜주세요.');if(T.includes('성실'))push('기대에 보답하겠습니다.');if(T.includes('게으름'))push('그럼… 훈련 얘기는 나중에 하죠. 하하.');if(p.homecoming===ut.id)push('돌아오게 돼서 기쁩니다.');}
  else if(kind==='cash')push('현금이 부족하시다고요? 준비되면 다시 연락 주세요.');
  return L;
}
function moodOf(p,neg){if(neg.mode==='renew')return clamp(40+(p.morale-60)*0.6,20,85);if(p.homecoming===userTeam().id)return 80;return neg.mode==='sign'?55:60;}
function openTable(pid){
  const p=P_(pid);const ut=userTeam();if(!p||p.retired)return {ok:false,msg:'선수를 찾을 수 없습니다.'};
  if(p.loan)return {ok:false,msg:p.loan.from===S.userTeamId?'임대 보낸 우리 선수입니다. 시즌이 끝나면 돌아옵니다.':'임대 중인 선수는 영입할 수 없습니다.'};
  const mine=p.teamId===S.userTeamId;const from=p.teamId!=null?S.teams[p.teamId]:null;const isFA=!from;
  let neg=S.market.negs.find(n=>n.pid===pid);if(neg)return {ok:true,neg};
  if(mine){const key='renew'+pid+':'+S.season;if((S.market.attempts[key]||0)>=3)return {ok:false,msg:'이번 시즌 재계약 협상 기회(3회)를 모두 사용했습니다.'};
    let dem=Math.max(salaryFor(p),(p.contract?p.contract.salary:0)*1.05);if(calcOvr(p)>=68&&presOf(ut)<22&&p.age<=29)dem*=1.25;if(p.age>=33)dem*=0.85;if(p.grudge)dem*=1.15;
    neg={id:S.nextOfferId++,pid,mode:'renew',stage:'player',demand:Math.round(dem/10)*10,fee:0,ask:0,rounds:0,maxRounds:3,expires:S.clock+3,log:[],promise:false};}
  else{if(ut.roster.length>=BAL.MAX_ROSTER)return {ok:false,msg:`선수단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`};
    const key=pid+':'+S.season;if((S.market.attempts[key]||0)>=2)return {ok:false,msg:'이번 시즌 이 선수와의 협상 기회(2회)를 모두 사용했습니다.'};
    if(!isFA){const wi=willingInfo(p,ut);if(wi.level==='부정적'){return {ok:false,msg:`${p.name} 선수는 우리 구단으로의 이적에 관심이 없습니다 (이적 의향: 부정적 — ${wi.reasons.join(', ')}).`};}}
    {const fb=fgnBlock(ut,p,playerDemand(p,ut));if(fb)return {ok:false,msg:fb};}
    neg={id:S.nextOfferId++,pid,mode:isFA?'sign':'club',stage:isFA?'player':'club',ask:isFA?0:aiAsk(from,p),demand:playerDemand(p,ut),fee:0,rounds:0,maxRounds:4,expires:S.clock+3,log:[],promise:false};
    if(!isFA&&from.league!=='KR')neg.ask=Math.round(neg.ask*1.3/100)*100;}
  neg.agent=calcValue(p)>=10000?agentName(p):null;neg.mood=Math.round(moodOf(p,neg));
  const mk=negKey(neg);const mem=(S.market.negMem||{})[mk];
  if(mem){neg.mood=Math.min(neg.mood,mem.mood);neg.second=true;if(mem.stage==='player'&&neg.stage==='club'){neg.stage='player';neg.fee=mem.fee;}neg.rounds=0;neg.maxRounds=Math.max(1,Math.min(2,neg.maxRounds-mem.used));}
  const wi=mine?null:willingInfo(p,ut);neg.wantPromise=!!(wi&&wi.reasons.some(r=>r.startsWith('출장')))||p.age<=23;
  neg.hint=[Math.round(neg.demand*0.85/10)*10,Math.round(neg.demand*1.15/10)*10];
  const key=from?from.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===pid)<5:false;
  neg.log=tableLines(p,neg,'greet',{key,poor:from&&from.cash<0});if(mine&&p.grudge)neg.log.push({who:neg.agent?'agent':'player',text:'솔직히 말씀드리면, 그때 주전 약속 안 지키신 거 아직 마음에 걸립니다. 이번엔 조건으로 보여 주셔야 합니다.'});
  S.market.negs.push(neg);return {ok:true,neg};
}
function tableOffer(pid,offer){
  const p=P_(pid);const ut=userTeam();const neg=S.market.negs.find(n=>n.pid===pid);if(!neg||!p)return {ok:false,msg:'진행 중인 협상이 없습니다. 테이블을 다시 여세요.'};
  const from=p.teamId!=null&&p.teamId!==S.userTeamId?S.teams[p.teamId]:null;const isFA=p.teamId==null;
  const fee=Math.round(+offer.fee||0),salary=Math.round(+offer.salary||0),years=clamp(Math.round(+offer.years||1),1,4),bonus=Math.max(0,Math.round(+offer.bonus||0)),promise=!!offer.promise;
  const end=()=>{S.market.negs=S.market.negs.filter(n=>n!==neg);};const lines=[];
  neg.expires=S.clock+3;
  if(neg.stage==='club'){neg.rounds++;neg.log.push({who:'me',text:`이적료 ${josa(money(fee),'을','를')} 제안합니다.`});
    if(fee>=neg.ask){neg.stage='player';neg.fee=fee;const L=tableLines(p,neg,'club_accept',{fee});neg.log.push(...L);neg.log.push(...tableLines(p,neg,'greet',{}));neg.rounds=0;return {ok:true,neg};}
    if(fee>=neg.ask*0.8&&neg.rounds<3){neg.log.push(...tableLines(p,neg,'club_counter',{ask:neg.ask}));return {ok:true,neg};}
    neg.log.push(...tableLines(p,neg,'club_reject',{}));end();S.market.attempts[pid+':'+S.season]=2;return {ok:true,ended:true,neg,msg:`${josa(from.name,'이','가')} 협상을 끝냈습니다. 이번 시즌엔 이 선수 이적 협상에 다시 응하지 않습니다.`};}
  // 선수 단계
  const bonusEq=years?bonus/years*0.8:0;const eff=salary+bonusEq;
  const totalCost=neg.fee+bonus+(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0);
  if(neg.mode!=='renew'&&ut.cash<totalCost){return {ok:false,msg:`현금이 부족합니다. 필요 ${money(totalCost)} / 보유 ${money(ut.cash)}`,neg};}
  neg.rounds++;neg.log.push({who:'me',text:`연봉 ${money(salary)} × ${years}년${bonus?` + 계약금 ${money(bonus)}`:''}${promise?' + 주전 출장 약속':''}`});
  let dem=neg.demand*(years>=3?0.95:years===1?1.08:1)*(neg.mood<35?1.08:neg.mood>=75?0.96:1)*(promise&&neg.wantPromise?0.92:1);dem=Math.round(dem/10)*10;
  if(eff>=dem){
    const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;
    neg.log.push(...tableLines(p,neg,'accept',{promise}));end();
    if(promise){p.promise={s:S.phase==='season'?S.season:S.season+1,n:0,on:0};p.apology=null;}
    if(neg.mode==='renew'){p.grudge=null;p.contract={salary,years:years+(S.phase==='season'?1:0)};p.renewed=S.season;S.pendingFA=S.pendingFA.filter(x=>x!==pid);if(bonus){ut.cash-=bonus;ut.fin.buys+=bonus;}p.morale=Math.min(100,p.morale+8);news(`${p.name} 재계약 (${years}년, ${money(salary)}${bonus?', 계약금 '+money(bonus):''})`,'contract');return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 ${years}년 재계약했습니다.`};}
    {const fb=fgnBlock(ut,p,salary);if(fb)return {ok:false,done:true,neg,log:neg.log,msg:fb};}
    const sb=(neg.mode==='sign'?Math.round(calcValue(p)*0.1):0)+bonus;transferPlayer(pid,ut.id,neg.fee+sb,{salary,years},neg.mode==='sign'?'FA 영입':'영입');
    return {ok:true,done:true,neg,log:neg.log,msg:`${p.name} 선수와 계약했습니다. (${years}년, 연봉 ${money(salary)}${neg.fee?`, 이적료 ${money(neg.fee)}`:''}${sb?`, 계약금 ${money(sb)}`:''})`};}
  if(eff>=dem*0.85){neg.mood=clamp(neg.mood-4,0,100);neg.revealed=dem;neg.log.push(...tableLines(p,neg,'counter',{dem,wantPromise:neg.wantPromise,promise}));}
  else{neg.mood=clamp(neg.mood-18,0,100);neg.log.push(...tableLines(p,neg,'low',{mood:neg.mood}));}
  neg.rejects=(neg.rejects||0)+1;neg.log.push({who:'sys',text:`${neg.rejects}차 거절 — 우리 제시 ${money(Math.round(eff))}${eff>=dem*0.85?` · 선수 요구 ${money(dem)}`:' · 요구액과 차이가 큼'}`});
  if(neg.mood<20){neg.log.push(...tableLines(p,neg,'walk',{}));end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(neg.mode==='renew'?3:2);return {ok:true,ended:true,neg,msg:`${p.name} 선수가 협상 테이블을 떠났습니다. 이번 시즌엔 다시 앉지 않습니다.`};}
  if(neg.rounds>=neg.maxRounds){neg.log.push(...tableLines(p,neg,'timeout',{}));negRemember(neg);end();const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;return {ok:true,ended:true,neg,msg:'협상이 종료되었습니다. 기회가 남아 있으면 다시 테이블을 열 수 있습니다.'};}
  return {ok:true,neg};
}
function negKey(neg){return (neg.mode==='renew'?'renew':'')+neg.pid+':'+S.season;}
function negRemember(neg){S.market.negMem=S.market.negMem||{};const k=negKey(neg);const old=S.market.negMem[k];S.market.negMem[k]={mood:neg.mood,stage:neg.stage,fee:neg.fee,used:(old?old.used:0)+neg.rounds};}
function tableLeave(pid){const neg=S.market.negs.find(n=>n.pid===pid);if(!neg)return;negRemember(neg);S.market.negs=S.market.negs.filter(n=>n!==neg);const key=neg.mode==='renew'?'renew'+pid+':'+S.season:pid+':'+S.season;S.market.attempts[key]=(S.market.attempts[key]||0)+1;}
function tableLeft(neg){const key=neg.mode==='renew'?'renew'+neg.pid+':'+S.season:neg.pid+':'+S.season;return Math.max(0,(neg.mode==='renew'?3:2)-(S.market.attempts[key]||0)-1);}
// 하위 호환 래퍼
function negotiate(pid,offer){const o=openTable(pid);if(!o.ok)return o;return tableOffer(pid,offer);}
function cancelNeg(pid){tableLeave(pid);}
function renewContract(pid,salary,years){const o=openTable(pid);if(!o.ok)return o;const r=tableOffer(pid,{salary,years});return r;}
// 주전 약속: 기용은 감독이 정한다. 14일차에 주전(라인업·로테이션·마무리·필승조)으로 쓰고 있는지 점검해 사기에 반영
function promiseKept(t,p){return t.lineup.includes(p.id)||t.rotation.includes(p.id)||t.closer===p.id||(p.pos==='RP'&&t.bullpen.indexOf(p.id)>=0&&t.bullpen.indexOf(p.id)<4);}
// 주전 약속 이행: 약속 이후 우리 경기에서 주전으로 쓴 비율로 판정 (13경기째 또는 시즌 끝, 60% 이상이면 지킴)
// 못 지키면 선수가 면담을 요청 → 감독이 사과(기회 약속) / 트레이드 요청 수용 / 무시 중 선택
const PROMISE_N=13,PROMISE_RATE=0.6;
function promiseTick(){const ut=userTeam();if(!userGameToday())return;
  for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p)continue;
    const pr=p.promise;if(pr&&pr.s===S.season){pr.n=(pr.n||0)+1;pr.on=(pr.on||0)+(promiseKept(ut,p)?1:0);if(pr.n>=PROMISE_N||S.day>=BAL.SEASON_GAMES)promiseJudge(p);}
    const ap=p.apology;if(ap&&ap.s===S.season){ap.n++;ap.on+=promiseKept(ut,p)?1:0;if(ap.n>=7||S.day>=BAL.SEASON_GAMES){if(ap.on>=4){p.morale=clamp(p.morale+8,0,100);news(`${p.name}: 약속대로 기회를 줘서 마음이 풀렸습니다.`,'contract');}else{p.morale=clamp(p.morale-15,0,100);p.grudge=S.season;news(`${p.name}: 사과 뒤에도 기회가 없어 감독을 믿지 않게 됐습니다.`,'contract');}p.apology=null;}}}}
function promiseJudge(p){const pr=p.promise;if(!pr)return;const rate=pr.n?pr.on/pr.n:0;p.promise=null;
  if(rate>=PROMISE_RATE){p.morale=clamp(p.morale+10,0,100);news(`${p.name}: 주전 약속이 지켜졌습니다 (${pr.n}경기 중 ${pr.on}경기 주전). 사기 상승.`,'contract');return;}
  p.morale=clamp(p.morale-15,0,100);S.grievances=(S.grievances||[]).filter(g=>g.pid!==p.id);S.grievances.push({pid:p.id,s:S.season,on:pr.on,n:pr.n,exp:S.clock+3});
  news(`${p.name}: 주전 약속이 지켜지지 않았습니다 (${pr.n}경기 중 ${pr.on}경기 주전). 감독 면담을 요청합니다.`,'contract');}
function promiseStatus(p){const pr=p.promise;if(pr&&pr.s===S.season&&S.phase==='season')return {kind:'promise',on:pr.on||0,n:pr.n||0,need:Math.ceil(PROMISE_N*PROMISE_RATE),of:PROMISE_N};if(pr)return {kind:'promise',on:0,n:0,need:Math.ceil(PROMISE_N*PROMISE_RATE),of:PROMISE_N,pending:true};
  const ap=p.apology;if(ap)return {kind:'apology',on:ap.on,n:ap.n,need:4,of:7};return null;}
function grievanceAnswer(pid,choice){const g=(S.grievances||[]).find(x=>x.pid===pid);const p=P_(pid);if(!g||!p)return '면담 요청이 없습니다.';S.grievances=S.grievances.filter(x=>x!==g);
  if(choice==='apology'){p.morale=clamp(p.morale+8,0,100);p.apology={s:S.season,n:0,on:0};news(`${p.name}에게 사과하고 기회를 약속했습니다 (7경기 중 4경기 이상 주전 기용).`,'contract');return null;}
  if(choice==='trade'){p.wantsOut=S.season;p.morale=clamp(p.morale+5,0,100);p.lockUntil=0;if(!S.market.listed.includes(pid))S.market.listed.push(pid);news(`${p.name}의 트레이드 요청을 받아들여 판매 목록에 올렸습니다. 사정을 아는 구단들이 값을 조금 낮게 부를 수 있습니다.`,'contract');return null;}
  p.morale=clamp(p.morale-10,0,100);p.grudge=S.season;news(`${p.name}의 면담 요청을 무시했습니다. 선수가 서운함을 품었습니다.`,'contract');return null;}
function grievanceTick(){for(const g of [...(S.grievances||[])])if(S.clock>=g.exp){const p=P_(g.pid);S.grievances=S.grievances.filter(x=>x!==g);if(p&&p.teamId===S.userTeamId){p.morale=clamp(p.morale-10,0,100);p.grudge=S.season;news(`${p.name}: 면담 요청에 답이 없어 서운함을 품었습니다.`,'contract');}}}
function releasePlayer(pid){const p=P_(pid);const ut=userTeam();if(!p||p.teamId!==S.userTeamId)return '우리 구단 선수가 아닙니다.';if(p.dispatch)return '파견 중인 선수는 방출할 수 없습니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;
  const sev=Math.round((p.contract?p.contract.salary*Math.max(1,p.contract.years)*0.3:0)/10)*10;ut.cash-=sev;ut.fin.other+=sev;removeFromTeam(ut,p);S.fa.push(pid);p.exUser=true;p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'방출'});fixLineup(ut);news(`${p.name} 방출 (위약금 ${money(sev)})`,'contract');return null;}
function removeFromTeam(t,p){t.roster=t.roster.filter(id=>id!==p.id);t.dev=(t.dev||[]).filter(id=>id!==p.id);t.lineup=t.lineup.filter(id=>id!==p.id);delete t.pos[p.id];t.rotation=t.rotation.filter(id=>id!==p.id);t.bullpen=t.bullpen.filter(id=>id!==p.id);if(t.closer===p.id)t.closer=null;p.teamId=null;p.contract=null;
  S.market.listed=S.market.listed.filter(x=>x!==p.id);S.market.offers=S.market.offers.filter(o=>o.pid!==p.id);S.market.negs=S.market.negs.filter(n=>n.pid!==p.id);}
function transferPlayer(pid,toId,fee,contract,kind){
  const p=P_(pid);const to=S.teams[toId];const from=p.teamId!=null?S.teams[p.teamId]:null;
  if(to.cash<fee&&!to.isUser&&to.league==='KR')return false;
  if(!to.isUser&&fgnBlock(to,p,contract&&contract.salary))return false;   // AI 구단도 외국인 정원을 지킨다
  S.pendingFA=S.pendingFA.filter(x=>x!==pid);
  const wasStarter=!!from&&(from.lineup.includes(p.id)||from.rotation.includes(p.id)||from.closer===p.id);
  if(from)removeFromTeam(from,p);else{S.fa=S.fa.filter(x=>x!==pid);S.youth=S.youth.filter(x=>x!==pid);if(S.market.scoutResults)S.market.scoutResults.ids=S.market.scoutResults.ids.filter(x=>x!==pid);}
  if(from){from.cash+=fee;from.fin.sales+=fee;}
  to.cash-=fee;to.fin.buys+=fee;addToTeam(p,to,contract);
  if(from&&from.league==='KR'&&to.league!=='KR'&&(p.userLink||p.exUser||from.isUser)&&!(p.ms&&p.ms.ab)){p.ms=Object.assign(p.ms||{},{ab:{s:S.season,lg:to.league,tn:to.name}});achGet('abroad');}
  if(BAL.FARM[to.league]){p.tier=farmTierOf(p,to);if(p.tier>1&&(p.userLink||p.exUser))news(`[해외] ${p.name}, ${to.name}에서 ${farmKo(to.league,p.tier)}부터 시작합니다`,'overseas');}else delete p.tier;
  if(fee>0&&p.sellOn&&from&&p.sellOn.team!==from.id&&S.teams[p.sellOn.team]){const share=Math.round(fee*p.sellOn.pct/10)*10;const ex=S.teams[p.sellOn.team];from.cash-=share;from.fin.sales-=share;ex.cash+=share;ex.fin.sales+=share;
    if(ex.isUser)news(`[셀온] 우리 출신 ${josa(p.name,'이','가')} ${josa(to.name,'으로')} 이적 — 이적료 ${money(fee)}의 ${Math.round(p.sellOn.pct*100)}%, ${money(share)} 입금!`,'alumni');p.sellOn=null;}
  else if(p.exUser&&from&&!from.isUser&&!to.isUser)news(`[출신] ${p.name}: ${from.name} → ${to.name}${fee?` (${money(fee)})`:''}`,'alumni');
  if(from&&from.isUser)p.coached=true;
  if(from&&from.isUser&&kind!=='방출'){p.exUser=true;if(fee>0)p.sellOn={team:from.id,pct:BAL.SELL_ON};}
  if(to.isUser){p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs)),role:(to.dev||[]).includes(p.id)?'육성군':'1군 백업'};p.exUser=false;if(p.age<=23&&p.devStart==null)p.devStart=r1(calcOvr(p));if(!p.base)p.base=JSON.parse(JSON.stringify(p.attrs));if(p.snap&&!p.snap.attrs){p.snap.attrs=JSON.parse(JSON.stringify(p.attrs));p.snap.join=1;}}
  if(from&&from.isUser&&fee>0&&S.mgr&&S.mgr.cur){S.mgr.cur.sales.push({pid:p.id,fee,cost:(p._acqFee||0),st:wasStarter?1:0});}
  if(to.isUser)p._acqFee=fee;
  p.transfers.push({s:S.season,from:from?from.name:(p.homecoming?'FA(친정 복귀)':'FA'),to:to.name,fee,kind});
  p.acquired={s:S.season,d:S.day,fee};p.base=JSON.parse(JSON.stringify(p.attrs));p.ovrStart=r1(calcOvr(p));p.lockUntil=S.clock+BAL.SELL_LOCK;p.homecoming=null;p.scouted=false;
  if(to.league!=='KR'){p.interest=null;}else if(p.interest&&!to.isUser)p.interest=null;
  if(to.isUser||(from&&from.isUser)){p.userLink=true;p.valHist.push([S.season,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}
  if(from){if(from.isUser)fixLineup(from);else autoLineup(from);}
  if(to.isUser)fixLineup(to);else autoLineup(to);
  if(to.isUser||(from&&from.isUser))news(`${p.name}: ${from?from.name:'FA'} → ${to.name} (${kind}${fee?', '+money(fee):''})`,'transfer');
  return true;
}
function takeLoan(amt){const ut=userTeam();amt=Math.round(+amt||0);if(amt<=0)return '금액을 확인하세요.';if(ut.loan+amt>BAL.LOAN_CAP)return `대출 한도(${money(BAL.LOAN_CAP)})를 초과합니다.`;ut.cash+=amt;ut.loan+=Math.round(amt*(1+BAL.LOAN_RATE));ut.rep=Math.max(5,ut.rep-2);news(`긴급 대출 ${money(amt)} (다음 시즌 시작 시 ${money(Math.round(amt*(1+BAL.LOAN_RATE)))} 상환)`,'fin');return null;}
function upgradeFacility(key){const ut=userTeam();const f=BAL.FACILITY[key];if(!f)return '잘못된 시설';const lvl=ut.fac[key];if(lvl>=5)return '최대 레벨입니다.';const cost=f.cost*lvl;if(ut.cash<cost)return `자금 부족 (필요 ${money(cost)})`;ut.cash-=cost;ut.fin.facility+=cost;ut.fac[key]=lvl+1;news(`${key==='train'?'훈련장':key==='youth'?'유소년 센터':'스카우트 조직'} Lv.${lvl+1} 완료`,'fin');return null;}

// ---------- 스카우트 ----------
function runScout(kind,level,filter){
  const ut=userTeam();level=clamp(level|0,0,2);const cost=BAL.SCOUT_COST[level];if(ut.cash<cost)return {ok:false,msg:`자금 부족 (필요 ${money(cost)})`};
  const key='scout:'+S.season+':'+(S.phase==='season'?S.day:'w'+S.week);S.market.attempts[key]=(S.market.attempts[key]||0)+1;if(S.market.attempts[key]>2)return {ok:false,msg:'오늘은 더 이상 스카우트를 보낼 수 없습니다. 다음 날 다시 시도하세요.'};
  ut.cash-=cost;ut.fin.scout+=cost;
  const sfx=staffFx(ut);const n=BAL.SCOUT_N[level]+(ut.fac.scout>=3?1:0)+sfx.scoutN;const conf=clamp(BAL.SCOUT_CONF[level]+(ut.fac.scout-1)*0.05+sfx.conf+(kind==='overseas'&&staffTrait(ut,'scout','abroad')?0.1:0),0.05,0.8);filter=filter||{};
  if(S.market.scoutResults&&S.market.scoutResults.kind==='youth')for(const id of S.market.scoutResults.ids){const p=P_(id);if(p&&p.teamId==null&&p.scouted)delete S.players[id];}
  let ids=[];
  const match=p=>{if(filter.pos&&filter.pos!=='ALL'&&!(filter.pos==='P'?isPitcher(p):filter.pos==='B'?!isPitcher(p):p.pos===filter.pos))return false;if(filter.maxAge&&p.age>filter.maxAge)return false;if(filter.minAge&&p.age<filter.minAge)return false;
    if(filter.grade&&filter.grade!=='ALL'&&gradeOf(calcOvr(p))!==filter.grade)return false;if(filter.minPot&&filter.minPot!=='ALL'&&'DCBAS'.indexOf(gradeOf(p.scout.est))<'DCBAS'.indexOf(filter.minPot))return false;if(filter.maxValue&&calcValue(p)>filter.maxValue)return false;return true;};
  if(kind==='youth'){for(let i=0;i<n;i++){let pos=filter.pos&&!['ALL','P','B'].includes(filter.pos)?filter.pos:filter.pos==='P'?pick(['SP','RP']):filter.pos==='B'?pick(POS_BAT):pick(ROSTER_TEMPLATE);
      const p=genPlayer({pos,age:ri(17,21),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.scout*1.5+level*1.5,potBoost:ut.fac.scout*1.5+level*2,conf});p.scouted=true;registerPlayer(p);ids.push(p.id);}}
  else{let pool;if(kind==='fa')pool=S.fa.map(P_);else if(kind==='domestic')pool=krTeams().filter(t=>!t.isUser).flatMap(t=>t.roster.map(P_));else pool=Object.values(S.teams).filter(t=>t.league!=='KR'&&(!filter.league||filter.league==='ALL'||t.league===filter.league)).flatMap(t=>t.roster.map(P_));
    pool=pool.filter(p=>p&&!p.retired&&match(p));shuffle(pool);pool.sort((a,b)=>(calcValue(b)*(0.6+rnd()*0.8))-(calcValue(a)*(0.6+rnd()*0.8)));
    pool=pool.slice(0,n);for(const p of pool){improveScout(p,conf);ids.push(p.id);}}
  S.market.scoutResults={kind,level,ids,s:S.season,d:S.day};
  return {ok:true,msg:`스카우트 보고서 ${ids.length}건이 도착했습니다.`,ids};
}
function signScouted(pid,salary,years){const p=P_(pid);if(!p||!p.scouted||p.teamId!=null)return {ok:false,msg:'계약 가능한 선수가 아닙니다.'};return negotiate(pid,{fee:0,salary,years});}
function scoutReport(p){
  const lines=[];const dg=diagnose(p);
  lines.push(`${dg.arch} — ${josa(dg.bestTxt,'이','가')} 가장 돋보입니다.`+(dg.weak?` ${josa(ATTR_KO[dg.weak],'은','는')} 보완이 필요합니다.`:isPitcher(p)?' 구위·제구·변화구 쪽으로는 뚜렷한 약점이 없습니다.':' 타격 쪽으로는 뚜렷한 약점이 없습니다.')+(dg.fieldWeak&&dg.fieldWeak.length?` 다만 ${dg.fieldWeak.map(k=>ATTR_KO[k]+' '+Math.round(p.attrs[k])).join('·')}로 수비·주루가 크게 부족합니다.`:''));
  const est=p.scout.est,ovr=calcOvr(p);
  if(p.age<=23&&est-ovr>=10)lines.push('지금 능력보다 잠재력이 크게 남아 있어, 꾸준히 출장하면 큰 성장이 기대됩니다.');else if(p.age<=26&&est-ovr>=5)lines.push('아직 성장 여지가 남아 있다고 판단됩니다.');else if(p.age>=31)lines.push('성장보다는 현재 전력으로 평가해야 하는 베테랑입니다.');else lines.push('현재 능력이 거의 완성 단계로 보입니다.');
  if(p.scout.conf<0.35)lines.push('관찰 기간이 짧아 평가 신뢰도가 낮습니다.');
  for(const t of p.traits)if(TRAITS[t])lines.push(`특성 ${t}: ${TRAITS[t]}.`);
  return lines;
}
function confText(c){return c<0.35?'낮음':c<0.65?'보통':'높음';}

// ---------- 해외 ----------
function overseasTeams(){return Object.values(S.teams).filter(t=>t.league!=='KR');}
function interestCheck(){
  const ut=userTeam();
  for(const pid of ut.roster){const p=P_(pid);if(!p||p.retired)continue;if(S.market.offers.some(o=>o.pid===pid&&o.type==='overseas'))continue;
    const ovr=calcOvr(p);let sc=ovr;const s=p.cur;
    if(isPitcher(p)){if(s.pOuts>=30*gf()){const era=s.pER*27/s.pOuts;if(era<3.0)sc+=4;else if(era>5.5)sc-=3;}}else if(s.pa>=40*gf()){const o=ops_(s);if(o>0.85)sc+=4;else if(o<0.62)sc-=3;}
    if(p.exposure===S.season||p.exposure===S.season-1)sc+=3;
    const vet=p.age>30;if(vet)sc-=8;if(p.age<=23&&p.pot>=80&&ovr>=60)sc=Math.max(sc,66);
    const myLv=levelOf(ut);let lg=null;if(sc>=BAL.LEVEL_OVR.US-2&&p.age<=30)lg='US';else if(sc>=BAL.LEVEL_OVR.JP-2&&p.age<=31)lg='JP';else if(sc>=59&&p.age<=31)lg=rnd()<0.5?'TW':'MX';else if(vet&&ovr>=58&&p.age<=34)lg='MX';
    if(lg&&BAL.LEVEL_OVR[lg]<=myLv+2)lg=null;
    if(lg){if(!p.interest||p.interest.lg!==lg){const t=pick(overseasTeams().filter(x=>x.league===lg&&!x.isUser));p.interest={team:t.id,lg,stage:p.interest?Math.max(0,p.interest.stage-1):0};}
      if(rnd()<0.55){p.interest.stage=Math.min(3,p.interest.stage+1);if(p.interest.stage===1)news(`${S.teams[p.interest.team].name} 스카우트가 ${josa(p.name,'을','를')} 관찰하기 시작했습니다.`,'overseas');}
      if(p.interest.stage===3)makeOverseasOffer(p);}
    else if(p.interest&&rnd()<0.4){p.interest.stage--;if(p.interest.stage<=0)p.interest=null;}
  }
}
function makeOverseasOffer(p){
  const t=S.teams[p.interest.team];if(!t)return null;if(t.cash<calcValue(p))return null;
  const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)return null;
  const LM={US:[1.3,3.5,0.1],JP:[1,2.5,0],TW:[0.8,1.6,-0.05],MX:[0.75,1.4,-0.05]}[t.league]||[0.7,1.2,-0.1];
  let fee=calcValue(p)*(1.5+rnd()*0.6)*LM[0];fee=Math.min(fee,t.cash*0.4);fee=Math.round(fee/100)*100;
  const salary=Math.round(salaryFor(p)*LM[1]/10)*10;const years=ri(2,4);
  const incumbent=t.roster.map(P_).filter(x=>x.pos===p.pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];
  let pw=0.55+LM[2]-(p.age>=32?0.2:0)+(p.traits.includes('강심장')?0.15:0)-(p.traits.includes('유리멘탈')?0.15:0);
  if(incumbent&&calcOvr(incumbent)-calcOvr(p)>6)pw-=0.25;if(p.contract&&salary/p.contract.salary>3)pw+=0.1;pw=clamp(pw,0.1,0.95);
  const o={id:S.nextOfferId++,type:'overseas',pid:p.id,team:t.id,fee,salary,years,pw,expires:S.clock+(S.phase==='season'?4:3),status:'open',counters:0,max:Math.round(fee*1.15/100)*100};
  S.market.attempts[key]=1;S.market.offers.push(o);news(`${josa(t.name,'이','가')} ${p.name}에게 공식 영입 제안! 이적료 ${money(fee)}, 연봉 ${money(salary)}`,'overseas');return o;
}
function summaryStat(p,lg,share){const L=BAL.LEAGUES[lg]||{games:140};const g=L.games/140;const st=newStat();const a=p.attrs;const lv=(BAL.LEVEL_OVR[lg]||60)-60;
  if(!isPitcher(p)){const pa=Math.max(4,Math.round(560*g*share+ri(-20,20)*g));const avg=clamp(0.2+(a.contact-50)*0.0028+(a.power-50)*0.0004+gauss()*0.02-lv*0.0018,0.12,0.38);
    st.pa=pa;st.bb=Math.round(pa*clamp(0.06+(a.eye-50)*0.0015,0.02,0.15));st.ab=pa-st.bb;st.h=Math.round(st.ab*avg);st.hr=Math.round(pa*clamp(0.008+(a.power-50)*0.0009-lv*0.0003,0.002,0.06));st.d2=Math.round(st.h*0.2);st.d3=Math.round(st.h*0.02);st.so=Math.round(pa*clamp(0.2-(a.contact-50)*0.0015+lv*0.002,0.08,0.38));st.g=Math.max(1,Math.round(pa/4.2));st.r=Math.round(st.h*0.5);st.rbi=Math.round(st.h*0.45+st.hr);}
  else{const sp=p.pos==='SP';st.pOuts=Math.max(3,Math.round((sp?170:65)*g*share+ri(-8,8)*g))*3;const era=clamp(4.5-(calcOvr(p)-60)*0.09+gauss()*0.6+lv*0.06,1.2,9);st.pER=Math.round(st.pOuts/27*era);st.pR=st.pER;st.pH=Math.round(st.pOuts/3*(1.05-(a.movement-50)*0.004));st.pBB=Math.round(st.pOuts/3*clamp(0.4-(a.control-50)*0.004,0.15,0.7));st.pSO=Math.round(st.pOuts/3*clamp(0.85+(a.stuff-50)*0.012,0.4,1.5));st.pHR=Math.round(st.pOuts/27*clamp(1.0-(a.stuff-50)*0.012-(a.movement-50)*0.008+lv*0.02,0.3,2));
    st.pG=sp?Math.max(1,Math.round(30*g*share)):Math.max(1,Math.round(55*g*share));st.pGS=sp?st.pG:0;st.pW=Math.round((sp?10:3)*g*share*(5/Math.max(2,era)));st.pL=Math.round((sp?8:3)*g*share*(Math.max(2,era)/4.5));st.pPit=Math.round(st.pOuts*5.2);}
  return st;}
function overseasSeasonSummary(winter,skip,skipRows){
  const tables={};
  if(skip&&skipRows)tables[skip]=skipRows;
  for(const lg of Object.keys(BAL.LEAGUES).filter(k=>!!BAL.LEAGUES[k].winter===!!winter&&k!==skip)){const ts=overseasTeams().filter(t=>t.league===lg&&activeT(t));if(!ts.length)continue;const G=BAL.LEAGUES[lg].games;const str=ts.map(t=>{const ps=t.roster.map(P_).filter(Boolean);const b=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,9);const pi=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,8);const avg=a=>a.length?a.reduce((s,p)=>s+calcOvr(p),0)/a.length:50;return {t,s:avg(b)*0.55+avg(pi)*0.45};});
    const mean=str.reduce((s,x)=>s+x.s,0)/str.length;const all=str.map(x=>{const w=clamp(Math.round(G/2+(x.s-mean)*2.5*G/140+gauss()*6*G/140),Math.round(G*0.25),Math.round(G*0.75));return {id:x.t.id,name:x.t.name,w,l:G-w,sub:x.t.sub};});
    const rows=[];const subs=BAL.LEAGUES[lg].subs;for(let si=0;si<(subs?subs.length:1);si++){const grp=all.filter(r=>!subs||r.sub===si).sort((a,b)=>b.w-a.w);grp.forEach((r,i)=>{r.rank=i+1;const t=S.teams[r.id];t.rec={w:r.w,l:r.l,rs:0,ra:0};t.lastRank=i+1;rows.push(r);});}tables[lg]=rows;
    for(const t of ts){const ps=t.roster.map(P_).filter(Boolean);const bats=ps.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));const pits=ps.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a));
      const FM=!winter&&BAL.FARM[lg];const tierOf=p=>FM?farmTierOf(p,t):1;
      bats.forEach((p,i)=>{const tr=tierOf(p);const fk=lg+tr;const st=tr>1?summaryStat(p,fk,0.85):summaryStat(p,lg,i<9?0.92:i<13?0.4:0.14);p.osRole=tr>1?'farm':i<9?'start':'bench';if(FM){if(tr>1)p.tier=tr;else delete p.tier;}p.hist.push({s:S.season,team:t.id,tn:tr>1?`${t.name} · ${farmKo(lg,tr)}`:t.name,lg:tr>1?fk:lg,st,w:winter?1:0,ovr:Math.round(calcOvr(p))});if(!winter&&tr<=1&&(p.userLink||p.exUser))addCar(p,st,t.name);while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();});
      pits.forEach((p,i)=>{const tr=tierOf(p);const fk=lg+tr;const sp=p.pos==='SP'&&i<5;const st=tr>1?summaryStat(p,fk,0.85):summaryStat(p,lg,sp||i<8?0.9:0.35);if(tr===1&&!sp&&i===5)st.pSV=Math.round(ri(15,38)*G/140);p.osRole=tr>1?'farm':(sp||i<8)?'start':'bench';if(FM){if(tr>1)p.tier=tr;else delete p.tier;}
        p.hist.push({s:S.season,team:t.id,tn:tr>1?`${t.name} · ${farmKo(lg,tr)}`:t.name,lg:tr>1?fk:lg,st,w:winter?1:0,ovr:Math.round(calcOvr(p))});if(!winter&&tr<=1&&(p.userLink||p.exUser))addCar(p,st,t.name);while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();
        if(p.userLink){const ms=[];if(tr===1&&(sp||i<8)){if(!p.osStart){p.osStart=S.season;ms.push('해외 첫 주전 시즌');}}news(`[해외] ${p.name}(${t.name}${tr>1?' · '+farmKo(lg,tr):''}) 시즌 성적: ${st.pW}승 ${st.pL}패 ERA ${(st.pER*27/st.pOuts).toFixed(2)}${ms.length?' — '+ms.join(', '):''}`,p.exUser&&ms.length?'alumni':'overseas');}});
      bats.forEach((p,i)=>{if(p.userLink){const tr=p.tier||1;const h=p.hist[p.hist.length-1].st;const ms=[];if(tr===1&&i<9&&!p.osStart){p.osStart=S.season;ms.push('해외 첫 주전 시즌');}if(tr===1&&h.hr>0&&!p.osHr){p.osHr=S.season;ms.push('해외 무대 첫 홈런');}news(`[해외] ${p.name}(${t.name}${tr>1?' · '+farmKo(lg,tr):''}) 시즌 성적: 타율 ${(h.h/Math.max(1,h.ab)).toFixed(3)}, ${h.hr}홈런${ms.length?' — '+ms.join(', '):''}`,p.exUser&&ms.length?'alumni':'overseas');}});
    }}
  const key=winter?'whist':'hist';S.overseas[key]=S.overseas[key]||[];S.overseas[key].push({s:S.season,tables});if(S.overseas[key].length>8)S.overseas[key].shift();
}

// ---------- AI 구단 운영 ----------
function aiSignFA(t,maxN){
  let n=0;const need=needOf(t);const pool=S.fa.map(P_).filter(p=>p&&!p.retired);
  pool.sort((a,b)=>calcValue(b)-calcValue(a));
  for(const p of pool){if(n>=maxN||t.roster.length>=26)break;const sal=salaryFor(p);if(t.cash<sal*2+payroll(t)*0.15)continue;
    const want=need.includes(p.pos)||(t.roster.length<BAL.MIN_ROSTER+2);if(!want)continue;if(calcOvr(p)<levelOf(t)-12&&t.roster.length>=BAL.MIN_ROSTER)continue;
    if(fgnBlock(t,p,sal))continue;
    transferPlayer(p.id,t.id,0,{salary:Math.round(sal/10)*10,years:ri(1,3)},'FA 영입');n++;const ni=need.indexOf(p.pos);if(ni>=0)need.splice(ni,1);}
  return n;
}
function aiFillRookies(t){let guard=0;while((t.roster.length<BAL.MIN_ROSTER+4||rosterCheck(t).length)&&guard++<30){const ps=t.roster.map(P_);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;const need=needOf(t);const pos=c<1?'C':pit<BAL.MIN_PITCHERS?pick(['SP','RP']):need.length?need[0]:pick(ROSTER_TEMPLATE);const p=genPlayer({pos,age:ri(18,22),lvl:BAL.LEVEL_OVR.ROOKIE+(t.div===1?6:t.div===2?3:0),potBoost:t.fac.youth});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
function aiWeek(t){presCrisis(t);
  if(t.cash<0){const ps=t.roster.map(P_).sort((a,b)=>calcValue(b)-calcValue(a));for(const p of ps.filter(x=>!x.loan).slice(0,3)){const buyers=krTeams().filter(x=>!x.isUser&&x.id!==t.id&&x.cash>calcValue(p)*1.3+payroll(x)*0.3).sort((a,b)=>b.cash-a.cash);
      if(buyers.length){const b=buyers[0];const fee=Math.round(calcValue(p)*0.95/100)*100;transferPlayer(p.id,b.id,fee,{salary:Math.round(salaryFor(p)/10)*10,years:ri(2,3)},'이적');if(t.cash>=0)break;}
      else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});if(t.cash>=0)break;}}}
  if(t.roster.length<26)aiSignFA(t,2);
  if(t.roster.length>=24&&t.cash>payroll(t)*1.3&&rnd()<0.3){
    const need=needOf(t);const weakPos=need.length?need[0]:(()=>{let worst=null,wv=999;for(const pos of POS_BAT.concat(['SP'])){const best=t.roster.map(P_).filter(p=>p.pos===pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const v=best?calcOvr(best):0;if(v<wv){wv=v;worst=pos;}}return worst;})();
    const starter=t.roster.map(P_).filter(p=>p.pos===weakPos).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];const minO=starter?calcOvr(starter)+5:0;
    const cands=krTeams().filter(x=>!x.isUser&&x.id!==t.id).flatMap(x=>x.roster.map(P_)).filter(p=>!p.loan&&p.pos===weakPos&&calcOvr(p)>=minO&&calcValue(p)<=t.cash*0.35&&(p.lockUntil||0)<=S.clock);
    if(cands.length){const p=pick(cands);const seller=S.teams[p.teamId];const rank=seller.roster.map(P_).sort((a,b)=>calcOvr(b)-calcOvr(a)).findIndex(x=>x.id===p.id);
      if(rank>=3||seller.cash<0||rnd()<0.3){const fee=aiAsk(seller,p);if(t.cash>=fee)transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*1.05/10)*10,years:ri(2,4)},'이적');}}}
  while(t.roster.length>28){const ps=t.roster.map(P_).filter(x=>!x.loan).sort((a,b)=>calcValue(a)-calcValue(b));const p=ps[0];if(!p)break;if(t.dev.length<devCap(t)&&p.age<=25){t.roster=t.roster.filter(x=>x!==p.id);t.dev.push(p.id);}else{removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});}}
  autoLineup(t);
}
function overseasWeek(){
  for(const t of overseasTeams()){if(!BAL.BUY_MIN[t.league]||t.isUser)continue;const nL=compTeams(t.league).length||6;if(rnd()>(t.league==='US'||t.league==='JP'?0.05:0.03)*6/nL)continue;const key='osbuy:'+t.id+':'+S.season;if((S.market.attempts[key]||0)>=1)continue;
    const cands=krTeams().filter(x=>!x.isUser).flatMap(x=>x.roster.map(P_)).filter(p=>!p.loan&&p.age<=(t.league==='MX'?33:29)&&calcOvr(p)>=BAL.BUY_MIN[t.league]&&(p.lockUntil||0)<=S.clock);
    if(!cands.length)continue;const p=pick(cands);const seller=S.teams[p.teamId];const fee=Math.min(t.cash*0.4,Math.round(calcValue(p)*(t.league==='US'||t.league==='JP'?1.6:1.15)/100)*100);
    if(t.cash<fee)continue;S.market.attempts[key]=1;transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*(t.league==='US'?3.5:t.league==='JP'?2.5:1.5)/10)*10,years:ri(2,4)},'해외 이적');news(`${p.exUser?'[출신] ':''}${seller.name} ${josa(p.name,'이','가')} ${josa(t.name,'으로')} 해외 진출 (이적료 ${money(fee)})`,p.exUser?'alumni':'overseas');}
}


// ---------- 육성군 ----------
function promoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.dev.includes(pid))return '육성군 선수가 아닙니다.';if(ut.roster.length>=BAL.MAX_ROSTER)return `1군 명단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`;ut.dev=ut.dev.filter(x=>x!==pid);ut.roster.push(pid);fixLineup(ut);news(`${p.name} 1군 등록`,'contract');return null;}
function demoteDev(pid){const ut=userTeam();const p=P_(pid);if(!p||!ut.roster.includes(pid))return '1군 선수가 아닙니다.';if(ut.roster.length<=BAL.MIN_ROSTER)return `1군 최소 인원(${BAL.MIN_ROSTER}명) 이하로 줄일 수 없습니다.`;if(ut.dev.length>=devCap(ut))return `육성군이 가득 찼습니다 (최대 ${devCap(ut)}명, 유소년 센터 Lv↑로 확장).`;if(S.market.listed.includes(pid))return '판매 등록 중인 선수는 말소할 수 없습니다.';
  ut.roster=ut.roster.filter(x=>x!==pid);ut.dev.push(pid);fixLineup(ut);news(`${p.name} 육성군으로 이동`,'contract');return null;}
// ---------- 고교 드래프트 ----------
const DRAFT_LG={KR:{name:'고교 드래프트',nat:'KR'},JP:{name:'신인 드래프트',nat:'JP',sch:[['삿포로','센다이','도쿄','요코하마','나고야','오사카','교토','고베','히로시마','후쿠오카','오키나와','니가타'],['학원고','상업고','공업고','실업고','대학','체육대']]},
  TW:{name:'신인 드래프트',nat:'TW',sch:[['타이베이','신베이','타오위안','타이중','타이난','가오슝','화롄','핑둥'],['체육고','상공고','고급중학','대학','체육대']]},
  US:{name:'아마추어 드래프트',nat:'US',sch:[['코스트','밸리','레이크','파인','리버','메사','프레리','베이','캐년','하버'],['고교','주립대','칼리지','커뮤니티 칼리지','대학']]}};
function draftLeagueTeams(lg){return lg==='KR'?krTeams():Object.values(S.teams).filter(t=>t.league===lg&&activeT(t));}
function createDraft(lg){lg=lg||'KR';const DL=DRAFT_LG[lg]||DRAFT_LG.KR;const LT=draftLeagueTeams(lg);
  const ut=userTeam();const pool=[];const sfx=staffFx(ut);const hs=staffTrait(ut,'scout','draft');const NP=Math.round(BAL.DRAFT_POOL*Math.max(1,LT.length/10));
  for(let i=0;i<NP;i++){const g=gauss();const p=genPlayer({nat:DL.nat,pos:pick(ROSTER_TEMPLATE),age:ri(18,lg==='US'?21:19),lvl:BAL.LEVEL_OVR.ROOKIE-3,potBoost:Math.max(0,g*6),conf:clamp(0.2+ut.fac.scout*0.05+sfx.conf+(hs?0.1:0),0.05,0.8)});p.draft=true;p.school=lg!=='KR'?`${pick(DL.sch[0])} ${pick(DL.sch[1])}`:pick(['경북고','부산고','광주일고','대구상원고','서울고','덕수고','천안북일고','유신고','마산용마고','인천고','강릉고','청주고','군산상고','세광고','장충고','휘문고','성남고','북일고','야탑고','제주고']);pool.push(p.id);}
  const wp=t=>{const n=t.rec.w+t.rec.l;return n?t.rec.w/n:0.5;};
  const teams=lg==='KR'?LT.sort((a,b)=>(b.lastRank||BAL.KR_TEAMS)-(a.lastRank||BAL.KR_TEAMS)||a.id-b.id):LT.sort((a,b)=>wp(a)-wp(b)||a.id-b.id);const order=[];for(let r=0;r<BAL.DRAFT_ROUNDS;r++)for(const t of teams)order.push(t.id);
  S.draft={s:S.season,lg,n:teams.length,name:DL.name,pool,order,idx:0,picks:[],done:false};
  news(`${S.season}시즌 ${lg==='KR'?'':BAL.LEAGUES[lg].short+' '}${DL.name} 시작 — 지명 순서는 지난 시즌 ${lg==='KR'?'하위 순위':'승률 낮은 구단'}부터입니다.`,'sys');
}
function needCats(t){const out={short:needOf(t),upgrade:[],succ:[]};const L=levelOf(t);
  for(const id of t.lineup){const p=P_(id);const pos=t.pos[id];if(!p||!pos||pos==='DH')continue;if(posOvr(p,pos)<L-5)out.upgrade.push(pos);const young=t.roster.concat(t.dev).map(P_).some(x=>x&&x.id!==p.id&&x.pos===pos&&x.age<=24);if(p.age>=31&&!young)out.succ.push(pos);}
  const sps=t.rotation.map(P_).filter(Boolean);if(sps.filter(p=>calcOvr(p)<L-5).length>=2)out.upgrade.push('SP');if(sps.filter(p=>p.age>=32).length>=2&&!t.roster.concat(t.dev).map(P_).some(x=>x&&x.pos==='SP'&&x.age<=24&&!t.rotation.includes(x.id)))out.succ.push('SP');return out;}
function draftAvail(){return S.draft?S.draft.pool.map(P_).filter(p=>p&&p.teamId==null&&!p.drafted):[];}
// 지명 후 계약: 라운드·잠재력에 따라 계약금을 요구. AI는 바로 계약, 유저는 개막 전까지 계약하거나 포기 (계약하지 않으면 대학 진학)
function draftBonus(p,round){const base=[16000,9000,5500,3500,2500][round-1]||2000;const lf=S.draft&&S.draft.lg&&S.draft.lg!=='KR'?(LG_ECON[S.draft.lg]||1):1;return Math.round(base*lf*clamp(0.75+(p.scout.est-55)*0.02,0.6,1.6)/100)*100;}
function draftRoom(t){return t.roster.length+t.dev.length<(t.isUser?26+devCap(t):26);}   // AI는 예전 인원(약 26명)을 넘지 않게
function draftSign(t,p,dest){if(t.isUser&&dest!=='now'){const round=Math.floor(S.draft.picks.length/(S.draft.n||krTeams().length))+1;p.drafted={team:t.id,round,no:S.draft.picks.length+1,ask:draftBonus(p,round),dest:dest||'auto'};S.draft.picks.push({team:t.id,pid:p.id,no:S.draft.picks.length+1,round,pending:true});return true;}
  if(!t.isUser){const round=Math.floor(S.draft.picks.length/(S.draft.n||krTeams().length))+1;const b=Math.round(draftBonus(p,round)*(LG_ECON[t.league]||1));t.cash-=b;t.fin.buys+=b;}
  return draftSignNow(t,p,dest);}
function draftSignNow(t,p,dest){const dev=dest==='dev'||(dest!=='roster'&&t.roster.length>=26);if(dev&&t.dev.length>=devCap(t)){if(t.roster.length>=BAL.MAX_ROSTER)return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},false);}else if(!dev&&t.roster.length>=BAL.MAX_ROSTER){if(t.dev.length>=devCap(t))return false;addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},true);}else addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3},dev);
  p.draft=false;p.transfers.push({s:S.season,from:p.school||'고교',to:t.name,fee:0,kind:`드래프트 ${S.draft.picks.length+1}순위`});if(t.isUser){p.userLink=true;p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs)),role:'드래프트 신인'};p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([S.season,calcValue(p)]);}
  if(p.drafted){const pk=S.draft&&S.draft.picks.find(x=>x.pid===p.id);if(pk){pk.pending=false;pk.dev=t.dev.includes(p.id);}delete p.drafted;}else S.draft.picks.push({team:t.id,pid:p.id,no:S.draft.picks.length+1,round:Math.floor(S.draft.picks.length/krTeams().length)+1,dev:t.dev.includes(p.id)});return true;}
function draftContract(pid,accept){const p=P_(pid);const ut=userTeam();if(!p||!p.drafted||p.drafted.team!==ut.id)return {ok:false,msg:'계약 대기 중인 지명 선수가 아닙니다.'};const d=p.drafted;
  if(!accept){const pk=S.draft&&S.draft.picks.find(x=>x.pid===pid);if(pk){pk.pending=false;pk.gaveUp=true;}delete p.drafted;news(`${p.name}(${d.no}순위)와 계약하지 않았습니다 — 대학 진학`,'contract');p.teamId=null;p.college=true;return {ok:true,msg:`${p.name} 계약 포기`};}
  if(ut.cash<d.ask)return {ok:false,msg:`계약금 ${money(d.ask)}을 낼 현금이 부족합니다.`};const tr=p.transfers.length;if(!draftSignNow(ut,p,d.dest))return {ok:false,msg:'1군·육성군 모두 가득 찼습니다. 선수를 정리한 뒤 계약하세요.'};ut.cash-=d.ask;ut.fin.buys+=d.ask;
  if(d.round===1)achGet('r1');const last=p.transfers[p.transfers.length-1];if(last)last.kind=`드래프트 ${d.round}라운드 ${d.no}순위 (계약금 ${money(d.ask)})`;news(`${p.name} 입단 계약 — 계약금 ${money(d.ask)}, ${ut.dev.includes(pid)?'육성군':'1군'}`,'contract');return {ok:true,msg:`${p.name} 선수와 계약했습니다 (계약금 ${money(d.ask)}).`};}
function draftPending(){const ut=userTeam();return S.draft?S.draft.pool.map(P_).filter(p=>p&&p.drafted&&p.drafted.team===ut.id):[];}
function draftCleanup(){if(!S.draft)return;for(const p of draftPending())draftContract(p.id,false);for(const id of S.draft.pool){const p=P_(id);if(p&&p.teamId==null&&!S.fa.includes(id))delete S.players[id];}}
function draftStep(){
  const D=S.draft;if(!D||D.done)return 'done';
  while(D.idx<D.order.length){const t=S.teams[D.order[D.idx]];if(t.isUser)return 'user';
    const avail=draftAvail();if(!avail.length)break;const need=needOf(t);const rnd0=Math.floor(D.idx/(D.n||krTeams().length))+1;if(rnd0>2&&!draftRoom(t)){D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true,round:rnd0});D.idx++;continue;}
    avail.sort((a,b)=>(b.scout.est*0.7+calcOvr(b)*0.3+(need.includes(b.pos)?3:0)+rnd()*4)-(a.scout.est*0.7+calcOvr(a)*0.3+(need.includes(a.pos)?3:0)+rnd()*4));
    if(!draftSign(t,avail[0],'auto'))D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true});D.idx++;}
  D.done=true;for(const id of D.pool){const p=P_(id);if(p&&p.teamId==null&&!p.drafted&&!S.fa.includes(id))delete S.players[id];}
  const mine=D.picks.filter(x=>x.team===S.userTeamId&&x.pid);news(`드래프트 종료. 우리 구단 지명: ${mine.map(x=>P_(x.pid).name).join(', ')||'없음'}`,'sys');return 'done';}
function draftPick(pid,dest){const D=S.draft;if(!D||D.done)return {ok:false,msg:'진행 중인 드래프트가 없습니다.'};const t=S.teams[D.order[D.idx]];if(!t||!t.isUser)return {ok:false,msg:'우리 구단 차례가 아닙니다.'};
  if(pid==null){D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true});D.idx++;draftStep();return {ok:true,msg:'지명을 포기했습니다.'};}
  const p=P_(pid);if(!p||p.teamId!=null||!D.pool.includes(pid))return {ok:false,msg:'지명할 수 없는 선수입니다.'};
  if(!draftSign(t,p,dest))return {ok:false,msg:'1군·육성군 모두 가득 찼습니다. 선수를 정리하거나 지명을 포기하세요.'};
  const no=D.picks.length;D.idx++;news(`${no}순위 ${p.name}(${p.school}) 지명 — 계약금 요구 ${money(p.drafted.ask)}`,'contract');draftStep();return {ok:true,no,pid,dev:false,pending:true,ask:p.drafted.ask,msg:`${p.name} 선수를 ${no}순위로 지명했습니다. 계약금 ${money(p.drafted.ask)}에 계약하면 입단합니다 (개막 전까지).`};}
function draftAutoOne(){const D=S.draft;if(!D||D.done||!draftTurn())return null;const t=userTeam();const avail=draftAvail();if(!avail.length){draftPick(null);return null;}const need=needOf(t);avail.sort((a,b)=>(b.scout.est*0.7+calcOvr(b)*0.3+(need.includes(b.pos)?3:0))-(a.scout.est*0.7+calcOvr(a)*0.3+(need.includes(a.pos)?3:0)));return draftPick(avail[0].id,'auto');}
function draftMyLeft(){const D=S.draft;if(!D||D.done)return 0;return D.order.slice(D.idx).filter(id=>id===S.userTeamId).length;}
function draftAuto(){const D=S.draft;if(!D||D.done)return;const t=userTeam();const avail=draftAvail();if(avail.length&&D.order[D.idx]===t.id&&(Math.floor(D.idx/krTeams().length)<2||draftRoom(t))){const need=needOf(t);avail.sort((a,b)=>(b.scout.est*0.7+calcOvr(b)*0.3+(need.includes(b.pos)?3:0))-(a.scout.est*0.7+calcOvr(a)*0.3+(need.includes(a.pos)?3:0)));draftPick(avail[0].id,'auto');}else draftPick(null);if(!D.done&&D.order[D.idx]===t.id)draftAuto();}
function draftTurn(){const D=S.draft;return D&&!D.done&&S.teams[D.order[D.idx]]&&S.teams[D.order[D.idx]].isUser;}

function alumniReport(s){const rows=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&p.teamId!==S.userTeamId&&p.hist.length&&p.hist[p.hist.length-1].s===s);
  rows.sort((a,b)=>calcValue(b)-calcValue(a));for(const p of rows.slice(0,5)){const t=S.teams[p.teamId];const st=p.hist[p.hist.length-1].st;const starter=t.lineup.includes(p.id)||t.rotation.includes(p.id);
    const line=isPitcher(p)?(st.pOuts?`${st.pW}승 ${st.pL}패 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:''):(st.ab?`타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'');
    news(`[출신] ${p.name} (${t.name}) ${line}${starter?` — 주전 ${POS_KO[t.pos[p.id]||p.pos]||''}`.trimEnd():''}`,'alumni');}
  for(const p of rows)if(p.interest==null&&calcOvr(p)>=66&&p.age<=29){const t=S.teams[p.teamId];if(t.league==='KR')news(`[출신] ${josa(p.name,'이','가')} 해외 구단의 관심을 받고 있다는 소문입니다.`,'alumni');}}
// ---------- 리그 내 위상 ----------
function leagueKey(t){return t.league==='KR'?'KR1':t.league;}
function leagueTeams(key){return Object.values(S.teams).filter(t=>leagueKey(t)===key);}
function roleVal(p,pos){return isPitcher(p)?calcOvr(p):posOvr(p,pos||p.pos);}
const _lgCache={};
function leagueBase(key){const c=_lgCache[key];if(c&&c.clock===S.clock&&c.n===Object.keys(S.players).length)return c;const ts=leagueTeams(key);const bat={},pit={SP:[],RP:[]},all=[];
  for(const t of ts){for(const id of t.lineup){const x=P_(id);const pos=t.pos[id];if(!x||!pos)continue;const v=pos==='DH'?offVal(x)+5:posOvr(x,pos);(bat[pos]=bat[pos]||[]).push(v);all.push(v);}
    for(const id of t.rotation){const x=P_(id);if(x){pit.SP.push(calcOvr(x));all.push(calcOvr(x));}}for(const id of t.bullpen.slice(0,4)){const x=P_(id);if(x){pit.RP.push(calcOvr(x));all.push(calcOvr(x));}}}
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;const o={clock:S.clock,n:Object.keys(S.players).length,all:avg(all),pos:{}};
  for(const k in bat)o.pos[k]={avg:avg(bat[k]),n:bat[k].length};o.pos.SP={avg:avg(pit.SP),n:pit.SP.length};o.pos.RP={avg:avg(pit.RP),n:pit.RP.length};_lgCache[key]=o;return o;}
function leagueStanding(p,key){const b=leagueBase(key);if(b.all==null)return {label:'-',cls:''};const ps=b.pos[isPitcher(p)?p.pos:p.pos]||{avg:null,n:0};const K=8;
  const avg=ps.avg==null?b.all:(ps.avg*ps.n+b.all*K)/(ps.n+K);const v=roleVal(p);
  return v>=avg+6?{label:'리그 정상급',cls:'g',avg}:v>=avg-2?{label:'리그 주전급',cls:'g',avg}:v>=avg-8?{label:'리그 백업급',cls:'',avg}:{label:'리그 수준 미달',cls:'r',avg};}
function expectedRole(p,t){if(BAL.FARM[t.league]&&t.id!==p.teamId){const tmp=t.roster.concat(p.id);const same=tmp.map(P_).filter(x=>x&&isPitcher(x)===isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));const rank=same.findIndex(x=>x.id===p.id);if(rank>=13){const F=BAL.FARM[t.league];const tr=F.length===1?F[0].t:(calcOvr(p)>=F[0].lvl-3?F[0].t:F[1].t);return farmKo(t.league,tr)+' 시작';}}
  const mine=roleVal(p);const slots=isPitcher(p)?(p.pos==='SP'?5:4):1;
  const others=t.roster.map(P_).filter(x=>x&&x.id!==p.id&&!x.retired&&(isPitcher(p)?(p.pos==='SP'?x.pos==='SP':isPitcher(x)):x.pos===p.pos)).map(x=>roleVal(x,p.pos)).sort((a,b)=>b-a);
  const k=others.filter(v=>v>mine).length;
  if(k<slots){const c=others[slots-1];return c==null||mine>=c+3?'주전':'주전 경쟁';}
  const gap=others[slots-1]-mine;if(gap<=3)return '주전 경쟁';if(k<slots*2+1)return '백업';return '벤치';}
function standingAll(p){return ['KR1','JP','US','TW','MX','AU','CB'].map(k=>({key:k,name:k==='KR1'?'한국 프로야구':BAL.LEAGUES[k].name,lvl:BAL.LEVEL_OVR[k],...leagueStanding(p,k)}));}

// ---------- 겨울리그 파견 (비시즌 전용, 동계훈련 대체) ----------
function winterTeams(){return overseasTeams().filter(t=>BAL.LEAGUES[t.league].winter);}
function dispatchEligible(p){const ut=userTeam();if(!p||p.retired)return false;if(!ut.roster.includes(p.id)&&!ut.dev.includes(p.id))return false;
  return p.age<=BAL.DISPATCH.maxAge&&!S.pendingFA.includes(p.id)&&!(p.contract&&p.contract.years<=0)&&!S.market.listed.includes(p.id);}
function dispatchFee(t){return BAL.DISPATCH.fee[t.league]||400;}
function dispatchOptions(p){return winterTeams().map(t=>{const role=expectedRole(p,t);const share=BAL.DISPATCH.share[role];const lvlF=clamp(1+(BAL.LEVEL_OVR[t.league]-calcOvr(p))*0.02,0.8,1.25);const exp=0.3+0.8*share*lvlF;
  const mine=roleVal(p);const others=t.roster.map(P_).filter(x=>x&&x.id!==p.id&&!x.retired&&(isPitcher(p)?(p.pos==='SP'?x.pos==='SP':isPitcher(x)):x.pos===p.pos)).map(x=>roleVal(x,p.pos));const k=others.filter(v=>v>mine).length;const slots=isPitcher(p)?(p.pos==='SP'?5:4):1;
  const what=isPitcher(p)?(p.pos==='SP'?'선발 자원':'불펜 투수'):(POS_KO[p.pos]||p.pos);const why=`${what} ${others.length+1}명 중 ${k+1}번째 실력 (자리 ${slots}개)`;
  const back={fat:Math.round(30+share*35),cond:r1(2+share*3)};
  return {team:t,role,share,why,back,fee:dispatchFee(t),growth:exp>=0.82?'국내보다 높음':exp>=0.6?'국내와 비슷':'국내보다 낮음',gcls:exp>=0.82?'g':exp>=0.6?'':'r',need:needOf(t).includes(p.pos)};}).sort((a,b)=>b.share-a.share||a.fee-b.fee);}
function createDispatch(){createDispatchFor(userTeam());}
function createDispatchFor(ut){S.dispatch={s:S.season,phase:'open',reqs:[],list:[],declined:[]};
  const cands=ut.roster.concat(ut.dev).map(P_).filter(p=>dispatchEligible(p)&&(p.scout.est-calcOvr(p))>=4).sort((a,b)=>(b.scout.est-calcOvr(b))-(a.scout.est-calcOvr(a))).slice(0,3);
  for(const p of cands){const opts=dispatchOptions(p).filter(o=>o.role==='주전'||o.role==='주전 경쟁');const o=opts.find(x=>x.need)||opts[0];if(o)S.dispatch.reqs.push({pid:p.id,team:o.team.id});}
  if(S.dispatch.reqs.length)news(`겨울리그에서 파견 요청 ${S.dispatch.reqs.length}건이 왔습니다. 2주차까지 결정하세요.`,'sys');}
function dispatchPlayer(pid,teamId){const D=S.dispatch;const ut=userTeam();const p=P_(pid);const t=S.teams[teamId];
  if(!D||D.phase!=='open')return '파견 결정 기간(스토브리그 1~2주차)이 아닙니다.';if(!t||!BAL.LEAGUES[t.league]||!BAL.LEAGUES[t.league].winter)return '겨울리그 구단이 아닙니다.';
  if(!dispatchEligible(p))return `${BAL.DISPATCH.maxAge}세 이하이고 계약이 남은 우리 선수만 파견할 수 있습니다.`;if(p.dispatch)return '이미 파견이 정해진 선수입니다.';
  if(D.list.length>=BAL.DISPATCH.max)return `한 시즌에 최대 ${BAL.DISPATCH.max}명까지 파견할 수 있습니다.`;const fee=dispatchFee(t);if(ut.cash<fee)return `파견비가 부족합니다 (${money(fee)}).`;
  const role=expectedRole(p,t);ut.cash-=fee;ut.fin.dispatch=(ut.fin.dispatch||0)+fee;p.dispatch={s:D.s,team:t.id,role,fee,lg:t.league};D.list.push({pid,team:t.id,role,fee});D.reqs=D.reqs.filter(r=>r.pid!==pid);
  news(`${josa(p.name,'을','를')} ${t.name}(${BAL.LEAGUES[t.league].name})에 파견합니다. 예상 역할: ${role}`,'contract');return null;}
function cancelDispatch(pid){const D=S.dispatch;const p=P_(pid);if(!D||D.phase!=='open'||!p||!p.dispatch)return '취소할 수 없습니다.';const ut=userTeam();ut.cash+=p.dispatch.fee;ut.fin.dispatch=(ut.fin.dispatch||0)-p.dispatch.fee;D.list=D.list.filter(x=>x.pid!==pid);p.dispatch=null;return null;}
function declineDispatch(pid){const D=S.dispatch;if(!D)return;D.reqs=D.reqs.filter(r=>r.pid!==pid);if(!D.declined.includes(pid))D.declined.push(pid);}
function dispatchWeek(){const D=S.dispatch;if(!D)return;
  if(D.phase==='open'&&S.week>=2){D.phase='running';D.reqs=[];if(D.list.length)news(`겨울리그 개막 — 우리 선수 ${D.list.length}명 출전`,'sys');}
  else if(D.phase==='running'&&S.week>=4)resolveDispatch();}
function resolveDispatch(){const D=S.dispatch;if(!D||D.phase==='done')return;
  overseasSeasonSummary(true);
  for(const x of D.list){const p=P_(x.pid);if(!p||!p.dispatch)continue;const t=S.teams[x.team];const base=BAL.DISPATCH.share[p.dispatch.role];const share=clamp(base*(0.8+rnd()*0.4),0.05,1);
    const st=summaryStat(p,t.league,share);p.winter=p.winter||[];p.winter.push({s:D.s,tn:t.name,lg:t.league,role:p.dispatch.role,share:r1(share),st});if(p.winter.length>8)p.winter.shift();
    p.dispatchDone={s:D.s,lg:t.league,role:p.dispatch.role,share};p.morale=clamp(p.morale+(share>=0.6?5:share<0.3?-6:0),0,100);
    const good=isPitcher(p)?(st.pOuts>=30&&st.pER*27/st.pOuts<3.6):(st.pa>=40&&ops_(st)>0.78);
    const line=isPitcher(p)?`${st.pW}승 ${st.pL}패 ERA ${st.pOuts?(st.pER*27/st.pOuts).toFixed(2):'-'}`:`타율 ${st.ab?(st.h/st.ab).toFixed(3).replace(/^0/,''):'-'} ${st.hr}홈런`;
    news(`${p.name} ${BAL.LEAGUES[t.league].name} 파견 종료 (${t.name}, ${p.dispatch.role}): ${line}${good?' — 현지 호평!':''}`,'contract');
    if(good&&share>=0.5){p.exposure=D.s;improveScout(p,0.05);if(!p.interest&&calcOvr(p)>=54){const lg=calcOvr(p)>=62?'JP':pick(['TW','MX']);const ot=pick(overseasTeams().filter(o=>o.league===lg));p.interest={team:ot.id,lg,stage:1};news(`${ot.name} 스카우트가 겨울리그에서 ${josa(p.name,'을','를')} 눈여겨봤습니다.`,'overseas');}}
    p.dispatch=null;}
  D.phase='done';}

// ---------- 감독 실적 (2단계 평판용) ----------
function mgrStart(){S.mgr=S.mgr||{seasons:[],cur:null};const ut=userTeam();const c=compOf(ut);const ts=compTeams(c).map(t=>({t,pw:teamPower(t).power})).sort((a,b)=>b.pw-a.pw);const er=ts.findIndex(x=>x.t.id===ut.id)+1;
  S.mgr.cur={s:S.season,div:c,expRank:er,powerStart:ts.find(x=>x.t.id===ut.id).pw,sales:[],goal:goalFor(ut,er,ts.length)};ensureCareer();}
function mgrEnd(s,rec){if(!S.mgr)S.mgr={seasons:[],cur:null};const ut=userTeam();const c=S.mgr.cur&&S.mgr.cur.s===s?S.mgr.cur:{s,div:rec.user.div,expRank:null,powerStart:null,sales:[]};
  let dev=0;for(const id of ut.roster){const p=P_(id);if(!p||p.devCredited||p.devStart==null)continue;const starter=ut.lineup.includes(id)||ut.rotation.includes(id)||ut.closer===id;if(dev<3&&starter&&calcOvr(p)-p.devStart>=8&&calcOvr(p)>=levelOf(ut)-2){p.devCredited=s;dev++;p.ms=Object.assign(p.ms||{},{st:{s}});news(`[육성 성과] ${josa(p.name,'이','가')} 우리 구단에서 주전으로 성장했습니다 (${Math.round(p.devStart)} → ${Math.round(calcOvr(p))}).`,'sys');}}
  const abroad=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR'&&!BAL.LEAGUES[S.teams[p.teamId].league].winter&&(S.teams[p.teamId].lineup.includes(p.id)||S.teams[p.teamId].rotation.includes(p.id))).length;
  const salesFee=c.sales.reduce((a,x)=>a+x.fee,0),salesProfit=c.sales.reduce((a,x)=>a+x.fee-x.cost,0);
  const goal=c.goal||null;S.mgr.seasons.push({s,team:ut.id,tn:ut.name,goal:goal?goal.text:null,goalMet:goal?goalCheck(goal,ut,rec.user.rank).met:null,goalParts:goal?goalCheck(goal,ut,rec.user.rank).parts:null,goalKind:goal?goal.kind||'rank':null,young:youngGrown(ut),div:c.div,expRank:c.expRank,rank:rec.user.rank,ps:S.lastSummary?S.lastSummary.ps||null:null,pst:S.lastSummary&&S.lastSummary.ps&&ut.league!=='KR'?S.lastSummary.post:null,powerStart:c.powerStart,powerEnd:teamPower(ut).power,sales:c.sales.length,starterSales:c.sales.filter(x=>x.st).length,salesFee,salesProfit,devHits:dev,abroad});
  for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(p)p.coached=true;}
  if(S.mgr.seasons.length>40)S.mgr.seasons.shift();S.mgr.cur=null;S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];S.mgr.repHist.push([s,S.mgr.rep]);if(S.mgr.repHist.length>40)S.mgr.repHist.shift();}

// ---------- 감독 평판 · 이직 (2단계) ----------
// 구단 유형별 목표: 부임 후 첫 2시즌은 유형이 고른 운영 방식으로 평가 (유망주=육성, 재정난=흑자, 인기=높은 순위)
function archSeasons(t){return ((S.mgr&&S.mgr.seasons)||[]).filter(m=>m.team===t.id).length;}
function goalFor(t,r,n){const g=goalFor0(t,r,n);if(!t.isUser||!t.arch||t.league!=='KR')return g;const early=archSeasons(t)<2;
  if(t.arch==='popular'&&g.target>2){const tg=Math.max(2,g.target-2);return {text:`${tg}위 이내 (팬들의 기대)`,target:tg,kind:'rank'};}
  if(t.arch==='youth'&&early){const tg=Math.max(g.target,t.league==='KR'?8:6);return {text:`육성 — 23세 이하 3명 종합 +5 이상 (${tg}위 이내)`,target:tg,kind:'youth',young:3};}
  if(t.arch==='poor'&&early){const tg=Math.max(g.target,t.league==='KR'?8:5);return {text:`재정 — 시즌 말 현금 흑자 (${tg}위 이내)`,target:tg,kind:'cash'};}
  return g;}
// 목표 진행 상황 (홈·감독 탭 표시용)
function youngGrown(t){return t.roster.concat(t.dev).map(P_).filter(p=>{if(!p||p.age>23+(S.phase==='offseason'?1:0))return false;const B=growthBase(p);return B&&B.ovr!=null&&calcOvr(p)-B.ovr>=5;}).length;}
function goalCheck(goal,t,rank){if(!goal)return null;const pre=S.phase==='season'&&t.rec.w+t.rec.l===0;const parts=[pre?{ok:null,text:`개막 전 (목표 ${goal.target}위 이내)`}:{ok:rank<=goal.target,text:`${rank}위 (목표 ${goal.target}위 이내)`}];
  if(goal.kind==='youth'){const n=youngGrown(t);parts.push({ok:n>=goal.young,text:`육성 ${n}/${goal.young}명`});}
  if(goal.kind==='cash')parts.push({ok:t.cash>=0,text:`현금 ${money(t.cash)}`});
  return {met:parts.every(x=>x.ok===true),parts};}
function goalProgress(){const ut=userTeam();const g=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;if(!g)return null;return goalCheck(g,ut,S.phase==='season'?rankOf(ut):(S.lastSummary?S.lastSummary.rank:rankOf(ut)));}
function goalFor0(t,r,n){if(t.league==='KR'){if(r<=1)return {text:'정규 시즌 1위',target:1};if(r<=3)return {text:'상위 3위 이내',target:3};if(r<=7)return {text:'가을야구 (5위 이내)',target:5};return {text:`탈꼴찌·재건 (${n-2}위 이내)`,target:n-2};}
  if(t.league==='JP'){if(r<=1)return {text:'리그 1위',target:1};if(r<=4)return {text:'클라이맥스 시리즈 (3위 이내)',target:3};return {text:'4위 이내 (재건)',target:4};}
  if(t.league==='US'){if(r<=1)return {text:'지구 우승',target:1};if(r<=3)return {text:'지구 2위 이내',target:2};return {text:'지구 3위 이내 (재건)',target:3};}
  if(t.league==='TW'){if(r<=1)return {text:'정규 시즌 1위',target:1};if(r<=3)return {text:'상위 3위 이내',target:3};return {text:'4위 이내 (재건)',target:4};}
  if(r<=1)return {text:'우승',target:1};if(r<=Math.ceil(n/3))return {text:'상위 2위 이내',target:2};return {text:`${Math.ceil(n/2)}위 이내 (재건)`,target:Math.ceil(n/2)};}
function ensureCareer(){S.mgr.career=S.mgr.career||[];const ut=userTeam();const last=S.mgr.career[S.mgr.career.length-1];if(!last||last.team!==ut.id)S.mgr.career.push({team:ut.id,name:ut.name,comp:compOf(ut),from:S.season,to:null});}
const REP_TIER={1:1.25,TW:1.0,JP:1.3,MX:1.0,US:1.5};
const PS_REP={champ:10,ks:5,po:3,semi:3,wc:2};   // 포스트시즌 도달 단계별 감독 평판
function repScore(m){let sc=0;if(m.expRank!=null)sc+=(m.expRank-m.rank)*3;else sc+=(m.rank<=2?3:m.rank>=8?-2:0);if(m.rank===1)sc+=6;sc+=PS_REP[m.ps]||0;
  if(m.goalMet===true)sc+=4;else if(m.goalMet===false)sc-=3;sc+=(m.devHits||0)*4+(m.abroad||0)*2;
  sc+=opsScore(m);
  return sc*(REP_TIER[lgOf(m.div)]||1)*0.5;}
// 운영 점수: 전력 변화 + 흑자 판매 보너스 − 시즌 중 주전 대량 매각(3명째부터) 감점
function opsScore(m){let o=0;if(m.powerStart!=null&&m.powerEnd!=null){const d=m.powerEnd-m.powerStart;o=clamp(d*1.5,-10,6);if(d>=-1.5&&m.salesProfit>0)o+=Math.min(4,m.salesProfit/50000);}o-=Math.max(0,(m.starterSales||0)-2)*2.5;return o;}
function calcRep(){const ms=(S.mgr&&S.mgr.seasons)||[];let sum=0;ms.forEach((m,i)=>{sum+=repScore(m)*Math.pow(0.85,ms.length-1-i);});return Math.round(clamp(25+sum+(S.mgr.loyalty||0),0,100));}
function repGrade(r){return r>=75?'전설적 명장':r>=62?'명장':r>=50?'유능한 감독':r>=35?'주목받는 신예':'무명';}
function repParts(){const ms=(S.mgr&&S.mgr.seasons)||[];const P={perf:0,dev:0,ops:0,abroad:0};ms.forEach((m,i)=>{const w=Math.pow(0.85,ms.length-1-i)*(REP_TIER[lgOf(m.div)]||1)*0.5;
  let pf=0;if(m.expRank!=null)pf+=(m.expRank-m.rank)*3;else pf+=(m.rank<=2?3:m.rank>=8?-2:0);if(m.rank===1)pf+=6;pf+=PS_REP[m.ps]||0;if(m.goalMet===true)pf+=4;else if(m.goalMet===false)pf-=3;
  P.perf+=pf*w;P.dev+=(m.devHits||0)*4*w;P.abroad+=(m.abroad||0)*2*w;P.ops+=opsScore(m)*w;});
  for(const k in P)P[k]=r1(P[k]);P.loyalty=S.mgr.loyalty||0;return P;}
function teamOutlook(t){const c=compOf(t);const ts=compTeams(c).map(x=>({x,pw:teamPower(x).power})).sort((a,b)=>b.pw-a.pw);const r=ts.findIndex(y=>y.x.id===t.id)+1;return {rank:r,n:ts.length,power:ts[r-1].pw,goal:goalFor(t,r,ts.length)};}
function genJobOffers(){S.jobOffers=[];const ut=userTeam();const rep=S.mgr.rep!=null?S.mgr.rep:calcRep();ensureCareer();const cand=[];const devTot=S.mgr.seasons.reduce((a,m)=>a+(m.devHits||0),0);
  const tenure=S.season-(S.mgr.career[S.mgr.career.length-1].from)+1;if(tenure<1)return;
  const former=new Set(S.mgr.career.map(c=>c.team));const lm=S.mgr.seasons[S.mgr.seasons.length-1];const nMy=compTeams(compOf(ut)).length;
  const lastGood=!lm||!!lm.ps||lm.rank<=Math.ceil(nMy/2)||(lm.expRank!=null&&lm.expRank-lm.rank>=1)||lm.goalMet===true;
  const facSum=t=>t.fac.train+t.fac.youth+t.fac.scout;const ok=(need)=>lastGood?rep>=need:rep>=need+12;
  for(const t of krTeams()){if(t.id===ut.id||former.has(t.id))continue;const need=BAL.REP_NEED[1]+(presOf(t)>=80?10:presOf(t)>=60?4:0);const unhappy=(t.lastRank||6)>=6;
    const sameTier=ut.league==='KR';if(sameTier&&!(lastGood&&(t.cash>ut.cash*1.2||facSum(t)>facSum(ut))))continue;
    if(ok(need)&&unhappy)cand.push({t,kind:'job',w:rep-need+(presOf(t)>presOf(ut)+15?8:0)});}
  for(const t of overseasTeams().filter(x=>BAL.JOB_LEAGUES.includes(x.league)&&!x.isUser&&!former.has(x.id))){const need=BAL.REP_NEED[t.league];const n=compTeams(compOf(t)).length;
    if((ok(need)||(t.league==='TW'&&devTot>=3&&rep>=40&&lastGood))&&(t.lastRank||n)>=Math.ceil(n/2))cand.push({t,kind:'job',w:rep-need+6});}
  for(const c of S.mgr.career){if(c.team===ut.id)continue;const t=S.teams[c.team];if(!t)continue;const n=compTeams(compOf(t)).length;const struggling=(t.lastRank||0)>=n-1;
    if(struggling&&rep>=30&&!cand.some(x=>x.t.id===t.id))cand.push({t,kind:'return',w:40});}
  const seen=new Set();cand.sort((a,b)=>(b.kind==='return')-(a.kind==='return')||(b.w+rnd()*8)-(a.w+rnd()*8));
  for(const c of cand){if(S.jobOffers.length>=3)break;if(seen.has(c.t.id))continue;const pr=c.kind==='return'?1:clamp(0.2+c.w/40,0.15,0.85);if(rnd()>pr)continue;seen.add(c.t.id);
    const o=teamOutlook(c.t);S.jobOffers.push({id:S.nextOfferId++,team:c.t.id,kind:c.kind,goal:o.goal,rankExp:o.rank,n:o.n,expires:2,reason:jobReason(c.t,c.kind)});}
  if(S.jobOffers.length)news(`감독 제의 ${S.jobOffers.length}건이 도착했습니다 (평판 ${rep} · ${repGrade(rep)}). 스토브리그 2주차까지 결정하세요.`,'sys');}
// 감독 제의 이유: 내 강점(평판 구성) × 그 구단의 사정
function jobReason(t,kind){if(kind==='return')return '친정 구단이 어려움에 빠져 당신의 복귀를 요청합니다';const P=repParts();const top=Object.entries({dev:P.dev,perf:P.perf,ops:P.ops,abroad:P.abroad}).sort((a,b)=>b[1]-a[1])[0][0];
  const ps=t.roster.map(P_).filter(Boolean);const age=ps.reduce((a,p)=>a+p.age,0)/Math.max(1,ps.length);const n=compTeams(compOf(t)).length;
  const sit=age>=28.5?'세대교체 중인':(t.lastRank||0)>=n-1?'재건이 필요한':t.cash>payroll(t)*3?'투자 여력이 있는':'도약을 노리는';
  const me={dev:'유망주를 주전으로 키워 낸 당신을',perf:'성적을 내는 당신을',ops:'적자 없이 팀을 강하게 만든 당신을',abroad:'선수를 해외로 보낸 안목을 가진 당신을'}[top];
  return `${me} ${sit} ${t.name}${t.league!=='KR'?'('+BAL.LEAGUES[t.league].short+')':''}${josa(t.name,'이','가').slice(-1)} 원합니다`;}
function declineJob(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return;S.jobOffers=S.jobOffers.filter(x=>x!==o);const t=S.teams[o.team];
  S.mgr.loyalty=Math.min(5,(S.mgr.loyalty||0)+1);const ut=userTeam();ut.rep=clamp(ut.rep+1,5,100);news(`${t.name}의 제의를 거절하고 ${ut.name}에 남기로 했습니다. 팬들이 환영합니다.`,'sys');}
function moveManager(id){const o=(S.jobOffers||[]).find(x=>x.id===id);if(!o)return '유효한 제의가 아닙니다.';if(S.phase!=='offseason')return '이직은 스토브리그 중에만 할 수 있습니다.';
  const old=userTeam();const nt=S.teams[o.team];if(!nt||nt.isUser)return '대상 구단을 찾을 수 없습니다.';
  if(S.dispatch&&S.dispatch.phase==='open')for(const x of [...S.dispatch.list])cancelDispatch(x.pid);
  for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==old.id)continue;if(rnd()<0.6&&p.age<35)p.contract={salary:Math.round(salaryFor(p)*(0.95+rnd()*0.2)/10)*10,years:ri(1,3)};else{removeFromTeam(old,p);S.fa.push(pid);p.transfers.push({s:S.season,from:old.name,to:'FA',fee:0,kind:'계약 만료'});}}
  S.pendingFA=[];S.market.listed=[];S.market.offers=[];S.market.negs=[];S.market.scoutResults=null;
  for(const pid of old.roster.concat(old.dev)){const p=P_(pid);if(!p)continue;p.coached=true;p.exUser=true;p.promise=null;}
  old.isUser=false;old.locks={};old.lineupMode='win';autoLineup(old);for(const c of old.staff||[])if(c.years<=0){c.years=1;c.expiring=false;}if(!nt.staff)nt.staff=starterStaff(nt);
  const last=S.mgr.career[S.mgr.career.length-1];if(last&&last.team===old.id)last.to=S.season;
  nt.isUser=true;S.userTeamId=nt.id;nt.locks={};nt.dev=nt.dev||[];nt.loan=nt.loan||0;nt.fin=Object.assign(newFin(),nt.fin||{});
  if(nt.league!=='KR'){const e=econ(nt);nt.cash=Math.min(nt.cash,e.sponsor*1.5);}
  const reun=[];for(const pid of nt.roster.concat(nt.dev)){const p=P_(pid);if(!p)continue;if(p.coached)reun.push(p.name);p.userLink=true;p.exUser=false;p.base=JSON.parse(JSON.stringify(p.attrs));p.snap=snapOf(p);p.valHist=p.valHist||[];p.valHist.push([S.season,calcValue(p)]);if(p.age<=23&&p.devStart==null)p.devStart=r1(calcOvr(p));if(p.scout.conf<0.45)p.scout=makeScout(p,0.45);}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];const yn=2+nt.fac.youth;for(let i=0;i<yn;i++){const need=needOf(nt);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+nt.fac.youth*1.2,potBoost:nt.fac.youth*2.5,conf:0.4,nat:nt.league==='KR'?'KR':nt.league});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  autoLineup(nt);S.mgr.career.push({team:nt.id,name:nt.name,comp:compOf(nt),from:S.season+1,to:null});S.jobOffers=[];
  if(S.dispatch&&S.dispatch.phase==='open'){S.dispatch.list=[];createDispatchFor(nt);}
  news(`${josa(old.name,'을','를')} 떠나 ${nt.name}(${compName(compOf(nt))}) 감독으로 취임했습니다.`,'sys');if(reun.length)news(`옛 제자와 재회: ${reun.join(', ')}`,'alumni');
  return null;}
function formerClubReport(s,rec){if(!S.mgr||!S.mgr.career)return;const ut=userTeam();const seen=new Set();for(const c of S.mgr.career){if(c.team===ut.id||seen.has(c.team))continue;seen.add(c.team);const t=S.teams[c.team];if(!t)continue;
  const k=rec.post?postReach(rec.post)[t.id]:null;
  news(`[친정] ${t.name}: ${s}시즌 ${compName(compOf(t))} ${t.lastRank||'-'}위${k?' — '+POST_TEXT[k]:''}`,'alumni');}}
// ---------- 시즌 종료 / 스토브리그 / 새 시즌 ----------
function endSeason(){
  const s=S.season;const ut=userTeam();const rec={s,tables:{},user:null};
  const preKey={};for(const t of krTeams())preKey[t.id]='KR1';S.lgCtx=S.lgCtx||{};{const all=lgCtxAll(true),keep={};const pl0=playLg();for(const k in all)if(k.startsWith('KR')||k===pl0){const {n,...rest}=all[k];keep[k]=rest;}S.lgCtx[s]=keep;}for(const k in S.lgCtx)if(+k<s-10)delete S.lgCtx[k];
  // 정규 시즌 순위(포스트시즌 경기는 넣지 않음)대로 배당금·명성. 승강제 없음
  const tables={1:standings(1)};const NK=tables[1].length;
  tables[1].forEach((t,i)=>{t.lastRank=i+1;const dv=BAL.DIVIDEND[1][i]||BAL.DIVIDEND[1][BAL.DIVIDEND[1].length-1];t.cash+=dv;t.fin.dividend+=dv;t.rep=clamp(t.rep+(i<3?3:i>=NK-3?-3:0),5,100);if(!t.isUser){const cap=Math.max(BAL.AI_CASH_CAP[1],payroll(t)*1.5);if(t.cash>cap)t.cash=Math.round(cap+(t.cash-cap)*0.3);}});
  rec.tables[1]=tables[1].map((t,i)=>({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1}));
  const pl=playLg();let plRows=null;if(pl){plRows=[];for(const c of leagueComps(pl)){const st=standings(c);st.forEach((t,i)=>{t.lastRank=i+1;plRows.push({id:t.id,name:t.name,w:t.rec.w,l:t.rec.l,rank:i+1,sub:t.sub});});}
    const n=compTeams(compOf(ut)).length;const dv=econ(ut).dividend[ut.lastRank-1]||0;ut.cash+=dv;ut.fin.dividend+=dv;ut.rep=clamp(ut.rep+(ut.lastRank<=2?2:ut.lastRank>=n-1?-2:0),5,100);rec.tables[pl]=plRows;}
  rec.user={div:compOf(ut),rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,cash:ut.cash,fin:{...ut.fin}};
  // 포스트시즌 결과: 단계별 배당금, 한국시리즈 우승은 챔피언(우승 기록·명성·위상)
  rec.post=postRecord();S.post=null;
  if(S.lpost&&S.lpost.s===s){const P=S.lpost;rec.lpost={lg:P.lg,rounds:P.rounds.map(R=>({name:R.name,ser:R.ser.map(c=>({k:c.k,name:c.name,hi:c.hi,lo:c.lo,w:c.w.slice(),winner:c.winner,loser:c.loser}))})),champ:P.champ,runner:P.runner};
    const ch=S.teams[P.champ];if(ch){ch.champ=(ch.champ||[]).concat(s);ch.rep=clamp(ch.rep+5,5,100);}const rr=S.teams[P.runner];if(rr)rr.rep=clamp(rr.rep+3,5,100);
    const reach=lpostReach(P,ut.id);rec.user_lpost=reach;
    {const f=LG_ECON[P.lg]||1;const K={};P.rounds.forEach((R,ri)=>R.ser.forEach(c=>{if(c.loser!=null)K[c.loser]=lpostKey(P,ri);}));if(P.champ!=null)K[P.champ]='champ';
      for(const id in K){const T=S.teams[id];if(!T)continue;const pz=Math.round((BAL.POST_PRIZE[K[id]==='ks'?'runner':K[id]]||0)*f);T.cash+=pz;T.fin.dividend+=pz;}}
    S.lpost=null;}
  if(rec.post){const R=postReach(rec.post);for(const id in R){const T=S.teams[id];if(!T)continue;const k=R[id];const pz=BAL.POST_PRIZE[k==='ks'?'runner':k]||0;T.cash+=pz;T.fin.dividend+=pz;T.rep=clamp(T.rep+(k==='champ'?5:k==='ks'?3:1),5,100);
      if(k==='champ'){T.champ=(T.champ||[]).concat(s);news(`${T.name}, ${s}시즌 한국시리즈 우승! (배당금 ${money(pz)})`,'league');}}}
  const presCh=presSeasonEnd(s,tables,rec);
  // 유저 시즌 결산
  const ups=ut.roster.map(P_);const bb=ups.filter(p=>!isPitcher(p)&&p.cur.pa>=40*gf()).sort((a,b)=>ops_(b.cur)-ops_(a.cur))[0];const bp=ups.filter(p=>isPitcher(p)&&p.cur.pOuts>=30*gf()).sort((a,b)=>(a.cur.pER/a.cur.pOuts)-(b.cur.pER/b.cur.pOuts))[0];
  S.lastSummary={s,div:rec.user.div,rank:ut.lastRank,w:ut.rec.w,l:ut.rec.l,bestBat:bb?`${bb.name} 타율 ${(bb.cur.h/Math.max(1,bb.cur.ab)).toFixed(3).replace(/^0/,'')} ${bb.cur.hr}홈런`:'-',bestPit:bp?`${bp.name} ${bp.cur.pW}승 ERA ${(bp.cur.pER*27/bp.cur.pOuts).toFixed(2)}`:'-',ps:rec.post?postReach(rec.post)[ut.id]||null:null,fin:{...ut.fin}};
  if(S.lastSummary)S.lastSummary.pres=presCh[ut.id]||null;
  if(S.lastSummary)S.lastSummary.post=S.lastSummary.ps?POST_TEXT[S.lastSummary.ps]:(ut.league==='KR'?'가을야구 진출 실패':null);
  if(S.lastSummary&&rec.lpost){const P=rec.lpost;const L=S.lastSummary;L.post=lpostText(P,ut.id);L.champ=P.champ===ut.id;let k=null;if(P.champ===ut.id)k='champ';else P.rounds.forEach((R,ri)=>R.ser.forEach(c=>{if(c.loser===ut.id)k=lpostKey(P,ri);}));L.ps=k;}
  if(S.lastSummary&&!rec.lpost&&ut.league==='KR')S.lastSummary.champ=S.lastSummary.ps==='champ';
  sponSettle(s,rec);
  seasonAwards(s,preKey);
  S.history.push(rec);
  // 부상은 겨울 재활로 모두 회복
  {let n=0;for(const pid in S.players){const p=S.players[pid];if(p.inj){if(p.teamId===S.userTeamId)n++;delete p.inj;}}if(n)news(`부상 선수 ${n}명이 겨울 재활로 회복했습니다.`,'injury');}
  // 선수 시즌 기록 보존
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;const t=p.teamId!=null?S.teams[p.teamId]:null;if(t&&t.league!=='KR'&&t.league!==pl)continue;
    if(p.cur.g>0||p.cur.pG>0||p.ps){const h={s,team:t?t.id:null,tn:t?t.name:'FA',lg:t?(preKey[t.id]||leagueKey(t)):'FA',st:p.cur,ovr:Math.round(calcOvr(p))};if(t)addCar(p,p.cur,t.name);if(p.ps){h.ps={};for(const k in p.ps)if(p.ps[k])h.ps[k]=p.ps[k];}p.hist.push(h);}delete p.ps;while(p.hist.length>histCap(p))p.hist.shift();p.cur=newStat();p.fatigue=0;
    if(p.userLink){p.valHist.push([s,calcValue(p)]);if(p.valHist.length>12)p.valHist.shift();}}
  overseasSeasonSummary(false,pl,plRows);
  asiaSeries(s,rec);
  alumniReport(s);
  formerClubReport(s,rec);
  mgrEnd(s,rec);
  S.lastRecap=buildRecap(s,rec);
  returnLoans(s);reserveSeasonEnd(s);
  // 나이/은퇴
  const retired=[];
  for(const pid in S.players){const p=S.players[pid];if(p.retired)continue;p.age++;
    const ovr=calcOvr(p);let pr=p.age>=38?1:p.age>=33?(p.age-32)*0.13+(ovr<48?0.3:0):0;if(p.teamId==null&&!p.scouted&&p.age>=30)pr+=0.3;
    if(rnd()<pr){const t=p.teamId!=null?S.teams[p.teamId]:null;if(t)removeFromTeam(t,p);S.fa=S.fa.filter(x=>x!==p.id);S.pendingFA=S.pendingFA.filter(x=>x!==p.id);p.retired=true;p.retiredSeason=s;
      if(p.userLink){retired.push(p.name);news(`${p.name} 은퇴 (${p.age}세)`,'contract');alumniRetire(p);hofRetire(p,s);}else if(!hofRetire(p,s))delete S.players[pid];}}
  // 계약 갱신
  for(const t of liveTeams()){for(const pid of [...t.roster,...t.dev]){const p=P_(pid);if(!p.contract)continue;p.contract.years--;
      if(p.contract.years<=0){if(t.isUser){S.pendingFA.push(pid);news(`${p.name} 계약 만료 — 스토브리그 2주차까지 우선 협상 가능`,'contract');}
        else if(t.league==='KR'&&isFgn(p)){if(p.age<35&&calcOvr(p)>=levelOf(t)-1&&rnd()<0.8){p.contract={salary:asiaOk(p)?Math.min(BAL.FGN.asiaCap,p.contract.salary+1000):Math.min(BAL.FGN.genMax,Math.round(Math.max(p.contract.salary,salaryFor(p)*BAL.FGN.genMul)/100)*100),years:1};}else{removeFromTeam(t,p);S.fa.push(pid);p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'외국인 재계약 포기'});}}
        else{if(rnd()<0.7&&p.age<35&&calcOvr(p)>=levelOf(t)-10){p.contract={salary:Math.round(salaryFor(p)*(0.9+rnd()*0.3)/10)*10,years:ri(1,3)};}
          else{removeFromTeam(t,p);S.fa.push(pid);p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});}}}}}
  // 해외 소속 유저 연계 선수 계약
  for(const t of overseasTeams()){if(t.isUser)continue;for(const pid of [...t.roster]){const p=P_(pid);if(!p.contract||!p.userLink)continue;p.contract.years--;
      if(p.contract.years<=0){if(rnd()<0.6&&p.age<34){p.contract={salary:p.contract.salary,years:ri(1,3)};news(`[해외] ${p.name} ${josa(t.name,'과','와')} 재계약`,'overseas');}
        else{removeFromTeam(t,p);if(p.age<=36){S.fa.push(pid);p.homecoming=S.userTeamId;p.transfers.push({s,from:t.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} ${josa(t.name,'과','와')} 계약 만료. 친정 복귀를 희망하며 FA로 나왔습니다!`,'overseas');}else{p.retired=true;p.retiredSeason=s;hofRetire(p,s);}}}}
    for(const pid of [...t.roster]){const p=P_(pid);if(p.age>=37||(p.age>=34&&rnd()<0.25)){removeFromTeam(t,p);if(p.userLink){p.retired=true;p.retiredSeason=s;news(`[출신] ${p.name} ${t.name}에서 은퇴 (${p.age}세)`,'alumni');alumniRetire(p);hofRetire(p,s);}else if(!hofRetire(p,s))delete S.players[pid];}}}
  // 유소년/신인
  for(const t of krTeams()){if(t.isUser)continue;for(let i=0;i<1;i++){const need=needOf(t);const p=genPlayer({pos:need.length?pick(need):pick(ROSTER_TEMPLATE),age:ri(18,21),lvl:BAL.LEVEL_OVR.ROOKIE+5,potBoost:t.fac.youth*1.5});registerPlayer(p);addToTeam(p,t,{salary:BAL.SALARY_MIN,years:3});}}
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  staffSeasonEnd();const sfx=staffFx(ut);
  const yn=2+ut.fac.youth;for(let i=0;i<yn;i++){const need=needOf(ut);const p=genPlayer({pos:(need.length&&rnd()<0.6)?pick(need):pick(ROSTER_TEMPLATE),age:ri(17,20),lvl:BAL.LEVEL_OVR.ROOKIE+ut.fac.youth*1.2,potBoost:ut.fac.youth*2.5+Math.max(0,sfx.P.scout-0.4)*0.6,conf:clamp(0.35+ut.fac.youth*0.05+sfx.conf,0.1,0.8)});p.youth=true;registerPlayer(p);S.youth.push(p.id);}
  for(const t of overseasTeams()){if(t.isUser)continue;const RS=BAL.LEAGUES[t.league].roster;while(t.roster.length<RS){const need=needOf(t);const p=genPlayer({pos:need.length?need[0]:pick(ROSTER_TEMPLATE),age:ri(19,26),lvl:levelOf(t)-4,nat:t.league});registerPlayer(p);addToTeam(p,t,{salary:Math.round(salaryFor(p)*(t.league==='US'?3:t.league==='JP'?2.5:1.3)/10)*10,years:ri(1,4)});}
    t.cash=Math.min(BAL.OVERSEAS_CASH[t.league],t.cash+BAL.OVERSEAS_CASH[t.league]*0.5);autoLineup(t);}
  // FA 풀 정리: 2시즌 이상 미계약자 제거
  S.fa=S.fa.filter(id=>{const p=P_(id);if(!p)return false;p.faSeasons=(p.faSeasons||0)+1;if(p.faSeasons>=2&&!p.userLink&&!p.homecoming){delete S.players[id];return false;}return true;});
  S.grievances=[];S.market.attempts={};S.market.negMem={};S.market.negs=[];S.market.listed=[];
  S.market.offers=S.market.offers.filter(o=>o.type==='overseas');
  interestCheck();
  {if(ut.league==='KR'){achGet('season');const R=rec.post?postReach(rec.post)[ut.id]:null;if(R)achGet('ps');if(R==='ks'||R==='champ')achGet('ks');if(R==='champ')achGet('champ');const F=S.resHist&&S.resHist.slice(-1)[0];if(F&&F.s===s&&F.cid===ut.id)achGet('fut');const fin=ut.fin||{};const inc=(fin.tickets||0)+(fin.sponsor||0)+(fin.ads||0)+(fin.endorse||0)+(fin.dividend||0)+(fin.sales||0)+(fin.other||0),out=(fin.salary||0)+(fin.buys||0)+(fin.scout||0)+(fin.facility||0)+(fin.dispatch||0)+(fin.staff||0);if(inc>out)achGet('black');}}
  S.phase='offseason';S.week=1;S.clock++;
  {const pl=playLg();if(pl&&DRAFT_LG[pl]){createDraft('KR');draftStep();S.draftKR=S.draft;createDraft(pl);draftStep();}else{createDraft();draftStep();}}
  createDispatch();
  for(const t of krTeams())if(!t.isUser)autoLineup(t);fixLineup(userTeam());
  genJobOffers();
  news(`${s}시즌 종료. 스토브리그가 시작됩니다.`,'sys');
  return S.lastSummary;
}
function advanceWeek(){
  if(S.phase!=='offseason')return false;S.warn=[];
  const ut=userTeam();
  if(S.draft&&!S.draft.done){if(draftTurn())draftAuto();draftStep();}
  dispatchWeek();scoutWatch();grievanceTick();convTick(7);achCheck();if(S.week===3)staffWeek3();
  if(S.jobOffers&&S.jobOffers.length&&S.week>=2){for(const o of S.jobOffers)news(`${S.teams[o.team].name}의 감독 제의가 만료되었습니다.`,'sys');S.jobOffers=[];}
  if(S.week===3){for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==ut.id)continue;removeFromTeam(ut,p);S.fa.push(pid);p.transfers.push({s:S.season,from:ut.name,to:'FA',fee:0,kind:'계약 만료'});news(`${josa(p.name,'이','가')} FA로 떠났습니다.`,'contract');}S.pendingFA=[];fixLineup(ut);}
  if(S.week===3&&(!S.fdraft||S.fdraft.s!==S.season)){createFDraft();fdStep();}else if(S.fdraft&&!S.fdraft.done&&S.fdraft.s===S.season){if(fdTurn())fdAuto();fdStep();}
  for(const t of shuffle(krTeams().filter(t=>!t.isUser)).sort((a,b)=>presTierIdx(a)-presTierIdx(b)))aiWeek(t);
  overseasWeek();
  marketTick(0.2);
  if(S.week<=4){const cands=ut.roster.map(P_).filter(p=>!S.market.listed.includes(p.id)&&(p.lockUntil||0)<=S.clock).sort((a,b)=>calcValue(b)-calcValue(a)).slice(0,4);
    for(const p of cands){if(p.dispatch)continue;if(rnd()<0.12){const buyers=krTeams().filter(t=>!t.isUser&&t.cash>calcValue(p)*1.5);if(buyers.length)makeAIOffer(pick(buyers),p,true);}}}
  if(S.week===2){interestCheck();endorseOffers();}endorseTick();
  S.week++;S.clock++;
  if(ut.cash<0)warn(`현금이 ${money(ut.cash)}입니다. 시즌 시작 전 회복 조치가 필요합니다.`);
  return true;
}
function rosterCheck(t){const ps=t.roster.map(P_).filter(Boolean);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;const issues=[];
  if(ps.length<BAL.MIN_ROSTER)issues.push(`선수 ${ps.length}명 (최소 ${BAL.MIN_ROSTER}명)`);if(pit<BAL.MIN_PITCHERS)issues.push(`투수 ${pit}명 (최소 ${BAL.MIN_PITCHERS}명)`);if(c<1)issues.push('포수 없음');if(ps.length-pit<10)issues.push(`야수 ${ps.length-pit}명 (최소 10명)`);return issues;}
function autoFillUser(){const ut=userTeam();const added=[];let guard=0;
  while(rosterCheck(ut).length&&guard++<20){const ps=ut.roster.map(P_);const pit=ps.filter(isPitcher).length;const c=ps.filter(p=>p.pos==='C').length;
    const pos=c<1?'C':pit<BAL.MIN_PITCHERS?pick(['SP','RP']):ps.length-pit<10?(needOf(ut).find(x=>!['SP','RP'].includes(x))||pick(POS_BAT)):(needOf(ut)[0]||pick(ROSTER_TEMPLATE));
    const p=genPlayer({pos,age:ri(19,24),lvl:BAL.LEVEL_OVR.ROOKIE+2,conf:0.4});registerPlayer(p);p.userLink=true;addToTeam(p,ut,{salary:BAL.SALARY_MIN,years:2});p.transfers.push({s:S.season,from:'긴급 보강',to:ut.name,fee:0,kind:'최소 인원 보충'});added.push(p.name);}
  fixLineup(ut);return added;}
function startNewSeason(){
  if(S.phase!=='offseason')return {ok:false,msg:'시즌 진행 중입니다.'};
  if(S.fdraft&&!S.fdraft.done){if(fdTurn())fdAuto();fdStep();if(!S.fdraft.done)fdEnd();}
  if(S.draft&&!S.draft.done){if(draftTurn())draftAuto();draftStep();}draftCleanup();
  const ut=userTeam();
  while(S.week<=BAL.OFFSEASON_WEEKS)advanceWeek();
  const issues=rosterCheck(ut);if(issues.length)return {ok:false,msg:'선수단 요건 미달: '+issues.join(', '),issues};
  for(const id of S.youth)if(P_(id)&&P_(id).teamId==null)delete S.players[id];S.youth=[];
  if(S.market.scoutResults&&S.market.scoutResults.kind==='youth'){for(const id of S.market.scoutResults.ids){const p=P_(id);if(p&&p.teamId==null)delete S.players[id];}}S.market.scoutResults=null;
  S.market.offers=S.market.offers.filter(o=>o.type==='overseas'&&o.expires>S.clock);
  sponAutoPick();
  S.season++;S.day=1;S.phase='season';S.week=0;S.clock++;
  const pl=playLg();if(pl)for(const t of compTeams(pl)){t.rec={w:0,l:0,rs:0,ra:0};t.rotIdx=0;if(!t.isUser)autoLineup(t);}
  for(const t of liveTeams()){t.rec={w:0,l:0,rs:0,ra:0};t.fin=newFin();t.rotIdx=0;
    if(t.loan>0){t.cash-=t.loan;t.fin.other+=t.loan;news(`대출 ${money(t.loan)} 상환`,'fin');t.loan=0;}
    applySponsor(t);let up=econ(t).overhead;if(t.isUser&&t.staff)up=Math.max(0,up-Math.min(up*0.8,BAL.STAFF_CREDIT[staffTier(t)]));for(const k in t.fac)up+=BAL.FACILITY[k].upkeep*t.fac[k];t.cash-=up;t.fin.facility+=up;
    if(!t.isUser&&t.cash>payroll(t)*2.5){const k=pick(['train','youth','scout']);if(t.fac[k]<5){const c=BAL.FACILITY[k].cost*t.fac[k];t.cash-=c;t.fin.facility+=c;t.fac[k]++;}}
    if(!t.isUser){aiFillRookies(t);autoLineup(t);}
    for(const pid of t.roster.concat(t.dev)){const p=P_(pid);const dd=p.dispatchDone&&p.dispatchDone.s===S.season-1?p.dispatchDone:null;
      if(dd){growthTick(p,{kind:'dispatch',label:`${S.season-1}시즌 겨울리그 파견`,team:t,dd});p.fatigue=Math.round(30+dd.share*35);p.cond=-(2+dd.share*3);}
      else if(p.winterPlan==='rest'){growthTick(p,{kind:'rest',label:`${S.season}시즌 겨울 휴식`,team:t});p.fatigue=0;p.cond=3;p.morale=clamp(p.morale+3,0,100);}
      else{growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:t});p.fatigue=0;}
      p.winterPlan=null;
      p.xp=0;p.ovrStart=r1(calcOvr(p));}}
  for(const t of overseasTeams()){if(t.isUser)continue;for(const pid of t.roster){const p=P_(pid);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null,os:p.osRole||null,osLg:t.league});}}
  for(const id of S.fa){const p=P_(id);if(p)growthTick(p,{kind:'winter',label:`${S.season}시즌 동계훈련`,team:null});}
  const keepAttrs=new Set();for(const id of ut.roster.concat(ut.dev))keepAttrs.add(+id);for(const id of S.pins||[])keepAttrs.add(+id);
  for(const id in S.players){const p=S.players[id];if(p.retired){p.snapPrev=null;p.snap=null;continue;}const rich=keepAttrs.has(+id)||p.userLink||p.exUser;
    p.snapPrev=p.snap?(rich?p.snap:{s:p.snap.s,ovr:p.snap.ovr,val:p.snap.val}):null;p.snap=snapOf(p);if(!rich){delete p.snap.attrs;if(!p.userLink)delete p.base;}}
  S.dispatch=null;mgrStart();
  if(S.nextGames&&BAL.SEASON_OPTIONS.includes(S.nextGames)){S.kg=S.nextGames;S.nextGames=null;}
  setGames(calDays());S.games=BAL.SEASON_GAMES;
  fixLineup(ut);genSchedule();aiAims(true);S.lastSummary=null;
  news(`${S.season}시즌 개막! ${compName(compOf(ut))} ${userGames(ut)}경기 일정이 확정되었습니다.`,'sys');
  return {ok:true};
}

// ---------- 홈: 이번 주 이야기 · 코치 한마디 · 기간 보고서 (모두 실제 기록 기반) ----------
// 시작 구단 유형 적용 (유저 구단만, 새 게임 시점)
function applyArch(t,k){if(!BAL.ARCH[k])return;t.arch=k;const ps=t.roster.map(P_);const byO=(a,b)=>calcOvr(b)-calcOvr(a);const scale=(p,d)=>{for(const x in p.attrs)p.attrs[x]=clamp(p.attrs[x]+d,20,99);};
  if(k==='youth'){const core=new Set(ps.slice().sort(byO).slice(0,5).map(p=>p.id));for(const p of ps){if(core.has(p.id)||p.age<=24)continue;if(rnd()<0.75){p.age=ri(19,23);scale(p,-3);p.pot=clamp(calcOvr(p)+ri(10,20),40,92);p.peakAge=ri(26,28);p.scout=makeScout(p,0.45);}}t.fac.youth=2;}
  else if(k==='popular'){t.rep=clamp(t.rep+12,5,100);t.cash=Math.round(t.cash*1.25);}
  else if(k==='poor'){t.cash=Math.round(t.cash*0.45);const top=ps.filter(p=>!isFgn(p)).sort(byO).slice(0,2);   /* 고액 장기계약 베테랑은 국내 선수 (외국인은 1년 계약)*/for(const p of top){scale(p,5);p.contract={salary:Math.round(salaryFor(p)*2.2/10)*10,years:2};}t.rep=clamp(t.rep-8,5,100);}
  else if(k==='vet'){for(const p of ps.slice().sort(byO).slice(0,9)){p.age=Math.max(p.age,ri(31,34));scale(p,4);p.pot=Math.min(p.pot,calcOvr(p)+1);p.peakAge=Math.min(p.peakAge,29);p.scout=makeScout(p,0.6);}for(const p of ps.filter(p=>p.age<=23))scale(p,-2);}
  for(const p of t.roster.map(P_))p.snap=snapOf(p);autoLineup(t);}
// 시즌 결산: 기록에 근거한 요약 (최고 성장·최고 영입·판매 수익·팬/구단주 평가·감독 평판)
// 결산의 「다음 과제」: 실제 상태에서 하나만 (성장했는데 1군 기회가 적은 선수 → 약한 포지션 → 재정)
function recapNext(ut){const ps=ut.roster.concat(ut.dev).map(P_).filter(Boolean);const top=new Set(ut.lineup.concat(ut.rotation,ut.closer!=null?[ut.closer]:[]));
  const g=ps.filter(p=>!top.has(p.id)&&growthBase(p)&&calcOvr(p)-growthBase(p).ovr>=4).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];if(g)return `성장한 ${josa(g.name,'에게','에게')} 1군 기회 주기 (지금 ${rosterRole(ut,g.id).text})`;
  const weak=ut.lineup.map(id=>({p:P_(id),pos:ut.pos[id]})).filter(x=>x.p).sort((a,b)=>posOvr(a.p,a.pos)-posOvr(b.p,b.pos))[0];if(weak&&posOvr(weak.p,weak.pos)<levelOf(ut)-6)return `가장 약한 자리 보강: ${POS_KO[weak.pos]||weak.pos} (${weak.p.name})`;
  if(ut.cash<0)return '재정 회복 (현금 적자)';return '주전 유지하며 유망주 출장 시간 늘리기';}
function buildRecap(s,rec){const ut=userTeam();const m=(S.mgr&&S.mgr.seasons||[]).slice(-1)[0]||{};const ids=ut.roster.concat(ut.dev);
  const grow=ids.map(P_).filter(p=>p&&growthBase(p)).map(p=>{const B=growthBase(p);const dd=ovrD(calcOvr(p),B.ovr);return {id:p.id,name:p.name,from:Math.round(calcOvr(p))-dd,to:Math.round(calcOvr(p)),d:r1(calcOvr(p)-B.ovr),vFrom:B.val,vTo:calcValue(p),join:!!B.join};}).sort((a,b)=>b.d-a.d)[0]||null;
  const newcomers=ids.map(P_).filter(p=>p&&(p.transfers||[]).some(t=>t.s===s&&t.to===ut.name));
  const sc=p=>{const st=p.hist.length&&p.hist[p.hist.length-1].s===s?p.hist[p.hist.length-1].st:p.cur;if(isPitcher(p))return st.pOuts>=30*gf()?{v:(st.pOuts/3)*(4.5-st.pER*27/st.pOuts),line:`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`}:null;return st.pa>=30*gf()?{v:st.pa*(ops_(st)-0.68),line:`타율 ${(st.h/Math.max(1,st.ab)).toFixed(3).replace(/^0/,'')} ${st.hr}홈런 OPS ${ops_(st).toFixed(3).replace(/^0/,'')}`}:null;};
  const bs=newcomers.map(p=>({p,x:sc(p)})).filter(o=>o.x).sort((a,b)=>b.x.v-a.x.v)[0];
  const exp=m.expRank,rank=rec.user.rank;const fans=exp==null?(rank<=2?'열광':rank>=8?'실망':'무난'):rank<exp?'열광':rank===exp?'무난':rank>exp+1?'실망':'아쉬움';
  const fanText={열광:'예상을 뛰어넘은 시즌에 팬들이 열광합니다.',무난:'기대만큼의 시즌이었다는 평가입니다.',아쉬움:'조금 더 위를 기대했던 팬들이 아쉬워합니다.',실망:'기대에 못 미친 성적에 팬들이 실망했습니다.'}[fans];
  const owner=m.goalMet===true?'구단주: "목표를 달성했습니다. 다음 시즌도 맡기겠습니다."':m.goalMet===false?(ut.cash>0?'구단주: "목표는 놓쳤지만 재정은 건전합니다. 다음 시즌엔 결과를 보여주세요."':'구단주: "목표도 재정도 놓쳤습니다. 각성이 필요합니다."'):'구단주: "수고했습니다."';
  const rh=(S.mgr&&S.mgr.repHist)||[];const repFrom=rh.length>=2?rh[rh.length-2][1]:25,repTo=S.mgr?S.mgr.rep:25;
  return {s,comp:rec.user.div,rank,w:rec.user.w,l:rec.user.l,expRank:exp,goal:m.goal||null,goalMet:m.goalMet,ps:(S.lastSummary&&S.lastSummary.ps)||null,post:(S.lastSummary&&S.lastSummary.post)||null,
    grow,growList:ids.map(P_).filter(p=>p&&growthBase(p)).map(p=>{const B=growthBase(p);const dd=ovrD(calcOvr(p),B.ovr);return {id:p.id,name:p.name,from:Math.round(calcOvr(p))-dd,to:Math.round(calcOvr(p)),d:r1(calcOvr(p)-B.ovr),role:rosterRole(ut,p.id).text};}).filter(x=>x.d>=2).sort((a,b)=>b.d-a.d).slice(0,3),goalParts:m.goalParts||null,nextTask:recapNext(ut),bestSign:bs?{id:bs.p.id,name:bs.p.name,line:bs.x.line}:null,sales:m.sales||0,salesFee:m.salesFee||0,salesProfit:m.salesProfit||0,devHits:m.devHits||0,fans,fanText,owner,repFrom,repTo,seen:false};}
// 겨울의 결과: 파견 복귀 · 동계훈련 성장 · 신인 합류 · 출신 코치 복귀 (개막 첫 주 홈 카드)
function winterResults(){const ut=userTeam();const out=[];const ps=ut.roster.concat(ut.dev).map(P_).filter(Boolean);const prev=S.season-1;
  const starterAt=p=>{if(isPitcher(p))return p.pos==='SP'?ut.rotation.map(P_).filter(x=>x&&x.id!==p.id).sort((a,b)=>calcOvr(a)-calcOvr(b))[0]:P_(ut.closer);const id=ut.lineup.find(id=>ut.pos[id]===p.pos&&id!==p.id);return id!=null?P_(id):null;};
  for(const p of ps){const l=(p.log||[]).find(x=>x.s===S.season&&/겨울리그 파견/.test(x.label));if(!l)continue;const w=(p.winter||[]).slice(-1)[0];let bk=null,bd=0;for(const k in l.ch)if(l.ch[k]>bd){bd=l.ch[k];bk=k;}
    const role=rosterRole(ut,p.id);const st=starterAt(p);const pos=isPitcher(p)?(p.pos==='SP'?'선발':'불펜'):(POS_KO[p.pos]||p.pos);const from=Math.round(l.ovr-l.d),to=Math.round(l.ovr);const where=w?(BAL.LEAGUES[w.lg]?BAL.LEAGUES[w.lg].short:w.tn):'겨울리그';
    const inRole=['bat','sp','cl','rp'].includes(role.key);
    out.push({score:30+l.d,pid:p.id,title:`${where}에서 돌아온 ${p.name}, ${inRole?`${josa(isPitcher(p)?pos+' 주전':role.text,'으로')} 개막을 맞습니다`:`${pos} 주전에 도전합니다`}`,lines:[`종합 ${from} → ${to}${bk&&bd>=0.5?` · ${ATTR_KO[bk]} 성장`:''} · 복귀 피로 ${Math.round(p.fatigue||0)}`,w?`겨울리그 ${w.tn} · ${w.role}${w.st&&w.st.pa?` · 타율 ${(w.st.h/Math.max(1,w.st.ab)).toFixed(3).replace(/^0/,'')}`:w.st&&w.st.pOuts?` · ERA ${(w.st.pER*27/w.st.pOuts).toFixed(2)}`:''}`:''].filter(Boolean),
      short:`${p.name} 파견 ${l.d>0?'+':''}${l.d}`,acts:[st&&!inRole?{label:'현재 주전과 비교',cmp:[p.id,st.id]}:null,{label:'개막 편성하기',go:['roster','lineup']}].filter(Boolean)});}
  for(const p of ps){const L=p.loanDone;if(!L||L.s!==prev)continue;const role=rosterRole(ut,p.id);const inRole=['bat','sp','cl','rp'].includes(role.key);const pos=isPitcher(p)?(p.pos==='SP'?'선발':'불펜'):(POS_KO[p.pos]||p.pos);const st=L.st;
    const line=st?(isPitcher(p)?(st.pOuts?`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:''):(st.ab?`${st.g}경기 타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'')):'';const starter=starterAt(p);
    out.push({score:31+(L.to-L.from),pid:p.id,title:`${L.tn} 임대에서 돌아온 ${p.name}, ${inRole?`${josa(isPitcher(p)?pos+' 주전':role.text,'으로')} 개막을 맞습니다`:`${pos} 주전에 도전합니다`}`,lines:[`종합 ${Math.round(L.from)} → ${Math.round(calcOvr(p))} · 임대 역할 ${L.role}`,line?`임대 시즌 ${line}`:''].filter(Boolean),short:`${p.name} 임대 복귀`,acts:[starter&&!inRole?{label:'현재 주전과 비교',cmp:[p.id,starter.id]}:null,{label:'개막 편성하기',go:['roster','lineup']}].filter(Boolean)});}
  for(const c of (ut.staff||[]))if(c.alumni&&c.hiredFor===S.season){const op=P_(c.alumni);out.push({score:22,pid:op?op.id:null,title:`${c.name}, 이제 ${BAL.STAFF[c.dept].name}로 돌아왔습니다`,lines:[`우리 구단 출신 · 코치 평점 ${c.rating} (${gradeOf(c.rating)}급)`,`${BAL.STAFF[c.dept].what}`],short:`${c.name} 코치 복귀`,acts:[{label:'코치진 보기',go:['club','staff']}]});}
  const wg=ps.map(p=>({p,l:(p.log||[]).find(x=>x.s===S.season&&/동계훈련|겨울 휴식/.test(x.label))})).filter(x=>x.l&&x.l.d>=1.5).sort((a,b)=>b.l.d-a.l.d)[0];
  if(wg)out.push({score:14+wg.l.d,pid:wg.p.id,title:`${wg.p.name}, 겨울 동안 ${wg.l.d>=3?'크게 ':''}성장했습니다`,lines:[`종합 ${Math.round(wg.l.ovr-wg.l.d)} → ${Math.round(wg.l.ovr)} · ${wg.l.f.slice(0,2).join(', ')}`],short:`동계훈련 ${wg.p.name} +${wg.l.d}`,acts:[{label:'성장 과정 보기',open:wg.p.id}]});
  const rook=ps.filter(p=>(p.transfers||[]).some(t=>t.s===prev&&/드래프트/.test(t.kind)));
  if(rook.length)out.push({score:10,pid:rook[0].id,title:`신인 ${rook.length}명이 합류했습니다`,lines:[rook.map(p=>`${p.name}(${POS_KO[p.pos]||p.pos}, 잠재 ${gradeOf(p.scout.lo)}~${gradeOf(p.scout.hi)})`).join(', ')],short:`신인 ${rook.length}명 합류`,acts:[{label:'육성 보기',go:['dev','train']}]});
  return out.sort((a,b)=>b.score-a.score);}
function teamStreak(t){const gs=S.schedule.filter(g=>g.res&&(g.home===t.id||g.away===t.id)).sort((a,b)=>b.day-a.day);let k=0,w=null;for(const g of gs){const win=(g.home===t.id?g.res.hs>g.res.as:g.res.as>g.res.hs);if(w==null)w=win;if(win!==w)break;k++;}return {n:k,win:w};}
function weeklyStory(){const ut=userTeam();const C=[];const F=p=>isPitcher(p)?FOCUS_PIT:FOCUS_BAT;
  for(const id of ut.roster.concat(ut.dev)){const p=P_(id);const B=p&&growthBase(p);if(!B)continue;const now=calcOvr(p);const d=now-B.ovr;const val=calcValue(p);const dv=B.val!=null?val-B.val:0;
    if(d>=1){let bk=null,bd=0;if(B.attrs)for(const k in p.attrs){const x=p.attrs[k]-B.attrs[k];if(x>bd){bd=x;bk=k;}}
      const what=p.focus&&p.focus!=='balance'?F(p)[p.focus]+' 훈련':'꾸준한 출장';const lines=[];if(bk&&bd>=1)lines.push(`${ATTR_KO[bk]} ${Math.round(B.attrs[bk])} → ${Math.round(p.attrs[bk])}`);lines.push(`종합 ${Math.round(B.ovr)} → ${Math.round(now)}`);if(Math.abs(dv)>=500)lines.push(`시장 가치 ${money(B.val)} → ${money(val)}`);
      const it=p.interest&&p.interest.stage>=1&&S.teams[p.interest.team]?`${S.teams[p.interest.team].name}(${BAL.LEAGUES[p.interest.lg]?BAL.LEAGUES[p.interest.lg].short:''}) 스카우트가 지켜보고 있습니다.`:(p.log&&p.log[0]?`최근 성장 요인: ${p.log[0].f.slice(0,3).join(', ')}`:'');
      C.push({score:d*3+Math.max(0,dv)/20000+(p.age<=23?2:0)+((S.pins||[]).includes(p.id)?3:0),kind:'growth',pid:p.id,title:`${p.name}의 ${josa(what,'이','가')} 성과를 내고 있습니다`,lines,sub:it,since:B.label});}
    if(d<=-2&&(ut.lineup.includes(id)||ut.rotation.includes(id)))C.push({score:-d*2,kind:'decline',pid:p.id,title:`${p.name}의 기량이 떨어지고 있습니다`,lines:[`종합 ${Math.round(B.ovr)} → ${Math.round(now)}`],sub:p.log&&p.log[0]?`요인: ${p.log[0].f.slice(0,3).join(', ')}`:'',since:B.label});}
  if(S.phase==='season'){const M=myPlayers(6).filter(x=>x.up);for(const x of M){const p=x.p;const first=x.up.first;const F2=isPitcher(p)?FOCUS_PIT:FOCUS_BAT;const fo=p.focus&&p.focus!=='balance'?F2[p.focus]+' 훈련':null;const st=(p.log[0].f||[]).some(s=>/주전|출장|선발/.test(s));
      const onF=x.up.k===p.focus;C.push({score:first?27:16+x.up.d,kind:'mine',pid:p.id,title:`${p.name}, ${onF?(first?'첫 훈련 성과':'훈련 성과'):(first?'첫 성장':'성장')}`,lines:[`${ATTR_KO[x.up.k]} ${x.up.to-x.up.d} → ${x.up.to}`,`이번 주 ${(onF?[st?'출장':null,fo]:[st?'꾸준한 출장':'훈련']).filter(Boolean).join('과 ')||'훈련'}이 성장에 기여했습니다.`,x.ev?`${PLAN_KO[x.ev.k]} ${x.ev.games}경기째 · ${x.ev.line}`:''].filter(Boolean),sub:'',acts:[{label:'선수 보기',open:p.id}]});}}
  if(S.phase==='season')for(const id of ut.roster){const p=P_(id);if(p&&p.deb&&p.deb.s===S.season&&S.day-p.deb.d<=7)C.push({score:19,kind:'growth',pid:p.id,title:`${p.name}, 1군 데뷔전을 치렀습니다`,lines:[`${p.deb.vs}전 · ${p.deb.line}`,`종합 ${Math.round(calcOvr(p))} · ${p.age}세 · ${POS_KO[p.pos]||p.pos}`],sub:'첫 1군 경기는 기록에 남습니다. 계속 기회를 줄지, 2군에서 더 키울지 정할 때입니다.'});}
  if(S.phase==='season'){const st=teamStreak(ut);if(st.n>=4)C.push({score:6+st.n,kind:'streak',title:`${st.n}${st.win?'연승':'연패'} 중입니다`,lines:[`${compName(compOf(ut))} ${rankOf(ut)}위 · ${ut.rec.w}승 ${ut.rec.l}패`],sub:st.win?'흐름을 탔을 때 주전을 무리시키지 않도록 피로를 확인하세요.':'라인업과 선발 순서를 점검해 볼 때입니다.'});
    const goal=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;if(goal&&S.day>=dayAt(0.64)){const st2=standings(compOf(ut));const r=rankOf(ut);const tgt=st2[goal.target-1];const gap=tgt?tgt.rec.w-ut.rec.w:0;C.push({score:7,kind:'race',title:r<=goal.target?`목표(${goal.text}) 안에 있습니다`:`목표(${goal.text})까지 ${gap}승 차`,lines:[`현재 ${r}위 · 남은 ${BAL.SEASON_GAMES-S.day+1}경기`],sub:''});}}
  for(const n of S.news.slice(0,12))if(n.kind==='alumni'&&n.s===S.season&&(S.phase!=='season'||n.d==='OFF'||+n.d>=S.day-7)){C.push({score:6.5,kind:'alumni',title:'우리가 키운 선수의 소식',lines:[n.text.replace(/^\[(출신|셀온|친정)\] /,'')],sub:''});break;}
  if(S.phase==='offseason'&&S.lastSummary&&S.week<=2){const L=S.lastSummary;C.push({score:9,kind:'season',title:`${L.s}시즌 ${compName(L.div)} ${L.rank}위${L.champ||(L.ps==='champ'&&userTeam().league==='KR')?' — '+(L.post||'우승!'):L.ps?' — '+(userTeam().league==='KR'?'가을야구 진출':L.post):''}`,lines:[`${L.w}승 ${L.l}패${L.post?' · '+L.post:''}`,`최고 타자 ${L.bestBat}`,`최고 투수 ${L.bestPit}`],sub:'스토브리그: 재계약·드래프트·파견을 결정하세요.'});}
  if(S.phase==='offseason'&&S.lastSummary&&S.week<=2&&((S.lastSummary.awards||[]).length||S.lastSummary.asia)){const L=S.lastSummary;const aw=L.awards||[];const big=aw.find(x=>/MVP/.test(x))||aw.find(x=>/신인왕/.test(x))||aw[0];const pid=big?(Object.values(S.awards[L.s]||{}).flatMap(R=>[R.mvp,R.roy,...R.titles,...R.gg]).find(e=>e&&e.tid===ut.id&&big.startsWith(e.name))||{}).pid:null;
    C.push({score:/우승/.test(L.asia||'')?24:big&&/MVP/.test(big)?22:14,kind:'award',pid:pid!=null?pid:null,title:L.asia&&/우승/.test(L.asia)?`${ut.name}, 아시아 정상에 올랐습니다!`:big?`${big}!`:L.asia,lines:[aw.length?`우리 선수 수상 ${aw.length}건: ${aw.slice(0,3).join(', ')}${aw.length>3?' 외':''}`:'',L.asia||''].filter(Boolean),sub:'수상 선수는 시장 가치와 사기가 오릅니다.',acts:[{label:'시상식 보기',cer:L.s}]});}
  if(S.phase==='offseason'&&S.lastSummary&&S.lastSummary.pres&&S.week<=3){const P=S.lastSummary.pres;if(P.tierFrom!==P.tierTo){const up=P.to>P.from;C.push({score:up?20:12,kind:'pres',title:up?`${ut.name}, 이제 「${P.tierTo}」 구단입니다`:`${ut.name}의 위상이 「${P.tierTo}」로 내려갔습니다`,lines:[`구단 위상 ${Math.round(P.from)} → ${Math.round(P.to)}`,up?(P.tierTo==='명문'?'선수들이 먼저 찾아오고, 연봉·코치 비용이 줄고, 위기에는 모기업이 지원합니다.':'선수 영입 의향과 수입이 좋아집니다.'):'수입과 선수 영입 의향이 조금 줄어듭니다.'],sub:'구단 → 구단 위상에서 자세히 볼 수 있습니다.',acts:[{label:'구단 위상 보기',go:['club','pres']}]});}}
  if(S.season>=2&&S.phase==='season'&&S.day<=7){const W=winterResults();if(W.length){const m=W[0];C.push({score:40,kind:'winter',pid:m.pid,title:m.title,lines:m.lines,sub:W.slice(1,4).map(x=>x.short).join(' · '),since:`${S.season-1}시즌 겨울 결과`,acts:m.acts});}}
  if(S.season===1&&S.phase==='season'&&S.day<=7){const A=ut.arch&&BAL.ARCH[ut.arch];const yp=ut.roster.concat(ut.dev).map(P_).filter(p=>p&&p.age<=23).sort((a,b)=>b.scout.est-a.scout.est)[0];const g=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;
    C.push({score:30,kind:'start',pid:yp?yp.id:null,title:`${ut.name} 감독 첫 시즌${A?' — '+A.name:''}`,lines:[A?A.pitch:`${compName(compOf(ut))}에서 시작하는 첫 시즌입니다. ${fgnRuleText(ut.league)}.`,yp?`주목할 유망주: ${yp.name} (${POS_KO[yp.pos]||yp.pos}, 예상 잠재 ${gradeOf(yp.scout.lo)}~${gradeOf(yp.scout.hi)})`:''].filter(Boolean),sub:(A?A.tip+' ':'')+(g?`시즌 목표: ${g.text}`:'')});}
  C.sort((a,b)=>b.score-a.score);return C[0]||{kind:'quiet',title:S.phase==='season'?'조용한 한 주입니다':'스토브리그가 진행 중입니다',lines:[],sub:S.phase==='season'?`다음 성장 점검까지 ${nextCheck()}경기`:''};}
function coachNotes(){const ut=userTeam();const out=[];const st=ut.staff||[];const who=d=>{const c=st.filter(x=>x.dept===d&&(x.years>0||x.expiring)).sort((a,b)=>b.rating-a.rating)[0];return c?`${BAL.STAFF[d].name} ${c.name}`:null;};
  const ps=ut.roster.map(P_).filter(Boolean);
  const bat=ps.filter(p=>!isPitcher(p)&&p.log&&p.log[0]&&p.log[0].s===S.season).sort((a,b)=>(b.log[0].d||0)-(a.log[0].d||0))[0];
  if(bat&&who('bat')&&bat.log[0].d>0)out.push({who:who('bat'),pid:bat.id,text:`${josa(bat.name,'이','가')} 최근 점검에서 +${bat.log[0].d} 올랐습니다. 지금 훈련을 유지하겠습니다.`});
  const tired=ps.filter(p=>(p.fatigue||0)>=70).sort((a,b)=>b.fatigue-a.fatigue)[0];
  if(tired)out.push({who:who('med')||who('pit')||'트레이너',pid:tired.id,text:`${p_n(tired)} 피로가 ${Math.round(tired.fatigue)}입니다. 한두 경기 쉬게 하는 게 좋겠습니다.`});
  const pit=ps.filter(p=>isPitcher(p)&&p.log&&p.log[0]&&p.log[0].s===S.season).sort((a,b)=>(b.log[0].d||0)-(a.log[0].d||0))[0];
  if(pit&&who('pit')&&pit.log[0].d>0)out.push({who:who('pit'),pid:pit.id,text:`${josa(pit.name,'의','의').replace('의의','의')} 공이 좋아지고 있습니다 (최근 +${pit.log[0].d}).`});
  {const pl=ps.filter(p=>p.plan&&p.plan.n>=5).sort((a,b)=>b.plan.n-a.plan.n)[0];if(pl){const E=planEval(pl);const grew=E.fd&&E.fd.to>E.fd.from?`${ATTR_KO[E.fd.k]} ${E.fd.from} → ${E.fd.to}`:E.ovrTo>E.ovrFrom?`종합 ${E.ovrFrom} → ${E.ovrTo}`:'아직 능력 변화 없음';out.push({who:who('bat')||who('pit')||'수석코치',pid:pl.id,plan:true,text:`${PLAN_KO[E.k]} ${E.games}경기째 — ${pl.name}: ${grew} · ${E.line}.${E.alt&&E.alt.gap>0?` ${E.alt.name}(종합 ${E.alt.ovr})보다 당장 전력은 ${E.alt.gap} 낮습니다.`:''} 감독님 뜻대로 계속 기용하겠습니다.`});}}
  const mis=ut.lineup.filter(id=>{const p=P_(id);const pos=ut.pos[id];return p&&!p.plan&&!(ut.locks&&ut.locks[id])&&pos&&pos!=='DH'&&pos!==p.pos&&posPenalty(p,pos)>=12;});
  if(mis.length){const m=P_(mis[0]),mp=ut.pos[mis[0]],pen=posPenalty(m,mp);const alt=ut.roster.map(P_).filter(q=>q&&!isPitcher(q)&&!ut.lineup.includes(q.id)&&posPenalty(q,mp)<12).sort((a,b)=>fitScore(b,mp)-fitScore(a,mp))[0];
    if(alt&&fitScore(alt,mp)>=fitScore(m,mp))out.push({who:who('def')||who('bat')||'수석코치',pid:m.id,text:`${josa(m.name,'이','가')} ${POS_KO[mp]} 수비를 어려워합니다 (적성 밖 −${pen}). ${josa(alt.name,'을','를')} ${josa(POS_KO[mp],'으로','로')} 쓰는 게 낫겠습니다.`});
    else out.push({who:who('def')||who('bat')||'수석코치',pid:m.id,text:`${m.name}의 ${POS_KO[mp]} 배치는 타격을 살리려는 선택입니다 (수비 −${pen} 감수 · 같은 자리 벤치보다 종합 이득).`});}
  if(S.phase==='offseason'&&S.draft&&!S.draft.done&&who('scout')){const top=S.draft.pool.map(P_).filter(Boolean).sort((a,b)=>b.scout.est-a.scout.est)[0];if(top)out.push({who:who('scout'),pid:top.id,text:`드래프트 후보 중 ${top.name}(${top.school||''} ${POS_KO[top.pos]||top.pos})의 잠재력을 높게 봅니다.`});}
  return out.slice(0,3);}
function p_n(p){return josa(p.name,'의','의').replace('의의','의');}
function reportStart(){const ut=userTeam();const pl={};for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(!p)continue;const c=p.cur;pl[id]={ovr:calcOvr(p),val:calcValue(p),pa:c.pa,ab:c.ab,h:c.h,hr:c.hr,bb:c.bb,rbi:c.rbi,o:c.pOuts,er:c.pER,so:c.pSO,w:c.pW};}
  return {s:S.season,day:S.day,w:ut.rec.w,l:ut.rec.l,rs:ut.rec.rs,ra:ut.rec.ra,rank:S.phase==='season'&&(ut.rec.w+ut.rec.l+(ut.rec.tie||0))?rankOf(ut):null,cash:ut.cash,pl};}
function reportEnd(r0){const ut=userTeam();if(!r0||r0.s!==S.season)return null;const g=(ut.rec.w-r0.w)+(ut.rec.l-r0.l);if(g<=0)return null;const ended=S.phase!=='season';
  // 시즌이 끝났으면 승강 뒤 새 부 순위가 아니라 그 시즌 최종 순위로 고정
  const rep={s:r0.s,ended,games:g,w:ut.rec.w-r0.w,l:ut.rec.l-r0.l,rs:ut.rec.rs-r0.rs,ra:ut.rec.ra-r0.ra,rankFrom:r0.rank,rankTo:ended&&S.lastSummary&&S.lastSummary.s===r0.s?S.lastSummary.rank:rankOf(ut),cash:ut.cash-r0.cash,bat:null,pit:null,grow:[]};
  let bb=null,bp=null;for(const id in r0.pl){const p=P_(+id);if(!p||p.teamId!==ut.id)continue;const a=r0.pl[id],c=p.cur;const pa=c.pa-a.pa,ab=c.ab-a.ab,h=c.h-a.h,hr=c.hr-a.hr,rbi=c.rbi-a.rbi;
    if(pa>=Math.max(6,g*2.5)){const sc=(h+hr*2+(c.bb-a.bb)*0.6)/pa+rbi*0.03;if(!bb||sc>bb.sc)bb={sc,p,line:`${ab}타수 ${h}안타${hr?` ${hr}홈런`:''}${rbi?` ${rbi}타점`:''}`};}
    const o=c.pOuts-a.o,er=c.pER-a.er;if(o>=9){const sc=(o/3)*(1-er*27/o/9)+(c.pW-a.w)*2;if(!bp||sc>bp.sc)bp={sc,p,line:`${Math.floor(o/3)}.${o%3}이닝 ${er}자책${c.pW-a.w?` ${c.pW-a.w}승`:''} ${c.pSO-a.so}탈삼진`};}
    const d=calcOvr(p)-a.ovr;if(Math.abs(d)>=0.5)rep.grow.push({p,d:r1(d),val:calcValue(p)-a.val});}
  rep.bat=bb;rep.pit=bp;rep.grow.sort((x,y)=>y.d-x.d);return rep;}

// ---------- 테스트 도구 (주소에 ?test=1 일 때만 화면에 노출) ----------
function testInfo(){const ut=userTeam();return [`게임 ${GAME_VER} (저장 형식 ${VERSION})`,`시드 ${S.seed} · 구단 ${ut.name}${ut.arch?' ('+BAL.ARCH[ut.arch].name+')':''}`,`${S.season}시즌 ${S.phase==='season'?S.day+'일차':'스토브리그 '+S.week+'주차'} · ${compName(compOf(ut))}`,`현금 ${money(ut.cash)} · 선수 ${ut.roster.length}명 + 육성군 ${ut.dev.length}명 · 코치 ${(ut.staff||[]).length}명`].join('\n');}
function testCmd(k){const ut=userTeam();
  if(k==='cash'){ut.cash+=100000;return '현금 +10억';}
  if(k==='reveal'){for(const id in S.players){const p=S.players[id];if(p.scout)p.scout={est:Math.round(p.pot),lo:Math.round(p.pot),hi:Math.round(p.pot),conf:0.95};}return '모든 선수 잠재력 공개';}
  if(k==='endSeason'){if(S.liveGame){stepGame(S.liveGame);endUserGame();}let g=0;while(S.phase==='season'&&g++<60){const lg=startDay();if(lg){stepGame(lg);endUserGame();}else finishDay();}return '시즌 종료';}
  if(k==='nextSeason'){if(S.phase==='season')testCmd('endSeason');while(S.week<=BAL.OFFSEASON_WEEKS)advanceWeek();let r=startNewSeason();if(!r.ok){autoFillUser();r=startNewSeason();}return r.ok?`${S.season}시즌 개막`:r.msg;}
  return '알 수 없는 명령';}

// ---------- 2군(퓨처스) 리그 ----------
// 육성군 + 1군에서 주전·필승조가 아닌 선수가 매주 2군 7경기를 치른다(요약 시뮬). 기록·순위가 쌓이고, 1군 출장이 적어도 성장이 덜 막힌다.
function reserveIds(t){const top=new Set(t.lineup.concat(t.rotation,t.closer!=null?[t.closer]:[],t.bullpen.slice(0,4)));return t.roster.filter(id=>!top.has(id)).concat(t.dev||[]);}
function addStat(a,b,k){for(const x in b){const v=b[x]*k;const n=Math.floor(v)+(rnd()<v-Math.floor(v)?1:0);a[x]=(a[x]||0)+n;}}
// 퓨처스리그(2026 KBO처럼 12팀): 국내 10개 구단 2군 + 시민 구단 + 군 팀, 북부·남부 6팀씩. 1군 시즌 동안 실제 일정으로 매일 경기
const FUT_INDEP=[{id:'F1',name:'울산 시티즌스',color:'#0369a1',div:'S',adj:-1,kind:'시민 구단'},{id:'F2',name:'문경 솔저스',color:'#4d7c0f',div:'S',adj:3,kind:'군 팀'}];
const FUT_NORTH=[0,2,4,5,6,9];   // TEAM_NAMES.KR 순서: 서울·수원·인천·대전 = 북부, 대구·광주·부산·창원 + 울산·문경 = 남부
const FUT_DIV_KO={N:'북부리그',S:'남부리그'};
function futDivOf(id){const f=FUT_INDEP.find(x=>x.id===id);if(f)return f.div;const t=S.teams[id];const i=t?TEAM_NAMES.KR.findIndex(x=>x[0]===(t.orig||t.name)):-1;return FUT_NORTH.includes(i)?'N':'S';}
function futTeam(id){const f=FUT_INDEP.find(x=>x.id===id);if(f)return {id:f.id,name:f.name,color:f.color,indep:true,kind:f.kind,isUser:false};return S.teams[id];}
function futGames(){const G=BAL.SEASON_GAMES;return Math.max(2,Math.round(G*0.69/11))*11;}   // 36경기 시즌 22경기 · 72 → 55 · 144 → 99 (실제 퓨처스 약 100경기)
function futInit(){const ids=krTeams().map(t=>t.id).concat(FUT_INDEP.map(x=>x.id));const R=rrRounds(ids);const G=BAL.SEASON_GAMES;const F=futGames();const sched=[];
  for(let k=0;k<F;k++){const c=Math.floor(k/R.length),r=k%R.length;const d=Math.floor(k*G/F)+1;for(const [h,a] of R[r]){const fl=c%2===1;sched.push({k,d,home:fl?a:h,away:fl?h:a,res:null});}}
  balanceHome(sched);const rec={};for(const id of ids)rec[id]={w:0,l:0,tie:0,rs:0,ra:0};S.res={s:S.season,v:2,rec,sched,rot:{},log:[],post:null};}
// 2군 출장 순서: 집중 육성 → 실력 순. 야수 9명·투수 6명이 2군 주전, 나머지는 벤치
function futRoles(t){const res=new Set(reserveIds(t));for(const id of t.roster.concat(t.dev||[])){const p=P_(id);if(p)p.resWeek=res.has(id);}
  const ps=[...res].map(P_).filter(Boolean);const fo=p=>t.isUser&&p.resFocus?1:0;
  const bats=ps.filter(p=>!isPitcher(p)).sort((a,b)=>fo(b)-fo(a)||roleVal(b)-roleVal(a)),pits=ps.filter(isPitcher).sort((a,b)=>fo(b)-fo(a)||calcOvr(b)-calcOvr(a));
  bats.forEach((p,i)=>{p.resRole=fo(p)?'focus':i<9?'start':'bench';});pits.forEach((p,i)=>{p.resRole=fo(p)?'focus':i<6?'start':'bench';});
  const avg=a=>a.length?a.reduce((x,p)=>x+roleVal(p),0)/a.length:35;return {bats,pits,str:avg(bats.slice(0,9))*0.55+avg(pits.slice(0,6))*0.45};}
function reserveWeek(){for(const t of krTeams())futRoles(t);}
// v32 이전 저장(주간 요약 2군)을 시즌 중에 불러오면 남은 날짜만 실제 일정으로 바꾸고 지금까지의 승패는 그대로 둔다
function futMigrate(){const old=S.res&&S.res.s===S.season&&!S.res.sched?S.res.rec:null;futInit();S.res.sched=S.res.sched.filter(g=>g.d>=S.day);
  if(old){let n=0,tot=0;for(const id in old)if(S.res.rec[id]){S.res.rec[id].w=old[id].w||0;S.res.rec[id].l=old[id].l||0;n++;tot+=(old[id].w||0)+(old[id].l||0);}const half=Math.round(tot/Math.max(1,n)/2);for(const f of FUT_INDEP){S.res.rec[f.id].w=half;S.res.rec[f.id].l=half;}}}   // 예전 이름 유지 (역할만 정함)
function sround(v){const f=Math.floor(v);return f+(rnd()<v-f?1:0);}
// 타석 단위 요약: 1군 엔진 대신 능력치로 타석 결과를 뽑고, 팀 득점은 그 타석 결과에서 만든다 (선수 기록과 점수가 어긋나지 않게)
function futBat(side,oppQ,baseQ){const lv=(oppQ-baseQ)*0.6-18;   /* 평균 2군 투수 상대면 2군 기본 타격 환경 (리그 타율 약 .260) */const lines=[];
  const bat=(a,pa)=>{const st=newStat();st.g=1;const pBB=clamp(0.06+(a.eye-50)*0.0015,0.02,0.15),pHR=clamp(0.008+(a.power-50)*0.0009-lv*0.0003,0.002,0.06),avg=clamp(0.2+(a.contact-50)*0.0028+(a.power-50)*0.0004-lv*0.0018,0.12,0.38),pSO=clamp(0.2-(a.contact-50)*0.0015+lv*0.002,0.08,0.38);
    for(let i=0;i<pa;i++){st.pa++;if(rnd()<pBB){st.bb++;continue;}st.ab++;const r=rnd();if(r<pHR/(1-pBB)){st.h++;st.hr++;}else if(r<avg){st.h++;const x=rnd();if(x<0.02)st.d3++;else if(x<0.22)st.d2++;}else if(rnd()<pSO/(1-avg))st.so++;}return st;};
  for(const b of side.bats){const pa=b.pa;lines.push({p:b.p,st:bat(b.p.attrs,pa),ghost:b.ghost||side.indep});}
  const T=newStat();for(const l of lines)for(const k of ['pa','ab','h','hr','bb','so','d2','d3'])T[k]+=l.st[k];
  let runs=Math.max(T.hr,Math.round(T.hr*1.35+(T.h-T.hr)*0.34+T.d2*0.22+T.d3*0.4+T.bb*0.2+gauss()*0.9));
  // 득점·타점 나누기: 홈런 친 타자는 최소 1득점·1타점, 나머지는 출루·안타 비중대로
  for(const l of lines){l.st.r=l.st.hr;l.st.rbi=l.st.hr;}let restR=runs-T.hr,restB=runs-T.hr;
  const wpick=(f)=>{const w=lines.map(f);const tot=w.reduce((a,b)=>a+b,0);if(!tot)return lines[Math.floor(rnd()*lines.length)];let r=rnd()*tot;for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return lines[i];}return lines[lines.length-1];};
  while(restR-->0)wpick(l=>l.st.h-l.st.hr+l.st.bb).st.r++;while(restB-->0)wpick(l=>l.st.h+0.2).st.rbi++;
  return {lines,T,runs};}
function futPitch(side,opp,won,lost){const ps=side.pitchers;if(!ps.length)return;const outs=27;const sp=ps[0];let spO=clamp(Math.round((sp.p.pos==='SP'?17:9)+gauss()*3-(opp.runs>=6?4:0)),6,24);if(ps.length===1)spO=outs;
  const share=[spO];let left=outs-spO;const rel=ps.slice(1);rel.forEach((r,i)=>{const o=i===rel.length-1?left:Math.min(left,ri(3,6));share.push(o);left-=o;});
  const lines=ps.map((x,i)=>({p:x.p,ghost:x.ghost,st:Object.assign(newStat(),{pG:1,pGS:i===0?1:0,pOuts:share[i]||0})})).filter(l=>l.st.pOuts>0);
  const give=(k,tot)=>{let rest=tot;lines.forEach((l,i)=>{const v=i===lines.length-1?rest:Math.min(rest,sround(tot*l.st.pOuts/outs));l.st[k]=v;rest-=v;});};
  give('pH',opp.T.h);give('pHR',Math.min(opp.T.hr,opp.T.h));give('pBB',opp.T.bb);give('pSO',opp.T.so);give('pR',opp.runs);
  for(const l of lines){l.st.pHR=Math.min(l.st.pHR,l.st.pH);l.st.pER=l.st.pR;l.st.pPit=Math.round(l.st.pOuts*5.2+l.st.pBB*4+l.st.pH*2);}
  if(won){const w=lines[0].st.pOuts>=15?lines[0]:(lines[1]||lines[0]);w.st.pW=1;}if(lost){const l=lines.slice().sort((a,b)=>b.st.pR-a.st.pR)[0];l.st.pL=1;}
  return lines;}
function futSide(id,sq,avgStr,base){const f=FUT_INDEP.find(x=>x.id===id);
  if(f){const A=base.attrs,a=f.adj;const gen=()=>({attrs:{eye:A.eye+a+gauss()*4,power:A.power+a+gauss()*5,contact:A.contact+a+gauss()*4}});return {id,str:avgStr+a,bats:Array.from({length:9},()=>({p:gen(),pa:ri(4,5)})),pitchers:[],q:base.q+a,indep:true};}
  const R=sq[id];const t=S.teams[id];const bats=R.bats.slice(0,9).map(p=>({p,pa:ri(4,5)}));for(const p of R.bats.slice(9))if(rnd()<0.14)bats.push({p,pa:1});
  // 2군 선수가 9명이 안 되면 이름 없는 2군 등록 선수(육성 선수·재활 선수 몫)가 빈자리를 채운다 — 기록은 남기지 않음
  const A0=base.attrs;while(bats.filter(b=>b.pa>1).length<9)bats.push({p:{attrs:{eye:A0.eye-4,power:A0.power-4,contact:A0.contact-4}},pa:ri(4,5),ghost:true});
  const sps=R.pits.filter(p=>p.pos==='SP'),rps=R.pits.filter(p=>p.pos!=='SP');const rot=S.res.rot[id]=(S.res.rot[id]||0)+1;
  const focusSP=sps.filter(p=>p.resRole==='focus');const spList=sps.slice(0,5);const sp=spList.length?spList[rot%spList.length]:(R.pits[0]||null);
  const relPool=rps.length?rps:R.pits.filter(p=>p!==sp);const pickR=[];const fr=relPool.filter(p=>p.resRole==='focus');for(const p of fr)if(pickR.length<2&&rot%2===0)pickR.push(p);
  const others=relPool.filter(p=>!pickR.includes(p));for(let i=0;pickR.length<2&&i<others.length;i++){const p=others[(rot*2+i)%others.length];if(!pickR.includes(p))pickR.push(p);}
  const pitchers=(sp?[sp]:[]).concat(pickR).filter((p,i,a)=>p&&a.indexOf(p)===i).map(p=>({p}));
  while(pitchers.length<3)pitchers.push({p:{pos:pitchers.length?'RP':'SP'},ghost:true});
  return {id,str:R.str,bats,pitchers,q:sp?calcOvr(sp):base.q-4,t,focusSP};}
// 시민 구단·군 팀은 개별 선수 없이 「국내 2군 주전 평균 능력 + 팀 보정」으로 경기한다
function futBase(sq){let n=0,e=0,pw=0,c=0,q=0,m=0;for(const id in sq){const R=sq[id];for(const p of R.bats.slice(0,9)){n++;e+=p.attrs.eye;pw+=p.attrs.power;c+=p.attrs.contact;}for(const p of R.pits.filter(p=>p.pos==='SP').slice(0,5)){m++;q+=calcOvr(p);}}n=n||1;return {attrs:{eye:e/n,power:pw/n,contact:c/n},q:m?q/m:52};}
function futAdd(p,st){p.res=Object.assign(newStat(),p.res||{});for(const k in st)if(typeof st[k]==='number')p.res[k]=(p.res[k]||0)+st[k];}
function futLine(p,st){if(isPitcher(p)){const ip=Math.floor(st.pOuts/3)+(st.pOuts%3?'.'+st.pOuts%3:'');return `${p.name} ${ip}이닝 ${st.pR}실점 ${st.pSO}탈삼진${st.pW?' · 승':st.pL?' · 패':''}`;}
  return `${p.name} ${st.ab}타수 ${st.h}안타${st.hr?` ${st.hr}홈런`:''}${st.rbi?` ${st.rbi}타점`:''}${st.bb?` ${st.bb}볼넷`:''}`;}
function futDay(d){if(!S.res||!S.res.sched||S.res.s!==S.season)return;const games=S.res.sched.filter(g=>g.d===d&&!g.res);
  const sq={};for(const t of krTeams())sq[t.id]=futRoles(t);if(!games.length)return;const strs=Object.values(sq).map(x=>x.str);const avgStr=strs.reduce((a,b)=>a+b,0)/strs.length;
  const base=futBase(sq);for(const g of games){const H=futSide(g.home,sq,avgStr,base),A=futSide(g.away,sq,avgStr,base);const bh=futBat(H,A.q,base.q),ba=futBat(A,H.q,base.q);
    if(bh.runs===ba.runs&&rnd()<0.65){const x=rnd()<0.5+(H.str-A.str)*0.02?bh:ba;const ls=x.lines;const on=ls.slice().sort((p,q)=>(q.st.h+q.st.bb)-(p.st.h+p.st.bb))[0];on.st.r++;ls[Math.floor(rnd()*ls.length)].st.rbi++;x.runs++;}   /* 연장전 결승점 (퓨처스는 무승부도 있음) */
    const hw=bh.runs>ba.runs,aw=ba.runs>bh.runs;const lh=H.indep?[]:futPitch(H,ba,hw,aw)||[];const la=A.indep?[]:futPitch(A,bh,aw,hw)||[];
    for(const [side,bat,pit] of [[H,bh,lh],[A,ba,la]])if(!side.indep){for(const l of bat.lines)if(!l.ghost)futAdd(l.p,l.st);for(const l of pit)if(!l.ghost)futAdd(l.p,l.st);}
    g.res={hs:bh.runs,as:ba.runs};const rh=S.res.rec[g.home],ra=S.res.rec[g.away];rh.rs+=bh.runs;rh.ra+=ba.runs;ra.rs+=ba.runs;ra.ra+=bh.runs;
    if(hw){rh.w++;ra.l++;}else if(aw){ra.w++;rh.l++;}else{rh.tie++;ra.tie++;}
    const uid=S.userTeamId;if(g.home===uid||g.away===uid){const home=g.home===uid;const mb=home?bh:ba,mp=home?lh:la;const fo=p=>p.resFocus?1:0;
      const top=mb.lines.filter(l=>l.st.pa>0&&!l.ghost).sort((a,b)=>fo(b.p)-fo(a.p)||(b.st.h*2+b.st.hr*3+b.st.rbi)-(a.st.h*2+a.st.hr*3+a.st.rbi)).slice(0,2).map(l=>({pid:l.p.id,text:futLine(l.p,l.st)}));
      const sp=mp[0];if(sp&&!sp.ghost)top.push({pid:sp.p.id,text:futLine(sp.p,sp.st)});for(const l of mp.slice(1))if(!l.ghost&&l.p.resFocus)top.push({pid:l.p.id,text:futLine(l.p,l.st)});
      S.res.log.unshift({d,opp:home?g.away:g.home,home,us:home?bh.runs:ba.runs,them:home?ba.runs:bh.runs,top});if(S.res.log.length>10)S.res.log.length=10;}}
  if(d===BAL.SEASON_GAMES)futPost();}
function futPct(r){return (r.w+r.l)?r.w/(r.w+r.l):0;}
function futStand(div){if(!S.res)return [];return Object.entries(S.res.rec).filter(([id])=>futDivOf(id)===div).map(([id,r])=>({id,t:futTeam(id),...r,pct:futPct(r)})).filter(x=>x.t).sort((a,b)=>b.pct-a.pct||b.w-a.w||(b.rs-b.ra)-(a.rs-a.ra)||String(a.id).localeCompare(String(b.id)));}
function futNext(){if(!S.res||!S.res.sched)return null;const uid=S.userTeamId;return S.res.sched.find(g=>!g.res&&g.d>=S.day&&(g.home===uid||g.away===uid))||null;}
// 퓨처스 챔피언결정전 (2025년부터 KBO가 도입한 방식): 각 리그 1위 vs 상대 리그 2위 준결승 → 결승, 단판
function futQuick(a,b){const sa=a.str,sb=b.str;let x=Math.max(0,Math.round(4.5+(sa-sb)*0.12+gauss()*2.4)),y=Math.max(0,Math.round(4.5+(sb-sa)*0.12+gauss()*2.4));if(x===y){if(rnd()<0.5+(sa-sb)*0.02)x++;else y++;}return {as:x,bs:y,w:x>y?a.id:b.id};}
function futPost(){if(!S.res||S.res.post)return;const N=futStand('N'),So=futStand('S');if(N.length<2||So.length<2)return;
  const sq={};for(const t of krTeams())sq[t.id]=futRoles(t);const strs=Object.values(sq).map(x=>x.str);const avg=strs.reduce((a,b)=>a+b,0)/strs.length;
  const strOf=id=>{const f=FUT_INDEP.find(x=>x.id===id);return {id,str:f?avg+f.adj:sq[id].str};};
  const s1=futQuick(strOf(N[0].id),strOf(So[1].id)),s2=futQuick(strOf(So[0].id),strOf(N[1].id));const semi=[{a:N[0].id,b:So[1].id,...s1},{a:So[0].id,b:N[1].id,...s2}];
  const f=futQuick(strOf(s1.w),strOf(s2.w));const fin={a:s1.w,b:s2.w,...f};const champ=fin.w;const runner=champ===fin.a?fin.b:fin.a;
  S.res.post={semi,final:fin,champ,runner,n1:N[0].id,s1:So[0].id};const ct=futTeam(champ);
  const prize=BAL.FUT_PRIZE||3000;if(S.teams[champ]){S.teams[champ].cash+=prize;S.teams[champ].fin.other+=prize;}if(S.teams[runner]){S.teams[runner].cash+=Math.round(prize/3);S.teams[runner].fin.other+=Math.round(prize/3);}
  const uid=S.userTeamId;const sc=g=>`${futTeam(g.a).name} ${g.as}:${g.bs} ${futTeam(g.b).name}`;
  news(`[퓨처스] 챔피언결정전 — 준결승 ${sc(semi[0])}, ${sc(semi[1])} · 결승 ${sc(fin)} → ${ct.name} 우승${S.teams[champ]?` (상금 ${money(prize)})`:''}`,champ===uid||runner===uid||semi.some(g=>g.a===uid||g.b===uid)?'league':'sys');}
// 2군 집중 육성: 최대 3명. 2군 경기에 우선 출장(주전 몫)할 뿐 성장 포인트를 공짜로 주지 않는다 (출장이 늘어 성장 계수가 조금 오름)
function resFocusList(){const ut=userTeam();return ut.roster.concat(ut.dev).map(P_).filter(p=>p&&p.resFocus);}
function setResFocus(pid,on){const ut=userTeam();const p=P_(pid);if(!p||(!ut.roster.includes(pid)&&!ut.dev.includes(pid)))return '우리 구단 선수가 아닙니다.';
  if(!on){delete p.resFocus;delete p.wgoal;return null;}if(!reserveIds(ut).includes(pid))return '1군 주전·주요 투수는 이미 1군에서 뛰고 있어 2군 집중 대상이 아닙니다.';
  if(resFocusList().length>=3&&!p.resFocus)return '2군 집중 육성은 최대 3명까지입니다.';p.resFocus=true;return null;}
function resFocusWarn(){const L=resFocusList();const by={};for(const p of L){const k=isPitcher(p)?(p.pos==='SP'?'선발':'불펜'):p.pos;by[k]=(by[k]||0)+1;}
  const w=[];for(const k in by)if(by[k]>=2)w.push(`${POS_KO[k]||k} ${by[k]}명이 겹쳐 2군에서도 출장을 나눠 갖습니다`);for(const p of L)if(!reserveIds(userTeam()).includes(p.id))w.push(`${p.name}: 지금 1군 주전이라 2군 집중이 적용되지 않습니다`);return w;}
function reserveTable(){if(!S.res)return [];return futStand('N').concat(futStand('S')).map(x=>({...x,div:futDivOf(x.id)})).sort((a,b)=>b.pct-a.pct||b.w-a.w);}
function reserveSeasonEnd(s){for(const id in S.players){const p=S.players[id];if(!p.res)continue;const st=p.res;if(st.g||st.pG){p.rhist=(p.rhist||[]);const t=p.teamId!=null?S.teams[p.teamId]:null;p.rhist.push({s,tn:t?t.name:'-',st});while(p.rhist.length>((p.userLink||p.exUser)?4:1))p.rhist.shift();}delete p.res;p.resWeek=false;}
  const tb=reserveTable();S.resHist=S.resHist||[];if(S.res&&S.res.sched&&!S.res.post)futPost();const P=S.res&&S.res.post;const c=P?futTeam(P.champ):tb[0]&&tb[0].t;const cr=c&&S.res.rec[c.id];if(c)S.resHist.push({s,champ:c.name,w:cr?cr.w:0,l:cr?cr.l:0,runner:P?futTeam(P.runner).name:null,n1:P?futTeam(P.n1).name:null,s1:P?futTeam(P.s1).name:null,cid:c.id});if(S.resHist.length>20)S.resHist.shift();S.res=null;}


// ---------- 성장 원장 · 숨은 상한 · 생일 ----------
// 성장 원장: 우리 선수(연계 선수 포함)의 모든 성장 점검을 날짜별로 남긴다 (최근 160건)
function ledgerAdd(p,e){p.ledger=p.ledger||[];p.ledger.push(e);if(p.ledger.length>160)p.ledger.splice(0,p.ledger.length-160);}
function idHash(id,k){let x=(id*2654435761+k*40503)>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return (x>>>0)/4294967296;}
// 숨은 상한: 선수 id로 정해져 저장이 필요 없고 난수 흐름도 바꾸지 않는다. 잠재력 + 포지션 모양 ± 8, 지금 능력 + 3 이상
function capOf(p){if(p._cap)return p._cap;const keys=isPitcher(p)?PIT_KEYS:BAT_KEYS;const sh=POS_SHAPE[p.pos]||{};const c={};keys.forEach((k,i)=>{c[k]=clamp(Math.round(Math.max(p.attrs[k]+3,(p.pot||60)+(sh[k]||0)*0.6+(idHash(p.id,i+1)-0.5)*16)),20,99);});Object.defineProperty(p,'_cap',{value:c,enumerable:false,writable:true});return c;}
function nearCap(p){const c=capOf(p);return Object.keys(c).filter(k=>p.attrs[k]>=c[k]-2);}
// 생일: id로 정해짐. 나이는 KBO처럼 해가 바뀔 때(시즌 종료 뒤) 한 살씩, 생일은 표시와 축하 소식용
function bdOf(p){const m=1+Math.floor(idHash(p.id,77)*12);const dim=[31,28,31,30,31,30,31,31,30,31,30,31][m-1];return {m,d:1+Math.floor(idHash(p.id,78)*dim)};}
function dateOf(day){const G=BAL.SEASON_GAMES;const start=Date.UTC(2026,2,28),end=Date.UTC(2026,8,30);const t=new Date(start+(end-start)*Math.min(1,Math.max(0,(day-1)/Math.max(1,G-1))));return {m:t.getUTCMonth()+1,d:t.getUTCDate()};}
function bdayTick(day){const a=dateOf(day),b=day>1?dateOf(day-1):{m:a.m,d:a.d-1};const ut=userTeam();for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(!p)continue;const bd=bdOf(p);const v=bd.m*100+bd.d,lo=b.m*100+b.d,hi=a.m*100+a.d;if(v>lo&&v<=hi){p.morale=Math.min(100,(p.morale||60)+3);news(`[생일] ${p.name} ${bd.m}월 ${bd.d}일 생일 — 선수단이 축하했습니다`,'n');}}}
// ---------- 단기 목표 (2군 집중 육성 선수에게 코치가 주는 주간 목표) ----------
const WGOAL={hits:{t:n=>`2군 안타 ${n}개`,a:'contact',v:st=>st.h},onb:{t:n=>`2군 출루 ${n}번`,a:'eye',v:st=>st.h+st.bb},hr:{t:n=>`2군 홈런 ${n}개`,a:'power',v:st=>st.hr},inn:{t:n=>`2군 ${n}이닝 이상 · 평균자책 4.50 이하`,a:'stamina',v:st=>Math.floor(st.pOuts/3),ok:(st,b)=>((st.pER-b.pER)*27/Math.max(1,st.pOuts-b.pOuts))<=4.5},k:{t:n=>`2군 탈삼진 ${n}개`,a:'stuff',v:st=>st.pSO}};
function wgoalNew(p,d){const per=7*futGames()/BAL.SEASON_GAMES;const isP=isPitcher(p);let kind,n;
  if(isP){kind=p.pos==='SP'?(rnd()<0.5?'inn':'k'):'k';n=kind==='inn'?Math.max(3,Math.round(per*(p.pos==='SP'?1.1:0.45))):Math.max(2,Math.round(per*(p.pos==='SP'?0.9:0.4)*(0.7+(p.attrs.stuff-50)*0.012)));}
  else{const r=rnd();kind=p.attrs.power>=58&&r<0.35?'hr':r<0.7?'hits':'onb';const pa=per*4.3;n=kind==='hr'?1:kind==='hits'?Math.max(2,Math.round(pa*0.27)):Math.max(3,Math.round(pa*0.36));}
  p.wgoal={s:S.season,from:d,kind,n,base:Object.assign(newStat(),p.res||{}),text:WGOAL[kind].t(n)};}
function wgoalTick(d){const ut=userTeam();for(const p of resFocusList()){if(!reserveIds(ut).includes(p.id)){delete p.wgoal;continue;}const g=p.wgoal;
  if(g&&g.s===S.season&&d-g.from>=7){const st=Object.assign(newStat(),p.res||{});const W=WGOAL[g.kind];const got=W.v(st)-W.v(g.base);const ok=got>=g.n&&(!W.ok||W.ok(st,g.base));
    p.wgoals=(p.wgoals||[]).concat({s:S.season,d,text:g.text,got,ok});if(p.wgoals.length>12)p.wgoals.shift();
    if(ok){const k=W.a;const add=0.4;p.attrs[k]=Math.min(99,r1(p.attrs[k]+add));ledgerAdd(p,{s:S.season,l:`${S.season}시즌 ${d}일차`,d:r1(add/(isPitcher(p)?4:6)),o:r1(calcOvr(p)),c:{[k]:add},f:[`단기 목표 달성 (${g.text})`]});news(`[단기 목표] ${p.name} 「${g.text}」 달성 (${got}) — ${ATTR_KO[k]} +${add}`,'contract');}
    else news(`[단기 목표] ${p.name} 「${g.text}」 미달 (${got})`,'n');delete p.wgoal;}
  if(!p.wgoal&&S.phase==='season'&&d<BAL.SEASON_GAMES-3)wgoalNew(p,d);}}
// ---------- 구단 도전과제 (보상은 칭호·기록실 표시만) ----------
const ACH=[['w1','첫 승','정규 시즌 첫 승리'],['season','한 시즌 완주','정규 시즌을 끝까지 치름'],['st5','5연승','정규 시즌 5연승'],['st10','10연승','정규 시즌 10연승'],['sho','완봉승','상대를 0점으로 막고 승리'],['big','대승','10점 차 이상 승리'],['ouch','대패','10점 차 이상 패배 (기록은 기록)'],['ps','가을야구','포스트시즌 진출'],['ks','한국시리즈','한국시리즈 진출'],['champ','우승','한국시리즈 우승'],['as3','올스타 사관학교','올스타 3명 이상 배출'],['asmvp','별 중의 별','우리 선수가 올스타전 MVP'],['fut','퓨처스 제패','퓨처스 챔피언결정전 우승'],['trade','첫 트레이드','선수 교환 트레이드 성사'],['fgn','외국인 지명','외국인 선수 지명'],['r1','1라운드 계약','드래프트 1라운드 지명 선수와 계약'],['abroad','해외로','우리가 키운 선수가 해외 진출'],['wgoal','작은 목표','단기 목표 5번 달성'],['farmA','팜 A등급','팜 등급 A 달성'],['black','흑자 경영','시즌 결산 흑자']];
function achGet(k){S.ach=S.ach||{};if(S.ach[k])return;S.ach[k]={s:S.season,d:S.phase==='season'?S.day:'OFF'+S.week};const a=ACH.find(x=>x[0]===k);if(a)news(`[도전과제] 「${a[1]}」 달성 — ${a[2]}`,'league');}
function achCheck(){const ut=userTeam();if(!ut||ut.league!=='KR')return;S.ach=S.ach||{};
  if(S.phase==='season'){if(ut.rec.w>=1)achGet('w1');const sk=teamStreak(ut);if(sk.win&&sk.n>=5)achGet('st5');if(sk.win&&sk.n>=10)achGet('st10');
    const g=S.schedule.filter(x=>x.res&&!x.post&&(x.home===ut.id||x.away===ut.id)).sort((a,b)=>b.day-a.day)[0];if(g&&g.day===S.day){const us=g.home===ut.id?g.res.hs:g.res.as,th=g.home===ut.id?g.res.as:g.res.hs;if(us>th&&th===0)achGet('sho');if(us-th>=10)achGet('big');if(th-us>=10)achGet('ouch');}
    if(S.post&&S.post.s===S.season&&postReach(S.post)&&postReach(S.post)[ut.id])achGet('ps');}
  const A=S.allstar;if(A&&A.s===S.season){const mine=['blue','red'].flatMap(k=>A.squads[k].best.concat(A.squads[k].picks)).filter(x=>x.tid===ut.id).length;if(mine>=3)achGet('as3');if(A.game.mvp&&P_(A.game.mvp)&&P_(A.game.mvp).teamId===ut.id)achGet('asmvp');}
  const ws=Object.values(S.players).reduce((a,p)=>a+((p.wgoals||[]).filter(x=>x.ok).length),0);if(ws>=5)achGet('wgoal');if(farmGrade(ut).g==='A')achGet('farmA');}
function achList(){S.ach=S.ach||{};return ACH.map(([k,t,d])=>({k,t,d,got:S.ach[k]||null}));}
// ---------- 팜 등급 (EA: FARM 등급) — 유소년 시설·스카우트 조직·육성 코치를 묶은 등급 ----------
function farmGrade(t){const y=t.fac?t.fac.youth:1,sc=t.fac?t.fac.scout:1;const dv=t.staff?staffP(t,'dev'):0;const pts=(y-1)*14+(sc-1)*9+dv*30+4;const g=pts>=50?'A':pts>=32?'B':pts>=16?'C':pts>=6?'D':'E';return {g,pts:Math.round(pts),parts:[['유소년 시설',`Lv.${y}`],['스카우트 조직',`Lv.${sc}`],['육성 코치',dv>=1.2?'뛰어남':dv>=0.6?'보통':dv>0?'약함':'없음']]};}
// ---------- 재계약 일괄 (EA: 계약 안 한 선수 일괄 계약) ----------
function renewDemandOf(p){const ut=userTeam();let dem=Math.max(salaryFor(p),(p.contract?p.contract.salary:0)*1.05);if(calcOvr(p)>=68&&presOf(ut)<22&&p.age<=29)dem*=1.25;if(p.age>=33)dem*=0.85;if(p.grudge)dem*=1.15;return Math.round(dem/10)*10;}
function renewAll(){const ut=userTeam();const out=[];for(const pid of [...S.pendingFA]){const p=P_(pid);if(!p||p.teamId!==ut.id||p.grudge)continue;const sal=renewDemandOf(p);const yrs=isFgn(p)?1:p.age>=32?1:2;p.contract={salary:sal,years:yrs};p.renewed=S.season;S.pendingFA=S.pendingFA.filter(x=>x!==pid);out.push(`${p.name} ${yrs}년 ${money(sal)}`);}
  if(out.length)news(`일괄 재계약 (요구액 그대로): ${out.join(', ')}`,'contract');return out;}

// ---------- 해외 하부 리그 (미국 2군·3군, 일본 2군) ----------
// 하부 리그는 팀·일정을 따로 만들지 않는다. 해외 구단 안에서 같은 유형(야수/투수) 13위 밖이면 하부로 내려가 하부 수준에서 꾸준히 뛴다
function farmKo(lg,tier){const F=(BAL.FARM[lg]||[]).find(x=>x.t===tier);return tier===1?(lg==='US'?'메이저리그':BAL.LEAGUES[lg]?BAL.LEAGUES[lg].short+' 1군':'1군'):(F?F.ko:'하부');}
function farmTierOf(p,t){const F=BAL.FARM[t.league];if(!F)return 1;const same=t.roster.map(P_).filter(x=>x&&!x.retired&&isPitcher(x)===isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));const k=same.findIndex(x=>x.id===p.id);const rank=k<0?same.filter(x=>calcOvr(x)>calcOvr(p)).length:k;
  if(rank<13)return 1;if(F.length===1)return F[0].t;return calcOvr(p)>=F[0].lvl-3?F[0].t:F[1].t;}
// 시즌 중간·끝에 우리 출신 선수의 승격·강등을 소식으로 알린다
function farmCheck(){for(const t of overseasTeams()){if(!BAL.FARM[t.league])continue;for(const id of t.roster){const p=P_(id);if(!p||p.retired)continue;const nt=farmTierOf(p,t);const old=p.tier||1;
  if(nt!==old&&(p.userLink||p.exUser)){if(nt<old)news(`[해외] ${p.name} ${farmKo(t.league,nt)} 콜업! (${t.name} · ${farmKo(t.league,old)}에서 승격)`,'alumni');else news(`[해외] ${p.name}, ${farmKo(t.league,nt)}로 내려갔습니다 (${t.name})`,'overseas');}
  if(nt>1)p.tier=nt;else delete p.tier;}}}

// ---------- 볼 만한 경기 (관전 정지 조건) ----------
// 오늘 우리 경기에 「보고 싶은 순간」이 있으면 이유를 돌려준다. 자동 진행은 설정에 따라 여기서 멈춘다
const WATCH_KO={pin:'관심 선수',rookie:'신인 첫 1군 출전',role:'새 역할 첫 경기',race:'순위 경쟁',alumni:'판매한 선수와 맞대결'};
function watchReasons(){const g=userGameToday();if(!g||g.res||S.phase!=='season')return [];const ut=userTeam();const opp=S.teams[g.home===ut.id?g.away:g.home];const out=[];
  const starters=new Set(ut.lineup.concat([ut.rotation[ut.rotIdx%Math.max(1,ut.rotation.length)]]));
  for(const id of S.pins||[]){const p=P_(id);if(p&&p.teamId===ut.id&&starters.has(id)&&!(isPitcher(p)?p.cur.pGS:p.cur.g)){out.push({k:'pin',text:`관심 선수 ${p.name} 이번 시즌 첫 ${isPitcher(p)?'선발 등판':'선발 출전'}`});break;}}   // 매일 뛰는 주전이면 멈추지 않게: 시즌 첫 선발만
  for(const id of ut.roster){const p=P_(id);if(!p||p.deb||p.age>25)continue;if(starters.has(id)||(isPitcher(p)&&ut.bullpen.slice(0,6).includes(id))){out.push({k:'rookie',text:`${p.name} 1군 데뷔 가능`});break;}}
  for(const id of ut.lineup){const p=P_(id);if(p&&p.posTrain==null&&p.lastPos&&p.lastPos!==ut.pos[id]&&p.lastPos!=='-'){out.push({k:'role',text:`${p.name} ${POS_KO[ut.pos[id]]||ut.pos[id]} 첫 경기`});break;}}
  {const sp=P_(ut.rotation[ut.rotIdx%Math.max(1,ut.rotation.length)]);if(sp&&sp.lastPos==='RP'&&!out.some(x=>x.k==='role'))out.push({k:'role',text:`${sp.name} 불펜 → 선발 첫 등판`});}
  if(S.day>=BAL.SEASON_GAMES*0.6&&!g.post){const st=standings(compOf(ut));const r=st.findIndex(t=>t.id===ut.id),o=st.findIndex(t=>t.id===opp.id);if(r>=0&&o>=0){const gb=Math.abs((st[r].rec.w-st[r].rec.l)-(st[o].rec.w-st[o].rec.l))/2;if((r<=5||o<=5)&&Math.abs(r-o)<=2&&gb<=2)out.push({k:'race',text:`${r+1}위 vs ${o+1}위 (${gb}경기 차)`});}}
  const al=opp.roster.map(P_).find(p=>p&&p.exUser&&opp.lineup.concat(opp.rotation).includes(p.id));if(al)out.push({k:'alumni',text:`옛 제자 ${al.name}(${opp.name.split(' ').pop()})와 맞대결`});
  return out;}
// ---------- 성장 단계 사건: 첫 선발·첫 승·첫 세이브 (우리 선수, 데뷔 이후) ----------
function careerMs(p,b,lg){if(p.teamId!==S.userTeamId)return;{const side=lg.home===S.userTeamId?1:0;const ps=lg.pos&&lg.pos[side]&&lg.pos[side][p.id];p.lastPos=ps||(b.pGS?'SP':b.pG?'RP':p.lastPos);}if(!p.deb)return;p.ms=p.ms||{};const opp=S.teams[lg.home===S.userTeamId?lg.away:lg.home];const vs=opp?opp.name.split(' ')[0]:'';
  if(b.pGS&&!p.ms.gs1){p.ms.gs1={s:S.season,d:S.day};news(`[첫 선발] ${p.name}, ${vs}전 1군 첫 선발 등판 — ${Math.floor(b.pOuts/3)}이닝 ${b.pR}실점`,'growth');}
  if(b.pW&&!p.ms.w1){p.ms.w1={s:S.season,d:S.day};news(`[첫 승] ${p.name}, ${vs}전에서 1군 첫 승리!`,'growth');}
  if(b.pSV&&!p.ms.sv1){p.ms.sv1={s:S.season,d:S.day};news(`[첫 세이브] ${p.name}, ${vs}전 1군 첫 세이브`,'growth');}}
// ---------- 첫 관심 선수 고르기 (처음 10분: 고르고 → 훈련 정하고 → 지켜보고 → 첫 점검에서 결과 확인) ----------
function firstPickCands(){const ut=userTeam();return ut.roster.concat(ut.dev).map(P_).filter(p=>p&&p.age<=25&&!isFgn(p)).map(p=>{const dg=diagnose(p);return {p,dg,room:(p.scout?p.scout.est:p.pot)-calcOvr(p)};}).sort((a,b)=>b.room-a.room).filter((x,i,a)=>a.findIndex(y=>isPitcher(y.p)===isPitcher(x.p))===i||i<4).slice(0,3);}
function firstPick(pid,focus){const ut=userTeam();const p=P_(pid);if(!p||(!ut.roster.includes(pid)&&!ut.dev.includes(pid)))return '우리 선수가 아닙니다.';p.focus=focus||'balance';S.pins=S.pins||[];if(!S.pins.includes(pid))S.pins.unshift(pid);
  if(reserveIds(ut).includes(pid)&&resFocusList().length<3)setResFocus(pid,true);S.firstPick={pid,s:S.season,d:S.day,focus:p.focus,ovr:r1(calcOvr(p)),attrs:JSON.parse(JSON.stringify(p.attrs)),seen:false};return null;}
function firstPickResult(){const F=S.firstPick;if(!F)return null;const p=P_(F.pid);if(!p)return null;const L=(p.ledger||[]).filter(e=>e.s===F.s&&!/동계|겨울/.test(e.l));if(!L.length)return {p,F,pending:true,next:nextCheck()};const e=L[0];
  const fk=F.focus!=='balance'?F.focus:null;const fd=fk?r1(p.attrs[fk]-F.attrs[fk]):null;return {p,F,e,fk,fd,d:r1(calcOvr(p)-F.ovr)};}
// ---------- 선수 교환 트레이드 (EA 2011의 「가치 비교 + 거절 이유」를 우리 식으로) ----------
// 유저가 국내 AI 구단에 제안 → AI는 운영 목표(우승 도전·리빌딩 등)에 맞춰 가치를 따지고, 포지션 공백·인원·외국인 정원도 확인. 거절하면 이유를 문장으로 알려 준다
function tradeDeadline(){return dayAt(0.7);}
function tradeOpen(){return S.phase==='offseason'||S.day<=tradeDeadline();}
function tradeVal(t,p){const a=aimOf(t)||'race';let v=calcValue(p);const ovr=calcOvr(p);const lvl=levelOf(t);
  if(a==='contend')v*=ovr>=lvl?1.15:0.9;else if(a==='rebuild')v*=p.age<=24?1.25:p.age>=30?0.75:1;else if(a==='money')v*=p.contract?clamp(1.1-p.contract.salary/Math.max(1,calcValue(p))*0.8,0.7,1.1):1;
  if(p.age<=23&&a!=='contend')v*=1.08;return v;}   // 도움말: 연차가 적은 유망주는 트레이드 시장에서 환영받는다
function tradeCore(t){return t.roster.map(P_).filter(Boolean).sort((a,b)=>calcValue(b)-calcValue(a)).slice(0,2).map(p=>p.id);}
function tradeEval(tid,give,get,cash){const t=S.teams[tid];const ut=userTeam();cash=Math.max(0,Math.round(+cash||0));const G=give.map(P_).filter(Boolean),R=get.map(P_).filter(Boolean);const why=[];
  if(!t||t.league!=='KR'||t.isUser)return {ok:false,why:['국내 AI 구단과만 트레이드할 수 있습니다.']};
  if(!tradeOpen())return {ok:false,why:[`트레이드 마감(${tradeDeadline()}일차)이 지났습니다. 시즌이 끝나면 다시 열립니다.`]};
  if(!G.length||!R.length)return {ok:false,why:['주고받을 선수를 한 명 이상씩 고르세요.']};if(G.length>3||R.length>3)return {ok:false,why:['한 번에 3명까지 주고받을 수 있습니다.']};
  if(G.some(p=>p.teamId!==ut.id||p.loan)||R.some(p=>p.teamId!==tid||p.loan))return {ok:false,why:['임대 중이거나 소속이 맞지 않는 선수가 있습니다.']};
  if(cash>ut.cash)return {ok:false,why:['얹어 줄 현금이 부족합니다.']};
  const key='trade'+tid+':'+S.clock;const used=(S.market.attempts[key]||0);if(used>=3)return {ok:false,why:[`${t.name}: 오늘은 더 이상 트레이드 이야기를 하지 않겠답니다 (하루 3번).`]};
  // 인원·포지션·외국인 정원 (EA: 타자 9명·투수 6명 미만, 포지션 공백이면 실패 → 우리는 1군 최소 인원 규칙으로)
  const after=(team,out,inn)=>{const ids=team.roster.filter(id=>!out.some(p=>p.id===id)).concat(inn.map(p=>p.id));const ps=ids.map(P_);const pit=ps.filter(isPitcher).length;return {n:ids.length,pit,bat:ids.length-pit,c:ps.filter(p=>p.pos==='C').length,ps};};
  const A=after(t,R,G),U=after(ut,G,R);
  if(A.pit<BAL.MIN_PITCHERS)why.push(`${t.name}의 투수가 ${A.pit}명이 되어 모자랍니다 (최소 ${BAL.MIN_PITCHERS}명).`);if(A.bat<10)why.push(`${t.name}의 야수가 ${A.bat}명이 되어 모자랍니다 (최소 10명).`);if(A.c<1)why.push(`${t.name}에 포수가 없어집니다 — 포지션 문제로 불가능.`);
  if(A.n>BAL.MAX_ROSTER)why.push(`${t.name}의 1군 정원(${BAL.MAX_ROSTER}명)을 넘습니다.`);
  if(U.pit<BAL.MIN_PITCHERS||U.bat<10||U.c<1)why.push(`우리 팀이 ${U.c<1?'포수 없이':U.pit<BAL.MIN_PITCHERS?`투수 ${U.pit}명으로`:`야수 ${U.bat}명으로`} 남게 됩니다.`);if(U.n>BAL.MAX_ROSTER)why.push(`우리 1군 정원(${BAL.MAX_ROSTER}명)을 넘습니다.`);
  {const tf=fgnList(t).filter(p=>!R.includes(p)).map(p=>({p,sal:p.contract?p.contract.salary:0})).concat(G.filter(isFgn).map(p=>({p,sal:p.contract?p.contract.salary:0})));if(G.some(isFgn)&&!fgnFits(tf))why.push(`${t.name}의 외국인 정원이 넘칩니다.`);
    const uf=fgnList(ut).filter(p=>!G.includes(p)).map(p=>({p,sal:p.contract?p.contract.salary:0})).concat(R.filter(isFgn).map(p=>({p,sal:p.contract?p.contract.salary:0})));if(R.some(isFgn)&&!fgnFits(uf))why.push('우리 외국인 정원이 넘칩니다.');}
  // 받는 쪽 포지션 공백: 그 포지션 선수를 다 내주고 받는 선수 중 대체가 없으면
  for(const p of R){if(isPitcher(p))continue;const left=A.ps.filter(x=>x.pos===p.pos).length;if(left===0&&!['DH'].includes(p.pos))why.push(`${t.name}에 ${POS_KO[p.pos]||p.pos}가 남지 않습니다 — 포지션 문제로 어렵답니다.`);}
  const core=tradeCore(t);const cp=R.filter(p=>core.includes(p.id));if(cp.length&&aimOf(t)!=='rebuild')why.push(`${cp.map(p=>p.name).join('·')}${josa(cp[cp.length-1].name,'은','는').slice(cp[cp.length-1].name.length)} 팀의 핵심 선수라 내줄 수 없답니다.`);
  const vGet=G.reduce((a,p)=>a+tradeVal(t,p),0)+cash*(aimOf(t)==='money'?1.3:1),vGive=R.reduce((a,p)=>a+tradeVal(t,p),0);const need=vGive*(1.08+(R.length>G.length?0.04:0));
  const ratio=vGive?vGet/vGive:9;if(vGet<need)why.push(`손해를 본다고 생각합니다 — 그쪽 판단으로 받는 가치가 내주는 가치의 ${Math.round(ratio*100)}% (${Math.round(need/Math.max(1,vGive)*100)}% 이상이어야 응함). ${ratio<0.8?'가치 차이가 큽니다':'조금만 더 얹으면 됩니다'}.`);
  const hard=why.some(w=>!/손해를 본다고/.test(w));const chance=hard?0:Math.round(clamp(vGive?vGet/need:1,0,1)*100);
  return {ok:!why.length,why,ratio,vGet,vGive,need,chance,hard,needPct:vGive?Math.round(need/vGive*100):0,aim:aimOf(t),tid,give:G.map(p=>p.id),get:R.map(p=>p.id),cash};}
function tradePropose(tid,give,get,cash){const e=tradeEval(tid,give,get,cash);const t=S.teams[tid];if(t&&e.why&&!/하루 3번|마감|국내 AI|고르세요|3명까지|소속|현금/.test(e.why.join(''))){const key='trade'+tid+':'+S.clock;S.market.attempts[key]=(S.market.attempts[key]||0)+1;}
  if(!e.ok)return {ok:false,msg:`${t?t.name:'상대'} 거절: ${e.why[0]}`,why:e.why,ev:e};const ut=userTeam();
  for(const id of e.give){const p=P_(id);const c={...p.contract};S.market.listed=S.market.listed.filter(x=>x!==id);removeFromTeam(ut,p);addToTeam(p,t,c);p.transfers.push({s:S.season,from:ut.name,to:t.name,fee:0,kind:'트레이드'});p.exUser=true;p.coached=true;}
  for(const id of e.get){const p=P_(id);const c={...p.contract};removeFromTeam(t,p);addToTeam(p,ut,c);p.transfers.push({s:S.season,from:t.name,to:ut.name,fee:0,kind:'트레이드'});p.userLink=true;p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs)),role:'트레이드 영입'};p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist=p.valHist||[];p.valHist.push([S.season,calcValue(p)]);}
  if(e.cash){ut.cash-=e.cash;ut.fin.buys+=e.cash;t.cash+=e.cash;t.fin.sales+=e.cash;}
  achGet('trade');autoLineup(t);fixLineup(ut);const gn=e.give.map(id=>P_(id).name).join('·'),rn=e.get.map(id=>P_(id).name).join('·');
  news(`[트레이드] ${ut.name} ${gn}${e.cash?` + 현금 ${money(e.cash)}`:''} ↔ ${t.name} ${rn}`,'contract');return {ok:true,msg:`트레이드 성사: ${gn} ↔ ${rn}`,ev:e};}
// ---------- 포지션·역할 전환 ----------
// 새 포지션을 훈련하는 동안(경기일·겨울 주 단위로 줄어듦) 수비 불이익이 점점 줄고, 끝나면 주 포지션이 바뀌고 예전 포지션은 부포지션(불이익 3)
function convDays(p,to){if(isPitcher(p))return p.pos==='SP'&&to==='RP'?5:14;return Math.max(5,posPenalty({...p,pos2:null,posTrain:null},to)+2);}
function convOpts(p){if(isPitcher(p))return [p.pos==='SP'?'RP':'SP'].map(to=>({to,days:convDays(p,to),warn:to==='SP'&&p.attrs.stamina<50?`체력 ${Math.round(p.attrs.stamina)} — 선발로는 긴 이닝이 어렵습니다`:null}));
  return ['C','1B','2B','3B','SS','LF','CF','RF','DH'].filter(x=>x!==p.pos).map(to=>({to,days:convDays(p,to),warn:to==='C'&&p.attrs.defense<55?'수비력이 낮아 포수 전환 뒤에도 실책이 잦을 수 있습니다':(['SS','CF'].includes(to)&&p.attrs.speed<50?'발이 느려 수비 범위가 좁습니다':null)}));}
function startConv(pid,to){const p=P_(pid);const ut=userTeam();if(!p||(!ut.roster.includes(pid)&&!ut.dev.includes(pid)))return '우리 선수가 아닙니다.';if(to===p.pos)return '이미 그 포지션입니다.';
  if(isPitcher(p)!==['SP','RP'].includes(to))return '투수는 투수 역할끼리, 야수는 야수 포지션끼리만 바꿀 수 있습니다.';const days=convDays(p,to);p.posTrain={from:p.pos,to,left:days,total:days,s:S.season};news(`${p.name} ${POS_KO[to]||to} 전환 훈련 시작 (약 ${days}일)`,'contract');return null;}
function cancelConv(pid){const p=P_(pid);if(p&&p.posTrain){delete p.posTrain;return null;}return '전환 훈련 중이 아닙니다.';}
function convTick(days){for(const t of krTeams()){if(!t.isUser)continue;for(const id of t.roster.concat(t.dev)){const p=P_(id);if(!p||!p.posTrain)continue;p.posTrain.left-=days;
  if(p.posTrain.left<=0){const T=p.posTrain;delete p.posTrain;if(!isPitcher(p))p.pos2=T.from;p.pos=T.to;if(t.pos&&t.pos[id]===T.from&&!isPitcher(p))t.pos[id]=T.to;if(T.to==='RP')p.rpLock=S.season;if(T.to==='SP')delete p.rpLock;if(T.to==='RP'&&t.rotation.includes(id)){t.rotation=t.rotation.filter(x=>x!==id);if(!t.bullpen.includes(id))t.bullpen.push(id);}if(T.to==='SP'&&t.rotation.length<5&&!t.rotation.includes(id)){t.bullpen=t.bullpen.filter(x=>x!==id);if(t.closer===id)t.closer=null;t.rotation.push(id);}fixLineup(t);news(`${p.name} ${POS_KO[T.to]||T.to} 전환 완료${!isPitcher(p)?` — ${POS_KO[T.from]||T.from}는 부포지션으로 남습니다`:''}`,'contract');}}}}
// ---------- 외국인 선수 (KBO 2026 규정: 외국인 3명 + 아시아쿼터 1명, 넷 다 출전 가능) ----------
// 아시아쿼터 = 일본·대만·호주 국적, 연봉 20만 달러(약 2.8억) 이하. 외국인 계약은 1년. 겨울 3주차에 「외국인 선수 지명」(하위 팀부터)
const ASIA_NAT=['JP','TW','AU'];
function isFgn(p){return !!(p&&p.nat&&p.nat!=='KR');}
// 리그별 외국인 규정 — 한국: 외국인 3명 + 아시아쿼터 1명 / 일본: 1군 등록 4명까지(투수·야수 어느 한쪽만 4명은 안 됨, 2군은 제한 없음) / 대만: 구단당 4명 / 미국: 제한 없음
const LG_NAT={KR:'KR',JP:'JP',TW:'TW',US:'US'};
function isFgnIn(p,lg){return !!(p&&p.nat&&LG_NAT[lg]&&p.nat!==LG_NAT[lg]);}
function fgnRuleText(lg){return lg==='JP'?'1군 등록 외국인 4명까지 (투수 또는 야수만 4명은 안 됨) · 2군(육성군)은 제한 없음':lg==='TW'?'구단당 외국인 4명까지':lg==='US'?'외국인 제한 없음':`외국인 ${BAL.FGN.max}명 + 아시아쿼터 1명`;}
// 일본 1군 외국인 4명 규정: 넘치면 실력이 낮은 쪽부터 2군(육성군)으로
function fgnActiveFix(t){if(t.league!=='JP')return [];const moved=[];const on=()=>t.roster.map(P_).filter(p=>p&&isFgnIn(p,'JP'));
  for(let g=0;g<10;g++){const L=on();const np=L.filter(isPitcher).length,nb=L.length-np;if(L.length<=4&&np<=3&&nb<=3)break;const pool=L.length>4?L:np>3?L.filter(isPitcher):L.filter(p=>!isPitcher(p));const w=pool.sort((a,b)=>calcOvr(a)-calcOvr(b))[0];if(!w)break;
    t.roster=t.roster.filter(x=>x!==w.id);t.dev=t.dev||[];t.dev.push(w.id);moved.push(w.name);}
  return moved;}
function fgnList(t){return t.roster.concat(t.dev||[]).map(P_).filter(isFgn);}
function asiaOk(p,sal){return ASIA_NAT.includes(p.nat)&&(sal!=null?sal:(p.contract?p.contract.salary:0))<=BAL.FGN.asiaCap;}
function fgnFits(list){if(list.length<=BAL.FGN.max)return true;if(list.length>BAL.FGN.max+1)return false;return list.some(x=>asiaOk(x.p,x.sal));}
function fgnBlock(t,p,sal){if(t&&t.league==='TW'&&isFgnIn(p,'TW')){const n=t.roster.concat(t.dev||[]).map(P_).filter(x=>x&&x.id!==p.id&&isFgnIn(x,'TW')).length;return n>=4?'대만 프로야구는 구단당 외국인 4명까지입니다.':null;}if(!t||t.league!=='KR'||!isFgn(p))return null;const cur=fgnList(t).filter(x=>x.id!==p.id).map(x=>({p:x,sal:x.contract?x.contract.salary:0}));if(fgnFits(cur.concat({p,sal:sal||0})))return null;
  return `외국인 선수 정원이 찼습니다 (외국인 ${BAL.FGN.max}명 + 아시아쿼터 1명. 아시아쿼터는 일본·대만·호주 국적, 연봉 ${money(BAL.FGN.asiaCap)} 이하).`;}
// 정원 현황: 아시아쿼터 자격자 중 연봉이 가장 낮은 1명을 쿼터로 본다
function fgnStatus(t){const L=fgnList(t);const q=L.filter(p=>asiaOk(p)).sort((a,b)=>(a.contract?a.contract.salary:0)-(b.contract?b.contract.salary:0));const quota=q[0]||null;
  const gen=L.filter(p=>p!==quota);return {list:L,gen,quota,genFree:Math.max(0,BAL.FGN.max-gen.length),quotaFree:!quota,over:!fgnFits(L.map(p=>({p,sal:p.contract?p.contract.salary:0})))};}
function fgnGen(lg,o){const nat=o.asia?pick(ASIA_NAT):pick(['US','US','US','MX','CB']);const p=genPlayer({pos:o.pos,lvl:lg,nat,age:o.age||ri(25,31),conf:o.conf});return p;}
function fgnSalary(p,asia){return asia?Math.min(BAL.FGN.asiaCap,Math.max(BAL.SALARY_MIN*2,Math.round(salaryFor(p)*0.9/10)*10)):clamp(Math.round(salaryFor(p)*BAL.FGN.genMul/100)*100,BAL.FGN.genMin,BAL.FGN.genMax);}
function createFDraft(){const ut=userTeam();const pool=[];const sfx=staffFx(ut);const conf=clamp(0.25+ut.fac.scout*0.05+sfx.conf,0.1,0.8);const L=BAL.LEVEL_OVR.KR1;
  for(let i=0;i<BAL.FGN.poolGen;i++){const pos=rnd()<0.6?'SP':pick(['1B','LF','RF','DH','3B','CF']);const p=fgnGen(L+ri(0,6),{pos,conf});p.fask=fgnSalary(p,false);p.fdraft=true;registerPlayer(p);pool.push(p.id);}
  for(let i=0;i<BAL.FGN.poolAsia;i++){const pos=pick(['RP','RP','SP','2B','SS','CF']);const p=fgnGen(L-ri(0,4),{pos,conf,asia:true,age:ri(22,30)});p.fask=fgnSalary(p,true);p.fdraft=true;p.fasia=true;registerPlayer(p);pool.push(p.id);}
  const order=krTeams().sort((a,b)=>(b.lastRank||BAL.KR_TEAMS)-(a.lastRank||BAL.KR_TEAMS)||a.id-b.id).map(t=>t.id);
  S.fdraft={s:S.season,pool,order,round:0,idx:0,picks:[],done:false};news(`${S.season}시즌 외국인 선수 지명 시작 — 하위 순위 구단부터, 빈 외국인·아시아쿼터 자리가 있는 구단만 지명합니다.`,'sys');}
function fdAvail(){return S.fdraft?S.fdraft.pool.map(P_).filter(p=>p&&p.teamId==null):[];}
function fdNeeds(t){const st=fgnStatus(t);return st.list.length<BAL.FGN.max+1&&!st.over&&(st.genFree>0||st.quotaFree);}
function fdFits(t,p){return !fgnBlock(t,p,p.fask)&&t.roster.length<BAL.MAX_ROSTER;}
function fdCur(){const D=S.fdraft;if(!D||D.done)return null;return S.teams[D.order[D.idx]]||null;}
function fdNext(){const D=S.fdraft;D.idx++;if(D.idx>=D.order.length){D.idx=0;D.round++;}if(D.round>=BAL.FGN.rounds)fdEnd();}
function fdEnd(){const D=S.fdraft;D.done=true;for(const id of D.pool){const p=P_(id);if(p&&p.teamId==null&&!S.fa.includes(id))delete S.players[id];}const mine=D.picks.filter(x=>x.team===S.userTeamId&&x.pid);
  news(`외국인 선수 지명 종료. 우리 구단: ${mine.map(x=>{const p=P_(x.pid);return p?`${p.name}(${NAT_KO[p.nat]||p.nat}${p.fasia?' · 아시아쿼터':''})`:'';}).filter(Boolean).join(', ')||'지명 없음'}`,'sys');}
function fdSign(t,p){const sal=p.fask;addToTeam(p,t,{salary:sal,years:1});p.fdraft=false;const no=S.fdraft.picks.length+1;p.transfers.push({s:S.season,from:`${NAT_KO[p.nat]||p.nat} 리그`,to:t.name,fee:0,kind:`외국인 선수 지명${p.fasia?' (아시아쿼터)':''}`});
  if(t.isUser){p.userLink=true;p.joinClock=S.clock;p.joinSnap={s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs)),role:p.fasia?'아시아쿼터 외국인':'외국인 선수'};p.base=JSON.parse(JSON.stringify(p.attrs));p.valHist.push([S.season,calcValue(p)]);}
  S.fdraft.picks.push({team:t.id,pid:p.id,no,round:S.fdraft.round+1});return no;}
// AI: 빈자리가 있고 감당할 수 있으면 예상 실력이 리그 수준 이상인 선수를 지명, 아니면 넘김
function fdStep(){const D=S.fdraft;if(!D||D.done)return 'done';let guard=0;
  while(!D.done&&guard++<200){const t=fdCur();if(!t){fdEnd();break;}if(!fdNeeds(t)){fdNext();continue;}if(t.isUser)return 'user';
    const need=needOf(t);const c=fdAvail().filter(p=>fdFits(t,p)&&t.cash>p.fask*1.3).sort((a,b)=>(b.scout.est*0.6+calcOvr(b)*0.4+(need.includes(b.pos)?3:0)+rnd()*3)-(a.scout.est*0.6+calcOvr(a)*0.4+(need.includes(a.pos)?3:0)+rnd()*3));
    const p=c[0];if(p&&calcOvr(p)>=levelOf(t)-4){fdSign(t,p);t.cash-=0;autoLineup(t);}fdNext();}
  return D.done?'done':'ai';}
function fdPick(pid){const D=S.fdraft;const t=fdCur();if(!D||D.done||!t||!t.isUser)return {ok:false,msg:'우리 구단 차례가 아닙니다.'};
  if(pid==null){D.picks.push({team:t.id,pid:null,no:D.picks.length+1,pass:true,round:D.round+1});fdNext();fdStep();return {ok:true,msg:'이번 차례는 넘겼습니다.'};}
  const p=P_(pid);if(!p||p.teamId!=null||!D.pool.includes(pid))return {ok:false,msg:'지명할 수 없는 선수입니다.'};
  const fb=fgnBlock(t,p,p.fask);if(fb)return {ok:false,msg:fb};if(t.roster.length>=BAL.MAX_ROSTER)return {ok:false,msg:`1군 선수단이 가득 찼습니다 (최대 ${BAL.MAX_ROSTER}명).`};
  fdSign(t,p);fixLineup(t);achGet('fgn');news(`외국인 선수 지명: ${p.name} (${NAT_KO[p.nat]||p.nat} · ${POS_KO[p.pos]||p.pos}${p.fasia?' · 아시아쿼터':''}) 1년 ${money(p.fask)}`,'contract');fdNext();fdStep();return {ok:true,pid,msg:`${p.name} 선수를 지명했습니다. (1년, 연봉 ${money(p.fask)})`};}
function fdAuto(){const t=userTeam();let g=0;while(fdCur()===t&&g++<6){const c=fdAvail().filter(p=>fdFits(t,p)).sort((a,b)=>b.scout.est-a.scout.est)[0];if(c&&c.scout.est>=levelOf(t)-1&&t.cash>c.fask*2)fdPick(c.id);else fdPick(null);}}
function fdTurn(){const t=fdCur();return !!(t&&t.isUser&&fdNeeds(t));}
// ---------- 올스타전 ----------
// 시즌 55% 지점. 청팀·홍팀(국내 5개 구단씩). 베스트 12 = 팬 투표 70% + 선수단 투표 30% (KBO 방식), 이어 감독 추천 13명씩. 퓨처스 올스타전(북부 vs 남부)도 같은 날
const AS_SQUAD={blue:{name:'청팀',idx:[0,2,4,5,6]},red:{name:'홍팀',idx:[1,3,7,8,9]}};
const AS_SLOTS=[['SP','선발투수'],['RP','중간투수'],['CL','마무리투수'],['C','포수'],['1B','1루수'],['2B','2루수'],['3B','3루수'],['SS','유격수'],['OF','외야수'],['OF','외야수'],['OF','외야수'],['DH','지명타자']];
function asDay(){return dayAt(0.55);}
function asLg(){const pl=playLg();return pl&&['JP','US','TW'].includes(pl)?pl:'KR';}
function asTeams(lg){return lg==='KR'?krTeams():Object.values(S.teams).filter(t=>t.league===lg&&activeT(t));}
function asNames(lg){return lg==='JP'?{blue:'센트럴리그',red:'퍼시픽리그'}:lg==='US'?{blue:BAL.LEAGUES.US.conf[0],red:BAL.LEAGUES.US.conf[1]}:{blue:AS_SQUAD.blue.name,red:AS_SQUAD.red.name};}
function asSquadOf(t){if(t.league==='JP')return t.sub===0?'blue':'red';if(t.league==='US')return t.sub<3?'blue':'red';if(t.league==='TW'){const ids=asTeams('TW').map(x=>x.id).sort((a,b)=>a-b);return ids.indexOf(t.id)%2?'red':'blue';}const i=TEAM_NAMES.KR.findIndex(x=>x[0]===(t.orig||t.name));return AS_SQUAD.blue.idx.includes(i)?'blue':'red';}
function asPerf(p,ctx){return isPitcher(p)?pitWar(p.cur,ctx).war:batWar(p,p.cur,ctx).war;}
function asSlotOk(p,t,slot){if(slot==='SP')return p.pos==='SP'&&t.rotation.includes(p.id);if(slot==='CL')return t.closer===p.id;if(slot==='RP')return isPitcher(p)&&t.closer!==p.id&&!t.rotation.includes(p.id);
  if(isPitcher(p))return false;const fp=t.pos[p.id]||p.pos;if(slot==='OF')return ['LF','CF','RF'].includes(fp);if(slot==='DH')return true;return fp===slot;}
function allStar(){const d=S.day;const LG=asLg();const ctx=lgCtx(LG==='KR'?'KR1':LG);const gp=Math.max(1,Math.round(d*lgGames(LG)/BAL.SEASON_GAMES));const out={s:S.season,d,lg:LG,names:asNames(LG),squads:{},game:null,fut:null};
  const qual=p=>isPitcher(p)?(p.cur.pOuts||0)>=gp*0.5:(p.cur.pa||0)>=gp*1.6;
  for(const k of ['blue','red']){const teams=asTeams(LG).filter(t=>asSquadOf(t)===k);const pool=[];
    for(const t of teams)for(const id of t.roster){const p=P_(id);if(!p||p.loan&&p.loan.from===t.id)continue;const perf=asPerf(p,ctx);const fan=starScore(p,t)+(t.league==='KR'?presOf(t):60)*0.06+t.rep*0.04+perf*1.6+(p.age<=24?1.2:0)+gauss()*1.2;pool.push({p,t,perf,fan,q:qual(p)});}
    const used=new Set();const best=[];
    for(const [slot,ko] of AS_SLOTS){const c=pool.filter(x=>!used.has(x.p.id)&&asSlotOk(x.p,x.t,slot));const cq=c.filter(x=>x.q);const cs=(cq.length?cq:c);if(!cs.length)continue;
      const fMax=Math.max(...cs.map(x=>x.fan)),fMin=Math.min(...cs.map(x=>x.fan)),pMax=Math.max(...cs.map(x=>x.perf)),pMin=Math.min(...cs.map(x=>x.perf));
      const nz=(v,a,b)=>b>a?(v-a)/(b-a):0.5;for(const x of cs)x.tot=0.7*nz(x.fan,fMin,fMax)+0.3*nz(x.perf,pMin,pMax);cs.sort((a,b)=>b.tot-a.tot);const w=cs[0];used.add(w.p.id);
      best.push({slot,ko,pid:w.p.id,tid:w.t.id,fv:Math.round(Math.max(0.5,w.fan+8)*52000+rnd()*9000),pv:Math.round(40+nz(w.perf,pMin,pMax)*220+rnd()*20)});}
    // 감독 추천 13명: 기록 순 (투수 6 · 야수 7), 5개 구단 모두 1명 이상
    const rest=pool.filter(x=>!used.has(x.p.id)&&x.q).sort((a,b)=>(b.perf+b.fan*0.15)-(a.perf+a.fan*0.15));const picks=[];
    for(const t of teams)if(![...best.map(b=>b.tid),...picks.map(x=>x.t.id)].includes(t.id)){const x=rest.find(y=>y.t.id===t.id&&!picks.includes(y));if(x)picks.push(x);}
    for(const want of [[true,6],[false,7]]){for(const x of rest){if(picks.length>=13)break;if(picks.includes(x)||isPitcher(x.p)!==want[0])continue;if(picks.filter(y=>isPitcher(y.p)===want[0]).length>=want[1])continue;picks.push(x);}}
    for(const x of rest){if(picks.length>=13)break;if(!picks.includes(x))picks.push(x);}
    out.squads[k]={best,picks:picks.map(x=>({pid:x.p.id,tid:x.t.id}))};}
  // 경기: 두 팀 평균 실력 차이 + 축제 경기 특유의 큰 점수 변동. 결과·MVP 기록은 서로 맞게 만든다
  const sq=k=>out.squads[k].best.map(b=>b.pid).concat(out.squads[k].picks.map(x=>x.pid)).map(P_).filter(Boolean);const pw=k=>{const a=sq(k);return a.length?a.reduce((x,p)=>x+calcOvr(p),0)/a.length:60;};
  const db=pw('blue')-pw('red');let b=Math.max(0,Math.round(5+db*0.25+gauss()*2.6)),r=Math.max(0,Math.round(5-db*0.25+gauss()*2.6));if(b===r){if(rnd()<0.5)b++;else r++;}
  const win=b>r?'blue':'red';const runs=Math.max(b,r);const bats=sq(win).filter(p=>!isPitcher(p));const wt=bats.map(p=>Math.max(1,p.attrs.power*0.6+p.attrs.contact*0.4-40+rnd()*25));
  let mvp=bats[0];{let x=rnd()*wt.reduce((a,c)=>a+c,0);for(let i=0;i<bats.length;i++){x-=wt[i];if(x<=0){mvp=bats[i];break;}}}
  let line=null;if(mvp){const hr=runs>=2&&rnd()<0.6?(runs>=6&&rnd()<0.2?2:1):0;const h=Math.max(hr,ri(2,3));const ab=Math.max(h,ri(3,4));const rbi=Math.min(runs,hr+ri(hr?0:1,2));line={ab,h,hr,rbi,text:`${ab}타수 ${h}안타${hr?` ${hr}홈런`:''} ${rbi}타점`};}
  out.game={blue:b,red:r,win,mvp:mvp?mvp.id:null,mvpTid:mvp?mvp.teamId:null,line};
  // 퓨처스 올스타전: 북부 vs 남부, 2군 기록 상위 선수 (시민·군 팀은 이름 없는 선수라 제외)
  if(LG==='KR'&&S.res&&S.res.sched){const fp={N:[],S:[]};for(const t of krTeams()){const dv=futDivOf(t.id);for(const id of reserveIds(t)){const p=P_(id);if(!p||!p.res)continue;const v=isPitcher(p)?(p.res.pOuts>=9?(4.5-p.res.pER*27/p.res.pOuts)*Math.min(1,p.res.pOuts/60)+calcOvr(p)*0.03:-9):(p.res.pa>=12?(ops_(p.res)-0.7)*4*Math.min(1,p.res.pa/60)+calcOvr(p)*0.03:-9);if(v>-9)fp[dv].push({p,v});}}
    for(const k in fp)fp[k]=fp[k].sort((a,b)=>b.v-a.v).slice(0,14).map(x=>x.p.id);let n=Math.max(0,Math.round(4.5+gauss()*2.2)),so=Math.max(0,Math.round(4.5+gauss()*2.2));if(n===so){if(rnd()<0.5)n++;else so++;}
    const fw=n>so?'N':'S';const fb=fp[fw].map(P_).filter(p=>p&&!isPitcher(p));out.fut={N:fp.N,S:fp.S,n,s:so,mvp:fb.length?pick(fb).id:null};}
  S.allstar=out;const all=new Set([...sq('blue'),...sq('red')].map(p=>p.id));
  for(const id of all){const p=P_(id);p.as=(p.as||[]).concat(S.season);p.ms=p.ms||{};p.ms.as={s:S.season,d,n:p.as.length};}
  for(const pid in S.players){const p=S.players[pid];if(p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league===(LG==='KR'?'KR':LG))p.fatigue=Math.max(0,(p.fatigue||0)-25);}   // 올스타 휴식기
  for(const k of ['blue','red']){for(const b of out.squads[k].best){const q=P_(b.pid);if(q)q.asel=(q.asel||[]).concat([{s:S.season,b:1,lg:LG,ko:b.ko}]).slice(-25);}for(const x of out.squads[k].picks){const q=P_(x.pid);if(q)q.asel=(q.asel||[]).concat([{s:S.season,lg:LG}]).slice(-25);}}
  const ut=userTeam();const mine=[...all].map(P_).filter(p=>p.teamId===ut.id);const bestMine=['blue','red'].flatMap(k=>out.squads[k].best).filter(b=>b.tid===ut.id);
  if(ut.league===LG||(LG==='KR'&&ut.league==='KR'))ut.rep=clamp(ut.rep+Math.min(2,bestMine.length*0.5),5,100);
  const nm=k=>out.names[k];const mv=out.game.mvp?P_(out.game.mvp):null;
  news(`[올스타] 베스트 12 발표 (팬 투표 70% + 선수단 투표 30%) — 우리 구단 ${bestMine.length?bestMine.map(b=>`${P_(b.pid).name}(${b.ko})`).join(', '):'선정자 없음'}${mine.length>bestMine.length?` · 감독 추천 ${mine.length-bestMine.length}명`:''}`,mine.length?'league':'sys');
  news(`[올스타전] ${nm('blue')} ${b}:${r} ${nm('red')} — MVP ${mv?`${mv.name}(${S.teams[mv.teamId].name}) ${out.game.line.text}`:'-'}`,mv&&mv.teamId===ut.id?'league':'sys');
  if(out.fut){const fm=out.fut.mvp?P_(out.fut.mvp):null;const um=[...out.fut.N,...out.fut.S].map(P_).filter(p=>p&&p.teamId===ut.id);news(`[퓨처스 올스타전] 북부 ${out.fut.n}:${out.fut.s} 남부 — MVP ${fm?`${fm.name}(${S.teams[fm.teamId].name})`:'-'}${um.length?` · 우리 2군 ${um.map(p=>p.name).join(', ')} 출전`:''}`,um.length?'league':'sys');}
  S.asHist=(S.asHist||[]).concat({s:S.season,b,r,win,nb:out.names.blue,nr:out.names.red,best:['blue','red'].map(k=>out.squads[k].best.map(x=>{const q=P_(x.pid);return q?[x.ko,q.name,(S.teams[x.tid]||{name:''}).name.split(' ')[0],x.pid]:null;}).filter(Boolean)),mvp:mv?mv.name:null,mvpTeam:mv?S.teams[mv.teamId].name:null,mine:mine.length});if(S.asHist.length>20)S.asHist.shift();
  return out;}
// ---------- 임대 ----------
// 시즌 단위로 국내 구단에 보낸다. 소유·계약은 우리, 연봉은 역할에 따라 임대 구단이 부담. 시즌 끝에 기록과 함께 돌아온다.
function loanCheck(p){const ut=userTeam();if(!p||p.retired)return '선수를 찾을 수 없습니다.';if(!ut.roster.includes(p.id)&&!ut.dev.includes(p.id))return '우리 구단 선수만 임대 보낼 수 있습니다.';
  if(S.phase==='season'&&S.day>loanDeadline())return `시즌 중 임대는 ${loanDeadline()}일차까지입니다. 스토브리그에 다음 시즌 임대를 보낼 수 있습니다.`;
  if(p.age>BAL.LOAN.maxAge)return `${BAL.LOAN.maxAge}세 이하만 임대 보낼 수 있습니다.`;if(p.dispatch)return '겨울리그 파견 중인 선수입니다.';if(S.pendingFA.includes(p.id))return '계약 만료 선수는 먼저 재계약하세요.';
  if(p.promise||p.apology)return '주전 약속(또는 기회 약속) 중인 선수는 임대 보낼 수 없습니다.';
  if(ut.roster.includes(p.id)){if(ut.roster.length-1<BAL.MIN_ROSTER)return `1군 최소 인원(${BAL.MIN_ROSTER}명) 밑으로 줄일 수 없습니다.`;if(isPitcher(p)&&ut.roster.map(P_).filter(isPitcher).length-1<BAL.MIN_PITCHERS)return `투수 최소 인원(${BAL.MIN_PITCHERS}명)이 부족해집니다.`;if(p.pos==='C'&&ut.roster.map(P_).filter(x=>x.pos==='C').length<=1)return '포수가 한 명뿐입니다.';}
  return null;}
function loanOptions(pid){const p=P_(pid);if(!p)return [];return krTeams().filter(t=>!t.isUser&&t.roster.length<28).map(t=>{const role=expectedRole(p,t);const pay=BAL.LOAN.payShare[role];const share=BAL.DISPATCH.share[role];const lvlF=clamp(1+(levelOf(t)-calcOvr(p))*0.02,0.8,1.25);const exp=0.4+0.6*share*lvlF;
    return {team:t,role,pay,share,growth:exp>=0.85?'2군보다 높음':exp>=BAL.RES_EXP?'2군과 비슷':'2군보다 낮음',gcls:exp>=0.85?'g':exp>=BAL.RES_EXP?'':'r'};}).filter(o=>o.pay!=null).sort((a,b)=>b.share-a.share||a.team.div-b.team.div).slice(0,12);}
function loanPlayer(pid,tid){const p=P_(pid);const ut=userTeam();const e=loanCheck(p);if(e)return e;const o=loanOptions(pid).find(x=>x.team.id===tid);if(!o)return '이 구단은 임대를 받지 않습니다 (자리 없음).';const t=o.team;
  S.market.listed=S.market.listed.filter(x=>x!==pid);S.market.offers=S.market.offers.filter(x=>x.pid!==pid);removeFromTeam(ut,p);t.roster.push(pid);p.teamId=t.id;
  p.loan={from:ut.id,to:t.id,s:S.phase==='season'?S.season:S.season+1,pay:o.pay,role:o.role,ovr0:r1(calcOvr(p)),start:S.phase==='season'?S.day:0};ut.loaned=(ut.loaned||[]).concat(pid);autoLineup(t);fixLineup(ut);
  news(`${josa(p.name,'을','를')} ${t.name}에 ${S.phase==='season'?'이번':'다음'} 시즌 임대 보냈습니다 — 예상 역할 ${o.role}, 연봉 ${Math.round(o.pay*100)}% 임대 구단 부담`,'contract');return null;}
function returnLoans(s){for(const t of Object.values(S.teams)){for(const pid of [...(t.loaned||[])]){const p=P_(pid);if(!p||p.retired||!p.loan){t.loaned=t.loaned.filter(x=>x!==pid);if(p)p.loan=null;continue;}if(p.loan.s>s)continue;
    const b=S.teams[p.loan.to];if(b){removeFromTeam(b,p);if(!b.isUser)autoLineup(b);}const toDev=t.roster.length>=BAL.MAX_ROSTER;(toDev?t.dev:t.roster).push(pid);p.teamId=t.id;
    const h=(p.hist||[]).slice(-1)[0];const st=h&&h.s===s&&h.team===(b&&b.id)?h.st:null;p.loanDone={s,tn:b?b.name:'',div:b?b.div:null,role:p.loan.role,from:p.loan.ovr0,to:r1(calcOvr(p)),st};
    const line=st?(isPitcher(p)?(st.pOuts?`${Math.floor(st.pOuts/3)}이닝 ERA ${(st.pER*27/st.pOuts).toFixed(2)}`:'출장 없음'):(st.ab?`${st.g}경기 타율 ${(st.h/st.ab).toFixed(3).replace(/^0/,'')} ${st.hr}홈런`:'출장 없음')):'기록 없음';
    if(t.isUser)news(`임대 복귀: ${p.name} — ${b?b.name:''}에서 ${line}, 종합 ${Math.round(p.loan.ovr0)} → ${Math.round(calcOvr(p))}`,'contract');p.loan=null;t.loaned=t.loaned.filter(x=>x!==pid);}}}


// ---------- 우리 리그(해외) 가을야구 — 리그마다 실제 방식 ----------
//  일본: 리그별 클라이맥스 시리즈(1st 스테이지 2위 vs 3위 3전 2선승, 비기면 2위 진출 / 파이널 스테이지 1위가 1승 안고 4선승, 6경기까지 승부 안 나면 1위) → 일본시리즈 4선승
//  미국: 리그별 6팀(지구 1위 3팀 + 와일드카드 3팀) — 와일드카드 시리즈 3전 2선승(3·6번, 4·5번 시드, 상위 시드 홈) → 디비전 시리즈 5전 3선승 → 리그 챔피언십 7전 4선승 → 월드시리즈 7전 4선승
//  대만: 전·후반기 우승팀. 서로 다르면 승률이 높은 쪽이 대만시리즈 직행, 다른 쪽은 두 우승팀 외 최고 승률 팀과 5전 3선승 플레이오프 / 같은 팀이면 그 팀이 1승 안고 대만시리즈, 상대는 다음 두 팀의 플레이오프 승자
//  우리 리그가 해외면 한국 가을야구는 정규 시즌이 끝나는 날 결과만 바로 낸다(그 사이 우리 경기는 없음)
const HOST={h:'hhhhhhhhh','232':'hhaaahhaa','221':'hhaah','hha':'hha'};
function twHalf(h){const T=compTeams('TW');const r={};for(const t of T)r[t.id]={id:t.id,w:0,l:0};for(const g of S.schedule){if(g.div!=='TW'||g.half!==h||!g.res||g.post)continue;const hw=g.res.hs>g.res.as,aw=g.res.as>g.res.hs;if(r[g.home]){if(hw)r[g.home].w++;else if(aw)r[g.home].l++;}if(r[g.away]){if(aw)r[g.away].w++;else if(hw)r[g.away].l++;}}
  return Object.values(r).sort((a,b)=>(b.w-b.l)-(a.w-a.l)||b.w-a.w).map(x=>({...x,t:S.teams[x.id]}));}
function wpOf(t){const n=t.rec.w+t.rec.l;return n?t.rec.w/n:0;}
function lser(k,name,hi,lo,need,max,host,start){return {k,name,hi,lo,w:(start||[0,0]).slice(),start:(start||[0,0]).slice(),need,max,host,winner:null,loser:null,games:0};}
const LPOST_LG=['JP','US','TW'];
function lpostCreate(lg){const R=[];const st=c=>standings(c);let seedsTxt='';
  if(lg==='JP'){const cs=[];for(let i=0;i<2;i++){const s=st('JP/'+i);cs.push(s);}
    R.push({name:'클라이맥스 시리즈 퍼스트 스테이지',ser:cs.map((s,i)=>lser(`JP:cs1-${i}`,`${BAL.LEAGUES.JP.subs[i]} 퍼스트 스테이지`,s[1].id,s[2].id,[2,2],3,'h'))});
    seedsTxt=cs.map((s,i)=>`${BAL.LEAGUES.JP.subs[i]} ${s.slice(0,3).map(t=>t.name.split(' ')[0]).join('·')}`).join(' / ');
    return {lg,s:S.season,rounds:R,ri:0,done:false,ctx:{top:cs.map(s=>s[0].id)},seedsTxt};}
  if(lg==='US'){const L=BAL.LEAGUES.US;const confs=[[0,1,2],[3,4,5]];const seeds=confs.map(subs=>{const winners=subs.map(i=>st('US/'+i)[0]).sort((a,b)=>wpOf(b)-wpOf(a));const others=subs.flatMap(i=>st('US/'+i).slice(1)).sort((a,b)=>wpOf(b)-wpOf(a)).slice(0,3);return winners.concat(others).map(t=>t.id);});
    R.push({name:'와일드카드 시리즈',ser:seeds.flatMap((sd,ci)=>[lser(`US:wc${ci}a`,`${L.conf[ci]} 와일드카드 (3번 vs 6번)`,sd[2],sd[5],[2,2],3,'h'),lser(`US:wc${ci}b`,`${L.conf[ci]} 와일드카드 (4번 vs 5번)`,sd[3],sd[4],[2,2],3,'h')])});
    seedsTxt=seeds.map((sd,ci)=>`${L.conf[ci]} ${sd.map(id=>S.teams[id].name.split(' ')[0]).join('·')}`).join(' / ');
    return {lg,s:S.season,rounds:R,ri:0,done:false,ctx:{seeds},seedsTxt};}
  if(lg==='TW'){const all=st('TW');const h1=twHalf(1)[0].t,h2=twHalf(2)[0].t;let ctx;
    if(h1.id!==h2.id){const A=wpOf(h1)>=wpOf(h2)?h1:h2,B=A===h1?h2:h1;const C=all.find(t=>t.id!==h1.id&&t.id!==h2.id);ctx={direct:A.id,adv:false};R.push({name:'플레이오프',ser:[lser('TW:po','플레이오프 (5전 3선승)',B.id,C.id,[3,3],5,'221')]});}
    else{const rest=all.filter(t=>t.id!==h1.id);ctx={direct:h1.id,adv:true};R.push({name:'플레이오프',ser:[lser('TW:po','플레이오프 (5전 3선승)',rest[0].id,rest[1].id,[3,3],5,'221')]});}
    seedsTxt=`전반기 ${h1.name.split(' ')[0]} · 후반기 ${h2.name.split(' ')[0]}`;
    return {lg,s:S.season,rounds:R,ri:0,done:false,ctx,seedsTxt};}
  return null;}
function lpostNext(P){const lg=P.lg;const prev=P.rounds[P.ri].ser;const W=k=>prev.find(x=>x.k===k).winner;const better=(a,b)=>wpOf(S.teams[a])>=wpOf(S.teams[b])?[a,b]:[b,a];
  if(lg==='JP'){if(P.ri===0)return {name:'클라이맥스 시리즈 파이널 스테이지',ser:[0,1].map(i=>lser(`JP:cs2-${i}`,`${BAL.LEAGUES.JP.subs[i]} 파이널 스테이지 (1위 1승 안고 시작)`,P.ctx.top[i],W(`JP:cs1-${i}`),[4,4],6,'h',[1,0]))};
    if(P.ri===1){const [a,b]=better(W('JP:cs2-0'),W('JP:cs2-1'));return {name:'일본시리즈',ser:[lser('JP:js','일본시리즈 (7전 4선승)',a,b,[4,4],8,'232')]};}return null;}
  if(lg==='US'){const L=BAL.LEAGUES.US;const sd=P.ctx.seeds;
    if(P.ri===0)return {name:'디비전 시리즈',ser:[0,1].flatMap(ci=>[lser(`US:ds${ci}a`,`${L.conf[ci]} 디비전 시리즈 (5전 3선승)`,sd[ci][0],W(`US:wc${ci}b`),[3,3],5,'221'),lser(`US:ds${ci}b`,`${L.conf[ci]} 디비전 시리즈 (5전 3선승)`,sd[ci][1],W(`US:wc${ci}a`),[3,3],5,'221')])};
    if(P.ri===1)return {name:'리그 챔피언십 시리즈',ser:[0,1].map(ci=>{const a=W(`US:ds${ci}a`),b=W(`US:ds${ci}b`);const ia=sd[ci].indexOf(a),ib=sd[ci].indexOf(b);const [hi,lo]=ia<=ib?[a,b]:[b,a];return lser(`US:lcs${ci}`,`${L.conf[ci]} 챔피언십 (7전 4선승)`,hi,lo,[4,4],7,'232');})};
    if(P.ri===2){const [a,b]=better(W('US:lcs0'),W('US:lcs1'));return {name:'월드시리즈',ser:[lser('US:ws','월드시리즈 (7전 4선승)',a,b,[4,4],7,'232')]};}return null;}
  if(lg==='TW'){if(P.ri===0){const w=W('TW:po');return {name:'대만시리즈',ser:[lser('TW:ts',`대만시리즈 (7전 4선승${P.ctx.adv?' · 상·하반기 통합 우승팀 1승 안고 시작':''})`,P.ctx.direct,w,[4,4],7,P.ctx.adv?'232':'232',P.ctx.adv?[1,0]:[0,0])]};}return null;}
  return null;}
function lpostSchedule(){const P=S.lpost;if(!P||P.done)return;for(const c of P.rounds[P.ri].ser){if(c.winner!=null)continue;if(S.schedule.some(g=>g.post===c.k&&!g.res&&g.day===S.day))continue;const n=c.games;const hh=(HOST[c.host]||HOST.h)[n]!=='a';S.schedule.push({day:S.day,div:P.lg,home:hh?c.hi:c.lo,away:hh?c.lo:c.hi,res:null,post:c.k,lpost:1,gn:n+1});}}
function lpostAdvance(){const P=S.lpost;if(!P||P.done)return;const Rd=P.rounds[P.ri];
  for(const c of Rd.ser){if(c.winner!=null)continue;const gs=S.schedule.filter(g=>g.post===c.k&&g.res);c.games=gs.length;c.w=c.start.slice();for(const g of gs){if(g.res.hs===g.res.as)continue;const win=g.res.hs>g.res.as?g.home:g.away;c.w[win===c.hi?0:1]++;}
    let done=c.w[0]>=c.need[0]?c.hi:c.w[1]>=c.need[1]?c.lo:null;if(!done&&c.games>=c.max)done=c.w[1]>c.w[0]?c.lo:c.hi;   // 정해진 경기 수 안에 못 끝나면 상위 시드
    if(done){c.winner=done;c.loser=done===c.hi?c.lo:c.hi;const W=S.teams[c.winner],L=S.teams[c.loser];news(`${c.name.replace(/ \(.*\)$/,'')}: ${W.name}, ${L.name}에 ${Math.max(c.w[0],c.w[1])}승 ${Math.min(c.w[0],c.w[1])}패${c.start[0]?' (1승 어드밴티지 포함)':''}`,'league');}}
  if(Rd.ser.every(c=>c.winner!=null)){const nx=lpostNext(P);if(!nx){const f=Rd.ser[0];P.done=true;P.champ=f.winner;P.runner=f.loser;news(`${S.teams[f.winner].name}, ${S.season}시즌 ${BAL.LEAGUES[P.lg].name} 우승!`,'league');return;}
    P.rounds.push(nx);P.ri++;const ut=userTeam();for(const c of nx.ser)news(`${c.name.replace(/ \(.*\)$/,'')} 대진: ${S.teams[c.hi].name} vs ${S.teams[c.lo].name}${c.hi===ut.id||c.lo===ut.id?' — 우리 구단 출전!':''}`,'league');}
  lpostSchedule();}
// 우리 구단이 어디까지 갔는지 (탈락한 시리즈 이름 / 우승)
function lpostReach(P,id){if(!P)return null;if(P.champ===id)return 'champ';for(const R of P.rounds)for(const c of R.ser)if(c.loser===id)return c.name.replace(/ \(.*\)$/,'')+' 탈락';const inAny=P.rounds.some(R=>R.ser.some(c=>c.hi===id||c.lo===id));return inAny?null:'미진출';}
// 한국 가을야구를 하루 안에 끝냄 (우리 리그가 해외일 때)
function krPostInstant(){createPost();let guard=0;while(S.post&&!S.post.done&&guard++<60){S.schedule.forEach((g,i)=>{if(g.day!==S.day||g.res||!g.post||g.lpost)return;const lg=createGame(g.home,g.away,false);lg.gameRef=i;stepGame(lg);finalizeGame(lg);});postAdvance();}}
function lpostInfo(g){const P=S.lpost;if(!P||!g||!g.lpost)return null;const ut=userTeam();let c=null;for(const R of P.rounds)for(const x of R.ser)if(x.k===g.post)c=x;if(!c)return null;
  const mine=c.hi===ut.id?0:c.lo===ut.id?1:null;const nm=c.name.replace(/ \(.*\)$/,'');const last=!lpostNextName(P);let stake;
  if(mine!=null){const left=c.need[mine]-c.w[mine],oleft=c.need[1-mine]-c.w[1-mine];stake=left===1?(last?`이기면 ${BAL.LEAGUES[P.lg].name} 우승!`:`이기면 ${lpostNextName(P)} 진출`):oleft===1?'지면 탈락':`${last?'우승':lpostNextName(P)+' 진출'}까지 ${left}승 · 상대는 ${oleft}승 남음`;}else stake=c.name;
  return {title:`${nm} ${g.gn||1}차전`,rule:lpostRule(c),stake,me:mine==null?null:(g.home===ut.id?'home':'away'),series:`${S.teams[c.hi].name.split(' ')[0]} ${c.w[0]} : ${c.w[1]} ${S.teams[c.lo].name.split(' ')[0]}`,k:c.k};}
// 탈락 단계 → 한국식 단계 키 (감독 평판·배당금 계산용): 결승 패배 ks, 그 앞 po, 그 앞 semi, 나머지 wc
function lpostKey(P,ri){const last=P.rounds.length-1;const d=last-ri;return d<=0?'ks':d===1?'po':d===2?'semi':'wc';}
function lpostText(P,id){const r=lpostReach(P,id);return r==='champ'?`${BAL.LEAGUES[P.lg].name} 우승!`:r==='미진출'?'가을야구 진출 실패':r;}
function lpostRule(c){const n=c.need[0];return `${c.max<=3&&n===2?'3전 2선승':`${2*n-1}전 ${n}선승`}${c.start&&c.start[0]?' · 상위 팀 1승 안고 시작':''}${c.max<2*n-1||c.max===3?' · 승부가 안 나면 상위 팀 진출':''}`;}
function lpostNextName(P){const lg=P.lg;const names={JP:['클라이맥스 파이널 스테이지','일본시리즈'],US:['디비전 시리즈','리그 챔피언십 시리즈','월드시리즈'],TW:['대만시리즈']}[lg]||[];return names[P.ri]||null;}
// ---------- 포스트시즌 (5팀 계단식) ----------
// 정규 시즌 뒤 하루 1경기씩: 와일드카드(4위 vs 5위, 4위는 1승 안고 시작) → 준플레이오프(3위) → 플레이오프(2위) → 한국시리즈(1위).
// 포스트시즌 경기는 정규 순위·시즌 기록에 넣지 않는다(선수 기록은 p.ps에 따로).
const POST_TEXT={champ:'한국시리즈 우승!',ks:'한국시리즈 준우승',po:'플레이오프 탈락',semi:'준플레이오프 탈락',wc:'와일드카드 결정전 탈락'};
function createPost(){const st=standings(1);if(st.length<5)return;const seeds=st.slice(0,5).map(t=>t.id);
  S.post={s:S.season,day:BAL.SEASON_GAMES+1,seeds,stage:0,ser:[],done:false};postNextSeries();postSchedule();
  const ut=userTeam();const sd=seeds.indexOf(ut.id);
  news(`정규 시즌 종료 — 가을야구 진출: ${seeds.map((id,i)=>`${i+1}위 ${S.teams[id].name}`).join(' · ')}${sd>=0?` (우리 구단 ${sd+1}위!)`:''}`,'league');}
function postDef(i){return BAL.POST[i];}
function postNextSeries(){const P=S.post;const i=P.stage;const D=postDef(i);const hi=P.seeds[D.hiSeed-1];const lo=i===0?P.seeds[4]:P.ser[i-1].winner;
  P.ser.push({k:D.k,hi,lo,w:[0,0],winner:null,loser:null});const ut=userTeam();
  if(i>0)news(`${D.name} 대진: ${S.teams[hi].name}(${D.hiSeed}위) vs ${S.teams[lo].name}${hi===ut.id||lo===ut.id?' — 우리 구단 출전!':''}`,'league');}
function postCur(){const P=S.post;return P&&!P.done?P.ser[P.stage]:null;}
function postSchedule(){const P=S.post;const c=postCur();if(!c)return;const D=postDef(P.stage);const n=c.w[0]+c.w[1];const hh=(D.host[n]||'h')==='h';
  if(S.schedule.some(g=>g.post===c.k&&!g.res&&g.day===S.day))return;
  S.schedule.push({day:S.day,div:1,home:hh?c.hi:c.lo,away:hh?c.lo:c.hi,res:null,post:c.k,gn:n+1});}
// 어제 경기 결과 반영 → 시리즈가 끝나면 다음 단계, 한국시리즈가 끝나면 done
function postAdvance(){const P=S.post;const c=postCur();if(!c)return;const D=postDef(P.stage);const gs=S.schedule.filter(g=>g.post===c.k&&g.res);
  c.w=[0,0];for(const g of gs){const hw=g.res.hs>g.res.as;const win=hw?g.home:g.away;c.w[win===c.hi?0:1]++;}
  const done=c.w[0]>=D.need[0]?c.hi:c.w[1]>=D.need[1]?c.lo:null;
  if(done){c.winner=done;c.loser=done===c.hi?c.lo:c.hi;const W=S.teams[c.winner],L=S.teams[c.loser];const sc=`${Math.max(...c.w)}승 ${Math.min(...c.w)}패`;
    if(c.k==='wc')news(`와일드카드 결정전: ${W.name} 승리 — 준플레이오프 진출`,'league');
    else if(c.k!=='ks')news(`${D.name}: ${W.name}, ${L.name}에 ${sc} — ${postDef(P.stage+1).name} 진출`,'league');
    else news(`한국시리즈: ${W.name}, ${L.name}에 ${sc} — ${S.season}시즌 챔피언!`,'league');
    if(P.stage>=BAL.POST.length-1){P.done=true;P.champ=c.winner;P.runner=c.loser;return;}
    P.stage++;postNextSeries();}
  postSchedule();}
// 이 시즌 포스트시즌 기록 (history용)
function postRecord(){const P=S.post;if(!P||P.s!==S.season||!P.ser.length)return null;
  return {seeds:P.seeds.slice(),ser:P.ser.map(c=>({k:c.k,hi:c.hi,lo:c.lo,w:c.w.slice(),winner:c.winner,loser:c.loser})),champ:P.champ||null,runner:P.runner||null};}
// 구단별 도달 단계: champ·ks(준우승)·po·semi·wc(그 단계에서 탈락)
function postReach(R){const out={};if(!R)return out;for(const c of R.ser){if(c.loser!=null)out[c.loser]=c.k;}if(R.champ!=null)out[R.champ]='champ';return out;}
// 화면용: 지금 경기의 의미
function postInfo(g){if(!g||!g.post)return null;if(g.lpost)return lpostInfo(g);const ut=userTeam();const me=g.home===ut.id?'home':g.away===ut.id?'away':null;const P=S.post;
  const i=BAL.POST.findIndex(d=>d.k===g.post);const D=BAL.POST[i];const c=P&&P.s===S.season?P.ser[i]:null;
  const mine=c?(c.hi===ut.id?0:c.lo===ut.id?1:null):null;const w=c?c.w:[0,0];
  const need=c?D.need:[0,0];const series=c?`${S.teams[c.hi].name.split(' ')[0]} ${w[0]} : ${w[1]} ${S.teams[c.lo].name.split(' ')[0]}`:'';
  let stake;if(mine!=null){const left=need[mine]-w[mine],oleft=need[1-mine]-w[1-mine];stake=left===1?(D.k==='ks'?'이기면 한국시리즈 우승!':`이기면 ${BAL.POST[i+1].name} 진출`):oleft===1?'지면 탈락':`${D.k==='ks'?'우승':BAL.POST[i+1].name+' 진출'}까지 ${left}승 · 상대는 ${oleft}승 남음`;}
  else stake=D.k==='wc'?'4위가 1승 안고 시작 (5위는 2연승해야 진출)':`${D.need[0]*2-1}전 ${D.need[0]}선승제`;
  return {title:`${D.name} ${g.gn||1}차전`,stake,me,series,k:D.k};}

// ---------- 구단 위상 (명문도) ----------
// 명성(rep)은 그해 인기, 위상(pres)은 쌓아 온 전통. 시즌마다 「시즌 점수」(정규 순위·가을야구·한국시리즈) 쪽으로 20%씩 다가가고,
// 한국시리즈 우승은 바닥(전통)을 올린다. 명문은 선수·코치가 오고 싶어 하고, 시장(관중·스폰서)이 크고, 하위권 위기에 모기업이 긴급 투자한다.
function presOf(t){return t?(t.league==='KR'?(t.pres!=null?t.pres:30):t.rep):30;}
function presTierIdx(t){const v=presOf(t);return BAL.PRES_TIER.findIndex(x=>v>=x[0]);}
function presTier(t){return BAL.PRES_TIER[presTierIdx(t)][1];}
function presTierOf(v){return BAL.PRES_TIER.find(x=>v>=x[0])[1];}
// 시작 위상은 지역 기본 위상(BAL.PRES0). 우승 기록은 0에서 시작하고, 명문·강호는 전통 바닥(그 아래로 안 떨어짐)이 있다
function presInit(t,i){t.pres=BAL.PRES0[i]!=null?BAL.PRES0[i]:BAL.PRES_NORM[1];t.titles=0;t.presFloor=t.pres>=80?60:t.pres>=70?45:0;t.presLog=[];}
// 시장 크기: 위상에 따라 관중·스폰서·운영비가 달라진다 (리그 평균 위상 66 = 1.0)
function presIncome(t){if(t.league!=='KR'||t.pres==null)return 1;return clamp(1+(t.pres-BAL.PRES_NORM[1])*0.0065,0.68,1.16);}
function presPull(p,t){if(t.league!=='KR')return {d:0};const from=p.teamId!=null?S.teams[p.teamId]:null;if(from&&from.id===t.id)return {d:0};
  const pf=from?(from.league==='KR'?presOf(from):Math.min(60,from.rep)):30;const pt=presOf(t);const d=clamp((pt-pf)*0.004,-0.12,0.15);
  let why='';if(pt>=80&&d>0)why='명문 구단 입단 희망';else if(d>=0.06)why=`${presTierOf(pt)} 구단으로 옮기는 데 긍정적`;else if(d<=-0.06)why=`구단 위상 차이 (${presTierOf(pf)} → ${presTierOf(pt)})`;
  return {d,why};}
function presSeasonEnd(s,tables,rec){const out={};const reach=postReach(rec.post);const PP=BAL.PRES_POST;
  tables[1].forEach((t,i)=>{if(t.pres==null)return;const parts=[[`정규 ${i+1}위`,BAL.PRES_BASE[1]+(BAL.PRES_RANK[i]!=null?BAL.PRES_RANK[i]:-12)]];const k=reach[t.id];
    if(k)parts.push(['가을야구',PP.ps]);if(k==='ks'||k==='champ')parts.push(['한국시리즈 진출',PP.ks]);if(k==='champ')parts.push(['한국시리즈 우승',PP.champ]);
    const score=parts.reduce((a,x)=>a+x[1],0);const from=t.pres;let to=from+(score-from)*BAL.PRES_RATE;
    if(k==='champ'){t.titles=(t.titles||0)+1;to+=3;t.presFloor=Math.min(BAL.PRES_FLOOR_MAX,Math.max(t.presFloor||0,(t.presFloor||0)+BAL.PRES_FLOOR_TITLE));}
    to=r1(clamp(Math.max(to,t.presFloor||0),5,99));t.pres=to;t.presLog=(t.presLog||[]).concat([{s,from:r1(from),to,score,parts}]).slice(-8);
    const tf=presTierOf(from),tt=presTierOf(to);out[t.id]={from:r1(from),to,tierFrom:tf,tierTo:tt,score,parts};
    if(tf!==tt){const up=presTierIdx({league:'KR',pres:to})<presTierIdx({league:'KR',pres:from});if(t.isUser)news(up?`${t.name}, 이제 「${tt}」 구단으로 불립니다 (위상 ${Math.round(from)} → ${Math.round(to)})`:`${t.name}의 위상이 「${tt}」(으)로 내려갔습니다`,'league');
      else if(tt==='명문'||tf==='명문')news(up?`${t.name}, 명문 구단 반열에`:`한때의 명문 ${t.name}, 「${tt}」로 내려앉다`,'league');}});
  return out;}
// 명문의 저력: 시즌 중 하위권(8위 이하)이면 모기업 긴급 투자 + 보강, 하위권으로 끝난 명가는 스토브리그에 재건 투자
function presCrisis(t){if(t.league!=='KR'||presOf(t)<60)return;const key=S.phase==='season'?'c'+S.season:'r'+S.season;if(t._presAct===key)return;
  let why=null;const NK=krTeams().length;if(S.phase==='season'&&S.day>=dayAt(0.28)&&S.day<=BAL.SEASON_GAMES){const r=standings(1).findIndex(x=>x.id===t.id)+1;if(r>=NK-2)why='하위권 위기';}
  else if(S.phase==='offseason'&&(t.lastRank||0)>=NK-2&&S.week<=3)why='재건';
  if(!why)return;t._presAct=key;const inj=Math.round(econ(t).sponsor*0.3*(presOf(t)-50)/40/100)*100;t.cash+=inj;t.fin.sponsor+=inj;
  if(t.isUser){news(`모기업이 ${why==='재건'?'명가 재건을 위해':'하위권으로 처진'} ${presTier(t)} 구단 ${t.name}에 긴급 지원금 ${money(inj)}을 보냈습니다`,'league');return;}
  const got=[];for(let k=0;k<2;k++){const ps=t.roster.map(P_);let worst=null,wv=999;for(const pos of POS_BAT.concat(['SP','SP','RP'])){const best=ps.filter(p=>p.pos===pos).sort((a,b)=>calcOvr(b)-calcOvr(a))[k===1&&pos==='SP'?1:0];const v=best?calcOvr(best):0;if(v<wv){wv=v;worst=pos;}}
    const cands=krTeams().filter(x=>!x.isUser&&x.id!==t.id&&presOf(x)<presOf(t)).flatMap(x=>x.roster.map(P_)).filter(p=>p&&!p.loan&&p.pos===worst&&calcOvr(p)>=wv+3&&(p.lockUntil||0)<=S.clock&&!got.includes(p.id)).sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,4);
    for(const p of cands){const seller=S.teams[p.teamId];const fee=aiAsk(seller,p);if(fee>t.cash*0.6)continue;if(seller.roster.length<=BAL.MIN_ROSTER+1)continue;
      transferPlayer(p.id,t.id,fee,{salary:Math.round(salaryFor(p)*1.1/10)*10,years:ri(2,3)},'이적');got.push(p.id);break;}}
  if(t.roster.length>28){while(t.roster.length>28){const ps=t.roster.map(P_).filter(x=>!x.loan).sort((a,b)=>calcValue(a)-calcValue(b));const p=ps[0];if(!p)break;removeFromTeam(t,p);S.fa.push(p.id);p.transfers.push({s:S.season,from:t.name,to:'FA',fee:0,kind:'방출'});}}
  autoLineup(t);news(`${presTier(t)} ${t.name}, ${why==='재건'?'명가 재건 투자':'하위권 위기에 모기업 긴급 투자'} (${money(inj)})${got.length?' — '+got.map(id=>P_(id).name).join(', ')+' 영입':''}`,'league');}
function presMigrate(){const idx={};TEAM_NAMES.KR.forEach(([n],i)=>idx[n]=i);for(const t of krTeams()){if(t.pres!=null)continue;const i=idx[t.orig||t.name];presInit(t,i!=null?i:99);}}
function presTable(){return krTeams().map(t=>({t,v:presOf(t),tier:presTier(t)})).sort((a,b)=>b.v-a.v);}

// ---------- 스폰서 · 광고 ----------
// 메인 스폰서(3~4가지 계약 유형 중 선택) + 광고판(고정형/관중 연동형) + 선수 개인 광고(구단 수수료). 유저 구단만 — AI는 기존 자동 수입.
// 기대 총액은 예전 자동 스폰서와 비슷하게(메인 0.8 + 광고판 약 0.15), 선택에 따라 위험과 보상이 달라진다.
function sponBase(t){return econ(t).sponsor*(0.7+t.rep/100*0.6)*presIncome(t);}
function sponTier(t){const v=presOf(t);return v>=80?'big':v>=40?'mid':'local';}
function sponPick(pool,used){const c=pool.filter(x=>!used.has(x[0]));const x=c.length?pick(c):pick(pool);used.add(x[0]);return x;}
function boardSlots(t){const SP=BAL.SPON;return t.league==='KR'?SP.boards[1]+(presOf(t)>=80?1:0):SP.boards.os;}
function ensureSpon(t){if(!t||t.spon)return;t.spon={main:null,offers:[],boards:[],boardOffers:[]};const B=sponBase(t);
  if(S.phase==='season'){const [co,sec]=pick(BAL.SPON.co[sponTier(t)==='big'?'mid':'local']);t.spon.main={co,sector:sec,kind:'base',years:1,base:Math.round(B*0.85/10)*10,since:S.season,first:true};
    sponGenBoards(t);t.spon.boards=t.spon.boardOffers.filter(o=>o.type==='fixed').slice(0,boardSlots(t)).map(o=>({...o,auto:true}));t.spon.boardOffers=[];}
  else{sponGenOffers(t);sponGenBoards(t);}}
function sponGenOffers(t){const SP=BAL.SPON;const B=sponBase(t);const used=new Set();const tier=sponTier(t);const n=compTeams(compOf(t)).length||8;const tgt=t.league==='KR'?5:Math.ceil(n/2);
  const O=[];const mk=(kind,coTier)=>{const K=SP.kinds[kind];const [co,sector]=sponPick(SP.co[coTier],used);const o={id:S.nextOfferId++,co,sector,kind,years:K.years,base:Math.round(B*K.base*(0.95+rnd()*0.1)/10)*10};
    if(kind==='perf')o.bonus=Object.fromEntries(Object.entries(SP.perfBonus).map(([k,v])=>[k,Math.round(B*v/10)*10]));if(kind==='short'){o.target=tgt;o.penalty=Math.round(B*K.miss/10)*10;}if(kind==='big')o.clause='bottom';return o;};
  if(tier==='big')O.push(mk('big','big'));const ct=tier==='big'?'mid':tier==='mid'?'mid':'local';O.push(mk('stable',ct),mk('perf',tier==='local'?'local':'mid'),mk('short',ct));t.spon.offers=O;}
function sponGenBoards(t){const SP=BAL.SPON;const B=sponBase(t);const n=boardSlots(t)+2;const used=new Set();const estT=econ(t).ticket*(0.7+t.rep/100*0.6)*presIncome(t)*BAL.SEASON_GAMES/2;const O=[];
  const pool=SP.co.local.concat(SP.co.mid);for(let i=0;i<n;i++){const [co,sector]=sponPick(pool,used);const val=Math.round(B*SP.boardShare*(0.8+rnd()*0.4)/10)*10;
    if(i%3===2)O.push({id:S.nextOfferId++,co,sector,type:'gate',rate:r1(Math.min(0.4,val*(0.95+rnd()*0.35)/Math.max(1,estT))*100)/100,est:Math.round(val*1.1/10)*10});
    else O.push({id:S.nextOfferId++,co,sector,type:'fixed',val});}
  t.spon.boardOffers=O;}
function sponSign(oid){const t=userTeam();ensureSpon(t);const sp=t.spon;if(S.phase!=='offseason')return '스폰서 계약은 스토브리그에만 할 수 있습니다.';if(sp.main)return `이미 ${sp.main.co}와 계약 중입니다 (${sp.main.years}년 남음).`;
  const o=sp.offers.find(x=>x.id===oid);if(!o)return '제안이 없습니다.';sp.main={...o,since:S.season+1};sp.offers=[];
  sp.boards=sp.boards.filter(b=>b.sector!==o.sector);news(`메인 스폰서 계약: ${o.co} — ${BAL.SPON.kinds[o.kind].name} ${o.years}년, 시즌당 ${money(o.base)}`,'fin');return null;}
function boardSign(oid){const t=userTeam();ensureSpon(t);const sp=t.spon;if(S.phase!=='offseason')return '광고판 계약은 스토브리그에만 할 수 있습니다.';const o=sp.boardOffers.find(x=>x.id===oid);if(!o)return '제안이 없습니다.';
  if(sp.boards.length>=boardSlots(t))return `광고판 자리가 모두 찼습니다 (${boardSlots(t)}자리).`;if(sp.main&&sp.main.sector===o.sector)return `메인 스폰서(${sp.main.co})와 같은 업종(${o.sector})은 받을 수 없습니다.`;if(sp.boards.some(b=>b.sector===o.sector))return `같은 업종(${o.sector}) 광고가 이미 있습니다.`;
  sp.boards.push({...o});sp.boardOffers=sp.boardOffers.filter(x=>x.id!==oid);return null;}
function boardDrop(oid){const sp=userTeam().spon;if(S.phase!=='offseason')return '시즌 중에는 뺄 수 없습니다.';const b=sp.boards.find(x=>x.id===oid);if(!b)return '없는 광고입니다.';sp.boards=sp.boards.filter(x=>x.id!==oid);sp.boardOffers.push(b);return null;}
function sponAutoPick(){const t=userTeam();ensureSpon(t);const sp=t.spon;
  if(!sp.main&&sp.offers.length){const o=sp.offers.find(x=>x.kind==='stable')||sp.offers[0];sp.main={...o,since:S.season+1,auto:true};sp.offers=[];news(`메인 스폰서를 고르지 않아 ${josa(o.co,'과','와')} 자동 계약했습니다 (${BAL.SPON.kinds[o.kind].name})`,'fin');}
  const free=boardSlots(t)-sp.boards.length;if(free>0){const c=sp.boardOffers.filter(o=>o.type==='fixed'&&!(sp.main&&sp.main.sector===o.sector)&&!sp.boards.some(b=>b.sector===o.sector)).sort((a,b)=>b.val-a.val);let k=0;
    for(const o of c){if(k>=free)break;if(sp.boards.some(b=>b.sector===o.sector))continue;sp.boards.push({...o,val:Math.round(o.val*0.8/10)*10,auto:true});k++;}if(k)news(`빈 광고판 ${k}자리는 대행사가 기본 단가(80%)로 채웠습니다`,'fin');}
  sp.boardOffers=[];}
function sponPay(t){ensureSpon(t);const sp=t.spon;let inc=0;if(sp.main){inc+=sp.main.base;}else inc+=Math.round(sponBase(t)*0.6);t.cash+=inc;t.fin.sponsor+=inc;
  let ads=0;for(const b of sp.boards)if(b.type==='fixed')ads+=b.val;t.cash+=ads;t.fin.ads=(t.fin.ads||0)+ads;
  let com=0;for(const id of t.roster.concat(t.dev)){const p=P_(id);if(p&&p.endorse&&p.endorse.years>0&&p.endorse.paid!==S.season){const c=Math.round(p.endorse.fee*BAL.SPON.endorse.comm/10)*10;com+=c;p.endorse.paid=S.season;}}t.cash+=com;t.fin.endorse=(t.fin.endorse||0)+com;}
function boardGate(t,ticket){const sp=t.spon;if(!sp)return;let a=0;for(const b of sp.boards)if(b.type==='gate')a+=Math.round(ticket*b.rate);if(a){t.cash+=a;t.fin.ads=(t.fin.ads||0)+a;}}
function sponStatus(t){t=t||userTeam();ensureSpon(t);const m=t.spon.main;if(!m)return null;const n=compTeams(compOf(t)).length||8;const r=standings(compOf(t)).findIndex(x=>x.id===t.id)+1;const played=t.rec.w+t.rec.l>0;
  if(m.kind==='perf'){const b=m.bonus;const now=!played?0:perfRankBonus(b,r);return {text:played?`지금 ${r}위 → 순위 보너스 ${money(now)}${b.ks?` (+한국시리즈 진출 ${money(b.ks)} · 우승 ${money(b.champ)})`:''}`:'개막 전',ok:now>0};}
  if(m.kind==='short')return {text:played?`목표 ${m.target}위 이내 · 지금 ${r}위${r<=m.target?' (달성 중)':` — 이대로면 위약금 ${money(m.penalty)}`}`:`목표 ${m.target}위 이내`,ok:played?r<=m.target:null};
  if(m.kind==='big')return {text:`${n-1}위 이하로 끝나면 계약 해지`,ok:played?r<n-1:null};return null;}
// 성적 연동형 보너스: 정규 1위 · 2~3위 · 4~5위(가을야구). 예전 키(r2·r4)도 읽는다
function perfRankBonus(b,r){return r===1?b.r1:r<=3?(b.r3!=null?b.r3:b.r2||0):r<=5?(b.r5!=null?b.r5:r<=4?b.r4||0:0):0;}
function sponSettle(s,rec){const t=userTeam();if(!t.spon)return;const sp=t.spon;const m=sp.main;const L=S.lastSummary||{};const out=[];const n=compTeams(L.div!=null?L.div:compOf(t)).length||8;const r=L.rank||t.lastRank||n;
  const k=postReach(rec.post)[t.id];const champ=k==='champ';
  if(m&&m.since<=s){if(m.kind==='perf'){const b=m.bonus;let x=perfRankBonus(b,r);if((k==='ks'||champ)&&b.ks)x+=b.ks;if(champ)x+=b.champ||0;if(x){t.cash+=x;t.fin.sponsor+=x;out.push(`${m.co} 성적 보너스 +${money(x)}`);}else out.push(`${m.co} 성적 보너스 없음 (${r}위)`);}
    if(m.kind==='short'){if(r>m.target){t.cash-=m.penalty;t.fin.other+=m.penalty;out.push(`${m.co} 목표(${m.target}위) 미달 위약금 −${money(m.penalty)}`);}else out.push(`${m.co} 목표(${m.target}위 이내) 달성`);}
    m.years--;if((m.clause==='bottom'||m.clause==='relegate')&&r>=n-1&&m.years>0){out.push(`${r}위로 끝나 ${m.co} 계약 해지 (남은 ${m.years}년 소멸)`);m.years=0;}
    if(m.years<=0){if(!out.some(x=>/해지/.test(x)))out.push(`${m.co} 계약 만료 — 새 스폰서 제안 도착`);sp.main=null;}}
  sp.boards=[];sponGenBoards(t);if(!sp.main)sponGenOffers(t);
  for(const id of t.roster.concat(t.dev)){const p=P_(id);if(p&&p.endorse){p.endorse.years--;if(p.endorse.years<=0){out.push(`${p.name} 개인 광고(${p.endorse.co}) 계약 종료`);p.endorse=null;}}}
  if(out.length){for(const x of out)news(x,'fin');if(S.lastSummary)S.lastSummary.spon=out;}}
// 선수 개인 광고: 실력·성적·나이로 「인기 점수」를 매겨 제안. 수락하면 사기↑·재계약 요구↑, 구단은 광고료의 30%를 시즌마다 수수료로 받음(판매하면 끊김)
function starScore(p,t){const st=p.cur&&(p.cur.pa||p.cur.pOuts)?p.cur:((p.hist||[]).slice(-1)[0]||{}).st||{};let sc=calcOvr(p)-levelOf(t)+(p.age<=25?2:0);
  const G=gf();if(isPitcher(p)){if((st.pW||0)>=5*G)sc+=2;if((st.pSV||0)>=5*G)sc+=1.5;if(st.pOuts>=60*G&&st.pER*27/st.pOuts<3)sc+=2;}else{if((st.hr||0)>=6*G)sc+=2;if(st.ab>=60*G&&st.h/st.ab>=0.32)sc+=2;}return r1(sc);}
function endorseOffers(){const t=userTeam();S.endorseOffers=S.endorseOffers||[];const E=BAL.SPON.endorse;if(S.endorseOffers.length>=2)return;
  const c=t.roster.map(P_).filter(p=>p&&!p.endorse&&!S.endorseOffers.some(o=>o.pid===p.id)&&!p.loan).map(p=>({p,sc:starScore(p,t)})).filter(x=>x.sc>=E.minScore).sort((a,b)=>b.sc-a.sc).slice(0,2);
  const used=new Set();for(const {p,sc} of c){if(rnd()>clamp(0.4+(sc-BAL.SPON.endorse.minScore)*0.05,0.4,0.9))continue;const [co,sector]=sponPick(BAL.SPON.co[sc>=14&&presOf(t)>=60?'mid':'local'].concat(sc>=16?BAL.SPON.co.mid:[]),used);
    const fee=Math.round(econ(t).sponsor*E.feeShare*(1+(sc-E.minScore)*0.1)*(0.9+rnd()*0.2)/10)*10;S.endorseOffers.push({id:S.nextOfferId++,pid:p.id,co,sector,fee,years:rnd()<0.5?1:2,sc,exp:S.clock+7});
    news(`${p.name}에게 개인 광고 제안: ${co} (연 ${money(fee)})`,'contract');}}
function endorseTick(){S.endorseOffers=(S.endorseOffers||[]).filter(o=>{const p=P_(o.pid);if(!p||p.teamId!==S.userTeamId)return false;if(o.exp<=S.clock){news(`${p.name}의 ${o.co} 광고 제안이 기간 만료되었습니다`,'contract');return false;}return true;});}
function endorseAnswer(oid,yes){const o=(S.endorseOffers||[]).find(x=>x.id===oid);if(!o)return '제안이 없습니다.';const p=P_(o.pid);const t=userTeam();const E=BAL.SPON.endorse;S.endorseOffers=S.endorseOffers.filter(x=>x.id!==oid);if(!p||p.teamId!==t.id)return '선수가 팀에 없습니다.';
  if(yes){p.endorse={co:o.co,sector:o.sector,fee:o.fee,years:o.years,since:S.season,paid:S.phase==='season'?S.season:null};p.morale=clamp(p.morale+E.morale,0,100);
    let com=0;if(S.phase==='season'){com=Math.round(o.fee*E.comm/10)*10;t.cash+=com;t.fin.endorse=(t.fin.endorse||0)+com;}
    news(`${p.name}, ${o.co} 광고 모델 계약 (${o.years}년, 연 ${money(o.fee)}) — 구단 수수료 ${Math.round(E.comm*100)}%${com?` ${money(com)} 입금`:' (개막 때 입금)'}`,'contract');}
  else{p.morale=clamp(p.morale+E.decline,0,100);news(`${p.name}의 ${o.co} 광고 제안을 거절했습니다 (선수 실망)`,'contract');}return null;}

// ---------- 세부 지표 (세이버메트릭스) ----------
// 타자: 타율·출루율·장타율·OPS·wOBA·ISO·BABIP·BB%·K%·OPS+·WAR / 투수: ERA·WHIP·FIP·K/9·BB/9·HR/9·K%·BB%·ERA+·WAR
// WAR = (타격 득점 + 포지션 보정 + 수비 보정 + 대체 선수 보정) ÷ 10. 리그 평균은 같은 리그·같은 시즌 기준.
const LWT={bb:0.69,b1:0.89,b2:1.27,b3:1.62,hr:2.10},POS_ADJ={C:12.5,SS:7.5,'2B':2.5,'3B':2.5,CF:2.5,LF:-7.5,RF:-7.5,'1B':-12.5,DH:-17.5};
const CTX0={woba:0.32,obp:0.325,slg:0.4,avg:0.26,era:4.3,ra9:4.6,fipC:3.2,babip:0.3,bbp:0.075,kp:0.21,whip:1.38,k9:7.5,bb9:3.2,hr9:0.9,n:0};
function batLine(st){const pa=st.pa||0,ab=st.ab||0,h=st.h||0,bb=st.bb||0,so=st.so||0,hr=st.hr||0,d2=st.d2||0,d3=st.d3||0;const b1=h-d2-d3-hr;const tb=b1+2*d2+3*d3+4*hr;
  const den=ab+bb;return {pa,ab,h,bb,so,hr,avg:ab?h/ab:0,obp:den?(h+bb)/den:0,slg:ab?tb/ab:0,ops:(den?(h+bb)/den:0)+(ab?tb/ab:0),iso:ab?(tb-h)/ab:0,babip:(ab-so-hr)>0?(h-hr)/(ab-so-hr):0,bbp:pa?bb/pa:0,kp:pa?so/pa:0,
    woba:den?(LWT.bb*bb+LWT.b1*b1+LWT.b2*d2+LWT.b3*d3+LWT.hr*hr)/den:0};}
function pitLine(st){const o=st.pOuts||0,ip=o/3;const bf=o+(st.pH||0)+(st.pBB||0);const hr=st.pHR||0;return {ip,outs:o,era:ip?st.pER*9/ip:0,ra9:ip?st.pR*9/ip:0,whip:ip?(st.pH+st.pBB)/ip:0,k9:ip?st.pSO*9/ip:0,bb9:ip?st.pBB*9/ip:0,hr9:ip?hr*9/ip:0,kp:bf?st.pSO/bf:0,bbp:bf?st.pBB/bf:0,fipRaw:ip?(13*hr+3*st.pBB-2*st.pSO)/ip:0,so:st.pSO||0,bbx:st.pBB||0,hr};}
function ctxFrom(rows){const T=newStat();for(const st of rows)for(const k in T)T[k]+=st[k]||0;if(T.pa<200||T.pOuts<300)return {...CTX0};const b=batLine(T),q=pitLine(T);
  return {woba:r3(b.woba),obp:r3(b.obp),slg:r3(b.slg),avg:r3(b.avg),babip:r3(b.babip),bbp:r3(b.bbp),kp:r3(b.kp),era:r2(q.era),ra9:r2(q.ra9),fipC:r2(q.era-q.fipRaw),whip:r2(q.whip),k9:r2(q.k9),bb9:r2(q.bb9),hr9:r2(q.hr9),n:T.pa};}
function r2(x){return Math.round(x*100)/100;}function r3(x){return Math.round(x*1000)/1000;}
function compKeyOf(t){return t?leagueKey(t):null;}
let CTX_MEMO={stamp:null,map:{}};
function lgCtxAll(force){const stamp=S.season+':'+S.clock+':'+S.day;if(!force&&CTX_MEMO.stamp===stamp)return CTX_MEMO.map;const rows={};
  for(const id in S.players){const p=S.players[id];if(p.retired||p.teamId==null||!(p.cur.pa||p.cur.pOuts))continue;const k=compKeyOf(S.teams[p.teamId]);(rows[k]=rows[k]||[]).push(p.cur);}
  const map={};for(const k in rows)map[k]=ctxFrom(rows[k]);CTX_MEMO={stamp,map};return map;}
function lgCtx(key,s){if(s!=null&&s!==S.season&&S.lgCtx&&S.lgCtx[s]&&S.lgCtx[s][key])return S.lgCtx[s][key];if(s==null||s===S.season){const m=lgCtxAll();if(m[key])return m[key];}return {...CTX0};}
function batWar(p,st,ctx,pos){const b=batLine(st);const wraa=(b.woba-ctx.woba)/1.15*b.pa;const g=st.g||Math.round(b.pa/4.1);pos=pos||p.pos;const posR=(POS_ADJ[pos]||0)*g/162;
  const def=pos==='DH'?0:(p.attrs.defense-50)*0.25*g/162;const repl=20/600*b.pa;return {war:r1((wraa+posR+def+repl)/10),wraa:r1(wraa),posR:r1(posR),def:r1(def),repl:r1(repl)};}
function pitWar(st,ctx){const q=pitLine(st);if(!q.ip)return {war:0,fip:0};const fip=q.fipRaw+ctx.fipC;const war=((ctx.ra9*1.2)-(fip*0.92+0.08*q.era))*q.ip/9/10;return {war:r1(war),fip:r2(fip)};}
// 한 선수의 시즌 세부 지표 + 리그 평균 + 같은 리그 내 백분위
function advStats(p,src){const t=p.teamId!=null?S.teams[p.teamId]:null;let st,s,key;
  if(src&&src.st){st=src.st;s=src.s;key=src.lg||compKeyOf(t);}else{const cur=p.cur&&(p.cur.pa||p.cur.pOuts);if(cur&&S.phase==='season'){st=p.cur;s=S.season;key=compKeyOf(t);}else{const h=(p.hist||[]).slice().reverse().find(x=>!x.w&&(x.st.pa||x.st.pOuts));if(!h)return null;st=h.st;s=h.s;key=h.lg;}}
  const ctx=lgCtx(key,s);const pit=isPitcher(p);const live=s===S.season&&S.phase==='season';
  let pct=null;if(live){const peers=Object.values(S.players).filter(x=>x.teamId!=null&&!x.retired&&compKeyOf(S.teams[x.teamId])===key&&isPitcher(x)===pit&&(pit?x.cur.pOuts>=24:x.cur.pa>=30));
    if(peers.length>=12){const rank=(f,hi)=>{const v=f(p);const n=peers.filter(x=>hi?f(x)>v:f(x)<v).length;return Math.max(1,Math.round((n+1)/peers.length*100));};
      if(!pit){const L=x=>batLine(x.cur);pct={avg:rank(x=>L(x).avg,1),obp:rank(x=>L(x).obp,1),slg:rank(x=>L(x).slg,1),ops:rank(x=>L(x).ops,1),bbp:rank(x=>L(x).bbp,1),kp:rank(x=>L(x).kp,0),iso:rank(x=>L(x).iso,1),war:rank(x=>batWar(x,x.cur,ctx).war,1),n:peers.length};}
      else{const L=x=>pitLine(x.cur);pct={era:rank(x=>L(x).era,0),whip:rank(x=>L(x).whip,0),kp:rank(x=>L(x).kp,1),bbp:rank(x=>L(x).bbp,0),k9:rank(x=>L(x).k9,1),fip:rank(x=>pitWar(x.cur,ctx).fip,0),war:rank(x=>pitWar(x.cur,ctx).war,1),n:peers.length};}}}
  const G=BAL.LEAGUES[key]?BAL.LEAGUES[key].games||BAL.SEASON_GAMES:BAL.SEASON_GAMES;
  if(!pit){const b=batLine(st);const w=batWar(p,st,ctx);return {kind:'bat',s,key,live,st,b,ctx,war:w,war144:r1(w.war*144/Math.max(1,lgGames(BAL.LEAGUES[key]?key:'KR'))),opsPlus:Math.round(100*((b.obp/ctx.obp)+(b.slg/ctx.slg)-1)),pct};}
  const q=pitLine(st);const w=pitWar(st,ctx);return {kind:'pit',s,key,live,st,q,ctx,fip:w.fip,war:w,war144:r1(w.war*144/Math.max(1,lgGames(BAL.LEAGUES[key]?key:'KR'))),eraPlus:q.era?Math.round(100*ctx.era/q.era):null,pct};}
// 리그 기록 순위 (기록실)
// 기록실에서 볼 수 있는 시즌: 한국·우리 리그는 시즌 중이면 지금 기록, 아니면(또는 다른 리그) 선수 시즌 기록에 남은 가장 최근 시즌
function recSeason(key){const live=key==='KR1'||(playLg()&&key===playLg());if(live&&S.phase==='season'&&Object.values(S.players).some(p=>p.teamId!=null&&!p.retired&&S.teams[p.teamId]&&leagueKey(S.teams[p.teamId])===key&&(p.cur.pa||p.cur.pOuts)))return {live:true,s:S.season};
  let s=null;for(const id in S.players){for(const h of S.players[id].hist||[])if(h.lg===key&&(s==null||h.s>s))s=h.s;}return s==null?null:{live:false,s};}
function leadersPast(key,cat,n,s){const pit=['era','whip','pso','pwar','fip','pw','sv'].includes(cat);const ctx=lgCtx(key,s);const rows=[];
  for(const id in S.players){const x=S.players[id];if(isPitcher(x)!==pit)continue;const h=(x.hist||[]).find(e=>e.s===s&&e.lg===key);if(h)rows.push({p:x,st:h.st,tn:h.tn});}
  let G=1;for(const id in S.players){const x=S.players[id];if(isPitcher(x))continue;for(const e of x.hist||[])if(e.s===s&&e.lg===key&&e.st.g>G)G=e.st.g;}const qPA=G*2.6,qIP=G*0.8*3;
  const val={avg:x=>batLine(x.st).avg,obp:x=>batLine(x.st).obp,ops:x=>batLine(x.st).ops,hr:x=>x.st.hr,rbi:x=>x.st.rbi,war:x=>batWar(x.p,x.st,ctx).war,era:x=>pitLine(x.st).era,whip:x=>pitLine(x.st).whip,fip:x=>pitWar(x.st,ctx).fip,pso:x=>x.st.pSO,pw:x=>x.st.pW,sv:x=>x.st.pSV,pwar:x=>pitWar(x.st,ctx).war}[cat];
  const rate=['avg','obp','ops','era','whip','fip'].includes(cat);const low=['era','whip','fip'].includes(cat);
  return rows.filter(x=>pit?(rate?x.st.pOuts>=qIP:x.st.pOuts>0):(rate?x.st.pa>=qPA:x.st.pa>0)).map(x=>({p:x.p,v:val(x),tn:x.tn})).sort((a,b)=>low?a.v-b.v:b.v-a.v).slice(0,n||10);}
function leaders(key,cat,n){const pit=['era','whip','pso','pwar','fip','pw','sv'].includes(cat);const ctx=lgCtx(key);
  const all=Object.values(S.players).filter(x=>x.teamId!=null&&!x.retired&&compKeyOf(S.teams[x.teamId])===key&&isPitcher(x)===pit);
  const games=Math.max(1,...krTeams().concat(overseasTeams()).filter(t=>compKeyOf(t)===key).map(t=>t.rec.w+t.rec.l));const qPA=games*2.6,qIP=games*0.8*3;
  const val={avg:x=>batLine(x.cur).avg,obp:x=>batLine(x.cur).obp,ops:x=>batLine(x.cur).ops,hr:x=>x.cur.hr,rbi:x=>x.cur.rbi,war:x=>batWar(x,x.cur,ctx).war,era:x=>pitLine(x.cur).era,whip:x=>pitLine(x.cur).whip,fip:x=>pitWar(x.cur,ctx).fip,pso:x=>x.cur.pSO,pw:x=>x.cur.pW,sv:x=>x.cur.pSV,pwar:x=>pitWar(x.cur,ctx).war}[cat];
  const rate=['avg','obp','ops','era','whip','fip'].includes(cat);const low=['era','whip','fip'].includes(cat);
  const pool=all.filter(x=>pit?(rate?x.cur.pOuts>=qIP:x.cur.pOuts>0):(rate?x.cur.pa>=qPA:x.cur.pa>0));
  return pool.map(x=>({p:x,v:val(x)})).sort((a,b)=>low?a.v-b.v:b.v-a.v).slice(0,n||10).map(o=>({...o,t:S.teams[o.p.teamId]}));}

// 등번호: 처음 볼 때 정해 저장. 투수는 11~69, 야수는 1~59 선호, 같은 팀 안에서는 겹치지 않게
function jerseyOf(p){if(!p)return null;const t=p.teamId!=null?S.teams[p.teamId]:null;const taken=new Set();if(t)for(const id of t.roster.concat(t.dev||[])){if(id===p.id)continue;const q=P_(id);if(q&&q.no)taken.add(q.no);}
  if(p.no&&!taken.has(p.no))return p.no;let h=(p.id*2654435761)>>>0;const lo=isPitcher(p)?11:1,span=isPitcher(p)?59:59;let n=lo+(h%span);for(let k=0;k<99&&taken.has(n);k++)n=n%99+1;p.no=n;return n;}
// ---------- 시즌 시상식 ----------
// 리그(부)별: MVP·신인왕·타이틀(타율·홈런·타점·최다안타·출루율 / 다승·평균자책·탈삼진·세이브)·골든글러브(포지션별 WAR 1위)
const AWARD_LABEL={mvp:'MVP',roy:'신인왕',gg:'골든글러브',avg:'타격왕',hr:'홈런왕',rbi:'타점왕',h:'최다안타',obp:'출루율 1위',pw:'다승왕',era:'평균자책 1위',pso:'탈삼진왕',sv:'세이브왕'};
function seasonAwards(s,preKey){S.awards=S.awards||{};const res={};const keyOf=t=>t?(preKey[t.id]||compKeyOf(t)):null;let G=BAL.SEASON_GAMES,qPA=3.1*G,qOut=G*3;
  const keys=new Set(krTeams().map(keyOf));const pl=playLg();if(pl)keys.add(pl);const mine=[];
  for(const key of keys){G=lgGames(key.startsWith('KR')?'KR':key);qPA=3.1*G;qOut=G*3;const ctx=(S.lgCtx&&S.lgCtx[s]&&S.lgCtx[s][key])||lgCtx(key);const ps=Object.values(S.players).filter(p=>!p.retired&&p.teamId!=null&&keyOf(S.teams[p.teamId])===key&&(p.cur.pa||p.cur.pOuts));
    const bats=ps.filter(p=>!isPitcher(p)),pits=ps.filter(isPitcher);const W=p=>isPitcher(p)?pitWar(p.cur,ctx).war:batWar(p,p.cur,ctx).war;
    const ent=(p,k,v)=>{const t=S.teams[p.teamId];return {k,pid:p.id,name:p.name,tid:t.id,tn:t.name,v:Math.round(v*1000)/1000,line:k!=='mvp'&&k!=='roy'?undefined:isPitcher(p)?`${p.cur.pW}승 ${p.cur.pL}패 ${p.cur.pSV?p.cur.pSV+'세이브 ':''}ERA ${(p.cur.pER*27/Math.max(1,p.cur.pOuts)).toFixed(2)} · ${p.cur.pSO}삼진 · WAR ${W(p)}`:`타율 ${batLine(p.cur).avg.toFixed(3).replace(/^0/,'')} · ${p.cur.hr}홈런 · ${p.cur.rbi}타점 · OPS ${batLine(p.cur).ops.toFixed(3).replace(/^0/,'')} · WAR ${W(p)}`};};
    const top=(arr,f,low)=>arr.slice().sort((a,b)=>low?f(a)-f(b):f(b)-f(a))[0];const R={titles:[],gg:[]};
    const mv=top(ps.filter(p=>p.cur.pa>=qPA*0.6||p.cur.pOuts>=qOut*0.6),W);if(mv)R.mvp=ent(mv,'mvp',W(mv));
    const rookAge=s===1?21:23;const rook=ps.filter(p=>p.age<=rookAge&&!(p.hist||[]).some(h=>!h.w&&(h.st.pa>=60||h.st.pOuts>=60))&&(p.cur.pa>=qPA*0.4||p.cur.pOuts>=qOut*0.4));const ro=top(rook,W);if(ro&&W(ro)>0)R.roy=ent(ro,'roy',W(ro));
    const qb=bats.filter(p=>p.cur.pa>=qPA),qp=pits.filter(p=>p.cur.pOuts>=qOut);
    const T=[['avg',qb,p=>batLine(p.cur).avg,0,x=>x.toFixed(3).replace(/^0/,'')],['hr',bats,p=>p.cur.hr,0,x=>x+'개'],['rbi',bats,p=>p.cur.rbi,0,x=>x+'타점'],['h',bats,p=>p.cur.h,0,x=>x+'안타'],['obp',qb,p=>batLine(p.cur).obp,0,x=>x.toFixed(3).replace(/^0/,'')],
      ['pw',pits,p=>p.cur.pW,0,x=>x+'승'],['era',qp,p=>p.cur.pER*27/Math.max(1,p.cur.pOuts),1,x=>x.toFixed(2)],['pso',pits,p=>p.cur.pSO,0,x=>x+'개'],['sv',pits,p=>p.cur.pSV,0,x=>x+'세이브']];
    for(const [k,arr,f,low,fmt] of T){const w=top(arr,f,low);if(w&&(low||f(w)>0)){const e=ent(w,k,f(w));e.vs=fmt(f(w));R.titles.push(e);}}
    const gq=bats.filter(p=>p.cur.pa>=2*G);const slot=[['C',['C']],['1B',['1B']],['2B',['2B']],['3B',['3B']],['SS',['SS']],['OF',['LF','CF','RF']],['DH',['DH']]];
    for(const [lab,poss] of slot){const c=gq.filter(p=>poss.includes(p.pos)).sort((a,b)=>W(b)-W(a));const n=lab==='OF'?3:1;c.slice(0,n).forEach(p=>{const e=ent(p,'gg',W(p));e.slot=lab;R.gg.push(e);});}
    const gp=top(pits.filter(p=>p.cur.pOuts>=qOut*1.2||p.cur.pSV>=G/5),W);if(gp){const e=ent(gp,'gg',W(gp));e.slot='P';R.gg.unshift(e);}
    res[key]=R;
    const give=(e,k,lab)=>{const p=P_(e.pid);if(!p)return;{const keep=p.userLink||p.exUser;p.awards=(p.awards||[]).concat([keep?{s,k,lab,tn:e.tn}:{s,k,lab}]).slice(keep?-30:-15);}p.morale=clamp(p.morale+(k==='mvp'?10:5),0,100);if(p.teamId===S.userTeamId){mine.push(`${p.name} ${lab}`);S.awardLog=(S.awardLog||[]).concat([{s,k,lab,pid:p.id,name:p.name,tid:e.tid,tn:e.tn,vs:e.vs||null}]).slice(-300);}};
    if(R.mvp)give(R.mvp,'mvp',`${compLabel(key)} MVP`);if(R.roy)give(R.roy,'roy',`${compLabel(key)} 신인왕`);for(const e of R.titles)give(e,'title',`${compLabel(key)} ${AWARD_LABEL[e.k]}`);for(const e of R.gg)give(e,'gg',`${compLabel(key)} 골든글러브(${e.slot==='OF'?'외야수':e.slot==='P'?'투수':POS_KO[e.slot]||e.slot})`);
    if(R.mvp&&(key==='KR1'||key===pl))news(`${s}시즌 ${key==='KR1'?'':BAL.LEAGUES[key].short+' '}MVP: ${R.mvp.name} (${R.mvp.tn}) — ${R.mvp.line}`,'league');}
  S.awards[s]=res;for(const k in S.awards)if(+k<s-10)delete S.awards[k];
  if(S.lastSummary)S.lastSummary.awards=mine;if(mine.length)news(`시상식: 우리 선수 수상 — ${mine.slice(0,4).join(', ')}${mine.length>4?' 외 '+(mine.length-4)+'건':''}`,'contract');}
function compLabel(key){return key&&key.startsWith('KR')?'국내':(BAL.LEAGUES[key]?BAL.LEAGUES[key].short||BAL.LEAGUES[key].name:key);}
// ---------- 아시아 클럽 챔피언십 ----------
// 시즌이 끝나면 국내 한국시리즈 우승팀·일본·대만·호주 리그 우승팀이 모여 풀리그(3경기) 뒤 1·2위 결승. 상금·명성·위상이 걸려 있다.
function lgChamp(lg,winter){const H=(winter?S.overseas.whist:S.overseas.hist)||[];const last=H[H.length-1];if(!last||!last.tables||!last.tables[lg])return null;const rows=last.tables[lg].slice().sort((a,b)=>b.w-a.w);const t=rows[0]&&S.teams[rows[0].id];return t||null;}
function asiaSeries(s,rec){const k1=rec.post&&rec.post.champ!=null?S.teams[rec.post.champ]:null;const kr=k1||S.teams[(rec.tables[1][0]||{}).id];
  const pl=playLg();const champOf=lg=>{if(pl===lg&&rec.lpost&&rec.lpost.lg===lg&&S.teams[rec.lpost.champ])return S.teams[rec.lpost.champ];if(pl===lg){const r=(rec.tables[lg]||[]).slice().sort((a,b)=>a.rank-b.rank||b.w-a.w)[0];return r?S.teams[r.id]:null;}return lgChamp(lg,BAL.LEAGUES[lg]&&BAL.LEAGUES[lg].winter);};
  const teams=[kr,champOf('JP'),champOf('TW'),champOf('AU')].filter(Boolean);if(teams.length<3)return;
  const games=[];const tab={};for(const t of teams)tab[t.id]={w:0,l:0,rs:0,ra:0};const host=['KR','JP','TW'][s%3];
  const play=(a,b)=>{const h=a.league===host?a:b.league===host?b:a,aw=h===a?b:a;for(const t of [h,aw]){if(!t.isUser||!t.lineup.length)autoLineup(t);}const lg=createGame(h.id,aw.id,false);stepGame(lg);const r={h:h.id,a:aw.id,hs:lg.score[1],as:lg.score[0]};games.push(r);return r;};
  for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++){const r=play(teams[i],teams[j]);const hw=r.hs>r.as;const H=tab[r.h],A=tab[r.a];H.rs+=r.hs;H.ra+=r.as;A.rs+=r.as;A.ra+=r.hs;if(hw){H.w++;A.l++;}else{A.w++;H.l++;}}
  const order=teams.slice().sort((a,b)=>tab[b.id].w-tab[a.id].w||(tab[b.id].rs-tab[b.id].ra)-(tab[a.id].rs-tab[a.id].ra));const f=play(order[0],order[1]);const W=f.hs>f.as?S.teams[f.h]:S.teams[f.a],L=W.id===f.h?S.teams[f.a]:S.teams[f.h];
  const prize={1:50000,2:20000};if(W.league==='KR'){W.cash+=prize[1];W.fin.dividend+=prize[1];if(W.pres!=null)W.pres=r1(Math.min(99,W.pres+2));}if(L.league==='KR'){L.cash+=prize[2];L.fin.dividend+=prize[2];}W.rep=clamp(W.rep+4,5,100);W.asia=(W.asia||[]).concat(s);
  S.asia=S.asia||{};S.asia[s]={host,teams:teams.map(t=>t.id),table:order.map(t=>({id:t.id,name:t.name,lg:t.league,...tab[t.id]})),games,final:{w:W.id,l:L.id,score:`${Math.max(f.hs,f.as)}:${Math.min(f.hs,f.as)}`,wn:W.name,ln:L.name}};for(const k in S.asia)if(+k<s-10)delete S.asia[k];
  const ut=userTeam();const mine=teams.some(t=>t.id===ut.id);S.asia[s].mine=mine;
  news(`아시아 클럽 챔피언십 (${({KR:'한국',JP:'일본',TW:'대만'})[host]} 개최): ${W.name} 우승! 결승 ${L.name}에 ${S.asia[s].final.score}${W.league==='KR'?` — 상금 ${money(prize[1])}`:''}`,'league');
  if(mine&&S.lastSummary)S.lastSummary.asia=W.id===ut.id?'아시아 클럽 챔피언십 우승!':L.id===ut.id?'아시아 클럽 챔피언십 준우승':`아시아 클럽 챔피언십 ${order.findIndex(t=>t.id===ut.id)+1}위`;}

// ---------- 코치진 ----------
// 부서 역량 P: 상위 코치부터 가중 합산(1, .7, .5, .35, .25) × (평점-40)/40. 효과는 포화형 곡선, 기준 역량(STAFF_REF) 대비 상대값.
// AI 구단은 코치 목록이 없고 기준 역량(효과 ±0)으로 간주 → 기존 밸런스 유지, 유저만 투자에 따라 차이가 생김.
const CW=[1,0.7,0.5,0.35,0.25];const sat=(P,k)=>1-Math.exp(-P/k);
function staffP(t,d){if(!t||!t.staff)return BAL.STAFF_REF[d];const rs=t.staff.filter(c=>c.dept===d&&(c.years>0||c.expiring)).map(c=>c.rating).sort((a,b)=>b-a);return rs.reduce((s,r,i)=>s+(CW[i]||0.2)*Math.max(0,(r-40)/40),0);}
function staffTrait(t,d,key){return !!(t&&t.staff&&t.staff.some(c=>c.dept===d&&(c.years>0||c.expiring)&&c.trait&&BAL.STAFF_TRAITS[d][c.trait]===key));}
function growMul(P,ref){const f=x=>0.9+0.3*sat(x,1.2);return f(P)/f(ref);}
function staffFx(t){const R=BAL.STAFF_REF;const P={};for(const d in BAL.STAFF)P[d]=staffP(t,d);
  const devF=x=>0.94+0.25*sat(x,1.0);const recF=x=>Math.round(8*sat(x,1.5));const ageF=x=>1-0.3*sat(x,1.5);const scF=x=>0.15*sat(x,1.5);
  return {P,bat:growMul(P.bat,R.bat),pit:growMul(P.pit,R.pit),def:growMul(P.def,R.def),dev:devF(P.dev)/devF(R.dev),
    inj:(1-0.25*sat(P.med,1.5))/(1-0.25*sat(R.med,1.5))*(staffTrait(t,'med','fatigue')?0.92:1),
    rec:recF(P.med)-recF(R.med)+(staffTrait(t,'med','fatigue')?2:0),aging:ageF(P.med)/ageF(R.med)*(staffTrait(t,'med','aging')?0.9:1),
    conf:Math.round((scF(P.scout)-scF(R.scout))*100)/100,watch:Math.floor(P.scout*1.5)+(staffTrait(t,'scout','watch')?1:0),scoutN:P.scout>=3?2:P.scout>=1.5?1:0,devCapUp:P.dev>=1.2?1:0};}
function attrMul(t,p,k,fx){if(!t||!t.staff)return 1;const isP=isPitcher(p);let m=isP?fx.pit:(['speed','defense','arm'].includes(k)?fx.def:fx.bat);const d=isP?'pit':(['speed','defense','arm'].includes(k)?'def':'bat');if(staffTrait(t,d,k))m*=1.2;return m;}
const COACH_BIO={bat:['전 1군 4번 타자 출신','전 2군 타격코치','독립리그 감독 출신','타격 분석원 출신','전 해외리그 타격코치'],pit:['전 1군 에이스 출신','전 2군 투수코치','불펜 포수 출신','전 해외리그 투수코치','투구 분석원 출신'],def:['전 골든글러브 유격수','전 2부 수비코치','전 도루왕 출신','전 대표팀 주루코치'],
  dev:['전 고교 감독','전 대학 감독','전 2군 감독','유소년 아카데미 원장 출신'],scout:['전 스카우트 팀장','전 고교 감독','전력분석원 출신','전 해외 스카우트'],med:['전 대표팀 트레이너','재활센터 출신','스포츠의학 전공','전 1부 수석 트레이너']};
function genCoach(dept,grade){const R={S:[80,92],A:[70,79],B:[60,69],C:[50,59],D:[38,49]};if(!grade){const x=rnd();grade=x<0.04?'S':x<0.17?'A':x<0.45?'B':x<0.8?'C':'D';}
  const rating=ri(R[grade][0],R[grade][1]);const nat=rating>=70&&rnd()<0.25?pick(['JP','US']):'KR';const tr=Object.keys(BAL.STAFF_TRAITS[dept]);const trait=rnd()<(rating>=70?0.7:0.35)?pick(tr):null;
  S.nextCoachId=(S.nextCoachId||1);return {id:S.nextCoachId++,name:genName(nat),nat,age:ri(36,63),dept,rating,trait,salary:Math.round(BAL.STAFF_PAY[gradeOf(rating)]*(0.85+rnd()*0.3)/10)*10,years:0,bio:pick(COACH_BIO[dept])};}
// 우리와 인연 있는 선수가 은퇴하면 코치 후보로 시장에 나온다
function alumniRetire(p){if(!(p.exUser||p.coached||p.userLink)||p.age<31)return;const isP=isPitcher(p);const a=p.attrs;const dept=isP?'pit':(Math.max(a.defense,a.speed)>Math.max(a.contact,a.power)?'def':'bat');
  const best=Math.max(calcOvr(p),...(p.hist||[]).map(h=>0));const rating=clamp(Math.round(42+(calcOvr(p)-45)*0.6+ri(-3,5)),40,78);const abroad=(p.transfers||[]).some(t=>/해외/.test(t.kind));
  S.alumniCoach=(S.alumniCoach||[]);S.nextCoachId=S.nextCoachId||1;S.alumniCoach.push({id:S.nextCoachId++,name:p.name,nat:p.nat,age:p.age+1,dept,rating,trait:null,salary:Math.round(BAL.STAFF_PAY[gradeOf(rating)]*0.85/10)*10,years:0,bio:`우리 구단 출신 · ${abroad?'해외 무대 경험':'현역 '+(p.hist||[]).length+'시즌'}`,alumni:p.id});
  news(`[출신] ${josa(p.name,'이','가')} 은퇴 후 지도자의 길을 원합니다 — 코치 시장에 나왔습니다.`,'alumni');}
function refreshStaffPool(){S.staffPool=[];for(const d in BAL.STAFF){const n=d==='scout'||d==='med'?5:4;for(let i=0;i<n;i++)S.staffPool.push(genCoach(d));}
  // 등급 다양성 보장: 부서마다 B 이상 1명
  for(const d in BAL.STAFF)if(!S.staffPool.some(c=>c.dept===d&&c.rating>=60))S.staffPool.push(genCoach(d,'B'));
  if(S.alumniCoach&&S.alumniCoach.length){S.staffPool.unshift(...S.alumniCoach);S.alumniCoach=[];}}
// 코치 영입 등급: 국내는 위상(신흥 이하 3 · 중견 2 · 강호 이상 1)
function staffTier(t){return t.league==='KR'?(presOf(t)>=60?1:presOf(t)>=22?2:3):(t.league==='JP'||t.league==='US'?1:2);}
// 부임 시 기본 코치진: 기준 역량 수준(효과 ±0 근처). 상위 무대일수록 조금 더 탄탄
// 새 게임 시작 코치진은 어느 구단이든 리그 평균(중립). 이직한 구단은 그 구단 위상 등급의 기본 코치진
function starterStaff(t,neutral){const lv=neutral?3:staffTier(t);const R={1:[64,58],2:[58,55],3:[54,52]}[lv];const st=[];
  for(const d of ['bat','pit','scout','med']){const c=genCoach(d,'C');c.rating=clamp((d==='bat'||d==='pit'?R[0]:R[1])+ri(-1,1),40,90);c.trait=null;c.salary=Math.round(BAL.STAFF_PAY[gradeOf(c.rating)]*0.9/10)*10;c.years=d==='bat'||d==='pit'?2:1;c.since=S.season;st.push(c);}
  if(lv===1){const c=genCoach('def','C');c.rating=55;c.trait=null;c.salary=1800;c.years=2;c.since=S.season;st.push(c);}return st;}
function coachTerms(c,t){t=t||userTeam();const tier=staffTier(t);const g=gradeOf(c.rating);let mult=1,ok=true,why='';
  if(g==='S'){if(tier>=3){ok=false;why='위상이 낮은 구단 제의는 받지 않습니다';}else if(tier===2){mult=1.4;why='중견 구단이라 연봉 40% 더 요구';}}
  else if(g==='A'&&tier===3){mult=1.25;why='신생·약소 구단이라 연봉 25% 더 요구';}
  if(!ok&&g==='S'&&presOf(t)>=60){ok=true;mult=1.5;why=`${presTier(t)} 구단이라 수락 (연봉 50% 더)`;}
  if(ok&&t.league==='KR'&&presOf(t)>=80){mult*=0.93;why=why?why+' (명문 구단이라 일부 할인)':'명문 구단 지도 경력 — 7% 할인';}
  else if(ok&&t.rep>=70){mult*=0.95;why=why?why+' (구단 명성으로 일부 할인)':'구단 명성 덕분에 5% 할인';}
  return {ok,salary:Math.round(c.salary*mult/10)*10,why};}
function deptCount(t,d){return (t.staff||[]).filter(c=>c.dept===d&&c.years>0).length;}
function hireCoach(cid,years){const ut=userTeam();ut.staff=ut.staff||[];const c=(S.staffPool||[]).find(x=>x.id===cid);if(!c)return '이미 다른 곳과 계약했거나 없는 코치입니다.';years=clamp(years|0,1,3);
  if(deptCount(ut,c.dept)>=BAL.STAFF[c.dept].max)return `${BAL.STAFF[c.dept].name} 정원(${BAL.STAFF[c.dept].max}명)이 찼습니다. 기존 코치를 해임한 뒤 영입하세요.`;
  const tm=coachTerms(c,ut);if(!tm.ok)return `${c.name}: ${tm.why}`;if(ut.cash<tm.salary*0.25)return `자금 부족 — 최소 첫 분기 연봉(${money(Math.round(tm.salary*0.25))})은 있어야 합니다.`;
  c.salary=tm.salary;c.years=years;c.since=S.season;c.hiredFor=S.phase==='offseason'?S.season+1:S.season;S.staffPool=S.staffPool.filter(x=>x!==c);ut.staff.push(c);
  news(`${BAL.STAFF[c.dept].name} ${c.name}(${gradeOf(c.rating)}급) 영입 — 연봉 ${money(c.salary)}, ${years}년 계약`,'contract');return null;}
function fireCoach(cid){const ut=userTeam();const c=(ut.staff||[]).find(x=>x.id===cid);if(!c)return '없는 코치입니다.';const sev=severanceOf(c);ut.cash-=sev;ut.fin.other+=sev;ut.staff=ut.staff.filter(x=>x!==c);
  news(`${BAL.STAFF[c.dept].name} ${josa(c.name,'을','를')} 해임했습니다${sev?` (잔여 연봉 보상 ${money(sev)})`:''}.`,'contract');return null;}
function severanceOf(c){if(c.years<=0)return 0;const left=c.years-(S.phase==='season'?(S.day-1)/BAL.SEASON_GAMES:0);return Math.round(c.salary*0.5*Math.max(0,left)/10)*10;}
function renewDemand(c){return Math.round(BAL.STAFF_PAY[gradeOf(c.rating)]*(c.rating>=70?1.05:1)/10)*10;}
function renewCoach(cid,years){const ut=userTeam();const c=(ut.staff||[]).find(x=>x.id===cid);if(!c)return '없는 코치입니다.';if(c.years>0)return '아직 계약 기간이 남았습니다.';
  if(c.age>=67)return `${c.name}: 은퇴를 결심했습니다.`;years=clamp(years|0,1,3);c.salary=renewDemand(c);c.years=years;c.expiring=false;news(`${c.name} 코치와 ${years}년 재계약 (연봉 ${money(c.salary)})`,'contract');return null;}
function staffPay(t){return (t.staff||[]).filter(c=>c.years>0).reduce((s,c)=>s+c.salary,0);}
function staffSeasonEnd(){const ut=userTeam();for(const t of Object.values(S.teams)){if(!t.staff)continue;for(const c of t.staff){c.age++;c.rating=clamp(c.rating+(c.age<46?ri(0,2):c.age>60?-ri(0,2):ri(-1,1)),30,95);if(t===ut&&c.years>0){c.years--;if(c.years<=0){c.expiring=true;news(`${BAL.STAFF[c.dept].name} ${c.name} 계약 만료 — 스토브리그 2주차까지 재계약할 수 있습니다.`,'contract');}}}}
  refreshStaffPool();}
function staffWeek3(){const ut=userTeam();if(!ut.staff)return;const gone=ut.staff.filter(c=>c.years<=0);for(const c of gone)news(`${BAL.STAFF[c.dept].name} ${josa(c.name,'이','가')} 계약 만료로 팀을 떠났습니다.`,'contract');ut.staff=ut.staff.filter(c=>c.years>0);}
// 스카우트 상시 관찰: 매주 역량만큼 우리 선수·육성군·유망주·드래프트 후보의 잠재력 판별을 정밀화
function scoutWatch(){const ut=userTeam();if(!ut.staff)return;const fx=staffFx(ut);if(fx.watch<=0)return;
  const pool=ut.roster.concat(ut.dev,S.youth||[],(S.draft&&!S.draft.done?S.draft.pool:[])).map(P_).filter(p=>p&&p.scout&&p.scout.conf<0.9);shuffle(pool);
  for(const p of pool.slice(0,fx.watch))improveScout(p,0.05);}
function staffSummary(t){const fx=staffFx(t);const pct=m=>{const v=Math.round((m-1)*100);return (v>0?'+':'')+v+'%';};const out={};
  for(const d in BAL.STAFF){const n=deptCount(t,d);let eff;
    if(d==='bat')eff=`컨택·파워·선구안 성장 ${pct(fx.bat)}`;else if(d==='pit')eff=`투수 성장 ${pct(fx.pit)}`;else if(d==='def')eff=`주력·수비·송구 성장 ${pct(fx.def)}`;
    else if(d==='dev')eff=`23세 이하·육성군 성장 ${pct(fx.dev)}${fx.devCapUp?' · 육성군 정원 +1':''}`;
    else if(d==='scout')eff=`판별 정확도 ${fx.conf>=0?'+':''}${Math.round(fx.conf*100)}%p · 매주 ${fx.watch}명 정밀 관찰${fx.scoutN?` · 탐색 후보 +${fx.scoutN}`:''}`;
    else eff=`피로 회복 ${fx.rec>=0?'+':''}${fx.rec}/일 · 노화 속도 ${pct(fx.aging)}`;
    const sc=d==='scout'?fx.conf*100+fx.watch:d==='med'?fx.rec+(1-fx.aging)*20:(fx[d]-1)*100;const tone=sc>0.5?'up':sc<-0.5?'dn':'';
    out[d]={name:BAL.STAFF[d].name,n,exp:(t.staff||[]).filter(c=>c.dept===d&&c.years<=0).length,tone,max:BAL.STAFF[d].max,P:r1(fx.P[d]),ref:BAL.STAFF_REF[d],eff,what:BAL.STAFF[d].what,pay:(t.staff||[]).filter(c=>c.dept===d&&c.years>0).reduce((s,c)=>s+c.salary,0)};}
  return out;}

// ---------- 저장/불러오기 ----------
const STAT_KEYS=['cur','st'];
function serialize(){return JSON.stringify(S,function(k,v){if((k==='cur'||k==='st'||k==='res')&&v&&typeof v==='object'&&!Array.isArray(v)){const o={};for(const kk in v)if(v[kk])o[kk]=v[kk];return o;}if(k==='hist'&&Array.isArray(v)&&v.length&&v[0]&&v[0].st)return v.map(h=>Object.assign({},h,{tn:h.team!=null&&h.tn&&S.teams[h.team]&&S.teams[h.team].name===h.tn?undefined:h.tn,st:stArr(h.st)}));return v;});}
// 시즌 기록은 저장할 때 값만 순서대로 (키 이름 생략, 끝의 0 생략) — 불러올 때 hydrate가 되돌림
const ST_KEYS=Object.keys(newStat());function stArr(st){if(!st||Array.isArray(st))return st;const a=ST_KEYS.map(k=>st[k]||0);while(a.length&&!a[a.length-1])a.pop();return a;}function stObj(a){if(!Array.isArray(a))return a;const o={};ST_KEYS.forEach((k,i)=>{if(a[i])o[k]=a[i];});return o;}
// v28(저장 형식 5) 10구단 단일 리그, v29(형식 6) 실제 연고 도시 10개 구단. 구조가 달라 이전 저장은 불러오지 않는다 (광우 결정, R015·R016)
const OLD_SAVE_MSG='국내 리그가 실제 연고 도시 10개 구단(1군·2군)으로 바뀌어 v29 이전 버전의 저장 파일은 불러올 수 없습니다. 새 게임을 시작해 주세요.';
function validateSave(o){const e=[];if(!o||typeof o!=='object')return ['JSON 객체가 아닙니다'];if(typeof o.version==='number'&&o.version<VERSION){return [OLD_SAVE_MSG];}if(o.version!==VERSION)e.push(`지원하지 않는 버전(${o.version})`);if(!o.teams||typeof o.teams!=='object')e.push('구단 데이터 없음');if(!o.players||typeof o.players!=='object')e.push('선수 데이터 없음');
  if(o.teams&&!o.teams[o.userTeamId])e.push('유저 구단 정보 없음');if(!Array.isArray(o.schedule))e.push('일정 데이터 없음');if(typeof o.rng!=='number')e.push('난수 상태 없음');return e;}
function hydrate(){const fill=st=>Object.assign(newStat(),st||{});
  for(const id in S.players){const p=S.players[id];p.cur=fill(p.cur);if(p.res)p.res=fill(p.res);for(const h of p.rhist||[])h.st=fill(h.st);for(const h of p.hist||[]){h.st=fill(stObj(h.st));if(!h.tn)h.tn=h.team!=null&&S.teams[h.team]?S.teams[h.team].name:'-';}for(const w of p.winter||[])w.st=fill(w.st);p.log=p.log||[];p.transfers=p.transfers||[];p.valHist=p.valHist||[];}
  if(S.liveGame&&S.liveGame.box)for(const id in S.liveGame.box)S.liveGame.box[id]=fill(S.liveGame.box[id]);}
function migrate(){const from=S.version;for(const id in S.players)carFromHist(S.players[id]);if(!S.hof)S.hof=[];if(S.kg==null)S.kg=BAL.SEASON_OPTIONS.includes(S.games)?S.games:144;if(!(S.games>=S.kg))S.games=S.kg;setGames(S.games);
  for(const id in S.teams){const t=S.teams[id];t.dev=t.dev||[];t.fin=Object.assign(newFin(),t.fin||{});}
  if(S.draft===undefined)S.draft=null;S.settings=S.settings||{stopOnOffer:true};S.pins=S.pins||[];if(S.dispatch===undefined)S.dispatch=null;S.overseas=S.overseas||{hist:[]};
  const added=[],renamed=[];
  // v4: 실존 구단명과 겹치던 해외 구단 개명 + 소속 리그/지구 배정 + 실제 리그 규모로 구단 추가
  for(const id in S.teams){const t=S.teams[id];if(t.league==='KR'){const d=TEAM_NAMES.KR.find(x=>x[0]===(t.orig||t.name));if(d&&!t.cc)t.color=d[1];continue;}const nn=t.orig?null:TEAM_RENAME[t.name];if(nn){renamed.push(t.name+'→'+nn);t.name=nn;}
    const def=(TEAM_NAMES[t.league]||[]).find(x=>x[0]===(t.orig||t.name));if(def){if(!t.cc)t.color=def[1];if(def[2]!=null)t.sub=def[2];}}
  const pl0=playLg();
  for(const lg in BAL.LEAGUES){const L=BAL.LEAGUES[lg];const mine=Object.values(S.teams).filter(t=>t.league===lg);const names=new Set(mine.map(t=>t.name));
    if(L.subs)for(const t of mine)if(t.sub==null){const cnt=L.subs.map((_,i)=>mine.filter(x=>x.sub===i).length);t.sub=cnt.indexOf(Math.min(...cnt));}
    const fresh=TEAM_NAMES[lg].filter(x=>!names.has(x[0]));if(!fresh.length)continue;const midUser=pl0===lg&&S.phase==='season';
    for(const [n,c,sub] of fresh){const t=genTeam(n,c,lg,0,false);if(sub!=null)t.sub=sub;if(midUser)t.since=S.season+1;S.teams[t.id]=t;fillRoster(t);autoLineup(t);for(const pid of t.roster){const p=S.players[pid];p.snap={s:S.season,ovr:r1(calcOvr(p)),val:calcValue(p)};}}
    if(midUser&&L.subs)S.compLegacy={s:S.season,lg};
    added.push(`${L.name} ${fresh.length}개 구단`);}
  if(!S.mgr){S.mgr={seasons:(S.history||[]).map(r=>({s:r.s,div:r.user.div,expRank:null,rank:r.user.rank,ps:null,powerStart:null,powerEnd:null,sales:0,salesFee:0,salesProfit:0,devHits:0,abroad:0,legacy:true})),cur:null};
    if(S.phase==='season'){const ut=userTeam();S.mgr.cur={s:S.season,div:ut.div,expRank:null,powerStart:teamPower(ut).power,sales:[]};}}
  const ut=userTeam();for(const id of ut.roster.concat(ut.dev)){const p=S.players[id];if(p&&p.devStart==null&&p.age<=24&&p.base){const b={...p,attrs:p.base};p.devStart=r1(calcOvr(b));}}
  {const u=userTeam();if(!u.staff)u.staff=starterStaff(u);for(const c of u.staff)if(c.years==null)c.years=1;if(!S.staffPool)refreshStaffPool();}
  if(!S.awardLog&&S.awards){const u=userTeam();S.awardLog=[];for(const sn of Object.keys(S.awards).map(Number).sort((a,b)=>a-b))for(const key in S.awards[sn]){const R=S.awards[sn][key];const lab=(e,l)=>`${compLabel(key)} ${l}`;const add=(e,k,l)=>{if(e&&e.tid===u.id)S.awardLog.push({s:sn,k,lab:lab(e,l),pid:e.pid,name:e.name,tid:e.tid,tn:e.tn,vs:e.vs||null});};
    add(R.mvp,'mvp','MVP');add(R.roy,'roy','신인왕');for(const e of R.titles||[])add(e,'title',AWARD_LABEL[e.k]);for(const e of R.gg||[])add(e,'gg',`골든글러브(${e.slot==='OF'?'외야수':e.slot==='P'?'투수':POS_KO[e.slot]||e.slot})`);}}
  if(krTeams().some(t=>!t.isUser&&!t.aim))aiAims(true);   // v29 저장: AI 운영 목표가 없으면 지금 정함
  if(S.phase==='season'&&(!S.res||!S.res.sched||S.res.s!==S.season))futMigrate();
  if((S.lvlV||1)<BAL.LVL_VER){for(const t of overseasTeams()){const d=(BAL.LEVEL_OVR[t.league]||0)-(BAL.LVL_OLD[t.league]!=null?BAL.LVL_OLD[t.league]:BAL.LEVEL_OVR[t.league]);if(!d)continue;for(const id of t.roster){const p=P_(id);if(!p||p.userLink||p.exUser)continue;for(const k in p.attrs)p.attrs[k]=clamp(r1(p.attrs[k]+d),10,99);p.pot=Math.min(99,(p.pot||0)+d);}if(!t.isUser)autoLineup(t);}S.lvlV=BAL.LVL_VER;}
  presMigrate();ensureSpon(userTeam());S.endorseOffers=S.endorseOffers||[];
  S.jobOffers=S.jobOffers||[];S.grievances=S.grievances||[];if(S.mgr){S.mgr.loyalty=S.mgr.loyalty||0;if(S.mgr.rep==null)S.mgr.rep=calcRep();S.mgr.repHist=S.mgr.repHist||[];ensureCareer();if(S.mgr.cur&&!S.mgr.cur.goal){const o=teamOutlook(userTeam());S.mgr.cur.goal=o.goal;}}
  for(const id of userTeam().roster.concat(userTeam().dev)){const p=S.players[id];if(p)p.coached=true;}for(const id in S.players){const p=S.players[id];if(p.exUser)p.coached=true;}
  // 구버전 기록 복원: 판매 이력·옛 제자를 선수 이적 기록에서 다시 연결
  {const ut0=userTeam();const nm=ut0.name;for(const id in S.players){const p=S.players[id];if(p.teamId!==ut0.id&&(p.transfers||[]).some(t=>t.from===nm)){p.coached=true;if(!p.retired&&p.teamId!=null)p.exUser=true;}}
    for(const m of (S.mgr&&S.mgr.seasons)||[])if(m.legacy&&!m.sales){const tr=[];for(const id in S.players)for(const t of S.players[id].transfers||[])if(t.s===m.s&&t.from===nm&&t.fee>0)tr.push(t);if(tr.length){m.sales=tr.length;m.salesFee=tr.reduce((a,t)=>a+t.fee,0);}}}
  if(from!==VERSION){S.version=VERSION;if(added.length)news(`해외 리그가 실제 규모로 개편되었습니다: ${added.join(', ')} 추가`,'sys');if(renamed.length)news(`해외 구단 명칭 변경: ${renamed.join(', ')}`,'sys');}}
// v32: 다른 게임의 가상 구단명과 겹치던 국내 구단 2곳 개명 — v29~v31 저장의 이름·이적 기록·소식까지 함께 바꾼다
const KR_RENAME=[['서울 팰컨스','서울 머스탱스'],['팰컨스 야구장','머스탱스 야구장'],['부산 시걸스','부산 돌핀스']];
function renameKR(json){if(typeof json!=='string')return json;for(const [a,b] of KR_RENAME)if(json.includes(a))json=json.split(a).join(b);return json;}
function load(json){json=renameKR(json);let o;try{o=JSON.parse(json);}catch(err){throw new Error('JSON 형식이 아닙니다.');}const e=validateSave(o);if(e.length)throw new Error(e.join(', '));const prev=S;S=o;try{hydrate();migrate();}catch(err){S=prev;throw new Error('세이브 변환 실패: '+err.message);}return S;}
function state(){return S;}
function setState(o){S=o;if(S){if(S.kg==null)S.kg=S.games||144;setGames(S.games||S.kg);}}

// ---------- 표시 보조 ----------
function statLine(p,st){st=st||p.cur;if(isPitcher(p)){const ip=st.pOuts/3;return {ip:Math.floor(ip)+'.'+(st.pOuts%3),era:st.pOuts?(st.pER*27/st.pOuts).toFixed(2):'-',w:st.pW,l:st.pL,sv:st.pSV,so:st.pSO,bb:st.pBB,h:st.pH,g:st.pG,gs:st.pGS};}
  const avg=st.ab?(st.h/st.ab):0;return {avg:st.ab?avg.toFixed(3).replace(/^0/,''):'-',hr:st.hr,rbi:st.rbi,ops:st.pa?ops_(st).toFixed(3).replace(/^0/,''):'-',g:st.g,pa:st.pa,h:st.h,bb:st.bb,so:st.so,r:st.r,d2:st.d2,d3:st.d3};}
function potText(p){return `${gradeOf(p.scout.lo)}~${gradeOf(p.scout.hi)}`;}
function contractText(p){if(!p.contract)return '계약 없음';const y=p.contract.years;if(S.phase==='season'){if(y<=1)return `이번 시즌(${S.season}) 종료 후 FA`;return `${S.season+y-1}시즌 종료 후 FA`;}if(y<=0)return `계약 만료 — 스토브리그 2주차까지 우선협상`;return `${S.season+y}시즌 종료 후 FA`;}
function diagnose(p){
  const isP=isPitcher(p);const a=p.attrs;const ut=userTeam();const mine=p.teamId===S.userTeamId;
  const bestTxtM={contact:'정확한 타격',power:'장타력',eye:'선구안',speed:'주력',defense:'수비 범위',arm:'송구',stuff:'구위',control:'제구',movement:'변화구 구사',stamina:'체력'};
  const fk=k=>({contact:'contact',power:'power',eye:'eye',speed:'speed',defense:'defense',arm:'defense',stuff:'stuff',control:'control',movement:'movement',stamina:'stamina'}[k]);
  let arch,core,weak=null,lines=[],best,fieldWeak=[];
  if(isP){core=['stuff','control','movement'];if(p.pos==='SP')core.push('stamina');best=[...core].sort((x,y)=>a[y]-a[x])[0];
    arch=p.pos==='SP'?(best==='stuff'?'파워형 선발':best==='control'?'제구형 선발':best==='movement'?'변화구형 선발':'이닝이터'):(best==='stuff'?'파워 불펜':best==='control'?'제구형 불펜':'변화구형 불펜');
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[best]-12||a[lo]<40)weak=lo;}
  else{core=['contact','power','eye'];const off=[...core].sort((x,y)=>a[y]-a[x]);best=off[0];
    const prem=['C','SS','2B','CF'].includes(p.pos);if(prem&&a.defense>=Math.max(a.contact,a.power))best='defense';else if(a.speed>a[off[0]]+5)best='speed';
    arch={contact:'교타형',power:'장타형',eye:'선구안형',speed:'주루형',defense:'수비형'}[best]+' '+(POS_KO[p.pos]||p.pos);
    const lo=[...core].sort((x,y)=>a[x]-a[y])[0];if(a[lo]<=a[off[0]]-12)weak=lo;if(!weak&&prem&&a.defense<45)weak='defense';
    fieldWeak=['speed','defense','arm'].filter(k=>a[k]<35&&k!==weak);}
  const young=p.age<=24;const est=p.scout?p.scout.est:p.pot;const ovr=calcOvr(p);
  const target=isP?(p.pos==='SP'?'1~3선발':'필승조·마무리'):(best==='power'?'주전 중심타자':best==='contact'||best==='eye'?'주전 테이블세터':best==='speed'?'주전 리드오프':'주전 '+(POS_KO[p.pos]||''));
  const goal=young&&est-ovr>=5?`${arch.split(' ')[0]} 유망주 → ${target}`:ovr>=65?`${target} (전성기 유지)`:`${arch} → ${target} 경쟁`;
  // 타격/투구 진단
  const st=(p.cur.pa>0||p.cur.pOuts>0)&&S.phase==='season'?p.cur:(p.hist.length?p.hist[p.hist.length-1].st:null);
  const small=!st||(isP?st.pOuts<30:st.pa<40);const mid=!small&&(isP?st.pOuts<90:st.pa<100);const n=st?(isP?Math.floor(st.pOuts/3)+'이닝':st.pa+'타석'):'0';
  // 실제 성적의 좋고 나쁨(표본이 있을 때만): 성적과 능력치 진단이 서로 모순되지 않게 문장을 고른다
  const perf=(!st||small)?0:isP?(()=>{const era=st.pER*27/st.pOuts;return era<=3.2?1:era>=5.2?-1:0;})():(()=>{const avg=st.ab?st.h/st.ab:0;const ops=ops_(st);return (avg>=.300||ops>=.850)?1:(avg<=.230&&ops<=.650)?-1:0;})();
  const wk=isP?{control:['제구','볼넷'],movement:['변화구','장타 허용'],stuff:['구위','피안타'],stamina:['체력','긴 이닝 소화']}:{contact:['컨택','타율'],power:['장타력','타점 생산'],eye:['선구안','삼진·볼넷'],defense:['수비','실점']};
  const weakLine=()=>{const w=wk[weak];if(!w)return isP?'구종·제구가 고르게 갖춰져 있습니다':'타격 능력이 고르게 갖춰져 있습니다';
    if(perf>0)return `지금 성적은 좋지만 능력치상 ${josa(w[0],'이','가')} 약점이라, 상대 수준이 오르면 ${w[1]} 쪽에서 흔들릴 수 있습니다`;
    if(perf<0)return `${w[0]} 약점이 ${w[1]}에서 그대로 드러나고 있습니다`;
    return `능력치상 ${josa(w[0],'이','가')} 상대적 약점입니다 (${w[1]}에 영향)`;};
  if(isP){let t=weakLine();
    if(st&&!small){const era=st.pER*27/st.pOuts;t=`ERA ${era.toFixed(2)} — `+t;}lines.push({k:'투구',t});}
  else{let t=weak==='defense'?`${POS_KO[p.pos]}에 필요한 수비력이 부족합니다`:weakLine();
    if(st&&!small){const avg=st.ab?(st.h/st.ab):0;t=`타율 ${avg.toFixed(3).replace(/^0/,'')} ${st.hr}홈런 — `+t;}lines.push({k:'타격',t});
    if(fieldWeak.length){const dw=fieldWeak.includes('defense')||fieldWeak.includes('arm');lines.push({k:'수비·주루',t:`${fieldWeak.map(k=>ATTR_KO[k]+' '+Math.round(a[k])).join(' · ')} — ${dw?'수비에서 실점 위험이 크고':''}${dw&&fieldWeak.includes('speed')?', ':''}${fieldWeak.includes('speed')?'주루·병살에서 손해가 큽니다':'지명타자·1루 기용이 현실적입니다'}`,warn:true});}
    const cur=mine?ut.pos[p.id]:null;if(cur&&cur!=='DH'&&cur!==p.pos){const pen=posPenalty(p,cur);lines.push({k:'수비',t:`현재 ${POS_KO[cur]} 배치는 적성 밖이라 수비가 ${pen} 낮아집니다 → ${POS_KO[p.pos]} 복귀 검토`,warn:true});}
    else if(mine&&cur)lines.push({k:'수비',t:`${POS_KO[cur]} 배치 — 적성에 맞습니다`});}
  const tm=p.teamId!=null?S.teams[p.teamId]:null;if(tm){const ls=leagueStanding(p,leagueKey(tm));if(ls.label!=='-')lines.push({k:'리그 내 위상',t:`${tm.league==='KR'?'국내 리그':compName(tm.league)}에서는 ${ls.label.replace('리그 ','')}입니다`+(weak&&ls.cls==='g'?` — 더 높은 무대를 노린다면 ${(wk[weak]||[ATTR_KO[weak]])[0]} 보완이 필요합니다`:'')});}
  lines.push({k:'판단 신뢰도',t:small?`표본 부족 (${n}) — 성적보다 능력치로 판단하세요`:mid?`참고 수준 (${n}) — 성적과 능력치를 함께 보세요`:`표본 충분 (${n})`,warn:small});
  const rec=weak?fk(weak):young&&est-ovr>=5?fk(best==='arm'?'defense':best):'balance';
  const F=isP?FOCUS_PIT:FOCUS_BAT;const recText=rec==='balance'?'균형 훈련 유지':`${F[rec]} 훈련 추천`+(weak?` (${ATTR_KO[weak]} 보완)`:` (강점 강화)`);
  return {arch,goal,weak,fieldWeak,best,bestTxt:bestTxtM[best],lines,rec,recText,small};
}
function advice(p){const d=diagnose(p);return {text:d.lines.map(l=>l.t).join(' '),goal:d.rec==='balance'?null:d.rec,goalKo:d.rec==='balance'?null:(isPitcher(p)?FOCUS_PIT:FOCUS_BAT)[d.rec]};}
function nextCheck(){return S.phase==='season'?(7-((S.day-1)%7)):null;}
// 화면의 종합은 반올림 값 → 변화량도 반올림 값끼리 빼되, 실제 차이가 0.5 미만이면 0 (스냅숏 반올림 때문에 생기던 「-1」 방지)
function ovrD(now,base){return Math.abs(now-base)<0.5?0:Math.round(now)-Math.round(base);}
function seasonDelta(p){const b=growthBase(p);if(!b)return null;return {d:ovrD(calcOvr(p),b.ovr),v:b.val?calcValue(p)-b.val:null};}
// 판매 영향: 실제 편성 기준으로 역할을 판정하고, 그 자리를 누가 메우는지 표시
function rosterRole(t,pid){const p=P_(pid);if(!p)return {key:'none',text:'-'};if((t.dev||[]).includes(pid))return {key:'dev',text:'육성군'};if(p.tier>1&&BAL.FARM[t.league])return {key:'farm',text:farmKo(t.league,p.tier)};
  if(isPitcher(p)){const ri=t.rotation.indexOf(pid);if(ri>=0)return {key:'sp',text:`선발 ${ri+1}번`,slot:ri};if(t.closer===pid)return {key:'cl',text:'마무리'};
    const bi=t.bullpen.indexOf(pid);if(bi>=0&&bi<4)return {key:'rp',text:'필승조 불펜'};return {key:'bp',text:'추격조·대기 투수'};}
  if(t.lineup.includes(pid))return {key:'bat',text:`주전 ${POS_KO[t.pos[pid]]||t.pos[pid]}`,pos:t.pos[pid]};return {key:'bench',text:'벤치 야수'};}
function saleImpact(pid){const ut=userTeam();const p=P_(pid);if(!p||p.teamId!==ut.id)return null;const before=teamPower(ut),after=teamPower(ut,pid);
  const role=rosterRole(ut,pid);const res={before:before.power,after:after.power,delta:r1(after.power-before.power),newcomers:[],role:role.text,roleKey:role.key};
  const pool=ut.roster.filter(id=>id!==pid).map(P_).filter(x=>x&&!x.retired);
  if(role.key==='sp'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)).sort((a,b)=>(b.pos==='SP')-(a.pos==='SP')||calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:`선발 로테이션${cand.pos==='RP'?' (불펜에서 전환)':''}`});}
  else if(role.key==='cl'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)).sort((a,b)=>(b.pos==='RP')-(a.pos==='RP')||calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:'마무리'});}
  else if(role.key==='rp'){const cand=pool.filter(x=>isPitcher(x)&&!ut.rotation.includes(x.id)&&ut.closer!==x.id&&ut.bullpen.indexOf(x.id)>=4||(isPitcher(x)&&!ut.rotation.includes(x.id)&&!ut.bullpen.includes(x.id)&&ut.closer!==x.id)).sort((a,b)=>calcOvr(b)-calcOvr(a))[0];if(cand)res.newcomers.push({p:cand,pos:'필승조 불펜'});}
  else if(role.key==='bat'){const bl=before.lineup.pos,al=after.lineup.pos;const soldPos=bl[pid]||role.pos;
    // 연쇄 이동: 판 선수 자리를 누가 맡고, 그 선수의 원래 자리는 누가 맡는지
    res.chain=[];for(const id in al){if(+id===pid)continue;const from=bl[id]||null,to=al[id];if(from!==to)res.chain.push({p:P_(+id),from,to});}
    res.chain.sort((a,b)=>(b.to===soldPos)-(a.to===soldPos)||(a.from==null)-(b.from==null));const dir=Object.keys(al).find(id=>al[id]===soldPos&&+id!==pid);res.direct=dir!=null?P_(+dir):null;res.soldPos=soldPos;
    if(res.direct){const pen=posPenalty(res.direct,soldPos);const dd=Math.round((p.attrs.defense-posPenalty(p,soldPos))-(res.direct.attrs.defense-pen));if(pen>=5||dd>=8)res.defNote=`${POS_KO[soldPos]||soldPos} 수비가 약해집니다 (${res.direct.name}${pen?` · 본래 ${POS_KO[res.direct.pos]||res.direct.pos}, 이 자리 불이익 −${pen}`:''}${dd>=8?` · 수비 ${dd} 낮음`:''})`;}
    for(const id in al)if(bl[id]==null&&+id!==pid)res.newcomers.push({p:P_(+id),pos:POS_KO[al[id]]||al[id]});
    if(!res.newcomers.length){const cand=pool.filter(x=>!isPitcher(x)&&!ut.lineup.includes(x.id)).sort((a,b)=>posOvr(b,role.pos)-posOvr(a,role.pos))[0];if(cand)res.newcomers.push({p:cand,pos:POS_KO[role.pos]||role.pos});}}
  res.gap=['sp','cl','rp','bat'].includes(role.key)&&!res.newcomers.length;
  return res;}
function facEffect(k,lv){if(k==='train')return [`성장 속도 +${(lv-1)*12}%`,`피로 회복 ${BAL.FATIGUE_RECOVER+(lv-1)*2}/일`];if(k==='youth')return [`유소년 후보 ${2+lv}명/시즌`,`육성군 정원 ${BAL.DEV_BASE+lv}명`,`유망주 잠재 보너스 +${(lv*2.5).toFixed(1)}`];return [`보고서 정확도 +${(lv-1)*5}%`,`후보 수 ${lv>=3?'+1':'기본'}`];}
function growthTop(n){const ut=userTeam();const label=S.phase==='season'?null:null;const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p||!p.log.length)continue;const l=p.log[0];let d=0;for(const k in l.ch)d+=l.ch[k];const since=p.ovrStart!=null?r1(calcOvr(p)-p.ovrStart):0;rows.push({p,d:r1(d),since,label:l.label});}rows.sort((a,b)=>b.d-a.d);return rows.slice(0,n||3);}
// 기록 보관 시즌 수: 우리와 인연 있는 선수는 길게, 나머지는 최근 5시즌
// 통산(1군) 기록: 시즌 기록은 최근 몇 시즌만 남기므로, 명예의 전당·통산 표시는 이것으로 본다
const CAR_B=['g','pa','ab','h','d2','d3','hr','bb','so','rbi'],CAR_P=['pG','pGS','pOuts','pH','pER','pBB','pSO','pW','pL','pSV'];
function addCar(p,st,tn){if(!st||!(st.g||st.pG))return;const c=p.car=p.car||{n:0,tm:{}};c.n++;for(const k of (isPitcher(p)?CAR_P:CAR_B))if(st[k])c[k]=(c[k]||0)+st[k];if(tn){c.tm[tn]=(c.tm[tn]||0)+1;const ks=Object.keys(c.tm);if(ks.length>4){const lo=ks.sort((a,b)=>c.tm[a]-c.tm[b])[0];delete c.tm[lo];}}}
function carFromHist(p){if(p.car)return;for(const h of (p.hist||[]))if(!h.w&&(h.lg==='KR1'||!/\d$/.test(h.lg||'')))addCar(p,h.st,(h.tn||'').split(' · ')[0]);if(!p.car)p.car={n:0,tm:{}};p.car.old=1;}
function mainTeam(p){const tm=(p.car&&p.car.tm)||{};const k=Object.keys(tm).sort((a,b)=>tm[b]-tm[a])[0];return k||(p.teamId!=null&&S.teams[p.teamId]?S.teams[p.teamId].name:'-');}
// ---------- 명예의 전당: 게임 안에서 쌓은 1군 통산 기록 · 수상 · 올스타 선정으로 점수를 매겨 은퇴할 때 헌액 ----------
const HOF_MIN=12,HOF_SEASONS=5;   // 한국·우리 리그 1군 5시즌 이상 + 점수
function hofParts(p){const c=p.car||{};const f=144/Math.max(36,(S&&S.kg)||144);const A=p.awards||[];const n=k=>A.filter(a=>a.k===k).length;const out=[];
  const add=(v,t)=>{if(v>0)out.push({v,t});};
  add(n('mvp')*4,`MVP ${n('mvp')}회`);add(n('gg'),`골든글러브 ${n('gg')}회`);add(n('roy'),'신인왕');add(n('title')*0.5,`타이틀 ${n('title')}회`);
  const as=(p.asel||[]).length;add(as*0.5,`올스타 ${as}회`);
  if(!isPitcher(p)){const H=(c.h||0)*f,HR=(c.hr||0)*f;add(H>=2000?5:H>=1500?3:0,`통산 ${c.h||0}안타`);add(HR>=350?5:HR>=250?3:0,`통산 ${c.hr||0}홈런`);}
  else{const W=(c.pW||0)*f,SV=(c.pSV||0)*f,SO=(c.pSO||0)*f;add(W>=150?5:W>=120?3:0,`통산 ${c.pW||0}승`);add(SV>=300?5:SV>=200?3:0,`통산 ${c.pSV||0}세이브`);add(SO>=1500?2:0,`통산 ${c.pSO||0}탈삼진`);}
  add((c.n||0)>=10?1:0,`1군 ${c.n}시즌`);return out;}
function hofScore(p){return Math.round(hofParts(p).reduce((a,x)=>a+x.v,0)*10)/10;}
function carLine(p){const c=p.car||{};if(!c.n)return '1군 기록 없음';if(isPitcher(p)){const ip=Math.floor((c.pOuts||0)/3);return `${c.n}시즌 ${c.pG||0}경기 ${c.pW||0}승 ${c.pL||0}패 ${c.pSV||0}세이브 · ${ip}이닝 ERA ${c.pOuts?((c.pER||0)*27/c.pOuts).toFixed(2):'-'} · ${c.pSO||0}탈삼진`;}
  return `${c.n}시즌 ${c.g||0}경기 타율 ${c.ab?((c.h||0)/c.ab).toFixed(3).replace(/^0/,''):'-'} · ${c.h||0}안타 ${c.hr||0}홈런 ${c.rbi||0}타점`;}
function hofRetire(p,s){if(!p.car||(p.car.n||0)<HOF_SEASONS)return false;const sc=hofScore(p);if(sc<HOF_MIN)return false;p.retired=true;p.retiredSeason=s;p.teamId=null;
  p.hof={s,age:p.age,score:sc,tn:mainTeam(p),why:hofParts(p).sort((a,b)=>b.v-a.v).map(x=>x.t).slice(0,4),line:carLine(p)};S.hof=(S.hof||[]).concat([p.id]);
  news(`[명예의 전당] ${josa(p.name,'이','가')} 은퇴와 함께 명예의 전당에 헌액됩니다 — ${p.hof.why.join(' · ')}`,p.userLink||p.exUser?'alumni':'league');return true;}
function hofList(){return (S.hof||[]).map(P_).filter(p=>p&&p.hof).sort((a,b)=>b.hof.s-a.hof.s||b.hof.score-a.hof.score);}
function hofCands(n){const live=new Set(['KR1',playLg()?leagueKey({league:playLg()}):null]);return Object.values(S.players).filter(p=>!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&live.has(leagueKey(S.teams[p.teamId]))&&p.car&&p.car.n>=1).map(p=>({p,sc:hofScore(p)})).filter(x=>x.sc>=3).sort((a,b)=>b.sc-a.sc).slice(0,n||8);}
function histCap(p){return (p.userLink||p.exUser||p.coached||(S.pins||[]).includes(p.id))?15:5;}
function snapOf(p){return {s:S.season,c:S.clock,ovr:r1(calcOvr(p)),val:calcValue(p),attrs:JSON.parse(JSON.stringify(p.attrs))};}
function baseSnap(p){return growthBase(p);}
// 성장 비교 기준: 시즌 시작 스냅숏. 그 뒤에 우리 팀에 합류한 선수는 합류(입단) 시점 기준 — 홈·상세·보고서 공통
function joinedAfterSnap(p){const sn=p.snap;if(!sn||p.teamId!==S.userTeamId)return false;if(p.joinClock!=null)return sn.c==null||sn.c<p.joinClock;return !!sn.join||(S.phase==='offseason'&&sn.s===S.season&&(p.transfers||[]).some(t=>t.s===S.season&&/드래프트/.test(t.kind)));}
function growthBase(p){if(joinedAfterSnap(p)){const j=p.joinSnap;if(j)return {s:j.s,ovr:j.ovr,val:j.val,attrs:j.attrs,join:true,label:'입단 대비'};if(p.base){return {s:S.season,ovr:r1(calcOvr({...p,attrs:p.base})),val:null,attrs:p.base,join:true,label:'입단 대비'};}return null;}
  return p.snap?{...p.snap,label:S.phase==='season'?'시즌 시작 대비':p.snap.s+'시즌 시작 대비'}:null;}
function report(p){const b=baseSnap(p);if(!b||!b.attrs)return null;const now=calcOvr(p);const ch={};let bestK=null,bestD=-99;for(const k in p.attrs){const d=r1(p.attrs[k]-(b.attrs[k]!=null?b.attrs[k]:p.attrs[k]));ch[k]=d;if(d>bestD){bestD=d;bestK=k;}}
  const dd=ovrD(now,b.ovr);return {s:b.s,from:Math.round(now)-dd,to:Math.round(now),d:dd,valFrom:b.val||null,valTo:calcValue(p),ch,bestK,bestD,bestFrom:b.attrs[bestK]};}
// 콜업 후보: 2군·육성군에서 뛰는 우리 선수 중 1군 같은 자리 주전과 종합 3 이내이거나 앞서는 선수 (2군 기록 함께)
function callupCands(n){const ut=userTeam();const res=new Set(reserveIds(ut));const out=[];
  for(const id of res){const p=P_(id);if(!p||p.loan||p.dispatch)continue;const ov=calcOvr(p);let rival=null;
    if(isPitcher(p)){const pool=(p.pos==='SP'?ut.rotation:ut.bullpen.filter(x=>x!==ut.closer)).filter(x=>x!==p.id);const w=pool.map(P_).filter(Boolean).sort((a,b)=>calcOvr(a)-calcOvr(b))[0];rival=w;}   // 불펜은 마무리가 아니라 가장 약한 불펜(추격조)과 비교
    else{const sid=ut.lineup.find(x=>ut.pos[x]===p.pos);rival=sid!=null?P_(sid):null;}
    if(!rival)continue;const gap=ov-calcOvr(rival);if(gap<-3)continue;const st=p.res;const good=st&&(isPitcher(p)?(st.pOuts>=9&&st.pER*27/st.pOuts<4.2):(st.pa>=12&&ops_(st)>=0.75));
    const rrole=isPitcher(p)?(p.pos==='SP'?'선발 5번':'추격조'):(POS_KO[p.pos]||p.pos)+' 주전';out.push({p,rival,rrole,gap:r1(gap),good,score:gap+(good?2:0)+(p.age<=24?1:0)});}
  return out.sort((a,b)=>b.score-a.score).slice(0,n||2);}
// 정체 주의: 성장 여지가 있는데 최근 성장 점검 두 번 이상 거의 오르지 않은 선수와 그 원인 (실제 성장 로그 기준)
function stallList(n){const ut=userTeam();const out=[];for(const id of ut.roster.concat(ut.dev)){const p=P_(id);if(!p||!p.log||p.log.length<2||p.age>29)continue;const L=p.log.slice(0,2);if(L.some(x=>x.d>=0.3))continue;if((p.pot-calcOvr(p))<3)continue;
    const fs=L.flatMap(x=>x.f);const why=fs.includes('출장 기회 부족')?{t:'출장 기회 부족',a:'2군 집중 육성 지정 또는 임대'}:fs.some(x=>/2군 벤치/.test(x))?{t:'2군에서도 벤치',a:'2군 집중 육성 지정'}:fs.includes('피로 누적')||fs.includes('과도한 출장(피로)')?{t:'피로 누적',a:'휴식·로테이션 조정'}:fs.includes('훈련 태만')?{t:'훈련 태도',a:'훈련 방향 점검'}:{t:'성장 시기 정체',a:'훈련 방향 바꾸기·출장 늘리기'};
    out.push({p,why,pot:p.pot});}
  return out.slice(0,n||2);}
// 1군·2군 맞바꾸기: 올릴 선수가 내려갈 선수의 자리(타순·수비 위치·선발 순번·필승조)를 그대로 맡는다. 이적·계약 변화 없음
function callupPlan(upId,downId){const ut=userTeam();const up=P_(upId),dn=P_(downId);if(!up||!dn)return {ok:false,msg:'선수를 찾을 수 없습니다.'};
  const inDev=ut.dev.includes(upId);if(!inDev&&!ut.roster.includes(upId))return {ok:false,msg:'우리 구단 선수가 아닙니다.'};const notes=[];let slot=null,ok=true;
  if(isPitcher(up)!==isPitcher(dn))return {ok:false,msg:'투수는 투수와, 야수는 야수와 바꿀 수 있습니다.'};
  if(isPitcher(up)){const ri=ut.rotation.indexOf(downId),bi=ut.bullpen.indexOf(downId);if(ri>=0)slot={k:'sp',i:ri,text:`선발 ${ri+1}번`};else if(bi>=0&&bi<4)slot={k:'rp',i:bi,text:'필승조 불펜'};else if(ut.closer===downId)slot={k:'cl',text:'마무리'};else return {ok:false,msg:'내려갈 선수가 1군 주요 투수가 아닙니다.'};
    if(slot.k==='sp'&&up.pos!=='SP')notes.push({ok:up.attrs.stamina>=55,text:up.attrs.stamina>=55?`불펜 투수지만 체력 ${Math.round(up.attrs.stamina)}로 선발 가능`:`체력 ${Math.round(up.attrs.stamina)} — 긴 이닝은 어렵습니다`});}
  else{const pos=ut.pos[downId];if(!ut.lineup.includes(downId)||!pos)return {ok:false,msg:'내려갈 선수가 1군 주전이 아닙니다.'};const po=posOvr(up,pos),ov=calcOvr(up);slot={k:'bat',pos,i:ut.lineup.indexOf(downId),text:`주전 ${POS_KO[pos]||pos} (${ut.lineup.indexOf(downId)+1}번 타순)`};
    const fit=pos==='DH'||po>=ov-4;notes.push({ok:fit,text:fit?`변경 후 ${POS_KO[pos]||pos} 수비 가능`:`${POS_KO[pos]||pos} 수비 적응 부족 (그 자리 평가 ${Math.round(po)}, 본래 ${Math.round(ov)})`});
    if(pos==='C'&&up.pos!=='C')notes.push({ok:false,text:'포수가 아닌 선수가 포수를 맡습니다'});}
  if(inDev){if(ut.roster.length<BAL.MAX_ROSTER)notes.push({ok:true,text:`육성군 → 1군 등록 (1군 ${ut.roster.length+1}/${BAL.MAX_ROSTER}명)`});
    else if(ut.dev.length<devCap(ut)&&!S.market.listed.includes(downId))notes.push({ok:true,text:`1군 정원이 차서 ${josa(dn.name,'은','는')} 육성군으로 내려갑니다`});else{ok=false;notes.push({ok:false,text:'1군·육성군 정원이 모두 찼습니다'});}}
  else notes.push({ok:true,text:`1군 정원 유지 (${ut.roster.length}/${BAL.MAX_ROSTER}명)`});
  const fat=Math.round(dn.fatigue||0);const downRole=inDev&&ut.roster.length>=BAL.MAX_ROSTER?'육성군 (2군 경기 출장)':isPitcher(dn)?'1군 대기 → 2군 등판':'1군 벤치 → 2군 경기 출장';
  return {ok,up,dn,slot,notes,inDev,upRole:slot.text,downRole,downWhy:fat>=60?`피로 ${fat} — 휴식`:isPitcher(dn)?'투구 점검':'타격 점검'};}
function callupSwap(upId,downId){const pl=callupPlan(upId,downId);if(!pl.ok)return pl.msg||pl.notes.filter(x=>!x.ok).map(x=>x.text).join(', ');const ut=userTeam();
  if(pl.inDev){if(ut.roster.length>=BAL.MAX_ROSTER){const e=demoteDev(downId);if(e)return e;}ut.dev=ut.dev.filter(x=>x!==upId);ut.roster.push(upId);}
  const sl=pl.slot;
  if(sl.k==='bat'){if(ut.lineup.includes(downId)){ut.lineup[sl.i]=upId;ut.pos[upId]=sl.pos;delete ut.pos[downId];}}
  else if(sl.k==='sp'){ut.rotation[ut.rotation.indexOf(downId)]=upId;ut.bullpen=ut.bullpen.filter(x=>x!==upId);if(ut.roster.includes(downId))ut.bullpen.push(downId);}
  else if(sl.k==='rp'){const bi=ut.bullpen.indexOf(downId);ut.bullpen=ut.bullpen.filter(x=>x!==upId);const j=ut.bullpen.indexOf(downId);ut.bullpen[j]=upId;if(ut.roster.includes(downId))ut.bullpen.push(downId);}
  else if(sl.k==='cl'){ut.closer=upId;ut.bullpen=ut.bullpen.filter(x=>x!==upId);if(ut.roster.includes(downId))ut.bullpen.push(downId);}
  delete pl.up.resFocus;fixLineup(ut);news(`[1군 등록] ${pl.up.name} → ${sl.text} · ${pl.dn.name} → ${pl.downRole}`,'contract');return null;}
function growthReport(n){const ut=userTeam();const rows=[];for(const pid of ut.roster.concat(ut.dev)){const p=P_(pid);if(!p)continue;const r=report(p);if(r&&r.d>0)rows.push({p,r});}rows.sort((a,b)=>b.r.d-a.r.d||b.r.bestD-a.r.bestD);return rows.slice(0,n||3);}
function togglePin(pid){if(S.pins.includes(pid))S.pins=S.pins.filter(x=>x!==pid);else{S.pins.unshift(pid);if(S.pins.length>5)S.pins.length=5;}}
function interestText(p){if(!p.interest)return null;const t=S.teams[p.interest.team];if(!t)return null;const st=['관심 없음','관찰 중','영입 검토','공식 제안'][p.interest.stage]||'관찰 중';return `${t.name} — ${st}`;}

return {BAL,VERSION,GAME_VER,ATTR_KO,FOCUS_BAT,FOCUS_PIT,TRAITS,POS_BAT,BAT_KEYS,PIT_KEYS,NEED_TEMPLATE,
  newGame,state,setState,load,serialize,validateSave,
  startDay,endUserGame,finishDay,playDayAuto,stepPitch,stepPA,stepHalf,stepGame,finalizeGame,changePitcher,pinchHit,availableBullpen,bench,curBatter,curPitcher,
  standings,rankOf,userTeam,userGameToday,payroll,ticketIncome,isUserGame,
  calcOvr,posOvr,gradeOf,calcValue,salaryFor,money,isPitcher,velocity,statLine,ops_,potText,confText,scoutReport,interestText,needOf,countPos,
  autoLineup,fixLineup,rosterCheck,autoFillUser,
  listPlayer,unlistPlayer,respondOffer,negotiate,cancelNeg,renewContract,releasePlayer,takeLoan,upgradeFacility,runScout,signScouted,aiAsk,playerDemand,
  endSeason,advanceWeek,startNewSeason,growthTick,interestCheck,
  promoteDev,demoteDev,devCap,draftAvail,draftPick,draftAuto,draftTurn,draftStep,draftContract,draftPending,draftBonus,draftRoom,
  willingInfo,contractText,advice,growthTop,togglePin,openTable,tableOffer,tableLeave,tableLeft,report,growthReport,
  diagnose,nextCheck,seasonDelta,saleImpact,rosterRole,growthBase,promiseKept,promiseStatus,grievanceAnswer,offVal,weeklyStory,coachNotes,reportStart,reportEnd,teamStreak,winterResults,facEffect,teamPower,bestLineup,posPenalty,josa,POS_KO,NAT_KO,
  compOf,compTeams,leagueComps,lgOf,jerseyOf,compLabel,AWARD_LABEL,parkOf,setNextGames,loanDeadline,dayAt,gf,advStats,batLine,pitLine,batWar,pitWar,lgCtx,leaders,compKeyOf,sponSettle,sponBase,sponSign,boardSign,boardDrop,boardSlots,sponStatus,starScore,endorseOffers,endorseAnswer,ensureSpon,sponAutoPick,presSeasonEnd,presOf,presTier,presTierOf,presTierIdx,presTable,presIncome,presPull,reserveTable,reserveIds,loanCheck,loanOptions,loanPlayer,postInfo,goalProgress,goalCheck,youngGrown,testInfo,testCmd,TEAM_NAMES,staffSummary,staffFx,staffP,hireCoach,fireCoach,renewCoach,coachTerms,severanceOf,renewDemand,deptCount,staffPay,refreshStaffPool,compName,playLg,calcRep,repGrade,repParts,teamOutlook,genJobOffers,declineJob,moveManager,econ,
  leagueKey,leagueStanding,expectedRole,standingAll,winterTeams,dispatchEligible,dispatchOptions,dispatchPlayer,cancelDispatch,declineDispatch,resolveDispatch,levelOf,
  postReach,postRecord,postCur,POST_TEXT,lgGames,calDays,userGames,lpostInfo,lpostText,lpostRule,setPlan,planEval,myPlayers,PLAN_KO,nickCheck,customizeTeam,EMB_SHAPES,injList,recSeason,leadersPast,hofParts,hofScore,hofList,hofCands,carLine,mainTeam,HOF_MIN,lpostReach,lpostNextName,fgnRuleText,isFgnIn,asNames,asLg,twHalf,LPOST_LG,DRAFT_LG,perfRankBonus,OLD_SAVE_MSG,aimOf,callupPlan,callupSwap,AIM_KO,setResFocus,resFocusList,resFocusWarn,callupCands,stallList,perfBonus,watchReasons,WATCH_KO,careerMs,firstPickCands,firstPick,firstPickResult,recapNext,needCats,draftAutoOne,draftMyLeft,farmKo,farmTierOf,farmCheck,capOf,nearCap,bdOf,dateOf,WGOAL,achList,ACH,farmGrade,renewAll,renewDemandOf,ledgerAdd,tradeEval,tradePropose,tradeOpen,tradeDeadline,tradeCore,tradeVal,convOpts,convDays,startConv,cancelConv,TACTICS,tacOk,setTactic,tacNow,stealP,transferPlayer,isFgn,fgnList,fgnStatus,fgnBlock,asiaOk,NAT_KO,ASIA_NAT,createFDraft,fdAvail,fdPick,fdAuto,fdTurn,fdCur,fdStep,fdNeeds,fdFits,allStar,asDay,AS_SQUAD,asSquadOf,futGames,futStand,futTeam,futNext,futDivOf,FUT_DIV_KO,FUT_INDEP,futDay,futPost,
  P:P_,krTeams,overseasTeams,rnd};
})();
if(typeof module!=='undefined')module.exports=SL;

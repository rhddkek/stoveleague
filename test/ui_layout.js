// 실제 브라우저(Playwright) 검사: 360px 폰 화면 가로 넘침 · 하단 메뉴 가림 · 새 화면 흐름(구단 유형, 이야기, 보고서, 결산, 지명·계약 연출, 필터)
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('playwright 없음 — 건너뜀 (통과 처리)');process.exit(0);}
const path=require('path');const FILE='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:360,height:740}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForTimeout(400);
  const over=async label=>{const r=await p.evaluate(()=>{const d=document.documentElement;const wide=[...document.querySelectorAll('body *')].filter(e=>{if(e.closest('.tw,.ovseg,.subtabs,.glog,table'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.right>d.clientWidth+2;}).slice(0,3).map(e=>e.className||e.tagName);return {sw:d.scrollWidth,cw:d.clientWidth,wide};});if(r.sw>r.cw+1||r.wide.length)bad(`${label} 가로 넘침 ${r.sw}>${r.cw} ${r.wide.join(',')}`);return r;};
  const navCover=async label=>{const r=await p.evaluate(()=>{const nav=document.querySelector('.nav');const c=document.querySelector('.content');if(!nav||!c)return null;return {pad:parseFloat(getComputedStyle(c).paddingBottom)+parseFloat(getComputedStyle(c.parentElement).paddingBottom||0),nav:nav.getBoundingClientRect().height};});if(r&&r.pad+2<r.nav)bad(`${label} 하단 메뉴가 내용을 가림 (여백 ${r.pad} < 메뉴 ${r.nav})`);};
  const has=async s=>{const t=await p.evaluate(()=>document.body.innerText);if(!t.includes(s))throw new Error('화면에 없음: '+s);};
  await over('시작 화면');await has('맡을 구단을 고르세요');await has('144경기');await has('서울 피닉스');await has('레드폭스');await has('광주');await has('명문');await has('신흥');await has('재정난 구단');ok('시작 화면: 실제 연고 도시 10개 구단 · 기본 위상 · 유형');{const o=await p.evaluate(()=>document.scrollingElement.scrollHeight-innerHeight);o<=4?ok('시작 화면 한 화면 (스크롤 없음)'):bad('시작 화면 세로 스크롤 '+o+'px');}
  await p.evaluate(()=>{UI.pickTeam(9);UI.newGame();SL.state().tutorialDone=true;UI.setTab('home');});await p.waitForTimeout(150);
  (await p.evaluate(()=>SL.userTeam().arch))==='poor'?ok('재정난 구단으로 시작 (유형 반영)'):bad('구단 유형 미반영');
  await has('감독 첫 시즌');ok('홈: 첫 시즌 이야기 카드');
  await p.evaluate(()=>{SL.state().tutorialDone=false;});await p.evaluate(()=>UI.setTab('home'));let tt='';for(let i=0;i<5;i++){tt+=await p.evaluate(()=>document.body.innerText);await p.evaluate(()=>UI.tutNext(5));}
  /다음 타석/.test(tt)&&/하이라이트/.test(tt)&&/이번 주 이야기/.test(tt)&&/코치진/.test(tt)&&!/한 구씩/.test(tt)?ok('첫 안내가 현재 화면(이번 주 이야기·다음 타석·하이라이트·코치진)과 일치'):bad('튜토리얼 문구');
  const tabs=[['home'],['roster','list'],['roster','lineup'],['dev','train'],['dev','res'],['league','fut'],['dev','draft'],['market','offers'],['market','buy'],['market','fa'],['market','scout'],['club','mgr'],['club','pres'],['club','spon'],['league','table'],['league','rec'],['club','fin'],['club','fac'],['club','staff'],['league','overseas'],['club','alumni'],['league','hist'],['league','events'],['league','ach'],['league','sched'],['dev','fgn'],['market','trade'],['club','data']];
  const sweep=async tag=>{for(const [t,s] of tabs){await p.evaluate(([t,s])=>{if(s)UI.go(t,s);else UI.setTab(t);},[t,s]);await p.waitForTimeout(40);await over(`${tag} ${t}/${s||''}`);await navCover(`${tag} ${t}/${s||''}`);}};
  await sweep('시즌 중');ok('시즌 중 22개 화면 가로 넘침·하단 가림 검사');
  // R026 한 화면: 360×740에서 모든 탭 첫 화면이 세로로 넘치지 않는다 (넘치는 카드는 타일 → 누르면 팝업)
  {const sc=[];for(const [t,s] of tabs){await p.evaluate(([t,s])=>{if(s)UI.go(t,s);else UI.setTab(t);},[t,s]);await p.waitForTimeout(40);const o=await p.evaluate(()=>document.scrollingElement.scrollHeight-innerHeight);if(o>4)sc.push(`${t}/${s||''} ${o}px`);}
   sc.length?bad('세로 스크롤 남음: '+sc.join(', ')):ok(`한 화면: ${tabs.length}개 화면 모두 세로 스크롤 없음`);}
  // v44 EA 2011 착안: 성장 정보(목록+상세) · 표로 보기 · 트레이드 나란히 비교 팝업 · 아래 한 줄 소식 · 결정 화면의 자금
  {await p.evaluate(()=>UI.go('dev','train'));const g=await p.evaluate(()=>{const b=document.querySelector('.gbcard');if(!b)return null;const items=b.querySelectorAll('.gbi').length;const attrs=b.querySelectorAll('.gba').length;const sec=document.querySelectorAll('.gbi')[1];if(sec)sec.click();const sel=document.querySelector('.gbi.on .gn');return {items,attrs,sel:sel&&sel.textContent};});
   g&&g.items>5&&g.attrs>=5&&g.sel?ok(`성장 정보: 목록 ${g.items}명 + 능력 ${g.attrs}개, 다른 선수 누르면 오른쪽이 바뀜 (${g.sel})`):bad('성장 정보 '+JSON.stringify(g));
   await p.evaluate(()=>UI.go('market','fa'));const t1=await p.evaluate(()=>document.querySelectorAll('.ptab tbody tr').length);await p.evaluate(()=>UI.lmode());const t2=await p.evaluate(()=>document.querySelectorAll('.ptab').length+'/'+document.querySelectorAll('.content .prow').length);await p.evaluate(()=>UI.lmode());
   t1>5&&/^0\/\d+/.test(t2)?ok(`표로 보기: FA ${t1}줄 표 ↔ 카드 전환`):bad('표 보기 '+t1+' '+t2);
   const tr=await p.evaluate(()=>{UI.go('market','trade');const ut=SL.userTeam();UI.tradeToggle('give',ut.roster[2]);const t=SL.state().teams[ui_t=SL.krTeams().find(x=>!x.isUser).id];UI.tradeToggle('get',t.roster[4]);UI.tradeSheet();const m=document.querySelector('#modal .tside');const r=m?m.querySelectorAll('.tpr').length:0;UI.closeModal();return r;});
   tr===2?ok('트레이드: 비교·제안 팝업에 양쪽 선수 나란히'):bad('트레이드 팝업 '+tr);
   const tk=await p.evaluate(()=>{const e=document.getElementById('tick');return e&&e.textContent.length>3;});tk?ok('아래 한 줄 소식 표시'):bad('소식 띠 없음');}
  {await p.evaluate(()=>UI.go('dev','res'));const n=await p.evaluate(()=>document.querySelectorAll('.tile2').length);await p.evaluate(()=>{const t=document.querySelector('.tile2');if(t)t.click();});const r=await p.evaluate(()=>{const m=document.querySelector('#modal .sheetc .card');return m?m.innerText.slice(0,20):null;});
   n>0&&r?ok(`타일 ${n}개 → 누르면 그 카드가 팝업으로 열림 (「${r.replace(/\n/g,' ')}」)`):bad('타일 팝업 '+n+' '+r);await p.evaluate(()=>UI.closeModal());}
  await p.evaluate(()=>{UI.openPlayer(SL.userTeam().lineup[0]);});await over('선수 상세');await has('비교 기준');ok('선수 상세: 능력치 비교 기준 선택');await p.evaluate(()=>UI.back());
  await p.evaluate(()=>{UI.setTab('home');UI.autoDays(7);});await has('자세히');await p.evaluate(()=>UI.sheet('result'));await has('한 주간 구단 보고서');await has('최고 타자');await over('주간 보고서');await p.evaluate(()=>UI.closeModal());ok('7경기 자동 → 결과 띠 → 한 주간 보고서 창');
  {const fit=await p.evaluate(()=>({sh:document.documentElement.scrollHeight,ch:innerHeight}));fit.sh<=fit.ch+40?ok(`모바일 홈 한 화면 (${fit.sh}/${fit.ch}px)`):bad('모바일 홈 스크롤 '+JSON.stringify(fit));}
  await p.evaluate(()=>{UI.clearResult();UI.startGame();});await has('다음 타석');await p.evaluate(()=>UI.step('pa'));await over('경기 화면');
  await p.evaluate(()=>UI.step('game'));await p.evaluate(()=>UI.endGame());await has('순위');ok('경기 후 결과 카드: 기록·순위·다음 판단');
  await p.evaluate(()=>{UI.go('market','buy');});await has('예산 안');if(!(await p.evaluate(()=>!!document.querySelector('input[placeholder="이름 검색"]'))))bad('이름 검색 입력 없음');const nm=await p.evaluate(()=>{UI.setBuyF('afford',false);const t=SL.krTeams().find(x=>!x.isUser);const q=SL.state().players[t.roster[0]].name;UI.setBuyF('q',q);return q;});await has(nm);ok('이적시장: 이름 검색·예산·의향·부족 포지션 필터');
  await p.evaluate(()=>{let g=0;while(SL.state().phase==='season'&&g++<40){UI.autoDays(99);for(const o of [...SL.state().market.offers])SL.respondOffer(o.id,'reject');}});await p.waitForTimeout(200);
  await has('시즌 결산');await has('감독 평판');await over('시즌 결산');ok('시즌 종료 → 결산 화면');
  await p.evaluate(()=>UI.closeModal());await sweep('스토브리그');ok('스토브리그 18개 화면 검사');
  await p.evaluate(()=>UI.go('league','table'));await has('최종 순위');await has('포스트시즌 결과');await has('가을야구');ok('스토브리그 순위: 정규 시즌 최종 순위 + 포스트시즌 결과(대진표)');
  // R003: 드래프트 보드 필터·비교
  const dok=await p.evaluate(()=>{let g=0;while(!(SL.state().draft&&!SL.state().draft.done)&&g++<3)SL.advanceWeek();if(!SL.state().draft||SL.state().draft.done)return null;UI.go('dev','draft');UI.draftF('g','P');const ids=SL.draftAvail().filter(SL.isPitcher).slice(0,3).map(p=>p.id);ids.forEach(id=>UI.draftToggle(id));UI.draftCompare();return ids.length;});
  if(dok){await has('드래프트 후보 비교');await has('예상 잠재');await has('필요 포지션');await over('드래프트 비교');ok(`드래프트: 투수 필터 + ${dok}명 비교 표`);await p.evaluate(()=>{UI.closeModal();UI.set('draftCmp',[]);UI.draftF('g','all');});}
  const pick=await p.evaluate(()=>{let g=0;while(!SL.draftTurn()&&SL.state().draft&&!SL.state().draft.done&&g++<10)SL.advanceWeek();if(!SL.draftTurn())return null;const id=SL.state().draft.pool.find(x=>SL.state().players[x].teamId==null);UI.draftPick(id,'auto');return id;});
  if(pick){await p.waitForTimeout(100);await has('지명');await has('첫 육성 계획');await over('지명 연출');ok('드래프트 지명 연출');await p.evaluate(()=>UI.closeModal());
    await p.evaluate(id=>{if(SL.state().players[id].drafted)UI.draftSign(id,true);},pick);await p.evaluate(id=>UI.openPlayer(id),pick);const bt=await p.evaluate(()=>document.body.innerText);(!/\d시즌 시작/.test(bt.split('비교 기준')[1]||bt.split('비교할 과거')[0]||''))&&/입단 당시|비교할 과거/.test(bt)?ok('지명 신인 비교 기준 = 입단 당시 (「1시즌 시작」 없음)'):bad('신인 비교 기준 표시');await p.evaluate(()=>UI.back());}else console.log('  (이번 시드는 우리 지명 차례 없음)');
  const fa=await p.evaluate(()=>SL.state().pendingFA[0]||null);
  if(fa){await p.evaluate(id=>{UI.openTable(id);},fa);for(let i=0;i<4;i++){const done=await p.evaluate(()=>!!document.querySelector('.cere'));if(done)break;await p.evaluate(()=>{const f=document.querySelector('#tf_sal')||document.querySelector('input[type=number]');if(f){f.value=Math.round(+f.value*1.6);f.dispatchEvent(new Event('change'));}UI.tableSubmit();});await p.waitForTimeout(80);}
    (await p.evaluate(()=>!!document.querySelector('.cere')))?ok('재계약 체결 연출'):console.log('  (재계약이 성사되지 않아 연출 미확인)');await p.evaluate(()=>UI.closeModal());}
  await p.evaluate(()=>{const ut=SL.userTeam();const v=ut.roster.map(id=>SL.state().players[id]).sort((a,b)=>b.age-a.age)[0];UI.openPlayer(v.id);});await has('이번 겨울');await p.evaluate(()=>{const id=SL.userTeam().roster.map(i=>SL.state().players[i]).sort((a,b)=>b.age-a.age)[0].id;UI.winterPlan(id,'rest');});
  (await p.evaluate(()=>SL.userTeam().roster.some(i=>SL.state().players[i].winterPlan==='rest')))?ok('겨울 휴식 선택'):bad('휴식 선택 실패');
  await p.evaluate(()=>{UI.back();UI.go('club','data');UI.setPref('font','xl');});await sweep('아주 큰 글자');ok('글자 크기 「아주 크게」에서도 화면 검사');await p.evaluate(()=>UI.setPref('font','m'));
  // 테스터용 주소: ?test=1&new=1&team=9&seed=1234 → 바로 새 게임, 테스트 도구·버전 표시
  await p.goto(FILE+'?test=1&new=1&team=9&seed=1234');await p.waitForTimeout(400);
  const tb=await p.evaluate(()=>({arch:SL.userTeam().arch,seed:SL.state().seed,ver:SL.GAME_VER}));
  tb.arch==='poor'&&tb.seed===1234?ok(`테스트 주소로 바로 시작 (${tb.ver}, 시드 ${tb.seed}, 재정난)`):bad('테스트 주소 시작 '+JSON.stringify(tb));
  await p.evaluate(()=>UI.go('club','data'));await has('테스트 도구');await p.evaluate(()=>{const t=[...document.querySelectorAll('.tile2')].find(x=>x.textContent.includes('테스트 도구'));if(t)t.click();});await has('요청서용 정보 복사');await p.evaluate(()=>UI.closeModal());await has(tb.ver);
  await p.evaluate(()=>UI.test('nextSeason'));(await p.evaluate(()=>SL.state().season))===2?ok('테스트 도구: 다음 시즌 개막까지'):bad('다음 시즌 이동 실패');
  // R004: 직전 타석 결과 유지 · 판매 작별 카드 · 출신 코치 복귀 카드
  await p.goto(FILE+'?test=1&new=1&team=0&seed=1234');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.startGame();UI.step('half');});await has('직전 타석');const lpt=await p.evaluate(()=>document.querySelector('.lastplay .lpt').textContent);/회(초|말)/.test(lpt)&&!/이닝 종료|공수 교대/.test(lpt)?ok('이닝이 바뀌어도 직전 타석 결과 유지: '+lpt.slice(0,40)):bad('직전 타석 '+lpt);
  {await p.evaluate(()=>UI.sheet2('detail'));const mt=await p.evaluate(()=>document.querySelector('.mu').textContent);await p.evaluate(()=>UI.closeModal());/오늘/.test(mt)&&/시즌/.test(mt)&&/컨택/.test(mt)&&/구위/.test(mt)&&/구$|·/.test(mt)?ok('경기 화면 타자·투수 카드: 오늘 기록·시즌 기록·주요 능력치'):bad('타자·투수 카드 '+mt);await over('경기 화면 타자·투수 카드');}
  await p.evaluate(()=>{UI.step('game');UI.endGame();});
  await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const pid=ut.roster.find(id=>!ut.lineup.includes(id)&&!SL.isPitcher(S.players[id]));const b=SL.krTeams().find(t=>!t.isUser&&t.div===1);b.cash=9e6;const o={id:S.nextOfferId++,type:'buy',pid,team:b.id,fee:Math.round(SL.calcValue(S.players[pid])*1.2),max:0,expires:S.clock+3,counters:0,status:'agreed',willing:true,reasons:[]};S.market.offers.push(o);S.market.listed.push(pid);UI.respond(o.id,'accept');});
  await p.waitForTimeout(200);await has('이적 성사');await has('떠납니다');ok('판매 성사 → 작별 카드');await p.evaluate(()=>UI.closeModal());
  await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const old=Object.values(S.players).find(x=>x.teamId!=null&&x.teamId!==ut.id);S.staffPool.unshift({id:99999,name:old.name,nat:'KR',age:40,dept:'bat',rating:58,trait:null,salary:2000,years:0,bio:'우리 구단 출신',alumni:old.id});UI.go('club','staff');UI.hireCoach(99999);});
  await p.waitForTimeout(200);await has('돌아온 얼굴');ok('출신 코치 영입 → 복귀 카드');await p.evaluate(()=>UI.closeModal());
  // 주전 약속 불이행 면담
  await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const b=ut.roster.map(id=>S.players[id]).find(x=>!SL.isPitcher(x)&&!ut.lineup.includes(x.id));S.grievances=[{pid:b.id,s:S.season,on:2,n:13,exp:S.clock+3}];UI.setTab('home');});
  await p.evaluate(()=>UI.sheet('dec'));await has('면담 요청');await p.evaluate(()=>UI.grievance(SL.state().grievances[0].pid));await has('사과하고 기회를 약속한다');await has('트레이드 요청을 받아들인다');await has('그냥 넘긴다');await over('면담 화면');
  await p.evaluate(()=>UI.grievanceAns(SL.state().grievances[0].pid,'apology'));(await p.evaluate(()=>!SL.state().grievances.length))?ok('주전 약속 면담: 홈 결정 → 세 가지 선택 → 처리'):bad('면담 처리');
  await p.evaluate(()=>{UI.closeModal();UI.openPlayer(SL.userTeam().lineup[0]);UI.pTab('record');});await has('세부 지표');await has('출루율');await has('WAR');await has('능력치는 이렇게 기록이 됩니다');await over('선수 기록 세부 지표');ok('선수 기록: 세부 지표(출루율·OPS+·WAR·백분위)·능력치 연결');await p.evaluate(()=>UI.back());
  {await p.evaluate(()=>{UI.closeModal();const S=SL.state();if(S.phase!=='season')return;UI.setTab('home');});if(await p.evaluate(()=>SL.state().phase==='season'&&!!SL.userGameToday())){await has('경기 보기');await p.evaluate(()=>{UI.startGame();for(let i=0;i<6;i++)UI.step('pa');});const gi=await p.evaluate(()=>({sb:!!document.querySelector('.sbd .sbs b'),bso:document.querySelectorAll('.bso i').length,stad:!!document.querySelector('.stad img'),fd:document.querySelectorAll('.stad .fd').length,out:document.querySelectorAll('.bso i.r').length,outs:SL.state().liveGame.outs}));
   gi.sb&&gi.bso===7&&gi.stad&&gi.fd===9&&gi.out===gi.outs?ok(`경기 화면: 전광판·B/S/O 불빛(아웃 ${gi.outs} = 빨간 불 ${gi.out})·구장 배경·수비 9명`):bad('경기 화면 '+JSON.stringify(gi));await over('새 경기 화면');{const fit=await p.evaluate(()=>({sh:document.documentElement.scrollHeight,ch:innerHeight}));fit.sh<=fit.ch+40?ok(`모바일 경기 화면 한 화면 (${fit.sh}/${fit.ch}px)`):bad('경기 화면 스크롤 '+JSON.stringify(fit));}await p.evaluate(()=>{UI.step('game');UI.endGame();UI.closeModal();});}}
  // 2군 · 임대 · 포스트시즌
  await p.evaluate(()=>{UI.closeModal();for(let i=0;i<7&&SL.state().phase==='season'&&SL.state().day<=7;i++)SL.playDayAuto();UI.go('dev','res');});
  if(await p.evaluate(()=>SL.state().phase==='season'&&SL.state().day<=14)){await has('우리 2군 현황');await has('임대 후보');await over('2군·임대 탭');
    const stTitle=()=>p.evaluate(()=>[...document.querySelectorAll('.hd h3,.tile2 b')].some(e=>['북부리그','2군 순위'].includes(e.textContent.trim())));
    const inDev=await stTitle();await p.evaluate(()=>UI.go('league','fut'));await has('퓨처스리그 (2군 리그)');await has('북부리그');await has('남부리그');await has('우리 2군 경기');const inLg=await stTitle();await over('리그 2군 리그 탭');
    !inDev&&inLg?ok('2군 순위표는 리그 → 순위·일정 → 2군 리그에, 육성 → 2군에는 우리 2군 현황만'):bad('2군 순위 위치 dev='+inDev+' league='+inLg);await p.evaluate(()=>UI.go('dev','res'));
    const lp=await p.evaluate(()=>{const ut=SL.userTeam();const S=SL.state();const c=ut.roster.concat(ut.dev).map(id=>S.players[id]).find(x=>x.age<=28&&!ut.lineup.includes(x.id)&&!ut.rotation.includes(x.id)&&x.id!==ut.closer&&!SL.loanCheck(x));if(!c)return null;UI.loanView(c.id);return c.id;});
    if(lp!=null){await has('출장 기회를 만드는 세 가지 방법');await over('임대 화면');      await p.evaluate(pid=>{const o=SL.loanOptions(pid)[0];UI.loanOut(pid,o.team.id);UI.openPlayer(pid);},lp);await has('임대 중');await p.evaluate(()=>UI.pTab('contract'));await has('원소속');await over('임대 선수 화면');
      ok('2군·임대 탭 → 임대 화면 → 임대 확정 → 선수 화면 임대 표시');}else ok('(임대 후보 없음 — 2군 탭만 확인)');}
  await p.evaluate(()=>{UI.back&&UI.back();const S=SL.state();while(S.phase==='season'&&S.day<=SL.BAL.SEASON_GAMES)SL.playDayAuto();UI.setTab('home');});
  if(await p.evaluate(()=>!!SL.state().post)){const mine=await p.evaluate(()=>!!SL.userGameToday());await has('와일드카드 결정전');await over('포스트시즌 홈');await p.evaluate(()=>UI.go('league','table'));await has('포스트시즌');await has('한국시리즈');await over('포스트시즌 대진표');
    await p.evaluate(()=>{UI.setTab('home');let g=0;while(SL.state().phase==='season'&&g++<80){UI.closeModal();if(SL.userGameToday()){UI.startGame();UI.step('game');UI.endGame();}else UI.autoDays(60);}UI.closeModal();UI.go('league','table');});await has('포스트시즌 결과');await has('한국시리즈 우승');await over('포스트시즌 결과');ok(`포스트시즌: 홈 카드(${mine?'우리 경기':'관전'}) → 대진표 → 순위 탭 포스트시즌 결과`);}
  else bad('정규 시즌 뒤 포스트시즌 없음');
  if(await p.evaluate(()=>SL.state().phase==='offseason'&&!!SL.state().awards)){await p.evaluate(()=>{UI.closeModal();UI.ceremony(SL.state().season);});await has('시상식');await has('골든글러브');await has('MVP');await over('시상식 화면');await p.evaluate(()=>UI.closeModal());ok('시즌 시상식: MVP·타이틀·골든글러브');}
  if(await p.evaluate(()=>SL.state().phase==='offseason')){await p.evaluate(()=>UI.go('league','hist'));await has('우리 구단 역대 수상자');await over('역대 수상자');const wp=await p.evaluate(()=>{const S=SL.state();const x=Object.values(S.players).find(q=>q.awards&&q.awards.length&&q.teamId!=null);if(!x)return null;UI.openPlayer(x.id);UI.pTab('record');return x.id;});if(wp!=null){await has('수상 기록');await over('선수 수상 기록');await p.evaluate(()=>UI.back());}ok('역대 탭 「우리 구단 역대 수상자」·선수 기록 「수상 기록」');}
  // 스토브리그 스폰서 고르기
  if(await p.evaluate(()=>SL.state().phase==='offseason')){await p.evaluate(()=>{UI.closeModal();UI.go('home');});await has('진행 중');await over('겨울 마감판');ok('겨울 마감판 (이번 주 마감·진행 중·완료)');
    await p.evaluate(()=>UI.startSeason());const sk=await p.evaluate(()=>!!document.querySelector('#modal'));if(sk){await has('남은 겨울을 건너뛰고');await has('자동으로 처리되는 것');await over('개막 건너뛰기 요약');ok('개막 건너뛰기 전 요약');await p.evaluate(()=>UI.closeModal());}
    await p.evaluate(()=>{UI.closeModal();UI.go('club','spon');});await has('메인 스폰서');await has('구장 광고판');await has('선수 개인 광고');await over('스폰서 화면(스토브)');
    const ok1=await p.evaluate(()=>{const t=SL.userTeam();if(t.spon.main||!t.spon.offers.length)return 'skip';UI.sponSign(t.spon.offers[0].id);return !!t.spon.main;});ok1===true?ok('스폰서·광고 탭: 제안 비교 → 메인 스폰서 계약'):ok1==='skip'?ok('(스폰서 계약 중 — 제안 화면 생략)'):bad('스폰서 계약 실패');}
  // R013: 포스트시즌 앞 정지 · 포스트시즌 연출 · 광고 마감 정지 · 결과 주인공 · 시상식 우리 선수 먼저 · 2군 기록
  await p.goto(FILE+'?test=1&new=1&team=0&seed=4321');await p.waitForTimeout(300);
  {const r=await p.evaluate(()=>{const S=SL.state();const u=SL.userTeam();const st=u.roster.map(id=>S.players[id]).find(x=>!SL.isPitcher(x));S.endorseOffers=[{id:99901,pid:st.id,co:'시험상사',sector:'x',fee:1000,years:1,sc:9,exp:S.clock+1}];S.settings.stopOnOffer=true;UI.setTab('home');UI.autoDays(7);return {day:S.day,left:S.endorseOffers.length};});
   r.left===1&&r.day<=2?ok('정지 옵션: 내일 마감 광고 제안이 있으면 자동 진행이 멈춤'):bad('광고 마감 정지 '+JSON.stringify(r));}
  await p.evaluate(()=>{const S=SL.state();S.endorseOffers=[];S.settings.stopOnOffer=false;UI.startGame();for(let i=0;i<4;i++)UI.step('pa');});
  {const lp=await p.evaluate(()=>{const el=document.querySelector('.lastplay .lpwho b');const lg=SL.state().liveGame;const last=[...lg.log].reverse().find(l=>l.pid!=null);return {shown:el?el.textContent:null,real:last?SL.state().players[last.pid].name:null};});
   lp.shown&&lp.shown===lp.real?ok(`결과 카드 주인공 = 직전 타석 선수 (${lp.shown})`):bad('결과 주인공 '+JSON.stringify(lp));}
  await p.evaluate(()=>{UI.step('game');UI.endGame();UI.closeModal();UI.autoDays(999);});await p.waitForTimeout(250);
  {const r=await p.evaluate(()=>{const S=SL.state();return {phase:S.phase,day:S.day,G:SL.BAL.SEASON_GAMES,post:!!S.post,modal:!!document.querySelector('.post2')};});
   r.phase==='season'&&r.day===r.G+1&&r.post&&r.modal?ok('「시즌 끝까지」가 포스트시즌 앞에서 멈추고 포스트시즌 화면(대진표)을 띄움'):bad('포스트시즌 정지 '+JSON.stringify(r));await has('포스트시즌 대진');await has('와일드카드 결정전');await has('한국시리즈');await over('포스트시즌 화면');}
  await p.evaluate(()=>{const S=SL.state();let g=0;while(S.phase==='season'&&g++<80){UI.closeModal();if(SL.userGameToday()){UI.startGame();UI.step('game');UI.endGame();}else UI.autoDays(60);}});await p.waitForTimeout(250);
  {const r=await p.evaluate(()=>{const S=SL.state();UI.closeModal();const u=SL.userTeam();const A=S.awards&&S.awards[S.season];const mine=A&&Object.values(A).flatMap(R=>[R.mvp,R.roy,...R.titles,...R.gg]).some(e=>e&&e.tid===u.id);if(!mine){const k=Object.keys(A)[0];A[k].titles[0].tid=u.id;}UI.ceremony(S.season);const m=document.querySelector('.cer2');const first=m.querySelector('.ourwin,.mvp');return first?first.className:null;});
   r==='ourwin'?ok('시상식: 우리 선수 수상이 맨 위에 축하 카드로'):bad('시상식 순서 '+r);await p.evaluate(()=>UI.closeModal());}
  {const ok2=await p.evaluate(()=>{const S=SL.state();const u=SL.userTeam();const x=u.roster.map(id=>S.players[id]).find(q=>!SL.isPitcher(q)&&q.age<=26);x.hist=x.hist.filter(h=>h.s!==S.season);x.rhist=[{s:S.season,tn:u.name,st:Object.assign({g:12,pa:44,ab:40,h:12,hr:2,rbi:7,bb:4,so:8},{})}];UI.go('roster','list');return document.body.innerText.includes(S.season+'시즌 2군');});
   ok2?ok('스토브리그: 1군 기록 없는 선수는 지난 시즌 2군 기록 표시'):bad('2군 기록 표시');}
  // R018: 공통 선수 카드 · 1군/2군 비교 화면 · 영입 제안서 · 입단 이후 · 경기 관심 표시
  await p.goto(FILE+'?test=1&new=1&team=9&seed=1717&games=72');await p.waitForTimeout(300);
  {const r=await p.evaluate(()=>{const S=SL.state();S.settings.stopOnOffer=false;while(S.day<=14)SL.playDayAuto();const u=SL.userTeam();const c=SL.callupCands(1)[0]||{p:S.players[SL.reserveIds(u).find(id=>!SL.isPitcher(S.players[id]))]};S.pins=[c.p.id];UI.setTab('home');UI.sheet('growth');return {n:document.querySelectorAll('.pcard').length,id:c.p.id,down:c.rival?c.rival.id:null};});
   r.n>0?ok(`성장 점검: 공통 선수 카드 ${r.n}장 (실력·변화·역할·코치 한마디·버튼)`):bad('선수 카드 없음');await over('성장 점검 선수 카드');
   await p.evaluate(x=>{UI.closeModal();UI.callupView(x.id,x.down);},r);await has('1군·2군 이동 비교');await has('올릴 선수');await has('내려갈 선수');await has('예상 역할');await has('바꾸면');await over('1군·2군 비교 화면');ok('1군·2군 비교 화면: 올릴/내려갈 선수 · 예상 역할 · 바꾸면 점검');
   await p.evaluate(x=>{UI.back();UI.openPlayer(x.id);},r);await has('입단 이후');await over('선수 화면 입단 이후');ok('선수 화면 「입단 이후」 카드');
   await p.evaluate(()=>{UI.back();const S=SL.state();const u=SL.userTeam();const pid=u.lineup[2];const t=SL.overseasTeams().find(x=>x.league==='JP');const o={id:S.nextOfferId++,type:'overseas',pid,team:t.id,fee:Math.round(SL.calcValue(S.players[pid])*1.3),salary:30000,years:2,max:0,expires:S.clock+3,counters:0,status:'open',pw:0.7,reasons:[]};S.market.offers.push(o);UI.openOffer(o.id);});
   await has('공식 영입 제안');await has('대체 후보');await has('선수 의견 확인');await over('영입 제안서');ok('이적 제안 = 공식 영입 제안서 (이적료·예상 역할·의향·기한·우리 팀 영향·대체 후보)');
   const w=await p.evaluate(x=>{UI.back();const S=SL.state();const u=SL.userTeam();const id=u.lineup[0];S.pins=[id];UI.setTab('home');UI.startGame();let g=0;const lg=()=>SL.state().liveGame;while(lg()&&lg().lineup[lg().half][lg().bat[lg().half]%9]!==id&&g++<60)UI.step('pa');return !!document.querySelector('.wtag');},r);
   w?ok('경기 화면: 관심 선수 타석에 ★ 표시'):bad('관심 선수 표시 없음');await over('경기 화면 관심 표시');}
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' | '));
  await b.close();console.log(fails?`화면 검사 실패 ${fails}건`:'화면 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

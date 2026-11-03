// 실제 브라우저(Playwright) 검사: 360px 폰 화면 가로 넘침 · 하단 메뉴 가림 · 새 화면 흐름(구단 유형, 이야기, 보고서, 결산, 지명·계약 연출, 필터)
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('playwright 없음 — 건너뜀 (통과 처리)');process.exit(0);}
const path=require('path');const FILE='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:360,height:740}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForTimeout(400);
  const over=async label=>{const r=await p.evaluate(()=>{const d=document.documentElement;const wide=[...document.querySelectorAll('body *')].filter(e=>{if(e.closest('.tw,.ovseg,.subtabs,.glog,table'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.right>d.clientWidth+2;}).slice(0,3).map(e=>e.className||e.tagName);return {sw:d.scrollWidth,cw:d.clientWidth,wide};});if(r.sw>r.cw+1||r.wide.length)bad(`${label} 가로 넘침 ${r.sw}>${r.cw} ${r.wide.join(',')}`);return r;};
  const navCover=async label=>{const r=await p.evaluate(()=>{const nav=document.querySelector('.nav');const c=document.querySelector('.content');if(!nav||!c)return null;return {pad:parseFloat(getComputedStyle(c).paddingBottom)+parseFloat(getComputedStyle(c.parentElement).paddingBottom||0),nav:nav.getBoundingClientRect().height};});if(r&&r.pad+2<r.nav)bad(`${label} 하단 메뉴가 내용을 가림 (여백 ${r.pad} < 메뉴 ${r.nav})`);};
  const has=async s=>{const t=await p.evaluate(()=>document.body.innerText);if(!t.includes(s))throw new Error('화면에 없음: '+s);};
  await over('시작 화면');await has('맡을 3부 구단');await has('재정난 구단');ok('시작 화면: 구단 유형 8개 표시');
  await p.evaluate(()=>{UI.pickTeam(2);UI.newGame();SL.state().tutorialDone=true;UI.setTab('home');});await p.waitForTimeout(150);
  (await p.evaluate(()=>SL.userTeam().arch))==='poor'?ok('재정난 구단으로 시작 (유형 반영)'):bad('구단 유형 미반영');
  await has('감독 첫 시즌');ok('홈: 첫 시즌 이야기 카드');
  await p.evaluate(()=>{SL.state().tutorialDone=false;});await p.evaluate(()=>UI.setTab('home'));let tt='';for(let i=0;i<5;i++){tt+=await p.evaluate(()=>document.body.innerText);await p.evaluate(()=>UI.tutNext(5));}
  /다음 타석/.test(tt)&&/하이라이트/.test(tt)&&/이번 주 이야기/.test(tt)&&/코치진/.test(tt)&&!/한 구씩/.test(tt)?ok('첫 안내가 현재 화면(이번 주 이야기·다음 타석·하이라이트·코치진)과 일치'):bad('튜토리얼 문구');
  const tabs=[['home'],['roster','list'],['roster','lineup'],['dev','train'],['dev','draft'],['market','offers'],['market','buy'],['market','fa'],['market','scout'],['club','mgr'],['club','table'],['club','fin'],['club','fac'],['club','staff'],['club','overseas'],['club','alumni'],['club','hist'],['club','data']];
  const sweep=async tag=>{for(const [t,s] of tabs){await p.evaluate(([t,s])=>{if(s)UI.go(t,s);else UI.setTab(t);},[t,s]);await p.waitForTimeout(40);await over(`${tag} ${t}/${s||''}`);await navCover(`${tag} ${t}/${s||''}`);}};
  await sweep('시즌 중');ok('시즌 중 18개 화면 가로 넘침·하단 가림 검사');
  await p.evaluate(()=>{UI.openPlayer(SL.userTeam().lineup[0]);});await over('선수 상세');await has('비교 기준');ok('선수 상세: 능력치 비교 기준 선택');await p.evaluate(()=>UI.back());
  await p.evaluate(()=>{UI.setTab('home');UI.autoDays(7);});await has('한 주간 구단 보고서');await has('최고 타자');await over('주간 보고서');ok('7경기 자동 → 한 주간 보고서');
  await p.evaluate(()=>{UI.clearResult();UI.startGame();});await has('다음 타석');await p.evaluate(()=>UI.step('pa'));await over('경기 화면');
  await p.evaluate(()=>UI.step('game'));await p.evaluate(()=>UI.endGame());await has('순위');ok('경기 후 결과 카드: 기록·순위·다음 판단');
  await p.evaluate(()=>{UI.go('market','buy');});await has('예산 안');if(!(await p.evaluate(()=>!!document.querySelector('input[placeholder="이름 검색"]'))))bad('이름 검색 입력 없음');const nm=await p.evaluate(()=>{UI.setBuyF('afford',false);const t=SL.krTeams().find(x=>!x.isUser);const q=SL.state().players[t.roster[0]].name;UI.setBuyF('q',q);return q;});await has(nm);ok('이적시장: 이름 검색·예산·의향·부족 포지션 필터');
  await p.evaluate(()=>{let g=0;while(SL.state().phase==='season'&&g++<40){UI.autoDays(99);for(const o of [...SL.state().market.offers])SL.respondOffer(o.id,'reject');}});await p.waitForTimeout(200);
  await has('시즌 결산');await has('감독 평판');await over('시즌 결산');ok('시즌 종료 → 결산 화면');
  await p.evaluate(()=>UI.closeModal());await sweep('스토브리그');ok('스토브리그 18개 화면 검사');
  await p.evaluate(()=>UI.go('club','table'));await has('최종 순위');await has('다음 시즌 편성');ok('스토브리그 순위: 지난 시즌 최종 + 다음 시즌 편성 분리');
  // R003: 드래프트 보드 필터·비교
  const dok=await p.evaluate(()=>{let g=0;while(!(SL.state().draft&&!SL.state().draft.done)&&g++<3)SL.advanceWeek();if(!SL.state().draft||SL.state().draft.done)return null;UI.go('dev','draft');UI.draftF('g','P');const ids=SL.draftAvail().filter(SL.isPitcher).slice(0,3).map(p=>p.id);ids.forEach(id=>UI.draftToggle(id));UI.draftCompare();return ids.length;});
  if(dok){await has('드래프트 후보 비교');await has('예상 잠재');await has('부족 포지션');await over('드래프트 비교');ok(`드래프트: 투수 필터 + ${dok}명 비교 표`);await p.evaluate(()=>{UI.closeModal();UI.set('draftCmp',[]);UI.draftF('g','all');});}
  const pick=await p.evaluate(()=>{let g=0;while(!SL.draftTurn()&&SL.state().draft&&!SL.state().draft.done&&g++<10)SL.advanceWeek();if(!SL.draftTurn())return null;const id=SL.state().draft.pool.find(x=>SL.state().players[x].teamId==null);UI.draftPick(id,'auto');return id;});
  if(pick){await p.waitForTimeout(100);await has('지명');await has('첫 육성 계획');await over('지명 연출');ok('드래프트 지명 연출');await p.evaluate(()=>UI.closeModal());
    await p.evaluate(id=>UI.openPlayer(id),pick);const bt=await p.evaluate(()=>document.body.innerText);(!/\d시즌 시작/.test(bt.split('비교 기준')[1]||bt.split('비교할 과거')[0]||''))&&/입단 당시|비교할 과거/.test(bt)?ok('지명 신인 비교 기준 = 입단 당시 (「1시즌 시작」 없음)'):bad('신인 비교 기준 표시');await p.evaluate(()=>UI.back());}else console.log('  (이번 시드는 우리 지명 차례 없음)');
  const fa=await p.evaluate(()=>SL.state().pendingFA[0]||null);
  if(fa){await p.evaluate(id=>{UI.openTable(id);},fa);for(let i=0;i<4;i++){const done=await p.evaluate(()=>!!document.querySelector('.cere'));if(done)break;await p.evaluate(()=>{const f=document.querySelector('#tf_sal')||document.querySelector('input[type=number]');if(f){f.value=Math.round(+f.value*1.6);f.dispatchEvent(new Event('change'));}UI.tableSubmit();});await p.waitForTimeout(80);}
    (await p.evaluate(()=>!!document.querySelector('.cere')))?ok('재계약 체결 연출'):console.log('  (재계약이 성사되지 않아 연출 미확인)');await p.evaluate(()=>UI.closeModal());}
  await p.evaluate(()=>{const ut=SL.userTeam();const v=ut.roster.map(id=>SL.state().players[id]).sort((a,b)=>b.age-a.age)[0];UI.openPlayer(v.id);});await has('이번 겨울');await p.evaluate(()=>{const id=SL.userTeam().roster.map(i=>SL.state().players[i]).sort((a,b)=>b.age-a.age)[0].id;UI.winterPlan(id,'rest');});
  (await p.evaluate(()=>SL.userTeam().roster.some(i=>SL.state().players[i].winterPlan==='rest')))?ok('겨울 휴식 선택'):bad('휴식 선택 실패');
  await p.evaluate(()=>{UI.back();UI.go('club','data');UI.setPref('font','xl');});await sweep('아주 큰 글자');ok('글자 크기 「아주 크게」에서도 화면 검사');await p.evaluate(()=>UI.setPref('font','m'));
  // 테스터용 주소: ?test=1&new=1&team=2&seed=1234 → 바로 새 게임, 테스트 도구·버전 표시
  await p.goto(FILE+'?test=1&new=1&team=2&seed=1234');await p.waitForTimeout(400);
  const tb=await p.evaluate(()=>({arch:SL.userTeam().arch,seed:SL.state().seed,ver:SL.GAME_VER}));
  tb.arch==='poor'&&tb.seed===1234?ok(`테스트 주소로 바로 시작 (${tb.ver}, 시드 ${tb.seed}, 재정난)`):bad('테스트 주소 시작 '+JSON.stringify(tb));
  await p.evaluate(()=>UI.go('club','data'));await has('테스트 도구');await has('요청서용 정보 복사');await has(tb.ver);
  await p.evaluate(()=>UI.test('nextSeason'));(await p.evaluate(()=>SL.state().season))===2?ok('테스트 도구: 다음 시즌 개막까지'):bad('다음 시즌 이동 실패');
  // R004: 직전 타석 결과 유지 · 판매 작별 카드 · 출신 코치 복귀 카드
  await p.goto(FILE+'?test=1&new=1&team=0&seed=1234');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.startGame();UI.step('half');});await has('직전 타석');const lpt=await p.evaluate(()=>document.querySelector('.lastplay .lpt').textContent);/회(초|말)/.test(lpt)&&!/—/.test(lpt)?ok('이닝이 바뀌어도 직전 타석 결과 유지: '+lpt.slice(0,40)):bad('직전 타석 '+lpt);
  await p.evaluate(()=>{UI.step('game');UI.endGame();});
  await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const pid=ut.roster.find(id=>!ut.lineup.includes(id)&&!SL.isPitcher(S.players[id]));const b=SL.krTeams().find(t=>!t.isUser&&t.div===1);b.cash=9e6;const o={id:S.nextOfferId++,type:'buy',pid,team:b.id,fee:Math.round(SL.calcValue(S.players[pid])*1.2),max:0,expires:S.clock+3,counters:0,status:'agreed',willing:true,reasons:[]};S.market.offers.push(o);S.market.listed.push(pid);UI.respond(o.id,'accept');});
  await p.waitForTimeout(200);await has('이적 성사');await has('떠납니다');ok('판매 성사 → 작별 카드');await p.evaluate(()=>UI.closeModal());
  await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const old=Object.values(S.players).find(x=>x.teamId!=null&&x.teamId!==ut.id);S.staffPool.unshift({id:99999,name:old.name,nat:'KR',age:40,dept:'bat',rating:58,trait:null,salary:2000,years:0,bio:'우리 구단 출신',alumni:old.id});UI.go('club','staff');UI.hireCoach(99999);});
  await p.waitForTimeout(200);await has('돌아온 얼굴');ok('출신 코치 영입 → 복귀 카드');await p.evaluate(()=>UI.closeModal());
  if(errs.length)bad('페이지 오류: '+errs.slice(0,3).join(' | '));
  await b.close();console.log(fails?`화면 검사 실패 ${fails}건`:'화면 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

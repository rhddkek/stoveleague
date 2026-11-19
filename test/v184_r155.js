// v184 (R155): 전수조사 — 문장 대신 단어(개조식) · 다른 리그끼리 소식 거르기 · 리그별 시리즈 이름 · 자동 진행은 중요한 제안에서만 멈춤 · 겨울 안내 창은 첫 겨울만 · 캠프 이어 가기 · 노랑 채움 하나
const SL=require('./run.js');const fs=require('fs');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
// 1. 다른 리그끼리 소식: 미국 구단을 맡으면 한국 리그 소식(부상 · 가을야구 · 시상 · 2차 드래프트)이 안 쌓임 — 우리 선수 · 우리 출신은 그대로
{SL.newGame(18401,0,{games:36,league:'US'});const S=SL.state();const ut=SL.userTeam();const n0=S.newsSeq||0;let k=0;while(S.phase==='season'&&k++<400)SL.playDayAuto();
  const T=Object.values(S.teams);const kr=T.filter(t=>t.league==='KR').map(t=>t.name),us=T.filter(t=>t.league==='US').map(t=>t.name);
  const leak=S.news.filter(n=>n.i>n0&&kr.some(x=>n.text.includes(x))&&!us.some(x=>n.text.includes(x)));
  const mine=S.players[ut.roster[0]];const keep=!SL.newsOff(`[부상] 서울 머스탱스 ${mine.name} 어깨`,'n');const drop=SL.newsOff('정규 시즌 종료 — 가을야구 진출: 1위 서울 머스탱스','n');
  !leak.length&&keep&&drop?ok(`미국 구단 시즌: 한국 리그끼리 소식 0줄 (소식 ${S.news.length}줄) · 우리 선수 이름이 있으면 남김`):bad('소식 거르기 '+JSON.stringify({leak:leak.slice(0,3).map(n=>n.text),keep,drop}));}
{SL.newGame(18402,2,{games:36});const S=SL.state();const ut=SL.userTeam();const p=S.players[ut.roster[2]];
  const a=SL.newsOff(`클리블랜드 라이트하우스가 ${p.name}에게 공식 영입 제안`,'overseas'),b=SL.newsOff('도쿄 나이츠 · 오사카 타이푼 3:2','n'),c=SL.newsOff('서울 머스탱스 · 도쿄 나이츠 교류전','n');
  !a&&b&&!c?ok('한국 구단: 우리 선수에게 온 해외 제안 남김 · 일본 리그끼리 소식 거름 · 우리 리그 구단이 있으면 남김'):bad('한국 거르기 '+[a,b,c]);}
// 2. 리그별 마지막 시리즈 이름 (스폰서 성적 보너스 · 위상 기록)
{const r=['KR','JP','TW','US'].map(lg=>SL.serKo(lg));const ui=fs.readFileSync(path.resolve(__dirname,'../src/ui.js'),'utf8');
  r.join()==='한국시리즈,일본시리즈,대만시리즈,월드시리즈'&&/\$\{SL\.serKo\(\)\} 진출/.test(ui)&&!/· 한국시리즈 진출 \+/.test(ui)?ok('시리즈 이름: '+r.join(' · ')+' — 미국 구단 스폰서 보너스에 「한국시리즈」 안 나옴'):bad('시리즈 '+r);}
// 3. 단어로: 화면 문구에 「~습니다 · ~하세요」가 남은 곳은 대사(협상 · 수훈 인터뷰 · 중계)뿐
{let n=0;const left=[];for(const f of ['ui.js','ui2.js']){let s=fs.readFileSync(path.resolve(__dirname,'../src/'+f),'utf8');s=s.replace(/\/\*[\s\S]*?\*\//g,'');for(const l of s.split('\n')){if(/^\s*\/\//.test(l)||/“|cquote|V\(mine|pick\(\[|gameMvp|let a;if\(walk\)/.test(l))continue;const m=l.match(/[^`'"<>]{0,40}(습니다|하세요|입니다|됩니다)[.]?/g)||[];for(const x of m){if(/[「“"]|중계|역전|점수 차|경기를 뒤집|연장|한 점|감사|님|드리|주십시오|덕분|던졌|어요|네요|짜릿|생각|느껴|보탬|도와|힘이|배울|이어 가|뛰겠|좋았|들어왔|해결|가볍게|팀이 어렵|목표는|돌아와|높이 평가|따라|추격|동점|들썩|균형|역할|바로 되갚|쓸어|뛰어 살|만족|대승|무기력|일방|기회|최선|좁히지|승패|간발|박빙|버틴|밀렸|지친|긴 밤|결말|압도/.test(x))continue;n++;left.push(x.trim());}}}
  n<=12?ok(`화면 문구 문장 끝(대사 제외) ${n}곳`):bad('문장 '+n+' '+left.slice(0,12).join(' | '));}
{const s=fs.readFileSync(path.resolve(__dirname,'../src/core_c.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');const L=s.split('\n');let n=0;const left=[];for(let i=0;i<L.length;i++){const l=L[i];if(/\[리그 연봉\]|tableLines|push\(agent|push\(T\.|push\(old|push\(`다시|push\('|구단주: "|금액 단위가 바뀌었습니다|KBO 규모|저희 |「/.test(l))continue;const m=l.match(/news\(`[^`]*(습니다|하세요|입니다)/g);if(m){n+=m.length;left.push(...m.map(x=>x.slice(0,60)));}}
  n===0?ok('소식(news) 문장 끝 0곳'):bad('소식 문장 '+n+' '+left.slice(0,5).join(' | '));}
// 4. 스프링캠프: 한 번 정하면 다음 겨울에 그대로 (묻지 않음)
{SL.newGame(18403,2,{games:36});const S=SL.state();let k=0;while(S.phase==='season'&&k++<300)SL.playDayAuto();if(SL.finishPost)SL.finishPost();const ut=SL.userTeam();
  const r=S.phase==='offseason'?SL.campSet('oki','bat'):{ok:false};r.ok&&ut.campLast&&ut.campLast.loc==='oki'&&ut.campLast.focus==='bat'?ok('캠프 정하면 campLast 저장 → 다음 겨울 3→4주차에 그대로 적용'):bad('캠프 '+JSON.stringify([r,ut.campLast]));}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html?test=1'));await p.waitForTimeout(500);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();try{UI.tutSkip();}catch(e){}UI.closeModal();});await p.waitForTimeout(300);
  // 5. 자동 진행: 그냥 온 제안(시장가치 아래)으로는 안 멈춤 · 매물 등록 선수 제안에선 멈춤
  const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const o=Object.values(S.teams).find(t=>t.league===ut.league&&!t.isUser);const pid=ut.roster[3],pid2=ut.roster[4];const v=SL.calcValue(S.players[pid]);
    const mk=(id,fee)=>({id:S.nextOfferId++,type:'buy',pid:id,team:o.id,fee,max:fee,expires:S.clock+3,counters:0,status:'open',willing:true,pw:1,reasons:[],unsolicited:true});
    const d0=S.day;const add=(id,fee)=>{const f=SL.playDayAuto;SL.playDayAuto=function(){const r=f.apply(this,arguments);if(!this._x){this._x=1;S.market.offers.push(mk(id,fee));}return r;};return ()=>{SL.playDayAuto=f;};};
    let un=add(pid,Math.round(v*0.9));UI.autoDays(4);un();UI.closeModal();const g1=S.day-d0;
    S.market.listed.push(pid2);const d1=S.day;delete SL._x;un=add(pid2,Math.round(SL.calcValue(S.players[pid2])*0.9));UI.autoDays(4);un();const g2=S.day-d1;const t=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();return {g1,g2,t:t.slice(0,80)};});
  r.g1===4&&r.g2===1?ok(`자동 진행: 그냥 온 제안 → 안 멈춤(${r.g1}경기) · 매물 등록 선수 제안 → ${r.g2}경기 뒤 멈춤`):bad('제안 멈춤 '+JSON.stringify(r));
  // 6. 노랑 채움: 머리줄 「▶ 경기」 · 목록 줄 작은 단추 · 고르는 카드 단추는 테두리
  const y=await p.evaluate(async()=>{UI.go('roster');await new Promise(r=>setTimeout(r,200));const bg=e=>e?getComputedStyle(e).backgroundColor:'none';const nb=document.querySelector('.club .nextb');
    const c=document.querySelector('#app .content');const d=document.createElement('div');d.className='prow';d.innerHTML='<button class="sm primary">x</button><button class="primary pick">y</button>';c.appendChild(d);const r={nb:bg(nb),row:bg(d.children[0]),pick:bg(d.children[1]),bd:getComputedStyle(d.children[0]).borderTopColor};d.remove();return r;});
  const clear=c=>c==='none'||/rgba\(0, 0, 0, 0\)|transparent/.test(c);
  clear(y.nb)&&clear(y.row)&&clear(y.pick)&&/242, 193, 78/.test(y.bd)?ok('머리줄 「▶ 경기」 · 목록 줄 단추 · 고르는 단추 = 노란 테두리(채움 없음)'):bad('노랑 '+JSON.stringify(y));
  // 7. 겨울 단계 안내 창: 첫 겨울 4장 뒤로는 창 없이 감독실 카드
  const w=await p.evaluate(async()=>{const S=SL.state();let k=0;while(S.phase==='season'&&k++<400){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}if(SL.finishPost)SL.finishPost();UI.closeModal();S.auto={};for(const x of Object.keys(SL.AUTO_KEYS))S.auto[x]=true;S.stgN=4;UI.go('home');await new Promise(r=>setTimeout(r,100));
    const w0=S.week;UI.advanceWeek();await new Promise(r=>setTimeout(r,200));const m=document.querySelector('#modal');const t=m?(m.querySelector('h3')||m).innerText.slice(0,40):'';UI.closeModal();
    S.stgN=0;const w1=S.week;UI.advanceWeek();await new Promise(r=>setTimeout(r,200));const m2=document.querySelector('#modal');const t2=m2?(m2.querySelector('h3')||m2).innerText.slice(0,40):'';UI.closeModal();return {ph:S.phase,w0,w1,w:S.week,t,t2,card:!!document.querySelector('.stgc')};});
  w.ph==='offseason'&&!/스토브리그 \d주차/.test(w.t)&&/스토브리그 \d주차/.test(w.t2)?ok(`겨울 단계 안내: 4장 본 뒤 창 없음(${w.w0}→${w.w1}주차) · 처음엔 창(${w.t2.split('\n')[0]})`):bad('단계 창 '+JSON.stringify(w));
  // 8. 선수 이벤트 마감 표시: 「0일」 대신 「오늘 마감」
  const ui2=fs.readFileSync(path.resolve(__dirname,'../src/ui2.js'),'utf8');/v\.left<=0\?'오늘 마감'/.test(ui2)?ok('선수 이벤트 마감 「오늘 마감 · n일 남음」'):bad('이벤트 마감 문구');
  // 9. 경기 중엔 「할 일 n건 · 다음」 알약을 숨김 (아래 메뉴 줄을 가리던 것)
  const cp=await p.evaluate(()=>{const d=document.createElement('button');d.className='chainpill';d.textContent='x';document.body.appendChild(d);const a=getComputedStyle(d).display;document.body.classList.add('ingame');const b2=getComputedStyle(d).display;document.body.classList.remove('ingame');d.remove();return [a,b2];});
  cp[0]!=='none'&&cp[1]==='none'?ok('경기 화면: 할 일 알약 숨김'):bad('알약 '+cp);
  // 10. 트레이드 두 칸 표 머리: 「위치」(포지션 세 글자가 18px 칸에서 겹치던 것)
  /<th class="tn">이름<\/th><th>위치<\/th>/.test(ui2)?ok('트레이드 두 칸 표 머리 「이름 · 위치 · 나이 · 능력 · 잠재」'):bad('트레이드 머리');
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`실패 ${fails}건`:'v184 통과');process.exit(fails?1:0);})();

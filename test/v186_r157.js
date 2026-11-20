// v186 (R157): 그림 · 연출 · 화면 개편 — 픽셀 아이콘 · 감독 얼굴 뺌 · 폰 감독실 경기 카드 · 결과 신문 1면 · 선수 카드 머리 · 겨울 빨강 0 · 큰 컷 · 픽셀 글꼴
const SL=require('./run.js');const fs=require('fs');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const ROOT=path.resolve(__dirname,'..');
// 0. 끝내기 이닝 점수도 이닝표에 (이닝 합 = 점수)
{SL.newGame(18603,2,{games:144});let n=0,badN=0,wo=0;for(let d=0;d<60;d++){const r=SL.playDayAuto();if(r&&r.lg){const lg=r.lg;n++;if((lg.log.find(e=>e.type==='end')||{}).text.includes('끝내기'))wo++;if([0,1].some(i=>lg.innScores[i].reduce((a,x)=>a+(+x||0),0)!==lg.score[i]))badN++;}}
  !badN&&wo?ok(`이닝표 합 = 점수: 우리 경기 ${n}개(끝내기 ${wo}) 모두`):bad('이닝표 '+JSON.stringify({n,badN,wo}));}
// 1. 글꼴 조각: 큰 컷 · 점수에 쓰는 글자가 모두 들어 있음
{const chars=fs.readFileSync(ROOT+'/assets/fonts/galmuri_chars.txt','utf8');const need=['한국시리즈 우승','일본시리즈 우승','대만시리즈 우승','월드시리즈 우승','가을야구 진출','끝내기 승리','부임 첫 승','대형 계약','노히트','사이클링 히트','한 경기 3홈런','VS 0123456789:'];
  const miss=[...new Set(need.join('').replace(/\s/g,''))].filter(c=>!chars.includes(c));const lic=fs.existsSync(ROOT+'/assets/fonts/Galmuri_OFL.md');
  !miss.length&&lic?ok(`픽셀 글꼴 조각 ${[...chars].length}자 · 큰 컷 제목 글자 모두 · OFL 사본`):bad('글꼴 '+JSON.stringify({miss,lic}));}
// 2. 가짜 픽셀 JPG → 픽셀 PNG, 쓰는 곳 없는 JPG(오타 간판 배너 · 겨울 감독실) 뺌, 새 큰 컷 그림 4장
{const gone=['res_banner.jpg','winter_camp.jpg','newgame_banner.jpg','office_winter.jpg'].filter(f=>fs.existsSync(ROOT+'/assets/'+f));const png=['res_banner.png','winter_camp.png','pitch_banner.png'].filter(f=>!fs.existsSync(ROOT+'/assets/'+f));const art=['walkoff','record','firstwin','bigsign'].filter(k=>!fs.existsSync(ROOT+'/assets/art/'+k+'.png'));
  !gone.length&&!png.length&&!art.length?ok('JPG 4장 → 뺌/픽셀 PNG · 투수진 배너 PNG · 큰 컷 그림 4장(끝내기 · 대기록 · 첫 승 · 대형 계약)'):bad('그림 '+JSON.stringify({gone,png,art}));}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__cutTest=1;});
  await p.goto('file://'+ROOT+'/stoveleague.html?test=1');await p.waitForTimeout(600);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();});await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.tutSkip&&UI.tutSkip();UI.closeModal();const S=SL.state();S.auto=S.auto||{};UI.setTab('home');});await p.waitForTimeout(200);
  // 3. 아이콘: 선 아이콘 → 픽셀(crispEdges), 아래 메뉴도
  {const r=await p.evaluate(()=>{const nav=[...document.querySelectorAll('nav svg, .nav svg')];const li=[...document.querySelectorAll('svg.li, svg.pxi')];const px=s=>!!s.querySelector('path[shape-rendering="crispEdges"]');const stroke=[...document.querySelectorAll('#app svg.li')].filter(s=>!px(s)).length;return {nav:nav.length,navPx:nav.filter(px).length,li:li.length,liPx:li.filter(px).length,stroke};});
    r.nav>=5&&r.navPx===r.nav&&r.li>=1&&r.liPx===r.li&&r.stroke===0?ok(`픽셀 아이콘: 아래 메뉴 ${r.nav}/${r.nav} · 화면 아이콘 ${r.liPx}/${r.li} (선 아이콘 0)`):bad('아이콘 '+JSON.stringify(r));}
  // 4. 폰 시즌 감독실: 구장 띠 없이 경기 카드가 첫 줄 · 선발 = 경기 전 준비 · 선발 그림 64 (v187: GPT 시안 — 엠블럼 대결 → 「우리 vs 상대」 + 2등신)
  {const r=await p.evaluate(()=>{const S=SL.state();const g=SL.userGameToday();const gi=S.schedule.indexOf(g);const pm=SL.preMatch(gi);
      const first=document.querySelector('.card.today');const hero=!!document.querySelector('.hero2');const nm=[...document.querySelectorAll('.tdx .gxsp b')].map(x=>x.textContent);const fw=[...document.querySelectorAll('.tdx .gxvs>.chb')].map(x=>Math.round(x.getBoundingClientRect().width));
      const exp=[pm.me.sp?S.players[pm.me.sp.pid].name:'미정',pm.op.sp?S.players[pm.op.sp.pid].name:'미정'];const go=!!document.querySelector('.tdx button.gold[onclick="UI.startGame()"]');const auto=!!document.querySelector('.tdx button[onclick^="UI.autoRun(7"]');
      const tiles=[...document.querySelectorAll('.tile')].map(x=>x.textContent).join('|');const bot=first?first.getBoundingClientRect().bottom:9999;
      return {tdx:!!document.querySelector('.tdx'),hero,nm,exp,fw,go,auto,inbox:/받은 소식/.test(tiles),bot:Math.round(bot)};});
    r.tdx&&!r.hero&&r.nm.join()===r.exp.join()&&r.fw.length===2&&r.fw.every(w=>w>=56)&&r.go&&r.auto&&r.bot<700?ok(`폰 감독실: 경기 카드 첫 줄(구장 띠 없음) · 선발 ${r.nm.join(' vs ')} = 경기 전 준비 · 선발 그림 ${r.fw.join('/')}px · [경기 보기][7경기 자동] · 카드 끝 ${r.bot}px`):bad('감독실 '+JSON.stringify(r));}
  // 5. 자동 1경기 결과 = 신문 1면: 점수 픽셀 글꼴 · 이닝표 합 = 점수 · 수훈 얼굴 128 · 창 안 단추 줄은 하나(.shbar)
  {const r=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();let k=0;while(!SL.userGameToday()&&k++<5)UI.autoDays(1);UI.closeModal();UI.autoDays(1);await new Promise(r=>setTimeout(r,700));const m=document.querySelector('#modal .rsheet');if(!m)return {sheet:false};
      const s=m.querySelector('.grsc .s');const ff=s?getComputedStyle(s).fontFamily:'';const sc=s?s.innerText.replace(/\s+/g,''):'';const last=S.schedule.filter(x=>x.res&&(x.home===ut.id||x.away===ut.id)).sort((a,b)=>b.day-a.day)[0];const my=last.home===ut.id?last.res.hs:last.res.as,op=last.home===ut.id?last.res.as:last.res.hs;
      const rows=[...m.querySelectorAll('.grinn tbody tr')].map(tr=>[...tr.querySelectorAll('td')].slice(1).map(td=>td.textContent));const sum=rows.map(c=>c.slice(0,-3).reduce((a,x)=>a+(+x||0),0)===+c[c.length-3]);
      const mf=m.querySelector('.grmvp>:nth-child(2)');const mw=mf?Math.round(mf.getBoundingClientRect().width):0;return {sheet:true,ff,sc,exp:`${my}:${op}`,sum,mw,grgo:m.querySelectorAll('.grgo').length,shbar:m.querySelectorAll('.shbar').length};});
    r.sheet&&/SLPixel/.test(r.ff)&&r.sc===r.exp&&r.sum.every(Boolean)&&r.mw>=112&&r.grgo===0&&r.shbar===1?ok(`결과 창 신문 1면: 점수 ${r.sc}(픽셀 글꼴) · 이닝표 합 = 점수 · 수훈 얼굴 ${r.mw}px · 단추 줄 하나`):bad('결과 '+JSON.stringify(r));
    await p.evaluate(()=>UI.closeModal());}
  // 6. 선수 카드 머리: 얼굴 128 · 등급 배지 테두리(채움 아님) · 가장 높은 능력 하나만 노랑
  {const r=await p.evaluate(async()=>{const ut=SL.userTeam();const S=SL.state();const pid=ut.lineup[0];UI.openPlayer(pid);await new Promise(r=>setTimeout(r,150));const m=document.querySelector('#modal .pck');if(!m)return {card:false};const f=m.querySelector('.pch>:first-child');const g=m.querySelector('.pcgr .gbadge2 b');const gs=g?getComputedStyle(g):null;
      const o={card:true,fw:f?Math.round(f.getBoundingClientRect().width):0,nm:(m.querySelector('.pch b')||{}).textContent,exp:S.players[pid].name,top:m.querySelectorAll('.pca.top').length,gbw:gs?gs.borderTopStyle+' '+(parseFloat(gs.borderTopWidth)>0):'',gbg:gs?gs.backgroundColor:''};UI.closeModal();return o;});
    r.card&&r.fw>=112&&r.nm&&r.nm.startsWith(r.exp)&&r.top===1&&r.gbw==='solid true'&&/rgba\(0, 0, 0, 0\)|transparent/.test(r.gbg)?ok(`선수 카드: 얼굴 ${r.fw}px · 등급 배지 테두리 ${r.gbw} · 가장 높은 능력 ${r.top}개만 노랑`):bad('카드 '+JSON.stringify(r));}
  // 7. 큰 컷: 우승 → 전체 화면 그림 · 제목 픽셀 글꼴 · 누르면 닫힘 · 같은 일은 한 번 · 시즌 10번 상한
  {const r=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();const fw=!!(S.cuts&&S.cuts.seen.some(k=>k==='fw-'+ut.id||/^wo-/.test(k)))||ut.rec.w===0;UI.cutClose(1);S.phase='offseason';S.week=1;S.lastRecap={s:S.season,rank:1,w:90,l:50,ps:'champ',seen:true};UI.setTab('home');await new Promise(r=>setTimeout(r,200));const d=document.getElementById('bigcut');
      const o={on:!!d,t:d?(d.querySelector('.bcb>b')||{}).textContent:'',ff:d?getComputedStyle(d.querySelector('.bcb>b')).fontFamily:'',art:d?!!d.querySelector('.bcart.art-champ'):false,z:d?+getComputedStyle(d).zIndex:0};if(d)d.click();await new Promise(r=>setTimeout(r,200));o.closed=!document.getElementById('bigcut');o.fw=fw;
      UI.render();await new Promise(r=>setTimeout(r,150));o.again=!!document.getElementById('bigcut');
      S.cuts={s:S.season,n:0,seen:[]};let n=0;for(let i=0;i<14;i++)if(UI._cut('t'+i,{art:'record',t:'대기록'}))n++;o.cap=n;o.cnt=S.cuts.n;UI.cutClose(1);o.left=!!document.getElementById('bigcut');S.phase='season';S.lastRecap=null;S.cuts=null;return o;});
    r.fw&&r.on&&r.t==='한국시리즈 우승'&&/SLPixel/.test(r.ff)&&r.art&&r.z>=9000&&r.closed&&!r.again&&r.cap===10&&r.cnt===10&&!r.left?ok(`큰 컷: 첫 승 「부임 첫 승」 · 「${r.t}」(픽셀 글꼴 · 헹가래 그림) · 누르면 닫힘 · 다시 안 뜸 · 시즌 상한 ${r.cap}번`):bad('큰 컷 '+JSON.stringify(r));}
  // 8. 큰 컷 — 대형 계약(새로 온 선수가 팀 연봉 3위 안) · 경기 기록의 끝내기/대기록(keyMoment)
  {const r=await p.evaluate(async()=>{const S=SL.state();const ut=SL.userTeam();UI.render();const o={};const cand=Object.values(S.players).filter(x=>x.teamId!=null&&x.teamId!==ut.id&&x.contract&&!x.retired).sort((a,b)=>b.contract.salary-a.contract.salary)[0];
      const from=S.teams[cand.teamId];from.roster=from.roster.filter(id=>id!==cand.id);cand.teamId=ut.id;ut.roster.push(cand.id);UI.render();await new Promise(r=>setTimeout(r,150));const d=document.getElementById('bigcut');o.bs=d?d.querySelector('.bcb>b').textContent:'';o.nm=d&&d.querySelector('.bcp b')?d.querySelector('.bcp b').textContent:'';o.exp=cand.name;UI.cutClose();
      let wo=null,k=0;while(!wo&&k++<400&&S.phase==='season'){const r=SL.playDayAuto();if(r&&r.lg){const km=SL.keyMoment(r.lg);if(km&&km.ours&&km.pr>=80)wo={lg:r.lg,km};}}
      if(wo){S.cuts={s:S.season,n:0,seen:[]};UI._cutGame(wo.lg);await new Promise(r=>setTimeout(r,120));const d2=document.getElementById('bigcut');o.wo=d2?d2.querySelector('.bcb>b').textContent:'';o.km=wo.km.k;UI.cutClose();}else o.wo='(없음)';return o;});
    r.bs==='대형 계약'&&r.nm===r.exp&&(r.wo==='(없음)'||r.wo===(r.km==='끝내기'?'끝내기 승리':r.km))?ok(`큰 컷: 「대형 계약」 ${r.nm} · 경기 기록 「${r.km||'-'}」 → 「${r.wo}」`):bad('큰 컷 2 '+JSON.stringify(r));}
  await p.close();
  // 9. 겨울 감독실: 감독 얼굴 없음(엠블럼) · 빨강 0 · 감독 제의 여러 곳 = 한 줄
  {const q=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto('file://'+ROOT+'/stoveleague.html?test=1');await q.waitForTimeout(500);
    const r=await q.evaluate(async()=>{SL.newGame(18601,2,{games:36});const S=SL.state();S.tutorialDone=true;UI.closeModal();let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();
      const tw=Object.values(S.teams).filter(t=>t.league==='TW').slice(0,3);S.jobOffers=tw.map((t,i)=>({id:99100+i,team:t.id,kind:'offer',reason:'재건 요청함',goal:{text:'가을야구 진출',target:4}}));UI.setTab('home');await new Promise(r=>setTimeout(r,200));
      const wh=document.querySelector('.whead');const red=[...document.querySelectorAll('.wtd *')].filter(e=>{const c=getComputedStyle(e).backgroundColor;const m=c.match(/\d+/g);return m&&+m[0]>150&&+m[1]<90&&+m[2]<90&&(m[3]==null||+m[3]>0);}).length;
      const job=[...document.querySelectorAll('.wtd .wrow')].filter(x=>/감독 제의/.test(x.textContent));const mg=(UI.go('club','mgr'),document.querySelector('.mgtop'));
      return {kids:wh?wh.children.length:0,face:wh?wh.querySelectorAll('.face,.pxface,[data-pid]').length:-1,red,job:job.length,jobT:job[0]?job[0].querySelector('.t').textContent:'',mgFace:mg?mg.querySelectorAll('.face,.pxface,[data-pid]').length:-1};});
    r.kids===2&&r.face===0&&r.red===0&&r.job===1&&/감독 제의 3건/.test(r.jobT)&&r.mgFace===0?ok(`겨울 감독실: 감독 얼굴 없음(머리 = 엠블럼 + 글) · 빨간 바탕 0 · 「${r.jobT}」 한 줄 · 구단 → 감독도 얼굴 없음`):bad('겨울 '+JSON.stringify(r));await q.close();}
  // 10. 예전 저장(v158 미국 · v29 한국) 열기 → 감독실 · 결과 오류 없음 (S.cuts 없어도)
  {const q=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));await q.goto('file://'+ROOT+'/stoveleague.html?test=1');await q.waitForTimeout(500);
    for(const f of ['v158_us_save.json','v29_save.json']){await q.evaluate(j=>{SL.load(j);UI.closeModal();UI.setTab('home');},fs.readFileSync(__dirname+'/'+f,'utf8'));await q.waitForTimeout(200);}
    !e2.length?ok('예전 저장 2개: 감독실 오류 없음'):bad('예전 저장 '+e2.slice(0,2).join(' | '));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`실패 ${fails}건`:'v186 통과');process.exit(fails?1:0);})();

// v185 (R156): 픽셀랩 그림 — 얼굴 나이대 5단계(고졸 신인 · 젊은 · 중견 · 베테랑 · 노장) · 쿠바/포수 신인 · 베테랑 · 코치 아시아/그 밖 · 순간 배너 5장 · 도전과제 배지 · 시리즈 이름 리그대로
const SL=require('./run.js');const fs=require('fs');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const A=path.resolve(__dirname,'../assets');
// 1. 파일: 나이대 · 분류마다 3장 이상, 배너 5장, 배지 11개
{const P=fs.readdirSync(A+'/portraits').map(f=>f.replace(/-\d+\.png$/,''));const n=k=>P.filter(x=>x===k).length;const need=['ea-rook','ea-old','wh-rook','wh-young','wh-old','bl-rook','bl-young','bl-old','la-rook','la-young','la-old','cb-young','cb-vet','catch-young','catch-vet','coach-mid','coachx-mid','coachx-vet'];
  const short=need.filter(k=>n(k)<3);const art=['champ','post','abroad','retno','hire'].filter(k=>!fs.existsSync(A+'/art/'+k+'.png'));const bd=['champ','pennant','crown','streak','shield','night','money','mission','legend','power','shoe'].filter(k=>!fs.existsSync(A+'/badges/'+k+'.png'));
  !short.length&&!art.length&&!bd.length?ok(`얼굴 ${P.length}장(나이대 · 분류 ${need.length}칸 모두 3장 이상) · 배너 5 · 배지 11`):bad('파일 '+JSON.stringify({short,art,bd}));}
// 2. 도전과제 시리즈 이름은 맡은 리그대로
{SL.newGame(18501,0,{games:36,league:'US'});const L=SL.achList();const ks=L.find(x=>x.k==='ks'),ch=L.find(x=>x.k==='champ');
  ks.t==='월드시리즈'&&/월드시리즈 진출/.test(ks.d)&&/월드시리즈 우승/.test(ch.d)?ok(`미국 구단 도전과제: 「${ks.t}」 · ${ch.d}`):bad('도전과제 이름 '+JSON.stringify([ks,ch]));
  SL.newGame(18502,2,{games:36});const k2=SL.achList().find(x=>x.k==='ks');k2.t==='한국시리즈'?ok('한국 구단: 「한국시리즈」 그대로'):bad('한국 '+k2.t);}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];
  const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html?test=1'));await p.waitForTimeout(600);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(2);UI.newGame();});await p.waitForTimeout(300);
  // 3. 얼굴 고르기: 나이 → 나이대
  const r=await p.evaluate(()=>{const q=(nat,age,o)=>UI.pxMeta(Object.assign({id:age*7+nat.length*131,nat,age,pos:'SS'},o||{}));const band=m=>m.split('-')[1];const T=[];
    for(let i=0;i<40;i++){T.push(['KR',18+(i%3),'rook',band(q('KR',18+(i%3),{id:1000+i}))]);T.push(['KR',37+(i%3),'old',band(q('KR',37+(i%3),{id:2000+i}))]);T.push(['US',19,'rook',band(q('US',19,{id:3000+i}))]);T.push(['US',38,'old',band(q('US',38,{id:4000+i}))]);}
    const wrong=T.filter(x=>x[3]!==x[2]);const mid=q('KR',27,{id:55});const co=[UI.pxMeta({id:900001,nat:'KR',age:48,coach:true}),UI.pxMeta({id:900002,nat:'US',age:60,coach:true}),UI.pxMeta({id:900003,nat:'KR',age:62,coach:true})];
    const cat=[UI.pxMeta({id:7,nat:'KR',age:20,pos:'C'}),UI.pxMeta({id:7,nat:'KR',age:36,pos:'C'})];return {n:T.length,wrong:wrong.slice(0,4),mid,co,cat};});
  !r.wrong.length&&/^ea-mid/.test(r.mid)&&/^coach-/.test(r.co[0])&&/^coachx-vet/.test(r.co[1])&&/^coach-vet/.test(r.co[2])?ok(`얼굴 나이대 ${r.n}명 모두 맞음(20세 이하 신인 · 36세 이상 노장) · 코치 ${r.co.join(' · ')} · 포수 ${r.cat.join(' · ')}`):bad('얼굴 '+JSON.stringify(r));
  // 4. 배너: 부임 창 · 결산 우승 · 해외 진출 · 영구결번 화면에 그림
  const t=await p.evaluate(()=>!!document.querySelector('.tut .artban.art-hire'));
  const c=await p.evaluate(async()=>{UI.tutSkip();const S=SL.state();S.lastRecap={s:S.season,rank:1,w:90,l:50,ps:'champ',seen:false};try{UI.rcTab('sum');}catch(e){return 'E '+e.message;}await new Promise(r=>setTimeout(r,150));const ok=!!document.querySelector('#modal .artban.art-champ');S.lastRecap.ps='po';UI.rcTab('sum');await new Promise(r=>setTimeout(r,100));const rc=!!document.querySelector('#modal .artban.art-recap');UI.closeModal();return ok&&rc;});
  const ui2=fs.readFileSync(path.resolve(__dirname,'../src/ui2.js'),'utf8');const st=/artBan\('abroad'\)/.test(ui2)&&/artBan\('retno'\)/.test(ui2)&&/inPS\?artBan\('post'\)/.test(ui2);
  t&&c===true&&st?ok('배너: 부임 창 「기자회견」 · 우승 결산 「헹가래」(아니면 노을 구장) · 가을야구 진출 · 해외 진출 · 영구결번'):bad('배너 '+JSON.stringify({t,c,st}));
  // 5. 도전과제 배지: 딴 건 색, 못 딴 건 흐리게
  const d=await p.evaluate(async()=>{const S=SL.state();S.ach=S.ach||{};S.ach.champ={s:S.season,d:1};UI.go('league','achdone');await new Promise(r=>setTimeout(r,150));const a=document.querySelectorAll('.achrow.got .achi img').length;UI.go('league','ach');await new Promise(r=>setTimeout(r,150));const g=[...document.querySelectorAll('.achrow:not(.got) .achi img')];return {a,n:g.length,f:g[0]?getComputedStyle(g[0]).filter:''};});
  d.a>=1&&d.n>=10&&/grayscale/.test(d.f)?ok(`도전과제 배지: 달성 ${d.a} · 남은 ${d.n}(흑백)`):bad('배지 '+JSON.stringify(d));
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`실패 ${fails}건`:'v185 통과');process.exit(fails?1:0);})();

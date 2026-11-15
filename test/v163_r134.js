// v163 (R134): 미국 하부 이름 = 메이저 · 챌린저스 · 루키스 (광우) — 단계 이름 · 명단 칸 · 관리 단추 · 기록 줄 · 리그 수준표 · 예전 저장의 기록 줄도 새 이름으로
const path=require('path');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
{SL.newGame(31,0,{league:'US'});const S=SL.state();
  SL.farmKo('US',1)==='메이저'&&SL.farmKo('US',2)==='챌린저스'&&SL.farmKo('US',3)==='루키스'&&SL.farmKo('JP',2)==='일본 2군'?ok('단계 이름: 메이저 · 챌린저스 · 루키스 (일본 2군 그대로)'):bad('단계 이름');
  S.tierV===1?ok('새 게임은 바꿀 기록 없음(tierV 1)'):bad('tierV '+S.tierV);
  // 예전 저장: 기록 줄 「· 트리플A」 「· 미국 3군」 → 새 이름, 한 번만
  const ps=Object.values(S.players).filter(p=>p.teamId!=null).slice(0,3);ps[0].hist=[{s:0,team:ps[0].teamId,tn:'뉴욕 스카이라인스 · 트리플A',lg:'US2',st:{g:90},w:0}];ps[1].rhist=[{s:0,tn:'보스턴 하버스 · 미국 3군',lg:'US3',st:{g:60}}];ps[2].hist=[{s:0,tn:'시카고 윈즈 · 더블A',lg:'US3',st:{g:40},w:0},{s:0,tn:'시카고 윈즈',lg:'US',st:{g:10},w:0}];delete S.tierV;
  SL.load(SL.serialize());const T=SL.state();const a=T.players[ps[0].id].hist[0].tn,b=T.players[ps[1].id].rhist[0].tn,c=T.players[ps[2].id].hist.map(h=>h.tn);
  a==='뉴욕 스카이라인스 · 챌린저스'&&b==='보스턴 하버스 · 루키스'&&c[0]==='시카고 윈즈 · 루키스'&&c[1]==='시카고 윈즈'&&T.tierV===1?ok(`예전 저장 기록 줄: 「${a}」 · 「${b}」 · 「${c[0]}」 (1군 줄은 그대로)`):bad('저장 변환 '+JSON.stringify({a,b,c,v:T.tierV}));}
console.log(fails?`실패 ${fails}건`:'v163 엔진 통과');
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);const tag=vp.m?'휴대폰':'PC';
    await p.evaluate(()=>{UI.pickLg('US');UI.pickTeam(1);UI.newGame();const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='시작하기');if(b)b.click();UI.closeModal();UI.go('roster','list');});await p.waitForTimeout(300);
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,150));const g=[...document.querySelectorAll('.grptab button')].map(x=>x.textContent.trim());const ut=SL.userTeam();const e=new Set(ut.entry);
      const id2=ut.roster.find(x=>!e.has(x)&&SL.uTier(SL.state().players[x],ut)===2),id3=ut.roster.concat(ut.dev).find(x=>!e.has(x)&&SL.uTier(SL.state().players[x],ut)===3);
      UI.pmenu(id2);await w();const m2=(document.querySelector('#modal')||document.body).innerText;UI.closeModal();UI.pmenu(id3);await w();const m3=(document.querySelector('#modal')||document.body).innerText;UI.closeModal();UI.pmenu(ut.entry[0]);await w();const m1=(document.querySelector('#modal')||document.body).innerText;UI.closeModal();
      UI.openPlayer(id2);await w();const head=(document.querySelector('#modal')||document.body).innerText+document.querySelector('.content').innerText;UI.pcTab('rec');await w();let rec=[...document.querySelectorAll('#modal .pcrec tbody tr')].map(x=>x.innerText.replace(/\s+/g,' '));UI.closeModal();for(const x of ut.roster.filter(x=>!e.has(x)).slice(0,15)){if(rec.some(r=>/챌린저스|루키스/.test(r)))break;UI.openPlayer(x);await w();UI.pcTab('rec');await w();rec=[...document.querySelectorAll('#modal .pcrec tbody tr')].map(x=>x.innerText.replace(/\s+/g,' '));UI.closeModal();}
      UI.go('league','overseas');UI.ovLg('LV');await w();const lv=document.querySelector('.content').textContent;const all=document.body.innerText;
      return {g,m2:/루키스로/.test(m2)&&/메이저 등록/.test(m2),m3:/챌린저스로/.test(m3),m1:/챌린저스로/.test(m1),rec:rec.find(x=>/챌린저스|루키스/.test(x))||'',nick:ut.name.split(' ').pop(),lv:['미국 메이저','미국 챌린저스','미국 루키스'].every(k=>lv.includes(k)),old:/트리플A|더블A/.test(all+head),head:/챌린저스 · 연봉/.test(head)};});
    /^메이저 \d+\/\d+$/.test(r.g[0])&&r.g[1]==='챌린저스'&&r.g[2]==='루키스'?ok(`${tag} 명단 칸 「${r.g.slice(0,3).join(' · ')}」`):bad(tag+' 명단 칸 '+JSON.stringify(r.g));
    r.m2&&r.m3&&r.m1?ok(`${tag} 관리 단추: 챌린저스 선수 「루키스로 · 메이저 등록」 · 루키스 선수 「챌린저스로」 · 메이저 선수 「챌린저스로」`):bad(tag+' 단추 '+JSON.stringify(r));
    (r.rec.includes(' 챌린저스 ')||r.rec.includes(' 루키스 '))&&/\.\d{3}|\d\.\d\d/.test(r.rec)?ok(`${tag} 선수 카드 기록 줄 「${r.rec.slice(0,40)}」`):bad(tag+' 기록 줄 '+r.rec);
    r.lv&&!r.old&&r.head?ok(`${tag} 리그 수준표 「미국 메이저 · 미국 챌린저스 · 미국 루키스」 · 선수 카드 「챌린저스 · 연봉 …」 · 명단 · 카드 · 수준표에 예전 이름 없음`):bad(tag+' 수준표 '+JSON.stringify({lv:r.lv,old:r.old,head:r.head}));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');await b.close();console.log(fails?`실패 ${fails}건`:'v163 통과');process.exit(fails?1:0);})();

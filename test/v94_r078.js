// v94 (R078): 리그 탭 정리 · 위 날짜 잘 보임 · 중계 화면(이닝 교대 멈춤 · 수비수 이름 · 주자 이동) · 해설 상황 문구 · 난이도 · 미션 보상
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();UI.autoDays(6);UI.closeModal();});
  // 1. 리그 위 줄 5칸 · 아래 줄은 그 탭 세부만(2개 이상) · 리그 결과 점수 = 일정 기록
  {const r=await p.evaluate(()=>{UI.setTab('league');const top=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());const rows={};
      for(let i=0;i<top.length;i++){document.querySelectorAll('.htabs button')[i].click();rows[top[i]]=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());}
      UI.go('league','scores');const S=SL.state();const tr=[...document.querySelectorAll('.sctbl tbody tr')];const day=Math.max(...S.schedule.filter(g=>g.res).map(g=>g.day));const gs=S.schedule.filter(g=>g.day===day);
      const match=tr.length===gs.length&&gs.every((g,i)=>{const t=tr[i].innerText.replace(/\s+/g,' ');return t.includes(S.teams[g.away].name)&&t.includes(S.teams[g.home].name)&&t.includes(`${g.res.as} : ${g.res.hs}`);});
      return {top,rows,n:tr.length,match};});
    const want=['순위','일정','기록','도전과제','다른 리그'];const all=Object.values(r.rows).flat();
    JSON.stringify(r.top)===JSON.stringify(want)&&Object.values(r.rows).every(x=>x.length>=2)&&new Set(all).size===all.length&&r.match?ok(`리그 위 줄 ${r.top.join('·')} · 아래 줄 ${Object.entries(r.rows).map(([k,v])=>k+'('+v.join('·')+')').join(' ')} · 리그 결과 ${r.n}경기 점수 = 일정 기록`):bad('리그 탭 '+JSON.stringify(r));}
  // 2. 위 머리띠 날짜: 모든 화면 · 어두운/밝은 테마에서 대비 4.5 이상
  {const r=await p.evaluate(()=>{const L=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement;}return 'rgb(0,0,0)';};
      const out=[];for(const th of ['ea','light']){UI.setTheme(th);for(const t of ['home','roster','dev','market','league','club']){UI.setTab(t);const d=[...document.querySelectorAll('.club *')].find(e=>/^\d{4}\.\d{2}\.\d{2}$/.test(e.textContent.trim())&&!e.children.length);if(!d)continue;out.push({th,t,c:cr(getComputedStyle(d).color,bgOf(d))});}}UI.setTheme('ea');return out;});
    const low=r.filter(x=>x.c<4.5);r.length>=6&&!low.length?ok(`위 날짜 글자: ${r.length}개 화면(어두운·밝은 테마) 대비 최소 ${Math.min(...r.map(x=>x.c)).toFixed(1)}`):bad('날짜 '+JSON.stringify(low.length?low:r));}
  // 3. 미션 보상이 미리 보임
  {const r=await p.evaluate(()=>{UI.setTab('home');const m=document.querySelector('.misl .mrw');return m&&m.textContent.trim();});
    r&&/개당 \+/.test(r)?ok(`오늘의 미션 옆 보상 「${r}」`):bad('미션 보상 '+r);}
  // 4. 중계: 수비수 9명 이름 · 공수교대 → 「직접 지휘」는 멈춤 → 다음에 눌러야 첫 타자 · 해설 상황 문구는 오늘 기록과 같음 · 땅볼 때 1루 주자 그대로 두지 않음
  {const r=await p.evaluate(()=>{let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}UI.set('stepMode','pa');const S=SL.state();const lg=S.liveGame;const out={names:null,inter:[],ctxBad:[],ctxN:0,goBad:[],goN:0,fcN:0};
      const fsNames=()=>{const fs=1-lg.half;const ids=new Set((lg.lineup[fs]||[]).filter(id=>lg.pos[fs][id]&&lg.pos[fs][id]!=='DH').concat([lg.pitcher[fs]]));const want=[...ids].map(id=>{const n=S.players[id].name.split(' ').filter(Boolean);return n[n.length-1];});const got=[...document.querySelectorAll('.fsv text.fnm')].map(t=>t.textContent);return {want:want.length,got:got.length,miss:want.filter(w=>!got.includes(w))};};
      out.names=fsNames();
      for(let i=0;i<400&&!lg.done;i++){if(document.querySelector('.cmint')){const n0=lg.log.length,o0=lg.outs;const btn=[...document.querySelectorAll('.cmpick button')].find(x=>/직접 지휘/.test(x.textContent));btn.click();const ban=(document.querySelector('.cmres.hstart')||{}).innerText||'';const n1=lg.log.length;UI.step('pa');out.inter.push({same:n1===n0,outs:o0,ban:/회(초|말) · .+ 공격/.test(ban),then:lg.log.length>n1});continue;}
        UI.step('pa');const fx=lg.fx;const t=(document.querySelector('.cmres')||{}).innerText||'';const lp=[...lg.log].reverse().find(l=>l.pid!=null&&l.type!=='n');
        const m=t.match(/오늘 (\d+)타수 (\d+)안타/);if(m&&lp){out.ctxN++;const bx=lg.box[lp.pid]||{};if(+m[1]!==bx.ab||+m[2]!==bx.h)out.ctxBad.push(t);}
        const m2=t.match(/(\S+), 오늘 (\d+)번째 삼진/);if(m2&&lp&&lp.pit!=null){out.ctxN++;if((lg.box[lp.pit]||{}).pSO!==+m2[2])out.ctxBad.push(t);}
        if(fx&&fx.t==='go'&&fx.r0&&fx.r0[0]!=null&&fx.o1<3){out.goN++;if(fx.fc){out.fcN++;if(fx.r1[0]!==fx.b)out.goBad.push(fx);}else if(fx.r1[0]===fx.r0[0])out.goBad.push(fx);}
        if(fx&&fx.t==='1b'&&fx.inf&&fx.r0&&fx.r0[0]!=null&&fx.r1[2]===fx.r0[0])out.goBad.push(fx);}
      return out;});
    r.names&&!r.names.miss.length&&r.names.got>=9?ok(`수비수 ${r.names.got}명: 포지션 글자 대신 선수 이름(밑에 작게 포지션)`):bad('수비 이름 '+JSON.stringify(r.names));
    r.inter.length>=1&&r.inter.every(x=>x.same&&x.ban&&x.then)?ok(`공수교대 ${r.inter.length}번: 「직접 지휘」 → 경기 진행 없이 「N회초/말 · 공격」 화면에서 멈춤 → 다음에 누르면 첫 타자`):bad('공수교대 '+JSON.stringify(r.inter));
    !r.ctxBad.length?ok(`해설 상황 문구 ${r.ctxN}번 — 모두 오늘 기록(타수·안타·삼진)과 같음`):bad('해설 '+JSON.stringify(r.ctxBad.slice(0,3)));
    !r.goBad.length?ok(`땅볼 ${r.goN}번(1루 주자 있을 때): 주자 2루 진루 또는 2루 포스 아웃(야수 선택 ${r.fcN}번) — 1루에 그대로 남은 경우 0 · 내야안타 1루→3루 0`):bad('주자 '+JSON.stringify(r.goBad.slice(0,2)));}
  // 5. 난이도: 어려움은 트레이드 기준 +8%p, 쉬움 −8%p · 예전 저장(난이도 없음) = 보통
  {const r=await p.evaluate(()=>{const S=SL.state();if(S.liveGame){UI.set('stepMode','game');UI.step('game');UI.endGame&&UI.endGame();UI.closeModal();}const ut=SL.userTeam();const t=SL.krTeams().find(x=>!x.isUser);const give=[ut.roster[ut.roster.length-1]],get=[t.roster[t.roster.length-1]];const pct=d=>{S.diff=d;return SL.tradeEval(t.id,give,get,0).needPct;};const n=pct('normal'),h=pct('hard'),e=pct('easy');delete S.diff;const z=SL.diffNow();S.diff='normal';return {n,h,e,z};});
    r.h-r.n===8&&r.n-r.e===8&&r.z==='normal'?ok(`난이도: 트레이드 응하는 기준 쉬움 ${r.e}% · 보통 ${r.n}% · 어려움 ${r.h}% · 예전 저장 = 보통`):bad('난이도 '+JSON.stringify(r));}
  // 6. 새 게임 화면에 난이도 고르기
  {const q=await b.newPage({viewport:{width:390,height:844}});await q.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await q.waitForTimeout(300);
    const r=await q.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);const bs=[...document.querySelectorAll('.dfsel:not(.rosel) button')].map(x=>x.textContent);[...document.querySelectorAll('.dfsel:not(.rosel) button')].find(x=>x.textContent==='어려움').click();UI.newGame();return {bs,d:SL.state().diff};});await q.close();
    r.bs.join()==='쉬움,보통,어려움'&&r.d==='hard'?ok('새 게임: 「난이도 쉬움 · 보통 · 어려움」 → 어려움으로 시작하면 저장에 남음'):bad('새 게임 난이도 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v94 검사 실패 ${fails}건`:'v94 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

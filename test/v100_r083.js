// v100 (R083 묶음 2): 성격 능력치(리더십·성실성·멘탈) · 주장 · 라커룸 · 멘토 · 선수단에 한마디 · 기자 질문 · 경기 준비 훈련
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:144,league:'KR'});SL.state().tutorialDone=true;UI.closeModal();});
  // 1. 성격: 같은 선수는 늘 같은 값 · 범위 15~95 · 특성과 맞음(성실 → 성실성↑, 리더 → 리더십↑, 유리멘탈 → 멘탈↓) · 리그 평균은 중간
  {const r=await p.evaluate(()=>{const S=SL.state();const ps=Object.values(S.players);const a=ps.map(q=>JSON.stringify(SL.perOf(q)));for(const q of ps)q._per=null;const b2=ps.map(q=>JSON.stringify(SL.perOf(q)));const same=a.every((x,i)=>x===b2[i]);
      const avg=(f,k)=>{const L=ps.filter(f);return L.length?L.reduce((s,q)=>s+SL.perOf(q)[k],0)/L.length:null;};const all=k=>avg(()=>true,k);const inR=ps.every(q=>['ld','wk','mt'].every(k=>SL.perOf(q)[k]>=15&&SL.perOf(q)[k]<=95));
      return {same,inR,wk:[avg(q=>q.traits.includes('성실'),'wk'),all('wk')],ld:[avg(q=>q.traits.includes('리더'),'ld'),all('ld')],mt:[avg(q=>q.traits.includes('유리멘탈'),'mt'),all('mt')]};});
    r.same&&r.inR&&r.wk[0]>r.wk[1]+12&&r.ld[0]>r.ld[1]+12&&r.mt[0]<r.mt[1]-10&&Math.abs(r.ld[1]-52)<6&&Math.abs(r.wk[1]-55)<4&&Math.abs(r.mt[1]-50)<4?ok(`성격: 다시 계산해도 같음 · 15~95 · 평균 리더십 ${r.ld[1].toFixed(0)}·성실성 ${r.wk[1].toFixed(0)}·멘탈 ${r.mt[1].toFixed(0)} · 「성실」 ${r.wk[0].toFixed(0)} · 「리더」 ${r.ld[0].toFixed(0)} · 「유리멘탈」 멘탈 ${r.mt[0].toFixed(0)}`):bad('성격 '+JSON.stringify(r));}
  // 2. 주장: 모든 국내 구단에 자국 선수 주장 · 바꾸면 새 주장 +5 · 전 주장 −6 · 소식
  {const r=await p.evaluate(()=>{const S=SL.state();const caps=SL.krTeams().map(t=>{const L=SL.lockerOf(t);return S.players[L.cap];});const ut=SL.userTeam();const L=SL.lockerOf(ut);const old=S.players[L.cap];const c=SL.captainCands().find(x=>x.pid!==L.cap);const np=S.players[c.pid];const o0=old.morale,n0=np.morale;const e=SL.setCaptain(c.pid);
      return {all:caps.every(q=>q&&q.nat==='KR'),e,old:old.morale-o0,neu:np.morale-n0,cap:ut.captain===c.pid,nw:/새 주장/.test(S.news[0].text)};});
    r.all&&!r.e&&r.old===-6&&r.neu===5&&r.cap&&r.nw?ok('주장: 국내 10개 구단 모두 자국 선수 주장 · 바꾸면 새 주장 사기 +5 · 전 주장 −6 · 소식'):bad('주장 '+JSON.stringify(r));}
  // 3. 라커룸: 한 주 지나면 사기가 기준 쪽으로 8% · 면담 대기 선수는 끌어올리지 않음
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const ids=ut.roster.filter(id=>id!==ut.captain);const a=S.players[ids[0]],g=S.players[ids[1]];a.morale=30;g.morale=30;S.grievances=(S.grievances||[]).concat([{pid:g.id,s:S.season,on:0,n:10,exp:S.clock+99}]);const base=SL.lockerOf(ut).base;
      let k=0;const d0=S.day;while(S.day<d0+8&&k++<12){UI.autoDays(1);UI.closeModal();}const exp=30+(base-30)*0.08;return {a:a.morale,exp,g:g.morale,base};});
    r.a>30&&r.a<=r.exp+3&&r.g<=30?ok(`라커룸: 사기 30인 선수 → 한 주 뒤 ${r.a} (기준 ${r.base} 쪽으로) · 면담 대기 선수는 그대로 ${r.g}`):bad('라커룸 '+JSON.stringify(r));}
  // 4. 멘토: 조건 검사 · 짝 지으면 후배 성장 요인에 「멘토 ○○」
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const C=SL.mentorCands();const m=C.m.find(id=>C.y.some(y=>SL.isPitcher(S.players[y])===SL.isPitcher(S.players[id])));const y=C.y.find(y=>SL.isPitcher(S.players[y])===SL.isPitcher(S.players[m]));
      const wrong=C.y.find(z=>SL.isPitcher(S.players[z])!==SL.isPitcher(S.players[m]));const e1=wrong!=null?SL.setMentor(m,wrong):'x';const e0=SL.setMentor(m,y);const d0=S.day;let k=0;while(S.day<d0+8&&k++<12){UI.autoDays(1);UI.closeModal();}const L=(S.players[y].log||[])[0];
      return {e1:!!e1,e0,fac:L&&L.f?L.f.filter(x=>/멘토/.test(x)):[],ld:SL.perOf(S.players[m]).ld};});
    r.e1&&!r.e0&&(r.fac.length===1||r.ld<=50)?ok(`멘토: 투수-타자 짝은 거절 · 짝 지은 뒤 후배 성장 요인 「${r.fac[0]||'(리더십 50 이하라 보너스 없음)'}」`):bad('멘토 '+JSON.stringify(r));}
  // 5. 경기 뒤: 결과 창에 「선수단에 한마디」 → 그날 뛴 선수 사기 변화, 한 번만 · 경기 준비 훈련(타격) = 우리 타자 능력 +1.5, 3경기 뒤 끝
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();let k=0;while(!SL.userGameToday()&&k++<5){UI.autoDays(1);UI.closeModal();}SL.setPrep('bat');UI.setTab('home');UI.startGame();const lg=S.liveGame;const bt=S.players[ut.lineup[0]];const pp=S.players[ut.rotation[0]];
      const dBat=SL.effAttr(bt,'contact')-SL.effAttr(Object.assign({},bt,{teamId:-1}),'contact');const dPit=SL.effAttr(pp,'stuff')-SL.effAttr(Object.assign({},pp,{teamId:-1}),'stuff');UI.set('stepMode','game');UI.step('game');UI.endGame();UI.closeModal();UI.setTab('home');UI.sheet('result');
      const chips=[...document.querySelectorAll('#modal .talk button')].map(x=>x.textContent);const L=SL.lastUG();const before=L.ps.map(id=>S.players[id].morale);const r1=SL.teamTalk('praise');const after=L.ps.map(id=>S.players[id].morale);const ch=after.filter((v,i)=>v!==before[i]).length;const r2=SL.teamTalk('calm');UI.closeModal();
      const left1=S.prep&&S.prep.left;for(let i=0;i<6&&S.prep;i++){k=0;while(!SL.userGameToday()&&k++<5){UI.autoDays(1);UI.closeModal();}UI.autoDays(1);UI.closeModal();}
      return {dBat:Math.round(dBat*10)/10,dPit:Math.round(dPit*10)/10,chips,ok1:r1.ok,ch,ps:L.ps.length,ok2:r2.ok,left1,end:S.prep};});
    r.dBat===1.5&&r.dPit===0&&r.chips.slice(0,3).join()==='칭찬,분발 촉구,차분히'&&r.ok1&&r.ch===r.ps&&!r.ok2&&r.left1===2&&r.end===null?ok(`경기 준비 훈련(타격): 우리 타자 컨택 +1.5, 투수는 그대로 · 한 경기 뒤 2경기 남음 → 3경기 뒤 끝 · 결과 창 「선수단에 한마디」 칭찬 → 뛴 ${r.ps}명 사기 변화, 두 번째는 거절`):bad('한마디·훈련 '+JSON.stringify(r));}
  // 6. 기자 질문: 3연승·3연패 뒤에만 질문 · 「팬들 덕분입니다」 → 구단 인기 +1
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();let checked=0,badQ=0,got=null;for(let i=0;i<40;i++){if(!SL.userGameToday()){UI.autoDays(1);UI.closeModal();continue;}UI.autoDays(1);UI.closeModal();const L=SL.lastUG();if(!L)continue;
        const res=S.schedule.filter(g=>g.res&&!g.post&&(g.home===ut.id||g.away===ut.id)).sort((a,b)=>b.day-a.day);let st=0,w0=null;for(const g of res){const m=g.home===ut.id?g.res.hs:g.res.as,o=g.home===ut.id?g.res.as:g.res.hs;if(m===o)break;const w=m>o;if(w0===null)w0=w;if(w!==w0)break;st++;}
        checked++;const want=st>=3;const has=!!(L.press&&L.press.k!=='hero');if(L.press&&L.press.k==='hero')continue;if(want!==has)badQ++;if(has&&!got){const rep0=ut.rep;const a=SL.pressAnswer('fans');got={rep:ut.rep-rep0,ok:a.ok,again:SL.pressAnswer('trust').ok,t:L.press.t};}}
      return {checked,badQ,got};});
    r.checked>=20&&!r.badQ&&(!r.got||(r.got.rep===1&&r.got.ok&&!r.got.again))?ok(`기자 질문: 우리 경기 ${r.checked}번 중 3연승·3연패 뒤에만 질문${r.got?` (${r.got.t}) → 「팬들 덕분입니다」 구단 인기 +1 · 한 번만`:''}`):bad('기자 '+JSON.stringify(r));}
  // 7. 화면: 선수단 → 라커룸(주장·리더·불만·약속·멘토·성격 표) · 선수 능력 탭 「성격」 · 경기 전 준비 「경기 준비 훈련」
  {const r=await p.evaluate(()=>{const ut=SL.userTeam();UI.go('roster','locker');const t=document.querySelector('.content').textContent;   /* v143: 휴대폰은 쪽으로 나뉨 — 다른 쪽 칸도 문서에는 있음 */const rows=[...document.querySelectorAll('.card')].find(c=>/선수 성격/.test(c.innerText)).querySelectorAll('tbody tr').length;
      UI.openPlayer(ut.roster[0]);UI.set&&0;const pv=ui=>0;const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='능력');btn&&btn.click();const per=/성격/.test(document.body.innerText)&&/리더십/.test(document.body.innerText);UI.back&&UI.back();
      const g=SL.userGameToday()||SL.state().schedule.find(x=>x.day>=SL.state().day&&(x.home===ut.id||x.away===ut.id));UI.prematch(SL.state().schedule.indexOf(g));const pm=/경기 준비 훈련/.test(document.querySelector('#modal').innerText);UI.closeModal();
      return {cap:/주장/.test(t)&&/리더/.test(t)&&/멘토/.test(t)&&/지금 지키는 약속/.test(t),rows,n:ut.roster.length,per,pm};});
    r.cap&&r.rows===Math.min(12,r.n)&&r.per&&r.pm?ok(`화면: 선수단 → 라커룸(주장·리더·불만·약속·멘토·성격 표 ${r.rows}명) · 선수 능력 탭 「성격」 · 경기 전 준비에 「경기 준비 훈련」`):bad('화면 '+JSON.stringify(r));}
  // 8. 예전 저장(v29) 불러오기: 성격·주장 자동으로 채워지고 시즌 진행
  {const q=await b.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url);await q.waitForTimeout(300);const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');
    const r=await q.evaluate(j=>{SL.load(j);const S=SL.state();const ut=SL.userTeam();const L=SL.lockerOf(ut);for(let i=0;i<8;i++)SL.playDayAuto();return {cap:L.cap!=null,per:Object.values(S.players).slice(0,50).every(p=>SL.perOf(p).ld>0)};},j);await q.close();
    r.cap&&r.per?ok('예전 저장(v29): 주장·성격 자동으로 채워지고 진행됨'):bad('예전 저장 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v100 검사 실패 ${fails}건`:'v100 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

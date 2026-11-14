// v113 (R095): 계약 비용 이름 일치(FA 영입 비용이 조건표에도) · 협상 화면 중복 줄이고 취소/제안 아래 고정 · 진행 방식 고르면 창 닫힘 ·
//              종합·포지션으로 용어 통일 · 상황별 결산 문장(우승이면 우승부터) · 시즌 끝나면 「이 페이스면」 없음 · 「선택 업무」 · 짧은 문구표
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');const src=fs.readFileSync(file,'utf8');
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. 문구표: 예전 문장이 화면 코드에 없음 (선수 대사는 그대로 문장)
  {const old=['이 페이스면 내년 지원금','감독 구하는 구단','성장 점검 전','사사구 3개 이상 골라내기','사사구 3개 이하로 막기','연봉 = 요구액의 9','연봉 = 요구액의 105','연봉 (연간)','구단 제시안 (이전)','선수 요청안 (회신)','남은 제시 $','영입 완료와 배치','계약 완료 — 등록·지출 끝','어디에 기용할까요?','아직 크게 변한 능력이 없습니다','1루나 2루에 주자가 있어야','득점권(2·3루)에 주자가 있을 때','포스트시즌 앞에서 멈췄습니다','광고판 빈 자리','연패\'} 중입니다',"h:'오버'","h:'위치'"].filter(s=>src.includes(s));
    const nw=['예상 지원금','채용 ${b.list.length}곳 · 평판','얻은 사사구 3개 이상','내준 사사구 3개 이하','요구액 95%','요구액 105%','회 남음','능력 변화 없음','1·2루 주자 필요','득점권 주자 필요','정규시즌 종료 · 가을야구 대기','광고판 공석','선택 업무'].filter(s=>!src.includes(s));
    !old.length&&!nw.length?ok('문구표 20줄 반영 (예전 문장 0 · 새 문구 모두 있음)'):bad('문구 '+JSON.stringify({old,nw}));}

  // 2. 협상 화면: 조건표는 「내 제안」 한 칸(선수 요구는 위 숫자 칸에만) · FA 영입 비용 줄 · 남은 횟수는 위 한 번 · 취소/제안하기가 첫 화면 아래에 고정
  {const r=await p.evaluate(()=>{SL.newGame(4097,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const fa=S.fa.map(id=>S.players[id]).filter(q=>q&&!SL.isFgn(q)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];UI.openTable(fa.id);
      const th=[...document.querySelectorAll('.negt thead th')].map(x=>x.textContent.trim());const rows=[...document.querySelectorAll('.negt tbody tr')].map(tr=>tr.querySelectorAll('td').length);const fee=[...document.querySelectorAll('.negt tbody tr')].find(tr=>/FA 영입 비용/.test(tr.textContent));
      const c=SL.negCost(fa.id,{salary:0,years:1,bonus:0});const left=(document.body.innerText.match(/회 남음/g)||[]).length;const g=document.querySelector('.gobar');const gb=g.getBoundingClientRect();const bt=[...g.querySelectorAll('button')].map(x=>x.textContent);
      const t=document.querySelector('.content').innerText;return {th,rows,fee:fee?fee.innerText.replace(/\s+/g,' '):'',sf:c.signFee,left,gb:{top:Math.round(gb.top),bottom:Math.round(gb.bottom)},ih:innerHeight,bt,triple:/FA 계약 협상/.test(t)};});
    r.th.join(',')==='계약 조건,내 제안'&&r.rows.every(n=>n===2)&&r.sf>0&&r.fee.includes('FA 영입 비용')&&r.left===1&&r.gb.bottom<=r.ih&&r.gb.top>r.ih/2&&r.bt.join()==='취소,제안하기'&&!r.triple
      ?ok(`협상: 조건표 ${r.th.join('|')} · 「${r.fee}」 · 「회 남음」 ${r.left}번 · [취소][제안하기] 화면 아래 고정(${r.gb.top}~${r.gb.bottom}/${r.ih})`):bad('협상 '+JSON.stringify(r));}

  // 3. 진행 방식: 고르면 창이 닫힘 (N회까지 자동만 이닝을 고르도록 열어 둠)
  {const r=await p.evaluate(()=>{UI.back();UI.setTab('home');UI.closeModal();UI.startGame();UI.cmSheet('mode');const bs=[...document.querySelectorAll('#modal .cmmodes button')];const one=bs.find(x=>!/회까지/.test(x.textContent));one.click();const closed=!document.querySelector('#modal');
      UI.cmSheet('mode');const to=[...document.querySelectorAll('#modal .cmmodes button')].find(x=>/회까지/.test(x.textContent));to.click();const open=!!document.querySelector('#modal');UI.closeModal();return {closed,open,mode:ui_=1};});
    r.closed&&r.open?ok('진행 방식: 고르면 바로 닫힘 · 「N회까지」는 이닝 고르게 열림'):bad('진행 방식 '+JSON.stringify(r));}

  // 4. 용어: 선수 목록·FA·해외·재계약 표 머리 「종합」 · 「포지션」 (오버·능력·위치 없음)
  {const r=await p.evaluate(()=>{const S=SL.state();if(S.liveGame){UI.step('game');UI.endGame();UI.closeModal();}const out={};const heads=()=>[...document.querySelectorAll('thead th')].map(x=>x.textContent.replace(/[⇅▴▾]/g,'').trim());
      UI.go('roster','list');UI.setPref&&UI.setPref('listMode','table');out.list=heads();UI.go('market','fa');out.fa=heads();UI.go('market','fgn');out.fgn=heads();return out;});
    const all=[].concat(r.list,r.fa,r.fgn);!all.some(h=>/^(오버|능력|능력치|위치)$/.test(h))&&all.includes('종합')?ok(`표 머리: 종합 · 포지션 (선수 ${r.list.length}칸 · FA · 해외)`):bad('용어 '+JSON.stringify(r));}

  // 5. 결산: 우승 시즌이면 첫 줄 「○○, 첫 시즌 한국시리즈 우승」 · 시즌이 끝나면 「예상 지원금」 없음 · 할 일이 없으면 타일 「할 일 없음」
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;S.settings.stopOnOffer=false;UI.setTab('home');UI.closeModal();const tile0=[...document.querySelectorAll('.htile,.tile,.hcard,button')].map(x=>x.innerText).find(t=>/^.{0,3}할 일/.test(t))||'';
      let k=0;while(S.phase==='season'&&!S.post&&k++<20){UI.autoDays(999);UI.closeModal();}UI.setTab('home');const post=document.body.innerText;
      while(S.phase==='season'&&k++<40){UI.autoDays(999);UI.closeModal();}const R=S.lastRecap;R.ps='champ';UI.seasonRecap();const t=document.querySelector('#modal .ctitle').innerText;R.ps=null;UI.seasonRecap();const t2=document.querySelector('#modal .ctitle').innerText;UI.closeModal();
      return {tile0,pace:/예상 지원금|이 페이스면/.test(post),t,t2,city:SL.userTeam().name.split(' ')[0]};});
    new RegExp(`^${r.city}, 첫 시즌 한국시리즈 우승`).test(r.t)&&/위/.test(r.t2)&&!/가을야구까지|선수들도 자랐습니다/.test(r.t+r.t2)&&!r.pace
      ?ok(`결산 첫 줄: 우승이면 「${r.t.split('\n')[0]}」 · 아니면 「${r.t2.split('\n')[0]}」 · 정규시즌 뒤 「예상 지원금」 없음`):bad('결산 '+JSON.stringify(r));}

  // 6. 겨울 「선택 업무」는 개수 없이 (아래 줄이 종류별 개수) · 예전 저장 · 버전
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.closeModal();SL.testCmd('endSeason');UI.closeModal();UI.setTab('home');const t=document.querySelector('.content').innerText;
      SL.load(s);UI.setTab('home');UI.closeModal();return {sel:(t.match(/선택 업무[^\n]*/)||[''])[0],cnt:/선택 업무 \d+건/.test(t),sub:(t.match(/스폰서 제안 \d+건[^\n]*/)||[''])[0],ver:SL.GAME_VER};},j);
    r.sel&&!r.cnt&&/^v1\d\d$/.test(r.ver)?ok(`겨울 「${r.sel}」 · 「${r.sub}」 · 예전 저장 정상 · ${r.ver}`):bad('겨울 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v113 검사 실패 ${fails}건`:'v113 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

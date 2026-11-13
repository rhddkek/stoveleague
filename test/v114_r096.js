// v114 (R096): 같은 정보 되풀이 줄이기 — 해외 보고서(평가 두 줄 · 관찰도 · 버튼 위로 · 대안 접힘) · 코치(＋ 코치 영입 · 공석 · 잔여 n년 · 만료 위로) ·
//              드래프트(한 줄 상태 · 예상 계약금 · 이번/남은 지명 자동) · 이적료 협상(협상 중단 · 재협상 가능 n회) · 재정·판매(가격이 보임)
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');const src=fs.readFileSync(file,'utf8');
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. 해외 보고서: 「초기 평가」 한 번 + 「1선발 후보 · 신뢰 낮음」 + 「강점 · 우려」 한 줄 · 종합 평가 문장 없음 · 키·몸무게 없음 · 관찰도 · 관찰·협상 단추가 첫 화면 안 · 대안 선수 접힘
  {const r=await p.evaluate(()=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.scoutReport(2705);const t=document.querySelector('.pv').innerText;const bt=document.querySelector('.mkbtn3').getBoundingClientRect();
      const alt=[...document.querySelectorAll('details.more summary')].find(x=>/대안/.test(x.textContent));return {t,top:Math.round(bt.bottom),ih:innerHeight,alt:alt?alt.innerText:'',focus:document.querySelector('.mkbtn3 button').innerText};});
    /초기 평가/.test(r.t)&&/1선발 후보\s*신뢰 낮음/.test(r.t)&&/강점 \S+ · 우려 \S+/.test(r.t)&&!/종합 평가|자원으로 적합|신장|체중|지식|현 소속|쇼트리스트|초기 추정/.test(r.t)&&/관찰도 12%/.test(r.t)&&/우리 투수와 비교/.test(r.t)&&r.top<=r.ih&&/대안 선수/.test(r.alt)&&/관찰도 12% → \d+% 이상/.test(r.focus)&&/2주/.test(r.focus)
      ?ok(`보고서: 「초기 평가 · 1선발 후보 · 신뢰 낮음 / 강점 · 우려」 · 관찰·협상 단추 첫 화면 안(아래 끝 ${r.top}/${r.ih}) · 「${r.focus.replace(/\n/g,' ')}」 · 「${r.alt}」 접힘`):bad('보고서 '+JSON.stringify(r).slice(0,700));}

  // 2. 코치: ＋ 코치 영입 · 공석 n · 잔여 n년 · 조작 설명 문단 없음 · 감독실 「재계약」 단추로 오면 만료 코치가 맨 위 · 스카우트 효과 「정확도 · 관찰 n명/주」
  {const r=await p.evaluate(()=>{UI.back();SL.testCmd('endSeason');UI.closeModal();UI.setTab('home');const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='재계약'&&/staffExp/.test(x.getAttribute('onclick')||''));const ex=(SL.userTeam().staff||[]).filter(c=>c.years<=0).length;
      if(btn)btn.click();const t=document.querySelector('.content').innerText;const first=(document.querySelector('.content .cod .coh b')||{}).textContent||'';return {btn:!!btn,ex,t:t.slice(0,1500),first};});
    r.btn&&(r.ex===0||/^계약 만료 \d/.test(r.first))&&/코치 영입/.test(r.t)&&/공석 \d/.test(r.t)&&/잔여 \d년/.test(r.t)&&!/EMPTY|칸을 누르면|년 남음|— 영입 ›|판별 정확도/.test(r.t)&&/정확도 [+-]\d+%p · 관찰 \d+명\/주/.test(r.t)&&/동일 부서 추가 고용 시 효과 감소/.test(r.t)
      ?ok(`코치: 재계약 단추 → 맨 위 「${r.first}」 · 「＋ 코치 영입 · 공석」 · 「잔여 n년」 · 「정확도 … · 관찰 n명/주」 · 규칙은 「동일 부서 추가 고용 시 효과 감소 ⓘ」`):bad('코치 '+JSON.stringify(r).slice(0,900));}

  // 3. 드래프트: 상태 한 줄 「우리 지명 · 1R n순위」 · 「예상 계약금」 · 관심 n · 이번/남은 지명 자동 · 지명 창 「종합 n · 잠재」 · 훈련 단추에만 ★
  {const r=await p.evaluate(()=>{const S=SL.state();let k=0;while(!S.draft&&k++<6)SL.advanceWeek();UI.closeModal();UI.go('dev','draft');const t=document.querySelector('.content').innerText;const bs=[...document.querySelectorAll('.content button')].map(x=>x.textContent.trim());
      UI.draftAutoOne();const m=document.querySelector('#modal');const mt=m?m.innerText:'';const star=m?[...m.querySelectorAll('button')].filter(x=>/★/.test(x.textContent)).length:0;UI.closeModal();return {t:t.slice(0,1500),bs,mt:mt.slice(0,500),star};});
    /우리 지명 · 1R \d+순위/.test(r.t)&&!/내 차례|우리 차례|사인보너스|계약 조건 \(예상\)/.test(r.t)&&/예상 계약금/.test(r.t)&&r.bs.includes('이번 지명 자동')&&r.bs.some(x=>/^남은 지명 자동/.test(x))&&r.bs.some(x=>/^관심 \d/.test(x))&&/종합 \d+ · 잠재/.test(r.mt)&&!/지금 \d+ · 잠재|추천 ★/.test(r.mt)&&r.star===1
      ?ok('드래프트: 「우리 지명 · 1R n순위」 한 줄 · 「예상 계약금」 · 「관심 n」 · 「이번 지명 자동 / 남은 지명 자동」 · 지명 창 「종합 n · 잠재」 · ★는 추천 훈련 단추에만'):bad('드래프트 '+JSON.stringify(r).slice(0,900));}

  // 4. 판매: 줄마다 가격(가치)이 끝까지 보임 · 「판매 후보」 · 「판매 등록」 · 재정 문구
  {const r=await p.evaluate(()=>{UI.go('market','list');const rows=[...document.querySelectorAll('.prow.sq')].slice(0,6);const vis=rows.map(rw=>{const el=[...rw.querySelectorAll('.rt .muted')].find(x=>/가치/.test(x.textContent));if(!el)return false;return el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().right<=innerWidth;});
      const t=document.querySelector('.content').innerText;UI.go('club','fin');let f='';const nPg=document.querySelectorAll('.pgtabs button').length||1;for(let i=0;i<nPg;i++){const bt=document.querySelectorAll('.pgtabs button')[i];if(bt)bt.click();f+=document.querySelector('.content').innerText+'\n';const d=[...document.querySelectorAll('.content details')];d.forEach(x=>x.open=true);f+=document.querySelector('.content').innerText;}return {vis,t:t.slice(0,400),ft:[/연봉 예산 = 구단 한도 \/ 샐러리캡 = 리그 한도/.test(f),/현재 계약 기준/.test(f),/운영비 세부/.test(f),/서로 다른 제한|지금 계약 기준/.test(f)],f:/연봉 예산 = 구단 한도 \/ 샐러리캡 = 리그 한도/.test(f)&&/현재 계약 기준/.test(f)&&/운영비 세부/.test(f)&&!/서로 다른 제한|지금 계약 기준/.test(f)};});
    r.vis.length>=3&&r.vis.every(Boolean)&&/판매 후보/.test(r.t)&&/판매 등록/.test(r.t)&&!/등록할 선수 고르기/.test(r.t)&&r.f?ok(`판매 후보 ${r.vis.length}줄 모두 가치가 잘리지 않음 · 「판매 등록」 · 재정 「연봉 예산 = 구단 한도 / 샐러리캡 = 리그 한도」 · 「운영비 세부」 접힘`):bad('판매·재정 '+JSON.stringify(r));}

  // 5. 이적료 협상 문구 · 중단하면 실제 남은 재협상 횟수
  {const old=['이적 합의금 · ','이적료를 내면 남는 자금','그 뒤 개인 협상 (','이적료 제안하기','자리에서 일어나기','이번 시즌 남은 기회가 있으면'].filter(s=>src.includes(s));
    const r=await p.evaluate(()=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.openTable(2705);const t=document.querySelector('.pv').innerText;const neg=S.market.negs.find(n=>n.pid===2705);UI.setF('fee',Math.round(neg.ask*0.86/100)*100);document.querySelector('#tf_fee').remove();UI.tableSubmit();const t2=document.querySelector('.pv').innerText;UI.leaveTable();const m=(document.querySelector('.pv')||{}).innerText||'';return {t:t.slice(0,900),t2:(t2.match(/취소 \(협상 중단\)/)||[''])[0],m:(m.match(/협상 중단 · [^\n]+/)||[''])[0]};});   /* v137: 제안하기 전엔 「닫기 (조건만 보기)」 — 한 번 제안한 뒤 나가야 기회를 씀 */
    !old.length&&/요구 이적료 약/.test(r.t)&&/지급 후 현금/.test(r.t)&&/다음: 개인 협상 · 연봉·계약금 별도/.test(r.t)&&/이적료 제안/.test(r.t)&&/닫기 \(조건만 보기\)/.test(r.t)&&r.t2&&r.m==='협상 중단 · 재협상 가능 1회'?ok(`이적료 협상: 「요구 이적료 약 …」「지급 후 현금」「다음: 개인 협상 · 연봉·계약금 별도」 [닫기 (조건만 보기)] → 한 번 제안 뒤 [취소 (협상 중단)] → 「${r.m}」`):bad('이적료 협상 '+JSON.stringify({old,r}).slice(0,900));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v114 검사 실패 ${fails}건`:'v114 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

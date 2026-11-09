// v86 (R070): 경기 화면 연출 — 위에서 내려다본 구장(수비수 9명) · 타구 길 · 주자 달리기 · 스트라이크 존 · 결과 띠
// 그림이 기록과 어긋나지 않는지(타구 방향 = 중계 문구, 주자 수 = 실제 베이스, 존의 공 수 = 실제 투구 수) 확인
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{UI.pickLg('KR');UI.pickTeam(3);UI.newGame();SL.state().tutorialDone=true;UI.closeModal();let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}});
  // 한 경기를 한 타자씩 진행하며 매 타석 그림 점검
  const R=await p.evaluate(()=>{UI.set('stepMode','pa');const out={n:0,fld:0,runOk:0,runBad:[],dir:0,dirBad:[],zoneOk:0,zoneBad:[],hr:0,hrBad:0,k:0,trail:0,inplay:0,fit:0};
    let g=0;while(g++<400){const lg=SL.state().liveGame;if(!lg||lg.done)break;if(document.querySelector('.cmint')){document.querySelectorAll('.cmpick button')[0].click();continue;}
      const pc0=Object.assign({},lg.pc);document.querySelector('.cmgo .gold').click();if(document.querySelector('.cmint')||lg.done)continue;out.n++;
      if(document.querySelectorAll('.cmf2 .fsv .fdf').length===9)out.fld++;
      const F=lg.fx;const fresh=F&&F.n===lg.evN;
      // 주자: 같은 반 이닝이면 화면 이름표 수 = 실제 베이스 주자 수
      if(F&&F.half===lg.half){const tags=document.querySelectorAll('.ftag').length;const real=lg.bases.filter(Boolean).length;if(tags===real)out.runOk++;else out.runBad.push(tags+'/'+real);}
      if(!fresh)continue;
      // 존: 직전 타석 공 수 = 그 타석 투수 투구 수 증가분
      {const thrown=Object.keys(lg.pc).reduce((s,k)=>s+(lg.pc[k]-(pc0[k]||0)),0);const z=document.querySelectorAll('.fzone .zp').length;if(['1b','2b','3b','hr','so','walk','go','fo','dp','sf','e'].includes(F.t)){if(z===thrown)out.zoneOk++;else out.zoneBad.push(F.t+':'+z+'/'+thrown);}}
      // 타구 방향: 중계 문구의 좌·우와 공이 떨어진 곳(왼쪽 x<180 / 오른쪽 x>180)이 같은지
      const L=[...lg.log].reverse().find(l=>['1b','2b','3b','hr','go','fo','dp','sf'].includes(l.type)&&l.half===F.half);const land=document.querySelector('.fsv .fland');
      if(['1b','2b','3b','hr','go','fo','dp','sf'].includes(F.t)){out.inplay++;if(document.querySelector('.fsv .ftrail'))out.trail++;
        if(land&&L){const x=+land.getAttribute('cx');const t=L.text;let want=0,at=1e9;[[/좌전|좌익|좌중간|좌측|3루수|3유간/,-1],[/우전|우익|우중간|우측|1루수|2루수|1·2루간/,1],[/유격수|중견수|중전|투수|가운데/,0]].forEach(([re,w])=>{const m=t.match(re);if(m&&m.index<at){at=m.index;want=w;}});
          if(want){out.dir++;if((want<0)!==(x<180))out.dirBad.push(t.slice(0,40)+' x='+x);}}}
      if(F.t==='hr'){out.hr++;if(!/HOME RUN/.test(document.querySelector('.fsv').textContent))out.hrBad++;}
      if(F.t==='so'&&/K/.test(document.querySelector('.fsv').textContent))out.k++;
      {const bar=document.querySelector('.cmbar');if(bar&&bar.getBoundingClientRect().bottom<=innerHeight+1)out.fit++;}}
    return out;});
  R.fld===R.n?ok(`구장 그림: ${R.n}타석 모두 수비수 9명(수비 팀 색)`):bad(`수비수 그림 ${R.fld}/${R.n}`);
  !R.runBad.length&&R.runOk>20?ok(`주자 이름표 수 = 실제 베이스 주자 수 (${R.runOk}번 확인)`):bad('주자 '+R.runBad.slice(0,5).join(','));
  !R.zoneBad.length&&R.zoneOk>20?ok(`스트라이크 존: 타석이 끝나면 「직전 타석」 공 수 = 실제 투구 수 (${R.zoneOk}타석)`):bad('존 '+R.zoneBad.slice(0,5).join(','));
  R.trail===R.inplay&&R.inplay>10?ok(`인플레이 타구 ${R.inplay}개 모두 공이 날아간 길 표시`):bad(`타구 길 ${R.trail}/${R.inplay}`);
  !R.dirBad.length&&R.dir>8?ok(`타구 방향 = 중계 문구 (좌전·우중간·3루수 땅볼 등 ${R.dir}개, 어긋남 없음)`):bad('방향 '+R.dirBad.slice(0,4).join(' | '));
  !R.hrBad?ok(`홈런 ${R.hr}개 — HOME RUN 표시${R.k?` · 삼진 K ${R.k}번`:''}`):bad('홈런 표시 '+R.hrBad);
  R.fit===R.n-0||R.fit>=R.n*0.95?ok(`390×844 한 화면: 하단 작전지시 줄까지 스크롤 없이 보임 (${R.fit}/${R.n})`):bad(`한 화면 ${R.fit}/${R.n}`);
  // 공 하나씩: 존의 공 수 = 이번 타석 볼+스트라이크(+파울) 진행 수, 볼 색 수 = 볼카운트 B
  {await p.evaluate(()=>{UI.endGame&&UI.endGame();UI.closeModal();let k=0;while(!SL.state().liveGame&&k++<10){UI.setTab('home');if(SL.userGameToday())UI.startGame();else UI.autoDays(1);}UI.set('stepMode','pitch');});
    const r=await p.evaluate(()=>{let okN=0,badL=[];for(let i=0;i<120;i++){const lg=SL.state().liveGame;if(!lg||lg.done)break;if(document.querySelector('.cmint')){document.querySelectorAll('.cmpick button')[0].click();continue;}document.querySelector('.cmgo .gold').click();if(document.querySelector('.cmint'))continue;
        if(lg.balls||lg.strikes){const z=[...document.querySelectorAll('.fzone .zp circle')];const balls=z.filter(c=>/94, 224, 143|#5ee08f/i.test(c.getAttribute('style'))).length;if(z.length===lg.pz.l.length&&lg.pz.pa===lg.paCount&&balls===lg.balls&&/투구 \d/.test(document.querySelector('.fzone small').textContent))okN++;else badL.push(`${z.length}/${lg.pz.l.length} B${balls}/${lg.balls}`);}}return {okN,badL};});
    !r.badL.length&&r.okN>15?ok(`공 하나씩: 존의 공 수·초록(볼) 수 = 볼카운트 (${r.okN}구 확인)`):bad('공 하나씩 존 '+r.badL.slice(0,5).join(','));}
  // 예전 저장 경기(연출 기록 없음)도 그대로 그려짐
  {const r=await p.evaluate(()=>{const lg=SL.state().liveGame;if(!lg)return 'no game';delete lg.fx;delete lg.pz;delete lg.evN;UI.set('stepMode','pa');const a=document.querySelectorAll('.cmf2 .fsv .fdf').length;for(let i=0;i<3&&!lg.fx;i++){if(document.querySelector('.cmint')){document.querySelectorAll('.cmpick button')[0].click();continue;}document.querySelector('.cmgo .gold')&&document.querySelector('.cmgo .gold').click();}return (a===9||document.querySelector('.cmint'))&&!!lg.fx?'ok':'fail '+a;});
    r==='ok'?ok('연출 기록이 없는 예전 저장 경기도 구장 그림 정상 · 다음 타석부터 연출 기록 생김'):bad('예전 경기 '+r);}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v86 검사 실패 ${fails}건`:'v86 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

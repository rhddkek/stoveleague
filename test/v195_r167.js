// v195 (R167): 겨울 감독실 — 노란 채움 하나(이번 주 마감이 있으면 「하나씩 처리」, 없으면 「다음 주」) · 딱지는 「이번 주 마감 n」 · 전력 진단 한 번 · 일정 띠 안 잘림 / 2차 드래프트 보호 명단 = 경계선만 먼저
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(()=>{UI.setSeed(24680);UI.pickLg('KR');UI.pickTeam(9);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();const S=SL.state();let n=0;while(S.phase==='season'&&n++<400){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}UI.closeModal();UI.setTab('home');});await p.waitForTimeout(300);await p.evaluate(()=>UI.closeModal());return p;};
  const look=p=>p.evaluate(()=>{UI.closeModal();UI.setTab('home');UI.closeModal();const S=SL.state();const a=document.querySelector('#app');const fill=e=>{if(!e)return false;const c=(getComputedStyle(e).backgroundColor.match(/[\d.]+/g)||[]).map(Number);return (c.length<4||c[3]>0.5)&&c[0]>200&&c[1]>150&&c[2]<140;};
    const ch=a.querySelector('.wchain'),go=a.querySelector('.gobar.wgo .mkgo'),on=a.querySelector('.stvline span.on');const must=SL.mustItems(S.week>=SL.BAL.OFFSEASON_WEEKS).length;
    return {wk:S.week,must,todo:+(a.querySelector('.tdcnt')||{}).textContent||0,chFill:fill(ch),goFill:fill(go),onFill:fill(on),pillFill:fill(a.querySelector('.whead .wmust')),bdg:(a.querySelector('.gobar.wgo .bdg')||{}).textContent||'',diag:[...a.querySelectorAll('button')].filter(x=>x.offsetParent&&x.textContent.trim()==='전력 진단').length,
      cut:[...a.querySelectorAll('.stvline span b')].filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent),names:[...a.querySelectorAll('.stvline span b')].map(x=>x.textContent).join('|'),h:document.documentElement.scrollHeight};});
  const next=p=>p.evaluate(()=>{const S=SL.state();if(SL.autoRun)SL.autoRun();if(SL.draftTurn&&SL.draftTurn())SL.draftAuto();SL.advanceWeek();UI.closeModal();return S.week;});
  const p=await mk(390,844);
  // 1. 1주차: 이번 주 마감 있음 → 「하나씩 처리」만 노랑
  {const r=await look(p);r.must>0&&r.chFill&&!r.goFill&&!r.onFill&&!r.pillFill&&r.bdg===`이번 주 마감 ${r.must}`&&r.diag<=1&&!r.cut.length&&r.h<=844*1.15?ok(`1주차(마감 ${r.must}건): 노랑 = 하나씩 처리 하나 · 다음 주 테두리 · 딱지 「${r.bdg}」 · 전력 진단 ${r.diag}곳 · 일정 띠 [${r.names}] 안 잘림`):bad('1주차 '+JSON.stringify(r));}
  // 2. 마감 없는 주(할 일은 남음): 「다음 주」만 노랑 · 딱지 없음
  {let r=null;for(let i=0;i<5;i++){await next(p);const x=await look(p);if(x.must===0&&x.todo>0){r=x;break;}}
    if(!r)ok('마감 없이 할 일만 남은 주 없음 — 건너뜀');else r.goFill&&!r.chFill&&!r.onFill&&r.bdg===''&&r.diag<=1?ok(`${r.wk}주차(마감 0 · 할 일 ${r.todo}): 노랑 = 다음 주 하나 · 하나씩 처리 테두리 · 딱지 없음`):bad('마감 없는 주 '+JSON.stringify(r));}
  // 3. 2차 드래프트 보호 명단(3주차)
  {const q=await mk(390,844);await next(q);await next(q);
    const r=await q.evaluate(()=>{const S=SL.state();const D=SL.sd();if(!D||D.phase!=='protect')return {no:1,wk:S.week};UI.setTab('home');UI.sdOpen();const a=document.querySelector('#app');const ut=SL.userTeam();const tot=ut.roster.concat(ut.dev||[]).map(id=>S.players[id]).filter(x=>SL.sdElig(x)).length;const B=SL.BAL.SD;
      const o={tot,prot:B.prot,rows:a.querySelectorAll('.prl .pr').length,onRows:a.querySelectorAll('.prl .pr.on').length,head:(a.querySelector('.sdh')||{}).innerText.replace(/\s+/g,' '),sec:[...a.querySelectorAll('.sdsec')].map(x=>x.textContent).join('|'),h:document.documentElement.scrollHeight,chars:a.innerText.replace(/\s+/g,'').length,rule0:!!a.querySelector('.sdrule')};
      a.querySelector('.sdrb').click();o.rule1=(document.querySelector('#app .sdrule')||{}).textContent||'';document.querySelector('#app .sdrb').click();
      const out=document.querySelector('#app .prl .pr:not(.on)');if(out){out.click();o.after=(document.querySelector('#app .sdh')||{}).innerText.replace(/\s+/g,' ');o.dis=document.querySelector('#app .gobar .primary').disabled;[...document.querySelectorAll('#app button')].find(x=>x.textContent.trim()==='자동 추천').click();}
      [...document.querySelectorAll('#app .stvmore')].find(x=>/모두 보기/.test(x.textContent)).click();o.all=document.querySelectorAll('#app .prl .pr').length;[...document.querySelectorAll('#app .stvmore')].find(x=>/경계선/.test(x.textContent)).click();o.back=document.querySelectorAll('#app .prl .pr').length;
      document.querySelector('#app .gobar .primary').click();o.phase=SL.sd().phase;return o;});
    if(r.no)bad('2차 드래프트 보호 단계가 아님 '+JSON.stringify(r));else{const outN=r.tot-r.prot;
      r.rows===outN+6&&r.onRows===6&&new RegExp(`${r.prot} / ${r.prot}명`).test(r.head)&&new RegExp(`밖 ${outN}명`).test(r.head)&&!r.rule0&&/양도금/.test(r.rule1)&&r.h<=900&&r.chars<400?ok(`보호 명단: 줄 ${r.rows}(밖 ${outN} + 보호 낮은 순 6) · 「${r.head.replace(/규정.*/,'').trim()}」 · 글자 ${r.chars}자 · 높이 ${r.h} · 규정은 눌러야`):bad('보호 명단 '+JSON.stringify(r));
      (outN===0||(new RegExp(`${r.prot+1} / ${r.prot}명`).test(r.after||'')&&r.dis))&&r.all===r.tot&&r.back===r.rows&&r.phase!=='protect'?ok(`한 명 더 보호 → 「${(r.after||'').replace(/규정.*/,'').trim()}」 확정 막힘 · 자동 추천 · 모두 보기 ${r.all}줄 · 경계선 ${r.back}줄 · 확정 → ${r.phase}`):bad('보호 명단 조작 '+JSON.stringify(r));}}
  // 4. PC: 일정 띠 이름 그대로 · 딱지 「미처리」 그대로
  {const q=await mk(1280,860);const r=await q.evaluate(()=>{UI.setTab('home');UI.closeModal();const a=document.querySelector('#app');return {names:[...a.querySelectorAll('.stvline span b')].map(x=>x.textContent).join('|'),bdg:(a.querySelector('.gobar.wgo .bdg')||{}).textContent||''};});
    /재계약 마감/.test(r.names)&&/2차 드래프트|코치 계약/.test(r.names)&&/^미처리 /.test(r.bdg)?ok(`PC: 일정 띠 [${r.names}] · 딱지 「${r.bdg}」`):bad('PC '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v195 검사 통과');process.exit(fails?1:0);})();

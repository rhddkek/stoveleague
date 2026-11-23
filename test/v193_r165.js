// v193 (R165): 자동 진행 끊김 줄이기 — 7경기 자동은 끝까지 · 결정(선수 이벤트 · 면담 · 광고)은 보고서 안에서 답함
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(()=>{UI.setSeed(24680);UI.pickLg('KR');UI.pickTeam(9);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();UI.setTab('home');});await p.waitForTimeout(300);return p;};
  const run=async(p,n)=>{await p.evaluate(n=>{UI.closeModal();UI.setTab('home');UI.autoRun(n);},n);await p.waitForTimeout(1400);};
  const p=await mk(390,844);
  // 1. 7경기 자동 두 번: 끊김 없이 7경기씩 · 보고서 한 장
  {await run(p,7);await run(p,7);const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();return {g:ut.rec.w+ut.rec.l+(ut.rec.t||0),rep:!!document.querySelector('#modal .report'),bar:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim()).join('|')};});
    r.g===14&&r.rep&&/7경기 더/.test(r.bar)?ok(`7경기 자동 × 2 = ${r.g}경기 · 보고서 한 장 · [${r.bar}]`):bad('7경기 자동 '+JSON.stringify(r));}
  // 2. 선수 이벤트가 마감 직전이어도 멈추지 않고 끝까지 → 보고서 안 「결정」 칸 = 예전 창과 같은 선택지 · 확률
  {const pre=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const g0=ut.rec.w+ut.rec.l;let k=0;while(!(S.pev&&S.pev.open)&&k++<40)SL.playDayAuto();if(!(S.pev&&S.pev.open))return {no:1};S.pev.open.exp=S.clock+1;UI.render();return {id:S.pev.open.id,g:ut.rec.w+ut.rec.l,n:S.pev.n};});
    if(pre.no)bad('선수 이벤트가 안 생김');else{await run(p,7);
      const r=await p.evaluate(pre=>{const S=SL.state();const ut=SL.userTeam();const v=SL.pevInfo();const c=document.querySelector('#modal .rdc[data-k="pev"]');const os=c?[...c.querySelectorAll('.rdo button')].map(x=>x.querySelector('b').textContent+'|'+x.querySelector('span').textContent):[];
        return {g:ut.rec.w+ut.rec.l-pre.g,open:!!(S.pev.open&&S.pev.open.id===pre.id),left:S.pev.open?S.pev.open.exp-S.clock:null,stop:ui_stop(),card:!!c,same:v?JSON.stringify(os)===JSON.stringify(v.opts.map(o=>o.t+'|'+o.d)):false,n:os.length,def:c?(c.querySelector('.rdn')||{}).textContent:'',bar:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim()).join('|')};function ui_stop(){return !!document.querySelector('#modal .rstop,#modal .stopbar');}},pre);
      r.g===7&&r.open&&r.left>=1&&!r.stop&&r.card&&r.same&&r.n>=2&&/답 없으면/.test(r.def)&&/7경기 더/.test(r.bar)&&!/결정 ▶/.test(r.bar)?ok(`마감 직전 이벤트: 7경기 끝까지 · 멈춤 줄 없음 · 결정 칸 선택지 ${r.n}개 = 창과 같음 · ${r.def}`):bad('이벤트 미룸 '+JSON.stringify(r));
      // 답하면 그 자리에서 결과 한 줄 · 창 그대로
      const a=await p.evaluate(()=>{const S=SL.state();document.querySelector('#modal .rdc[data-k="pev"] .rdo button').click();return {open:!!(S.pev&&S.pev.open),dd:[...document.querySelectorAll('#modal .rdd')].map(x=>x.textContent).join(' / '),sheet:!!document.querySelector('#modal .rsheet'),card:!!document.querySelector('#modal .rdc'),bar:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim()).join('|')};});
      !a.open&&/^✓ /.test(a.dd)&&a.sheet&&!a.card&&/7경기 더/.test(a.bar)?ok(`보고서 안에서 답함: 「${a.dd}」 · 창 그대로 · [${a.bar}]`):bad('보고서 안 답 '+JSON.stringify(a));}}
  // 3. 한 번 미룬 결정을 답하지 않고 또 돌리면: 멈추지 않고 기본 선택으로 지나감
  {const pre=await p.evaluate(()=>{const S=SL.state();let k=0;while(!(S.pev&&S.pev.open)&&k++<60&&S.phase==='season')SL.playDayAuto();if(!(S.pev&&S.pev.open))return {no:1};S.pev.open.exp=S.clock+1;UI.render();return {id:S.pev.open.id};});
    if(pre.no)ok('둘째 이벤트 없음 — 건너뜀');else{await run(p,7);const m=await p.evaluate(pre=>{const S=SL.state();return {held:!!(S.pev.open&&S.pev.open.id===pre.id),g:SL.userTeam().rec.w+SL.userTeam().rec.l};},pre);await run(p,7);
      const r=await p.evaluate(([pre,m])=>{const S=SL.state();return {gone:!(S.pev.open&&S.pev.open.id===pre.id),g:SL.userTeam().rec.w+SL.userTeam().rec.l-m.g,stop:!!document.querySelector('#modal .rstop')};},[pre,m]);
      m.held&&r.gone&&r.g===7&&!r.stop?ok('한 번 미룬 결정: 다음 7경기에서 멈춤 없이 기본 선택'):bad('두 번째 진행 '+JSON.stringify({m,r}));}}
  // 4. 면담 · 광고도 결정 칸에서 — 새 광고 제안에 멈추지 않음
  {const r0=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const bench=ut.roster.map(id=>S.players[id]).filter(x=>x&&!SL.isPitcher(x)&&!ut.lineup.includes(x.id)&&SL.inEntry(ut,x.id));const pb=bench[0];const star=S.players[ut.lineup[0]];S.grievances=(S.grievances||[]).filter(g=>false);S.grievances.push({pid:pb.id,s:S.season,kind:'play',gap:3,on:0,n:20,exp:S.clock+1});S.endorseOffers=[{id:S.nextOfferId++,pid:star.id,co:'시험상사',sector:'food',fee:5000,years:1,sc:15,exp:S.clock+7}];UI.render();return {g:ut.rec.w+ut.rec.l,pb:pb.id,star:star.id,cash:ut.cash};});
    await run(p,7);
    const r=await p.evaluate(r0=>{const S=SL.state();const ut=SL.userTeam();const gk=document.querySelector('#modal .rdc[data-k="griev"]');const ek=document.querySelector('#modal .rdc[data-k="end"]');return {g:ut.rec.w+ut.rec.l-r0.g,stop:!!document.querySelector('#modal .rstop'),gk:!!gk,ek:!!ek,gr:(S.grievances||[]).some(g=>g.pid===r0.pb),n:document.querySelectorAll('#modal .rdc').length,hd:(document.querySelector('#modal .rdec .hkh')||{}).textContent};},r0);
    r.g===7&&!r.stop&&r.gk&&r.ek&&r.gr?ok(`면담(내일 마감) + 새 광고 제안: 7경기 끝까지 · 「${r.hd}」`):bad('면담 · 광고 '+JSON.stringify(r));
    const a=await p.evaluate(r0=>{const S=SL.state();const open=()=>{const c=document.querySelector('#modal .rdc[data-k="griev"]');if(!c.querySelector('.rdo'))c.querySelector('.rdh').click();return [...document.querySelectorAll('#modal .rdc[data-k="griev"] .rdo button')];};const B=open();const n=B.length;B[0].click();const g=(S.grievances||[]).some(x=>x.pid===r0.pb);
      const c2=document.querySelector('#modal .rdc[data-k="end"]');if(!c2.querySelector('.rdo'))c2.querySelector('.rdh').click();const E=[...document.querySelectorAll('#modal .rdc[data-k="end"] .rdo button')];const en=E.length;E[0].click();
      return {n,en,g,end:(S.endorseOffers||[]).length,has:!!S.players[r0.star].endorse,dd:document.querySelectorAll('#modal .rdd').length,sheet:!!document.querySelector('#modal .rsheet')};},r0);
    a.n===3&&a.en===2&&!a.g&&a.end===0&&a.has&&a.dd>=2&&a.sheet?ok(`면담 선택지 3 · 광고 2 → 답 ${a.dd}줄 · 면담 정리 · 광고 계약 반영 · 창 그대로`):bad('면담 · 광고 답 '+JSON.stringify(a));}
  // 5. 시즌 끝까지(999)는 예전처럼 멈춤 — 다만 창을 한 번 더 열지 않고 보고서 안에서 답함
  {const pre=await p.evaluate(()=>{const S=SL.state();let k=0;while(!(S.pev&&S.pev.open)&&k++<70&&S.phase==='season'&&!(S.half&&!S.half.seen&&S.day>=S.half.d))SL.playDayAuto();if(S.half&&!S.half.seen&&SL.halfSeen)SL.halfSeen();k=0;while(!(S.pev&&S.pev.open)&&k++<70&&S.phase==='season')SL.playDayAuto();if(!(S.pev&&S.pev.open))return {no:1};S.pev.open.exp=S.clock+2;delete S.pev.open.held;UI.render();return {id:S.pev.open.id};});
    if(pre.no)ok('시즌 끝까지: 남은 이벤트 없음 — 건너뜀');else{await run(p,999);await p.waitForTimeout(600);
      const r=await p.evaluate(()=>{const S=SL.state();return {ph:S.phase,card:!!document.querySelector('#modal .rdc[data-k="pev"]'),bar:[...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim()).join('|')};});
      r.ph==='season'&&r.card&&/넘기고 계속/.test(r.bar)&&!/결정 ▶/.test(r.bar)?ok(`시즌 끝까지: 이벤트에서 멈춤 · 결정 칸 · [${r.bar}](「결정 ▶」 없음)`):bad('999 '+JSON.stringify(r));
      const a=await p.evaluate(()=>{document.querySelector('#modal .rdc[data-k="pev"] .rdo button').click();return [...document.querySelectorAll('#modal .shbar button')].map(x=>x.textContent.trim()).join('|');});
      /계속/.test(a)?ok(`답한 뒤 단추: [${a}]`):bad('999 답 뒤 '+a);}}
  // 6. PC: 감독실 보고서 카드 안 결정 칸
  {const q=await mk(1280,860);const r=await q.evaluate(()=>{const S=SL.state();let k=0;while(!(S.pev&&S.pev.open)&&k++<40)SL.playDayAuto();if(!(S.pev&&S.pev.open))return {no:1};UI.setTab('home');UI.autoDays(7);const c=document.querySelector('#app .report .rdc[data-k="pev"]');const n=c?c.querySelectorAll('.rdo button').length:0;if(c)c.querySelector('.rdo button').click();return {card:!!c,n,open:!!(S.pev&&S.pev.open),dd:(document.querySelector('#app .report .rdd')||{}).textContent||'',modal:!!document.querySelector('#modal')};});
    r.no?ok('PC: 이벤트 없음 — 건너뜀'):r.card&&r.n>=2&&!r.open&&/^✓/.test(r.dd)?ok(`PC 감독실 보고서 카드: 결정 칸 선택지 ${r.n} → 「${r.dd}」`):bad('PC '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v193 검사 통과');process.exit(fails?1:0);})();

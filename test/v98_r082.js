// v98 (R082): 화면 조작 통일 — 「보기 전환」은 한 가지 상자 모양, 정렬·필터는 아래 줄과 같은 칩, 큰 제목 한 가지 크기, 같은 이름이 두 줄에 안 나옴
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  for(const theme of ['ea','light']){
    const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
    const r=await p.evaluate((theme)=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.closeModal();UI.setTheme(theme);UI.autoDays(6);UI.closeModal();
      const SW='.seg,.grptab,.mktabs2,.mktabs3,.mktabs4,.stvtab,.pgtabs',CH='.stvsort,.chiprow,.htabs2';const sw={},ch={},heads={},dup=[];let screens=0;
      const sig=e=>{const c=getComputedStyle(e);return [c.borderTopLeftRadius,c.backgroundColor].join('|');};
      const bsig=e=>{const c=getComputedStyle(e);return [c.borderTopLeftRadius,c.backgroundColor,c.color].join('|');};
      for(const t of ['roster','dev','market','league','club']){UI.setTab(t);const tops=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());for(const top of tops){const tb=[...document.querySelectorAll('.htabs button')].find(x=>x.textContent.trim()===top);tb&&tb.click();const subs=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());for(const sub of (subs.length?subs:[null])){if(sub){const sb=[...document.querySelectorAll('.htabs2 button')].find(x=>x.textContent.trim()===sub);sb&&sb.click();}screens++;
        const vis=e=>e.offsetParent&&!e.closest('#modal,.side,#rpane');
        for(const c of [...document.querySelectorAll(SW)].filter(vis)){const k=sig(c);(sw[k]=sw[k]||[]).push(t+'/'+top+'/'+sub+':'+c.className);const on=c.querySelector('button.on');if(on){const kb='on|'+bsig(on);(sw[kb]=sw[kb]||[]).push(t+'/'+sub);}}
        for(const c of [...document.querySelectorAll(CH)].filter(vis)){const on=c.querySelector('button.on');if(!on)continue;const kb=getComputedStyle(on).borderTopLeftRadius+'|'+getComputedStyle(on).backgroundColor;(ch[kb]=ch[kb]||[]).push(t+'/'+sub+':'+c.className);}
        for(const h of [...document.querySelectorAll('.stvh>b,.mkh .t')].filter(vis)){const c=getComputedStyle(h);const k=c.fontSize+'|'+c.fontWeight;(heads[k]=heads[k]||[]).push(t+'/'+sub);}
        const hs=document.querySelector('.htabs2 button.on');const pg=document.querySelector('.pgtabs');if(hs&&pg&&[...pg.querySelectorAll('button')].some(x=>x.textContent.trim()===hs.textContent.trim()))dup.push(t+'/'+sub);}}}
      const boxKinds=Object.keys(sw).filter(k=>!k.startsWith('on|'));const onKinds=Object.keys(sw).filter(k=>k.startsWith('on|'));
      return {screens,boxKinds,onKinds,chKinds:Object.keys(ch),headKinds:Object.keys(heads),dup,ex:boxKinds.map(k=>sw[k].slice(0,2))};},theme);
    r.boxKinds.length===1&&r.onKinds.length===1?ok(`[${theme}] ${r.screens}개 화면의 「보기 전환」 상자 모두 같은 모양·같은 선택 색 (${r.boxKinds[0]})`):bad(`[${theme}] 보기 전환 ${r.boxKinds.length}가지/선택 ${r.onKinds.length}가지 `+JSON.stringify(r.ex).slice(0,400)+' '+JSON.stringify(r.onKinds));
    r.chKinds.length===1?ok(`[${theme}] 아래 줄 칩·정렬·필터 칩 선택 모양 한 가지`):bad(`[${theme}] 칩 `+JSON.stringify(r.chKinds));
    r.headKinds.length===1?ok(`[${theme}] 화면 큰 제목 한 가지 크기 (${r.headKinds[0]})`):bad(`[${theme}] 제목 `+JSON.stringify(r.headKinds));
    !r.dup.length?ok(`[${theme}] 아래 줄 탭 이름이 쪽 나누기 칸에 또 나오는 화면 없음`):bad(`[${theme}] 같은 이름 두 줄 `+JSON.stringify(r.dup));
    await p.close();}
  // 구단 → 시설: 전환 상자 없이 시설·개선·커리어가 한 화면
  {const p=await b.newPage({viewport:{width:1280,height:900}});await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.closeModal();UI.go('club','fac');const t=document.querySelector('.content').innerText;return {half:!!document.querySelector('.mktabs2.half'),fac:t.includes('구단 시설'),up:/Lv\.\d → \d/.test(t)&&/증설/.test(t),car:!t.includes('구단 커리어')};});
    !r.half&&r.fac&&r.up&&r.car?ok('구단 → 시설: 전환 상자 없이 시설 · 「훈련장 Lv.1 → 2」 전후 비교 · 증설 단추 (커리어는 감독실 띠로, v110)'):bad('시설 '+JSON.stringify(r));await p.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v98 검사 실패 ${fails}건`:'v98 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

// v197 (R169): 고른 칸은 채우지 않음(노란 채움 = 화면마다 할 일 단추 하나) · 매물 등록 = 골라서 한 번에
const {chromium}=require('playwright');const path=require('path');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
const F='file://'+path.resolve(__dirname,'../stoveleague.html');
(async()=>{const b=await chromium.launch();const errs=[];
  const mk=async(w,h,theme)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto(F);await p.waitForTimeout(600);
    await p.evaluate(()=>{UI.setSeed(24680);UI.pickLg('KR');UI.pickTeam(9);UI.newGame();UI.tutSkip&&UI.tutSkip();UI.closeModal();for(let i=0;i<30;i++){SL.playDayAuto();if(SL.halfSeen)SL.halfSeen();}UI.closeModal();});if(theme)await p.evaluate(t=>{document.documentElement.setAttribute('data-theme',t);},theme);await p.waitForTimeout(200);return p;};
  // 1. 모든 화면: 노란 채움 단추 ≤ 1(꾸미기 · 스카우트는 2까지), 고른 칩은 테두리 · 보기 전환은 밝은 칸
  const p=await mk(390,844);
  {const r=await p.evaluate(()=>{const fill=e=>{const c=(getComputedStyle(e).backgroundColor.match(/[\d.]+/g)||[]).map(Number);return (c.length<4||c[3]>0.5)&&c[0]>200&&c[1]>150&&c[2]<140;};const out=[];let n=0,chip=0,chipBad=0,seg=0,segBad=0;
      for(const s of UI.allScreens())for(const row of s.rows)for(const it of row.items){UI.closeModal();UI.go(s.key,it.k);UI.closeModal();n++;const a=document.querySelector('#app');const B=[...a.querySelectorAll('button,select,summary')].filter(e=>e.offsetParent);const y=B.filter(e=>fill(e)&&e.textContent.trim()).length;   /* 색 고르기 칸(글자 없음)은 빼고 */const lim=['club/look','market/scout'].includes(s.key+'/'+it.k)?2:1;if(y>lim)out.push(s.key+'/'+it.k+':'+y);
        for(const e of a.querySelectorAll('.htabs2 button.on,.stvsort button.on,.chiprow button.on')){if(!e.offsetParent)continue;chip++;const st=getComputedStyle(e);if(fill(e)||!/inset/.test(st.boxShadow))chipBad++;}
        for(const e of a.querySelectorAll('.seg button.on,.mktabs2 button.on,.mktabs3 button.on,.pgtabs button.on,.grptab button.on')){if(!e.offsetParent)continue;seg++;if(fill(e))segBad++;}}
      return {n,out,chip,chipBad,seg,segBad};});
    !r.out.length&&r.chip>20&&!r.chipBad&&r.seg>10&&!r.segBad?ok(`화면 ${r.n}개: 노란 채움 단추 ≤ 1 · 고른 칩 ${r.chip}곳 테두리 · 보기 전환 ${r.seg}곳 채움 없음`):bad('노랑 '+JSON.stringify(r));}
  // 2. 매물 등록: 줄마다 단추 없음 · 눌러 고르기 · 아래 「판매 등록」 하나 · 등록 = 고른 선수
  {const r=await p.evaluate(()=>{const S=SL.state();UI.go('market','list');const a=document.querySelector('#app');const rows=[...a.querySelectorAll('.mlr')];const per=rows.filter(x=>!x.classList.contains('on')&&x.querySelector('button')).length;const go=a.querySelector('.selmg .primary');const d0=go.disabled;
      const ids=[];for(const i of [1,4]){const x=[...document.querySelectorAll('#app .mlr')][i];x.click();}const sel=(document.querySelector('#app .selmg span')||{}).textContent;const L0=S.market.listed.length;document.querySelector('#app .selmg .primary').click();
      const after=document.querySelectorAll('#app .mlr .sm').length;return {rows:rows.length,per,d0,sel,added:S.market.listed.length-L0,after,btn:[...document.querySelectorAll('#app button')].filter(e=>e.offsetParent).length};});
    r.rows===12&&r.per===0&&r.d0&&/^선택 2명 · 가치 /.test(r.sel)&&r.added===2&&r.after===2&&r.btn<=26?ok(`매물 등록: 후보 12줄(더 보기) · 줄 단추 0 · 「${r.sel}」 → 판매 등록 2명 · 등록 중 줄에 해제 2 · 단추 ${r.btn}개`):bad('매물 등록 '+JSON.stringify(r));}
  // 3. 밝은 색도 채움 없음
  {const q=await mk(390,844,'light');const r=await q.evaluate(()=>{UI.go('league','rec');const e=document.querySelector('#app .htabs2 button.on');const g=document.querySelector('#app .seg button.on');const c=x=>getComputedStyle(x).backgroundColor;return {chip:e?c(e):'',seg:g?c(g):''};});
    /rgba\(0, 0, 0, 0\)|transparent/.test(r.chip)&&!/rgb\(30, 32, 39\)/.test(r.seg)?ok(`밝은 색: 칩 ${r.chip} · 보기 전환 ${r.seg}`):bad('밝은 색 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' / ')):ok('페이지 오류 0');
  await b.close();console.log(fails?`실패 ${fails}`:'v197 검사 통과');process.exit(fails?1:0);})();

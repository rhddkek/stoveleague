// v97 (R081): 해외 선수 찾기 「리그별」 — 리그 단계(일본 1군·2군, 메이저·미국 2군·3군, 대만…)를 눌러 바꾸고 그 리그 선수 전체를 성적·능력·나이·비용으로 정렬
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1');await p.waitForTimeout(300);
  await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();});
  // 1. 첫 시즌: 리그별 탭 · 단계 줄 · 기록이 없으면 능력순
  {const r=await p.evaluate(()=>{UI.go('market','fgn');UI.fgV('lv');const tabs=[...document.querySelectorAll('.fgv button')].map(x=>x.textContent.trim());const lv=[...document.querySelectorAll('.lvrow button')].map(x=>x.textContent.trim());const sub=(document.querySelector('.stvsub')||{}).innerText||'';return {tabs,lv,sub,rows:document.querySelectorAll('table.lvt tbody tr').length};});
    r.tabs.some(x=>/^리그별/.test(x))&&['일본 1군','일본 2군','메이저리그','미국 2군','미국 3군','대만'].every(k=>r.lv.includes(k))&&/능력순/.test(r.sub)&&r.rows>=10?ok(`해외 선수 찾기 「리그별」: 단계 ${r.lv.length}칸(${r.lv.join('·')}) · 첫 시즌은 능력순 ${r.rows}명`):bad('리그별 '+JSON.stringify(r));}
  // 2. 한 시즌 뒤: 일본 2군 타자 성적순 = 그 선수 지난 시즌 기록(해외 2군 hist)과 같고, OPS 높은 순 · 다른 단계 선수 섞이지 않음 · 미국 2군 투수 평균자책 낮은 순
  await p.evaluate(()=>{SL.testCmd('nextSeason');UI.closeModal();});
  {const r=await p.evaluate(()=>{const S=SL.state();UI.go('market','fgn');UI.fgV('lv');UI.fgLv('JP2');UI.fgSide('B');UI.fgSort('st');UI.set('fgN',400);
      const rows=[...document.querySelectorAll('table.lvt tbody tr')];const byName=n=>Object.values(S.players).find(q=>q.name===n);const out=[];
      for(const tr of rows.slice(0,25)){const nm=tr.querySelector('td.tn').childNodes[1].textContent.trim();const q=Object.values(S.players).filter(x=>x.name===nm&&x.teamId!=null&&S.teams[x.teamId].league==='JP'&&(x.tier||1)===2&&!SL.isPitcher(x));if(q.length!==1)continue;const pl=q[0];const H=pl.hist.slice().reverse().find(h=>/^JP[23]?$/.test(h.lg||'')&&!h.w&&h.st);const txt=tr.querySelector('td.lvst').innerText;
        if(!H){out.push({nm,noH:true});continue;}const st=H.st;const avg=(st.h/st.ab).toFixed(3).replace(/^0/,'');const ops=((st.h+st.bb)/Math.max(1,st.ab+st.bb)+(st.h+st.d2+2*st.d3+3*st.hr)/st.ab);out.push({nm,ok:txt.includes(avg)&&txt.includes(st.hr+'홈런'),ops,q:st.pa>=150});}
      const qs=out.filter(x=>x.q);const sorted=qs.every((x,i)=>i===0||qs[i-1].ops>=x.ops-1e-9);const sub=(document.querySelector('.stvsub')||{}).innerText||'';
      const all=[...document.querySelectorAll('table.lvt tbody tr')].length;const pool=SL.overseasTeams().filter(t=>t.league==='JP'&&!t.farm).flatMap(t=>t.roster.map(id=>S.players[id])).filter(x=>x&&!x.retired&&(x.tier||1)===2&&!SL.isPitcher(x)&&!SL.osWill(x,S.teams[x.teamId]).no).length;
      UI.fgLv('US2');UI.fgSide('P');UI.fgSort('st');const pr=[...document.querySelectorAll('table.lvt tbody tr td.lvst')].slice(0,15).map(td=>td.innerText).filter(t=>/^\d/.test(t)&&!/기록 적음/.test(t)).map(t=>parseFloat(t));const psorted=pr.every((v,i)=>i===0||pr[i-1]<=v);
      return {n:out.length,bad:out.filter(x=>x.noH||!x.ok).length,sorted,sub,all,pool,pn:pr.length,psorted,first:out[0]};});
    r.n>=5&&!r.bad&&r.sorted&&/시즌<\/b>|시즌 정규/.test(r.sub+'')&&r.all===r.pool&&r.pn>=3&&r.psorted?ok(`일본 2군 타자 성적순 ${r.all}명(이적 가능 전원): 위 ${r.n}명 타율·홈런 = 선수 기록, OPS 높은 순 · 미국 2군 투수 평균자책 낮은 순`):bad('성적순 '+JSON.stringify(r));}
  // 3. 「이적 불가도 보기」: 메이저리그는 주전·유망주가 이적 불가라 숨김 → 켜면 보임 · 줄을 누르면 관찰·협상 메뉴
  {const r=await p.evaluate(()=>{UI.fgLv('US1');UI.fgSide('B');UI.fgSort('ab');const n0=document.querySelectorAll('table.lvt tbody tr').length;const sub0=(document.querySelector('.stvsub')||{}).innerText||'';UI.fgAll(true);UI.set('fgN',400);const n1=document.querySelectorAll('table.lvt tbody tr').length;const dim=document.querySelectorAll('table.lvt tbody tr.dim').length;UI.fgAll(false);UI.set('fgN',30);
      document.querySelector('table.lvt tbody tr').click();const m=(document.querySelector('#modal')||{}).innerText||'';UI.closeModal();return {n0,n1,dim,hid:/숨김/.test(sub0),menu:/관찰|협상/.test(m)};});
    r.hid&&r.n1>r.n0&&r.dim>0&&r.menu?ok(`메이저리그: 이적 불가 숨김 → 「이적 불가도 보기」 켜면 ${r.dim}명 흐리게 표시 · 줄 누르면 관찰·협상 메뉴`):bad('이적 불가 '+JSON.stringify(r));}
  // 4. 폰 폭에서 가로로 넘치지 않음
  {const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:innerWidth}));r.sw<=r.cw+1?ok(`폰 390px: 가로 넘침 없음`):bad('넘침 '+JSON.stringify(r));}
  // 5. 리그 → 다른 리그 → 해외에서 「○○ 선수 영입하러 가기」 → 그 리그 1군 「리그별」 화면
  {const r=await p.evaluate(()=>{UI.go('league','overseas');UI.set('ovLg','TW');const b=[...document.querySelectorAll('.lnbtns button')].find(x=>/영입하러 가기/.test(x.textContent));if(b)b.click();const on=(document.querySelector('.lvrow button.on')||{}).textContent||'';return {b:!!b,on:on.trim(),tab:document.body.innerText.includes('해외 선수 찾기')};});
    r.b&&r.tab&&r.on==='대만'?ok('리그 → 해외(대만) 「영입하러 가기」 → 해외 선수 찾기 「리그별」 대만'):bad('바로 가기 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v97 검사 실패 ${fails}건`:'v97 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

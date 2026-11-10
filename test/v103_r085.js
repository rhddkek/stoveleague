// v103 (R085): 등급 색 · 구단 유형 삭제 · 아래 창 배치 · 콜업 후보 간소화 · 코치진은 선수단 · 화면 점검에서 고친 것
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();UI.autoDays(6);UI.closeModal();});
  // 1. 등급 글자색: S·A·B·C·D 다섯 색이 모두 다름 (두 테마) · 표·배지·작은 글자 어디서든 같은 등급 = 같은 색
  {const r=await p.evaluate(()=>{const out={};for(const th of ['ea','light']){UI.setTheme(th);const box=document.createElement('div');document.body.appendChild(box);
      const col=(cls,inner)=>{box.innerHTML=inner;const e=box.querySelector(cls);return getComputedStyle(e).color;};
      const G=['S','A','B','C','D'].map(g=>col('b',`<span class="gnum ${g}"><b>${g}</b>70</span>`));const L=['S','A','B','C','D'].map(g=>col('span',`<span class="gl2 ${g}">${g}</span>`));
      const P=['S','A','B','C','D'].map(g=>{box.innerHTML=`<span class="gl ${g}">${g}</span>`;return getComputedStyle(box.firstChild).backgroundColor;});box.remove();out[th]={G,L,P};}UI.setTheme('ea');return out;});
    const uniq=a=>new Set(a).size;const okc=['ea','light'].every(th=>uniq(r[th].G)===5&&uniq(r[th].P)===5&&r[th].G.join()===r[th].L.join());
    okc?ok(`등급 색: 두 테마 모두 S·A·B·C·D 다섯 가지 다른 색 (어두운 테마 ${r.ea.G.join(' / ')}) · 큰 숫자·작은 글자 같은 색`):bad('등급 색 '+JSON.stringify(r));}
  // 2. 구단 유형 없음: 새 게임에 유형 이름·목표가 없음 · 첫 주 이야기 제목에 「— 노장 중심」 같은 말 없음 · 예전 저장의 유형도 지움
  {const r=await p.evaluate(()=>{const res=[];for(const i of [1,6,9]){SL.newGame(500,i,{arch:true,games:36,league:'KR'});const ut=SL.userTeam();const st=SL.weeklyStory();res.push({arch:ut.arch||null,title:st&&st.title,goal:(SL.state().mgr.cur&&SL.state().mgr.cur.goal||{}).kind||'rank'});}
      const S=SL.state();SL.userTeam().arch='vet';const j=SL.serialize();SL.load(j);return {res,after:SL.userTeam().arch||null};});
    r.res.every(x=>!x.arch&&!/중심|재정난|인기 구단/.test(x.title||'')&&x.goal==='rank')&&!r.after?ok(`구단 유형 삭제: 새 게임 3구단 유형·유형 목표 없음 · 첫 주 이야기 「${r.res[0].title}」 · 예전 저장의 유형도 지움`):bad('구단 유형 '+JSON.stringify(r));}
  await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();UI.autoDays(8);UI.closeModal();});
  // 3. 아래 창: 「닫기」는 맨 위 한 줄(내용 옆에 뜨지 않음) · 결정할 일이 없을 때 두 단추가 반반 · 단추 글자가 세로로 꺾이지 않음
  {const r=await p.evaluate(()=>{UI.setTab('home');UI.sheet('dec');const m=document.querySelector('#modal .modal');const cl=m.querySelector(':scope>.close');const cs=getComputedStyle(cl);const fl=cs.cssFloat;const card=m.querySelector('.card');
      const bs=[...m.querySelectorAll('.card button')].map(x=>{const r=x.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),t:x.textContent.trim()};});
      const cr=card.getBoundingClientRect(),mr=m.getBoundingClientRect();UI.closeModal();UI.sheet('story');const st=document.querySelector('#modal .sheetc');const sw=st?st.getBoundingClientRect().width:0;UI.closeModal();
      return {float:fl,below:cl.getBoundingClientRect().bottom<=cr.top+1,full:cr.width>=mr.width-40,bs,sw:Math.round(sw),mw:Math.round(mr.width)};});
    r.float==='none'&&r.below&&r.full&&r.bs.length>=1&&r.bs.every(x=>x.w>=40&&x.h<70)&&r.sw>=r.mw-40?ok(`아래 창: 닫기 맨 위 · 카드 폭 ${r.sw}/${r.mw} · 결정할 일 단추 ${r.bs.map(x=>x.t+' '+x.w+'×'+x.h).join(', ')} (세로로 꺾인 단추 없음)`):bad('아래 창 '+JSON.stringify(r));}
  // 4. 콜업 후보: 이름·등급·한 줄 비교·단추만 (코치 말·능력치 줄·설명 문단 없음)
  {const r=await p.evaluate(()=>{const cu=SL.callupCands(2);UI.sheet('growth');const card=[...document.querySelectorAll('#modal .card')].find(c=>/콜업 후보/.test(c.innerText));const out=card?{n:card.querySelectorAll('.pcard').length,coach:card.querySelectorAll('.pc5').length,attr:card.querySelectorAll('.pc3').length,para:/1군 시험 기용은/.test(card.innerText),line:(card.querySelector('.pc4')||{}).innerText||''}:null;UI.closeModal();return {cu:cu.length,out};});
    !r.cu||(r.out&&r.out.n===r.cu&&!r.out.coach&&!r.out.attr&&!r.out.para&&/후보 · .*보다/.test(r.out.line))?ok(`콜업 후보 ${r.cu}명: 한 줄 「${r.out?r.out.line:'-'}」 · 코치 말·능력치 줄·설명 문단 없음`):bad('콜업 '+JSON.stringify(r));}
  // 5. 코치진은 선수단 위 줄 투수진 옆 · 구단엔 없음 · 예전 길(구단 → 코치진)로 가도 선수단 코치진 · 위 줄 5칸
  {const r=await p.evaluate(()=>{UI.setTab('roster');const rt=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());UI.setTab('club');const ct=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());
      UI.go('club','staff');const tab=SL&&document.querySelector('.htabs button.on');const staff=/코치관리|타격코치/.test(document.querySelector('.content').innerText);return {rt,ct,on:tab&&tab.textContent.trim(),staff,w:document.documentElement.scrollWidth<=innerWidth+1};});
    r.rt.join(',')==='선수,타순·수비,투수진,코치진,팀 운영'&&!r.ct.includes('코치진')&&r.on==='코치진'&&r.staff&&r.w?ok(`선수단 위 줄 「${r.rt.join(' · ')}」 · 구단 「${r.ct.join(' · ')}」 · 구단 → 코치진 길도 선수단 코치진으로`):bad('코치진 '+JSON.stringify(r));}
  // 6. 화면 점검에서 고친 것: 0원은 「0」 · 투수진 안에 「타자단」 없음 · 시설 화면 「준비 중」 칸·같은 커리어 두 벌 없음 · 첫 시즌 해외 순위표에 「-」만 가득하지 않음 · 시즌 중 재계약·겨울리그 화면이 비어 있지 않음
  {const r=await p.evaluate(()=>{const o={};UI.go('roster','pitch');o.seg=[...document.querySelectorAll('.mktabs4 button')].map(x=>x.textContent.trim());
      UI.go('club','fac');const t=document.querySelector('.content').innerText;o.prep=/준비 중/.test(t);o.car=(t.match(/첫 시즌 완주/g)||[]).length;
      UI.go('league','overseas');UI.ovLg('JP');o.dash=[...document.querySelectorAll('.content table td')].filter(td=>td.textContent.trim()==='-').length;
      UI.go('market','renew');o.renew=document.querySelector('.content').innerText.length;o.renewTxt=/계약이 끝나는 선수|계약 만료 예정/.test(document.querySelector('.content').innerText);
      UI.go('dev','winter');o.win=/스토브리그 1~2주차에 열립니다/.test(document.querySelector('.content').innerText);o.m0=SL.money(0);return o;});
    !r.seg.includes('타자단')&&!r.prep&&r.car<=1&&r.dash===0&&r.renewTxt&&r.win&&r.m0==='0원'?ok(`투수진 칸 「${r.seg.join('·')}」 · 시설 「준비 중」 없음·커리어 한 벌 · 첫 시즌 해외 「-」 칸 0 · 재계약·겨울리그 안내 · money(0) = ${r.m0}`):bad('점검 '+JSON.stringify(r));}
  // 7. 시즌이 끝나 선수 기록이 비면 우리 팀 지표가 0을 「리그 1위」로 보이지 않음 · 겨울 신인·유소년 희망 연봉도 최저 연봉 이상
  {const r=await p.evaluate(()=>{SL.testCmd('endSeason');UI.closeModal();UI.go('league','team');const rows=[...document.querySelectorAll('table.tit tr')].map(x=>x.innerText);const S=SL.state();const ut=SL.userTeam();
      const low=(S.youth||[]).map(id=>S.players[id]).filter(Boolean).filter(q=>SL.playerDemand(q,ut)<SL.minSal()).length;return {zero1:rows.filter(x=>/^☑ 팀 (타율|방어율)/.test(x)&&/1위/.test(x)&&/\.000|0\.00/.test(x)).length,rows:rows.slice(0,2),low,ys:(S.youth||[]).length,min:SL.minSal()};});
    r.zero1===0&&r.low===0?ok(`겨울 우리 팀 지표 「${r.rows[0].replace(/\s+/g,' ')}」 (0을 1위로 안 보임) · 유소년 ${r.ys}명 희망 연봉 모두 ${r.min*5}만 이상`):bad('겨울 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v103 검사 실패 ${fails}건`:'v103 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

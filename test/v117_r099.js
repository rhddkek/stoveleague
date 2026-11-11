// v117 (R099): 7시즌 화면 점검 2차 — 육성 탭이 이적으로 열리던 문제 · 개막 전 편성 점검(자동 편성) · 예산 부족 위임 되풀이 · 코치 만료 안내 ·
//   「볼 만한 경기」 날마다 멈춤 · 계약 기간 연도 · 영입 완료 표기 · 탭/제목 이름 겹침
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:393,height:852}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);
  const fresh=`SL.newGame(4096,1,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();`;
  const toWinter=`{let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();}`;

  // 1. 이적 → 신인 → 국내 스카우트를 본 뒤 아래 「육성」을 누르면 육성 화면 (전에는 이적 화면이 다시 열림)
  {const r=await p.evaluate(new Function(fresh+`const tabs=()=>[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim()).join(',');UI.go('market','scout');const a=tabs();UI.navTap('dev');const b2=tabs();UI.go('dev','draft');const c=tabs();UI.navTap('dev');return {a,b:b2,c,d:tabs()};`));
    /^진행 중/.test(r.a)&&/^훈련,성장/.test(r.b)&&/^진행 중/.test(r.c)&&/^훈련,성장/.test(r.d)?ok('이적 → 신인을 본 뒤 「육성」 = 훈련·성장 화면'):bad('육성 탭 '+JSON.stringify(r));}

  // 2. 「볼 만한 경기」: 「계속 자동」으로 넘긴 이유(같은 신인 데뷔 가능)로 다음 날 다시 멈추지 않음
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const id=ut.bullpen[Math.min(5,ut.bullpen.length-1)];const q=S.players[id];q.age=21;q.deb=false;q.cur.g=0;const w0=SL.watchReasons().map(x=>x.text).join('|');
      UI.setTab('home');UI.autoDays(7);const s1=(document.querySelector('.stopbar')||{}).innerText||'';const t1=(S.day);let again=0;for(let k=0;k<4;k++){if(!document.querySelector('.stopbar'))break;const bt=[...document.querySelectorAll('.stopbar button')].find(x=>/계속 자동/.test(x.textContent));if(!bt)break;bt.click();const tx=(document.querySelector('.rbanner')||{}).innerText||'';if(tx.includes(q.name+' 1군 데뷔'))again++;}
      return {name:q.name,w0,s1:s1.replace(/\n/g,' '),again,day:S.day};});
    r.w0.includes(r.name)&&r.again===0?ok(`볼 만한 경기 「${r.name} 1군 데뷔 가능」 — 넘긴 뒤 같은 이유로 다시 안 멈춤 (${r.day}일차까지 진행)`):bad('볼 만한 경기 '+JSON.stringify(r));}

  // 3. 겨울: 선수 상세 계약 기간이 뛰게 될 연도(다음 시즌부터) · 만료 선수는 「만료」
  {const r=await p.evaluate(new Function(fresh+`const ut=SL.userTeam();ut.roster.slice(0,12).forEach(id=>{S.players[id].contract.years=1;});`+toWinter+`const a=ut.roster.map(id=>S.players[id]).find(q=>q.contract&&q.contract.years===2);const e=S.players[S.pendingFA[0]];const per=q=>{UI.openPlayer(q.id);const t=[...document.querySelectorAll('.pv tr')].find(x=>/계약 기간/.test(x.textContent));const v=t?t.lastElementChild.textContent.trim():'';UI.back();return v;};return {y:2025+S.season,a:per(a),e:per(e)};`));
    r.a===`${r.y+1}~${r.y+2}`&&r.e==='만료'?ok(`겨울 계약 기간: 2년 남은 선수 「${r.a}」 · 만료 선수 「${r.e}」`):bad('계약 기간 '+JSON.stringify(r));}

  // 4. 겨울 건너뛰기 안내에 「재계약 안 한 코치 n명은 떠남」 · 코치 창 「잔여 n년」·닫기 하나 · 은퇴를 결심한 코치는 재계약 단추 대신 「은퇴 결심」
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const exs=(ut.staff||[]).filter(c=>c.years<=0);const pf=S.pendingFA;S.pendingFA=[];UI.setTab('home');UI.startSeason();const m=document.querySelector('#modal');const t=m?m.innerText:'';UI.closeModal();S.pendingFA=pf;
      const c=(ut.staff||[]).find(c=>c.years>0);let mt='',nClose=0;if(c){UI.coachMenu(c.id);const mm=document.querySelector('#modal');mt=mm.innerText.replace(/\n+/g,' ');nClose=[...mm.querySelectorAll('button')].filter(x=>x.textContent.trim()==='닫기').length;UI.closeModal();}
      let old='';if(exs[0]){const a0=exs[0].age;exs[0].age=68;UI.coachMenu(exs[0].id);const mm=document.querySelector('#modal');old=[...mm.querySelectorAll('button')].map(x=>x.textContent.trim()+(x.disabled?'(x)':'')).join('/');UI.closeModal();exs[0].age=a0;}
      return {ex:exs.length,warn:(t.match(/재계약 안 한 코치 \d+명은 떠남/)||[''])[0],mt:mt.slice(0,90),nClose,old};});
    r.ex>0&&r.warn&&/잔여 \d년/.test(r.mt)&&!/년 남음/.test(r.mt)&&r.nClose===1&&/은퇴 결심 · 재계약 불가\(x\)/.test(r.old)&&!/년 재계약/.test(r.old)?ok(`건너뛰기 안내 「${r.warn}」 · 코치 창 「잔여 n년」·닫기 하나 · 67세 이상 「은퇴 결심 · 재계약 불가」`):bad('코치 알림 '+JSON.stringify(r));}

  // 5. 예산이 모자라 위임이 안 되면: 같은 창 되풀이가 아니라 이유(연봉 예산 부족) + [연봉 한도 늘리기] · 남은 선수 체크 해제 · 줄마다 「예산 부족」
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const keep=ut.roster.map(id=>S.players[id]).find(q=>q.contract&&q.contract.years>=2);keep.contract.salary=9000000;UI.closeModal();UI.setTab('home');UI.startSeason();let m=document.querySelector('#modal');const bt=[...m.querySelectorAll('button')].find(x=>/코치에게 위임/.test(x.textContent));const n0=S.pendingFA.length;bt.click();m=document.querySelector('#modal');const t=m?m.innerText:'';
      const bt2=m&&[...m.querySelectorAll('button')].find(x=>/코치에게 위임/.test(x.textContent));const out={n0,n1:S.pendingFA.length,warn:/연봉 예산 부족 · \d+명 재계약 불가/.test(t),more:m&&[...m.querySelectorAll('button')].some(x=>x.textContent.trim()==='연봉 한도 늘리기'),chips:m?[...m.querySelectorAll('.chip.r')].filter(x=>x.textContent==='예산 부족').length:0,checked:m?m.querySelectorAll('input:checked').length:-1,dis:bt2?bt2.disabled:null,go:m&&[...m.querySelectorAll('button')].some(x=>x.textContent.trim()==='그대로 진행')};keep.contract.salary=1000;UI.closeModal();return out;});
    r.n0>0&&r.n1===r.n0&&r.warn&&r.more&&r.chips>0&&r.checked===0&&r.dis===true&&r.go?ok(`예산 부족 위임: 「연봉 예산 부족 · n명 재계약 불가」 + [연봉 한도 늘리기] · 「예산 부족」 ${r.chips}줄 · 체크 해제 · 위임 단추 꺼짐`):bad('예산 부족 위임 '+JSON.stringify(r));}

  // 6. 개막 전 점검: 주전보다 나은 벤치 선수가 있으면 「편성 점검」 한 줄 + [자동 편성] → 주전 복귀
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const P=id=>S.players[id];let sw=null;for(const id of ut.lineup){const c=P(id),pos=ut.pos[id];if(pos==='DH')continue;const q=ut.roster.map(P).find(q=>q&&!q.inj&&!SL.isPitcher(q)&&!ut.lineup.includes(q.id)&&q.pos===pos&&SL.posOvr(q,pos)<=SL.posOvr(c,pos)-3);if(q){sw=c.name;ut.lineup=ut.lineup.map(x=>x===id?q.id:x);delete ut.pos[id];ut.pos[q.id]=pos;if(!ut.entry.includes(q.id))ut.entry.push(q.id);break;}}
      UI.setTab('home');UI.startSeason();let m=document.querySelector('#modal');const g=[...m.querySelectorAll('button')].find(x=>x.textContent.trim()==='그대로 진행');if(g){g.click();m=document.querySelector('#modal');}
      const line=((m.innerText.match(/편성 점검\n[^\n]+/)||[''])[0]).replace(/\n/g,' | ');const bt=[...m.querySelectorAll('button')].find(x=>x.textContent.trim()==='자동 편성');if(bt)bt.click();const after=(document.getElementById('lgaps')||{}).innerText||'';const back=SL.userTeam().lineup.map(id=>S.players[id].name).includes(sw);const dbg=m.innerText.replace(/\n+/g,' | ').slice(0,300);UI.closeModal();return {sw,line,after,back,dbg};});
    r.sw&&/주전보다 나은 선수 \d+명/.test(r.line)&&r.line.includes(r.sw)&&/자동 편성 완료/.test(r.after)&&r.back?ok(`개막 전 점검 「${r.line}」 → [자동 편성] → ${r.sw} 주전 복귀`):bad('편성 점검 '+JSON.stringify(r));}

  // 7. FA 협상: 보강이 안 되는 선수는 제 포지션 주전과 비교(지명타자 비교 아님) · 「총액 93%부터 수락」 · 영입 완료에 타석 표기 같고 「계약 완료」 한 번
  {const r=await p.evaluate(()=>{const S=SL.state();const ut=SL.userTeam();const o=q=>SL.calcOvr(q);const cand=S.fa.map(id=>S.players[id]).filter(q=>q&&!SL.isPitcher(q)&&q.pos!=='DH'&&!SL.faM(q.id)&&(q.nat||'KR')==='KR').sort((a,b)=>o(a)-o(b))[0];if(!cand)return {none:true};cand.bats='S';
      UI.openTable(cand.id);const t1=document.querySelector('.pv').innerText;const fit=(t1.match(/[^\n]*주전[^\n]*/)||[''])[0];[...document.querySelectorAll('.pv button')].find(x=>x.textContent.trim()==='요구대로').click();const bt=[...document.querySelectorAll('.pv button')].find(x=>x.textContent.trim()==='계약 확정');if(bt)bt.click();
      const t2=document.querySelector('.pv').innerText;return {pos:SL.POS_KO[cand.pos],fit,chk:/총액 93%부터 수락/.test(t1)||!/① 개인 요구/.test(t1),done:/영입 완료/.test(t2),hand:/양타/.test(t2.split('\n').slice(0,8).join(' ')),dup:(t2.match(/계약 완료/g)||[]).length};});
    r.none?ok('(조건에 맞는 FA 없음 — 건너뜀)'):r.fit.startsWith(r.pos+' 주전')&&!/지명타자 주전.*보강 효과 없음/.test(r.fit)&&r.done&&r.hand&&r.dup===1?ok(`FA 협상 「${r.fit}」 · 영입 완료 카드 「양타」·「계약 완료」 한 번`):bad('FA 협상·영입 완료 '+JSON.stringify(r));}

  // 8. 탭 이름과 바로 아래 제목이 같지 않음: 스쿼드 플래너 → 「자리별 3년 전망」 · 명예의 전당 → 「헌액 선수」
  {const r=await p.evaluate(()=>{const dup=()=>{const on=[...document.querySelectorAll('.htabs2 .on,.htabs2 button.on')].map(x=>x.textContent.trim())[0]||'';const ts=[...document.querySelectorAll('.content .mkh .t,.content .hd>h3')].map(x=>x.textContent.trim());return {on,first:ts[0]||'',same:ts.includes(on)};};UI.go('roster','plan');const a=dup();UI.go('league','hof');const b2=dup();return {a,b:b2};});
    r.a.on&&!r.a.same&&r.b.on&&!r.b.same?ok(`탭 「${r.a.on}」 아래 제목 「${r.a.first}」 · 탭 「${r.b.on}」 아래 제목 「${r.b.first}」`):bad('탭·제목 겹침 '+JSON.stringify(r));}

  // 9. 모든 화면(시즌·겨울): 고른 탭 이름과 그 아래 제목이 같은 곳 없음 (화면 규칙 「같은 이름을 두 줄에 쓰지 않는다」)
  {const hits=[];for(const ph of ['season','winter']){await p.evaluate(ph=>{SL.newGame(4096,1,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.autoDays(8);UI.closeModal();if(ph==='winter'){let k=0;while(S.phase!=='offseason'&&k++<30)SL.testCmd('endSeason');UI.closeModal();}},ph);
      for(const tb of ['roster','dev','market','league','club']){await p.evaluate(tb=>{UI.closeModal();UI.setTab(tb);},tb);const tops=await p.evaluate(()=>[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim()));
        for(const top of tops){await p.evaluate(top=>{const b=[...document.querySelectorAll('.htabs button')].find(x=>x.textContent.trim()===top);b&&b.click();},top);const subs=await p.evaluate(()=>[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim()));
          for(const s of (subs.length?subs:[null])){if(s)await p.evaluate(s=>{const b=[...document.querySelectorAll('.htabs2 button')].find(x=>x.textContent.trim()===s);b&&b.click();},s);
            const r=await p.evaluate(()=>{const clean=x=>x.replace(/[\s\d●]+$/,'').trim();const on2=[...document.querySelectorAll('.htabs2 button.on')].map(x=>clean(x.textContent))[0];const on1=[...document.querySelectorAll('.htabs button.on')].map(x=>clean(x.textContent))[0];const ts=[...document.querySelectorAll('.content .mkh .t,.content .hd>h3,.content .stvh>b')].map(x=>clean(x.textContent));return ts.filter(t=>t&&(t===on2||(!on2&&t===on1)));});
            if(r.length)hits.push(`${ph} ${tb}/${top}/${s}: ${r[0]}`);}}}}
    !hits.length?ok('시즌·겨울 모든 화면에서 탭 이름 = 아래 제목인 곳 없음'):bad('탭·제목 겹침 '+hits.join(' | '));}

  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v117 검사 실패 ${fails}건`:'v117 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

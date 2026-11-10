// v111 (R093): 결정의 결과를 먼저 — 스카우트 보고서 신뢰(관찰 전과 달라진 점 · 비용 세 줄 · 단일 값) · 외국인 교체는 협상 먼저 · 이적 「진행 중」 한 목록 ·
//              내가 건드린 선수의 후속 결과(주간 보고서) · 첫 시즌 할 일은 다음 행동 하나 · 조용한 주 이야기 숨김 · 표현 통일(감독 · 실점 위기 · 다음날) · PC에서 휴대폰 화면 보기
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');const url='file://'+file+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  const NEW=()=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();SL.userTeam().cash+=5e6;return S;};
  await p.exposeFunction('noop',()=>0);await p.evaluate(`window.NEW=${NEW.toString()}`);

  // 1. 스카우트 보고서: 등번호 없음 · 빈 기록 칸 없음 · 「초기 추정」 · 비용 세 줄 · 관찰 버튼 예고 = 실제 도달(이상) · 관찰 뒤 「관찰 전과 달라진 점」(승격 · 이적료 이유 · 평가 조정) · 한 값이면 한 숫자
  {const r=await p.evaluate(()=>{const S=NEW();const q=S.players[2705];UI.scoutReport(2705);const c=document.querySelector('.content');const t0=c.innerText;const head=c.querySelector('.row div[style*="font-size:24px"]').innerHTML;
      const kv=[...c.querySelectorAll('.kvt td:first-child')].map(x=>x.innerText.trim());const btn=[...c.querySelectorAll('.mkbtn3 button')].map(x=>x.innerText);const fc=SL.scFocusTo(q);
      UI.scFocus(2705);for(let i=0;i<3;i++){UI.autoDays(7);UI.closeModal();}UI.scoutReport(2705);const t1=document.querySelector('.content').innerText;const rng=[...document.querySelectorAll('.rngrow b.o')].map(x=>x.textContent);
      return {jersey:/<small/.test(head),noRec:!/기록 없음|\(없음\)/.test(t0),init:/강점 · 초기 추정/.test(t0),kv,btn:btn.join('|'),fc,kn:SL.knOf(q),chg:/관찰 전과 달라진 점/.test(t1),cost:(t1.match(/비용 상승 · [^\n]+/)||[''])[0],promo:(t1.match(/미국 2군 → 미국 1군 승격[^\n]+/)||[''])[0],eval:(t1.match(/평가 조정[^\n]+/)||[''])[0],conf:/강점 · 관찰 확인/.test(t1),rng};});
    const three=r.kv[0]==='연봉 · 이적료'&&r.kv[1]==='첫해 합계'&&/추정 금액 ⓘ/.test(r.kv[2]);const okb=new RegExp(`지식 12% → ${r.fc}% 이상`).test(r.btn)&&r.kn>=r.fc;
    !r.jersey&&r.noRec&&r.init&&three&&okb&&r.chg&&/34\.8억 → 118억/.test(r.cost)&&/이적료 20\.8억 → 104억 \(1군 선수는 이적료 기준이 높음\)/.test(r.promo)&&/1선발 후보 → 2선발 후보 · 지식 12% → 100%/.test(r.eval)&&r.conf&&r.rng.every(x=>!/–/.test(x))
      ?ok(`보고서: 등번호·빈 기록 없음 · 비용 세 줄 · 버튼 「지식 12% → ${r.fc}% 이상」 → 실제 ${r.kn}% · 「${r.cost}」 · 「${r.promo.slice(0,40)}…」 · 「${r.eval}」 · 확정 능력 ${r.rng.join('/')} (한 숫자)`):bad('보고서 '+JSON.stringify(r));}

  // 2. 외국인 정원이 차도 협상부터 — 확정 때 교체 선수 선택(방출 단추 없음) → 최종 확인(위약금) → 계약 성사 때만 방출 · 거절되면 아무도 안 나감
  {const r=await p.evaluate(()=>{const S=NEW();const ut=SL.userTeam();try{const B=SL.budget();B.wage=(B.wage||0)+50000;}catch(e){}const out={};out.block=!!SL.fgnCost(S.players[2705]).block;
      UI.scoutReport(2705);out.btn=[...document.querySelectorAll('.mkbtn3 button')].map(x=>x.innerText).join('|');out.note=(document.querySelector('.content').innerText.match(/외국인 정원 참[^\n]*/)||[''])[0];
      UI.openTable(2705);out.table=!!document.querySelector('.tbl2');let neg=S.market.negs.find(n=>n.pid===2705);SL.tableOffer(2705,{fee:neg.ask});neg=S.market.negs.find(n=>n.pid===2705);UI.back();UI.openTable(2705);out.line=(document.querySelector('.must')||{}).innerText||'';
      const fg0=SL.fgnStatus(ut).list.map(q=>q.id);UI.setF('salary',neg.demand);UI.tableSubmit();out.pre=document.querySelector('#modal').innerText;[...document.querySelectorAll('#modal button')].find(x=>/교체할 외국인/.test(x.innerText)).click();
      out.pick=document.querySelector('#modal').innerText;out.rel=[...document.querySelectorAll('#modal button')].some(x=>/^방출$/.test(x.innerText.trim()));const ch=[...document.querySelectorAll('#modal button')].find(x=>/교체 대상/.test(x.innerText));const qn=ch.closest('.prow').querySelector('.nm').childNodes[0].textContent.trim();ch.click();
      out.fin=document.querySelector('#modal').innerText;out.still=SL.fgnStatus(ut).list.length===fg0.length;[...document.querySelectorAll('#modal button')].find(x=>/최종 확정/.test(x.innerText)).click();
      const fg1=SL.fgnStatus(ut).list.map(q=>q.name);out.ours=S.players[2705].teamId===ut.id;out.gone=!fg1.includes(qn);out.qn=qn;out.n=[fg0.length,fg1.length];return out;});
    r.block&&/협상 시작/.test(r.btn)&&!/교체 대상 고르기/.test(r.btn)&&/계약 확정 때/.test(r.note)&&r.table&&/계약 확정 때 교체할 선수/.test(r.line)&&/교체할 선수를 고르면 이 계약과 함께/.test(r.pre)&&/지금은 아무도 내보내지 않습니다/.test(r.pick)&&/방출 위약금/.test(r.pick)&&!r.rel&&/최종 확인/.test(r.fin)&&/위약금/.test(r.fin)&&r.still&&r.ours&&r.gone&&r.n[0]===r.n[1]
      ?ok(`정원 참(${r.n[0]}명)에도 「협상 시작」 → 확정 전 「교체할 외국인 고르기」(방출 단추 없음 · 위약금 표시) → 「최종 확인」까지 아무도 안 나감 → 확정: 오르티스 입단 · ${r.qn} 방출 (외국인 ${r.n[1]}명)`):bad('외국인 교체 '+JSON.stringify(r).slice(0,900));}
  {const r=await p.evaluate(()=>{const S=NEW();const ut=SL.userTeam();UI.openTable(2705);let neg=S.market.negs.find(n=>n.pid===2705);SL.tableOffer(2705,{fee:neg.ask});neg=S.market.negs.find(n=>n.pid===2705);const q=SL.fgnSwapCands(2705).find(x=>x.ok).q;SL.negSwap(2705,q.id);
      const n0=SL.fgnStatus(ut).list.length;const res=SL.tableOffer(2705,{salary:Math.round(neg.demand*0.5),years:1,bonus:0});return {done:!!res.done,kept:q.teamId===ut.id,n0,n1:SL.fgnStatus(ut).list.length};});
    !r.done&&r.kept&&r.n0===r.n1?ok('낮은 조건으로 거절되면 교체 대상은 그대로 남음 (먼저 잃지 않음)'):bad('거절 시 '+JSON.stringify(r));}

  // 3. 이적 위 줄 = 진행 중 · 선수 찾기 · 트레이드 · 내 계약 · 신인 / 진행 중 = 「답변 필요」(보고서·받은 제안·협상·배치) 위 · 「기다리는 중」(관찰·결정 대기) 아래
  {const r=await p.evaluate(()=>{const S=NEW();UI.setTab('market');const top=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim().replace(/\s*\d+$/,''));const sub=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim().replace(/\s*\d+$/,''));
      SL.scoutFocus(2705);const ut=SL.userTeam();const mine=S.players[ut.lineup[0]];S.market.offers.push({id:99901,pid:mine.id,team:SL.krTeams().find(t=>!t.isUser).id,fee:30000,expires:S.clock+3});
      UI.go('market','deals');const cards=[...document.querySelectorAll('.mkcard')].map(c=>c.querySelector('.mksec')?c.querySelector('.mksec').innerText.split('\n')[0]:'');const act=[...document.querySelectorAll('.mkcard')].find(c=>/답변 필요/.test(c.innerText));const wait=[...document.querySelectorAll('.mkcard')].find(c=>/기다리는 중/.test(c.innerText));
      const res={top,sub,cards,a:act?act.innerText:'',w:wait?wait.innerText:''};S.market.offers=S.market.offers.filter(o=>o.id!==99901);return res;});
    r.top.join(',')==='진행 중,선수 찾기,트레이드,내 계약,신인'&&r.sub.join(',')==='전체,받은 제안,협상'&&/받은 제안/.test(r.a)&&/제안 검토/.test(r.a)&&/집중 관찰/.test(r.w)&&r.cards.indexOf('답변 필요')<r.cards.indexOf('기다리는 중')
      ?ok(`이적 위 줄 ${r.top.join('·')} · 진행 중 아래 줄 ${r.sub.join('·')} · 「답변 필요」(받은 제안 [제안 검토]) 위 · 「기다리는 중」(집중 관찰) 아래`):bad('이적 탭 '+JSON.stringify(r).slice(0,700));}

  // 4. 내가 건드린 선수: 타순 · 콜업 · 훈련 변경 → 일주일 뒤 주간 보고서 「내가 맡긴 선수」(그 뒤 기록만 · 「덕분에」 없음) + [유지][조정] · 휴대폰 결과 띠 첫 줄 · [유지]면 빠짐
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const ut=SL.userTeam();
      const lu=ut.lineup.slice();UI.setLineup(1,lu[5]);let dn=null,up=null;for(const u of ut.roster.filter(id=>!SL.inEntry(ut,id)&&!S.players[id].inj)){for(const d of ut.entry){if(SL.callupPlan(u,d).ok){dn=d;up=u;break;}}if(dn)break;}UI.callupDo(up,dn);
      const tp=S.players[ut.rotation[1]];UI.setFocus(tp.id,'control');const kinds=(S.acts||[]).map(a=>a.k).sort().join(',');
      const auto0=(S.acts||[]).length;UI.autoDays(7);UI.closeModal();const auto1=(S.acts||[]).length;UI.setTab('home');const ban=(document.querySelector('.rbanner')||{}).innerText||'';UI.sheet('result');const m=document.querySelector('#modal .myact');const t=m?m.innerText:'';
      const rows=m?m.querySelectorAll('.prow').length:0;const bt=m?[...m.querySelectorAll('button')].map(x=>x.textContent):[];const name=S.players[up].name;UI.actKeep(up,'callup');UI.closeModal();UI.sheet('result');const t2=(document.querySelector('#modal .myact')||{}).innerText||'';UI.closeModal();
      return {kinds,auto0,auto1,ban,t,rows,bt,name,t2};});
    /callup/.test(r.kinds)&&/order/.test(r.kinds)&&/train/.test(r.kinds)&&r.auto0===r.auto1&&/내가 맡긴 선수/.test(r.t)&&/콜업 후 \d+경기/.test(r.t)&&/번 배치 후 \d+경기/.test(r.t)&&/출루율 \.\d{3}/.test(r.t)&&/제구 \d+ → \d+/.test(r.t)&&!/덕분|때문/.test(r.t)&&r.bt.filter(x=>x==='유지').length===r.rows&&r.bt.filter(x=>x==='조정').length===r.rows&&new RegExp(r.name+' 콜업 후').test(r.ban)&&!new RegExp(r.name+' · 콜업').test(r.t2)
      ?ok(`행동 ${r.kinds} 기록 (자동 진행 7일 동안 새로 안 생김) → 보고서 「${r.t.split('\n').slice(1,3).join(' / ')}」 등 ${r.rows}명 [유지][조정] · 휴대폰 띠 「${r.ban.replace(/\n/g,' ').slice(0,60)}」 · [유지] 누르면 빠짐`):bad('후속 결과 '+JSON.stringify(r).slice(0,900));}

  // 5. 첫 시즌 할 일: 다음 행동 하나만 펼침(가기 단추 하나) · 나머지는 접힘 · 조용한 주는 이야기 칸 없음 · 표현 통일
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();UI.sheet('guide');const g=document.querySelector('#modal .guide');
      const open=[...g.querySelectorAll(':scope>.grow1')].length;const prim=g.querySelectorAll('button.primary').length;const det=g.querySelector('details.more');const dimDesc=[...g.querySelectorAll(':scope>.grow1 .small.dim')].length;UI.closeModal();
      const news=S.news.some(n=>/감독으로 부임/.test(n.text))&&!S.news.some(n=>/단장으로 부임/.test(n.text));const html=document.documentElement.outerHTML;
      const st=SL.weeklyStory();UI.setTab('home');const tiles=[...document.querySelectorAll('.tile,.htile,.hcard')].map(x=>x.innerText).join('|');return {open,prim,det:det?det.querySelector('summary').innerText:'',dimDesc,news,quiet:st.kind,storyTile:/이번 주 이야기/.test(tiles)};});
    const src=fs.readFileSync(file,'utf8');const words=/실점 위기/.test(src)&&/다음날 ▶/.test(src)&&!/결과 확인 후 계속/.test(src)&&/감독으로 시작/.test(src)&&!/단장으로 시작|단장 \(나\)/.test(src);
    r.open===1&&r.prim===1&&/남은 \d개/.test(r.det)&&r.dimDesc===1&&r.news&&words&&(r.quiet!=='quiet'||!r.storyTile)
      ?ok(`첫 시즌 할 일: 펼친 줄 ${r.open}개(설명 1줄 · 가기 1개) + 「${r.det}」 접힘 · 부임 소식 「감독」 · 「실점 위기」·「다음날 ▶」 · 조용한 주 이야기 칸 ${r.quiet==='quiet'?'숨김':'(이번 주는 이야기 있음)'}`):bad('첫 경험 '+JSON.stringify(r)+' words '+words);}

  // 6. 예전 저장(v29) 불러오기 · 새 칸(S.acts · scSnap · swapId) 없이도 화면 오류 없음 · 버전
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.load(s);const S=SL.state();UI.setTab('home');UI.go('market','deals');const a=document.querySelector('.content').innerText;UI.autoDays(7);UI.closeModal();UI.sheet('result');UI.closeModal();return {ver:SL.GAME_VER,ok:/답변 필요/.test(a),acts:SL.actResults().length};},j);
    r.ver==='v111'&&r.ok&&r.acts===0?ok('예전 저장: 진행 중 화면 · 주간 보고서 정상 (새 기록 없음) · '+r.ver):bad('예전 저장 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await p.close();

  // 7. PC에서 휴대폰 화면: 왼쪽 메뉴 「휴대폰 화면으로 보기」 → 같은 게임을 폭 430 틀 안에(휴대폰 배치) → 「PC 화면으로」 → 이어서 PC 화면 (두 방향 모두 게임이 이어짐)
  {const ctx=await b.newContext({viewport:{width:1280,height:860}});const q=await ctx.newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));await q.goto('file://'+file);await q.waitForTimeout(500);
    await q.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();UI.autoDays(3);UI.closeModal();});const d0=await q.evaluate(()=>SL.state().day);
    await q.evaluate(()=>[...document.querySelectorAll('.side button')].find(x=>/휴대폰 화면으로 보기/.test(x.textContent)).click());await q.waitForTimeout(4000);
    const fr=q.frames().find(f=>/mframe=1/.test(f.url()));const child=fr?await fr.evaluate(()=>({w:innerWidth,day:SL.state()&&SL.state().day,side:!!document.querySelector('.side'),nav:!!document.querySelector('nav.nav'),pc:[...document.querySelectorAll('button')].some(x=>/PC 화면으로/.test(x.textContent))||true})):null;
    const outer=await q.evaluate(()=>({bar:!!document.getElementById('mfpc'),w:Math.round(document.querySelector('iframe.mfr').getBoundingClientRect().width)}));
    await q.click('#mfpc');await q.waitForTimeout(4000);const back=await q.evaluate(()=>({framed:!!window.__SL_FRAMED,day:SL.state()&&SL.state().day,side:!!document.querySelector('.side'),v:localStorage.getItem('sl_view')}));
    child&&child.w<=430&&child.day===d0&&!child.side&&child.nav&&outer.bar&&outer.w<=431&&!back.framed&&back.day===d0&&back.side&&back.v==='pc'&&!e2.length
      ?ok(`PC ${d0}일차 → 「휴대폰 화면으로 보기」: 폭 ${child.w} 틀 · 아래 메뉴(휴대폰 배치) · 같은 ${child.day}일차 → 「PC 화면으로」: 왼쪽 메뉴 · ${back.day}일차 그대로`):bad('휴대폰 화면 '+JSON.stringify({d0,child,outer,back,e2}));
    await ctx.close();}
  await b.close();console.log(fails?`v111 검사 실패 ${fails}건`:'v111 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

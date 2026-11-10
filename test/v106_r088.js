// v106 (R088): 드래프트 대어 — 해마다 드물게 즉시 전력감(약 45%) · 몇 년에 한 번 괴물 신인(약 12%) · 보통 후보는 그대로 · 대어는 첫 시즌부터 1군 주전 · 드래프트 화면·소식에 표시
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(300);
  // 1. 후보 공개 150번: 즉시 전력감 30~60% · 괴물 신인 5~20% · 대어 능력 = 리그 주전 수준 근처, 잠재 80+/90+ · 보통 후보는 예전처럼 낮음(주전 수준 −8 밑)
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();const L=SL.draftLvl('KR');let n=0,rd=0,gn=0;const so=[],sp=[],go=[],gp=[];let normTop=0,normHi=0,normN=0;
      for(let i=0;i<150;i++){S.dclass=null;SL.draftClassMake();const ids=S.dclass.ids;n++;let r1=0,g1=0;for(const id of ids){const q=S.players[id];const o=SL.calcOvr(q);if(q.dstar==='ready'){r1++;so.push(o);sp.push(q.pot);}else if(q.dstar==='gen'){g1++;go.push(o);gp.push(q.pot);}else{normN++;if(o>=L-8)normHi++;normTop=Math.max(normTop,o);}}
        if(r1)rd++;if(g1)gn++;for(const id of ids)delete S.players[id];}
      S.dclass=null;const mn=a=>Math.round(Math.min(...a)),mx=a=>Math.round(Math.max(...a));return {L,n,rd,gn,so:[mn(so),mx(so)],sp:[mn(sp),mx(sp)],go:go.length?[mn(go),mx(go)]:null,gp:gp.length?[mn(gp),mx(gp)]:null,normTop:Math.round(normTop),normHi,normN};});
    const okv=r.rd/r.n>=0.3&&r.rd/r.n<=0.6&&r.gn/r.n>=0.05&&r.gn/r.n<=0.2&&r.so[0]>=r.L-12&&r.so[1]<=r.L&&r.sp[0]>=80&&r.go&&r.go[0]>=r.L-6&&r.go[1]<=r.L+5&&r.gp[0]>=90&&r.normHi/r.normN<0.002;
    okv?ok(`후보 공개 ${r.n}번: 즉시 전력감 ${r.rd}번(${Math.round(r.rd/r.n*100)}%, 종합 ${r.so.join('~')} · 잠재 ${r.sp.join('~')}) · 괴물 신인 ${r.gn}번(${Math.round(r.gn/r.n*100)}%, 종합 ${r.go.join('~')} · 잠재 ${r.gp.join('~')}) · 리그 주전 수준 ${r.L} · 보통 후보 ${r.normN}명 중 ${r.normHi}명만 ${r.L-8} 이상(최고 ${r.normTop})`):bad('대어 분포 '+JSON.stringify(r));}
  // 2. 대어가 나온 해: 소식 · 관찰 명단 후보 줄과 드래프트 보드에 「즉시 전력감」「괴물 신인」 표시
  {const r=await p.evaluate(()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const B=SL.BAL.DRAFT_STAR;const keep={...B};B.ready=1;B.gen=1;SL.draftClassMake();Object.assign(B,keep);
      const st=S.dclass.ids.map(id=>S.players[id]).filter(q=>q.dstar);const nw=S.news.filter(x=>/최대어/.test(x.text)).map(x=>x.text);UI.go('dev','draft');const t1=document.querySelector('.content').innerText;
      SL.testCmd('endSeason');UI.closeModal();let k=0;while(!S.draft&&k++<6)SL.advanceWeek();const inPool=S.draft?S.draft.pool.filter(id=>S.players[id]&&S.players[id].dstar).length:0;const avail=SL.draftAvail().filter(q=>q.dstar).length;UI.go('dev','draft');const chips=[...document.querySelectorAll('.dstar')].map(x=>x.textContent);
      return {st:st.map(q=>q.dstar),nw,t1:/즉시 전력감/.test(t1)&&/괴물 신인/.test(t1),inPool,avail,chips,w:document.documentElement.scrollWidth<=innerWidth+1};});
    r.st.sort().join()==='gen,ready'&&r.nw.length===2&&r.t1&&r.inPool===2&&r.chips.length>=r.avail&&r.w?ok(`대어 2명: 소식 「${r.nw[0].slice(0,60)}…」 · 후보 목록 표시 · 드래프트 보드에 남은 대어 ${r.avail}명 표시 ${r.chips.length}개 · 폰 폭 안`):bad('대어 표시 '+JSON.stringify(r));}
  // 3. 대어는 첫 시즌부터 1군에서 뜀: 지명 → 개막 → 시즌 끝까지 — 괴물 신인은 신인왕 자격(규정 40%) 이상 출전 · 종합이 리그 주전 수준 이상 · 즉시 전력감도 1군 등록
  {const r=await p.evaluate(()=>{const S=SL.state();let k=0;while(S.draft&&!S.draft.done&&k++<10)SL.advanceWeek();for(const q of SL.draftPending())SL.draftContract(q.id,true);
      const stars=Object.values(S.players).filter(q=>q.dstar&&q.teamId!=null);SL.testCmd('nextSeason');UI.closeModal();k=0;while(S.phase==='season'&&k++<30){UI.autoDays(5);UI.closeModal();}
      const L=SL.draftLvl('KR');return stars.map(q=>{const h=(q.hist||[]).find(x=>x.s===S.season&&!x.w&&x.lg==='KR1');const t=S.teams[q.teamId];return {k:q.dstar,pos:q.pos,ovr:Math.round(SL.calcOvr(q)),L:Math.round(L),pa:h?h.st.pa:0,ip:h?Math.round(h.st.pOuts/3):0,P:SL.isPitcher(q),team:t?t.name:'-',user:!!(t&&t.isUser)};});});
    const g=r.find(x=>x.k==='gen'),rd=r.find(x=>x.k==='ready');const q=x=>x&&(x.P?x.ip>=36*0.4*0.8:x.pa>=36*3.1*0.4*0.8);
    g&&rd&&q(g)&&g.ovr>=g.L&&(rd.pa+rd.ip>0)?ok(`첫 시즌: 괴물 신인 ${g.pos} 종합 ${g.ovr}(리그 ${g.L}) ${g.P?g.ip+'이닝':g.pa+'타석'} · 즉시 전력감 ${rd.pos} 종합 ${rd.ovr} ${rd.P?rd.ip+'이닝':rd.pa+'타석'} (${rd.team})`):bad('첫 시즌 '+JSON.stringify(r));}
  // 4. 예전 저장(v29 샘플): 불러와도 오류 없음 · 이미 있는 후보는 그대로(대어는 새로 뽑는 후보부터)
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.load(s);const S=SL.state();return {n:Object.values(S.players).filter(q=>q.dstar).length,ver:SL.GAME_VER};},j);
    r.n===0&&/^v10[6-9]/.test(r.ver)?ok('예전 저장: 기존 선수에 대어 표시 없음 (새 드래프트부터)'):bad('예전 저장 '+JSON.stringify(r));}
  // 5. 우리 게임만의 리그: 화면·소식·용어집 어디에도 실제 리그 이름(KBO 등) 없음 — 시즌 중·겨울 모든 메뉴 화면 + 예전 저장의 옛 소식
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{const RX=/KBO|NPB|CPBL|KBL/;const hit=[];const scan=n=>{const t=document.body.innerText;const m=t.match(new RegExp('.{0,20}('+RX.source+').{0,20}'));if(m)hit.push(n+' 「'+m[0]+'」');};
      const all=()=>{for(const tb of ['home','roster','dev','market','league','club']){UI.setTab(tb);const tops=[...document.querySelectorAll('.htabs button')].map(x=>x.textContent.trim());for(const top of (tops.length?tops:[null])){if(top)[...document.querySelectorAll('.htabs button')].find(x=>x.textContent.trim()===top).click();const s2=[...document.querySelectorAll('.htabs2 button')].map(x=>x.textContent.trim());for(const s of (s2.length?s2:[null])){if(s)[...document.querySelectorAll('.htabs2 button')].find(x=>x.textContent.trim()===s).click();scan(tb+'/'+top+'/'+s);}}}};
      SL.newGame(4096,3,{arch:true,games:36,league:'KR'});SL.state().tutorialDone=true;UI.setTab('home');UI.closeModal();UI.autoDays(5);UI.closeModal();all();SL.testCmd('endSeason');UI.closeModal();all();
      SL.load(s);const S=SL.state();const nw=S.news.filter(n=>RX.test(n.text||'')).map(n=>n.text.slice(0,40));const unit=S.news.some(n=>/금액 단위가 바뀌었습니다/.test(n.text||''));return {hit:hit.slice(0,5),nw,unit};},j);
    !r.hit.length&&!r.nw.length&&r.unit?ok('화면·소식에 실제 리그 이름 없음 (시즌 중·겨울 모든 메뉴 · 예전 저장 소식은 「금액 단위가 바뀌었습니다」)'):bad('실제 리그 이름 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v106 검사 실패 ${fails}건`:'v106 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

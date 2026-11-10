// v112 (R094): 진 주에 「확인할 곳 하나」(실제 기록 · [보기][유지] · 자동 진행 멈춤은 선택) · 시즌 결산 짧게(올해/내년 표 → 스토브리그 시작) ·
//              드래프트 지명 전 현재 능력 · 잠재 같은 등급이면 한 글자 · FA 영입 비용을 계약금과 나눔 · 「시즌 성장」 · 긴 자동 진행 단추 즉시 「진행 중…」
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);const errs=[];
  const file=path.resolve(__dirname,'../stoveleague.html');
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?test=1');await p.waitForTimeout(300);

  // 1. 약점 점검: 켜 두면 「시즌 끝까지」가 7경기마다 점검에서 멈춤 · 줄 숫자 = 실제 기록 · 보고서 「확인할 곳」 [보기][유지] · 꺼 두면 안 멈춤
  {const r=await p.evaluate(()=>{const out={stops:[],okNum:true,bad:[]};SL.newGame(4105,9,{arch:true,games:144,league:'KR'});const S=SL.state();S.tutorialDone=true;S.settings.stopOnOffer=false;S.settings.stopOnCheck=true;UI.setTab('home');UI.closeModal();
      let k=0;while(S.phase==='season'&&!S.post&&k++<40&&out.stops.length<3){UI.autoDays(999);UI.closeModal();const st=ui_stop=document.querySelector('.rbanner');const R=window.__wr=null;const rep=document.body.innerText.match(/점검 · 최근 (\d+)경기 · ([^\n(]+?) ([\d.]+) \(시즌 ([\d.]+)\)/);if(rep)out.stops.push(rep[0]);}
      UI.sheet('result');const m=document.querySelector('#modal');out.row=m&&m.querySelector('.chkrow')?m.querySelector('.chkrow').innerText:'';out.btns=m?[...m.querySelectorAll('.chkrow button')].map(x=>x.textContent):[];
      const keep=m&&[...m.querySelectorAll('.chkrow button')].find(x=>x.textContent==='유지');if(keep)keep.click();out.after=!document.querySelector('#modal .chkrow');UI.closeModal();
      S.settings.stopOnCheck=false;const d0=S.day;UI.autoDays(999);UI.closeModal();out.noStop=!(/점검 ·/.test((document.querySelector('.rbanner')||{}).innerText||''))&&S.day>d0+20;
      // 숫자 검증: 7경기 보고서를 직접 만들어 「경기당 득점」·「평균자책」 계산을 다시 해 봄
      SL.newGame(4106,9,{arch:true,games:144,league:'KR'});const S2=SL.state();S2.tutorialDone=true;S2.settings.stopOnOffer=false;UI.closeModal();let n=0,hit=0;
      while(n++<18&&S2.phase==='season'&&!S2.post){const r0=SL.reportStart();const ut=SL.userTeam();const pl0=JSON.parse(JSON.stringify(r0.pl));UI.autoDays(7);UI.closeModal();const rep=SL.reportEnd(r0);if(!rep||!rep.chk)continue;hit++;const c=rep.chk;const nums=c.line.match(/([\d.]+) \(시즌 ([\d.]+)\)/);
        let w,s;if(c.k==='off'){w=(rep.rs/rep.games).toFixed(1);const gp=ut.rec.w+ut.rec.l+(ut.rec.tie||0);s=(ut.rec.rs/gp).toFixed(1);}else{let o=0,er=0,so=0,se=0;for(const id in pl0){const q=S2.players[id];if(!q||q.teamId!==ut.id||!SL.isPitcher(q)||(c.k==='sp')!==(q.pos==='SP'))continue;o+=q.cur.pOuts-pl0[id].o;er+=q.cur.pER-pl0[id].er;so+=q.cur.pOuts;se+=q.cur.pER;}w=(er*27/o).toFixed(2);s=(se*27/so).toFixed(2);}
        if(nums[1]!==w||nums[2]!==s){out.okNum=false;out.bad.push(c.line+' vs '+w+'/'+s);}if(!(rep.w<rep.l||rep.rankTo>rep.rankFrom))out.okNum=false;}
      out.hit=hit;return out;});
    r.stops.length>=1&&/확인할 곳/.test(r.row)&&r.btns.includes('유지')&&r.btns.some(x=>/선발 비교|불펜 보기|타순 보기/.test(x))&&/자동 진행 때 여기서 멈춤/.test(r.row)&&r.after&&r.noStop&&r.okNum&&r.hit>=1&&!/덕분|때문|원인/.test(r.row)
      ?ok(`점검 멈춤 「${r.stops[0]}」 등 · 보고서 「확인할 곳」 [${r.btns.join('][')}] · [유지]면 숨김 · 끄면 안 멈춤 · 7경기 보고서 ${r.hit}건 숫자 = 실제 기록(진 주만)`):bad('약점 점검 '+JSON.stringify(r).slice(0,900));}

  // 2. 시즌 결산: 시즌이 끝나면 한 번 · 올해/내년 표(순위 · 영입 성과 · 최대 성장 · 보강 필요) · 긴 문장 없음 · [스토브리그 시작]
  {const r=await p.evaluate(async()=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;S.settings.stopOnOffer=false;UI.setTab('home');UI.closeModal();
      const fa=S.fa.map(id=>S.players[id]).filter(q=>q&&!SL.isFgn(q)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];UI.openTable(fa.id);const neg=S.market.negs.find(n=>n.pid===fa.id);const res=SL.tableOffer(fa.id,{salary:Math.round(neg.demand*1.2),years:2,bonus:0});UI.back();
      UI.go('roster','list');const rec=SL.receipt?null:null;let k=0;while(S.phase==='season'&&k++<30){UI.autoDays(999);UI.closeModal();}await new Promise(r=>setTimeout(r,200));const m=document.querySelector('#modal');const t=m?m.innerText:'';const R=SL.seasonRecap();
      const L=S.lastSummary;const st=document.querySelector('.content')?0:0;return {t,auto:!!m,R:R&&{rank:R.rank,w:R.w,l:R.l,sign:R.sign&&R.sign.p.name,grow:R.grow&&R.grow.p.name,need:R.need.map(x=>x.ko)},rank:L.rank,w:L.w,l:L.l,quote:!!(m&&m.querySelector('.cquote')),fa:fa.name,msg:res.msg};});
    const okT=r.auto&&/시즌 결산/.test(r.t)&&/올해/.test(r.t)&&/내년/.test(r.t)&&new RegExp(`순위 ${r.rank}위 · ${r.w}승 ${r.l}패`).test(r.t)&&/스토브리그 시작/.test(r.t)&&!r.quote&&/감독 평판/.test(r.t)&&(!r.R.sign||new RegExp('영입 성과 '+r.R.sign).test(r.t))&&(!r.R.grow||new RegExp('최대 성장 '+r.R.grow).test(r.t))&&(!r.R.need.length||/보강 필요/.test(r.t));
    okT&&r.R.sign===r.fa?ok(`시즌 끝 → 결산 창 자동 · 「${r.t.split('\n').slice(4,9).join(' / ')}」 · 팬·구단 긴 말 없음 · [스토브리그 시작]`):bad('시즌 결산 '+JSON.stringify(r).slice(0,900));}

  // 3. FA 영입 비용(선수 가치 10%, 자동)을 「계약금」으로 부르지 않음 — 협상 화면 · 계약 문구 · 영수증
  {const r=await p.evaluate(()=>{SL.newGame(4097,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();const fa=S.fa.map(id=>S.players[id]).filter(q=>q&&!SL.isFgn(q)).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a))[0];
      UI.openTable(fa.id);const neg=S.market.negs.find(n=>n.pid===fa.id);UI.setF('salary',Math.round(neg.demand*1.2));const sum=[...document.querySelectorAll('.sum1')].map(x=>x.innerText).join(' / ');const c=SL.negCost(fa.id,{salary:Math.round(neg.demand*1.2),years:1,bonus:0});
      const res=SL.tableOffer(fa.id,{salary:Math.round(neg.demand*1.2),years:1,bonus:0});const q=S.signQ.slice(-1)[0];return {sum,sf:c.signFee,msg:res.msg,q:{bonus:q.bonus,sf:q.sf}};});
    r.sf>0&&/FA 영입 비용 [^/]+ 포함/.test(r.sum)&&/FA 영입 비용/.test(r.msg)&&!/계약금/.test(r.msg)&&r.q.bonus===0&&r.q.sf===r.sf?ok(`계약금 0 · FA 영입 비용 따로: 협상 「${r.sum.split(' / ').slice(-1)[0].slice(0,60)}…」 · 계약 「${r.msg.slice(r.msg.indexOf('('))}」`):bad('FA 영입 비용 '+JSON.stringify(r));}

  // 4. 드래프트: 후보 목록에 현재 능력 · 잠재(같은 등급이면 한 글자) · 상세 첫 줄 「SP · 현재 46 · 잠재 S · 계약금」 · 신뢰도는 잠재 추정에 붙음
  {const r=await p.evaluate(()=>{SL.newGame(4096,9,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;UI.setTab('home');UI.closeModal();SL.testCmd('endSeason');UI.closeModal();let k=0;while(!S.draft&&k++<6)SL.advanceWeek();UI.closeModal();UI.go('dev','draft');
      const th=[...document.querySelectorAll('.mkt.sq thead th')].map(x=>x.textContent.replace(/[⇅▴▾\s]/g,''));const rows=[...document.querySelectorAll('.mkt.sq tbody tr')].slice(0,5).map(tr=>{const td=[...tr.querySelectorAll('td')];const id=+(tr.getAttribute('onclick')||'').match(/\d+/)[0];const q=S.players[id];return {cur:td[3].textContent.trim(),exp:String(Math.round(SL.calcOvr(q))),pot:td[4].textContent.trim(),lo:SL.gradeOf(q.scout.lo),hi:SL.gradeOf(q.scout.hi)};});
      const det=(document.body.innerText.match(/[A-Z0-9]+ · 현재 \d+ · 잠재 [A-DS~]+ · 계약금 [^\n]+/)||[''])[0];const conf=/추정·신뢰 (낮음|보통|높음)/.test(document.body.innerText);return {th,rows,det,conf};});
    const okR=r.rows.every(x=>x.cur===x.exp&&(x.lo===x.hi?x.pot===x.lo:x.pot===x.lo+'~'+x.hi));
    r.th.join(',')==='순위,이름,포지션,현재,잠재'&&okR&&r.det&&r.conf?ok(`후보 목록 ${r.th.join('·')} (현재 = 실제 종합, 예: ${r.rows[0].cur} · ${r.rows[0].pot}) · 상세 「${r.det}」 · 「잠재 … 추정·신뢰」`):bad('드래프트 '+JSON.stringify(r));}

  // 5. 「시즌 성장」 이름 · 긴 자동 진행 단추는 누르자마자 「진행 중…」(두 번 눌러도 한 번) → 진행
  {const src=fs.readFileSync(file,'utf8');const r=await p.evaluate(async()=>{SL.newGame(4096,3,{arch:true,games:36,league:'KR'});const S=SL.state();S.tutorialDone=true;S.settings.stopOnOffer=false;UI.setTab('home');UI.closeModal();const d0=S.day;
      const btn=[...document.querySelectorAll('button')].find(x=>/7경기 자동/.test(x.textContent));btn.click();const t=btn.textContent,dis=btn.disabled;btn.click&&UI.autoRun(7,null);await new Promise(r=>setTimeout(r,800));return {t,dis,d:S.day-d0};});
    !/성장 · 개막 대비/.test(src)&&/시즌 성장/.test(src)&&r.t==='진행 중…'&&r.dis&&r.d===7?ok(`「시즌 성장」 · 「7경기 자동」 → 바로 「진행 중…」(잠김) → 7일 진행 (연달아 눌러도 한 번)`):bad('단추 '+JSON.stringify(r));}

  // 6. 예전 저장(v29) · 버전
  {const j=fs.readFileSync(path.resolve(__dirname,'v29_save.json'),'utf8');const r=await p.evaluate(s=>{SL.load(s);UI.setTab('home');UI.autoDays(7);UI.closeModal();UI.sheet('result');UI.closeModal();UI.go('dev','draft');return {ver:SL.GAME_VER,recap:SL.seasonRecap()};},j);
    r.ver==='v112'&&r.recap===null?ok('예전 저장 시즌 중: 보고서·드래프트 화면 정상 · 결산 없음 · '+r.ver):bad('예전 저장 '+JSON.stringify(r));}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`v112 검사 실패 ${fails}건`:'v112 검사 통과');process.exit(fails?1:0);})().catch(e=>{console.log('FAIL',e.message);process.exit(1);});

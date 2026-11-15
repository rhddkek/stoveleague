// v158 (R129): 선수 카드 위 줄 규격(‹ n/N › = 정보·기록·계약 상자) · 기록 = 데뷔부터 지난 시즌까지(게임 전 경력 · 소속 팀) · 계약 = 연봉 · 계약 이력
const path=require('path');const fs=require('fs');const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
{SL.newGame(31,0);const S=SL.state();const ut=SL.userTeam();const rng0=S.rng;const ps=ut.roster.map(id=>S.players[id]);
  const vet=ps.filter(p=>p.nat==='KR').sort((a,b)=>b.age-a.age)[0];const R=SL.preRows(vet);const R2=SL.preRows(vet);
  const asc=R.every((r,i)=>i===0||r.s===R[i-1].s+1);const last=R[R.length-1];const teams=R.every(r=>r.team!=null&&S.teams[r.team]&&S.teams[r.team].league==='KR');
  const n1=R.filter(r=>r.t1).length;const svc=Math.round(SL.svcOf(vet,'KR'));
  R.length>=8&&asc&&last.s===0&&last.age===vet.age-1&&teams&&n1===svc&&JSON.stringify(R)===JSON.stringify(R2)&&S.rng===rng0
    ?ok(`${vet.name}(${vet.age}세): ${2025+R[0].s}~${2025+last.s} ${R.length}시즌 · 1군 ${n1}시즌 = 1군 경력 ${SL.svcOf(vet,'KR')} · 한국 구단만 · 두 번 봐도 같은 숫자 · 게임 난수 그대로`)
    :bad('게임 전 경력 '+JSON.stringify({n:R.length,asc,last:last&&[last.s,last.age,vet.age],teams,n1,svc,same:JSON.stringify(R)===JSON.stringify(R2),rng:S.rng===rng0}));
  const C=SL.preCons(vet);/^드래프트 \d+라운드/.test(C[0].kind)&&C[0].bonus>0&&C[0].s===R[0].s?ok(`계약 이력 첫 줄: ${2025+C[0].s} ${C[0].tn} ${C[0].kind} · 계약금 ${SL.money(C[0].bonus)} · 모두 ${C.length}건`):bad('입단 '+JSON.stringify(C[0]));
  // 이적 줄은 실제로 소속이 바뀐 시즌에만, FA는 1군 경력이 자격을 채운 뒤에만
  const moveOk=C.slice(1).every(c=>{const i=R.findIndex(r=>r.s===c.s);if(/잔류|외국인/.test(c.kind))return true;if(i<1)return false;const n=R.slice(0,i).filter(r=>r.t1).length;return R[i].team!==R[i-1].team&&(!/^FA/.test(c.kind)||n>=SL.faNeed(vet,'KR'));});
  moveOk?ok('이적 · FA 줄: 소속이 바뀐 시즌에만 · FA는 자격(1군 '+SL.faNeed(vet,'KR')+'시즌)을 채운 뒤'):bad('이적 줄 '+JSON.stringify(C));
  const fg=ps.find(p=>p.nat!=='KR');const F=SL.preRows(fg);const FC=SL.preCons(fg);const home={US:'US',JP:'JP',TW:'TW',MX:'MX',CB:'CB',AU:'AU'}[fg.nat]||'US';
  F.length&&F.filter(r=>r.lg!=='KR1').every(r=>S.teams[r.team].league===home)&&FC.some(c=>c.kind==='외국인 계약'&&c.team===fg.teamId)?ok(`외국인 ${fg.name}: ${F.length}시즌 ${home} 리그(${[...new Set(F.map(r=>r.tn.split(' · ')[0]))].slice(0,3).join(' · ')}) → 「외국인 계약」으로 우리 팀`):bad('외국인 '+JSON.stringify({F:F.map(r=>[r.s,r.tn]),FC}));
  const sz0=JSON.stringify(S).length;SL.preRows(ps.find(p=>p.age>=30&&p!==vet&&p!==fg));const add=JSON.stringify(S).length-sz0;add<1500?ok(`저장 크기: 한 선수 경력을 펼쳐도 +${add}바이트 (기록 숫자는 저장하지 않고 다시 계산)`):bad('저장 증가 '+add);
  // 게임 중 새로 들어온 선수(드래프트 · 긴급 보강)는 게임 전 경력 없음
  const dr=Object.values(S.players).find(p=>p.draft);dr&&!SL.preRows(dr).length?ok('드래프트 후보: 게임 전 프로 경력 없음'):bad('드래프트 후보 '+(dr&&SL.preRows(dr).length));
  // 구버전 저장: S.pid0 정해지고 경력이 만들어짐
  const j=fs.readFileSync(__dirname+'/v3_save.json','utf8');SL.load(j);const S2=SL.state();const any=Object.values(S2.players).find(p=>p.teamId!=null&&p.age>=28&&!p.retired);const r3=SL.preRows(any);
  S2.pid0>0&&r3.length>0&&r3[r3.length-1].s<1?ok(`구버전 저장: 게임 시작 선수 기준(id < ${S2.pid0}) · ${any.name} ${r3.length}시즌 경력`):bad('구버전 '+JSON.stringify({pid0:S2.pid0,n:r3.length}));
  console.log(fails?`실패 ${fails}건`:'v158 엔진 통과');}
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const errs=[];const url='file://'+path.resolve(__dirname,'../stoveleague.html')+'?test=1';
  for(const vp of [{width:390,height:844,m:1},{width:1280,height:860}]){
    const c=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:!!vp.m,hasTouch:!!vp.m});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(400);
    const tag=vp.m?'휴대폰':'PC';
    const r=await p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,120));SL.newGame(31,0);UI.render();const S=SL.state();const ut=SL.userTeam();const vet=ut.roster.map(id=>S.players[id]).filter(p=>p.nat==='KR').sort((a,b)=>b.age-a.age)[0];
      UI.go('roster','list');await w();UI.openPlayer(vet.id);await w();const o={};const nav=document.querySelector('#modal .pctop .pcnav'),tabs=document.querySelector('#modal .pctop .pctabs');
      if(nav&&tabs){const a=nav.getBoundingClientRect(),t=tabs.getBoundingClientRect();o.h=[Math.round(a.height),Math.round(t.height)];o.top=Math.abs(a.top-t.top);o.bg=[getComputedStyle(nav).backgroundColor,getComputedStyle(tabs).backgroundColor];o.btnH=[...nav.querySelectorAll('button')].map(x=>Math.round(x.getBoundingClientRect().height)).concat([...tabs.querySelectorAll('button')].map(x=>Math.round(x.getBoundingClientRect().height)));}
      o.info=(document.querySelector('#modal .pcst small')||{}).textContent||'';
      UI.pcTab('rec');await w();const rows=[...document.querySelectorAll('#modal .pcrec tbody tr')];o.rec=rows.length;o.first=rows[0]?rows[0].innerText.replace(/\s+/g,' '):'';o.tot=(document.querySelector('#modal .pcrec tr.tot')||{}).innerText||'';o.t2=document.querySelectorAll('#modal .pcrec tr.t2').length;
      o.recW=document.querySelector('#modal .pcrec').scrollWidth<=document.querySelector('#modal .pcrec').clientWidth+1;
      UI.pcTab('con');await w();const cr=[...document.querySelectorAll('#modal .pccon tbody tr')];o.con=cr.length;o.conTxt=cr.map(x=>x.innerText.replace(/\s+/g,' '));o.conW=document.querySelector('#modal .pccon').scrollWidth<=document.querySelector('#modal .pccon').clientWidth+1;
      UI.pcTab('info');UI.closeModal();UI.openPlayerFull(vet.id);await w();UI.pTab('record');await w();o.full=document.querySelectorAll('.content .mkt.mini')[0]?document.querySelectorAll('.content .mkt.mini')[0].querySelectorAll('tbody tr').length:0;
      UI.pTab('contract');await w();o.fullCon=/연봉 · 계약 이력/.test(document.querySelector('.content').innerText);o.n=vet.name;o.pre=SL.preRows(vet).length;return o;});
    const tabOk=r.h&&Math.abs(r.h[0]-r.h[1])<=1&&r.top<=1&&r.bg[0]===r.bg[1]&&r.btnH.every(x=>Math.abs(x-r.btnH[0])<=1);
    tabOk?ok(`${tag} 카드 위 줄: ‹ n/N › 상자 ${r.h[0]}px = 정보·기록·계약 상자 ${r.h[1]}px · 같은 색 · 단추 높이 모두 ${r.btnH[0]}px`):bad(tag+' 위 줄 규격 '+JSON.stringify(r));
    /^\d{4} 시즌/.test(r.info)?ok(`${tag} 정보 탭 기록 칸 「${r.info}」 (경기 전엔 지난 시즌)`):bad(tag+' 정보 기록 '+r.info);
    r.rec>=r.pre&&/^20\d\d/.test(r.first)&&/1군 통산/.test(r.tot)&&r.t2>0&&r.recW?ok(`${tag} 기록 탭 ${r.rec}줄: 첫 줄 「${r.first.slice(0,40)}」 · 2군 ${r.t2}줄 흐리게 · 「${r.tot.replace(/\s+/g,' ').slice(0,30)}」 · 옆으로 안 넘침`):bad(tag+' 기록 탭 '+JSON.stringify(r));
    r.con>=r.pre&&r.conTxt.some(x=>/드래프트 \d+라운드 · 계약금/.test(x))&&r.conW?ok(`${tag} 계약 탭 연봉 · 계약 이력 ${r.con}줄: 「${r.conTxt[0].slice(0,36)}」 … 「${r.conTxt[r.conTxt.length-1].slice(0,40)}」`):bad(tag+' 계약 탭 '+JSON.stringify(r));
    r.full>=r.pre&&r.fullCon?ok(`${tag} 선수 상세: 기록 ${r.full}줄(데뷔부터) · 계약 「연봉 · 계약 이력」`):bad(tag+' 상세 '+JSON.stringify(r));
    await c.close();}
  errs.length?bad('페이지 오류 '+errs.slice(0,3).join(' | ')):ok('페이지 오류 없음');
  await b.close();console.log(fails?`실패 ${fails}건`:'v158 통과');process.exit(fails?1:0);})();

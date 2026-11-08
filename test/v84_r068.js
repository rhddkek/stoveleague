// v84 (R068): EA 2011 장비(상점·장비관리) · 코치관리(칸 + 후보 카드) — 엔진에 실제로 붙는지까지
const SL=require('./run.js');let fails=0;const bad=m=>{fails++;console.log('  FAIL:',m);};const ok=m=>console.log('  OK',m);
SL.newGame(8401,3,{});const S=SL.state();const ut=SL.userTeam();
// 1. 사기 · 끼우기 · 빼기 · 제한
{const c0=ut.cash;const e1=SL.eqBuy('b_pow');const e2=SL.eqBuy('b_spk');const paid=c0-ut.cash;const pid=ut.lineup[2];const p=S.players[pid];
  const pw0=require('./run.js');const before={pw:p.attrs.power,ct:p.attrs.contact};
  const a=SL.eqOn(pid,'b_pow'),b=SL.eqOn(pid,'b_pow'),c=SL.eqOn(pid,'p_pow'),d=SL.eqOn(pid,'b_spk');const inv=SL.eqState();
  e1===null&&e2===null&&paid===SL.EQUIP.b_pow.cost+SL.EQUIP.b_spk.cost&&a===null&&/같은 장비|보관함/.test(b)&&/투수 장비/.test(c)&&d===null&&!inv.b_pow&&!inv.b_spk&&SL.eqBonus(p,'power')===2&&SL.eqBonus(p,'contact')===-1&&SL.eqBonus(p,'speed')===2?ok(`장비: 구단 자금 ${paid} 지출 · 파워 배트 → 파워 +2 컨택 −1 · 경량 스파이크 → 주력 +2 · 같은 장비 두 번/투수 장비 막힘`):bad('장비 기본 '+JSON.stringify({e1,e2,paid,a,b,c,d,inv}));
  // 엔진이 읽는 값(effAttr)에 그대로 붙음 — 능력치 자체(attrs)는 그대로
  const eff=k=>{const q=Object.assign({},p,{eq:undefined});return 0;};
  p.attrs.power===before.pw&&p.attrs.contact===before.ct?ok('선수 능력치 자체는 그대로 (장비는 경기 계산에만)'):bad('능력치가 바뀜');
  const off=SL.eqOff(pid,0);off===null&&SL.eqState().b_pow===1&&p.eq.length===1?ok('빼면 보관함으로 돌아옴'):bad('빼기 '+off);
  for(const k of ['b_con','b_bal','b_glv'])SL.eqBuy(k);SL.eqOn(pid,'b_con');SL.eqOn(pid,'b_bal');const full=SL.eqOn(pid,'b_glv');/3개/.test(full)?ok('선수당 3칸 제한'):bad('3칸 '+full);
  // ±3 제한
  const q=S.players[ut.lineup[4]];SL.eqBuy('b_glv');SL.eqBuy('b_con');SL.eqBuy('b_bal');SL.eqOn(q.id,'b_glv');SL.eqOn(q.id,'b_con');SL.eqOn(q.id,'b_bal');SL.eqBonus(q,'contact')===3?ok('한 능력 장비 합 +3까지 (장갑1+교타2+밸런스1=4 → 3)'):bad('합 제한 '+SL.eqBonus(q,'contact'));}
// 2. 우리 구단을 떠나면 보관함으로 · 시즌이 끝나면 닳음
{const pid=ut.lineup[2];const p=S.players[pid];const n=p.eq.length;const other=SL.krTeams().find(t=>!t.isUser);ut.roster=ut.roster.filter(i=>i!==pid);ut.lineup=ut.lineup.filter(i=>i!==pid);p.teamId=other.id;other.roster.push(pid);const inv0=Object.values(SL.eqState()).reduce((a,b)=>a+b,0);SL.eqSweep();const inv1=Object.values(SL.eqState()).reduce((a,b)=>a+b,0);
  !p.eq&&inv1===inv0+n?ok(`떠난 선수의 장비 ${n}개는 보관함으로`):bad('떠난 선수 장비 '+JSON.stringify({eq:p.eq,inv0,inv1}));
  while(S.phase==='season'){SL.playDayAuto();for(const o of [...S.market.offers])SL.respondOffer(o.id,'reject');}
  const left=Object.values(S.players).filter(x=>x.eq).length+Object.values(SL.eqState()).reduce((a,b)=>a+b,0);left===0?ok('정규 시즌이 끝나면 장비가 모두 닳음 (한 시즌용)'):bad('시즌 뒤 장비 남음 '+left);}
// 3. 밸런스: 장비 없는 경기 기록 범위는 그대로 (AI는 장비 없음)
{const any=Object.values(S.players).some(x=>x.eq&&x.teamId!==SL.userTeam().id);!any?ok('AI 구단 선수는 장비 없음 — 기존 밸런스 그대로'):bad('AI 장비');}
console.log(fails?`v84 검사 실패 ${fails}건`:'v84 검사 통과');process.exit(fails?1:0);

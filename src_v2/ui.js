// ===================== UI (화면 렌더링) =====================
const UI=(function(){
'use strict';
const SAVE_KEY='stoveleague_v1';
const ui={tab:'home',sub:{roster:'list',dev:'train',market:'offers',club:'table'},view:null,stack:[],scoutKind:'youth',scoutLvl:1,scoutF:{pos:'ALL',grade:'ALL',maxAge:'',minPot:'ALL'},rf:'all',sortKey:'ovr',newTeam:0,buyF:{div:'all',pos:'ALL',grade:'ALL',maxAge:'',minPot:'ALL'},tut:0,gameResult:null,form:{},offerLog:{}};
const $=s=>document.querySelector(s);
let S=null;
const M=SL.money;
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function Ms(m){m=Math.round(m||0);const neg=m<0;m=Math.abs(m);let s;if(m>=10000){const e=m/10000;s=(e>=100?Math.round(e):Math.round(e*10)/10)+'억';}else s=m.toLocaleString()+'만';return (neg?'-':'')+s;}
function toast(msg,ms){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}t.textContent=msg;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',ms||2800);}
// 저장소: IndexedDB 우선(용량 큼), localStorage 보조. 둘 다 실패하면 알림.
const Store={db:null,ready:null,idbOk:false,has:false,
  open(){if(this.ready)return this.ready;this.ready=new Promise(res=>{try{if(!window.indexedDB)return res(null);const rq=indexedDB.open('stoveleague',1);rq.onupgradeneeded=()=>rq.result.createObjectStore('saves');rq.onsuccess=()=>{this.db=rq.result;this.idbOk=true;res(this.db);};rq.onerror=()=>res(null);}catch(e){res(null);}});return this.ready;},
  put(json){return this.open().then(db=>new Promise(res=>{if(!db)return res(false);try{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(json,SAVE_KEY);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);}catch(e){res(false);}}));},
  get(){return this.open().then(db=>new Promise(res=>{if(!db)return res(null);try{const rq=db.transaction('saves','readonly').objectStore('saves').get(SAVE_KEY);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>res(null);}catch(e){res(null);}}));},
  del(){return this.open().then(db=>{if(db)try{db.transaction('saves','readwrite').objectStore('saves').delete(SAVE_KEY);}catch(e){}});}};
function writeSave(silent){const json=SL.serialize();let lsOk=false;try{localStorage.setItem(SAVE_KEY,json);lsOk=true;}catch(e){try{localStorage.removeItem(SAVE_KEY);}catch(e2){}}
  Store.put(json).then(ok=>{Store.has=ok||lsOk;if(!ok&&!lsOk)toast('저장 실패: 브라우저 저장 공간을 쓸 수 없습니다. 구단 → 저장에서 JSON으로 내보내 두세요.',5000);else if(!silent)toast('저장했습니다.');});return true;}
function save(silent){return writeSave(silent);}
function autosave(){S=SL.state();if(!S)return;writeSave(true);}
function hasSave(){if(Store.has)return true;try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}}
function readSave(){return Store.get().then(j=>{if(j)return j;try{return localStorage.getItem(SAVE_KEY);}catch(e){return null;}});}
function scrollTop(){try{window.scrollTo(0,0);}catch(e){}}
const G=v=>`<span class="grade ${SL.gradeOf(v)}">${SL.gradeOf(v)}</span>`;
function teamName(id){const t=S.teams[id];return t?t.name:'FA';}
const NEG_TRAITS=['게으름','유리멘탈'],POS_TRAITS=['성실','강철체력','클러치','장타본능','빠른발','강심장','리더'];
function traitChip(t){return `<span class="chip ${NEG_TRAITS.includes(t)?'r':POS_TRAITS.includes(t)?'g':''}" title="${esc(SL.TRAITS[t]||'')}">${esc(t)}</span>`;}

// ---------- 가상 초상화 / 엠블럼 ----------
function hsh(n){return (n*2654435761)>>>0;}
function face(p,size){
  size=size||44;const h=hsh(p.id+7);const r=(i,m)=>((h>>>(i*3))%m);
  const skins=p.nat==='US'||p.nat==='AU'?['#f1d3b8','#c68e65','#8d5a3b','#e8b896','#5c3a26']:p.nat==='MX'||p.nat==='CB'?['#d9a77f','#b9825a','#8d5a3b','#6b4129','#c68e65']:['#f3d6bd','#e9c4a2','#dcb48f','#f0cfb0'];
  const skin=skins[r(0,skins.length)];const hairs=['#1d1a17','#2b211b','#3b2b1f','#151515','#5a3d24'];const hair=p.nat==='US'||p.nat==='AU'?hairs[r(1,5)]:hairs[r(1,4)];
  const t=p.teamId!=null&&S.teams[p.teamId]?S.teams[p.teamId]:null;const cap=t?t.color:'#6b7280';const letter=t?(t.name.split(' ')[1]||t.name)[0]:'';
  const fw=[15,16,17][r(2,3)],eyeY=37+r(3,2),brow=r(4,3),mouth=r(5,3),beard=p.age>=28&&r(6,4)===0;const id='c'+p.id+'_'+size;
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#${id})">
  <rect width="64" height="64" fill="${cap}" opacity=".2"/><path d="M8 64c2-12 12-17 24-17s22 5 24 17z" fill="#f4f4f2"/><path d="M26 47h12l-6 7z" fill="${cap}" opacity=".7"/>
  <ellipse cx="32" cy="36" rx="${fw}" ry="17" fill="${skin}"/><rect x="${32-fw}" y="26" width="${fw*2}" height="6" fill="${hair}"/>
  <path d="M${32-fw-2} 28c0-12 7-18 ${fw+2}-18s${fw+2} 6 ${fw+2} 18z" fill="${cap}"/><path d="M${32-fw-2} 28h${fw*2+14}c0 2.5-3 3.5-8 3.5H${32-fw-2}z" fill="${cap}" style="filter:brightness(.8)"/>
  <text x="32" y="25" font-size="10" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${esc(letter)}</text>
  ${brow===0?`<path d="M23 ${eyeY-5}h6M35 ${eyeY-5}h6" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>`:brow===1?`<path d="M23 ${eyeY-4}l6-2M35 ${eyeY-6}l6 2" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>`:`<path d="M23 ${eyeY-5}q3-2 6 0M35 ${eyeY-5}q3-2 6 0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`}
  <circle cx="26" cy="${eyeY}" r="1.9" fill="#222"/><circle cx="38" cy="${eyeY}" r="1.9" fill="#222"/>
  ${mouth===0?`<path d="M27 46q5 4 10 0" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>`:mouth===1?`<path d="M28 46h8" stroke="#7a3b2e" stroke-width="2" stroke-linecap="round"/>`:`<path d="M27 45q5 5 10 0z" fill="#7a3b2e"/>`}
  ${beard?`<path d="M${32-fw+3} 42q${fw-3} 14 ${(fw-3)*2} 0q-${fw-3} 6-${(fw-3)*2} 0z" fill="${hair}" opacity=".55"/>`:''}</g></svg>`;
}
function emblem(t,size){size=size||40;const letter=(t.name.split(' ')[1]||t.name)[0];return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" style="flex-shrink:0"><circle cx="20" cy="20" r="19" fill="${t.color}" opacity=".18"/><path d="M6 24c0-10 6-16 14-16s14 6 14 16z" fill="${t.color}"/><path d="M4 24h27c4 0 6 1 6 3H6c-1.5 0-2-1-2-3z" fill="${t.color}" style="filter:brightness(.75)"/><text x="20" y="21" font-size="11" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${esc(letter)}</text></svg>`;}
const ICON={home:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',roster:'<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5zM14.5 19c.2-2.4-.4-4 1.2-4.8 3 0 5.3 1.7 5.3 4.8z"/>',dev:'<path d="M4 9h2v6H4zM18 9h2v6h-2zM7 7h2v10H7zM15 7h2v10h-2zM9 11h6v2H9z"/>',market:'<path d="M4 8h13l-3-3 1.4-1.4L21 9l-5.6 5.4L14 13l3-3H4zM20 16H7l3 3-1.4 1.4L3 15l5.6-5.4L10 11l-3 3h13z"/>',club:'<path d="M12 2l2.4 5 5.6.8-4 3.9.9 5.5L12 14.6 7.1 17.2l.9-5.5-4-3.9 5.6-.8z"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[k]}</svg>`;

// ---------- 공통 조각 ----------
function fitWarn(p){const t=SL.userTeam();if(p.teamId!==t.id||!t.lineup.includes(p.id))return '';const pos=t.pos[p.id];if(!pos||pos==='DH'||pos===p.pos)return '';return `<span class="chip r">${SL.POS_KO[pos]} 적응 부족 · 수비 -${SL.posPenalty(p,pos)}</span> `;}
function role(p){const t=SL.userTeam();if(p.teamId!==t.id)return '';if(t.dev.includes(p.id))return '육성군';if(t.lineup.includes(p.id)){const pos=t.pos[p.id]||'';return '주전 '+pos+(pos&&pos!==p.pos&&pos!=='DH'?`(본래 ${p.pos})`:'');}const ri=t.rotation.indexOf(p.id);if(ri>=0)return `선발 ${ri+1}번`;if(t.closer===p.id)return '마무리';if(t.bullpen.includes(p.id))return '불펜';return '벤치';}
function statShort(p,st){const s=SL.statLine(p,st);if(SL.isPitcher(p))return `${s.w}승${s.l}패${s.sv?' '+s.sv+'S':''} ERA ${s.era}`;return `타율 ${s.avg} ${s.hr}홈런 ${s.rbi}타점`;}
function lastSt(p){const cur=S.phase==='season'&&(p.cur.pa>0||p.cur.pOuts>0);if(cur)return {st:p.cur,label:'이번 시즌'};const h=p.hist.length?p.hist[p.hist.length-1]:null;return h?{st:h.st,label:h.s+'시즌'}:null;}
function seasonLine(p){const l=lastSt(p);return l?`${l.label} ${statShort(p,l.st)}`:'기록 없음';}
function expTag(p){if(p.teamId!==S.userTeamId||!p.contract)return '';if(p.contract.years<=0)return '<span class="chip o">계약 만료</span> ';if(S.phase==='season'&&p.contract.years<=1)return '<span class="chip o">시즌 후 FA</span> ';return '';}
function prow(p,extra){const ovr=SL.calcOvr(p);const r=role(p);
  const sd=SL.seasonDelta(p);const dTag=sd&&sd.d?`<span class="${sd.d>0?'up':'dn'} small">${sd.d>0?'+':''}${sd.d}</span>`:'';
  return `<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세</span></div><div class="sub">${expTag(p)}${fitWarn(p)}${r?esc(r)+' · ':''}${extra!=null?extra:seasonLine(p)}</div></div><div class="rt"><div class="row" style="gap:5px;justify-content:flex-end">${G(ovr)}<span class="ovr">${Math.round(ovr)}</span>${dTag}</div><div class="muted small">잠재 ${SL.potText(p)}</div></div></div>`;}
function valDelta(p){const sd=SL.seasonDelta(p);if(!sd||sd.v==null||Math.abs(sd.v)<100)return '';return ` <span class="${sd.v>0?'up':'dn'}">${sd.v>0?'+':''}${Ms(sd.v)}</span>`;}
function lgName(t){return t.league==='KR'?t.div+'부':SL.BAL.LEAGUES[t.league].name;}
function standChips(p,t){t=t||(p.teamId!=null?S.teams[p.teamId]:null);if(!t)return '';const ls=SL.leagueStanding(p,SL.leagueKey(t));const role=SL.expectedRole(p,t);
  return `<span class="chip ${ls.cls}">${ls.label}</span> <span class="chip ${role==='주전'?'g':role==='벤치'?'r':''}">${t.isUser?'우리 팀':esc(t.name.split(' ').pop())} ${role}</span>`;}
function hd(t,small){return `<div class="hd"><h3>${t}</h3>${small?`<small>${small}</small>`:''}</div>`;}
function subtabs(key,items){return `<div class="subtabs">${items.map(i=>`<button class="${ui.sub[key]===i[0]?'on':''}" onclick="UI.setSub('${key}','${i[0]}')">${i[1]}</button>`).join('')}</div>`;}
function decisions(){let n=S.market.offers.length;if(SL.draftTurn())n++;if(S.phase==='offseason')n+=S.pendingFA.length;return n;}
function bubbles(log,names){return log.map(l=>{const cls=l.who==='me'?'me':l.who==='club'?'club':l.who==='sys'?'sys':'them';const nm=l.who==='me'||l.who==='sys'?'':`<span class="who">${esc(names[l.who]||names.player||'')}</span>`;return `<div class="bub ${cls}">${nm}${esc(l.text)}</div>`;}).join('');}

// ---------- 루트 ----------
function render(){S=SL.state();const app=$('#app');if(!S){app.innerHTML=renderTitle();return;}
  if(S.liveGame){app.innerHTML=renderGame();const gl=$('#glog');if(gl)gl.scrollTop=gl.scrollHeight;return;}
  let vh='';if(ui.view){const v=ui.view;if(v.type==='player')vh=renderPlayer(v);else if(v.type==='table')vh=renderTable(v);else if(v.type==='offer')vh=renderOffer(v);else if(v.type==='dispatch')vh=renderDispatch(v);if(!vh)ui.view=null;}
  const scrollChat=()=>{const c=$('#chat');if(c&&c.lastElementChild&&c.lastElementChild.scrollIntoView)try{c.lastElementChild.scrollIntoView({block:'nearest'});}catch(e){}};
  if(isWide()){const rp=$('#rpane');const keep=rp?rp.scrollTop:0;
    app.innerHTML=`<div class="split"><div class="lp">${renderClubBar()}<div class="content gut">${renderTab()}</div>${renderNav()}</div><div class="rp" id="rpane">${vh||`<div class="rp-empty"><div>${emblem(SL.userTeam(),72)}</div><div class="b" style="margin-top:10px">선수를 선택하세요</div><div class="muted small">선수·제안·협상 화면이 이쪽에 열립니다.</div></div>`}</div></div>`+(S.tutorialDone?'':renderTut());
    const r2=$('#rpane');if(r2&&ui.keepScroll)r2.scrollTop=keep;ui.keepScroll=false;scrollChat();return;}
  if(vh){app.innerHTML=vh;scrollChat();return;}
  app.innerHTML=renderClubBar()+`<div class="content gut">${renderTab()}</div>`+renderNav()+(S.tutorialDone?'':renderTut());
}
function isWide(){try{return window.matchMedia('(min-width: 960px)').matches;}catch(e){return false;}}
function renderTitle(){
  const names=[['비슬 스패로우스','#15803d'],['금호 레드폭스','#dc2626'],['낙동 캣피시','#3f6212'],['수성 비버스','#92400e'],['팔공 램스','#6d28d9'],['영일 시걸스','#0e7490'],['강화 머스탱스','#b45309'],['진주 펄스','#be185d']];
  return `<div class="title gut"><h1>스토브리그</h1><p>작은 구단의 기적 — 싸게 데려와, 키워서, 더 높은 무대로.</p>
  ${hasSave()?`<button class="go big" onclick="UI.continueGame()">이어하기</button><div style="height:12px"></div>`:''}
  <div class="panel"><div class="b" style="margin-bottom:8px">새 게임 — 맡을 3부 구단</div><div class="teamsel">${names.map((n,i)=>`<button class="${ui.newTeam===i?'on':''}" onclick="UI.pickTeam(${i})">${emblem({name:n[0],color:n[1]},30)}${n[0]}</button>`).join('')}</div>
  <div style="height:10px"></div><label class="small" style="color:var(--on-navy-dim)" for="seed">시드 (같은 시드 = 같은 초기 선수단)</label><div class="row"><input id="seed" type="number" value="${Math.floor(Math.random()*90000)+1000}" style="flex:1"><button class="go" onclick="UI.newGame()">시작</button></div></div>
  <div class="panel"><div class="b" style="margin-bottom:8px">저장 불러오기</div><input type="file" id="impfile" accept=".json,application/json" style="width:100%"><div style="height:8px"></div><button onclick="UI.importFile()">파일 불러오기</button><div style="height:8px"></div><textarea id="imp_json0" placeholder="또는 JSON 붙여넣기" style="width:100%;height:56px;font-size:11px"></textarea><div style="height:6px"></div><button onclick="UI.importText('imp_json0')">붙여넣은 JSON 불러오기</button></div></div>`;
}
function renderClubBar(){const ut=SL.userTeam();const st=SL.standings(ut.div);const rank=st.findIndex(t=>t.id===ut.id)+1;const sum=S.lastSummary;
  const r2=S.phase==='season'?`<span>${ut.div}부 ${rank}위</span><span>${ut.rec.w}승 ${ut.rec.l}패</span><span>${S.day}/${SL.BAL.SEASON_GAMES}일차</span>`:`<span>${sum?sum.div+'부 '+sum.rank+'위':'-'}</span><span>${sum?sum.w+'승 '+sum.l+'패':''}</span><span>스토브리그 ${Math.min(S.week,SL.BAL.OFFSEASON_WEEKS)}주</span>`;
  return `<div class="club gut"><div class="r1">${emblem(ut,44)}<div><div class="nm">${esc(ut.name)}</div><div class="sub">${ut.div}부 · ${S.season}시즌 · 명성 ${ut.rep}</div></div><div class="cashpill ${ut.cash<0?'neg':''}" title="현재 현금">${Ms(ut.cash)}</div></div><div class="r2">${r2}<button onclick="UI.setTab('club');UI.setSub('club','table')">순위 ›</button></div></div>`;}
function renderNav(){const tabs=[['home','홈'],['roster','선수단'],['dev','육성'],['market','이적'],['club','구단']];const dn=decisions();
  return `<nav class="nav"><div class="in">${tabs.map(t=>`<button class="${ui.tab===t[0]?'on':''}" onclick="UI.setTab('${t[0]}')">${icon(t[0])}${t[1]}${(t[0]==='market'&&S.market.offers.length)||(t[0]==='home'&&dn&&ui.tab!=='home')?'<span class="dot"></span>':''}</button>`).join('')}</div></nav>`;}
function renderTab(){switch(ui.tab){case 'home':return renderHome();case 'roster':return renderRoster();case 'dev':return renderDev();case 'market':return renderMarket();case 'club':return renderClub();}return '';}

// ---------- 홈 ----------
function offerCard(o){const p=S.players[o.pid],t=S.teams[o.team];if(!p||!t)return '';const os=o.type==='overseas';const left=o.expires-S.clock;
  const will=os?`선수 의향 ${o.pw>=0.65?'<b class="ok">긍정적</b>':o.pw>=0.4?'<b>보통</b>':'<b class="bad">부정적</b>'}`:o.willing?'<b class="ok">선수 이적 의향 있음</b>':'<b class="bad">선수가 이적 거부</b>';
  return `<div class="decide"><span class="tagline">결정 필요${left<=1?' · 내일 만료':''}</span><div class="grid"><div class="row" style="gap:10px;align-items:flex-start">${face(p,46)}<div class="grow"><div class="ttl">${esc(p.name)} ${os?'해외 ':''}영입 제안</div><div class="muted">${esc(t.name)} · 응답 ${left}일 남음</div></div></div>
  <div style="text-align:right"><div class="amt">${M(o.fee)}</div><div class="small">${will}</div></div></div><div style="height:10px"></div><button class="primary big" onclick="UI.openOffer(${o.id})">제안 검토</button></div>`;}
function growthCard(){const ut=SL.userTeam();let h='';
  const rep=SL.growthReport(3);
  if(rep.length){const base=rep[0].r.s;h+=`<div class="card">${hd('육성 리포트',S.phase==='season'?`${base}시즌 개막 대비`:`${base}시즌 개막 → 지금`)}${rep.map(({p,r})=>{const F=SL.isPitcher(p)?SL.FOCUS_PIT:SL.FOCUS_BAT;const est=Math.max(p.scout.est,1);const pct=Math.min(100,SL.calcOvr(p)/est*100),pct0=Math.min(100,r.from/est*100);
      return `<div class="rep" onclick="UI.openPlayer(${p.id})">${face(p,44)}<div style="min-width:0"><div class="who">${G(SL.calcOvr(p))} <b>${esc(p.name)}</b> <span class="muted">· ${p.age}세 · ${p.pos}${ut.dev.includes(p.id)?' · 육성군':''}</span></div>
      <div class="jump"><span class="n">${r.from}</span><span class="arr">→</span><span class="n to">${r.to}</span><span class="dpill">+${r.d}</span>${r.valFrom?`<span class="val">가치 ${Ms(r.valFrom)} → <b>${Ms(r.valTo)}</b></span>`:''}</div>
      <div class="potbar" title="예상 잠재력 대비 현재"><s style="width:${pct.toFixed(1)}%"></s><i style="width:${pct0.toFixed(1)}%"></i></div>
      <div class="small muted">${F[p.focus]}${p.focus==='balance'?'':' 집중'} · ${SL.ATTR_KO[r.bestK]} <span class="up">+${r.bestD}</span> · ${seasonLine(p)}</div></div></div>`;}).join('')}</div>`;}
  return h;}
function pinCard(){const ut=SL.userTeam();const pins=S.pins.map(id=>S.players[id]).filter(Boolean);if(!pins.length)return '';
  return `<div class="card">${hd('관심 선수 성장',S.phase==='season'?`다음 성장 점검 ${SL.nextCheck()}경기 후`:'동계훈련은 개막 때')}${pins.map(p=>{const lg=p.log[0];const sd=SL.seasonDelta(p);return prow(p,`${p.teamId===ut.id?'':esc(teamName(p.teamId))+' · '}가치 ${Ms(SL.calcValue(p))}${valDelta(p)}${lg&&p.teamId===ut.id?` · 최근 <span class="${lg.d>0?'up':lg.d<0?'dn':''}">${lg.d>0?'+':''}${lg.d||0}</span> ${esc(lg.f.slice(0,2).join('·'))}`:''}`);}).join('')}</div>`;}
function renderHome(){
  const ut=SL.userTeam();let h='';const pinsFirst=S.pins.some(id=>S.players[id]);
  for(const w of S.warn)h+=`<div class="badbox">${esc(w)}</div>`;
  if(ui.gameResult){const r=ui.gameResult;h+=`<div class="${r.win?'okbox':'warnbox'} row sb"><span><b>${r.win?'승리':'패배'}</b> ${esc(r.text)}</span><button class="sm" onclick="UI.clearResult()">닫기</button></div>`;}
  const offs=[...S.market.offers].sort((a,b)=>a.expires-b.expires);if(offs.length)h+=offerCard(offs[0]);
  if(offs.length>1)h+=`<div class="decide" style="padding:6px 14px">${offs.slice(1,4).map(o=>{const p=S.players[o.pid],t=S.teams[o.team];if(!p||!t)return '';return `<div class="prow" onclick="UI.openOffer(${o.id})">${face(p,34)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${esc(t.name)} · ${o.expires-S.clock}일</span></div><div class="sub">${o.type==='overseas'?'해외 제안':o.willing?'<span class="ok">의향 있음</span>':'<span class="bad">이적 거부</span>'}</div></div><div class="rt"><b>${Ms(o.fee)}</b><div class="due small">검토 ›</div></div></div>`;}).join('')}${offs.length>4?`<button class="sm warn" style="margin:6px 0" onclick="UI.setTab('market')">제안 ${offs.length-4}건 더</button>`:''}</div>`;
  if(SL.draftTurn())h+=`<div class="decide"><span class="tagline">결정 필요</span><div class="ttl">고교 드래프트 — 우리 지명 차례</div><div class="muted">넘기면 잠재력 추정 1순위를 자동 지명합니다.</div><div style="height:10px"></div><button class="primary big" onclick="UI.setTab('dev');UI.setSub('dev','draft')">드래프트 보드</button></div>`;
  if(S.phase==='offseason'&&S.dispatch&&S.dispatch.phase==='open'){for(const rq of S.dispatch.reqs.slice(0,2)){const p=S.players[rq.pid],t=S.teams[rq.team];if(!p||!t)continue;const o=SL.dispatchOptions(p).find(x=>x.team.id===t.id);
      h+=`<div class="decide"><span class="tagline">겨울리그 파견 요청 · 2주차까지</span><div class="row" style="gap:10px;align-items:flex-start">${face(p,46)}<div class="grow"><div class="ttl">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.age}세 · ${SL.POS_KO[p.pos]}</span></div><div class="muted">${esc(t.name)} (${SL.BAL.LEAGUES[t.league].name})에서 파견 요청</div></div></div>
      <div class="small" style="margin:8px 0;line-height:1.7">예상 역할: <b>${o.role}</b> · 성장 기대: <span class="chip ${o.gcls}">${o.growth}</span><br>기대 효과: 실전 경험, 해외 구단 노출<br>부담: 파견비 ${Ms(o.fee)}, 다음 시즌 개막 전 회복 필요 (국내 동계훈련 대신)</div>
      <div class="btns"><button class="primary" onclick="UI.dispatch(${p.id},${t.id})">파견한다</button><button class="ghost" onclick="UI.declineDispatch(${p.id})">국내에서 집중 훈련</button></div><button class="sm ghost" style="margin-top:8px" onclick="UI.dispatchView(${p.id})">다른 파견지 보기</button></div>`;}}
  if(S.phase==='offseason'&&S.pendingFA.length){h+=`<div class="decide"><span class="tagline">결정 필요 · 2주차까지</span><div class="ttl">계약 만료 ${S.pendingFA.length}명 우선협상</div>${S.pendingFA.map(id=>S.players[id]).filter(Boolean).map(p=>`<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,36)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세 · 종합 ${Math.round(SL.calcOvr(p))}</span></div><div class="sub">${seasonLine(p)} · 연봉 ${Ms(p.contract.salary)}</div></div><button class="sm primary" onclick="event.stopPropagation();UI.openTable(${p.id})">협상</button></div>`).join('')}</div>`;}
  if(pinsFirst)h+=pinCard();else h+=growthCard();
  if(S.phase==='season'){const g=SL.userGameToday();
    if(g){const home=g.home===ut.id;const opp=S.teams[home?g.away:g.home];const sp=S.players[ut.rotation[ut.rotIdx%Math.max(1,ut.rotation.length)]];
      h+=`<div class="card">${hd('다음 경기',`${S.day}일차 · ${home?'홈':'원정'}`)}<div class="row" style="gap:10px;justify-content:center;margin-bottom:6px">${emblem(ut,38)}<b>${esc(ut.name.split(' ')[0])}</b><span class="muted" style="font-family:var(--f-display);font-size:18px">VS</span>${emblem(opp,38)}<b>${esc(opp.name.split(' ')[0])}</b></div>
      <div class="muted small" style="text-align:center;margin-bottom:10px">상대 ${opp.rec.w}승 ${opp.rec.l}패 · 우리 선발 ${sp?esc(sp.name):'-'}</div>
      <div class="btns"><button class="primary" onclick="UI.startGame()">▶ 경기 보기</button><button class="ghost" onclick="UI.autoDays(1)">▶▶ 자동 진행</button></div><div style="height:6px"></div>
      <div class="btns"><button class="ghost sm" onclick="UI.autoDays(7)">7경기 자동</button><button class="ghost sm" onclick="UI.autoDays(99)">시즌 끝까지</button></div>
      <label class="row sb small muted" style="margin-top:10px" for="stopset"><span>제안 도착·만료 직전 자동 정지</span><input id="stopset" type="checkbox" style="width:20px;height:20px;min-height:0" ${S.settings.stopOnOffer?'checked':''} onchange="UI.setStop(this.checked)"></label></div>`;}
  }else{const wk=Math.min(S.week,SL.BAL.OFFSEASON_WEEKS);const issues=SL.rosterCheck(ut);
    h+=`<div class="card">${hd('스토브리그',`${wk}주차 / ${SL.BAL.OFFSEASON_WEEKS}주`)}${S.lastSummary?`<div class="muted" style="margin-bottom:8px">${S.lastSummary.s}시즌 ${S.lastSummary.div}부 ${S.lastSummary.rank}위 · ${S.lastSummary.promoted?'<b class="ok">승격!</b>':S.lastSummary.relegated?'<b class="bad">강등</b>':'잔류'} · 최고 타자 ${esc(S.lastSummary.bestBat)}</div>`:''}
    ${issues.length?`<div class="warnbox">선수단 요건 미달: ${issues.join(', ')} <button class="sm" onclick="UI.autoFill()">최소 인원 자동 보충</button></div>`:''}
    ${S.week<=SL.BAL.OFFSEASON_WEEKS?`<button class="primary big" onclick="UI.advanceWeek()">다음 주로 ▶</button><div style="height:8px"></div>`:''}
    <button class="${S.week>SL.BAL.OFFSEASON_WEEKS?'primary':'ghost'} big" onclick="UI.startSeason()">${S.season+1}시즌 개막${S.week<=SL.BAL.OFFSEASON_WEEKS?' (남은 주 건너뛰기)':''}</button></div>`;}
  if(pinsFirst)h+=growthCard();
  const alum=S.news.filter(n=>n.kind==='alumni').slice(0,3);if(alum.length)h+=`<div class="card">${hd('떠난 선수 소식','셀온 10% 포함 판매')}${alum.map(n=>`<div class="small" style="padding:5px 0;border-bottom:1px dashed var(--line)">${esc(n.text.replace(/^\[(출신|셀온)\] /,''))}</div>`).join('')}<button class="sm ghost" style="margin-top:8px" onclick="UI.setTab('club');UI.setSub('club','alumni')">출신 선수 전체</button></div>`;
  const int=ut.roster.map(id=>S.players[id]).filter(p=>p.interest);
  if(int.length)h+=`<div class="card">${hd('해외 구단 관심')}${int.map(p=>prow(p,esc(SL.interestText(p)))).join('')}</div>`;
  if(S.phase==='season'){const exp=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(p=>p.contract&&p.contract.years<=1);if(exp.length)h+=`<div class="card">${hd('이번 시즌 후 FA',exp.length+'명 · 미리 재계약 가능')}${exp.slice(0,4).map(p=>prow(p,`연봉 ${Ms(p.contract.salary)} · ${seasonLine(p)}`)).join('')}</div>`;}
  h+=`<div class="card">${hd('최근 소식')}${S.news.slice(0,4).map(n=>`<div class="small" style="padding:5px 0;border-bottom:1px dashed var(--line)">${esc(n.text)}</div>`).join('')||'<div class="muted">아직 소식이 없습니다.</div>'}</div>`;
  return h;
}

// ---------- 선수단 ----------
function renderRoster(){
  const ut=SL.userTeam();let h=subtabs('roster',[['list','선수 목록'],['lineup','타순·수비'],['pitch','투수진']]);
  if(ui.sub.roster==='list'){
    let ps=ut.roster.map(id=>S.players[id]);if(ui.rf==='P')ps=ps.filter(SL.isPitcher);else if(ui.rf==='B')ps=ps.filter(p=>!SL.isPitcher(p));else if(ui.rf==='D')ps=ut.dev.map(id=>S.players[id]);
    const key=ui.sortKey;const gd=p=>{const r=SL.report(p);return r?r.d:0;};ps.sort((a,b)=>key==='age'?a.age-b.age:key==='value'?SL.calcValue(b)-SL.calcValue(a):key==='pot'?b.scout.est-a.scout.est:key==='grow'?gd(b)-gd(a):SL.calcOvr(b)-SL.calcOvr(a));
    h+=`<div class="row wrap" style="margin-bottom:10px"><select onchange="UI.set('rf',this.value)" aria-label="분류"><option value="all" ${ui.rf==='all'?'selected':''}>1군 전체 (${ut.roster.length})</option><option value="B" ${ui.rf==='B'?'selected':''}>야수</option><option value="P" ${ui.rf==='P'?'selected':''}>투수</option><option value="D" ${ui.rf==='D'?'selected':''}>육성군 (${ut.dev.length})</option></select><select onchange="UI.set('sortKey',this.value)" aria-label="정렬"><option value="ovr" ${key==='ovr'?'selected':''}>능력순</option><option value="grow" ${key==='grow'?'selected':''}>성장순</option><option value="pot" ${key==='pot'?'selected':''}>잠재력순</option><option value="age" ${key==='age'?'selected':''}>나이순</option><option value="value" ${key==='value'?'selected':''}>가치순</option></select></div>`;
    h+=`<div class="card">${ps.map(p=>{const r=SL.report(p);return prow(p,(r&&r.d?`<span class="${r.d>0?'up':'dn'}">${r.d>0?'+':''}${r.d}</span> · `:'')+seasonLine(p));}).join('')||'<div class="muted">선수가 없습니다.</div>'}</div>`;
  }else if(ui.sub.roster==='lineup'){
    const bats=ut.roster.map(id=>S.players[id]).filter(p=>!SL.isPitcher(p));const locks=ut.locks||{};const mode=ut.lineupMode||'win';
    const offs=ut.lineup.filter(id=>{const p=S.players[id];const pos=ut.pos[id];return p&&pos&&pos!=='DH'&&pos!==p.pos;}).length;
    h+=`<div class="card">${hd('자동 편성 기준')}<div class="seg" style="margin-bottom:8px">${[['win','승리 우선'],['youth','유망주 출장'],['rest','체력 관리']].map(m=>`<button class="${mode===m[0]?'on':''}" onclick="UI.setMode('${m[0]}')">${m[1]}</button>`).join('')}</div>
    <div class="muted small">${mode==='win'?'공격력과 포지션 적성(수비 손실)을 함께 계산해 가장 강한 9명을 세웁니다.':mode==='youth'?'잠재력이 남은 24세 이하 선수에게 가산점을 줍니다. 성장은 빨라지지만 당장 전력은 조금 낮아질 수 있습니다.':'피로가 쌓인 선수를 우선 쉬게 합니다.'} 🔒 고정한 선수·포지션은 그대로 둡니다.</div>
    <div style="height:8px"></div><button class="primary" style="width:100%" onclick="UI.autoLineup()">자동 편성 실행</button></div>`;
    h+=`<div class="card">${hd('타순 · 수비 위치',offs?`<span class="bad">적성 밖 배치 ${offs}명</span>`:'모두 본래 포지션')}`;
    for(let i=0;i<9;i++){const pid=ut.lineup[i];const cur=pid!=null?S.players[pid]:null;const pos=cur?ut.pos[pid]:null;const off=cur&&pos&&pos!=='DH'&&pos!==cur.pos;const lk=cur&&locks[pid];
      h+=`<div style="padding:6px 0;border-bottom:1px solid var(--line)"><div class="slot"><b>${i+1}</b><select aria-label="${i+1}번 타자" onchange="UI.setLineup(${i},+this.value)"><option value="-1">(비어 있음)</option>${bats.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${SL.gradeOf(SL.calcOvr(p))} ${esc(p.name)} (본래 ${p.pos}${p.fatigue>70?' · 피로':''})</option>`).join('')}</select>
      <select aria-label="수비 위치" ${cur?'':'disabled'} onchange="UI.setPos(${pid},this.value)">${SL.POS_BAT.map(ps=>`<option ${pos===ps?'selected':''}>${ps}</option>`).join('')}</select><div class="row" style="gap:3px"><button class="sm" aria-label="위로" onclick="UI.moveSlot(${i},-1)">▲</button><button class="sm ${lk?'warn':''}" aria-label="고정" title="이 선수·포지션 고정" ${cur?'':'disabled'} onclick="UI.toggleLock(${pid})">${lk?'🔒':'🔓'}</button></div></div>
      ${off?`<div class="small" style="margin-left:28px"><span class="chip r">${SL.POS_KO[pos]} 적응 부족 · 수비 -${SL.posPenalty(cur,pos)}</span> <span class="muted">본래 ${SL.POS_KO[cur.pos]}</span></div>`:''}</div>`;}
    h+=`</div><div class="card">${hd('벤치')}${bats.filter(p=>!ut.lineup.includes(p.id)).map(p=>prow(p,`본래 ${SL.POS_KO[p.pos]} · ${seasonLine(p)}`)).join('')||'<div class="muted">없음</div>'}</div>`;
  }else{
    const pits=ut.roster.map(id=>S.players[id]).filter(SL.isPitcher);
    h+=`<div class="card">${hd('선발 로테이션',`다음 선발: ${ut.rotation[ut.rotIdx]?esc(S.players[ut.rotation[ut.rotIdx]].name):'-'}`)}`;
    for(let i=0;i<5;i++){const pid=ut.rotation[i];h+=`<div class="slot" style="grid-template-columns:22px 1fr"><b>${i+1}</b><select aria-label="${i+1}선발" onchange="UI.setRot(${i},+this.value)"><option value="-1">(비어 있음)</option>${pits.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${SL.gradeOf(SL.calcOvr(p))} ${esc(p.name)} (${p.pos} ${SL.velocity(p)}km/h · 체력 ${Math.round(p.attrs.stamina)})</option>`).join('')}</select></div>`;}
    h+=`<div style="height:8px"></div><button class="ghost" onclick="UI.autoLineup()">자동 편성</button></div>`;
    h+=`<div class="card">${hd('마무리')}<select aria-label="마무리" style="width:100%" onchange="UI.setCloser(+this.value)"><option value="-1">(없음)</option>${pits.filter(p=>ut.bullpen.includes(p.id)).map(p=>`<option value="${p.id}" ${p.id===ut.closer?'selected':''}>${SL.gradeOf(SL.calcOvr(p))} ${esc(p.name)}</option>`).join('')}</select></div>`;
    h+=`<div class="card">${hd('불펜','피로 78 이상은 등판 불가')}${ut.bullpen.map(id=>S.players[id]).map(p=>prow(p,`피로 ${Math.round(p.fatigue)} · ${seasonLine(p)}`)).join('')}</div>`;
  }
  return h;
}

// ---------- 육성 ----------
function renderDev(){
  const ut=SL.userTeam();let h=subtabs('dev',[['train','훈련 방향'],['dev','육성군'],['winter','겨울리그'],['draft','드래프트'],['scout','스카우트'],['youth','유소년']]);
  if(ui.sub.dev==='train'){
    const ps=ut.roster.concat(ut.dev).map(id=>S.players[id]).sort((a,b)=>a.age-b.age);
    h+=`<div class="card">${hd('훈련 방향','7경기마다 성장 반영')}<div class="muted small" style="margin-bottom:8px">집중한 능력에 성장의 40%가 몰립니다. 높은 능력치일수록 오르기 어렵고, 출장 경험·피로·시설·성실성이 함께 영향을 줍니다.</div>
    ${ps.map(p=>{const F=SL.isPitcher(p)?SL.FOCUS_PIT:SL.FOCUS_BAT;return `<div class="prow" style="cursor:default">${face(p,36)}<div class="grow" onclick="UI.openPlayer(${p.id})" style="cursor:pointer"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세${ut.dev.includes(p.id)?' · 육성군':''}</span></div><div class="sub">${esc(SL.diagnose(p).recText)} · 잠재 ${SL.potText(p)}</div></div><select aria-label="${esc(p.name)} 훈련" onchange="UI.setFocus(${p.id},this.value)">${Object.entries(F).map(([k,v])=>`<option value="${k}" ${p.focus===k?'selected':''}>${v}</option>`).join('')}</select></div>`;}).join('')}</div>`;
  }else if(ui.sub.dev==='dev'){
    const dev=ut.dev.map(id=>S.players[id]).filter(Boolean);const bench=ut.roster.map(id=>S.players[id]).filter(p=>!ut.lineup.includes(p.id)&&!ut.rotation.includes(p.id)&&p.id!==ut.closer).sort((a,b)=>a.age-b.age);
    h+=`<div class="card">${hd('육성군',`${dev.length} / ${SL.devCap(ut)}명`)}<div class="muted small" style="margin-bottom:6px">1군 경기 대신 육성군 경기로 꾸준히 경험을 쌓습니다. 1군 명단(${SL.BAL.MAX_ROSTER}명)에 포함되지 않지만 연봉은 지급됩니다. 정원은 유소년 센터 레벨로 늘어납니다.</div>
    ${dev.map(p=>`<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세</span></div><div class="sub">종합 ${Math.round(SL.calcOvr(p))} · 잠재 ${SL.potText(p)}</div></div><button class="sm primary" onclick="event.stopPropagation();UI.promote(${p.id})">1군 등록</button></div>`).join('')||'<div class="muted">육성군 선수가 없습니다.</div>'}</div>
    <div class="card">${hd('1군 벤치',`1군 ${ut.roster.length}명`)}${bench.map(p=>`<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세</span></div><div class="sub">종합 ${Math.round(SL.calcOvr(p))} · 잠재 ${SL.potText(p)}</div></div><button class="sm" onclick="event.stopPropagation();UI.demote(${p.id})">육성군으로 이동</button></div>`).join('')||'<div class="muted">벤치 선수가 없습니다.</div>'}</div>`;
  }else if(ui.sub.dev==='winter'){
    const D=S.dispatch;const B=SL.BAL.DISPATCH;
    h+=`<div class="card">${hd('겨울리그 파견',D?(D.phase==='open'?`결정 기간 · ${D.list.length}/${B.max}명`:D.phase==='running'?'겨울리그 진행 중':'이번 겨울 종료'):'비시즌 전용')}<div class="muted small">스토브리그 1~2주차에 ${B.maxAge}세 이하 선수를 호주풍·카리브풍 겨울리그에 보낼 수 있습니다. 파견은 국내 동계훈련을 <b>대신</b>합니다. 주전으로 뛰면 더 크게 성장하고 해외에 노출되지만, 강팀에 보내 벤치에 앉으면 국내 훈련보다 못합니다. 파견비가 들고 개막 때 회복이 덜 된 상태로 시작합니다.</div></div>`;
    if(D){if(D.list.length)h+=`<div class="card">${hd('파견 명단')}${D.list.map(x=>{const p=S.players[x.pid],t=S.teams[x.team];const w=(p.winter||[]).find(w=>w.s===D.s);return prow(p,`${esc(t.name)} · ${x.role}${w?` · 출장 ${Math.round(w.share*100)}% · ${statShort(p,w.st)}`:''}`)+(D.phase==='open'?`<button class="sm ghost" style="margin:-4px 0 8px 50px" onclick="UI.cancelDispatch(${p.id})">파견 취소 (파견비 환불)</button>`:'');}).join('')}</div>`;
      if(D.phase==='open'){const el=SL.userTeam().roster.concat(SL.userTeam().dev).map(id=>S.players[id]).filter(p=>SL.dispatchEligible(p)&&!p.dispatch).sort((a,b)=>(b.scout.est-SL.calcOvr(b))-(a.scout.est-SL.calcOvr(a)));
        h+=`<div class="card">${hd('파견 가능 선수',el.length+'명 · 성장 여지순')}${el.map(p=>{const best=SL.dispatchOptions(p)[0];return `<div class="prow" onclick="UI.dispatchView(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${p.age}세</span></div><div class="sub">최선 파견지: ${esc(best.team.name)} ${best.role} · <span class="chip ${best.gcls}">${best.growth}</span></div></div><button class="sm primary">파견지 고르기</button></div>`;}).join('')||'<div class="muted">대상 선수가 없습니다.</div>'}</div>`;}}
  }else if(ui.sub.dev==='draft'){
    const D=S.draft;
    if(!D)h+=`<div class="card">${hd('고교 드래프트')}<div class="muted">시즌이 끝나면 스토브리그 첫 주에 열립니다. 하위 리그·하위 순위부터 지명하며(3부 8위가 1순위) ${SL.BAL.DRAFT_ROUNDS}라운드로 진행됩니다. 지명 선수는 최저 연봉 3년 계약입니다.</div></div>`;
    else{const myTurn=SL.draftTurn();const cur=D.done?null:S.teams[D.order[D.idx]];const avail=SL.draftAvail().sort((a,b)=>b.scout.est-a.scout.est);
      h+=myTurn?`<div class="decide"><span class="tagline">우리 차례 · ${D.picks.length+1}순위</span><div class="ttl">지명할 선수를 고르세요</div><div class="muted small">1군 ${ut.roster.length}/${SL.BAL.MAX_ROSTER} · 육성군 ${ut.dev.length}/${SL.devCap(ut)}</div><div style="height:10px"></div><div class="btns"><button onclick="UI.draftAutoPick()">자동 지명</button><button class="ghost" onclick="UI.draftPass()">지명 포기</button></div></div>`
        :`<div class="card">${hd(D.s+'시즌 고교 드래프트',`${Math.min(D.idx,D.order.length)} / ${D.order.length}`)}<div class="muted">${D.done?'드래프트가 끝났습니다.':`현재 ${esc(cur?cur.name:'-')} 차례.`} 우리 순번: ${D.order.map((tid,i)=>tid===ut.id?i+1:null).filter(Boolean).join(', ')}순위</div></div>`;
      const mine=D.picks.filter(x=>x.team===ut.id);if(mine.length)h+=`<div class="card">${hd('우리 지명')}${mine.map(x=>x.pid&&S.players[x.pid]?prow(S.players[x.pid],`${x.no}순위 · ${x.dev?'육성군':'1군'}`):`<div class="muted small">${x.no}순위 지명 포기</div>`).join('')}</div>`;
      if(!D.done)h+=`<div class="card">${hd('지명 후보',`${avail.length}명 · 잠재력 추정순`)}${avail.map(p=>`<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${p.pos} · ${esc(p.school)}</span></div><div class="sub">잠재 <b>${SL.potText(p)}</b> (신뢰도 ${SL.confText(p.scout.conf)}) ${p.traits.map(traitChip).join(' ')}</div>${myTurn?`<div class="row" style="margin-top:6px"><button class="sm primary" onclick="event.stopPropagation();UI.draftPick(${p.id},'dev')">육성군 지명</button><button class="sm" onclick="event.stopPropagation();UI.draftPick(${p.id},'roster')">1군 지명</button></div>`:''}</div><div class="rt">${G(SL.calcOvr(p))}</div></div>`).join('')}</div>`;
      else h+=`<div class="card">${hd('전체 지명 결과')}${D.picks.filter(x=>x.pid&&S.players[x.pid]).map(x=>`<div class="small" style="padding:4px 0;border-bottom:1px dashed var(--line)">${x.no}. ${esc(S.teams[x.team].name)} — ${esc(S.players[x.pid].name)} (${S.players[x.pid].pos})</div>`).join('')}</div>`;}
  }else if(ui.sub.dev==='scout'){
    const kinds=[['youth','지역 유망주'],['fa','자유계약'],['domestic','타 구단'],['overseas','해외']];const f=ui.scoutF;
    h+=`<div class="card">${hd('스카우트 파견',`스카우트 조직 Lv.${ut.fac.scout}`)}<div class="subtabs">${kinds.map(k=>`<button class="${ui.scoutKind===k[0]?'on':''}" onclick="UI.set('scoutKind','${k[0]}')">${k[1]}</button>`).join('')}</div>
    <div class="row wrap"><select aria-label="포지션" onchange="UI.setScoutF('pos',this.value)"><option value="ALL">포지션 전체</option><option value="B" ${f.pos==='B'?'selected':''}>야수</option><option value="P" ${f.pos==='P'?'selected':''}>투수</option>${SL.POS_BAT.concat(['SP','RP']).map(p=>`<option ${f.pos===p?'selected':''}>${p}</option>`).join('')}</select><select aria-label="등급" onchange="UI.setScoutF('grade',this.value)"><option value="ALL">현재 등급 전체</option>${['S','A','B','C','D'].map(g=>`<option ${f.grade===g?'selected':''}>${g}</option>`).join('')}</select><select aria-label="잠재력" onchange="UI.setScoutF('minPot',this.value)"><option value="ALL">잠재력 전체</option>${['S','A','B','C'].map(g=>`<option value="${g}" ${f.minPot===g?'selected':''}>잠재 ${g} 이상</option>`).join('')}</select>${ui.scoutKind==='overseas'?`<select aria-label="리그" onchange="UI.setScoutF('league',this.value)"><option value="ALL">해외 전체</option>${Object.entries(SL.BAL.LEAGUES).map(([k,L])=>`<option value="${k}" ${f.league===k?'selected':''}>${L.name}</option>`).join('')}</select>`:''}<input aria-label="최대 나이" type="number" placeholder="최대 나이" style="width:110px" value="${f.maxAge}" onchange="UI.setScoutF('maxAge',this.value)"><input aria-label="최대 가치" type="number" placeholder="최대 가치(만원)" style="width:150px" value="${f.maxValue||''}" onchange="UI.setScoutF('maxValue',this.value)"></div>
    <div class="muted small" style="margin:8px 0">투자 수준에 따라 후보 수와 평가 정확도가 달라집니다. 하루 2회까지.</div>
    <div class="btns" style="grid-template-columns:1fr 1fr 1fr">${[0,1,2].map(l=>`<button class="${ui.scoutLvl===l?'primary':''}" onclick="UI.set('scoutLvl',${l})">${['기본','집중','정밀'][l]}<br><span class="small" style="font-weight:400">${Ms(SL.BAL.SCOUT_COST[l])} · ${SL.BAL.SCOUT_N[l]}명</span></button>`).join('')}</div><div style="height:8px"></div><button class="go big" onclick="UI.scout()">스카우트 보내기</button></div>`;
    const r=S.market.scoutResults;
    if(r){const ps=r.ids.map(id=>S.players[id]).filter(Boolean);h+=`<div class="card">${hd('보고서',{youth:'지역 유망주',fa:'FA',domestic:'타 구단',overseas:'해외'}[r.kind])}${ps.map(p=>prow(p,`${p.teamId!=null?esc(teamName(p.teamId))+' · ':''}가치 ${Ms(SL.calcValue(p))} · 신뢰도 ${SL.confText(p.scout.conf)}`)).join('')||'<div class="muted">모두 계약되었습니다.</div>'}</div>`;}
  }else{
    const ys=S.youth.map(id=>S.players[id]).filter(Boolean);
    h+=`<div class="card">${hd('유소년 승격 후보',`유소년 센터 Lv.${ut.fac.youth}`)}<div class="muted small">시즌 종료 시 올라오며, 새 시즌이 시작되면 미계약 후보는 떠납니다.</div>${ys.map(p=>prow(p,`희망 연봉 ${Ms(SL.playerDemand(p,ut))} · ${p.traits.join(', ')}`)).join('')||'<div class="muted" style="margin-top:8px">현재 후보가 없습니다.</div>'}</div>`;
  }
  return h;
}

// ---------- 이적 ----------
function renderMarket(){
  const ut=SL.userTeam();let h=subtabs('market',[['offers',`받은 제안${S.market.offers.length?' '+S.market.offers.length:''}`],['buy','타 구단'],['fa','FA'],['neg','협상 중'],['list','판매 등록']]);
  if(ui.sub.market==='offers'){h+=S.market.offers.map(offerCard).join('')||`<div class="card muted">받은 제안이 없습니다. 선수 화면 → 계약 탭에서 판매 등록하면 관심 구단이 제안합니다.</div>`;
    const ovs=ut.roster.map(id=>S.players[id]).filter(p=>p.interest);h+=`<div class="card">${hd('해외 구단 관심','관찰 → 검토 → 공식 제안')}${ovs.map(p=>prow(p,esc(SL.interestText(p)))).join('')||'<div class="muted">아직 없습니다.</div>'}</div>`;}
  else if(ui.sub.market==='list'){const listed=S.market.listed.map(id=>S.players[id]).filter(Boolean);h+=`<div class="card">${hd('판매 등록 중',listed.length+'명')}${listed.map(p=>`<div class="prow" onclick="UI.openPlayer(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="sub">가치 ${Ms(SL.calcValue(p))} · ${seasonLine(p)}</div></div><button class="sm" onclick="event.stopPropagation();UI.unlist(${p.id})">해제</button></div>`).join('')||'<div class="muted">선수 화면 → 계약 탭에서 판매 등록하세요.</div>'}</div>`;}
  else if(ui.sub.market==='buy'){
    const f=ui.buyF;let ps=(f.div==='os'?SL.overseasTeams():SL.krTeams().filter(t=>!t.isUser&&(f.div==='all'||t.div===+f.div))).flatMap(t=>t.roster.map(id=>S.players[id]));
    if(f.pos!=='ALL')ps=ps.filter(p=>f.pos==='P'?SL.isPitcher(p):f.pos==='B'?!SL.isPitcher(p):p.pos===f.pos);if(f.grade!=='ALL')ps=ps.filter(p=>SL.gradeOf(SL.calcOvr(p))===f.grade);if(f.minPot&&f.minPot!=='ALL')ps=ps.filter(p=>'DCBAS'.indexOf(SL.gradeOf(p.scout.est))>='DCBAS'.indexOf(f.minPot));if(f.maxAge)ps=ps.filter(p=>p.age<=+f.maxAge);
    ps.sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a));
    h+=`<div class="row wrap" style="margin-bottom:10px"><select aria-label="리그" onchange="UI.setBuyF('div',this.value)"><option value="all">국내 전체</option>${[1,2,3].map(d=>`<option value="${d}" ${f.div==String(d)?'selected':''}>${d}부</option>`).join('')}<option value="os" ${f.div==='os'?'selected':''}>해외 전체</option></select><select aria-label="포지션" onchange="UI.setBuyF('pos',this.value)"><option value="ALL">포지션 전체</option><option value="B" ${f.pos==='B'?'selected':''}>야수</option><option value="P" ${f.pos==='P'?'selected':''}>투수</option>${SL.POS_BAT.concat(['SP','RP']).map(p=>`<option ${f.pos===p?'selected':''}>${p}</option>`).join('')}</select><select aria-label="등급" onchange="UI.setBuyF('grade',this.value)"><option value="ALL">등급 전체</option>${['S','A','B','C','D'].map(g=>`<option ${f.grade===g?'selected':''}>${g}</option>`).join('')}</select><select aria-label="잠재력" onchange="UI.setBuyF('minPot',this.value)"><option value="ALL">잠재력 전체</option>${['S','A','B','C'].map(g=>`<option value="${g}" ${f.minPot===g?'selected':''}>잠재 ${g} 이상</option>`).join('')}</select><input aria-label="최대 나이" type="number" placeholder="최대 나이" style="width:110px" value="${f.maxAge}" onchange="UI.setBuyF('maxAge',this.value)"></div>`;
    h+=`<div class="card">${hd('타 구단 선수',ps.length+'명 · 상위 40명')}${ps.slice(0,40).map(p=>{const wi=SL.willingInfo(p,ut);return prow(p,`${esc(teamName(p.teamId))} · 가치 ${Ms(SL.calcValue(p))} · 우리 팀 예상 <b>${SL.expectedRole(p,ut)}</b> · 의향 <span class="${wi.level==='긍정적'?'ok':wi.level==='부정적'?'bad':''}">${wi.level}</span>`);}).join('')}</div>`;
  }else if(ui.sub.market==='fa'){
    const fa=S.fa.map(id=>S.players[id]).filter(Boolean).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a));
    h+=`<div class="card">${hd('자유계약 선수',`${fa.length}명 · 이적료 없음`)}${fa.map(p=>prow(p,`${p.homecoming===ut.id?'<span class="chip g">친정 복귀 희망</span> ':''}희망 연봉 약 ${Ms(SL.playerDemand(p,ut))} · 우리 팀 예상 <b>${SL.expectedRole(p,ut)}</b> · ${seasonLine(p)}`)).join('')||'<div class="muted">없음</div>'}</div>`;
  }else{
    const negs=S.market.negs;h+=`<div class="card">${hd('진행 중인 협상','자리를 비우면 3일 뒤 무산')}${negs.map(n=>{const p=S.players[n.pid];if(!p)return '';return `<div class="prow" onclick="UI.openTable(${p.id})">${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="sub">${n.mode==='renew'?'재계약':n.stage==='club'?'구단과 이적료 협상':'개인 조건 협상'} · ${n.expires-S.clock}일 남음</div></div><button class="sm primary">테이블로</button></div>`;}).join('')||'<div class="muted">없음</div>'}</div>`;
  }
  return h;
}

// ---------- 구단 ----------
function renderClub(){
  const ut=SL.userTeam();let h=subtabs('club',[['table','순위'],['sched','일정'],['fin','재정'],['fac','시설'],['alumni','출신 선수'],['overseas','해외 리그'],['hist','역대'],['data','저장']]);const sb=ui.sub.club;
  if(sb==='table'){for(let d=1;d<=3;d++){const st=SL.standings(d);h+=`<div class="card">${hd(d+'부 리그',d===ut.div?'우리 리그':'')}<div class="tw"><table><tr><th>#</th><th>구단</th><th>승</th><th>패</th><th>득실</th></tr>${st.map((t,i)=>`<tr class="${t.isUser?'me':''}"><td>${i+1}</td><td style="text-align:left">${esc(t.name)}${i<2&&d>1?' <span class="chip g">승격권</span>':''}${i>=6&&d<3?' <span class="chip r">강등권</span>':''}</td><td>${t.rec.w}</td><td>${t.rec.l}</td><td>${t.rec.rs-t.rec.ra}</td></tr>`).join('')}</table></div></div>`;}h+=`<div class="muted small">동률: 승수 → 승자승 → 득실차 → 득점</div>`;}
  else if(sb==='sched'){const gs=S.schedule.filter(g=>SL.isUserGame(g));h+=`<div class="card">${hd('우리 구단 일정')}<div class="tw"><table><tr><th>일차</th><th style="text-align:left">상대</th><th>장소</th><th>결과</th></tr>${gs.map(g=>{const home=g.home===ut.id;const opp=S.teams[home?g.away:g.home];let r='-';if(g.res){const my=home?g.res.hs:g.res.as,op=home?g.res.as:g.res.hs;r=`<b class="${my>op?'ok':'bad'}">${my>op?'승':'패'}</b> ${my}:${op}`;}return `<tr class="${g.day===S.day&&S.phase==='season'?'me':''}"><td style="text-align:left">${g.day}</td><td style="text-align:left">${esc(opp.name)}</td><td>${home?'홈':'원정'}</td><td>${r}</td></tr>`;}).join('')}</table></div></div>`;}
  else if(sb==='fin'){const f=ut.fin;const pay=SL.payroll(ut);const paid=S.phase==='season'?S.day-1:SL.BAL.SEASON_GAMES;const remain=S.phase==='season'?Math.round(pay*(SL.BAL.SEASON_GAMES-paid)/SL.BAL.SEASON_GAMES):0;const inc=f.tickets+f.sponsor+f.dividend+f.sales;const out=f.salary+f.buys+f.scout+f.facility+f.other+(f.dispatch||0);
    h+=`<div class="stat3"><div><div class="k">현재 현금</div><div class="v ${ut.cash<0?'bad':''}">${Ms(ut.cash)}</div></div><div><div class="k">연간 총연봉</div><div class="v">${Ms(pay)}</div></div><div><div class="k">잔여 급여</div><div class="v due">${Ms(remain)}</div></div></div>
    <div class="card">${hd(S.season+'시즌 수입·지출')}<div class="muted small" style="margin-bottom:8px">연봉은 연간 기준이며 경기일마다 1/${SL.BAL.SEASON_GAMES}씩 차감됩니다. 스폰서·운영비는 개막 때, 리그 배당은 시즌 종료 때 처리됩니다.</div><div class="tw"><table>
    <tr><th>수입</th><th></th></tr><tr><td>입장 수입</td><td>${M(f.tickets)}</td></tr><tr><td>스폰서</td><td>${M(f.sponsor)}</td></tr><tr><td>리그 배당</td><td>${M(f.dividend)}</td></tr><tr><td>선수 판매</td><td class="ok">${M(f.sales)}</td></tr><tr><td class="b">합계</td><td class="b">${M(inc)}</td></tr>
    <tr><th>지출</th><th></th></tr><tr><td>급여</td><td>${M(f.salary)}</td></tr><tr><td>영입·계약금</td><td>${M(f.buys)}</td></tr><tr><td>스카우트</td><td>${M(f.scout)}</td></tr><tr><td>겨울리그 파견비</td><td>${M(f.dispatch||0)}</td></tr><tr><td>시설·운영비</td><td>${M(f.facility)}</td></tr><tr><td>위약금·대출 상환</td><td>${M(f.other)}</td></tr><tr><td class="b">합계</td><td class="b">${M(out)}</td></tr></table></div>
    ${ut.loan?`<div class="warnbox" style="margin-top:10px">대출 잔액 ${M(ut.loan)} — 다음 시즌 개막 때 상환</div>`:''}</div>
    <div class="card">${hd('긴급 대출',`한도 ${Ms(SL.BAL.LOAN_CAP)} · 이자 ${SL.BAL.LOAN_RATE*100}% · 명성 -2`)}<div class="row"><input id="loanAmt" aria-label="대출액" type="number" value="10000"><button onclick="UI.loan()">대출</button></div></div>`;}
  else if(sb==='fac'){const F=SL.BAL.FACILITY;const desc={train:['훈련장','성장 속도 +12%/Lv, 피로 회복 증가'],youth:['유소년 센터','유망주 수·잠재력, 육성군 정원 증가'],scout:['스카우트 조직','보고서 정확도·후보 수 증가']};
    h+=`<div class="card">${hd('시설','유지비는 개막 때 차감')}${Object.keys(F).map(k=>{const lv=ut.fac[k];const now=SL.facEffect(k,lv),nx=lv<5?SL.facEffect(k,lv+1):null;return `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div class="row sb"><div><b>${desc[k][0]}</b> <span class="chip n">Lv.${lv}</span></div><button class="sm ${lv<5?'go':''}" ${lv>=5?'disabled':''} onclick="UI.upgrade('${k}')">${lv>=5?'최대 레벨':`Lv.${lv+1} 업그레이드 ${Ms(F[k].cost*lv)}`}</button></div>
    <div class="tw" style="margin-top:6px"><table><tr><th>효과</th><th>현재</th>${nx?'<th>업그레이드 후</th>':''}</tr>${now.map((x,i)=>{const [kk,...vv]=x.split(' ');const nv=nx?nx[i].split(' ').slice(1).join(' '):'';const cv=vv.join(' ');return `<tr><td>${esc(x.replace(cv,'').trim())}</td><td>${esc(cv)}</td>${nx?`<td class="${nv!==cv?'up':''}">${esc(nv)}</td>`:''}</tr>`;}).join('')}<tr><td>유지비/시즌</td><td>${Ms(F[k].upkeep*lv)}</td>${nx?`<td class="due">${Ms(F[k].upkeep*(lv+1))} (+${Ms(F[k].upkeep)})</td>`:''}</tr></table></div></div>`;}).join('')}</div>`;}
  else if(sb==='overseas'){h+=`<div class="muted small" style="margin-bottom:10px">모든 해외 무대는 실제 리그·구단과 무관한 가상 설정입니다. 승강제와 현금 이적은 이 게임만의 규칙입니다.</div>`;
    for(const [lg,L] of Object.entries(SL.BAL.LEAGUES)){const hs=L.winter?(S.overseas.whist||[]):(S.overseas.hist||[]);const last=hs[hs.length-1];const ts=SL.overseasTeams().filter(t=>t.league===lg);const rows=last&&last.tables[lg]?last.tables[lg].map(r=>({t:S.teams[r.id],w:r.w,l:r.l})).filter(r=>r.t):ts.map(t=>({t,w:'-',l:'-'}));
      h+=`<div class="card">${hd(L.name,`${L.style}${L.winter?' 겨울리그':''} · 수준 ${SL.BAL.LEVEL_OVR[lg]}${last?' · '+last.s+'시즌'+(L.winter?' 겨울':'')+' 최종':''}`)}<div class="tw"><table><tr><th>구단</th><th>승</th><th>패</th><th>자금</th></tr>${rows.map(r=>`<tr><td>${esc(r.t.name)}</td><td>${r.w}</td><td>${r.l}</td><td>${Ms(r.t.cash)}</td></tr>`).join('')}</table></div></div>`;}
    const abroad=Object.values(S.players).filter(p=>p.userLink&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR');
    h+=`<div class="card">${hd('해외에서 뛰는 우리 출신')}${abroad.map(p=>prow(p,esc(teamName(p.teamId))+' · '+seasonLine(p))).join('')||'<div class="muted">아직 없습니다.</div>'}</div>`;}
  else if(sb==='alumni'){const al=Object.values(S.players).filter(p=>p.exUser&&!p.retired&&p.teamId!==ut.id).sort((a,b)=>SL.calcValue(b)-SL.calcValue(a));
    h+=`<div class="card">${hd('떠난 우리 출신 선수',al.length+'명')}${al.map(p=>{const t=p.teamId!=null?S.teams[p.teamId]:null;const last=p.transfers.filter(x=>x.from===ut.name).pop();return prow(p,`${t?esc(t.name)+(t.league==='KR'?' '+t.div+'부':' (해외)'):'FA'} · ${seasonLine(p)}${p.sellOn&&p.sellOn.team===ut.id?' · <span class="chip g">셀온 10%</span>':''}${last?` · ${last.s}시즌 ${last.fee?Ms(last.fee)+' 판매':'이적'}`:''}`);}).join('')||'<div class="muted">아직 떠난 선수가 없습니다.</div>'}</div>
    <div class="card">${hd('관련 소식')}${S.news.filter(n=>n.kind==='alumni').slice(0,12).map(n=>`<div class="small" style="padding:5px 0;border-bottom:1px dashed var(--line)">${esc(n.text)}</div>`).join('')||'<div class="muted">없음</div>'}</div>`;}
  else if(sb==='hist'){const ms=(S.mgr&&S.mgr.seasons)||[];
    if(ms.length)h+=`<div class="card">${hd('감독 실적','다음 단계 평판·이직 제안에 반영 예정')}<div class="tw"><table><tr><th>시즌</th><th>예상→실제</th><th>결과</th><th>전력 시작→끝</th><th>판매</th><th>육성 성공</th><th>해외 정착</th></tr>${ms.slice().reverse().map(m=>`<tr><td>${m.s} (${m.div}부)</td><td>${m.expRank?m.expRank+'위 → ':''}${m.rank}위${m.expRank&&m.expRank-m.rank>=2?' <span class="up">↑</span>':''}</td><td>${m.promoted?'<b class="ok">승격</b>':m.relegated?'<b class="bad">강등</b>':'잔류'}</td><td>${m.powerStart!=null?m.powerStart+' → '+m.powerEnd:'-'}</td><td>${m.sales?m.sales+'명 '+Ms(m.salesFee):'-'}</td><td>${m.devHits||0}</td><td>${m.abroad||0}</td></tr>`).join('')}</table></div><div class="muted small" style="margin-top:6px">주전을 팔아 전력이 무너지면 '전력 시작→끝'에서 드러납니다. 판매 이익만으로는 좋은 평가를 받지 못합니다.</div></div>`;
    h+=S.history.slice().reverse().map(r=>`<div class="card">${hd(r.s+'시즌',`우리 ${r.user.div}부 ${r.user.rank}위 (${r.user.w}-${r.user.l})`)}<div class="small">승격: ${esc(r.promoted.join(', ')||'-')}<br>강등: ${esc(r.relegated.join(', ')||'-')}<br>우승: 1부 ${esc(r.tables[1][0].name)} · 2부 ${esc(r.tables[2][0].name)} · 3부 ${esc(r.tables[3][0].name)}</div></div>`).join('')||'<div class="card muted">아직 끝난 시즌이 없습니다.</div>';}
  else{h+=`<div class="card">${hd('저장','모든 진행 후 자동 저장')}<div class="btns"><button class="primary" onclick="UI.saveNow()">수동 저장</button><button onclick="UI.exportSave()">JSON 내보내기</button></div>
    <div style="height:12px"></div><input type="file" id="impfile2" accept=".json,application/json" style="width:100%"><div style="height:6px"></div><button onclick="UI.importFile(2)">파일로 불러오기</button><div style="height:8px"></div><textarea id="imp_json" placeholder="또는 JSON 내용을 붙여넣기" style="width:100%;height:60px;font-size:11px"></textarea><div style="height:6px"></div><button onclick="UI.importText('imp_json')">붙여넣은 JSON 불러오기</button>
    <div class="muted small" style="margin-top:8px">잘못된 파일은 현재 진행을 덮어쓰지 않습니다.</div></div>
    <div class="card">${hd('새 게임')}<button class="danger" onclick="UI.resetGame()">현재 진행 삭제 후 새 게임</button></div>`;}
  return h;
}

// ---------- 선수 상세 (전체 화면) ----------
function renderPlayer(v){
  const p=S.players[v.id];if(!p)return '';const ut=SL.userTeam();const mine=p.teamId===ut.id;const ovr=SL.calcOvr(p);const isP=SL.isPitcher(p);const keys=isP?SL.PIT_KEYS:SL.BAT_KEYS;
  const t=p.teamId!=null?S.teams[p.teamId]:null;const r=SL.report(p);const tab=v.tab||'ability';const gt={early:'조숙형',normal:'일반형',late:'대기만성형'}[p.growthType];
  const baseAttrs=(S.phase==='season'?(p.snapPrev||p.snap):p.snap)||{attrs:p.attrs};
  const where=t?esc(t.name)+(t.league==='KR'?` (${t.div}부)`:' (해외)'):p.youth?'유소년 후보':p.draft?'드래프트 후보 · '+esc(p.school||''):p.scouted?'스카우트 후보':p.retired?'은퇴':'자유계약(FA)';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">선수 정보</span><span style="margin-left:auto"><button aria-label="관심 선수 고정" style="font-size:22px" onclick="UI.pin(${p.id})">${S.pins.includes(p.id)?'★':'☆'}</button></span></div><div class="content gut" style="padding-bottom:16px">`;
  h+=`<div class="phero">${face(p,88)}<div style="min-width:0"><div class="nm">${esc(p.name)} ${G(ovr)}</div><div class="muted">${p.age}세 · ${p.pos} · ${SL.NAT_KO[p.nat]||''} · ${p.bats==='S'?'양타':p.bats==='L'?'좌타':'우타'}/${p.throws==='L'?'좌투':'우투'}${isP?' · '+SL.velocity(p)+'km/h':''}</div><div class="small">${where}${mine?' · '+esc(role(p)):''}${p.dispatch?' · <span class="chip o">겨울리그 파견 중</span>':''}</div><div style="margin-top:4px">${standChips(p)}</div></div></div>`;
  const sd=SL.seasonDelta(p);const sl=S.phase==='season'?'이번 시즌':'지난 시즌';
  h+=`<div class="stat3"><div><div class="k">현재 능력</div><div class="v">${Math.round(ovr)}</div>${sd&&sd.d?`<span class="small ${sd.d>0?'up':'dn'}">${sl} ${sd.d>0?'+':''}${sd.d}</span>`:''}</div><div><div class="k">예상 잠재</div><div class="v">${SL.potText(p)}</div><span class="chip ${p.scout.conf>=0.65?'g':p.scout.conf<0.35?'o':''}">신뢰도 ${SL.confText(p.scout.conf)}</span></div><div><div class="k">시장가치</div><div class="v">${Ms(SL.calcValue(p))}</div>${sd&&sd.v!=null&&Math.abs(sd.v)>=100?`<span class="small ${sd.v>0?'up':'dn'}">${sd.v>0?'+':''}${Ms(sd.v)}</span>`:''}</div></div>`;
  if(r&&r.d!==0){const neg=r.d<0;h+=`<div class="gban" style="${neg?'background:var(--red-bg);border-color:transparent':''}"><div class="l" style="${neg?'color:var(--red-ink)':''}">${S.phase==='season'?r.s+'시즌 개막 대비':r.s+'시즌 성장'}</div><div><div class="k">종합</div><div class="v">${r.from} → <em style="${neg?'color:var(--red-ink)':''}">${r.to}</em></div></div>${r.bestD>0.5?`<div><div class="k">${SL.ATTR_KO[r.bestK]}</div><div class="v">${Math.round(r.bestFrom)} → <em>${Math.round(p.attrs[r.bestK])}</em></div></div>`:`<div><div class="k">가치</div><div class="v">${Ms(r.valTo)}</div></div>`}</div>`;}
  h+=`<div class="seg" role="tablist">${[['ability','능력·성장'],['record','기록'],['contract','계약']].map(x=>`<button role="tab" class="${tab===x[0]?'on':''}" onclick="UI.pTab('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
  if(tab==='ability'){
    h+=`<div class="card">${keys.map(k=>{const val=p.attrs[k];const b=baseAttrs.attrs[k]!=null?baseAttrs.attrs[k]:val;const d=Math.round((val-b)*10)/10;const w=Math.max(0,Math.min(100,val));const w0=Math.max(0,Math.min(100,Math.min(val,b)));
      return `<div class="attr"><span class="k">${SL.ATTR_KO[k]}</span><div class="bar" role="img" aria-label="${SL.ATTR_KO[k]} ${Math.round(val)}"><s style="width:${w.toFixed(1)}%"></s><i style="width:${w0.toFixed(1)}%"></i></div><span class="v">${Math.round(val)}</span><span class="d ${d>0.05?'up':d<-0.05?'dn':'muted'}">${d>0.05?'+'+d:d<-0.05?d:'–'}</span></div>`;}).join('')}
    <div class="muted small" style="margin-top:4px">진한 막대 = 기준 시점 능력, 옅은 부분 = 이후 성장</div>
    <div class="row wrap" style="margin-top:10px;gap:6px">${p.traits.map(traitChip).join('')}<span class="chip">${gt}</span></div></div>`;
    const dg=SL.diagnose(p);
    h+=`<div class="card">${hd('육성 진단',esc(dg.arch))}${dg.lines.map(l=>`<div class="row" style="align-items:flex-start;padding:4px 0"><span class="chip ${l.warn?'o':''}" style="min-width:74px;justify-content:center">${l.k}</span><span class="grow" style="font-size:14px">${esc(l.t)}</span></div>`).join('')}
    <div class="row" style="align-items:flex-start;padding:4px 0"><span class="chip g" style="min-width:74px;justify-content:center">처방</span><span class="grow" style="font-size:14px"><b>${esc(dg.recText)}</b>${mine&&dg.rec!==p.focus?` <button class="sm go" onclick="UI.setFocus(${p.id},'${dg.rec}');UI.render()">적용</button>`:mine&&dg.rec===p.focus?' <span class="chip g">적용 중</span>':''}</span></div>
    <div class="muted small" style="margin-top:4px">목표: ${esc(dg.goal)}</div></div>`;
    if(mine){const F=isP?SL.FOCUS_PIT:SL.FOCUS_BAT;const lg=p.log[0];const nc=SL.nextCheck();
      h+=`<div class="card">${hd('훈련 방향',nc?`다음 점검 ${nc}경기 후`:'다음 점검: 개막 동계훈련')}<select id="focusSel" aria-label="훈련 방향" style="width:100%" onchange="UI.setFocus(${p.id},this.value)">${Object.entries(F).map(([k,val])=>`<option value="${k}" ${p.focus===k?'selected':''}>${val}${k==='balance'?'':' 집중'}${k===dg.rec?' (추천)':''}</option>`).join('')}</select>
      ${lg?`<div class="okbox" style="margin:10px 0 0;${lg.d<0?'background:var(--red-bg);border-color:var(--red)':''}"><b>${esc(lg.label)} 성장 ${lg.d>0?'+':''}${lg.d||0}</b><br><span class="small">${esc(lg.f.join(' · '))}</span></div>`:'<div class="muted small" style="margin-top:6px">아직 성장 점검 기록이 없습니다.</div>'}
      ${SL.userTeam().lineup.includes(p.id)||SL.userTeam().locks?.[p.id]?`<label class="toggle" for="lockp"><input id="lockp" type="checkbox" ${SL.userTeam().locks?.[p.id]?'checked':''} onchange="UI.toggleLock(${p.id})"> 주전 고정${p.age<=24?' (육성 약속: 꾸준한 출장으로 성장 보너스)':''}</label>`:''}</div>`;}
    const l=lastSt(p);if(l){const s=SL.statLine(p,l.st);h+=`<div class="strip"><b class="small">${l.label}</b>${isP?`<div><div class="v">${s.era}</div><div class="k">ERA</div></div><div><div class="v">${s.w}-${s.l}</div><div class="k">승-패</div></div><div><div class="v">${s.ip}</div><div class="k">이닝</div></div>`:`<div><div class="v">${s.avg}</div><div class="k">타율</div></div><div><div class="v">${s.hr}</div><div class="k">홈런</div></div><div><div class="v">${s.g}</div><div class="k">경기</div></div>`}</div>`;}
    if(p.log.length)h+=`<div class="card">${hd('성장 내역')}${p.log.slice(0,6).map(l=>{const ch=Object.entries(l.ch);return `<div class="small" style="padding:6px 0;border-bottom:1px dashed var(--line)"><div class="row sb"><b>${esc(l.label)}</b><span>종합 ${l.ovr}</span></div>${ch.map(([k,val])=>`<span class="${val>0?'up':'dn'}">${SL.ATTR_KO[k]} ${val>0?'+':''}${val}</span>`).join(' · ')||'<span class="muted">변화 없음</span>'}<div class="muted">${esc(l.f.join(' · '))}</div></div>`;}).join('')}</div>`;
    h+=`<div class="card">${hd('스카우트 의견')}${SL.scoutReport(p).map(x=>`<div class="small" style="padding:2px 0">· ${esc(x)}</div>`).join('')}${!mine?`<div style="height:8px"></div><button class="ghost" style="width:100%" onclick="UI.compare(${p.id})">우리 팀 ${SL.POS_KO[p.pos]}과 비교</button>`:''}</div>`;
  }else if(tab==='record'){
    const rows=[...p.hist.map(x=>({s:x.s,tn:x.tn,st:x.st})),...(p.cur.g||p.cur.pG?[{s:S.season,tn:t?t.name:'-',st:p.cur,cur:true}]:[])];
    h+=`<div class="card">${hd('시즌별 기록','* 진행 중')}${rows.length?`<div class="tw"><table>${isP?`<tr><th>시즌</th><th style="text-align:left">구단</th><th>경기</th><th>이닝</th><th>승</th><th>패</th><th>SV</th><th>ERA</th><th>K</th></tr>${rows.map(x=>{const s=SL.statLine(p,x.st);return `<tr><td>${x.s}${x.cur?'*':''}</td><td style="text-align:left">${esc(x.tn)}</td><td>${s.g}</td><td>${s.ip}</td><td>${s.w}</td><td>${s.l}</td><td>${s.sv}</td><td>${s.era}</td><td>${s.so}</td></tr>`;}).join('')}`:`<tr><th>시즌</th><th style="text-align:left">구단</th><th>경기</th><th>타율</th><th>HR</th><th>타점</th><th>OPS</th><th>BB</th><th>K</th></tr>${rows.map(x=>{const s=SL.statLine(p,x.st);return `<tr><td>${x.s}${x.cur?'*':''}</td><td style="text-align:left">${esc(x.tn)}</td><td>${s.g}</td><td>${s.avg}</td><td>${s.hr}</td><td>${s.rbi}</td><td>${s.ops}</td><td>${s.bb}</td><td>${s.so}</td></tr>`;}).join('')}`}</table></div>`:'<div class="muted">기록이 없습니다.</div>'}</div>`;
    if(p.winter&&p.winter.length)h+=`<div class="card">${hd('겨울리그 파견 기록')}${p.winter.map(w=>`<div class="small" style="padding:4px 0;border-bottom:1px dashed var(--line)">${w.s}시즌 겨울 · ${esc(w.tn)} (${SL.BAL.LEAGUES[w.lg].name}) · ${w.role} · 출장 ${Math.round(w.share*100)}% · ${statShort(p,w.st)}</div>`).join('')}</div>`;
    h+=`<div class="card">${hd('가치 변화')}<div class="small">${p.valHist.map(x=>`${x[0]}시즌 <b>${Ms(x[1])}</b>`).join(' → ')}${p.valHist.length?' → ':''}현재 <b class="ok">${Ms(SL.calcValue(p))}</b></div></div>`;
    if(p.base){const b0={...p,attrs:p.base};h+=`<div class="card">${hd('영입 당시 대비')}<div class="small">종합 ${Math.round(SL.calcOvr(b0))} → <b>${Math.round(ovr)}</b> · ${keys.map(k=>{const d=Math.round(p.attrs[k]-p.base[k]);return d?`${SL.ATTR_KO[k]} <span class="${d>0?'up':'dn'}">${d>0?'+':''}${d}</span>`:'';}).filter(Boolean).join(' · ')||'변화 없음'}</div></div>`;}
    if(p.transfers.length)h+=`<div class="card">${hd('구단 이동 이력')}${p.transfers.map(x=>`<div class="small" style="padding:3px 0">${x.s}시즌 ${esc(x.from)} → ${esc(x.to)} <span class="muted">(${esc(x.kind)}${x.fee?', '+M(x.fee):''})</span></div>`).join('')}</div>`;
  }else{
    if(p.contract){const urgent=(p.contract.years<=1&&S.phase==='season')||p.contract.years<=0;h+=`<div class="card">${hd('계약')}<div class="stat3" style="margin-bottom:8px"><div><div class="k">연봉</div><div class="v">${Ms(p.contract.salary)}</div></div><div><div class="k">잔여</div><div class="v">${Math.max(0,p.contract.years)}시즌</div></div><div><div class="k">사기</div><div class="v ${p.morale<40?'bad':p.morale>=70?'ok':''}">${p.morale}</div></div></div><div class="${urgent?'due b':''}">${esc(SL.contractText(p))}</div>${p.promise?`<div class="small" style="margin-top:6px"><span class="chip o">주전 출장 약속 중</span> 시즌 14일차에 확인</div>`:''}</div>`;}
    if(p.interest)h+=`<div class="card">${hd('해외 관심')}<div>${esc(SL.interestText(p))}</div></div>`;
    h+=`<div class="card">${hd('무대별 위상','능력치는 같고 상대 수준만 다름')}<div class="tw"><table><tr><th>무대</th><th>수준</th><th>이 선수</th></tr>${SL.standingAll(p).map(x=>`<tr${t&&SL.leagueKey(t)===x.key?' class="me"':''}><td>${esc(x.name)}</td><td>${x.lvl}</td><td><span class="chip ${x.cls}">${x.label}</span></td></tr>`).join('')}</table></div><div class="muted small" style="margin-top:6px">리그 위상은 각 리그 같은 포지션 주전들과의 비교, 구단 내 역할은 그 팀 포지션 경쟁으로 따로 판단합니다.</div></div>`;
    if(!mine&&!p.retired&&p.teamId!=null){const wi=SL.willingInfo(p,ut);h+=`<div class="card">${hd('우리 구단 이적 의향')}<div><b class="${wi.level==='긍정적'?'ok':wi.level==='부정적'?'bad':''}">${wi.level}</b> — ${esc(wi.reasons.join(', '))}</div><div class="muted small" style="margin-top:4px">시장가치 ${M(SL.calcValue(p))} (참고값, 구단 요구액과 다를 수 있음)</div></div>`;}
    if(mine&&!p.retired&&!ut.dev.includes(p.id))h+=saleCard(p);
    if(mine&&!p.retired){const listed=S.market.listed.includes(p.id);const inDev=ut.dev.includes(p.id);
      h+=`<div class="card">${hd('관리')}<div class="btns"><button class="primary" onclick="UI.openTable(${p.id})">재계약 협상</button><button class="${listed?'':'warn'}" onclick="UI.${listed?'unlist':'list'}(${p.id})">${listed?'판매 등록 해제':'판매 등록'}</button><button onclick="UI.${inDev?'promote':'demote'}(${p.id})">${inDev?'1군 등록':'육성군으로 이동'}</button><button class="ghost" onclick="UI.confirmRelease(${p.id})">방출</button></div></div>`;}
  }
  h+=`</div>`;
  if(!p.retired){if(mine)h+=`<div class="actbar gut"><button class="go" onclick="UI.focusTrain()">훈련 변경</button><button class="ghost" onclick="UI.pTab('contract')">계약·이적</button></div>`;
    else if(!t||t.league)h+=`<div class="actbar gut"><button class="ghost" onclick="UI.pin(${p.id})">${S.pins.includes(p.id)?'고정 해제':'관심 고정'}</button><button class="primary" onclick="UI.openTable(${p.id})">${!t?'계약 협상':'영입 협상'}</button></div>`;}
  return h+`</div>`;
}

function saleCard(p){const im=SL.saleImpact(p.id);if(!im)return '';const nc=im.newcomers;
  return `<div class="card">${hd('판매하면?','지금 기준 시뮬레이션')}<div class="row" style="gap:12px;margin-bottom:6px"><div><div class="muted small">팀 전력</div><div style="font-family:var(--f-display);font-size:22px">${im.before.toFixed(1)} → <span class="${im.delta<0?'bad':'ok'}">${im.after.toFixed(1)}</span></div></div><div class="small ${im.delta<=-1?'bad':im.delta<0?'due':'ok'}"><b>${im.delta>0?'+':''}${im.delta}</b><br>${im.delta<=-1.5?'큰 전력 손실':im.delta<=-0.5?'다소 손실':'영향 작음'}</div></div>
  ${nc.length?nc.map(x=>`<div class="prow" onclick="UI.openPlayer(${x.p.id})">${face(x.p,34)}<div class="grow"><div class="nm">${esc(x.p.name)} <span class="muted small" style="font-weight:400">${x.p.age}세 · 본래 ${x.p.pos}</span></div><div class="sub">기회를 얻는 선수 → ${esc(x.pos)}${x.p.age<=24?' · <span class="up">출장 늘면 성장 가속</span>':''} · 잠재 ${SL.potText(x.p)}</div></div>${G(SL.calcOvr(x.p))}</div>`).join(''):'<div class="muted small">주전이 아니라 당장 편성 변화는 없습니다.</div>'}
  <div class="muted small" style="margin-top:6px">판매 시 셀온 ${Math.round(SL.BAL.SELL_ON*100)}%: 이 선수가 다시 팔리면 이적료의 ${Math.round(SL.BAL.SELL_ON*100)}%가 우리에게 들어옵니다.</div></div>`;}
function renderDispatch(v){const p=S.players[v.pid];if(!p)return '';const D=S.dispatch;const opts=SL.dispatchOptions(p);const open=D&&D.phase==='open';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">겨울리그 파견지</span></div><div class="content gut" style="padding-bottom:16px">
  <div class="row" style="gap:12px;margin-bottom:12px">${face(p,64)}<div><div style="font-family:var(--f-display);font-size:22px">${esc(p.name)}</div><div class="muted">${p.age}세 · ${SL.POS_KO[p.pos]} · 종합 ${Math.round(SL.calcOvr(p))} · 잠재 ${SL.potText(p)}</div></div></div>
  <div class="okbox">국내 동계훈련을 선택하면 파견비 없이 안정적으로 성장하고, 개막 때 완전히 회복된 상태로 시작합니다.</div>`;
  h+=opts.map(o=>{const t=o.team;const L=SL.BAL.LEAGUES[t.league];const ls=SL.leagueStanding(p,t.league);return `<div class="card"><div class="row sb"><div class="row">${emblem(t,40)}<div><b>${esc(t.name)}</b>${o.need?' <span class="chip o">파견 요청</span>':''}<div class="muted small">${L.name} (${L.style}) · 수준 ${SL.BAL.LEVEL_OVR[t.league]}</div></div></div><b class="${o.role==='주전'?'ok':o.role==='벤치'?'bad':''}">${o.role}</b></div>
    <div class="small" style="margin-top:8px;line-height:1.7">이 리그에서: <span class="chip ${ls.cls}">${ls.label}</span> · 예상 출장 ${Math.round(o.share*100)}%<br>성장 기대: <span class="chip ${o.gcls}">${o.growth}</span> · 파견비 ${Ms(o.fee)}</div>
    ${open?`<div style="height:8px"></div><button class="${o.role==='주전'||o.role==='주전 경쟁'?'primary':'ghost'}" style="width:100%" onclick="UI.dispatch(${p.id},${t.id})">이 구단에 파견</button>`:''}</div>`;}).join('');
  if(open)h+=`<button class="ghost big" onclick="UI.declineDispatch(${p.id});UI.back()">국내에서 집중 훈련</button>`;
  return h+`</div></div>`;}
// ---------- 협상 테이블 ----------
function renderTable(v){
  const p=S.players[v.pid];const ut=SL.userTeam();if(!p)return '';const neg=S.market.negs.find(n=>n.pid===v.pid);
  const done=v.result;const log=done?v.result.log:neg?neg.log:[];const fromT=v.fromTeam!=null?S.teams[v.fromTeam]:null;
  const stage=neg?neg.stage:'done';const mood=neg?neg.mood:(done&&done.mood)||50;const moodC=mood>=65?'#4fd18e':mood>=40?'#f0b44c':'#f07a6e';
  const agentNm=(neg&&neg.agent)||v.agent;const otherName=stage==='club'&&fromT?fromT.name+' 단장':agentNm?`${agentNm} (대리인)`:p.name;
  const title=(neg&&neg.mode==='renew')||v.mode==='renew'?'재계약 협상':stage==='club'?'이적료 협상':'계약 협상';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">${title}</span>${neg?`<span class="small" style="margin-left:auto;color:var(--on-navy-dim)">남은 제시 ${neg.maxRounds-neg.rounds}회</span>`:''}</div>
  <div class="table-top gut"><div class="seats"><div>${stage==='club'&&fromT?emblem(fromT,64):face(p,64)}<div class="nm">${esc(otherName)}</div><div class="rl">${stage==='club'&&fromT?`${esc(p.name)} 보유 구단`:`${p.pos} · ${p.age}세 · 종합 ${Math.round(SL.calcOvr(p))}`}</div></div><div class="vs">VS</div><div>${emblem(ut,64)}<div class="nm">단장 (나)</div><div class="rl">현금 ${Ms(ut.cash)}</div></div></div><div class="desk"></div>
  ${(neg&&stage!=='club')||done?`<div class="mood">협상 분위기 <b style="color:${moodC}">${mood>=65?'우호적':mood>=40?'신중':'냉랭'}</b><div class="track"><i style="width:${mood}%;background:${moodC}"></i></div></div>`:''}</div>
  <div class="content gut" style="padding-bottom:12px"><div class="chat" id="chat">${bubbles(log,{player:p.name,agent:agentNm||p.name,club:fromT?fromT.name:'구단'})}</div>`;
  if(done){h+=`<div class="${done.done?'okbox':'warnbox'}">${esc(done.msg||'')}</div><button class="primary big" onclick="UI.back()">${done.done?'선수 화면으로':'돌아가기'}</button></div></div>`;return h;}
  if(!neg){h+=`<div class="warnbox">협상 기한이 지나 테이블이 정리되었습니다.</div><button class="primary big" onclick="UI.back()">돌아가기</button></div></div>`;return h;}
  h+=`</div><div class="offerform gut">`;const f=ui.form;
  if(stage==='club'){const st=Math.max(100,Math.round(neg.ask*0.05/100)*100);h+=`<label for="tf_fee">이적료 (만원) · 시장가치 ${Ms(SL.calcValue(p))}</label><div class="stepper"><button aria-label="감소" onclick="UI.bump('fee',-${st})">−</button><input id="tf_fee" type="number" value="${f.fee}" onchange="UI.setF('fee',+this.value)"><button aria-label="증가" onclick="UI.bump('fee',${st})">＋</button></div><div style="height:10px"></div><div class="btns"><button class="ghost" onclick="UI.leaveTable()">자리에서 일어나기</button><button class="primary" onclick="UI.tableSubmit()">이적료 제안</button></div>`;}
  else{const step=Math.max(10,Math.round(neg.demand*0.04/10)*10);const signCost=neg.mode==='sign'?Math.round(SL.calcValue(p)*0.1):0;const total=(neg.fee||0)+(f.bonus||0)+signCost;
    h+=`<div class="two"><div><label for="tf_sal">연봉 (만원/년)</label><div class="stepper"><button aria-label="연봉 감소" onclick="UI.bump('salary',-${step})">−</button><input id="tf_sal" type="number" value="${f.salary}" onchange="UI.setF('salary',+this.value)"><button aria-label="연봉 증가" onclick="UI.bump('salary',${step})">＋</button></div></div>
    <div><label for="tf_bonus">계약금 (만원)</label><div class="stepper"><button aria-label="계약금 감소" onclick="UI.bump('bonus',-${step*2})">−</button><input id="tf_bonus" type="number" value="${f.bonus}" onchange="UI.setF('bonus',+this.value)"><button aria-label="계약금 증가" onclick="UI.bump('bonus',${step*2})">＋</button></div></div></div>
    <label style="margin-top:8px">계약 기간</label><div class="yrs">${[1,2,3,4].map(y=>`<button class="${f.years===y?'on':''}" onclick="UI.setF('years',${y})">${y}년</button>`).join('')}</div>
    ${neg.wantPromise&&neg.mode!=='renew'?`<label class="toggle" for="tf_prom"><input id="tf_prom" type="checkbox" ${f.promise?'checked':''} onchange="UI.setF('promise',this.checked)"> 주전 출장 약속 <span class="muted small">(어기면 사기 크게 하락)</span></label>`:''}
    <div class="muted small" style="margin:6px 0">${neg.revealed?`요구 수준 약 <b>${Ms(neg.revealed)}</b>`:`예상 요구 ${Ms(neg.hint[0])}~${Ms(neg.hint[1])}`} · 계약금은 연봉으로 일부 환산 · 즉시 지출 ${Ms(total)}${neg.fee?` (이적료 포함)`:''}${signCost?` (FA 계약금 ${Ms(signCost)} 포함)`:''}</div>
    <div class="btns"><button class="ghost" onclick="UI.leaveTable()">자리에서 일어나기</button><button class="primary" onclick="UI.tableSubmit()">조건 제시</button></div>`;}
  h+=`</div></div>`;return h;
}
// ---------- 받은 제안 검토 ----------
function renderOffer(v){
  const o=S.market.offers.find(x=>x.id===v.id);const lg=ui.offerLog[v.id]||[];const names={club:v.club||'구단',them:v.pname||'선수'};
  if(!o){return `<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">제안 검토</span></div><div class="content gut"><div class="chat" id="chat">${bubbles(lg,names)}</div><div class="${v.ok?'okbox':'warnbox'}">${esc(v.msg||'제안이 마감되었습니다.')}</div><button class="primary big" onclick="UI.back()">돌아가기</button></div></div>`;}
  const p=S.players[o.pid],t=S.teams[o.team];const os=o.type==='overseas';const r=SL.report(p);v.club=t.name;v.pname=p.name;names.club=t.name;names.them=p.name;
  if(!ui.offerLog[o.id]){ui.offerLog[o.id]=[{who:'club',text:`${t.name}입니다. ${p.name} 선수에게 이적료 ${SL.josa(M(o.fee),'을','를')} 제안합니다.${os?` 선수에게는 연봉 ${M(o.salary)}, ${o.years}년을 보장합니다.`:''}`},
    {who:'them',text:os?(o.pw>=0.65?'큰 무대에서 뛰어보고 싶습니다. 좋은 기회예요.':o.pw>=0.4?'솔직히 고민됩니다. 조건을 더 들어봐야겠어요.':'지금은 여기서 더 뛰고 싶습니다.'):o.willing?`${(o.reasons||[])[0]||'좋은 기회'}… 저는 가도 괜찮습니다.`:`${(o.reasons||[]).join(', ')}. 저는 가고 싶지 않습니다.`}];}
  const log=ui.offerLog[o.id];const st=Math.max(100,Math.round(o.fee*0.05/100)*100);const ctv=ui.ctId===o.id&&ui.ct!=null?ui.ct:Math.round(o.fee*1.15/100)*100;
  return `<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">제안 검토</span><span class="small due" style="margin-left:auto">응답 ${o.expires-S.clock}일 남음</span></div>
  <div class="table-top gut"><div class="seats"><div>${emblem(t,64)}<div class="nm">${esc(t.name)}</div><div class="rl">${os?'해외 구단':t.div+'부'}</div></div><div class="vs">→</div><div>${face(p,64)}<div class="nm">${esc(p.name)}</div><div class="rl">${p.pos} · ${p.age}세 · 종합 ${Math.round(SL.calcOvr(p))}</div></div></div><div class="desk"></div></div>
  <div class="content gut" style="padding-bottom:12px"><div class="stat3"><div><div class="k">제안 이적료</div><div class="v">${Ms(o.fee)}</div></div><div><div class="k">시장가치</div><div class="v">${Ms(SL.calcValue(p))}</div></div><div><div class="k">선수 의향</div><div class="v ${os?(o.pw>=0.65?'ok':o.pw<0.4?'bad':''):o.willing?'ok':'bad'}" style="font-size:19px">${os?(o.pw>=0.65?'긍정적':o.pw>=0.4?'보통':'부정적'):o.willing?'긍정적':'거부'}</div></div></div>
  ${r&&r.valFrom?`<div class="muted small" style="margin-bottom:6px">종합 ${r.from} → ${r.to} · 가치 ${Ms(r.valFrom)} → ${Ms(r.valTo)} · ${seasonLine(p)}</div>`:''}
  <div class="small" style="margin-bottom:8px">이적하면: ${standChips(p,t)} <span class="muted">(${esc(lgName(t))})</span></div>
  ${saleCard(p)}
  <div class="chat" id="chat">${bubbles(log,names)}</div>
  ${!os&&!o.willing?'<div class="badbox">선수가 이적을 원하지 않아 금액에 합의해도 성사되지 않습니다.</div>':''}</div>
  <div class="offerform gut">${o.counters<2&&o.status!=='agreed'?`<label for="ct_amt">희망 이적료 (만원) · 재협상 ${2-o.counters}회 남음</label><div class="stepper"><button aria-label="감소" onclick="UI.bumpCt(-${st})">−</button><input id="ct_amt" type="number" value="${ctv}" onchange="UI.setCt(+this.value)"><button aria-label="증가" onclick="UI.bumpCt(${st})">＋</button></div><div style="height:8px"></div>`:''}
  <div class="btns" style="grid-template-columns:1fr 1fr 1fr"><button class="ghost" onclick="UI.respond(${o.id},'reject')">거절</button><button ${o.counters>=2||o.status==='agreed'?'disabled':''} onclick="UI.counterOffer(${o.id})">금액 조정</button><button class="primary" onclick="UI.respond(${o.id},'accept')">수락</button></div></div></div>`;
}

// ---------- 경기 ----------
function renderGame(){
  const lg=S.liveGame;const H=S.teams[lg.home],A=S.teams[lg.away];const ut=SL.userTeam();const mySide=lg.home===ut.id?1:0;
  const B=lg.done?null:SL.curBatter(lg),P=lg.done?null:SL.curPitcher(lg);const bases=lg.bases;
  let h=`<div class="club gut"><div class="r1"><div><div class="nm">${lg.done?'경기 종료':`${lg.inn}회 ${lg.half===0?'초':'말'}`}</div><div class="sub">${S.season}시즌 ${S.day}일차</div></div></div></div><div class="content gut" style="padding-bottom:24px">`;
  h+=`<div class="score"><div style="text-align:center">${emblem(A,34)}<div class="tn">${esc(A.name)}</div><div class="sc">${lg.score[0]}</div></div><div><div class="diamond"><i class="b2 ${bases[1]?'on':''}"></i><i class="b1 ${bases[0]?'on':''}"></i><i class="b3 ${bases[2]?'on':''}"></i></div><div class="count"><span>B ${lg.balls}</span><span>S ${lg.strikes}</span><span>O ${lg.outs}</span></div></div><div style="text-align:center">${emblem(H,34)}<div class="tn">${esc(H.name)}</div><div class="sc">${lg.score[1]}</div></div></div>`;
  const maxInn=Math.max(9,lg.inn);let line='<table style="font-size:12px"><tr><th></th>';for(let i=1;i<=maxInn;i++)line+=`<th>${i}</th>`;line+='<th>R</th><th>H</th></tr>';for(const s of [0,1]){line+=`<tr><td>${esc((s===0?A:H).name.split(' ')[0])}</td>`;for(let i=1;i<=maxInn;i++){const val=lg.innScores[s][i-1];line+=`<td>${val!=null?val:(lg.inn===i&&lg.half===s&&!lg.done?lg.halfRuns:'')}</td>`;}line+=`<td class="b">${lg.score[s]}</td><td>${lg.hits[s]}</td></tr>`;}line+='</table>';
  h+=`<div class="card tw" style="padding:8px">${line}</div>`;
  if(!lg.done){const bb=lg.box[B.id]||{};const runners=[2,1,0].map(i=>bases[i]?`${i+1}루 ${esc(S.players[bases[i].pid].name)}`:null).filter(Boolean).join(', ');
    h+=`<div class="card"><div class="row sb" style="align-items:flex-start"><div class="row">${face(B,40)}<div><div class="muted small">타자 ${lg.bat[lg.half]+1}번</div><b>${esc(B.name)}</b> <span class="small muted">${bb.h||0}/${bb.ab||0}</span></div></div><div class="row" style="text-align:right"><div><div class="muted small">투수 ${lg.pc[P.id]||0}구</div><b>${esc(P.name)}</b> <span class="small muted">${SL.velocity(P)}km</span></div>${face(P,40)}</div></div><div class="muted small" style="margin-top:6px">주자: ${runners||'없음'}</div></div>`;
    h+=`<div class="btns4"><button class="primary" onclick="UI.step('pitch')">다음 공</button><button onclick="UI.step('pa')">타석 완료</button><button onclick="UI.step('half')">이닝 완료</button><button onclick="UI.step('game')">경기 종료</button></div><div style="height:8px"></div>`;
    const benchIds=SL.bench(lg,mySide);const bp=SL.availableBullpen(lg,mySide);
    h+=`<div class="btns"><button class="ghost" ${lg.half===mySide&&benchIds.length?'':'disabled'} onclick="UI.pinchMenu()">대타 (${benchIds.length})</button><button class="ghost" ${bp.length?'':'disabled'} onclick="UI.pitchMenu()">투수 교체 (${bp.length})</button></div><div style="height:12px"></div>`;
  }else{const my=lg.score[mySide],op=lg.score[1-mySide];h+=`<div class="${my>op?'okbox':'warnbox'}"><b>${my>op?'승리!':'패배'}</b> ${my} : ${op}</div><button class="primary big" onclick="UI.endGame()">결과 확인 후 계속 ▶</button><div style="height:12px"></div>`+renderBox(lg,mySide);}
  h+=`<div class="card">${hd('경기 로그')}<div class="glog" id="glog">${lg.log.slice(-40).map(l=>`<div class="${l.type}">${esc(l.text)}</div>`).join('')}</div></div></div>`;
  return h;
}
function renderBox(lg,side){const ids=Object.keys(lg.box).map(Number).filter(id=>S.players[id]&&S.players[id].teamId===(side===1?lg.home:lg.away));const bats=ids.filter(id=>lg.box[id].pa>0),pits=ids.filter(id=>lg.box[id].pG>0);
  return `<div class="card">${hd('우리 구단 기록')}<div class="tw"><table><tr><th>타자</th><th>타수</th><th>안타</th><th>HR</th><th>타점</th><th>BB</th><th>K</th></tr>${bats.map(id=>{const b=lg.box[id];return `<tr><td>${esc(S.players[id].name)}</td><td>${b.ab}</td><td>${b.h}</td><td>${b.hr}</td><td>${b.rbi}</td><td>${b.bb}</td><td>${b.so}</td></tr>`;}).join('')}</table></div>
  <div class="tw" style="margin-top:8px"><table><tr><th>투수</th><th>이닝</th><th>피안타</th><th>실점</th><th>K</th><th>BB</th><th></th></tr>${pits.map(id=>{const b=lg.box[id];return `<tr><td>${esc(S.players[id].name)}</td><td>${Math.floor(b.pOuts/3)}.${b.pOuts%3}</td><td>${b.pH}</td><td>${b.pR}</td><td>${b.pSO}</td><td>${b.pBB}</td><td>${b.pW?'승':b.pL?'패':b.pSV?'세이브':''}</td></tr>`;}).join('')}</table></div></div>`;}

// ---------- 모달 ----------
function modal(html){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal';bg.onclick=e=>{if(e.target===bg)closeModal();};bg.innerHTML=`<div class="modal" role="dialog"><button class="close" onclick="UI.closeModal()">닫기</button>${html}</div>`;document.body.appendChild(bg);}
function closeModal(){const m=$('#modal');if(m)m.remove();}
function sideOf(){const lg=SL.state().liveGame;return lg.home===SL.userTeam().id?1:0;}
function pinchMenu(){S=SL.state();const lg=S.liveGame;const ids=SL.bench(lg,sideOf());modal(`<h3>대타</h3>${ids.map(id=>{const p=S.players[id];return `<div class="prow" onclick="UI.pinch(${id})">${face(p,36)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="sub">${p.pos} · 컨택 ${Math.round(p.attrs.contact)} 파워 ${Math.round(p.attrs.power)} · 피로 ${Math.round(p.fatigue)}</div></div>${G(SL.calcOvr(p))}</div>`;}).join('')}`);}
function pitchMenu(){S=SL.state();const lg=S.liveGame;const ut=SL.userTeam();const ids=SL.availableBullpen(lg,sideOf());modal(`<h3>투수 교체</h3>${ids.map(id=>{const p=S.players[id];return `<div class="prow" onclick="UI.chPitch(${id})">${face(p,36)}<div class="grow"><div class="nm">${esc(p.name)}${ut.closer===id?' <span class="chip g">마무리</span>':''}</div><div class="sub">${SL.velocity(p)}km/h · 구위 ${Math.round(p.attrs.stuff)} 제구 ${Math.round(p.attrs.control)} · 피로 ${Math.round(p.fatigue)}</div></div>${G(SL.calcOvr(p))}</div>`;}).join('')}`);}
function renderTut(){const steps=[['단장님, 환영합니다','3부의 작은 구단을 맡았습니다. 싸게 데려온 유망주를 키워 주전으로 만들고, 승격에 기여한 뒤 비싸게 팔아 더 높은 무대로 올라가세요.'],['홈은 할 일 순서','맨 위 주황 카드는 지금 결정해야 할 일(제안·드래프트·계약), 초록은 선수들이 얼마나 컸는지, 그다음이 경기입니다.'],['경기','"경기 보기"는 한 구씩, "자동 진행"은 같은 엔진으로 빠르게 진행합니다. 새 제안이 오면 자동 진행이 멈춥니다.'],['육성','선수 화면이나 육성 탭에서 훈련 방향을 정하세요. 7경기마다 성장하고, 벤치보다 출장·육성군 경기가 성장에 좋습니다.'],['협상 테이블','영입·FA·재계약은 선수(또는 대리인)와 마주 앉아 연봉·계약금·기간·출장 약속을 제시합니다. 너무 낮게 부르면 분위기가 식고 선수가 자리를 뜹니다.']];
  const s=steps[ui.tut];return `<div class="tut"><div class="box"><div class="hd"><h3>${s[0]}</h3><small>${ui.tut+1}/${steps.length}</small></div><p style="font-size:15px">${s[1]}</p><div class="btns"><button onclick="UI.tutSkip()">건너뛰기</button><button class="primary" onclick="UI.tutNext(${steps.length})">${ui.tut===steps.length-1?'시작하기':'다음'}</button></div></div></div>`;}

// ---------- 액션 ----------
function go(view){if(ui.view)ui.stack.push(ui.view);if(ui.stack.length>8)ui.stack.shift();ui.view=view;closeModal();render();if(isWide()){const r=$('#rpane');if(r)r.scrollTop=0;}else scrollTop();}
function initForm(pid){const neg=S.market.negs.find(n=>n.pid===pid);if(!neg)return;const p=S.players[pid];
  if(neg.stage==='club')ui.form={pid,fee:Math.round(SL.calcValue(p)/100)*100,salary:0,bonus:0,years:2,promise:false};
  else ui.form={pid,fee:0,salary:Math.round(neg.demand*0.9/10)*10,bonus:0,years:neg.mode==='renew'&&p.age>=32?1:2,promise:false};}
function afterDay(){autosave();ui.tab='home';ui.view=null;ui.stack=[];render();scrollTop();}
function readForm(){const sal=$('#tf_sal'),fee=$('#tf_fee'),bon=$('#tf_bonus');if(sal)ui.form.salary=+sal.value||0;if(fee)ui.form.fee=+fee.value||0;if(bon)ui.form.bonus=+bon.value||0;}
const A={
  render,closeModal,pinchMenu,pitchMenu,
  pickTeam(i){ui.newTeam=i;render();},
  newGame(){const seed=+($('#seed').value)||12345;SL.newGame(seed,ui.newTeam);ui.tab='home';ui.view=null;ui.stack=[];ui.tut=0;autosave();render();},
  continueGame(){readSave().then(j=>{try{if(!j)throw new Error('저장 데이터가 없습니다');SL.load(j);autosave();ui.tab='home';ui.view=null;ui.stack=[];render();}catch(e){toast('저장 데이터를 불러올 수 없습니다: '+e.message,4000);}});},
  importFile(n){const inp=$(n===2?'#impfile2':'#impfile');const f=inp&&inp.files&&inp.files[0];if(!f){toast('파일을 선택하세요.');return;}const rd=new FileReader();rd.onload=()=>{try{SL.load(rd.result);autosave();ui.tab='home';ui.view=null;toast('불러오기 완료');render();}catch(e){toast('불러오기 실패 (현재 진행 유지): '+e.message,5000);}};rd.onerror=()=>toast('파일을 읽을 수 없습니다.');rd.readAsText(f);},
  importText(id){const t=($('#'+id)||{}).value;if(!t||!t.trim()){toast('JSON 내용을 붙여넣으세요.');return;}try{SL.load(t.trim());autosave();ui.tab='home';ui.view=null;toast('불러오기 완료');render();}catch(e){toast('불러오기 실패 (현재 진행 유지): '+e.message,5000);}},
  exportSave(){const json=SL.serialize();try{const blob=new Blob([json],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`stoveleague_s${S.season}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}catch(e){}
    modal(`<h3>JSON 내보내기</h3><div class="small muted">다운로드가 안 되는 환경에서는 아래 내용을 복사해 저장하세요. (${(json.length/1024).toFixed(0)}KB)</div><div style="height:8px"></div><button class="primary" onclick="UI.copyJson()">전체 복사</button><div style="height:8px"></div><textarea id="exp_json" aria-label="저장 JSON" style="width:100%;height:160px;font-size:11px;font-family:monospace">${esc(json)}</textarea>`);},
  copyJson(){const ta=$('#exp_json');ta.select();const t=ta.value;(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('클립보드에 복사했습니다.')).catch(()=>{try{document.execCommand('copy');toast('복사했습니다.');}catch(e){toast('텍스트를 직접 선택해 복사하세요.');}});},
  saveNow(){save(false);},
  resetGame(){modal(`<h3>새 게임</h3><div>현재 진행을 삭제합니다. JSON으로 먼저 내보내기를 권장합니다.</div><div style="height:12px"></div><div class="btns"><button class="danger" onclick="UI.resetConfirm()">삭제하고 새 게임</button><button onclick="UI.closeModal()">취소</button></div>`);},
  resetConfirm(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}Store.del();Store.has=false;closeModal();SL.setState(null);ui.view=null;ui.stack=[];render();},
  setTab(t){ui.tab=t;ui.view=null;ui.stack=[];closeModal();render();scrollTop();},
  setSub(k,v){ui.sub[k]=v;render();},
  set(k,v){ui[k]=v;render();},
  setScoutF(k,v){ui.scoutF[k]=v;if(k==='league')render();},
  setBuyF(k,v){ui.buyF[k]=v;render();},
  clearResult(){ui.gameResult=null;render();},
  openPlayer(pid){S=SL.state();if(!S.players[pid]){toast('선수 정보를 찾을 수 없습니다.');return;}go({type:'player',id:pid,tab:'ability'});},
  pTab(t){if(ui.view&&ui.view.type==='player'){ui.view.tab=t;ui.keepScroll=true;render();}},
  focusTrain(){A.pTab('ability');setTimeout(()=>{const s=$('#focusSel');if(s){try{s.scrollIntoView({block:'center'});}catch(e){}s.focus();}},30);},
  back(){ui.view=ui.stack.pop()||null;closeModal();render();scrollTop();},
  pin(pid){SL.togglePin(pid);autosave();toast(SL.state().pins.includes(pid)?'관심 선수로 고정했습니다.':'고정을 해제했습니다.');render();},
  openTable(pid){S=SL.state();const p=S.players[pid];const r=SL.openTable(pid);if(!r.ok){toast(r.msg,4500);return;}initForm(pid);autosave();go({type:'table',pid,fromTeam:p.teamId!=null&&p.teamId!==S.userTeamId?p.teamId:null,mode:r.neg.mode,agent:r.neg.agent});},
  setF(k,v){readForm();ui.form[k]=v;if(k==='years'||k==='promise')render();},
  bump(k,d){readForm();ui.form[k]=Math.max(0,Math.round((+ui.form[k]||0)+d));ui.keepScroll=true;render();},
  tableSubmit(){const v=ui.view;if(!v||v.type!=='table')return;readForm();const neg=SL.state().market.negs.find(n=>n.pid===v.pid);const stageBefore=neg&&neg.stage;const r=SL.tableOffer(v.pid,ui.form);
    if(!r.ok){toast(r.msg,4000);render();return;}
    if(r.done||r.ended)v.result={done:!!r.done,msg:r.msg,log:r.neg.log,mood:r.neg.mood};else if(r.neg.stage!==stageBefore)initForm(v.pid);
    autosave();render();},
  leaveTable(){const v=ui.view;if(!v)return;const neg=SL.state().market.negs.find(n=>n.pid===v.pid);if(neg){const log=[...neg.log,{who:'sys',text:'(단장이 자리에서 일어났다)'}];SL.tableLeave(v.pid);v.result={done:false,msg:'협상을 중단했습니다. 이번 시즌 남은 기회가 있으면 다시 앉을 수 있습니다.',log,mood:neg.mood};}autosave();render();},
  openOffer(id){go({type:'offer',id});},
  dispatchView(pid){go({type:'dispatch',pid});},
  dispatch(pid,tid){const e=SL.dispatchPlayer(pid,tid);toast(e||`${SL.P(pid).name} 파견 확정`,3500);autosave();if(!e&&ui.view&&ui.view.type==='dispatch')ui.view=ui.stack.pop()||null;render();},
  cancelDispatch(pid){const e=SL.cancelDispatch(pid);toast(e||'파견을 취소했습니다.');autosave();render();},
  declineDispatch(pid){SL.declineDispatch(pid);toast('국내 동계훈련으로 준비합니다.');autosave();render();},
  setCt(v){ui.ct=v;ui.ctId=ui.view&&ui.view.id;},
  bumpCt(d){const i=$('#ct_amt');ui.ct=Math.max(0,(+i.value||0)+d);ui.ctId=ui.view&&ui.view.id;render();},
  counterOffer(id){const v=+$('#ct_amt').value;const o=SL.state().market.offers.find(x=>x.id===id);if(!o)return;const lg=ui.offerLog[id]=ui.offerLog[id]||[];lg.push({who:'me',text:`${M(v)}이면 보내드리겠습니다.`});
    const t=SL.state().teams[o.team];const r=SL.respondOffer(id,'counter',v);lg.push({who:'club',text:r.msg.split(t.name+': ').join('').split(SL.josa(t.name,'이','가')+' ').join('')});ui.ct=null;
    if(!SL.state().market.offers.find(x=>x.id===id))ui.view.msg=r.msg;autosave();render();},
  respond(id,action){const lg=ui.offerLog[id]=ui.offerLog[id]||[];if(action==='accept')lg.push({who:'me',text:'제안을 받아들이겠습니다.'});else if(action==='reject')lg.push({who:'me',text:'이번 제안은 정중히 거절합니다.'});const r=SL.respondOffer(id,action);
    autosave();if(ui.view&&ui.view.type==='offer'){ui.view.msg=r.msg;ui.view.ok=r.ok&&action==='accept';render();}else{toast(r.msg,4000);render();}},
  startGame(){const lg=SL.startDay();if(!lg){SL.finishDay();autosave();render();return;}autosave();render();},
  step(kind){const lg=SL.state().liveGame;if(!lg)return;if(kind==='pitch')SL.stepPitch(lg);else if(kind==='pa')SL.stepPA(lg);else if(kind==='half')SL.stepHalf(lg);else SL.stepGame(lg);autosave();render();},
  pinch(pid){const lg=SL.state().liveGame;if(SL.pinchHit(lg,sideOf(),pid))toast('대타 투입');closeModal();autosave();render();},
  chPitch(pid){const lg=SL.state().liveGame;if(SL.changePitcher(lg,sideOf(),pid))toast('투수 교체');closeModal();autosave();render();},
  endGame(){S=SL.state();const lg=S.liveGame;if(!lg||!lg.done)return;const side=sideOf();const my=lg.score[side],op=lg.score[1-side];const opp=S.teams[side===1?lg.away:lg.home];ui.gameResult={win:my>op,text:`vs ${opp.name} ${my}:${op}`};SL.endUserGame();afterDay();},
  autoDays(n){S=SL.state();let i=0,w=0,l=0,stop=null;while(S.phase==='season'&&i<n){const before=S.market.offers.map(o=>o.id);const r=SL.playDayAuto();if(r){const lg=r.lg;const side=lg.home===SL.userTeam().id?1:0;if(lg.score[side]>lg.score[1-side])w++;else l++;}i++;
      if(S.settings.stopOnOffer&&S.phase==='season'){const fresh=S.market.offers.filter(o=>!before.includes(o.id));const dying=S.market.offers.filter(o=>o.expires-S.clock<=1);if(fresh.length){stop=`새 제안 ${fresh.length}건 도착으로 정지`;break;}if(dying.length){stop=`내일 만료되는 제안 ${dying.length}건으로 정지`;break;}}}
    ui.gameResult={win:w>=l,text:`${i}경기 ${w}승 ${l}패${stop?' · '+stop:''}`};afterDay();},
  setStop(v){SL.state().settings.stopOnOffer=!!v;autosave();},
  advanceWeek(){SL.advanceWeek();autosave();render();scrollTop();},
  startSeason(){const r=SL.startNewSeason();if(!r.ok)toast(r.msg,4000);else{ui.gameResult=null;toast(`${SL.state().season}시즌 개막!`);}autosave();render();scrollTop();},
  autoFill(){const added=SL.autoFillUser();toast(`${added.length}명 보충: ${added.join(', ')}`,4000);autosave();render();},
  setFocus(pid,v){const p=SL.P(pid);if(p){p.focus=v;autosave();toast('훈련 방향을 바꿨습니다.');}},
  autoLineup(){const ut=SL.userTeam();SL.autoLineup(ut);const offs=ut.lineup.filter(id=>{const p=S.players[id];return ut.pos[id]!=='DH'&&ut.pos[id]!==p.pos;}).length;autosave();toast(`자동 편성 완료${offs?` · 적성 밖 ${offs}명 (해당 포지션 선수 부족)`:' · 전원 본래 포지션'}`,3500);render();},
  setMode(m){SL.userTeam().lineupMode=m;autosave();render();},
  toggleLock(pid){const ut=SL.userTeam();ut.locks=ut.locks||{};if(ut.locks[pid])delete ut.locks[pid];else{const pos=ut.pos[pid];if(!pos){toast('먼저 라인업에 넣어야 고정할 수 있습니다.');return;}for(const id in ut.locks)if(ut.locks[id]===pos)delete ut.locks[id];ut.locks[pid]=pos;}autosave();toast(ut.locks[pid]?`${SL.P(pid).name} ${SL.POS_KO[ut.locks[pid]]} 고정`:'고정 해제');render();},
  compare(pid){const p=SL.P(pid);const ut=SL.userTeam();const keys=SL.isPitcher(p)?SL.PIT_KEYS:SL.BAT_KEYS;const ours=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(q=>q.pos===p.pos).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a)).slice(0,2);
    if(!ours.length){modal(`<h3>${SL.POS_KO[p.pos]} 비교</h3><div>우리 팀에 ${SL.POS_KO[p.pos]}이 없습니다. 영입하면 바로 주전 후보입니다.</div>`);return;}
    const cols=[p,...ours];modal(`<h3>${SL.POS_KO[p.pos]} 비교</h3><div class="tw"><table><tr><th></th>${cols.map((q,i)=>`<th>${i===0?'후보':'우리'}<br>${esc(q.name)}</th>`).join('')}</tr>
    <tr><td>나이</td>${cols.map(q=>`<td>${q.age}</td>`).join('')}</tr><tr><td>종합</td>${cols.map(q=>`<td><b>${Math.round(SL.calcOvr(q))}</b></td>`).join('')}</tr><tr><td>잠재</td>${cols.map(q=>`<td>${SL.potText(q)}</td>`).join('')}</tr>
    ${keys.map(k=>`<tr><td>${SL.ATTR_KO[k]}</td>${cols.map((q,i)=>{const d=i===0?0:Math.round(p.attrs[k]-q.attrs[k]);return `<td>${Math.round(q.attrs[k])}${i===0?'':` <span class="${d>0?'up':d<0?'dn':'muted'} small">${d>0?'후보+'+d:d<0?'우리+'+(-d):'='}</span>`}</td>`;}).join('')}</tr>`).join('')}
    <tr><td>연봉</td>${cols.map(q=>`<td>${q.contract?Ms(q.contract.salary):'-'}</td>`).join('')}</tr><tr><td>가치</td>${cols.map(q=>`<td>${Ms(SL.calcValue(q))}</td>`).join('')}</tr></table></div>`);},
  setLineup(i,pid){const ut=SL.userTeam();if(pid<0){const old=ut.lineup[i];if(old!=null){ut.lineup.splice(i,1);delete ut.pos[old];}}else{const j=ut.lineup.indexOf(pid);if(j>=0&&j!==i){const old=ut.lineup[i];ut.lineup[j]=old;ut.lineup[i]=pid;if(old==null)ut.lineup.splice(j,1);}else if(j<0){const old=ut.lineup[i];if(old!=null){ut.pos[pid]=ut.pos[old];delete ut.pos[old];}else ut.pos[pid]=ut.pos[pid]||SL.P(pid).pos;ut.lineup[i]=pid;}}autosave();render();},
  setPos(pid,pos){SL.userTeam().pos[pid]=pos;autosave();render();},
  moveSlot(i,d){const ut=SL.userTeam();const j=i+d;if(j<0||j>=ut.lineup.length)return;[ut.lineup[i],ut.lineup[j]]=[ut.lineup[j],ut.lineup[i]];autosave();render();},
  setRot(i,pid){const ut=SL.userTeam();if(pid<0){const old=ut.rotation[i];if(old!=null){ut.rotation.splice(i,1);ut.bullpen.push(old);}}else{const old=ut.rotation[i];ut.bullpen=ut.bullpen.filter(x=>x!==pid);const j=ut.rotation.indexOf(pid);if(j>=0)ut.rotation.splice(j,1);if(old!=null&&old!==pid){ut.rotation[ut.rotation.indexOf(old)]=pid;ut.bullpen.push(old);}else ut.rotation.splice(i,0,pid);if(ut.closer===pid)ut.closer=null;}if(ut.rotIdx>=ut.rotation.length)ut.rotIdx=0;autosave();render();},
  setCloser(pid){SL.userTeam().closer=pid<0?null:pid;autosave();render();},
  list(pid){const e=SL.listPlayer(pid);toast(e||'판매 등록했습니다. 관심 구단의 제안을 기다리세요.');autosave();render();},
  unlist(pid){SL.unlistPlayer(pid);toast('등록 해제');autosave();render();},
  confirmRelease(pid){const p=SL.P(pid);modal(`<h3>${esc(p.name)} 방출</h3><div>잔여 계약의 30%(${M(Math.round((p.contract?p.contract.salary*Math.max(1,p.contract.years)*0.3:0)/10)*10)})를 위약금으로 지급합니다. 되돌릴 수 없습니다.</div><div style="height:12px"></div><div class="btns"><button class="danger" onclick="UI.release(${pid})">방출 확정</button><button onclick="UI.closeModal()">취소</button></div>`);},
  release(pid){const e=SL.releasePlayer(pid);toast(e||'방출했습니다.');autosave();closeModal();if(!e)ui.view=ui.stack.pop()||null;render();},
  promote(pid){const e=SL.promoteDev(pid);toast(e||'1군에 등록했습니다.');autosave();render();},
  demote(pid){const e=SL.demoteDev(pid);toast(e||'육성군으로 이동했습니다.');autosave();render();},
  draftPick(pid,dest){const r=SL.draftPick(pid,dest);toast(r.msg,3500);autosave();render();},
  draftAutoPick(){SL.draftAuto();toast('자동 지명 완료');autosave();render();},
  draftPass(){const r=SL.draftPick(null);toast(r.msg);autosave();render();},
  scout(){const f={...ui.scoutF};f.maxAge=f.maxAge?+f.maxAge:0;f.maxValue=f.maxValue?+f.maxValue:0;const r=SL.runScout(ui.scoutKind,ui.scoutLvl,f);toast(r.msg,3500);autosave();render();},
  upgrade(k){const e=SL.upgradeFacility(k);toast(e||'업그레이드 완료');autosave();render();},
  loan(){const e=SL.takeLoan(+$('#loanAmt').value);toast(e||'대출 실행');autosave();render();},
  tutNext(n){ui.tut++;if(ui.tut>=n){SL.state().tutorialDone=true;autosave();}render();},
  tutSkip(){SL.state().tutorialDone=true;autosave();render();},
};
let lastWide=null;window.addEventListener('load',()=>{lastWide=isWide();render();Store.get().then(j=>{if(j&&!Store.has){Store.has=true;if(!SL.state())render();}});});window.addEventListener('resize',()=>{const w=isWide();if(w!==lastWide){lastWide=w;render();}});
return A;
})();

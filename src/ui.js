// ===================== UI (화면 렌더링) =====================
const UI=(function(){
'use strict';
const SAVE_KEY='stoveleague_v1';
const ui={tab:'home',sub:{roster:'list',dev:'train',market:'offers',club:'table'},view:null,stack:[],scoutKind:'youth',scoutLvl:1,scoutF:{pos:'ALL',grade:'ALL',maxAge:'',minPot:'ALL'},rf:'all',sortKey:'ovr',newTeam:0,buyF:{div:'all',pos:'ALL',grade:'ALL',maxAge:'',minPot:'ALL',q:'',afford:true,open:false,need:false,sort:'ovr',n:40},tut:0,gameResult:null,form:{},offerLog:{}};
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
function writeSave(silent){const json=SL.serialize();saveMeta();let lsOk=false;try{localStorage.setItem(SAVE_KEY,json);lsOk=true;}catch(e){try{localStorage.removeItem(SAVE_KEY);}catch(e2){}}
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

// ---------- 픽셀 아트 (Pixellab 생성) + 효과음 ----------
const ART=(typeof ASSETS!=='undefined')?ASSETS:null;
const PX={ready:false,imgs:[],cache:{},ok:false};
const POOLS={KR:[0,1,2,3,4,13,14,15,12],JP:[5,6,3,12,0],TW:[12,0,2,14,15],US:[7,8,16,11],AU:[11,16,7],MX:[9,10,8],CB:[10,9,8]};
const YOUNG=[0,2,12,11,14,3],VET=[1,13,7,10];
(function initPx(){try{if(!ART||!ART.portraits||!ART.portraits.length||/jsdom/i.test(navigator.userAgent))return;const c=document.createElement('canvas');if(!c.getContext||!c.getContext('2d'))return;PX.ok=true;
  let n=0;ART.portraits.forEach((src,i)=>{const im=new Image();im.onload=()=>{n++;if(n===ART.portraits.length){PX.ready=true;try{if(SL.state())render();}catch(e){}}};im.src=src;PX.imgs[i]=im;});}catch(e){PX.ok=false;}})();
function hexHsl(hex){const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];}
function hslRgb(h,s,l){if(s===0)return [l,l,l].map(v=>Math.round(v*255));const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};return [f(h+1/3),f(h),f(h-1/3)].map(v=>Math.round(v*255));}
function pxPortrait(idx,color){const key=idx+'|'+color;if(PX.cache[key])return PX.cache[key];const im=PX.imgs[idx];const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,c.width,c.height),a=d.data;const [th,ts,tl]=hexHsl(color);
  for(let i=0;i<a.length;i+=4){if(a[i+3]<100)continue;const [h,s,l]=hexHsl('#'+[a[i],a[i+1],a[i+2]].map(v=>v.toString(16).padStart(2,'0')).join(''));if(h>0.53&&h<0.72&&s>0.35&&l>0.12){const nl=Math.max(0.06,Math.min(0.92,l*(tl/0.42)));const [r,g,b]=hslRgb(th,Math.max(ts,0.35),nl);a[i]=r;a[i+1]=g;a[i+2]=b;}}
  x.putImageData(d,0,0);return PX.cache[key]=c.toDataURL();}
function portraitIdx(p){const h=hsh(p.id+3);const pool=POOLS[p.nat]||POOLS.KR;let cand=pool;const yp=pool.filter(i=>YOUNG.includes(i)),vp=pool.filter(i=>VET.includes(i));
  if(p.age<=23&&yp.length&&(h%10)<7)cand=yp;else if(p.age>=32&&vp.length&&(h%10)<7)cand=vp;else{const mid=pool.filter(i=>!VET.includes(i));if(p.age<32&&mid.length)cand=mid;}return cand[(h>>>4)%cand.length];}
const SFX={on:true,a:{},last:{}};
// 개인 설정: 효과음 크기, 글자 크기, 움직임 줄이기 (기기별, 저장 파일과 별개)
const PREF={vol:70,font:'m',motion:true};
function prefLoad(){try{Object.assign(PREF,JSON.parse(localStorage.getItem('stoveleague_prefs')||'{}'));}catch(e){}prefApply();}
function prefSave(){try{localStorage.setItem('stoveleague_prefs',JSON.stringify(PREF));}catch(e){}prefApply();}
function prefApply(){try{const r=document.documentElement;r.classList.toggle('fz-l',PREF.font==='l');r.classList.toggle('fz-xl',PREF.font==='xl');r.classList.toggle('calm',!PREF.motion);}catch(e){}}
function settingsHtml(){return `<label class="row sb setrow" for="sndset"><span>효과음 <span class="muted small">(타격·홈런·알림·계약·성장·승패)</span></span><input id="sndset" type="checkbox" class="chk" ${SFX.on?'checked':''} onchange="UI.setSound(this.checked)"></label>
  <div class="row sb setrow"><span>효과음 크기</span><input type="range" min="10" max="100" step="10" value="${PREF.vol}" aria-label="효과음 크기" onchange="UI.setPref('vol',+this.value)" style="width:150px"></div>
  <div class="setrow"><div style="margin-bottom:6px">글자 크기</div><div class="seg" style="margin:0">${[['m','기본'],['l','크게'],['xl','아주 크게']].map(x=>`<button class="${PREF.font===x[0]?'on':''}" onclick="UI.setPref('font','${x[0]}')">${x[1]}</button>`).join('')}</div></div>
  ${S&&S.settings?`<label class="row sb setrow" for="stopset"><span>자동 진행 중 제안 도착·만료 직전 멈춤</span><input id="stopset" type="checkbox" class="chk" ${S.settings.stopOnOffer?'checked':''} onchange="UI.setStop(this.checked)"></label>`:''}
  <label class="row sb setrow" for="motset"><span>화면 효과·움직임 <span class="muted small">(끄면 경기 연출·전환 효과 최소화)</span></span><input id="motset" type="checkbox" class="chk" ${PREF.motion?'checked':''} onchange="UI.setPref('motion',this.checked)"></label>`;}
function sfxInit(){try{const v=localStorage.getItem('stoveleague_sound');if(v!=null)SFX.on=v==='1';}catch(e){}}
sfxInit();prefLoad();
function sfx(name,vol){if(!SFX.on||!ART||!ART.sfx||!ART.sfx[name])return;const now=Date.now();if(SFX.last[name]&&now-SFX.last[name]<120)return;SFX.last[name]=now;try{let a=SFX.a[name];if(!a){a=SFX.a[name]=new Audio(ART.sfx[name]);}const c=a.cloneNode();c.volume=Math.min(1,(vol!=null?vol:0.6)*PREF.vol/70);const pr=c.play();if(pr&&pr.catch)pr.catch(()=>{});}catch(e){}}
function hasSfx(){return !!(ART&&ART.sfx&&Object.keys(ART.sfx).length);}
// ---------- 가상 초상화 / 엠블럼 ----------
function hsh(n){return (n*2654435761)>>>0;}
function face(p,size){
  size=size||44;if(PX.ok&&PX.ready){const t=p.teamId!=null&&S.teams[p.teamId]?S.teams[p.teamId]:null;try{return `<img class="av px" alt="" src="${pxPortrait(portraitIdx(p),t?t.color:'#6b7280')}" width="${size}" height="${size}" style="background:${t?t.color:'#6b7280'}22">`;}catch(e){}}const h=hsh(p.id+7);const r=(i,m)=>((h>>>(i*3))%m);
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
function emblem(t,size){size=size||40;if(ART&&ART.emblems&&ART.emblems[t.name])return `<img class="px" alt="" src="${ART.emblems[t.name]}" width="${size}" height="${size}" style="flex-shrink:0">`;const letter=(t.name.split(' ')[1]||t.name)[0];return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" style="flex-shrink:0"><circle cx="20" cy="20" r="19" fill="${t.color}" opacity=".18"/><path d="M6 24c0-10 6-16 14-16s14 6 14 16z" fill="${t.color}"/><path d="M4 24h27c4 0 6 1 6 3H6c-1.5 0-2-1-2-3z" fill="${t.color}" style="filter:brightness(.75)"/><text x="20" y="21" font-size="11" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${esc(letter)}</text></svg>`;}
const ICON={home:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',roster:'<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5zM14.5 19c.2-2.4-.4-4 1.2-4.8 3 0 5.3 1.7 5.3 4.8z"/>',dev:'<path d="M4 9h2v6H4zM18 9h2v6h-2zM7 7h2v10H7zM15 7h2v10h-2zM9 11h6v2H9z"/>',market:'<path d="M4 8h13l-3-3 1.4-1.4L21 9l-5.6 5.4L14 13l3-3H4zM20 16H7l3 3-1.4 1.4L3 15l5.6-5.4L10 11l-3 3h13z"/>',club:'<path d="M12 2l2.4 5 5.6.8-4 3.9.9 5.5L12 14.6 7.1 17.2l.9-5.5-4-3.9 5.6-.8z"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[k]}</svg>`;

// ---------- 공통 조각 ----------
// 적성 밖 배치의 이유와 손익 (같은 포지션 벤치 대안과 비교)
function misfitReasons(t){const out=[];for(const id of t.lineup){const p=S.players[id];const pos=t.pos[id];if(!p||!pos||pos==='DH'||pos===p.pos)continue;const pen=SL.posPenalty(p,pos);
  const alt=t.roster.map(x=>S.players[x]).filter(x=>x&&!SL.isPitcher(x)&&!t.lineup.includes(x.id)&&x.pos===pos).sort((a,b)=>SL.posOvr(b,pos)-SL.posOvr(a,pos))[0];
  if(!alt){out.push(`${SL.POS_KO[pos]}: 벤치에 ${SL.POS_KO[pos]} 적성 선수가 없어 ${SL.josa(p.name,'을','를')} 세웠습니다 (수비 −${pen}).`);continue;}
  const od=Math.round(SL.offVal(p)-SL.offVal(alt));out.push(od>0?`${SL.POS_KO[pos]}: 타격 +${od}를 얻으려고 수비 손실 −${pen}을 감수했습니다 (대안 ${alt.name}).`:`${SL.POS_KO[pos]}: ${SL.josa(alt.name,'이','가')} 벤치에 있지만 종합 판단으로 ${SL.josa(p.name,'을','를')} 세웠습니다 (수비 −${pen}). 직접 바꿔도 됩니다.`);}
  return out;}
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
  if(t.isUser){const cur=SL.rosterRole(t,p.id);return `<span class="chip ${ls.cls}">${ls.label}</span> <span class="chip">현재 ${esc(cur.text)}</span> <span class="chip ${role==='주전'?'g':role==='벤치'?'r':''}">실력상 ${role}급</span>${(()=>{const ps=SL.promiseStatus(p);if(!ps)return p.grudge?' <span class="chip r">약속 불이행 서운함</span>':'';return ` <span class="chip o">${ps.kind==='apology'?'사과 후 기회':'주전 약속'} ${ps.pending?'· 다음 시즌부터':`${ps.on}/${ps.n}경기 주전 (${ps.of}경기 중 ${ps.need} 필요)`}${SL.promiseKept(t,p)?'':' · 지금 미기용'}</span>`;})()}`;}
  return `<span class="chip ${ls.cls}">${ls.label}</span> <span class="chip ${role==='주전'?'g':role==='벤치'?'r':''}">${esc(t.name.split(' ').pop())} ${role}</span>`;}
// ----- 코치진 -----
function coachFace(c,size){return face({id:900000+c.id,nat:c.nat,age:Math.max(40,c.age),teamId:null},size);}
function coachRow(c,mine){const ST=SL.BAL.STAFF;const g=SL.gradeOf(c.rating);const tm=mine?null:SL.coachTerms(c);const yrs=ui.coachYears||2;
  const sal=mine?(c.years>0?c.salary:SL.renewDemand(c)):tm.salary;
  let act='';if(mine){if(c.years<=0)act=S.phase==='offseason'?`<button class="sm go" onclick="UI.renewCoach(${c.id})">재계약 ${yrs}년</button>`:'';
      else if(ui.fireArm===c.id){const sev=SL.severanceOf(c);act=`<button class="sm warn" onclick="UI.fireCoach(${c.id})">해임 확정${sev?' (보상 '+Ms(sev)+')':''}</button>`;}
      else act=`<button class="sm ghost" onclick="UI.armFire(${c.id})">해임</button>`;}
    else act=tm.ok?`<button class="sm go" onclick="UI.hireCoach(${c.id})">${yrs}년 계약</button>`:`<button class="sm" disabled>영입 불가</button>`;
  const stTxt=mine?(c.years>0?`계약 ${c.years}년 남음`:`<span class="due">계약 만료${S.phase==='offseason'?' — 2주차까지 재계약':''}</span>`):(tm.why?`<span class="${tm.ok?'due':'bad'}">${esc(tm.why)}</span>`:'바로 계약 가능');
  return `<div class="prow" style="cursor:default">${coachFace(c,40)}<div class="grow"><div class="nm">${esc(c.name)} <span class="muted small" style="font-weight:400">${mine?'':esc(ST[c.dept].name)+' · '}${c.age}세${c.nat!=='KR'?' · '+SL.NAT_KO[c.nat]:''}</span></div>
    <div class="sub">${esc(c.bio)}${c.trait?` · <span class="chip g">${esc(c.trait)}</span>`:''}</div><div class="sub">연봉 ${Ms(sal)} · ${stTxt}</div></div>
    <div class="rt"><div class="row" style="gap:5px;justify-content:flex-end">${G(c.rating)}<span class="ovr">${c.rating}</span></div><div style="margin-top:6px">${act}</div></div></div>`;}
function renderStaff(ut){const ST=SL.BAL.STAFF;const sm=SL.staffSummary(ut);const staff=ut.staff||[];let h='';
  const active=staff.filter(c=>c.years>0);const expiring=staff.filter(c=>c.years<=0);
  h+=`<div class="stat3"><div><div class="k">코치진</div><div class="v">${active.length}명</div></div><div><div class="k">연간 인건비</div><div class="v">${Ms(SL.staffPay(ut))}</div></div><div><div class="k">계약 만료</div><div class="v ${expiring.length?'due':''}">${expiring.length}명</div></div></div>`;
  h+=`<div class="muted small" style="margin-bottom:10px">코치 등급(S~D)과 평점이 높을수록, 같은 부서에 여럿 둘수록 효과가 커집니다(두 번째부터는 효과 체감). 효과는 리그 평균 코치진 대비입니다. 연봉은 경기일마다 나눠 지급됩니다.</div>`;
  h+=`<div class="seg" style="margin-bottom:12px">${[1,2,3].map(y=>`<button class="${(ui.coachYears||2)===y?'on':''}" onclick="UI.coachYears(${y})">계약 ${y}년</button>`).join('')}</div>`;
  for(const d in ST){const x=sm[d];const mine=staff.filter(c=>c.dept===d).sort((a,b)=>b.rating-a.rating);const pos=x.tone==='up',neg=x.tone==='dn';
    h+=`<div class="card">${hd(x.name,`${x.n}/${x.max}명${x.exp?` (만료 ${x.exp})`:''} · ${Ms(x.pay)}/시즌`)}<div class="muted small">${esc(x.what)}</div>
      <div class="row" style="gap:8px;margin:8px 0 4px"><div class="bar grow" title="부서 역량"><i style="width:${Math.min(100,x.P/2.5*100)}%;${neg?'background:var(--red)':''}"></i></div><span class="small ${pos?'up':neg?'dn':'muted'}" style="white-space:nowrap">${esc(x.eff)}</span></div>
      ${mine.map(c=>coachRow(c,true)).join('')||`<div class="muted small" style="padding:6px 0">코치가 없습니다.${x.ref>0?' 리그 평균보다 효과가 떨어집니다.':''}</div>`}
      ${x.n<x.max?`<button class="sm ghost" style="margin-top:6px" onclick="UI.coachMarket('${d}')">${esc(x.name)} 후보 보기</button>`:''}</div>`;}
  const fd=ui.coachDept||'all';const pool=(S.staffPool||[]).filter(c=>fd==='all'||c.dept===fd).sort((a,b)=>b.rating-a.rating);
  h+=`<div class="card" id="coachMarket">${hd('코치 시장','스토브리그마다 새 후보 · 시즌 중에도 영입 가능')}<div class="row" style="margin-bottom:6px"><select aria-label="부서" onchange="UI.coachMarket(this.value)"><option value="all">전체 부서</option>${Object.keys(ST).map(k=>`<option value="${k}" ${fd===k?'selected':''}>${ST[k].name}</option>`).join('')}</select></div>
    <div class="muted small" style="margin-bottom:4px">S급은 3부 구단 제의를 받지 않고, 하위 리그일수록 상위 등급 코치가 연봉을 더 요구합니다.</div>${pool.map(c=>coachRow(c,false)).join('')||'<div class="muted">후보가 없습니다.</div>'}</div>`;
  return h;}
function hd(t,small){return `<div class="hd"><h3>${t}</h3>${small?`<small>${small}</small>`:''}</div>`;}
function subtabs(key,items){return `<div class="subtabs">${items.map(i=>`<button class="${ui.sub[key]===i[0]?'on':''}" onclick="UI.setSub('${key}','${i[0]}')">${i[1]}</button>`).join('')}</div>`;}
function decisions(){let n=S.market.offers.length+((S.jobOffers||[]).length);if(SL.draftTurn())n++;if(S.phase==='offseason')n+=S.pendingFA.length;return n;}
function bubbles(log,names){return log.map(l=>{const cls=l.who==='me'?'me':l.who==='club'?'club':l.who==='sys'?'sys':'them';const nm=l.who==='me'||l.who==='sys'?'':`<span class="who">${esc(names[l.who]||names.player||'')}</span>`;return `<div class="bub ${cls}">${nm}${esc(l.text)}</div>`;}).join('');}

// ---------- 루트 ----------
function render(){S=SL.state();const app=$('#app');if(!S){app.innerHTML=renderTitle();return;}
  if(S.liveGame){app.innerHTML=renderGame();const gl=$('#glog');if(gl)gl.scrollTop=gl.scrollHeight;return;}
  let vh='';if(ui.view){const v=ui.view;if(v.type==='player')vh=renderPlayer(v);else if(v.type==='table')vh=renderTable(v);else if(v.type==='offer')vh=renderOffer(v);else if(v.type==='dispatch')vh=renderDispatch(v);else if(v.type==='job')vh=renderJob(v);if(!vh)ui.view=null;}
  const scrollChat=()=>{const c=$('#chat');if(c&&c.lastElementChild&&c.lastElementChild.scrollIntoView)try{c.lastElementChild.scrollIntoView({block:'nearest'});}catch(e){}};
  if(isWide()){const rp=$('#rpane');const keep=rp?rp.scrollTop:0;
    app.innerHTML=`<div class="split"><div class="lp">${renderClubBar()}<div class="content gut">${renderTab()}</div>${renderNav()}</div><div class="rp" id="rpane">${vh||rightPaneDefault()}</div></div>`+(S.tutorialDone?'':renderTut());
    const r2=$('#rpane');if(r2&&ui.keepScroll)r2.scrollTop=keep;ui.keepScroll=false;scrollChat();return;}
  if(vh){app.innerHTML=vh;scrollChat();return;}
  app.innerHTML=renderClubBar()+`<div class="content gut">${renderTab()}</div>`+renderNav()+(S.tutorialDone?'':renderTut());
}
function isWide(){try{return window.matchMedia('(min-width: 960px)').matches;}catch(e){return false;}}
// ----- 시작 화면 -----
const META_KEY='stoveleague_meta';
function saveMeta(){try{const ut=SL.userTeam();if(!ut)return;const st=SL.standings(SL.compOf(ut));const g=S.phase==='season'?SL.userGameToday():null;const opp=g?S.teams[g.home===ut.id?g.away:g.home]:null;
  const pin=(S.pins||[]).map(id=>S.players[id]).find(Boolean)||SL.growthReport(1).map(x=>x.p)[0]||null;
  localStorage.setItem(META_KEY,JSON.stringify({name:ut.name,color:ut.color,season:S.season,phase:S.phase,comp:S.phase==='season'||!S.lastSummary?SL.compName(SL.compOf(ut)):SL.compName(S.lastSummary.div),next:S.phase==='offseason'?SL.compName(SL.compOf(ut)):null,rank:S.phase==='season'?st.findIndex(t=>t.id===ut.id)+1:(S.lastSummary?S.lastSummary.rank:null),w:ut.rec.w,l:ut.rec.l,day:S.day,week:S.week,rep:S.mgr&&S.mgr.rep,opp:opp?opp.name:null,
    pin:pin?{id:pin.id,name:pin.name,nat:pin.nat,age:pin.age,pos:pin.pos,ovr:Math.round(SL.calcOvr(pin)),teamColor:ut.color}:null,t:Date.now()}));}catch(e){}}
function readMeta(){try{return JSON.parse(localStorage.getItem(META_KEY)||'null');}catch(e){return null;}}
function renderTitle(){
  const names=SL.TEAM_NAMES?SL.TEAM_NAMES.KR.slice(16,24):[];const AR=SL.BAL.ARCH,AO=SL.BAL.ARCH_OF;const m=hasSave()?readMeta():null;const mode=ui.titleMode||(hasSave()?'':'new');
  const bg=typeof ASSETS!=='undefined'&&ASSETS.title?`style="background-image:linear-gradient(180deg,rgba(14,20,48,.15) 0%,rgba(14,20,48,.55) 55%,var(--navy) 100%),url(${ASSETS.title})"`:'';
  let h=`<div class="title"><div class="hero" ${bg}><div class="gut"><h1>스토브리그</h1><p>작은 구단의 기적 — 싸게 데려와, 키워서, 더 높은 무대로.</p></div></div><div class="gut">`;
  if(hasSave()){h+=`<div class="contcard">${m?`<div class="row" style="gap:12px">${emblem({name:m.name,color:m.color},52)}<div class="grow"><div class="b" style="font-size:17px">${esc(m.name)}</div><div class="small dim">${m.season}시즌 · ${esc(m.comp)}${m.rank?' '+m.rank+'위':''}${m.next&&m.next!==m.comp?' → 다음 시즌 '+esc(m.next):''} · ${m.w}승 ${m.l}패${m.rep!=null?' · 감독 평판 '+m.rep:''}</div><div class="small dim">${m.phase==='season'?(m.opp?`다음 경기 vs ${esc(m.opp)} (${m.day}일차)`:`${m.day}일차`):`스토브리그 ${Math.min(m.week,6)}주차`}</div></div></div>
      ${m.pin?`<div class="row" style="gap:8px;margin-top:10px">${face({id:m.pin.id,nat:m.pin.nat,age:m.pin.age,teamId:null},34)}<div class="small"><span class="dim">지켜보는 선수</span> <b>${esc(m.pin.name)}</b> · ${esc(m.pin.pos)} · 종합 ${m.pin.ovr}</div></div>`:''}`:'<div class="dim small">저장된 게임이 있습니다.</div>'}
      <button class="go big" style="margin-top:12px" onclick="UI.continueGame()">이어하기</button></div>`;}
  h+=`<div class="tbtns"><button class="${mode==='new'?'on':''}" onclick="UI.set('titleMode','${mode==='new'?'':'new'}')">새 야구 인생</button><button class="${mode==='load'?'on':''}" onclick="UI.set('titleMode','${mode==='load'?'':'load'}')">불러오기</button><button class="${mode==='set'?'on':''}" onclick="UI.set('titleMode','${mode==='set'?'':'set'}')">설정</button></div>`;
  if(mode==='new'){const sel=ui.newTeam!=null?ui.newTeam:0;h+=`<div class="panel"><div class="b" style="margin-bottom:4px">맡을 3부 구단을 고르세요</div><div class="small dim" style="margin-bottom:10px">구단마다 고민이 다릅니다. 난이도가 아니라 운영 방식의 차이예요.</div><div class="archsel">${names.map((n,i)=>{const A=AR[AO[i]];return `<button class="${sel===i?'on':''}" onclick="UI.pickTeam(${i})"><div class="row" style="gap:8px">${emblem({name:n[0],color:n[1]},34)}<div><div class="b">${esc(n[0])}</div><span class="atag">${esc(A.name)}</span></div></div><div class="small" style="margin-top:6px">${esc(A.pitch)}</div><div class="small dim">고민: ${esc(A.worry)}</div>${{youth:'<div class="small" style="color:#9ee6bf">첫 2시즌 목표: 육성 성과</div>',poor:'<div class="small" style="color:#9ee6bf">첫 2시즌 목표: 흑자 운영</div>',popular:'<div class="small" style="color:#f3c76b">목표: 높은 순위 (팬 기대)</div>',vet:'<div class="small" style="color:#f3c76b">목표: 바로 승격 도전</div>'}[AO[i]]||''}</button>`;}).join('')}</div>
    <button class="go big" style="margin-top:12px" onclick="UI.newGame()">${esc(names[sel]?names[sel][0]:'')} 감독으로 시작</button>${hasSave()?'<div class="small dim" style="margin-top:6px">새로 시작하면 이어하던 저장을 덮어씁니다. 필요하면 먼저 구단 → 설정·저장에서 내보내세요.</div>':''}
    <details class="adv"><summary>고급 설정</summary><label class="small dim" for="seed">시드 (같은 시드 = 같은 초기 선수단)</label><input id="seed" type="number" value="${ui.seed||(ui.seed=Math.floor(Math.random()*90000)+1000)}" onchange="UI.setSeed(this.value)" style="width:100%"></details></div>`;}
  if(mode==='load')h+=`<div class="panel"><div class="b" style="margin-bottom:8px">저장 파일 불러오기</div><input type="file" id="impfile" accept=".json,application/json" style="width:100%"><div style="height:8px"></div><button onclick="UI.importFile()">파일 불러오기</button>
    <details class="adv"><summary>JSON 직접 붙여넣기</summary><textarea id="imp_json0" placeholder="저장 JSON 붙여넣기" style="width:100%;height:70px;font-size:11px"></textarea><div style="height:6px"></div><button onclick="UI.importText('imp_json0')">붙여넣은 JSON 불러오기</button></details></div>`;
  if(mode==='set')h+=`<div class="panel">${settingsHtml()}</div>`;
  return h+`<div class="small dim" style="text-align:center;margin:18px 0 8px">${SL.GAME_VER}${ui.testMode?' · 테스트 모드':''}</div></div></div>`;
}
function renderClubBar(){const ut=SL.userTeam();const cp=SL.compOf(ut);const st=SL.standings(cp);const rank=st.findIndex(t=>t.id===ut.id)+1;const sum=S.lastSummary;
  const r2=S.phase==='season'?`<span>${esc(SL.compName(cp))} ${ut.rec.w+ut.rec.l?rank+'위':'개막 전'}</span><span>${ut.rec.w}승 ${ut.rec.l}패</span><span>${S.day}/${SL.BAL.SEASON_GAMES}일차</span>`:`<span>${sum?'지난 '+esc(SL.compName(sum.div))+' '+sum.rank+'위':'-'}</span><span>${sum?sum.w+'승 '+sum.l+'패':''}</span><span>스토브 ${Math.min(S.week,SL.BAL.OFFSEASON_WEEKS)}주차</span>`;
  return `<div class="club gut"><div class="r1">${emblem(ut,44)}<div><div class="nm">${esc(ut.name)}</div><div class="sub">${S.phase==='offseason'?'다음 시즌 ':''}${esc(SL.compName(cp))} · ${S.season}시즌 · 감독 평판 ${S.mgr&&S.mgr.rep!=null?S.mgr.rep:SL.calcRep()}</div></div><div class="cashpill ${ut.cash<0?'neg':''}" title="현재 현금">${Ms(ut.cash)}</div></div><div class="r2">${r2}<button onclick="UI.setTab('club');UI.setSub('club','table')">순위 ›</button></div></div>`;}
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
function pinCard(){const ut=SL.userTeam();const all=S.pins.map(id=>S.players[id]).filter(Boolean);const pins=all.slice(0,3);if(!pins.length)return '';
  return `<div class="card">${hd('관심 선수 성장',S.phase==='season'?`다음 성장 점검 ${SL.nextCheck()}경기 후`:'동계훈련은 개막 때')}${pins.map(p=>{const lg=p.log[0];const sd=SL.seasonDelta(p);return prow(p,`${p.teamId===ut.id?'':esc(teamName(p.teamId))+' · '}가치 ${Ms(SL.calcValue(p))}${valDelta(p)}${lg&&p.teamId===ut.id?` · 최근 <span class="${lg.d>0?'up':lg.d<0?'dn':''}">${lg.d>0?'+':''}${lg.d||0}</span> ${esc(lg.f.slice(0,2).join('·'))}`:''}`);}).join('')}</div>`;}
// ----- 홈: 오늘의 구단 -----
function goalLine(){const g=SL.goalProgress();if(!g)return '';return ` <span class="small">(${g.parts.map(x=>`<span class="${x.ok===null?'muted':x.ok?'ok':'due'}">${esc(x.text)}</span>`).join(' · ')})</span>`;}
function storyCard(st){const p=st.pid!=null?S.players[st.pid]:null;const tag={growth:'이번 주 이야기 · 성장',decline:'이번 주 이야기 · 주의',streak:'이번 주 이야기 · 흐름',race:'이번 주 이야기 · 순위 경쟁',alumni:'이번 주 이야기 · 옛 제자',season:'시즌 결산',quiet:'이번 주 이야기',winter:'개막 · 겨울의 결과',start:'이번 주 이야기 · 첫 시즌'}[st.kind]||'이번 주 이야기';
  return `<div class="story">${p?`<div class="sface">${face(p,64)}</div>`:''}<div class="sbody"><span class="tagline">${tag}</span><div class="ttl">${esc(st.title)}</div>${st.lines.length?`<div class="lines">${st.lines.map(esc).join('<br>')}</div>`:''}${st.sub?`<div class="sub">${esc(st.sub)}</div>`:''}${st.since?`<div class="since">${esc(st.since)}</div>`:''}
    ${st.acts&&st.acts.length?`<div class="btns" style="margin-top:10px">${st.acts.map((a,i)=>`<button class="sm ${i?'ghost':'primary'}" onclick="${a.cmp?`UI.compareIds([${a.cmp.join(',')}])`:a.go?`UI.go('${a.go[0]}','${a.go[1]}')`:a.open?`UI.openPlayer(${a.open})`:''}">${esc(a.label)}</button>`).join('')}</div>`:p?`<div class="btns" style="margin-top:10px"><button class="sm primary" onclick="UI.openPlayer(${p.id})">성장 과정 보기</button>${p.teamId===S.userTeamId?`<button class="sm ghost" onclick="UI.openPlayer(${p.id});UI.focusTrain()">훈련 계획</button>`:''}</div>`:st.kind==='season'?`<div class="btns" style="margin-top:10px"><button class="sm primary" onclick="UI.seasonRecap()">시즌 결산 보기</button></div>`:''}</div></div>`;}
function decisionItems(){const ut=SL.userTeam();const it=[];const lgShort=t=>t.league==='KR'?t.div+'부':SL.BAL.LEAGUES[t.league].short;
  for(const o of (S.jobOffers||[])){const t=S.teams[o.team];if(t)it.push({tag:'감독 제의 · 2주차까지',title:`${t.name} (${lgShort(t)})`,sub:o.reason||'',btn:'검토',on:`UI.jobView(${o.id})`,em:t});}
  const offs=[...S.market.offers].sort((a,b)=>a.expires-b.expires);
  for(const o of offs.slice(0,2)){const p=S.players[o.pid],t=S.teams[o.team];if(!p||!t)continue;it.push({tag:o.type==='overseas'?'해외 영입 제안':'이적 제안',title:`${p.name} ← ${t.name} ${Ms(o.fee)}`,sub:`${Math.max(0,o.expires-S.clock)}일 남음 · ${o.type==='overseas'?lgShort(t)+' 무대':o.willing?'선수 이적 의향 있음':'선수가 이적 거부'}`,btn:'검토',on:`UI.openOffer(${o.id})`,face:p});}
  if(offs.length>2)it.push({tag:'이적 제안',title:`제안 ${offs.length-2}건 더`,sub:'',btn:'이적 탭',on:"UI.setTab('market')"});
  if(SL.draftTurn())it.push({tag:'고교 드래프트',title:'우리 지명 차례입니다',sub:'넘기면 잠재력 추정 1순위를 자동 지명합니다',btn:'드래프트 보드',on:"UI.go('dev','draft')"});
  if(S.phase==='offseason'&&S.dispatch&&S.dispatch.phase==='open')for(const rq of S.dispatch.reqs.slice(0,2)){const p=S.players[rq.pid],t=S.teams[rq.team];if(!p||!t)continue;const o=SL.dispatchOptions(p).find(x=>x.team.id===t.id);it.push({tag:'겨울리그 파견 요청 · 2주차까지',title:`${p.name} → ${t.name}`,sub:o?`예상 역할 ${o.role} · 성장 기대 ${o.growth} · 비용 ${Ms(o.fee)}`:'',btn:'결정',on:`UI.dispatchView(${p.id})`,face:p});}
  if(S.phase==='offseason')for(const id of S.pendingFA){const p=S.players[id];if(!p)continue;it.push({tag:'재계약 · 2주차까지',title:`${p.name} 계약 만료`,sub:`${p.pos} · ${p.age}세 · 종합 ${Math.round(SL.calcOvr(p))} · 연봉 ${Ms(p.contract.salary)}`,btn:'협상',on:`UI.openTable(${p.id})`,face:p});}
  {const ex=(ut.staff||[]).filter(c=>c.years<=0);if(S.phase==='offseason'&&ex.length&&S.week<=2)it.push({tag:'코치 재계약 · 2주차까지',title:`코치 계약 만료 ${ex.length}명`,sub:ex.map(c=>SL.BAL.STAFF[c.dept].name+' '+c.name).join(', '),btn:'코치진',on:"UI.go('club','staff')"});}
  if(S.phase==='offseason'){const iss=SL.rosterCheck(ut);if(iss.length)it.push({tag:'개막 요건',title:'선수단 요건 미달',sub:iss.join(', '),btn:'자동 보충',on:'UI.autoFill()'});}
  for(const g of (S.grievances||[])){const p=S.players[g.pid];if(p)it.unshift({tag:'면담 요청 · 3일 안에',title:`${p.name}: "주전 약속은 어떻게 된 건가요?"`,sub:`약속 뒤 ${g.n}경기 중 ${g.on}경기만 주전`,btn:'면담',on:`UI.grievance(${p.id})`,face:p});}
  if(S.phase==='season')for(const id of ut.roster.concat(ut.dev)){const p=S.players[id];const ps=p&&SL.promiseStatus(p);if(!ps||ps.pending||SL.promiseKept(ut,p))continue;const left=ps.of-ps.n,needMore=ps.need-ps.on;
    it.push({tag:ps.kind==='apology'?'사과 후 기회 약속':'주전 약속 이행 중',title:`${SL.josa(p.name,'이','가')} 지금 주전이 아닙니다`,sub:`${ps.of}경기 중 ${ps.need}경기 이상 주전 필요 · 지금 ${ps.n}경기 중 ${ps.on}경기${needMore>left?' · 이미 어려움':needMore>0?` · 남은 ${left}경기 중 ${needMore}경기 더`:''}`,btn:'라인업',on:"UI.go('roster','lineup')",face:p});}
  if(S.phase==='season'&&S.day>=14){const exp=ut.roster.concat(ut.dev).map(id=>S.players[id]).filter(p=>p&&p.contract&&p.contract.years<=1);if(exp.length)it.push({tag:'미리 챙길 일',title:`이번 시즌 후 FA ${exp.length}명`,sub:exp.slice(0,3).map(p=>p.name).join(', ')+(exp.length>3?' 외':''),btn:'재계약',on:`UI.openTable(${exp[0].id})`,face:exp[0]});}
  return it;}
function decisionCard(){const it=decisionItems();if(!it.length)return '';const show=ui.decAll?it:it.slice(0,3);
  return `<div class="card dec">${hd('지금 결정할 일',it.length+'건')}${show.map(x=>`<div class="drow">${x.face?face(x.face,38):x.em?emblem(x.em,38):''}<div class="grow"><span class="dtag">${esc(x.tag)}</span><div class="nm">${esc(x.title)}</div>${x.sub?`<div class="sub">${esc(x.sub)}</div>`:''}</div><button class="sm primary" onclick="${x.on}">${esc(x.btn)}</button></div>`).join('')}${it.length>3?`<button class="sm ghost" style="margin-top:8px" onclick="UI.set('decAll',${!ui.decAll})">${ui.decAll?'접기':`${it.length-3}건 더 보기`}</button>`:''}</div>`;}
function reportCard(r){const rk=r.rankFrom&&r.rankTo?(r.rankTo<r.rankFrom?`<span class="up">${r.rankFrom}→${r.rankTo}위 ▲</span>`:r.rankTo>r.rankFrom?`<span class="dn">${r.rankFrom}→${r.rankTo}위 ▼</span>`:`${r.rankTo}위 유지`):'-';
  return `<div class="card report">${hd(r.games>=6&&r.games<=8?'한 주간 구단 보고서':`${r.games}경기 보고서`,`<button class="sm ghost" onclick="UI.clearResult()">닫기</button>`)}${r.stop?`<div class="warnbox" style="margin-bottom:8px">${esc(r.stop)}</div>`:''}
    <div class="stat3"><div><div class="k">성적</div><div class="v small2">${r.w}승 ${r.l}패</div><span class="small ${r.rs>=r.ra?'up':'dn'}">득실 ${r.rs-r.ra>0?'+':''}${r.rs-r.ra}</span></div><div><div class="k">순위</div><div class="v small2">${rk}</div></div><div><div class="k">자금</div><div class="v small2 ${r.cash<0?'dn':'up'}">${r.cash>0?'+':''}${Ms(r.cash)}</div></div></div>
    ${r.bat?`<div class="prow" onclick="UI.openPlayer(${r.bat.p.id})">${face(r.bat.p,36)}<div class="grow"><div class="nm">최고 타자 · ${esc(r.bat.p.name)}</div><div class="sub">${esc(r.bat.line)}</div></div></div>`:''}
    ${r.pit?`<div class="prow" onclick="UI.openPlayer(${r.pit.p.id})">${face(r.pit.p,36)}<div class="grow"><div class="nm">최고 투수 · ${esc(r.pit.p.name)}</div><div class="sub">${esc(r.pit.line)}</div></div></div>`:''}
    ${r.grow.length?`<div class="small" style="margin-top:8px"><b>성장 변화</b> ${r.grow.slice(0,5).map(g=>`<a href="javascript:void 0" onclick="UI.openPlayer(${g.p.id})">${esc(g.p.name)}</a> <span class="${g.d>0?'up':'dn'}">${g.d>0?'+':''}${g.d}</span>`).join(' · ')}</div>`:''}</div>`;}
// 경기 후 흐름: 주요 기록 → 관심 선수 → 순위 변화 → 다음 판단 (기록 근거만)
function gameLines(lg,r0){const ut=SL.userTeam();const out=[];const B=lg.box||{};const mine=Object.keys(B).map(Number).filter(id=>S.players[id]&&S.players[id].teamId===ut.id);
  const bats=mine.filter(id=>B[id].pa>0).map(id=>({p:S.players[id],b:B[id],sc:B[id].h+B[id].hr*2+B[id].rbi*0.5+B[id].bb*0.3})).sort((a,b)=>b.sc-a.sc);
  if(bats[0]&&bats[0].sc>=1.5){const x=bats[0];out.push(`<b>수훈 타자</b> ${esc(x.p.name)} ${x.b.ab}타수 ${x.b.h}안타${x.b.hr?` ${x.b.hr}홈런`:''}${x.b.rbi?` ${x.b.rbi}타점`:''}`);}
  const sp=mine.find(id=>B[id].pGS>0);if(sp){const b=B[sp];out.push(`<b>선발</b> ${esc(S.players[sp].name)} ${Math.floor(b.pOuts/3)}.${b.pOuts%3}이닝 ${b.pER}자책 ${b.pSO}탈삼진${b.pW?' · 승':b.pL?' · 패':''}`);}
  const pins=(S.pins||[]).filter(id=>mine.includes(id)&&id!==(bats[0]&&bats[0].p.id)&&id!==sp).slice(0,2);for(const id of pins){const b=B[id];const p=S.players[id];out.push(`<b>관심</b> ${esc(p.name)} `+(SL.isPitcher(p)?`${Math.floor(b.pOuts/3)}.${b.pOuts%3}이닝 ${b.pER}자책`:`${b.ab}타수 ${b.h}안타${b.hr?' '+b.hr+'홈런':''}`));}
  if(S.phase==='season'&&r0&&r0.rank){const st=SL.standings(SL.compOf(ut));const rk=st.findIndex(t=>t.id===ut.id)+1;out.push(`<b>순위</b> ${rk<r0.rank?`<span class="up">${r0.rank}→${rk}위</span>`:rk>r0.rank?`<span class="dn">${r0.rank}→${rk}위</span>`:rk+'위 유지'}`);}
  if(S.phase==='season'){const nc=SL.nextCheck();out.push(`<b>다음</b> 성장 점검까지 ${nc}경기${S.market.offers.length?` · 검토할 제안 ${S.market.offers.length}건`:''}`);}
  return out;}
function resultCard(r){return `<div class="card result ${r.win?'win':'loss'}">${hd(`${r.win?'승리':'패배'} ${esc(r.text)}`,`<button class="sm ghost" onclick="UI.clearResult()">닫기</button>`)}${(r.lines||[]).map(l=>`<div class="small rline">${l}</div>`).join('')}</div>`;}
function rightPaneDefault(){const ut=SL.userTeam();let h=`<div class="rp-home gut">`;
  if(S.phase==='season'){const g=SL.userGameToday();if(g){const home=g.home===ut.id;const opp=S.teams[home?g.away:g.home];const st=SL.standings(SL.compOf(opp));const orank=st.findIndex(t=>t.id===opp.id)+1;const tp=SL.teamPower(opp).power,mp=SL.teamPower(ut).power;
      h+=`<div class="card">${hd('다음 상대',home?'홈':'원정')}<div class="row" style="gap:12px">${emblem(opp,56)}<div><div class="b">${esc(opp.name)}</div><div class="muted small">${orank}위 · ${opp.rec.w}승 ${opp.rec.l}패 · 전력 ${tp.toFixed(1)} (우리 ${mp.toFixed(1)})</div></div></div></div>`;}}
  const notes=SL.coachNotes();h+=`<div class="card">${hd('코치 한마디')}${notes.map(n=>`<div class="prow" onclick="UI.openPlayer(${n.pid})">${face(S.players[n.pid],36)}<div class="grow"><div class="sub b">${esc(n.who)}</div><div class="small">${esc(n.text)}</div></div></div>`).join('')||'<div class="muted small">특별히 보고할 내용이 없습니다.</div>'}</div>`;
  return h+`<div class="muted small" style="text-align:center;margin-top:8px">선수를 누르면 이쪽에 상세 정보가 열립니다.</div></div>`;}
function newsCard(){const ut=SL.userTeam();const rows=[];const seen=new Set();const add=(t,k)=>{if(!t||seen.has(t))return;seen.add(t);rows.push({t,k});};
  for(const p of ut.roster.map(id=>S.players[id]).filter(p=>p&&p.interest&&p.interest.stage>=1))add(`${p.name}: ${SL.interestText(p)}`,'overseas');
  for(const n of S.news.filter(n=>n.kind==='alumni').slice(0,2))add(n.text.replace(/^\[(출신|셀온|친정)\] /,'옛 제자 · '),'alumni');
  for(const n of S.news.slice(0,8))if(rows.length<6)add(n.text,n.kind);
  return `<div class="card">${hd('소식')}${rows.map(r=>`<div class="small nrow ${r.k==='alumni'?'al':r.k==='overseas'?'os':''}">${esc(r.t)}</div>`).join('')||'<div class="muted">아직 소식이 없습니다.</div>'}<div class="btns" style="margin-top:8px"><button class="sm ghost" onclick="UI.go('club','alumni')">옛 제자</button><button class="sm ghost" onclick="UI.go('club','overseas')">해외 리그</button></div></div>`;}
function renderHome(){
  const ut=SL.userTeam();let h='';
  for(const w of S.warn)h+=`<div class="badbox">${esc(w)}</div>`;
  if(ui.weekReport&&S.phase==='season'&&ui.weekReport.s===S.season&&!ui.weekReport.ended)h+=reportCard(ui.weekReport);else if(ui.gameResult)h+=resultCard(ui.gameResult);
  h+=storyCard(SL.weeklyStory());
  h+=decisionCard();
  if(S.phase==='season'){const g=SL.userGameToday();
    if(g){const home=g.home===ut.id;const opp=S.teams[home?g.away:g.home];const sp=S.players[ut.rotation[ut.rotIdx%Math.max(1,ut.rotation.length)]];
      h+=`<div class="card">${hd('다음 경기',`${S.day}일차 · ${home?'홈':'원정'}`)}<div class="row" style="gap:10px;justify-content:center;margin-bottom:6px">${emblem(ut,38)}<b>${esc(ut.name.split(' ')[0])}</b><span class="muted" style="font-family:var(--f-display);font-size:18px">VS</span>${emblem(opp,38)}<b>${esc(opp.name.split(' ')[0])}</b></div>
      <div class="muted small" style="text-align:center;margin-bottom:10px">상대 ${opp.rec.w}승 ${opp.rec.l}패 · 우리 선발 ${sp?esc(sp.name):'-'}${S.mgr&&S.mgr.cur&&S.mgr.cur.goal?` · 시즌 목표 <b>${esc(S.mgr.cur.goal.text)}</b>${goalLine()}`:''}</div>
      <div class="btns"><button class="primary" onclick="UI.startGame()">▶ 경기 보기</button><button class="ghost" onclick="UI.autoDays(1)">▶▶ 자동 진행</button></div><div style="height:6px"></div>
      <div class="btns"><button class="ghost sm" onclick="UI.autoDays(7)">7경기 자동</button><button class="ghost sm" onclick="UI.autoDays(99)">시즌 끝까지</button></div></div>`;}
  }else{const wk=Math.min(S.week,SL.BAL.OFFSEASON_WEEKS);const issues=SL.rosterCheck(ut);
    h+=`<div class="card">${hd('스토브리그',`${wk}주차 / ${SL.BAL.OFFSEASON_WEEKS}주`)}${S.lastSummary?`<div class="muted" style="margin-bottom:8px">${S.lastSummary.s}시즌 ${esc(SL.compName(S.lastSummary.div))} ${S.lastSummary.rank}위 · ${S.lastSummary.promoted?'<b class="ok">승격!</b>':S.lastSummary.relegated?'<b class="bad">강등</b>':'잔류'} · 최고 타자 ${esc(S.lastSummary.bestBat)}</div>`:''}
    ${issues.length?`<div class="warnbox">선수단 요건 미달: ${issues.join(', ')} <button class="sm" onclick="UI.autoFill()">최소 인원 자동 보충</button></div>`:''}
    ${S.week<=SL.BAL.OFFSEASON_WEEKS?`<button class="primary big" onclick="UI.advanceWeek()">다음 주로 ▶</button><div style="height:8px"></div>`:''}
    <button class="${S.week>SL.BAL.OFFSEASON_WEEKS?'primary':'ghost'} big" onclick="UI.startSeason()">${S.season+1}시즌 개막${S.week<=SL.BAL.OFFSEASON_WEEKS?' (남은 주 건너뛰기)':''}</button></div>`;}
  const pins=S.pins.map(id=>S.players[id]).filter(Boolean);if(pins.length)h+=pinCard();h+=growthCard();
  h+=newsCard();
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
    h+=`<div class="card">${hd('타순 · 수비 위치',offs?`<span class="bad">적성 밖 배치 ${offs}명</span>`:'모두 본래 포지션')}${offs?`<div class="warnbox small" style="margin-bottom:8px">${misfitReasons(ut).map(esc).join('<br>')}</div>`:''}`;
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
      if(!D.done){const df=ui.draftF||(ui.draftF={g:'all',sort:'pot'});const need=SL.needOf(ut);let list=avail.slice();
        if(df.g==='P')list=list.filter(p=>SL.isPitcher(p));else if(df.g==='B')list=list.filter(p=>!SL.isPitcher(p));else if(df.g==='need')list=list.filter(p=>need.includes(p.pos));else if(df.g!=='all')list=list.filter(p=>p.pos===df.g);
        const sk={pot:p=>p.scout.est,ovr:p=>SL.calcOvr(p),conf:p=>p.scout.conf,young:p=>-p.age}[df.sort];list.sort((x,y)=>sk(y)-sk(x));const cmp=(ui.draftCmp||[]).filter(id=>avail.some(p=>p.id===id));ui.draftCmp=cmp;
        h+=`<div class="card">${hd('지명 후보',`${list.length} / ${avail.length}명`)}<div class="small" style="margin-bottom:8px">우리 팀 부족 포지션: ${need.length?need.map(x=>`<span class="chip o">${SL.POS_KO[x]||x}</span>`).join(' '):'<span class="muted">없음</span>'}</div>
          <div class="row wrap" style="gap:6px;margin-bottom:6px">${[['all','전체'],['need','부족 포지션'],['P','투수'],['B','야수']].map(x=>`<button class="sm ${df.g===x[0]?'primary':'ghost'}" onclick="UI.draftF('g','${x[0]}')">${x[1]}</button>`).join('')}<select aria-label="포지션" onchange="UI.draftF('g',this.value)"><option value="all">포지션별</option>${SL.POS_BAT.concat(['SP','RP']).map(x=>`<option value="${x}" ${df.g===x?'selected':''}>${SL.POS_KO[x]||x}</option>`).join('')}</select><select aria-label="정렬" onchange="UI.draftF('sort',this.value)">${[['pot','잠재력순'],['ovr','현재 능력순'],['conf','판별 신뢰도순'],['young','나이 어린순']].map(x=>`<option value="${x[0]}" ${df.sort===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
          <div class="muted small" style="margin-bottom:6px">☐ 를 눌러 최대 3명을 골라 나란히 비교할 수 있습니다.${cmp.length?` <button class="sm primary" onclick="UI.draftCompare()">${cmp.length}명 비교</button> <button class="sm ghost" onclick="UI.set('draftCmp',[])">선택 해제</button>`:''}</div>
          ${list.map(p=>{const dg=SL.diagnose(p);const on=cmp.includes(p.id);return `<div class="prow" onclick="UI.openPlayer(${p.id})"><button class="sm ${on?'primary':'ghost'}" style="min-width:38px;padding:6px" aria-label="비교 선택" onclick="event.stopPropagation();UI.draftToggle(${p.id})">${on?'☑':'☐'}</button>${face(p,40)}<div class="grow"><div class="nm">${esc(p.name)} <span class="muted small" style="font-weight:400">${SL.POS_KO[p.pos]||p.pos} · ${p.age}세 · ${esc(p.school)}</span>${need.includes(p.pos)?' <span class="chip o">부족 포지션</span>':''}</div><div class="sub">잠재 <b>${SL.potText(p)}</b> (신뢰도 ${SL.confText(p.scout.conf)}) · ${esc(dg.arch)} · 강점 ${esc(dg.bestTxt)}${dg.weak?` · 약점 ${esc(SL.ATTR_KO[dg.weak])}`:''}${dg.fieldWeak&&dg.fieldWeak.length?` · <span class="bad">${dg.fieldWeak.map(k=>SL.ATTR_KO[k]).join('·')} 부족</span>`:''} ${p.traits.map(traitChip).join(' ')}</div>${myTurn?`<div class="row" style="margin-top:6px"><button class="sm primary" onclick="event.stopPropagation();UI.draftPick(${p.id},'dev')">육성군 지명</button><button class="sm" onclick="event.stopPropagation();UI.draftPick(${p.id},'roster')">1군 지명</button></div>`:''}</div><div class="rt">${G(SL.calcOvr(p))}</div></div>`;}).join('')||'<div class="muted">조건에 맞는 후보가 없습니다.</div>'}</div>`;}
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
    const askOf=p=>SL.aiAsk(S.teams[p.teamId],p);const need=SL.needOf(ut);
    if(f.q)ps=ps.filter(p=>p.name.includes(f.q.trim()));if(f.afford)ps=ps.filter(p=>askOf(p)<=ut.cash*0.9);if(f.open)ps=ps.filter(p=>SL.willingInfo(p,ut).level!=='부정적');if(f.need)ps=ps.filter(p=>need.includes(p.pos));
    const sk={ovr:p=>SL.calcOvr(p),pot:p=>p.scout.est,price:p=>-askOf(p),young:p=>-p.age}[f.sort]||(p=>SL.calcOvr(p));ps.sort((a,b)=>sk(b)-sk(a));const N=f.n||40;
    h+=`<div class="row wrap" style="margin-bottom:8px"><input aria-label="이름 검색" placeholder="이름 검색" value="${esc(f.q||'')}" onchange="UI.setBuyF('q',this.value)" style="flex:1;min-width:140px"><select aria-label="정렬" onchange="UI.setBuyF('sort',this.value)">${[['ovr','현재 능력순'],['pot','잠재력순'],['price','이적료 낮은순'],['young','나이 어린순']].map(x=>`<option value="${x[0]}" ${f.sort===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
    <div class="row wrap" style="gap:6px;margin-bottom:8px">${[['afford','예산 안'],['open','영입 가능(의향)'],['need','부족 포지션'+(need.length?' ('+need.join('·')+')':'')]].map(x=>`<button class="sm ${f[x[0]]?'primary':'ghost'}" onclick="UI.setBuyF('${x[0]}',${!f[x[0]]})">${f[x[0]]?'✓ ':''}${x[1]}</button>`).join('')}</div>
    <div class="row wrap" style="margin-bottom:10px"><select aria-label="리그" onchange="UI.setBuyF('div',this.value)"><option value="all">국내 전체</option>${[1,2,3].map(d=>`<option value="${d}" ${f.div==String(d)?'selected':''}>${d}부</option>`).join('')}<option value="os" ${f.div==='os'?'selected':''}>해외 전체</option></select><select aria-label="포지션" onchange="UI.setBuyF('pos',this.value)"><option value="ALL">포지션 전체</option><option value="B" ${f.pos==='B'?'selected':''}>야수</option><option value="P" ${f.pos==='P'?'selected':''}>투수</option>${SL.POS_BAT.concat(['SP','RP']).map(p=>`<option ${f.pos===p?'selected':''}>${p}</option>`).join('')}</select><select aria-label="등급" onchange="UI.setBuyF('grade',this.value)"><option value="ALL">등급 전체</option>${['S','A','B','C','D'].map(g=>`<option ${f.grade===g?'selected':''}>${g}</option>`).join('')}</select><select aria-label="잠재력" onchange="UI.setBuyF('minPot',this.value)"><option value="ALL">잠재력 전체</option>${['S','A','B','C'].map(g=>`<option value="${g}" ${f.minPot===g?'selected':''}>잠재 ${g} 이상</option>`).join('')}</select><input aria-label="최대 나이" type="number" placeholder="최대 나이" style="width:110px" value="${f.maxAge}" onchange="UI.setBuyF('maxAge',this.value)"></div>`;
    h+=`<div class="card">${hd('타 구단 선수',`${Math.min(N,ps.length)} / ${ps.length}명 표시${f.afford?` · 예산 ${Ms(ut.cash)} 기준`:''}`)}${ps.slice(0,N).map(p=>{const wi=SL.willingInfo(p,ut);return prow(p,`${esc(teamName(p.teamId))} · 예상 이적료 <b>${Ms(askOf(p))}</b> · 우리 팀 예상 <b>${SL.expectedRole(p,ut)}</b> · 의향 <span class="${wi.level==='긍정적'?'ok':wi.level==='부정적'?'bad':''}">${wi.level}</span>`);}).join('')||`<div class="muted">조건에 맞는 선수가 없습니다.${f.afford?' 「예산 안」을 끄면 더 많은 선수를 볼 수 있습니다.':''}</div>`}${ps.length>N?`<button class="ghost" style="width:100%;margin-top:8px" onclick="UI.setBuyF('n',${N+40})">다음 40명 보기 (${ps.length-N}명 남음)</button>`:''}</div>`;
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
  const ut=SL.userTeam();let h=subtabs('club',[['mgr','감독'],['table','순위'],['sched','일정'],['fin','재정'],['fac','시설'],['staff','코치진'],['alumni','옛 제자'],['overseas','해외 리그'],['hist','역대'],['data','설정·저장']]);const sb=ui.sub.club;
  if(sb==='mgr'){const m=S.mgr||{};const rp=m.rep!=null?m.rep:SL.calcRep();const P=SL.repParts();const cur=m.cur;const st=SL.standings(SL.compOf(ut));const rk=st.findIndex(t=>t.id===ut.id)+1;
    h+=`<div class="card">${hd('감독 평판',SL.repGrade(rp))}<div class="row" style="gap:14px"><div style="font-family:var(--f-display);font-size:44px;line-height:1">${rp}</div><div class="grow"><div class="potbar" style="height:10px"><i style="width:${rp}%"></i></div><div class="small muted">국내 2부 제의 ${SL.BAL.REP_NEED[2]} · 대만풍 ${SL.BAL.REP_NEED.TW} · 국내 1부 ${SL.BAL.REP_NEED[1]} · 일본풍 ${SL.BAL.REP_NEED.JP}</div></div></div>
    <div class="tw" style="margin-top:10px"><table><tr><th>구성</th><th>점수</th><th style="text-align:left">무엇을 보나</th></tr>
    <tr><td>성적</td><td class="${P.perf>=0?'up':'dn'}">${P.perf}</td><td style="text-align:left" class="small">예상 전력 대비 순위, 승격·우승, 시즌 목표 달성</td></tr>
    <tr><td>육성</td><td class="up">${P.dev}</td><td style="text-align:left" class="small">유망주를 실제 주전으로 키운 횟수</td></tr>
    <tr><td>운영</td><td class="${P.ops>=0?'up':'dn'}">${P.ops}</td><td style="text-align:left" class="small">시즌 중 팀 전력 유지·향상 (판매 이익은 전력을 지킨 경우만)</td></tr>
    <tr><td>해외 정착</td><td class="up">${P.abroad}</td><td style="text-align:left" class="small">보낸 선수가 해외 주전으로 자리 잡은 수</td></tr>
    <tr><td>의리</td><td>${P.loyalty}</td><td style="text-align:left" class="small">제의를 거절하고 남은 횟수</td></tr></table></div><div class="muted small" style="margin-top:6px">최근 시즌일수록 크게 반영되고, 높은 무대일수록 가중치가 큽니다.</div></div>`;
    if(cur&&cur.goal&&S.phase==='season')h+=`<div class="card">${hd('이번 시즌 목표',esc(ut.name))}<div class="row sb"><b>${esc(cur.goal.text)}</b><span class="b">${(SL.goalProgress()||{parts:[{ok:rk<=cur.goal.target,text:'현재 '+rk+'위'}]}).parts.map(x=>`<span class="${x.ok===null?'muted':x.ok?'ok':'due'}">${esc(x.text)}</span>`).join(' · ')}</span></div><div class="muted small">개막 예상 전력 ${cur.expRank}위 · 시작 전력 ${cur.powerStart}</div></div>`;
    const offs=S.jobOffers||[];if(offs.length)h+=offs.map(jobCard).join('');
    const car=m.career||[];h+=`<div class="card">${hd('감독 경력')}${car.map(c=>{const t=S.teams[c.team];const seasons=(m.seasons||[]).filter(x=>x.team===c.team&&x.s>=c.from&&(c.to==null||x.s<=c.to));return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">${t?emblem(t,36):''}<div class="grow"><b>${esc(c.name)}</b> <span class="muted small">${esc(SL.compName(c.comp))}</span><div class="small muted">${c.from}시즌 ~ ${c.to!=null?c.to+'시즌':'현재'}${seasons.length?' · '+seasons.map(x=>`${x.s}: ${x.rank}위${x.promoted?'↑':x.relegated?'↓':''}`).join(' '):''}</div></div>${c.team===ut.id?'<span class="chip g">현재</span>':''}</div>`;}).join('')}</div>`;
    const rh=m.repHist||[];if(rh.length>1){const mx=100;h+=`<div class="card">${hd('평판 추이')}<div style="display:flex;align-items:flex-end;gap:4px;height:80px">${rh.map(x=>`<div title="${x[0]}시즌 ${x[1]}" style="flex:1;background:var(--green);opacity:.75;border-radius:3px 3px 0 0;height:${Math.max(4,x[1]/mx*100)}%"></div>`).join('')}</div><div class="row sb small muted"><span>${rh[0][0]}시즌</span><span>${rh[rh.length-1][0]}시즌</span></div></div>`;}}
  else if(sb==='table'){const last=S.history[S.history.length-1];
    if(S.phase==='offseason'&&last){h+=`<div class="muted small" style="margin-bottom:8px">${last.s}시즌 최종 순위입니다. 승강이 반영된 다음 시즌 편성은 아래에 따로 있습니다.</div>`;
      const pl0=last.tables&&Object.keys(last.tables).find(k=>isNaN(+k));
      if(pl0){const L=SL.BAL.LEAGUES[pl0];const rows=last.tables[pl0];const groups=L&&L.subs?L.subs.map((n,i)=>({n:L.name+' '+n,rows:rows.filter(r=>r.sub===i)})).filter(g=>g.rows.length):[{n:L?L.name:pl0,rows}];
        for(const g of groups)h+=`<div class="card">${hd(esc(g.n),'지난 시즌 최종')}<div class="tw"><table><tr><th>#</th><th style="text-align:left">구단</th><th>승</th><th>패</th></tr>${g.rows.slice().sort((a,b)=>a.rank-b.rank).map(r=>`<tr class="${r.id===S.userTeamId?'me':''}"><td>${r.rank}</td><td style="text-align:left">${esc(r.name)}</td><td>${r.w}</td><td>${r.l}</td></tr>`).join('')}</table></div></div>`;}
      for(let d=1;d<=3;d++){const rows=last.tables[d]||[];h+=`<div class="card">${hd(d+'부 리그',last.s+'시즌 최종')}<div class="tw"><table><tr><th>#</th><th style="text-align:left">구단</th><th>승</th><th>패</th></tr>${rows.map(r=>{const up=last.promoted.includes(r.name),dn=last.relegated.includes(r.name);return `<tr class="${r.id===S.userTeamId?'me':''}"><td>${r.rank}</td><td style="text-align:left">${esc(r.name)}${up?' <span class="chip g">승격</span>':''}${dn?' <span class="chip r">강등</span>':''}</td><td>${r.w}</td><td>${r.l}</td></tr>`;}).join('')}</table></div></div>`;}
      h+=`<div class="card">${hd('다음 시즌 편성',(S.season+1)+'시즌')}${[1,2,3].map(d=>`<div style="margin-bottom:8px"><b>${d}부</b><div class="small">${SL.krTeams().filter(t=>t.div===d).map(t=>`<span class="${t.isUser?'b':''}">${esc(t.name)}</span>`).join(' · ')}</div></div>`).join('')}</div>`;}
    else{const pl=SL.playLg();if(pl){const cs=SL.leagueComps(pl);const mc=SL.compOf(ut);for(const c of cs.slice().sort((a,b)=>(b===mc)-(a===mc))){const st=SL.standings(c);h+=`<div class="card">${hd(SL.compName(c),(c===mc?'우리 리그 · ':'')+'압축 시즌 28경기'+(cs.length>1?' (교류전 포함)':''))}<div class="tw"><table><tr><th>#</th><th>구단</th><th>승</th><th>패</th><th>득실</th></tr>${st.map((t,i)=>`<tr class="${t.isUser?'me':''}"><td>${i+1}</td><td style="text-align:left">${esc(t.name)}</td><td>${t.rec.w}</td><td>${t.rec.l}</td><td>${t.rec.rs-t.rec.ra}</td></tr>`).join('')}</table></div></div>`;}}
    for(let d=1;d<=3;d++){const st=SL.standings(d);h+=`<div class="card">${hd(d+'부 리그',ut.league==='KR'&&d===ut.div?'우리 리그':'')}<div class="tw"><table><tr><th>#</th><th>구단</th><th>승</th><th>패</th><th>득실</th></tr>${st.map((t,i)=>`<tr class="${t.isUser?'me':''}"><td>${i+1}</td><td style="text-align:left">${esc(t.name)}${i<2&&d>1?' <span class="chip g">승격권</span>':''}${i>=6&&d<3?' <span class="chip r">강등권</span>':''}</td><td>${t.rec.w}</td><td>${t.rec.l}</td><td>${t.rec.rs-t.rec.ra}</td></tr>`).join('')}</table></div></div>`;}h+=`<div class="muted small">동률: 승수 → 승자승 → 득실차 → 득점</div>`;}}
  else if(sb==='sched'){const gs=S.schedule.filter(g=>SL.isUserGame(g));h+=`<div class="card">${hd('우리 구단 일정')}<div class="tw"><table><tr><th>일차</th><th style="text-align:left">상대</th><th>장소</th><th>결과</th></tr>${gs.map(g=>{const home=g.home===ut.id;const opp=S.teams[home?g.away:g.home];let r='-';if(g.res){const my=home?g.res.hs:g.res.as,op=home?g.res.as:g.res.hs;r=`<b class="${my>op?'ok':'bad'}">${my>op?'승':'패'}</b> ${my}:${op}`;}return `<tr class="${g.day===S.day&&S.phase==='season'?'me':''}"><td style="text-align:left">${g.day}</td><td style="text-align:left">${esc(opp.name)}</td><td>${home?'홈':'원정'}</td><td>${r}</td></tr>`;}).join('')}</table></div></div>`;}
  else if(sb==='fin'){const f=ut.fin;const pay=SL.payroll(ut);const paid=S.phase==='season'?S.day-1:SL.BAL.SEASON_GAMES;const remain=S.phase==='season'?Math.round(pay*(SL.BAL.SEASON_GAMES-paid)/SL.BAL.SEASON_GAMES):0;const inc=f.tickets+f.sponsor+f.dividend+f.sales;const out=f.salary+(f.staff||0)+f.buys+f.scout+f.facility+f.other+(f.dispatch||0);
    h+=`<div class="stat3"><div><div class="k">현재 현금</div><div class="v ${ut.cash<0?'bad':''}">${Ms(ut.cash)}</div></div><div><div class="k">연간 총연봉</div><div class="v">${Ms(pay)}</div></div><div><div class="k">잔여 급여</div><div class="v due">${Ms(remain)}</div></div></div>
    <div class="card">${hd(S.season+'시즌 수입·지출')}<div class="muted small" style="margin-bottom:8px">연봉은 연간 기준이며 경기일마다 1/${SL.BAL.SEASON_GAMES}씩 차감됩니다. 스폰서·운영비는 개막 때, 리그 배당은 시즌 종료 때 처리됩니다.</div><div class="tw"><table>
    <tr><th>수입</th><th></th></tr><tr><td>입장 수입</td><td>${M(f.tickets)}</td></tr><tr><td>스폰서</td><td>${M(f.sponsor)}</td></tr><tr><td>리그 배당</td><td>${M(f.dividend)}</td></tr><tr><td>선수 판매</td><td class="ok">${M(f.sales)}</td></tr><tr><td class="b">합계</td><td class="b">${M(inc)}</td></tr>
    <tr><th>지출</th><th></th></tr><tr><td>선수 급여</td><td>${M(f.salary)}</td></tr><tr><td>코치진 연봉</td><td>${M(f.staff||0)}</td></tr><tr><td>영입·계약금</td><td>${M(f.buys)}</td></tr><tr><td>스카우트</td><td>${M(f.scout)}</td></tr><tr><td>겨울리그 파견비</td><td>${M(f.dispatch||0)}</td></tr><tr><td>시설·운영비</td><td>${M(f.facility)}</td></tr><tr><td>위약금·대출 상환</td><td>${M(f.other)}</td></tr><tr><td class="b">합계</td><td class="b">${M(out)}</td></tr></table></div>
    ${ut.loan?`<div class="warnbox" style="margin-top:10px">대출 잔액 ${M(ut.loan)} — 다음 시즌 개막 때 상환</div>`:''}</div>
    <div class="card">${hd('긴급 대출',`한도 ${Ms(SL.BAL.LOAN_CAP)} · 이자 ${SL.BAL.LOAN_RATE*100}% · 명성 -2`)}<div class="row"><input id="loanAmt" aria-label="대출액" type="number" value="10000"><button onclick="UI.loan()">대출</button></div></div>`;}
  else if(sb==='fac'){const F=SL.BAL.FACILITY;const desc={train:['훈련장','성장 속도 +12%/Lv, 피로 회복 증가'],youth:['유소년 센터','유망주 수·잠재력, 육성군 정원 증가'],scout:['스카우트 조직','보고서 정확도·후보 수 증가']};
    h+=`<div class="card">${hd('시설','유지비는 개막 때 차감')}${Object.keys(F).map(k=>{const lv=ut.fac[k];const now=SL.facEffect(k,lv),nx=lv<5?SL.facEffect(k,lv+1):null;return `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div class="row sb"><div><b>${desc[k][0]}</b> <span class="chip n">Lv.${lv}</span></div><button class="sm ${lv<5?'go':''}" ${lv>=5?'disabled':''} onclick="UI.upgrade('${k}')">${lv>=5?'최대 레벨':`Lv.${lv+1} 업그레이드 ${Ms(F[k].cost*lv)}`}</button></div>
    <div class="tw" style="margin-top:6px"><table><tr><th>효과</th><th>현재</th>${nx?'<th>업그레이드 후</th>':''}</tr>${now.map((x,i)=>{const [kk,...vv]=x.split(' ');const nv=nx?nx[i].split(' ').slice(1).join(' '):'';const cv=vv.join(' ');return `<tr><td>${esc(x.replace(cv,'').trim())}</td><td>${esc(cv)}</td>${nx?`<td class="${nv!==cv?'up':''}">${esc(nv)}</td>`:''}</tr>`;}).join('')}<tr><td>유지비/시즌</td><td>${Ms(F[k].upkeep*lv)}</td>${nx?`<td class="due">${Ms(F[k].upkeep*(lv+1))} (+${Ms(F[k].upkeep)})</td>`:''}</tr></table></div></div>`;}).join('')}</div>`;}
  else if(sb==='staff'){h+=renderStaff(ut);}
  else if(sb==='overseas'){const LG=SL.BAL.LEAGUES;const abroadAll=Object.values(S.players).filter(p=>p.userLink&&!p.retired&&p.teamId!=null&&S.teams[p.teamId]&&S.teams[p.teamId].league!=='KR');
    const cnt={};for(const p of abroadAll){const l=S.teams[p.teamId].league;cnt[l]=(cnt[l]||0)+1;}
    const lg=LG[ui.ovLg]?ui.ovLg:(ut.league!=='KR'?ut.league:(Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||'JP'));const L=LG[lg];
    h+=`<div class="seg ovseg">${Object.entries(LG).map(([k,x])=>`<button class="${k===lg?'on':''}" onclick="UI.ovLg('${k}')">${x.short}${cnt[k]?` <span class="chip g">${cnt[k]}</span>`:''}</button>`).join('')}</div>`;
    const hs=L.winter?(S.overseas.whist||[]):(S.overseas.hist||[]);const last=hs[hs.length-1];const tab=last&&last.tables[lg]?last.tables[lg]:null;
    const ts=SL.overseasTeams().filter(t=>t.league===lg);const mineIn=t=>abroadAll.filter(p=>p.teamId===t.id).length;
    h+=`<div class="card">${hd(L.name,L.style)}<div class="muted small">정규시즌 ${L.games}경기 · 리그 수준 ${SL.BAL.LEVEL_OVR[lg]} · ${last&&tab?`${last.s}시즌${L.winter?' 겨울':''} 최종 성적`:'아직 치른 시즌이 없습니다.'} · 구단명은 실제 연고 도시에 가상 애칭을 붙였습니다.</div></div>`;
    const groups=L.subs?L.subs.map((n,i)=>({n,ts:ts.filter(t=>t.sub===i)})):[{n:null,ts}];
    for(const g of groups){const rows=g.ts.map(t=>{const r=tab&&tab.find(x=>x.id===t.id);return {t,w:r?r.w:null,l:r?r.l:null};}).sort((a,b)=>(b.w??-1)-(a.w??-1)||a.t.id-b.t.id);
      const top=rows[0]&&rows[0].w!=null?rows[0].w:null;
      h+=`<div class="card">${hd(g.n||'순위',g.n&&L.conf?(g.n.startsWith('EL')?L.conf[0]:L.conf[1]):'')}<div class="tw"><table><tr><th>#</th><th style="text-align:left">구단</th><th>승</th><th>패</th><th>차</th></tr>${rows.map((r,i)=>{const m=mineIn(r.t);return `<tr class="${r.t.isUser?'me':''}"><td>${r.w!=null?i+1:'-'}</td><td style="text-align:left">${esc(r.t.name)}${m?` <span class="chip g">우리 출신 ${m}</span>`:''}</td><td>${r.w??'-'}</td><td>${r.l??'-'}</td><td>${r.w!=null&&top!=null?(top-r.w||'-'):''}</td></tr>`;}).join('')}</table></div></div>`;}
    const abroad=abroadAll;
    h+=`<div class="card">${hd('해외에서 뛰는 우리 출신')}${abroad.map(p=>prow(p,esc(teamName(p.teamId))+' · '+seasonLine(p))).join('')||'<div class="muted">아직 없습니다.</div>'}</div>`;}
  else if(sb==='alumni'){const al=Object.values(S.players).filter(p=>(p.exUser||p.coached)&&!p.retired&&p.teamId!==ut.id).sort((a,b)=>SL.calcValue(b)-SL.calcValue(a));
    h+=`<div class="card">${hd('옛 제자',al.length+'명 · 내가 지도한 뒤 떠난 선수')}${al.map(p=>{const t=p.teamId!=null?S.teams[p.teamId]:null;const last=p.transfers.filter(x=>x.from===ut.name).pop();return prow(p,`${t?esc(t.name)+(t.league==='KR'?' '+t.div+'부':' (해외)'):'FA'} · ${seasonLine(p)}${p.sellOn&&p.sellOn.team===ut.id?' · <span class="chip g">셀온 10%</span>':''}${last?` · ${last.s}시즌 ${last.fee?Ms(last.fee)+' 판매':'이적'}`:''}`);}).join('')||'<div class="muted">아직 떠난 선수가 없습니다.</div>'}</div>
    <div class="card">${hd('관련 소식')}${S.news.filter(n=>n.kind==='alumni').slice(0,12).map(n=>`<div class="small" style="padding:5px 0;border-bottom:1px dashed var(--line)">${esc(n.text)}</div>`).join('')||'<div class="muted">없음</div>'}</div>`;}
  else if(sb==='hist'){const ms=(S.mgr&&S.mgr.seasons)||[];
    if(ms.length)h+=`<div class="card">${hd('시즌별 감독 실적','평판 계산의 근거')}<div class="tw"><table><tr><th>시즌</th><th>예상→실제</th><th>결과</th><th>전력 시작→끝</th><th>판매</th><th>육성 성공</th><th>해외 정착</th></tr>${ms.slice().reverse().map(m=>`<tr><td>${m.s} ${esc(m.tn?m.tn.split(' ')[0]:'')} (${esc(SL.compName(m.div))})</td><td>${m.expRank?m.expRank+'위 → ':''}${m.rank}위${m.expRank&&m.expRank-m.rank>=2?' <span class="up">↑</span>':''}</td><td>${m.promoted?'<b class="ok">승격</b>':m.relegated?'<b class="bad">강등</b>':'잔류'}</td><td>${m.powerStart!=null?m.powerStart+' → '+m.powerEnd:'-'}</td><td>${m.sales?m.sales+'명 '+Ms(m.salesFee):'-'}</td><td>${m.devHits||0}</td><td>${m.abroad||0}</td></tr>`).join('')}</table></div><div class="muted small" style="margin-top:6px">주전을 팔아 전력이 무너지면 '전력 시작→끝'에서 드러납니다. 판매 이익만으로는 좋은 평가를 받지 못합니다.</div></div>`;
    h+=S.history.slice().reverse().map(r=>`<div class="card">${hd(r.s+'시즌',`${esc(SL.compName(r.user.div))} ${r.user.rank}위 (${r.user.w}-${r.user.l})`)}<div class="small">승격: ${esc(r.promoted.join(', ')||'-')}<br>강등: ${esc(r.relegated.join(', ')||'-')}<br>우승: 1부 ${esc(r.tables[1][0].name)} · 2부 ${esc(r.tables[2][0].name)} · 3부 ${esc(r.tables[3][0].name)}</div></div>`).join('')||'<div class="card muted">아직 끝난 시즌이 없습니다.</div>';}
  else{h+=`<div class="card">${hd('화면·소리','이 기기에만 저장')}${settingsHtml()}</div>`;
    if(ui.testMode)h+=`<div class="card" style="border:2px dashed var(--orange)">${hd('테스트 도구','주소에 ?test=1 일 때만 보임')}<pre class="small" id="tinfo" style="white-space:pre-wrap;background:var(--sunk);padding:8px;border-radius:8px">${esc(SL.testInfo())}</pre>
      <div class="row wrap" style="gap:6px"><button class="sm" onclick="UI.testCopy()">요청서용 정보 복사</button><button class="sm" onclick="UI.test('endSeason')">시즌 끝내기</button><button class="sm" onclick="UI.test('nextSeason')">다음 시즌 개막까지</button><button class="sm" onclick="UI.test('cash')">현금 +10억</button><button class="sm" onclick="UI.test('reveal')">잠재력 전부 공개</button></div></div>`;
    h+=`<div class="muted small" style="text-align:center">게임 ${SL.GAME_VER} · 저장 형식 ${SL.VERSION}</div>`;
    h+=`<div class="card">${hd('저장','모든 진행 후 자동 저장')}<div class="btns"><button class="primary" onclick="UI.saveNow()">수동 저장</button><button onclick="UI.exportSave()">JSON 내보내기</button></div>
    <div style="height:12px"></div><input type="file" id="impfile2" accept=".json,application/json" style="width:100%"><div style="height:6px"></div><button onclick="UI.importFile(2)">파일로 불러오기</button><div style="height:8px"></div><textarea id="imp_json" placeholder="또는 JSON 내용을 붙여넣기" style="width:100%;height:60px;font-size:11px"></textarea><div style="height:6px"></div><button onclick="UI.importText('imp_json')">붙여넣은 JSON 불러오기</button>
    <div class="muted small" style="margin-top:8px">잘못된 파일은 현재 진행을 덮어쓰지 않습니다.</div></div>
    <div class="card">${hd('제작 정보')}<div class="small muted">선수 초상화·구단 엠블럼·구장 그래픽: PixelLab으로 생성한 이 게임 전용 도트 그림. 효과음: ElevenLabs로 생성. 모든 구단·선수·리그는 가상입니다.</div></div>
    <div class="card">${hd('새 게임')}<button class="danger" onclick="UI.resetGame()">현재 진행 삭제 후 새 게임</button></div>`;}
  return h;
}

// ---------- 선수 상세 (전체 화면) ----------
// 능력치 비교 기준: 시즌 시작 / 입단 당시 / 직전 훈련 — 기록이 있는 것만
function attrBases(p){const out=[];let sn=p.snap&&p.snap.attrs?p.snap:null;
  // 시즌 시작 기준은 그 시점에 이미 우리 선수였을 때만 (드래프트·시즌 중 합류 선수는 「입단 당시」가 기준)
  if(sn&&p.teamId===S.userTeamId){const late=p.joinClock!=null?(sn.c==null||sn.c<p.joinClock):(sn.join||(S.phase==='offseason'&&sn.s===S.season&&(p.transfers||[]).some(t=>t.s===S.season&&/드래프트/.test(t.kind))));if(late)sn=null;}
  if(sn)out.push({k:'season',label:(S.phase==='season'?'시즌 시작':sn.s+'시즌 시작'),attrs:sn.attrs});
  if(p.base)out.push({k:'join',label:'입단 당시',attrs:p.base});
  const lg=(p.log||[])[0];if(lg&&lg.ch){const a={};for(const k in p.attrs)a[k]=p.attrs[k]-(lg.ch[k]||0);out.push({k:'tick',label:'직전 훈련 전',attrs:a,note:lg.label});}
  return out;}
function renderPlayer(v){
  const p=S.players[v.id];if(!p)return '';const ut=SL.userTeam();const mine=p.teamId===ut.id;const ovr=SL.calcOvr(p);const isP=SL.isPitcher(p);const keys=isP?SL.PIT_KEYS:SL.BAT_KEYS;
  const t=p.teamId!=null?S.teams[p.teamId]:null;const r=SL.report(p);const tab=v.tab||'ability';const gt={early:'조숙형',normal:'일반형',late:'대기만성형'}[p.growthType];
  const bases=attrBases(p);const bk=bases.find(b=>b.k===ui.attrBase)?ui.attrBase:(bases[0]?bases[0].k:null);const baseAttrs=bk?bases.find(b=>b.k===bk):{attrs:p.attrs,label:''};
  const where=t?esc(t.name)+(t.league==='KR'?` (${t.div}부)`:' (해외)'):p.youth?'유소년 후보':p.draft?'드래프트 후보 · '+esc(p.school||''):p.scouted?'스카우트 후보':p.retired?'은퇴':'자유계약(FA)';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">선수 정보</span><span style="margin-left:auto"><button aria-label="관심 선수 고정" style="font-size:22px" onclick="UI.pin(${p.id})">${S.pins.includes(p.id)?'★':'☆'}</button></span></div><div class="content gut" style="padding-bottom:16px">`;
  h+=`<div class="phero">${face(p,88)}<div style="min-width:0"><div class="nm">${esc(p.name)} ${G(ovr)}</div><div class="muted">${p.age}세 · ${p.pos} · ${SL.NAT_KO[p.nat]||''} · ${p.bats==='S'?'양타':p.bats==='L'?'좌타':'우타'}/${p.throws==='L'?'좌투':'우투'}${isP?' · '+SL.velocity(p)+'km/h':''}</div><div class="small">${where}${mine?' · '+esc(role(p)):''}${p.dispatch?' · <span class="chip o">겨울리그 파견 중</span>':''}</div><div style="margin-top:4px">${standChips(p)}</div></div></div>`;
  const sd=SL.seasonDelta(p);const sl=S.phase==='season'?'이번 시즌':'지난 시즌';
  h+=`<div class="stat3"><div><div class="k">현재 능력</div><div class="v">${Math.round(ovr)}</div>${sd&&sd.d?`<span class="small ${sd.d>0?'up':'dn'}">${sl} ${sd.d>0?'+':''}${sd.d}</span>`:''}</div><div><div class="k">예상 잠재</div><div class="v">${SL.potText(p)}</div><span class="chip ${p.scout.conf>=0.65?'g':p.scout.conf<0.35?'o':''}">신뢰도 ${SL.confText(p.scout.conf)}</span></div><div><div class="k">시장가치</div><div class="v">${Ms(SL.calcValue(p))}</div>${sd&&sd.v!=null&&Math.abs(sd.v)>=100?`<span class="small ${sd.v>0?'up':'dn'}">${sd.v>0?'+':''}${Ms(sd.v)}</span>`:''}</div></div>`;
  if(r&&r.d!==0){const neg=r.d<0;h+=`<div class="gban" style="${neg?'background:var(--red-bg);border-color:transparent':''}"><div class="l" style="${neg?'color:var(--red-ink)':''}">${S.phase==='season'?r.s+'시즌 개막 대비':r.s+'시즌 성장'}</div><div><div class="k">종합</div><div class="v">${r.from} → <em style="${neg?'color:var(--red-ink)':''}">${r.to}</em></div></div>${r.bestD>0.5?`<div><div class="k">${SL.ATTR_KO[r.bestK]}</div><div class="v">${Math.round(r.bestFrom)} → <em>${Math.round(p.attrs[r.bestK])}</em></div></div>`:`<div><div class="k">가치</div><div class="v">${Ms(r.valTo)}</div></div>`}</div>`;}
  if(S.phase==='offseason'&&mine&&!p.dispatch&&!p.retired){const el=SL.dispatchEligible&&SL.dispatchEligible(p)&&S.dispatch&&S.dispatch.phase==='open';h+=`<div class="card"><div class="row sb"><div><b>이번 겨울</b> <span class="muted small">${p.winterPlan==='rest'?'휴식 — 성장 거의 없음, 노화 절반, 개막 컨디션 최상':'국내 동계훈련 — 훈련 방향대로 성장'}</span></div></div><div class="btns" style="margin-top:8px"><button class="sm ${p.winterPlan!=='rest'?'primary':'ghost'}" onclick="UI.winterPlan(${p.id},null)">동계훈련</button><button class="sm ${p.winterPlan==='rest'?'primary':'ghost'}" onclick="UI.winterPlan(${p.id},'rest')">휴식</button>${el?`<button class="sm ghost" onclick="UI.dispatchView(${p.id})">겨울리그 파견</button>`:''}</div></div>`;}
  h+=`<div class="seg" role="tablist">${[['ability','능력·성장'],['record','기록'],['contract','계약']].map(x=>`<button role="tab" class="${tab===x[0]?'on':''}" onclick="UI.pTab('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
  if(tab==='ability'){
    h+=`<div class="card">${bases.length>1?`<div class="row wrap" style="gap:6px;margin-bottom:8px"><span class="muted small">비교 기준</span>${bases.map(b=>`<button class="sm ${b.k===bk?'primary':'ghost'}" onclick="UI.attrBase('${b.k}')">${b.label}</button>`).join('')}</div>`:bases.length?`<div class="muted small" style="margin-bottom:6px">비교 기준: ${bases[0].label}</div>`:'<div class="muted small" style="margin-bottom:6px">비교할 과거 기록이 아직 없습니다.</div>'}${keys.map(k=>{const val=p.attrs[k];const b=baseAttrs.attrs[k]!=null?baseAttrs.attrs[k]:val;const d=Math.round((val-b)*10)/10;const w=Math.max(0,Math.min(100,val));const w0=Math.max(0,Math.min(100,Math.min(val,b)));
      return `<div class="attr"><span class="k">${SL.ATTR_KO[k]}</span><div class="bar" role="img" aria-label="${SL.ATTR_KO[k]} ${Math.round(val)}"><s style="width:${w.toFixed(1)}%"></s><i style="width:${w0.toFixed(1)}%"></i></div><span class="v">${Math.round(val)}</span><span class="d ${d>0.05?'up':d<-0.05?'dn':'muted'}">${d>0.05?'+'+d:d<-0.05?d:'–'}</span></div>`;}).join('')}
    <div class="muted small" style="margin-top:4px">진한 막대 = ${esc(baseAttrs.label||'기준 시점')} 능력, 옅은 부분 = 이후 성장${baseAttrs.note?' · '+esc(baseAttrs.note):''}</div>
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
  return `<div class="card">${hd('판매하면?','지금 기준 시뮬레이션')}<div class="row" style="gap:12px;margin-bottom:6px"><div><div class="muted small">팀 전력</div><div style="font-family:var(--f-display);font-size:22px">${im.before.toFixed(1)} → <span class="${im.delta<0?'bad':'ok'}">${im.after.toFixed(1)}</span></div></div><div class="small ${im.delta<=-1?'bad':im.delta<0?'due':'ok'}"><b>${im.delta>0?'+':''}${im.delta}</b><br>${im.delta<=-1.5?'큰 전력 손실':im.delta<=-0.5?'다소 손실':'영향 작음'}</div></div><div class="small" style="margin-bottom:6px">현재 역할: <b>${esc(im.role)}</b></div>
  ${nc.length?nc.map(x=>`<div class="prow" onclick="UI.openPlayer(${x.p.id})">${face(x.p,34)}<div class="grow"><div class="nm">${esc(x.p.name)} <span class="muted small" style="font-weight:400">${x.p.age}세 · 본래 ${x.p.pos}</span></div><div class="sub">기회를 얻는 선수 → ${esc(x.pos)}${x.p.age<=24?' · <span class="up">출장 늘면 성장 가속</span>':''} · 잠재 ${SL.potText(x.p)}</div></div>${G(SL.calcOvr(x.p))}</div>`).join(''):(im.gap?'<div class="warnbox">이 자리를 메울 선수가 없습니다. 판매 전 대체 선수를 먼저 구하세요.</div>':`<div class="muted small">${im.roleKey==='dev'?'육성군 선수라':'주전이 아니라'} 당장 편성 변화는 없습니다.</div>`)}
  <div class="muted small" style="margin-top:6px">판매 시 셀온 ${Math.round(SL.BAL.SELL_ON*100)}%: 이 선수가 다시 팔리면 이적료의 ${Math.round(SL.BAL.SELL_ON*100)}%가 우리에게 들어옵니다.</div></div>`;}
function renderDispatch(v){const p=S.players[v.pid];if(!p)return '';const D=S.dispatch;const opts=SL.dispatchOptions(p);const open=D&&D.phase==='open';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">겨울리그 파견지</span></div><div class="content gut" style="padding-bottom:16px">
  <div class="row" style="gap:12px;margin-bottom:12px">${face(p,64)}<div><div style="font-family:var(--f-display);font-size:22px">${esc(p.name)}</div><div class="muted">${p.age}세 · ${SL.POS_KO[p.pos]} · 종합 ${Math.round(SL.calcOvr(p))} · 잠재 ${SL.potText(p)}</div></div></div>
  <div class="card"><div class="b" style="margin-bottom:6px">겨울을 보내는 세 가지 방법</div><div class="tw"><table class="lt"><tr><th>선택</th><th>얻는 것</th><th>감수하는 것</th></tr>
  <tr><td>겨울리그 파견</td><td>실전 경험, 해외 스카우트 노출</td><td>파견비, 복귀 후 개막 피로·컨디션 저하, 출장 기회 불확실</td></tr>
  <tr><td>국내 동계훈련</td><td>지정한 훈련 방향으로 안정적 성장</td><td>실전 경험 없음</td></tr>
  <tr><td>휴식</td><td>개막 컨디션 최상, 노화 절반</td><td>성장 거의 없음 (베테랑·혹사 선수용)</td></tr></table></div>
  ${!p.dispatch&&p.teamId===S.userTeamId?`<div class="btns" style="margin-top:8px"><button class="${p.winterPlan==='rest'?'ghost':'primary'}" onclick="UI.winterPlan(${p.id},null)">동계훈련${p.winterPlan!=='rest'?' ✓':''}</button><button class="${p.winterPlan==='rest'?'primary':'ghost'}" onclick="UI.winterPlan(${p.id},'rest')">휴식${p.winterPlan==='rest'?' ✓':''}</button></div>`:''}</div>`;
  h+=opts.map(o=>{const t=o.team;const L=SL.BAL.LEAGUES[t.league];const ls=SL.leagueStanding(p,t.league);return `<div class="card"><div class="row sb"><div class="row">${emblem(t,40)}<div><b>${esc(t.name)}</b>${o.need?' <span class="chip o">파견 요청</span>':''}<div class="muted small">${L.name} (${L.style}) · 수준 ${SL.BAL.LEVEL_OVR[t.league]}</div></div></div><b class="${o.role==='주전'?'ok':o.role==='벤치'?'bad':''}">${o.role}</b></div>
    <div class="small" style="margin-top:8px;line-height:1.7">이 리그에서: <span class="chip ${ls.cls}">${ls.label}</span> · ${esc(o.why)}<br>성장 기대: <span class="chip ${o.gcls}">${o.growth}</span> · 파견비 ${Ms(o.fee)}<br><span class="muted">복귀 후: 개막 피로 ${o.back.fat} · 컨디션 −${o.back.cond} (국내 훈련은 0)</span></div>
    ${open?`<div style="height:8px"></div><button class="${o.role==='주전'||o.role==='주전 경쟁'?'primary':'ghost'}" style="width:100%" onclick="UI.dispatch(${p.id},${t.id})">이 구단에 파견</button>`:''}</div>`;}).join('');
  if(open)h+=`<button class="ghost big" onclick="UI.declineDispatch(${p.id});UI.back()">국내에서 집중 훈련</button>`;
  return h+`</div></div>`;}
function jobCard(o){const t=S.teams[o.team];if(!t)return '';const pupils=t.roster.map(id=>S.players[id]).filter(p=>p&&p.coached);
  return `<div class="decide"><span class="tagline">${o.kind==='return'?'친정 복귀 요청':'감독 제의'} · 2주차까지</span><div class="row" style="gap:10px">${emblem(t,46)}<div class="grow"><div class="ttl">${esc(t.name)}</div><div class="muted">${esc(SL.compName(SL.compOf(t)))} · 지난 시즌 ${t.lastRank||'-'}위 · 예상 전력 ${o.rankExp}/${o.n}위</div></div></div>
  <div class="small" style="margin:8px 0;line-height:1.7">구단 목표: <b>${esc(o.goal.text)}</b>${pupils.length?` · 옛 제자 <b>${pupils.length}명</b> (${esc(pupils.slice(0,2).map(p=>p.name).join(', '))})`:''}</div>
  <div class="btns"><button class="primary" onclick="UI.jobView(${o.id})">자세히 보기</button><button class="ghost" onclick="UI.declineJob(${o.id})">잔류한다</button></div></div>`;}
function renderJob(v){const o=(S.jobOffers||[]).find(x=>x.id===v.id);if(!o)return `<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">감독 제의</span></div><div class="content gut"><div class="warnbox">${esc(v.msg||'제의가 마감되었습니다.')}</div><button class="primary big" onclick="UI.back()">돌아가기</button></div></div>`;
  const t=S.teams[o.team];const ut=SL.userTeam();const ps=t.roster.map(id=>S.players[id]).filter(Boolean).sort((a,b)=>SL.calcOvr(b)-SL.calcOvr(a));const pupils=ps.filter(p=>p.coached);const pw=SL.teamPower(t).power,myPw=SL.teamPower(ut).power;const e=SL.econ(t);
  return `<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">${o.kind==='return'?'친정 복귀 요청':'감독 제의'}</span><span class="small due" style="margin-left:auto">2주차까지</span></div>
  <div class="table-top gut"><div class="seats"><div>${emblem(t,64)}<div class="nm">${esc(t.name)}</div><div class="rl">${esc(SL.compName(SL.compOf(t)))}${t.league!=='KR'?' · '+SL.BAL.LEAGUES[t.league].style:''}</div></div><div class="vs">→</div><div>${emblem(ut,64)}<div class="nm">현재 ${esc(ut.name)}</div><div class="rl">평판 ${S.mgr.rep} · ${SL.repGrade(S.mgr.rep)}</div></div></div></div>
  <div class="content gut" style="padding-bottom:12px">
  <div class="chat"><div class="bub club"><span class="who">${esc(t.name)} 단장</span>${o.kind==='return'?`팀이 어렵습니다. 이 팀을 가장 잘 아는 분이 돌아와 주셨으면 합니다. 목표는 ${esc(o.goal.text)}입니다.`:`당신의 ${S.mgr.seasons.reduce((a,m)=>a+(m.devHits||0),0)>=2?'육성 능력':'운영 성과'}을 높이 평가합니다. 우리 구단의 목표는 ${esc(o.goal.text)}입니다. 함께해 주시겠습니까?`}</div></div>
  <div class="stat3"><div><div class="k">팀 전력</div><div class="v">${pw}</div><span class="small ${pw>=myPw?'up':'dn'}">현재 팀 ${myPw}</span></div><div><div class="k">예상 순위</div><div class="v">${o.rankExp}/${o.n}</div></div><div><div class="k">구단 자금</div><div class="v">${Ms(t.league==='KR'?t.cash:Math.min(t.cash,e.sponsor*1.5))}</div></div></div>
  <div class="card">${hd('구단 상황')}<div class="small" style="line-height:1.8">지난 시즌 ${t.lastRank||'-'}위 · 명성 ${t.rep} · 시설 훈련장 Lv.${t.fac.train}/유소년 Lv.${t.fac.youth}/스카우트 Lv.${t.fac.scout}<br>시즌 스폰서 약 ${Ms(e.sponsor)} · 홈 경기 입장 수입 약 ${Ms(e.ticket)}${t.league!=='KR'?'<br>해외 무대: 승강제 없음, 이 리그 6개 이하 구단이 28경기 압축 시즌을 치릅니다.':''}</div></div>
  ${pupils.length?`<div class="card">${hd('옛 제자',pupils.length+'명')}${pupils.map(p=>prow(p,`${seasonLine(p)}`)).join('')}</div>`:''}
  <div class="card">${hd('주요 선수')}${ps.slice(0,5).map(p=>prow(p,SL.isPitcher(p)?SL.POS_KO[p.pos]:SL.POS_KO[p.pos]+' · '+seasonLine(p))).join('')}</div>
  <div class="warnbox small">이직하면 ${esc(ut.name)} 선수들은 데려갈 수 없고(옛 제자로 남음), 진행 중인 판매·협상·파견 결정은 취소됩니다. 계약 만료 선수는 구단이 정리합니다.</div></div>
  <div class="offerform gut"><div class="btns"><button class="ghost" onclick="UI.declineJob(${o.id})">잔류한다</button><button class="primary" onclick="UI.confirmMove(${o.id})">취임한다</button></div></div></div>`;}
// ---------- 협상 테이블 ----------
function renderTable(v){
  const p=S.players[v.pid];const ut=SL.userTeam();if(!p)return '';const neg=S.market.negs.find(n=>n.pid===v.pid);
  const done=v.result;const log=done?v.result.log:neg?neg.log:[];const fromT=v.fromTeam!=null?S.teams[v.fromTeam]:null;
  const stage=neg?neg.stage:'done';const mood=neg?neg.mood:(done&&done.mood)||50;const moodC=mood>=65?'#4fd18e':mood>=40?'#f0b44c':'#f07a6e';
  const agentNm=(neg&&neg.agent)||v.agent;const otherName=stage==='club'&&fromT?fromT.name+' 단장':agentNm?`${agentNm} (대리인)`:p.name;
  const title=(neg&&neg.mode==='renew')||v.mode==='renew'?'재계약 협상':stage==='club'?'이적료 협상':'계약 협상';
  let h=`<div class="pv"><div class="pvbar gut"><button aria-label="뒤로" onclick="UI.back()">←</button><span class="t">${title}</span>${neg?`<span class="small" style="margin-left:auto;color:var(--on-navy-dim)">남은 제시 ${neg.maxRounds-neg.rounds}회${neg.second?' · 두 번째 자리':''}</span>`:''}</div>
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
    ${neg.wantPromise?`<label class="toggle" for="tf_prom"><input id="tf_prom" type="checkbox" ${f.promise?'checked':''} onchange="UI.setF('promise',this.checked)"> 주전 출장 약속 <span class="muted small">(어기면 사기 크게 하락)</span></label>`:''}
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
// 하이라이트 관전: 득점권 주자 / 관심 선수 타석·등판 / 8회 이후 접전
function isKeyMoment(lg,my){const B=SL.curBatter(lg),P=SL.curPitcher(lg);const pins=S.pins||[];const close=Math.abs(lg.score[0]-lg.score[1])<=3;
  return !!(lg.bases[1]||lg.bases[2])||pins.includes(B&&B.id)||(lg.half!==my&&pins.includes(P&&P.id)&&lg.outs===0)||(lg.inn>=8&&close);}
function keyWhy(lg,my){const B=SL.curBatter(lg);if(lg.bases[1]||lg.bases[2])return `${lg.inn}회 득점권 찬스`;if((S.pins||[]).includes(B&&B.id))return `관심 선수 ${B.name} 타석`;if(lg.inn>=8)return `${lg.inn}회 접전`;return '주요 장면';}
function renderGame(){
  const lg=S.liveGame;const H=S.teams[lg.home],A=S.teams[lg.away];const ut=SL.userTeam();const mySide=lg.home===ut.id?1:0;
  const B=lg.done?null:SL.curBatter(lg),P=lg.done?null:SL.curPitcher(lg);const bases=lg.bases;
  let h=`<div class="club gut"><div class="r1"><div><div class="nm">${lg.done?'경기 종료':`${lg.inn}회 ${lg.half===0?'초':'말'}`}</div><div class="sub">${S.season}시즌 ${S.day}일차</div></div></div></div><div class="content gut" style="padding-bottom:24px">`;
  h+=`<div class="score"><div class="${!lg.done&&lg.half===0?'atk':''}" style="text-align:center">${emblem(A,34)}<div class="tn">${esc(A.name)}</div><div class="sc">${lg.score[0]}</div></div><div>${ART&&ART.field?`<div class="field"><img class="px" alt="" src="${ART.field}"><i class="r1 ${bases[0]?'on':''}"></i><i class="r2 ${bases[1]?'on':''}"></i><i class="r3 ${bases[2]?'on':''}"></i></div>`:`<div class="diamond"><i class="b2 ${bases[1]?'on':''}"></i><i class="b1 ${bases[0]?'on':''}"></i><i class="b3 ${bases[2]?'on':''}"></i></div>`}<div class="count"><span>B ${lg.balls}</span><span>S ${lg.strikes}</span><span>O ${lg.outs}</span></div></div><div class="${!lg.done&&lg.half===1?'atk':''}" style="text-align:center">${emblem(H,34)}<div class="tn">${esc(H.name)}</div><div class="sc">${lg.score[1]}</div></div></div>`;
  {const PA=['1b','2b','3b','hr','so','walk','bb','dp','fo','go','hbp','sf','e'];const lp=[...lg.log].reverse().find(l=>PA.includes(l.type));if(lp&&!lg.done){const big={hr:'홈런!',bb:'볼넷',walk:'볼넷','1b':'안타','2b':'2루타','3b':'3루타',so:'삼진',dp:'병살',go:'땅볼 아웃',fo:'뜬공 아웃'}[lp.type]||null;const cls=['hr','1b','2b','3b','bb','walk'].includes(lp.type)?'good':['so','dp','go','fo'].includes(lp.type)?'bad':'';
    const ours=lp.half===mySide;h+=`<div class="lastplay ${cls} ${ours?'ours':'theirs'}" key="${lg.log.length}">${big?`<div class="lpb">${big}</div>`:''}<div class="lpt">직전 타석 · ${lp.inn}회${lp.half===0?'초':'말'} · ${esc(lp.text)}</div></div>`;}}
  const maxInn=Math.max(9,lg.inn);let line='<table style="font-size:12px"><tr><th></th>';for(let i=1;i<=maxInn;i++)line+=`<th>${i}</th>`;line+='<th>R</th><th>H</th></tr>';for(const s of [0,1]){line+=`<tr><td>${esc((s===0?A:H).name.split(' ')[0])}</td>`;for(let i=1;i<=maxInn;i++){const val=lg.innScores[s][i-1];line+=`<td>${val!=null?val:(lg.inn===i&&lg.half===s&&!lg.done?lg.halfRuns:'')}</td>`;}line+=`<td class="b">${lg.score[s]}</td><td>${lg.hits[s]}</td></tr>`;}line+='</table>';
  h+=`<div class="card tw" style="padding:8px">${line}</div>`;
  if(!lg.done){const bb=lg.box[B.id]||{};const runners=[2,1,0].map(i=>bases[i]?`${i+1}루 ${esc(S.players[bases[i].pid].name)}`:null).filter(Boolean).join(', ');
    h+=`<div class="card"><div class="row sb" style="align-items:flex-start"><div class="row">${face(B,40)}<div><div class="muted small">타자 ${lg.bat[lg.half]+1}번</div><b>${esc(B.name)}</b> <span class="small muted">${bb.h||0}/${bb.ab||0}</span></div></div><div class="row" style="text-align:right"><div><div class="muted small">투수 ${lg.pc[P.id]||0}구</div><b>${esc(P.name)}</b> <span class="small muted">${SL.velocity(P)}km</span></div>${face(P,40)}</div></div><div class="muted small" style="margin-top:6px">주자: ${runners||'없음'}</div></div>`;
    h+=`<button class="primary big" onclick="UI.step('pa')">다음 타석 ▶</button><div style="height:8px"></div><div class="btns4"><button onclick="UI.step('pitch')">공 하나씩</button><button onclick="UI.step('hl')" title="득점권·관심 선수·8회 이후 장면까지 넘김">하이라이트</button><button onclick="UI.step('half')">이닝 끝까지</button><button onclick="UI.step('game')">경기 끝까지</button></div><div style="height:8px"></div>`;
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
// ----- 작은 행사: 지명 · 계약 · 시즌 결산 -----
function staffVoice(dept){const c=(SL.userTeam().staff||[]).filter(x=>x.dept===dept&&(x.years>0||x.expiring)).sort((a,b)=>b.rating-a.rating)[0];return c?`${SL.BAL.STAFF[dept].name} ${c.name}`:null;}
function draftCeremony(r){const p=S.players[r.pid];if(!p)return;const ut=SL.userTeam();const dg=SL.diagnose(p);const F=SL.isPitcher(p)?SL.FOCUS_PIT:SL.FOCUS_BAT;sfx('levelup',0.6);
  const who=staffVoice('scout')||staffVoice('dev')||'스카우트팀';const talk=`${SL.josa(dg.bestTxt,'이','가')} 돋보입니다.${dg.weak?` ${SL.josa(SL.ATTR_KO[dg.weak],'을','를')} 다듬으면 ${dg.goal.split('→').pop().trim()}까지 봅니다.`:SL.isPitcher(p)?' 구종 구성에는 크게 모난 곳이 없습니다.':' 타격에는 크게 모난 곳이 없습니다.'}${dg.fieldWeak&&dg.fieldWeak.length?` 다만 ${dg.fieldWeak.map(k=>SL.ATTR_KO[k]).join('·')}는 많이 부족합니다.`:''}`;
  modal(`<div class="cere" style="--tc:${ut.color}"><div class="ctag">${S.season}시즌 고교 드래프트</div><div class="cface">${face(p,96)}</div><div class="ctitle">${esc(ut.name)}, 전체 ${r.no}순위<br><b>${esc(p.name)}</b> 지명</div>
    <div class="muted">${esc(p.school||'')} · ${p.age}세 · ${SL.POS_KO[p.pos]||p.pos} · ${r.dev?'육성군':'1군'} 합류</div>
    <div class="cgrid"><div><div class="k">유형</div><div>${esc(dg.arch)}</div></div><div><div class="k">현재 · 예상 잠재</div><div>${Math.round(SL.calcOvr(p))} · ${SL.potText(p)} <span class="chip">${SL.confText(p.scout.conf)}</span></div></div></div>
    <div class="cquote"><b>${esc(who)}</b> "${esc(talk)}"</div>
    <div class="small b" style="margin:10px 0 6px">첫 육성 계획</div><div class="row wrap" style="gap:6px;justify-content:center">${Object.entries(F).map(([k,v])=>`<button class="sm ${(p.focus||'balance')===k?'primary':'ghost'}" onclick="UI.setFocus(${p.id},'${k}');UI.closeModal();UI.openPlayer(${p.id})">${v}</button>`).join('')}</div>
    <button class="ghost" style="margin-top:12px;width:100%" onclick="UI.closeModal()">나중에 정하기</button></div>`);}
function contractCeremony(pid,neg,f){const p=S.players[pid];if(!p||!p.contract)return;const ut=SL.userTeam();const renew=neg.mode==='renew';const yrs=renew?(f.years||p.contract.years):p.contract.years;const sal=p.contract.salary;const tot=sal*yrs+(f.bonus||0)+(neg.mode==='sign'?0:0);
  const line=[...neg.log].reverse().find(l=>l.who==='player'||l.who==='agent');const role=SL.rosterRole(ut,pid);const pay=SL.payroll(ut);const sp=SL.econ(ut).sponsor;
  modal(`<div class="cere" style="--tc:${ut.color}"><div class="ctag">${renew?'재계약 체결':'입단 계약 체결'}</div><div class="cface">${face(p,96)}</div><div class="ctitle"><b>${esc(p.name)}</b> ${renew?'재계약':'입단'}</div><div class="muted">${p.age}세 · ${SL.POS_KO[p.pos]||p.pos} · 종합 ${Math.round(SL.calcOvr(p))}</div>
    <div class="cgrid"><div><div class="k">계약</div><div>${yrs}년 · 연봉 ${Ms(sal)}</div></div><div><div class="k">총 보장액</div><div>${Ms(tot)}${f.bonus?` (계약금 ${Ms(f.bonus)} 포함)`:''}</div></div><div><div class="k">현재 배치</div><div>${esc(role.text)}${p.promise?` · <span class="chip o">주전 약속: 13경기 중 8경기 이상 주전 기용</span>`:''}</div></div><div><div class="k">구단 연봉 총액</div><div>${Ms(pay)} <span class="muted small">(스폰서 수입의 ${Math.round(pay/Math.max(1,sp)*100)}%)</span></div></div></div>
    ${line?`<div class="cquote"><b>${esc(line.who==='agent'?(neg.agent||'에이전트'):p.name)}</b> "${esc(line.text)}"</div>`:''}<button class="primary" style="margin-top:12px;width:100%" onclick="UI.closeModal()">확인</button></div>`);}
function farewellCard(pid){const p=S.players[pid];if(!p)return;const ut=SL.userTeam();const t=S.teams[p.teamId];const tr=(p.transfers||[]).slice(-1)[0]||{};const seasons=new Set((p.hist||[]).filter(h=>h.team===ut.id).map(h=>h.s)).size+(p.cur&&(p.cur.g||p.cur.pG)?1:0);const B=SL.growthBase(p);const j=p.joinSnap;
  modal(`<div class="cere" style="--tc:${t?t.color:ut.color}"><div class="ctag">이적 성사</div><div class="cface">${face(p,96)}</div><div class="ctitle"><b>${esc(p.name)}</b>, ${t?esc(SL.josa(t.name,'으로')):''}${t&&t.league!=='KR'?' ('+SL.BAL.LEAGUES[t.league].short+' 무대)':''} 떠납니다</div>
    <div class="cgrid"><div><div class="k">이적료</div><div>${Ms(tr.fee||0)}</div></div><div><div class="k">우리 팀에서</div><div>${seasons||1}시즌${j?` · 종합 ${Math.round(j.ovr)} → ${Math.round(SL.calcOvr(p))}`:''}</div></div><div><div class="k">셀온</div><div>${p.sellOn?`다시 팔리면 이적료의 ${Math.round(p.sellOn.pct*100)}%`:'없음'}</div></div><div><div class="k">이후</div><div>「옛 제자」에서 계속 소식을 볼 수 있습니다</div></div></div>
    <div class="cquote"><b>${esc(p.name)}</b> "${esc(p.age<=24?'키워 주셔서 감사합니다. 더 큰 무대에서 보여드리겠습니다.':'좋은 시간이었습니다. 어디서든 이 팀을 응원하겠습니다.')}"</div><button class="primary" style="margin-top:12px;width:100%" onclick="UI.closeModal()">확인</button></div>`);}
function alumniCoachCard(c){const op=S.players[c.alumni];const ut=SL.userTeam();
  modal(`<div class="cere" style="--tc:${ut.color}"><div class="ctag">돌아온 얼굴</div><div class="cface">${op?face(op,96):coachFace(c,96)}</div><div class="ctitle"><b>${esc(c.name)}</b>, ${esc(SL.BAL.STAFF[c.dept].name)}로 돌아왔습니다</div>
    <div class="cgrid"><div><div class="k">현역 시절</div><div>${op?`${op.pos} · 통산 ${(op.hist||[]).length}시즌`:'우리 구단 출신'}</div></div><div><div class="k">코치 평점</div><div>${G(c.rating)} ${c.rating}</div></div><div><div class="k">맡는 일</div><div>${esc(SL.BAL.STAFF[c.dept].what)}</div></div><div><div class="k">계약</div><div>${c.years}년 · 연봉 ${Ms(c.salary)}</div></div></div>
    <div class="cquote"><b>${esc(c.name)}</b> "이 유니폼을 다시 입게 될 줄 몰랐습니다. 후배들 잘 키워 보겠습니다."</div><button class="primary" style="margin-top:12px;width:100%" onclick="UI.closeModal()">확인</button></div>`);}
function grievanceModal(pid){const p=S.players[pid];const g=(S.grievances||[]).find(x=>x.pid===pid);if(!p||!g)return;const ut=SL.userTeam();
  modal(`<div class="cere" style="--tc:var(--orange)"><div class="ctag">면담 요청</div><div class="cface">${face(p,96)}</div><div class="ctitle"><b>${esc(p.name)}</b></div><div class="muted">${SL.POS_KO[p.pos]||p.pos} · 종합 ${Math.round(SL.calcOvr(p))} · 사기 ${Math.round(p.morale)} · 현재 ${esc(SL.rosterRole(ut,p.id).text)}</div>
    <div class="cquote"><b>${esc(p.name)}</b> "주전으로 뛸 수 있다고 하셔서 왔습니다. 그런데 ${g.n}경기 중 ${g.on}경기만 나갔어요. 어떻게 하실 건가요?"</div>
    <div class="glist">
      <button class="gopt" onclick="UI.grievanceAns(${pid},'apology')"><b>사과하고 기회를 약속한다</b><span>사기 +8 · 다음 7경기 중 4경기 이상 주전으로 써야 함 (못 지키면 사기 −15, 서운함)</span></button>
      <button class="gopt" onclick="UI.grievanceAns(${pid},'trade')"><b>트레이드 요청을 받아들인다</b><span>사기 +5 · 판매 목록에 오름 · 사정을 아는 구단들이 이적료를 12% 낮게 부름</span></button>
      <button class="gopt" onclick="UI.grievanceAns(${pid},'ignore')"><b>그냥 넘긴다</b><span>사기 −10 · 서운함: 재계약 때 연봉 15% 더 요구</span></button>
    </div><div class="muted small" style="margin-top:8px">3일 안에 답하지 않으면 「그냥 넘긴다」로 처리됩니다.</div></div>`);}
function recapModal(R){if(!R)return;const ut=SL.userTeam();R.seen=true;const G=R.grow;
  modal(`<div class="cere" style="--tc:${ut.color}"><div class="ctag">${R.s}시즌 결산</div><div class="cface">${emblem(ut,84)}</div><div class="ctitle">${esc(SL.compName(R.comp))} <b>${R.rank}위</b> · ${R.w}승 ${R.l}패</div>
    <div class="cbig ${R.promoted?'up':R.relegated?'dn':''}">${R.promoted?'승격!':R.relegated?'강등':'잔류'}${R.goal?` · 목표 「${esc(R.goal)}」 ${R.goalMet?'<span class="up">달성</span>':'<span class="dn">미달</span>'}`:''}</div>
    <div class="cgrid">${G?`<div><div class="k">가장 성장한 선수</div><div><a href="javascript:void 0" onclick="UI.closeModal();UI.openPlayer(${G.id})">${esc(G.name)}</a> ${G.from} → ${G.to} <span class="up">(+${G.d})</span></div></div>`:''}
      ${R.bestSign?`<div><div class="k">최고의 영입</div><div><a href="javascript:void 0" onclick="UI.closeModal();UI.openPlayer(${R.bestSign.id})">${esc(R.bestSign.name)}</a> · ${esc(R.bestSign.line)}</div></div>`:''}
      <div><div class="k">선수 판매</div><div>${R.sales?`${R.sales}명 · ${Ms(R.salesFee)}${R.salesProfit?` (차익 ${Ms(R.salesProfit)})`:''}`:'없음'}</div></div><div><div class="k">육성 성과</div><div>${R.devHits?`주전 성장 ${R.devHits}명`:'—'}</div></div></div>
    <div class="cquote"><b>팬</b> ${esc(R.fanText)}<br><b>구단</b> ${esc(R.owner.replace(/^구단주: /,''))}</div>
    <div class="small" style="margin-top:8px">감독 평판 ${R.repFrom} → <b class="${R.repTo>=R.repFrom?'up':'dn'}">${R.repTo}</b> (${esc(SL.repGrade(R.repTo))})</div>
    <button class="primary" style="margin-top:12px;width:100%" onclick="UI.closeModal()">스토브리그 시작</button></div>`);}
function modal(html){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal';bg.onclick=e=>{if(e.target===bg)closeModal();};bg.innerHTML=`<div class="modal" role="dialog"><button class="close" onclick="UI.closeModal()">닫기</button>${html}</div>`;document.body.appendChild(bg);}
function closeModal(){const m=$('#modal');if(m)m.remove();}
function sideOf(){const lg=SL.state().liveGame;return lg.home===SL.userTeam().id?1:0;}
function pinchMenu(){S=SL.state();const lg=S.liveGame;const ids=SL.bench(lg,sideOf());modal(`<h3>대타</h3>${ids.map(id=>{const p=S.players[id];return `<div class="prow" onclick="UI.pinch(${id})">${face(p,36)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="sub">${p.pos} · 컨택 ${Math.round(p.attrs.contact)} 파워 ${Math.round(p.attrs.power)} · 피로 ${Math.round(p.fatigue)}</div></div>${G(SL.calcOvr(p))}</div>`;}).join('')}`);}
function pitchMenu(){S=SL.state();const lg=S.liveGame;const ut=SL.userTeam();const ids=SL.availableBullpen(lg,sideOf());modal(`<h3>투수 교체</h3>${ids.map(id=>{const p=S.players[id];return `<div class="prow" onclick="UI.chPitch(${id})">${face(p,36)}<div class="grow"><div class="nm">${esc(p.name)}${ut.closer===id?' <span class="chip g">마무리</span>':''}</div><div class="sub">${SL.velocity(p)}km/h · 구위 ${Math.round(p.attrs.stuff)} 제구 ${Math.round(p.attrs.control)} · 피로 ${Math.round(p.fatigue)}</div></div>${G(SL.calcOvr(p))}</div>`;}).join('')}`);}
function renderTut(){const ut=SL.userTeam();const A=ut&&ut.arch?SL.BAL.ARCH[ut.arch]:null;const g=S.mgr&&S.mgr.cur&&S.mgr.cur.goal;
  const steps=[[`${ut.name} 감독으로 부임했습니다`,`${A?`<b>${A.name}</b> — ${A.pitch} ${A.tip}<br><br>`:''}${g?`이번 시즌 목표: <b>${esc(g.text)}</b>`:'3부의 작은 구단에서 유망주를 키워 더 높은 무대로 올라가세요.'}`],
    ['홈 = 오늘의 구단','맨 위 남색 카드는 <b>이번 주 이야기</b>(가장 중요한 변화 한 가지), 그 아래 <b>지금 결정할 일</b>(최대 3개)입니다. 그다음이 다음 경기 카드예요.'],
    ['경기 진행','「경기 보기」는 <b>다음 타석</b> 단위로 진행하고, <b>하이라이트</b>를 누르면 득점권·관심 선수·8회 이후 장면까지 건너뜁니다. 「자동 진행」·「7경기 자동」은 같은 엔진으로 빠르게 돌리고, 끝나면 <b>한 주간 구단 보고서</b>가 나옵니다. 새 제안이 오면 자동 진행이 멈춥니다.'],
    ['육성','선수를 누르고 「능력·성장」에서 <b>훈련 방향</b>을 정하세요. 7경기마다 성장을 점검하고, 경기에 나갈수록 많이 큽니다. 능력치 위 「비교 기준」으로 시즌 시작·입단 당시와 비교할 수 있어요.'],
    ['협상과 코치진','영입·재계약은 선수(또는 대리인)와 마주 앉아 연봉·기간·주전 약속을 제시합니다. <b>구단 → 코치진</b>에서 타격·투수·육성 코치와 스카우트를 영입하면 성장과 잠재력 판별이 좋아집니다.']];
  const s=steps[ui.tut];return `<div class="tut"><div class="box"><div class="hd"><h3>${esc(s[0])}</h3><small>${ui.tut+1}/${steps.length}</small></div><p style="font-size:15px;line-height:1.65">${s[1]}</p><div class="btns"><button onclick="UI.tutSkip()">건너뛰기</button><button class="primary" onclick="UI.tutNext(${steps.length})">${ui.tut===steps.length-1?'시작하기':'다음'}</button></div></div></div>`;}

// ---------- 액션 ----------
function go(view){if(ui.view)ui.stack.push(ui.view);if(ui.stack.length>8)ui.stack.shift();ui.view=view;closeModal();render();if(isWide()){const r=$('#rpane');if(r)r.scrollTop=0;}else scrollTop();}
function initForm(pid){const neg=S.market.negs.find(n=>n.pid===pid);if(!neg)return;const p=S.players[pid];
  if(neg.stage==='club')ui.form={pid,fee:Math.round(SL.calcValue(p)/100)*100,salary:0,bonus:0,years:2,promise:false};
  else ui.form={pid,fee:0,salary:Math.round(neg.demand*0.9/10)*10,bonus:0,years:neg.mode==='renew'&&p.age>=32?1:2,promise:false};}
function afterDay(){try{const R=SL.state().lastRecap;if(SL.state().phase==='offseason'&&R&&!R.seen)setTimeout(()=>{recapModal(R);autosave();},60);}catch(e){}try{const ut=SL.userTeam();const lab=`${SL.state().season}시즌 ${SL.state().day-1}일차`;if(ut.roster.some(id=>{const p=SL.state().players[id];return p&&p.log[0]&&p.log[0].label===lab&&p.log[0].d>=0.5;}))setTimeout(()=>sfx('levelup',0.5),350);}catch(e){}autosave();ui.tab='home';ui.view=null;ui.stack=[];render();scrollTop();}
function readForm(){const sal=$('#tf_sal'),fee=$('#tf_fee'),bon=$('#tf_bonus');if(sal)ui.form.salary=+sal.value||0;if(fee)ui.form.fee=+fee.value||0;if(bon)ui.form.bonus=+bon.value||0;}
const A={
  render,closeModal,pinchMenu,pitchMenu,
  pickTeam(i){const el=$('#seed');if(el&&el.value)ui.seed=+el.value;ui.newTeam=i;render();},
  setSeed(v){ui.seed=+v||ui.seed;},
  newGame(){const el=$('#seed');const seed=+(el&&el.value)||ui.seed||12345;SL.newGame(seed,ui.newTeam||0,{arch:true});ui.titleMode=null;ui.tab='home';ui.view=null;ui.stack=[];ui.tut=0;autosave();render();},
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
  go(t,sub){ui.sub[t]=sub;A.setTab(t);},
  set(k,v){ui[k]=v;render();},
  setScoutF(k,v){ui.scoutF[k]=v;if(k==='league')render();},
  setBuyF(k,v){ui.buyF[k]=v;if(k!=='n')ui.buyF.n=40;ui.keepScroll=true;render();},
  seasonRecap(){recapModal(SL.state().lastRecap);},
  winterPlan(pid,v){const p=SL.P(pid);if(p){p.winterPlan=v;autosave();toast(v==='rest'?`${p.name}: 이번 겨울은 휴식합니다.`:`${p.name}: 국내 동계훈련을 합니다.`);}ui.keepScroll=true;render();},
  test(k){const m=SL.testCmd(k);toast(m);autosave();ui.keepScroll=true;render();},
  testCopy(){const t=SL.testInfo();try{navigator.clipboard.writeText(t).then(()=>toast('복사했습니다. 요청서 「환경」 칸에 붙여 넣으세요.'),()=>toast('복사 실패 — 위 상자를 직접 선택해 복사하세요.'));}catch(e){toast('복사 실패 — 위 상자를 직접 선택해 복사하세요.');}},
  draftF(k,v){ui.draftF=ui.draftF||{g:'all',sort:'pot'};ui.draftF[k]=v;ui.keepScroll=true;render();},
  draftToggle(id){const c=ui.draftCmp||(ui.draftCmp=[]);const i=c.indexOf(id);if(i>=0)c.splice(i,1);else{if(c.length>=3){toast('비교는 최대 3명까지입니다.');return;}c.push(id);}ui.keepScroll=true;render();},
  draftCompare(){A.compareIds(ui.draftCmp||[],{draft:true});},
  compareIds(ids,opt){opt=opt||{};const ps=(ids||[]).map(id=>S.players[id]).filter(Boolean);if(ps.length<2){toast('2명 이상 골라 주세요.');return;}const ut=SL.userTeam();const need=SL.needOf(ut);const myTurn=opt.draft&&SL.draftTurn();
    const allP=ps.every(SL.isPitcher),allB=ps.every(p=>!SL.isPitcher(p));const keys=allP?SL.PIT_KEYS:allB?SL.BAT_KEYS:SL.BAT_KEYS.concat(SL.PIT_KEYS);const dg=ps.map(p=>SL.diagnose(p));
    const best=(f,hi)=>{const v=ps.map(f);const m=hi?Math.max(...v):Math.min(...v);return v.map(x=>x===m&&v.filter(y=>y===m).length<ps.length);};
    const row=(lab,cells,marks)=>`<tr><th style="text-align:left">${lab}</th>${cells.map((c,i)=>`<td class="${marks&&marks[i]?'up b':''}">${c}</td>`).join('')}</tr>`;
    let t=`<h3>${opt.draft?'드래프트 후보 비교':'선수 비교'}</h3><div class="tw"><table class="cmpt"><tr><th></th>${ps.map(p=>`<th>${face(p,40)}<div>${esc(p.name)}</div></th>`).join('')}</tr>`;
    t+=row('포지션',ps.map(p=>(SL.POS_KO[p.pos]||p.pos)+(opt.draft&&need.includes(p.pos)?' <span class="chip o">부족</span>':'')));t+=row(opt.draft?'나이 · 학교':'나이 · 현재 배치',ps.map(p=>`${p.age}세 · ${opt.draft?esc(p.school||''):esc(p.teamId===ut.id?SL.rosterRole(ut,p.id).text:teamName(p.teamId))}`));
    t+=row('현재 종합',ps.map(p=>Math.round(SL.calcOvr(p))),best(p=>Math.round(SL.calcOvr(p)),true));t+=row('예상 잠재',ps.map(p=>`${SL.potText(p)} <span class="muted small">(${SL.confText(p.scout.conf)})</span>`),best(p=>p.scout.est,true));
    if(!opt.draft){t+=row('피로',ps.map(p=>Math.round(p.fatigue||0)),best(p=>-(p.fatigue||0),true));t+=row('이번 시즌',ps.map(p=>seasonLine(p)));}
    t+=row('유형',dg.map(d=>esc(d.arch)));t+=row('강점',dg.map(d=>esc(d.bestTxt)));t+=row('약점',dg.map(d=>[d.weak?SL.ATTR_KO[d.weak]:null,...(d.fieldWeak||[]).map(k=>SL.ATTR_KO[k])].filter(Boolean).join(', ')||'—'));
    for(const k of keys)t+=row(SL.ATTR_KO[k],ps.map(p=>SL.isPitcher(p)===SL.PIT_KEYS.includes(k)?Math.round(p.attrs[k]):'—'),best(p=>SL.isPitcher(p)===SL.PIT_KEYS.includes(k)?p.attrs[k]:-1,true));
    t+=row('특성',ps.map(p=>p.traits.map(traitChip).join(' ')||'—'));t+=`</table></div>`;
    if(myTurn)t+=`<div class="row wrap" style="gap:6px;margin-top:10px">${ps.map(p=>`<button class="sm primary" onclick="UI.closeModal();UI.draftPick(${p.id},'dev')">${esc(p.name)} 지명</button>`).join('')}</div>`;
    if(!opt.draft)t+=`<div class="btns" style="margin-top:10px"><button class="primary" onclick="UI.closeModal();UI.go('roster','lineup')">라인업에서 바꾸기</button></div>`;
    t+=`<div class="muted small" style="margin-top:8px">초록색은 비교한 선수 중 가장 높은 값입니다.${opt.draft?' 잠재력은 스카우트 추정이라 신뢰도가 낮으면 크게 틀릴 수 있습니다.':''}</div>`;modal(t);},
  grievance(pid){grievanceModal(pid);},
  grievanceAns(pid,c){const e=SL.grievanceAnswer(pid,c);closeModal();toast(e||({apology:'사과하고 기회를 약속했습니다.',trade:'판매 목록에 올렸습니다.',ignore:'면담을 넘겼습니다.'}[c]),3000);autosave();render();},
  setPref(k,v){PREF[k]=v;prefSave();ui.keepScroll=true;render();if(k==='vol')sfx('click',0.6);},
  clearResult(){ui.gameResult=null;ui.weekReport=null;render();},
  openPlayer(pid){S=SL.state();if(!S.players[pid]){toast('선수 정보를 찾을 수 없습니다.');return;}go({type:'player',id:pid,tab:'ability'});},
  ovLg(k){ui.ovLg=k;ui.keepScroll=true;render();},
  attrBase(k){ui.attrBase=k;ui.keepScroll=true;render();},
  pTab(t){if(ui.view&&ui.view.type==='player'){ui.view.tab=t;ui.keepScroll=true;render();}},
  focusTrain(){A.pTab('ability');setTimeout(()=>{const s=$('#focusSel');if(s){try{s.scrollIntoView({block:'center'});}catch(e){}s.focus();}},30);},
  back(){ui.view=ui.stack.pop()||null;closeModal();render();scrollTop();},
  pin(pid){SL.togglePin(pid);autosave();toast(SL.state().pins.includes(pid)?'관심 선수로 고정했습니다.':'고정을 해제했습니다.');render();},
  openTable(pid){S=SL.state();const p=S.players[pid];const r=SL.openTable(pid);if(!r.ok){toast(r.msg,4500);return;}initForm(pid);autosave();go({type:'table',pid,fromTeam:p.teamId!=null&&p.teamId!==S.userTeamId?p.teamId:null,mode:r.neg.mode,agent:r.neg.agent});},
  setF(k,v){readForm();ui.form[k]=v;if(k==='years'||k==='promise')render();},
  bump(k,d){readForm();ui.form[k]=Math.max(0,Math.round((+ui.form[k]||0)+d));ui.keepScroll=true;render();},
  tableSubmit(){const v=ui.view;if(!v||v.type!=='table')return;readForm();const neg=SL.state().market.negs.find(n=>n.pid===v.pid);const stageBefore=neg&&neg.stage;const r=SL.tableOffer(v.pid,ui.form);
    if(!r.ok){toast(r.msg,4000);render();return;}
    if(r.done)sfx('cash');if(r.done||r.ended)v.result={done:!!r.done,msg:r.msg,log:r.neg.log,mood:r.neg.mood};else if(r.neg.stage!==stageBefore)initForm(v.pid);
    autosave();render();if(r.done)contractCeremony(v.pid,r.neg,ui.form);},
  leaveTable(){const v=ui.view;if(!v)return;const neg=SL.state().market.negs.find(n=>n.pid===v.pid);if(neg){const log=[...neg.log,{who:'sys',text:'(단장이 자리에서 일어났다)'}];SL.tableLeave(v.pid);v.result={done:false,msg:'협상을 중단했습니다. 이번 시즌 남은 기회가 있으면 다시 앉을 수 있습니다.',log,mood:neg.mood};}autosave();render();},
  openOffer(id){go({type:'offer',id});},
  dispatchView(pid){go({type:'dispatch',pid});},
  jobView(id){go({type:'job',id});},
  declineJob(id){SL.declineJob(id);toast('잔류를 선택했습니다. 의리 평판 +1');autosave();if(ui.view&&ui.view.type==='job'){ui.view.msg='잔류를 선택했습니다.';}render();},
  confirmMove(id){const o=(SL.state().jobOffers||[]).find(x=>x.id===id);if(!o)return;const t=SL.state().teams[o.team];modal(`<h3>${esc(t.name)} 감독 취임</h3><div>${esc(SL.josa(SL.userTeam().name,'을','를'))} 떠납니다. 되돌릴 수 없지만, 나중에 친정 복귀 요청이 올 수 있습니다.</div><div style="height:12px"></div><div class="btns"><button class="primary" onclick="UI.moveMgr(${id})">취임 확정</button><button onclick="UI.closeModal()">취소</button></div>`);},
  moveMgr(id){const e=SL.moveManager(id);closeModal();if(e){toast(e,4000);return;}sfx('win',0.6);ui.view=null;ui.stack=[];ui.tab='home';ui.gameResult=null;toast(`${SL.userTeam().name} 감독으로 취임했습니다!`,3500);autosave();render();scrollTop();},
  dispatch(pid,tid){const e=SL.dispatchPlayer(pid,tid);toast(e||`${SL.P(pid).name} 파견 확정`,3500);autosave();if(!e&&ui.view&&ui.view.type==='dispatch')ui.view=ui.stack.pop()||null;render();},
  cancelDispatch(pid){const e=SL.cancelDispatch(pid);toast(e||'파견을 취소했습니다.');autosave();render();},
  declineDispatch(pid){SL.declineDispatch(pid);toast('국내 동계훈련으로 준비합니다.');autosave();render();},
  setCt(v){ui.ct=v;ui.ctId=ui.view&&ui.view.id;},
  bumpCt(d){const i=$('#ct_amt');ui.ct=Math.max(0,(+i.value||0)+d);ui.ctId=ui.view&&ui.view.id;render();},
  counterOffer(id){const v=+$('#ct_amt').value;const o=SL.state().market.offers.find(x=>x.id===id);if(!o)return;const lg=ui.offerLog[id]=ui.offerLog[id]||[];lg.push({who:'me',text:`${M(v)}이면 보내드리겠습니다.`});
    const t=SL.state().teams[o.team];const r=SL.respondOffer(id,'counter',v);lg.push({who:'club',text:r.msg.split(t.name+': ').join('').split(SL.josa(t.name,'이','가')+' ').join('')});ui.ct=null;
    if(!SL.state().market.offers.find(x=>x.id===id))ui.view.msg=r.msg;autosave();render();},
  respond(id,action){const lg=ui.offerLog[id]=ui.offerLog[id]||[];if(action==='accept')lg.push({who:'me',text:'제안을 받아들이겠습니다.'});else if(action==='reject')lg.push({who:'me',text:'이번 제안은 정중히 거절합니다.'});const o0=S.market.offers.find(x=>x.id===id);const pid0=o0&&o0.pid;const from0=pid0!=null?S.players[pid0].teamId:null;const r=SL.respondOffer(id,action);if(action==='accept'&&r.ok)sfx('cash');const fare=action==='accept'&&r.ok&&pid0!=null&&S.players[pid0]&&S.players[pid0].teamId!==from0;if(fare)setTimeout(()=>farewellCard(pid0),80);
    autosave();if(ui.view&&ui.view.type==='offer'){ui.view.msg=r.msg;ui.view.ok=r.ok&&action==='accept';render();}else{if(!fare)toast(r.msg,4000);render();}},
  startGame(){const lg=SL.startDay();if(!lg){SL.finishDay();autosave();render();return;}autosave();render();},
  step(kind){const lg=SL.state().liveGame;if(!lg)return;const ut=SL.userTeam();const my=lg.home===ut.id?1:0;const sc0=lg.score[my],op0=lg.score[1-my];let ev;if(kind==='pitch')ev=SL.stepPitch(lg);else if(kind==='pa')ev=SL.stepPA(lg);else if(kind==='half')ev=SL.stepHalf(lg);else if(kind==='hl'){ev=SL.stepPA(lg);let guard=0;while(!lg.done&&!isKeyMoment(lg,my)&&guard++<120)ev=SL.stepPA(lg);if(!lg.done)toast(keyWhy(lg,my),1800);}else ev=SL.stepGame(lg);
    if(ev&&(kind==='pitch'||kind==='pa'||kind==='hl')){if(ev.type==='hr')sfx(lg.half===my||(lg.outs===0&&lg.score[my]>sc0)?'hr':'lose',0.7);else if(['1b','2b','3b'].includes(ev.type))sfx('hit');else if(ev.type==='so'||ev.type==='strike'||ev.type==='whiff')sfx('mitt',0.5);}
    if(lg.done){sfx(lg.score[my]>lg.score[1-my]?'win':'lose',0.7);}autosave();render();},
  pinch(pid){const lg=SL.state().liveGame;if(SL.pinchHit(lg,sideOf(),pid))toast('대타 투입');closeModal();autosave();render();},
  chPitch(pid){const lg=SL.state().liveGame;if(SL.changePitcher(lg,sideOf(),pid))toast('투수 교체');closeModal();autosave();render();},
  endGame(){sfx('click',0.3);S=SL.state();const lg=S.liveGame;if(!lg||!lg.done)return;const side=sideOf();const my=lg.score[side],op=lg.score[1-side];const opp=S.teams[side===1?lg.away:lg.home];const r0=SL.reportStart();SL.endUserGame();ui.weekReport=null;ui.gameResult={win:my>op,text:`vs ${opp.name} ${my}:${op}`,lines:gameLines(lg,r0)};afterDay();},
  autoDays(n){S=SL.state();const r0=SL.reportStart();let lastLg=null;let i=0,w=0,l=0,stop=null;while(S.phase==='season'&&i<n){const before=S.market.offers.map(o=>o.id);const r=SL.playDayAuto();if(r){const lg=r.lg;lastLg=lg;const side=lg.home===SL.userTeam().id?1:0;if(lg.score[side]>lg.score[1-side])w++;else l++;}i++;
      if(S.settings.stopOnOffer&&S.phase==='season'){const fresh=S.market.offers.filter(o=>!before.includes(o.id));const dying=S.market.offers.filter(o=>o.expires-S.clock<=1);if(fresh.length){stop=`새 제안 ${fresh.length}건 도착으로 정지`;break;}if(dying.length){stop=`내일 만료되는 제안 ${dying.length}건으로 정지`;break;}}}
    const rp=i>=2?SL.reportEnd(r0):null;if(rp){rp.stop=stop;ui.weekReport=rp;ui.gameResult=null;}else{ui.weekReport=null;ui.gameResult={win:w>=l,text:i===1&&lastLg?`vs ${S.teams[lastLg.home===SL.userTeam().id?lastLg.away:lastLg.home].name} ${lastLg.score[lastLg.home===SL.userTeam().id?1:0]}:${lastLg.score[lastLg.home===SL.userTeam().id?0:1]}`:`${i}경기 ${w}승 ${l}패${stop?' · '+stop:''}`,lines:i===1&&lastLg?gameLines(lastLg,r0):(stop?[esc(stop)]:[])};}if(stop)sfx('notify');else if(i===1)sfx(w?'win':'lose',0.5);afterDay();},
  setStop(v){SL.state().settings.stopOnOffer=!!v;autosave();},
  setSound(v){SFX.on=!!v;try{localStorage.setItem('stoveleague_sound',v?'1':'0');}catch(e){}if(v)sfx('notify');},
  advanceWeek(){SL.advanceWeek();autosave();render();scrollTop();},
  startSeason(){const r=SL.startNewSeason();if(!r.ok)toast(r.msg,4000);else{sfx('levelup');ui.gameResult=null;ui.weekReport=null;toast(`${SL.state().season}시즌 개막!`);}autosave();render();scrollTop();},
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
  draftPick(pid,dest){const r=SL.draftPick(pid,dest);autosave();render();if(r.ok&&r.pid)draftCeremony(r);else toast(r.msg,3500);},
  draftAutoPick(){SL.draftAuto();toast('자동 지명 완료');autosave();render();},
  draftPass(){const r=SL.draftPick(null);toast(r.msg);autosave();render();},
  scout(){const f={...ui.scoutF};f.maxAge=f.maxAge?+f.maxAge:0;f.maxValue=f.maxValue?+f.maxValue:0;const r=SL.runScout(ui.scoutKind,ui.scoutLvl,f);toast(r.msg,3500);autosave();render();},
  coachYears(y){ui.coachYears=y;ui.keepScroll=true;render();},
  coachMarket(d){ui.coachDept=d;ui.keepScroll=true;render();setTimeout(()=>{const e=$('#coachMarket');if(e)try{e.scrollIntoView({block:'start'});}catch(x){}},30);},
  hireCoach(id){const c0=(S.staffPool||[]).find(c=>c.id===id);const e=SL.hireCoach(id,ui.coachYears||2);if(e)toast(e,3500);else{sfx('cash');if(c0&&c0.alumni)setTimeout(()=>alumniCoachCard(c0),80);else toast('코치를 영입했습니다.');}autosave();ui.keepScroll=true;render();},
  armFire(id){ui.fireArm=id;ui.keepScroll=true;render();},
  fireCoach(id){const e=SL.fireCoach(id);ui.fireArm=null;toast(e||'해임했습니다.');autosave();ui.keepScroll=true;render();},
  renewCoach(id){const e=SL.renewCoach(id,ui.coachYears||2);if(e)toast(e,3500);else{sfx('cash');toast('재계약했습니다.');}autosave();ui.keepScroll=true;render();},
  upgrade(k){const e=SL.upgradeFacility(k);toast(e||'업그레이드 완료');autosave();render();},
  loan(){const e=SL.takeLoan(+$('#loanAmt').value);toast(e||'대출 실행');autosave();render();},
  tutNext(n){ui.tut++;if(ui.tut>=n){SL.state().tutorialDone=true;autosave();}render();},
  tutSkip(){SL.state().tutorialDone=true;autosave();render();},
};
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('button');if(b&&!b.disabled)sfx('click',0.25);},true);
// 주소 옵션: ?test=1 테스트 도구 · ?new=1&team=0~7&seed=N 새 게임 바로 시작 (테스터용)
const QS=(()=>{try{return new URLSearchParams(location.search);}catch(e){return new URLSearchParams('');}})();ui.testMode=QS.get('test')==='1';
function qsBoot(){if(QS.get('new')!=='1'||ui._booted)return;ui._booted=true;const seed=+QS.get('seed')||Math.floor(Math.random()*90000)+1000;const team=Math.max(0,Math.min(7,+QS.get('team')||0));SL.newGame(seed,team,{arch:true});SL.state().tutorialDone=QS.get('tut')!=='1';ui.tab='home';autosave();}
let lastWide=null;window.addEventListener('load',()=>{lastWide=isWide();qsBoot();render();Store.get().then(j=>{if(j&&!Store.has){Store.has=true;if(!SL.state())render();}});});window.addEventListener('resize',()=>{const w=isWide();if(w!==lastWide){lastWide=w;render();}});
return A;
})();

const fs=require('fs');const r=n=>fs.readFileSync('src/'+n,'utf8');
const core=['core_a.js','core_b.js','core_c.js'].map(r).join('\n');
// v64: ui2.js(GPT 시안 화면)를 UI IIFE 안에 끼워 넣고, 재사용할 원본 함수는 *0 이름으로 바꾼다.
function uiJs(){let u=r('ui.js');const ren=[['renderHome','renderSeasonHome0'],['renderPlayer','renderPlayer0'],['renderTable','renderTable0'],['renderMarket','renderMarket0'],['renderDev','renderDev0'],['renderClub','renderClub0'],['renderClubBar','renderClubBar0'],['nextBtn','nextBtn0'],['renderRoster','renderRoster0'],['renderTitle','renderTitle0'],['render','renderBase'],['contractCeremony','contractCeremony0'],['rightPaneFor','rightPaneFor0'],['renderGame','renderGame0'],['decisionItems','decisionItems0'],['renderLeague','renderLeague0']];
  for(const [a,b] of ren){const re=new RegExp('^function '+a+'\\(','m');if(!re.test(u))throw new Error('build: '+a+' 없음');u=u.replace(re,'function '+b+'(');}
  const tail='return A;\n})();';const i=u.lastIndexOf(tail);if(i<0)throw new Error('build: UI IIFE 끝 못 찾음');
  return u.slice(0,i)+'\n// ===== v64 ui2.js =====\n'+r('ui2.js')+'\n'+u.slice(i);}

const path=require('path');const A='assets';const b64=(f,mime)=>'data:'+mime+';base64,'+fs.readFileSync(f).toString('base64');
const portraits=fs.existsSync(A+'/portraits')?fs.readdirSync(A+'/portraits').filter(f=>f.endsWith('.png')).sort().map(f=>b64(A+'/portraits/'+f,'image/png')):[];
const emIdx=fs.existsSync(A+'/emblems/index.json')?JSON.parse(fs.readFileSync(A+'/emblems/index.json','utf8')):{};const emblems={};for(const k in emIdx)emblems[k]=b64(A+'/emblems/'+emIdx[k]+'.png','image/png');
const sfx={};if(fs.existsSync(A+'/sfx'))for(const f of fs.readdirSync(A+'/sfx'))if(/\.(mp3|ogg|wav)$/.test(f))sfx[path.basename(f).replace(/\.[^.]+$/,'')]=b64(A+'/sfx/'+f,f.endsWith('.mp3')?'audio/mpeg':f.endsWith('.ogg')?'audio/ogg':'audio/wav');
const field=fs.existsSync(A+'/field.png')?b64(A+'/field.png','image/png'):null;
const title=fs.existsSync(A+'/title.png')?b64(A+'/title.png','image/png'):null;
const officeWinter=fs.existsSync(A+'/office_winter.jpg')?b64(A+'/office_winter.jpg','image/jpeg'):null;   // v119: 겨울 감독실 그림 (시안)
const pitchBanner=fs.existsSync(A+'/pitch_banner.jpg')?b64(A+'/pitch_banner.jpg','image/jpeg'):null;   // v120: 투수진 제목 그림 (시안)
const title2=fs.existsSync(A+'/title2.jpg')?b64(A+'/title2.jpg','image/jpeg'):null;   // v118: 시작 화면 그림 (광우 시안)
const office=fs.existsSync(A+'/office.png')?b64(A+'/office.png','image/png'):null;
const stadiumHome=fs.existsSync(A+'/stadium_home.png')?b64(A+'/stadium_home.png','image/png'):null;const stadiumGame=fs.existsSync(A+'/stadium_game.png')?b64(A+'/stadium_game.png','image/png'):null;
const badges={};if(fs.existsSync(A+'/badges'))for(const f of fs.readdirSync(A+'/badges'))if(f.endsWith('.png'))badges[f.replace(/\.png$/,'')]=b64(A+'/badges/'+f,'image/png');
const bgm={};if(fs.existsSync(A+'/bgm'))for(const f of fs.readdirSync(A+'/bgm'))if(/\.mp3$/.test(f))bgm[path.basename(f,'.mp3')]=b64(A+'/bgm/'+f,'audio/mpeg');   // v71: 배경 음악
const leagues={};if(fs.existsSync(A+'/leagues'))for(const f of fs.readdirSync(A+'/leagues'))if(f.endsWith('.png'))leagues[f.replace(/\.png$/,'')]=b64(A+'/leagues/'+f,'image/png');   // v82: 리그 마크 (픽셀랩, 국기 모티프)
const assetsJs='const ASSETS='+JSON.stringify({portraits,emblems,field,sfx,title,title2,officeWinter,pitchBanner,stadiumHome,stadiumGame,badges,office,bgm,leagues})+';';
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"><title>스토브리그 — 작은 구단의 기적</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
${r('style.css')}
${r('unslop_gen.css')}
${r('unslop.css')}
</style></head><body><script id="mview">
/* v111 (R093): PC에서도 휴대폰 화면으로 — 설정(sl_view=m)이면 같은 파일을 폭 430px 틀 안에 띄우고, 바깥 쪽 게임은 시작하지 않음 */
(function(){var w=null;try{w=localStorage.getItem('sl_view');}catch(e){}var child=/[?&]mframe=1/.test(location.search);window.__SL_CHILD=child;
 if(w!=='m'||child||window.innerWidth<700)return;window.__SL_FRAMED=true;
 var st=document.createElement('style');st.textContent='html.mframe,html.mframe body{height:100%;margin:0;overflow:hidden}.mfwrap{display:flex;flex-direction:column;align-items:center;height:100vh;background:#07090d}.mfr{width:430px;max-width:100%;flex:1;border:0;border-left:1px solid #2a2f3a;border-right:1px solid #2a2f3a;background:#0b0d12}.mfbar{padding:6px 0 8px}#mfpc{font:600 13px/1 system-ui,sans-serif;color:#e6e8ee;background:#161a22;border:1px solid #3a4150;border-radius:8px;padding:9px 16px;cursor:pointer}#mfpc:hover{background:#202634}';document.head.appendChild(st);document.documentElement.classList.add('mframe');
 document.addEventListener('DOMContentLoaded',function(){var u=location.href.replace(/#.*$/,'');u+=(u.indexOf('?')<0?'?':'&')+'mframe=1';var d=document.createElement('div');d.className='mfwrap';
  d.innerHTML='<iframe class="mfr" title="스토브리그 (휴대폰 화면)" src="'+u+'"></iframe><div class="mfbar"><button id="mfpc">PC 화면으로</button></div>';document.body.innerHTML='';document.body.appendChild(d);
  document.getElementById('mfpc').onclick=function(){try{d.querySelector('iframe').contentWindow.postMessage('sl-topc','*');}catch(e){}setTimeout(function(){try{localStorage.setItem('sl_view','pc');localStorage.setItem('sl_resume',String(Date.now()));}catch(e){}location.reload();},2500);};
  var ok=false;window.addEventListener('message',function(e){if(e.data==='sl-ready')ok=true;if(e.data==='sl-pc'){try{localStorage.setItem('sl_view','pc');}catch(x){}var fr=d.querySelector('iframe');if(fr)fr.remove();setTimeout(function(){location.reload();},150);}});setTimeout(function(){if(!ok){try{localStorage.setItem('sl_view','pc');}catch(e){}location.reload();}},12000);});})();
</script><div id="app"></div>
<script id="assets">
${assetsJs}
</script>
<script id="core">
${core}
if(typeof window!=='undefined')window.SL=SL;
</script>
<script id="ui">
${uiJs()}
window.UI=UI;
</script>
</body></html>`;
fs.writeFileSync('stoveleague.html',html);fs.writeFileSync('index.html',html); // GitHub Pages 주소(rhddkek.github.io/stoveleague)용
const art=`<title>스토브리그</title>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${r('style.css')}
${r('unslop_gen.css')}
${r('unslop.css')}\n</style>\n<div id="app"></div>\n<script>\n${assetsJs}\n</script>\n<script>\n${core}\nwindow.SL=SL;\n</script>\n<script>\n${uiJs()}\nwindow.UI=UI;\n</script>`;fs.writeFileSync('stoveleague_artifact.html',art);console.log('built',(html.length/1024).toFixed(0),'KB');

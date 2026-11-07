const fs=require('fs');const r=n=>fs.readFileSync('src/'+n,'utf8');
const core=['core_a.js','core_b.js','core_c.js'].map(r).join('\n');
// v64: ui2.js(GPT 시안 화면)를 UI IIFE 안에 끼워 넣고, 재사용할 원본 함수는 *0 이름으로 바꾼다.
function uiJs(){let u=r('ui.js');const ren=[['renderHome','renderSeasonHome0'],['renderPlayer','renderPlayer0'],['renderTable','renderTable0'],['renderMarket','renderMarket0'],['renderDev','renderDev0'],['renderClub','renderClub0'],['renderClubBar','renderClubBar0'],['nextBtn','nextBtn0'],['renderRoster','renderRoster0'],['renderTitle','renderTitle0'],['render','renderBase']];
  for(const [a,b] of ren){const re=new RegExp('^function '+a+'\\(','m');if(!re.test(u))throw new Error('build: '+a+' 없음');u=u.replace(re,'function '+b+'(');}
  const tail='return A;\n})();';const i=u.lastIndexOf(tail);if(i<0)throw new Error('build: UI IIFE 끝 못 찾음');
  return u.slice(0,i)+'\n// ===== v64 ui2.js =====\n'+r('ui2.js')+'\n'+u.slice(i);}

const path=require('path');const A='assets';const b64=(f,mime)=>'data:'+mime+';base64,'+fs.readFileSync(f).toString('base64');
const portraits=fs.existsSync(A+'/portraits')?fs.readdirSync(A+'/portraits').filter(f=>f.endsWith('.png')).sort().map(f=>b64(A+'/portraits/'+f,'image/png')):[];
const emIdx=fs.existsSync(A+'/emblems/index.json')?JSON.parse(fs.readFileSync(A+'/emblems/index.json','utf8')):{};const emblems={};for(const k in emIdx)emblems[k]=b64(A+'/emblems/'+emIdx[k]+'.png','image/png');
const sfx={};if(fs.existsSync(A+'/sfx'))for(const f of fs.readdirSync(A+'/sfx'))if(/\.(mp3|ogg|wav)$/.test(f))sfx[path.basename(f).replace(/\.[^.]+$/,'')]=b64(A+'/sfx/'+f,f.endsWith('.mp3')?'audio/mpeg':f.endsWith('.ogg')?'audio/ogg':'audio/wav');
const field=fs.existsSync(A+'/field.png')?b64(A+'/field.png','image/png'):null;
const title=fs.existsSync(A+'/title.png')?b64(A+'/title.png','image/png'):null;
const office=fs.existsSync(A+'/office.png')?b64(A+'/office.png','image/png'):null;
const stadiumHome=fs.existsSync(A+'/stadium_home.png')?b64(A+'/stadium_home.png','image/png'):null;const stadiumGame=fs.existsSync(A+'/stadium_game.png')?b64(A+'/stadium_game.png','image/png'):null;
const badges={};if(fs.existsSync(A+'/badges'))for(const f of fs.readdirSync(A+'/badges'))if(f.endsWith('.png'))badges[f.replace(/\.png$/,'')]=b64(A+'/badges/'+f,'image/png');
const assetsJs='const ASSETS='+JSON.stringify({portraits,emblems,field,sfx,title,stadiumHome,stadiumGame,badges,office})+';';
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>스토브리그 — 작은 구단의 기적</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
${r('style.css')}
</style></head><body><div id="app"></div>
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
const art=`<title>스토브리그</title>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${r('style.css')}\n</style>\n<div id="app"></div>\n<script>\n${assetsJs}\n</script>\n<script>\n${core}\nwindow.SL=SL;\n</script>\n<script>\n${uiJs()}\nwindow.UI=UI;\n</script>`;fs.writeFileSync('stoveleague_artifact.html',art);console.log('built',(html.length/1024).toFixed(0),'KB');

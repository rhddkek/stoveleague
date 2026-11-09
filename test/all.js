// 전체 검증: 하나라도 실패하면 종료 코드 1
const {spawnSync}=require('child_process');
const runs=[['verify.js','2026','10'],['verify.js','777','10'],['phase1.js'],['phase2.js'],['leagues.js'],['staff.js'],['story.js'],['play_leagues.js'],['hof_records.js'],['v50_features.js'],['v51_plans.js'],['v52_game.js'],['v58_loop.js'],['v62_winter.js'],['v68_flow.js'],['v69_r053.js'],['v81_winter.js'],['v82_r066.js'],['v83_r067.js'],['v84_r068.js'],['v84_ui.js'],['v85_ui.js'],['v86_r070.js'],['v87_r071.js'],['v88_r072.js'],['v89_r073.js'],['v90_r074.js'],['v91_r075.js'],['v92_r076.js'],['v93_r077.js'],['v94_r078.js'],['ui_smoke.js'],['ui_layout.js']];
let bad=0;for(const r of runs){const t0=Date.now();const p=spawnSync('node',[__dirname+'/'+r[0],...r.slice(1)],{encoding:'utf8',maxBuffer:64<<20});
  const last=(p.stdout||'').trim().split('\n').pop();const ok=p.status===0;if(!ok)bad++;console.log(`${ok?'✔':'✘'} ${r.join(' ')} — ${last} (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  if(!ok)console.log((p.stdout||'').split('\n').filter(l=>/FAIL|Error/.test(l)).slice(0,10).join('\n'),p.stderr||'');}
console.log(bad?`실패 ${bad}건`:'전체 통과');process.exit(bad?1:0);

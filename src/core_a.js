// ===================== 스토브리그 — 코어 (A: 데이터/선수/구단/가치/편성) =====================
const SL=(function(){
'use strict';
const VERSION=6;          // 저장 형식 버전 (바뀌면 migrate 필요)
const GAME_VER='v150';     // 게임 버전 표시 (테스트 요청서에 적는 번호)
// ---------- 밸런스 상수 (여기서만 수정) ----------
const BAL={
  // v101 (R084) 돈 규모 현실화: 내부 금액 1 = 5만원(WON). 화면은 money()·Ms()가 ×WON 해서 보여 줌 → 모든 금액이 같은 비율로 커져 경제 균형은 그대로, 예전 저장도 그대로 이어짐.
  //   아래 주석의 「만원」은 v100까지의 단위(= 내부 단위). 실제 2025 KBO: 평균 연봉 1억 6,071만 · 최저 3,000만 · 최고 30억 · 상위 40명 합계 44~132억(상한 137억)
  WON:5,
  // 샐러리캡(경쟁균형세, KBO 실제 규정): 상위 40명 연봉(+계약금 ÷ 계약 연수) 합계. 1시즌 = 2026년 상한 143억 9,723만, 해마다 +5%. 넘으면 초과분의 30%·50%·100%(연속 횟수) 납부, 3회 연속이면 다음 1라운드 지명 9단계 하락
  //   하한(2027년 = 2시즌부터 60억 6,538만, +5%) 밑이면 모자란 금액의 30%·50%·100% 납부
  CAP:{base:287945,grow:0.05,top:40,floor:121308,floorFrom:2,tax:[0.3,0.5,1],pick:9},
  SEASON_GAMES:36, SEASON_OPTIONS:[36,72,144], KR_TEAMS:10, OFFSEASON_WEEKS:6,   // SEASON_GAMES는 저장마다 S.games로 바뀜
  LEVEL_OVR:{KR1:66,RES:55,JP:71,US:75,US2:68,US3:63,JP2:59,TW:57,MX:63,AU:56,CB:63,ROOKIE:44,FA:50}, LEVEL_SD:6, ROSTER_SEED:20260409, LEVEL_SD_LG:{}, STARS:{KR:{slug:1,pw:10,ace:3,ap:8},JP:{slug:2,pw:16,ace:2,ap:3},TW:{slug:1,pw:8,ace:1,ap:3},US:{slug:3,pw:8,ace:2,ap:3}},
  // 국내는 10개 구단 단일 리그(1군) + 2군. 승강제 없음. 경제 기준값은 1군 하나, 구단별 차이는 위상(시장 크기)으로만
  START_CASH:{1:900000},                                   // 만원 (AI 기준값)
  TICKET:{1:9000},                                         // 홈경기당 기본 입장수입(만원)
  SPONSOR:{1:300000}, OVERHEAD:{1:200000},                 // 시즌 스폰서·운영비(만원) — 위상(시장)에 따라 증감
  DIVIDEND:{1:[150000,120000,100000,85000,70000,60000,50000,40000,35000,30000]},
  OVERSEAS_CASH:{JP:1500000,US:4000000,TW:300000,MX:400000,AU:120000,CB:180000},
  FACILITY:{train:{cost:20000,upkeep:1500},youth:{cost:15000,upkeep:1200},scout:{cost:10000,upkeep:1000}},
  PARK:{cost:30000},   // v140: 홈구장 펜스 공사비 15억
  SCOUT_COST:[800,2500,6000], SCOUT_N:[3,5,8], SCOUT_CONF:[0.12,0.25,0.4],
  VALUE_BASE:2000, VALUE_STEP:3.5,                        // ovr45=2000만, +10마다 x3.5
  SALARY_RATE:0.22, SALARY_MIN:600,  // 최저 연봉 3,000만(내부 600) — 2시즌(2027년)부터 3,300만 (minSal)
  LEAGUE_VALUE:{1:1.15,JP:1.6,US:2.4,TW:1.1,MX:1.1,AU:0.85,CB:0.95},
  // 해외 무대: 리그 구조·팀 수는 실제 리그를 따르고, 구단명은 실제 연고 도시 + 가상 애칭 (실존 구단명·로고 미사용)
  // v95 (R079): 리그 환경 — 실제 최근 시즌 수준에 맞춘 타격 환경 (홈 구장 리그 기준). hit=안타 확률 배수, hr=홈런 확률 배수, zone=스트라이크 존 비율 더하기(−면 볼넷↑), con=배트에 맞힐 확률 더하기(−면 삼진↑), hx=파워 85 넘는 거포의 홈런 가산(1점당, v96 — 리그 홈런왕 수준)
  ENV:{KR:{hit:0.905,hr:1.12,zone:-0.03,con:0,hx:0.04},JP:{hit:0.85,hr:0.55,zone:0.01,con:-0.025,hx:0.05},TW:{hit:1.0,hr:1.2,zone:-0.03,con:0},US:{hit:0.79,hr:1.15,zone:-0.02,con:-0.025}},
  LEAGUES:{JP:{name:'일본 프로야구',short:'일본',style:'12개 구단 · 양대 리그',games:143,roster:26,subs:['센트럴리그','퍼시픽리그']},
    US:{name:'미국 프로야구',short:'미국',style:'30개 구단 · 동서 양대 리그 6개 지구',games:162,roster:26,subs:['EL 동부','EL 중부','EL 남부','WL 중부','WL 남부','WL 서부'],conf:['이스턴리그','웨스턴리그']},
    TW:{name:'대만 프로야구',short:'대만',style:'6개 구단 단일 리그',games:120,roster:24},
    MX:{name:'멕시칸리그',short:'멕시코',style:'20개 구단 · 북부/남부 지구',games:93,roster:24,subs:['북부 지구','남부 지구']},
    AU:{name:'호주 야구리그',short:'호주',style:'4개 구단 겨울리그',games:36,roster:22,winter:true},
    CB:{name:'도미니카 윈터리그',short:'도미니카',style:'6개 구단 겨울리그',games:50,roster:22,winter:true}},
  // 리그 수준 (v38, 스카우트·구단 관계자 평가 기준): 메이저리그 > 일본 > 미국 2군(트리플A급) > 한국 > 멕시코 ≈ 미국 3군(더블A급) ≈ 도미니카 겨울 > 일본 2군 > 대만 > 호주 > 한국 퓨처스
  BUY_MIN:{US:73,JP:69,TW:60,MX:62},
  // 감독으로 맡을 수 있는 해외 무대의 경제 (만원)
  ECON:{JP:{ticket:8000,sponsor:250000,overhead:120000,dividend:[120000,100000,80000,60000,50000,40000]},TW:{ticket:2500,sponsor:60000,overhead:25000,dividend:[40000,30000,22000,16000]}},
  JOB_LEAGUES:['TW','JP'], REP_NEED:{1:58,TW:47,JP:63},
  DISPATCH:{max:4,fee:{AU:3000,CB:5000},maxAge:25,share:{'주전':0.95,'주전 경쟁':0.6,'백업':0.3,'벤치':0.1}},
  GROWTH_TICK:10, DECLINE_PER_TICK:0.55, XP_TARGET_BAT:26, XP_TARGET_PIT:20,
  MIN_ROSTER:20, MAX_ROSTER:50, MIN_PITCHERS:9, ENTRY:26, AI_ROSTER:36,   // 1군 엔트리 26명 고정 · 선수단(1군+2군)은 사실상 상한 없음(50)
  SELL_LOCK:10, SELL_ON:0.1, OFFER_EXPIRE:3, LOAN_CAP:30000, LOAN_RATE:0.1,
  FATIGUE_RECOVER:14,
  FGN:{max:3,asiaCap:5600,genMin:4000,genMax:28000,renewMax:50000,genMul:0.75,lvl:2,poolGen:12,poolAsia:6,rounds:4},   // 외국인 3명 + 아시아쿼터 1명(연봉 20만 달러 ≈ 2.8억 이하) · 외국인 계약 1년 · 신규 외국인 100만 달러(≈14억, 연봉+계약금) 이하 · 재계약 상한 25억(게임 규칙)
  FARM:{US:[{t:2,ko:'미국 2군',lvl:68},{t:3,ko:'미국 3군',lvl:63}],JP:[{t:2,ko:'일본 2군',lvl:59}]},
  HALF:{on:true,rest:20},   // v136 올스타 브레이크: 전반기/후반기 · 모든 구단 피로 −20(하루 회복 14 남짓)
  CAMP:{week:5,exN:6,mvp:1.25,loc:{home:{n:'국내 캠프',cost:0,grow:1,cond:0,d:'남해안 · 비용 없음'},oki:{n:'오키나와 캠프',cost:4000,grow:1.04,cond:2,d:'따뜻한 날씨 — 훈련 효과 +4% · 개막 컨디션 +2'},ari:{n:'애리조나 캠프',cost:10000,grow:1.08,cond:1,d:'최신 시설 — 훈련 효과 +8% · 개막 컨디션 +1'}},focus:{bal:{n:'균형',b:1,p:1,cond:0,d:'타자 · 투수 고르게'},bat:{n:'타격 중점',b:1.08,p:0.96,cond:0,d:'타자 성장 +8% · 투수 −4%'},pit:{n:'투수 중점',b:0.96,p:1.08,cond:0,d:'투수 성장 +8% · 타자 −4%'},rest:{n:'체력 관리',b:0.94,p:0.94,cond:3,d:'성장 −6% · 개막 컨디션 +3'}}},   // v142 (R113) 스프링캠프 · 시범경기(6경기, 기록은 따로)
  SKC:{n:3,learn:{C:1000,B:2000,A:4000,S:8000},up3:2,rem:2000,per:2000,perUp:10,tickUp:0.10,tickNew:0.08,tickRem:0.05},   // v141 스킬 캠프: 겨울마다 3명 · 배우기 등급별 0.5억~4억 · 레벨 2 = 배우기 값, 레벨 3 = 두 배 · 약점 지우기 · 성격 코스 1억
  AUTO:{coachKeep:60,dispAge:25},   // v135 맡기기: 평가 60 이상 코치만 재계약 · 25세 이하 비주전만 겨울리그 파견
  FA_COMP:{on:true,A:{prot:20,p:2,c:3},B:{prot:25,p:1,c:2},C:{prot:0,p:0,c:1.5}}, SD:{on:true,week:3,prot:25,rounds:3,fee:[4,3,2],maxLost:4,minAge:22},   // v132 (R106): FA 보상(보호 인원 · 선수+연봉 배수 · 돈만 배수) · 2차 드래프트(양도금 억)
  FARM_N:{US:10,JP:6}, FA_MAJOR_N:12,   // 주요 FA(경쟁 입찰) 최대 인원   // v62: 미국·일본 구단 하부 선수층 (메이저·1군과 오가는 선수)   // 해외 하부 리그 (실제 리그명 대신 2군·3군)
  LVL_VER:2, LVL_OLD:{JP:64,US:71,TW:57,MX:58,AU:50,CB:55},   // 저장 변환용: v37까지의 리그 수준
  FUT_PRIZE:3000,               // 퓨처스 챔피언결정전 우승 상금 (화면 1.5억, 준우승 1/3)
  RES_EXP:0.62,                 // 2군(퓨처스) 경기 출장 성장 계수 (육성군 DEV_EXP 0.75, 1군 주전은 최대 1)
  LOAN:{deadline:14,maxAge:28,payShare:{'주전':1,'주전 경쟁':1,'백업':0.5}},  // 임대: 시즌 14일차까지, 임대 구단 연봉 부담 비율
  // 포스트시즌(5팀 계단식): 와일드카드(4위 1승 안고 시작, 최대 2경기) → 준플레이오프(5전 3선승) → 플레이오프(5전 3선승) → 한국시리즈(7전 4선승)
  POST:[{k:'wc',name:'와일드카드 결정전',short:'WC',hiSeed:4,need:[1,2],host:'hh'},{k:'semi',name:'준플레이오프',short:'준PO',hiSeed:3,need:[3,3],host:'hhllh'},
    {k:'po',name:'플레이오프',short:'PO',hiSeed:2,need:[3,3],host:'hhllh'},{k:'ks',name:'한국시리즈',short:'KS',hiSeed:1,need:[4,4],host:'hhlllhh'}],
  POST_PRIZE:{champ:60000,runner:25000,po:12000,semi:8000,wc:5000},   // 포스트시즌 배당금(만원) — 탈락 단계별
  AI_CASH_CAP:{1:600000},          // AI 구단 시즌 말 보유 한도(넘는 돈의 70%는 모기업 회수) — 이적시장 예산이 의미 있게
  // 시작 구단 유형 (10개 구단마다 실제 사정에 맞춰 하나씩) — 난이도가 아니라 '다른 고민'
  ARCH:{youth:{name:'유망주 중심',pitch:'어린 선수가 많아 「내가 키운다」는 맛이 큽니다.',worry:'당장은 이기기 어렵습니다.',tip:'출장 기회를 주며 1~2시즌 뒤를 노리세요.'},
    popular:{name:'지역 인기 구단',pitch:'관중이 많아 입장 수입과 스폰서가 안정적입니다.',worry:'팬과 구단주의 기대가 높아 목표가 빡빡합니다.',tip:'수입을 영입에 써서 기대에 맞추세요.'},
    poor:{name:'재정난 구단',pitch:'싼 선수를 찾아 되살리는 재미가 있습니다.',worry:'돈이 거의 없고 비싼 주축 2명의 연봉이 무겁습니다.',tip:'주축을 팔지, 버틸지 첫 결정이 중요합니다.'},
    vet:{name:'노장 중심',pitch:'경험 많은 선수들로 첫 시즌부터 가을야구를 노릴 수 있습니다.',worry:'2~3년 안에 세대교체가 급합니다.',tip:'좋을 때 팔고 젊은 선수를 모으세요.'}},
  ARCH_OF:['popular','vet','vet','popular','vet','vet','youth','popular','youth','poor'],
  // 국내 10개 구단 = 실제 연고 도시 + 가상 애칭 + 기본 위상만. 실제 구단의 역사(우승 횟수·순위)·구장·색은 쓰지 않는다
  // 시작 전력은 기본 위상에서만 나온다: 위상 15점 = 주전 평균 약 0.9 → 144경기 모의 10회: 위상 90 구단 승률 .58, 위상 30 구단 .40
  KR_STR_K:0.06, DRAFT_STAR:{ready:0.45,gen:0.12}, KR_LVL_UP:0.8,   // v105: 한국 1군 주전 평균 = LEVEL_OVR.KR1 + 0.8 (다른 리그와 같은 기준)
  // 구단 위상(명문도): 순위·가을야구·한국시리즈 우승으로 천천히 쌓이고 천천히 식는다. TEAM_NAMES.KR 순서대로 시작 값
  // 스폰서·광고 (유저 구단만 선택, AI는 기존 자동 수입 = 기준값). 회사명은 모두 가상
  SPON:{
    co:{big:[['청람그룹','금융'],['은하전자','전자'],['솔빛생명','보험'],['미리내건설','건설']],
        mid:[['라온통신','통신'],['다온식품','식품'],['가람제약','제약'],['누리모터스','자동차'],['별빛제과','식품'],['한결증권','금융'],['초록에너지','에너지'],['파랑항공','항공']],
        local:[['골목치킨','외식'],['동네마트','유통'],['밝은안경','안경'],['달빛분식','외식'],['바른세탁','생활'],['새봄약국','제약'],['든든렌터카','자동차'],['푸른학원','교육'],['한우리정육','식품'],['햇살병원','의료']]},
    kinds:{stable:{name:'장기 안정형',years:3,base:0.8},perf:{name:'성적 연동형',years:2,base:0.5},short:{name:'단기 고액형',years:1,base:1.15,miss:0.35},big:{name:'대기업 메인',years:3,base:1.2}},
    perfBonus:{r1:0.8,r3:0.55,r5:0.3,ks:0.25,champ:0.3},   // 정규 1위·2~3위·4~5위(가을야구), 한국시리즈 진출·우승
    boards:{1:4,os:3},boardShare:0.055,   // 광고판 한 자리 ≈ 기준 스폰서의 5.5%
    endorse:{minScore:8,comm:0.3,feeShare:0.03,morale:8,decline:-4,demand:1.05}},
  PRES0:[80,86,54,90,72,82,56,66,50,30],     // 지역 기본 위상 (명문 4 · 강호 2 · 중견 3 · 신흥 1). 우승 기록은 모두 0에서 시작
  PRES_TIER:[[80,'명문'],[60,'강호'],[40,'중견'],[22,'신흥'],[0,'약소']],
  PRES_NORM:{1:66},                          // 리그 평균 위상 — 수입(시장 크기)은 이 값 대비로 증감 (AI 평균 밸런스 유지)
  PRES_RATE:0.2,                             // 시즌 점수 쪽으로 다가가는 속도
  PRES_BASE:{1:62},PRES_RANK:[16,12,8,5,2,0,-3,-6,-9,-12],PRES_POST:{ps:3,ks:4,champ:10},
  PRES_FLOOR_TITLE:5,PRES_FLOOR_MAX:70,      // 한국시리즈 우승 1회마다 바닥 +5 (전통은 쉽게 사라지지 않음)
  // 코치진: 부서별 정원, 등급별 기준 연봉(만원/시즌), 부서 특기
  STAFF:{bat:{name:'타격코치',max:3,what:'타자 컨택·파워·선구안 성장'},pit:{name:'투수코치',max:3,what:'투수 구위·제구·변화구·체력 성장'},def:{name:'수비·주루코치',max:2,what:'야수 주력·수비·송구 성장'},
    dev:{name:'육성코치',max:2,what:'23세 이하·육성군 성장, 육성군 정원'},scout:{name:'스카우트',max:5,what:'잠재력 판별 정확도, 유망주·드래프트 발굴'},med:{name:'트레이너·의무',max:5,what:'피로 회복, 노화 지연'}},
  STAFF_PAY:{S:15000,A:8000,B:4000,C:2000,D:1000}, STAFF_REF:{bat:0.35,pit:0.35,def:0,dev:0,scout:0.3,med:0.3}, STAFF_CREDIT:{1:22000,2:13000,3:9000}, // 기본 코치진 인건비만큼 운영비에서 분리
  STAFF_TRAITS:{bat:{'장타 조련':'power','컨택 장인':'contact','선구안 교정':'eye'},pit:{'구위 조련':'stuff','제구 장인':'control','변화구 전수':'movement'},def:{'수비 장인':'defense','주루 전문':'speed','강견 조련':'arm'},
    dev:{'유망주 조련':'u20','육성군 전문':'devsq'},scout:{'고교 네트워크':'draft','해외 네트워크':'abroad','매의 눈':'watch'},med:{'체력 관리':'fatigue','노장 관리':'aging'}},
  DEV_BASE:4, DEV_EXP:0.75, DRAFT_POOL:80, DRAFT_ROUNDS:5,   // 5라운드 · 후보 80명 (3라운드부터는 자리 있는 구단만 지명)
};
let S=null;
const POS_BAT=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const POS_W={C:[.25,.2,.12,.05,.25,.13],'1B':[.3,.3,.15,.04,.15,.06],'2B':[.27,.15,.13,.13,.22,.1],'3B':[.27,.22,.12,.07,.2,.12],SS:[.25,.15,.12,.13,.25,.1],LF:[.28,.24,.13,.1,.15,.1],CF:[.27,.17,.12,.15,.2,.09],RF:[.28,.24,.13,.1,.15,.1],DH:[.35,.35,.2,.05,.03,.02]};
const POS_SHAPE={C:{defense:8,arm:6,speed:-10},SS:{defense:8,speed:6,power:-8},'2B':{defense:5,speed:5,power:-6},CF:{speed:10,defense:6,power:-5},'3B':{power:4,arm:5},LF:{power:5,defense:-4},RF:{power:5,arm:6,defense:-3},'1B':{power:8,contact:3,speed:-8,defense:-5},DH:{power:10,contact:4,speed:-8,defense:-15,arm:-8},SP:{stamina:15,stuff:-2},RP:{stamina:-18,stuff:5}};
const BAT_KEYS=['contact','power','eye','speed','defense','arm'];
const PIT_KEYS=['stuff','control','movement','stamina'];
const ATTR_KO={contact:'컨택',power:'파워',eye:'선구안',speed:'주력',defense:'수비',arm:'송구',stuff:'구위',control:'제구',movement:'변화구',stamina:'체력'};
const FOCUS_BAT={balance:'균형',contact:'컨택',power:'장타',eye:'선구안',speed:'주루',defense:'수비'};
const FOCUS_PIT={balance:'균형',stuff:'구위',control:'제구',movement:'변화구',stamina:'체력'};
const TRAITS={'성실':'성장 속도 증가','게으름':'성장 속도 감소','강철체력':'피로 회복 빠름·노화 완만','클러치':'득점권에서 집중력 상승','장타본능':'홈런 확률 증가','빠른발':'진루 판단 우수','강심장':'해외 적응·협상에 유리','유리멘탈':'큰 무대에서 흔들림','리더':'팀 사기 유지'};
// ======================= v141 (R112): 스킬 — 한 선수 3칸 · 레벨 1~3 · 등급 S·A·B·C(강점) · D(약점) =======================
// [이름, 등급, 쪽(B 타자 · P 투수 · G 공통), 조건, 효과(레벨 1 기준 — 레벨 2는 ×1.5, 레벨 3은 ×2), 설명]
// 효과 키: 타자 con 컨택 · pow 파워 · eye 선구 · sp 주력 / 투수 ctl 제구 · stf 구위 · mov 변화구 / hr 홈런 확률(비율). G는 경기 밖(성장 · 회복 · 부상 · 노화 · 사기) — 조건 칸이 종류
const OLD_TRAITS=['성실','게으름','강철체력','클러치','장타본능','빠른발','강심장','유리멘탈','리더'];
const SK_LV=[0,1,1.5,2];const SK_GRADE={S:'전설',A:'특급',B:'우수',C:'일반',D:'약점'};const SK_MAX=3;
const SK_ROWS=[
 // ── 타자: 찬스
 ['클러치','B','B','risp',{con:4,pow:4},'득점권에서 컨택 · 파워 상승'],
 ['만루의 사나이','A','B','loaded',{con:6,pow:6},'만루에서 컨택 · 파워 크게 상승'],
 ['해결사','S','B','risp2',{con:7,pow:5},'2사 득점권에서 더 강해짐'],
 ['끝내기 본능','S','B','walkoff',{con:7,pow:7},'9회 이후 동점 · 1점 뒤진 홈 타석에서 폭발'],
 ['희생플라이 달인','B','B','r3',{con:5},'무사 · 1사 3루 주자를 불러들이는 타격'],
 ['진루타','C','B','r1',{con:3},'1루 주자가 있을 때 맞히는 타격'],
 ['타점 머신','A','B','on',{pow:3},'주자가 있으면 장타력 상승'],
 // ── 타자: 볼카운트
 ['초구 사냥꾼','B','B','firstP',{con:5,pow:4},'초구를 노려 침'],
 ['풀카운트 승부사','B','B','full',{con:5,eye:6},'풀카운트에서 집중'],
 ['커트 신공','B','B','s2',{con:4},'2스트라이크 뒤 끈질기게 맞힘'],
 ['선구안의 달인','B','B','b2',{eye:5},'볼이 2개 넘으면 유인구에 속지 않음'],
 ['노림수','B','B','hitCt',{pow:5},'유리한 카운트에서 한 방'],
 ['끈질긴 승부','C','B','deep',{eye:3,con:2},'공을 많이 볼수록 좋아짐'],
 // ── 타자: 타순
 ['리드오프','B','B','slot1',{eye:4,con:3},'1번 타순에서 출루 능력 상승'],
 ['테이블세터','C','B','slot12e',{con:3,eye:2},'1 · 2번에서 주자 없을 때 출루'],
 ['클린업 히터','A','B','slot345on',{pow:5,con:2},'3 · 4 · 5번에서 주자가 있으면 장타'],
 ['4번 타자','B','B','slot4',{pow:4},'4번에 서면 파워 상승'],
 ['하위타선의 핵','C','B','slot789',{con:3,pow:3},'7 · 8 · 9번에서 한몫'],
 ['이닝 선두타자','C','B','leadoffInn',{eye:4,con:2},'이닝 첫 타자로 나가면 출루'],
 // ── 타자: 상대
 ['좌완 킬러','A','B','pL',{con:5,pow:5},'왼손 투수에게 강함'],
 ['우완 킬러','B','B','pR',{con:2,pow:2},'오른손 투수에게 강함'],
 ['잠수함 킬러','B','B','pSub',{con:6,pow:4},'사이드암 · 언더핸드 투수에게 강함'],
 ['강속구 킬러','B','B','pFast',{con:5,pow:3},'구위 좋은 투수의 빠른 공을 받아침'],
 ['변화구 공략','B','B','pMov',{con:5},'변화구 좋은 투수에게 강함'],
 ['에이스 킬러','A','B','pAce',{con:5,pow:4},'상대 에이스급 선발에게 강함'],
 ['불펜 킬러','B','B','pRel',{con:3,pow:3},'구원 투수에게 강함'],
 ['반대손 강점','B','B','opp',{con:2,pow:3},'반대 손 투수를 더 잘 침'],
 ['같은 손도 OK','B','B','same',{con:3,pow:3},'같은 손 투수에게도 밀리지 않음'],
 // ── 타자: 흐름
 ['뒷심','B','B','late',{con:3,pow:3},'7회 이후 강해짐'],
 ['초반 러시','C','B','early',{con:3,pow:2},'1~3회에 강함'],
 ['추격 본능','B','B','trail',{con:3,pow:3},'지고 있을 때 집중'],
 ['굳히기','C','B','lead',{con:3},'이기고 있을 때 추가점'],
 ['접전의 사나이','A','B','clutchLate',{con:6,pow:4},'7회 이후 1점 차 이내 승부에서 강함'],
 ['연장전의 사나이','B','B','extra',{con:6,pow:6},'연장전에서 강함'],
 ['몰아치기','B','B','hot',{con:5},'그날 안타를 치면 계속 침'],
 ['첫 타석 집중','C','B','firstPA',{con:4,eye:3},'경기 첫 타석에 강함'],
 ['홈 보이','C','B','home',{con:2,pow:2},'홈 경기에서 강함'],
 ['원정 체질','C','B','away',{con:2,pow:2},'원정 경기에서 강함'],
 ['가을 사나이','S','B','post',{con:6,pow:6},'가을야구에서 폭발'],
 ['봄 사나이','C','B','spring',{con:3,pow:2},'시즌 초반(4 · 5월)에 강함'],
 ['여름 사나이','C','B','summer',{con:3,pow:2},'한여름(7 · 8월)에 강함'],
 ['순위 싸움 체질','B','B','fall',{con:3,pow:3},'시즌 막판(9월 이후)에 강함'],
 // ── 타자: 한 방 · 발
 ['장타본능','B','B','always',{hr:0.25},'홈런 확률 증가'],
 ['밀어서 넘기기','B','B','s2',{hr:0.2},'2스트라이크에서도 장타'],
 ['구장 넘기기','B','B','away',{hr:0.15},'원정에서도 담장을 넘김'],
 ['빠른발','C','B','always',{sp:6},'내야 안타 · 진루 판단 우수'],
 ['대도','A','B','always',{sp:4},'도루 성공률 상승'],
 ['번트 장인','C','B','bunt',{},'번트 성공률 상승'],
 // ── 타자: 약점
 ['유리멘탈','D','B','risp',{con:-3,eye:-3},'득점권 · 큰 무대에서 흔들림'],
 ['득점권 울렁증','D','B','risp',{con:-4},'득점권에서 컨택 하락'],
 ['공갈포','D','B','always',{pow:3,con:-4},'크게 휘두르지만 잘 못 맞힘'],
 ['좌완 약점','D','B','pL',{con:-5,pow:-3},'왼손 투수에게 약함'],
 ['병살 제조기','D','B','r1',{con:-4},'1루 주자가 있으면 땅볼'],
 ['슬로 스타터 (타)','D','B','spring',{con:-4},'시즌 초반에 방망이가 무거움'],
 ['2스트라이크 약점','D','B','s2',{con:-4},'몰리면 쉽게 물러남'],
 // ── 투수: 위기
 ['강심장','B','P','risp',{stf:4,ctl:4},'득점권 위기에서 구위 · 제구 상승 (협상 · 해외 적응에도 유리)'],
 ['위기관리','A','P','loaded',{ctl:6,stf:6},'만루에서 더 침착해짐'],
 ['병살 유도','B','P','r1',{mov:5},'1루 주자가 있으면 땅볼 유도'],
 ['2사 후 집중','B','P','outs2',{stf:3,ctl:3},'2사 뒤 마지막 아웃을 확실히'],
 ['주자 묶기','C','P','on',{ctl:2,mov:2},'주자가 있어도 흔들리지 않음'],
 ['빠른 템포','C','P','empty',{ctl:3},'주자 없을 때 공격적으로'],
 // ── 투수: 볼카운트
 ['탈삼진 본능','A','P','s2',{stf:5,mov:3},'2스트라이크에서 결정구'],
 ['초구 스트라이크','B','P','firstP',{ctl:6},'초구를 스트라이크로'],
 ['풀카운트 배짱','B','P','full',{ctl:6,stf:3},'풀카운트에서도 정면 승부'],
 ['유인구 마스터','B','P','pitCt',{mov:5},'유리한 카운트에서 유인구'],
 ['직구 승부','B','P','hitCt',{stf:5},'불리한 카운트에서 힘으로'],
 ['볼넷 억제','B','P','b2',{ctl:5},'볼이 쌓여도 제구가 잡힘'],
 // ── 투수: 상대
 ['좌타 킬러','B','P','bL',{stf:4,mov:3},'왼손 타자에게 강함'],
 ['우타 킬러','B','P','bR',{stf:3,mov:2},'오른손 타자에게 강함'],
 ['원포인트','B','P','relSame',{stf:5,mov:5},'구원 등판해 같은 손 타자를 잡음'],
 ['몸쪽 승부','B','P','same',{stf:3},'같은 손 타자 몸쪽을 찌름'],
 ['바깥쪽 승부','B','P','opp',{ctl:3},'반대 손 타자 바깥쪽을 공략'],
 ['강타자 킬러','A','P','bSlug',{stf:5,mov:4},'파워 좋은 타자에게 강함'],
 ['클린업 봉쇄','B','P','slot345',{stf:3,ctl:3},'3 · 4 · 5번 타자를 상대로 집중'],
 ['하위타선 정리','C','P','slot789',{ctl:4},'7 · 8 · 9번을 쉽게 처리'],
 ['교타자 봉쇄','B','P','bCon',{mov:5},'컨택 좋은 타자를 헛스윙으로'],
 ['발 묶기','C','P','bFast',{ctl:3,mov:2},'빠른 타자의 출루를 막음'],
 // ── 투수: 보직 · 흐름
 ['수호신','S','P','save',{stf:7,ctl:6},'9회 이후 3점 이내 리드를 지킴'],
 ['필승 셋업','A','P','hold',{stf:5,ctl:5},'7 · 8회 3점 이내 리드에서 강함'],
 ['불펜 에이스','B','P','relClose',{stf:4,ctl:3},'구원 등판한 접전에서 강함'],
 ['롱맨','C','P','relLong',{stf:3,ctl:3},'구원으로 길게 던져도 버팀'],
 ['추격조 체질','C','P','relTrail',{stf:3,ctl:3},'지고 있는 경기를 붙잡아 둠'],
 ['이닝이터','A','P','pc80',{stf:5,ctl:5},'투구 수 80개를 넘겨도 구위 유지'],
 ['완투형','B','P','pc100',{stf:6,ctl:6},'100구 이후에도 버팀'],
 ['첫 바퀴 강자','B','P','pc30s',{stf:4},'선발로 타순 한 바퀴는 압도'],
 ['에이스의 품격','A','P','spLate',{stf:4,ctl:4},'선발로 6회 이후에 더 강해짐'],
 ['초반 강자','C','P','early',{stf:3,ctl:2},'1~3회에 강함'],
 ['접전의 승부사','A','P','clutchLate',{stf:5,ctl:5},'7회 이후 1점 차 이내에서 강함'],
 ['리드 지키기','C','P','lead',{ctl:3},'이기고 있으면 안정'],
 ['연장 수호','B','P','extra',{stf:6,ctl:5},'연장전에서 강함'],
 ['홈 강자','C','P','home',{stf:2,ctl:2},'홈 마운드에서 강함'],
 ['원정 강자','C','P','away',{stf:2,ctl:2},'원정 마운드에서 강함'],
 ['가을 에이스','S','P','post',{stf:6,ctl:6},'가을야구에서 더 강해짐'],
 ['여름 철완','C','P','summer',{stf:3,ctl:2},'한여름에도 지치지 않음'],
 ['피홈런 억제','A','P','always',{hr:-0.15},'홈런을 잘 맞지 않음'],
 ['낮게 낮게','B','P','on',{hr:-0.18},'주자가 있으면 장타를 피함'],
 // ── 투수: 약점
 ['새가슴','D','P','risp',{ctl:-4,stf:-2},'득점권에서 제구가 흔들림'],
 ['1회 징크스','D','P','inn1',{ctl:-5},'1회에 유독 흔들림'],
 ['볼넷 남발','D','P','b2',{ctl:-5},'볼이 쌓이면 무너짐'],
 ['2사 후 방심','D','P','outs2',{ctl:-3,stf:-2},'2사 뒤 집중력이 떨어짐'],
 ['타순 세 바퀴 약점','D','P','pc75s',{stf:-4},'선발로 투구 수 75개를 넘기면 맞기 시작'],
 ['장타 허용','D','P','always',{hr:0.15},'실투가 담장을 넘어감'],
 ['주자 울렁증','D','P','on',{ctl:-3},'주자가 나가면 흔들림'],
 // ── 공통: 경기 밖
 ['성실','C','G','grow',{v:0.3},'성장 속도 증가'],
 ['훈련벌레','A','G','grow',{v:0.2},'훈련 효과가 더 큼'],
 ['게으름','D','G','grow',{v:-0.3},'성장 속도 감소'],
 ['강철체력','B','G','body',{v:1},'피로 회복 빠름 · 부상 적음 · 노화 완만'],
 ['금강불괴','B','G','inj',{v:-0.3},'부상 위험 감소'],
 ['유리몸','D','G','inj',{v:0.35},'부상 위험 증가'],
 ['회복력','C','G','rec',{v:3},'피로 회복이 빠름'],
 ['대기만성','B','G','age',{v:-0.2},'노화가 늦게 옴'],
 ['조로','D','G','age',{v:0.25},'노화가 일찍 옴'],
 ['리더','B','G','lead',{v:1},'팀 사기 유지'],
];
const SKILLS={};for(const r of SK_ROWS)SKILLS[r[0]]={n:r[0],g:r[1],side:r[2],c:r[3],fx:r[4],d:r[5]};
// 투구폼(v141): 사이드암 · 언더핸드는 같은 손 타자에게 강하고 반대 손에게 약함. 언더핸드는 장타를 덜 맞음
const ARMS={O:'오버핸드',T:'쓰리쿼터',S:'사이드암',U:'언더핸드'};const ARM_FX={O:{same:0,opp:0,hr:1},T:{same:0,opp:0,hr:1},S:{same:-2,opp:1.3,hr:1},U:{same:-3,opp:2,hr:0.93}};
function idRng(seed){let a=(seed*2654435761)>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function armOf(p){if(p.arm)return p.arm;const r=idRng(p.id*31+7)();return r<0.46?'O':r<0.8?'T':r<0.94?'S':'U';}
// 스킬 채우기 — 선수 번호로 정해지는 난수(게임 난수 흐름을 건드리지 않음). 옛 특성은 그대로 스킬 1레벨로, 능력이 좋을수록 쪽(타자/투수) 스킬이 더 붙음
function skillInit(p,ovr){if(p.sk)return p.sk;const R=idRng(p.id*97+3);const sk=(p.traits||[]).filter(t=>SKILLS[t]).slice(0,SK_MAX).map(t=>[t,1]);const pit=p.pos==='SP'||p.pos==='RP';
  const pool=SK_ROWS.filter(r=>r[2]===(pit?'P':'B')||(r[2]==='G'&&!OLD_TRAITS.includes(r[0])));const W={S:ovr>=72?3:0.4,A:ovr>=62?10:3,B:26,C:42,D:14};const tot=pool.reduce((a,r)=>a+W[r[1]],0);
  const n=ovr>=75?(R()<0.6?2:1):ovr>=65?(R()<0.6?1:0):(R()<0.25?1:0);
  for(let i=0;i<n&&sk.length<SK_MAX;i++){let x=R()*tot,pk=null;for(const r of pool){x-=W[r[1]];if(x<=0){pk=r;break;}}if(!pk||sk.some(s=>s[0]===pk[0]))continue;if((pk[0]==='유리몸'&&sk.some(s=>s[0]==='금강불괴'||s[0]==='강철체력'))||(pk[0]==='금강불괴'&&sk.some(s=>s[0]==='유리몸'))||(pk[0]==='조로'&&sk.some(s=>s[0]==='대기만성'))||(pk[0]==='대기만성'&&sk.some(s=>s[0]==='조로')))continue;sk.push([pk[0],pk[1]!=='D'&&ovr>=75&&R()<0.25?2:1]);}
  p.sk=sk;p.traits=sk.map(s=>s[0]);return sk;}
for(const k in SKILLS)if(!TRAITS[k])TRAITS[k]=SKILLS[k].d;
function skG(p,c){const sk=p.sk;if(!sk)return 0;let v=0;for(const x of sk){const d=SKILLS[x[0]];if(d&&d.side==='G'&&d.c===c)v+=d.fx.v*(SK_LV[x[1]]||1);}return v;}
function skOf(p){return p.sk||skillInit(p,calcOvr(p));}
function skillRows(p){return skOf(p).map(x=>{const d=SKILLS[x[0]]||{n:x[0],g:'C',side:'G',d:TRAITS[x[0]]||''};return {n:x[0],lv:x[1],g:d.g,gk:SK_GRADE[d.g],side:d.side,d:d.d,max:x[1]>=3};});}
function skLv(p,k){const sk=p.sk;if(!sk)return (p.traits||[]).includes(k)?1:0;for(const s of sk)if(s[0]===k)return s[1];return 0;}
const ROSTER_TEMPLATE=['SP','SP','SP','SP','SP','RP','RP','RP','RP','RP','RP','RP','C','C','1B','2B','3B','SS','LF','CF','RF','DH','2B','SS','CF','1B'];
const FARM_TEMPLATE=['SP','SP','RP','RP','C','SS','2B','CF','1B','RF'];
const NEED_TEMPLATE={SP:5,RP:7,C:2,'1B':2,'2B':2,'3B':1,SS:2,LF:1,CF:2,RF:1,DH:1};

// ---------- 난수 (시드 기반, 상태 저장) ----------
function rnd(){S.rng=(S.rng+0x6D2B79F5)|0;let t=S.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
function ri(a,b){return a+Math.floor(rnd()*(b-a+1));}
function pick(a){return a[Math.floor(rnd()*a.length)];}
function gauss(){let u=0,v=0;while(u===0)u=rnd();while(v===0)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function clamp(x,a,b){return x<a?a:x>b?b:x;}
function r1(x){return Math.round(x*10)/10;}
function nid(){return S.nextId++;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// ---------- 이름 ----------
const KS=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍','전','고','문','양','손','배','백','허','유','남','심','노','하','곽','성','차','주','우','구','민','진','나','지','엄','채','원','천','방','공','현','함','변','염','여','추','도','소','석','선','설','마','길','연','위','표','명','기','반','왕','금','옥','육','인','맹','제','모','탁','국'];
const KG=['민준','서준','도윤','예준','시우','하준','주원','지호','지후','준서','준우','현우','도현','지훈','건우','우진','선우','서진','민재','현준','연우','유준','정우','승우','승현','시윤','준혁','은우','지환','승민','지우','유찬','윤우','민성','준영','시후','진우','지원','수호','재윤','태윤','시현','민규','지안','재원','하율','이준','윤호','재민','태민','성민','영호','상현','동현','성진','경민','대성','기현','용준','창민','태양','명수','철민','영수','광수','성호','진호','민호','석현','수민','현수','상민','형준','병호','종현','영진','희준','규민','승준','찬희','동민','우석','기범','태현','준호','성준','재혁','병찬','용호','정훈','원준','상우','재성','하늘','바다','도영'];
const JS=['사토','스즈키','다카하시','다나카','와타나베','이토','야마모토','나카무라','고바야시','가토','요시다','야마다','사사키','야마구치','마쓰모토','이노우에','기무라','하야시','시미즈','야마자키','모리','이케다','하시모토','아베','이시카와','나카지마','마에다','후지타','오가와','고토','오카다','하세가와','무라카미','곤도','이시이','사이토','사카모토','엔도','아오키','후지이','니시무라','후쿠다','오타','미우라','후지와라','오카모토','마쓰다','나카가와','나카노','하라다'];
const JG=['히로시','다쿠야','겐타','유타','쇼타','다이키','류세이','하루토','소타','가이토','렌','유키','고타','신지','나오키','마사토','료타','겐지','다이스케','다쿠미','료','가즈키','유야','슈헤이','고헤이','유토','리쿠','쇼','아키라','유스케'];
const UF=['제임스','존','마이클','데이비드','크리스','맷','조시','제이크','타일러','라이언','오스틴','코디','브랜든','카일','잭','루이스','카를로스','호세','미겔','후안','알렉스','닉','조던','트레버','로건','헌터','딜런','코너','메이슨','블레이크'];
const UL=['스미스','존슨','윌리엄스','브라운','존스','밀러','데이비스','가르시아','로드리게스','마르티네스','에르난데스','로페스','윌슨','앤더슨','토머스','테일러','무어','잭슨','마틴','리','페레스','톰슨','화이트','해리스','클라크','루이스','로빈슨','워커','영','앨런','킹','라이트','스콧','토레스','힐','플로레스','그린','애덤스','넬슨','베이커','홀','리베라','캠벨','미첼','카터','로버츠','고메스','필립스','에번스','터너'];
const TWS=['천','린','황','장','리','왕','우','류','차이','양','쉬','정','셰','훙','궈','쩡','랴오','라이','저우','예'];
const TWG=['즈하오','웨이','쥔제','청언','보원','위천','관위','쯔쉬안','자하오','이천','핀루이','칭룽','젠훙','밍제','성안','쉬안','하오위','쥔훙'];
const ESF=['호세','루이스','카를로스','미겔','후안','라파엘','펠릭스','라몬','훌리오','안드레스','에두아르도','빅토르','레오넬','라울','다니엘','헤수스','마누엘','프란시스코','오마르','엔리케'];
const ESL=['로드리게스','마르티네스','곤살레스','에르난데스','페레스','산체스','라미레스','토레스','플로레스','디아스','크루스','레예스','모랄레스','오르티스','구티에레스','차베스','멘도사','바르가스','카스티요','게레로'];
const KS_W=[21.5,14.7,8.4,4.7,4.3,2.3,2.1,2.1,2.0,1.6,1.5,1.5,1.5,1.5,1.4,1.4,1.4,1.3,0.4,1.1,1.1,0.9,0.9,0.9,0.9,0.8,0.8,0.7,1.1,0.6,0.5,0.5,0.5,0.4,0.4,0.4,0.4,0.4,0.4,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.2,0.2,0.2,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05];
// v96 (R080): 한국 성씨는 실제 인구 비율(2015 인구총조사 근사)대로 — 김·이·박이 흔하고 국·탁은 드묾
function pickKS(){let tot=0;for(let i=0;i<KS.length;i++)tot+=KS_W[i]||0.05;let r=rnd()*tot;for(let i=0;i<KS.length;i++){r-=KS_W[i]||0.05;if(r<0)return KS[i];}return KS[0];}
function genName(nat){if(nat==='JP')return pick(JS)+' '+pick(JG);if(nat==='US'||nat==='AU')return pick(UF)+' '+pick(UL);if(nat==='TW')return pick(TWS)+' '+pick(TWG);if(nat==='MX'||nat==='CB')return pick(ESF)+' '+pick(ESL);return pickKS()+pick(KG);}
const NAT_KO={KR:'한국',JP:'일본',US:'미국',TW:'대만',MX:'멕시코',AU:'호주',CB:'도미니카'};
// 이전 버전 구단명 → 새 구단명 (실존 구단명과 겹치거나 지역이 모호한 이름 교체)
const TEAM_RENAME={'뉴저지 메트로스':'뉴욕 스카이라인스','텍사스 롱혼스':'댈러스 스탈리온스','캘리포니아 서퍼스':'샌디에이고 서퍼스','플로리다 게이터즈':'마이애미 플라밍고스','타이베이 드래곤스':'타이베이 매그파이즈','타이중 라이온스':'타이중 썬더볼츠',
  '몬테레이 술타네스':'몬테레이 코메타스','멕시코시티 디아블로스':'멕시코시티 볼카네스','과달라하라 마리아치스':'과달라하라 아가베스','티후아나 토로스':'티후아나 토르멘타스','칸쿤 티부로네스':'칸쿤 마나티스','유카탄 레오네스':'메리다 하과레스',
  '멜버른 스톰':'애들레이드 사이클론스','퍼스 히트':'퍼스 블랙스완스','산토도밍고 티그레스':'산토도밍고 바라쿠다스','카라카스 아길라스':'산티아고 타바케로스','산후안 크리오요스':'산페드로 카녜로스','파나마 카누테로스':'라로마나 아레시페스'};
const TEAM_NAMES={
  // 실제 연고 도시 + 가상 애칭 (색은 우리 엠블럼 그림의 색)
  KR:[['서울 머스탱스','#b45309'],['대구 블레이즈','#ea580c'],['수원 울브스','#475569'],['광주 레드폭스','#dc2626'],['인천 세일러스','#0f766e'],
      ['서울 콘도르스','#1e3a8a'],['대전 썬더스','#ca8a04'],['부산 돌핀스','#0e7490'],['창원 스톰','#4338ca'],['서울 피닉스','#b91c1c']],
  // [이름, 색, 소속 리그/지구 번호]
  JP:[['도쿄 선라이즈','#dc2626',0],['오사카 타이푼','#1d4ed8',0],['삿포로 스노우즈','#0ea5e9',1],['후쿠오카 플레임즈','#ea580c',1],['나고야 샤치','#eab308',0],['히로시마 레드윙스','#b91c1c',0],
      ['요코하마 하버스','#0369a1',0],['도쿄 나이츠','#334155',0],['센다이 포레스터즈','#15803d',1],['사이타마 블리츠','#4338ca',1],['치바 서프스','#0891b2',1],['고베 크레인즈','#be185d',1]],
  US:[['뉴욕 스카이라인스','#2563eb',0],['댈러스 스탈리온스','#9a3412',4],['샌디에이고 서퍼스','#0891b2',4],['시카고 윈즈','#1e40af',1],['마이애미 플라밍고스','#db2777',2],['애틀랜타 피치스','#ea580c',2],
      ['보스턴 하버라이츠','#991b1b',0],['볼티모어 크랩스','#c2410c',0],['탬파베이 펠리컨스','#0d9488',2],['토론토 메이플스','#b91c1c',1],
      ['클리블랜드 라이트하우스','#1e3a8a',1],['디트로이트 모터스','#334155',1],['캔자스시티 스모크스','#57534e',3],['미네소타 프로스트','#0284c7',3],
      ['휴스턴 오비터스','#f97316',4],['애너하임 선셋츠','#e11d48',5],['시애틀 에버그린스','#047857',5],['새크라멘토 골드러시','#ca8a04',5],
      ['뉴욕 브리지스','#475569',0],['필라델피아 리버티스','#be123c',0],['워싱턴 모뉴먼츠','#1d4ed8',2],
      ['시카고 레이크쇼어스','#0369a1',3],['신시내티 리버보츠','#dc2626',2],['밀워키 캐슬스','#a16207',3],['피츠버그 아이언스','#18181b',1],['세인트루이스 아치스','#b91c1c',3],
      ['로스앤젤레스 스타라이트','#4338ca',5],['샌프란시스코 포그혼스','#c2410c',5],['피닉스 스콜피언스','#9f1239',4],['덴버 피크스','#6d28d9',4]],
  TW:[['타이베이 매그파이즈','#b91c1c'],['가오슝 오션스','#0369a1'],['타이중 썬더볼츠','#ca8a04'],['타이난 버팔로스','#3f6212'],['신베이 오키드스','#7c3aed'],['타오위안 제츠','#0e7490']],
  MX:[['몬테레이 코메타스','#1e3a8a',0],['멕시코시티 볼카네스','#dc2626',1],['과달라하라 아가베스','#7c3aed',0],['티후아나 토르멘타스','#92400e',0],['칸쿤 마나티스','#0e7490',1],['메리다 하과레스','#b45309',1],
      ['몽클로바 코요테스','#57534e',0],['살티요 아라냐스','#be123c',0],['라구나 알라크라네스','#a16207',0],['치와와 로보스','#334155',0],['아과스칼리엔테스 할코네스','#15803d',0],['라레도 비보라스','#065f46',0],['두랑고 알라스','#0369a1',0],
      ['캄페체 코르사리오스','#1d4ed8',1],['비야에르모사 카이마네스','#166534',1],['오악사카 메스칼레로스','#9a3412',1],['푸에블라 아르칸헬레스','#4338ca',1],['레온 사파테로스','#78350f',1],['베라크루스 마레아스','#0891b2',1],['케레타로 아케두크토스','#6d28d9',1]],
  AU:[['시드니 웨이브','#0ea5e9'],['애들레이드 사이클론스','#4338ca'],['퍼스 블랙스완스','#18181b'],['브리즈번 쿠카스','#15803d']],
  CB:[['산토도밍고 바라쿠다스','#b91c1c'],['산티아고 타바케로스','#92400e'],['산페드로 카녜로스','#15803d'],['라로마나 아레시페스','#0e7490'],['산토도밍고 콜로니알레스','#1d4ed8'],['산프란시스코 카카오테로스','#78350f']]
};

// ---------- 등급/능력 ----------
function isPitcher(p){return p.pos==='SP'||p.pos==='RP';}
// 화면에 보이는 반올림 수치와 등급이 항상 일치하도록 반올림 후 판정
function gradeOf(v){v=Math.round(v);return v>=80?'S':v>=70?'A':v>=60?'B':v>=50?'C':'D';}
function calcOvr(p){
  const a=p.attrs;
  if(isPitcher(p)){return p.pos==='SP'?a.stuff*.33+a.control*.3+a.movement*.25+a.stamina*.12:a.stuff*.4+a.control*.3+a.movement*.25+a.stamina*.05;}
  const w=POS_W[p.pos]||POS_W.DH;
  return a.contact*w[0]+a.power*w[1]+a.eye*w[2]+a.speed*w[3]+a.defense*w[4]+a.arm*w[5];
}
function posPenalty(p,pos){
  if(pos===p.pos||isPitcher(p)||pos==='DH')return 0;
  if(p.posTrain&&p.posTrain.to===pos){const base=posPenalty({...p,posTrain:null},pos);return Math.round(base*clamp(p.posTrain.left/p.posTrain.total,0,1));}   // 전환 훈련 중: 남은 기간만큼 불이익
  if(p.pos2&&pos===p.pos2)return 3;   // 예전 주 포지션 = 부포지션
  if(pos==='C')return 30;
  if(pos==='1B')return p.pos==='DH'?10:5;
  if(p.pos==='DH'||p.pos==='1B')return pos==='LF'||pos==='RF'?14:20;
  const inf=['2B','3B','SS'],of=['LF','CF','RF'];
  if(of.includes(pos)&&of.includes(p.pos))return pos==='CF'?12:7;
  if(inf.includes(pos)&&inf.includes(p.pos))return pos==='SS'?12:8;
  if(p.pos==='C')return 16;
  return 18;
}
const POS_KO={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발투수',RP:'구원투수'};
function josa(w,a,b){w=String(w);const base=w.replace(/\s*\([^()]*\)\s*$/,'')||w;const ch=base.charAt(base.length-1);let code=ch.charCodeAt(0);const dig={'0':1,'1':8,'2':0,'3':16,'4':0,'5':0,'6':1,'7':8,'8':8,'9':0};let jong;
  if(code>=0xAC00&&code<=0xD7A3)jong=(code-0xAC00)%28;else if(dig[ch]!=null)jong=dig[ch];else if(/[a-zA-Z]/.test(ch))jong=/[lmnr]/i.test(ch)?(ch.toLowerCase()==='l'?8:4):0;else jong=0;
  if(a==='으로')return w+(jong===0||jong===8?'로':'으로');return w+(jong?a:b);}
function posOvr(p,pos){
  const a=p.attrs,w=POS_W[pos]||POS_W.DH,pen=posPenalty(p,pos);
  return a.contact*w[0]+a.power*w[1]+a.eye*w[2]+a.speed*w[3]+clamp(a.defense-pen,10,99)*w[4]+clamp(a.arm-pen*0.5,10,99)*w[5];
}
function velocity(p){return Math.round(132+(p.attrs.stuff-50)*0.33+(p.velo||0));}

// ---------- 선수 생성 ----------
function makeScout(p,conf){
  const noise=gauss()*(1-conf)*12;const est=clamp(p.pot+noise,30,99);const w=(1-conf)*11+2;
  return {est:Math.round(est),lo:Math.round(clamp(est-w,30,99)),hi:Math.round(clamp(est+w,30,99)),conf:Math.round(conf*100)/100};
}
function improveScout(p,d){
  const c=clamp(p.scout.conf+d,0,0.95);const k=Math.min(0.6,d*1.5);
  const est=clamp(p.scout.est*(1-k)+(p.pot+gauss()*(1-c)*5)*k,30,99);const w=(1-c)*11+2;
  p.scout={est:Math.round(est),lo:Math.round(clamp(est-w,30,99)),hi:Math.round(clamp(est+w,30,99)),conf:Math.round(c*100)/100};
}
function genAge(){const r=rnd();return r<0.18?ri(18,21):r<0.5?ri(22,25):r<0.82?ri(26,30):ri(31,35);}
function genPlayer(o){
  const pos=o.pos;const isP=pos==='SP'||pos==='RP';const nat=o.nat||'KR';
  const age=o.age!=null?o.age:genAge();
  let target=o.lvl+gauss()*(o.sd!=null?o.sd:BAL.LEVEL_SD);
  if(age<=21)target-=(22-age)*2.5;if(age>=33)target-=(age-32)*1.2;
  target=clamp(target,30,91);
  const attrs={};const keys=isP?PIT_KEYS:BAT_KEYS;const shape=POS_SHAPE[pos]||{};
  for(const k of keys)attrs[k]=target+(shape[k]||0)+gauss()*7;
  const p={id:nid(),name:genName(nat),nat,age,pos,bats:isP?'R':pick(['R','R','L','L','S']),throws:pick(['R','R','R','L']),attrs,velo:Math.round(gauss()*300)/100,traits:[],teamId:null,contract:null,focus:'balance',xp:0,fatigue:0,cond:0,morale:60,cur:newStat(),hist:[],log:[],transfers:[],valHist:[],retired:false};
  for(let i=0;i<3;i++){const d=target-calcOvr(p);for(const k of keys)attrs[k]=clamp(attrs[k]+d,15,99);}
  for(const k of keys)attrs[k]=r1(attrs[k]);
  let pot=calcOvr(p)+Math.max(0,(27-age)*2.0+gauss()*7+(o.potBoost||0));
  if(age<=22&&rnd()<0.08)pot+=ri(5,12);
  p.pot=r1(clamp(Math.max(pot,calcOvr(p)),30,96));
  p.growthType=pick(['early','normal','normal','late']);
  p.peakAge=p.growthType==='early'?ri(24,26):p.growthType==='normal'?ri(27,29):ri(29,31);
  const tnames=OLD_TRAITS;p.traits=[pick(tnames)];if(rnd()<0.35){const t=pick(tnames);if(!p.traits.includes(t)&&!((t==='성실'&&p.traits[0]==='게으름')||(t==='게으름'&&p.traits[0]==='성실')))p.traits.push(t);}
  p.scout=makeScout(p,o.conf!=null?o.conf:0.3);
  p.base=JSON.parse(JSON.stringify(attrs));
  S.players[p.id]=p;
  p.snap={s:S.season||1,ovr:r1(calcOvr(p)),val:0,attrs:JSON.parse(JSON.stringify(attrs))};
  skillInit(p,calcOvr(p));
  return p;
}
// v100 (R083): 성격 능력치 3가지 — 리더십(ld)·성실성(wk)·멘탈(mt). 선수 번호에서 나온 고정 값(난수 흐름을 건드리지 않아 고정 선수단·시즌 결과가 그대로)
// 특성과 맞춤: 리더 → 리더십↑ · 성실/게으름 → 성실성↑↓ · 클러치·강심장/유리멘탈 → 멘탈↑↓. 예전 저장은 처음 볼 때 같은 식으로 채움
function perOf(p){if(!p)return {ld:50,wk:55,mt:50};if(p._per)return p._per;   /* 저장 파일에 안 들어감(번호로 다시 계산) — 저장 크기 그대로 */let h=((p.id+7)*2654435761)>>>0;const u=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return (h%100003)/100003;};const n=()=>(u()+u()+u()-1.5)*2;const T=p.traits||[];
  const ld=clamp(Math.round(50+n()*13+(p.age-26)*1.1+(T.includes('리더')?25:0)),15,95),wk=clamp(Math.round(55+n()*13+(T.includes('성실')?22:0)-(T.includes('게으름')?22:0)),15,95),mt=clamp(Math.round(50+n()*13+(T.includes('클러치')?18:0)+(T.includes('강심장')?12:0)-(T.includes('유리멘탈')?20:0)),15,95);
  const v={ld,wk,mt};if(p.perAdj)for(const k in p.perAdj)v[k]=clamp(v[k]+p.perAdj[k],15,95);   /* v141: 겨울 성격 코스 */
  Object.defineProperty(p,'_per',{value:v,enumerable:false,writable:true});return v;}
const PER_KO={ld:'리더십',wk:'성실성',mt:'멘탈'};
function newStat(){return {g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,so:0,r:0,rbi:0,pG:0,pGS:0,pOuts:0,pH:0,pR:0,pER:0,pBB:0,pSO:0,pPit:0,pW:0,pL:0,pSV:0,pHR:0,sb:0,cs:0,pHD:0,pBS:0};}

// ---------- 가치/연봉 ----------
function baseVal(ovr){return BAL.VALUE_BASE*Math.pow(BAL.VALUE_STEP,(ovr-45)/10);}
function perfFactor(p){
  const s=p.hist.length?p.hist[p.hist.length-1].st:null;if(!s)return 1;
  if(isPitcher(p)){if(s.pOuts<30)return 1;const era=s.pER*27/s.pOuts;return clamp(1.15-(era-3.8)*0.06,0.85,1.15);}
  if(s.pa<40)return 1;const ops=ops_(s);return clamp(1+(ops-0.72)*0.8,0.85,1.15);
}
function ops_(s){const ab=s.ab||1,h=s.h,bb=s.bb;const obp=(h+bb)/Math.max(1,s.ab+s.bb);const slg=(h+s.d2+2*s.d3+3*s.hr)/ab;return obp+slg;}
function awardPrem(p){if(!p.awards||!p.awards.length||typeof S==='undefined'||!S)return 1;let m=1;for(const a of p.awards){if(a.s<S.season-1)continue;m*=a.k==='mvp'?1.12:a.k==='gg'?1.05:a.k==='roy'?1.06:1.03;}return Math.min(1.25,m);}
function calcValue(p){
  const ovr=calcOvr(p);let v=baseVal(ovr);const a=p.age;
  v*=a<=23?1.0:a<=27?1.05:a<=30?0.9:a<=33?0.6:a<=35?0.38:0.25;
  if(a<=26)v*=1+Math.max(0,p.pot-ovr)/22*(a<=22?1:a<=24?0.7:0.4);
  const yrs=p.contract?p.contract.years:1;v*=yrs<=1?0.85:yrs===2?1:1.08;
  if(['C','SS','CF','SP'].includes(p.pos))v*=1.1;
  v*=perfFactor(p);v*=awardPrem(p);
  const t=p.teamId!=null?S.teams[p.teamId]:null;v*=t?(t.league==='KR'?BAL.LEAGUE_VALUE[1]:BAL.LEAGUE_VALUE[t.league]):1;v*=krAdj(p);
  return Math.max(500,Math.round(v/10)*10);
}
function minSal(s){s=s||(S?(S.phase==='offseason'?S.season+1:S.season):1);return s>=2?Math.round(BAL.SALARY_MIN*1.1):BAL.SALARY_MIN;}   // v101: KBO 최저 연봉 2026년 3,000만 → 2027년 3,300만
// v105: 새 게임에서 국내 선수 능력을 리그 수준에 맞춰 내린 만큼(S.krShift) 국내 연봉·몸값 곡선을 올려 금액은 그대로 (예전 저장은 krAdj 없음 = 1)
function krAdj(p){if(!S||!S.krAdj)return 1;const t=p.teamId!=null?S.teams[p.teamId]:null;return (t?t.league==='KR':(p.nat||'KR')==='KR')?S.krAdj:1;}
function salaryFor(p){const v=baseVal(calcOvr(p))*krAdj(p)*BAL.SALARY_RATE*(p.age<=23?0.75:1)*(p.age>=33?0.8:1);return Math.max(minSal(),Math.round(v/10)*10);}
function money(m){m=(m||0)*BAL.WON;const neg=m<0;m=Math.abs(Math.round(m));let s;if(m>=10000){const e=m/10000;s=(e>=100?Math.round(e):Math.round(e*10)/10).toLocaleString()+'억원';}else s=m?m.toLocaleString()+'만원':'0원';return (neg?'-':'')+s;}

// ---------- 구단 ----------
function genTeam(name,color,league,div,isUser){
  const t={id:nid(),name,color,league,div,cash:0,rep:0,fac:{train:1,youth:1,scout:1},roster:[],entry:[],lineup:[],pos:{},rotation:[],bullpen:[],closer:null,rpRole:{},rotIdx:0,rec:{w:0,l:0,rs:0,ra:0},fin:newFin(),isUser:!!isUser,loan:0,lastRank:null,dev:[]};
  if(league==='KR'){t.cash=BAL.START_CASH[1]*(0.9+rnd()*0.3);t.rep=ri(60,85);}
  else{t.cash=BAL.OVERSEAS_CASH[league];t.rep=league==='US'?ri(85,98):league==='JP'?ri(70,85):league==='AU'?ri(30,45):ri(45,65);}
  t.cash=Math.round(t.cash);
  return t;
}
function newFin(){return {grant:0,tickets:0,sponsor:0,ads:0,endorse:0,dividend:0,sales:0,salary:0,buys:0,scout:0,facility:0,other:0,dispatch:0,staff:0,cap:0};}
function levelOf(t){return t.league==='KR'?BAL.LEVEL_OVR.KR1:BAL.LEVEL_OVR[t.league];}
function addToTeam(p,t,contract,dev){p.teamId=t.id;(dev?t.dev:t.roster).push(p.id);if(contract&&t.league==='KR'&&contract.salary<minSal())contract.salary=minSal();p.contract=contract;if(!dev&&t.isUser&&t.entry&&!p.inj&&t.entry.length<entryCap(t))t.entry.push(p.id);}
function devCap(t){return BAL.DEV_BASE+(t.fac?t.fac.youth:1)+(t.staff&&typeof staffP==='function'&&staffP(t,'dev')>=1.2?1:0);}
function fillRoster(t){
  const lvl=levelOf(t);const nat=t.league==='KR'?'KR':t.league;
  const have={};for(const pid of t.roster)have[S.players[pid].pos]=(have[S.players[pid].pos]||0)+1;
  const size=t.league==='KR'?26:(BAL.LEAGUES[t.league]?BAL.LEAGUES[t.league].roster:26);
  // 이미 있는 외국인 수만큼 자리를 빼고 시작 (다시 채울 때 3+1을 넘지 않게)
  let F=null;if(t.league==='KR'){const L0=t.roster.map(id=>S.players[id]).filter(x=>x&&x.nat!=='KR');F=L0.length>=4?{sp:2,bat:1,asia:1}:{sp:Math.min(2,L0.filter(x=>x.pos==='SP').length),bat:Math.min(1,L0.filter(x=>x.pos!=='SP'&&x.pos!=='RP').length),asia:Math.min(1,L0.filter(x=>x.pos==='RP').length)};}
  for(const pos of ROSTER_TEMPLATE){if(t.roster.length>=size)break;if(have[pos]>0){have[pos]--;continue;}
    // 국내 구단: 선발 2명·야수 1명은 외국인, 불펜 1명은 아시아쿼터 (KBO 2026처럼 구단마다 3+1)
    let fg=null;if(F){if(pos==='SP'&&F.sp<2){F.sp++;fg='gen';}else if(['1B','LF','RF','DH'].includes(pos)&&F.bat<1){F.bat++;fg='gen';}else if(pos==='RP'&&F.asia<1){F.asia++;fg='asia';}}
    const p=fg?genPlayer({pos,lvl:lvl+(fg==='gen'?BAL.FGN.lvl:0),nat:fg==='asia'?pick(['JP','TW','AU']):pick(['US','US','US','MX','CB']),age:ri(25,31)}):genPlayer({pos,lvl,sd:BAL.LEVEL_SD_LG[t.league],nat:(t.league==='KR'?'KR':(rnd()<0.1?pick(['KR','US','MX']):nat))});
    addToTeam(p,t,fg?{salary:fg==='asia'?Math.min(BAL.FGN.asiaCap,Math.max(minSal()*2,Math.round(salaryFor(p)*0.9/10)*10)):Math.min(BAL.FGN.genMax,Math.max(BAL.FGN.genMin,Math.round(salaryFor(p)*BAL.FGN.genMul/100)*100)),years:1}:{salary:Math.round(salaryFor(p)*(0.85+rnd()*0.3)/10)*10,years:ri(1,4)});
  }
  // 국내 구단: 2군(퓨처스) 선수층 — 1군 엔트리 밖 젊은 선수 (v61: 1군 26명 고정, 선수단 상한 없음)
  if(t.league==='KR'&&t.roster.length<=size)addFarmDepth(t);
}
function addFarmDepth(t){const lvl=levelOf(t);const n=t.roster.length+FARM_TEMPLATE.length;for(const pos of FARM_TEMPLATE){if(t.roster.length>=n)break;const p=genPlayer({pos,lvl:lvl-7,nat:'KR',age:ri(20,26)});addToTeam(p,t,{salary:Math.round(salaryFor(p)*(0.8+rnd()*0.2)/10)*10,years:ri(1,3)});}}
function countPos(t,pos){let n=0;for(const pid of t.roster)if(S.players[pid].pos===pos)n++;return n;}
function needOf(t){const need=[];for(const pos in NEED_TEMPLATE){const n=countPos(t,pos);if(n<NEED_TEMPLATE[pos])need.push(pos);}return need;}

// ---------- 자동 편성 ----------
const LINEUP_POS=['C','SS','CF','2B','3B','RF','LF','1B','DH'];
const DEFW={C:1.3,SS:1.4,CF:1.3,'2B':1.2,'3B':1.0,RF:0.9,LF:0.8,'1B':0.6,DH:0};
function offVal(p){const a=p.attrs;return a.contact*.36+a.power*.34+a.eye*.18+a.speed*.12;}
function defAt(p,pos){const pen=posPenalty(p,pos);return {d:clamp(p.attrs.defense-pen,10,99),ar:clamp(p.attrs.arm-pen*0.5,10,99),pen};}
function fitScore(p,pos,opt){
  let s=offVal(p);if(pos!=='DH'){const x=defAt(p,pos);s+=DEFW[pos]*((x.d-50)*0.55+(x.ar-50)*0.15);if(x.pen>=12)s-=3+x.pen*0.6;if(pos==='C'&&x.pen>=12)s-=12;if(x.pen>=20&&!(opt&&opt.mode==='attack'))s-=30;}else if(p.pos!=='DH')s-=1.5;
  if(opt){if(opt.mode==='youth'&&p.age<=24)s+=Math.max(0,Math.min(25,(p.scout?p.scout.est:p.pot)-calcOvr(p)))*0.45+3;
    if(opt.mode==='rest'&&(p.fatigue||0)>50)s-=((p.fatigue||0)-50)*0.5;if((p.fatigue||0)>85)s-=10;}
  return s;}
function bestLineup(bats,opt){
  opt=opt||{};const locks=opt.locks||{};const pool=bats.filter(p=>p&&!p.retired);const asg={};const used=new Set();
  for(const pid in locks){const p=pool.find(x=>x.id===+pid);if(p&&!used.has(p.id)&&!Object.values(asg).includes(locks[pid])){asg[p.id]=locks[pid];used.add(p.id);}}
  const lockedIds=new Set(Object.keys(asg).map(Number));
  for(const pos of LINEUP_POS){if(Object.values(asg).includes(pos))continue;let best=null,bv=-1e9;for(const p of pool){if(used.has(p.id))continue;const v=fitScore(p,pos,opt);if(v>bv){bv=v;best=p;}}if(best){asg[best.id]=pos;used.add(best.id);}}
  const total=()=>{let t=0;for(const id in asg)t+=fitScore(pool.find(x=>x.id===+id),asg[id],opt);return t;};
  for(let it=0;it<40;it++){let bestGain=0.01,act=null;const ids=Object.keys(asg).map(Number).filter(id=>!lockedIds.has(id));
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=pool.find(x=>x.id===ids[i]),b=pool.find(x=>x.id===ids[j]);const pa=asg[a.id],pb=asg[b.id];const g=fitScore(a,pb,opt)+fitScore(b,pa,opt)-fitScore(a,pa,opt)-fitScore(b,pb,opt);if(g>bestGain){bestGain=g;act=['swap',a.id,b.id];}}
    for(const id of ids){const a=pool.find(x=>x.id===id);const pos=asg[id];for(const b of pool){if(used.has(b.id))continue;const g=fitScore(b,pos,opt)-fitScore(a,pos,opt);if(g>bestGain){bestGain=g;act=['rep',id,b.id];}}}
    if(!act)break;if(act[0]==='swap'){const t=asg[act[1]];asg[act[1]]=asg[act[2]];asg[act[2]]=t;}else{const pos=asg[act[1]];delete asg[act[1]];used.delete(act[1]);asg[act[2]]=pos;used.add(act[2]);}}
  // 타순
  const chosen=Object.keys(asg).map(id=>pool.find(x=>x.id===+id));const rest=[...chosen].sort((a,b)=>offVal(b)-offVal(a));const order=new Array(chosen.length);
  const take=(fn,slot)=>{if(!rest.length)return;let bi=0,bv=-1e9;rest.slice(0,Math.min(rest.length,6)).forEach((p,i)=>{const v=fn(p);if(v>bv){bv=v;bi=i;}});order[slot]=rest.splice(bi,1)[0];};
  take(p=>p.attrs.power*.6+p.attrs.contact*.4,3);take(p=>offVal(p),2);take(p=>p.attrs.contact*.4+p.attrs.eye*.35+p.attrs.speed*.25,0);take(p=>p.attrs.contact*.6+p.attrs.speed*.2+p.attrs.eye*.2,1);
  for(let k=4;k<order.length;k++)take(p=>offVal(p),k);
  return {order:order.filter(Boolean).map(p=>p.id),pos:asg,score:total()};
}
// ---------- 1군 엔트리 (v61) — 라인업·로테이션·마무리 + 불펜·벤치 = 26명. 나머지 선수단은 2군(퓨처스) ----------
function entryCap(t){return t.league==='KR'?BAL.ENTRY:Math.min(BAL.ENTRY,(BAL.LEAGUES[t.league]&&BAL.LEAGUES[t.league].roster)||BAL.ENTRY);}
function entryPitN(t){return Math.round(entryCap(t)*12/26);}
function inEntry(t,pid){return !!(t.entry&&t.entry.includes(pid));}
function autoEntry(t){const cap=entryCap(t);const ok=id=>{const p=S.players[id];return p&&!p.retired&&!p.inj;};
  const set=new Set([...t.lineup,...t.rotation,...(t.closer!=null?[t.closer]:[])].filter(id=>t.roster.includes(id)&&ok(id)));
  const rest=t.roster.filter(id=>!set.has(id)&&ok(id)).map(id=>S.players[id]);
  const pits=rest.filter(isPitcher).sort((a,b)=>calcOvr(b)-calcOvr(a)),bats=rest.filter(p=>!isPitcher(p)).sort((a,b)=>calcOvr(b)-calcOvr(a));
  const nPit=entryPitN(t);let pc=[...set].filter(id=>isPitcher(S.players[id])).length;
  for(const p of pits){if(set.size>=cap||pc>=nPit)break;set.add(p.id);pc++;}
  if([...set].filter(id=>S.players[id].pos==='C').length<2){const bc=bats.find(p=>p.pos==='C');if(bc&&set.size<cap)set.add(bc.id);}
  for(const p of bats){if(set.size>=cap)break;set.add(p.id);}
  for(const p of pits){if(set.size>=cap)break;set.add(p.id);}
  t.entry=[...set];applyEntry(t);}
// 엔트리에 맞춰 불펜·마무리·보직 정리 (불펜 순서는 유지)
function applyEntry(t){t.entry=(t.entry||[]).filter(id=>t.roster.includes(id)&&S.players[id]&&!S.players[id].retired);const e=new Set(t.entry);
  const rot=new Set(t.rotation);const old=(t.bullpen||[]).filter(id=>e.has(id)&&!rot.has(id));const add=t.entry.filter(id=>isPitcher(S.players[id])&&!rot.has(id)&&!old.includes(id)).sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]));
  t.bullpen=old.concat(add);if(t.closer!=null&&!t.bullpen.includes(t.closer))t.closer=null;if(t.closer==null&&t.bullpen.length)t.closer=[...t.bullpen].sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]))[0];
  t.rpRole=t.rpRole||{};for(const k in t.rpRole)if(!t.bullpen.includes(+k))delete t.rpRole[k];}
// 엔트리 빈자리를 2군에서 채움 (부상·말소 뒤). 채운 선수 이름 목록을 돌려줌
function fillEntry(t){const cap=entryCap(t);const e=new Set(t.entry||[]);const names=[];const ok=id=>{const p=S.players[id];return p&&!p.retired&&!p.inj&&!e.has(id);};
  const nPit=entryPitN(t);let guard=0;
  while(e.size<cap&&guard++<40){const pc=[...e].filter(id=>isPitcher(S.players[id])).length;const cands=t.roster.filter(ok).map(id=>S.players[id]);if(!cands.length)break;
    const wantP=pc<nPit;let pool=cands.filter(p=>isPitcher(p)===wantP);if(!pool.length)pool=cands;
    if(!wantP&&[...e].filter(id=>S.players[id].pos==='C').length<2&&pool.some(p=>p.pos==='C'))pool=pool.filter(p=>p.pos==='C');
    const best=pool.sort((a,b)=>calcOvr(b)-calcOvr(a))[0];e.add(best.id);names.push(best.name);}
  t.entry=[...e];applyEntry(t);return names;}
function autoLineup(t,opt){
  if(t.league==='JP'&&typeof fgnActiveFix==='function'){const mv=fgnActiveFix(t);if(mv.length&&t.isUser&&typeof news==='function')news(`1군 외국인 4명 규정: ${mv.join(', ')} 2군(육성군)으로 내려갔습니다`,'contract');}
  opt=opt||{mode:t.lineupMode||'win',locks:t.isUser?(t.locks||{}):{}};
  const ps=t.roster.map(id=>S.players[id]).filter(p=>p&&!p.retired&&!p.inj);
  const bats=ps.filter(p=>!isPitcher(p)),pits=ps.filter(isPitcher);
  const r=bestLineup(bats,opt);t.lineup=r.order;t.pos=r.pos;
  const fat=p=>opt.mode==='rest'?(p.fatigue||0)*0.2:0;
  const sps=pits.filter(p=>p.pos==='SP').sort((a,b)=>calcOvr(b)-fat(b)-calcOvr(a)+fat(a));const rps=pits.filter(p=>p.pos==='RP').sort((a,b)=>calcOvr(b)-calcOvr(a));
  let rot=sps.slice(0,5).map(p=>p.id);const extra=[...sps.slice(5),...rps];
  while(rot.length<5&&extra.length)rot.push(extra.shift().id);
  t.rotation=rot;t.bullpen=pits.filter(p=>!rot.includes(p.id)).sort((a,b)=>calcOvr(b)-calcOvr(a)).map(p=>p.id);
  t.closer=t.bullpen.length?t.bullpen[0]:null;
  autoEntry(t);
  if(t.rotIdx>=t.rotation.length)t.rotIdx=0;
}
function teamPower(t,exclude){
  const ps=t.roster.filter(id=>id!==exclude).map(id=>S.players[id]).filter(p=>p&&!p.retired);
  const bats=ps.filter(p=>!isPitcher(p)),pits=ps.filter(isPitcher);const r=bestLineup(bats,{});
  let la=0,n=0;for(const id in r.pos){const p=S.players[id];la+=r.pos[id]==='DH'?offVal(p):posOvr(p,r.pos[id]);n++;}la=n?la/n:40;
  const byO=(a,b)=>calcOvr(b)-calcOvr(a);const spP=pits.filter(p=>p.pos==='SP').sort(byO).slice(0,5);if(spP.length<5)spP.push(...pits.filter(p=>p.pos!=='SP').sort(byO).slice(0,5-spP.length));
  const spAvg=spP.length?spP.reduce((s,p)=>s+calcOvr(p),0)/spP.length:40;const rpP=pits.filter(p=>!spP.includes(p)).sort(byO).slice(0,5);const rpAvg=rpP.length?rpP.reduce((s,p)=>s+calcOvr(p),0)/rpP.length:40;
  return {power:r1(la*0.55+spAvg*0.3+rpAvg*0.15),lineup:r,spIds:pits.filter(p=>p.pos==='SP').sort((a,b)=>calcOvr(b)-calcOvr(a)).slice(0,5).map(p=>p.id)};
}
// 유저 팀: 빠진 선수만 교체(기존 편성 유지)
function fixLineup(t,o){if(t&&t.league==='JP'&&typeof fgnActiveFix==='function'){const mv=fgnActiveFix(t);if(mv.length&&t.isUser&&typeof news==='function')news(`1군 외국인 4명 규정: ${mv.join(', ')} 2군(육성군)으로 내려갔습니다`,'contract');}
  if(!t.entry||!t.entry.length)autoEntry(t);
  const hurt=(t.entry||[]).filter(id=>{const p=S.players[id];return !p||p.retired||p.inj||!t.roster.includes(id);});
  t.entry=t.entry.filter(id=>!hurt.includes(id));// 부상·이적 선수는 엔트리에서 자동 말소
  const before=JSON.stringify([t.lineup,t.rotation,t.bullpen,t.closer,t.entry]);
  const alive=new Set(t.entry);
  t.lineup=t.lineup.filter(id=>alive.has(id));for(const id in t.pos)if(!alive.has(+id))delete t.pos[id];
  t.rotation=t.rotation.filter(id=>alive.has(id));t.bullpen=t.bullpen.filter(id=>alive.has(id));
  if(t.closer!=null&&!alive.has(t.closer))t.closer=null;t.rpRole=t.rpRole||{};for(const k in t.rpRole)if(!t.bullpen.includes(+k))delete t.rpRole[k];
  const ps=[...alive].map(id=>S.players[id]);
  const needPos=['C','SS','2B','CF','3B','RF','LF','1B','DH'].filter(ps_=>!Object.values(t.pos).includes(ps_));
  for(const ps_ of needPos){let best=null,bv=-1e9;for(const p of ps){if(isPitcher(p)||t.lineup.includes(p.id))continue;const v=fitScore(p,ps_,{});if(v>bv){bv=v;best=p;}}if(best){t.lineup.push(best.id);t.pos[best.id]=ps_;}}
  if(t.locks)for(const id in t.locks)if(!alive.has(+id))delete t.locks[id];
  // 라인업 자리가 비면 2군에서 올림 (엔트리에 자리 있을 때)
  const cap=entryCap(t);for(const ps_ of needPos){if(Object.values(t.pos).includes(ps_)||t.entry.length>=cap)continue;let best=null,bv=-1e9;for(const id of t.roster){const p=S.players[id];if(!p||p.retired||p.inj||isPitcher(p)||alive.has(id))continue;const v=fitScore(p,ps_,{});if(v>bv){bv=v;best=p;}}if(best){t.entry.push(best.id);alive.add(best.id);t.lineup.push(best.id);t.pos[best.id]=ps_;}}
  const pits=[...alive].map(id=>S.players[id]).filter(isPitcher);
  for(const p of pits)if(!t.rotation.includes(p.id)&&!t.bullpen.includes(p.id))t.bullpen.push(p.id);
  while(t.rotation.length<5&&t.entry.length<cap){const up=t.roster.map(id=>S.players[id]).filter(p=>p&&!p.retired&&!p.inj&&isPitcher(p)&&!alive.has(p.id)).sort((a,b)=>(b.pos==='SP')-(a.pos==='SP')||calcOvr(b)-calcOvr(a))[0];if(!up)break;t.entry.push(up.id);alive.add(up.id);t.bullpen.push(up.id);}
  while(t.rotation.length<5&&t.bullpen.length){const sp=t.bullpen.filter(id=>S.players[id].pos==='SP').sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]))[0]||t.bullpen.filter(id=>id!==t.closer&&!S.players[id].rpLock).sort((a,b)=>(S.players[b].attrs.stamina||0)-(S.players[a].attrs.stamina||0))[0]||t.bullpen[0];t.bullpen=t.bullpen.filter(id=>id!==sp);t.rotation.push(sp);}
  if(t.closer==null&&t.bullpen.length)t.closer=[...t.bullpen].sort((a,b)=>calcOvr(S.players[b])-calcOvr(S.players[a]))[0];
  if(t.rotIdx>=t.rotation.length)t.rotIdx=0;
  const up=(o&&o.noFill)?[]:fillEntry(t);if(up.length&&t.isUser&&typeof news==='function')news(`1군 엔트리 보충: ${up.join(', ')} (2군에서 등록)`,'contract');
  if(hurt.length&&t.isUser&&typeof news==='function'){const hn=hurt.map(id=>S.players[id]).filter(Boolean).map(p=>p.name);if(hn.length)news(`1군 엔트리 말소: ${hn.join(', ')}`,'contract');}
  return before!==JSON.stringify([t.lineup,t.rotation,t.bullpen,t.closer,t.entry]);
}
// 엔트리에 꼭 넣기: 자리 없으면 같은 종류(투수/야수)의 가장 약한 비주전을 2군으로
function entryEnsure(t,pid){t.entry=t.entry||[];if(t.entry.includes(pid))return {ok:true};const p=S.players[pid];if(!p||p.inj||!t.roster.includes(pid))return {ok:false};if(t.entry.length<entryCap(t)){t.entry.push(pid);applyEntry(t);return {ok:true};}
  const core=new Set([...t.lineup,...t.rotation,...(t.closer!=null?[t.closer]:[]),...Object.keys(t.rpRole||{}).map(Number)]);const out=t.entry.filter(id=>!core.has(id)&&isPitcher(S.players[id])===isPitcher(p)).sort((a,b)=>calcOvr(S.players[a])-calcOvr(S.players[b]))[0];if(out==null)return {ok:false};
  t.entry=t.entry.filter(x=>x!==out);t.lineup=t.lineup.filter(x=>x!==out);delete t.pos[out];t.rotation=t.rotation.filter(x=>x!==out);t.bullpen=t.bullpen.filter(x=>x!==out);if(t.closer===out)t.closer=null;t.entry.push(pid);applyEntry(t);return {ok:true,down:S.players[out]};}
// 1군 등록·말소 (유저)
function entryUp(pid,downPid){const t=userTeam();const p=S.players[pid];if(!p||p.teamId!==t.id||!t.roster.includes(pid))return '선수단(1군·2군) 선수가 아닙니다. 육성군은 먼저 2군으로 올리세요.';if(inEntry(t,pid))return '이미 1군 엔트리에 있습니다.';if(p.inj)return '부상 중인 선수는 등록할 수 없습니다.';
  if(t.entry.length>=entryCap(t)){if(downPid==null)return `1군 엔트리가 가득 찼습니다 (${entryCap(t)}명). 내릴 선수를 고르세요.`;const r=entryDown(downPid,true);if(r)return r;}
  t.entry.push(pid);applyEntry(t);fixLineup(t);news(`[1군 등록] ${p.name}`,'contract');return null;}
function entryDown(pid,quiet){const t=userTeam();const p=S.players[pid];if(!p||!inEntry(t,pid))return '1군 엔트리 선수가 아닙니다.';
  t.entry=t.entry.filter(x=>x!==pid);t.lineup=t.lineup.filter(x=>x!==pid);delete t.pos[pid];t.rotation=t.rotation.filter(x=>x!==pid);t.bullpen=t.bullpen.filter(x=>x!==pid);if(t.closer===pid)t.closer=null;if(t.rpRole)delete t.rpRole[pid];if(t.locks)delete t.locks[pid];
  applyEntry(t);if(!quiet){fixLineup(t,{noFill:true});news(`[1군 말소] ${p.name} → 2군`,'contract');}return null;}

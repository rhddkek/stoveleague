# 야구 게임 인터페이스 조사 → 우리 게임 적용 (2026-11-07, v61)

광우 요청: 「인터넷의 야구 게임을 다 찾아보고 인터페이스를 공부해서 적용해라」.
조사 방법: 각 게임의 리뷰·공략·개발자 인터뷰·앱 설명·커뮤니티 글(출처는 맨 아래)과 제가 아는 각 게임의 화면 구조. 이 작업 환경에서는 이미지·영상 파일을 직접 열 수 없어 **글로 된 화면 설명과 기억**으로 정리했고, 광우가 캡처를 붙여 주면 그 화면 기준으로 다시 맞춥니다.

## 1. 게임별 인터페이스 핵심

| 게임 | 종류 | 화면의 뼈대 | 가져올 것 |
|---|---|---|---|
| **OOTP 26** (PC) | 정통 경영 시뮬 | 상단 메뉴 + **오른쪽 위 「Continue」 고정**. 「Manager's Office」 홈은 위젯을 골라 꾸밈. 선수 **우클릭 메뉴**(트레이드·방출·연장). Rosters & Transactions에서 메이저·마이너 **드래그로 이동**. 개막 전 **26인 로스터 확정** 강제. 오프시즌 센터에 FA·거래 소식 한곳 | ① 「다음」 버튼 항상 같은 자리 ② 선수 줄 → 메뉴 ③ **1군 26명 고정·나머지는 마이너** ④ 오프시즌 한 화면 |
| **OOTP Go / MLB Manager** (모바일) | 위를 폰으로 | 개발자: 「가장 어려운 건 숫자·표가 많은 화면을 작은 화면에 넣는 것」. 홈에 다음 경기·팀 성적·할 일만 | 폰은 **한 화면에 결정 하나** |
| **MLB The Show 25 프랜차이즈** | 콘솔 | 홈 허브에 **다음 경기 카드 + 받은 편지함**. Manage Roster → 라인업(좌/우투 별)·로테이션·불펜·**액티브 26 / 40인**. 선수 카드에 「최근 경기」 탭. FA는 **관심 3명 big board** | ① 1군/전체 구분 ② 관심 선수 상단 고정 ③ 선수 카드에 최근 경기 |
| **컴투스프로야구 for 매니저 LIVE** | 모바일 매니저 | 하단 탭(홈·팀·리그·상점). **팀 화면 = 다이아몬드 + 타순 9칸**, 「최적 라인업」 한 번. 작전 방침은 **선수별 사전 설정**(번트·주루·교체 타이밍) 후 **스킵/2배속 진행** | ① 다이아몬드 라인업(있음) ② **방침 미리 정하고 빠르게 진행** |
| **프로야구 H3 / 야구의 신** | 모바일 매니저 | 「브리핑 페이지」=감독실: 리그 등급·다음 경기·소식·선수 체력 한눈. 창단 때 팀 스타일 고르면 **자동 라인업**. 초보에게 **상황별 추천 작전** | ① 감독실 한 장 브리핑 ② 추천 작전(코치 결정 카드 — 있음) |
| **야구9단** (웹) | 웹 매니저 | 매시 정시 자동 진행, **라인업·작전 미리 세팅 → 결과 확인**. 알림은 **문자 중계처럼** 짧게. 창단: 스폰서·방송사·주력 선수 선택 | ① 짧은 문자형 소식(하단 띠 — 있음) ② 스폰서 선택(있음) |
| **Football Manager 26 (PC·모바일)** | 축구 매니저(참고) | FM26 UI는 **「인터페이스 미로」**라는 혹평(클릭 깊이·탭 과다). 반면 FM 모바일은 **왼쪽 탭 5개 + 상단 Continue**, 선수 누르면 메뉴. 달력에서 바로 해당 화면으로 **점프** | ① 깊이 늘리면 망한다 ② 할 일 → 바로 그 화면(v60 반영) |
| **Super Mega Baseball 4 프랜차이즈** | 아케이드 | 시즌 허브 한 장: 다음 경기·순위·선수 「케미」. 메뉴 2단계 이상 없음 | 메뉴 2단계 |
| **파워프로(실황) 페넌트** | 콘솔 | 달력 한 장에서 「다음 날」, 월말 평가. 선수 능력은 **알파벳 등급 + 숫자** 함께 | 등급+숫자(있음) |
| **클럽스토리**(국내 모바일, 전 조사) | 모바일 경영 | 칩 필터·할 일 보드·귀여운 톤 | v59~v60에 반영 |
| **EA 프로야구 2011**(전 조사) | 피처폰→스마트폰 | 경기마다 미션·단계, 하단 띠, 감독/시뮬 모드 | v58에 반영 |

## 2. 공통으로 나타난 원칙 (우리 뼈대와 대조)

1. **「다음」은 항상 같은 자리** — OOTP·FM·파워프로 모두 화면 어디서든 Continue. 우리는 감독실에만 있었음 → **v61: 상단 구단 바 오른쪽에 고정** (시즌: ▶ 경기 / ▶ 다음 날, 스토브: 다음 주 ▶ / 개막 ▶).
2. **1군 엔트리는 고정 숫자, 선수단은 넓게** — OOTP 26인, The Show 26/40인, KBO 28인. 우리는 「선수단 30명 = 1군」이라 2군이 끼어 있었음 → **v61: 1군 엔트리 26명 고정, 2군·육성군 상한 없음**.
3. **선수 한 줄 → 메뉴 하나** — OOTP 우클릭, FM 모바일 탭. v59~v60 반영.
4. **홈은 브리핑 한 장** — 다음 경기·결정·소식. v52~v58 반영.
5. **방침을 미리 정하고 빠르게 진행** — 컴프매·야구9단. 우리는 결정 카드가 매일 뜨는데, 「자동 진행」 중엔 자동 처리됨. 유지.
6. **깊이 2단계** — FM26이 깊이로 혹평. 우리 뼈대 문서 §1.

## 3. v61에 적용한 것
- 상단 「다음」 버튼 고정 (원칙 1)
- 1군 엔트리 26명 고정 / 2군·육성군 무제한 (원칙 2) — 선수단 칩 「1군 26/26 · 2군 n」, ⋯ 메뉴 「1군 등록(가득 차면 내릴 선수 고르기)」·「1군 말소 → 2군」, 투수진 「2군」 탭·보직 선택에 「2군」, 라인업 자리 고르기에 2군 선수 표시(고르면 자동 등록), 부상은 자동 말소·보충, 복귀하면 원래 자리로
- 시즌 중 선수 탭 기본 화면 = 1군 엔트리

## 4. 다음에 가져올 것 (우선순위)
1. 선수 상세에 **「최근 5경기」** (The Show)
2. FA/영입 **관심 선수 상단 고정 + 경쟁 구단 표시** (The Show big board)
3. 좌/우투 상대 **라인업 2벌**(The Show·OOTP) — 엔진 지원 필요
4. 오프시즌 센터: 스토브리그 할 일 보드에 **리그 거래 소식**까지 한 화면 (OOTP)

## 5. 출처
- [Out of the Park Baseball 26 Guide to Navigating Your First Offseason (Nerd Reactor)](https://nerdreactor.com/?p=8412)
- [Out of the Park Baseball 26 Review (Sports Gamers Online)](https://www.sportsgamersonline.com/news/reviews/out-of-the-park-baseball-26-review-a-baseball-nerds-dream/)
- [OOTP Go 인터뷰 — PC 게임을 모바일로 (Pocket Gamer)](https://www.pocketgamer.com/articles/087068/out-of-the-park-baseball-go-interview-rich-grisham-discusses-adapting-a-pc-game-for-mobile-and-what-players-can-expect-in-future-updates/)
- [MLB The Show 25 Franchise Mode In-Depth Breakdown (Operation Sports)](https://operationsports.com/mlb-the-show-25-franchise-mode-in-depth-breakdown)
- [MLB The Show 25 Franchise 새 기능 (Sportskeeda)](https://www.sportskeeda.com/baseball/news-mlb-the-show-25-new-features-confirmed-massive-franchise-mode-update-including-revamped-free-agency)
- [컴투스프로야구 for 매니저 LIVE — App Store](https://apps.apple.com/kr/app/%EC%BB%B4%ED%88%AC%EC%8A%A4%ED%94%84%EB%A1%9C%EC%95%BC%EA%B5%AC-for-%EB%A7%A4%EB%8B%88%EC%A0%80-live-2020/id682942443)
- [야구의 신 (게임메카)](https://www.gamemeca.com/view.php?gid=265084)
- [야구9단 1차 CBT (게임메카)](https://www.gamemeca.com/view.php?gid=123057)
- [Football Manager 26 is floundering in an interface labyrinth (Galaxus)](https://www.galaxus.de/en/page/football-manager-26-is-floundering-in-an-interface-labyrinth-40507)
- [FM26 hidden features & UI tips (Football Manager Blog)](https://www.footballmanagerblog.org/2026/01/fm26-hidden-features-ui-tips.html)
- [Super Mega Baseball 4 Review (Operation Sports)](https://operationsports.com/super-mega-baseball-4-review-arcade-and-simulation-mash-up-with-some-pop)

# EA 프로야구 2011 화면 에뮬레이터 (분석용)

광우의 APK에서 꺼낸 `lib/armeabi/libEA_BASEBALL2011MiAn.so`와 `assets/data.vfs.mp3`를 Unicorn(ARM)으로 실행해 원작 화면 함수를 그대로 돌린다. EA 파일은 저장소에 넣지 않는다.

- 준비: `pip install unicorn capstone pyelftools pillow`, APK를 풀어 `emu.py`의 `SO`, `VFS` 경로를 맞춘다.
- `game.py`: 화면 240×400(16bit)·글꼴(`HF_Initialize(panic_eng_7x11.fnt, …, panic_kor_10x11.fnt)`)·저장(`DT_SaveFile` 무시) 초기화, 키 입력(UP -1, DOWN -2, LEFT -3, RIGHT -4, OK -5, CLR -16, 전체계약 '#')
- `run.py 이름 시작 키열`: 시작 = `stove`(새 커리어 → `MS_SetStoveLeague` → 상태 85) · `main`(마스터 홈 1201) · 상태 번호
- 메뉴 상태 번호: 85 스토브 돌입, 86~87 연봉협상, 88~89 용병, 90~95 신인 1~3차, 96~97 FARM, 98 종료 / 1200 팀 선택, 1201 홈, 1204 관리, 1220 선수관리, 1230·1231 1·2군, 1232 트레이드, 1233 선수조합, 1221~1224 장비·코치·성장·예산, 1240 스카우트
- `sample.py`: `MS_StoveMoneyAI` 수락 확률 실측, `tsample.py`: 트레이드 1대1 실측
- 인증(`MainFrame_certification`)은 호출하지 않는다.

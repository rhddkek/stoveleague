# v186 (R157): 픽셀 글꼴(갈무리 Galmuri11, SIL OFL 1.1 — https://github.com/quiple/galmuri) 조각 만들기
# 점수 · 등급 · 큰 컷 제목에만 씀 → 그 글자만 잘라 assets/fonts/galmuri_sub.woff2 (빌드가 CSS에 넣음)
# 쓰는 법: npm pack galmuri && tar xzf galmuri-*.tgz && python3 tools/font_subset.py package/dist/Galmuri11.ttf
import sys
from fontTools import subset
TITLES=['한국시리즈 일본시리즈 대만시리즈 월드시리즈 우승 준우승','가을야구 진출 포스트시즌 정규시즌 1위','끝내기 승리 홈런 안타','대기록 통산 시즌 홈런 안타 승 세이브 탈삼진 도루 타점 경기 출장 번째',
        '해외 진출 영구결번 부임 첫 승 대형 계약 영입 신인왕 MVP','승 패 무 위 회 초 말 득점 VS 연승 연패','노히트 노런 사이클링 히트 한 경기 3홈런 4홈런 완봉 탈삼진']
chars=set(chr(c) for c in range(0x20,0x7f))|set('·:−–—%↑↓▲▼')
for t in TITLES:chars|=set(t)
src=sys.argv[1] if len(sys.argv)>1 else 'package/dist/Galmuri11.ttf'
opt=subset.Options();opt.flavor='woff2';opt.layout_features=['*'];opt.name_IDs=['*'];opt.notdef_outline=True
f=subset.load_font(src,opt);s=subset.Subsetter(opt);s.populate(text=''.join(sorted(chars)));s.subset(f)
out='assets/fonts/galmuri_sub.woff2';subset.save_font(f,out,opt)
open('assets/fonts/galmuri_chars.txt','w',encoding='utf-8').write(''.join(sorted(chars)))
import os;print(out,os.path.getsize(out),'bytes',len(chars),'chars')

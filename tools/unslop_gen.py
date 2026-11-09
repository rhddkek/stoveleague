#!/usr/bin/env python3
"""v93 (R077) unslop 덮어쓰기 생성기.

src/style.css 를 읽어 src/unslop_gen.css 를 만든다. 원래 규칙은 그대로 두고,
바뀐 값만 `body:not(.ingame)` 아래에 다시 적는다. 경기 중(body.ingame)에는
하나도 적용되지 않으므로 경기 화면은 예전 모양 그대로다.

바꾸는 것
- 굵기 700·800·900·bold → 600 (전광판 글꼴 Black Han Sans 는 굵기가 하나라 400)
- 기울임 → 바로
- 작은 글자의 음수 자간 → 0
- 모서리 3·5 → 4, 7·9 → 8, 11·13 → 12, 15 → 16
- 남색(채도 높은 파랑 계열 어두운 색) → 같은 밝기의 밤색(거의 무채색)
- 주황 → 전광판 노랑, 그 위 흰 글자 → 어두운 글자 (어두운 테마)

다시 돌리면 같은 결과가 나온다: python3 tools/unslop_gen.py
"""
import colorsys
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'style.css')
OUT = os.path.join(ROOT, 'src', 'unslop_gen.css')

GUARD = 'body:not(.ingame)'
DARK = ':root.ea[data-theme="dark"]'
GAME_SEL = re.compile(r'\.gamev')  # 경기 중엔 body.ingame 이 모든 덮어쓰기를 막으므로 이것만 거른다


def strip_comments(s):
    return re.sub(r'/\*.*?\*/', '', s, flags=re.S)


def parse(css):
    """[(media or None, selector, body)] — @keyframes·@font-face 는 건너뜀."""
    out = []
    i, n = 0, len(css)

    def block_end(j):
        d = 0
        while j < n:
            c = css[j]
            if c == '{':
                d += 1
            elif c == '}':
                d -= 1
                if d == 0:
                    return j
            j += 1
        return n

    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        head = css[i:j].strip()
        k = block_end(j)
        body = css[j + 1:k]
        if head.startswith('@media') or head.startswith('@supports'):
            for _, sel, b in parse(body):
                out.append((head, sel, b))
        elif head.startswith('@'):
            pass
        else:
            out.append((None, head, body))
        i = k + 1
    return out


def decls(body):
    res = []
    for part in re.split(r';(?![^(]*\))', body):
        if ':' not in part:
            continue
        p, v = part.split(':', 1)
        p, v = p.strip(), v.strip()
        if p:
            res.append((p, v))
    return res


# ---- 색 ----
def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[k:k + 2], 16) for k in (0, 2, 4))


def to_hex(rgb):
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(c))) for c in rgb)


def de_navy(rgb):
    """채도 높은 어두운 파랑 → 같은 밝기의 밤색(살짝 푸른 무채색). 아니면 None."""
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    hd = h * 360
    if 205 <= hd <= 235 and s > 0.28 and l < 0.5:
        # 밤색 사다리 (어두운 테마 기준): 바탕 #0f1115, 카드 #171a20, 올린 면 #20232b
        nl = l * 0.78 + 0.01
        nr, ng, nb = colorsys.hls_to_rgb(225 / 360, nl, 0.12)
        return (nr * 255, ng * 255, nb * 255)
    return None


ORANGE = {(255, 122, 26), (217, 113, 28), (242, 140, 40), (255, 156, 50), (255, 171, 102)}


def recolor(v, dark_ctx):
    changed = False

    def rep_hex(m):
        nonlocal changed
        rgb = hex_rgb(m.group(0))
        nv = de_navy(rgb)
        if nv:
            changed = True
            return to_hex(nv)
        return m.group(0)

    def rep_rgb(m):
        nonlocal changed
        nums = [float(x) for x in re.findall(r'[\d.]+', m.group(1))]
        if len(nums) < 3:
            return m.group(0)
        nv = de_navy(nums[:3])
        if nv:
            changed = True
            a = ',%s' % (m.group(1).split(',')[3].strip()) if len(nums) > 3 else ''
            return 'rgba(%d,%d,%d%s)' % (round(nv[0]), round(nv[1]), round(nv[2]), a) if a else 'rgb(%d,%d,%d)' % tuple(round(c) for c in nv)
        return m.group(0)

    nv = re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', rep_hex, v)
    nv = re.sub(r'rgba?\(([^)]*)\)', rep_rgb, nv)
    return nv if changed else None


RAD = {'3px': '4px', '5px': '4px', '7px': '8px', '9px': '8px', '11px': '12px', '13px': '12px', '15px': '16px', '18px': '16px', '20px': '16px'}


def guard(sel):
    """선택자 하나에 `body:not(.ingame)` 를 끼운다. 못 끼우면 None."""
    s = sel.strip()
    if not s or 'html' in re.findall(r'(?:^|\s)(html)\b', s):
        return None
    if re.match(r'^html\b', s):
        return None
    m = re.search(r'(^|\s|>)body(?=[\s.:#\[>]|$)', s)
    if m:
        a = m.end()
        return s[:a] + ':not(.ingame)' + s[a:]
    if s.startswith('body'):
        return None
    m = re.match(r'^((?::root|\.ea|\[data-theme)[^\s>+~]*)(\s*>?\s*)(.*)$', s)
    if m:
        first, rest = m.group(1), m.group(3)
        if not rest:
            return first + ' ' + GUARD  # 토큰 덩어리 → body 에 다시 정의
        return first + ' ' + GUARD + ' ' + rest
    return GUARD + ' ' + s


def theme_of(sel, media=None):
    s = sel.replace(':not([data-theme="light"])', '')
    if 'data-theme="light"' in s:
        return 'light'
    if 'data-theme="dark"' in s or (media and 'prefers-color-scheme:dark' in media.replace(' ', '')):
        return 'dark'
    return 'any'


def root_only(sel):
    return re.match(r'^(?::root|\.ea|\[data-theme)[^\s>+~]*$', sel.strip()) is not None


def dark_guard(sel, media):
    """색 바꿈은 어두운 테마에서만: 밝은 테마 규칙은 건너뛰고, 테마 없는 규칙엔 어두운 테마를 붙인다."""
    t = theme_of(sel, media)
    if t == 'light':
        return None
    g = guard(sel)
    if not g:
        return None
    if t == 'any':
        m = re.match(r'^((?::root|\.ea|\[data-theme)[^\s>+~]*)\s+(.*)$', g)
        if m:
            return DARK + ' ' + m.group(2)
        return DARK + ' ' + g
    return g


def main():
    css = strip_comments(open(SRC, encoding='utf8').read())
    rules = parse(css)
    out_any, out_dark, out_tok = [], [], []
    stats = {'weight': 0, 'italic': 0, 'track': 0, 'radius': 0, 'navy': 0, 'accent': 0}
    # 같은 선택자의 바탕을 뒤에서 다시 정하면 「주황 바탕 + 흰 글자」 고침은 하지 않는다
    last_bg = {}
    for idx, (media, sel, body) in enumerate(rules):
        if re.search(r'(^|;)\s*background(-color)?\s*:', body):
            for x in re.split(r',(?![^(]*\))', sel):
                last_bg[x.strip()] = idx
    for idx, (media, sel, body) in enumerate(rules):
        sels = [x.strip() for x in re.split(r',(?![^(]*\))', sel) if x.strip()]
        sels = [x for x in sels if not GAME_SEL.search(x) and 'ingame' not in x and '.gamev' not in x]
        if not sels:
            continue
        ds = decls(body)
        dmap = {p: v for p, v in ds}
        display = 'f-display' in dmap.get('font-family', '') or 'Black Han Sans' in dmap.get('font-family', '')
        fs = re.match(r'([\d.]+)px', dmap.get('font-size', ''))
        fsz = float(fs.group(1)) if fs else 14
        ch, chd, cha = [], [], []
        for p, v in ds:
            imp = '!important' if '!important' in v else ''
            base = v.replace('!important', '').strip()
            if p == 'font-weight' and base in ('700', '800', '900', 'bold', 'bolder'):
                ch.append((p, ('400' if display else '600') + imp)); stats['weight'] += 1
            elif p == 'font-style' and base == 'italic':
                ch.append((p, 'normal' + imp)); stats['italic'] += 1
            elif p == 'letter-spacing' and base.startswith('-') and fsz < 28:
                ch.append((p, '0' + imp)); stats['track'] += 1
            elif p == 'border-radius' or p.startswith('border-') and p.endswith('-radius'):
                parts = base.split()
                np_ = [RAD.get(x, x) for x in parts]
                if np_ != parts:
                    ch.append((p, ' '.join(np_) + imp)); stats['radius'] += 1
            if p.startswith('--') or any(k in p for k in ('background', 'border', 'color', 'shadow', 'outline', 'fill', 'stroke')):
                if 'radius' not in p:
                    rc = recolor(base, True)
                    if rc:
                        chd.append((p, rc + imp)); stats['navy'] += 1
        # 주황 바탕 + 흰 글자 → 어두운 테마에선 노랑 바탕 + 어두운 글자
        bg = (dmap.get('background', '') + ' ' + dmap.get('background-color', '')).replace('!important', '')
        colr = dmap.get('color', '').replace('!important', '').strip()
        if re.search(r'var\(--(orange|navy3|gold)\)|#ff7a1a|#f3c14b|#e0b24a', bg) and colr in ('#fff', '#ffffff', 'white', 'var(--on-navy)', 'var(--card)'):
            imp = '!important' if '!important' in dmap.get('color', '') else ''
            cha.append(('color', '#15171c' + imp)); stats['accent'] += 1
        # 테마 토큰 덩어리(:root…{--x}): body 에 통째로 다시 정의해야 테마 간 우선순위가 그대로 유지된다
        if all(root_only(x) for x in sels) and any(p.startswith('--') for p, _ in ds):
            full = []
            for p, v in ds:
                if not p.startswith('--'):
                    continue
                nv = v
                if theme_of(sels[0], media) != 'light':
                    rc = recolor(v.replace('!important', '').strip(), True)
                    if rc:
                        nv = rc
                full.append((p, nv))
            gs = [g for g in (guard(x) for x in sels) if g]
            out_tok.append((media, ','.join(gs), full))
            continue
        if ch:
            gs = [g for g in (guard(x) for x in sels) if g]
            if gs:
                out_any.append((media, ','.join(gs), ch))
        if chd:
            ds_sel = [g for g in (dark_guard(x, media) for x in sels) if g]
            if ds_sel:
                out_dark.append((media, ','.join(ds_sel), chd))
        if cha:
            ok_sels = [x for x in sels if last_bg.get(x, idx) <= idx]
            ds_sel = [g for g in (dark_guard(x, media) for x in ok_sels) if g]
            if ds_sel:
                out_dark.append((media, ','.join(ds_sel), cha))

    lines = ['/* v93 (R077) unslop — tools/unslop_gen.py 가 만든 파일. 직접 고치지 말고 생성기를 다시 돌린다.',
             '   style.css 의 규칙 중 바뀐 값만, 경기 밖(body:not(.ingame))에서만 덮어쓴다. */']

    def emit(items):
        cur = None
        for media, sel, ch in items:
            if media != cur:
                if cur:
                    lines.append('}')
                if media:
                    lines.append(media + '{')
                cur = media
            lines.append('%s{%s}' % (sel, ';'.join('%s:%s' % kv for kv in ch)))
        if cur:
            lines.append('}')

    emit(out_tok)
    emit(out_any)
    emit(out_dark)
    open(OUT, 'w', encoding='utf8').write('\n'.join(lines) + '\n')
    print('unslop_gen.css', len(out_tok) + len(out_any) + len(out_dark), 'rules', stats, file=sys.stderr)


if __name__ == '__main__':
    main()

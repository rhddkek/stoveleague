# EA 프로야구 2011 PC 실행기 (분석·개인 플레이용)
# 사용: python play.py [EA프로야구2011.apk 경로]
#  - 처음 한 번 APK에서 실행 파일·데이터를 꺼내 ea_data 폴더에 둡니다.
#  - 휴대폰용 ARM 코드를 PC에서 흉내 내어 돌리므로 느립니다(메뉴는 충분, 경기 장면은 느림).
import os, sys, zipfile, pickle, time, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'ea_data')
NEED = {'lib/armeabi/libEA_BASEBALL2011MiAn.so': 'libEA_BASEBALL2011MiAn.so',
        'assets/data.vfs.mp3': 'data.vfs.mp3'}


def prepare(apk=None):
    if all(os.path.exists(os.path.join(DATA, v)) for v in NEED.values()):
        return
    if not apk:
        cands = glob.glob(os.path.join(HERE, '*.apk')) + glob.glob(os.path.join(HERE, '*.zip'))
        apk = cands[0] if cands else None
    if not apk:
        apk = input('EA 프로야구 2011 APK 파일 경로를 입력하세요 (파일을 이 창에 끌어다 놓아도 됩니다): ').strip().strip('"')
    os.makedirs(DATA, exist_ok=True)
    z = zipfile.ZipFile(apk)
    names = z.namelist()
    if not any(n in names for n in NEED):  # APK를 한 번 더 압축한 zip이면 안쪽 APK를 연다
        inner = [n for n in names if n.lower().endswith('.apk')]
        if not inner: sys.exit('APK 안에서 게임 파일을 찾지 못했습니다.')
        import io
        z = zipfile.ZipFile(io.BytesIO(z.read(inner[0])))
    for src, dst in NEED.items():
        with open(os.path.join(DATA, dst), 'wb') as f: f.write(z.read(src))
    print('게임 파일을 꺼냈습니다:', DATA)


prepare(sys.argv[1] if len(sys.argv) > 1 else None)

import pygame
from PIL import Image
from game import Game, screen, BASE, HEAP

SCALE = 2
W, H = 240, 320
KEYS = {pygame.K_UP: -1, pygame.K_DOWN: -2, pygame.K_LEFT: -3, pygame.K_RIGHT: -4,
        pygame.K_RETURN: -5, pygame.K_KP_ENTER: -5, pygame.K_SPACE: -5, pygame.K_z: -5,
        pygame.K_BACKSPACE: -16, pygame.K_ESCAPE: -16, pygame.K_x: -16,
        pygame.K_KP0: 48, pygame.K_KP1: 49, pygame.K_KP2: 50, pygame.K_KP3: 51, pygame.K_KP4: 52,
        pygame.K_KP5: 53, pygame.K_KP6: 54, pygame.K_KP7: 55, pygame.K_KP8: 56, pygame.K_KP9: 57}
for d in range(10): KEYS[pygame.K_0 + d] = 48 + d
KEYS[pygame.K_c] = 35        # 「#」 (전체계약·SKIP·트레이드 등)
KEYS[pygame.K_v] = 42        # 「*」
KEYS[pygame.K_HASH] = 35; KEYS[pygame.K_ASTERISK] = 42

DS, DL = BASE + 0x1e2b70, 0x3802c + 0x40   # 게임 전역 변수 영역


def save_state(g, path):
    e = g.e
    st = {'ds': bytes(e.uc.mem_read(DS, DL)), 'heap': bytes(e.uc.mem_read(HEAP, e.heap - HEAP)),
          'hp': e.heap, 't': e.t, 'res': e.res_by_id, 'alloc': e.alloc, 'freel': e.freel, 'errno': getattr(e, '_errno', None)}
    with open(path, 'wb') as f: pickle.dump(st, f)


def load_state(g, path):
    e = g.e
    with open(path, 'rb') as f: st = pickle.load(f)
    e.uc.mem_write(DS, st['ds']); e.uc.mem_write(HEAP, st['heap'])
    e.heap = st['hp']; e.t = st['t']; e.res_by_id = st['res']; e.alloc = st.get('alloc', {}); e.freel = st.get('freel', {})
    if st.get('errno'): e._errno = st['errno']


def main():
    pygame.init()
    win = pygame.display.set_mode((W * SCALE, H * SCALE))
    pygame.display.set_caption('EA 프로야구 2011 (PC 실행기)')
    win.fill((0, 0, 0)); pygame.display.flip()
    print('게임을 준비하는 중… (10초 정도)')
    g = Game()
    g.set(0); g.tick(3)
    turbo = 1
    msg, msg_t = '', 0
    font = pygame.font.SysFont('malgungothic,applesdgothicneo,nanumgothic,arial', 16)
    save_dir = os.path.join(HERE, 'saves'); os.makedirs(save_dir, exist_ok=True)
    clock = pygame.time.Clock()
    run = True
    script = [x for x in os.environ.get('EA2011_TEST', '').split(',') if x]
    frame = 0
    while run:
        frame += 1
        if script and frame % 4 == 0:
            k = script.pop(0)
            if k == 'Q': save_state(g, os.path.join(save_dir, 'quick.sav')); pygame.image.save(win, os.path.join(save_dir, 'test.png')); run = False; continue
            kc = {'U': pygame.K_UP, 'D': pygame.K_DOWN, 'L': pygame.K_LEFT, 'R': pygame.K_RIGHT, 'O': pygame.K_RETURN, 'X': pygame.K_ESCAPE, 'W': None, 'F': pygame.K_F9}[k]
            if kc: pygame.event.post(pygame.event.Event(pygame.KEYDOWN, key=kc)); pygame.event.post(pygame.event.Event(pygame.KEYUP, key=kc))
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT:
                save_state(g, os.path.join(save_dir, 'autosave.sav')); run = False
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_F5:
                    save_state(g, os.path.join(save_dir, 'quick.sav')); msg, msg_t = '저장했습니다 (F9로 불러오기)', time.time()
                elif ev.key == pygame.K_F9:
                    p = os.path.join(save_dir, 'quick.sav')
                    if os.path.exists(p): load_state(g, p); msg = '불러왔습니다'
                    else: msg = '저장 파일이 없습니다'
                    msg_t = time.time()
                elif ev.key == pygame.K_F10:
                    p = os.path.join(save_dir, 'autosave.sav')
                    if os.path.exists(p): load_state(g, p); msg = '자동 저장을 불러왔습니다'
                    else: msg = '자동 저장이 없습니다'
                    msg_t = time.time()
                elif ev.key == pygame.K_F12:
                    p = os.path.join(save_dir, time.strftime('shot_%Y%m%d_%H%M%S.png'))
                    pygame.image.save(win, p); msg, msg_t = '화면 저장: ' + os.path.basename(p), time.time()
                elif ev.key == pygame.K_TAB:
                    turbo = 1 if turbo > 1 else 4; msg, msg_t = f'빠르게 x{turbo}', time.time()
                elif ev.key in KEYS:
                    g.e.call('MainFrame_KeyPressed', g.mf, KEYS[ev.key] & 0xffffffff)
            elif ev.type == pygame.KEYUP and ev.key in KEYS:
                g.e.call('MainFrame_KeyReleased', g.mf, KEYS[ev.key] & 0xffffffff)
        for _ in range(turbo):
            g.e.call('MainFrame_Process', g.mf)
        g.e.call('MainFrame_Render', g.mf)
        k = g.e.kernel; fb = k + 1248
        w, h, bpl, bpp, ptr = [g.e.u32(fb + 4 * i) for i in range(5)]
        h = min(h, H)
        raw = bytes(g.e.uc.mem_read(ptr, bpl * h))
        img = Image.frombuffer('RGB', (w, h), raw, 'raw', 'BGR;16', bpl, 1).resize((w * SCALE, h * SCALE), Image.NEAREST)
        win.blit(pygame.image.fromstring(img.tobytes(), img.size, 'RGB'), (0, 0))
        if msg and time.time() - msg_t < 2.5:
            t = font.render(msg, True, (255, 255, 255), (20, 40, 80))
            win.blit(t, (8, 8))
        pygame.display.flip()
        clock.tick(30)
    pygame.quit()


if __name__ == '__main__':
    main()

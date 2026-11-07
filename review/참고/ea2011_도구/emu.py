# EA 프로야구 2011 libEA_BASEBALL2011MiAn.so 화면 함수 에뮬레이터 (분석용)
import struct, bisect, sys, os, re
from unicorn import *
from unicorn.arm_const import *
from elftools.elf.elffile import ELFFile
from elftools.elf.relocation import RelocationSection

HERE = os.path.dirname(os.path.abspath(__file__))
SO = os.path.join(HERE, '../ea_x/apk/lib/armeabi/libEA_BASEBALL2011MiAn.so')
VFS = os.path.join(HERE, '../ea_x/apk/assets/data.vfs.mp3')
BASE = 0x40000000
STUB = 0x60000000
STACK = 0x7f000000; STACK_SZ = 0x200000
HEAP = 0x50000000; HEAP_SZ = 0x0F000000
MAGIC = 0x6fff0000


class Emu:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.data = open(SO, 'rb').read()
        self.elf = ELFFile(open(SO, 'rb'))
        uc = Uc(UC_ARCH_ARM, UC_MODE_ARM)
        self.uc = uc
        # segments
        uc.mem_map(BASE, 0x240000)
        for seg in self.elf.iter_segments():
            if seg['p_type'] == 'PT_LOAD':
                uc.mem_write(BASE + seg['p_vaddr'], seg.data())
        uc.mem_map(STACK, STACK_SZ)
        uc.mem_map(HEAP, HEAP_SZ)
        uc.mem_map(STUB, 0x100000)
        uc.mem_map(MAGIC, 0x1000)
        uc.mem_map(0x0, 0x1000)  # null page: reads 0 (tolerate)
        self.heap = HEAP + 0x1000
        self.alloc = {}; self.freel = {}
        # symbols
        self.sym = {}; self.addr2 = []
        for s in self.elf.get_section_by_name('.dynsym').iter_symbols():
            if s['st_info']['type'] == 'STT_FUNC' and s['st_value']:
                self.sym[s.name] = s['st_value']
            if s['st_info']['type'] == 'STT_OBJECT' and s['st_value']:
                self.sym[s.name] = s['st_value']
        st = self.elf.get_section_by_name('.symtab')
        if st:
            for s in st.iter_symbols():
                if s['st_value'] and s.name:
                    self.sym.setdefault(s.name, s['st_value'])
        self.funcs = sorted((v & ~1, k) for k, v in self.sym.items())
        self.faddrs = [a for a, _ in self.funcs]
        # stubs for imports
        self.stubs = {}; self.stub_by_addr = {}; nxt = STUB
        dynsym = self.elf.get_section_by_name('.dynsym')
        for sec in self.elf.iter_sections():
            if isinstance(sec, RelocationSection):
                for r in sec.iter_relocations():
                    t = r['r_info_type']; off = r['r_offset']
                    if t == 23:  # RELATIVE
                        v = struct.unpack('<I', uc.mem_read(BASE + off, 4))[0]
                        uc.mem_write(BASE + off, struct.pack('<I', (v + BASE) & 0xffffffff))
                    elif t in (21, 22, 2):
                        s = dynsym.get_symbol(r['r_info_sym'])
                        if s['st_shndx'] != 'SHN_UNDEF' and s['st_value']:
                            a = BASE + s['st_value']
                        else:
                            if s.name not in self.stubs:
                                self.stubs[s.name] = nxt; self.stub_by_addr[nxt] = s.name
                                uc.mem_write(nxt, b'\x1e\xff\x2f\xe1')  # bx lr
                                nxt += 8
                            a = self.stubs[s.name]
                        if t == 2:
                            v = struct.unpack('<I', uc.mem_read(BASE + off, 4))[0]
                            a = (a + v) & 0xffffffff
                        uc.mem_write(BASE + off, struct.pack('<I', a))
        # __stack_chk_guard variable
        g = self.stubs.get('__stack_chk_guard')
        self.hooks = {}   # absolute addr -> python fn
        self.calls = []   # recorded draw calls
        self.trace_names = set()
        uc.hook_add(UC_HOOK_CODE, self._hook_stub, begin=STUB, end=STUB + 0x100000)
        uc.hook_add(UC_HOOK_MEM_UNMAPPED, self._hook_bad)
        self.vfs = self._read_vfs()
        self.res_ids = {}; self.res_names = {}
        self._install_libc()
        self.unknown = {}

    # ---------- helpers ----------
    def where(self, pc):
        a = pc - BASE
        i = bisect.bisect_right(self.faddrs, a) - 1
        if i < 0: return hex(pc)
        return f'{self.funcs[i][1]}+{a - self.faddrs[i]:#x}'

    def r(self, n): return self.uc.reg_read(n)
    def arg(self, i):
        if i < 4: return self.uc.reg_read([UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_R2, UC_ARM_REG_R3][i])
        sp = self.uc.reg_read(UC_ARM_REG_SP)
        return self.u32(sp + 4 * (i - 4))
    def sarg(self, i):
        v = self.arg(i); return v - (1 << 32) if v & 0x80000000 else v
    def u32(self, a): return struct.unpack('<I', self.uc.mem_read(a, 4))[0]
    def s32(self, a): v = self.u32(a); return v - (1 << 32) if v & 0x80000000 else v
    def u16(self, a): return struct.unpack('<H', self.uc.mem_read(a, 2))[0]
    def u8(self, a): return self.uc.mem_read(a, 1)[0]
    def w32(self, a, v): self.uc.mem_write(a, struct.pack('<I', v & 0xffffffff))
    def cstr(self, a, n=512):
        if not a: return b''
        out = bytearray()
        while len(out) < n:
            try: b = self.uc.mem_read(a + len(out), 64)
            except UcError: break
            i = b.find(b'\0')
            if i >= 0: out += b[:i]; break
            out += b
        return bytes(out)
    def kstr(self, a): return self.cstr(a).decode('cp949', 'replace')
    def malloc(self, n):
        n = max((n + 15) & ~15, 16)
        fl = self.freel.get(n)
        if fl:
            a = fl.pop()
        else:
            a = self.heap; self.heap += n
            if self.heap > HEAP + HEAP_SZ: raise MemoryError('heap')
        self.alloc[a] = n
        self.uc.mem_write(a, b'\0' * n)
        return a
    def free(self, a):
        n = self.alloc.pop(a, None)
        if n: self.freel.setdefault(n, []).append(a)
    def sa(self, name): return BASE + self.sym[name]

    def hook(self, name, fn):
        a = self.sa(name) & ~1
        self.hooks[a] = fn
        self.uc.hook_add(UC_HOOK_CODE, self._hook_internal, begin=a, end=a)
    def _ret(self, v=0):
        uc = self.uc
        if v is not None: uc.reg_write(UC_ARM_REG_R0, v & 0xffffffff)
        lr = uc.reg_read(UC_ARM_REG_LR)
        uc.reg_write(UC_ARM_REG_PC, lr & ~1)
    def _hook_internal(self, uc, addr, size, ud):
        fn = self.hooks.get(addr)
        if fn: self._ret(fn(self))
    def _hook_stub(self, uc, addr, size, ud):
        name = self.stub_by_addr.get(addr)
        if name is None: return
        fn = self.libc.get(name)
        if fn is None:
            self.unknown[name] = self.unknown.get(name, 0) + 1
            self._ret(0); return
        self._ret(fn(self))
    def _hook_bad(self, uc, access, addr, size, value, ud):
        pc = uc.reg_read(UC_ARM_REG_PC)
        print(f'!! bad mem {access} at {addr:#x} pc={self.where(pc)} lr={self.where(uc.reg_read(UC_ARM_REG_LR))}')
        return False

    def call(self, name, *args, maxi=50_000_000):
        uc = self.uc
        a = self.sa(name) if isinstance(name, str) else name
        regs = [UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_R2, UC_ARM_REG_R3]
        sp = STACK + STACK_SZ - 0x1000
        extra = list(args[4:])
        sp -= 4 * len(extra)
        for i, v in enumerate(extra): self.w32(sp + 4 * i, v)
        uc.reg_write(UC_ARM_REG_SP, sp)
        for i, v in enumerate(args[:4]): uc.reg_write(regs[i], v & 0xffffffff)
        uc.reg_write(UC_ARM_REG_LR, MAGIC)
        try:
            uc.emu_start(a, MAGIC, count=maxi)
        except UcError as e:
            pc = uc.reg_read(UC_ARM_REG_PC)
            print(f'!! {e} in {name} pc={self.where(pc)} lr={self.where(uc.reg_read(UC_ARM_REG_LR))}')
            return None
        return uc.reg_read(UC_ARM_REG_R0)

    # ---------- VFS ----------
    def _read_vfs(self):
        b = open(VFS, 'rb').read(); o = 0; ent = {}
        while o + 8 <= len(b):
            h, n = struct.unpack('<II', b[o:o + 8])
            if n == 0 or o + 8 + n > len(b): break
            ent[h] = (o + 8, n); o += 8 + n
        self.vfsb = b
        return ent

    # ---------- libc ----------
    def _install_libc(self):
        L = {}
        def memcpy(e):
            d, s, n = e.arg(0), e.arg(1), e.arg(2)
            if n: e.uc.mem_write(d, bytes(e.uc.mem_read(s, n)))
            return d
        def memset(e):
            d, c, n = e.arg(0), e.arg(1), e.arg(2)
            if n: e.uc.mem_write(d, bytes([c & 0xff]) * n)
            return d
        def strlen(e): return len(e.cstr(e.arg(0), 100000))
        def strcpy(e):
            s = e.cstr(e.arg(1), 100000); e.uc.mem_write(e.arg(0), s + b'\0'); return e.arg(0)
        def strncpy(e):
            s = e.cstr(e.arg(1), e.arg(2))[:e.arg(2)]; e.uc.mem_write(e.arg(0), s.ljust(e.arg(2), b'\0')); return e.arg(0)
        def strcat(e):
            d = e.arg(0); s = e.cstr(d, 100000); t = e.cstr(e.arg(1), 100000); e.uc.mem_write(d + len(s), t + b'\0'); return d
        def strcmp(e):
            a, b = e.cstr(e.arg(0), 100000), e.cstr(e.arg(1), 100000); return (a > b) - (a < b)
        def strncmp(e):
            n = e.arg(2); a, b = e.cstr(e.arg(0), n)[:n], e.cstr(e.arg(1), n)[:n]; return (a > b) - (a < b)
        def strstr(e):
            a = e.cstr(e.arg(0), 100000); i = a.find(e.cstr(e.arg(1), 100000)); return 0 if i < 0 else e.arg(0) + i
        def strdup(e):
            s = e.cstr(e.arg(0), 100000); p = e.malloc(len(s) + 1); e.uc.mem_write(p, s + b'\0'); return p
        def malloc(e): return e.malloc(e.arg(0))
        def calloc(e): return e.malloc(e.arg(0) * e.arg(1))
        def free(e):
            e.free(e.arg(0)); return 0
        def znwj(e): return e.malloc(e.arg(0))
        def vsnprintf(e):
            buf, n, fmt, va = e.arg(0), e.arg(1), e.arg(2), e.arg(3)
            s = e.format(e.cstr(fmt, 4096), va)
            s = s[:max(0, n - 1)]
            e.uc.mem_write(buf, s + b'\0'); return len(s)
        def errno(e):
            if not hasattr(e, '_errno'): e._errno = e.malloc(4)
            return e._errno
        def ftime(e): return 0
        L.update(memcpy=memcpy, memset=memset, strlen=strlen, strcpy=strcpy, strncpy=strncpy, strcat=strcat,
                 strcmp=strcmp, strncmp=strncmp, strstr=strstr, strdup=strdup, malloc=malloc, calloc=calloc,
                 free=free, _Znwj=znwj, _ZdlPv=free, vsnprintf=vsnprintf, __errno=errno, ftime=ftime,
                 __android_log_print=lambda e: 0, pthread_mutex_lock=lambda e: 0, pthread_mutex_unlock=lambda e: 0,
                 __stack_chk_fail=lambda e: 0)
        self.libc = L

    def format(self, fmt, va):
        out = bytearray(); i = 0; ap = va
        while i < len(fmt):
            c = fmt[i]
            if c != 0x25: out.append(c); i += 1; continue
            m = re.match(rb'%([-+ 0#]*)(\d*|\*)(?:\.(\d+|\*))?(l|h|ll)?([diouxXcsp%])', fmt[i:])
            if not m: out.append(c); i += 1; continue
            fl, wd, pr, ln, cv = m.groups(); i += m.end()
            if cv == b'%': out += b'%'; continue
            if wd == b'*': wd = str(self.s32(ap)).encode(); ap += 4
            if pr == b'*': pr = str(self.s32(ap)).encode(); ap += 4
            spec = '%' + (fl or b'').decode() + (wd or b'').decode() + (('.' + pr.decode()) if pr else '')
            if cv == b's':
                v = self.cstr(self.u32(ap)); ap += 4
                w = int(wd) if wd else 0
                if pr: v = v[:int(pr)]
                v = v.rjust(w) if b'-' not in (fl or b'') else v.ljust(w)
                out += v
            elif cv == b'c':
                out.append(self.u32(ap) & 0xff); ap += 4
            else:
                v = self.u32(ap); ap += 4
                if cv in b'di': v = v - (1 << 32) if v & 0x80000000 else v
                out += (spec + ('d' if cv in b'diu' else cv.decode())).replace('p', 'x') .__mod__(v).encode()
        return bytes(out)


# ---------------- 게임 화면 환경 ----------------
def djb2(s):
    h = 5381
    for c in s: h = (h * 33 + c) & 0xffffffff
    return h

def setup(W=240, H=320, verbose=False):
    e = Emu(verbose)
    e.res_by_id = {}
    def getResID(e):
        name = e.cstr(e.arg(0)); h = djb2(name)
        if h not in e.vfs:
            if verbose: print('  missing res', name)
            return 0xfffffff4  # -12
        rid = len(e.res_by_id) + 1; e.res_by_id[rid] = (name, h)
        if e.arg(1): e.w32(e.arg(1), e.vfs[h][1])
        return rid
    def getRes(e):
        rid, buf, n = e.arg(0), e.arg(1), e.arg(2)
        if rid not in e.res_by_id: return 0xffffffee
        o, sz = e.vfs[e.res_by_id[rid][1]]
        e.uc.mem_write(buf, e.vfsb[o:o + min(n, sz)]); return min(n, sz)
    e.hook('MC_knlGetResourceID', getResID)
    e.hook('MC_knlGetResource', getRes)
    e.hook('MC_knlPrintk', lambda e: 0)
    e.t=100000
    def ctime(e):
        e.t+=50; e.uc.reg_write(UC_ARM_REG_R1,0); return e.t
    e.hook('MC_knlCurrentTime', ctime)
    k = e.call('_ZN18MIDASKernelManager11getInstanceEv')
    e.kernel = k
    e.call('_ZN18MIDASKernelManager18setWIPIDisplayInfoEiii', k, W, H, 0)
    e.W, e.H = W, H
    return e

def screen(e, path):
    from PIL import Image
    k = e.kernel
    fb = k + 1248
    w, h, bpl, bpp, ptr = [e.u32(fb + 4 * i) for i in range(5)]
    raw = bytes(e.uc.mem_read(ptr, bpl * h))
    if bpp == 16:
        im = Image.frombuffer('RGB', (w, h), raw, 'raw', 'BGR;16', bpl, 1)
    else:
        im = Image.frombuffer('RGBA', (w, h), raw, 'raw', 'BGRA', bpl, 1).convert('RGB')
    im.save(path); return im

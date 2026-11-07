# 포스트시즌: 감독모드로 시작 → 첫 이닝 교대 화면에서 AI SIMULATION 선택 → 시즌 끝·스토브리그까지
from game import *
import pickle,os,sys,time,hashlib
DS,DL=BASE+0x1e2b70,0x3802c+0x40
def save_state(g,path):
    e=g.e;pickle.dump({'ds':bytes(e.uc.mem_read(DS,DL)),'heap':bytes(e.uc.mem_read(HEAP,e.heap-HEAP)),'hp':e.heap,'t':e.t,'res':e.res_by_id,'alloc':e.alloc,'freel':e.freel,'errno':getattr(e,'_errno',None)},open(path,'wb'))
g=Game();e=g.e
st=pickle.load(open(sys.argv[1],'rb'));e.uc.mem_write(DS,st['ds']);e.uc.mem_write(HEAP,st['heap']);e.heap=st['hp'];e.t=st['t'];e.res_by_id=st['res'];e.alloc=st.get('alloc',{});e.freel=st.get('freel',{})
g.tick(2)
os.makedirs('post',exist_ok=True);M=e.call('MenuFrame_Get')
seen=set();n=0;t0=time.time()
def shot(tag):
    global n;g.shot(f'post/{n:03d}_{tag}_{g.state()}.png');n+=1
def h():
    ptr=e.u32(e.kernel+1248+16);return hashlib.md5(bytes(e.uc.mem_read(ptr,480*320))).hexdigest()
lastst=None
for step in range(6000):
    s=g.state()
    if s!=lastst: shot('new');lastst=s;print(f'{time.time()-t0:.0f}s state {s}',flush=True)
    if s in (1277,1201) :
        if s==1201: save_state(g,'post/after.sav')
        cur=e.u8(M+8);cur=cur-256 if cur>127 else cur
        if s==1277:
            for k in [DOWN]*((1-cur)%2)+[OK]: g.key(k)
            continue
    if s==85:
        save_state(g,'post/stove.sav');shot('stove');print('stove reached',flush=True);break
    if s in (1278,1279):
        g.key(OK,2)
        if step%60==0: shot('g')
        continue
    hh=h()
    if hh not in seen: seen.add(hh);shot('x')
    g.key(OK)
print('end',g.state())

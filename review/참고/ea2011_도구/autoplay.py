# 마스터 모드 한 시즌 자동 진행 (시뮬레이션) + 처음 보는 화면 캡처 + 중간 저장
from game import *
import pickle,hashlib,os,sys,time,json
from PIL import Image
DS,DL=BASE+0x1e2b70,0x3802c+0x40
def save_state(g,path):
    e=g.e;st={'ds':bytes(e.uc.mem_read(DS,DL)),'heap':bytes(e.uc.mem_read(HEAP,e.heap-HEAP)),'hp':e.heap,'t':e.t,'res':e.res_by_id,'alloc':e.alloc,'freel':e.freel,'errno':getattr(e,'_errno',None)}
    pickle.dump(st,open(path,'wb'))
def load_state(g,path):
    e=g.e;st=pickle.load(open(path,'rb'));e.uc.mem_write(DS,st['ds']);e.uc.mem_write(HEAP,st['heap']);e.heap=st['hp'];e.t=st['t'];e.res_by_id=st['res'];e.alloc=st.get('alloc',{});e.freel=st.get('freel',{})
    if st.get('errno'):e._errno=st['errno']
os.makedirs('season',exist_ok=True);os.makedirs('season/shots',exist_ok=True)
g=Game();e=g.e
if len(sys.argv)>1 and os.path.exists(sys.argv[1]): load_state(g,sys.argv[1]);g.tick(2)
else:
    g.set(0);g.tick(3)
    # PLAYBALL → 마스터모드 → 팀 선택 OK
    for k in [OK,DOWN,OK]: g.key(k)
    print('state',g.state(),flush=True)
    g.shot('season/shots/start.png')
    g.key(OK)
log=open('season/log.txt','a');seen={};games=int(os.environ.get('G0','0'));stuck=0;last=None;t0=time.time()
def snap(tag):
    im=g.shot(f'season/shots/{tag}.png');return im
def h(): 
    k=e.kernel;fb=k+1248;ptr=e.u32(fb+16);return hashlib.md5(bytes(e.uc.mem_read(ptr,480*320))).hexdigest()
MAXG=int(os.environ.get('MAXG','200'))
for step in range(30000):
    s=g.state();hh=h()
    key=(s,hh)
    if s not in seen: seen[s]=0
    if seen[s]<3 and hh not in [x for x in seen.get(('h',s),[])]:
        seen[s]+=1;seen.setdefault(('h',s),[]).append(hh);snap(f'{s}_{seen[s]}_g{games}')
        log.write(f'{time.time()-t0:.0f}s game{games} new screen state {s}\n');log.flush()
    if s==1201:
        M=e.call('MenuFrame_Get');cur=e.u8(M+8);cur=cur-256 if cur>127 else cur
        for k in [DOWN]*((5-cur)%6)+[OK]: g.key(k)
        if g.state()==1207:
            cur=e.u8(M+8);cur=cur-256 if cur>127 else cur
            for k in [DOWN]*((1-cur)%3)+[OK]: g.key(k)
            games+=1
            save_state(g,'season/cur.sav')
            if games%10==0:
                save_state(g,f'season/g{games:03d}.sav');log.write(f'{time.time()-t0:.0f}s saved g{games}\n');log.flush();print('games',games,time.time()-t0,flush=True)
            if games>=MAXG: break
        continue
    if s==1235 and os.environ.get('STOP1235'):
        save_state(g,'season/npc.sav');break
    if s==1235:
        npc=npc+1 if 'npc' in globals() else 1
        snap(f'npc_{npc}_g{games}')
        for k in [DOWN,DOWN,DOWN,RIGHT,OK]: g.key(k)
        continue
    if s in (85,):
        save_state(g,'season/stove.sav');log.write('stove reached\n');snap('stove_start');break
    if key==last: stuck+=1
    else: stuck=0
    last=key
    g.key(CLR if stuck>=6 and stuck%3==0 else OK)
save_state(g,'season/last.sav')
json.dump({str(k):v for k,v in seen.items() if not isinstance(k,tuple)},open('season/states.json','w'))
print('done games',games,'state',g.state(),time.time()-t0)

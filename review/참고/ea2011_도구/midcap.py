# 저장 상태에서 홈 메뉴를 정확히 골라 들어가 캡처: python3 midcap.py save 이름 "메뉴번호:키열;메뉴번호:키열"
from game import *
import pickle,sys,os
sav,name,plan=sys.argv[1],sys.argv[2],sys.argv[3]
os.makedirs('cap/'+name,exist_ok=True)
g=Game();e=g.e
DS,DL=BASE+0x1e2b70,0x3802c+0x40;st=pickle.load(open(sav,'rb'));e.uc.mem_write(DS,st['ds']);e.uc.mem_write(HEAP,st['heap']);e.heap=st['hp'];e.t=st['t'];e.res_by_id=st['res'];e.alloc=st.get('alloc',{});e.freel=st.get('freel',{})
g.tick(2)
for _ in range(6):
    if g.state()==1201: break
    g.key(OK)
M=e.call('MenuFrame_Get')
K={'U':UP,'D':DOWN,'L':LEFT,'R':RIGHT,'O':OK,'C':CLR,'H':ord('#'),'S':ord('*')}
n=0
def shot(lab):
    global n;g.shot(f'cap/{name}/{n:02d}_{lab}_{g.state()}.png');n+=1
for part in plan.split(';'):
    idx,seq=part.split(':')
    # 홈으로
    for _ in range(6):
        if g.state()==1201: break
        g.key(CLR)
    cur=e.u8(M+8);cur=cur-256 if cur>127 else cur
    for _ in range((int(idx)-cur)%6): g.key(DOWN)
    g.key(OK);shot('m'+idx)
    for k in seq.split(','):
        if not k: continue
        if k.startswith('t'): g.tick(int(k[1:]));continue
        g.key(K[k]);shot(k)
print('done',n)

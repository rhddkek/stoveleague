from game import *
import json
g=Game();e=g.e
e.call('MF_SetAllClearTeam');g.set(1200);g.tick(3);g.key(OK);g.tick(3)
for k in [DOWN,DOWN,OK,OK,DOWN,DOWN]: g.key(k)
DS,DL=BASE+0x1e2b70,0x3802c+0x40
def snap(): return (bytes(e.uc.mem_read(DS,DL)),bytes(e.uc.mem_read(HEAP,e.heap-HEAP)),e.heap)
def restore(s): e.uc.mem_write(DS,s[0]);e.uc.mem_write(HEAP,s[1]);e.heap=s[2]
msgs=[]
a=e.sa('PM_OpenDefaultPopup')&~1
def pop(uc,ad,sz,ud):
    for i in range(4):
        v=e.arg(i)
        if 0x40000000<=v<0x60000000 or 0x7f000000<=v<0x7f200000:
            t=e.cstr(v,200)
            if len(t)>6: msgs.append(t.decode('cp949','replace'));break
e.uc.hook_add(UC_HOOK_CODE,pop,begin=a,end=a)
S0=snap();res=[]
for i in range(8):
  for j in range(8):
    restore(S0);msgs.clear()
    g.key(OK)  # 트레이드 화면 진입
    for _ in range(i): g.key(DOWN)
    g.key(OK);g.key(RIGHT)
    for _ in range(j): g.key(DOWN)
    g.key(OK);g.key(ord('#'));g.key(OK);g.tick(2)
    res.append({'my':i,'their':j,'msgs':list(msgs)});print(i,j,[m[:60] for m in msgs])
json.dump(res,open('trade_samples.json','w'),ensure_ascii=False,indent=0)

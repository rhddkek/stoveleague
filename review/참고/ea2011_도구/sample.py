from game import *
import json,sys
g=Game();e=g.e
e.call('MF_SetAllClearTeam');g.set(1200);g.tick(3);g.key(OK);g.tick(3)
e.call('MS_SetStoveLeague');g.set(85);g.tick(3);g.key(OK);g.key(OK)
r4=(0x101374+8+e.u32(BASE+0x1017f0))&0xffffffff
T=e.u32(BASE+((r4+e.u32(BASE+0x1017f8))&0xffffffff)); PPg=BASE+((r4+e.u32(BASE+0x1017f4))&0xffffffff)
M=e.call('MenuFrame_Get')
import struct
def s16(a):v=e.u16(a);return v-65536 if v&0x8000 else v
def s8(a):v=e.u8(a);return v-256 if v&0x80 else v
res=[]
tab=sys.argv[1] if len(sys.argv)>1 else 'bat'
if tab=='pit': g.key(RIGHT)
for row in range(12):
    if row: g.key(DOWN)
    for k in [OK,DOWN,DOWN,OK]: g.key(k)
    snap=bytes(e.uc.mem_read(T,0x200)); idx=e.s32(M+10344)&0xff if False else s8(M+10344)
    p=e.u32(PPg); info={'row':row,'idx':idx,'type':e.u8(p),'yr':e.u8(p+0x20),'ovr':e.u8(p+0x23),'name':e.cstr(p+4,20).decode('cp949','replace')}
    off=0 if tab=='bat' else 30
    dem=s16(T+2+2*(idx+off))
    info['demand']=dem
    curve={}
    for pct in range(60,101,5):
        offer=max(1,round(dem*pct/100))
        acc=0;after=[]
        N=60
        for t in range(N):
            e.uc.mem_write(T,snap)
            r=e.call('MS_StoveMoneyAI',offer)
            acc+= (r==1)
        # 2회 연속 거절 시 결과
        e.uc.mem_write(T,snap)
        r1=e.call('MS_StoveMoneyAI',max(1,round(dem*0.5)));d1=s16(T+2+2*(idx+off))
        a1=[s8(T+0x7a+idx) if tab=='bat' else s8(T+0x98+idx), s8(T+122+idx) if tab=='bat' else s8(T+152+idx)]
        r2=e.call('MS_StoveMoneyAI',max(1,round(dem*0.5)));a2=[s8(T+0x7a+idx) if tab=='bat' else s8(T+0x98+idx), s8(T+122+idx) if tab=='bat' else s8(T+152+idx)]
        curve[pct]=acc/N
    info['curve']=curve;info['rej1']=a1;info['rej2']=a2;info['r']=[r1,r2]
    e.uc.mem_write(T,snap)
    res.append(info);print(json.dumps(info,ensure_ascii=False))
    g.key(CLR)
json.dump(res,open(f'money_{tab}.json','w'),ensure_ascii=False)

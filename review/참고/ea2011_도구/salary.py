from game import *
import pickle,sys,json
g=Game();e=g.e
DS,DL=BASE+0x1e2b70,0x3802c+0x40;st=pickle.load(open(sys.argv[1],'rb'));e.uc.mem_write(DS,st['ds']);e.uc.mem_write(HEAP,st['heap']);e.heap=st['hp'];e.t=st['t'];e.res_by_id=st['res'];e.alloc=st.get('alloc',{});e.freel=st.get('freel',{})
pre=[]
r6=(0x103dcc+8+e.u32(BASE+0x1049c8))&0xffffffff
T=e.u32(BASE+((r6+e.u32(BASE+0x1049cc))&0xffffffff)); P=e.u32(BASE+((r6+e.u32(BASE+0x1049d0))&0xffffffff))
def s8(a):v=e.u8(a);return v-256 if v&0x80 else v
def s16(a):v=e.u16(a);return v-65536 if v&0x8000 else v
def s8_(a):v=e.u8(a);return v-256 if v&0x80 else v
before=[(s8_(P+108*i+0x1f)) for i in range(9)]
e.call('MS_SetStoveLeague')
out=[]
for i in range(9):
    p=P+108*i
    name=e.cstr(p+4,16).decode('cp949','replace')
    out.append({'i':i,'ovr':e.u8(p+0x23),'sal':s8(p+0x1f),'grow':s8(p+0x25),'cond':e.call('DT_GetBatStatCondition',p)&0xff,'g2':(e.call('MS_GetBatStatGrowth',p)&0xff),'dem':s16(T+2+2*i),'raw':bytes(e.uc.mem_read(p,0x30)).hex()})
for o,b in zip(out,before): print(o['i'],'ovr',o['ovr'],'sal_before',b,'sal_after',o['sal'],'grow',o['grow'],'cond',o['cond'],'g2',o['g2'],'demand',o['dem'],e.cstr(P+108*o['i']+4,12))
json.dump(out,open('salary_dump.json','w'))

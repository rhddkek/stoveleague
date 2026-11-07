from emu import *
UP,DOWN,LEFT,RIGHT,OK,CLR=-1,-2,-3,-4,-5,-16
class Game:
    def __init__(s,W=240,H=400,verbose=False):
        e=s.e=setup(W,H,verbose);k=e.kernel
        e.call('_ZN18MIDASKernelManager12init2DScreenEv',k);e.call('SetClearExtern');e.call('DM_Initialize');e.call('HF_Initialize',BASE+0x1c7728,5,11,BASE+0x1c7740,10,11);e.call('UM_RandSeed',1234);e.call('UM_SetRandTable')
        s.mf=e.call('MainFrame_Get');e.call('MainFrame_Initialize',s.mf)
        e.hook('DT_SaveFile',lambda e:1)
        e.call('MenuFrame_Initialize');print('LoadAll',e.call('DT_LoadSaveAllFile'));e.call('MenuFrame_SetElementFunc')
        s.M=e.call('MenuFrame_Get')
    def state(s): return s.e.s32(s.M)
    def set(s,st,arg=0): s.e.call('MenuFrame_SetState',st,arg)
    def tick(s,n=1,render=True):
        for i in range(n):
            s.e.call('MainFrame_Process',s.mf)
        if render: s.e.call('MainFrame_Render',s.mf)
    def key(s,k,ticks=3):
        s.e.call('MainFrame_KeyPressed',s.mf,k&0xffffffff);s.e.call('MainFrame_KeyReleased',s.mf,k&0xffffffff);s.tick(1,False)
        s.tick(ticks)
    def shot(s,path,crop=320):
        im=screen(s.e,path)
        if crop: im=im.crop((0,0,240,crop));im.save(path)
        return im

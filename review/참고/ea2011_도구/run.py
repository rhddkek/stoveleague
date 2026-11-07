# 사용: python3 run.py 이름 시작 "키열"   (시작: stove | main)
from game import *
import sys,os
from PIL import Image,ImageDraw
name,start,seq=sys.argv[1],sys.argv[2],sys.argv[3]
os.makedirs('cap/'+name,exist_ok=True)
g=Game();e=g.e
e.call('MF_SetAllClearTeam');g.set(1200);g.tick(3);g.key(OK);g.tick(3)
if start=='stove': e.call('MS_SetStoveLeague');g.set(85);g.tick(3)
elif start.isdigit(): g.set(int(start));g.tick(3)
K={'U':UP,'D':DOWN,'L':LEFT,'R':RIGHT,'O':OK,'C':CLR,'5':ord('5'),'2':ord('2'),'8':ord('8'),'4':ord('4'),'6':ord('6'),'0':ord('0'),'S':ord('*'),'H':ord('#')}
frames=[('start',g.state(),g.shot(f'cap/{name}/00.png'))]
for i,k in enumerate([x for x in seq.split(',') if x]):
    if k.startswith('t'): g.tick(int(k[1:]));continue
    if k.startswith('='): g.set(int(k[1:]));g.tick(3);lab='='+k[1:]
    else: g.key(K[k]);lab=k
    st=g.state();im=g.shot(f'cap/{name}/{i+1:02d}.png');frames.append((lab,st,im));print(i+1,lab,st)
n=len(frames);cols=min(n,6);rows=(n+cols-1)//cols
S=Image.new('RGB',(cols*250,rows*345),'white');d=ImageDraw.Draw(S)
for j,(lab,st,im) in enumerate(frames):
    x,y=(j%cols)*250,(j//cols)*345;S.paste(im,(x+5,y+20));d.text((x+8,y+4),f'{j:02d} key={lab} state={st}',fill='black')
S.save(f'cap/{name}.png');print('saved',f'cap/{name}.png')

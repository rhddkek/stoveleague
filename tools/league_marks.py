# 리그 마크 (v147, R118): 국기는 코드로 정확히 그리고, 방패 테두리 + 야구공 + 방망이를 얹는다. python3 tools/league_marks.py
import math
from PIL import Image, ImageDraw
S=4; N=96; W=N*S
def star(d,cx,cy,r,fill,pts=5,inner=.42,rot=-90):
    P=[]
    for i in range(pts*2):
        a=math.radians(rot+i*180/pts);rr=r if i%2==0 else r*inner
        P.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    d.polygon(P,fill=fill)
def flag(code):
    w,h=300,200;f=Image.new('RGB',(w,h),'#fff');d=ImageDraw.Draw(f)
    if code=='JP':
        d.ellipse((150-60,100-60,150+60,100+60),fill='#bc002d')
    elif code=='KR':
        r=50;cx,cy=150,100;ang=math.degrees(math.atan2(2,3))
        g=Image.new('RGB',(w,h),'#fff');gd=ImageDraw.Draw(g)
        gd.pieslice((cx-r,cy-r,cx+r,cy+r),180,360,fill='#cd2e3a');gd.pieslice((cx-r,cy-r,cx+r,cy+r),0,180,fill='#0047a0')
        gd.ellipse((cx-r,cy-r/2,cx,cy+r/2),fill='#cd2e3a');gd.ellipse((cx,cy-r/2,cx+r,cy+r/2),fill='#0047a0')
        g=g.rotate(-ang,center=(cx,cy),fillcolor='#fff');f.paste(g);d=ImageDraw.Draw(f)
        # 괘 4개 (건 3 · 곤 6 · 감 5 · 리 4) — 줄 수만 맞춘 단순화
        def gwae(ax,ay,rot,rows):
            t=Image.new('RGBA',(60,44),(0,0,0,0));td=ImageDraw.Draw(t)
            for i,br in enumerate(rows):
                y=2+i*15
                if br: td.rectangle((0,y,26,y+9),fill='#000');td.rectangle((34,y,60,y+9),fill='#000')
                else: td.rectangle((0,y,60,y+9),fill='#000')
            t=t.rotate(rot,expand=True,resample=Image.BICUBIC);f.paste(t,(int(ax-t.width/2),int(ay-t.height/2)),t)
        gwae(62,42,-56,[0,0,0]);gwae(238,158,-56,[1,1,1]);gwae(238,42,56,[1,0,1]);gwae(62,158,56,[0,1,0])
    elif code=='US':
        for i in range(13):
            if i%2==0:d.rectangle((0,i*h/13,w,(i+1)*h/13),fill='#b22234')
        d.rectangle((0,0,w*.42,h*7/13),fill='#3c3b6e')
        for r in range(5):
            for c in range(6):star(d,13+c*20,12+r*21,6,'#fff')
    elif code=='TW':
        d.rectangle((0,0,w,h),fill='#fe0000');d.rectangle((0,0,150,100),fill='#000095')
        star(d,75,50,38,'#fff',pts=12,inner=.5);d.ellipse((75-21,50-21,75+21,50+21),fill='#000095');d.ellipse((75-17,50-17,75+17,50+17),fill='#fff')
    elif code=='MX':
        d.rectangle((0,0,100,h),fill='#006847');d.rectangle((200,0,w,h),fill='#ce1126')
        d.ellipse((150-22,100-20,150+22,100+24),fill='#8a5a2b');d.arc((150-28,100-14,150+28,100+34),20,160,fill='#3f7d3a',width=7);d.ellipse((150-9,100-22,150+9,100-6),fill='#5b3a1a')
    elif code=='AU':
        d.rectangle((0,0,w,h),fill='#00008b')
        c=Image.new('RGB',(150,100),'#012169');cd=ImageDraw.Draw(c)
        cd.line((0,0,150,100),fill='#fff',width=20);cd.line((0,100,150,0),fill='#fff',width=20)
        cd.line((0,0,150,100),fill='#c8102e',width=7);cd.line((0,100,150,0),fill='#c8102e',width=7)
        cd.rectangle((58,0,92,100),fill='#fff');cd.rectangle((0,33,150,67),fill='#fff')
        cd.rectangle((65,0,85,100),fill='#c8102e');cd.rectangle((0,40,150,60),fill='#c8102e');f.paste(c,(0,0))
        star(d,75,150,26,'#fff',pts=7,inner=.48)
        for x,y,r in ((225,35,13),(190,90,13),(225,165,13),(262,75,13)):star(d,x,y,r,'#fff',pts=7,inner=.48)
        star(d,243,112,7,'#fff')
    elif code=='CB':   # 도미니카 공화국
        d.rectangle((0,0,130,85),fill='#002d62');d.rectangle((170,0,w,85),fill='#ce1126')
        d.rectangle((0,115,130,h),fill='#ce1126');d.rectangle((170,115,w,h),fill='#002d62')
        d.ellipse((150-11,100-11,150+11,100+11),fill='#2e7d4f');d.rectangle((146,92,154,108),fill='#002d62')
    return f
def shield(m=0):
    c=W/2
    return [(15*S+m,18*S+m),(c,11*S+m*1.2),(W-15*S-m,18*S+m),(W-15*S-m,54*S),(W-21*S-m*.6,72*S-m*.4),(c,90*S-m*1.2),(21*S+m*.6,72*S-m*.4),(15*S+m,54*S)]
def bat(img,ang):
    b=Image.new('RGBA',(W,W),(0,0,0,0));d=ImageDraw.Draw(b);c=W/2
    d.rounded_rectangle((c-5*S,2*S,c+5*S,60*S),radius=5*S,fill='#3a2413');d.rounded_rectangle((c-3*S,50*S,c+3*S,92*S),radius=3*S,fill='#3a2413');d.ellipse((c-5*S,88*S,c+5*S,96*S),fill='#3a2413')
    d.rounded_rectangle((c-3.6*S,3.4*S,c+3.6*S,60*S),radius=4*S,fill='#c98a4b');d.rounded_rectangle((c-1.8*S,50*S,c+1.8*S,91*S),radius=2*S,fill='#c98a4b');d.ellipse((c-3.6*S,89*S,c+3.6*S,95*S),fill='#a86a32')
    d.rectangle((c-3.6*S,6*S,c-1.6*S,56*S),fill='#e0a868')
    b=b.rotate(ang,center=(c,c*1.06),resample=Image.BICUBIC);img.alpha_composite(b)
def make(code):
    img=Image.new('RGBA',(W,W),(0,0,0,0))
    bat(img,38);bat(img,-38)
    d=ImageDraw.Draw(img)
    d.polygon(shield(0),fill='#20242e');d.polygon(shield(2.2*S),fill='#f3e3b3');d.polygon(shield(3.6*S),fill='#d9b96a');d.polygon(shield(6.6*S),fill='#20242e')
    m=Image.new('L',(W,W),0);ImageDraw.Draw(m).polygon(shield(8*S),fill=255)
    f=flag(code).resize((54*S,36*S),Image.LANCZOS)   # 3:2
    fl=Image.new('RGBA',(W,W),(0,0,0,0));fl.paste(f,(int(W/2-f.width/2),int(24*S)));ImageDraw.Draw(fl).rectangle((W/2-f.width/2-S,23*S,W/2+f.width/2+S,24*S+f.height+S),outline='#0d1220',width=S)
    # 깃발 아래는 남색 받침
    base=Image.new('RGBA',(W,W),(27,36,58,255));base.alpha_composite(fl)
    img.paste(base,(0,0),m)
    d=ImageDraw.Draw(img)
    # 야구공
    cx,cy,r=W/2,77*S,11*S
    d.ellipse((cx-r-1.6*S,cy-r-1.6*S,cx+r+1.6*S,cy+r+1.6*S),fill='#20242e');d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#fbf7ee')
    d.arc((cx-r*2.1,cy-r,cx-r*.35,cy+r),-48,48,fill='#c8102e',width=int(1.5*S));d.arc((cx+r*.35,cy-r,cx+r*2.1,cy+r),132,228,fill='#c8102e',width=int(1.5*S))
    out=img.resize((N,N),Image.LANCZOS);out.save('assets/leagues/%s.png'%code)
for c in ('KR','JP','US','TW','MX','AU','CB'):make(c)

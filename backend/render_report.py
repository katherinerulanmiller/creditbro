"""v7 compact Figtree charts. All values come from the deterministic host."""
import sys,json,io,math,subprocess,os
from pathlib import Path
from datetime import date,timedelta
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont
BASE=Path(__file__).resolve().parent
S=2;W=1080;INK='#1E2A25';MUTED='#5B6560';TRACK='#F4F0EA'
@lru_cache(maxsize=32)
def font(size,weight=400):
 f=ImageFont.truetype(str(BASE/'fonts/figtree.ttf'),round(size*S));f.set_variation_by_axes([weight]);return f

def render(r):
 rows=r['transactions'];layout=r['display'];compact=layout['compact']
 if r['source'] not in ['synthetic_demo','student_reported','nessie_simulation','plaid_sandbox'] or len(rows)>8:raise ValueError('Unsupported report')
 if any(type(x['cents']) is not int for x in rows) or sum(x['cents'] for x in rows)!=r['total_cents']:raise ValueError('Totals mismatch')
 monthly=layout['kind']=='monthly' and not layout['signed'];notice=layout['partial'];zero=layout['zero']
 H=round((220 if notice or zero else 134+max(200,len(compact)*64) if monthly else 190+len(compact)*62)*S)
 if H>1200:raise ValueError('Report exceeds compact canvas')
 im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
 def text(x,y,t,size=20,weight=400,color=INK):d.text((round(x*S),round(y*S)),str(t),font=font(size,weight),fill=color,anchor='lt')
 def width(t,size=20,weight=400):return d.textlength(str(t),font=font(size,weight))/S
 def fit(t,available,size=24,weight=600):
  if width(t,size,weight)<=available:return t
  while t and width(t+'…',size,weight)>available:t=t[:-1]
  return t+'…'
 def right(x,y,t,size=24,weight=600,color=INK):text(x-width(t,size,weight),y,t,size,weight,color)
 def box(rect,fill,radius=4):d.rounded_rectangle(tuple(round(v*S) for v in rect),radius=radius*S,fill=fill)
 def cash(c):return ('-' if c<0 else '')+f'${abs(c)//100:,}.{abs(c)%100:02d}'
 def amount(x,y,c,size=50,small=26,center=None):
  dollars,cents=cash(c).split('.');w=width(dollars,size,700)+2+width('.'+cents,small,700)
  if center is not None:x=center-w/2
  text(x,y,dollars,size,700);text(x+width(dollars,size,700)+2,y+6,'.'+cents,small,700,MUTED)
 def wrap(t,y):
  line=''
  for word in t.split():
   if line and width(line+' '+word,20)>488:text(26,y,line,20,color=MUTED);y+=27;line=word
   else:line=(line+' '+word).strip()
  if line:text(26,y,line,20,color=MUTED)
 text(26,26,'Your month' if layout['kind']=='monthly' else 'Your week',28,700)
 start=date.fromisoformat(r['period_start_inclusive']);end=date.fromisoformat(r['period_end_exclusive'])-timedelta(days=1)
 period=start.strftime('%B') if layout['kind']=='monthly' and start.day==1 and (end+timedelta(days=1)).day==1 else f'{start:%b} {start.day} – {end.day}' if start.month==end.month else f'{start:%b} {start.day} – {end:%b} {end.day}'
 text(26,64,period+' · USD',20,500,MUTED)
 if notice:wrap('Partial data: '+layout['coverage']+'. A complete spending breakdown is not available.',112)
 elif zero:wrap('No recorded spending in these totals. This does not confirm zero spending elsewhere.',112)
 elif monthly:
  # Ring and legend share the exact same <=4 host-calculated rows.
  cx,cy=126,228;radius=87;stroke=26;angle=-90;total=r['total_cents']
  for row in compact:
   if row['cents']<=0:continue
   sweep=360*row['cents']/total;gap=math.degrees(6/radius);cap=math.degrees((stroke/2)/radius)
   a=angle+gap/2+cap;b=angle+sweep-gap/2-cap
   # For tiny genuine shares, reduce caps to fit their allocation rather than add dots.
   if b<a:
    cap=max(0,math.radians(max(0,sweep-gap))*radius/2);a=angle+sweep/2;b=a;k=min(stroke/2,cap)
   else:k=stroke/2
   if b>a:d.arc(((cx-radius-stroke/2)*S,(cy-radius-stroke/2)*S,(cx+radius+stroke/2)*S,(cy+radius+stroke/2)*S),a,b,fill=row['color'],width=stroke*S)
   if k>0:
    for theta in (a,b):
     px=cx+radius*math.cos(math.radians(theta));py=cy+radius*math.sin(math.radians(theta));d.ellipse(((px-k)*S,(py-k)*S,(px+k)*S,(py+k)*S),fill=row['color'])
   angle+=sweep
  size=38 if width(cash(total),38,700)<168 else 29
  amount(0,cy-28,total,size,19,center=cx);text(cx-width('spent',19,500)/2,cy+20,'spent',19,500,MUTED)
  y=112
  for row in compact:
   d.ellipse((254*S,(y+4)*S,268*S,(y+18)*S),fill=row['color'])
   pct=f"{row['percent']}%";text(280,y,fit(row['category'],234-width(pct,19,500)-12,21,600),21,600);right(514,y,pct,19,500,MUTED)
   text(280,y+29,cash(row['cents']),19,400,MUTED);y+=64
 else:
  amount(26,112,r['total_cents']);y=184;maximum=max([abs(row['cents']) for row in compact]+[1])
  for row in compact:
   value=cash(row['cents']);text(26,y,fit(row['category'],488-width(value,24,600)-14),24,600);right(514,y,value)
   box((26,y+34,426,y+42),TRACK);bar=400*abs(row['cents'])/maximum
   if bar:box((26,y+34,26+max(1,bar),y+42),row['color'])
   y+=62
 return im
if __name__=='__main__':
 r=json.load(sys.stdin)
 if 'display' not in r:
  node=os.environ.get('CREDITBRO_NODE','node')
  result=subprocess.run([node,str(BASE/'report-layout.mjs')],input=json.dumps(r),text=True,capture_output=True,check=True,timeout=5);r=json.loads(result.stdout)
 im=render(r);b=io.BytesIO();im.save(b,format='PNG',optimize=True);sys.stdout.buffer.write(b.getvalue())

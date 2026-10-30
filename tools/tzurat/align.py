import json,re,sys,difflib,csv
from PIL import Image,ImageDraw,ImageFont
specs,amud,out=sys.argv[1].split(','),sys.argv[2],sys.argv[3]
src=json.load(open(f'/home/claude/daf-ai-sources/bechorot/42/sefaria_he_{amud}.json'))
segs=src['segments']
FIN=str.maketrans('ךםןףץ','כמנפצ')
def norm(w):
    w=re.sub(r'[֑-ׇ]','',w); w=re.sub(r'[^א-ת]','',w); return w.translate(FIN)
S=[];SI=[]
for i,t in enumerate(segs):
    t=re.sub(r'<[^>]+>','',t)
    for w in t.split():
        n=norm(w)
        if n: S.append(n);SI.append(i+1)
O=[]
rows=[]
for sp in specs:
    tsv,ox,oy=sp.split(':'); ox,oy=int(ox),int(oy)
    for r in csv.DictReader(open(tsv),delimiter='\t',quoting=csv.QUOTE_NONE): r['_o']=(ox,oy,tsv); rows.append(r)
for r in rows:
    ox,oy,tsv=r['_o']
    if r['level']!='5' or not r['text'].strip(): continue
    n=norm(r['text'])
    if len(n)<2: continue
    O.append((n,int(r['left'])+ox,int(r['top'])+oy,int(r['width']),int(r['height']),(tsv,r['block_num'],r['par_num'],r['line_num'])))
sm=difflib.SequenceMatcher(None,[o[0] for o in O],S,autojunk=False)
anch={}
for a,b,n in sm.get_matching_blocks():
    for k in range(n): anch[a+k]=b+k
print('ocr words',len(O),'src words',len(S),'matched',len(anch),file=sys.stderr)
keys=sorted(anch)
seg=[None]*len(O)
for i in range(len(O)):
    if i in anch: seg[i]=SI[anch[i]];continue
    p=[k for k in keys if k<i]; q=[k for k in keys if k>i]
    if p and q and SI[anch[p[-1]]]==SI[anch[q[0]]]: seg[i]=SI[anch[p[-1]]]
    elif p and q and i-p[-1]<=q[0]-i: seg[i]=SI[anch[p[-1]]]
    elif q and p: seg[i]=SI[anch[q[0]]]
# drop isolated far-off words (margin noise): keep only words whose line has >=2 matched words
from collections import Counter
lm=Counter(o[5] for i,o in enumerate(O) if i in anch)
from collections import defaultdict
mx=defaultdict(list)
for i,o in enumerate(O):
    if i in anch: mx[o[5]].append((o[1],o[1]+o[3]))
def near(o):
    return any(min(abs(o[1]-b),abs(a-(o[1]+o[3])))<120 or a<=o[1]<=b for a,b in mx[o[5]])
res=[(o,seg[i],i in anch) for i,o in enumerate(O) if seg[i] and lm[o[5]]>=2 and (i in anch or near(o))]
json.dump([dict(seg=s,x=o[1],y=o[2],w=o[3],h=o[4],m=int(m)) for o,s,m in res],open(out+'.json','w'))

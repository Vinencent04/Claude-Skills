import numpy as np,soundfile as sf,json,sys
SR=24000
def tight(x):
    w=SR//100;n=len(x)//w
    r=np.array([np.sqrt(np.mean(x[i*w:(i+1)*w]**2)) for i in range(n)])
    act=r>0.02*r.max();idx=np.where(act)[0];s,e=idx[0],idx[-1]+1
    keep=[];i=s
    while i<e:
        if act[i]: keep.append(i);i+=1;continue
        j=i
        while j<e and not act[j]: j+=1
        keep+=list(range(i,i+12)) if j-i>22 else list(range(i,j))
        i=j
    seg=np.concatenate([x[k*w:(k+1)*w] for k in keep]);seg=seg/(np.abs(seg).max()+1e-9)*0.42
    f=int(.008*SR);seg[:f]*=np.linspace(0,1,f);seg[-f:]*=np.linspace(1,0,f);return seg
parts=[];t=0;starts=[];gap=np.zeros(int(.08*SR))
for i in range(13):
    x,_=sf.read(f'jv3/l{i:02d}.wav');x=tight(x);starts.append(round(t,3));parts+=[x,gap];t+=len(x)/SR+.08
a=np.concatenate(parts+[np.zeros(int(.3*SR))]);sf.write('voice_v3.wav',a,SR);json.dump(starts,open('starts_v3.json','w'))
print(len(a)/SR,starts)

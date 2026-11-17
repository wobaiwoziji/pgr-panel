import sys, collections, os, tempfile
import UnityPy

src = sys.argv[1]
data = open(src, "rb").read()
off = data.find(b"UnityFS")
print("offset:", off, "size:", len(data))
tmp = os.path.join(tempfile.gettempdir(), "probe.bundle")
open(tmp, "wb").write(data[off:])

env = UnityPy.load(tmp)
print("container:", list(env.container.items())[:5])
c = collections.Counter()
for obj in env.objects:
    c[obj.type.name] += 1
print("total:", len(env.objects))
for k, v in c.most_common(20):
    print(f"  {k}: {v}")
for obj in env.objects[:8]:
    print(" ", obj.type.name, getattr(obj.read(), "m_Name", "?"))

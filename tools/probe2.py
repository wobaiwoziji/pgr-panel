import sys, collections
import UnityPy

p = sys.argv[1]
raw = open(p, "rb").read()
off = raw.find(b"UnityFS")
env = UnityPy.load(raw[off:])
print("objects:", len(env.objects))
print("first container:", list(env.container.items())[:1])

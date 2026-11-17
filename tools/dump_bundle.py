import sys, collections, os
import UnityPy

MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"


def load(name):
    raw = open(os.path.join(MATRIX, name), "rb").read()
    off = raw.find(b"UnityFS", 0, 256)
    return UnityPy.load(raw[off:])


for name in sys.argv[1:]:
    env = load(name)
    c = collections.Counter(o.type.name for o in env.objects)
    print(f"== {name}  objects={len(env.objects)}")
    print("  ", dict(c.most_common(12)))
    for o in env.objects:
        if o.type.name in ("Sprite", "Texture2D", "Font", "TextAsset"):
            try:
                d = o.read()
                nm = getattr(d, "m_Name", "?")
                extra = ""
                if o.type.name == "Texture2D":
                    extra = f" {d.m_Width}x{d.m_Height}"
                if o.type.name == "Sprite":
                    extra = f" rect={getattr(d,'m_Rect',None)}"
                print(f"   {o.type.name}: {nm}{extra}")
            except Exception as e:
                print("   err", o.type.name, e)

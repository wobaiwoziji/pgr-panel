import io

p = r"D:\ui\src\panel.css"
s = io.open(p, encoding="utf-8").read()

# 所有元素统一使用蓝色底板侧边的实测角度 7.95°，横向不再单独倾斜
s = s.replace("--v-cell-skew: -6deg;", "--v-cell-skew: -7.95deg;")
s = s.replace("--v-hed-tilt: -4.5deg;", "--v-hed-tilt: 0deg;")
s = s.replace("--v-media-tilt: -3.5deg;", "--v-media-tilt: 0deg;")
s = s.replace("--v-row1: 0.94deg;", "--v-row1: 0deg;")
s = s.replace("--v-row2: 1.54deg;", "--v-row2: 0deg;")
s = s.replace("--v-row3: 2.1deg;", "--v-row3: 0deg;")
s = s.replace("--v-row4: 2.4deg;", "--v-row4: 0deg;")
s = s.replace("  --ry: 1deg;", "  --ry: 0deg;")

io.open(p, "w", encoding="utf-8").write(s)
print("ok")

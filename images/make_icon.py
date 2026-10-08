"""Generate icon.png (twill drawdown on a rounded tile) and icon.svg."""
from PIL import Image, ImageDraw

N, CELL = 8, 44               # 8x8 twill, drawn at 512px
S = 512
OFF = (S - N * CELL + 2) // 2
BG, WARP, WEFT = (24, 32, 64), (46, 96, 200), (245, 236, 210)
up = lambda i, j: (i + j) % 4 < 2  # 2/2 twill: warp on top

rects = []
for j in range(N):
    for i in range(N):
        rects.append((OFF + i * CELL, OFF + j * CELL, WARP if up(i, j) else WEFT))

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0, 0, S - 1, S - 1), radius=96, fill=BG)
for x, y, c in rects:
    d.rectangle((x, y, x + CELL - 3, y + CELL - 3), fill=c)
img.resize((256, 256), Image.LANCZOS).save("images/icon.png")

hexc = lambda c: "#%02x%02x%02x" % c
body = "".join(f'<rect x="{x}" y="{y}" width="{CELL-2}" height="{CELL-2}" fill="{hexc(c)}"/>' for x, y, c in rects)
open("images/icon.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}"><rect width="{S}" height="{S}" rx="96" fill="{hexc(BG)}"/>{body}</svg>\n')

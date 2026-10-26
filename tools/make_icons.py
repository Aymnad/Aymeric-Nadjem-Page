#!/usr/bin/env python3
"""Génère les icônes du site et des notebooks dans design/icons/.
Remplacez le motif (NODES/EDGES) ou fournissez vos propres fichiers :
seuls les NOMS de fichiers comptent pour postprocess.py.
Usage : python tools/make_icons.py   (nécessite Pillow)"""
from pathlib import Path
from PIL import Image, ImageDraw

BG, FG = "#1b5e7a", "#f2f5f4"
NODES = [(256, 256, 54), (112, 150, 30), (400, 140, 30), (130, 390, 30), (390, 380, 34)]
EDGES = [(0, 1), (0, 2), (0, 3), (0, 4)]
OUT = Path(__file__).resolve().parent.parent / "design" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# --- SVG (favicon moderne, vectoriel)
lines = "".join(
    f'<line x1="{NODES[a][0]}" y1="{NODES[a][1]}" x2="{NODES[b][0]}" y2="{NODES[b][1]}"/>'
    for a, b in EDGES
)
circles = "".join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in NODES)
(OUT / "favicon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
    f'<rect width="512" height="512" rx="96" fill="{BG}"/>'
    f'<g stroke="{FG}" stroke-width="20" stroke-linecap="round">{lines}</g>'
    f'<g fill="{FG}">{circles}</g></svg>\n',
    encoding="utf-8",
)

# --- PNG (dessinés en grand puis réduits pour l'anti-crénelage)
def render(size: int) -> Image.Image:
    k = 4 * size / 512
    im = Image.new("RGBA", (int(512 * k), int(512 * k)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, 512 * k - 1, 512 * k - 1], radius=96 * k, fill=BG)
    for a, b in EDGES:
        d.line([NODES[a][0] * k, NODES[a][1] * k, NODES[b][0] * k, NODES[b][1] * k],
               fill=FG, width=int(20 * k))
    for x, y, r in NODES:
        d.ellipse([(x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k], fill=FG)
    return im.resize((size, size), Image.LANCZOS)

for name, size in {
    "favicon-16x16.png": 16, "favicon-32x32.png": 32, "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192, "android-chrome-512x512.png": 512, "logo.png": 512,
}.items():
    render(size).save(OUT / name)
render(64).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("Icônes écrites dans", OUT)

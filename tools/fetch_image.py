#!/usr/bin/env python3
"""Télécharge une image depuis Wikimedia Commons (ou lit un fichier local),
la redimensionne et l'enregistre en WebP dans design/img/.

Exemples :
  python tools/fetch_image.py PurkinjeCell.jpg cajal-purkinje-1899 --width 1200
  python tools/fetch_image.py "Blausen 0657 MultipolarNeuron.png" blausen-multipolar-neuron --width 1400
  python tools/fetch_image.py --from-file ma_figure.png ma-figure --width 1400

Le premier argument est le NOM EXACT du fichier sur Commons (sans « File: »),
à copier depuis la page du fichier. Vérifiez toujours la licence sur cette page
et reportez le crédit dans la légende (voir fr/projects/neuron.qmd).
Nécessite Pillow et un accès internet (sauf avec --from-file).
"""
import argparse, io, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "img"
BG = (242, 245, 244)  # papier : remplace la transparence des PNG

ap = argparse.ArgumentParser()
ap.add_argument("source", help="nom du fichier Commons (ou chemin avec --from-file)")
ap.add_argument("name", help="nom de sortie, sans extension")
ap.add_argument("--width", type=int, default=1600, help="largeur max en px (défaut 1600)")
ap.add_argument("--quality", type=int, default=82)
ap.add_argument("--from-file", action="store_true", help="source = fichier local")
a = ap.parse_args()

if a.from_file:
    data = Path(a.source).read_bytes()
    origin = a.source
else:
    origin = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(a.source.replace(" ", "_"))
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(a.source.replace(" ", "_"))
    req = urllib.request.Request(url, headers={"User-Agent": "mon-site-fetch-image/1.0 (personal website)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()

im = Image.open(io.BytesIO(data))
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    flat = Image.new("RGB", im.size, BG)
    flat.paste(im, mask=im.split()[-1])
    im = flat
else:
    im = im.convert("RGB")
if im.width > a.width:
    im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)

OUT.mkdir(parents=True, exist_ok=True)
dest = OUT / f"{a.name}.webp"
im.save(dest, "WEBP", quality=a.quality, method=6)
print(f"OK : {dest}  ({im.width}x{im.height}, {dest.stat().st_size // 1024} Ko)")
print(f"Source à créditer : {origin}")

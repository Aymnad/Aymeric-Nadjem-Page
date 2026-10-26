#!/usr/bin/env python3
"""Aligne un export `marimo export html-wasm` sur l'identité du site.

Usage : python tools/postprocess.py nb/demo [--base ""] [--name "Démo"]

Ce que fait le script (idempotent) :
  - remplace les icônes (favicon, apple-touch-icon, android-chrome, logo)
    par celles de design/icons/ ;
  - supprime les préchargements des polices marimo (Lora, PT Sans, Fira Mono)
    et injecte design/tokens.css + design/marimo.css en fin de <head> ;
  - met à jour theme-color, description et les manifestes ;
  - supprime CLAUDE.md (fichier d'assistant ajouté par l'export).
--base : préfixe d'URL si le site n'est pas à la racine (ex. "/mon-depot").
"""
import argparse, json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "design" / "icons"
MARK = "<!-- site-theme -->"

ap = argparse.ArgumentParser()
ap.add_argument("folder")
ap.add_argument("--base", default="")
ap.add_argument("--name", default=None, help="nom affiché dans les manifestes")
ap.add_argument("--theme-color", default="#f2f5f4")
args = ap.parse_args()

d = Path(args.folder)
index = d / "index.html"
if not index.exists():
    raise SystemExit(f"{index} introuvable : exportez d'abord le notebook.")

# 1) icônes : on écrase les fichiers de l'export (mêmes noms)
for f in ICONS.iterdir():
    shutil.copy2(f, d / f.name)

# 2) fichiers inutiles
(d / "CLAUDE.md").unlink(missing_ok=True)

# 3) manifestes
name = args.name or "Notebook"
for mf in ("manifest.json", "site.webmanifest"):
    p = d / mf
    if p.exists():
        m = json.loads(p.read_text(encoding="utf-8"))
        m.update(name=name, short_name=name,
                 theme_color=args.theme_color, background_color=args.theme_color)
        for icon in m.get("icons", []):          # chemins relatifs au dossier
            icon["src"] = icon["src"].lstrip("/")
        p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# 4) index.html
html = index.read_text(encoding="utf-8")
if MARK not in html:
    html = re.sub(r'\s*<link rel="preload"[^>]*as="font"[^>]*/?>', "", html)
    html = re.sub(r'<link rel="icon"[^>]*/?>',
                  '<link rel="icon" href="./favicon.svg" type="image/svg+xml" />\n'
                  '    <link rel="icon" href="./favicon.ico" sizes="48x48" />', html, count=1)
    html = re.sub(r'(<meta name="theme-color" content=")[^"]*(")',
                  rf'\g<1>{args.theme_color}\g<2>', html)
    inject = (f'    {MARK}\n'
              f'    <link rel="stylesheet" href="{args.base}/design/tokens.css" />\n'
              f'    <link rel="stylesheet" href="{args.base}/design/marimo.css" />\n')
    html = html.replace("</head>", inject + "  </head>", 1)
    index.write_text(html, encoding="utf-8")
print(f"OK : {d} aligné sur le thème du site.")

# Github page (Quarto, bilingue FR/EN, notebooks marimo WASM)

Ceci est un site créé avec quarto, les informations sont contenus dans des fichiers .qmd qui ressemblent à des fichiers markdown.

## Structure du projet

```
Aymeric-Nadjem-Page/
├── export_notebook.sh      # script pour l'export de notebook vers site marimo
├── protected_website.py    # le générateur de fichiers crypté
├── _site    # contient tous les exports statiques de quarto 
├── _quarto           # contient les dossiers accessible pour quarto
└── en/                  # export des notebooks marimo
│   ├── index/ # page de garde
│   ├── projects/
│   │   ├── index.qmd      # obligatoire pour lister les différents qmd
│   │   ├── project_1.qmd         # contenu chiffré
│   │   ├── project_2.qmd           # service worker
│   │   └── ...
│   └── ateaching/
│       └── … (même structure)
└── fr/                  # export des notebooks marimo
│   ├── … (même structure que /en)
└── nb/                  # export des notebooks marimo
│   ├── notebook-crypted/
│   │   ├── index.html      # page d'entrée (titre, infos, demande du code)
│   │   ├── app.enc         # contenu chiffré
│   │   ├── sw.js           # service worker
│   │   └── robots.txt
│   └── app-beta/
│       └── … (même structure)
└── qmd_crypted/                  # export des notebooks marimo
│   ├── qmd_crypted_1/
│   │   ├── index.html      # attention, lors du cryptage, bien changer le nom pour index.html
│   │   ├── app.enc         
│   │   ├── sw.js           
│   │   └── robots.txt
│   └── qmd_crypted_2/
│       └── … (même structure)
└── README.md
```


## Test avec conteneur
```bash
docker build -t mon-site-quarto .
docker run --rm -it -p 4200:4200 -v "$PWD:/project" mon-site-quarto
```

## Déploiement
GitHub → Settings → Pages → Source : **GitHub Actions**. Le workflow `.github/workflows/publish.yml`
installe Quarto et publie `_site/` (aucun Python en CI). Le site doit être servi à la racine d'un domaine
(`user.github.io` ou domaine personnalisé) car les iframes et le CSS marimo utilisent `/nb/…` et `/design/…`.

## Pièges connus
- Dans `custom.scss`, section `scss:defaults`, ni `$brand-*` ni les variables Bootstrap ne sont définies (valeurs littérales) ; dans `scss:rules`, `$brand-*` fonctionne.
- Les `url()` de polices dans `tokens.css` doivent rester **relatives** (Quarto réécrit mal les absolues).
- Après mise à jour de marimo : ré-exporter et vérifier `design/marimo.css` (seules les 3 variables de police sont une API publique).
- Les notebooks WASM chargent Pyodide depuis un CDN au runtime (non testable hors ligne ; voir l'option `--offline` de marimo).
- Polices : Literata et JetBrains Mono (licence SIL OFL, fichiers de licence dans `design/fonts/`).
- Iframes: dans les iframes présent dans les .qmd reliant à d'autres fichiers à bien mettre la bonne langue correspondant au dossier, sinon cela ne fonctionnera pas (ie lang fr, lang en)
- Ajout dossier: si vous voulez rajouter des dosier qui seront accessible par les fichiers qmd il est important de rajouter les chemin dans le fichiers \_quarto. Autrement quarto ne fera pas le lien avec ces nouveaux dossiers.
- Ajout articles: les dossiers dans /en et /fr doivent avoir les memes noms.

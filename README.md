# Mon site (Quarto, bilingue FR/EN, notebooks marimo WASM)

## Structure
- `fr/`, `en/` : pages (mêmes chemins dans les deux langues → le bouton FR/EN fonctionne)
- `design/` : identité visuelle partagée
  - `tokens.css` (palette + polices, lu par le site ET les notebooks), `marimo.css` (surcharges notebooks)
  - `header-fr.html` / `header-en.html` : en-tête par langue (la navbar Quarto ne peut pas être bilingue)
  - `fonts/`, `icons/`
- `_brand.yml` + `custom.scss` : thème Quarto (garder la palette synchronisée avec `tokens.css`)
- `src-notebooks/*.py` : sources marimo ; `nb/<nom>/` : exports WASM **committés**
- `tools/` : `export_notebook.sh`, `postprocess.py`, `make_icons.py`
- `index.html` : redirection selon la langue du navigateur

## Commandes
```bash
pip install -r requirements-tools.txt   # marimo (version fixée) + pillow
python tools/make_icons.py              # (optionnel) régénère design/icons/
tools/export_notebook.sh demo           # exporte src-notebooks/demo.py → nb/demo/ + thème
quarto preview                          # aperçu local (http://localhost:xxxx, racine du site)
quarto render                           # build dans _site/
```
Ajouter un notebook : l'écrire dans `src-notebooks/`, lancer l'export, l'intégrer avec
`<iframe src="/nb/<nom>/?lang=fr">` (voir `fr/projects/demo-marimo.qmd`), committer `nb/<nom>/`.

## Images d'illustration (à faire une fois)
Les deux images de `fr|en/projects/neuron.qmd` sont des **placeholders** (mêmes noms de fichiers) : remplacez-les
par les vraies images libres de droits, avec internet :
```bash
python tools/fetch_image.py PurkinjeCell.jpg cajal-purkinje-1899 --width 1200
python tools/fetch_image.py "Blausen 0657 MultipolarNeuron.png" blausen-multipolar-neuron --width 1400
```
Le 1er argument est le nom EXACT du fichier sur Wikimedia Commons : vérifiez-le (surtout le second), ainsi que la
licence et les consignes de crédit sur la fiche du fichier, puis ajustez les crédits dans les `.qmd`.
Pour vos propres figures : `python tools/fetch_image.py --from-file ma_figure.png ma-figure --width 1400`.

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

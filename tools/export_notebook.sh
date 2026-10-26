#!/usr/bin/env bash
# Usage : tools/export_notebook.sh demo   → src-notebooks/demo.py  →  nb/demo/
set -euo pipefail
cd "$(dirname "$0")/.."
name="${1:?nom du notebook (sans .py)}"
rm -rf "nb/$name"
marimo export html-wasm "src-notebooks/$name.py" -o "nb/$name" --mode run
python tools/postprocess.py "nb/$name" --name "$name"
echo "Export terminé : nb/$name/  (à committer)"

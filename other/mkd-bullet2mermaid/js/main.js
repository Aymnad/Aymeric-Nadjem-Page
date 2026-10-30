// main.js : uniquement le câblage de l'interface (pas de logique métier).
import { render } from './pipeline.js';
import { exportPdf } from './export.js';

const source = document.getElementById('source');
const output = document.getElementById('output');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');

document.getElementById('export-pdf').addEventListener('click', exportPdf);

const DEFAULT_MARKDOWN = `# Mon document

Écrivez du Markdown ici, ou déposez un fichier \`.md\`.

\`\`\`mermaid
flowchart LR
  A[Fichier .md] --> B[Parser]
  B --> C[Diagramme Mermaid]
\`\`\`

# Démo : Gantt, Kanban et Git à partir de puces

## Planning

\`\`\`gantt
- title: Projet Alpha
- Conception
    - Maquettes 2026-11-02 5d
    - Spécifications after:maquettes 3d !done
- Développement
    - Parseur after:spécifications 2w !active
    - Interface 1w
    - Tests after:parseur,interface 5d !crit
- Livraison
    - Mise en production !jalon 2026-12-18
\`\`\`

## Tableau de suivi

\`\`\`kanban
- À faire
    - Écrire le parseur Kanban @alice !high
    - Choisir un nom ticket:B2M-1
    - Rédiger le README (vite !) @bob !urgent
- En cours
    - Page GitHub Pages @alice !low
- Terminé
    - Idée du projet
    - Export PDF
\`\`\`

## Historique Git

\`\`\`git
- main
    - commit: Initialisation
    - branch: feature/gantt
        - commit: Parseur de puces
        - commit: Générateur Gantt !highlight
    - commit: Correctif de style tag:v0.1
    - merge: feature/gantt tag:v0.2
    - branch: feature/kanban
        - commit: Générateur Kanban
        - commit: Correctif d'échappement
    - cherry-pick: Correctif d'échappement
    - merge: feature/kanban tag:v0.3
\`\`\`

`;

// --- Rendu avec un petit délai pour ne pas recalculer à chaque touche
let timer;
function scheduleRender() {
  clearTimeout(timer);
  timer = setTimeout(() => render(source.value, output), 250);
}
source.addEventListener('input', scheduleRender);

// --- Charger un fichier (bouton ou glisser-déposer)
async function loadFile(file) {
  if (!file) return;
  source.value = await file.text();
  document.title = file.name.replace(/\.[^.]+$/, ''); // nom proposé par défaut pour le PDF
  render(source.value, output);
}

fileInput.addEventListener('change', () => {
  loadFile(fileInput.files[0]);
  fileInput.value = ''; // permet de recharger le même fichier
});

// Glisser-déposer : on empêche le navigateur d'ouvrir le fichier lui-même
for (const type of ['dragenter', 'dragover']) {
  window.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragging');
  });
}
window.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) dropzone.classList.remove('dragging');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragging');
  loadFile(e.dataTransfer.files[0]);
});

// --- Démarrage
source.value = DEFAULT_MARKDOWN;
render(source.value, output);

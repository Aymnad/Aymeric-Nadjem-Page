// pipeline.js : Markdown -> HTML, puis rendu des diagrammes Mermaid en SVG.
// Dépend des globales `marked` et `mermaid` (chargées depuis vendor/).
//
//   ```mermaid ... ```   -> rendu direct
//   ```gantt | kanban | git ... ```  -> générateur (puces -> Mermaid) puis rendu

import { gantt } from './generators/gantt.js';
import { kanban } from './generators/kanban.js';
import { git } from './generators/git.js';

// Pour ajouter un type : un fichier dans generators/ + une ligne ici.
const generators = { gantt, kanban, git };

const MERMAID_CLASS = 'mermaid-source';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
});

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || '').trim().toLowerCase();

      if (language === 'mermaid') return mermaidBlock(text);

      if (generators[language]) {
        try {
          return mermaidBlock(generators[language](text));
        } catch (err) {
          return errorBlock(`Bloc « ${language} » invalide`, err.message);
        }
      }

      return false; // autres langages : rendu normal de marked
    },
  },
});

function mermaidBlock(code) {
  return `<pre class="${MERMAID_CLASS}">${escapeHtml(code)}</pre>`;
}

function errorBlock(title, message) {
  return `<div class="diagram-error"><strong>${escapeHtml(title)}</strong><pre>${escapeHtml(message)}</pre></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let renderCounter = 0; // sert à ignorer les rendus périmés

/**
 * Affiche le markdown dans `container`.
 * Les diagrammes sont rendus un par un : une erreur dans l'un
 * n'empêche pas l'affichage des autres.
 */
export async function render(markdown, container) {
  const current = ++renderCounter;
  container.innerHTML = marked.parse(markdown);

  const blocks = container.querySelectorAll(`pre.${MERMAID_CLASS}`);
  for (const [i, block] of [...blocks].entries()) {
    const id = `mmd-${current}-${i}`;
    let replacement;

    try {
      const { svg } = await mermaid.render(id, block.textContent);
      replacement = document.createElement('div');
      replacement.className = 'diagram';
      replacement.innerHTML = svg;
    } catch (err) {
      document.getElementById(`d${id}`)?.remove(); // Mermaid laisse parfois un SVG d'erreur dans le body
      replacement = document.createElement('div');
      replacement.className = 'diagram-error';
      replacement.innerHTML = '<strong>Diagramme invalide</strong><pre></pre>';
      replacement.querySelector('pre').textContent = err.message || String(err);
    }

    if (current !== renderCounter) return; // un rendu plus récent a pris le relais
    block.replaceWith(replacement);
  }
}

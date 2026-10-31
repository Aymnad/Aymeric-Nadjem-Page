// gantt.js : puces -> texte Mermaid « gantt ». Fonction pure.
//
// Syntaxe :
//   - title: Mon projet
//   - Conception                          <- puce avec enfants = section
//     - Maquettes 2026-11-02 5d           <- date + durée
//     - Specs after:maquettes 3d !done    <- dépendance + statut
//   - Livraison !milestone 2026-12-15     <- jalon

import { parseBullets, parseKeywords, slugify, ParseError } from '../bullets.js';

// Drapeaux acceptés (avec alias français) -> étiquette Mermaid
const FLAGS = {
  done: 'done', fait: 'done',
  active: 'active', encours: 'active',
  crit: 'crit', critique: 'crit',
  milestone: 'milestone', jalon: 'milestone',
};

export function gantt(text) {
  const nodes = parseBullets(text);

  // --- Titre optionnel
  let title = null;
  const items = [];
  for (const node of nodes) {
    const m = node.text.match(/^title:\s*(.+)$/i);
    if (m && !node.children.length) title = m[1];
    else items.push(node);
  }

  // --- Sections et tâches
  const sections = []; // { name | null, tasks: [{ node, kw }] }
  for (const node of items) {
    if (node.children.length) {
      const tasks = node.children.map((child) => {
        if (child.children.length) {
          throw new ParseError('une seule profondeur de tâches sous une section', child.children[0].line);
        }
        return { node: child, kw: parseKeywords(child.text) };
      });
      sections.push({ name: clean(node.text), tasks });
    } else {
      if (sections.some((s) => s.name !== null)) {
        throw new ParseError('tâche hors section : indentez-la sous une section', node.line);
      }
      if (!sections.length) sections.push({ name: null, tasks: [] });
      sections[0].tasks.push({ node, kw: parseKeywords(node.text) });
    }
  }

  // --- Identifiants uniques (une première passe pour pouvoir résoudre « after: »)
  const all = sections.flatMap((s) => s.tasks);
  const used = new Set();
  const idBySlug = new Map(); // slug -> index dans `all`
  all.forEach((task, index) => {
    if (!task.kw.label) throw new ParseError('nom de tâche manquant', task.node.line);
    const slug = slugify(task.kw.label) || 'tache';
    let id = `t_${slug}`;
    for (let n = 2; used.has(id); n++) id = `t_${slug}_${n}`;
    used.add(id);
    task.id = id;
    task.index = index;
    if (!idBySlug.has(slug)) idBySlug.set(slug, index);
  });

  // --- Génération
  const lines = ['gantt', '  dateFormat YYYY-MM-DD'];
  if (title) lines.push(`  title ${clean(title)}`);

  const render = (task) => {
    const { kw, node, id, index } = task;

    const tags = kw.flags.map((flag) => {
      if (!FLAGS[flag]) {
        throw new ParseError(`drapeau inconnu « !${flag} » (valeurs : ${Object.keys(FLAGS).join(', ')})`, node.line);
      }
      return FLAGS[flag];
    });
    const isMilestone = tags.includes('milestone');

    // Début : dépendance explicite, sinon date, sinon « à la suite de la tâche précédente »
    let start;
    if (kw.props.after) {
      const deps = kw.props.after.split(',').map((name) => {
        const target = idBySlug.get(slugify(name));
        if (target === undefined) throw new ParseError(`« after:${name} » : aucune tâche de ce nom`, node.line);
        if (target >= index) throw new ParseError(`« after:${name} » : cette tâche doit être définie plus haut`, node.line);
        return all[target].id;
      });
      start = `after ${deps.join(' ')}`;
    } else if (kw.date) {
      start = kw.date;
    } else if (index > 0) {
      start = `after ${all[index - 1].id}`;
    } else {
      throw new ParseError('la première tâche a besoin d\'une date (AAAA-MM-JJ)', node.line);
    }

    const duration = kw.duration || (isMilestone ? '0d' : '1d');
    return `  ${clean(kw.label)} :${[...tags, id, start, duration].join(', ')}`;
  };

  for (const section of sections) {
    if (section.name) lines.push(`  section ${section.name}`);
    for (const task of section.tasks) lines.push(render(task));
  }

  return lines.join('\n');
}

// Les caractères « : ; # » cassent la syntaxe Mermaid dans les noms.
function clean(s) {
  return s.replace(/[:;#]/g, ' ').replace(/\s+/g, ' ').trim();
}

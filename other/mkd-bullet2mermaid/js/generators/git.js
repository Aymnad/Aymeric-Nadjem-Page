// git.js : puces -> texte Mermaid « gitGraph ». Fonction pure.
//
// L'indentation suit le déroulement de l'histoire : une puce « branch: »
// ouvre un bloc, et à la fin de ce bloc on revient sur la branche parente.
//
//   - main                                   <- branche principale (une seule racine)
//     - commit: Initialisation
//     - branch: feature/login                <- commits indentés = sur cette branche
//       - commit: Formulaire
//       - commit: Validation !highlight
//     - commit: Correctif tag:v1.0.1
//     - merge: feature/login tag:v1.1
//     - cherry-pick: Validation              <- reprend un commit d'une autre branche

import { parseBullets, parseKeywords, ParseError } from '../bullets.js';

const VERBS = {
  commit: 'commit',
  branch: 'branch', branche: 'branch',
  merge: 'merge', fusion: 'merge',
  'cherry-pick': 'cherry-pick', pick: 'cherry-pick',
};

const TYPES = {
  highlight: 'HIGHLIGHT', surligne: 'HIGHLIGHT',
  reverse: 'REVERSE', revert: 'REVERSE',
  normal: 'NORMAL',
};

export function git(text) {
  const roots = parseBullets(text);
  if (roots.length !== 1) {
    throw new ParseError(
      roots.length ? 'une seule branche racine est attendue (la branche principale)' : 'diagramme vide : commencez par « - main »',
      roots[1]?.line,
    );
  }
  const root = roots[0];
  const mainName = root.text.trim();
  checkBranchName(mainName, root.line);

  const lines = [];
  const branches = new Set([mainName]);
  const headOf = { [mainName]: 0 }; // « tête » de chaque branche, pour détecter les fusions sans effet
  const commitBranch = new Map();   // libellé de commit -> branche où il a été créé
  let headCounter = 0;

  const walk = (node, current) => {
    for (const child of node.children) {
      const m = child.text.match(/^([\p{L}-]+)(?::\s+(.*))?$/u);
      const verb = m && VERBS[m[1].toLowerCase()];
      if (!verb) {
        throw new ParseError(
          `action inconnue dans « ${child.text} » (attendu : commit, branch, merge, cherry-pick, par exemple « commit: message »)`,
          child.line,
        );
      }
      const kw = parseKeywords(m[2] || '', { dates: false });
      const label = kw.label;

      if (verb !== 'branch' && child.children.length) {
        throw new ParseError(`seule une puce « branch: » peut avoir des sous-puces`, child.children[0].line);
      }

      if (verb === 'commit') {
        const attrs = [];
        if (label) attrs.push(`id: ${str(label)}`);
        addCommonAttrs(attrs, kw, child.line);
        lines.push(`  commit${attrs.length ? ' ' + attrs.join(' ') : ''}`);
        headOf[current] = ++headCounter;
        if (label && !commitBranch.has(label)) commitBranch.set(label, current);
      }

      else if (verb === 'branch') {
        if (!label) throw new ParseError('nom de branche manquant (« branch: nom »)', child.line);
        checkBranchName(label, child.line);
        if (branches.has(label)) throw new ParseError(`la branche « ${label} » existe déjà`, child.line);
        branches.add(label);
        headOf[label] = headOf[current];

        const order = kw.props.order;
        if (order !== undefined && !/^\d+$/.test(order)) throw new ParseError('« order: » attend un nombre entier', child.line);
        lines.push(`  branch ${name(label)}${order !== undefined ? ` order: ${order}` : ''}`);
        checkProps(kw, ['order'], child.line);

        walk(child, label);
        lines.push(`  checkout ${name(current)}`); // retour sur la branche parente
      }

      else if (verb === 'merge') {
        if (!label || /\s/.test(label)) throw new ParseError('« merge: » attend un nom de branche (sans espace)', child.line);
        if (!branches.has(label)) throw new ParseError(`la branche « ${label} » n'existe pas (encore)`, child.line);
        if (label === current) throw new ParseError('impossible de fusionner une branche dans elle-même', child.line);
        if (headOf[label] === headOf[current]) {
          throw new ParseError(`« ${label} » et « ${current} » sont au même commit : il n'y a rien à fusionner`, child.line);
        }
        const attrs = [];
        addCommonAttrs(attrs, kw, child.line);
        lines.push(`  merge ${name(label)}${attrs.length ? ' ' + attrs.join(' ') : ''}`);
        headOf[current] = ++headCounter;
      }

      else if (verb === 'cherry-pick') {
        if (!label) throw new ParseError('« cherry-pick: » attend le libellé d\'un commit', child.line);
        if (!commitBranch.has(label)) throw new ParseError(`aucun commit « ${label} » défini plus haut`, child.line);
        if (commitBranch.get(label) === current) {
          throw new ParseError(`le commit « ${label} » est déjà sur la branche « ${current} »`, child.line);
        }
        checkProps(kw, [], child.line);
        lines.push(`  cherry-pick id: ${str(label)}`);
        headOf[current] = ++headCounter;
      }
    }
  };

  walk(root, mainName);

  const header = [];
  if (mainName !== 'main') {
    header.push('---', 'config:', '  gitGraph:', `    mainBranchName: ${mainName}`, '---');
  }
  return [...header, 'gitGraph', ...lines].join('\n');
}

// tag:xxx, !highlight / !reverse
function addCommonAttrs(attrs, kw, line) {
  checkProps(kw, ['tag'], line);
  if (kw.props.tag) attrs.push(`tag: ${str(kw.props.tag.replace(/_/g, ' '))}`);
  if (kw.flags.length > 1) throw new ParseError('un seul type de commit par ligne', line);
  if (kw.flags.length) {
    const type = TYPES[kw.flags[0]];
    if (!type) throw new ParseError(`type inconnu « !${kw.flags[0]} » (valeurs : ${Object.keys(TYPES).join(', ')})`, line);
    attrs.push(`type: ${type}`);
  }
  if (kw.owners.length) throw new ParseError('« @nom » n\'a pas de sens dans un graphe Git', line);
}

function checkProps(kw, allowed, line) {
  for (const key of Object.keys(kw.props)) {
    if (!allowed.includes(key)) {
      throw new ParseError(`propriété inconnue « ${key}: »${allowed.length ? ` (acceptée : ${allowed.join(', ')})` : ''}`, line);
    }
  }
  if (!allowed.includes('tag') && kw.flags.length) throw new ParseError(`« !${kw.flags[0]} » n'est pas accepté ici`, line);
}

function checkBranchName(label, line) {
  if (!label || /\s/.test(label) || /["']/.test(label)) {
    throw new ParseError(`nom de branche invalide « ${label} » (pas d'espace ni de guillemet)`, line);
  }
}

// Branche : sans guillemets si possible
function name(label) {
  return /^[A-Za-z0-9_\-/]+$/.test(label) ? label : str(label);
}

function str(s) {
  return `"${s.replace(/"/g, "'")}"`;
}

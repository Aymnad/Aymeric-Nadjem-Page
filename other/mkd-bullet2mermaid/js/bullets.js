// bullets.js : outils génériques, sans Mermaid ni DOM.
//  - parseBullets : texte à puces indentées  ->  arbre
//  - parseKeywords : une ligne de puce       ->  libellé + mots-clés
//  - slugify : nom -> identifiant

export class ParseError extends Error {
  constructor(message, line) {
    super(line ? `Ligne ${line} : ${message}` : message);
    this.name = 'ParseError';
    this.line = line;
  }
}

/**
 * Transforme des puces indentées en arbre :
 *   [{ text, line, children: [...] }, ...]
 * L'indentation (espaces ou tabulations) donne la hiérarchie.
 */
export function parseBullets(text) {
  const root = { indent: -1, children: [] };
  const stack = [root];

  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;

    const m = raw.match(/^([ \t]*)[-*+]\s+(.*\S)\s*$/);
    if (!m) {
      throw new ParseError(`une puce « - » est attendue, trouvé : « ${raw.trim()} »`, i + 1);
    }

    const node = {
      text: m[2],
      line: i + 1,
      indent: m[1].replace(/\t/g, '  ').length,
      children: [],
    };

    // On remonte jusqu'au parent : la dernière puce moins indentée.
    while (stack.length > 1 && stack[stack.length - 1].indent >= node.indent) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  return root.children;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DURATION = /^\d+(ms|[yMwdhms])$/;
const FLAG = /^!([\p{L}][\p{L}\d_-]*)$/u;   // !done, !jalon (pas « !) » ni « ! »)
const OWNER = /^@([\p{L}\d][\p{L}\d._'’-]*)$/u; // @alice
const KEY_VALUE = /^([A-Za-z][\w-]*):(\S+)$/;

/**
 * Extrait les mots-clés d'une ligne :
 *   2026-11-02   -> date
 *   5d, 2w, 3h   -> durée
 *   !done        -> drapeau
 *   @alice       -> responsable
 *   after:specs  -> propriété clé:valeur
 * Tout le reste forme le libellé.
 *
 * Option { dates: false } : les dates et durées restent dans le libellé
 * (utile pour un Kanban où « Réunion 2026-11-02 » est un simple texte).
 */
export function parseKeywords(text, { dates = true } = {}) {
  const out = { label: '', date: null, duration: null, flags: [], owners: [], props: {} };
  const words = [];

  for (const token of text.trim().split(/\s+/)) {
    let kv, m;
    if (dates && DATE.test(token)) out.date = token;
    else if (dates && DURATION.test(token)) out.duration = token;
    else if ((m = token.match(FLAG))) out.flags.push(m[1].toLowerCase());
    else if ((m = token.match(OWNER))) out.owners.push(m[1]);
    else if ((kv = token.match(KEY_VALUE))) out.props[kv[1].toLowerCase()] = kv[2];
    else words.push(token);
  }

  out.label = words.join(' ');
  return out;
}

/** « Mise en place » -> « mise_en_place » (sans accents, minuscules). */
export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// kanban.js : puces -> texte Mermaid « kanban ». Fonction pure.
//
// Syntaxe :
//   - À faire                          <- niveau 1 = colonne
//     - Écrire le parseur @alice !high <- niveau 2 = carte
//     - Choisir un nom ticket:B2M-1
//   - Terminé

import { parseBullets, parseKeywords, ParseError } from '../bullets.js';

// Priorités acceptées (avec alias français) -> valeur Mermaid
const PRIORITY = {
  urgent: 'Very High',
  high: 'High', haute: 'High',
  low: 'Low', basse: 'Low',
  minor: 'Very Low', mineure: 'Very Low',
};

export function kanban(text) {
  const columns = parseBullets(text);
  if (!columns.length) throw new ParseError('tableau vide : ajoutez au moins une colonne (« - Nom »)');

  const lines = ['kanban'];

  columns.forEach((column, c) => {
    lines.push(`  col${c + 1}[${quote(column.text)}]`);

    column.children.forEach((card, k) => {
      if (card.children.length) {
        throw new ParseError('une carte ne peut pas avoir de sous-puces (colonne > carte, pas plus)', card.children[0].line);
      }

      const kw = parseKeywords(card.text, { dates: false });
      if (!kw.label) throw new ParseError('texte de carte manquant', card.line);

      const meta = [];
      for (const key of Object.keys(kw.props)) {
        if (key !== 'ticket') throw new ParseError(`propriété inconnue « ${key}: » (seule « ticket: » existe)`, card.line);
      }
      if (kw.props.ticket) meta.push(`ticket: ${yamlString(kw.props.ticket)}`);
      if (kw.owners.length) meta.push(`assigned: ${yamlString(kw.owners.join(', '))}`);

      if (kw.flags.length > 1) throw new ParseError('une seule priorité par carte', card.line);
      if (kw.flags.length) {
        const priority = PRIORITY[kw.flags[0]];
        if (!priority) {
          throw new ParseError(`priorité inconnue « !${kw.flags[0]} » (valeurs : ${Object.keys(PRIORITY).join(', ')})`, card.line);
        }
        meta.push(`priority: ${yamlString(priority)}`);
      }

      lines.push(`    c${c + 1}_${k + 1}[${quote(kw.label)}]${meta.length ? `@{ ${meta.join(', ')} }` : ''}`);
    });
  });

  return lines.join('\n');
}

// Libellé entre guillemets : accepte parenthèses, crochets, deux-points...
function quote(s) {
  return `"${s.replace(/"/g, "'")}"`;
}

// Chaîne YAML entre apostrophes (l'apostrophe se double).
function yamlString(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

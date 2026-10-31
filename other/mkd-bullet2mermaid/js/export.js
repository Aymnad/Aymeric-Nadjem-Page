// export.js : export PDF via la boîte d'impression du navigateur.
// Le texte reste sélectionnable et les SVG restent vectoriels.
// La mise en page papier est dans css/print.css.

export function exportPdf() {
  window.print(); // choisir « Enregistrer au format PDF » comme imprimante
}

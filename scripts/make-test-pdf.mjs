// Generates a tiny 3-page PDF for local import tests (ASCII only, no external library).
import fs from "node:fs";

const pages = [
  [
    "Methodes de planification de projet",
    "Chapitre 1 - Introduction",
    "Un projet est un ensemble d'activites limite dans le temps.",
    "Il a un debut, une fin et un objectif mesurable.",
    "Formule du cout total : C = A + B",
  ],
  [
    "Chapitre 2 - Les couts",
    "A represente les couts fixes.",
    "B represente les couts variables.",
    "Le cout total C est la somme des deux.",
    "Exemple : A = 100, B = 50, donc C = 150.",
  ],
  [
    "Chapitre 3 - Verification",
    "Question : que represente C ?",
    "Reponse : la somme des couts fixes et variables.",
    "Formule : E = mc2 (exemple de formule).",
    "Fin du document de test.",
  ],
];

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const content = (lines) => lines.map((line, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 72 ${720 - i * 28} Td (${esc(line)}) Tj ET`).join("\n");

// Object layout: 1 catalog, 2 pages, 3 font, then (content, page) per page.
const pageIds = pages.map((_, i) => [4 + i * 2, 5 + i * 2]);
const objects = [];
objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
objects[2] = `<< /Type /Pages /Kids [${pageIds.map(([, p]) => `${p} 0 R`).join(" ")}] /Count ${pages.length} >>`;
objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
pages.forEach((lines, i) => {
  const [contentId, pageId] = pageIds[i];
  const stream = content(lines);
  objects[contentId] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
});

let body = "";
const offsets = [];
for (let i = 1; i < objects.length; i++) {
  offsets[i] = Buffer.byteLength(`%PDF-1.4\n${body}`);
  body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefOffset = Buffer.byteLength(`%PDF-1.4\n${body}`);
const xref = [
  "xref",
  `0 ${objects.length}`,
  "0000000000 65535 f ",
  ...offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `),
].join("\n") + "\n";
const pdf = `%PDF-1.4\n${body}${xref}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
const out = process.argv[2] ?? "C:/Users/CORNEILLE/AppData/Local/Temp/studigo-test.pdf";
fs.writeFileSync(out, pdf);
console.log(`wrote ${out} (${Buffer.byteLength(pdf)} bytes)`);

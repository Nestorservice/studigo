import fs from "node:fs";

const LIVE = { fr: "Reprendre", en: "Continue", de: "Weiter", es: "Continuar", hu: "Folytatás", tr: "Devam et" };
const SECTION = {
  fr: ["Termine {{count}} section", "Termine {{count}} sections"],
  en: ["Finish {{count}} section", "Finish {{count}} sections"],
  de: ["Schließe {{count}} Abschnitt ab", "Schließe {{count}} Abschnitte ab"],
  es: ["Termina {{count}} sección", "Termina {{count}} secciones"],
  hu: ["Fejezz be {{count}} szakaszt", "Fejezz be {{count}} szakaszt"],
  tr: ["{{count}} bölümü tamamla", "{{count}} bölümü tamamla"],
};
const SESSION = {
  fr: ["Termine {{count}} session d'étude", "Termine {{count}} sessions d'étude"],
  en: ["Finish {{count}} study session", "Finish {{count}} study sessions"],
  de: ["Schließe {{count}} Lernsession ab", "Schließe {{count}} Lernsessions ab"],
  es: ["Termina {{count}} sesión de estudio", "Termina {{count}} sesiones de estudio"],
  hu: ["Fejezz be {{count}} tanulási alkalmat", "Fejezz be {{count}} tanulási alkalmat"],
  tr: ["{{count}} çalışma oturumu tamamla", "{{count}} çalışma oturumu tamamla"],
};

for (const lang of Object.keys(LIVE)) {
  const p = `src/locales/${lang}.json`;
  const raw = fs.readFileSync(p, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const j = JSON.parse(raw);
  j.nav.live = LIVE[lang];
  for (const key of Object.keys(j.rail)) {
    if (key.startsWith("qLessons")) j.rail[key] = SECTION[lang][key.endsWith("_one") ? 0 : 1];
    if (key.startsWith("qPractice")) j.rail[key] = SESSION[lang][key.endsWith("_one") ? 0 : 1];
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 2).replace(/\n/g, eol) + eol);
  console.log("updated", lang);
}

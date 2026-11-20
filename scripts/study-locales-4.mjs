import fs from "node:fs";

const DATA = {
  fr: {
    study: {
      subjects: "Matières", noSubjects: "Aucune matière pour l'instant. Crée-en une ci-dessous.",
      newSubject: "Nouvelle matière", subjectName: "Nom de la matière", subjectIcon: "Icône", subjectColor: "Couleur", create: "Créer",
      subjectMeta: "{{sources}} source(s) · {{done}} / {{total}} pages maîtrisées",
      openSubject: "Ouvrir la matière", importPdf: "Importer un PDF", subjectRemoved: "Matière supprimée",
      subjectDone: "{{name}} terminée !", subjectDoneDesc: "Toutes les pages sont maîtrisées. Ton arbre a bien poussé.",
      gardenTitle: "Mon jardin d'étude", gardenDesc: "Ton arbre pousse avec les pages maîtrisées, matière par matière.",
      treeHint: "Chaque page maîtrisée fait pousser l'arbre ; une série de jours le garde vert.",
      askVoice: "Poser la question à voix haute",
    },
    studyNudge: {
      morning: { t: "Ton arbre t'attend", b: "Une page aujourd'hui suffit pour le faire pousser." },
      afternoon: { t: "On reprend ?", b: "Ton cours et ton tuteur sont prêts." },
      evening: { t: "Dernier appel pour ton arbre", b: "Quelques minutes suffisent pour garder tes racines." },
      streak: { t: "Série de {{count}} jours", b: "Ne laisse pas ton arbre se dessécher : une page suffit." },
      comeback: { t: "Ton cours t'attend", b: "Reviens quand tu veux, on reprend là où tu t'es arrêté." },
    },
  },
  en: {
    study: {
      subjects: "Subjects", noSubjects: "No subjects yet. Create one below.",
      newSubject: "New subject", subjectName: "Subject name", subjectIcon: "Icon", subjectColor: "Color", create: "Create",
      subjectMeta: "{{sources}} source(s) · {{done}} / {{total}} pages mastered",
      openSubject: "Open subject", importPdf: "Import a PDF", subjectRemoved: "Subject deleted",
      subjectDone: "{{name}} complete!", subjectDoneDesc: "Every page is mastered. Your tree has grown.",
      gardenTitle: "My study garden", gardenDesc: "Your tree grows with mastered pages, subject by subject.",
      treeHint: "Every mastered page grows the tree; a daily streak keeps it green.",
      askVoice: "Ask by voice",
    },
    studyNudge: {
      morning: { t: "Your tree is waiting", b: "One page today is enough to grow it." },
      afternoon: { t: "Pick up where you left off", b: "Your course and tutor are ready." },
      evening: { t: "Last call for your tree", b: "A few minutes keep your roots alive." },
      streak: { t: "{{count}}-day streak", b: "Don't let your tree dry out: one page is enough." },
      comeback: { t: "Your course is waiting", b: "Come back whenever you want; we'll pick up where you left off." },
    },
  },
  de: {
    study: {
      subjects: "Fächer", noSubjects: "Noch keine Fächer. Erstelle unten eines.",
      newSubject: "Neues Fach", subjectName: "Fachname", subjectIcon: "Symbol", subjectColor: "Farbe", create: "Erstellen",
      subjectMeta: "{{sources}} Quelle(n) · {{done}} / {{total}} Seiten beherrscht",
      openSubject: "Fach öffnen", importPdf: "PDF importieren", subjectRemoved: "Fach gelöscht",
      subjectDone: "{{name}} abgeschlossen!", subjectDoneDesc: "Alle Seiten sind beherrscht. Dein Baum ist gewachsen.",
      gardenTitle: "Mein Lerngarten", gardenDesc: "Dein Baum wächst mit den beherrschten Seiten, Fach für Fach.",
      treeHint: "Jede beherrschte Seite lässt den Baum wachsen; eine tägliche Serie hält ihn grün.",
      askVoice: "Per Stimme fragen",
    },
    studyNudge: {
      morning: { t: "Dein Baum wartet", b: "Eine Seite heute reicht, um ihn wachsen zu lassen." },
      afternoon: { t: "Weiter geht's", b: "Dein Kurs und dein Tutor sind bereit." },
      evening: { t: "Letzter Aufruf für deinen Baum", b: "Ein paar Minuten halten deine Wurzeln am Leben." },
      streak: { t: "{{count}}-Tage-Serie", b: "Lass deinen Baum nicht austrocknen: eine Seite reicht." },
      comeback: { t: "Dein Kurs wartet", b: "Komm zurück, wann du willst; wir machen dort weiter." },
    },
  },
  es: {
    study: {
      subjects: "Materias", noSubjects: "Aún no hay materias. Crea una abajo.",
      newSubject: "Nueva materia", subjectName: "Nombre de la materia", subjectIcon: "Icono", subjectColor: "Color", create: "Crear",
      subjectMeta: "{{sources}} fuente(s) · {{done}} / {{total}} páginas dominadas",
      openSubject: "Abrir materia", importPdf: "Importar un PDF", subjectRemoved: "Materia eliminada",
      subjectDone: "¡{{name}} completada!", subjectDoneDesc: "Todas las páginas están dominadas. Tu árbol ha crecido.",
      gardenTitle: "Mi jardín de estudio", gardenDesc: "Tu árbol crece con las páginas dominadas, materia por materia.",
      treeHint: "Cada página dominada hace crecer el árbol; una racha diaria lo mantiene verde.",
      askVoice: "Preguntar por voz",
    },
    studyNudge: {
      morning: { t: "Tu árbol te espera", b: "Una página hoy basta para hacerlo crecer." },
      afternoon: { t: "¿Seguimos?", b: "Tu curso y tu tutor están listos." },
      evening: { t: "Última llamada para tu árbol", b: "Unos minutos mantienen vivas tus raíces." },
      streak: { t: "Racha de {{count}} días", b: "No dejes que tu árbol se seque: una página basta." },
      comeback: { t: "Tu curso te espera", b: "Vuelve cuando quieras; retomamos donde lo dejaste." },
    },
  },
  hu: {
    study: {
      subjects: "Tantárgyak", noSubjects: "Még nincs tantárgy. Hozz létre egyet lent.",
      newSubject: "Új tantárgy", subjectName: "Tantárgy neve", subjectIcon: "Ikon", subjectColor: "Szín", create: "Létrehozás",
      subjectMeta: "{{sources}} forrás · {{done}} / {{total}} oldal elsajátítva",
      openSubject: "Tantárgy megnyitása", importPdf: "PDF importálása", subjectRemoved: "Tantárgy törölve",
      subjectDone: "{{name}} kész!", subjectDoneDesc: "Minden oldal elsajátítva. A fád megnőtt.",
      gardenTitle: "Tanulókertem", gardenDesc: "A fád az elsajátított oldalakkal nő, tantárgyanként.",
      treeHint: "Minden elsajátított oldal növeszti a fát; a napi sorozat zölden tartja.",
      askVoice: "Kérdés hanggal",
    },
    studyNudge: {
      morning: { t: "A fád vár", b: "Ma egy oldal is elég, hogy növekedjen." },
      afternoon: { t: "Folytatjuk?", b: "A kurzusod és a tanárod készen áll." },
      evening: { t: "Utolsó hívás a fához", b: "Néhány perc életben tartja a gyökereidet." },
      streak: { t: "{{count}} napos sorozat", b: "Ne hagyd kiszáradni a fát: egy oldal is elég." },
      comeback: { t: "A kurzusod vár", b: "Gyere vissza, amikor akarsz; onnan folytatjuk." },
    },
  },
  tr: {
    study: {
      subjects: "Dersler", noSubjects: "Henüz ders yok. Aşağıda bir tane oluştur.",
      newSubject: "Yeni ders", subjectName: "Ders adı", subjectIcon: "Simge", subjectColor: "Renk", create: "Oluştur",
      subjectMeta: "{{sources}} kaynak · {{done}} / {{total}} sayfa öğrenildi",
      openSubject: "Dersi aç", importPdf: "PDF içe aktar", subjectRemoved: "Ders silindi",
      subjectDone: "{{name}} tamamlandı!", subjectDoneDesc: "Tüm sayfalar öğrenildi. Ağacın büyüdü.",
      gardenTitle: "Çalışma bahçem", gardenDesc: "Ağacın öğrenilen sayfalarla, ders ders büyür.",
      treeHint: "Her öğrenilen sayfa ağacı büyütür; günlük seri onu yeşil tutar.",
      askVoice: "Sesle sor",
    },
    studyNudge: {
      morning: { t: "Ağacın seni bekliyor", b: "Bugün bir sayfa büyümesi için yeter." },
      afternoon: { t: "Devam edelim mi?", b: "Dersin ve öğretmenin hazır." },
      evening: { t: "Ağacın için son çağrı", b: "Birkaç dakika köklerini canlı tutar." },
      streak: { t: "{{count}} günlük seri", b: "Ağacının kurumasına izin verme: bir sayfa yeter." },
      comeback: { t: "Dersin seni bekliyor", b: "İstediğin zaman dön; kaldığın yerden devam ederiz." },
    },
  },
};

for (const [lang, data] of Object.entries(DATA)) {
  const p = `src/locales/${lang}.json`;
  const raw = fs.readFileSync(p, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const j = JSON.parse(raw);
  j.study = { ...j.study, ...data.study };
  j.studyNudge = data.studyNudge;
  fs.writeFileSync(p, JSON.stringify(j, null, 2).replace(/\n/g, eol) + eol);
  console.log("updated", lang);
}

// Local OCR for scanned pages. Tesseract runs in a worker, so the UI stays responsive.
// The language data is downloaded on first use and then cached by the browser.
import Tesseract from "tesseract.js";

type Worker = Awaited<ReturnType<typeof Tesseract.createWorker>>;

const LANG: Record<string, string> = {
  fr: "fra", en: "eng", de: "deu", es: "spa", hu: "hun", tr: "tur",
  it: "ita", pt: "por", pl: "pol", ru: "rus", ar: "ara", ja: "jpn", ko: "kor", zh: "chi_sim",
};

let worker: Worker | null = null;
let workerLang = "";

/** Recognises the text in a rendered PDF page. `onProgress` is 0..1 while Tesseract reads it. */
export async function ocrCanvas(canvas: HTMLCanvasElement, lang: string, onProgress?: (p: number) => void): Promise<string> {
  const code = LANG[lang.slice(0, 2)] ?? "eng";
  if (!worker || workerLang !== code) {
    await worker?.terminate().catch(() => {});
    worker = await Tesseract.createWorker(code, 1, {
      logger: (m) => { if (m.status === "recognizing text") onProgress?.(m.progress ?? 0); },
    });
    workerLang = code;
  }
  onProgress?.(0);
  const { data } = await worker.recognize(canvas);
  return data.text.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export async function stopOcr() {
  await worker?.terminate().catch(() => {});
  worker = null;
  workerLang = "";
}

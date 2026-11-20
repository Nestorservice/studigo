// PDF import, text extraction and page rendering. All local: the file never leaves the app.
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type ParsedPdf = { bytes: ArrayBuffer; texts: string[]; pages: number };

/** Reads every page's text and keeps the original bytes (text is used by the tutor, bytes by the viewer). */
export async function parsePdf(file: File, onProgress?: (page: number, total: number) => void): Promise<ParsedPdf> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
  const pages = pdf.numPages;
  const texts: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim());
    onProgress?.(i, pages);
  }
  await pdf.cleanup();
  return { bytes, texts, pages };
}

const docs = new Map<string, Promise<PDFDocumentProxy>>();

function doc(id: string, bytes: ArrayBuffer) {
  let d = docs.get(id);
  if (!d) {
    d = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
    docs.set(id, d);
    d.catch(() => docs.delete(id));
  }
  return d;
}

/** Draws one page into a canvas at a scale that fits `maxWidth` CSS pixels. */
export async function renderPage(id: string, bytes: ArrayBuffer, page: number, canvas: HTMLCanvasElement, maxWidth: number) {
  const pdf = await doc(id, bytes);
  const p = await pdf.getPage(page);
  const base = p.getViewport({ scale: 1 });
  const scale = Math.max(0.4, Math.min(2.5, maxWidth / base.width));
  const viewport = p.getViewport({ scale });
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await p.render({ canvas, canvasContext: ctx, viewport }).promise;
}

export function forgetPdf(id: string) {
  const d = docs.get(id);
  docs.delete(id);
  d?.then((pdf) => pdf.cleanup()).catch(() => {});
}

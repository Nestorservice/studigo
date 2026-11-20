import { useEffect, useState } from "react";
import { deleteDoc, initCoverage, saveDoc } from "./store";
import { forgetPdf, parsePdf } from "./pdf";

/** The study domain starts here: sources are the material the tutor will work from.
 *  This first version stores metadata locally; ingestion/analysis comes next. */
export type SourceKind = "pdf" | "docx" | "image" | "video" | "youtube" | "web" | "file";
export type Source = {
  id: string;
  name: string;
  kind: SourceKind;
  size?: number;
  url?: string;
  addedAt: number;
  status: "todo" | "ready";
  pages?: number;
  pdfId?: string;
  subjectId?: string;
};

/** Placeholder course used to create a profile until subjects are generated from sources. */
export const STUDY_ISO = "xx";

const KEY = "studigo.sources";
let cache: Source[] | null = null;

const read = (): Source[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
const write = (sources: Source[]) => {
  cache = sources;
  try { localStorage.setItem(KEY, JSON.stringify(sources)); } catch { /* private mode */ }
  window.dispatchEvent(new Event("studigo:sources"));
};

export const loadSources = () => (cache ??= read());

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function addSource(input: { id?: string; name: string; kind: SourceKind; size?: number; url?: string; pages?: number; pdfId?: string; subjectId?: string; status?: "todo" | "ready" }): Source {
  const source: Source = {
    id: input.id ?? uid(),
    name: input.name,
    kind: input.kind,
    size: input.size,
    url: input.url,
    pages: input.pages,
    pdfId: input.pdfId,
    subjectId: input.subjectId,
    addedAt: Date.now(),
    status: input.status ?? "todo",
  };
  write([source, ...loadSources()]);
  return source;
}

export function updateSource(id: string, patch: Partial<Source>) {
  write(loadSources().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

/** Parses a PDF locally, stores its bytes/text and returns the source ready to study. */
export async function importFile(file: File, subjectId: string | null | undefined, onProgress?: (page: number, total: number) => void): Promise<Source> {
  const kind = kindOf(file.name);
  if (kind === "pdf") {
    const parsed = await parsePdf(file, onProgress);
    const id = uid();
    await saveDoc({ id, bytes: parsed.bytes, texts: parsed.texts, pages: parsed.pages });
    await initCoverage(id, parsed.pages);
    return addSource({ id, name: file.name, kind, size: file.size, pages: parsed.pages, pdfId: id, subjectId: subjectId ?? undefined, status: "ready" });
  }
  return addSource({ name: file.name, kind, size: file.size, subjectId: subjectId ?? undefined });
}

export async function removeSource(id: string) {
  const source = loadSources().find((s) => s.id === id);
  if (source?.pdfId) {
    forgetPdf(source.pdfId);
    await deleteDoc(source.pdfId);
  }
  write(loadSources().filter((s) => s.id !== id));
}

export function useSources() {
  const [sources, setSources] = useState(loadSources);
  useEffect(() => {
    const refresh = () => setSources(loadSources());
    window.addEventListener("studigo:sources", refresh);
    return () => window.removeEventListener("studigo:sources", refresh);
  }, []);
  return sources;
}

export function kindOf(name: string): SourceKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx" || ext === "rtf" || ext === "odt") return "docx";
  if (["png", "jpg", "jpeg", "webp", "gif", "heic", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "mkv", "webm", "avi", "m4v"].includes(ext)) return "video";
  return "file";
}

export const youtube = (url: string) => /(^|\/\/)(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
export const sourceKindLabel = (k: SourceKind) =>
  k === "youtube" ? "YouTube" : k === "web" ? "Web" : k === "docx" ? "Word" : k.toUpperCase();

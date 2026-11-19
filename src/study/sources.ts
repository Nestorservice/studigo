import { useEffect, useState } from "react";

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

export function addSource(input: { name: string; kind: SourceKind; size?: number; url?: string }): Source {
  const source: Source = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    kind: input.kind,
    size: input.size,
    url: input.url,
    addedAt: Date.now(),
    status: "todo",
  };
  write([source, ...loadSources()]);
  return source;
}

export const removeSource = (id: string) => write(loadSources().filter((s) => s.id !== id));

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

// Local storage for study material. Metadata lives in localStorage (small);
// PDF bytes and extracted text live in IndexedDB (a 70-page PDF is far too big for localStorage).
import { useEffect, useState } from "react";

export type PageStatus = "todo" | "explained" | "mastered";
export type StoredDoc = { id: string; bytes: ArrayBuffer; texts: string[]; pages: number };
export type ExplanationRecord = {
  key: string;
  sourceId: string;
  page: number;
  explanation: string;
  keyPoints: string[];
  formulas: string[];
  check: { question: string; answer: string }[];
  createdAt: number;
};
type CoverageRow = { sourceId: string; statuses: PageStatus[] };

const DB_NAME = "studigo-study";
const DB_VERSION = 2;
let dbp: Promise<IDBDatabase> | null = null;
const memoryDocs = new Map<string, StoredDoc>();
const memoryCoverage = new Map<string, PageStatus[]>();
const memoryExplanations = new Map<string, ExplanationRecord>();

function openDb(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("coverage")) db.createObjectStore("coverage", { keyPath: "sourceId" });
      if (!db.objectStoreNames.contains("explanations")) db.createObjectStore("explanations", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbp;
}

const request = <T,>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
});

export async function saveDoc(doc: StoredDoc): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction("docs", "readwrite");
    tx.objectStore("docs").put(doc);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  } catch { memoryDocs.set(doc.id, doc); }
}

export async function getDoc(id: string): Promise<StoredDoc | null> {
  try {
    const db = await openDb();
    const row = await request(db.transaction("docs").objectStore("docs").get(id));
    return (row as StoredDoc | undefined) ?? memoryDocs.get(id) ?? null;
  } catch { return memoryDocs.get(id) ?? null; }
}

export async function deleteDoc(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(["docs", "coverage"], "readwrite");
    tx.objectStore("docs").delete(id);
    tx.objectStore("coverage").delete(id);
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  } catch { /* memory only */ }
  memoryDocs.delete(id);
  memoryCoverage.delete(id);
  const exps = await listExplanations();
  for (const e of exps.filter((x) => x.sourceId === id)) await deleteExplanation(e.key);
}

const pad = (s: PageStatus[] | undefined, pages: number): PageStatus[] =>
  Array.from({ length: pages }, (_, i) => s?.[i] ?? "todo");

export async function getCoverage(sourceId: string, pages: number): Promise<PageStatus[]> {
  try {
    const db = await openDb();
    const row = (await request(db.transaction("coverage").objectStore("coverage").get(sourceId))) as CoverageRow | undefined;
    return pad(row?.statuses, pages);
  } catch { return pad(memoryCoverage.get(sourceId), pages); }
}

export async function initCoverage(sourceId: string, pages: number): Promise<void> {
  if (await getCoverage(sourceId, pages).then((c) => c.some((x) => x !== "todo"))) return;
  await putCoverage({ sourceId, statuses: pad(undefined, pages) });
}

async function putCoverage(row: CoverageRow): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction("coverage", "readwrite");
    tx.objectStore("coverage").put(row);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  } catch { memoryCoverage.set(row.sourceId, row.statuses); }
  window.dispatchEvent(new Event("studigo:coverage"));
}

export async function setCoveragePage(sourceId: string, page: number, pages: number, status: PageStatus): Promise<void> {
  const statuses = await getCoverage(sourceId, pages);
  statuses[page - 1] = status;
  await putCoverage({ sourceId, statuses });
}

export function useCoverage(sourceId: string | null | undefined, pages: number) {
  const [coverage, setCoverage] = useState<PageStatus[]>(() => pad(undefined, pages));
  useEffect(() => {
    if (!sourceId || !pages) { setCoverage(pad(undefined, pages)); return; }
    let live = true;
    const load = () => getCoverage(sourceId, pages).then((c) => { if (live) setCoverage(c); });
    void load();
    window.addEventListener("studigo:coverage", load);
    return () => { live = false; window.removeEventListener("studigo:coverage", load); };
  }, [sourceId, pages]);
  return coverage;
}

const explanationKey = (sourceId: string, page: number) => `${sourceId}:${page}`;

export async function saveExplanation(record: Omit<ExplanationRecord, "key" | "createdAt">): Promise<ExplanationRecord> {
  const full: ExplanationRecord = { ...record, key: explanationKey(record.sourceId, record.page), createdAt: Date.now() };
  try {
    const db = await openDb();
    const tx = db.transaction("explanations", "readwrite");
    tx.objectStore("explanations").put(full);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  } catch { memoryExplanations.set(full.key, full); }
  window.dispatchEvent(new Event("studigo:explanations"));
  return full;
}

export async function getExplanation(sourceId: string, page: number): Promise<ExplanationRecord | null> {
  const key = explanationKey(sourceId, page);
  try {
    const db = await openDb();
    const row = await request(db.transaction("explanations").objectStore("explanations").get(key));
    return (row as ExplanationRecord | undefined) ?? memoryExplanations.get(key) ?? null;
  } catch { return memoryExplanations.get(key) ?? null; }
}

export async function listExplanations(): Promise<ExplanationRecord[]> {
  try {
    const db = await openDb();
    const rows = (await request(db.transaction("explanations").objectStore("explanations").getAll())) as ExplanationRecord[];
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  } catch { return [...memoryExplanations.values()].sort((a, b) => b.createdAt - a.createdAt); }
}

export async function deleteExplanation(key: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction("explanations", "readwrite");
    tx.objectStore("explanations").delete(key);
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  } catch { /* memory only */ }
  memoryExplanations.delete(key);
  window.dispatchEvent(new Event("studigo:explanations"));
}

export function useExplanations() {
  const [rows, setRows] = useState<ExplanationRecord[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => listExplanations().then((x) => { if (live) setRows(x); });
    void load();
    window.addEventListener("studigo:explanations", load);
    return () => { live = false; window.removeEventListener("studigo:explanations", load); };
  }, []);
  return rows;
}

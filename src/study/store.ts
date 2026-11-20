// Local storage for study material. Metadata lives in localStorage (small);
// PDF bytes and extracted text live in IndexedDB (a 70-page PDF is far too big for localStorage).
import { useEffect, useState } from "react";

export type PageStatus = "todo" | "explained" | "mastered";
export type StoredDoc = { id: string; bytes: ArrayBuffer; texts: string[]; pages: number };
type CoverageRow = { sourceId: string; statuses: PageStatus[] };

const DB_NAME = "studigo-study";
const DB_VERSION = 1;
let dbp: Promise<IDBDatabase> | null = null;
const memoryDocs = new Map<string, StoredDoc>();
const memoryCoverage = new Map<string, PageStatus[]>();

function openDb(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("coverage")) db.createObjectStore("coverage", { keyPath: "sourceId" });
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

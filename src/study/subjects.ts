import { useEffect, useState } from "react";
import { listCoverage } from "./store";
import { loadSources, updateSource, useSources } from "./sources";
import { treeState, type TreeState } from "../tree";

export type Subject = { id: string; name: string; color: string; icon: string; createdAt: number };

export const SUBJECT_COLORS = ["#4f8a3c", "#3d7a99", "#b07cf0", "#cf7a4c", "#e91e63", "#00b8a9", "#f5b014", "#5c6bc0"];
export const SUBJECT_ICONS = ["📘", "📐", "🧪", "🌍", "💻", "⚖️", "🧠", "🎨", "📊", "🔬"];

const KEY = "studigo.subjects";
let cache: Subject[] | null = null;
const uid = () => `subject-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const read = (): Subject[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const write = (subjects: Subject[]) => {
  cache = subjects;
  try { localStorage.setItem(KEY, JSON.stringify(subjects)); } catch { /* private mode */ }
  window.dispatchEvent(new Event("studigo:subjects"));
};

export const loadSubjects = () => (cache ??= read());

export function addSubject(input: { name: string; color: string; icon: string }): Subject {
  const subject: Subject = { id: uid(), name: input.name.trim(), color: input.color, icon: input.icon, createdAt: Date.now() };
  write([...loadSubjects(), subject]);
  return subject;
}

export function removeSubject(id: string) {
  write(loadSubjects().filter((s) => s.id !== id));
  for (const source of loadSources().filter((s) => s.subjectId === id)) updateSource(source.id, { subjectId: undefined });
}

export function useSubjects() {
  const [subjects, setSubjects] = useState(loadSubjects);
  useEffect(() => {
    const refresh = () => setSubjects(loadSubjects());
    window.addEventListener("studigo:subjects", refresh);
    return () => window.removeEventListener("studigo:subjects", refresh);
  }, []);
  return subjects;
}

let selected: string | null = null;
const subs = new Set<() => void>();
export function selectSubject(id: string | null) {
  selected = id;
  subs.forEach((f) => f());
}
export function useSelectedSubject() {
  const [value, setValue] = useState(selected);
  useEffect(() => {
    const update = () => setValue(selected);
    subs.add(update);
    return () => { subs.delete(update); };
  }, []);
  return value;
}

/** Mastered pages for one subject, kept in sync by the coverage store. */
export function useSubjectProgress(subjectId: string | undefined) {
  const sources = useSources().filter((s) => s.subjectId === subjectId);
  const signature = sources.map((s) => `${s.id}:${s.pages ?? 0}`).join("|");
  const [mastered, setMastered] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () => {
      listCoverage().then((rows) => {
        if (!live) return;
        let m = 0, t = 0;
        for (const source of sources) {
          const pages = source.pages ?? 0;
          t += pages;
          const row = rows.find((r) => r.sourceId === source.id);
          m += row ? row.statuses.filter((x) => x === "mastered").length : 0;
        }
        setMastered(m);
        setTotal(t);
      }).catch(() => {});
    };
    load();
    window.addEventListener("studigo:coverage", load);
    return () => { live = false; window.removeEventListener("studigo:coverage", load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return { sources, mastered, total };
}

/** Global mastered pages, for the mini tree in the sidebar/garden. */
export function useStudyTotals() {
  const sources = useSources();
  const signature = sources.map((s) => `${s.id}:${s.pages ?? 0}`).join("|");
  const [mastered, setMastered] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () => listCoverage().then((rows) => {
      if (!live) return;
      let m = 0, t = 0;
      for (const source of sources) {
        t += source.pages ?? 0;
        const row = rows.find((r) => r.sourceId === source.id);
        m += row ? row.statuses.filter((x) => x === "mastered").length : 0;
      }
      setMastered(m); setTotal(t);
    }).catch(() => {});
    load();
    window.addEventListener("studigo:coverage", load);
    return () => { live = false; window.removeEventListener("studigo:coverage", load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return { mastered, total };
}

/** A tree whose growth is the number of mastered pages; fruits every 10 pages, capped by the drawing. */
export function studyTree(mastered: number, streak: number, lastActive: string | null): TreeState {
  const done = new Set(Array.from({ length: mastered }, (_, i) => `study:${i}`));
  return { ...treeState(done, streak, lastActive), fruit: Math.min(6, Math.floor(mastered / 10)) };
}

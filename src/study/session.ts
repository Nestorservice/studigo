import { useEffect, useState } from "react";

export type StudySession = { sourceId: string; page: number };

let current: StudySession | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Opens the study room on one page. Called by the library, the coverage map and the home. */
export function openStudy(sourceId: string, page = 1) {
  current = { sourceId, page: Math.max(1, Math.floor(page)) };
  emit();
}

export function setStudyPage(page: number) {
  if (!current) return;
  current = { ...current, page: Math.max(1, Math.floor(page)) };
  emit();
}

export function useStudySession() {
  const [session, setSession] = useState<StudySession | null>(current);
  useEffect(() => {
    const update = () => setSession(current);
    subs.add(update);
    return () => { subs.delete(update); };
  }, []);
  return session;
}

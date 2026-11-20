// Study domain screens. Same design system as Sprigo; the language-course domain is gone.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../icons";
import { useApp } from "../store";
import { Face } from "../face/Face";
import { CHARACTERS } from "../characters";
import { Avatar } from "./Profiles";
import { getDoc, getExplanation, listCoverage, saveExplanation, setCoveragePage, useCoverage, useExplanations, type ExplanationRecord, type StoredDoc } from "../study/store";
import { renderPage } from "../study/pdf";
import { openStudy, setStudyPage, useStudySession } from "../study/session";
import { askPageQuestion, explainPage, type PageExplanation } from "../study/ai";
import {
  addSource, importFile, kindOf, loadSources, removeSource, sourceKindLabel, useSources, youtube,
  type Source, type SourceKind,
} from "../study/sources";
import {
  addSubject, removeSubject, selectSubject, studyTree, SUBJECT_COLORS, SUBJECT_ICONS,
  useSelectedSubject, useSubjectProgress, useSubjects, useStudyTotals, type Subject,
} from "../study/subjects";
import { treeSvg } from "../tree";
import { notify } from "../notify";
import { recordSession, today } from "../progress";
import { startRecording, type Recording } from "../stt";
import { speak } from "../tts";

const gap = (g: string) => ({ "--od-gap": g }) as React.CSSProperties;
const TUTOR = CHARACTERS.nora; // neutral friendly face; the study tutor is not a language character

const sourceIcon = (k: SourceKind): IconName =>
  k === "video" || k === "youtube" ? "video" : k === "image" ? "book" : k === "web" ? "chat" : "story";

const sizeLabel = (n?: number) => {
  if (!n) return "";
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`;
};

function useStoredDoc(source: Source | null) {
  const [doc, setDoc] = useState<StoredDoc | null>(null);
  useEffect(() => {
    let live = true;
    setDoc(null);
    if (!source?.pdfId) return;
    getDoc(source.pdfId).then((d) => { if (live) setDoc(d); }).catch(() => {});
    return () => { live = false; };
  }, [source?.pdfId]);
  return doc;
}

function SourceRow({ source, subject, onOpen }: { source: Source; subject?: Subject; onOpen: () => void }) {
  const { t } = useTranslation();
  const { toast } = useApp();
  return (
    <div className="card od-row" style={gap("12px")}>
      <span className="voice-icon" style={{ color: "var(--blue)" }}><Icon name={sourceIcon(source.kind)} /></span>
      <span className="od-field od-fill">
        <b style={{ overflowWrap: "anywhere" }}>{source.name}</b>
        <span className="muted small">
          {sourceKindLabel(source.kind)}{source.size ? ` · ${sizeLabel(source.size)}` : ""}
          {source.pages ? ` · ${source.pages} ${t("study.pages")}` : ""}{subject ? ` · ${subject.icon} ${subject.name}` : ""}
        </span>
      </span>
      <button className="btn btn-ghost" onClick={onOpen}>{t("study.open")}</button>
      <button className="icon-btn" aria-label={t("profiles.delete")}
        onClick={() => { void removeSource(source.id).then(() => toast(t("study.sourceRemoved"))); }}><Icon name="trash" /></button>
    </div>
  );
}

function CoverageGrid({ source, onOpen }: { source: Source; onOpen: (page: number) => void }) {
  const { t } = useTranslation();
  const total = source.pages ?? 0;
  const coverage = useCoverage(source.id, total);
  if (!total) return null;
  const explained = coverage.filter((s) => s !== "todo").length;
  const mastered = coverage.filter((s) => s === "mastered").length;
  return (
    <div className="od-stack" style={gap("8px")}>
      <div className="od-row" style={{ justifyContent: "space-between" }}>
        <span className="muted small">{t("study.coverage", { done: mastered, total })}</span>
        <span className="muted small">{t("study.explainedCount", { done: explained, total })}</span>
      </div>
      <div className="progress-track"><div className="progress-fill green" style={{ width: `${(mastered / total) * 100}%` }} /></div>
      <div className="coverage-grid">
        {coverage.map((status, i) => (
          <button key={i} className={`cov-page ${status}`} onClick={() => onOpen(i + 1)}
            aria-label={t(`study.status_${status}`, { page: i + 1 })} title={t(`study.status_${status}`)}>{i + 1}</button>
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ subject, large = false }: { subject: Subject; large?: boolean }) {
  const { t } = useTranslation();
  const { s, go, toast } = useApp();
  const { sources, mastered, total } = useSubjectProgress(subject.id);
  const tree = studyTree(mastered, s.streak, s.lastActive);
  const first = sources[0];
  return (
    <div className={`card subject-card${large ? " large" : ""}`}>
      <div className="od-row" style={gap("12px")}>
        <span className="subject-icon" style={{ background: subject.color }}>{subject.icon}</span>
        <span className="od-field od-fill">
          <b style={{ overflowWrap: "anywhere" }}>{subject.name}</b>
          <span className="muted small">{t("study.subjectMeta", { sources: sources.length, done: mastered, total })}</span>
        </span>
        <button className="icon-btn" aria-label={t("profiles.delete")}
          onClick={() => { removeSubject(subject.id); toast(t("study.subjectRemoved")); }}><Icon name="trash" /></button>
      </div>
      <div className={`subject-tree${large ? " large" : ""}`} aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: treeSvg(tree, !large) }} />
      <div className="progress-track"><div className="progress-fill green" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} /></div>
      <div className="od-row" style={{ justifyContent: "space-between", gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => {
          if (first) { openStudy(first.id, 1); go("roleplay"); }
          else { selectSubject(subject.id); go("stories"); }
        }}>{first ? t("study.openSubject") : t("study.import")}</button>
        <button className="btn btn-blue" onClick={() => { selectSubject(subject.id); go("stories"); }}>{t("study.importPdf")}</button>
      </div>
    </div>
  );
}

function NewSubjectForm({ onDone }: { onDone?: (id: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState(SUBJECT_ICONS[0]);
  const create = () => {
    if (!name.trim()) return;
    const subject = addSubject({ name, color, icon });
    setName("");
    onDone?.(subject.id);
  };
  return (
    <div className="card od-stack" style={gap("10px")}>
      <b>{t("study.newSubject")}</b>
      <div className="od-row" style={gap("8px")}>
        <input className="input od-fill" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("study.subjectName")}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }} aria-label={t("study.subjectName")} />
        <button className="btn btn-primary" disabled={!name.trim()} onClick={create}>{t("study.create")}</button>
      </div>
      <div className="od-row" style={{ flexWrap: "wrap", gap: 6 }} role="radiogroup" aria-label={t("study.subjectIcon")}>
        {SUBJECT_ICONS.map((i) => (
          <button key={i} className={`btn ${icon === i ? "btn-blue" : "btn-ghost"}`} role="radio" aria-checked={icon === i}
            aria-label={i} onClick={() => setIcon(i)}>{i}</button>
        ))}
      </div>
      <div className="od-row" style={{ flexWrap: "wrap", gap: 8 }} role="radiogroup" aria-label={t("study.subjectColor")}>
        {SUBJECT_COLORS.map((c) => (
          <button key={c} className="swatch" role="radio" aria-checked={color === c} aria-label={c} style={{ background: c }}
            onClick={() => setColor(c)} />
        ))}
      </div>
    </div>
  );
}

export function StudyHome() {
  const { t } = useTranslation();
  const { go, profile } = useApp();
  const sources = useSources();
  const subjects = useSubjects();
  const first = sources[0];
  const totalPages = sources.reduce((n, s) => n + (s.pages ?? 0), 0);
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.title")}</h1>
      <p className="muted" style={{ marginBottom: 4 }}>{t("study.subtitle")}</p>

      <h2 className="section-title">{t("study.subjects")}</h2>
      {subjects.length ? (
        <div className="subject-grid">{subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}</div>
      ) : <p className="muted small">{t("study.noSubjects")}</p>}
      <NewSubjectForm onDone={(id) => { selectSubject(id); go("stories"); }} />

      <div className="card od-row" style={gap("14px")}>
        <span className="voice-icon" style={{ color: "var(--blue)" }}><Icon name="book" /></span>
        <span className="od-field od-fill">
          <b>{first ? first.name : t("study.noSources")}</b>
          <span className="muted small">{first ? t("study.continueDesc") : t("study.noSourcesDesc")}</span>
        </span>
        <button className="btn btn-primary" onClick={() => {
          if (first) { openStudy(first.id, 1); go("roleplay"); } else go("stories");
        }}>{t(first ? "study.continue" : "study.import")}</button>
      </div>

      <h2 className="section-title">{t("study.sources")}</h2>
      {sources.length ? (
        <div className="od-stack" style={gap("14px")}>
          {sources.map((s) => (
            <div className="card od-stack" key={s.id} style={gap("12px")}>
              <SourceRow source={s} subject={subjects.find((x) => x.id === s.subjectId)} onOpen={() => { openStudy(s.id, 1); go("roleplay"); }} />
              <CoverageGrid source={s} onOpen={(page) => { openStudy(s.id, page); go("roleplay"); }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card od-stack" style={gap("10px")}>
          <b>{t("study.noSources")}</b>
          <p className="muted small">{t("study.noSourcesDesc")}</p>
          <button className="btn btn-blue" onClick={() => go("stories")}>{t("study.import")}</button>
        </div>
      )}

      <h2 className="section-title">{t("study.progress")}</h2>
      <div className="card">
        <div className="progress-track"><div className="progress-fill green" style={{ width: `${sources.length ? 2 : 0}%` }} /></div>
        <p className="muted small" style={{ marginTop: 8 }}>{t("study.coverage", { done: 0, total: totalPages })}</p>
        {profile && <p className="muted small">{t("study.courseDesc", { native: profile.native_lang })}</p>}
      </div>
    </div>
  );
}

export function StudyLibrary() {
  const { t } = useTranslation();
  const { go, toast } = useApp();
  const sources = useSources();
  const subjects = useSubjects();
  const selected = useSelectedSubject();
  const [subjectId, setSubjectId] = useState(selected ?? subjects[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; page: number; total: number } | null>(null);
  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  useEffect(() => {
    if (selected && subjects.some((s) => s.id === selected)) setSubjectId(selected);
    else if (!subjects.some((s) => s.id === subjectId)) setSubjectId(subjects[0]?.id ?? "");
  }, [selected, subjects.map((s) => s.id).join("|")]);

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files?.length || busy || !subjectId) return;
    setBusy(true);
    let added = 0;
    try {
      for (const file of Array.from(files)) {
        setProgress(kindOf(file.name) === "pdf" ? { name: file.name, page: 0, total: 0 } : null);
        try {
          await importFile(file, subjectId, (page, total) => setProgress({ name: file.name, page, total }));
          added++;
        } catch (e) {
          toast(t("study.importFailed", { error: (e as Error).message }));
        }
      }
      if (added) toast(t("study.importDone", { count: added }));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const addLink = () => {
    const value = url.trim();
    if (!value || !subjectId) return;
    try {
      const u = new URL(value);
      addSource({ name: u.hostname + u.pathname, kind: youtube(value) ? "youtube" : "web", url: value, subjectId });
      setUrl("");
      toast(t("study.sourceAdded"));
    } catch { toast(t("study.badLink")); }
  };

  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.library")}</h1>
      <p className="muted">{t("study.libraryDesc")}</p>

      <div className="card od-row" style={gap("12px")}>
        <span className="od-field od-fill"><b>{t("study.subject")}</b>
          <span className="muted small">{subject ? `${subject.icon} ${subject.name}` : t("study.noSubjects")}</span></span>
        {subjects.length > 0 && (
          <select className="select" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); selectSubject(e.target.value); }} aria-label={t("study.subject")}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        )}
      </div>

      {subjects.length === 0 && <NewSubjectForm onDone={(id) => { setSubjectId(id); selectSubject(id); }} />}

      <div className="card od-stack" style={gap("12px")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}>
        <input ref={inputRef} type="file" multiple hidden
          accept=".pdf,.doc,.docx,.rtf,.odt,image/*,video/*"
          onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
        <button className="btn btn-blue btn-block" disabled={busy || !subjectId} onClick={() => inputRef.current?.click()}>
          <Icon name="story" /> {t("study.addFile")}
        </button>
        <span className="muted small">{t("study.supported")}</span>
        {progress && (
          <div className="od-stack" style={gap("6px")} role="status">
            <span className="small">{t("study.importing", { name: progress.name, page: progress.page, total: progress.total || "…" })}</span>
            <div className="progress-track"><div className="progress-fill green" style={{ width: `${progress.total ? (progress.page / progress.total) * 100 : 10}%` }} /></div>
          </div>
        )}
        <div className="od-row" style={gap("8px")}>
          <input className="input od-fill" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
            placeholder={t("study.linkPlaceholder")} aria-label={t("study.addLink")} />
          <button className="btn btn-ghost" disabled={!url.trim() || !subjectId} onClick={addLink}>{t("study.addLink")}</button>
        </div>
      </div>

      {sources.length > 0 && <div className="od-stack" style={gap("10px")}>
        {sources.map((s) => <SourceRow key={s.id} source={s} subject={subjects.find((x) => x.id === s.subjectId)} onOpen={() => { openStudy(s.id, 1); go("roleplay"); }} />)}
      </div>}
    </div>
  );
}

export function StudyRoom() {
  const { t } = useTranslation();
  const { go, profile, ai, toast, gainXp, setS } = useApp();
  const sources = useSources();
  const subjects = useSubjects();
  const session = useStudySession();
  const source = sources.find((s) => s.id === session?.sourceId) ?? sources[0] ?? null;
  const doc = useStoredDoc(source);
  const total = source?.pages ?? doc?.pages ?? 1;
  const page = Math.min(Math.max(session?.page ?? 1, 1), total);
  const coverage = useCoverage(source?.id, total);
  const status = coverage[page - 1] ?? "todo";
  const pageText = doc?.texts[page - 1] ?? "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [explanation, setExplanation] = useState<PageExplanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [talking, setTalking] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);

  const award = (xp: number, kind: "lesson" | "practice") => {
    gainXp(xp);
    setS((st) => recordSession(st, { xp, gems: 0, kind }, today()));
  };

  useEffect(() => {
    setExplanation(null); setChat([]); setErr("");
    if (!source) return;
    let live = true;
    getExplanation(source.id, page).then((saved) => { if (live && saved) setExplanation(saved); }).catch(() => {});
    return () => { live = false; };
  }, [source?.id, page]);

  // Draw the PDF page; re-draw when the pane is resized.
  useEffect(() => {
    if (!source?.pdfId || !doc) return;
    const canvas = canvasRef.current, box = paneRef.current;
    if (!canvas || !box) return;
    let live = true;
    const draw = () => {
      if (!live) return;
      void renderPage(source.pdfId!, doc.bytes, page, canvas, Math.max(220, box.clientWidth - 32)).catch(() => {});
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => { live = false; ro.disconnect(); };
  }, [source?.pdfId, doc, page]);

  const context = source ? { title: source.name, page, total, text: pageText, native: profile?.native_lang ?? "fr" } : null;

  const explain = async () => {
    if (!context || !source) return;
    if (!ai) { setErr(t("study.aiNeeded")); return; }
    if (!pageText.trim()) { setErr(t("study.noText")); return; }
    setBusy(true); setErr("");
    try {
      const result = await explainPage(context);
      const saved = await saveExplanation({
        sourceId: source.id, page,
        explanation: result.explanation, keyPoints: result.keyPoints, formulas: result.formulas, check: result.check,
      });
      setExplanation(saved);
      await setCoveragePage(source.id, page, total, "explained");
      if (status === "todo") award(5, "practice");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || !context || busy) return;
    setBusy(true); setErr("");
    try {
      const answer = await askPageQuestion(context, question);
      setChat((c) => [...c, { q: question, a: answer }]);
      setQ("");
      // Spoken answer: with ElevenLabs selected this is the conversation's voice.
      if (profile) { setTalking(true); void speak(answer, profile.native_lang).catch(() => {}).finally(() => setTalking(false)); }
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const listen = () => {
    if (!explanation || !profile) return;
    setTalking(true);
    void speak(explanation.explanation, profile.native_lang).catch(() => {}).finally(() => setTalking(false));
  };

  const mastered = async () => {
    if (!source || !explanation) return;
    if (status === "mastered") return;
    await setCoveragePage(source.id, page, total, "mastered");
    award(10, "lesson");
    toast(t("study.mastered"));
    // A finished subject is the best moment to bring the learner back.
    const subject = subjects.find((x) => x.id === source.subjectId);
    if (subject) {
      const own = loadSources().filter((x) => x.subjectId === subject.id);
      const rows = await listCoverage();
      const pages = own.reduce((n, x) => n + (x.pages ?? 0), 0);
      const done = own.reduce((n, x) => n + (rows.find((r) => r.sourceId === x.id)?.statuses.filter((v) => v === "mastered").length ?? 0), 0);
      if (pages > 0 && done === pages) void notify(t("study.subjectDone", { name: subject.name }), t("study.subjectDoneDesc"));
    }
  };

  const askVoice = async () => {
    if (!profile) return;
    try {
      if (recording) {
        const r = await recording.stop();
        setRecording(null);
        if (r.text.trim()) setQ(r.text.trim());
        return;
      }
      let rec: Recording;
      rec = await startRecording(profile.native_lang, async () => {
        const r = await rec.stop();
        setRecording(null);
        if (r.text.trim()) setQ(r.text.trim());
      });
      setRecording(rec);
    } catch (e) { toast((e as Error).message); }
  };

  const faceState = busy ? "thinking" : talking ? "talking" : "idle";

  return (
    <div className="od-stack" style={gap("12px")}>
      <div className="od-row-top" style={gap("8px")}>
        <h1 className="section-title" style={{ margin: "24px 0 0" }}>{t("study.room")}</h1>
        <span className="muted small" style={{ marginTop: 32 }}>{t("study.roomDesc")}</span>
      </div>

      <div className="card" style={{ padding: 8 }}>
        <div className="call-grid study-room">
          <section className="call-pane tutor" aria-label={t("study.tutor")}>
            <Face spec={TUTOR.face} color={TUTOR.color} label={t("study.tutor")} state={faceState} />
            <b className="call-name">{t("study.tutor")}</b>
          </section>

          <section className="call-pane me" aria-label={profile?.name ?? t("study.you")}>
            {profile && <Avatar p={profile} size={96} />}
            <b className="call-name">{profile?.name ?? t("study.you")}</b>
          </section>

          <section className="call-pane study-source" aria-label={t("study.source")}>
            <span className="study-pane-title">{t("study.source")}</span>
            <div className="study-doc" ref={paneRef}>
              <div className="od-row" style={{ justifyContent: "space-between", gap: 8 }}>
                <b className="study-doc-title">{source?.name ?? t("study.noSource")}</b>
                {source?.pdfId && <span className="muted small od-nowrap">{page} / {total}</span>}
              </div>
              {source?.pdfId && doc ? (
                <canvas ref={canvasRef} className="study-canvas" />
              ) : (
                <div className="od-stack" style={gap("10px")}>
                  <p className="muted small">{source?.kind === "pdf" ? t("study.reimport") : t("study.noPdf")}</p>
                  <button className="btn btn-blue" onClick={() => go("stories")}>{t("study.import")}</button>
                </div>
              )}
              {source?.pdfId && (
                <div className="od-row study-page-nav">
                  <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setStudyPage(page - 1)}>{t("study.previous")}</button>
                  <span className={`cov-page ${status}`} title={t(`study.status_${status}`)}>{page}</span>
                  <button className="btn btn-ghost" disabled={page >= total} onClick={() => setStudyPage(page + 1)}>{t("study.next")}</button>
                </div>
              )}
            </div>
          </section>

          <section className="call-pane study-board" aria-label={t("study.board")}>
            <span className="study-pane-title">{t("study.board")} · {t(`study.status_${status}`)}</span>
            <div className="study-board-inner">
              {err && (
                <div className="study-error">
                  <p>{err}</p>
                  {!ai && <button className="btn btn-blue" onClick={() => go("settings")}>{t("ai.openSettings")}</button>}
                </div>
              )}
              {!explanation && !busy && !err && <p className="muted small">{t("study.explainFirst")}</p>}
              {busy && <p className="muted small study-thinking">{t("ai.thinking")}</p>}
              {explanation && (
                <div className="study-explain">
                  <p>{explanation.explanation}</p>
                  <b>{t("study.keyPoints")}</b>
                  <ul>{explanation.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
                  {explanation.formulas.length > 0 && <>
                    <b>{t("study.formulas")}</b>
                    <div className="study-formulas">{explanation.formulas.map((f, i) => <code key={i}>{f}</code>)}</div>
                  </>}
                  <b>{t("study.check")}</b>
                  {explanation.check.map((c, i) => (
                    <details className="study-check" key={i}><summary>{c.question}</summary><p>{c.answer}</p></details>
                  ))}
                </div>
              )}
              {chat.length > 0 && <div className="study-qa">
                {chat.map((m, i) => (
                  <div key={i} className="study-qa-item">
                    <div className="od-row" style={{ justifyContent: "space-between", gap: 6 }}>
                      <b>{m.q}</b>
                      {profile && <button className="icon-btn" aria-label={t("study.listen")} title={t("study.listen")}
                        onClick={() => { setTalking(true); void speak(m.a, profile.native_lang).catch(() => {}).finally(() => setTalking(false)); }}><Icon name="headphones" /></button>}
                    </div>
                    <p>{m.a}</p>
                  </div>
                ))}
              </div>}
              <form className="od-row study-ask" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
                <button type="button" className={`icon-btn${recording ? " on" : ""}`} aria-label={t("study.askVoice")} title={t("study.askVoice")}
                  aria-pressed={!!recording} onClick={() => void askVoice()}><Icon name="mic" /></button>
                <input className="input od-fill" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("study.askPlaceholder")} aria-label={t("study.ask")} disabled={busy} />
                <button className="icon-btn" type="submit" disabled={!q.trim() || busy} aria-label={t("study.send")}><Icon name="send" /></button>
              </form>
            </div>
          </section>
        </div>

        <div className="call-bar" style={{ marginTop: 10 }}>
          <button className="call-btn" aria-label={t("study.explain")} title={t("study.explain")} disabled={busy || !source} onClick={() => void explain()}><Icon name="spark" /></button>
          <button className="call-btn" aria-label={t("study.listen")} title={t("study.listen")} disabled={!explanation || talking} onClick={listen}><Icon name="headphones" /></button>
          <button className="call-btn" aria-label={t("study.markMastered")} title={t("study.markMastered")} disabled={!explanation} onClick={() => void mastered()}><Icon name="check" /></button>
          <button className={`call-btn ${status !== "todo" ? "on" : ""}`} aria-label={t("study.board")} title={t("study.board")} disabled><Icon name="book" /></button>
          <button className="call-btn end" aria-label={t("study.end")} title={t("study.end")} onClick={() => go("learn")}><Icon name="phone" /></button>
        </div>
      </div>
    </div>
  );
}

export function StudyGarden() {
  const { t } = useTranslation();
  const { s } = useApp();
  const subjects = useSubjects();
  const { mastered, total } = useStudyTotals();
  const tree = studyTree(mastered, s.streak, s.lastActive);
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.gardenTitle")}</h1>
      <p className="muted">{t("study.gardenDesc")}</p>
      <div className="card study-garden-hero">
        <div className="subject-tree large" aria-hidden="true" dangerouslySetInnerHTML={{ __html: treeSvg(tree, false) }} />
        <div className="od-stack" style={gap("4px")}>
          <b>{t(`garden.stage${tree.stage}`)}</b>
          <span className="muted small">{t("profile.streakDays", { count: s.streak })}</span>
          <span className="muted small">{t("study.coverage", { done: mastered, total })}</span>
          <span className="muted small">{t("study.treeHint")}</span>
        </div>
      </div>
      <h2 className="section-title">{t("study.subjects")}</h2>
      {subjects.length ? (
        <div className="subject-grid">{subjects.map((x) => <SubjectCard key={x.id} subject={x} large />)}</div>
      ) : <NewSubjectForm />}
    </div>
  );
}

export function StudyPractice() {
  const { t } = useTranslation();
  const { toast } = useApp();
  const sources = useSources();
  const explanations = useExplanations();

  const mark = async (e: ExplanationRecord) => {
    const source = sources.find((s) => s.id === e.sourceId);
    await setCoveragePage(e.sourceId, e.page, source?.pages ?? e.page, "mastered");
    toast(t("study.mastered"));
  };

  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.exercises")}</h1>
      <p className="muted">{t("study.exercisesDesc")}</p>
      {explanations.length === 0 ? (
        <div className="card od-stack" style={gap("8px")}>
          <b>{t("study.noExplanations")}</b>
          <p className="muted small">{t("study.explainFirst")}</p>
        </div>
      ) : (
        <div className="od-stack" style={gap("12px")}>
          {explanations.map((e) => {
            const source = sources.find((s) => s.id === e.sourceId);
            return (
              <div className="card od-stack" key={e.key} style={gap("10px")}>
                <div className="od-row" style={{ justifyContent: "space-between" }}>
                  <span className="od-field od-fill">
                    <b style={{ overflowWrap: "anywhere" }}>{source?.name ?? t("study.source")}</b>
                    <span className="muted small">{t("study.page")} {e.page}</span>
                  </span>
                  <button className="btn btn-ghost" onClick={() => void mark(e)}>{t("study.markMastered")}</button>
                </div>
                {e.check.map((c, i) => (
                  <details className="study-check" key={i}><summary>{c.question}</summary><p>{c.answer}</p></details>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudySheets() {
  const { t } = useTranslation();
  const sources = useSources();
  const explanations = useExplanations();
  const withContent = explanations.filter((e) => e.formulas.length > 0 || e.keyPoints.length > 0);
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.sheets")}</h1>
      <p className="muted">{t("study.sheetsDesc")}</p>
      {withContent.length === 0 ? (
        <div className="card od-stack" style={gap("8px")}>
          <b>{t("study.noExplanations")}</b>
          <p className="muted small">{t("study.explainFirst")}</p>
        </div>
      ) : withContent.map((e) => {
        const source = sources.find((s) => s.id === e.sourceId);
        return (
          <div className="card od-stack" key={e.key} style={gap("8px")}>
            <div className="od-row" style={{ justifyContent: "space-between" }}>
              <b style={{ overflowWrap: "anywhere" }}>{source?.name ?? t("study.source")}</b>
              <span className="muted small">{t("study.page")} {e.page}</span>
            </div>
            {e.formulas.length > 0 && <>
              <b>{t("study.sheetFormulas")}</b>
              <div className="study-formulas">{e.formulas.map((f, i) => <code key={i}>{f}</code>)}</div>
            </>}
            {e.keyPoints.length > 0 && <>
              <b>{t("study.keyPoints")}</b>
              <ul className="study-explain" style={{ margin: 0, paddingLeft: 20 }}>{e.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </>}
          </div>
        );
      })}
    </div>
  );
}

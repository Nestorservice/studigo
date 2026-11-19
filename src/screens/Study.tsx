// Study domain screens. They reuse the existing Sprigo design system and shell:
// same cards, same call-grid, same navigation. Only the content is academic.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../icons";
import { useApp } from "../store";
import { Face } from "../face/Face";
import { CHARACTERS } from "../characters";
import { Avatar } from "./Profiles";
import { addSource, kindOf, removeSource, sourceKindLabel, useSources, youtube, type Source, type SourceKind } from "../study/sources";

const gap = (g: string) => ({ "--od-gap": g }) as React.CSSProperties;
const TUTOR = CHARACTERS.nora; // a neutral, friendly face; the study tutor is not a language character

const sourceIcon = (k: SourceKind): IconName =>
  k === "video" || k === "youtube" ? "video" : k === "image" ? "book" : k === "web" ? "chat" : "story";

const sizeLabel = (n?: number) => {
  if (!n) return "";
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`;
};

function SourceRow({ source }: { source: Source }) {
  const { t } = useTranslation();
  return (
    <div className="card od-row" style={gap("12px")}>
      <span className="voice-icon" style={{ color: "var(--blue)" }}><Icon name={sourceIcon(source.kind)} /></span>
      <span className="od-field od-fill">
        <b style={{ overflowWrap: "anywhere" }}>{source.name}</b>
        <span className="muted small">
          {sourceKindLabel(source.kind)}{source.size ? ` · ${sizeLabel(source.size)}` : ""} · {t(source.status === "ready" ? "study.analyzed" : "study.ready")}
        </span>
      </span>
      <button className="icon-btn" aria-label={t("profiles.delete")} onClick={() => removeSource(source.id)}><Icon name="trash" /></button>
    </div>
  );
}

export function StudyHome() {
  const { t } = useTranslation();
  const { go, profile } = useApp();
  const sources = useSources();
  const first = sources[0];
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.title")}</h1>
      <p className="muted" style={{ marginBottom: 4 }}>{t("study.subtitle")}</p>

      <div className="card od-row" style={gap("14px")}>
        <span className="voice-icon" style={{ color: "var(--blue)" }}><Icon name="book" /></span>
        <span className="od-field od-fill">
          <b>{first ? first.name : t("study.noSources")}</b>
          <span className="muted small">{first ? t("study.continueDesc") : t("study.noSourcesDesc")}</span>
        </span>
        <button className="btn btn-primary" onClick={() => go(first ? "roleplay" : "stories")}>
          {t(first ? "study.continue" : "study.import")}
        </button>
      </div>

      <h2 className="section-title">{t("study.sources")}</h2>
      {sources.length ? (
        <div className="od-stack" style={gap("10px")}>{sources.slice(0, 4).map((s) => <SourceRow key={s.id} source={s} />)}</div>
      ) : (
        <div className="card od-stack" style={gap("10px")}>
          <b>{t("study.noSources")}</b>
          <p className="muted small">{t("study.noSourcesDesc")}</p>
          <button className="btn btn-blue" onClick={() => go("stories")}>{t("study.import")}</button>
        </div>
      )}

      <h2 className="section-title">{t("study.progress")}</h2>
      <div className="card">
        <div className="progress-track"><div className="progress-fill green" style={{ width: `${profile && sources.length ? 2 : 0}%` }} /></div>
        <p className="muted small" style={{ marginTop: 8 }}>{t("study.coverage", { done: 0, total: 0 })}</p>
      </div>
    </div>
  );
}

export function StudyLibrary() {
  const { t } = useTranslation();
  const { toast } = useApp();
  const sources = useSources();
  const [url, setUrl] = useState("");

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) addSource({ name: file.name, kind: kindOf(file.name), size: file.size });
    toast(t("study.sourceAdded"));
  };
  const addLink = () => {
    const value = url.trim();
    if (!value) return;
    try {
      const u = new URL(value);
      addSource({ name: u.hostname + u.pathname, kind: youtube(value) ? "youtube" : "web", url: value });
      setUrl("");
      toast(t("study.sourceAdded"));
    } catch { toast(t("study.badLink")); }
  };

  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.library")}</h1>
      <p className="muted">{t("study.libraryDesc")}</p>

      <div className="card od-stack" style={gap("12px")}>
        <label className="btn btn-blue btn-block" style={{ cursor: "pointer" }}>
          <Icon name="story" /> {t("study.addFile")}
          <input type="file" multiple hidden accept=".pdf,.doc,.docx,.rtf,.odt,image/*,video/*"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <span className="muted small">{t("study.supported")}</span>
        <div className="od-row" style={gap("8px")}>
          <input className="input od-fill" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
            placeholder={t("study.linkPlaceholder")} aria-label={t("study.addLink")} />
          <button className="btn btn-ghost" disabled={!url.trim()} onClick={addLink}>{t("study.addLink")}</button>
        </div>
      </div>

      {sources.length > 0 && <div className="od-stack" style={gap("10px")}>{sources.map((s) => <SourceRow key={s.id} source={s} />)}</div>}
    </div>
  );
}

export function StudyRoom() {
  const { t } = useTranslation();
  const { go, profile } = useApp();
  const sources = useSources();
  const first = sources[0];
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [board, setBoard] = useState(true);

  return (
    <div className="od-stack" style={gap("12px")}>
      <div className="od-row-top" style={gap("8px")}>
        <h1 className="section-title" style={{ margin: "24px 0 0" }}>{t("study.room")}</h1>
        <span className="muted small" style={{ marginTop: 32 }}>{t("study.roomDesc")}</span>
      </div>

      <div className="card" style={{ padding: 8 }}>
        <div className="call-grid study-room">
          <section className="call-pane tutor" aria-label={t("study.tutor")}>
            <Face spec={TUTOR.face} color={TUTOR.color} label={t("study.tutor")} state="idle" />
            <b className="call-name">{t("study.tutor")}</b>
          </section>

          <section className="call-pane me" aria-label={profile?.name ?? t("study.you")}>
            {profile && <Avatar p={profile} size={96} />}
            <b className="call-name">{profile?.name ?? t("study.you")}</b>
          </section>

          <section className="call-pane study-source" aria-label={t("study.source")}>
            <span className="study-pane-title">{t("study.source")}</span>
            <div className="study-doc">
              <h3>{first ? first.name : t("study.noSource")}</h3>
              {first ? <>
                <p className="muted small">{sourceKindLabel(first.kind)} · {t("study.page")} 1</p>
                {[92, 100, 86, 96, 70, 94, 88, 60].map((w, i) => <div key={i} className="study-line" style={{ width: `${w}%` }} />)}
                <div className="study-doc-note">{t("study.analyze")}</div>
              </> : <button className="btn btn-blue" onClick={() => go("stories")}>{t("study.import")}</button>}
            </div>
          </section>

          <section className="call-pane study-board" aria-label={t("study.board")}>
            <span className="study-pane-title">{t("study.board")}</span>
            <div className="study-board-inner">
              {board ? <>
                <div className="study-eq">∫₀¹ x² dx = [x³/3]₀¹ = 1/3</div>
                <div className="study-step"><b>1.</b> {t("study.stepPrimitive")}</div>
                <div className="study-step"><b>2.</b> {t("study.stepBounds")}</div>
                <div className="study-step"><b>3.</b> {t("study.stepResult")}</div>
                <div className="study-board-note">{t("study.boardNote")}</div>
              </> : <p className="muted small">{t("study.emptyBoard")}</p>}
            </div>
          </section>
        </div>

        <div className="call-bar" style={{ marginTop: 10 }}>
          <button className={`call-btn ${mic ? "on" : "off"}`} aria-pressed={mic} aria-label={t("study.mic")} onClick={() => setMic((v) => !v)}><Icon name="mic" /></button>
          <button className={`call-btn ${cam ? "on" : "off"}`} aria-pressed={cam} aria-label={t("study.cam")} onClick={() => setCam((v) => !v)}><Icon name="video" /></button>
          <button className={`call-btn ${board ? "on" : ""}`} aria-pressed={board} aria-label={t("study.board")} onClick={() => setBoard((v) => !v)}><Icon name="book" /></button>
          <button className="call-btn end" aria-label={t("study.end")} onClick={() => go("learn")}><Icon name="phone" /></button>
        </div>
      </div>
    </div>
  );
}

export function StudyPractice() {
  const { t } = useTranslation();
  const rows: { icon: IconName; title: string; desc: string }[] = [
    { icon: "dumbbell", title: t("study.practiceGuided"), desc: t("study.practiceGuidedDesc") },
    { icon: "spark", title: t("study.practiceChallenge"), desc: t("study.practiceChallengeDesc") },
    { icon: "refresh", title: t("study.practiceReview"), desc: t("study.practiceReviewDesc") },
  ];
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.exercises")}</h1>
      <p className="muted">{t("study.exercisesDesc")}</p>
      {rows.map((r) => (
        <div className="card od-row" key={r.title} style={gap("14px")}>
          <span className="voice-icon" style={{ color: "var(--blue)" }}><Icon name={r.icon} /></span>
          <span className="od-field od-fill"><b>{r.title}</b><span className="muted small">{r.desc}</span></span>
          <span className="muted small">{t("study.soon")}</span>
        </div>
      ))}
    </div>
  );
}

export function StudySheets() {
  const { t } = useTranslation();
  return (
    <div className="od-stack" style={gap("12px")}>
      <h1 className="section-title" style={{ marginTop: 24 }}>{t("study.sheets")}</h1>
      <p className="muted">{t("study.sheetsDesc")}</p>
      <div className="card od-stack" style={gap("8px")}>
        <b>{t("study.sheetFormulas")}</b>
        <span className="study-eq" style={{ fontSize: 18 }}>f'(x) = lim h→0 (f(x+h) − f(x)) / h</span>
      </div>
      <div className="card od-stack" style={gap("8px")}>
        <b>{t("study.sheetDefinitions")}</b>
        <p className="muted small">{t("study.sheetDefinitionsDesc")}</p>
      </div>
      <span className="muted small">{t("study.soon")}</span>
    </div>
  );
}

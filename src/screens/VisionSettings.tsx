// Settings row for the multimodal provider used on page images (diagrams, formulas, scans).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../store";
import { getKey, PROVIDERS, setKey } from "../ai";
import {
  defaultVisionModel, loadVision, saveVision, VISION_PROVIDERS,
  type VisionConfig, type VisionProvider,
} from "../study/vision";

const gap = (g: string) => ({ "--od-gap": g }) as React.CSSProperties;

export function VisionRow() {
  const { t } = useTranslation();
  const { openSheet } = useApp();
  const [cfg, setCfg] = useState<VisionConfig | null>(null);
  useEffect(() => { loadVision().then(setCfg).catch(() => {}); }, []);
  return (
    <div className="card od-row" style={gap("12px")}>
      <span className="od-field od-fill">
        <b>{t("vision.title")}</b>
        <span className="muted small">{cfg ? `${PROVIDERS[cfg.provider].label} · ${cfg.model}` : t("vision.notSet")}</span>
      </span>
      <button className="btn btn-ghost" onClick={() => openSheet(<VisionSheet onSaved={setCfg} />)}>
        {t(cfg ? "settings.change" : "ai.setUp")}
      </button>
    </div>
  );
}

function VisionSheet({ onSaved }: { onSaved?: (cfg: VisionConfig) => void }) {
  const { t } = useTranslation();
  const { toast, closeSheet } = useApp();
  const [provider, setProvider] = useState<VisionProvider>("gemini");
  const [baseURL, setBaseURL] = useState(PROVIDERS.gemini.baseURL);
  const [model, setModel] = useState(defaultVisionModel("gemini"));
  const [key, setKeyState] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needsKey = PROVIDERS[provider].needsKey;
  const cfg: VisionConfig = { provider, baseURL: baseURL.trim() || PROVIDERS[provider].baseURL, model: model.trim() || defaultVisionModel(provider) };

  useEffect(() => {
    loadVision().then((saved) => {
      if (!saved) return;
      setProvider(saved.provider);
      setBaseURL(saved.baseURL);
      setModel(saved.model);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setErr("");
    if (!PROVIDERS[provider].needsKey) { setKeyState(""); return; }
    getKey(provider).then((k) => setKeyState(k ?? "")).catch(() => {});
  }, [provider]);

  const pick = (p: VisionProvider) => {
    setProvider(p);
    setBaseURL(PROVIDERS[p].baseURL);
    setModel(defaultVisionModel(p));
  };
  const save = async () => {
    setBusy(true); setErr("");
    try {
      if (needsKey) await setKey(provider, key.trim() || null);
      await saveVision(cfg);
      onSaved?.(cfg);
      toast(t("vision.saved"));
      closeSheet();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <div className="od-stack" style={{ ...gap("14px"), textAlign: "left" }}>
      <h3 style={{ textAlign: "center" }}>{t("vision.title")}</h3>
      <p className="small">{t("vision.desc")}</p>
      <label className="od-field"><b>{t("vision.provider")}</b>
        <select className="select" value={provider} onChange={(e) => pick(e.target.value as VisionProvider)}>
          {VISION_PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDERS[p].label}</option>)}
        </select>
      </label>
      <label className="od-field"><b>{t("vision.baseURL")}</b>
        <input className="input" value={baseURL} spellCheck={false} onChange={(e) => setBaseURL(e.target.value)} placeholder={PROVIDERS[provider].baseURL || "https://admin.example.com/api/ai/v1"} />
      </label>
      <label className="od-field"><b>{t("vision.model")}</b><span className="muted small">{t("vision.modelDesc")}</span>
        <input className="input" value={model} spellCheck={false} onChange={(e) => setModel(e.target.value)} placeholder={defaultVisionModel(provider)} />
      </label>
      {needsKey && (
        <label className="od-field"><b>{provider === "nestor" ? t("ai.nestorToken") : t("vision.apiKey")}</b><span className="muted small">{provider === "nestor" ? t("ai.nestorTokenDesc") : t("ai.apiKeyDesc")}</span>
          <input className="input" type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKeyState(e.target.value)} />
        </label>
      )}
      <p className="muted small">{t("vision.hint")}</p>
      {err && <p className="small" role="status" style={{ color: "var(--red)", overflowWrap: "anywhere" }}>{err}</p>}
      <div className="od-stack sheet-actions" style={gap("8px")}>
        <button className="btn btn-primary btn-block" disabled={busy || !cfg.model || (needsKey && !key.trim())} onClick={() => void save()}>{t("ai.save")}</button>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>{t("sheet.cancel")}</button>
      </div>
    </div>
  );
}

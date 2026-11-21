// A separate multimodal provider for page images: the text brain (DeepSeek) does not see diagrams.
// The key is stored in the same OS keychain entry as that provider's text key.
import { getSetting, setSetting } from "../db";
import { getKey, PROVIDERS, type AiConfig, type ProviderId } from "../ai";

export const VISION_PROVIDERS = ["nestor", "gemini", "openai", "anthropic", "ollama", "lmstudio"] as const;
export type VisionProvider = (typeof VISION_PROVIDERS)[number];
export type VisionConfig = { provider: VisionProvider; baseURL: string; model: string };

const DEFAULT_MODEL: Record<VisionProvider, string> = {
  nestor: "gemini-2.5-flash",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  ollama: "qwen2.5vl:7b",
  lmstudio: "qwen2.5-vl-7b-instruct",
};

export const defaultVisionModel = (provider: VisionProvider) => DEFAULT_MODEL[provider];

export const defaultVision = (provider: VisionProvider = "gemini"): VisionConfig => ({
  provider,
  baseURL: PROVIDERS[provider].baseURL,
  model: DEFAULT_MODEL[provider],
});

export async function loadVision(): Promise<VisionConfig | null> {
  const raw = await getSetting("ai.vision");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VisionConfig>;
    if (!parsed.provider || !(VISION_PROVIDERS as readonly string[]).includes(parsed.provider)) return null;
    return {
      provider: parsed.provider as VisionProvider,
      baseURL: parsed.baseURL || PROVIDERS[parsed.provider as ProviderId].baseURL,
      model: parsed.model || DEFAULT_MODEL[parsed.provider as VisionProvider],
    };
  } catch { return null; }
}

export const saveVision = (cfg: VisionConfig | null) => setSetting("ai.vision", cfg ? JSON.stringify(cfg) : null);

export const visionKey = (cfg: VisionConfig) => getKey(cfg.provider as ProviderId);
export const visionAiConfig = (cfg: VisionConfig): AiConfig => ({ ...cfg, provider: cfg.provider as ProviderId });
export const visionNeedsKey = (cfg: VisionConfig) => PROVIDERS[cfg.provider as ProviderId].needsKey;

// Study prompts. They reuse the inherited provider layer (DeepSeek/OpenAI/Ollama/...).
// The page text is the only source of truth: the tutor must say when something is missing
// instead of inventing a formula or a diagram that the text extraction did not capture.
import { z } from "zod";
import { extractJson, generate, generateImage, generatePlain, type AiConfig } from "../ai";

const pageSchema = z.object({
  explanation: z.string(),
  keyPoints: z.array(z.string()).min(1).max(6),
  formulas: z.array(z.string()).max(8),
  check: z.array(z.object({ question: z.string(), answer: z.string() })).min(1).max(3),
});

export type PageExplanation = z.infer<typeof pageSchema>;

export type PageContext = {
  title: string;
  page: number;
  total: number;
  text: string;
  native: string;
};

export function explainPage(c: PageContext): Promise<PageExplanation> {
  const system = [
    "You are a patient university-level study tutor.",
    `Explain in the learner's language (ISO code: ${c.native}).`,
    "Work only from the page text supplied. Never invent a formula, a figure or a fact that is not in it.",
    "If the page is mostly an image, a diagram or a scanned formula and the text extraction is poor, say clearly which part cannot be read, and explain what the available text does say.",
    "Explain every idea on the page, step by step, in a logical order. Define the notation. For a formula, name each symbol and show what it is used for.",
    "keyPoints: 3 to 6 short takeaways in the learner's language.",
    "formulas: the important formulas exactly as they appear (plain text/Unicode is fine); an empty array if there are none.",
    "check: 1 to 3 short questions with their answer, to verify understanding before moving on.",
    "Respond only with JSON matching the schema.",
  ].join(" ");
  return generate(pageSchema, system, [
    `Course: ${c.title}`,
    `Page ${c.page} of ${c.total}`,
    "--- PAGE TEXT ---",
    c.text || "(no extractable text: this page may be scanned or image-only)",
    "--- END PAGE TEXT ---",
    "Explain this page to the learner now.",
  ].join("\n"));
}

export function askPageQuestion(c: PageContext, question: string): Promise<string> {
  const system = [
    "You are a study tutor.",
    `Answer in the learner's language (ISO code: ${c.native}).`,
    "Use only the supplied page text. If the answer is not on this page, say so and suggest which part of the course to look at.",
    "Be concrete and short; quote the relevant phrase when it helps.",
  ].join(" ");
  return generatePlain(system, [
    `Course: ${c.title}`,
    `Page ${c.page} of ${c.total}`,
    "--- PAGE TEXT ---",
    c.text || "(no extractable text)",
    "--- END PAGE TEXT ---",
    `Learner question: ${question}`,
  ].join("\n"));
}

/** Vision path: the rendered page image is the primary source, with the extracted OCR text as a hint. */
export async function explainImage(cfg: AiConfig, key: string | null, c: PageContext, image: Uint8Array, mediaType: string): Promise<PageExplanation> {
  const system = [
    "You are a patient university-level study tutor.",
    `Explain in the learner's language (ISO code: ${c.native}).`,
    "The attached image is one page of the course. Read all legible text, formulas, diagrams, tables and annotations.",
    "Explain every part step by step. For a formula, name each symbol and say what it is used for. For a diagram, describe its parts and what they show.",
    "If a part is too blurry or ambiguous to read, say exactly which part and do not invent it.",
    c.text.trim() ? "The extracted text below may help, but the image is the primary source." : "",
    "keyPoints: 3 to 6 short takeaways. formulas: the formulas as plain text/Unicode. check: 1 to 3 short questions with answers.",
    "Respond only with JSON matching the schema.",
  ].filter(Boolean).join(" ");
  const prompt = [
    `Course: ${c.title}`,
    `Page ${c.page} of ${c.total}`,
    c.text.trim() ? `--- EXTRACTED TEXT (may be incomplete) ---\n${c.text}\n--- END EXTRACTED TEXT ---` : "",
    "Analyse the attached page now.",
  ].filter(Boolean).join("\n");
  const raw = await generateImage(cfg, key, system, prompt, image, mediaType);
  try { return pageSchema.parse(extractJson(raw)); }
  catch {
    if (!raw) throw new Error("The vision model returned nothing");
    return { explanation: raw, keyPoints: [], formulas: [], check: [] };
  }
}

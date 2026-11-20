// Tiny OpenAI-compatible server for local end-to-end tests of the study tutor.
// Run `node scripts/mock-ai.mjs`, then set DeepSeek's base URL to http://127.0.0.1:9999/v1.
import http from "node:http";

const json = (res, code, value) => {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(value));
};

const pageAnswer = {
  explanation: "Cette page presente la planification de projet. Un projet a un debut, une fin et un objectif mesurable. La formule C = A + B additionne les couts fixes A et les couts variables B pour obtenir le cout total C. Si A vaut 100 et B vaut 50, alors C vaut 150.",
  keyPoints: ["Un projet a un debut, une fin et un objectif mesurable.", "C = A + B represente le cout total.", "A est fixe, B est variable."],
  formulas: ["C = A + B", "C = 100 + 50 = 150"],
  check: [
    { question: "Que represente C ?", answer: "La somme des couts fixes A et variables B." },
    { question: "Si A = 200 et B = 50, combien vaut C ?", answer: "C = 250." },
  ],
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method === "GET" && req.url?.startsWith("/v1/models")) {
    return json(res, 200, { object: "list", data: [{ id: "deepseek-chat", object: "model", owned_by: "mock" }] });
  }
  if (req.method !== "POST" || !req.url?.includes("/chat/completions")) return json(res, 404, { error: { message: "not found" } });
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(raw); } catch { /* ignore */ }
    const prompt = JSON.stringify(body.messages ?? []);
    const wantsJson = /keyPoints|Respond only with JSON|JSON schema/i.test(prompt) || !!body.response_format;
    const content = wantsJson ? JSON.stringify(pageAnswer) : "D'apres le texte de la page, C est la somme des couts fixes A et des couts variables B. La formule C = A + B le montre directement.";
    json(res, 200, {
      id: "mock-1", object: "chat.completion", created: Math.floor(Date.now() / 1000), model: body.model ?? "deepseek-chat",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    });
  });
});

server.listen(9999, "127.0.0.1", () => console.log("mock AI on http://127.0.0.1:9999/v1"));

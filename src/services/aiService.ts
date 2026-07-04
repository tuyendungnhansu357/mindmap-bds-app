// src/services/aiService.ts
//
// BYO API key: user tự nhập key, lưu SecureStore. Mục 4.4 spec.
// Parse response thành cây node con, append vào node đang chọn.

import { AIProvider, AIProviderConfig, MindMapNode } from "../types/mindmap";
import { v4 as uuidv4 } from "uuid";

export type AIGeneratorResult = {
  nodes: Array<{ title: string; children?: AIGeneratorResult["nodes"] }>;
};

// ---------- System prompt ----------
const SYSTEM_PROMPT = `Bạn là AI hỗ trợ vẽ mindmap bất động sản.
Khi được yêu cầu, trả về JSON với cấu trúc:
{"nodes": [{"title": "...", "children": [{"title": "..."}, ...]}, ...]}
Chỉ trả về JSON, không có text thêm. Tối đa 3 cấp lồng nhau.`;

// ---------- Provider-specific call ----------

async function callClaude(config: AIProviderConfig, prompt: string): Promise<string> {
  const model = config.model ?? "claude-opus-4-5";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message ?? "Claude API error");
  return data.content?.[0]?.text ?? "";
}

async function callGemini(config: AIProviderConfig, prompt: string): Promise<string> {
  const model = config.model ?? "gemini-1.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message ?? "Gemini API error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(config: AIProviderConfig, prompt: string): Promise<string> {
  const model = config.model ?? "gpt-4o-mini";
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message ?? "OpenAI API error");
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenRouter(config: AIProviderConfig, prompt: string): Promise<string> {
  const model = config.model ?? "openai/gpt-4o-mini";
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "com.nguonnhachinhchu.mindmapbds",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message ?? "OpenRouter API error");
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------- Parse raw JSON text ----------
function parseAIResponse(raw: string): AIGeneratorResult["nodes"] {
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const parsed = JSON.parse(clean);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.nodes) return parsed.nodes;
  throw new Error("Không nhận diện được cấu trúc JSON từ AI");
}

// ---------- Convert AI tree -> MindMapNode[] ----------
export function flattenAINodes(
  aiNodes: AIGeneratorResult["nodes"],
  parentId: string,
  mapId: string,
  depth = 0
): MindMapNode[] {
  const result: MindMapNode[] = [];
  aiNodes.forEach((item, i) => {
    const id = uuidv4();
    result.push({
      id,
      mapId,
      parentId,
      title: item.title,
      x: 0, // layout engine sẽ tính sau khi append
      y: 0,
      w: null,
      h: null,
      color: "indigo",
      icon: null,
      collapsed: false,
      relStyle: null,
      sortOrder: i,
    });
    if (item.children?.length) {
      result.push(...flattenAINodes(item.children, id, mapId, depth + 1));
    }
  });
  return result;
}

// ---------- Public API ----------
export async function generateMindMapNodes(
  config: AIProviderConfig,
  prompt: string
): Promise<AIGeneratorResult["nodes"]> {
  let raw: string;
  switch (config.provider) {
    case "claude":
      raw = await callClaude(config, prompt);
      break;
    case "gemini":
      raw = await callGemini(config, prompt);
      break;
    case "openai":
      raw = await callOpenAI(config, prompt);
      break;
    case "openrouter":
      raw = await callOpenRouter(config, prompt);
      break;
    default:
      throw new Error("Unknown AI provider");
  }
  return parseAIResponse(raw);
}

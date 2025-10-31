import type { ChatMessage, Env, VisionInput } from "../types";
import { retry, withMicroBatch } from "../utils";

const OAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function headers(env: Env) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${env.OPENAI_API_KEY}`,
  };
}

export async function chatOpenAI(env: Env, messages: ChatMessage[]): Promise<string> {
  const model = env.OPENAI_TEXT_MODEL || "gpt-5";
  const body = {
    model,
    temperature: 0.4,
    messages,
  };
  const attempt = async () => {
    const resp = await fetch(OAI_CHAT_URL, { method: "POST", headers: headers(env), body: JSON.stringify(body) });
    if (resp.status === 429) {
      const err = new Error("rate limited");
      (err as any).status = 429;
      throw err;
    }
    if (!resp.ok) throw new Error(await resp.text());
    const json: any = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  };
  // Micro-batch + backoff
  return withMicroBatch(() => retry(attempt, 3, 250), Number(env.BATCH_WINDOW_MS || "120"));
}

export async function visionOpenAI(env: Env, input: VisionInput): Promise<string> {
  const model = env.OPENAI_VISION_MODEL || "gpt-5-vision";
  const messages = [
    { role: "system", content: "You are an electronics tutor for kids. Identify the part, its use, and a safety tip." },
    {
      role: "user",
      content: [
        { type: "text", text: input.prompt || "Identify this electronic component and explain simply." },
        { type: "image_url", image_url: { url: input.image_url } },
      ],
    },
  ];
  const body = { model, temperature: 0.2, messages };
  const attempt = async () => {
    const resp = await fetch(OAI_CHAT_URL, { method: "POST", headers: headers(env), body: JSON.stringify(body) });
    if (resp.status === 429) {
      const err = new Error("rate limited");
      (err as any).status = 429;
      throw err;
    }
    if (!resp.ok) throw new Error(await resp.text());
    const json: any = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  };
  return withMicroBatch(() => retry(attempt, 3, 300), Number(env.BATCH_WINDOW_MS || "120"));
}
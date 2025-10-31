import type { ChatMessage, Env, VisionInput } from "../types";
import { retry } from "../utils";

export async function chatHuggingFace(env: Env, messages: ChatMessage[]): Promise<string> {
  if (!env.HF_API_TOKEN) throw new Error("HF_API_TOKEN not set");
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const attempt = async () => {
    const resp = await fetch("https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${env.HF_API_TOKEN}` },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.4 } }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    const json: any = await resp.json();
    const text = Array.isArray(json) ? json[0]?.generated_text : json.generated_text;
    return (text || "").toString().trim();
  };
  return retry(attempt, 2, 300);
}

export async function visionHuggingFace(env: Env, input: VisionInput): Promise<string> {
  if (!env.HF_API_TOKEN) throw new Error("HF_API_TOKEN not set");
  // Simple image-to-text using a public captioning/vision-instruct model
  const model = "llava-hf/llava-1.5-7b-hf";
  const attempt = async () => {
    const imgResp = await fetch(input.image_url);
    if (!imgResp.ok) throw new Error("Failed to fetch image");
    const imgBuf = await imgResp.arrayBuffer();
    const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.HF_API_TOKEN}` },
      body: imgBuf,
    });
    if (!resp.ok) throw new Error(await resp.text());
    const json: any = await resp.json();
    const text = Array.isArray(json) ? (json[0]?.generated_text || json[0]?.caption) : (json.generated_text || json.caption);
    const base = (text || "").toString().trim();
    return base ? `توضیح تصویر: ${base}` : "نتونستم تصویر رو توضیح بدم.";
  };
  return retry(attempt, 2, 400);
}
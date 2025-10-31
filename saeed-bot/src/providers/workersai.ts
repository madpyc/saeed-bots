import type { ChatMessage, Env, VisionInput } from "../types";
import { retry } from "../utils";

export async function chatWorkersAI(env: Env, messages: ChatMessage[]): Promise<string> {
  const sys = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const input = [sys ? sys.content + "\n\n" : "", ...rest.map((m) => `${m.role}: ${m.content}`)].join("\n");
  const attempt = async () => {
    const result: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { input });
    const out = result?.response || result?.result || "";
    if (!out) throw new Error("Workers AI empty response");
    return out.toString().trim();
  };
  return retry(attempt, 2, 250);
}

export async function visionWorkersAI(env: Env, input: VisionInput): Promise<string> {
  const attempt = async () => {
    const result: any = await env.AI.run("@cf/llama-3.2-11b-vision-instruct", {
      messages: [
        { role: "system", content: "You are an electronics tutor for kids. Identify the part, its use, and a safety tip." },
        {
          role: "user",
          content: [
            { type: "text", text: input.prompt || "Identify this electronic component and explain simply." },
            { type: "image", image_url: input.image_url }
          ]
        }
      ]
    });
    const out = result?.response || result?.result || "";
    if (!out) throw new Error("Workers AI vision empty response");
    return out.toString().trim();
  };
  return retry(attempt, 2, 300);
}
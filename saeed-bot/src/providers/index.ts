import type { ChatMessage, Env, ProviderName, VisionInput } from "../types";
import { chatOpenAI, visionOpenAI } from "./openai";
import { chatHuggingFace, visionHuggingFace } from "./huggingface";
import { chatWorkersAI, visionWorkersAI } from "./workersai";

export async function chatWithFallback(env: Env, messages: ChatMessage[]) {
  const order = (env.PROVIDER_ORDER || "openai,workersai,huggingface")
    .split(",")
    .map((s) => s.trim() as ProviderName);

  for (const p of order) {
    try {
      if (p === "openai") return await chatOpenAI(env, messages);
      if (p === "workersai") return await chatWorkersAI(env, messages);
      if (p === "huggingface") return await chatHuggingFace(env, messages);
    } catch (e: any) {
      continue;
    }
  }
  throw new Error("All providers failed");
}

export async function visionWithFallback(env: Env, input: VisionInput) {
  const order = (env.PROVIDER_ORDER || "openai,workersai,huggingface")
    .split(",")
    .map((s) => s.trim() as ProviderName);

  for (const p of order) {
    try {
      if (p === "openai") return await visionOpenAI(env, input);
      if (p === "workersai") return await visionWorkersAI(env, input);
      if (p === "huggingface") return await visionHuggingFace(env, input);
    } catch (e: any) {
      continue;
    }
  }
  throw new Error("All providers failed (vision)");
}
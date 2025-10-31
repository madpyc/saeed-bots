export type Env = {
  R2: R2Bucket;
  DB: D1Database;
  SESSIONS: KVNamespace;
  AI: any; // Cloudflare Workers AI binding
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  OPENAI_API_KEY?: string;
  HF_API_TOKEN?: string;
  WEBAPP_URL: string;
  PROVIDER_ORDER: string; // e.g. "openai,workersai,huggingface"
  BOT_NAME: string;
  BOT_LOCALE: string;
  ADMIN_PASS: string;
  R2_PUBLIC_BASE?: string;
  BATCH_WINDOW_MS?: string;
  OPENAI_VISION_MODEL?: string;
  OPENAI_TEXT_MODEL?: string;
};

export type ProviderName = "workersai" | "openai" | "huggingface";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type VisionInput = { image_url: string; prompt?: string };
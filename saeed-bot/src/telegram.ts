import type { Env } from "./types";

const API_BASE = "https://api.telegram.org";

export async function tg(method: string, token: string, body: any) {
  const url = `${API_BASE}/bot${token}/${method}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(JSON.stringify(json));
  return json.result;
}

export async function getFilePath(token: string, file_id: string): Promise<string> {
  const url = `${API_BASE}/bot${token}/getFile`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id }),
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(JSON.stringify(json));
  return json.result.file_path;
}

export function fileDirectUrl(token: string, file_path: string) {
  return `${API_BASE}/file/bot${token}/${file_path}`;
}

export async function sendMessage(env: Env, chat_id: number | string, text: string, extra: any = {}) {
  return tg("sendMessage", env.TELEGRAM_BOT_TOKEN, {
    chat_id,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

export type Update = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    photo?: Array<{ file_id: string; width: number; height: number; file_unique_id: string }>;
    web_app_data?: { data: string };
  };
};
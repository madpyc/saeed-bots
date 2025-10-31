import { Hono } from "hono";
import type { Env } from "./types";
import { sendMessage, type Update, getFilePath, fileDirectUrl } from "./telegram";
import { chatWithFallback, visionWithFallback } from "./providers";
import { remember } from "./db/db";
import { seedIfEmpty } from "./db/db";
import { mainMenu, handleCallback } from "./db/quiz";
import { adminPage, adminPost } from "./admin";
import { systemPrompt } from "./utils";

export const app = new Hono<{ Bindings: Env }>();

app.get("/health", async (c) => { await seedIfEmpty(c.env); return c.json({ ok: true }); });

// Admin panel
app.get("/admin", async (c) => adminPage(c.env, new URL(c.req.url)));
app.post("/admin/lesson", async (c) => adminPost(c.env, c.req.raw, new URL(c.req.url)));
app.post("/admin/question", async (c) => adminPost(c.env, c.req.raw, new URL(c.req.url)));

// Serve R2 file by key (if public base not set)
app.get("/r2/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" } });
});

// Telegram webhook endpoint
app.post("/webhook", async (c) => {
  await seedIfEmpty(c.env);
  const env = c.env;
  const update = (await c.req.json()) as Update;
  if (update.callback_query) {
    const cq = update.callback_query;
    const res = await handleCallback(c.env, cq.from.id, cq.data || "");
    if (res?.text) await sendMessage(c.env, cq.from.id, res.text, res.extra || {});
    return c.json({ ok: true });
  }
  if (!update.message) return c.json({ ok: true });
  const chatId = update.message.chat.id;

  // WebApp data handler
  if (update.message.web_app_data?.data) {
    await sendMessage(env, chatId, `✅ داده وب‌اپ رسید: <code>${update.message.web_app_data.data}</code>`);
    return c.json({ ok: true });
  }

  // Photo handler
  if (update.message.photo && update.message.photo.length > 0) {
    const biggest = update.message.photo.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    try {
      const path = await getFilePath(env.TELEGRAM_BOT_TOKEN, biggest.file_id);
      const tgUrl = fileDirectUrl(env.TELEGRAM_BOT_TOKEN, path);
      // Save to R2 for stable access if binding exists
      let finalUrl = tgUrl;
      try {
        const imgResp = await fetch(tgUrl);
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          const key = `tg/${biggest.file_id}.jpg`;
          await env.R2.put(key, buf, { httpMetadata: { contentType: imgResp.headers.get("content-type") || "image/jpeg" } });
          if (env.R2_PUBLIC_BASE) {
            finalUrl = `${env.R2_PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
          } else {
            const base = new URL(c.req.url).origin;
            finalUrl = `${base}/r2/${encodeURIComponent(`tg/${biggest.file_id}.jpg`)}`;
          }
        }
      } catch {}
      const vision = await visionWithFallback(env, { image_url: finalUrl, prompt: "این قطعه چی هست؟ خیلی ساده توضیح بده." });
      await sendMessage(env, chatId, vision);
    } catch (e: any) {
      await sendMessage(env, chatId, "نتونستم تصویر رو تحلیل کنم. یک بار دیگه بفرست یا متن بفرست.");
    }
    return c.json({ ok: true });
  }

  const text = (update.message.text || "").trim();
  if (!text) {
    await sendMessage(env, chatId, "یک پیام متنی بفرست یا از وب‌اپ استفاده کن.");
    return c.json({ ok: true });
  }

  if (text === "/start" || text === "/menu") {
    await sendMessage(env, chatId, `سلام! من ${env.BOT_NAME} هستم 📡 معلم الکترونیک.\nاز منوی زیر شروع کن.`, mainMenu(env));
    return c.json({ ok: true });
  }

  const historyKey = `h:${chatId}`;
  const prev = (await env.SESSIONS.get(historyKey, "json")) as { role: string; content: string }[] | null;
  const history = prev || [];

  const messages = [
    { role: "system", content: systemPrompt(env.BOT_NAME) },
    ...history.slice(-6),
    { role: "user", content: text },
  ] as const;

  const answer = await chatWithFallback(env, messages as any);
  await sendMessage(env, chatId, answer);

  history.push({ role: "user", content: text });
  history.push({ role: "assistant", content: answer });
  await env.SESSIONS.put(historyKey, JSON.stringify(history), { expirationTtl: 60 * 60 * 24 * 3 });
  // Long-term: store in D1
  await remember(env, String(chatId), "user", text);
  await remember(env, String(chatId), "assistant", answer);

  return c.json({ ok: true });
});

// Simple static hosting for WebApp
app.get("/webapp/*", async (c) => {
  const path = new URL(c.req.url).pathname.replace("/webapp", "");
  const url = new URL(`../webview${path || "/index.html"}`, import.meta.url);
  const res = await fetch(url);
  return new Response(await res.arrayBuffer(), { headers: { "content-type": res.headers.get("content-type") || "text/html" } });
});

export default app;
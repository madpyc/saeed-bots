export const json = (data: any, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, ...init });

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(fn: () => Promise<T>, attempts = 2, baseDelay = 200): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.status || err?.code;
      // Backoff heavier for 429
      const delay = (code === 429 ? 600 : baseDelay) * (i + 1);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export function systemPrompt(botName: string) {
  return (
    `تو یک ربات معلم الکترونیک به نام ${botName} هستی. ` +
    "برای کودکان ۸ تا ۱۳ ساله با زبان ساده و مثال‌های روزمره توضیح بده. " +
    "اگر تصویر قطعه الکترونیکی دریافت شد، نام قطعه، کاربرد و نکته ایمنی را با bullet بنویس. " +
    "پاسخ‌ها کوتاه، قدم‌به‌قدم و سرگرم‌کننده باشند."
  );
}

// Tiny coalescing batcher: groups calls within a short window to avoid burst 429s.
// NOTE: Workers have no shared memory; this only helps per-instance bursts.
let pending: Promise<any> | null = null;
let queue: Array<() => Promise<any>> = [];
export async function withMicroBatch<T>(fn: () => Promise<T>, windowMs = 120): Promise<T> {
  queue.push(fn as any);
  if (!pending) {
    pending = new Promise(async (resolve) => {
      await sleep(windowMs);
      const items = queue.splice(0, queue.length);
      pending = null;
      // Run sequentially to smooth spikes
      let last: any;
      for (const f of items) last = await f();
      resolve(last);
    });
  }
  return pending as unknown as T;
}
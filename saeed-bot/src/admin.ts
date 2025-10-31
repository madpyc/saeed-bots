import type { Env } from "./types";
import { getLessons } from "./db/db";

export async function adminPage(env: Env, url: URL) {
  const pass = url.searchParams.get("pass") || "";
  if (pass !== env.ADMIN_PASS) {
    return new Response(`<!doctype html><html><body dir="rtl" style="font-family:sans-serif"><h2>ورود ادمین</h2><form><input name="pass" placeholder="Password"/><button>ورود</button></form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const lessons = await getLessons(env);
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>Admin</title></head>
  <body style="font-family:sans-serif;padding:12px;background:#0f172a;color:#e2e8f0">
    <h2>پنل ادمین</h2>
    <section>
      <h3>درس‌ها</h3>
      <ul>${lessons.map(l => `<li>#${l.id} — ${l.title}</li>`).join("")}</ul>
      <h4>افزودن درس</h4>
      <form method="post" action="/admin/lesson?pass=${encodeURIComponent(pass)}">
        <input name="title" placeholder="عنوان" />
        <textarea name="content" placeholder="محتوا"></textarea>
        <button>افزودن</button>
      </form>
      <h4>افزودن سؤال</h4>
      <form method="post" action="/admin/question?pass=${encodeURIComponent(pass)}">
        <input name="lesson_id" placeholder="lesson_id" />
        <input name="question" placeholder="سؤال" />
        <input name="a" placeholder="گزینه a" />
        <input name="b" placeholder="گزینه b" />
        <input name="c" placeholder="گزینه c" />
        <input name="d" placeholder="گزینه d" />
        <input name="correct" placeholder="حرف صحیح (a/b/c/d)" />
        <button>افزودن</button>
      </form>
    </section>
  </body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function adminPost(env: Env, req: Request, url: URL) {
  const pass = url.searchParams.get("pass") || "";
  if (pass !== env.ADMIN_PASS) return new Response("Forbidden", { status: 403 });
  const form = await req.formData();
  const path = new URL(req.url).pathname;
  if (path.endsWith("/lesson")) {
    const title = String(form.get("title")||"").trim();
    const content = String(form.get("content")||"").trim();
    await env.DB.prepare("INSERT INTO lessons (title, content) VALUES (?, ?)").bind(title, content).run();
    return Response.redirect(`/admin?pass=${encodeURIComponent(pass)}`, 302);
  }
  if (path.endsWith("/question")) {
    const lesson_id = Number(form.get("lesson_id")||"0");
    const q = String(form.get("question")||"");
    const a = String(form.get("a")||"");
    const b = String(form.get("b")||"");
    const c = String(form.get("c")||"");
    const d = String(form.get("d")||"");
    const correct = String(form.get("correct")||"a");
    await env.DB.prepare("INSERT INTO questions (lesson_id, question, a, b, c, d, correct) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(lesson_id, q, a, b, c, d, correct).run();
    return Response.redirect(`/admin?pass=${encodeURIComponent(pass)}`, 302);
  }
  return new Response("Not found", { status: 404 });
}
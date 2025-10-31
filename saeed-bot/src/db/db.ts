import type { Env } from "../types";

export async function run(env: Env, sql: string, bindings: any[] = []) {
  return env.DB.prepare(sql).bind(...bindings).run();
}
export async function one<T = any>(env: Env, sql: string, bindings: any[] = []): Promise<T | null> {
  const r = await env.DB.prepare(sql).bind(...bindings).first<T>();
  return (r as any) || null;
}
export async function all<T = any>(env: Env, sql: string, bindings: any[] = []): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...bindings).all<T>();
  return (r?.results as T[]) || [];
}

// Memory
export async function remember(env: Env, chatId: string, role: string, content: string) {
  await run(env, "INSERT INTO conversations (chat_id, role, content) VALUES (?, ?, ?)", [chatId, role, content]);
}

// Quiz models
export type Lesson = { id: number; title: string; content: string };
export type Question = { id: number; lesson_id: number; question: string; a: string; b: string; c: string; d: string; correct: string };
export type Progress = { id: number; chat_id: string; lesson_id: number; q_index: number; score: number };

export async function seedIfEmpty(env: Env) {
  const cnt = await one<{ c: number }>(env, "SELECT COUNT(*) as c FROM lessons");
  if (!cnt || (cnt as any).c === 0) {
    await run(env, "INSERT INTO lessons (title, content) VALUES (?, ?)", ["مقاومت‌ها ۱۰۱", "یاد می‌گیریم مقاومت چیست و چطور خوانده می‌شود."]);
    const lesson = await one<{ id: number }>(env, "SELECT id FROM lessons WHERE title = ?", ["مقاومت‌ها ۱۰۱"]);
    const L = lesson!.id;
    await run(env, "INSERT INTO questions (lesson_id, question, a, b, c, d, correct) VALUES (?, ?, ?, ?, ?, ?, ?)", [L, "کدام واحد برای مقاومت است؟", "آمپر", "اهم", "ولت", "وات", "b"]);
    await run(env, "INSERT INTO questions (lesson_id, question, a, b, c, d, correct) VALUES (?, ?, ?, ?, ?, ?, ?)", [L, "نوارهای رنگی روی مقاومت برای چیست؟", "زیبایی", "خنک‌کاری", "کد مقدار", "قطبیت", "c"]);
  }
}

export async function getLessons(env: Env): Promise<Lesson[]> {
  return all<Lesson>(env, "SELECT * FROM lessons ORDER BY id ASC");
}
export async function getQuestions(env: Env, lessonId: number): Promise<Question[]> {
  return all<Question>(env, "SELECT * FROM questions WHERE lesson_id = ? ORDER BY id ASC", [lessonId]);
}
export async function getOrCreateProgress(env: Env, chatId: string, lessonId: number): Promise<Progress> {
  const p = await one<Progress>(env, "SELECT * FROM progress WHERE chat_id = ? AND lesson_id = ?", [chatId, lessonId]);
  if (p) return p;
  await run(env, "INSERT INTO progress (chat_id, lesson_id, q_index, score) VALUES (?, ?, 0, 0)", [chatId, lessonId]);
  return (await one<Progress>(env, "SELECT * FROM progress WHERE chat_id = ? AND lesson_id = ?", [chatId, lessonId]))!;
}
export async function updateProgress(env: Env, chatId: string, lessonId: number, qIndex: number, score: number) {
  await run(env, "UPDATE progress SET q_index = ?, score = ? WHERE chat_id = ? AND lesson_id = ?", [qIndex, score, chatId, lessonId]);
}
import type { Env } from "../types";
import { getLessons, getQuestions, getOrCreateProgress, updateProgress } from "./db";

export function mainMenu(env: Env) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 شروع کوئیز", callback_data: "quiz:start" }],
        [{ text: "📚 لیست درس‌ها", callback_data: "quiz:list" }],
        [{ text: "🌐 وب‌اپ", url: env.WEBAPP_URL }],
      ],
    },
  };
}

export async function handleCallback(env: Env, chatId: number, data: string) {
  if (data === "quiz:list") {
    const lessons = await getLessons(env);
    const rows = lessons.map((l) => [{ text: `✅ ${l.title}`, callback_data: `quiz:start:${l.id}` }]);
    return {
      text: "یک درس انتخاب کن:",
      extra: { reply_markup: { inline_keyboard: rows } },
    };
  }
  if (data.startsWith("quiz:start")) {
    const id = Number(data.split(":")[2] || "1");
    const qs = await getQuestions(env, id);
    const p = await getOrCreateProgress(env, String(chatId), id);
    const q = qs[p.q_index];
    if (!q) return { text: "سؤال پیدا نشد." };
    return {
      text: `درس ${id}
سؤال ${p.q_index + 1}: ${q.question}`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [{ text: q.a, callback_data: `quiz:ans:${id}:a` }],
            [{ text: q.b, callback_data: `quiz:ans:${id}:b` }],
            [{ text: q.c, callback_data: `quiz:ans:${id}:c` }],
            [{ text: q.d, callback_data: `quiz:ans:${id}:d` }],
          ],
        },
      },
    };
  }
  if (data.startsWith("quiz:ans:")) {
    const [_, __, lessonIdStr, choice] = data.split(":");
    const lessonId = Number(lessonIdStr);
    const qs = await getQuestions(env, lessonId);
    const p = await getOrCreateProgress(env, String(chatId), lessonId);
    const q = qs[p.q_index];
    let score = p.score;
    let msg = "غلط شد. دوباره تلاش کن!";
    if (q && choice === q.correct) {
      score += 1;
      msg = "آفرین! درست بود 🎉";
      const nextIndex = p.q_index + 1;
      await updateProgress(env, String(chatId), lessonId, nextIndex, score);
      if (nextIndex >= qs.length) {
        return { text: `${msg}
پایان درس! امتیاز: ${score}/${qs.length}` };
      } else {
        const nq = qs[nextIndex];
        return {
          text: `${msg}
سؤال ${nextIndex + 1}: ${nq.question}`,
          extra: {
            reply_markup: {
              inline_keyboard: [
                [{ text: nq.a, callback_data: `quiz:ans:${lessonId}:a` }],
                [{ text: nq.b, callback_data: `quiz:ans:${lessonId}:b` }],
                [{ text: nq.c, callback_data: `quiz:ans:${lessonId}:c` }],
                [{ text: nq.d, callback_data: `quiz:ans:${lessonId}:d` }],
              ],
            },
          },
        };
      }
    } else {
      // same question again
      return { text: msg };
    }
  }
  return { text: "گزینه نامعتبر." };
}
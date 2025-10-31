const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const q = document.getElementById("q");
const out = document.getElementById("out");
document.getElementById("send").addEventListener("click", () => {
  const data = q.value.trim();
  if (!data) return;
  if (tg && tg.sendData) {
    tg.sendData(data);
    out.textContent = "ارسال شد. پاسخ را در چت ببینید.";
  } else {
    out.textContent = "وب‌اپ داخل تلگرام باز شود.";
  }
});
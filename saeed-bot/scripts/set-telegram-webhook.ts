// Run: npm run webhook -- --url=https://<your-worker-subdomain>.workers.dev/webhook
import { argv } from "node:process";
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("Set TELEGRAM_BOT_TOKEN env var (wrangler secret)");
const urlArg = argv.find((a) => a.startsWith("--url="));
if (!urlArg) throw new Error("Pass --url=<webhook-url>");
const url = urlArg.split("=")[1];

const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url })
});
console.log("Webhook set:", await resp.json());
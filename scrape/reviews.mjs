import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(process.cwd(), "scrape", "raw");
const j = JSON.parse(await readFile(path.join(RAW, "reviews.json"), "utf8"));
console.log("meta:", JSON.stringify(j.meta));
console.log("total reviews fetched:", j.reviews.length);

const rows = j.reviews.map((r) => ({
  id: r.id,
  rating: r.rating,
  date: (r.date_created || "").slice(0, 10),
  provider: r.provider,
  likes: r.likes_count,
  official: r.official_answer ? r.official_answer.text : null,
  text: (r.text || "").replace(/\s+/g, " ").trim(),
}));

await writeFile(path.join(RAW, "reviews_clean.json"), JSON.stringify(rows, null, 2), "utf8");

const byYear = {};
for (const r of rows) {
  const y = r.date.slice(0, 4);
  byYear[y] = (byYear[y] || 0) + 1;
}
console.log("by year:", byYear);
console.log("with official answer:", rows.filter((r) => r.official).length);
console.log("avg rating:", (rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length).toFixed(2));
console.log("\n------ 5-star reviews, longer than 90 chars, no personal names/finances ------\n");

const nameRe = /(?:[А-ЯЁ][а-яё]+)\s+(?:[А-ЯЁ]\.|[А-ЯЁ][а-яё]+)/;
const moneyRe = /(\d[\d\s]*\s*(?:тг|тенге|₸|тыс))/i;
let n = 0;
for (const r of rows) {
  if (r.rating !== 5) continue;
  if (r.text.length < 90) continue;
  if (moneyRe.test(r.text)) continue;
  n++;
  console.log(`[${r.date}] (${r.text.length}) ${r.text.slice(0, 700)}`);
  console.log("");
  if (n > 45) break;
}

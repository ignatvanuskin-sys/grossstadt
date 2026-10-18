import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : raw.items ?? raw.result?.items ?? [];
console.log("items:", items.length, "top keys:", Object.keys(raw).slice(0, 8).join(","));

items.forEach((it, i) => {
  const p = it.product ?? it;
  const name = String(p.name ?? it.name ?? "?").replace(/\s+/g, " ").trim();
  const desc = String(p.description ?? it.description ?? p.text ?? "").replace(/\s+/g, " ").trim();
  console.log(`${String(i + 1).padStart(2, "0")}. ${name}`);
  if (desc && desc !== name) console.log(`     desc: ${desc.slice(0, 160)}`);
});

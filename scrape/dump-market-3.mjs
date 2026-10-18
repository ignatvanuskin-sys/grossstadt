import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : (raw.items ?? raw.result?.items ?? []);

for (const [i, item] of items.entries()) {
  const p = item.product ?? item;
  const name = String(p.name ?? "?").replace(/\s+/g, " ").trim();
  const desc = String(p.description ?? "").replace(/\s+/g, " ").trim();
  const attrs = (p.attributes ?? []).map((a) => `${a.caption ?? a.name ?? a.tag ?? "?"}=${a.value ?? a.text ?? ""}`);
  const groups = (p.attribute_groups ?? []).map((g) => JSON.stringify(g).slice(0, 120));
  console.log(`${String(i + 1).padStart(2, "0")}. ${name}`);
  console.log(`    desc: ${desc || "—"}`);
  if (attrs.length) console.log(`    attrs: ${attrs.join(" | ")}`);
  if (groups.length) console.log(`    groups: ${groups.join(" | ")}`);
  console.log(`    categories: ${(p.categories ?? []).map((c) => c.label).join(", ")}`);
}

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(process.cwd(), "scrape", "raw");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

// 1. full market items
const mk = await fetch(
  "https://market-backend.api.2gis.ru/5.0/product/items_by_branch?branch_id=70000001031499811&locale=ru_KZ&page=1&page_size=50&feature_config=categories_without_fake_first_level,range_price_type_supported,from_price_type_supported,fas_not_ad_text",
  { headers: { "User-Agent": UA } }
).then((r) => r.json());
await writeFile(path.join(RAW, "market.json"), JSON.stringify(mk, null, 2), "utf8");
console.log("market items:", mk.result?.items?.length, "total:", mk.result?.total);
for (const it of mk.result?.items || []) {
  const p = it.product;
  console.log(
    " *",
    p.name,
    "| price:",
    JSON.stringify(it.offer?.price_value)?.slice(0, 120),
    "| cat:",
    p.categories?.map((c) => c.label).join(",")
  );
}

// 2. parse SSR html for state
const html = await readFile(path.join(RAW, "html.json"), "utf8");
console.log("html length", html.length);

const patterns = [
  /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
  /window\.initialState\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
];
for (const [i, re] of patterns.entries()) {
  const m = html.match(re);
  console.log("pattern", i, m ? "MATCH len=" + m[1].length : "no");
  if (m) {
    await writeFile(path.join(RAW, `state_${i}.json`), m[1], "utf8");
  }
}

// schedule / hours hints
const scheduleIdx = html.indexOf("schedule");
if (scheduleIdx > -1) {
  console.log("schedule ctx:", html.slice(scheduleIdx - 200, scheduleIdx + 1200).replace(/\s+/g, " ").slice(0, 1400));
}

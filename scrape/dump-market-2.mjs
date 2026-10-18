import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : (raw.items ?? raw.result?.items ?? []);
const first = items[0];
console.log("keys of first item:", Object.keys(first));
console.log(JSON.stringify(first).slice(0, 3000));

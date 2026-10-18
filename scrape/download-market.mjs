/**
 * The 2GIS "Товары и услуги" tab publishes one image per work item.
 * Downloads every image at presentation size for visual review.
 */
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "scrape", "raw", "market");
await mkdir(OUT, { recursive: true });

const raw = JSON.parse(fs.readFileSync("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : (raw.items ?? raw.result?.items ?? []);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const index = [];

for (const [i, item] of items.entries()) {
  const product = item.product ?? item;
  const name = String(product.name ?? "?").replace(/\s+/g, " ").trim();
  const images = product.images ?? [];
  if (!images.length) {
    console.log(`${String(i + 1).padStart(2, "0")}. ${name} — NO IMAGE`);
    index.push({ i: i + 1, name, image: null });
    continue;
  }

  const url = images[0].replace("{width}", "1600").replace("{height}", "1200");
  const file = `${String(i + 1).padStart(2, "0")}.jpg`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT, file), buf);
    console.log(`${String(i + 1).padStart(2, "0")}. ${(buf.length / 1024).toFixed(0)}KB  ${name}`);
    index.push({ i: i + 1, name, image: url, file });
  } catch (error) {
    console.log(`${String(i + 1).padStart(2, "0")}. FAIL ${error} ${name}`);
    index.push({ i: i + 1, name, image: url, file: null, error: String(error) });
  }
}

await writeFile("scrape/raw/market-index.json", `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`\n${items.length} items -> ${OUT}`);

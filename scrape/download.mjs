import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "scrape", "raw", "img");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const items = JSON.parse(
  await (await import("node:fs/promises")).readFile(
    path.resolve(process.cwd(), "scrape", "raw", "photos.json"),
    "utf8"
  )
).items;

await mkdir(OUT, { recursive: true });

for (const it of items) {
  const url = it.photo?.url;
  if (!url) continue;
  const ext = ".jpg";
  const name = `${it.id}__${it.copyright?.code || "x"}${ext}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT, name), buf);
    console.log(`OK ${name} ${(buf.length / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e}`);
  }
}

import sharp from "sharp";

const raw = JSON.parse(await (await import("node:fs/promises")).readFile("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : (raw.items ?? raw.result?.items ?? []);
const base = items[0].product.images[0].replace(/\?.*$/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const boxes = [
  [1200, 1500],
  [1200, 1412],
  [1200, 1333],
  [1200, 1263],
  [1200, 1224],
];

for (const [w, h] of boxes) {
  const url = `${base}?w=${w}&h=${h}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf)
    .resize(300, Math.round((h / w) * 300))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let lastColorful = -1;
  for (let y = 0; y < height; y += 1) {
    let colourful = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 40 && max - min > 30) colourful += 1;
    }
    if (colourful / width > 0.25) lastColorful = y;
  }

  const gapPct = ((height - 1 - lastColorful) / height) * 100;
  console.log(
    `box ${String(w).padStart(4)}x${String(h).padStart(4)} aspect ${(w / h).toFixed(3)} -> last render row at ${lastColorful}/${height - 1} (gap ${gapPct.toFixed(2)}%)`,
  );
}

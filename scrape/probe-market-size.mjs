import fs from "node:fs";
import sharp from "sharp";

const raw = JSON.parse(fs.readFileSync("scrape/raw/market.json", "utf8"));
const items = Array.isArray(raw) ? raw : (raw.items ?? raw.result?.items ?? []);
const base = items[0].product.images[0].replace(/\?.*$/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const boxes = [
  ["a1000x2500", "?w=1000&h=2500"],
  ["b1200x2100", "?w=1200&h=2100"],
  ["c1200x1900", "?w=1200&h=1900"],
  ["d1400x1800", "?w=1400&h=1800"],
];

for (const [label, qs] of boxes) {
  const url = `${base}${qs}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  console.log(label.padEnd(11), res.status, `${meta.width}x${meta.height}`, `${(buf.length / 1024).toFixed(0)}KB`);
  fs.writeFileSync(`scrape/raw/probe-${label}.jpg`, buf);
}

// Report the vertical extent of non-black content in each probe, to work out
// which box finally contains the whole poster.
for (const [label] of boxes) {
  const file = `scrape/raw/probe-${label}.jpg`;
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const raw8 = await img.greyscale().raw().toBuffer();
  const rowHas = (y) => {
    for (let x = 0; x < width; x += 4) if (raw8[y * width + x] > 28) return true;
    return false;
  };
  let top = 0;
  while (top < height && !rowHas(top)) top += 1;
  let bottom = height - 1;
  while (bottom > 0 && !rowHas(bottom)) bottom -= 1;
  console.log(`${label.padEnd(11)} content rows: ${top}..${bottom} of ${height}`);
}

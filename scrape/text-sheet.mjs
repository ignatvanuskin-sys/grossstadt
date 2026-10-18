import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "scrape/raw/market-sheets-src";
const OUT = "scrape/raw/text-sheets";
fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".png"))
  .sort();

const PER = 6;
const COLS = 2;
const CELL_W = 1180;
const TEXT_H = 900; // top 50% of the 1800x1800 sheet = letterhead + all text

for (let s = 0; s * PER < files.length; s += 1) {
  const chunk = files.slice(s * PER, (s + 1) * PER);
  const rows = Math.ceil(chunk.length / COLS);
  const composites = [];

  for (const [i, file] of chunk.entries()) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const buf = await sharp(path.join(SRC, file))
      .extract({ left: 0, top: 0, width: 1800, height: TEXT_H })
      .resize(CELL_W - 10, null)
      .png()
      .toBuffer();
    const h = (await sharp(buf).metadata()).height ?? 0;
    composites.push({ input: buf, left: col * CELL_W + 10, top: row * (h + 10) + 10 });
    const label = `<svg width="200" height="46" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="46" fill="#FFD479"/><text x="12" y="33" font-family="monospace" font-size="30" fill="black">${file.replace(".png", "")}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: col * CELL_W + 10, top: row * (h + 10) + 10 });
  }

  const firstH = (await sharp(await sharp(path.join(SRC, chunk[0])).extract({ left: 0, top: 0, width: 1800, height: TEXT_H }).resize(CELL_W - 10, null).png().toBuffer()).metadata()).height ?? 500;
  const totalH = rows * (firstH + 10) + 10;

  await sharp({ create: { width: COLS * CELL_W + 10, height: totalH, channels: 3, background: { r: 24, g: 24, b: 24 } } })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, `text-${s + 1}.jpg`));

  console.log(`text-${s + 1}.jpg (${COLS * CELL_W + 10}x${totalH}) -> ${chunk.join(", ")}`);
}

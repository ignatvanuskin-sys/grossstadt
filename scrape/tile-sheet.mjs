import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "scrape/raw/market-tiles";
const OUT = "scrape/raw/tile-sheets";
fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith("-1.webp"))
  .sort();

const COLS = 5;
const CELL_W = 400;
const CELL_H = 270;
const composites = [];

for (const [i, file] of files.entries()) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const buf = await sharp(path.join(SRC, file))
    .resize(CELL_W - 8, CELL_H - 22, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  composites.push({ input: buf, left: col * CELL_W + 4, top: row * CELL_H + 4 });
  const label = `<svg width="120" height="26" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="26" fill="#FFD479"/><text x="8" y="20" font-family="monospace" font-size="17" fill="black">${file.replace(".webp", "")}</text></svg>`;
  composites.push({ input: Buffer.from(label), left: col * CELL_W + 4, top: row * CELL_H + CELL_H - 22 });
}

const rows = Math.ceil(files.length / COLS);
await sharp({
  create: { width: COLS * CELL_W, height: rows * CELL_H, channels: 3, background: { r: 16, g: 16, b: 16 } },
})
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(path.join(OUT, "primary.jpg"));

console.log(`primary.jpg ${COLS * CELL_W}x${rows * CELL_H} (${files.length} tiles)`);

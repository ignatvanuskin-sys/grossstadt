/**
 * Builds 3x3 contact sheets of the 2GIS market images so the whole set can be
 * reviewed in a few looks instead of 25 separate ones. Labels are burned in.
 */
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "scrape/raw/market";
const OUT = "scrape/raw/market-sheets";
await mkdir(OUT, { recursive: true });

const CELL = 780;
const COLS = 3;
const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".jpg"))
  .sort();

const PER_SHEET = COLS * COLS;
const sheets = Math.ceil(files.length / PER_SHEET);

for (let s = 0; s < sheets; s += 1) {
  const chunk = files.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const rows = Math.ceil(chunk.length / COLS);
  const width = COLS * CELL;
  const height = rows * CELL;

  const composites = [];
  for (const [i, file] of chunk.entries()) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const buf = await sharp(path.join(SRC, file))
      .resize(CELL - 16, CELL - 16, { fit: "cover" })
      .png()
      .toBuffer();
    composites.push({ input: buf, left: col * CELL + 8, top: row * CELL + 8 });

    const label = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="60" fill="black" opacity="0.72"/>
      <text x="14" y="40" font-family="monospace" font-size="30" fill="white">${file.replace(".jpg", "")}</text>
    </svg>`;
    composites.push({ input: Buffer.from(label), left: col * CELL + 8, top: row * CELL + 8 });
  }

  await sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(OUT, `sheet-${s + 1}.jpg`));

  console.log(`sheet-${s + 1}.jpg  ${width}x${height}  cells: ${chunk.join(", ")}`);
}

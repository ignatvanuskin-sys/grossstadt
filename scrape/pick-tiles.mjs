/**
 * Picks the two best renders out of the auto-extracted tiles and rates them,
 * so the site can show a clean card image for every catalogue project.
 */
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TILES = "scrape/raw/market-tiles";
const OUT = "scrape/raw/selected";
fs.mkdirSync(OUT, { recursive: true });

const report = JSON.parse(fs.readFileSync("scrape/raw/market-tiles.json", "utf8"));

const score = async (file) => {
  const p = path.join(TILES, file);
  const { width, height } = await sharp(p).metadata();
  const { data, info } = await sharp(p).resize(160, 160, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < info.width * info.height; i += 1) {
    const k = i * info.channels;
    if (Math.max(data[k], data[k + 1], data[k + 2]) < 30) dark += 1;
  }
  const darkFrac = dark / (info.width * info.height);
  return { file, width, height, aspect: Number((width / height).toFixed(3)), darkFrac: Number(darkFrac.toFixed(3)) };
};

const picked = [];
for (const entry of report) {
  const candidates = [];
  for (const tile of entry.tiles ?? []) {
    const s = await score(tile.file);
    s.top = tile.top;
    s.heightPx = tile.height;
    candidates.push(s);
  }
  candidates.sort((a, b) => {
    const scoreOf = (c) =>
      (c.width >= 500 ? 3 : c.width >= 420 ? 1 : -2) +
      (c.darkFrac < 0.35 ? 2 : c.darkFrac < 0.5 ? 0 : -2) +
      (c.height >= 300 ? 1 : -1);
    return scoreOf(b) - scoreOf(a);
  });
  picked.push({ n: entry.n, candidates });
  console.log(`${entry.n}: ${candidates.map((c) => `${c.file} ${c.width}x${c.height} dark=${c.darkFrac}`).join(" | ")}`);
}

fs.writeFileSync("scrape/raw/selected.json", `${JSON.stringify(picked, null, 2)}\n`, "utf8");
console.log("\nsaved -> scrape/raw/selected.json");

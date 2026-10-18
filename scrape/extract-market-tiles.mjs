/**
 * Extracts the renders from the 2GIS project sheets.
 *
 * Sheet anatomy (confirmed visually on all 25 files): flat dark background,
 * studio letterhead + title + "Площадь / Стиль" + "Особенности проекта" text
 * block on top, then a 2x2 render grid.
 *
 * Strategy: work at 900x900, sample the sheet background from the corners,
 * mark every pixel that differs from it as content, find the content row bands
 * (the render grid rows), then inside the first band find the background gutter
 * that separates the two renders.
 */
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("scrape/raw/market-sheets-src");
const OUT = path.resolve("scrape/raw/market-tiles");
const SIZE = 900;
await mkdir(OUT, { recursive: true });

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".png"))
  .sort();

const report = [];

for (const file of files) {
  const n = file.replace(".png", "");
  const sheet = path.join(SRC, file);
  const meta = await sharp(sheet).metadata();
  const fullW = meta.width ?? 1800;
  const fullH = meta.height ?? 1800;
  const scaleToFull = fullW / SIZE;

  const corner = await sharp(sheet)
    .extract({ left: 3, top: 3, width: 6, height: 6 })
    .raw()
    .toBuffer();
  const bg = [corner[0], corner[1], corner[2]];
  const isContent = (r, g, b) =>
    Math.abs(r - bg[0]) > 14 || Math.abs(g - bg[1]) > 14 || Math.abs(b - bg[2]) > 14;

  const buf = await sharp(sheet).resize(SIZE, SIZE, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const at = (x, y) => {
    const k = (y * SIZE + x) * 3;
    return [buf[k], buf[k + 1], buf[k + 2]];
  };

  const rowHits = new Array(SIZE).fill(0);
  const colHits = new Array(SIZE).fill(0);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const [r, g, b] = at(x, y);
      if (isContent(r, g, b)) {
        rowHits[y] += 1;
        colHits[x] += 1;
      }
    }
  }

  const runs = (hits, threshold, minLen) => {
    const out = [];
    let start = -1;
    for (let k = 0; k < hits.length; k += 1) {
      const on = hits[k] > threshold;
      if (on && start < 0) start = k;
      if ((!on || k === hits.length - 1) && start >= 0) {
        const end = on ? k : k - 1;
        if (end - start + 1 >= minLen) out.push([start, end]);
        start = -1;
      }
    }
    return out;
  };

  // Render grid rows: wide content bands. The letterhead and the text block
  // are also content, so a band only counts if it contains a background gutter
  // in the middle of the sheet -- which only the render grid has.
  const bandHasGutter = (y0, y1) => {
    for (let x = Math.floor(SIZE * 0.3); x < Math.floor(SIZE * 0.7); x += 1) {
      let bgCount = 0;
      for (let y = y0; y <= y1; y += 1) {
        const [r, g, b] = at(x, y);
        if (!isContent(r, g, b)) bgCount += 1;
      }
      if (bgCount / (y1 - y0 + 1) > 0.95 && y1 - y0 >= 6) return x;
    }
    return -1;
  };

  const rowBands = runs(rowHits, 30, 60);
  const firstBand = rowBands.find(([y0, y1]) => y1 - y0 >= 100 && bandHasGutter(y0, y1));
  const result = { n, bg, size: `${fullW}x${fullH}`, rowBands, tiles: [] };

  if (!firstBand) {
    report.push({ ...result, error: "no-row-band" });
    console.log(`${n}: NO ROW BAND`);
    continue;
  }

  const top = Math.max(0, Math.round(firstBand[0] * scaleToFull));
  const bottom = Math.min(fullH, Math.round((firstBand[1] + 1) * scaleToFull));
  const bandHeight = bottom - top;

  const band = await sharp(sheet)
    .extract({ left: 0, top, width: fullW, height: bandHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = band.info.channels;
  const isBgColumn = (x) => {
    let bgCount = 0;
    let total = 0;
    for (let y = 0; y < bandHeight; y += 2) {
      const k = (y * band.info.width + x) * ch;
      total += 1;
      if (!isContent(band.data[k], band.data[k + 1], band.data[k + 2])) bgCount += 1;
    }
    return bgCount / total > 0.95;
  };

  // Gutter: longest background run whose centre is closest to the middle of the
  // sheet. Works around renders that contain large dark areas of their own.
  const mid = fullW / 2;
  let bestRun = null;
  let runStart = -1;
  for (let x = Math.floor(fullW * 0.2); x < Math.floor(fullW * 0.8); x += 1) {
    if (isBgColumn(x)) {
      if (runStart < 0) runStart = x;
    } else if (runStart >= 0) {
      const candidate = [runStart, x - 1];
      const centre = (candidate[0] + candidate[1]) / 2;
      const better =
        !bestRun ||
        Math.abs(centre - mid) < Math.abs((bestRun[0] + bestRun[1]) / 2 - mid) - 4 ||
        (Math.abs(centre - mid) < 60 && candidate[1] - candidate[0] > bestRun[1] - bestRun[0]);
      if (candidate[1] - candidate[0] >= 6 && better) bestRun = candidate;
      runStart = -1;
    }
  }

  // Fallback: the two sheet templates both place the render grid gutter at a
  // fixed x range. Used when a sheet's renders are so dark that the gutter
  // cannot be told apart from the render itself.
  const templateGutter = firstBand[0] < 400 ? [866, 924] : [947, 963];
  const gutter = bestRun ?? templateGutter;

  let gridLeft = 0;
  while (gridLeft < fullW && colHits[Math.min(SIZE - 1, Math.floor(gridLeft / scaleToFull))] <= 8) gridLeft += 1;
  let gridRight = fullW - 1;
  while (gridRight > 0 && colHits[Math.min(SIZE - 1, Math.floor(gridRight / scaleToFull))] <= 8) gridRight -= 1;
  gridLeft = Math.max(0, gridLeft - 2);
  gridRight = Math.min(fullW - 1, gridRight + 2);

  const spans = [
    { left: gridLeft, right: gutter[0] - 4 },
    { left: gutter[1] + 5, right: gridRight },
  ];

  for (const [i, span] of spans.entries()) {
    const width = span.right - span.left + 1;
    if (width < 200 || bandHeight < 150) continue;
    await sharp(sheet)
      .extract({ left: span.left, top, width, height: bandHeight })
      .webp({ quality: 88, effort: 5 })
      .toFile(path.join(OUT, `${n}-${i + 1}.webp`));
    result.tiles.push({ file: `${n}-${i + 1}.webp`, left: span.left, top, width, height: bandHeight });
  }

  report.push(result);
  console.log(
    `${n} bg=${bg.join(",")} band ${firstBand[0]}-${firstBand[1]} (y ${top}-${bottom}) gutter ${bestRun ? bestRun.join("-") : "none"} -> ${result.tiles.length} tiles ${result.tiles.map((t) => `${t.width}x${t.height}`).join(" ")}`,
  );
}

await writeFile("scrape/raw/market-tiles.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("\nsaved -> scrape/raw/market-tiles.json");


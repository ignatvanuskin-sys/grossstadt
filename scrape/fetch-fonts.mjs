/**
 * Downloads the two typefaces used by the site (Onest for display, Manrope for
 * body) as self-hosted woff2 files, latin + cyrillic subsets only, straight into
 * public/fonts. globals.css declares them with explicit unicode-range, so the
 * browser fetches both subsets of a family in parallel instead of chaining them.
 * Nothing is fetched from a third party at runtime.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const OUT = path.resolve("public", "fonts");
await mkdir(OUT, { recursive: true });

const families = [
  { file: "onest", query: "family=Onest:wght@400..700" },
  { file: "manrope", query: "family=Manrope:wght@400..700" },
];

for (const { file, query } of families) {
  const cssUrl = `https://fonts.googleapis.com/css2?${query}&display=swap&subset=cyrillic,latin`;
  const res = await fetch(cssUrl, { headers: { "User-Agent": UA } });
  const css = await res.text();

  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)];
  console.log(`--- ${file}: ${blocks.length} subset blocks`);

  for (const [, subset, body] of blocks) {
    if (!["cyrillic", "latin"].includes(subset)) continue;
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? "400";
    if (!url) continue;

    const range = weight.replace(/\s+/g, "-");
    const name = `${file}-${subset}-${range}.woff2`;
    const fontRes = await fetch(url, { headers: { "User-Agent": UA } });
    const buffer = Buffer.from(await fontRes.arrayBuffer());
    await writeFile(path.join(OUT, name), buffer);
    console.log(`  ${name.padEnd(34)} ${(buffer.length / 1024).toFixed(1)}KB  weight ${weight} ${subset}`);
  }
}

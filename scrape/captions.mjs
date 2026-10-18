/**
 * Re-reads the public Instagram embed for every project post and stores the
 * caption text verbatim, so that the "визуализация / фото" label on the site
 * can be checked against what the studio actually wrote.
 */
import { mkdir, writeFile } from "node:fs/promises";

const slugs = [
  "DVeQBuCiGL4",
  "DVkukpXiOWn",
  "C71c5agiS3Y",
  "DHGQ3MZoKOX",
  "C61BTfZIcob",
  "CkK2sVMLnXo",
  "C0tPljZMtLr",
];

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  "accept-language": "ru-RU,ru;q=0.9",
};

const decode = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");

const out = {};

for (const slug of slugs) {
  const url = `https://www.instagram.com/p/${slug}/embed/captioned/`;
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const title = text.match(/<div class="Caption"[\s\S]*?<\/div>/);
    const alt = text.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"([\s\S]*?)"\}\}\]\}/);
    const captionEl = text.match(
      /class="Caption"[\s\S]{0,4000}?<\/div>/,
    );
    const raw = alt ? alt[1] : captionEl ? captionEl[0] : "";
    const clean = decode(raw)
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\\n/g, "\n")
      .replace(/\\u0026/g, "&")
      .replace(/[ \t]+/g, " ")
      .trim();

    const images = [
      ...new Set([...text.matchAll(/https:\/\/[^"'\s]+\.(?:jpg|webp)[^"'\s]*/g)].map((m) => m[0])),
    ];

    out[slug] = { url, status: res.status, caption: clean, imageCount: images.length, images: images.slice(0, 4) };
    console.log(`--- ${slug} (${res.status}) images:${images.length}`);
    console.log(clean.slice(0, 900));
    console.log("");
  } catch (error) {
    out[slug] = { url, error: String(error) };
    console.log(`--- ${slug} FAILED: ${error}`);
  }
}

await mkdir("scrape/raw", { recursive: true });
await writeFile("scrape/raw/ig-captions.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log("saved -> scrape/raw/ig-captions.json");

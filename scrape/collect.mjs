// One-off data collection from public 2GIS APIs. Not part of the site build.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BRANCH = "70000001031499811";
const REV_KEY = "6e7e1929-4ea9-4a5d-8c05-d601860389bd";
const PHOTO_KEY = "gYu1s9N1wP";
const OUT = path.resolve(process.cwd(), "scrape", "raw");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function collectReviews() {
  const all = [];
  let meta = null;
  let url =
    `https://public-api.reviews.2gis.com/3.0/branches/${BRANCH}/reviews` +
    `?limit=50&key=${REV_KEY}&locale=ru_KZ&sort_by=date_created`;
  for (let page = 0; page < 6; page++) {
    const j = await getJSON(url);
    if (!meta) meta = j.meta;
    const revs = j.reviews || [];
    all.push(...revs);
    if (!j.meta?.next_link || revs.length === 0) break;
    url = j.meta.next_link;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { meta, reviews: all };
}

async function collectPhotos() {
  const j = await getJSON(
    `https://api.photo.2gis.com/3.0/objects/${BRANCH}/albums/all/media?key=${PHOTO_KEY}&page_size=100&locale=ru_KZ`
  );
  return j;
}

async function collectMarket() {
  try {
    return await getJSON(
      `https://market-backend.api.2gis.ru/5.0/product/items_by_branch?branch_id=${BRANCH}` +
        `&locale=ru_KZ&page=1&page_size=100&feature_config=categories_without_fake_first_level,range_price_type_supported,from_price_type_supported,fas_not_ad_text`
    );
  } catch (e) {
    return { error: String(e) };
  }
}

async function collectHtml() {
  return getText(`https://2gis.kz/astana/firm/${BRANCH}`);
}

async function collectRatings() {
  try {
    return await getJSON(
      `https://public-api.reviews.2gis.com/3.0/objects/ratings/light?key=${REV_KEY}&object_ids=${BRANCH}&locale=ru_KZ`
    );
  } catch (e) {
    return { error: String(e) };
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const tasks = {
    reviews: collectReviews,
    photos: collectPhotos,
    market: collectMarket,
    html: collectHtml,
    ratings: collectRatings,
  };
  for (const [name, fn] of Object.entries(tasks)) {
    try {
      const data = await fn();
      const file = path.join(OUT, `${name}.json`);
      await writeFile(file, typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf8");
      const size = typeof data === "string" ? data.length : JSON.stringify(data).length;
      console.log(`OK   ${name} (${size} bytes)`);
    } catch (e) {
      console.log(`FAIL ${name}: ${e}`);
    }
  }
}

main();

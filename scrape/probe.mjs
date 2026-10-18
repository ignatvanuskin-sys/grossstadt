import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(process.cwd(), "scrape", "raw");
const html = await readFile(path.join(RAW, "html.json"), "utf8");

function ctx(needle, before = 120, after = 500, max = 4) {
  const out = [];
  let i = -1;
  while (out.length < max) {
    i = html.indexOf(needle, i + 1);
    if (i === -1) break;
    out.push(html.slice(Math.max(0, i - before), i + after).replace(/\s+/g, " "));
  }
  return out;
}

const probes = [
  '"contact_groups"',
  '"whatsapp"',
  '"instagram"',
  '"point"',
  '"address_name"',
  '"description"',
  '"purpose_name"',
  '"name_ex"',
  '"short_name"',
  '"photos"',
  '"attribute_groups"',
  '"reviews"',
  '"rubrics"',
  '"org"',
  '"legal"',
];
for (const p of probes) {
  const c = ctx(p, 60, 400, 2);
  console.log("=== " + p + " ===");
  for (const s of c) console.log(s.slice(0, 460));
  console.log();
}

// try to locate the big embedded JSON
const marks = ["__INITIAL_STATE__", "initialState", "window.__data", "application/json"];
for (const m of marks) {
  console.log(m, "->", html.indexOf(m));
}
const jsonLd = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
console.log("ld+json blocks:", jsonLd.length);
for (const j of jsonLd) {
  await writeFile(path.join(RAW, "ld_" + Math.random().toString(36).slice(2, 7) + ".json"), j[1], "utf8");
  console.log(j[1].slice(0, 600));
}

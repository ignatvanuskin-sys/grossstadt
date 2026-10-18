// Small helper to read a Lighthouse report from the CLI without shell quoting pain.
// Usage: node lighthouse/inspect.mjs lighthouse/home7.json
import { readFileSync } from "node:fs";

const file = process.argv[2];
const raw = readFileSync(file, "utf8");
const r = JSON.parse(raw);

console.log("bytes:", raw.length);
console.log("top-level keys:", Object.keys(r).join(", "));
const cats = r.categories ?? {};
console.log("categories:", Object.keys(cats).length ? Object.keys(cats).join(", ") : "(empty)");
for (const [key, value] of Object.entries(cats)) {
  console.log(`  ${key}: ${value.score === null ? "n/a" : Math.round(value.score * 100)}`);
}

const a = r.audits ?? {};
console.log("audits:", Object.keys(a).length);
const observed = a.metrics?.details?.items?.[0];
if (observed) {
  console.log("\nobserved (real, unthrottled trace):");
  for (const k of [
    "firstContentfulPaint",
    "largestContentfulPaint",
    "totalBlockingTime",
    "speedIndex",
    "interactive",
    "observedFirstPaint",
    "observedDomContentLoaded",
    "observedLoad",
  ]) {
    if (observed[k] !== undefined) console.log(`  ${k}: ${observed[k]}`);
  }
}
for (const k of ["cumulative-layout-shift", "server-response-time", "total-byte-weight"]) {
  if (a[k]) console.log(`  ${k}: ${a[k].displayValue ?? ""}`);
}

console.log("\naudits below 90:");
for (const [id, audit] of Object.entries(a)) {
  if (audit.score === null) continue;
  if (audit.scoreDisplayMode === "informative" || audit.scoreDisplayMode === "notApplicable") continue;
  if (audit.score >= 0.9) continue;
  console.log(`  ${id} :: score=${Math.round(audit.score * 100)} :: ${audit.displayValue ?? ""}`);
}

const lcp = a["largest-contentful-paint-element"]?.details?.items ?? [];
console.log("\nLCP element and phases:");
for (const block of lcp) {
  if (block.type !== "table") continue;
  for (const item of block.items ?? []) {
    if (item.node) {
      console.log(`  element: ${item.node.selector}`);
      console.log(`  snippet: ${String(item.node.snippet).slice(0, 120)}`);
    } else if (item.phase) {
      console.log(`  ${item.phase}: ${Math.round(item.timing)} ms (${item.percent})`);
    }
  }
}

console.log("\nrender-blocking:");
for (const item of a["render-blocking-resources"]?.details?.items ?? []) {
  console.log(`  ${item.totalBytes} B, wasted ${item.wastedMs} ms :: ${String(item.url).slice(-60)}`);
}

console.log("\nnetwork requests (first 12 by end time):");
const requests = a["network-requests"]?.details?.items ?? [];
for (const item of [...requests].sort((x, y) => x.networkEndTime - y.networkEndTime).slice(0, 12)) {
  console.log(
    `  end=${Math.round(item.networkEndTime)} start=${Math.round(item.networkRequestTime)} ${item.priority} ${item.resourceType} ${String(item.url).slice(-58)}`,
  );
}


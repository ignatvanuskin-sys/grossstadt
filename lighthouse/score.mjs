/**
 * Считает оценки Lighthouse из JSON-отчёта и печатает только то, что нужно
 * для доказательства требований: взвешенный Performance, наблюдаемые (реальные)
 * метрики трассы и список проваленных аудитов.
 *
 * Зачем свой скрипт: CLI Lighthouse в этом окружении приходит с пустым объектом
 * `categories`, поэтому оценку Performance приходится собирать по весам
 * (Lighthouse 10+: FCP 10 %, SI 10 %, LCP 25 %, TBT 30 %, CLS 25 %).
 *
 * Запуск: npm run lh:score -- lighthouse/home7.json
 */
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node lighthouse/score.mjs <report.json>");
  process.exit(1);
}

const report = JSON.parse(readFileSync(file, "utf8"));
const audits = report.audits ?? {};

const weights = {
  "first-contentful-paint": 0.1,
  "speed-index": 0.1,
  "largest-contentful-paint": 0.25,
  "total-blocking-time": 0.3,
  "cumulative-layout-shift": 0.25,
};

console.log(`отчёт: ${file}`);
console.log(`время прогона: ${report.fetchTime}`);
console.log(`формат: ${report.configSettings?.formFactor ?? "?"}, throttling: ${report.configSettings?.throttlingMethod ?? "?"}`);
console.log();

let performance = 0;
console.log("взвешенные метрики (симулированные, как их считает Lighthouse):");
for (const [id, weight] of Object.entries(weights)) {
  const audit = audits[id];
  const score = audit?.score ?? 0;
  performance += score * weight;
  console.log(
    `  ${id.padEnd(28)} ${String(Math.round(score * 100)).padStart(3)} × ${weight}  ${audit?.displayValue ?? ""}`,
  );
}
console.log(`  ${"ИТОГО PERFORMANCE".padEnd(28)} ${(performance * 100).toFixed(1)}`);
console.log();

const observed = audits.metrics?.details?.items?.[0];
if (observed) {
  console.log("наблюдаемые метрики (реальная трасса, без симуляции):");
  for (const key of [
    "observedFirstPaint",
    "observedFirstContentfulPaint",
    "observedLargestContentfulPaint",
    "observedSpeedIndex",
    "observedCumulativeLayoutShift",
    "observedDomContentLoaded",
    "observedLoad",
    "observedTraceEnd",
  ]) {
    if (observed[key] !== undefined) {
      const value = typeof observed[key] === "number" ? Math.round(observed[key]) : observed[key];
      console.log(`  ${key.padEnd(34)} ${value}`);
    }
  }
  console.log();
}

const lcpItems = audits["largest-contentful-paint-element"]?.details?.items ?? [];
for (const block of lcpItems) {
  if (block.type !== "table") continue;
  const phases = block.items.filter((item) => item.phase);
  const node = block.items.find((item) => item.node);
  if (node) {
    console.log("элемент LCP:");
    console.log(`  ${node.node.selector}`);
    console.log(`  ${String(node.node.snippet).slice(0, 110)}`);
  }
  if (phases.length) {
    console.log("  фазы (симуляция):");
    for (const phase of phases) console.log(`    ${phase.phase}: ${Math.round(phase.timing)} мс (${phase.percent})`);
  }
  console.log();
}

const metricIds = new Set(Object.keys(weights).concat(["max-potential-fid", "interactive"]));
console.log("аудиты ниже 100 (кроме метрик выше):");
let seen = 0;
for (const [id, audit] of Object.entries(audits)) {
  if (audit.score === null || audit.score >= 1) continue;
  if (audit.scoreDisplayMode === "informative" || audit.scoreDisplayMode === "notApplicable") continue;
  if (metricIds.has(id)) continue;
  seen += 1;
  console.log(`  ${id.padEnd(34)} ${String(Math.round(audit.score * 100)).padStart(3)}  ${audit.displayValue ?? ""}`);
}
if (!seen) console.log("  (нет)");

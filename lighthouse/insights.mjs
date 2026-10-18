/**
 * Печатает детали выбранных аудитов из отчёта Lighthouse: что именно тянет
 * метрики вниз (по ресурсам, элементам DOM, блокировкам).
 *
 * Запуск: node lighthouse/insights.mjs lighthouse/live-prod-mobile.json
 */
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "lighthouse/home.json";
const report = JSON.parse(readFileSync(file, "utf8"));
const audits = report.audits ?? {};

const show = (id, mapper) => {
  const a = audits[id];
  if (!a) return;
  const score = a.score === null ? "n/a" : a.score;
  console.log(`\n■ ${id}  [${score}]  ${a.displayValue ?? ""}`);
  console.log(`  ${(a.title ?? "").slice(0, 150)}`);
  const items = a.details?.items ?? [];
  if (mapper) mapper(items);
  else if (items.length) console.log("  " + JSON.stringify(items.slice(0, 6)).slice(0, 900));
};

const kb = (b) => (b ? Math.round(b / 1024) + " КБ" : "");
const ms = (v) => (v ? Math.round(v) + " мс" : "");

show("server-response-time", (i) =>
  i.slice(0, 5).forEach((x) => console.log(`  ответ сервера ${ms(x.responseTime)} — ${x.url}`)),
);
show("total-byte-weight", (i) => i.slice(0, 8).forEach((x) => console.log(`  ${kb(x.totalBytes).padStart(8)}  ${x.url.slice(0, 110)}`)));
show("render-blocking-resources", (i) => i.slice(0, 8).forEach((x) => console.log(`  ${ms(x.wastedMs)} — ${x.url.slice(0, 110)}`)));
show("render-blocking-insight", (i) => i.slice(0, 8).forEach((x) => console.log(`  ${ms(x.wastedMs)} — ${(x.url ?? x.node?.selector ?? "").slice(0, 110)}`)));
show("network-requests", (i) =>
  i
    .slice()
    .sort((a, b) => (b.networkEndTime ?? 0) - (a.networkEndTime ?? 0))
    .slice(0, 10)
    .forEach((x) => console.log(`  до ${ms(x.networkEndTime).padStart(8)}  ${x.resourceType}  ${kb(x.transferSize).padStart(7)}  ${x.url.slice(0, 100)}`)),
);
show("dom-size", (i) => i.forEach((x) => console.log(`  ${x.statistic}: ${x.value}  ${x.element ? "← " + String(x.element).slice(0, 90) : ""}`)));
show("mainthread-work-breakdown", (i) =>
  i.forEach((x) => console.log(`  ${ms(x.duration)}  ${x.groupLabel ?? x.group}`)),
);
show("bootup-time", (i) => i.slice(0, 6).forEach((x) => console.log(`  всего ${ms(x.total)} (скрипты ${ms(x.scripting)}) — ${String(x.url).slice(0, 100)}`)));
show("legacy-javascript", (i) => i.slice(0, 6).forEach((x) => console.log(`  ${kb(x.wastedBytes).padStart(7)} — ${x.url?.slice(0, 100)}`)));
show("legacy-javascript-insight", (i) =>
  (i[0]?.items ?? i).slice(0, 6).forEach((x) => console.log(`  ${kb(x.wastedBytes).padStart(7)} — ${String(x.url ?? "").slice(0, 100)}`)),
);
show("unused-javascript", (i) => i.slice(0, 6).forEach((x) => console.log(`  ${kb(x.wastedBytes).padStart(7)} — ${x.url?.slice(0, 100)}`)));
show("uses-responsive-images", (i) =>
  i.slice(0, 8).forEach((x) => console.log(`  ${kb(x.wastedBytes).padStart(7)}  показ ${x.displayedSize} → ${x.actualSize}  ${String(x.url).slice(0, 90)}`)),
);
show("image-delivery-insight", (i) =>
  (i[0]?.items ?? i).slice(0, 8).forEach((x) => console.log(`  ${kb(x.wastedBytes).padStart(7)}  ${x.subItems?.items?.[0]?.reason ?? ""}  ${String(x.url).slice(0, 90)}`)),
);
show("largest-contentful-paint-element", (i) =>
  (i[0]?.items ?? []).slice(0, 3).forEach((x) => console.log(`  ${x.node?.snippet ? String(x.node.snippet).slice(0, 120) : JSON.stringify(x).slice(0, 160)}`)),
);
show("network-dependency-tree-insight", (i) => {
  const chains = (i[0]?.items ?? []).slice(0, 6);
  chains.forEach((c) => console.log(`  цепочка: ${(c.chain ?? []).map((n) => String(n.url ?? "").slice(-40)).join(" → ")}`));
});
show("third-parties-insight", (i) => i.slice(0, 5).forEach((x) => console.log(`  ${x.entity} — ${kb(x.transferSize)}`)));

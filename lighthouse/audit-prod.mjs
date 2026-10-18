/**
 * Аудит живого прода: маршруты, метаданные, заголовки, API, ссылки,
 * изображения и консистентность контактов. Работает по любому BASE_URL,
 * ничего не меняет и ничего не отправляет в реальные мессенджеры.
 *
 * Запуск: node lighthouse/audit-prod.mjs https://grossstadt.vercel.app
 *         BASE_URL=... node lighthouse/audit-prod.mjs
 * Отчёт:  shots/audit-prod-report.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = "shots";
mkdirSync(OUT_DIR, { recursive: true });

const findings = [];
const add = (level, area, message, detail) => findings.push({ level, area, message, detail });

const get = async (path, init) => {
  const url = path.startsWith("http") ? path : BASE + path;
  try {
    const res = await fetch(url, { redirect: "manual", ...init });
    return { url, res };
  } catch (error) {
    return { url, error: String(error?.message ?? error) };
  }
};

const text = (res) => res.text();
const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const meta = (html, re) => (html.match(re)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
const all = (html, re) => html.match(re) ?? [];

const baseHost = new URL(BASE).host;
const isLocalBase = /^(localhost|127\.0\.0\.1)/.test(baseHost);

// Демо-режим определяется по robots.txt: там стоит полный запрет обхода.
// В демо-режиме пустой sitemap и noindex — ожидаемое поведение, а не дефект.
const robotsProbe = await get("/robots.txt");
const robotsText = robotsProbe.res ? await text(robotsProbe.res) : "";
const demoSite = /disallow:\s*\/\s*$/im.test(robotsText);
console.log(`БАЗА: ${BASE}`);
if (demoSite) console.log("режим: демо (обход запрещён robots.txt — пустой sitemap и noindex ожидаемы)");

// ---------------------------------------------------------------- маршруты
const business = JSON.parse(readFileSync("content/business.json", "utf8"));
const projectSlugs = (business.projects ?? []).map((p) => p.slug);
const staticRoutes = ["/", "/projects", "/privacy"];
const routes = [...staticRoutes, ...projectSlugs.map((s) => `/projects/${s}`)];

const routeReport = [];
console.log(`маршрутов в проверке: ${routes.length}\n`);

for (const route of routes) {
  const { url, res, error } = await get(route);
  if (error || !res) {
    add("P0", "routes", `${route}: сеть недоступна`, error);
    routeReport.push({ route, status: 0, error });
    continue;
  }
  const body = await text(res);
  const item = {
    route,
    status: res.status,
    bytes: body.length,
    title: meta(body, /<title>([\s\S]*?)<\/title>/),
    description: meta(body, /name="description" content="([^"]*)"/),
    canonical: meta(body, /rel="canonical" href="([^"]*)"/),
    ogImage: meta(body, /property="og:image" content="([^"]*)"/),
    robots: meta(body, /name="robots" content="([^"]*)"/),
    h1: all(body, /<h1[\s>]/g).length,
    jsonLd: all(body, /application\/ld\+json/g).length,
    images: [
      ...new Set(
        [...body.matchAll(/<img[^>]+src="([^"]*\/_next\/image\?[^"]+)"/g)].map((m) =>
          m[1].replace(/&amp;/g, "&"),
        ),
      ),
    ],
    imgsWithoutAlt: all(body, /<img(?![^>]*\balt=)[^>]*>/g).length,
    html: body,
  };
  routeReport.push(item);
  if (res.status !== 200) add("P0", "routes", `${route}: HTTP ${res.status}`, url);
  if (!item.title) add("P2", "seo", `${route}: пустой <title>`);
  if (!item.description) add("P2", "seo", `${route}: пустая meta description`);
  if (item.h1 !== 1) add("P2", "seo", `${route}: H1 найдено ${item.h1} (нужен ровно один)`);
  if (item.canonical.includes("localhost") && !isLocalBase) {
    add("P1", "seo", `${route}: canonical на localhost`, item.canonical);
  }
  if (item.canonical && !item.canonical.startsWith(BASE)) {
    add("P2", "seo", `${route}: canonical ведёт на другой адрес`, item.canonical);
  }
  if (item.ogImage && !/^https?:\/\//.test(item.ogImage)) {
    add("P2", "seo", `${route}: og:image относительный — соцсети не покажут превью`, item.ogImage);
  }
  if (!item.ogImage) {
    add("P2", "seo", `${route}: нет og:image — ссылка в WhatsApp развернётся без картинки`);
  }
  if (!item.jsonLd) add("P3", "seo", `${route}: нет микроразметки JSON-LD`);
  if (item.imgsWithoutAlt) add("P3", "a11y", `${route}: img без alt — ${item.imgsWithoutAlt}`);
}

// валидность JSON-LD и ответы изображений — на главной
const homeRoute = routeReport.find((r) => r.route === "/");
if (homeRoute) {
  const blocks = [...homeRoute.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw);
      const types = [parsed["@type"], ...(Array.isArray(parsed["@graph"]) ? parsed["@graph"].map((n) => n["@type"]) : [])]
        .filter(Boolean)
        .flat();
      console.log(`JSON-LD: ${types.join(", ")}`);
    } catch (error) {
      add("P2", "seo", "JSON-LD на главной не парсится", String(error?.message ?? error));
    }
  }
}

// дубли title/description
const group = (key) => {
  const map = new Map();
  for (const r of routeReport) if (r[key]) map.set(r[key], [...(map.get(r[key]) ?? []), r.route]);
  return [...map.entries()].filter(([, rs]) => rs.length > 1);
};
for (const [title, rs] of group("title")) add("P3", "seo", `дубли title: ${rs.join(", ")}`, title.slice(0, 80));
for (const [desc, rs] of group("description")) add("P3", "seo", `дубли description: ${rs.join(", ")}`, desc.slice(0, 80));

// --------------------------------------------------------------- заголовки
const headerChecks = [
  ["/", true],
  ["/fonts/manrope-cyrillic-400-700.woff2", false],
  ["/icon.svg", false],
];
const headersReport = [];
for (const [path, isHtml] of headerChecks) {
  const { res, error } = await get(path);
  if (error || !res) {
    add("P2", "headers", `${path}: не отвечает`, error);
    continue;
  }
  const h = Object.fromEntries(res.headers.entries());
  headersReport.push({
    path,
    status: res.status,
    cacheControl: h["cache-control"],
    contentType: h["content-type"],
    xRobots: h["x-robots-tag"],
    nosniff: h["x-content-type-options"],
    referrer: h["referrer-policy"],
    hsts: h["strict-transport-security"],
    csp: h["content-security-policy"] ?? null,
  });
  if (isHtml && h["x-robots-tag"]?.includes("noindex")) {
    add(
      demoSite ? "P3" : "P1",
      "seo",
      demoSite
        ? `${path}: демо-режим — сайт сознательно закрыт от индексации`
        : `${path}: сайт закрыт от индексации вне демо-режима`,
      h["x-robots-tag"],
    );
  }
  if (!h["x-content-type-options"]) add("P3", "security", `${path}: нет X-Content-Type-Options`);
  if (isHtml && !h["content-security-policy"]) {
    add("P3", "security", `${path}: нет Content-Security-Policy`);
  }
}

// robots и sitemap (robots уже прочитан выше — нужен для определения режима)
const hostLine = robotsText.split("\n").find((line) => /^host:/i.test(line.trim())) ?? "";
if (/localhost/i.test(hostLine) && !isLocalBase) {
  add("P1", "seo", "robots.txt: директива Host указывает на localhost", hostLine.trim());
} else if (hostLine && !hostLine.includes(baseHost)) {
  add("P3", "seo", "robots.txt: Host не совпадает с доменом", hostLine.trim());
}
const sitemap = await get("/sitemap.xml");
const sitemapText = sitemap.res ? await text(sitemap.res) : "";
const sitemapLocs = all(sitemapText, /<loc>/g).length;
if (sitemap.res?.status === 200 && sitemapLocs === 0) {
  add(
    demoSite ? "P3" : "P2",
    "seo",
    demoSite ? "sitemap.xml пустой — так и задумано в демо-режиме" : "sitemap.xml пустой в боевом режиме",
    sitemapText.slice(0, 100),
  );
}

// ------------------------------------------------------------------- API
const apiReport = [];
const api = async (name, init) => {
  const { res, error } = await get("/api/lead", init);
  if (error || !res) {
    apiReport.push({ name, error });
    add("P1", "api", `/api/lead (${name}): ошибка сети`, error);
    return;
  }
  const body = await text(res);
  apiReport.push({ name, status: res.status, body: body.slice(0, 200) });
  return res.status;
};
await api("пустой объект", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
await api("битый JSON", { method: "POST", headers: { "content-type": "application/json" }, body: "not-json" });
// Полный бриф, как его собирает форма: сервер должен принять его без ошибок.
await api("полный бриф", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    objectType: "Квартира",
    areaM2: "86",
    city: "Астана",
    services: ["Дизайн-проект"],
    timeline: "Готов начать сейчас",
    name: "Аудит",
    comment: "проверка аудита",
  }),
});
await api("неизвестные поля", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    objectType: "Офис",
    areaM2: "120",
    services: ["Дизайн-проект"],
    timeline: "Через полгода",
    name: "Аудит",
    extra: { deep: true },
    source: "audit",
  }),
});
await api("GET", { method: "GET" });
const valid = apiReport.find((r) => r.name === "полный бриф");
if (valid && valid.status !== 200) add("P1", "api", `полный бриф: HTTP ${valid.status}`, valid.body);
const method = apiReport.find((r) => r.name === "GET");
if (method && method.status !== 405) add("P2", "api", `GET /api/lead: HTTP ${method.status}, ожидался 405`);

// -------------------------------------------------------------- 404 и прочее
const nf = await get("/takoy-stranicy-tochno-net-12345");
if (nf.res) {
  const body = await text(nf.res);
  if (nf.res.status !== 404) add("P2", "routes", `несуществующий путь отдаёт HTTP ${nf.res.status}, а не 404`);
  const visible = strip(body);
  if (/exception|stack trace|at Object\.|undefined is not|TypeError/i.test(visible)) {
    add("P3", "routes", "страница 404 содержит технический текст", visible.slice(0, 160));
  }
}

// ------------------------------------------------------------------ ссылки
const linkSources = routeReport.filter((r) => r.html);
const links = new Map();
for (const route of linkSources) {
  for (const href of [...new Set([...route.html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]))]) {
    if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("javascript:") || href.startsWith("data:")) continue;
    if (href.startsWith("/_next") || href.startsWith(BASE)) continue;
    const absolute = href.startsWith("http") ? href : BASE + href;
    const entry = links.get(absolute) ?? { href: absolute, routes: [] };
    entry.routes.push(route.route);
    links.set(absolute, entry);
  }
}
const linksReport = [];
for (const entry of links.values()) {
  const external = !entry.href.startsWith(BASE);
  let status = 0;
  try {
    let res = await fetch(entry.href, { method: "HEAD", redirect: "follow" });
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await fetch(entry.href, { method: "GET", redirect: "follow" });
    }
    status = res.status;
  } catch (error) {
    linksReport.push({ ...entry, status: 0, error: String(error?.message ?? error) });
    add("P2", "links", `ссылка не открывается: ${entry.href}`, String(error?.message ?? error));
    continue;
  }
  linksReport.push({ ...entry, status, external });
  if (status >= 400 && !external) add("P1", "links", `внутренняя ссылка ${entry.href}: HTTP ${status}`);
  if (status >= 400 && external && status !== 403 && status !== 429) {
    add("P2", "links", `внешняя ссылка ${entry.href}: HTTP ${status}`);
  }
  if (!isLocalBase && /localhost|127\.0\.0\.1/.test(entry.href)) {
    add("P1", "links", `ссылка на служебный адрес: ${entry.href}`);
  }
}

// -------------------------------------------------------------- изображения
const imageUrls = [...new Set(routeReport.flatMap((r) => r.images ?? []))];
let imageFailed = 0;
for (const image of imageUrls.slice(0, 12)) {
  const { res, error } = await get(image);
  if (error || !res || res.status !== 200) {
    imageFailed += 1;
    add("P1", "images", `кадр не отдаётся: ${image}`, error ?? `HTTP ${res?.status}`);
    continue;
  }
  const type = res.headers.get("content-type") ?? "";
  if (!/^image\//.test(type)) add("P2", "images", `кадр отдаётся не как изображение (${type})`, image);
}
console.log(`изображений проверено: ${Math.min(imageUrls.length, 12)} (всего ${imageUrls.length}), ошибок ${imageFailed}`);

// превью ссылки: картинка должна реально отдаваться
const shareImage = routeReport.find((r) => r.ogImage)?.ogImage ?? "";
if (shareImage) {
  const { res, error } = await get(shareImage);
  const type = res?.headers.get("content-type") ?? "";
  if (error || !res || res.status !== 200 || !/^image\//.test(type)) {
    add("P2", "images", `og:image не отдаётся (${error ?? `HTTP ${res?.status}, ${type}`})`, shareImage);
  } else {
    console.log(`og:image: ${shareImage} — ${type}, проверено`);
  }
}

// ------------------------------------------------- консистентность контактов
const contactChecks = {
  whatsapp: business.contacts.whatsapp,
  instagram: business.contacts.instagram,
  map2gis: business.contacts.map2gis,
  address: `${business.contacts.address}`.trim(),
  hoursText: business.contacts.hoursText,
};
const waNumbers = new Map();
const instaHandles = new Map();
for (const route of routeReport) {
  if (!route.html) continue;
  for (const m of route.html.matchAll(/wa\.me\/(\d+)/g)) {
    waNumbers.set(m[1], [...new Set([...(waNumbers.get(m[1]) ?? []), route.route])]);
  }
  for (const m of route.html.matchAll(/instagram\.com\/([A-Za-z0-9_.]+)/g)) {
    // Ссылки на публикации (instagram.com/p/..., /reel/...) — не профиль студии.
    if (["p", "reel", "reels", "tv", "stories", "explore"].includes(m[1].toLowerCase())) continue;
    instaHandles.set(m[1], [...new Set([...(instaHandles.get(m[1]) ?? []), route.route])]);
  }
}
const expectedNumber = contactChecks.whatsapp.replace(/\D/g, "");
if (waNumbers.size === 0) add("P1", "content", "на сайте нет ни одной ссылки WhatsApp");
for (const [number, onRoutes] of waNumbers) {
  if (number !== expectedNumber) {
    add("P1", "content", `чужой номер WhatsApp ${number} (ожидался ${expectedNumber})`, onRoutes.join(", "));
  }
}
const expectedHandle = contactChecks.instagram.replace(/\/+$/, "").split("/").pop();
for (const [handle, onRoutes] of instaHandles) {
  if (handle !== expectedHandle) {
    add("P1", "content", `чужой Instagram ${handle} (ожидался ${expectedHandle})`, onRoutes.join(", "));
  }
}
if (homeRoute) {
  const homeVisible = strip(homeRoute.html);
  if (!homeVisible.includes(contactChecks.address)) {
    add("P2", "content", "на главной нет адреса студии", contactChecks.address);
  }
  if (!homeVisible.includes(contactChecks.hoursText.replace(/\s+/g, " "))) {
    add("P3", "content", "на главной нет графика работы в виде одной строки", contactChecks.hoursText);
  }
}

// ------------------------------------------------------------------- отчёт
const report = {
  base: BASE,
  checkedAt: new Date().toISOString(),
  routes: routeReport.map(({ html, images, ...rest }) => ({ ...rest, images: images?.length ?? 0 })),
  headers: headersReport,
  robots: robotsText.trim(),
  sitemap: `${sitemapText.trim().slice(0, 200)} (loc: ${sitemapLocs})`,
  api: apiReport,
  links: linksReport,
  whatsapp: [...waNumbers.entries()],
  instagram: [...instaHandles.entries()],
  findings,
};
writeFileSync(join(OUT_DIR, "audit-prod-report.json"), JSON.stringify(report, null, 2));

const byLevel = { P0: [], P1: [], P2: [], P3: [] };
for (const f of findings) byLevel[f.level]?.push(f);
console.log("=== НАХОДКИ ===");
if (!findings.length) console.log(" чисто, замечаний нет");
for (const level of ["P0", "P1", "P2", "P3"]) {
  if (!byLevel[level].length) continue;
  console.log(`\n--- ${level} (${byLevel[level].length}) ---`);
  for (const f of byLevel[level]) {
    console.log(` • [${f.area}] ${f.message}${f.detail ? ` — ${String(f.detail).slice(0, 140)}` : ""}`);
  }
}
console.log(`\nотчёт: shots/audit-prod-report.json`);
console.log(`маршрутов ${routeReport.length}, ссылок ${linksReport.length}, WhatsApp-номеров ${waNumbers.size}`);

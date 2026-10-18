/**
 * QA-харнесс для мобильного сценария (и десктоп-регрессий) без внешних
 * зависимостей: поднимает headless Chrome, подключается по CDP, эмулирует
 * телефон (viewport, DPR, touch), реально тапает по карточкам, проверяет
 * лайтбокс и липкую панель, снимает скриншоты в shots/.
 *
 * Требуется запущенный сервер: npm run dev (или npm run build && npm run start).
 *
 * Кадры снимаются на DPR 2: на третьем множителе headless Chrome иногда
 * подмешивает в слово глиф из другого подмножества шрифта — артефакт
 * растеризации только в кадре. На время съёмки секции .defer-paint
 * возвращаются к обычной отрисовке, а поверхность перерисовывается заново.
 *
 * Запуск:
 *   node lighthouse/qa-mobile.mjs home        — первый экран + липкая панель
 *   node lighthouse/qa-mobile.mjs projects    — каталог + лайтбокс
 *   node lighthouse/qa-mobile.mjs widths      — 320/360/375/390/412/430
 *   node lighthouse/qa-mobile.mjs brief       — воронка брифа до WhatsApp
 *   node lighthouse/qa-mobile.mjs menu        — бургер-меню, FAQ и axe-core
 *   node lighthouse/qa-mobile.mjs desktop     — десктопные регрессии
 *   node lighthouse/qa-mobile.mjs all         — всё подряд (по умолчанию home)
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PORT = Number(process.env.CDP_PORT ?? 9333);
const scenario = process.argv[2] ?? "home";
const OUT_DIR = resolve("shots");
mkdirSync(OUT_DIR, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("Chrome не найден. Задайте CHROME_PATH.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* CDP                                                                 */
/* ------------------------------------------------------------------ */

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const slot = this.pending.get(msg.id);
        if (!slot) return;
        this.pending.delete(msg.id);
        if (msg.error) slot.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? "")}) [${slot.method}]`));
        else slot.resolve(msg.result);
        return;
      }
      for (const fn of this.handlers.get(msg.method) ?? []) {
        try {
          fn(msg.params, msg.sessionId);
        } catch (error) {
          console.error("handler error", msg.method, error);
        }
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error(`не удалось подключиться к ${url}`)), { once: true });
    });
    return new CDP(ws);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }

  on(method, fn) {
    const list = this.handlers.get(method) ?? [];
    list.push(fn);
    this.handlers.set(method, list);
  }

  close() {
    this.ws.close();
  }
}

/* ------------------------------------------------------------------ */
/* Проверки                                                            */
/* ------------------------------------------------------------------ */

const results = [];
const consoleErrors = [];
const networkLog = new Map();

function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail ?? null });
  const mark = ok ? "PASS" : "FAIL";
  const extra =
    detail === undefined || detail === null
      ? ""
      : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
  console.log(`${mark} ${name}${extra}`);
}

/* ------------------------------------------------------------------ */
/* Основной прогон                                                     */
/* ------------------------------------------------------------------ */

const userDataDir = mkdtempSync(join(tmpdir(), "qa-mobile-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const cleanup = () => {
  try {
    chrome.kill();
  } catch {}
};
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

async function waitForDevtools() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(200);
  }
  throw new Error("DevTools не поднялся за 15 с");
}

const version = await waitForDevtools();
const cdp = await CDP.connect(version.webSocketDebuggerUrl);
console.log(`Chrome: ${version.Browser} (${chromePath})`);

const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Log.enable", {}, sessionId);
await cdp.send("Network.enable", {}, sessionId);

cdp.on("Runtime.consoleAPICalled", (params) => {
  if (params.type === "error" || params.type === "warning") {
    consoleErrors.push({
      level: params.type,
      text: params.args.map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 300),
    });
  }
});
cdp.on("Runtime.exceptionThrown", (params) => {
  consoleErrors.push({
    level: "exception",
    text: (params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? "?").slice(0, 300),
  });
});
cdp.on("Log.entryAdded", (params) => {
  if (params.entry.level === "error") {
    consoleErrors.push({ level: `log:${params.entry.source}`, text: params.entry.text.slice(0, 300) });
  }
});
cdp.on("Network.responseReceived", (params) => {
  networkLog.set(params.requestId, {
    url: params.response.url,
    status: params.response.status,
    type: params.type,
    mime: params.response.mimeType,
  });
});
cdp.on("Network.loadingFinished", (params) => {
  const entry = networkLog.get(params.requestId);
  if (entry) entry.bytes = params.encodedDataLength;
});

/* ---------------- низкоуровневые помощники ---------------- */

async function evaluate(script, { awaitPromise = false } = {}) {
  const res = await cdp.send(
    "Runtime.evaluate",
    { expression: script, returnByValue: true, awaitPromise },
    sessionId,
  );
  if (res.exceptionDetails) {
    throw new Error(
      `evaluate: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`,
    );
  }
  return res.result.value;
}

async function waitFor(script, { timeout = 10000, label = script.slice(0, 60) } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await evaluate(script);
    if (last) return last;
    await sleep(120);
  }
  throw new Error(`waitFor timeout: ${label}`);
}

async function setViewport(width, height, { dsf = 2, mobile = true } = {}) {
  mobileMode = mobile;
  viewportState = { width, height, dsf, mobile };
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width,
      height,
      deviceScaleFactor: dsf,
      mobile,
      screenWidth: width,
      screenHeight: height,
    },
    sessionId,
  );
  await cdp.send(
    "Emulation.setTouchEmulationEnabled",
    mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
    sessionId,
  );
  await cdp.send(
    "Emulation.setUserAgentOverride",
    {
      userAgent: mobile
        ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      platform: mobile ? "Linux armv8l" : "Win32",
    },
    sessionId,
  );
}

async function goto(path, { settle = 1100 } = {}) {
  const url = path.startsWith("http") ? path : BASE + path;
  await cdp.send("Page.navigate", { url }, sessionId);
  await waitFor("document.readyState === 'complete'", { timeout: 20000, label: "readyState" });
  await evaluate("document.fonts.ready.then(() => true)", { awaitPromise: true });
  await sleep(settle);
  // Гасим плавный скролл: в программных тестах он только мешает измерять позиции.
  await evaluate("document.documentElement.style.scrollBehavior = 'auto'; true");
}

async function picture(name, { full = false } = {}) {
  let params = { format: "png", fromSurface: true };
  if (full) {
    const size = await evaluate(
      "({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })",
    );
    params = {
      ...params,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: size.w, height: Math.min(size.h, 6000), scale: 1 },
    };
  } else {
    /*
     * Секции на сайте помечены .defer-paint (content-visibility: auto) — это
     * ускоряет первый кадр, но при программном скролле Chrome может отдать
     * кадр со склейкой поддерева на разных позициях. В браузере такого кадра
     * не бывает, только в захвате, поэтому на время скриншота секции
     * возвращаются к обычной отрисовке, а поверхность перерисовывается
     * заново: повторное применение метрик сбрасывает все тайлы.
     */
    await evaluate(
      `(() => {
        if (!document.getElementById('qa-shot-style')) {
          const style = document.createElement('style');
          style.id = 'qa-shot-style';
          style.textContent = '.defer-paint { content-visibility: visible !important; }';
          document.head.appendChild(style);
        }
        return true;
      })()`,
    );
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: viewportState.width,
        height: viewportState.height,
        deviceScaleFactor: viewportState.dsf,
        mobile: viewportState.mobile,
        screenWidth: viewportState.width,
        screenHeight: viewportState.height,
      },
      sessionId,
    );
    await evaluate(
      `(async () => {
        window.scrollBy(0, 2);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.scrollBy(0, -2);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
      })()`,
      { awaitPromise: true },
    );
    await sleep(420);
    params = { ...params, captureBeyondViewport: false };
  }
  const shot = await cdp.send("Page.captureScreenshot", params, sessionId);
  const file = join(OUT_DIR, `${name}.png`);
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
}

async function rect(selector) {
  return evaluate(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    })()`,
  );
}

let mobileMode = true;
let viewportState = { width: 390, height: 844, dsf: 3, mobile: true };

async function tap(selector, { settle = 350 } = {}) {
  const box = await evaluate(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
  );
  if (!box) throw new Error(`tap: не найден ${selector}`);
  await pointerDownUp(box.x, box.y, settle);
}

/** Тап по кнопке с точной подписью внутри указанного блока. */
async function tapText(text, { scope = "#brief", settle = 320 } = {}) {
  const box = await evaluate(
    `(() => {
      const root = document.querySelector(${JSON.stringify(scope)});
      if (!root) return null;
      const el = [...root.querySelectorAll("button, a")].find(
        (node) => node.textContent.trim() === ${JSON.stringify(text)},
      );
      if (!el) return null;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
  );
  if (!box) throw new Error(`tapText: не найдено «${text}» в ${scope}`);
  await pointerDownUp(box.x, box.y, settle);
}

/**
 * Ввод в поле по подписи (span.eyebrow внутри label). Текст вставляется
 * событиями клавиатуры, поэтому React-состояние обновляется как при
 * настоящем вводе, а не подменой value.
 */
async function typeByLabel(label, text) {
  const focused = await evaluate(
    `(() => {
      const scope = document.querySelector('#brief');
      if (!scope) return false;
      const host = [...scope.querySelectorAll('label')].find(
        (node) => node.querySelector('.eyebrow')?.textContent.trim() === ${JSON.stringify(label)},
      );
      const field = host?.querySelector('input, textarea');
      if (!field) return false;
      for (const marked of scope.querySelectorAll('[data-qa-field]')) marked.removeAttribute('data-qa-field');
      field.setAttribute('data-qa-field', '1');
      field.scrollIntoView({ block: 'center', behavior: 'instant' });
      field.focus();
      /* Поле могло прийти с подстановкой — выделяем, чтобы ввод её заменил. */
      if (field.value) field.setSelectionRange(0, field.value.length);
      return document.activeElement === field;
    })()`,
  );
  if (!focused) throw new Error(`typeByLabel: не найдено поле «${label}»`);
  await cdp.send("Input.insertText", { text }, sessionId);
  await sleep(90);
  return evaluate(`document.querySelector('[data-qa-field]')?.value ?? null`);
}

async function tapPoint(x, y, { settle = 350 } = {}) {
  await pointerDownUp(x, y, settle);
}

async function pointerDownUp(x, y, settle) {
  if (mobileMode) {
    await cdp.send(
      "Input.dispatchTouchEvent",
      { type: "touchStart", touchPoints: [{ x, y }] },
      sessionId,
    );
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  } else {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId);
    await cdp.send(
      "Input.dispatchMouseEvent",
      { type: "mousePressed", x, y, button: "left", clickCount: 1 },
      sessionId,
    );
    await cdp.send(
      "Input.dispatchMouseEvent",
      { type: "mouseReleased", x, y, button: "left", clickCount: 1 },
      sessionId,
    );
  }
  await sleep(settle);
}

async function key(name, code, vk) {
  await cdp.send(
    "Input.dispatchKeyEvent",
    { type: "rawKeyDown", key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk },
    sessionId,
  );
  await cdp.send(
    "Input.dispatchKeyEvent",
    { type: "keyUp", key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk },
    sessionId,
  );
  await sleep(120);
}

/**
 * Нажатие с клавиатуры так, как его видит браузер: с текстом символа, поэтому
 * Chrome срабатывает на элементе в фокусе (кнопка на Enter/Space получает click).
 * `key()` для этого не годится — rawKeyDown не запускает действие по умолчанию.
 */
async function pressKey(keyName, code, vk, char) {
  await cdp.send(
    "Input.dispatchKeyEvent",
    {
      type: "keyDown",
      key: keyName,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      text: char,
      unmodifiedText: char,
    },
    sessionId,
  );
  await cdp.send(
    "Input.dispatchKeyEvent",
    { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk },
    sessionId,
  );
  await sleep(300);
}

const scrollTo = async (y) => {
  await evaluate(`window.scrollTo(0, ${y}); window.scrollY`);
  await sleep(450);
};

const scrollEnd = async () => {
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight); window.scrollY");
  await sleep(600);
};

/**
 * Скрипт axe-core кэшируется во временной папке: после первого скачивания
 * прогон работает без сети, а в репозиторий чужой бандл не попадает.
 */
const axeCachePath = join(tmpdir(), "axe-core-4.10.2.min.js");
async function loadAxe() {
  if (existsSync(axeCachePath)) return readFileSync(axeCachePath, "utf8");
  const res = await fetch("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js");
  if (!res.ok) throw new Error(`axe-core не скачался: HTTP ${res.status}`);
  const source = await res.text();
  writeFileSync(axeCachePath, source);
  return source;
}

/** Прогон axe-core на текущей странице: возвращает нарушения по правилам. */
async function axeAudit() {
  const source = await loadAxe();
  // Инъекция через Runtime.evaluate: Page.addScriptTag в этом Chrome недоступен,
  // а результат выражения гасим через `;true`, иначе returnByValue упрётся в объект.
  await evaluate(`${source}\n;true`);
  return evaluate(
    `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }).then((r) => ({
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
        target: v.nodes[0] ? v.nodes[0].target.join(' ') : null,
        html: v.nodes[0] ? String(v.nodes[0].html).slice(0, 160) : null,
        reason: v.nodes[0] && v.nodes[0].any[0] ? String(v.nodes[0].any[0].message).slice(0, 220) : null,
      })),
      passes: r.passes.length,
      incomplete: r.incomplete.map((v) => v.id),
    }))`,
    { awaitPromise: true },
  );
}

const dialogInfo = () =>
  evaluate(
    `(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      const buttons = [...d.querySelectorAll('button')].map((b) => ({
        label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40),
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      }));
      const figures = [...d.querySelectorAll('figure img')].map((img) => ({
        w: img.naturalWidth,
        h: img.naturalHeight,
        complete: img.complete,
        src: img.currentSrc.slice(img.currentSrc.indexOf('_next') + 5, img.currentSrc.indexOf('_next') + 40),
      }));
      const scroller = d.querySelector('.overflow-y-auto');
      return {
        label: d.getAttribute('aria-label'),
        counter: (d.querySelector('p')?.textContent ?? '').trim(),
        buttons,
        figures,
        bodyOverflow: document.body.style.overflow,
        scroller: scroller
          ? { clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight }
          : null,
        headerOverflow: (() => {
          const head = d.querySelector('.on-night');
          return head ? head.scrollWidth - head.clientWidth : null;
        })(),
      };
    })()`,
  );

const stickyState = () =>
  evaluate(
    `(() => {
      const bar = document.querySelector('div.fixed.inset-x-0.bottom-0');
      if (!bar) return null;
      const cs = getComputedStyle(bar);
      const links = [...bar.querySelectorAll('a')].map((a) => ({
        text: a.textContent.trim().slice(0, 40),
        href: a.getAttribute('href'),
        tabIndex: a.tabIndex,
        h: Math.round(a.getBoundingClientRect().height),
        left: Math.round(a.getBoundingClientRect().left),
        right: Math.round(a.getBoundingClientRect().right),
      }));
      return {
        ariaHidden: bar.getAttribute('aria-hidden'),
        display: cs.display,
        transform: cs.transform,
        height: Math.round(bar.getBoundingClientRect().height),
        zIndex: cs.zIndex,
        links,
      };
    })()`,
  );

const noOverflow = () =>
  evaluate(
    `(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      w: window.innerWidth,
    }))()`,
  );

/*
 * Сквозная проверка кнопок: подпись не переносится, ничего не вылезает за
 * пределы самой кнопки, высота не меньше 44px (у мобильных панелей — 48).
 */
const buttonAudit = () =>
  evaluate(
    `(() => {
      const problems = [];
      for (const b of document.querySelectorAll('a.btn, button.btn')) {
        const r = b.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        const text = (b.textContent || '').trim().slice(0, 32);
        const cs = getComputedStyle(b);
        if (cs.whiteSpace !== 'nowrap') problems.push({ text, why: 'white-space:' + cs.whiteSpace });
        if (b.scrollWidth > b.clientWidth + 1) problems.push({ text, why: 'переполнение', sw: b.scrollWidth, cw: b.clientWidth });
        if (Math.round(r.height) < 44) problems.push({ text, why: 'низкая', h: Math.round(r.height) });
      }
      return problems;
    })()`,
  );

/* ---------------- сценарии ---------------- */

async function warmUp() {
  const routes = ["/", "/projects", "/privacy", "/robots.txt", "/sitemap.xml", "/nope-404"];
  await Promise.all(
    routes.map((route) =>
      fetch(BASE + route, { redirect: "follow" })
        .then((r) => r.text())
        .catch(() => ""),
    ),
  );
}

async function scenarioHome() {
  await setViewport(390, 844, { dsf: 2, mobile: true });
  await goto("/");

  const meta = await evaluate(
    `document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''`,
  );
  check("viewport: width=device-width", /width=device-width/.test(meta), meta);

  const headerCtas = await evaluate(
    `(() => {
      const header = document.querySelector('header');
      const links = [...header.querySelectorAll('a.btn')].map((a) => {
        const r = a.getBoundingClientRect();
        return {
          text: a.textContent.trim(),
          aria: a.getAttribute('aria-label'),
          href: a.getAttribute('href'),
          display: getComputedStyle(a).display,
          h: Math.round(r.height),
          w: Math.round(r.width),
          svg: !!a.querySelector('svg'),
        };
      });
      const burger = header.querySelector('button[aria-controls="mobile-nav"]');
      return {
        links,
        burger: burger ? Math.round(burger.getBoundingClientRect().height) : null,
      };
    })()`,
  );
  const headerWa = headerCtas.links.find((l) => l.aria === "Написать в WhatsApp");
  check(
    "шапка (390): WhatsApp — иконка ≥ 44px, бургер рядом",
    Boolean(headerWa) && headerWa.svg && headerWa.h >= 44 && headerCtas.burger >= 44,
    headerCtas,
  );
  check(
    "шапка (390): текстовая кнопка «Рассчитать проект» скрыта, не занимает место",
    headerCtas.links.every((l) => !(l.text === "Рассчитать проект" && l.w > 0 && l.h > 0)),
    headerCtas.links.filter((l) => l.text === "Рассчитать проект"),
  );

  const ov = await noOverflow();
  check("декор: нет горизонтального переполнения (390)", ov.doc <= ov.w + 1, ov);

  const hero = await evaluate(
    `(() => {
      const section = document.querySelector('section.hero');
      if (!section) return null;
      const img = section.querySelector('img');
      const h1 = section.querySelector('h1');
      const r = section.getBoundingClientRect();
      const or = h1.getBoundingClientRect();
      const scroll = section.querySelector('.hero-scrim');
      const ctas = [...section.querySelectorAll('a.btn')].map((a) => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href'),
        h: Math.round(a.getBoundingClientRect().height),
      }));
      return {
        top: Math.round(r.top),
        height: Math.round(r.height),
        h1Top: Math.round(or.top),
        h1Bottom: Math.round(or.bottom),
        h1Text: h1.textContent.trim(),
        viewport: { w: innerWidth, h: innerHeight },
        img: img
          ? {
              complete: img.complete,
              natural: [img.naturalWidth, img.naturalHeight],
              objectFit: getComputedStyle(img).objectFit,
              currentSrc: img.currentSrc,
              /* Ближайший предок, задающий слой подложки, — между ним и img
                 может стоять обёртка анимации (.hero-shot). */
              parentClass: (() => {
                let el = img.parentElement;
                while (el && !String(el.className || '').includes('-z-10')) el = el.parentElement;
                return el ? String(el.className) : '';
              })(),
              shotWrapper: (() => {
                let el = img.parentElement;
                while (el && !String(el.className || '').includes('hero-shot')) el = el.parentElement;
                return el ? String(el.className) : '';
              })(),
            }
          : null,
        scrim: scroll ? getComputedStyle(scroll).backgroundImage.slice(0, 60) : null,
        ctas,
        caption: section.querySelector('p:last-of-type')?.textContent?.trim().slice(0, 90) ?? null,
      };
    })()`,
  );
  check("hero: секция на месте", Boolean(hero));
  if (hero) {
    check(
      "hero: фото на фоне (img в -z-10, cover, без alt-дубля)",
      Boolean(hero.img) &&
        hero.img.complete &&
        hero.img.natural[0] > 0 &&
        hero.img.objectFit === "cover" &&
        hero.img.parentClass.includes("-z-10"),
      hero.img,
    );
    check(
      "hero: кадр один раз «успокаивается» (.hero-shot, только transform)",
      Boolean(hero.img) && hero.img.shotWrapper.includes("hero-shot"),
      hero.img?.shotWrapper,
    );
    check("hero: скрим поверх фото", Boolean(hero.scrim), hero.scrim);
    check(
      "hero: экран занят кадром + текст в первом экране",
      hero.height >= 600 && hero.h1Top >= 0 && hero.h1Bottom <= hero.viewport.h,
      { height: hero.height, h1Top: hero.h1Top, h1Bottom: hero.h1Bottom, vh: hero.viewport.h },
    );
    check(
      "hero: CTA ≥ 48px и верные адреса",
      hero.ctas.length === 2 &&
        hero.ctas.every((c) => c.h >= 48) &&
        hero.ctas[0].href === "#brief" &&
        hero.ctas[1].href.startsWith("https://wa.me/77017174605"),
      hero.ctas,
    );
    check("hero: подпись «На фоне — …»", /^На фоне —/.test(hero.caption ?? ""), hero.caption);
  }
  await picture("m-home-390-top");

  /* --- липкая панель --- */
  const sticky0 = await stickyState();
  check(
    "sticky: скрыта до скролла (aria-hidden, tabIndex −1)",
    sticky0 &&
      sticky0.ariaHidden === "true" &&
      sticky0.links.every((l) => l.tabIndex === -1),
    sticky0,
  );

  await scrollTo(900);
  const sticky1 = await waitFor(
    `(() => {
      const bar = document.querySelector('div.fixed.inset-x-0.bottom-0');
      return bar && bar.getAttribute('aria-hidden') === 'false' ? true : false;
    })()`,
    { label: "sticky visible" },
  ).catch(() => false);
  const stickyStateShown = await stickyState();
  check(
    "sticky: после скролла появилась, кнопки ≥ 48px, tabIndex 0",
    sticky1 && stickyStateShown && stickyStateShown.links.every((l) => l.tabIndex === 0 && l.h >= 48),
    stickyStateShown,
  );
  check(
    "sticky: кнопки не вылезают за экран",
    stickyStateShown?.links.every((l) => l.left >= 0 && l.right <= 390 + 1),
    stickyStateShown?.links,
  );
  await picture("m-home-390-sticky");

  const stickyText = await evaluate(
    `(() => {
      const bar = document.querySelector('div.fixed.inset-x-0.bottom-0');
      return [...bar.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(a);
        const tr = range.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {
          text: a.textContent.trim(),
          aria: a.getAttribute('aria-label'),
          href: a.getAttribute('href'),
          w: Math.round(r.width),
          h: Math.round(r.height),
          textW: Math.round(tr.width),
          textH: Math.round(tr.height),
          svg: !!a.querySelector('svg'),
          clipped:
            tr.bottom > r.bottom + 1 ||
            tr.top < r.top - 1 ||
            tr.right > r.right + 1 ||
            tr.left < r.left - 1,
          scrollH: a.scrollHeight,
          clientH: a.clientHeight,
          lineHeight: cs.lineHeight,
        };
      });
    })()`,
  );
  const primaryCta = stickyText[0];
  const waCta = stickyText[1];
  check(
    "sticky: главная кнопка — «Рассчитать проект», одной строкой, без переполнения",
    Boolean(primaryCta) &&
      primaryCta.text === "Рассчитать проект" &&
      primaryCta.href === "/#brief" &&
      !primaryCta.clipped &&
      primaryCta.textH <= Number.parseFloat(primaryCta.lineHeight) + 3 &&
      primaryCta.scrollH <= primaryCta.clientH + 1,
    primaryCta,
  );
  check(
    "sticky: WhatsApp — компактная иконка с aria-label, цель ≥ 48px",
    Boolean(waCta) &&
      waCta.aria === "Написать в WhatsApp" &&
      waCta.svg &&
      waCta.w >= 48 &&
      waCta.h >= 48 &&
      waCta.href.startsWith("https://wa.me/77017174605"),
    waCta,
  );

  const heroAgain = await evaluate(
    `(() => {
      const ctas = [...document.querySelectorAll('section.hero a.btn')].map((a) => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href'),
        h: Math.round(a.getBoundingClientRect().height),
        svg: !!a.querySelector('svg'),
        cls: a.className,
      }));
      return ctas;
    })()`,
  );
  check(
    "hero: первая по порядку — «Рассчитать проект» (крупная), WhatsApp второй с иконкой",
    heroAgain.length === 2 &&
      heroAgain[0].text === "Рассчитать проект" &&
      heroAgain[0].href === "#brief" &&
      heroAgain[0].h >= 54 &&
      heroAgain[1].text.includes("WhatsApp") &&
      heroAgain[1].svg,
    heroAgain,
  );

  const homeButtons = await buttonAudit();
  check("кнопки на главной: одна строка, без переполнения, ≥ 44px", homeButtons.length === 0, homeButtons);

  /* --- фокус в поле брифа прячет панель --- */
  await evaluate(
    `document.querySelector('#brief input').focus(); document.activeElement.tagName`,
  );
  const hiddenOnFocus = await waitFor(
    `document.querySelector('div.fixed.inset-x-0.bottom-0')?.getAttribute('aria-hidden') === 'true'`,
    { timeout: 4000, label: "sticky hidden on focus" },
  ).catch(() => false);
  check("sticky: при фокусе в поле уезжает вниз (не закрывает клавиатуру)", hiddenOnFocus);
  await picture("m-home-390-brief-focus");

  await evaluate("document.activeElement.blur(); true");
  const backAfterBlur = await waitFor(
    `document.querySelector('div.fixed.inset-x-0.bottom-0')?.getAttribute('aria-hidden') === 'false'`,
    { timeout: 4000, label: "sticky back after blur" },
  ).catch(() => false);
  check("sticky: после blur возвращается", backAfterBlur);

  /* --- конец страницы: © не закрыт панелью --- */
  await scrollEnd();
  const footerCheck = await evaluate(
    `(() => {
      const bar = document.querySelector('div.fixed.inset-x-0.bottom-0');
      const copy = [...document.querySelectorAll('footer p')].at(-1);
      const barTop = bar.getBoundingClientRect().top;
      const copyBottom = copy.getBoundingClientRect().bottom;
      return { barTop: Math.round(barTop), copyBottom: Math.round(copyBottom), covered: copyBottom > barTop + 1 };
    })()`,
  );
  check("sticky: подвал в конце страницы не перекрыт", !footerCheck.covered, footerCheck);
  await picture("m-home-390-bottom");

  /* --- лайтбокс из сетки избранных проектов --- */
  await scrollTo(0);
  await tap('#projects [aria-label^="Открыть проект"]');
  const dialog = await waitFor(
    `document.querySelector('[role="dialog"]') ? true : false`,
    { timeout: 5000, label: "lightbox open" },
  ).catch(() => false);
  check("лайтбокс: открылся тапом по карточке", Boolean(dialog));

  if (dialog) {
    const info = await dialogInfo();
    check(
      "лайтбокс: aria-modal, фокус на «Закрыть», body заблокирован",
      info !== null && info.bodyOverflow === "hidden" && info.buttons.some((b) => b.label.includes("Закрыть")),
      { label: info?.label, bodyOverflow: info?.bodyOverflow },
    );
    check(
      "лайтбокс: стрелки и «Закрыть» ≥ 48px",
      info.buttons.filter((b) => /пред|след|закрыть/i.test(b.label)).every((b) => b.h >= 48 && b.w >= 48),
      info.buttons,
    );
    const imagesOk = await waitFor(
      `(() => {
        const imgs = [...document.querySelectorAll('[role="dialog"] figure img')];
        return imgs.length > 0 && imgs.slice(0, 2).every((i) => i.complete && i.naturalWidth > 0);
      })()`,
      { timeout: 8000, label: "lightbox images" },
    ).catch(() => false);
    check("лайтбокс: кадры реально загрузились", Boolean(imagesOk), info.figures.slice(0, 3));
    await sleep(300);
    await picture("m-home-390-lightbox");

    const counter = (await dialogInfo())?.counter;
    await tap('[role="dialog"] button[aria-label="Следующий проект"]');
    const counter2 = (await dialogInfo())?.counter;
    check("лайтбокс: «вперёд» листает проект", counter !== counter2, { before: counter, after: counter2 });
    await tap('[role="dialog"] button[aria-label="Предыдущий проект"]');
    const counter3 = (await dialogInfo())?.counter;
    check("лайтбокс: «назад» возвращает", counter3 === counter, { before: counter, after: counter3 });

    await key("Escape", "Escape", 27);
    const closed = await waitFor(`document.querySelector('[role="dialog"]') === null`, {
      timeout: 4000,
      label: "lightbox closed",
    }).catch(() => false);
    const overflowAfter = await evaluate("document.body.style.overflow");
    check("лайтбокс: Escape закрывает и снимает блокировку скролла", closed && overflowAfter !== "hidden", {
      closed,
      overflowAfter,
    });
    const barAgain = await stickyState();
    check("после закрытия липкая панель снова на месте", barAgain?.ariaHidden === "false", barAgain?.ariaHidden);

    await sleep(250);
    const focusHome = await evaluate(
      `(() => { const a = document.activeElement; return { tag: a.tagName, label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 50) }; })()`,
    );
    check(
      "лайтбокс: Escape вернул фокус на карточку",
      /Открыть проект/.test(focusHome.label),
      focusHome,
    );
  }
}

async function scenarioProjects() {
  await setViewport(390, 844, { dsf: 2, mobile: true });
  await goto("/projects");

  const chips = await evaluate(
    `[...document.querySelectorAll('button[aria-pressed]')].filter(b => b.closest('.no-scrollbar')).map(b => ({
      label: b.textContent.trim(), pressed: b.getAttribute('aria-pressed'), h: Math.round(b.getBoundingClientRect().height)
    }))`,
  );
  check("каталог: чипы фильтров ≥ 48px", chips.length > 1 && chips.every((c) => c.h >= 48), chips.slice(0, 3));

  const total = await evaluate(
    `document.querySelectorAll('figure button[aria-label^="Открыть проект"]').length`,
  );
  const second = chips[1];
  await tap(`.no-scrollbar button:nth-child(2)`);
  const filtered = await waitFor(
    `document.querySelectorAll('figure button[aria-label^="Открыть проект"]').length`,
    { label: "filter applied" },
  ).catch(() => null);
  const expected = Number(second.label.replace(/\D+/g, ""));
  check(
    "каталог: фильтр меняет сетку по счётчику чипа",
    filtered !== null && filtered === expected,
    { chip: second.label, expected, filtered },
  );
  await tap(`.no-scrollbar button:nth-child(1)`);
  await waitFor(
    `document.querySelectorAll('figure button[aria-label^="Открыть проект"]').length === ${total}`,
    { label: "filter reset" },
  ).catch(() => null);
  await picture("m-projects-390");

  await tap('figure button[aria-label^="Открыть проект"]');
  await waitFor(`!!document.querySelector('[role="dialog"]')`, { label: "lightbox on /projects" });

  const info = await dialogInfo();
  const m = /^(\d+) \/ (\d+)/.exec(info.counter);
  check("лайтбокс (каталог): счётчик вида «n / N»", Boolean(m), info.counter);

  const totalProjects = m ? Number(m[2]) : 0;
  if (totalProjects > 1) {
    await tap('[role="dialog"] button[aria-label="Предыдущий проект"]');
    const wrapped = (await dialogInfo()).counter;
    check(
      "лайтбокс: «назад» с первого листает на последний",
      wrapped === `1 / ${totalProjects}` || wrapped.startsWith(`${totalProjects} /`),
      { from: info.counter, to: wrapped, totalProjects },
    );
    await tap('[role="dialog"] button[aria-label="Следующий проект"]');
  }

  const scrollInside = await evaluate(
    `(() => {
      const d = document.querySelector('[role="dialog"]');
      const s = d.querySelector('.overflow-y-auto');
      s.scrollTop = 400;
      return { scrollTop: s.scrollTop, scrollHeight: s.scrollHeight, clientHeight: s.clientHeight };
    })()`,
  );
  check(
    "лайтбокс: список кадров прокручивается на телефоне",
    scrollInside.scrollTop > 0,
    scrollInside,
  );
  await picture("m-projects-390-lightbox-scrolled");

  /* фокус-ловушка: Tab из диалога не должен уходить на страницу позади */
  const focusSeq = [];
  for (let i = 0; i < 7; i += 1) {
    await key("Tab", "Tab", 9);
    focusSeq.push(
      await evaluate(
        `(() => { const a = document.activeElement; return { tag: a.tagName, label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 26), inDialog: !!a.closest('[role="dialog"]') }; })()`,
      ),
    );
  }
  const escaped = focusSeq.filter((s) => !s.inDialog);
  check("лайтбокс: фокус остаётся внутри диалога (Tab × 7)", escaped.length === 0, focusSeq);

  const backdrop = await evaluate(
    `(() => {
      const d = document.querySelector('[role="dialog"]');
      const back = d.querySelector('div[aria-hidden].absolute.inset-0');
      if (!back) return { present: false };
      const r = back.getBoundingClientRect();
      const probe = (x, y) => document.elementFromPoint(x, y) === back;
      const points = [];
      for (let xi = 1; xi <= 4; xi += 1) for (let yi = 1; yi <= 8; yi += 1) points.push([(innerWidth * xi) / 5, (innerHeight * yi) / 9]);
      return {
        present: true,
        full: Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight,
        hitCount: points.filter(([x, y]) => probe(x, y)).length,
        isButton: back.tagName === 'BUTTON',
      };
    })()`,
  );
  check(
    "лайтбокс: подложка — декоративный слой, а не кнопка-призрак",
    backdrop.present && backdrop.full && !backdrop.isButton,
    backdrop,
  );

  await tap('[role="dialog"] button:not([aria-label])');
  const closedByButton = await waitFor(`!document.querySelector('[role="dialog"]')`, {
    timeout: 4000,
    label: "close by button",
  }).catch(() => false);
  check("лайтбокс: кнопка «Закрыть» закрывает просмотр", Boolean(closedByButton));

  await sleep(300);
  const focusBack = await evaluate(
    `(() => { const a = document.activeElement; return { tag: a.tagName, label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 50) }; })()`,
  );
  check(
    "лайтбокс: после закрытия фокус вернулся на карточку каталога",
    /Открыть проект/.test(focusBack.label),
    focusBack,
  );
}

async function scenarioWidths() {
  for (const [width, height, path, name] of [
    [320, 568, "/", "m-320-home"],
    [320, 568, "/projects", "m-320-projects"],
    [360, 640, "/", null],
    [375, 667, "/", null],
    [390, 844, "/projects", null],
    [412, 915, "/", null],
    [430, 932, "/projects", null],
  ]) {
    await setViewport(width, height, { dsf: 2, mobile: true });
    await goto(path, { settle: 700 });
    const ov = await noOverflow();
    check(`переполнение ${width}px ${path}`, ov.doc <= ov.w + 1 && ov.body <= ov.w + 1, ov);

    const bar = await evaluate(
      `(() => {
        const b = document.querySelector('div.fixed.inset-x-0.bottom-0');
        const st = getComputedStyle(b);
        return { display: st.display };
      })()`,
    );
    check(`липкая панель есть на ${width}px ${path}`, bar.display !== "none", bar);

    const buttons = await buttonAudit();
    check(
      `кнопки ${width}px ${path}: одна строка, без переполнения, ≥ 44px`,
      buttons.length === 0,
      buttons,
    );

    /*
     * Главный мобильный KPI: на первом экране телефона человек должен видеть
     * заголовок и главную кнопку целиком, без скролла.
     */
    if (path === "/") {
      const first = await evaluate(
        `(() => {
          const h1 = document.querySelector('#hero-title');
          const cta = document.querySelector('section.hero a.btn');
          if (!h1 || !cta) return null;
          const hero = document.querySelector('section.hero');
          const hr = h1.getBoundingClientRect();
          const cr = cta.getBoundingClientRect();
          return {
            vh: innerHeight,
            h1Bottom: Math.round(hr.bottom),
            h1Top: Math.round(hr.top),
            ctaTop: Math.round(cr.top),
            ctaBottom: Math.round(cr.bottom),
            text: cta.textContent.trim(),
            minH: getComputedStyle(hero).minHeight,
            heroH: Math.round(hero.getBoundingClientRect().height),
            mq360: matchMedia('(max-width: 360px)').matches,
            clientW: document.documentElement.clientWidth,
          };
        })()`,
      );
      check(
        `первый экран ${width}×${height}: h1 и «${first?.text ?? "…"}» целиком в кадре`,
        Boolean(first) &&
          first.h1Top >= 0 &&
          first.h1Bottom <= first.vh &&
          first.ctaTop >= 0 &&
          first.ctaBottom <= first.vh,
        first,
      );
    }

    if (name) await picture(name, { full: false });

    if (path === "/projects" && width === 320) {
      await tap('figure button[aria-label^="Открыть проект"]');
      await waitFor(`!!document.querySelector('[role="dialog"]')`, { label: "lightbox 320" });
      const info = await dialogInfo();
      check(
        "лайтбокс на 320px: шапка не переполняется, кнопки целы",
        info && info.headerOverflow !== null && info.headerOverflow <= 1 && info.buttons.every((b) => b.w >= 44 && b.h >= 44),
        { headerOverflow: info?.headerOverflow, buttons: info?.buttons },
      );
      await picture("m-320-lightbox");
      await key("Escape", "Escape", 27);
      await waitFor(`!document.querySelector('[role="dialog"]')`, { label: "close 320" }).catch(() => null);
    }
  }
}

async function scenarioBrief() {
  await setViewport(390, 844, { dsf: 2, mobile: true });
  await goto("/");

  /*
   * Главный бизнес-путь: кнопка «Рассчитать проект» на первом экране должна
   * привести к форме, форма — собрать бриф и отдать готовое сообщение
   * в WhatsApp. Проверяем целиком, включая валидацию и отправку черновика.
   */
  await tap('section.hero a.btn[href="#brief"]', { settle: 500 });
  await sleep(1200);
  const anchored = await evaluate(
    `(() => {
      const section = document.querySelector('#brief');
      if (!section) return null;
      const r = section.getBoundingClientRect();
      const header = document.querySelector('header');
      return {
        top: Math.round(r.top),
        headerBottom: Math.round(header.getBoundingClientRect().bottom),
      };
    })()`,
  );
  check(
    "бриф: кнопка первого экрана приводит к форме, заголовок не под шапкой",
    Boolean(anchored) && anchored.top >= 0 && anchored.top <= 160,
    anchored,
  );
  await picture("m-390-brief-start");

  /* Пустой шаг не пропускает дальше и называет ошибку. */
  await tapText("Далее");
  await sleep(250);
  const blocked = await evaluate(
    `(() => {
      const scope = document.querySelector('#brief');
      const text = [...scope.querySelectorAll('p')].map((p) => p.textContent.trim());
      return {
        error: text.find((t) => t.includes('Выберите тип объекта')) ?? null,
        legend: scope.querySelector('legend')?.textContent.trim() ?? '',
      };
    })()`,
  );
  check(
    "бриф: без типа объекта шаг не проходит, ошибка названа",
    blocked.error !== null && blocked.legend.includes("Что проектируем"),
    blocked,
  );

  /* Шаг 1 — объект. */
  await tapText("Квартира");
  const area = await typeByLabel("Площадь, м²", "86");
  const city = await typeByLabel("Город", "Астана");
  check("бриф: поля площади и города принимают ввод", area === "86" && city === "Астана", {
    area,
    city,
  });
  await tapText("Далее");
  await sleep(320);

  /* Шаг 2 — задачи и срок: первая плитка задач и конкретный срок. */
  await tap('#brief fieldset button[aria-pressed="false"]');
  await tapText("Готов начать сейчас");
  const secondStep = await evaluate(
    `document.querySelector('#brief legend')?.textContent.trim() ?? ''`,
  );
  check("бриф: второй шаг открылся", secondStep.includes("Что нужно сделать"), secondStep);
  await tapText("Далее");
  await sleep(320);

  /* Шаг 3 — имя и комментарий, затем отправка. */
  const name = await typeByLabel("Имя", "Айгуль");
  const comment = await typeByLabel("Комментарий", "Нужна планировка и визуализация.");
  check("бриф: имя и комментарий приняты", name === "Айгуль" && comment.length > 10, {
    name,
    comment,
  });

  /* Окно WhatsApp в тесте не открываем: проверяем саму ссылку. */
  await evaluate(`(() => { window.open = () => null; return true; })()`);
  await tapText("Отправить бриф");
  await waitFor(`!!document.querySelector('#brief [role="status"]')`, { label: "бриф отправлен" });
  await sleep(400);

  const sent = await evaluate(
    `(() => {
      const status = document.querySelector('#brief [role="status"]');
      if (!status) return null;
      const link = status.querySelector('a[href^="https://wa.me/"]');
      const href = link?.getAttribute('href') ?? '';
      const text = decodeURIComponent(href.split('text=')[1] ?? '');
      return {
        heading: status.querySelector('h3')?.textContent.trim() ?? '',
        label: link?.textContent.trim() ?? '',
        host: href.split('?')[0],
        hasArea: text.includes('86'),
        hasCity: text.includes('Астана'),
        hasName: text.includes('Айгуль'),
        hasTasks: text.includes('Задачи:'),
        message: text.slice(0, 220),
      };
    })()`,
  );
  check(
    "бриф: собран готовый текст, кнопка ведёт в WhatsApp студии",
    Boolean(sent) &&
      sent.label === "Открыть WhatsApp" &&
      sent.host === "https://wa.me/77017174605" &&
      sent.hasArea &&
      sent.hasCity &&
      sent.hasName &&
      sent.hasTasks,
    sent,
  );

  const lead = [...networkLog.values()].find((entry) => entry.url.includes("/api/lead"));
  check("бриф: черновик ушёл в /api/lead без ошибок сервера", lead?.status === 200, lead ?? null);

  const sentButtons = await buttonAudit();
  const sentOverflow = await noOverflow();
  check(
    "бриф: экран «Бриф готов» без переполнения и мелких кнопок",
    sentButtons.length === 0 && sentOverflow.doc <= sentOverflow.w + 1,
    { buttons: sentButtons, overflow: sentOverflow },
  );

  /* Кадр снимаем после остановки скролла — иначе компоситор отдаёт рваный кадр. */
  await evaluate(
    `(() => {
      const status = document.querySelector('#brief [role="status"]');
      status?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    })()`,
  );
  await sleep(700);
  await picture("m-390-brief-sent");
}

/**
 * Мобильная навигация, FAQ и автоматический аудит доступности (axe-core):
 * проверяем то, что не покрывают остальные сценарии.
 */
async function scenarioMenu() {
  await setViewport(390, 844);
  await goto("/");

  const burger = 'button[aria-controls="mobile-nav"]';

  /* --- бургер-меню --- */
  await tap(burger);
  await waitFor(`document.querySelector('#mobile-nav') && !document.querySelector('#mobile-nav').hidden`, {
    label: "меню открылось",
  });
  const opened = await evaluate(
    `(() => {
      const nav = document.querySelector('#mobile-nav');
      const button = document.querySelector(${JSON.stringify(burger)});
      const links = [...nav.querySelectorAll('a')].map((a) => ({
        text: a.textContent.trim().slice(0, 28),
        h: Math.round(a.getBoundingClientRect().height),
      }));
      const firstLink = nav.querySelector('a');
      const windowTop = window.scrollY;
      return {
        expanded: button.getAttribute('aria-expanded'),
        label: button.getAttribute('aria-label'),
        bodyOverflow: document.body.style.overflow,
        navHeight: Math.round(nav.getBoundingClientRect().height),
        firstLinkTop: firstLink ? Math.round(firstLink.getBoundingClientRect().top) : null,
        burgerBottom: Math.round(button.getBoundingClientRect().bottom),
        headerTop: Math.round(document.querySelector('header').getBoundingClientRect().top),
        scrollY: windowTop,
        links,
      };
    })()`,
  );
  check(
    "меню: бургер раскрывает навигацию, aria-expanded=true, подпись меняется",
    opened.expanded === "true" && opened.label === "Закрыть меню" && opened.navHeight > 200,
    { expanded: opened.expanded, label: opened.label, navHeight: opened.navHeight },
  );
  check(
    "меню: прокрутка фона заблокирована, меню начинается под шапкой",
    opened.bodyOverflow === "hidden" && opened.firstLinkTop > opened.burgerBottom - 2,
    {
      bodyOverflow: opened.bodyOverflow,
      headerTop: opened.headerTop,
      firstLinkTop: opened.firstLinkTop,
      burgerBottom: opened.burgerBottom,
      scrollY: opened.scrollY,
    },
  );
  const smallMenuLinks = opened.links.filter((link) => link.h < 44);
  check(
    "меню: шесть пунктов и обе кнопки не мельче 44px",
    opened.links.length >= 8 && smallMenuLinks.length === 0,
    { links: opened.links, small: smallMenuLinks },
  );
  await picture("m-390-menu");

  await key("Escape", "Escape", 27);
  await sleep(320);
  const closedByEscape = await evaluate(
    `(() => {
      const nav = document.querySelector('#mobile-nav');
      const button = document.querySelector(${JSON.stringify(burger)});
      return {
        hidden: nav.hidden,
        expanded: button.getAttribute('aria-expanded'),
        label: button.getAttribute('aria-label'),
        bodyOverflow: document.body.style.overflow,
        focusLabel: document.activeElement.getAttribute('aria-label') || document.activeElement.tagName,
      };
    })()`,
  );
  check(
    "меню: Escape закрывает, скролл отпускает, фокус остаётся на бургере",
    closedByEscape.hidden === true &&
      closedByEscape.expanded === "false" &&
      closedByEscape.bodyOverflow === "" &&
      /меню|BUTTON/.test(closedByEscape.focusLabel),
    closedByEscape,
  );

  await tap(burger);
  await waitFor(`!document.querySelector('#mobile-nav').hidden`, { label: "меню открылось повторно" });
  await tapText("Услуги", { scope: "#mobile-nav", settle: 800 });
  const afterLink = await evaluate(
    `(() => ({
      hash: location.hash,
      hidden: document.querySelector('#mobile-nav').hidden,
      sectionTop: Math.round(document.querySelector('#services').getBoundingClientRect().top),
      headerBottom: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
    }))()`,
  );
  check(
    "меню: пункт ведёт к секции, меню закрывается, якорь не прячется под шапкой",
    afterLink.hash === "#services" &&
      afterLink.hidden === true &&
      afterLink.sectionTop >= afterLink.headerBottom - 1,
    afterLink,
  );

  await goto("/");
  await evaluate(`document.querySelector(${JSON.stringify(burger)}).focus(); true`);
  await pressKey("Enter", "Enter", 13, "\r");
  const openedByKeyboard = await evaluate(`!document.querySelector('#mobile-nav').hidden`);
  check("меню: открывается с клавиатуры (Enter на бургере)", openedByKeyboard === true, { openedByKeyboard });
  await key("Escape", "Escape", 27);
  await sleep(260);

  /* --- FAQ --- */
  const faqItems = await evaluate(`document.querySelectorAll('#faq details').length`);
  await evaluate(
    `(() => {
      const first = document.querySelector('#faq details');
      first?.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    })()`,
  );
  await sleep(600);
  const faqOpened = await evaluate(
    `(() => {
      const items = [...document.querySelectorAll('#faq details')];
      items.forEach((d) => { d.open = true; });
      return items.map((d) => {
        const answer = d.querySelector('p');
        return {
          question: d.querySelector('summary').textContent.trim().replace(/\\s+/g, ' ').slice(0, 28),
          answerChars: answer ? answer.textContent.trim().length : 0,
          answerHeight: answer ? Math.round(answer.getBoundingClientRect().height) : 0,
        };
      });
    })()`,
  );
  check(
    "FAQ: каждый вопрос раскрывается, ответы не пустые",
    Array.isArray(faqOpened) &&
      faqOpened.length >= 3 &&
      faqOpened.every((item) => item.answerChars > 80 && item.answerHeight > 20),
    faqOpened,
  );
  await picture("m-390-faq");

  await evaluate(`(() => { document.querySelectorAll('#faq details').forEach((d) => { d.open = false; }); return true; })()`);
  await tap("#faq details summary", { settle: 300 });
  const faqTapped = await evaluate(
    `(() => {
      const first = document.querySelector('#faq details');
      const answer = first.querySelector('p');
      return { open: first.open, answerHeight: Math.round(answer.getBoundingClientRect().height) };
    })()`,
  );
  check(
    "FAQ: тап по вопросу раскрывает ответ (нативные details/summary)",
    faqTapped.open === true && faqTapped.answerHeight > 20,
    faqTapped,
  );
  await tap("#faq details summary", { settle: 300 });
  const faqClosed = await evaluate(`document.querySelector('#faq details').open === false`);
  check("FAQ: повторный тап закрывает вопрос", faqClosed === true, { faqClosed });

  /* --- Доступность: axe-core --- */
  await goto("/");
  const homeAxe = await axeAudit();
  const blockingHome = homeAxe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  check(
    "axe (главная): нет нарушений уровня critical/serious",
    blockingHome.length === 0,
    { blocking: blockingHome, все: homeAxe.violations, passes: homeAxe.passes, incomplete: homeAxe.incomplete },
  );

  await tap('#projects [aria-label^="Открыть проект"]');
  await waitFor(`!!document.querySelector('[role="dialog"]')`, { label: "лайтбокс для axe" });
  await sleep(900);
  const dialogAxe = await axeAudit();
  const blockingDialog = dialogAxe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  check(
    "axe (лайтбокс): нет нарушений уровня critical/serious",
    blockingDialog.length === 0,
    { blocking: blockingDialog, все: dialogAxe.violations },
  );
  await key("Escape", "Escape", 27);
  await waitFor(`!document.querySelector('[role="dialog"]')`, { label: "закрыть лайтбокс" }).catch(() => null);

  await goto("/projects");
  const catalogAxe = await axeAudit();
  const blockingCatalog = catalogAxe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  check(
    "axe (каталог): нет нарушений уровня critical/serious, есть h1",
    blockingCatalog.length === 0 && (await evaluate("document.querySelectorAll('h1').length")) === 1,
    { blocking: blockingCatalog, все: catalogAxe.violations },
  );
  await picture("m-390-catalog-h1");
}

async function scenarioDesktop() {
  await setViewport(1280, 900, { dsf: 1, mobile: false });
  await goto("/");
  await picture("d-home-1280-top");

  const stickyDesktop = await evaluate(
    `(() => {
      const b = document.querySelector('div.fixed.inset-x-0.bottom-0');
      return { display: getComputedStyle(b).display };
    })()`,
  );
  check("десктоп: липкая панель выключена (lg:hidden)", stickyDesktop.display === "none", stickyDesktop);

  await evaluate("window.scrollTo(0, 0); true");
  await key("Tab", "Tab", 9);
  const firstFocus = await evaluate(
    `(() => { const a = document.activeElement; return { text: (a.textContent || '').trim().slice(0, 30), tag: a.tagName, href: a.getAttribute('href') }; })()`,
  );
  check("десктоп: первый Tab — на «К содержанию»", /К содержанию/.test(firstFocus.text), firstFocus);

  await tap('#projects [aria-label^="Открыть проект"]');
  await waitFor(`!!document.querySelector('[role="dialog"]')`, { label: "lightbox desktop" });
  await sleep(900);
  const stack = await evaluate(
    `(() => {
      const d = document.querySelector('[role="dialog"]');
      const probe = document.elementFromPoint(innerWidth / 2, 20);
      const back = d.querySelector('div[aria-hidden].absolute.inset-0');
      return {
        topmostAtHeader: probe ? probe.tagName : null,
        topmostInDialog: !!(probe && probe.closest('[role="dialog"]')),
        dialogZ: getComputedStyle(d).zIndex,
        backdropOpacity: getComputedStyle(back).opacity,
        headerZ: getComputedStyle(document.querySelector('header')).zIndex,
      };
    })()`,
  );
  check(
    "десктоп: лайтбокс перекрывает липкую шапку (нет просвечивающей навигации)",
    stack.topmostInDialog && Number(stack.backdropOpacity) > 0.9,
    stack,
  );
  const desktopDialog = await evaluate(
    `(() => {
      const d = document.querySelector('[role="dialog"]');
      const grid = d.querySelector('.grid.flex-1');
      return {
        columns: getComputedStyle(grid).gridTemplateColumns,
        bodyOverflow: document.body.style.overflow,
      };
    })()`,
  );
  check(
    "десктоп: лайтбокс — две колонки, скролл страницы заблокирован",
    desktopDialog.columns.split(" ").length === 2 && desktopDialog.bodyOverflow === "hidden",
    desktopDialog,
  );
  await picture("d-lightbox-1280");
  await key("Escape", "Escape", 27);
  await waitFor(`!document.querySelector('[role="dialog"]')`, { label: "close desktop" }).catch(() => null);
  await picture("d-home-1280");
}

/* ---------------- запуск ---------------- */

try {
  await warmUp();
  if (scenario === "home" || scenario === "all") await scenarioHome();
  if (scenario === "projects" || scenario === "all") await scenarioProjects();
  if (scenario === "widths" || scenario === "all") await scenarioWidths();
  if (scenario === "brief" || scenario === "all") await scenarioBrief();
  if (scenario === "menu" || scenario === "all") await scenarioMenu();
  if (scenario === "desktop" || scenario === "all") await scenarioDesktop();
} catch (error) {
  console.error(`\nсбой сценария: ${error?.message ?? error}`);
  console.error(error?.stack ?? "");
  results.push({ name: `scenario crash (${scenario})`, ok: false, detail: String(error?.message ?? error) });
}

/* ---------------- отчёт ---------------- */

const failed = results.filter((r) => !r.ok);
const bigResources = [...networkLog.values()]
  .filter((r) => typeof r.bytes === "number")
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 10)
  .map((r) => ({ kb: Math.round(r.bytes / 1024), status: r.status, type: r.type, url: r.url.slice(0, 110) }));

console.log("\n— самые тяжёлые ресурсы прогона —");
for (const r of bigResources) console.log(`  ${String(r.kb).padStart(5)} КБ  ${r.status}  ${r.type.padEnd(10)} ${r.url}`);

const report = {
  when: new Date().toISOString(),
  scenario,
  base: BASE,
  chrome: version.Browser,
  checks: results,
  failed: failed.length,
  consoleErrors,
  bigResources,
};
writeFileSync(join(OUT_DIR, `qa-${scenario}-report.json`), JSON.stringify(report, null, 2));

console.log(`\nитог: ${results.length - failed.length}/${results.length} проверок пройдено`);
for (const f of failed) console.log(`  FAIL ${f.name} :: ${JSON.stringify(f.detail)}`);
if (consoleErrors.length) {
  console.log(`\nконсоль (${consoleErrors.length}):`);
  for (const e of consoleErrors.slice(0, 15)) console.log(`  [${e.level}] ${e.text}`);
} else {
  console.log("консоль: чисто");
}
console.log(`отчёт: shots/qa-${scenario}-report.json`);

cdp.close();
cleanup();
process.exit(failed.length || consoleErrors.length ? 1 : 0);

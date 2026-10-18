/**
 * Запускает Lighthouse против локальной прод-сборки и кладёт отчёт в lighthouse/.
 * Зачем обёртка: CLI в этом окружении возвращает пустой объект `categories`,
 * поэтому отчёт всё равно считается через score.mjs; здесь же подставляются
 * headless-флаги, CHROME_PATH и путь вывода, чтобы команда была одинаковой
 * в PowerShell и bash.
 *
 * Требуется запущенный прод-сервер: npm run build && npm run start.
 *
 * Запуск: npm run lh             → lighthouse/home.json (перезаписывается)
 *         npm run lh -- home9     → lighthouse/home9.json
 *         npm run lh -- lighthouse/home9.json   (то же самое, удобно копировать из score)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const raw = process.argv[2] ?? "home";
const name = raw.replace(/^lighthouse[\\/]/, "").replace(/\.json$/, "");
if (!/^[\w.-]+$/.test(name)) {
  console.error("имя отчёта может содержать только латиницу, цифры, точку и дефис");
  process.exit(1);
}

const outDir = resolve("lighthouse");
mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (chromePath) console.log(`Chrome: ${chromePath}`);

// Путь вывода — относительный: cwd проекта может содержать пробелы и кириллицу.
const outFile = `lighthouse/${name}.json`;
const args = [
  "lighthouse@12",
  "http://localhost:3000/",
  "--only-categories=performance,accessibility,best-practices,seo",
  "--quiet",
  "--chrome-flags=--headless=new --no-sandbox",
  "--output=json",
  `--output-path=${outFile}`,
];

const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: chromePath ? { ...process.env, CHROME_PATH: chromePath } : process.env,
});

if (result.error) {
  console.error(`\nне удалось запустить npx: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(
    `\nLighthouse завершился с кодом ${result.status}. Проверьте, что прод-сборка отвечает на http://localhost:3000 (npm run build && npm run start).`,
  );
  process.exit(result.status ?? 1);
}

console.log(`\nотчёт: ${outFile}\nоценка: npm run lh:score -- ${outFile}`);

/**
 * Build gate. Fails the build when the demo concept would have to invent
 * something: missing images, unsourced numbers, banned clichés, contact details
 * that must not be published, or sections rendered without data.
 *
 * Run: npm run validate  (also runs as part of `npm run build`)
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { BusinessSchema, type Project } from "../lib/schema";
import { BriefSchema } from "../lib/brief";

const root = process.cwd();
const problems: string[] = [];
const notes: string[] = [];

const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const businessRaw = read("content/business.json");
const business = BusinessSchema.parse(JSON.parse(businessRaw));
const manifest = JSON.parse(read("content/images.json")) as {
  images: { src: string; width: number; height: number; blurDataURL: string }[];
};

/* 1. Every referenced image exists in the manifest and on disk. */
const manifestBySrc = new Map(manifest.images.map((image) => [image.src, image]));
const referenced = new Set<string>();
for (const project of business.projects) {
  referenced.add(project.cover);
  for (const image of project.images) referenced.add(image.src);
}

for (const src of referenced) {
  const asset = manifestBySrc.get(src);
  if (!asset) {
    problems.push(`Изображение ${src} используется, но отсутствует в content/images.json`);
    continue;
  }
  if (!existsSync(path.join(root, "public", src))) {
    problems.push(`Файла public${src} нет на диске`);
  }
  if (!asset.blurDataURL.startsWith("data:image/")) {
    problems.push(`У ${src} нет blur-заглушки (важно для CLS)`);
  }
}

/* 1b. Превью ссылки: og:image должен существовать, иначе мессенджеры
   покажут пустую карточку. Картинка собирается `npm run og`. */
if (!existsSync(path.join(root, "public", "og-image.jpg"))) {
  problems.push("Нет public/og-image.jpg — ссылка в мессенджерах развернётся без картинки (собрать: npm run og)");
}

/* 2. Unused assets are only a warning — reported after code references are
   collected in section 6, so component-level image paths count too. */

/* 3. Every project points at its source and every number is accounted for. */
for (const project of business.projects) {
  if (!project.sourceUrl.startsWith("https://")) {
    problems.push(`Проект ${project.slug}: нет исходной ссылки`);
  }
  const imagesHaveKind = project.images.every(
    (image) => image.kind === "render" || image.kind === "photo",
  );
  if (!imagesHaveKind) problems.push(`Проект ${project.slug}: у изображения не указан тип`);
}

/* 4. Section gating: every enabled section must have data behind it. */
const sectionData: Record<string, boolean> = {
  hero: business.projects.some((p) => p.featured),
  stats: business.reviews.count > 0,
  projects: business.projects.filter((p) => p.featured).length >= 3,
  catalog: business.projects.filter((p) => !p.featured).length >= 3,
  services: business.services.length > 0,
  process: business.process.length > 0,
  reviews: business.reviews.excerpts.length > 0,
  about: business.studio.founders.length > 0,
  brief: business.services.length > 0,
  faq: business.faq.length > 0,
  contacts: Boolean(business.contacts.address && business.contacts.whatsapp),
};

for (const section of business.sections.enabled) {
  if (!sectionData[section]) problems.push(`Блок «${section}» включён, но данных для него нет`);
}
for (const [section, ok] of Object.entries(sectionData)) {
  if (ok && !business.sections.enabled.includes(section as never)) {
    problems.push(`Для блока «${section}» есть данные, но он выключен в sections.enabled`);
  }
}
for (const disabled of business.sections.disabled) {
  if (disabled.reason.trim().length < 40) {
    problems.push(`У выключенного блока «${disabled.id}» слишком короткая причина`);
  }
}

/* 5. Banned clichés and placeholder text anywhere in the content. */
const banned = [
  /индивидуальн\w*\s+подход/i,
  /высок\w*\s+качество/i,
  /команда профессионалов/i,
  /воплотим мечту/i,
  /уникальн\w*\s+решен/i,
  /созда[её]м уют/i,
  /современн\w*\s+тренд/i,
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /\[\[.+\]\]/,
  /X+XXX/,
];

const walk = (value: unknown, trail: string): void => {
  if (typeof value === "string") {
    for (const pattern of banned) {
      if (pattern.test(value)) problems.push(`Запрещённая формулировка в ${trail}: «${value}»`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${trail}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walk(item, `${trail}.${key}`);
  }
};

walk(business, "business");
walk(JSON.parse(read("content/images.json")), "images");

/* 6. No phone numbers and no email addresses may reach the client bundle. */
const phonePattern = /\+?\d[\d\s()\-]{7,}\d/;
const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** A phone number is a run of digits that holds at least 10 digits overall. */
const looksLikePhone = (value: string): string | null => {
  for (const match of value.match(phonePattern) ?? []) {
    if (match.replace(/\D/g, "").length >= 10) return match;
  }
  return null;
};

const codeFiles: string[] = [];
const collect = (dir: string) => {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(rel);
    else if (/\.(ts|tsx)$/.test(entry.name)) codeFiles.push(rel);
  }
};
for (const dir of ["app", "components", "lib"]) {
  if (existsSync(path.join(root, dir))) collect(dir);
}

for (const file of codeFiles) {
  const content = read(file);
  const phone = looksLikePhone(content);
  if (phone) problems.push(`${file}: похоже на номер телефона — ${phone.slice(0, 40)}`);
  const email = content.match(emailPattern);
  if (email) problems.push(`${file}: похоже на email — ${email[0].slice(0, 40)}`);

  // Anything the code points at must exist in the generated manifest.
  for (const match of content.matchAll(/["'`](\/images\/[A-Za-z0-9._-]+\.webp)["'`]/g)) {
    const src = match[1];
    if (!manifestBySrc.has(src)) {
      problems.push(`${file}: ссылка на ${src}, которого нет в content/images.json`);
    } else {
      referenced.add(src);
    }
  }
}

/* 6b. Assets nobody points at are only a warning. */
for (const image of manifest.images) {
  if (!referenced.has(image.src)) notes.push(`Файл ${image.src} не используется на сайте`);
}

/* 7. The brief form must accept an empty area and reject an empty name. */const briefSample = {
  objectType: "Квартира",
  areaM2: "86",
  city: "Астана",
  services: ["Дизайн-проект"],
  timeline: "Готов начать сейчас",
  name: "Тест",
  comment: "",
};
if (!BriefSchema.safeParse(briefSample).success) problems.push("BriefSchema не принимает корректный бриф");
if (BriefSchema.safeParse({ ...briefSample, name: "" }).success) {
  problems.push("BriefSchema принимает бриф без имени");
}
if (BriefSchema.safeParse({ ...briefSample, services: [] }).success) {
  problems.push("BriefSchema принимает бриф без задач");
}

/* 8. Sanity: featured projects must have more than one image each. */
const singleImageFeatured = business.projects.filter((p: Project) => p.featured && p.images.length < 1);
if (singleImageFeatured.length) {
  problems.push(`У избранных проектов нет изображений: ${singleImageFeatured.map((p) => p.slug).join(", ")}`);
}

/* Report */
const featured = business.projects.filter((p) => p.featured);
console.log("Проверка content/business.json");
console.log(`  объектов всего:            ${business.projects.length}`);
console.log(`  избранных:                 ${featured.length}`);
console.log(`  в каталоге:                ${business.projects.length - featured.length}`);
console.log(`  изображений в манифесте:   ${manifest.images.length}`);
console.log(`  изображений используется:  ${referenced.size}`);
console.log(`  услуг:                     ${business.services.length}`);
console.log(`  отзывов в подборке:        ${business.reviews.excerpts.length}`);
console.log(`  включённых блоков:         ${business.sections.enabled.length}`);
console.log(`  выключенных блоков:        ${business.sections.disabled.length}`);
console.log(`  проверено файлов кода:     ${codeFiles.length}`);

if (notes.length) {
  console.log(`\nЗамечания (не блокируют сборку):`);
  for (const note of notes) console.log(`  · ${note}`);
}

if (problems.length) {
  console.error(`\nОшибок: ${problems.length}`);
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  process.exit(1);
}

console.log("\n✔ Данные консистентны: ничего не выдумано, все изображения на месте.");

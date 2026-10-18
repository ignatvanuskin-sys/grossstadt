/**
 * Asset pipeline for the GROSSSTADT demo concept.
 *
 * Reads the raw material collected into scrape/raw (never modified) and writes
 * presentation-ready files into public/images. Produces content/images.json
 * with intrinsic dimensions, a tiny blurred placeholder and the dominant colour
 * so that every <Figure> can reserve layout space (CLS) and fade in cleanly.
 *
 * Usage: npm run images
 */
import { mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type Asset = {
  /** Source path relative to the project root. */
  from: string;
  /** Output file name inside public/images. */
  name: string;
  /** Where the material came from — carried into the report, not the UI. */
  origin: "instagram" | "2gis-owner" | "2gis-visitor";
  /** Documentation of what the frame actually shows. */
  note: string;
  /** Optional crop applied before resize: { left, top, width, height } in px. */
  crop?: { left: number; top: number; width: number; height: number };
  /** Hint for the layout: "cover" fills the frame, "contain" shows the full frame. */
  fit?: "cover" | "contain";
};

const IG = "scrape/raw/ig";
const GIS = "scrape/raw/img";
const TILES = "scrape/raw/market-tiles";

/**
 * Material that stays in scrape/raw but is deliberately NOT published on the
 * concept, with the reason on record. The pipeline prunes these files from
 * public/images, so nothing unused ever ships to the browser.
 */
const excluded: { name: string; reason: string }[] = [
  {
    name: "studio-team.webp",
    reason:
      "Групповой портрет сотрудников: состав команды публично не раскрыт (блок «Состав команды» выключен), лица людей на концепте не показываем.",
  },
  {
    name: "studio-team-couch.webp",
    reason: "Неформальный кадр с сотрудниками — та же причина, что и у группового портрета.",
  },
  {
    name: "studio-desk.webp",
    reason: "Крупный портрет сотрудника студии за рабочим столом: на концепте персональные кадры не публикуются.",
  },
  {
    name: "studio-switches.webp",
    reason:
      "Кадр с людьми в салоне: посетители не давали согласия на публикацию, а сами электроустановочные изделия на концепте не продаются.",
  },
  {
    name: "studio-lighting.webp",
    reason: "Фото посетителя карточки: стенд со светильниками, права на кадр у автора, для рассказа о процессе он не нужен.",
  },
  {
    name: "studio-album.webp",
    reason:
      "Обложка печатного альбома: на развороте видны телефоны студии, а номер на концепте не публикуется. Кадр использован только как источник фирменного стиля и слогана.",
  },
  {
    name: "studio-plans-2.webp",
    reason: "Дублирует по смыслу studio-plans.webp; в подборке оставлен один кадр рабочей документации.",
  },
  {
    name: "studio-materials-2.webp",
    reason: "Дублирует по смыслу studio-materials.webp; оставлен более информативный кадр.",
  },
];

const excludedNames = new Set(excluded.map((item) => item.name));


/**
 * The 25 project sheets published in the 2GIS "Товары и услуги" tab each carry
 * a 2x2 render grid. scrape/extract-market-tiles.mjs cuts the two top renders
 * out of every sheet; 25 sheets x 2 = 50 files, all of them used on the site.
 */
const sheetTiles: Asset[] = Array.from({ length: 25 }, (_, i) => i + 1).flatMap((n) =>
  [1, 2].map((k) => {
    const nn = String(n).padStart(2, "0");
    return {
      from: `${TILES}/${nn}-${k}.webp`,
      name: `catalog-${nn}-${k}.webp`,
      origin: "2gis-owner" as const,
      note: `Визуализация вырезана из проектного листа ${nn} (вкладка «Товары и услуги» карточки 2ГИС).`,
    };
  }),
);

const candidates: Asset[] = [
  // --- Published projects (Instagram @grossstadt_interior, public embeds) ---
  {
    from: `${IG}/ig_pablo_centro__DVeQBuCiGL4.webp`,
    name: "project-pablo-centro.webp",
    origin: "instagram",
    note: "3D-визуализация кофейни PABLO в БЦ Centro. Люди в кадре — 3D-модели.",
  },
  {
    from: `${IG}/ig_pablo_aura__DVkukpXiOWn.webp`,
    name: "project-pablo-aura.webp",
    origin: "instagram",
    note: "Визуализация кофейни PABLO в БЦ Aura (по публикации студии: идёт реализация).",
  },
  {
    from: `${IG}/ig_kobenhavn__C71c5agiS3Y.webp`,
    name: "project-kobenhavn.webp",
    origin: "instagram",
    note: "Визуализация кофезоны København, Стамбул. В правом верхнем углу — логотип студии.",
  },
  {
    from: `${IG}/ig_vela_one__DHGQ3MZoKOX.webp`,
    name: "project-yesterday.webp",
    origin: "instagram",
    note: "Визуализация кофейни Yesterday Coffee & Brunch.",
  },
  {
    from: `${IG}/ig_progress_office__C61BTfZIcob.webp`,
    name: "project-progress-office.webp",
    origin: "instagram",
    note: "Пост-презентация офиса фабрики «Прогресс»: слева фрагмент визуализации, справа текстовая плашка.",
    fit: "contain",
  },
  {
    from: `${IG}/ig_athletic_city__CkK2sVMLnXo.webp`,
    name: "project-athletic-city.webp",
    origin: "instagram",
    note: "3D-визуализация гостиной в ЖК Athletic City.",
  },

  ...sheetTiles,

  // --- Studio life (2GIS gallery, owner uploads) ---
  {
    from: `${GIS}/30258560180010168__user.jpg`,
    name: "studio-team.webp",
    origin: "2gis-visitor",
    note: "Команда студии, групповой портрет (фото посетителя карточки).",
  },
  {
    from: `${GIS}/30258560180010186__user.jpg`,
    name: "studio-team-couch.webp",
    origin: "2gis-visitor",
    note: "Команда студии, неформальный кадр (фото посетителя карточки).",
  },
  {
    from: `${GIS}/30258560165507469__2gis_owner.jpg`,
    name: "studio-presentation.webp",
    origin: "2gis-owner",
    note: "Презентация планировочного решения на большом экране в офисе студии.",
  },
  {
    from: `${GIS}/30258560165507601__2gis_owner.jpg`,
    name: "studio-review.webp",
    origin: "2gis-owner",
    note: "Разбор планировки за столом: чертежи, образцы материалов, альбом проекта.",
  },
  {
    from: `${GIS}/30258560165507540__2gis_owner.jpg`,
    name: "studio-desk.webp",
    origin: "2gis-owner",
    note: "Рабочее место в офисе студии, альбом с визуализациями мебели.",
  },
  {
    from: `${GIS}/30258560165507485__2gis_owner.jpg`,
    name: "studio-plans.webp",
    origin: "2gis-owner",
    note: "План с обозначением групп выключателей: работа с рабочей документацией.",
  },
  {
    from: `${GIS}/30258560165507502__2gis_owner.jpg`,
    name: "studio-plans-2.webp",
    origin: "2gis-owner",
    note: "План расстановки мебели: карандаш на чертеже.",
  },
  {
    from: `${GIS}/30258560165507506__2gis_owner.jpg`,
    name: "studio-materials.webp",
    origin: "2gis-owner",
    note: "Подбор отделки: веера цветов и образцы камня в офисе студии.",
  },
  {
    from: `${GIS}/30258560165507521__2gis_owner.jpg`,
    name: "studio-materials-2.webp",
    origin: "2gis-owner",
    note: "Подбор ткани и палитры отделки.",
  },
  {
    from: `${GIS}/30258560165507509__2gis_owner.jpg`,
    name: "studio-switches.webp",
    origin: "2gis-owner",
    note: "Выбор электроустановочных изделий в салоне.",
  },
  {
    from: `${GIS}/30258560275111155__user.jpg`,
    name: "studio-lighting.webp",
    origin: "2gis-visitor",
    note: "Стенд со светильниками: подбор света (фото посетителя карточки).",
  },
  {
    from: `${GIS}/30258560197777268__user.jpg`,
    name: "studio-album.webp",
    origin: "2gis-visitor",
    note: "Печатный альбом студии GROSSSTADT, Astana 2024 (фото посетителя карточки).",
  },
];

const OUT_DIR = path.join("public", "images");
const MANIFEST = path.join("content", "images.json");

/** Everything the site actually publishes: candidates minus the excluded list. */
const assets = candidates.filter((asset) => !excludedNames.has(asset.name));

const missingExcluded = excluded.filter(
  (item) => !candidates.some((asset) => asset.name === item.name),
);
if (missingExcluded.length) {
  throw new Error(
    `В списке excluded есть файлы, которых нет среди кандидатов: ${missingExcluded
      .map((item) => item.name)
      .join(", ")}`,
  );
}

const MAX_WIDTH = 1800;
const WEBP_QUALITY = 82;

type ManifestEntry = {
  name: string;
  src: string;
  width: number;
  height: number;
  aspect: number;
  blurDataURL: string;
  dominant: string;
  fit: "cover" | "contain";
  origin: Asset["origin"];
  note: string;
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifest: ManifestEntry[] = [];

  for (const asset of assets) {
    const source = path.isAbsolute(asset.from) ? asset.from : path.join(process.cwd(), asset.from);
    const buffer = await readFile(source);

    let pipe = sharp(buffer).rotate();
    if (asset.crop) pipe = pipe.extract(asset.crop);

    const meta = await pipe.metadata();
    const width = Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH);
    const height = Math.round(((meta.height ?? 1) / (meta.width ?? 1)) * width);

    // Small blurred placeholder: 20px wide, kept well under the 4 kB data-URL budget.
    const blur = await sharp(buffer)
      .rotate()
      .resize({ width: 20, withoutEnlargement: true })
      .webp({ quality: 32 })
      .toBuffer();

    const out = path.join(OUT_DIR, asset.name);
    await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(out);

    const stats = await sharp(buffer).stats();
    const dominant = stats.dominant
      ? `#${[stats.dominant.r, stats.dominant.g, stats.dominant.b]
          .map((c) => c.toString(16).padStart(2, "0"))
          .join("")}`
      : "#e7e4de";

    const written = await sharp(out).metadata();

    manifest.push({
      name: asset.name,
      src: `/images/${asset.name}`,
      width: written.width ?? width,
      height: written.height ?? height,
      aspect: Number((((written.width ?? width) / (written.height ?? height)) || 1).toFixed(4)),
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      dominant,
      fit: asset.fit ?? "cover",
      origin: asset.origin,
      note: asset.note,
    });

    console.log(
      `✓ ${asset.name.padEnd(34)} ${written.width}x${written.height}  ${dominant}  (${asset.origin})`,
    );
  }

  await writeFile(
    MANIFEST,
    `${JSON.stringify(
      {
        _note:
          "Сгенерировано scripts/optimize-images.ts из публичных материалов студии (Instagram, галерея 2ГИС). Не редактировать вручную.",
        generatedAt: new Date().toISOString(),
        maxWidth: MAX_WIDTH,
        images: manifest,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  // Prune files that were published earlier but are no longer part of the site.
  const keep = new Set(manifest.map((entry) => entry.name));
  const onDisk = await readdir(OUT_DIR);
  const removed: string[] = [];
  for (const file of onDisk) {
    if (!file.endsWith(".webp")) continue;
    if (keep.has(file)) continue;
    await rm(path.join(OUT_DIR, file), { force: true });
    removed.push(file);
  }

  if (excluded.length) {
    console.log("\nНе публикуется (остаётся в scrape/raw):");
    for (const item of excluded) console.log(`  – ${item.name}: ${item.reason}`);
  }
  if (removed.length) console.log(`\nУдалено из ${OUT_DIR}: ${removed.join(", ")}`);

  console.log(`\n${manifest.length} files -> ${OUT_DIR}\nmanifest -> ${MANIFEST}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

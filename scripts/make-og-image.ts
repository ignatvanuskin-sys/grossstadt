/**
 * Социальная картинка для ссылок: og:image и twitter:image.
 * Берёт кадр первого экрана (он уже лежит в public/images) и режет его
 * в формат 1200×630 JPEG — такой предпросмотр понимают WhatsApp, Telegram
 * и соцсети, тогда как webp поддерживают не все.
 *
 * Запуск: npm run og
 */
import { statSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "public/images/project-athletic-city.webp";
const TARGET = "public/og-image.jpg";
const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error(`не удалось прочитать размеры ${SOURCE}`);

  // Кадр выше, чем 1200×630, поэтому берём горизонтальную полосу примерно
  // на четверти высоты: в неё попадают диван, столик с декором и стена
  // хранения, но не пустой потолок с люстрой — так превью читается как
  // интерьер, а не как «полка с книгами».
  const band = Math.round((width * HEIGHT) / WIDTH);
  const top = Math.max(0, Math.min(height - band, Math.round(height * 0.28)));
  const base = band <= height ? sharp(SOURCE).extract({ left: 0, top, width, height: band }) : sharp(SOURCE);

  const info = await base
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .jpeg({ quality: 80, mozjpeg: true, progressive: true })
    .toFile(TARGET);

  const kb = Math.round(statSync(TARGET).size / 1024);
  console.log(
    `готово: ${TARGET} — ${info.width}×${info.height}, ${kb} КБ (полоса ${width}×${band}, отступ сверху ${top})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

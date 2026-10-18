import sharp from "sharp";

const { data, info } = await sharp("scrape/raw/market-sheets-src/01.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const k = (y * info.width + x) * info.channels;
  return [data[k], data[k + 1], data[k + 2]];
};

console.log("size", info.width, info.height, "channels", info.channels);
console.log("corners");
for (const [x, y] of [
  [5, 5],
  [info.width - 6, 5],
  [5, info.height - 6],
  [info.width - 6, info.height - 6],
  [900, 600],
  [900, 1750],
  [60, 900],
  [1740, 900],
]) {
  console.log(`  (${x},${y}) = ${px(x, y).join(",")}`);
}

/** @type {import('next').NextConfig} */
const isDemo = (process.env.MODE ?? process.env.NEXT_PUBLIC_MODE ?? "demo") !== "production";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Кадры запрашиваются с quality 70–82 (карточки, лайтбокс, hero). Next 15.5
    // уже предупреждает в консоли, что кастомные значения нужно объявлять
    // явно, а с Next 16 это станет обязательным.
    qualities: [70, 75, 80, 82],
    deviceSizes: [360, 414, 480, 640, 828, 1080, 1280, 1600, 1920, 2400],
  },
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    if (isDemo) {
      // Demo concept: never index, never leak into search results.
      headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" });
    }
    return [
      { source: "/:path*", headers },
      {
        // Шрифты лежат в public/fonts с фиксированными именами: Next отдаёт файлы
        // из public с max-age=0, из-за чего повторный визит качает их заново.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;

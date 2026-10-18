import type { Metadata, Viewport } from "next";
import "./globals.css";
import { business, isDemo, siteName } from "@/lib/business";
import { siteUrlBase } from "@/lib/seo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyBar } from "@/components/StickyBar";
import { DemoTicker } from "@/components/DemoTicker";
import { RevealInit } from "@/components/RevealInit";

/*
 * Файлы шрифтов объявлены в globals.css (@font-face с unicode-range) и лежат в
 * public/fonts. Здесь они только предзагружаются: preload стартует вместе с
 * документом, поэтому к первому тексту шрифты уже в полёте, а не ждут разбора CSS.
 * React переносит эти <link> в <head>.
 */
const fontPreloads = [
  "/fonts/manrope-cyrillic-400-700.woff2",
  "/fonts/manrope-latin-400-700.woff2",
  "/fonts/onest-cyrillic-400-700.woff2",
  "/fonts/onest-latin-400-700.woff2",
];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrlBase),
  title: {
    default: business.seo.title,
    template: `%s · ${business.studio.name}`,
  },
  description: business.seo.description,
  applicationName: siteName,
  authors: [{ name: business.studio.name }],
  formatDetection: { telephone: false, address: false, email: false },
  robots: isDemo
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-paper text-ink">
        {fontPreloads.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
        >
          К содержанию
        </a>
        <DemoTicker />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <StickyBar />
        <RevealInit />
      </body>
    </html>
  );
}

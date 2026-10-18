import type { Metadata } from "next";
import { business, isDemo } from "@/lib/business";

/**
 * Metadata helper. In demo mode nothing may be indexed, so every page gets
 * `noindex, nofollow` plus the robots.txt disallow in app/robots.ts.
 */

/**
 * Канонический адрес сайта. Приоритет: явная переменная, затем адрес деплоя
 * (Vercel подставляет VERCEL_PROJECT_PRODUCTION_URL и VERCEL_URL на сборке),
 * и только в крайнем случае — локальный сервер. Без этого canonical, og:url,
 * robots.txt и sitemap.xml уезжали на localhost прямо в проде.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}

const siteUrl = resolveSiteUrl();

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
}): Metadata {
  const descriptionText = description ?? business.seo.description;
  const url = `${siteUrl.replace(/\/$/, "")}${path}`;

  return {
    title,
    description: descriptionText,
    alternates: { canonical: url },
    robots: isDemo
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ru_KZ",
      siteName: business.studio.name,
      title,
      description: descriptionText,
      url,
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: descriptionText,
      images: image ? [image] : undefined,
    },
  };
}

export const siteUrlBase = siteUrl;

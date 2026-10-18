import type { Metadata } from "next";
import { business, isDemo } from "@/lib/business";

/**
 * Metadata helper. In demo mode nothing may be indexed, so every page gets
 * `noindex, nofollow` plus the robots.txt disallow in app/robots.ts.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

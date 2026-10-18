import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/business";
import { siteUrlBase } from "@/lib/seo";

/**
 * In demo mode every crawler is refused: the concept must never surface in
 * search results next to the studio's real listings.
 */
export default function robots(): MetadataRoute.Robots {
  if (isDemo) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: siteUrlBase,
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteUrlBase.replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrlBase,
  };
}

import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/business";
import { siteUrlBase } from "@/lib/seo";

/**
 * In demo mode every crawler is refused: the concept must never surface in
 * search results next to the studio's real listings.
 */
export default function robots(): MetadataRoute.Robots {
  // Директиву Host отдаём только для настоящего адреса: на локальной сборке
  // «Host: http://localhost:3000» бессмысленна, а в проде это утечка служебного
  // адреса (такое уже уезжало на боевой домен).
  const host = siteUrlBase.includes("localhost") ? undefined : siteUrlBase;

  if (isDemo) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host,
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteUrlBase.replace(/\/$/, "")}/sitemap.xml`,
    host,
  };
}

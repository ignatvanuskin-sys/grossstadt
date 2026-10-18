import type { MetadataRoute } from "next";
import { isDemo, projects } from "@/lib/business";
import { siteUrlBase } from "@/lib/seo";

/** Empty in demo mode: with robots.txt disallowing everything there is nothing to list. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemo) return [];

  const base = siteUrlBase.replace(/\/$/, "");
  const lastModified = new Date(`${"2026-10-17"}T00:00:00Z`);

  return [
    { url: `${base}/`, lastModified, priority: 1 },
    { url: `${base}/projects`, lastModified, priority: 0.9 },
    ...projects.map((project) => ({
      url: `${base}/projects/${project.slug}`,
      lastModified,
      priority: 0.6,
    })),
    { url: `${base}/privacy`, lastModified, priority: 0.2 },
  ];
}

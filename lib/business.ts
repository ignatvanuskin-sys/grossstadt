import raw from "@/content/business.json";
import { BusinessSchema, type Business, type Project } from "@/lib/schema";

/**
 * Single source of truth for every fact on the site.
 * Parsed once at module load; a broken or incomplete file fails the build.
 */
export const business: Business = BusinessSchema.parse(raw);

export const isDemo = business.mode === "demo";

export const siteName = `${business.studio.name} — студия дизайна интерьера`;

export const projects: Project[] = business.projects;

export const featuredProjects = projects.filter((project) => project.featured);

export const catalogProjects = projects.filter((project) => !project.featured);

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

/** True when the section has verified data and is allowed to render. */
export function hasSection(id: Business["sections"]["enabled"][number]): boolean {
  return business.sections.enabled.includes(id);
}

export const projectCategories = [
  "Офис",
  "Квартира",
  "Кофейня",
  "Ресторан",
  "Ритейл",
  "Общественное пространство",
] as const;

export type ProjectCategory = (typeof projectCategories)[number];

export const categoryPlural: Record<ProjectCategory, string> = {
  Офис: "Офисы",
  Квартира: "Квартиры",
  Кофейня: "Кофейни",
  Ресторан: "Рестораны",
  Ритейл: "Ритейл",
  "Общественное пространство": "Общественные",
};

export function countByCategory(category: ProjectCategory): number {
  return projects.filter((project) => project.category === category).length;
}

export const stats = [
  {
    value: business.reviews.rating.toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    label: `рейтинг на ${business.reviews.source}`,
    note: `${business.reviews.count} оценок`,
    href: business.reviews.sourceUrl,
  },
  {
    value: String(business.reviews.reviewsCount),
    label: `отзыва в карточке ${business.reviews.source}`,
    note: `на ${business.reviews.asOf.split("-").reverse().join(".")}`,
    href: business.reviews.sourceUrl,
  },
  {
    value: String(business.catalogMeta.totalCount),
    label: "объект в открытом портфолио",
    note: `${business.catalogMeta.publishedCount} — в карточке ${business.reviews.source}`,
    href: business.contacts.map2gis,
  },
  {
    value: String(business.services.length),
    label: "направлений работы",
    note: "от планировки до комплектации",
    href: "#services",
  },
];

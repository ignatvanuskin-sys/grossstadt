import { z } from "zod";

/**
 * Shape of content/business.json. Everything the site renders comes from here,
 * so the schema is strict: unknown or invented fields are rejected at build
 * time and nothing can be rendered that has no source.
 */

const text = z.string().min(1);
const nullableText = z.string().min(1).nullable();

export const SourceUrl = z.string().url();

export const ProjectImageSchema = z.object({
  src: z.string().startsWith("/images/"),
  kind: z.enum(["render", "photo"]),
  caption: text,
});

export const ProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: text,
  subtitle: nullableText,
  category: z.enum([
    "Офис",
    "Квартира",
    "Кофейня",
    "Ресторан",
    "Ритейл",
    "Общественное пространство",
  ]),
  type: text,
  areaM2: z.number().positive().nullable(),
  style: nullableText,
  city: text,
  year: z.number().int().min(1990).max(2100).nullable(),
  status: z.enum(["Разработан", "Реализован", "В реализации"]).nullable(),
  featured: z.boolean(),
  summary: text,
  cover: z.string().startsWith("/images/"),
  images: z.array(ProjectImageSchema).min(1),
  facts: z.record(text, text),
  sourceUrl: SourceUrl,
});

export const BusinessSchema = z.object({
  studio: z.object({
    name: text,
    logo: z.null(),
    tagline: text,
    founders: z.array(
      z.object({ name: text, role: text, sourceUrl: SourceUrl }),
    ),
    foundedYear: z.null(),
    legalName: z.null(),
  }),
  contacts: z.object({
    city: text,
    address: text,
    office: text,
    floor: text,
    district: text,
    postcode: text,
    geo: z.object({ lat: z.number(), lng: z.number() }),
    hours: z.array(z.object({ days: text, value: text })),
    hoursText: text,
    whatsapp: SourceUrl,
    instagram: SourceUrl,
    telegram: z.null(),
    map2gis: SourceUrl,
    mapGoogle: SourceUrl,
  }),
  social: z.object({
    instagram: z.object({
      handle: text,
      url: SourceUrl,
      followers: z.number().int().positive().nullable(),
      posts: z.number().int().positive().nullable(),
      asOf: z.string().nullable(),
    }),
  }),
  services: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: text,
      description: text,
      includes: z.array(text),
      priceFrom: z.null(),
      priceUnit: z.null(),
      sourceUrl: SourceUrl,
    }),
  ),
  pricing: z.object({
    enabled: z.boolean(),
    rates: z.array(z.never()),
    note: text,
  }),
  projects: z.array(ProjectSchema).min(1),
  catalogMeta: z.object({
    publishedCount: z.number().int().positive(),
    catalogCount: z.number().int().positive(),
    featuredExtra: z.number().int().positive(),
    totalCount: z.number().int().positive(),
    note: text,
  }),
  process: z.array(
    z.object({ title: text, description: text, evidence: text }),
  ),
  reviews: z.object({
    source: text,
    rating: z.number().min(1).max(5),
    count: z.number().int().positive(),
    reviewsCount: z.number().int().positive(),
    asOf: z.string(),
    sourceUrl: SourceUrl,
    excerpts: z
      .array(
        z.object({
          text: text,
          date: z.string(),
          rating: z.number().min(1).max(5),
          source: text,
        }),
      )
      .min(1),
  }),
  highlights: z.array(z.object({ title: text, text: text, sourceUrl: SourceUrl })),
  faq: z.array(z.object({ q: text, a: text })).min(1),
  terms: z.object({
    prepayment: z.null(),
    supervision: text,
    responseSla: text,
  }),
  sections: z.object({
    enabled: z.array(
      z.enum([
        "hero",
        "stats",
        "projects",
        "catalog",
        "services",
        "process",
        "reviews",
        "about",
        "brief",
        "faq",
        "contacts",
      ]),
    ),
    disabled: z.array(z.object({ id: text, reason: text })),
  }),
  seo: z.object({ title: text, description: text }),
  analytics: z.object({ ga4: z.null(), ym: z.null() }),
  mode: z.enum(["demo", "production"]),
  _sources: z.record(text, text),
});

export type Business = z.infer<typeof BusinessSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectImage = z.infer<typeof ProjectImageSchema>;
export type Service = z.infer<typeof BusinessSchema>["services"][number];

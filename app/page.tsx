import { business, featuredProjects, hasSection, projects } from "@/lib/business";
import { pageMetadata, siteUrlBase } from "@/lib/seo";
import { plural } from "@/lib/format";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { ProjectGrid } from "@/components/ProjectGrid";
import { ProjectIndex } from "@/components/ProjectIndex";
import { SectionHead } from "@/components/SectionHead";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { Reviews } from "@/components/Reviews";
import { About } from "@/components/About";
import { Brief } from "@/components/Brief";
import { Faq } from "@/components/Faq";
import { Contacts } from "@/components/Contacts";

export const metadata = pageMetadata({
  title: business.seo.title,
  description: business.seo.description,
  path: "/",
});

/**
 * Home page. It renders only the blocks that have verified data behind them:
 * `business.sections.enabled` is the switchboard, and `npm run validate` fails
 * the build if a block is turned on without its data.
 */
export default function HomePage() {
  const { catalogMeta, studio, contacts } = business;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: studio.name,
    description: business.seo.description,
    slogan: studio.tagline,
    url: siteUrlBase,
    sameAs: [contacts.instagram, contacts.map2gis],
    address: {
      "@type": "PostalAddress",
      streetAddress: `${contacts.address}, офис ${contacts.office}`,
      addressLocality: contacts.city,
      addressRegion: contacts.district,
      postalCode: contacts.postcode,
      addressCountry: "KZ",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: contacts.geo.lat,
      longitude: contacts.geo.lng,
    },
    areaServed: { "@type": "City", name: contacts.city },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised once on the server; `<` is escaped so the payload cannot
        // break out of the script element.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {hasSection("hero") ? <Hero /> : null}
      {hasSection("stats") ? <Stats /> : null}

      {hasSection("projects") ? (
        <section id="projects" aria-labelledby="projects-title" className="section">
          <div className="shell">
            <SectionHead
              id="projects-title"
              eyebrow="Портфолио"
              title="Избранные проекты"
              lede={`${featuredProjects.length} ${plural(
                featuredProjects.length,
                "объект",
                "объекта",
                "объектов",
              )}, с которых удобно начать знакомство: кофейни, офисы и жилой интерьер. Каждый кадр подписан — визуализация это или фотография реализации.`}
              aside={
                <a href="/projects" className="link-underline inline-flex min-h-[48px] items-center font-sans text-label uppercase">
                  Смотреть весь каталог
                </a>
              }
            />
            <div className="mt-12">
              <ProjectGrid projects={featuredProjects} variant="featured" />
            </div>
          </div>
        </section>
      ) : null}

      {hasSection("catalog") ? (
        <section id="catalog" aria-labelledby="catalog-title" className="section-tight defer-paint">
          <div className="shell">
            <SectionHead
              id="catalog-title"
              eyebrow="Каталог"
              title="Все объекты"
              lede="Полный список опубликованных работ: индекс с площадью, стилем и категорией — как их указывает сама студия. Фотографии и описания — на страницах объектов."
              aside={
                <a href="/projects" className="link-underline inline-flex min-h-[48px] items-center font-sans text-label uppercase">
                  Открыть каталог с фото
                </a>
              }
            />
            <div className="mt-10">
              <ProjectIndex projects={projects} />
            </div>
            <p className="mt-8 max-w-[78ch] font-sans text-[0.8125rem] leading-relaxed text-muted">
              Всего в портфолио {catalogMeta.totalCount}{" "}
              {plural(catalogMeta.totalCount, "объект", "объекта", "объектов")}:{" "}
              {catalogMeta.publishedCount} — в карточке студии в {business.reviews.source}, ещё{" "}
              {catalogMeta.featuredExtra} — только в Instagram. Два объекта встречаются в обоих
              источниках и показаны один раз.
            </p>
          </div>
        </section>
      ) : null}

      {hasSection("services") ? <Services /> : null}
      {hasSection("process") ? <Process /> : null}
      {hasSection("reviews") ? <Reviews /> : null}
      {hasSection("about") ? <About /> : null}
      {hasSection("brief") ? <Brief /> : null}
      {hasSection("faq") ? <Faq /> : null}
      {hasSection("contacts") ? <Contacts /> : null}
    </>
  );
}

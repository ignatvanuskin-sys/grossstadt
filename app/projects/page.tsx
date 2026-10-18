import { business, projects } from "@/lib/business";
import { pageMetadata } from "@/lib/seo";
import { plural } from "@/lib/format";
import { SectionHead } from "@/components/SectionHead";
import { ProjectGrid } from "@/components/ProjectGrid";
import { whatsappDefault } from "@/lib/whatsapp";

export const metadata = pageMetadata({
  title: "Все проекты",
  description: `Каталог объектов студии ${business.studio.name}: ${projects.length} опубликованных проектов — площади, стили и состав работ по данным карточки студии в ${business.reviews.source} и публикаций в Instagram.`,
  path: "/projects",
});

/**
 * Full catalogue. `?category=` (used by the footer links) preselects a filter,
 * the rest of the filtering happens in the client component.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = typeof params.category === "string" ? params.category : undefined;
  const { catalogMeta } = business;

  return (
    <div className="section">
      <div className="shell">
        <SectionHead
          id="catalog-title"
          eyebrow="Каталог"
          title="Все проекты студии"
          lede={`${projects.length} ${plural(
            projects.length,
            "объект",
            "объекта",
            "объектов",
          )} из открытого портфолио: ${catalogMeta.publishedCount} опубликованы в карточке студии в ${
            business.reviews.source
          }, ещё ${catalogMeta.featuredExtra} — в Instagram. У каждого проекта указаны источник, площадь и состав; под кадром стоит отметка «визуализация» или «реализация».`}
          aside={
            <a href="/#brief" className="link-underline inline-flex min-h-[48px] items-center font-sans text-label uppercase">
              Рассчитать свой проект
            </a>
          }
        />

        <div className="mt-12">
          <ProjectGrid
            projects={projects}
            variant="catalog"
            withFilters
            initialCategory={requested}
          />
        </div>

        <div className="reveal mt-14 flex flex-col gap-4 border-t border-[var(--rule)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[62ch] font-sans text-[0.8125rem] leading-relaxed text-muted">
            Все площади и стили — со слов студии: значения взяты из её проектных публикаций без
            округления. Если объекта нет в этом списке, значит студия его публично не показывала.
          </p>
          <a
            href={whatsappDefault}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-solid w-full shrink-0 sm:w-auto"
          >
            Написать в WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

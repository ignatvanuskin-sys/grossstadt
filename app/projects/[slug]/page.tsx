import { notFound } from "next/navigation";
import { business, projectBySlug, projects } from "@/lib/business";
import { pageMetadata, siteUrlBase } from "@/lib/seo";
import { Figure, FillImage, KindBadge } from "@/components/Figure";
import { formatArea, formatDate } from "@/lib/format";
import { whatsappForProject } from "@/lib/whatsapp";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function titleOf(slug: string): string {
  const project = projectBySlug(slug);
  if (!project) return "Проект не найден";
  return project.subtitle ? `${project.title} — ${project.subtitle}` : project.title;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);

  return pageMetadata({
    title: titleOf(slug),
    description: project ? truncate(project.summary, 280) : business.seo.description,
    path: `/projects/${slug}`,
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  const cover = project.images[0];
  const rest = project.images.slice(1);
  const area = formatArea(project.areaM2);

  const sameCategory = projects.filter(
    (item) => item.slug !== project.slug && item.category === project.category,
  );
  const filler = projects.filter(
    (item) => item.slug !== project.slug && item.featured && item.category !== project.category,
  );
  const related = [...sameCategory, ...filler].slice(0, 3);

  const metaRows: { label: string; value: string }[] = [
    ...(area ? [{ label: "Площадь", value: area }] : []),
    ...(project.style ? [{ label: "Стиль", value: project.style }] : []),
    { label: "Город", value: project.city },
    ...(project.year ? [{ label: "Год", value: String(project.year) }] : []),
    ...(project.status ? [{ label: "Статус", value: project.status }] : []),
    { label: "Формат", value: project.type },
  ];

  return (
    <article className="section">
      {
        // Разметка хлебных крошек повторяет видимую навигацию страницы:
        // Главная → Проекты → название. Ничего, чего нет на экране.
      }
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: siteUrlBase },
              { "@type": "ListItem", position: 2, name: "Проекты", item: `${siteUrlBase}/projects` },
              {
                "@type": "ListItem",
                position: 3,
                name: project.title,
                item: `${siteUrlBase}/projects/${project.slug}`,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="shell">
        <nav aria-label="Хлебные крошки" className="font-sans text-micro uppercase">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
            <li>
              <a href="/" className="transition-colors hover:text-ink">
                Главная
              </a>
            </li>
            <li aria-hidden className="text-brass">
              /
            </li>
            <li>
              <a href="/projects" className="transition-colors hover:text-ink">
                Проекты
              </a>
            </li>
            <li aria-hidden className="text-brass">
              /
            </li>
            <li aria-current="page" className="text-ink">
              {project.title}
            </li>
          </ol>
        </nav>

        <header className="mt-8 grid gap-8 border-b border-[var(--rule)] pb-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">{project.category}</p>
            <h1 className="mt-4 font-display text-h2 font-medium text-ink">{project.title}</h1>
            {project.subtitle ? (
              <p className="mt-3 font-display text-h3 text-ink/70">{project.subtitle}</p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 self-end sm:grid-cols-3 lg:col-span-5">
            {metaRows.map((row) => (
              <div key={row.label}>
                <dt className="eyebrow">{row.label}</dt>
                <dd className="mt-1.5 font-sans text-[0.9375rem] text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-8">
            <figure>
              <Figure src={cover.src} alt={cover.caption} priority sizes="(min-width: 1024px) 64vw, 100vw" />
              <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <span className="max-w-[64ch] font-sans text-[0.8125rem] leading-snug text-muted">
                  {cover.caption}
                </span>
                <KindBadge kind={cover.kind} />
              </figcaption>
            </figure>

            {rest.map((image) => (
              <figure key={image.src}>
                <Figure src={image.src} alt={image.caption} sizes="(min-width: 1024px) 64vw, 100vw" />
                <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <span className="max-w-[64ch] font-sans text-[0.8125rem] leading-snug text-muted">
                    {image.caption}
                  </span>
                  <KindBadge kind={image.kind} />
                </figcaption>
              </figure>
            ))}
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <p className="font-sans text-[1rem] leading-relaxed text-ink/85">{project.summary}</p>

              <dl className="mt-8 border-t border-[var(--rule)]">
                {Object.entries(project.facts).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap gap-x-4 border-b border-[var(--rule)] py-3.5"
                  >
                    <dt className="min-w-[11ch] font-sans text-micro uppercase text-muted">
                      {label}
                    </dt>
                    <dd className="font-sans text-[0.9375rem] text-ink/85">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-col gap-3">
                <a
                  href={whatsappForProject(project.title, project.subtitle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-brass w-full"
                >
                  Обсудить похожий проект
                </a>
                <a href="/#brief" className="btn btn-outline w-full">
                  Рассчитать проект
                </a>
              </div>

              <p className="mt-6 font-sans text-[0.75rem] leading-relaxed text-muted">
                Источник{" "}
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline"
                >
                  {new URL(project.sourceUrl).hostname.replace("www.", "")}
                </a>{" "}
                · данные на {formatDate(business.reviews.asOf)}. Площадь и стиль указаны студией.
              </p>
            </div>
          </aside>
        </div>

        {related.length ? (
          <section aria-labelledby="related-title" className="mt-20 border-t border-[var(--rule)] pt-10">
            <h2 id="related-title" className="font-display text-h3 text-ink">
              Похожие проекты
            </h2>
            <ul className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => {
                const image = item.images[0];
                return (
                  <li key={item.slug} className="group">
                    <a
                      href={`/projects/${item.slug}`}
                      aria-label={`Открыть проект «${item.title}»`}
                      className="frame frame-hover block"
                      style={{ aspectRatio: 0.8 }}
                    >
                      <FillImage
                        src={image.src}
                        alt={image.caption}
                        sizes="(min-width: 1024px) 30vw, 92vw"
                        position="50% 42%"
                      />
                    </a>
                    <div className="mt-4">
                      <KindBadge kind={image.kind} />
                      <h3 className="mt-2 font-display text-[1.125rem] leading-snug text-ink">
                        <a href={`/projects/${item.slug}`} className="link-underline">
                          {item.title}
                        </a>
                      </h3>
                      {item.subtitle ? (
                        <p className="mt-1 font-sans text-[0.875rem] text-ink/60">{item.subtitle}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <p className="mt-14 font-sans text-[0.8125rem] text-muted">
          <a href="/projects" className="link-underline">
            ← Вернуться к каталогу проектов
          </a>
        </p>
      </div>
    </article>
  );
}

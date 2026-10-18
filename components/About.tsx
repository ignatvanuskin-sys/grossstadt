import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { Figure } from "@/components/Figure";
import { WhatsAppMark } from "@/components/Marks";
import { studioShots } from "@/lib/images";
import { whatsappDefault } from "@/lib/whatsapp";
import { formatDate, formatNumber, plural } from "@/lib/format";

/**
 * Studio profile: who leads the projects, where the office is and what the
 * working process looks like in the studio's own photographs from 2GIS.
 * Every claim on this block is linked to its source.
 */

function hostOf(url: string): string {
  return new URL(url).hostname.replace("www.", "");
}

export function About() {
  const instagram = business.social.instagram;

  return (
    <section id="about" aria-labelledby="about-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="about-title"
          eyebrow="Студия"
          title={`${business.studio.name}: дизайн интерьера в ${business.contacts.city}`}
          lede="Профиль собран из открытых источников: карточки студии в 2ГИС и публикаций в Instagram. Ни одна цифра и ни одна реплика здесь не выдуманы."
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <div className="reveal space-y-5 lg:col-span-6">
            <p className="max-w-[62ch] font-sans text-[1.0625rem] leading-relaxed text-ink/85">
              {business.studio.name} — студия дизайна интерьера из Астаны. По собственным
              публикациям студия называет специализацией коммерческие помещения: в открытом
              портфолио офисы, кофейни, рестораны, ритейл и общественные пространства. Жилые
              объекты студия проектирует тоже — от квартир в новых ЖК до жилых интерьеров.
            </p>
            <p className="max-w-[62ch] font-sans text-[1.0625rem] leading-relaxed text-ink/85">
              Проектирование ведёт руководитель проектов, архитектор-дизайнер{" "}
              {business.studio.founders.map((founder, index) => (
                <span key={founder.name}>
                  {index > 0 ? ", " : ""}
                  <span className="text-ink">{founder.name}</span>{" "}
                  <a
                    href={founder.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline font-sans text-[0.8125rem] text-muted"
                  >
                    (источник: {hostOf(founder.sourceUrl)})
                  </a>
                </span>
              ))}
              . Каждый объект студия публикует с площадью, стилем и описанием состава работ.
            </p>
            <p className="max-w-[62ch] font-sans text-[1.0625rem] leading-relaxed text-ink/85">
              Офис студии — {business.contacts.address}, {business.contacts.floor}, офис{" "}
              {business.contacts.office} ({business.contacts.district}). Адрес и график работы
              указаны в карточке {business.reviews.source}; на этой странице есть ссылки на карты.
            </p>

            <dl className="grid gap-x-10 gap-y-6 border-t border-[var(--rule)] pt-7 sm:grid-cols-2">
              <div>
                <dt className="eyebrow">Instagram</dt>
                <dd className="mt-2">
                  <a
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline font-sans text-[0.9375rem] text-ink"
                  >
                    {instagram.handle}
                  </a>
                  <span className="mt-1.5 block font-sans text-[0.8125rem] text-muted">
                    {instagram.followers ? `${formatNumber(instagram.followers)} подписчиков` : null}
                    {instagram.followers && instagram.posts ? " · " : null}
                    {instagram.posts
                      ? `${instagram.posts} ${plural(instagram.posts, "публикация", "публикации", "публикаций")}`
                      : null}
                    {instagram.asOf ? ` · на ${formatDate(instagram.asOf)}` : null}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Карточка в {business.reviews.source}</dt>
                <dd className="mt-2">
                  <a
                    href={business.contacts.map2gis}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline font-sans text-[0.9375rem] text-ink"
                  >
                    Открыть карточку студии
                  </a>
                  <span className="mt-1.5 block font-sans text-[0.8125rem] text-muted">
                    Телефон в карточке — по ссылке; на этом концепте номер не публикуется.
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              {studioShots.map((shot, index) => (
                <figure
                  key={shot.src}
                  className={`reveal ${index % 3 === 0 ? "sm:mt-8" : ""}`}
                >
                  <Figure src={shot.src} alt={shot.caption} sizes="(min-width: 1024px) 24vw, 46vw" />
                  <figcaption className="mt-2.5 font-sans text-[0.75rem] leading-snug text-muted">
                    {shot.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-5 font-sans text-[0.75rem] leading-relaxed text-muted">
              Фотографии — из галереи карточки студии в {business.reviews.source}. Это кадры
              рабочего процесса, а не объекты портфолио: проектные визуализации собраны в разделе
              «Проекты» и подписаны отдельно.
            </p>
          </div>
        </div>

        {business.highlights.length ? (
          <div className="mt-14 space-y-6">
            {business.highlights.map((highlight) => (
              <article
                key={highlight.title}
                className="reveal border border-[var(--rule)] p-6 sm:p-8 lg:flex lg:items-start lg:justify-between lg:gap-10"
              >
                <div className="max-w-[68ch]">
                  <p className="eyebrow">Из публикаций студии</p>
                  <h3 className="mt-3 font-display text-h3 text-ink">{highlight.title}</h3>
                  <p className="mt-3 font-sans text-[0.9375rem] leading-relaxed text-ink/75">
                    {highlight.text}
                  </p>
                </div>
                <a
                  href={highlight.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline mt-6 w-full shrink-0 lg:mt-0 lg:w-auto"
                >
                  Пост студии
                </a>
              </article>
            ))}
          </div>
        ) : null}

        <div className="reveal mt-14 flex flex-col gap-3 border-t border-[var(--rule)] pt-8 sm:flex-row sm:items-center">
          <a href="/#brief" className="btn btn-solid w-full sm:w-auto">
            Рассчитать проект
          </a>
          <a
            href={whatsappDefault}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Написать в WhatsApp"
            className="btn btn-outline btn-icon"
          >
            <WhatsAppMark className="h-5 w-5" />
          </a>
          <p className="font-sans text-[0.8125rem] leading-relaxed text-muted">
            Ответ — в течение дня, {business.contacts.hoursText}.
          </p>
        </div>
      </div>
    </section>
  );
}

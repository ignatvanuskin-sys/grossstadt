import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { formatDate, formatDateLong, formatNumber, plural } from "@/lib/format";

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`}>
      <span aria-hidden className="inline-flex gap-[3px] text-brass">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < full ? "" : "opacity-25"}>
            ★
          </span>
        ))}
      </span>
      <span className="sr-only">Оценка {formatNumber(rating)} из 5</span>
    </span>
  );
}

/**
 * Public reviews, quoted verbatim. The source card is linked, names and
 * personal details are never reproduced, and no widget is embedded.
 */
export function Reviews() {
  const { reviews } = business;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="reviews-title"
          eyebrow="Отзывы"
          title={`Карточка в ${reviews.source}`}
          lede={`Рейтинг ${formatNumber(reviews.rating)} при ${reviews.count} оценках и ${
            reviews.reviewsCount
          } ${plural(reviews.reviewsCount, "отзыве", "отзывах", "отзывах")} в карточке студии в ${
            reviews.source
          } — данные на ${formatDate(reviews.asOf)}. Ниже — ${reviews.excerpts.length} ${plural(
            reviews.excerpts.length,
            "отзыв",
            "отзыва",
            "отзывов",
          )} дословно, без имён.`}
          aside={
            <a
              href={reviews.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline inline-flex min-h-[48px] items-center font-sans text-label uppercase"
            >
              Читать все отзывы в {reviews.source}
            </a>
          }
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <div className="reveal lg:col-span-4">
            <p className="font-display text-[4.5rem] leading-none tracking-[-0.02em] text-ink">
              {formatNumber(reviews.rating)}
            </p>
            <Stars rating={reviews.rating} className="mt-3 text-[1.125rem]" />
            <dl className="mt-6 space-y-3">
              <div className="flex items-baseline gap-3">
                <dt className="font-sans text-[0.875rem] text-muted">Оценок</dt>
                <dd className="font-display text-[1.125rem] text-ink">{reviews.count}</dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="font-sans text-[0.875rem] text-muted">Отзывов</dt>
                <dd className="font-display text-[1.125rem] text-ink">{reviews.reviewsCount}</dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="font-sans text-[0.875rem] text-muted">Источник</dt>
                <dd className="font-display text-[1.125rem] text-ink">{reviews.source}</dd>
              </div>
            </dl>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
            {reviews.excerpts.map((excerpt) => (
              <li
                key={excerpt.date}
                className="reveal flex flex-col border border-[var(--rule)] p-6"
              >
                <Stars rating={excerpt.rating} />
                <blockquote className="mt-4 flex-1 font-sans text-[0.9375rem] leading-relaxed text-ink/85">
                  «{excerpt.text}»
                </blockquote>
                <p className="mt-5 font-sans text-[0.75rem] uppercase tracking-[0.1em] text-muted">
                  {formatDateLong(excerpt.date)} · {excerpt.source}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="reveal mt-8 max-w-[78ch] font-sans text-[0.8125rem] leading-relaxed text-muted">
          Тексты приведены дословно, имена и детали заказов не публикуем. Оценки и количество
          отзывов — из карточки студии; сайт не собирает и не отображает собственные оценки.
        </p>
      </div>
    </section>
  );
}

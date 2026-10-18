import { business, isDemo } from "@/lib/business";
import { pageMetadata, siteUrlBase } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { whatsappDefault } from "@/lib/whatsapp";

export const metadata = pageMetadata({
  title: "Как устроен этот концепт",
  description:
    "Демонстрационный концепт сайта студии GROSSSTADT: из каких открытых источников собраны данные, что не публикуется и какие блоки не показываются из-за отсутствия подтверждённых данных.",
  path: "/privacy",
});

const rules = [
  {
    title: "Концепт, а не официальный сайт",
    text: `Страница собрана как демонстрационный концепт. Материалы принадлежат студии ${business.studio.name}; права на изображения и тексты остаются у студии. Концепт не является публичной офертой и может быть снят с публикации по первому обращению студии.`,
  },
  {
    title: "Закрыт от поисковых систем",
    text: "Демо-версия отдаёт robots-запрет, HTTP-заголовок X-Robots-Tag: noindex, nofollow и не содержит счётчиков аналитики. Страница не появится в выдаче и не конкурирует с действующими площадками студии.",
  },
  {
    title: "Ничего не выдумано",
    text: `Каждая цифра и каждая фраза в интерфейсе опирается на открытый источник: карточку студии в ${business.reviews.source} или публикации в Instagram. Там, где публичных данных нет, стоит не догадка, а честное «уточняется на брифе» — либо блок просто не показывается.`,
  },
  {
    title: "Телефон и почта не публикуются",
    text: "На концепте нет номера телефона и адреса электронной почты — ни в разметке, ни в ссылках. Все действия ведут в WhatsApp, Instagram или в карточку студии. Фотографии, на которых были видны номера телефонов, на сайт не попали.",
  },
  {
    title: "Отзывы — из карточки, без имён",
    text: `Цитаты взяты из публичных отзывов в ${business.reviews.source} и приведены дословно, без имён, адресов и деталей заказов. Рейтинг и количество оценок — из той же карточки, на ${formatDate(business.reviews.asOf)}. Сайт не собирает собственные оценки и не показывает выдуманных отзывов.`,
  },
  {
    title: "Оценки и предложения — без давления",
    text: "На сайте нет счётчиков «150+ проектов», таймеров и всплывающих окон. Медианы цен, сроков и гарантий здесь тоже нет: о том, чего студия публично не сообщала, концепт молчит.",
  },
];

/**
 * Provenance page: explains the demo mode, the sources and every block that is
 * deliberately switched off. Linked from the footer as «Как устроен этот концепт».
 */
export default function PrivacyPage() {
  return (
    <div className="section">
      {
        // Страница-документ: WebPage с честным описанием, без выдуманных полей.
      }
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Как устроен этот концепт",
            description:
              "Из каких открытых источников собраны данные концепта, что не публикуется и какие блоки не показываются.",
            url: `${siteUrlBase}/privacy`,
            isPartOf: { "@type": "WebSite", name: business.studio.name, url: siteUrlBase },
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="shell">
        <div className="grid gap-6 border-t border-[var(--rule)] pt-7 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="eyebrow">Документ</p>
            <h1 className="mt-4 font-display text-h2 font-medium text-ink">
              Как устроен этот концепт
            </h1>
          </div>
          <div className="lg:col-span-8 lg:pt-1">
            <p className="max-w-[64ch] font-sans text-lead leading-normal text-ink/72">
              Коротко и без юридического тумана: откуда взялись данные, что здесь можно увидеть и
              почему некоторых привычных блоков на странице нет.
            </p>
            {isDemo ? (
              <p className="mt-5 inline-flex items-center gap-2 border border-brass px-3 py-1.5 font-sans text-micro uppercase text-brass">
                Демо-концепт · не индексируется
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-14 grid gap-x-10 gap-y-10 lg:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.title} className="reveal border-t border-[var(--rule)] pt-6">
              <dt className="font-display text-h3 text-ink">{rule.title}</dt>
              <dd className="mt-3 max-w-[62ch] font-sans text-[0.9375rem] leading-relaxed text-ink/75">
                {rule.text}
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="disabled-title" className="mt-16">
          <h2 id="disabled-title" className="font-display text-h3 text-ink">
            Какие блоки выключены и почему
          </h2>
          <p className="mt-3 max-w-[70ch] font-sans text-[0.9375rem] leading-relaxed text-ink/75">
            Пустых разделов на странице нет: если для блока не нашлось подтверждённых данных, он не
            рендерится. Ниже — список того, что снято с публикации, и причина.
          </p>
          <dl className="mt-8">
            {business.sections.disabled.map((section) => (
              <div
                key={section.id}
                className="reveal border-t border-[var(--rule)] py-5 sm:grid sm:grid-cols-12 sm:gap-8"
              >
                <dt className="font-sans text-micro uppercase text-brass sm:col-span-3">
                  {section.id === "pricing"
                    ? "Цены"
                    : section.id === "estimator"
                      ? "Калькулятор"
                      : section.id === "before-after"
                        ? "До и после"
                        : section.id === "team-roster"
                          ? "Состав команды"
                          : section.id}
                </dt>
                <dd className="mt-2 max-w-[70ch] font-sans text-[0.9375rem] leading-relaxed text-ink/75 sm:col-span-9 sm:mt-0">
                  {section.reason}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="sources-title" className="mt-16">
          <h2 id="sources-title" className="font-display text-h3 text-ink">
            Источники
          </h2>
          <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            <li className="border-t border-[var(--rule)] pt-4">
              <p className="font-sans text-[0.9375rem] text-ink">
                Карточка студии в {business.reviews.source}
              </p>
              <p className="mt-1.5 font-sans text-[0.8125rem] leading-relaxed text-muted">
                Адрес, график, координаты, рейтинг и отзывы, галерея, проектные листы с площадями и
                стилями.
              </p>
              <a
                href={business.contacts.map2gis}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline mt-2 inline-block font-sans text-[0.8125rem]"
              >
                Открыть карточку
              </a>
            </li>
            <li className="border-t border-[var(--rule)] pt-4">
              <p className="font-sans text-[0.9375rem] text-ink">
                Instagram {business.social.instagram.handle}
              </p>
              <p className="mt-1.5 font-sans text-[0.8125rem] leading-relaxed text-muted">
                Объекты, фотографии и подписи, число подписчиков и публикаций, состав услуг.
              </p>
              <a
                href={business.contacts.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline mt-2 inline-block font-sans text-[0.8125rem]"
              >
                Открыть профиль
              </a>
            </li>
          </ul>
          <p className="mt-6 max-w-[70ch] font-sans text-[0.8125rem] leading-relaxed text-muted">
            Полная таблица источников по каждому факту — в файле <code>content/business.json</code>,
            раздел <code>_sources</code>; отчёт о сборе данных — в <code>DATA_REPORT.md</code> рядом
            с проектом.
          </p>
        </section>

        <div className="reveal mt-16 flex flex-col gap-4 border-t border-[var(--rule)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[58ch] font-sans text-[0.875rem] leading-relaxed text-ink/75">
            Хотите обсудить сам концепт или работу студии — начните с WhatsApp: этот канал ведёт
            напрямую в студию.
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

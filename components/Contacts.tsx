import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { OpenStatus } from "@/components/OpenStatus";
import { WhatsAppMark } from "@/components/Marks";
import { formatDate } from "@/lib/format";
import { whatsappDefault } from "@/lib/whatsapp";

/**
 * Contacts: address, schedule and two map links. No embedded map and no phone
 * number — the concept keeps every conversation inside messengers.
 */
export function Contacts() {
  const { contacts } = business;

  return (
    <section id="contacts" aria-labelledby="contacts-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="contacts-title"
          eyebrow="Контакты"
          title="Офис и связь"
          lede="Быстрее всего — WhatsApp или Instagram: там же проходит согласование планировок и материалов. Бриф на этой странице сразу открывает чат с готовым сообщением."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">Адрес</p>
            <p className="mt-3 font-display text-[1.5rem] leading-tight text-ink">
              {contacts.city}, {contacts.address}
            </p>
            <p className="mt-3 font-sans text-[0.9375rem] leading-relaxed text-ink/75">
              {contacts.floor}, офис {contacts.office}
              <br />
              {contacts.district}
              {contacts.postcode ? ` · ${contacts.postcode}` : null}
            </p>

            <div className="mt-7 border-t border-[var(--rule)] pt-6">
              <p className="eyebrow">График работы</p>
              <dl className="mt-3 space-y-2">
                {contacts.hours.map((row) => (
                  <div key={row.days} className="flex items-baseline justify-between gap-6">
                    <dt className="font-sans text-[0.9375rem] text-ink/75">{row.days}</dt>
                    <dd className="font-sans text-[0.9375rem] text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <OpenStatus />
              <p className="mt-1 font-sans text-[0.75rem] text-muted">
                Время — астанинское (UTC+5).
              </p>
            </div>
          </div>

          <div className="reveal lg:col-span-7">
            <p className="eyebrow">Связаться</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href="/#brief" className="btn btn-brass w-full sm:col-span-2">
                Рассчитать проект
              </a>
              <a
                href={whatsappDefault}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline w-full"
              >
                <WhatsAppMark className="h-[18px] w-[18px]" />
                Написать в WhatsApp
              </a>
              <a
                href={contacts.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline w-full"
              >
                Instagram студии
              </a>
            </div>
            <p className="mt-3 font-sans text-[0.8125rem] leading-relaxed text-muted">
              Телефон и другие контакты не публикуем на концепте — используйте мессенджеры либо
              карточку студии в {business.reviews.source}.
            </p>

            <p className="eyebrow mt-9">Как добраться</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={contacts.map2gis}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center justify-between gap-4 border border-[var(--rule)] px-4 font-sans text-[0.9375rem] text-ink transition-colors hover:border-ink"
              >
                Карточка в {business.reviews.source}
                <span aria-hidden className="text-brass">
                  ↗
                </span>
              </a>
              <a
                href={contacts.mapGoogle}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center justify-between gap-4 border border-[var(--rule)] px-4 font-sans text-[0.9375rem] text-ink transition-colors hover:border-ink"
              >
                Открыть в Google Maps
                <span aria-hidden className="text-brass">
                  ↗
                </span>
              </a>
            </div>

            <p className="mt-6 border-t border-[var(--rule)] pt-6 font-sans text-[0.8125rem] leading-relaxed text-muted">
              Адрес и координаты взяты из карточки студии в {business.reviews.source} (данные на{" "}
              {formatDate(business.reviews.asOf)}). Если офис переехал, актуальный адрес всегда есть
              в самой карточке — ссылка выше.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

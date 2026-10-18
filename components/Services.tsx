import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { WhatsAppMark } from "@/components/Marks";
import { whatsappDefault, whatsappForService } from "@/lib/whatsapp";

/**
 * Services exactly as the studio lists them. No price is ever printed here:
 * the studio publishes no rates, so the only honest call to action is a chat.
 */
export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="services-title"
          eyebrow="Услуги"
          title="Что делает студия"
          lede="Направления перечислены в профиле студии: от планировочного решения до комплектации объекта. Стоимость зависит от площади и состава работ — студия считает её после брифа и замера."
        />

        <ol className="mt-12">
          {business.services.map((service, index) => (
            <li
              key={service.id}
              className="reveal grid gap-x-8 gap-y-4 border-t border-[var(--rule)] py-8 lg:grid-cols-12 lg:py-10"
            >
              <p className="font-sans text-micro uppercase text-brass lg:col-span-1">
                {String(index + 1).padStart(2, "0")}
              </p>

              <div className="lg:col-span-5">
                <h3 className="font-display text-h3 text-ink">{service.title}</h3>
                <p className="mt-3 max-w-[52ch] font-sans text-[0.9375rem] leading-relaxed text-ink/72">
                  {service.description}
                </p>
              </div>

              <div className="lg:col-span-4">
                {service.includes.length ? (
                  <ul className="space-y-2.5">
                    {service.includes.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 font-sans text-[0.875rem] leading-snug text-ink/75"
                      >
                        <span
                          aria-hidden
                          className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rotate-45 bg-brass"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="max-w-[44ch] font-sans text-[0.875rem] leading-relaxed text-muted">
                    Точный состав под ваш объект студия собирает на брифе.
                  </p>
                )}
              </div>

              <div className="lg:col-span-2 lg:text-right">
                <a
                  href={whatsappForService(service.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline inline-flex min-h-[48px] items-center gap-2 font-sans text-label uppercase"
                >
                  <WhatsAppMark className="h-4 w-4" />
                  Спросить в WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ol>

        <p className="reveal mt-8 max-w-[78ch] font-sans text-[0.8125rem] leading-relaxed text-muted">
          Публичных ставок за м² студия не публикует: во вкладке «Цены» карточки 2ГИС на момент
          сборки концепта все позиции отмечены «Цена не указана». Поэтому на сайте нет прайса и
          калькулятора — расчёт возможен только по вашей планировке.
        </p>

        <div className="reveal mt-7 flex flex-wrap items-center gap-3">
          <a href="/#brief" className="btn btn-solid">
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
        </div>
      </div>
    </section>
  );
}

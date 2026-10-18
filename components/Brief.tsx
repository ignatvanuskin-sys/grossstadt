import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { BriefForm } from "@/components/BriefForm";

/**
 * The brief section: three steps that end in a ready-made WhatsApp message.
 * There is no calculator because the studio publishes no rates.
 */
export function Brief() {
  return (
    <section id="brief" aria-labelledby="brief-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="brief-title"
          eyebrow="Заявка"
          title="Рассчитать проект"
          lede="Ставок за м² студия не публикует — стоимость зависит от площади и состава работ. Ответьте на три коротких вопроса: бриф превратится в сообщение, а студия посчитает по вашей планировке."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <BriefForm />
          </div>

          <aside className="reveal lg:col-span-4">
            <p className="eyebrow">Что дальше</p>
            <ol className="mt-4 space-y-4">
              {[
                "Сообщение с брифом уходит в WhatsApp студии — отправляете его прямо из чата.",
                "Студия уточняет детали и считает стоимость и срок по вашему объекту.",
                "Если удобнее голосом — согласуете встречу в офисе на шоссе Коргалжын, 13Б.",
              ].map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="font-sans text-micro uppercase text-brass">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-sans text-[0.9375rem] leading-relaxed text-ink/75">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-7 border-t border-[var(--rule)] pt-5 font-sans text-[0.8125rem] leading-relaxed text-muted">
              Ответ — в течение дня, {business.contacts.hoursText}. Публичных ставок и прайс-листа
              у студии нет, поэтому вместо автоматического расчёта здесь живой человек — так
              точнее.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

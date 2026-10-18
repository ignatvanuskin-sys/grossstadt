import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";
import { plural } from "@/lib/format";

/**
 * The working process with its proof attached: every stage carries the quote
 * from the studio's own publication or from a public review that backs it up.
 */
export function Process() {
  return (
    <section id="process" aria-labelledby="process-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="process-title"
          eyebrow="Процесс"
          title="Как идёт работа"
          lede={`${business.process.length} ${plural(
            business.process.length,
            "этап",
            "этапа",
            "этапов",
          )} так, как их описывает сама студия. Под каждым этапом — подтверждение из открытых публикаций и отзывов.`}
        />

        <ol className="mt-12 grid gap-x-10 gap-y-9 md:grid-cols-2 xl:grid-cols-3">
          {business.process.map((step, index) => (
            <li key={step.title} className="reveal border-t border-[var(--rule)] pt-6">
              <p className="font-sans text-micro uppercase text-brass">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-[1.1875rem] leading-snug text-ink">
                {step.title}
              </h3>
              <p className="mt-2.5 font-sans text-[0.9375rem] leading-relaxed text-ink/72">
                {step.description}
              </p>

              <details className="group mt-4">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 font-sans text-micro uppercase text-muted transition-colors hover:text-ink">
                  <span
                    aria-hidden
                    className="inline-block h-[5px] w-[5px] rotate-45 bg-brass transition-transform duration-300 group-[[open]]:rotate-[135deg]"
                  />
                  Подтверждение
                </summary>
                <p className="mt-1 max-w-[52ch] border-l border-[var(--rule)] pl-4 font-sans text-[0.8125rem] leading-relaxed text-muted">
                  {step.evidence}
                </p>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

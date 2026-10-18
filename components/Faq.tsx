import { business } from "@/lib/business";
import { SectionHead } from "@/components/SectionHead";

/**
 * Questions and answers drawn from the studio's public materials. Native
 * `<details>` keeps it accessible without shipping a single line of JS.
 */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="section defer-paint">
      <div className="shell">
        <SectionHead
          id="faq-title"
          eyebrow="Вопросы"
          title="Коротко о главном"
          lede="Ответы собраны по публичным материалам студии: там, где публичных данных нет, так и написано — вместо цифры вы получите не догадку, а приглашение спросить."
        />

        <div className="mt-12 lg:max-w-[980px]">
          {business.faq.map((item) => (
            <details key={item.q} className="reveal group border-t border-[var(--rule)] py-5">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-baseline justify-between gap-6 font-display text-[1.125rem] leading-snug text-ink transition-colors hover:text-brass lg:text-[1.3125rem] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="mt-1 shrink-0 font-sans text-[1.125rem] leading-none text-brass transition-transform duration-300 group-[[open]]:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <p className="mt-3 max-w-[72ch] font-sans text-[0.9375rem] leading-relaxed text-ink/75">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

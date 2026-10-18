type SectionHeadProps = {
  id?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
  invert?: boolean;
  /**
   * Уровень заголовка. По умолчанию h2 — на главной главный заголовок у героя.
   * На отдельной странице (каталог) этот же блок становится h1: у страницы
   * должен быть ровно один h1, иначе страдает и SEO, и навигация скринридером.
   */
  as?: "h1" | "h2";
};

/** Consistent editorial section header: micro eyebrow, display title, lede. */
export function SectionHead({
  id,
  eyebrow,
  title,
  lede,
  aside,
  invert = false,
  as: Heading = "h2",
}: SectionHeadProps) {
  return (
    <div className="reveal grid gap-6 border-t border-[var(--rule)] pt-7 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4">
        <p className="eyebrow">{eyebrow}</p>
        <Heading
          id={id}
          className={`mt-4 font-display text-h2 font-medium ${invert ? "text-[#F2F0EB]" : "text-ink"}`}
        >
          {title}
        </Heading>
      </div>
      <div className="lg:col-span-8 lg:pt-1">
        {lede ? (
          <p
            className={`max-w-[64ch] font-sans text-lead leading-normal ${
              invert ? "text-[#F2F0EB]/72" : "text-ink/72"
            }`}
          >
            {lede}
          </p>
        ) : null}
        {aside ? <div className="mt-6">{aside}</div> : null}
      </div>
    </div>
  );
}

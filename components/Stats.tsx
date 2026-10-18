import { stats } from "@/lib/business";

export function Stats() {
  return (
    <section aria-label="Студия в цифрах" className="border-b border-[var(--rule)]">
      <div className="shell">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse border-[var(--rule)] py-8 lg:py-10 ${
                index % 2 === 1 ? "border-l pl-5 sm:pl-8" : "pr-5 sm:pr-8"
              } ${index >= 2 ? "border-t lg:border-t-0" : ""} ${
                index === 2 ? "lg:border-l lg:pl-8" : ""
              } ${index === 1 || index === 3 ? "lg:pl-8" : ""}`}
            >
              <dt className="mt-0 font-sans text-[0.875rem] leading-snug text-ink/70">
                {stat.label}
              </dt>
              <dd>
                <span className="block font-display text-[2.5rem] leading-none tracking-[-0.02em] text-ink lg:text-[3.25rem]">
                  {stat.value}
                </span>
                <span className="mt-1 block font-sans text-[0.75rem] text-muted">{stat.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

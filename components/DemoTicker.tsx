import { business, isDemo } from "@/lib/business";

/**
 * Demo-mode disclosure. Stays visible at the top of every page so nobody can
 * mistake the concept for the studio's live site.
 */
export function DemoTicker() {
  if (!isDemo) return null;

  return (
    <div className="on-night border-b border-[var(--rule-invert)]">
      <div className="shell flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
        <span className="inline-flex items-center gap-2 border border-[#D9BC85] px-2 py-[3px] font-sans text-micro uppercase text-[#D9BC85]">
          Демо-концепт
        </span>
        <p className="font-sans text-[0.75rem] leading-snug text-[#F2F0EB]/70">
          Демонстрационный концепт. Материалы принадлежат студии {business.studio.name}.
        </p>
      </div>
    </div>
  );
}

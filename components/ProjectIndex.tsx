import type { Project } from "@/lib/schema";
import { formatArea } from "@/lib/format";

/**
 * The catalogue as an editorial index: one hairline row per object with the
 * studio's own numbers. Deliberately image-free — the visual catalogue lives on
 * /projects, and keeping the home page light is what keeps it fast on mobile.
 */
export function ProjectIndex({ projects }: { projects: Project[] }) {
  return (
    <ol>
      <li
        aria-hidden
        className="hidden border-b border-[var(--rule)] pb-3 font-sans text-micro uppercase text-muted sm:grid sm:grid-cols-12 sm:gap-x-6"
      >
        <span className="sm:col-span-1">№</span>
        <span className="sm:col-span-5">Объект</span>
        <span className="sm:col-span-2">Площадь</span>
        <span className="sm:col-span-2">Стиль</span>
        <span className="sm:col-span-2">Категория</span>
      </li>

      {projects.map((project, index) => (
        <li key={project.slug} className="reveal">
          <a
            href={`/projects/${project.slug}`}
            className="group grid gap-x-6 gap-y-1 border-t border-[var(--rule)] py-4 transition-colors sm:grid-cols-12 sm:items-baseline sm:py-5"
          >
            <span className="font-sans text-micro uppercase text-brass sm:col-span-1">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="sm:col-span-5">
              <span className="font-display text-[1.0625rem] leading-snug text-ink transition-colors group-hover:text-brass">
                {project.title}
              </span>
              {project.subtitle ? (
                <span className="mt-0.5 block font-sans text-[0.8125rem] text-muted">
                  {project.subtitle}
                </span>
              ) : null}
            </span>

            <span className="font-sans text-[0.875rem] text-ink/70 sm:col-span-2">
              {formatArea(project.areaM2) ?? "—"}
            </span>
            <span className="font-sans text-[0.875rem] text-ink/70 sm:col-span-2">
              {project.style ?? "—"}
            </span>
            <span className="flex items-baseline justify-between gap-3 font-sans text-[0.8125rem] text-muted sm:col-span-2">
              {project.category}
              <span
                aria-hidden
                className="text-brass transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

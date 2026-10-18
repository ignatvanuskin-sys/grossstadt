"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project, ProjectImage } from "@/lib/schema";
import { FillImage, KindBadge } from "@/components/Figure";
import { formatArea } from "@/lib/format";

const ProjectLightbox = dynamic(() => import("@/components/ProjectLightbox"), {
  ssr: false,
  loading: () => null,
});

type Variant = "featured" | "catalog";

type ProjectGridProps = {
  projects: Project[];
  variant?: Variant;
  /** Initial category filter, e.g. from ?category= */
  initialCategory?: string;
  withFilters?: boolean;
};

const cardSizes: Record<Variant, string> = {
  featured: "(min-width: 1280px) 30vw, (min-width: 768px) 44vw, 92vw",
  catalog: "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 92vw",
};

const gridClass: Record<Variant, string> = {
  featured: "grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3",
  catalog: "grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

function metaLine(project: Project, image: ProjectImage): string {
  const parts: string[] = [];
  const area = formatArea(project.areaM2);
  if (area) parts.push(area);
  if (project.style) parts.push(project.style);
  if (project.city !== "Астана") parts.push(project.city);
  if (!parts.length) parts.push(project.type);
  return parts.join(" · ");
}

export function ProjectGrid({
  projects,
  variant = "catalog",
  initialCategory,
  withFilters = false,
}: ProjectGridProps) {
  const categories = useMemo(() => {
    const values = new Set(projects.map((project) => project.category));
    return ["Все", ...values];
  }, [projects]);

  const [category, setCategory] = useState(
    initialCategory && categories.includes(initialCategory) ? initialCategory : "Все",
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const visible = useMemo(
    () => (category === "Все" ? projects : projects.filter((p) => p.category === category)),
    [category, projects],
  );

  const close = useCallback(() => {
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setActiveIndex(null);
      setClosing(false);
      closeTimer.current = null;
      /*
       * Возвращаем фокус туда, откуда открыли просмотр: без этого после
       * Escape/Tab-выхода фокус падал в body, и клавиатурный пользователь
       * терял позицию в каталоге.
       */
      triggerRef.current?.focus();
    }, 170);
  }, []);

  const open = useCallback((index: number, trigger: HTMLButtonElement) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setClosing(false);
    }
    triggerRef.current = trigger;
    setActiveIndex(index);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const step = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        const next = (current + delta + visible.length) % visible.length;
        return next;
      });
    },
    [visible.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeIndex]);

  const active = activeIndex === null ? null : visible[activeIndex] ?? null;

  return (
    <div>
      {withFilters ? (
        <div className="no-scrollbar snap-row -mx-[var(--shell-pad)] mb-9 flex gap-2 overflow-x-auto px-[var(--shell-pad)] pb-1">
          {categories.map((value) => {
            const count =
              value === "Все"
                ? projects.length
                : projects.filter((project) => project.category === value).length;
            const isActive = value === category;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCategory(value);
                  setActiveIndex(null);
                }}
                aria-pressed={isActive}
                className={`flex min-h-[48px] shrink-0 items-center gap-2 whitespace-nowrap border px-4 font-sans text-label uppercase transition-colors duration-300 active:scale-[0.98] ${
                  isActive
                    ? "border-ink bg-ink text-paper"
                    : "border-[var(--rule)] text-ink/70 hover:border-ink hover:text-ink"
                }`}
              >
                {value}
                <span className={isActive ? "text-paper/55" : "text-muted"}>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={gridClass[variant]}>
        {visible.map((project, index) => {
          const cover = project.images[0];
          const isFirstFeatured = variant === "featured" && index === 0;

          return (
            <figure key={project.slug} className="reveal group flex flex-col">
              <button
                type="button"
                onClick={(event) => open(index, event.currentTarget)}
                aria-label={`Открыть проект «${project.title}»`}
                className="frame frame-hover relative block w-full cursor-zoom-in text-left"
                style={{ aspectRatio: isFirstFeatured ? 1.15 : 0.8 }}
              >
                <FillImage
                  src={cover.src}
                  alt={cover.caption}
                  sizes={isFirstFeatured ? "(min-width: 1280px) 46vw, 92vw" : cardSizes[variant]}
                  position="50% 42%"
                  quality={70}
                />
                <span
                  aria-hidden
                  className="frame-hint pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(16,16,16,0.72)] to-transparent pb-4 pl-4 pr-4 pt-12 font-sans text-micro uppercase text-[#F2F0EB]"
                >
                  Быстрый просмотр
                </span>
              </button>

              <figcaption className="mt-4 flex flex-1 flex-col">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <KindBadge kind={cover.kind} />
                  <span className="font-sans text-[0.75rem] text-muted">{project.category}</span>
                </div>

                <h3 className="mt-2.5 font-display text-[1.1875rem] leading-snug text-ink">
                  <a
                    href={`/projects/${project.slug}`}
                    className="link-underline group-hover:decoration-[#8A6C3A]"
                  >
                    {project.title}
                  </a>
                </h3>

                {project.subtitle ? (
                  <p className="mt-1 font-sans text-[0.875rem] text-ink/60">{project.subtitle}</p>
                ) : null}

                <p className="mt-2 font-sans text-[0.8125rem] text-muted">{metaLine(project, cover)}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="border border-[var(--rule)] p-8 text-center font-sans text-[0.9375rem] text-muted">
          В этой категории пока нет опубликованных проектов.
        </p>
      ) : null}

      {active ? (
        <ProjectLightbox
          project={active}
          closing={closing}
          index={activeIndex ?? 0}
          total={visible.length}
          onClose={close}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      ) : null}
    </div>
  );
}

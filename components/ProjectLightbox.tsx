"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Project } from "@/lib/schema";
import { KindBadge } from "@/components/Figure";
import { WhatsAppMark } from "@/components/Marks";
import { assetBySrc } from "@/lib/images";
import { formatArea } from "@/lib/format";
import { whatsappForProject } from "@/lib/whatsapp";

type LightboxProps = {
  project: Project;
  closing: boolean;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Quick look at a project: every published image with its "визуализация"
 * label, the studio's own description, the facts table and two ways out —
 * WhatsApp or the project page.
 */
export default function ProjectLightbox({
  project,
  closing,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    /*
     * Клавиатура внутри модального окна: Escape и стрелки листают, Tab ходит
     * по кругу. Без ловушки фокуса Tab уводил на ссылки подложки — страница
     * формально заблокирована для скролла, а фокус продолжал по ней гулять.
     */
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        onNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        onPrev();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active !== null && dialogRef.current.contains(active);

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  const area = formatArea(project.areaM2);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} — просмотр проекта`}
      className="fixed inset-0 z-[70]"
    >
      {/* Декоративная подложка: кадры и описание занимают весь экран, поэтому
          закрыть просмотр можно только кнопкой «Закрыть» (Escape — с клавиатуры).
          Раньше это была кнопка на весь экран, до которой нельзя было дотянуться. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#0C0C0C]"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 0.96 }}
        transition={{ duration: closing ? 0.18 : 0.24 }}
      />

      <motion.div
        className="relative flex h-full flex-col"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: closing ? 0 : 1, y: closing ? 12 : 0 }}
        transition={{ duration: closing ? 0.16 : 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="on-night flex items-center justify-between gap-4 border-b border-[var(--rule-invert)] px-4 py-3 sm:px-6">
          <p className="min-w-0 font-sans text-micro uppercase text-[#F2F0EB]/60">
            {index + 1} / {total} · {project.category}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="flex h-12 w-12 items-center justify-center border border-[var(--rule-invert)] text-[#F2F0EB] transition-colors hover:border-[#F2F0EB]"
              aria-label="Предыдущий проект"
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex h-12 w-12 items-center justify-center border border-[var(--rule-invert)] text-[#F2F0EB] transition-colors hover:border-[#F2F0EB]"
              aria-label="Следующий проект"
            >
              <span aria-hidden>→</span>
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="ml-1 flex h-12 items-center gap-2 border border-[var(--rule-invert)] px-4 font-sans text-micro uppercase text-[#F2F0EB] transition-colors hover:border-[#F2F0EB]"
            >
              Закрыть <span aria-hidden>✕</span>
            </button>
          </div>
        </div>

        <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1.55fr_1fr] lg:overflow-hidden">
          <div className="space-y-6 p-4 sm:p-6 lg:overflow-y-auto">
            {project.images.map((image) => {
              const asset = assetBySrc(image.src);
              return (
              <figure key={image.src} className="border border-[var(--rule-invert)]">
                {/* Оптимизатор Next: оригинал кадра весит 100–200 КБ, на телефоне
                    это заметная разница при листании лайтбокса. */}
                <Image
                  src={image.src}
                  alt={image.caption}
                  width={asset.width}
                  height={asset.height}
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  quality={75}
                  className="h-auto w-full bg-night-2"
                />
                <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-3">
                  <span className="max-w-[60ch] font-sans text-[0.8125rem] leading-snug text-[#F2F0EB]/70">
                    {image.caption}
                  </span>
                  <KindBadge kind={image.kind} tone="dark" />
                </figcaption>
              </figure>
              );
            })}
          </div>

          <div className="on-night-2 border-t border-[var(--rule-invert)] p-5 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <h2 className="font-display text-h3 text-[#F2F0EB]">{project.title}</h2>
            {project.subtitle ? (
              <p className="mt-2 font-sans text-[0.9375rem] text-[#F2F0EB]/62">{project.subtitle}</p>
            ) : null}

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
              {area ? (
                <div>
                  <dt className="eyebrow">Площадь</dt>
                  <dd className="mt-1.5 font-display text-[1.25rem] text-[#F2F0EB]">{area}</dd>
                </div>
              ) : null}
              {project.style ? (
                <div>
                  <dt className="eyebrow">Стиль</dt>
                  <dd className="mt-1.5 font-display text-[1.25rem] text-[#F2F0EB]">{project.style}</dd>
                </div>
              ) : null}
              <div>
                <dt className="eyebrow">Город</dt>
                <dd className="mt-1.5 font-sans text-[0.9375rem] text-[#F2F0EB]/85">{project.city}</dd>
              </div>
              {project.status ? (
                <div>
                  <dt className="eyebrow">Статус</dt>
                  <dd className="mt-1.5 font-sans text-[0.9375rem] text-[#F2F0EB]/85">{project.status}</dd>
                </div>
              ) : null}
            </dl>

            <p className="mt-7 font-sans text-[0.9375rem] leading-relaxed text-[#F2F0EB]/80">
              {project.summary}
            </p>

            <dl className="rule-invert mt-7 pt-6">
              {Object.entries(project.facts).map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-4 border-b border-[var(--rule-invert)] py-3 last:border-b-0">
                  <dt className="min-w-[11ch] font-sans text-micro uppercase text-[#F2F0EB]/60">{label}</dt>
                  <dd className="font-sans text-[0.9375rem] text-[#F2F0EB]/85">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={whatsappForProject(project.title, project.subtitle)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brass w-full"
              >
                <WhatsAppMark className="h-[18px] w-[18px]" />
                Обсудить похожий проект
              </a>
              <a href={`/projects/${project.slug}`} className="btn btn-outline-invert w-full">
                Открыть страницу проекта
              </a>
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline mt-1 font-sans text-[0.8125rem] text-[#F2F0EB]/55"
              >
                Источник: {new URL(project.sourceUrl).hostname.replace("www.", "")}
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

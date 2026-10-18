import { business } from "@/lib/business";
import { FillImage, KindBadge } from "@/components/Figure";
import { WhatsAppMark } from "@/components/Marks";
import { formatArea } from "@/lib/format";
import { whatsappDefault } from "@/lib/whatsapp";

const hero = business.projects.find((project) => project.slug === "athletic-city-living-room");
const heroImage = hero?.images[0];

/**
 * First screen. The frame is a full-bleed background and the copy sits on top of
 * a two-stop scrim: the shot leads, the text keeps AA contrast over it. This is
 * the phone-first layout — on small screens the hero is the whole first screen,
 * so the image is the first thing seen and the CTA stays one thumb reach away.
 *
 * The image is decorative here (alt="" + aria-hidden): its description lives in
 * the visible caption line below the copy, so the same frame is still labelled
 * «визуализация»/«реализация» and no screen reader reads the frame twice.
 */
export function Hero() {
  return (
    <section className="hero on-night relative isolate overflow-hidden" aria-labelledby="hero-title">
      {hero && heroImage ? (
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="hero-shot absolute inset-0">
            <FillImage
              src={heroImage.src}
              alt=""
              priority
              sizes="100vw"
              position="50% 42%"
              quality={80}
            />
          </div>
          <div className="hero-scrim absolute inset-0" />
        </div>
      ) : null}

      <div className="hero-inner shell py-14 lg:py-20">
        <div className="rise-in">
          <p className="eyebrow">
            Студия дизайна интерьера · {business.contacts.city}
          </p>

          <h1
            id="hero-title"
            className="mt-5 font-display text-h1 font-medium text-[#F2F0EB]"
          >
            {business.studio.tagline}
          </h1>

          {/*
           * Лид короткий и на телефоне мельче: первый экран обязан показать
           * заголовок и главную кнопку целиком. Полный список услуг живёт
           * в разделе «Услуги» — здесь он назван, а не расписан.
           */}
          <p className="mt-5 max-w-[46ch] font-sans text-[0.9375rem] leading-relaxed text-[#F2F0EB]/80 sm:mt-6 sm:text-[1.0625rem]">
            Проектируем жилые и коммерческие интерьеры: планировка, 3D-визуализация,
            документация, подбор материалов, комплектация, авторский надзор.
          </p>

          {/*
           * Иерархия первого экрана: главное действие — бриф («Рассчитать
           * проект»), он же открывает WhatsApp с готовым сообщением. Чат
           * остаётся вторым шагом, с узнаваемым глифом.
           */}
          <div className="rise-in rise-in-late mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <a href="#brief" className="btn btn-brass btn-lg w-full sm:w-auto">
              Рассчитать проект
            </a>
            <a
              href={whatsappDefault}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-invert w-full sm:w-auto"
            >
              <WhatsAppMark className="h-[18px] w-[18px]" />
              Написать в WhatsApp
            </a>
          </div>

          <dl className="mt-9 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Офис</dt>
              <dd className="mt-2 font-sans text-[0.9375rem] text-[#F2F0EB]/85">
                {business.contacts.address}, {business.contacts.floor}, офис {business.contacts.office}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Часы работы</dt>
              <dd className="mt-2 font-sans text-[0.9375rem] text-[#F2F0EB]/85">
                {business.contacts.hoursText}
              </dd>
            </div>
          </dl>

          {hero && heroImage ? (
            <p className="mt-9 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-[var(--rule-invert)] pt-4">
              <span className="font-sans text-[0.8125rem] text-[#F2F0EB]/75">
                На фоне — «{hero.title}»
                {hero.year ? `, реализация ${hero.year}` : ""}
                {formatArea(hero.areaM2) ? `, ${formatArea(hero.areaM2)}` : ""}
              </span>
              <KindBadge kind={heroImage.kind} tone="dark" />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

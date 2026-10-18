import { business, projectCategories, categoryPlural } from "@/lib/business";
import { WhatsAppMark } from "@/components/Marks";
import { formatDate } from "@/lib/format";
import { whatsappDefault } from "@/lib/whatsapp";

const columns = [
  {
    title: "Портфолио",
    links: [
      { href: "/#projects", label: "Избранные проекты" },
      { href: "/#catalog", label: "Каталог объектов" },
      { href: "/projects", label: "Все проекты" },
    ],
  },
  {
    title: "Студия",
    links: [
      { href: "/#services", label: "Услуги" },
      { href: "/#process", label: "Как идёт работа" },
      { href: "/#about", label: "О студии" },
      { href: "/#reviews", label: "Отзывы" },
    ],
  },
  {
    title: "Действия",
    links: [
      { href: "/#brief", label: "Рассчитать проект" },
      { href: "/#faq", label: "Вопросы и ответы" },
      { href: "/#contacts", label: "Контакты" },
      { href: "/privacy", label: "Как устроен этот концепт" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-night mt-20 border-t border-[var(--rule-invert)] pb-24 pt-16 lg:pb-16">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-[1.375rem] uppercase tracking-[0.2em] text-[#F2F0EB]">
              {business.studio.name}
            </p>
            <p className="mt-4 max-w-[30ch] font-display text-[1.5rem] leading-[1.15] text-[#F2F0EB]">
              {business.studio.tagline}
            </p>
            <p className="mt-6 font-sans text-[0.875rem] leading-relaxed text-[#F2F0EB]/62">
              {business.contacts.city}, {business.contacts.address}
              <br />
              {business.contacts.floor}, офис {business.contacts.office}
              <br />
              {business.contacts.district}
            </p>
            <p className="mt-4 font-sans text-[0.875rem] text-[#F2F0EB]/62">
              {business.contacts.hoursText}
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="eyebrow !text-[#F2F0EB]/60">{column.title}</p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="link-underline font-sans text-[0.9375rem] text-[#F2F0EB]/85"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-3">
          {projectCategories.map((category) => (
            <a
              key={category}
              href={`/projects?category=${encodeURIComponent(category)}`}
              className="font-sans text-micro uppercase text-[#F2F0EB]/60 transition-colors hover:text-[#D9BC85]"
            >
              {categoryPlural[category]}
            </a>
          ))}
        </div>

        <div className="rule-invert mt-12 pt-8 lg:flex lg:items-start lg:justify-between lg:gap-10">
          <div className="max-w-[62ch]">
            <p className="font-sans text-[0.875rem] leading-relaxed text-[#F2F0EB]/85">
              Демонстрационный концепт. Материалы принадлежат студии {business.studio.name}.
            </p>
            <p className="mt-3 font-sans text-[0.8125rem] leading-relaxed text-[#F2F0EB]/62">
              Данные и изображения собраны из публичных источников: карточка студии в {business.reviews.source} и
              публикации в Instagram. Актуально на {formatDate(business.reviews.asOf)}. Часть изображений —
              3D-визуализации; на каждом кадре это указано.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-0 lg:justify-end">
            <a href="/#brief" className="btn btn-brass">
              Рассчитать проект
            </a>
            <a
              href={whatsappDefault}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Написать в WhatsApp"
              className="btn btn-outline-invert btn-icon"
            >
              <WhatsAppMark className="h-5 w-5" />
            </a>
            <a
              href={business.contacts.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-invert"
            >
              Instagram
            </a>
          </div>
        </div>

        <p className="mt-10 font-sans text-[0.75rem] text-[#F2F0EB]/58">
          © {year} {business.studio.name}. Концепт-страница. Не является публичной офертой.
        </p>
      </div>
    </footer>
  );
}

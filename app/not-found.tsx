import { business } from "@/lib/business";
import { whatsappDefault } from "@/lib/whatsapp";

/**
 * 404. Links straight back to the portfolio and to the studio's chat, because a
 * dead end is the last place a visitor should have to think.
 */
export default function NotFound() {
  return (
    <div className="on-night flex min-h-[70vh] items-center">
      <div className="shell py-20">
        <p className="eyebrow">Ошибка 404</p>
        <h1 className="mt-5 max-w-[18ch] font-display text-h1 font-medium text-[#F2F0EB]">
          Такой страницы нет
        </h1>
        <p className="mt-6 max-w-[52ch] font-sans text-[1.0625rem] leading-relaxed text-[#F2F0EB]/72">
          Возможно, ссылка устарела. Портфолио, услуги и контакты {business.studio.name} — на
          главной странице; каталог объектов собран отдельно.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a href="/" className="btn btn-brass w-full sm:w-auto">
            На главную
          </a>
          <a href="/projects" className="btn btn-outline-invert w-full sm:w-auto">
            Все проекты
          </a>
          <a
            href={whatsappDefault}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-invert w-full sm:w-auto"
          >
            Написать в WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

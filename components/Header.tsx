"use client";

import { useEffect, useState } from "react";
import { business } from "@/lib/business";
import { WhatsAppMark } from "@/components/Marks";
import { whatsappDefault } from "@/lib/whatsapp";

const navItems = [
  { href: "/#projects", label: "Проекты" },
  { href: "/#catalog", label: "Каталог" },
  { href: "/#services", label: "Услуги" },
  { href: "/#process", label: "Процесс" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#contacts", label: "Контакты" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-paper/92 backdrop-blur-[6px]">
      <div className="shell flex h-[62px] items-center justify-between gap-6">
        <a href="/" className="group -my-4 flex items-baseline gap-2.5 py-4" aria-label={`${business.studio.name} — на главную`}>
          <span className="font-display text-[1.0625rem] font-medium uppercase leading-none tracking-[0.22em] text-ink">
            {business.studio.name}
          </span>
          <span className="hidden font-sans text-micro uppercase text-muted sm:inline">
            {business.contacts.city}
          </span>
        </a>

        <nav aria-label="Основная навигация" className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link font-sans text-label uppercase text-ink/75 transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/*
           * В шапке главное действие то же, что и на первом экране, —
           * расчёт проекта. Бриф заканчивается готовым сообщением в WhatsApp,
           * так что отдельная иконка мессенджера остаётся для тех, кто хочет
           * просто написать; воронку она не перетягивает.
           */}
          <a
            href="/#brief"
            className="btn btn-solid hidden !min-h-[44px] !px-4 sm:inline-flex"
          >
            Рассчитать проект
          </a>
          <a
            href={whatsappDefault}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Написать в WhatsApp"
            className="btn btn-outline btn-icon !min-h-[44px] !w-11"
          >
            <WhatsAppMark className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((value) => !value)}
            className="flex h-12 w-12 items-center justify-center border border-[var(--rule)] transition-colors hover:border-ink lg:hidden"
          >
            <span aria-hidden className="relative block h-[10px] w-[18px]">
              <span
                className={`absolute left-0 h-px w-full bg-ink transition-transform duration-300 ${open ? "top-1/2 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 h-px w-full bg-ink transition-transform duration-300 ${open ? "top-1/2 -rotate-45" : "top-full"}`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-[var(--rule)] bg-paper lg:hidden"
      >
        <nav aria-label="Мобильная навигация" className="shell flex flex-col py-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[52px] items-center border-b border-[var(--rule)] font-display text-[1.125rem] text-ink last:border-b-0"
            >
              {item.label}
            </a>
          ))}
          <a
            href="/#brief"
            onClick={() => setOpen(false)}
            className="btn btn-solid mt-3 w-full"
          >
            Рассчитать проект
          </a>
          <a
            href={whatsappDefault}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="btn btn-outline mt-2 w-full"
          >
            <WhatsAppMark className="h-[18px] w-[18px]" />
            Написать в WhatsApp
          </a>
          <p className="py-4 font-sans text-[0.75rem] leading-snug text-muted">
            {business.contacts.hoursText}
          </p>
        </nav>
      </div>
    </header>
  );
}

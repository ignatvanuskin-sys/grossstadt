"use client";

import { useEffect, useState } from "react";
import { WhatsAppMark } from "@/components/Marks";
import { whatsappDefault } from "@/lib/whatsapp";

/**
 * Мобильная панель действий. Главное действие — «Рассчитать проект»: бриф
 * собирает вводные и сам открывает WhatsApp с готовым сообщением, поэтому
 * именно он ведёт воронку. Мессенджер остаётся рядом компактной иконкой —
 * быстрый чат никуда не девается, но перестаёт перетягивать внимание с
 * главной кнопки.
 *
 * Панель не конкурирует с первым экраном: появляется только после скролла и
 * уезжает вниз, пока человек заполняет поля (там её место занимает клавиатура).
 */
export function StickyBar() {
  const [visible, setVisible] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sync = () =>
      setFieldFocused(
        document.activeElement instanceof HTMLElement &&
          !!document.activeElement.closest("input, textarea, select"),
      );
    const onFocusOut = () => window.setTimeout(sync, 0);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const shown = visible && !fieldFocused;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rule)] bg-paper/95 shadow-[0_-20px_44px_-32px_rgba(22,22,22,0.6)] backdrop-blur-[6px] transition-transform duration-300 ease-editorial lg:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!shown}
    >
      <div className="flex items-stretch gap-2 px-3 py-2.5">
        <a
          href="/#brief"
          className="btn btn-solid min-w-0 flex-1 !px-4"
          tabIndex={shown ? 0 : -1}
        >
          Рассчитать проект
        </a>
        <a
          href={whatsappDefault}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в WhatsApp"
          className="btn btn-outline btn-icon shrink-0"
          tabIndex={shown ? 0 : -1}
        >
          <WhatsAppMark className="h-[22px] w-[22px]" />
        </a>
      </div>
    </div>
  );
}

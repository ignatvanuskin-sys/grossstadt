"use client";

import { useEffect, useState } from "react";
import { business } from "@/lib/business";
import { astanaNow, scheduleWindow } from "@/lib/format";

const weekdayNames = [
  "в понедельник",
  "во вторник",
  "в среду",
  "в четверг",
  "в пятницу",
  "в субботу",
  "в воскресенье",
];

type Status = { open: boolean; text: string };

function computeStatus(now = new Date()): Status {
  const { day, hours, minutes } = astanaNow(now);
  const today = scheduleWindow(day);
  const minutesNow = hours * 60 + minutes;

  if (today && minutesNow >= today.open * 60 && minutesNow < today.close * 60) {
    return { open: true, text: `Сейчас открыто · до ${String(today.close).padStart(2, "0")}:00` };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDay = (day + offset) % 7;
    const window = scheduleWindow(nextDay);
    if (window) {
      const when =
        offset === 1 ? "завтра" : `${weekdayNames[nextDay]}`;
      return {
        open: false,
        text: `Сейчас закрыто · откроется ${when} в ${String(window.open).padStart(2, "0")}:00`,
      };
    }
  }

  return { open: false, text: "Сейчас закрыто" };
}

/**
 * Live "open / closed" line for the contacts block. The server renders the
 * plain schedule text, and the status is only swapped in after mount, so
 * hydration never mismatches and no-JS visitors still see the hours.
 */
export function OpenStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => setStatus(computeStatus());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="mt-2 font-sans text-[0.9375rem] text-ink/85">
      <span
        aria-hidden
        className={`mr-2 inline-block h-[7px] w-[7px] rounded-full align-middle ${
          status?.open ? "bg-brass" : "bg-muted/40"
        }`}
      />
      {status ? status.text : business.contacts.hoursText}
    </p>
  );
}

import { business } from "@/lib/business";

/**
 * Messenger links only. The site never prints the studio's phone number or any
 * email address — every call to action opens a chat with a pre-filled message.
 */

export const WHATSAPP_URL = business.contacts.whatsapp;
export const INSTAGRAM_URL = business.contacts.instagram;

export function whatsappLink(message: string): string {
  const base = WHATSAPP_URL.replace(/\/$/, "");
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const shortMessage =
  "Здравствуйте! Пишу с сайта. Хочу обсудить дизайн-проект.";

export const whatsappDefault = whatsappLink(shortMessage);

export function whatsappForProject(title: string, subtitle?: string | null): string {
  const suffix = subtitle ? ` (${subtitle})` : "";
  return whatsappLink(
    `Здравствуйте! Пишу с сайта по проекту «${title}»${suffix}. Хочу обсудить похожий интерьер — подскажите, с чего начать.`,
  );
}

export function whatsappForService(title: string): string {
  return whatsappLink(
    `Здравствуйте! Пишу с сайта. Интересует услуга «${title}» — расскажите, как она устроена и что нужно с моей стороны.`,
  );
}

export function whatsappForBrief(message: string): string {
  return whatsappLink(message);
}

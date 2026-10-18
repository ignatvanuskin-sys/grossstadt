import { z } from "zod";
import { business } from "@/lib/business";

/**
 * The brief flow. It replaces the calculator: with no published rates there is
 * nothing to calculate automatically, so the form collects exactly what the
 * studio needs for a real quote and hands the visitor off to WhatsApp.
 */

export const objectTypes = [
  "Квартира",
  "Частный дом",
  "Офис",
  "Кофейня или ресторан",
  "Магазин или салон",
  "Другое помещение",
] as const;

export const timelines = [
  "Готов начать сейчас",
  "В течение 1–2 месяцев",
  "Через полгода",
  "Пока изучаю варианты",
] as const;

export const briefServices = business.services
  .filter((service) => service.title !== "Экспресс-дизайн")
  .map((service) => service.title);

export const BriefSchema = z.object({
  objectType: z.enum(objectTypes, { message: "Выберите тип объекта" }),
  areaM2: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value.replace(",", ".")) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0 && value < 20000), {
      message: "Укажите площадь числом, например 86",
    }),
  city: z.string().trim().max(60).optional(),
  services: z.array(z.string()).min(1, { message: "Отметьте хотя бы одну задачу" }),
  timeline: z.enum(timelines, { message: "Выберите срок" }),
  name: z.string().trim().min(2, { message: "Как к вам обращаться?" }).max(60),
  comment: z.string().trim().max(600).optional(),
});

export type Brief = z.infer<typeof BriefSchema>;

export function composeBriefMessage(brief: Brief): string {
  const lines = [
    "Здравствуйте! Отправил(а) бриф с сайта.",
    "",
    `Объект: ${brief.objectType}`,
  ];

  if (brief.areaM2 !== null) lines.push(`Площадь: ${brief.areaM2} м²`);
  if (brief.city) lines.push(`Город: ${brief.city}`);
  lines.push(`Задачи: ${brief.services.join(", ")}`);
  lines.push(`Старт: ${brief.timeline}`);
  lines.push(`Имя: ${brief.name}`);
  if (brief.comment) lines.push(`Комментарий: ${brief.comment}`);
  lines.push("", "Подскажите, пожалуйста, стоимость и сроки по моему объекту.");

  return lines.join("\n");
}

/** Payload for the optional server-side relay (Telegram) — never contains secrets. */
export function composeLeadPayload(brief: Brief) {
  return {
    objectType: brief.objectType,
    areaM2: brief.areaM2,
    city: brief.city ?? null,
    services: brief.services,
    timeline: brief.timeline,
    name: brief.name,
    comment: brief.comment ?? null,
    message: composeBriefMessage(brief),
  };
}

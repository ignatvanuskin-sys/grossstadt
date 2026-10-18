"use client";

import { useMemo, useState } from "react";
import { WhatsAppMark } from "@/components/Marks";
import {
  BriefSchema,
  briefServices,
  composeBriefMessage,
  objectTypes,
  timelines,
  type Brief,
} from "@/lib/brief";
import { whatsappForBrief } from "@/lib/whatsapp";

/**
 * Three-step brief. It replaces the calculator: with no published rates there
 * is nothing to compute automatically, so the form gathers exactly what the
 * studio needs for a real quote and hands the visitor off to WhatsApp.
 * Validation is the same Zod schema the server uses.
 */
type FieldErrors = Partial<Record<keyof Brief | "form", string>>;

const stepTitles = ["Объект", "Задачи и сроки", "Контакты"];

export function BriefForm() {
  const [step, setStep] = useState(0);
  const [objectType, setObjectType] = useState<string>("");
  const [areaM2, setAreaM2] = useState("");
  const [city, setCity] = useState("Астана");
  const [services, setServices] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<string>("");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  const draft = useMemo(
    () => ({ objectType, areaM2, city, services, timeline, name, comment }),
    [objectType, areaM2, city, services, timeline, name, comment],
  );

  const toggleService = (value: string) => {
    setServices((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const validateStep = (index: number): boolean => {
    const result = BriefSchema.safeParse(draft);
    const issues: FieldErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form") as keyof FieldErrors;
        issues[key] = issues[key] ?? issue.message;
      }
    }

    const relevant: (keyof FieldErrors)[] =
      index === 0
        ? ["objectType", "areaM2"]
        : index === 1
          ? ["services", "timeline"]
          : ["name", "form"];

    const stepIssues: FieldErrors = {};
    for (const key of relevant) {
      if (issues[key]) stepIssues[key] = issues[key];
    }

    setErrors(stepIssues);
    return Object.keys(stepIssues).length === 0;
  };

  const submit = () => {
    const result = BriefSchema.safeParse(draft);
    if (!result.success) {
      const issues: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form") as keyof FieldErrors;
        issues[key] = issues[key] ?? issue.message;
      }
      setErrors(issues);
      const firstError = result.error.issues[0]?.path[0];
      if (firstError === "objectType" || firstError === "areaM2") setStep(0);
      else if (firstError === "services" || firstError === "timeline") setStep(1);
      else setStep(2);
      return;
    }

    const brief: Brief = result.data;
    const url = whatsappForBrief(composeBriefMessage(brief));
    setErrors({});

    // Open the chat inside the same user gesture, then relay a copy to the
    // studio's inbox if a relay is configured. Both paths degrade gracefully.
    window.open(url, "_blank", "noopener,noreferrer");
    setSentUrl(url);

    void fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
      keepalive: true,
    }).catch(() => undefined);
  };

  if (sentUrl) {
    return (
      <div className="border border-brass bg-surface p-6 sm:p-8" role="status">
        <p className="eyebrow">Бриф готов</p>
        <h3 className="mt-3 font-display text-h3 text-ink">Осталось отправить сообщение</h3>
        <p className="mt-3 max-w-[56ch] font-sans text-[0.9375rem] leading-relaxed text-ink/75">
          Мы открыли чат WhatsApp и вставили в него составленный бриф. Если окно не открылось —
          воспользуйтесь кнопкой ниже: сообщение уже собрано.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={sentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-brass w-full sm:w-auto"
          >
            <WhatsAppMark className="h-[18px] w-[18px]" />
            Открыть WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              setSentUrl(null);
              setStep(0);
            }}
            className="btn btn-outline w-full sm:w-auto"
          >
            Изменить данные
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 2) {
          if (validateStep(step)) setStep(step + 1);
          return;
        }
        submit();
      }}
      className="border border-[var(--rule)] bg-surface p-5 sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-sans text-micro uppercase text-brass">
          Шаг {step + 1} из 3 · {stepTitles[step]}
        </p>
        <div aria-hidden className="flex gap-1.5">
          {stepTitles.map((title, index) => (
            <span
              key={title}
              className={`h-[3px] w-8 sm:w-12 ${index <= step ? "bg-brass" : "bg-[var(--rule)]"}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-7" aria-live="polite">
        {step === 0 ? (
          <fieldset>
            <legend className="font-display text-h3 text-ink">Что проектируем?</legend>

            <div className="mt-6 flex flex-wrap gap-2">
              {objectTypes.map((value) => {
                const active = objectType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setObjectType(value)}
                    className={`min-h-[48px] border px-4 font-sans text-[0.875rem] transition-colors duration-300 ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-[var(--rule)] text-ink/75 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {errors.objectType ? (
              <p className="mt-3 font-sans text-[0.8125rem] text-brass">{errors.objectType}</p>
            ) : null}

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Площадь, м²</span>
                <input
                  inputMode="decimal"
                  value={areaM2}
                  onChange={(event) => setAreaM2(event.target.value)}
                  placeholder="Например, 86"
                  className="mt-2 min-h-[48px] w-full border border-[var(--rule)] bg-paper px-4 font-sans text-[1rem] text-ink placeholder:text-muted/70"
                />
                {errors.areaM2 ? (
                  <span className="mt-2 block font-sans text-[0.8125rem] text-brass">
                    {errors.areaM2}
                  </span>
                ) : (
                  <span className="mt-2 block font-sans text-[0.75rem] text-muted">
                    Можно пропустить, если площадь ещё неизвестна.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="eyebrow">Город</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="mt-2 min-h-[48px] w-full border border-[var(--rule)] bg-paper px-4 font-sans text-[1rem] text-ink placeholder:text-muted/70"
                />
              </label>
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend className="font-display text-h3 text-ink">Что нужно сделать?</legend>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {briefServices.map((value) => {
                const active = services.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleService(value)}
                    className={`flex min-h-[48px] items-center gap-3 border px-4 text-left font-sans text-[0.875rem] transition-colors duration-300 ${
                      active
                        ? "border-brass bg-brass-lit/25 text-ink"
                        : "border-[var(--rule)] text-ink/75 hover:border-ink hover:text-ink"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-[7px] w-[7px] rotate-45 ${
                        active ? "bg-brass" : "bg-muted/35"
                      }`}
                    />
                    {value}
                  </button>
                );
              })}
            </div>
            {errors.services ? (
              <p className="mt-3 font-sans text-[0.8125rem] text-brass">{errors.services}</p>
            ) : null}

            <p className="eyebrow mt-8">Когда планируете начать</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {timelines.map((value) => {
                const active = timeline === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTimeline(value)}
                    className={`min-h-[48px] border px-4 font-sans text-[0.875rem] transition-colors duration-300 ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-[var(--rule)] text-ink/75 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {errors.timeline ? (
              <p className="mt-3 font-sans text-[0.8125rem] text-brass">{errors.timeline}</p>
            ) : null}
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="font-display text-h3 text-ink">Как к вам обращаться?</legend>

            <div className="mt-6 grid gap-6">
              <label className="block">
                <span className="eyebrow">Имя</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className="mt-2 min-h-[48px] w-full border border-[var(--rule)] bg-paper px-4 font-sans text-[1rem] text-ink"
                />
                {errors.name ? (
                  <span className="mt-2 block font-sans text-[0.8125rem] text-brass">
                    {errors.name}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="eyebrow">Комментарий</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="Например: где находится объект, есть ли планировка от застройщика, что важно учесть"
                  className="mt-2 w-full border border-[var(--rule)] bg-paper px-4 py-3 font-sans text-[1rem] leading-relaxed text-ink placeholder:text-muted/70"
                />
              </label>
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--rule)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="btn btn-outline">
              Назад
            </button>
          ) : null}
          {step < 2 ? (
            <button type="submit" className="btn btn-solid">
              Далее
            </button>
          ) : (
            <button type="submit" className="btn btn-brass">
              <WhatsAppMark className="h-[18px] w-[18px]" />
              Отправить бриф
            </button>
          )}
        </div>
        <p className="font-sans text-[0.75rem] leading-relaxed text-muted">
          Бриф собирается в сообщение WhatsApp — отправить его нужно из чата. Сайт не хранит
          персональные данные.
        </p>
      </div>
    </form>
  );
}

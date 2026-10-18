import { NextResponse } from "next/server";
import { BriefSchema, composeBriefMessage } from "@/lib/brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional lead relay. The site works without it: the brief flow always opens
 * WhatsApp on the client. When TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set
 * the same message is copied to the studio's Telegram chat, otherwise the route
 * answers 200 with relayed: false so the client never sees an error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = BriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Бриф не прошёл проверку" }, { status: 422 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ ok: true, relayed: false, reason: "relay-not-configured" });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: composeBriefMessage(parsed.data),
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, relayed: false, reason: "relay-rejected" });
    }

    return NextResponse.json({ ok: true, relayed: true });
  } catch {
    return NextResponse.json({ ok: true, relayed: false, reason: "relay-unreachable" });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Метод не поддерживается" }, { status: 405 });
}

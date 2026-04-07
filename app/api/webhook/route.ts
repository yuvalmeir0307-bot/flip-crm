import { NextRequest, NextResponse } from "next/server";
import { findContactByPhone, updateContact, extractContactProps } from "@/lib/notion";
import { STATUS_HOT, STATUS_NO_DEAL, STATUS_REPLIED } from "@/lib/drip";
import { syncContactToOpenPhone } from "@/skills/syncContactToOpenPhone";

type ClassifyResult = "HOT" | "NO_DEAL" | "NEUTRAL";

/** Keyword-based reply classifier — no API calls, no rate limits */
function classifyReply(message: string): ClassifyResult {
  const lower = message.toLowerCase().trim();

  const noDeals = [
    "stop", "remove", "unsubscribe", "not interested", "dont contact",
    "don't contact", "do not contact", "leave me alone", "no thank you",
    "no thanks", "take me off", "opt out", "cease", "desist", "lawsuit",
    "report", "spam", "wrong number", "wrong person",
  ];

  const hots = [
    "interested", "yes", "call me", "sounds good", "tell me more",
    "what's the address", "whats the address", "send me", "want to know",
    "let's talk", "lets talk", "i have a", "i've got", "i got a",
    "can we", "would love", "great idea", "absolutely", "definitely",
    "for sure", "of course", "sure thing", "ok let's", "ok lets",
    "i do", "what deal", "what property", "more info", "reach out",
  ];

  if (noDeals.some((kw) => lower.includes(kw))) return "NO_DEAL";
  if (hots.some((kw) => lower.includes(kw))) return "HOT";
  return "NEUTRAL";
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const type: string = data?.type;

    let phone: string | null = null;
    let content = "";
    let eventType = "";

    if (type === "message.received") {
      phone = data?.data?.object?.from ?? data?.data?.from;
      content = data?.data?.object?.body ?? data?.data?.body ?? "";
      eventType = "SMS";
    } else if (type === "call.completed" && (data?.data?.object?.direction === "incoming" || data?.data?.direction === "incoming")) {
      phone = data?.data?.object?.from ?? data?.data?.from;
      content = "Incoming Call Detected";
      eventType = "Phone Call";
    }

    if (!phone) return NextResponse.json({ ok: true });

    const page = await findContactByPhone(phone);
    if (!page) return NextResponse.json({ ok: true });

    const contact = extractContactProps(page as Record<string, unknown>);

    // Sync the contact's name from Flip CRM to OpenPhone on every reply
    if (contact.name) {
      syncContactToOpenPhone(phone, contact.name).catch((e) =>
        console.error("[webhook] syncContactToOpenPhone failed:", e)
      );
    }

    if (contact.status !== "Drip Active" && contact.status !== "The Pool") {
      return NextResponse.json({ ok: true });
    }

    let newStatus = STATUS_HOT;

    if (eventType === "SMS") {
      const classification = await classifyReply(content);
      if (classification === "NO_DEAL") newStatus = STATUS_NO_DEAL;
      else if (classification === "HOT") newStatus = STATUS_HOT;
      else newStatus = STATUS_REPLIED; // NEUTRAL - mark as Replied for manual review
    }

    await updateContact(contact.id, {
      Status: { select: { name: newStatus } },
      "Last Reply": { rich_text: [{ text: { content: `[${eventType}] ${content}` } }] },
      "Last Contact": { date: { start: new Date().toISOString() } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ ok: true });
  }
}

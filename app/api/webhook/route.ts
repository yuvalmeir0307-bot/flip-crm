import { NextRequest, NextResponse } from "next/server";
import { findContactByPhone, updateContact, extractContactProps } from "@/lib/notion";
import { classifyReply } from "@/lib/gemini";
import { STATUS_HOT, STATUS_NO_DEAL, STATUS_REPLIED } from "@/lib/drip";
import { syncContactToOpenPhone } from "@/skills/syncContactToOpenPhone";
import { createLog } from "@/lib/logs";

const STOP_KEYWORDS = ["stop", "unsubscribe", "remove me", "opt out", "optout"];

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("[webhook] received:", JSON.stringify(data).slice(0, 300));
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

    console.log("[webhook] type:", type, "phone:", phone, "content:", content?.slice(0, 50));
    if (!phone) return NextResponse.json({ ok: true, reason: "no_phone" });

    const page = await findContactByPhone(phone);
    if (!page) return NextResponse.json({ ok: true });

    const contact = extractContactProps(page as Record<string, unknown>);

    // Sync the contact's name from Flip CRM to OpenPhone on every reply
    if (contact.name) {
      syncContactToOpenPhone(phone, contact.name).catch((e) =>
        console.error("[webhook] syncContactToOpenPhone failed:", e)
      );
    }

    // Always save the reply + update last contact date
    const updateProps: Record<string, unknown> = {
      "Last Reply": { rich_text: [{ text: { content: `[${eventType}] ${content}` } }] },
      "Last Contact": { date: { start: new Date().toISOString() } },
    };

    // Only classify & change status for Drip Active / The Pool contacts
    if (contact.status === "Drip Active" || contact.status === "The Pool") {
      if (eventType === "SMS") {
        try {
          const classification = await classifyReply(content);
          if (classification === "NO_DEAL") {
            updateProps.Status = { select: { name: STATUS_NO_DEAL } };
          } else if (classification === "HOT") {
            updateProps.Status = { select: { name: STATUS_HOT } };
          } else {
            updateProps.Status = { select: { name: STATUS_REPLIED } };
          }
        } catch {
          // If Gemini fails, still save the reply
        }
      } else {
        // Phone call — mark as HOT
        updateProps.Status = { select: { name: STATUS_HOT } };
      }
    }

    await updateContact(contact.id, updateProps);
    console.log("[webhook] saved reply for:", contact.name, contact.phone);

    // Detect STOP / unsubscribe requests
    if (eventType === "SMS") {
      const lowerContent = content.toLowerCase().trim();
      const isStop = STOP_KEYWORDS.some((kw) => lowerContent.includes(kw));
      if (isStop) {
        await createLog(
          `STOP received from ${contact.name}`,
          "STOP",
          contact.phone,
          `Message: "${content}"`
        );
      }
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ ok: true });
  }
}

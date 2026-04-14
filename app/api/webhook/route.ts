import { NextRequest, NextResponse } from "next/server";
import { findContactByPhone, updateContact, extractContactProps } from "@/lib/notion";
import { classifyReply } from "@/lib/gemini";
import { STATUS_NO_DEAL, STATUS_REPLIED, STATUS_POTENTIAL_DEAL, getPoolNeutralReply, getPoolNoDealReply } from "@/lib/drip";
import { sendSMS, getSenderByName, getSender } from "@/lib/openphone";
import { syncContactToOpenPhone } from "@/skills/syncContactToOpenPhone";
import { createLog } from "@/lib/logs";
import { runGuard } from "@/lib/send-guard";

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
    } else if (type === "call.completed" && (data?.data?.object?.direction === "inbound" || data?.data?.direction === "inbound" || data?.data?.object?.direction === "incoming" || data?.data?.direction === "incoming")) {
      const duration = data?.data?.object?.duration ?? data?.data?.duration ?? 0;
      if (duration < 10) {
        // Missed call — create an alert if we know the contact
        const missedPhone: string | null = data?.data?.object?.from ?? data?.data?.from ?? null;
        if (missedPhone) {
          const missedPage = await findContactByPhone(missedPhone).catch(() => null);
          if (missedPage) {
            const missedContact = extractContactProps(missedPage as Record<string, unknown>);
            await createLog(
              `📵 Missed call from ${missedContact.name}`,
              "MISSED_CALL",
              missedPhone,
              `Status: ${missedContact.status} — check Opportunities tab`
            ).catch(() => {});
          }
        }
        return NextResponse.json({ ok: true, reason: "missed_call" });
      }
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

    // Record which drip/pool step the agent was on when they replied (for insights graph)
    if (contact.status === "Drip Active" || contact.status === "The Pool") {
      const repliedAtStep = contact.status === "The Pool"
        ? `pool:${contact.poolStep}`
        : `drip:${Math.max(contact.dripStep - 1, 0)}`;
      updateProps["Replied At Step"] = { rich_text: [{ text: { content: repliedAtStep } }] };
    }

    // Classify & change status for Drip Active / The Pool contacts
    let poolAutoReply: string | null = null;

    if (contact.status === "Drip Active") {
      // Drip campaign reply → set Replied status
      if (eventType === "SMS") {
        try {
          const classification = await classifyReply(content);
          if (classification === "NO_DEAL") {
            updateProps.Status = { select: { name: STATUS_NO_DEAL } };
          } else {
            // HOT or NEUTRAL from drip → Replied
            updateProps.Status = { select: { name: STATUS_REPLIED } };
          }
        } catch {
          // If Gemini fails, still save the reply
        }
      } else {
        // Phone call from drip → Replied
        updateProps.Status = { select: { name: STATUS_REPLIED } };
      }
    } else if (contact.status === "The Pool") {
      // Pool reply → either Potential Deal (HOT) or polite auto-reply (anything else)
      if (eventType === "SMS") {
        try {
          const classification = await classifyReply(content);
          if (classification === "HOT") {
            updateProps.Status = { select: { name: STATUS_POTENTIAL_DEAL } };
          } else {
            // NO_DEAL or NEUTRAL — send polite message, keep in pool
            poolAutoReply = classification === "NO_DEAL"
              ? getPoolNoDealReply(contact.name)
              : getPoolNeutralReply(contact.name);
          }
        } catch {
          // If Gemini fails, still save the reply
        }
      } else {
        // Phone call from pool → Potential Deal
        updateProps.Status = { select: { name: STATUS_POTENTIAL_DEAL } };
      }
    }

    await updateContact(contact.id, updateProps);
    console.log("[webhook] saved reply for:", contact.name, contact.phone);

    // Send polite auto-reply for non-HOT pool responses
    if (poolAutoReply) {
      try {
        const guard = runGuard(poolAutoReply, contact.lastContact);
        if (!guard.ok) {
          console.log("[webhook] auto-reply blocked:", guard.reason);
          await createLog(
            `⛔ Auto-reply blocked: ${contact.name}`,
            "BLOCKED",
            contact.phone,
            `Pool auto-reply | ${guard.reason}`
          ).catch(() => {});
        } else {
          const senderPhone = contact.assignedTo ? getSenderByName(contact.assignedTo) : getSender(0);
          await sendSMS(contact.phone, poolAutoReply, senderPhone);
          console.log("[webhook] pool auto-reply sent to:", contact.name);
        }
      } catch (e) {
        console.error("[webhook] pool auto-reply failed:", e);
      }
    }

    // Detect STOP / unsubscribe requests
    if (eventType === "SMS") {
      const lowerContent = content.toLowerCase().trim();
      const isStop = STOP_KEYWORDS.some((kw) => lowerContent.includes(kw));
      if (isStop) {
        await updateContact(contact.id, {
          Status: { select: { name: STATUS_NO_DEAL } },
        });
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

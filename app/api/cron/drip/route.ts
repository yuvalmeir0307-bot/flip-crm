import { NextRequest, NextResponse } from "next/server";
import { getActiveContacts, updateContact, extractContactProps, createRunLog } from "@/lib/notion";
import { sendSMS, getSender, getSenderName } from "@/lib/openphone";
import {
  getDripScript,
  getPoolScript,
  getDripDelay,
  getPoolDelay,
  calculateNextDate,
} from "@/lib/drip";
import { getAllScripts, resolveMessage, ScriptEntry } from "@/lib/scripts";

export async function GET(req: NextRequest) {
  // Allow Vercel cron + manual trigger with secret
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    !req.headers.get("x-vercel-cron")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load scripts from Notion (fallback to hardcoded if unavailable)
  let notionScripts: ScriptEntry[] = [];
  try {
    notionScripts = await getAllScripts();
  } catch {
    // Will use hardcoded fallback
  }

  const pages = await getActiveContacts();
  const logs: string[] = [`Found ${pages.length} contacts to process`];

  for (let i = 0; i < pages.length; i++) {
    const contact = extractContactProps(pages[i] as Record<string, unknown>);

    if (!contact.phone) {
      logs.push(`Skipping ${contact.name} - no phone`);
      continue;
    }

    const isPool = contact.status === "The Pool";
    const currentStep = isPool ? (contact.poolStep || 1) : (contact.dripStep || 0);
    const firstName = contact.name.split(" ")[0] || "there";
    const senderPhone = getSender(i);
    const senderName = getSenderName(i);

    // Try to get script from Notion, fallback to hardcoded
    let message: string;
    const notionScript = notionScripts.find(
      (s) => s.campaign === (isPool ? "Pool" : "Drip") && s.step === currentStep
    );

    if (notionScript) {
      message = resolveMessage(notionScript.message, firstName, senderName);
    } else {
      message = isPool
        ? getPoolScript(currentStep, firstName)
        : getDripScript(currentStep, firstName, senderName);
    }

    const delay = isPool ? getPoolDelay(currentStep) : getDripDelay(currentStep);

    logs.push(`Sending to ${contact.name} (${contact.phone}) from ${senderName} - Step ${currentStep}`);

    const result = await sendSMS(contact.phone, message, senderPhone);

    // Log the run
    await createRunLog({
      date: new Date().toISOString(),
      type: isPool ? "Pool" : "Drip",
      contactName: contact.name,
      phone: contact.phone,
      step: isPool ? `Pool ${currentStep}` : `Drip ${currentStep}`,
      status: result.ok ? "success" : "failed",
      message: message.slice(0, 200),
      error: result.ok ? "" : (result.error ?? "Unknown"),
    });

    if (result.ok) {
      const updateProps: Record<string, unknown> = {
        Date: { date: { start: calculateNextDate(delay) } },
        "Last Contact": { date: { start: new Date().toISOString() } },
        ...(result.messageId ? { "Message ID": { rich_text: [{ text: { content: result.messageId } }] } } : {}),
      };

      if (isPool) {
        const nextStep = currentStep >= 9 ? 5 : currentStep + 1;
        updateProps["Pool step"] = { number: nextStep };
      } else {
        if (currentStep >= 4) {
          // After Final Drip (step 4) → move to The Pool
          updateProps["Status"] = { select: { name: "The Pool" } };
          updateProps["Pool step"] = { number: 1 };
        } else {
          updateProps["Drip step"] = { number: currentStep + 1 };
        }
      }

      await updateContact(contact.id, updateProps);
      logs.push(`OK: Sent & updated Notion`);
    } else {
      logs.push(`FAIL: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, logs });
}

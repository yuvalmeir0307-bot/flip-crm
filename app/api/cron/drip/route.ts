import { NextRequest, NextResponse } from "next/server";
import { getActiveContacts, updateContact, extractContactProps, createRunLog } from "@/lib/notion";
import { sendSMS, getSender, getSenderName, getSenderByName } from "@/lib/openphone";
import {
  getDripScript,
  getPoolScript,
  getDripDelay,
  getPoolDelay,
  calculateNextDate,
} from "@/lib/drip";
import { getAllScripts, resolveMessage, ScriptEntry } from "@/lib/scripts";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET || "flip123secret";
  const isAuthorized = authHeader === `Bearer ${secret}`;

  if (process.env.NODE_ENV === "production" && !isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filterPhone = url.searchParams.get("phone"); // e.g. ?phone=+19049621004
  const dryRun = url.searchParams.get("dryRun") === "true"; // ?dryRun=true
  const firstOnly = url.searchParams.get("firstOnly") === "true"; // ?firstOnly=true → only Step 0

  // Load scripts from Notion (fallback to hardcoded if unavailable)
  let notionScripts: ScriptEntry[] = [];
  try {
    notionScripts = await getAllScripts();
  } catch {
    // Will use hardcoded fallback
  }

  const pages = await getActiveContacts();
  const logs: string[] = [`Found ${pages.length} contacts to process${filterPhone ? ` (filtered to: ${filterPhone})` : ""}${firstOnly ? " [FIRST TOUCH ONLY]" : ""}${dryRun ? " [DRY RUN]" : ""}`];

  for (let i = 0; i < pages.length; i++) {
    const contact = extractContactProps(pages[i] as Record<string, unknown>);

    if (!contact.phone) {
      logs.push(`Skipping ${contact.name} - no phone`);
      continue;
    }

    // Phone filter for targeted testing
    if (filterPhone && contact.phone.replace(/\D/g, "") !== filterPhone.replace(/\D/g, "")) {
      logs.push(`Skipping ${contact.name} (${contact.phone}) - not target`);
      continue;
    }

    const isPool = contact.status === "The Pool";
    const currentStep = isPool ? (contact.poolStep || 1) : (contact.dripStep || 0);

    // firstOnly mode: skip anyone not at Drip Step 0, and skip Pool contacts entirely
    if (firstOnly) {
      if (isPool) {
        logs.push(`Skipping ${contact.name} - Pool contact (not first touch)`);
        continue;
      }
      if (currentStep !== 0) {
        logs.push(`Skipping ${contact.name} - already at Step ${currentStep} (not first touch)`);
        continue;
      }
    }

    const rawFirst = contact.name.split(" ")[0] || "";
    // Sanitize: strip non-ASCII chars (e.g. ???? from encoding issues), fallback to "there"
    const firstName = rawFirst.replace(/[^\x20-\x7E]/g, "").trim() || "there";
    // Prefer assignedTo so pool follow-ups always use the agent who originally talked to this contact
    // Case-insensitive check to handle variations (lowercase, trailing spaces, "Both", etc.)
    const assignedLower = (contact.assignedTo ?? "").toLowerCase().trim();
    const isYuval = assignedLower.includes("yuval");
    const isYahav = assignedLower.includes("yahav");
    const knownAgent = isYuval || isYahav;
    // Deterministic fallback — same contact always gets same sender based on phone, not loop index
    const phoneLastDigit = parseInt(contact.phone.replace(/\D/g, "").slice(-1), 10);
    const senderName = knownAgent ? (isYuval ? "Yuval" : "Yahav") : (phoneLastDigit % 2 === 0 ? "Yuval" : "Yahav");
    const senderPhone = knownAgent ? getSenderByName(contact.assignedTo) : getSender(phoneLastDigit % 2);

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

    logs.push(`[${dryRun ? "DRY RUN" : "SEND"}] ${contact.name} (${contact.phone}) from ${senderName} - Step ${currentStep}`);
    logs.push(`Message: "${message}"`);

    if (dryRun) {
      logs.push(`Would update: step → ${isPool ? "Pool " + (currentStep >= 9 ? 1 : currentStep + 1) : currentStep >= 4 ? "Drip 0 (restart in 60 days)" : "Drip " + (currentStep + 1)}, next date in ${delay} days`);
      continue;
    }

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
        const nextStep = currentStep >= 9 ? 1 : currentStep + 1;
        updateProps["Pool step"] = { number: nextStep };
      } else {
        if (currentStep >= 4) {
          // Non-responder — restart cold drip after 60-day pause (Hieu steps 6-10)
          // Date is already set to +60 days above via getDripDelay(4)
          updateProps["Drip step"] = { number: 0 };
        } else {
          updateProps["Drip step"] = { number: currentStep + 1 };
        }
      }

      await updateContact(contact.id, updateProps);

      // Best-effort: record which agent sent this message (drip or pool) so future sends stay consistent
      if (!contact.assignedTo) {
        try {
          await updateContact(contact.id, {
            "Assigned To": { rich_text: [{ text: { content: senderName } }] },
          });
        } catch { /* ignore if Assigned To field not yet created in Notion */ }
      }
      logs.push(`✅ Sent & updated Notion`);
    } else {
      logs.push(`❌ Failed: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, logs });
}

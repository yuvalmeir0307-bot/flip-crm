import { NextRequest, NextResponse } from "next/server";
import { getActiveContacts, updateContact, extractContactProps, createRunLog } from "@/lib/notion";
import { sendSMS, getSender, getSenderByName } from "@/lib/openphone";

export const maxDuration = 300; // Allow up to 5 minutes for large contact lists
import {
  getDripDelay,
  getPoolDelay,
  calculateNextDate,
} from "@/lib/drip";
import { getAllScripts, resolveMessage, ScriptEntry } from "@/lib/scripts";
import { runGuard } from "@/lib/send-guard";
import { createLog } from "@/lib/logs";

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET || "flip123secret";
  // Only allow: Vercel cron scheduler OR internal call from /api/run-drip (uses x-internal-drip header)
  const isInternalProxy = req.headers.get("x-internal-drip") === secret;

  if (process.env.NODE_ENV === "production" && !isVercelCron && !isInternalProxy) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filterPhone = url.searchParams.get("phone"); // e.g. ?phone=+19049621004
  const dryRun = url.searchParams.get("dryRun") === "true"; // ?dryRun=true
  const firstOnly = url.searchParams.get("firstOnly") === "true"; // ?firstOnly=true → only Step 0

  // Load scripts from Notion — required, no hardcoded fallback
  let notionScripts: ScriptEntry[] = [];
  try {
    notionScripts = await getAllScripts();
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, logs: [`❌ Failed to load scripts from Notion: ${e instanceof Error ? e.message : String(e)}`] });
  }
  if (notionScripts.length === 0) {
    return NextResponse.json({ ok: false, logs: [`⚠️ No scripts found in Notion Scripts DB — nothing to send`] });
  }

  let pages: Awaited<ReturnType<typeof getActiveContacts>>;
  try {
    pages = await getActiveContacts();
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, logs: [`❌ Failed to fetch contacts from Notion: ${e instanceof Error ? e.message : String(e)}`] });
  }
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

    const notionScript = notionScripts.find(
      (s) => s.campaign === (isPool ? "Pool" : "Drip") && s.step === currentStep
    );

    if (!notionScript) {
      logs.push(`Skipping ${contact.name} - no script in Notion for ${isPool ? "Pool" : "Drip"} step ${currentStep}`);
      continue;
    }
    const message = resolveMessage(notionScript.message, firstName, senderName);

    const delay = isPool ? getPoolDelay(currentStep) : getDripDelay(currentStep);

    logs.push(`[${dryRun ? "DRY RUN" : "SEND"}] ${contact.name} (${contact.phone}) from ${senderName} - Step ${currentStep}`);
    logs.push(`Message: "${message}"`);

    // Run send guard — blocks wrong-hour sends, empty scripts, double-sends
    const guard = runGuard(message, contact.lastContact);
    if (!guard.ok) {
      logs.push(`⛔ ${contact.name} — ${guard.reason}`);
      if (!dryRun) {
        await createLog(
          `⛔ Blocked: ${contact.name}`,
          "BLOCKED",
          contact.phone,
          `Step: ${isPool ? "Pool " + currentStep : "Drip " + currentStep} | ${guard.reason}`
        ).catch(() => {});
      }
      continue;
    }

    if (dryRun) {
      logs.push(`Would update: step → ${isPool ? "Pool " + (currentStep >= 9 ? 1 : currentStep + 1) : currentStep >= 4 ? "Drip 0 (restart in 60 days)" : "Drip " + (currentStep + 1)}, next date in ${delay} days`);
      continue;
    }

    let result: { ok: boolean; error?: string; messageId?: string };
    try {
      result = await sendSMS(contact.phone, message, senderPhone);
    } catch (e: unknown) {
      logs.push(`❌ ${contact.name} — sendSMS threw: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // Log the run — non-blocking, never crash the main flow
    createRunLog({
      date: new Date().toISOString(),
      type: isPool ? "Pool" : "Drip",
      contactName: contact.name,
      phone: contact.phone,
      step: isPool ? `Pool ${currentStep}` : `Drip ${currentStep}`,
      status: result.ok ? "success" : "failed",
      message: message.slice(0, 200),
      error: result.ok ? "" : (result.error ?? "Unknown"),
    }).catch(() => {});

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
          // Drip complete — graduate to Pool
          updateProps["Status"] = { select: { name: "The Pool" } };
          updateProps["Pool step"] = { number: 1 };
          // Override date to Pool step 1 delay (7 days)
          updateProps["Date"] = { date: { start: calculateNextDate(7) } };
        } else {
          updateProps["Drip step"] = { number: currentStep + 1 };
        }
      }

      try {
        await updateContact(contact.id, updateProps);
      } catch (e: unknown) {
        logs.push(`⚠️ ${contact.name} — SMS sent but Notion update failed: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      // Best-effort: record which agent sent this message (drip or pool) so future sends stay consistent
      if (!contact.assignedTo) {
        updateContact(contact.id, {
          "Assigned To": { rich_text: [{ text: { content: senderName } }] },
        }).catch(() => {});
      }
      logs.push(`✅ Sent & updated Notion`);
    } else {
      logs.push(`❌ Failed: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, logs });
}

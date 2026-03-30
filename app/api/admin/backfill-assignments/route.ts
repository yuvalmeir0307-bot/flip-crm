import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, getAllRunLogs, updateContact, extractContactProps } from "@/lib/notion";

/**
 * POST /api/admin/backfill-assignments
 * Reads all run logs (oldest first) to determine which agent contacted each person,
 * then sets "Assigned To" on every contact that is missing it.
 *
 * Strategy:
 *   1. Find the earliest successful run log per contact phone.
 *   2. If the message contains "this is Yuval" → Yuval; "this is Yahav" → Yahav.
 *   3. If no log found (brand-new contacts), assign by alternating index as before.
 *   4. Skip contacts that already have assignedTo set.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || "flip123secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Load all run logs (oldest first — getAllRunLogs sorts ascending)
  const runLogs = await getAllRunLogs();

  // Build phone → sender map from the earliest log that mentions an agent name
  const phoneSender: Record<string, "Yuval" | "Yahav"> = {};
  for (const log of runLogs) {
    if (!log.phone || phoneSender[log.phone]) continue;
    const msg = log.message.toLowerCase();
    if (msg.includes("this is yuval")) {
      phoneSender[log.phone] = "Yuval";
    } else if (msg.includes("this is yahav")) {
      phoneSender[log.phone] = "Yahav";
    }
  }

  // 2. Load all contacts
  const pages = await getAllContacts();
  const contacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));

  const results: string[] = [];
  let fallbackIndex = 0; // for contacts with no run log, alternate Yuval/Yahav

  for (const contact of contacts) {
    if (contact.assignedTo) {
      results.push(`SKIP ${contact.name} — already assigned to ${contact.assignedTo}`);
      continue;
    }

    if (!contact.phone) {
      results.push(`SKIP ${contact.name} — no phone`);
      continue;
    }

    const normalizedPhone = contact.phone.replace(/\D/g, "");
    // Try matching by phone (strip non-digits for comparison)
    const sender: "Yuval" | "Yahav" =
      Object.entries(phoneSender).find(
        ([p]) => p.replace(/\D/g, "") === normalizedPhone
      )?.[1] ??
      (fallbackIndex % 2 === 0 ? "Yuval" : "Yahav");

    if (!Object.entries(phoneSender).find(([p]) => p.replace(/\D/g, "") === normalizedPhone)) {
      fallbackIndex++;
    }

    await updateContact(contact.id, {
      "Assigned To": { rich_text: [{ text: { content: sender } }] },
    });

    results.push(`SET ${contact.name} (${contact.phone}) → ${sender}`);
  }

  return NextResponse.json({ ok: true, total: contacts.length, results });
}

/**
 * POST /api/sync-all-contacts
 *
 * Bulk syncs every Notion contact into OpenPhone with the format:
 *   firstName: first word of name
 *   lastName:  remaining words + " Agent Milwaukee"
 *
 * After each write, reads back from OpenPhone to verify the name
 * was stored correctly.
 *
 * Throttles at 1 request per 300 ms to stay under OpenPhone rate limits.
 * Auth: x-dashboard-trigger: 1  OR  x-cron-secret header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, extractContactProps } from "@/lib/notion";
import { syncContactToOpenPhone } from "@/skills/syncContactToOpenPhone";
import { createLog } from "@/lib/logs";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET || "flip123secret";
const THROTTLE_MS = 300;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const isDashboard = req.headers.get("x-dashboard-trigger") === "1";
  const secret = req.headers.get("x-cron-secret");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  if (!isDashboard && secret !== CRON_SECRET && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load all Notion contacts
  let contacts: ReturnType<typeof extractContactProps>[] = [];
  try {
    const pages = await getAllContacts();
    contacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: `Failed to load contacts: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const logs: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let verifyFailed = 0;

  for (const c of contacts) {
    if (!c.phone || !c.name) {
      logs.push(`SKIP (no phone/name): ${c.name || "(unnamed)"}`);
      skipped++;
      continue;
    }

    const result = await syncContactToOpenPhone(c.phone, c.name);

    if (result.action === "created") {
      created++;
      const vTag = result.verified ? "✓ verified" : "✗ verify failed";
      logs.push(`CREATED: ${c.name} (${c.phone}) → "${result.storedName}" [${vTag}]`);
      if (!result.verified) verifyFailed++;
    } else if (result.action === "updated") {
      updated++;
      const vTag = result.verified ? "✓ verified" : "✗ verify failed";
      logs.push(`UPDATED: ${c.name} (${c.phone}) → "${result.storedName}" [${vTag}]`);
      if (!result.verified) verifyFailed++;
    } else if (result.action === "skipped") {
      skipped++;
      // Only log skips when name is already correct — keep logs lean
    } else {
      errors++;
      logs.push(`ERROR: ${c.name} (${c.phone}) — ${result.error}`);
    }

    await sleep(THROTTLE_MS);
  }

  const summary = {
    ok: true,
    total: contacts.length,
    created,
    updated,
    skipped,
    errors,
    verifyFailed,
  };

  // Log to Notion system logs
  const title = `SYNC_ALL_CONTACTS — ${created} created, ${updated} updated, ${verifyFailed} verify-failed`;
  await createLog(
    title,
    verifyFailed > 0 || errors > 0 ? "FAILED_SMS" : "INFO",
    undefined,
    JSON.stringify({ ...summary, sampleLogs: logs.slice(0, 40) }).substring(0, 2000)
  );

  return NextResponse.json({ ...summary, logs });
}

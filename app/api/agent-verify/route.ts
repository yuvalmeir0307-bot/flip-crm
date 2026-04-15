/**
 * Agent: agent-verify
 *
 * Two jobs run sequentially:
 *
 * JOB 1 — Assignment Verification (post-grab-agent)
 *   Scans ALL Notion contacts.
 *   For each contact:
 *     - If assignedTo is missing or invalid → assigns deterministically
 *       (phone last digit even = Yuval, odd = Yahav) and writes it back.
 *     - If assignedTo is already "Yuval" or "Yahav" → marks as correct.
 *
 * JOB 2 — OpenPhone Sender Sync + Name Verification
 *   For every contact that has been messaged (dripStep > 0 OR lastContact set):
 *     - Queries OpenPhone history to find the actual sender (Yuval or Yahav).
 *     - Writes the sender's full name into "Assigned To" in Notion.
 *     - If the name differs from what was stored → fixes and logs the mismatch.
 *     - Syncs the contact's name to OpenPhone as "[Name] Agent Milwaukee".
 *     - Reads back from OpenPhone to verify the name was stored correctly.
 *
 * Auth: requires x-cron-secret header OR x-vercel-cron header.
 * Manual trigger: POST /api/agent-verify (dashboard button).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, updateContact, extractContactProps } from "@/lib/notion";
import { getRecentSenderForContact } from "@/lib/openphone";
import { syncContactToOpenPhone } from "@/skills/syncContactToOpenPhone";
import { createLog } from "@/lib/logs";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET || "flip123secret";

// Full names — configure via env vars, fallback to first names only
const FULL_NAMES: Record<string, string> = {
  Yuval: process.env.YUVAL_FULL_NAME || "Yuval",
  Yahav: process.env.YAHAV_FULL_NAME || "Yahav",
};

const VALID_AGENTS = new Set(["Yuval", "Yahav"]);

/** Deterministic assignment from phone last digit (mirrors drip logic) */
function assignByPhone(phone: string): "Yuval" | "Yahav" {
  const digits = phone.replace(/\D/g, "");
  const last = parseInt(digits.slice(-1), 10);
  return last % 2 === 0 ? "Yuval" : "Yahav";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runJob1(contacts: ReturnType<typeof extractContactProps>[]): Promise<{
  checked: number;
  fixed: number;
  alreadyCorrect: number;
  logs: string[];
}> {
  const logs: string[] = [];
  let fixed = 0;
  let alreadyCorrect = 0;

  for (const c of contacts) {
    if (!c.phone) continue;

    const current = c.assignedTo?.trim() ?? "";
    if (VALID_AGENTS.has(current)) {
      alreadyCorrect++;
      continue;
    }

    // Missing or invalid — assign deterministically
    const agent = assignByPhone(c.phone);
    try {
      await updateContact(c.id, {
        "Assigned To": { rich_text: [{ text: { content: agent } }] },
      });
      logs.push(
        `[JOB1] Fixed: ${c.name} (${c.phone}) — was "${current || "(empty)"}" → "${agent}"`
      );
      fixed++;
    } catch (e) {
      logs.push(`[JOB1] ERROR fixing ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { checked: contacts.length, fixed, alreadyCorrect, logs };
}

async function runJob2(contacts: ReturnType<typeof extractContactProps>[]): Promise<{
  checked: number;
  updated: number;
  verified: number;
  noHistory: number;
  mismatches: number;
  opSynced: number;
  opVerifyFailed: number;
  logs: string[];
}> {
  const logs: string[] = [];
  let updated = 0;
  let verified = 0;
  let noHistory = 0;
  let mismatches = 0;
  let opSynced = 0;
  let opVerifyFailed = 0;

  // Only contacts that have actually been messaged
  const messaged = contacts.filter(
    (c) => c.phone && (c.dripStep > 0 || c.poolStep > 1 || c.lastContact)
  );

  for (const c of messaged) {
    // ── Step A: find who sent in OpenPhone ──────────────────────
    let actual: "Yuval" | "Yahav" | null = null;
    try {
      actual = await getRecentSenderForContact(c.phone);
    } catch (e) {
      logs.push(`[JOB2] ERROR querying OpenPhone for ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (!actual) {
      noHistory++;
      logs.push(`[JOB2] No OpenPhone history: ${c.name} (${c.phone})`);
    } else {
      const fullName = FULL_NAMES[actual] ?? actual;
      const stored = c.assignedTo?.trim() ?? "";

      if (stored === actual) {
        verified++;
      } else {
        if (stored && stored !== actual) {
          mismatches++;
          logs.push(
            `[JOB2] MISMATCH: ${c.name} (${c.phone}) — Notion says "${stored}", OpenPhone says "${actual}" → fixing`
          );
        } else {
          logs.push(`[JOB2] Wrote sender: ${c.name} (${c.phone}) → "${fullName}"`);
        }
        try {
          await updateContact(c.id, {
            "Assigned To": { rich_text: [{ text: { content: fullName } }] },
          });
          updated++;
        } catch (e) {
          logs.push(`[JOB2] ERROR updating Notion for ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // ── Step B: sync contact name to OpenPhone + verify ─────────
    if (c.name) {
      await sleep(300); // throttle
      const sync = await syncContactToOpenPhone(c.phone, c.name);
      if (sync.action === "created" || sync.action === "updated") {
        opSynced++;
        if (sync.verified) {
          logs.push(`[JOB2] OpenPhone name OK: "${sync.storedName}" (${c.phone})`);
        } else {
          opVerifyFailed++;
          logs.push(`[JOB2] OpenPhone verify FAILED: ${c.name} (${c.phone}) — stored as "${sync.storedName}"`);
        }
      } else if (sync.action === "error") {
        logs.push(`[JOB2] OpenPhone sync ERROR: ${c.name} — ${sync.error}`);
      }
      // "skipped" = already correct, no log needed
    }
  }

  return { checked: messaged.length, updated, verified, noHistory, mismatches, opSynced, opVerifyFailed, logs };
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = req.headers.get("x-cron-secret");
  const isDashboard = req.headers.get("x-dashboard-trigger") === "1";

  if (!isVercelCron && secret !== CRON_SECRET && !isDashboard) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobParam = new URL(req.url).searchParams.get("job"); // "1", "2", or null (both)

  let allContacts: ReturnType<typeof extractContactProps>[] = [];
  try {
    const pages = await getAllContacts();
    allContacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: `Failed to load contacts: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    totalContacts: allContacts.length,
  };

  const allLogs: string[] = [];

  // ── Job 1 ───────────────────────────────────────────────────
  if (!jobParam || jobParam === "1") {
    const j1 = await runJob1(allContacts);
    result.job1 = {
      checked: j1.checked,
      fixed: j1.fixed,
      alreadyCorrect: j1.alreadyCorrect,
    };
    allLogs.push(...j1.logs);
  }

  // ── Job 2 ───────────────────────────────────────────────────
  if (!jobParam || jobParam === "2") {
    const j2 = await runJob2(allContacts);
    result.job2 = {
      messaged: j2.checked,
      verifiedCorrect: j2.verified,
      updated: j2.updated,
      mismatches: j2.mismatches,
      noOpenPhoneHistory: j2.noHistory,
      openPhoneSynced: j2.opSynced,
      openPhoneVerifyFailed: j2.opVerifyFailed,
    };
    allLogs.push(...j2.logs);
  }

  result.ok = true;
  result.logs = allLogs;

  // ── Log to Notion System Logs ────────────────────────────────
  const j1 = result.job1 as { fixed?: number } | undefined;
  const j2 = result.job2 as { mismatches?: number; updated?: number; openPhoneVerifyFailed?: number } | undefined;
  const summary = [
    j1 ? `Job1: ${j1.fixed ?? 0} fixed` : null,
    j2 ? `Job2: ${j2.updated ?? 0} updated, ${j2.mismatches ?? 0} mismatches, ${j2.openPhoneVerifyFailed ?? 0} verify-failed` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const hasWarnings = (j2?.mismatches ?? 0) > 0 || (j2?.openPhoneVerifyFailed ?? 0) > 0;
  await createLog(
    `AGENT_VERIFY — ${summary}`,
    hasWarnings ? "WARN" : "INFO",
    undefined,
    JSON.stringify({ ...result, logs: allLogs.slice(0, 50) }).substring(0, 2000)
  );

  return NextResponse.json(result);
}

/**
 * POST /api/admin/fix-yuval-to-yahav
 *
 * One-time migration: contacts that were created as "Yuval" in Notion but whose
 * first drip message was actually sent from Yahav's OpenPhone line (due to the
 * phoneNumberId bug) need to be reassigned to "Yahav" so future sends stay
 * consistent.
 *
 * Targets: contacts with assignedTo === "Yuval" AND dripStep >= 1
 * (step >= 1 means at least one message has already been sent from Yahav by mistake).
 */

import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { extractContactProps } from "@/lib/notion";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DB_ID = process.env.NOTION_DATABASE_ID!;

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET ?? "flip-admin-2025";
  if (req.headers.get("x-admin-secret") !== adminSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  const updated: string[] = [];
  const skipped: string[] = [];
  let cursor: string | undefined;

  // Paginate through all contacts
  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const contact = extractContactProps(page as Record<string, unknown>);

      // Target: assigned to Yuval AND at least one message already sent
      if (
        contact.assignedTo?.toLowerCase().trim() !== "yuval" ||
        (contact.dripStep ?? 0) < 1
      ) {
        skipped.push(`${contact.name} — skipped (assignedTo=${contact.assignedTo}, step=${contact.dripStep})`);
        continue;
      }

      if (!dryRun) {
        await notion.pages.update({
          page_id: contact.id,
          properties: {
            "Assigned To": { rich_text: [{ text: { content: "Yahav" } }] },
          } as Parameters<typeof notion.pages.update>[0]["properties"],
        });
      }

      updated.push(`${contact.name} (step ${contact.dripStep}) → Yahav${dryRun ? " [DRY RUN]" : ""}`);
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return NextResponse.json({
    ok: true,
    dryRun,
    updated: updated.length,
    updatedContacts: updated,
    skipped: skipped.length,
  });
}

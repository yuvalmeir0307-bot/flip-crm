import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getAllContacts, extractContactProps, updateContact } from "@/lib/notion";
import { getRecentSenderForContact } from "@/lib/openphone";

export const maxDuration = 300;

export type AuditRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  notionAssignedTo: string;
  openPhoneSender: "Yuval" | "Yahav" | null;
  mismatch: boolean;
  fixed?: boolean;
};

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("flip_auth")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fix = url.searchParams.get("fix") === "true";
  // Limit how many contacts we cross-check against OpenPhone (rate limit friendly)
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const pages = await getAllContacts();
  const contacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));

  const rows: AuditRow[] = [];
  let checked = 0;

  for (const c of contacts) {
    if (!c.phone) continue;
    if (checked >= limit) {
      // Still include remaining contacts without OpenPhone check
      const assignedLower = (c.assignedTo ?? "").toLowerCase().trim();
      rows.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        notionAssignedTo: c.assignedTo || "(unset)",
        openPhoneSender: null,
        mismatch: false,
      });
      continue;
    }

    checked++;
    const openPhoneSender = await getRecentSenderForContact(c.phone);

    const assignedLower = (c.assignedTo ?? "").toLowerCase().trim();
    const notionIsYuval = assignedLower.includes("yuval");
    const notionIsYahav = assignedLower.includes("yahav");
    const notionKnown = notionIsYuval || notionIsYahav;
    const notionAgent = notionIsYuval ? "Yuval" : notionIsYahav ? "Yahav" : null;

    // Mismatch: OpenPhone shows a different sender than what Notion says
    // Only flag if both sides have a known value
    const mismatch =
      notionKnown &&
      openPhoneSender !== null &&
      openPhoneSender !== notionAgent;

    const row: AuditRow = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      status: c.status,
      notionAssignedTo: c.assignedTo || "(unset)",
      openPhoneSender,
      mismatch: !!mismatch,
    };

    // Auto-fix: update Notion assignedTo to match OpenPhone sender
    if (fix && mismatch && openPhoneSender) {
      try {
        await updateContact(c.id, {
          "Assigned To": { rich_text: [{ text: { content: openPhoneSender } }] },
        });
        row.fixed = true;
        row.notionAssignedTo = openPhoneSender;
        row.mismatch = false;
      } catch {
        row.fixed = false;
      }
    }

    // If no assignedTo set but OpenPhone has history → assign it
    if (fix && !notionKnown && openPhoneSender) {
      try {
        await updateContact(c.id, {
          "Assigned To": { rich_text: [{ text: { content: openPhoneSender } }] },
        });
        row.fixed = true;
        row.notionAssignedTo = openPhoneSender;
      } catch {
        row.fixed = false;
      }
    }

    rows.push(row);
  }

  const mismatches = rows.filter((r) => r.mismatch);
  const unset = rows.filter((r) => r.notionAssignedTo === "(unset)");
  const fixed = rows.filter((r) => r.fixed);

  return NextResponse.json({
    total: rows.length,
    checked,
    mismatches: mismatches.length,
    unset: unset.length,
    fixed: fixed.length,
    rows,
  });
}

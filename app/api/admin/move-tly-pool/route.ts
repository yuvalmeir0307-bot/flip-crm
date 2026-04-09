import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DB_ID = process.env.NOTION_DATABASE_ID!;

/**
 * POST /api/admin/move-tly-pool
 * Finds the contact whose name contains "Tly" (case-insensitive) and moves
 * them to The Pool at step 2. Safe to re-run — will report current state.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || "flip123secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Search for contact whose name contains "Tly"
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "Name", title: { contains: "Tly" } },
  });

  if (res.results.length === 0) {
    // Try case-insensitive fallback with broader search
    const all = await notion.databases.query({ database_id: DB_ID });
    const match = all.results.find((p) => {
      const props = (p as { properties: Record<string, { title?: Array<{ plain_text: string }> }> }).properties;
      const name = props["Name"]?.title?.[0]?.plain_text ?? "";
      return name.toLowerCase().includes("tly");
    });
    if (!match) {
      return NextResponse.json({ error: "Contact with name containing 'Tly' not found" }, { status: 404 });
    }
    res.results[0] = match;
  }

  const page = res.results[0];
  const props = (page as { properties: Record<string, { title?: Array<{ plain_text: string }>; select?: { name: string }; number?: number }> }).properties;
  const currentName = props["Name"]?.title?.[0]?.plain_text ?? "Unknown";
  const currentStatus = props["Status"]?.select?.name ?? "Unknown";
  const currentPoolStep = props["Pool step"]?.number ?? null;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);

  await notion.pages.update({
    page_id: page.id,
    properties: {
      "Status": { select: { name: "The Pool" } },
      "Pool step": { number: 2 },
      "Date": { date: { start: nextDate.toISOString().split("T")[0] } },
    },
  } as Parameters<typeof notion.pages.update>[0]);

  return NextResponse.json({
    ok: true,
    contact: currentName,
    before: { status: currentStatus, poolStep: currentPoolStep },
    after: { status: "The Pool", poolStep: 2, nextDate: nextDate.toISOString().split("T")[0] },
  });
}

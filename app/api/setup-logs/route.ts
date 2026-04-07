import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

// One-time setup: creates the System Logs DB using the app's own NOTION_API_TOKEN
// so the integration automatically has access.
// Call: GET /api/setup-logs  (with Authorization: Bearer <CRON_SECRET>)
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
  const parentDbId = process.env.NOTION_DATABASE_ID!;

  // Get the parent page of the contacts DB
  let parentPageId: string | null = null;
  try {
    const db = await notion.databases.retrieve({ database_id: parentDbId }) as unknown as {
      parent: { type: string; page_id?: string };
    };
    const parent = db.parent;
    if (parent.type === "page_id" && parent.page_id) parentPageId = parent.page_id;
    else parentPageId = null;
  } catch (e) {
    return NextResponse.json({ error: "Could not retrieve parent DB", detail: String(e) }, { status: 500 });
  }

  // Create the logs DB — if no parent page found, create at workspace level
  try {
    const newDb = await notion.databases.create({
      parent: parentPageId
        ? { type: "page_id", page_id: parentPageId }
        : ({ type: "workspace", workspace: true } as unknown as Parameters<typeof notion.databases.create>[0]["parent"]),
      title: [{ type: "text", text: { content: "🚨 System Logs — Flip CRM" } }],
      properties: {
        Title: { title: {} },
        Type: {
          select: {
            options: [
              { name: "DUPLICATE", color: "red" },
              { name: "BROKEN_NAME", color: "orange" },
              { name: "FAILED_SMS", color: "red" },
              { name: "STOP", color: "purple" },
              { name: "DAILY_REPORT", color: "blue" },
              { name: "SMS_SENT", color: "green" },
              { name: "INFO", color: "gray" },
            ],
          },
        },
        Phone: { rich_text: {} },
        Details: { rich_text: {} },
        Resolved: { checkbox: {} },
      },
    });
    return NextResponse.json({
      ok: true,
      db_id: newDb.id,
      message: `✅ Created! Add to Vercel env: NOTION_LOGS_DB=${newDb.id}`,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create DB", detail: String(e) }, { status: 500 });
  }
}

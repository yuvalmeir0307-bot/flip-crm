import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, extractContactProps } from "@/lib/notion";
import { createLog } from "@/lib/logs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET || "flip123secret";
  const isAuthorized = authHeader === `Bearer ${secret}`;

  if (process.env.NODE_ENV === "production" && !isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = await getAllContacts();
  const contacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));

  let duplicates = 0;
  let brokenNames = 0;
  let overdue = 0;

  // Check for duplicate phone numbers
  const phoneSeen = new Map<string, string>();
  for (const c of contacts) {
    if (!c.phone) continue;
    const normalized = c.phone.replace(/\D/g, "");
    if (phoneSeen.has(normalized)) {
      duplicates++;
      await createLog(
        `Duplicate phone: ${c.phone}`,
        "DUPLICATE",
        c.phone,
        `Contacts: "${phoneSeen.get(normalized)}" and "${c.name}" share the same number`
      );
    } else {
      phoneSeen.set(normalized, c.name);
    }
  }

  // Check for broken/empty names on active contacts
  const activeStatuses = ["Drip Active", "The Pool"];
  for (const c of contacts) {
    if (!activeStatuses.includes(c.status)) continue;
    const name = c.name.trim();
    if (!name || name === "" || name.toLowerCase() === "unknown" || name.length < 2) {
      brokenNames++;
      await createLog(
        `Broken name: "${c.name || "(empty)"}" — ${c.phone}`,
        "BROKEN_NAME",
        c.phone,
        `Status: ${c.status}`
      );
    }
  }

  // Check for contacts overdue by 2+ weeks (date <= 14 days ago, still active)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

  for (const c of contacts) {
    if (!activeStatuses.includes(c.status)) continue;
    if (c.date && c.date <= twoWeeksAgoStr) {
      overdue++;
      await createLog(
        `Overdue contact: ${c.name} (due ${c.date})`,
        "INFO",
        c.phone,
        `Status: ${c.status} — last scheduled: ${c.date}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    stats: {
      total: contacts.length,
      duplicates,
      brokenNames,
      overdue,
    },
  });
}

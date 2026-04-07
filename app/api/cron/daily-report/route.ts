import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, extractContactProps } from "@/lib/notion";
import { getActiveAlerts, createLog } from "@/lib/logs";
import { alertBothPartners } from "@/lib/openphone";

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
  const alerts = await getActiveAlerts();

  const today = new Date().toISOString().split("T")[0];

  const dueToday = contacts.filter(
    (c) =>
      (c.status === "Drip Active" || c.status === "The Pool") &&
      (!c.date || c.date <= today)
  ).length;

  const hotCount = contacts.filter(
    (c) => c.status === "Replied - Pivot Call Needed - HOT"
  ).length;

  const dealCount = contacts.filter(
    (c) => c.status === "Deal sent- Discovery call needed"
  ).length;

  const dripCount = contacts.filter((c) => c.status === "Drip Active").length;
  const poolCount = contacts.filter((c) => c.status === "The Pool").length;

  const summary = [
    `Flip CRM — Daily Report`,
    `Date: ${today}`,
    ``,
    `Due today: ${dueToday}`,
    `HOT leads: ${hotCount}`,
    `Active deals: ${dealCount}`,
    `Drip active: ${dripCount} | Pool: ${poolCount}`,
    `Open alerts: ${alerts.length}`,
  ].join("\n");

  await alertBothPartners(summary);

  await createLog(
    `Daily report sent — ${today}`,
    "DAILY_REPORT",
    undefined,
    `Due: ${dueToday} | HOT: ${hotCount} | Deals: ${dealCount} | Drip: ${dripCount} | Pool: ${poolCount} | Alerts: ${alerts.length}`
  );

  return NextResponse.json({
    ok: true,
    stats: {
      dueToday,
      hotCount,
      dealCount,
      dripCount,
      poolCount,
      openAlerts: alerts.length,
    },
  });
}

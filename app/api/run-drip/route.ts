import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { createLog } from "@/lib/logs";

export async function GET(req: NextRequest) {
  // Require login — secret never leaves the server
  const cookieStore = await cookies();
  const token = cookieStore.get("flip_auth")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isDryRun = url.searchParams.get("dryRun") === "true";

  // Log every manual drip trigger with source info
  if (!isDryRun) {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? "unknown";
    const referer = headersList.get("referer") ?? "direct";
    await createLog(
      `Manual drip triggered`,
      "DRIP_TRIGGER",
      "",
      `referer: ${referer} | ua: ${userAgent.slice(0, 80)}`
    ).catch(() => {});
  }

  // "Run Drip Now" always sends first-touch only (Step 0 contacts)
  // The daily cron handles Steps 1-4 and Pool automatically
  const dryRun = url.searchParams.get("dryRun") ?? "false";
  const phone = url.searchParams.get("phone") ?? "";

  const secret = process.env.CRON_SECRET ?? "flip123secret";
  const params = new URLSearchParams({ firstOnly: "true", dryRun, ...(phone ? { phone } : {}) });
  const internalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://flip-crm-two.vercel.app"}/api/cron/drip?${params}`;

  const res = await fetch(internalUrl, {
    headers: { "x-internal-drip": secret },
  });

  const data = await res.json();
  return NextResponse.json(data);
}

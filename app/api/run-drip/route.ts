import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  // Require login — secret never leaves the server
  const cookieStore = await cookies();
  const token = cookieStore.get("flip_auth")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const firstOnly = url.searchParams.get("firstOnly") ?? "false";
  const dryRun = url.searchParams.get("dryRun") ?? "false";
  const phone = url.searchParams.get("phone") ?? "";

  const secret = process.env.CRON_SECRET ?? "flip123secret";
  const params = new URLSearchParams({ firstOnly, dryRun, ...(phone ? { phone } : {}) });
  const internalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://flip-crm-two.vercel.app"}/api/cron/drip?${params}`;

  const res = await fetch(internalUrl, {
    headers: { "x-internal-drip": secret },
  });

  const data = await res.json();
  return NextResponse.json(data);
}

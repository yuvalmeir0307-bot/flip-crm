import { NextRequest, NextResponse } from "next/server";
import { createLog, getLogs, getActiveAlerts, resolveLog } from "@/lib/logs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  if (mode === "alerts") {
    const alerts = await getActiveAlerts();
    return NextResponse.json(alerts);
  }

  const logs = await getLogs(50);
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  try {
    const { title, type, phone, details } = await req.json();
    if (!title || !type) {
      return NextResponse.json({ error: "Missing title or type" }, { status: 400 });
    }
    await createLog(title, type, phone, details);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await resolveLog(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

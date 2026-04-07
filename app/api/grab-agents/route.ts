import { NextRequest, NextResponse } from "next/server";
import { grabAndAddAgents } from "@/skills/grabAgents";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { assignedTo, count = 5 } = body as { assignedTo: string; count?: number };

  if (assignedTo !== "Yahav" && assignedTo !== "Yuval") {
    return NextResponse.json({ error: "assignedTo must be 'Yahav' or 'Yuval'" }, { status: 400 });
  }

  try {
    const result = await grabAndAddAgents(assignedTo, count);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("grab-agents error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

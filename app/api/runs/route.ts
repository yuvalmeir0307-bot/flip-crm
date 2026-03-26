import { NextResponse } from "next/server";
import { getRunLogs } from "@/lib/notion";

export async function GET() {
  try {
    const logs = await getRunLogs(100);
    return NextResponse.json(logs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

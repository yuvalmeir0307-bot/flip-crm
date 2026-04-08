import { NextResponse } from "next/server";
import { getLogs } from "@/lib/logs";

export async function GET() {
  try {
    const all = await getLogs(200);

    // Filter only QA runs by title prefix
    const qaLogs = all.filter(
      (l: { title: string }) => l.title?.startsWith("QA_PASS") || l.title?.startsWith("QA_FAIL")
    );

    // Parse the structured JSON from details field
    const parsed = qaLogs.map((l: {
      id: string;
      title: string;
      details: string;
      createdAt: string;
    }) => {
      let data = null;
      try {
        data = JSON.parse(l.details);
      } catch {
        // details is not JSON — older format
      }
      return {
        id: l.id,
        title: l.title,
        overall: l.title.startsWith("QA_PASS") ? "PASS" : "FAIL",
        createdAt: l.createdAt,
        data,
      };
    });

    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

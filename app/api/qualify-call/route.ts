import { NextRequest, NextResponse } from "next/server";
import { analyzeQualificationCall } from "@/lib/gemini";
import { fetchLatestCallContent } from "@/lib/openphone-transcript";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const result = await fetchLatestCallContent(phone);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, setupUrl: result.setupUrl },
        { status: 404 }
      );
    }

    const analysis = await analyzeQualificationCall(result.text);
    return NextResponse.json({ ok: true, analysis, source: result.source });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

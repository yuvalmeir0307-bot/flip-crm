import { NextRequest, NextResponse } from "next/server";
import { analyzeQualificationCall } from "@/lib/gemini";
import { fetchLatestCallContent } from "@/lib/openphone-transcript";

export async function POST(req: NextRequest) {
  try {
    const { phone, altPhones, transcript: manualTranscript } = await req.json();

    // If user provided a manual transcript, analyze it directly (no OpenPhone needed)
    if (manualTranscript) {
      const analysis = await analyzeQualificationCall(manualTranscript);
      return NextResponse.json({ ok: true, analysis, source: "manual" });
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    // Try main phone first, then each alt phone until we find a call
    const phonesToTry = [phone, ...(altPhones ? altPhones.split(",").map((p: string) => p.trim()).filter(Boolean) : [])];
    let result = await fetchLatestCallContent(phonesToTry[0]);
    for (let i = 1; i < phonesToTry.length && !result.ok; i++) {
      result = await fetchLatestCallContent(phonesToTry[i]);
    }

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

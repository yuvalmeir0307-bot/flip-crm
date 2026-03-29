import { NextRequest, NextResponse } from "next/server";
import { analyzeQualificationCall } from "@/lib/gemini";
import { fetchLatestCallTranscript } from "@/lib/openphone-transcript";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const transcript = await fetchLatestCallTranscript(phone);

    if (!transcript) {
      return NextResponse.json(
        { error: "No call transcript found. Make sure call recording & transcription are enabled in OpenPhone." },
        { status: 404 }
      );
    }

    const analysis = await analyzeQualificationCall(transcript);
    return NextResponse.json({ ok: true, analysis });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

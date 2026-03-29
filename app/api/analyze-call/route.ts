import { NextRequest, NextResponse } from "next/server";
import { analyzeDiscoveryCall } from "@/lib/gemini";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;

async function fetchLatestCallTranscript(phone: string): Promise<string | null> {
  // 1. Get the most recent calls involving this phone number
  const callsRes = await fetch(
    `https://api.openphone.com/v1/calls?participants[]=${encodeURIComponent(phone)}&maxResults=5`,
    { headers: { Authorization: OPENPHONE_API_KEY } }
  );

  if (!callsRes.ok) {
    const err = await callsRes.text();
    throw new Error(`OpenPhone calls fetch failed: ${callsRes.status} ${err}`);
  }

  const callsData = await callsRes.json();
  const calls: { id: string; duration?: number; answeredAt?: string }[] =
    callsData?.data ?? [];

  if (calls.length === 0) return null;

  // Pick the longest answered call (most likely to have useful content)
  const sorted = [...calls]
    .filter((c) => c.answeredAt)
    .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));

  const targetCall = sorted[0] ?? calls[0];

  // 2. Fetch the transcript for that call
  const transcriptRes = await fetch(
    `https://api.openphone.com/v1/call-transcripts/${targetCall.id}`,
    { headers: { Authorization: OPENPHONE_API_KEY } }
  );

  if (!transcriptRes.ok) return null;

  const transcriptData = await transcriptRes.json();
  const segments: { speaker?: string; content?: string }[] =
    transcriptData?.data?.transcript ?? [];

  if (segments.length === 0) return null;

  // Convert transcript segments to readable text
  return segments
    .map((s) => `${s.speaker ?? "Speaker"}: ${s.content ?? ""}`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const transcript = await fetchLatestCallTranscript(phone);

    if (!transcript) {
      return NextResponse.json(
        { error: "No call transcript found for this contact. Make sure call recording and transcription are enabled in OpenPhone." },
        { status: 404 }
      );
    }

    const analysis = await analyzeDiscoveryCall(transcript);
    return NextResponse.json({ ok: true, analysis, transcript });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

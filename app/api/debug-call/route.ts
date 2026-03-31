import { NextResponse } from "next/server";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const HEADERS = { Authorization: OPENPHONE_API_KEY };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "+18472462600";

  const pnRes = await fetch("https://api.openphone.com/v1/phone-numbers", { headers: HEADERS });
  const pnData = await pnRes.json();
  const phoneNumbers: { id: string }[] = pnData?.data ?? [];

  for (const pn of phoneNumbers) {
    const url = `https://api.openphone.com/v1/calls?phoneNumberId=${pn.id}&participants[]=${encodeURIComponent(phone)}&maxResults=3`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) continue;
    const data = await res.json();
    const calls = data?.data ?? [];
    if (calls.length > 0) {
      const callId = calls[0].id;

      // Check recording endpoint
      const recRes = await fetch(`https://api.openphone.com/v1/call-recordings/${callId}`, { headers: HEADERS });
      const recData = recRes.ok ? await recRes.json() : { status: recRes.status, error: await recRes.text().substring(0, 300) };

      // Check transcript
      const txRes = await fetch(`https://api.openphone.com/v1/call-transcripts/${callId}`, { headers: HEADERS });
      const txData = txRes.ok ? await txRes.json() : { status: txRes.status };

      // Check summary
      const sumRes = await fetch(`https://api.openphone.com/v1/call-summaries/${callId}`, { headers: HEADERS });
      const sumData = sumRes.ok ? await sumRes.json() : { status: sumRes.status };

      return NextResponse.json({
        call: calls[0],
        recording: recData,
        transcript: txData,
        summary: sumData,
      });
    }
  }

  return NextResponse.json({ error: "No calls found" });
}

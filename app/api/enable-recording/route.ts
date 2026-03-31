import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const HEADERS = {
  Authorization: OPENPHONE_API_KEY,
  "Content-Type": "application/json",
};

export async function GET() {
  try {
    // Get all phone numbers and their full details
    const res = await fetch("https://api.openphone.com/v1/phone-numbers", {
      headers: HEADERS,
    });
    if (!res.ok) {
      return NextResponse.json({ error: await res.text(), status: res.status });
    }
    const data = await res.json();
    const phoneNumbers = data?.data ?? [];

    const results = [];
    for (const pn of phoneNumbers) {
      // Try PATCH to enable recording
      const patchRes = await fetch(`https://api.openphone.com/v1/phone-numbers/${pn.id}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ recordingEnabled: true }),
      });
      const patchText = await patchRes.text();
      let patchBody;
      try { patchBody = JSON.parse(patchText); } catch { patchBody = patchText.substring(0, 300); }

      results.push({
        id: pn.id,
        number: pn.number ?? pn.phoneNumber,
        currentFields: Object.keys(pn),
        patchStatus: patchRes.status,
        patchResponse: patchBody,
      });
    }

    return NextResponse.json(results);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

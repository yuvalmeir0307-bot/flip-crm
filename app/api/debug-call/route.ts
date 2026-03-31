import { NextResponse } from "next/server";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const HEADERS = { Authorization: OPENPHONE_API_KEY };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "+18472462600";

  // Get phone number IDs
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
      // Return the FULL call object so we can see all available fields
      return NextResponse.json({ phoneNumberId: pn.id, calls });
    }
  }

  return NextResponse.json({ error: "No calls found" });
}

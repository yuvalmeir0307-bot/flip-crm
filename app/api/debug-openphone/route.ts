import { NextResponse } from "next/server";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const HEADERS = { Authorization: OPENPHONE_API_KEY };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "+12624409116";

  // Step 1: Get all phone number IDs
  const pnRes = await fetch("https://api.openphone.com/v1/phone-numbers", { headers: HEADERS });
  const pnData = await pnRes.json();
  const phoneNumbers: { id: string; number?: string }[] = pnData?.data ?? [];

  const results: Record<string, unknown>[] = [];

  // Step 2: For each phone number, try both with and without participants filter
  for (const pn of phoneNumbers) {
    // With participants[]
    const withFilter = await fetch(
      `https://api.openphone.com/v1/calls?phoneNumberId=${pn.id}&participants[]=${encodeURIComponent(phone)}&maxResults=5`,
      { headers: HEADERS }
    );
    const withFilterData = await withFilter.json();

    // Without participants filter (see what's actually there)
    const withoutFilter = await fetch(
      `https://api.openphone.com/v1/calls?phoneNumberId=${pn.id}&maxResults=5`,
      { headers: HEADERS }
    );
    const withoutFilterData = await withoutFilter.json();

    results.push({
      phoneNumberId: pn.id,
      phoneNumber: pn.number,
      withParticipantsFilter: withFilterData,
      withoutFilter: withoutFilterData,
    });
  }

  return NextResponse.json({ phoneNumbers, results });
}

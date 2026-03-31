import { NextResponse } from "next/server";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const HEADERS = {
  Authorization: OPENPHONE_API_KEY,
  "Content-Type": "application/json",
};

export async function GET() {
  // Get all phone numbers and their full details
  const res = await fetch("https://api.openphone.com/v1/phone-numbers", {
    headers: HEADERS,
  });
  const data = await res.json();

  // Try to patch each number to enable recording
  const results = [];
  for (const pn of data?.data ?? []) {
    // Try PATCH to enable recording
    const patchRes = await fetch(`https://api.openphone.com/v1/phone-numbers/${pn.id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ recordingEnabled: true }),
    });
    const patchBody = await patchRes.json();

    results.push({
      id: pn.id,
      number: pn.number,
      allFields: pn,
      patchStatus: patchRes.status,
      patchResponse: patchBody,
    });
  }

  return NextResponse.json(results);
}

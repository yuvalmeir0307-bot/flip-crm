import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.OPENPHONE_API_KEY!;
const YUVAL = process.env.YUVAL_PHONE_NUMBER!;

export async function POST(req: NextRequest) {
  const { to } = await req.json();
  if (!to) return NextResponse.json({ ok: false, error: "Missing 'to' number" }, { status: 400 });

  try {
    // Fetch available OpenPhone numbers to get the phoneNumberId
    const numbersRes = await fetch("https://api.openphone.com/v1/phone-numbers", {
      headers: { Authorization: API_KEY },
    });
    const numbersData = await numbersRes.json();
    const phoneNumbers: { id: string; phoneNumber: string }[] = numbersData?.data ?? [];

    const phoneNumber =
      phoneNumbers.find((p) => p.phoneNumber === YUVAL) ?? phoneNumbers[0];

    if (!phoneNumber) {
      return NextResponse.json({ ok: false, error: "No OpenPhone number found" }, { status: 500 });
    }

    // Initiate the call
    const callRes = await fetch("https://api.openphone.com/v1/calls", {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumberId: phoneNumber.id, to }),
    });

    if (!callRes.ok) {
      const err = await callRes.text();
      return NextResponse.json({ ok: false, error: `${callRes.status}: ${err}` }, { status: 500 });
    }

    const callData = await callRes.json();
    return NextResponse.json({ ok: true, callId: callData?.data?.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

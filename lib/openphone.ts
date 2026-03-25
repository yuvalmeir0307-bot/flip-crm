const API_KEY = process.env.OPENPHONE_API_KEY!;
const YUVAL = process.env.YUVAL_PHONE_NUMBER!;
const YAHAV = process.env.YAHAV_PHONE_NUMBER!;

// Alternates: index 0,2,4... = Yuval | index 1,3,5... = Yahav
export function getSender(index: number): string {
  return index % 2 === 0 ? YUVAL : YAHAV;
}

export function getSenderName(index: number): string {
  return index % 2 === 0 ? "Yuval" : "Yahav";
}

export async function sendSMS(to: string, body: string, from: string): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  try {
    const res = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], content: body }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `${res.status}: ${err}` };
    }

    const data = await res.json();
    return { ok: true, messageId: data?.data?.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

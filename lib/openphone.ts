const API_KEY = (process.env.OPENPHONE_API_KEY ?? "").trim();

// OpenPhone API v1 requires phoneNumberId (e.g. "PNoBTtFxey") for the 'from' field,
// NOT the E.164 phone number string. Set YUVAL_PHONE_ID / YAHAV_PHONE_ID in Vercel.
const YUVAL_ID = (process.env.YUVAL_PHONE_ID ?? "").trim();
const YAHAV_ID = (process.env.YAHAV_PHONE_ID ?? "").trim();

// E.164 phone numbers — kept for UI display and personal alert recipients
const YUVAL = (process.env.YUVAL_PHONE_NUMBER ?? "").trim();
const YAHAV = (process.env.YAHAV_PHONE_NUMBER ?? "").trim();

// Personal numbers for partner alerts (separate from the sender pool)
const YUVAL_PERSONAL = process.env.YUVAL_PERSONAL_PHONE ?? YUVAL;
const YAHAV_PERSONAL = process.env.YAHAV_PERSONAL_PHONE ?? YAHAV;

// Alternates: index 0,2,4... = Yuval | index 1,3,5... = Yahav
export function getSender(index: number): string {
  return index % 2 === 0 ? YUVAL_ID : YAHAV_ID;
}

export function getSenderName(index: number): string {
  return index % 2 === 0 ? "Yuval" : "Yahav";
}

// Resolve phoneNumberId by agent name (used for drip/pool sends)
export function getSenderByName(name: string): string {
  if (name.toLowerCase().includes("yuval")) return YUVAL_ID;
  if (name.toLowerCase().includes("yahav")) return YAHAV_ID;
  return YUVAL_ID;
}

/**
 * Queries OpenPhone message history to find which of our two numbers
 * (Yuval or Yahav) most recently sent a message to a given contact phone.
 * Returns null if no messages found on either line.
 */
export async function getRecentSenderForContact(
  contactPhone: string
): Promise<"Yuval" | "Yahav" | null> {
  async function fetchLatestMsg(phoneNumberId: string): Promise<string | null> {
    if (!phoneNumberId) return null;
    try {
      const res = await fetch(
        `https://api.openphone.com/v1/messages?phoneNumberId=${encodeURIComponent(phoneNumberId)}&participants[]=${encodeURIComponent(contactPhone)}&maxResults=1`,
        { headers: { Authorization: API_KEY } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const msgs: Array<{ createdAt?: string; direction?: string }> = data?.data ?? [];
      // Only count outbound messages (messages we sent)
      const outbound = msgs.filter((m) => m.direction === "outgoing" || m.direction === "out");
      return outbound[0]?.createdAt ?? null;
    } catch {
      return null;
    }
  }

  const [yuvalLatest, yahavLatest] = await Promise.all([
    fetchLatestMsg(YUVAL_ID),
    fetchLatestMsg(YAHAV_ID),
  ]);

  if (!yuvalLatest && !yahavLatest) return null;
  if (!yuvalLatest) return "Yahav";
  if (!yahavLatest) return "Yuval";
  return yuvalLatest >= yahavLatest ? "Yuval" : "Yahav";
}

export async function alertBothPartners(message: string): Promise<void> {
  // Send from Yuval's line to both personal numbers
  const sender = YUVAL_ID;
  const targets = [YUVAL_PERSONAL, YAHAV_PERSONAL].filter(Boolean);
  for (const to of targets) {
    await sendSMS(to, message, sender);
  }
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

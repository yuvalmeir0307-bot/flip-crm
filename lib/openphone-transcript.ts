const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const OPENPHONE_HEADERS = { Authorization: OPENPHONE_API_KEY };

type OpenPhoneCall = { id: string; duration?: number; answeredAt?: string };

/**
 * Fetches the most recent answered call for a given contact phone number.
 * OpenPhone returns calls newest-first, so calls[0] is the latest.
 * We skip calls shorter than 10s (missed / dropped).
 */
async function fetchLastCall(phone: string): Promise<OpenPhoneCall | null> {
  const res = await fetch(
    `https://api.openphone.com/v1/calls?participants[]=${encodeURIComponent(phone)}&maxResults=10`,
    { headers: OPENPHONE_HEADERS }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenPhone calls fetch failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const calls: OpenPhoneCall[] = data?.data ?? [];
  if (calls.length === 0) return null;

  // Most recent answered call with at least 10 seconds of content
  return calls.find((c) => c.answeredAt && (c.duration ?? 0) > 10) ?? null;
}

/**
 * Tries to get a full dialogue transcript for a call.
 * Returns the formatted text, or null if unavailable.
 */
async function fetchTranscript(callId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.openphone.com/v1/call-transcripts/${callId}`,
    { headers: OPENPHONE_HEADERS }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const segments: { speaker?: string; content?: string }[] =
    data?.data?.transcript ?? [];

  if (segments.length === 0) return null;

  return segments
    .map((s) => `${s.speaker ?? "Speaker"}: ${s.content ?? ""}`)
    .join("\n");
}

/**
 * Falls back to the AI-generated call summary if no line-by-line transcript exists.
 * OpenPhone generates these automatically on Business/Scale plans.
 */
async function fetchSummary(callId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.openphone.com/v1/call-summaries/${callId}`,
    { headers: OPENPHONE_HEADERS }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const summary: string = data?.data?.summary ?? "";
  if (!summary) return null;

  return `[AI Call Summary]\n${summary}`;
}

export type TranscriptResult =
  | { ok: true; text: string; source: "transcript" | "summary" }
  | { ok: false; error: string; setupUrl: string };

/**
 * Main entry point — call this from API routes.
 *
 * Priority:
 *   1. Full line-by-line transcript (best for analysis)
 *   2. AI call summary (fallback — still useful)
 *   3. Structured error with a direct link to enable recording in the dashboard
 *
 * No additional OpenPhone cost — recording + transcription are included
 * in the Business plan. Enable at:
 * https://app.openphone.com/settings/phone-numbers → select number → Auto-record calls
 */
export async function fetchLatestCallContent(phone: string): Promise<TranscriptResult> {
  const SETUP_URL = "https://app.openphone.com/settings/phone-numbers";

  const call = await fetchLastCall(phone);

  if (!call) {
    return {
      ok: false,
      error: "No answered calls found for this contact.",
      setupUrl: SETUP_URL,
    };
  }

  // Try full transcript first
  const transcript = await fetchTranscript(call.id);
  if (transcript) return { ok: true, text: transcript, source: "transcript" };

  // Fall back to AI summary
  const summary = await fetchSummary(call.id);
  if (summary) return { ok: true, text: summary, source: "summary" };

  // Nothing available — recording likely not enabled
  return {
    ok: false,
    error:
      "Call found but no transcript or summary available. " +
      "To fix: go to OpenPhone Settings → Phone Numbers → select your number → enable Auto-record calls. " +
      "Transcription is included in your Business plan at no extra cost.",
    setupUrl: SETUP_URL,
  };
}

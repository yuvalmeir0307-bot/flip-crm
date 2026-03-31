import { transcribeAudio } from "@/lib/gemini";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;
const OPENPHONE_HEADERS = { Authorization: OPENPHONE_API_KEY };

type OpenPhoneCall = { id: string; duration?: number; answeredAt?: string };

/**
 * Returns all phoneNumberIds belonging to this OpenPhone account.
 * The /v1/calls endpoint now requires phoneNumberId as a mandatory param.
 */
async function fetchPhoneNumberIds(): Promise<string[]> {
  const res = await fetch("https://api.openphone.com/v1/phone-numbers", {
    headers: OPENPHONE_HEADERS,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenPhone phone-numbers fetch failed: ${res.status} — ${err}`);
  }
  const data = await res.json();
  const numbers: { id: string }[] = data?.data ?? [];
  return numbers.map((n) => n.id);
}

/**
 * Fetches the most recent answered call for a given contact phone number.
 * Queries each of your OpenPhone lines (phoneNumberId is now required by the API).
 * We skip calls shorter than 10s (missed / dropped).
 */
async function fetchLastCall(phone: string): Promise<OpenPhoneCall | null> {
  const phoneNumberIds = await fetchPhoneNumberIds();
  if (phoneNumberIds.length === 0) return null;

  const allCalls: OpenPhoneCall[] = [];

  for (const phoneNumberId of phoneNumberIds) {
    const url =
      `https://api.openphone.com/v1/calls` +
      `?phoneNumberId=${encodeURIComponent(phoneNumberId)}` +
      `&participants[]=${encodeURIComponent(phone)}` +
      `&maxResults=10`;

    const res = await fetch(url, { headers: OPENPHONE_HEADERS });
    if (!res.ok) continue; // skip lines that return errors

    const data = await res.json();
    const calls: OpenPhoneCall[] = data?.data ?? [];
    allCalls.push(...calls);
  }

  if (allCalls.length === 0) return null;

  // Sort newest-first (answeredAt desc), then pick the first answered call > 10s
  allCalls.sort((a, b) =>
    (b.answeredAt ?? "").localeCompare(a.answeredAt ?? "")
  );

  return allCalls.find((c) => c.answeredAt && (c.duration ?? 0) > 10) ?? null;
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

/**
 * Fetches the recording download URL for a call, if available.
 * Returns null if no recording exists.
 */
async function fetchRecordingUrl(callId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.openphone.com/v1/call-recordings/${callId}`,
    { headers: OPENPHONE_HEADERS }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const recordings: { url?: string }[] = data?.data ?? [];
  return recordings[0]?.url ?? null;
}

export type TranscriptResult =
  | { ok: true; text: string; source: "transcript" | "summary" | "recording" }
  | { ok: false; error: string; setupUrl: string };

/**
 * Main entry point — call this from API routes.
 *
 * Priority:
 *   1. Full line-by-line transcript (OpenPhone Business plan)
 *   2. AI call summary (OpenPhone Business plan fallback)
 *   3. Auto-transcribe recording via Gemini (free — works with any plan that has recording enabled)
 *   4. Structured error prompting user to enable recording
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

  // Fall back to auto-transcribing the recording via Gemini (free)
  const recordingUrl = await fetchRecordingUrl(call.id);
  if (recordingUrl) {
    try {
      const transcribed = await transcribeAudio(recordingUrl);
      return { ok: true, text: transcribed, source: "recording" };
    } catch {
      // Transcription failed, fall through to error
    }
  }

  // Nothing available — recording not enabled
  return {
    ok: false,
    error: "Call found but no recording available. Enable Auto-record calls in OpenPhone Settings → Phone Numbers → select your number.",
    setupUrl: SETUP_URL,
  };
}

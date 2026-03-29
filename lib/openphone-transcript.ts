const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY!;

/**
 * Fetches the transcript of the most recent answered call for a given phone number.
 * OpenPhone returns calls newest-first by default, so we take the first answered call.
 * Returns null if no transcript is available (recording/transcription not enabled, or no calls found).
 */
export async function fetchLatestCallTranscript(phone: string): Promise<string | null> {
  // 1. List recent calls for this contact's phone number
  const callsRes = await fetch(
    `https://api.openphone.com/v1/calls?participants[]=${encodeURIComponent(phone)}&maxResults=10`,
    { headers: { Authorization: OPENPHONE_API_KEY } }
  );

  if (!callsRes.ok) {
    const err = await callsRes.text();
    throw new Error(`OpenPhone calls fetch failed: ${callsRes.status} ${err}`);
  }

  const callsData = await callsRes.json();
  // OpenPhone returns calls sorted newest-first — pick the most recent answered call
  const calls: { id: string; duration?: number; answeredAt?: string }[] =
    callsData?.data ?? [];

  if (calls.length === 0) return null;

  // Take the most recent call that was actually answered (has a transcript worth analyzing)
  const lastAnswered = calls.find((c) => c.answeredAt && (c.duration ?? 0) > 10) ?? calls[0];

  // 2. Fetch the transcript for that call
  const transcriptRes = await fetch(
    `https://api.openphone.com/v1/call-transcripts/${lastAnswered.id}`,
    { headers: { Authorization: OPENPHONE_API_KEY } }
  );

  if (!transcriptRes.ok) return null;

  const transcriptData = await transcriptRes.json();
  const segments: { speaker?: string; content?: string }[] =
    transcriptData?.data?.transcript ?? [];

  if (segments.length === 0) return null;

  // Format as readable dialogue
  return segments
    .map((s) => `${s.speaker ?? "Speaker"}: ${s.content ?? ""}`)
    .join("\n");
}

// Send Guard — validates every automated message before it goes out
// Prevents: wrong-hour sends, empty scripts, double-sends same day

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string };

// US Central time (recipients are in Wisconsin). CDT = UTC-5, CST = UTC-6.
// Simple DST: second Sunday of March → first Sunday of November = CDT (UTC-5), else CST (UTC-6).
function usCentralOffset(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  // Second Sunday of March
  const marchStart = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(Date.UTC(year, 2, 8 + ((7 - marchStart.getUTCDay()) % 7) + 1));
  // First Sunday of November
  const novStart = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, 1 + ((7 - novStart.getUTCDay()) % 7)));
  return now >= dstStart && now < dstEnd ? -5 : -6;
}

export function checkTimeWindow(): GuardResult {
  const now = new Date();
  const offset = usCentralOffset();
  const centralHour = ((now.getUTCHours() + offset) % 24 + 24) % 24;
  if (centralHour < 9 || centralHour >= 20) {
    return {
      ok: false,
      reason: `BLOCKED: Outside send window — US Central time is ${centralHour}:${String(now.getUTCMinutes()).padStart(2,"0")}. Allowed 09:00–20:00`,
    };
  }
  return { ok: true };
}

export function checkMessage(message: string): GuardResult {
  if (!message || message.trim().length < 10) {
    return { ok: false, reason: "BLOCKED: Message is empty or too short" };
  }
  return { ok: true };
}

export function checkNotSentToday(lastContact: string | null): GuardResult {
  if (!lastContact) return { ok: true };
  // Use Chicago time for date comparison — consistent with send window
  const offset = usCentralOffset();
  const now = new Date();
  const todayChicago = new Date(now.getTime() + offset * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const lastDate = lastContact.split("T")[0];
  if (lastDate === todayChicago) {
    return { ok: false, reason: `BLOCKED: Already contacted today (${lastDate} Chicago time)` };
  }
  return { ok: true };
}

export function runGuard(
  message: string,
  lastContact: string | null,
  skipTimeCheck = false
): GuardResult {
  if (!skipTimeCheck) {
    const time = checkTimeWindow();
    if (!time.ok) return time;
  }
  const msg = checkMessage(message);
  if (!msg.ok) return msg;
  const dup = checkNotSentToday(lastContact);
  if (!dup.ok) return dup;
  return { ok: true };
}

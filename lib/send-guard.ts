// Send Guard — validates every automated message before it goes out
// Prevents: wrong-hour sends, empty scripts, double-sends same day

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string };

// Israel time = UTC+3 (IDT summer). Allowed window: 09:00–18:00
export function checkTimeWindow(): GuardResult {
  const now = new Date();
  const israelHour = (now.getUTCHours() + 3) % 24;
  if (israelHour < 9 || israelHour >= 18) {
    return {
      ok: false,
      reason: `BLOCKED: Outside send window — Israel time is ${israelHour}:${String(now.getUTCMinutes()).padStart(2,"0")}. Allowed 09:00–18:00`,
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
  const todayIsrael = new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const lastDate = lastContact.split("T")[0];
  if (lastDate === todayIsrael) {
    return { ok: false, reason: `BLOCKED: Already contacted today (${lastDate})` };
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

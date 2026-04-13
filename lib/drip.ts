export const STATUS_DRIP = "Drip Active";
export const STATUS_POOL = "The Pool";
export const STATUS_NO_DEAL = "No Deal - Auto Reply";
export const STATUS_REPLIED = "Replied";
export const STATUS_POTENTIAL_DEAL = "Potential Deal";
export const STATUS_GRAVEYARD = "Graveyard";

// Polite auto-replies for non-HOT pool responses
export function getPoolNeutralReply(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `Thanks for getting back to me, ${firstName}! I'll keep you in mind and reach out when something interesting comes up on my end.`;
}

export function getPoolNoDealReply(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `Totally understood, no worries at all! Thanks for the response, ${firstName}. I'll be in touch down the road — hope you have a great week!`;
}

// Hieu timing: 5 days total (1 message per day), then 60-day pause via Pool
export function getDripDelay(step: number): number {
  // After sending step N, how many days until the next message
  // Step 0 → next day (NOT 0 — delay=0 caused step 1 to fire same day as step 0)
  const delays: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 };
  return delays[step] ?? 1;
}

export function getPoolDelay(step: number): number {
  const delays: Record<number, number> = { 1: 7, 2: 14, 3: 14, 4: 14, 5: 10, 6: 14, 7: 30, 8: 14, 9: 14 };
  return delays[step] ?? 14;
}

export function calculateNextDate(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

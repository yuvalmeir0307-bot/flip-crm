export const STATUS_DRIP = "Drip Active";
export const STATUS_POOL = "The Pool";
export const STATUS_NO_DEAL = "No Deal - Auto Reply";
export const STATUS_REPLIED = "Replied";
export const STATUS_POTENTIAL_DEAL = "Potential Deal";

// Polite auto-replies for non-HOT pool responses
export function getPoolNeutralReply(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `Thanks for getting back to me, ${firstName}! I'll keep you in mind and reach out when something interesting comes up on my end.`;
}

export function getPoolNoDealReply(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `Totally understood, no worries at all! Thanks for the response, ${firstName}. I'll be in touch down the road — hope you have a great week!`;
}

// Drip: 5 messages over 5 days — Hieu's system
// Step 0: immediate | Step 1: next day | Step 2: +1 day | Step 3: +1 day | Step 4: +1 day → Pool
export function getDripScript(step: number, name: string, sender = "Yuval"): string {
  const scripts: Record<number, string> = {
    0: `Hi ${name}, this is ${sender}. I'm looking to buy a home in the Milwaukee area. If you can help, could you give me a call back when you get a chance?`,
    1: `Hey ${name}, could you help me out? Would you be available for a quick call today?`,
    2: `Hey ${name}, are you still active with your license?`,
    3: `Hey ${name}, still looking to connect — when is a good time for a quick call this week?`,
    4: `Hey ${name}, last check-in — if a house that needs work or a motivated seller ever comes across your desk, I'd love to hear about it. I close fast.`,
  };
  return scripts[step] ?? scripts[0];
}

// Pool: post-conversation nurture — alternates deal asks + relationship builders
export function getPoolScript(step: number, name: string): string {
  const scripts: Record<number, string> = {
    1: `Hey ${name}, still actively buying in Milwaukee — any motivated sellers or off-market deals coming up?`,
    2: `Hey ${name}, quick question — what's your take on the Milwaukee market right now? Are sellers getting more flexible?`,
    3: `Hi ${name}, just a reminder — I'm still actively buying and happy to let you write the offer on both sides so you keep the full commission.`,
    4: `Hey ${name}, do you know anyone in your office with a property that needs work or a seller who just wants out fast? I pay cash and close in 2 weeks.`,
    5: `Hey ${name}, hope you're doing well — anything interesting coming across your desk lately?`,
    6: `Hey ${name}, any expired listings or properties where the seller is just done with the process? I can make a quiet cash offer fast — no showings, no hassle.`,
    7: `Hey ${name}, with everything going on with rates lately — what are you seeing on the ground in Milwaukee?`,
    8: `Hi ${name}, any off-market pocket listings coming up? I close fast with no contingencies.`,
    9: `Hey ${name}, if you have a difficult seller who needs cash fast, I can be the easy button. No repairs, no showings, close whenever they want.`,
  };
  return scripts[step] ?? scripts[5];
}

// Hieu timing: 5 days total (1 message per day), then 60-day pause via Pool
export function getDripDelay(step: number): number {
  const delays: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 60 };
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

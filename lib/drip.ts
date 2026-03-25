export const STATUS_DRIP = "Drip Active";
export const STATUS_POOL = "The Pool";
export const STATUS_HOT = "Replied - Pivot Call Needed - HOT";
export const STATUS_NO_DEAL = "No Deal - Auto Reply";

// Fallback scripts (used when Notion scripts DB is unavailable)
export function getDripScript(step: number, name: string, sender = "Yahav"): string {
  const scripts: Record<number, string> = {
    0: `Hi ${name}, this is ${sender}. Me and my partner are looking to buy properties in the Milwaukee area. If you can help us out, could you give me a call back when you get a chance?`,
    1: `Hey ${name}, just following up — would you be available for a quick call today? We are actively buying in Milwaukee and the surrounding area and would love to connect.`,
    2: `Hey ${name}, just circling back — we are still out here looking to buy. No rush, just wanted to stay on your radar.`,
    3: `Hey ${name}, still looking to pick up a property in the Milwaukee area. If you have 2 minutes this week, I would love to connect — when is a good time?`,
    4: `Hey ${name}, one more quick check-in — we are still actively buying in Milwaukee. If a motivated seller or a property that needs work ever comes across your desk, we close fast with cash and no hassle. Would love to work together!`,
  };
  return scripts[step] ?? scripts[0];
}

export function getPoolScript(step: number, name: string): string {
  const scripts: Record<number, string> = {
    1: `Hey ${name}, still actively buying in Milwaukee — any motivated sellers or off-market deals coming up?`,
    2: `Hey ${name}, quick question — what is your take on the Milwaukee market right now? Are sellers getting more flexible or still holding firm on price?`,
    3: `Hi ${name}, just a reminder — I am still actively buying and I am happy to let you write the offer on both sides so you keep the full commission. Worth keeping in mind!`,
    4: `Hey ${name}, do you know anyone in your office with a property that needs work or a seller who just wants out fast? We pay cash and close in 2 weeks.`,
    5: `Hey ${name}, hope you are doing well — anything interesting coming across your desk lately?`,
    6: `Hey ${name}, any expired listings or properties where the seller is just done with the process? We can make a quiet cash offer and get it off their hands fast — no showings, no hassle.`,
    7: `Hey ${name}, with everything going on with rates lately — what are you seeing on the ground in Milwaukee? Lots of buyer activity or starting to cool down?`,
    8: `Hi ${name}, any off-market pocket listings coming up that you would want to move quietly before hitting MLS? We close fast with no contingencies.`,
    9: `Hey ${name}, hope you are having a great week — if you have a difficult seller who needs cash fast, we can be the easy button. No repairs, no showings, close whenever they want.`,
  };
  return scripts[step] ?? scripts[5];
}

export function getDripDelay(step: number): number {
  const delays: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 7 };
  return delays[step] ?? 1;
}

export function getPoolDelay(step: number): number {
  const delays: Record<number, number> = { 1: 7, 2: 30, 3: 14, 4: 14, 5: 14, 6: 14, 7: 30, 8: 14, 9: 14 };
  return delays[step] ?? 14;
}

export function calculateNextDate(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

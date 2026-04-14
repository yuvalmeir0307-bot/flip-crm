import { NextResponse } from "next/server";
import { getAllScripts, updateScriptFields, createScript } from "@/lib/scripts";

// The definitive 14 messages — Drip 0-4 + Pool 1-9
// This is the SINGLE SOURCE OF TRUTH in code.
// Edit messages here → hit "Sync Defaults" in the UI → Notion updates.
// Or edit directly in the Scripts page → Notion updates instantly.

const DRIP_DEFAULTS: Record<number, { label: string; message: string; delay: number }> = {
  0: { label: "First Touch",     message: "Hi [Name], this is [Sender]. I'm looking to buy a home in the Milwaukee area. If you can help, could you give me a call back when you get a chance?", delay: 1 },
  1: { label: "Follow Up 1",     message: "Hey [Name], could you help me out? Would you be available for a quick call today?", delay: 1 },
  2: { label: "Follow Up 2",     message: "Hey [Name], are you still active with your license?", delay: 1 },
  3: { label: "Follow Up 3",     message: "Hey [Name], still looking to connect — when is a good time for a quick call this week?", delay: 1 },
  4: { label: "Last Touch",      message: "Hey [Name], last check-in — if a house that needs work or a motivated seller ever comes across your desk, I'd love to hear about it. I close fast.", delay: 1 },
};

const POOL_DEFAULTS: Record<number, { label: string; message: string; delay: number }> = {
  1: { label: "Pool Re-Engage",  message: "Hey [Name], still actively buying in Milwaukee — any motivated sellers or off-market deals coming up?", delay: 7 },
  2: { label: "Market Check",    message: "Hey [Name], quick question — what's your take on the Milwaukee market right now? Are sellers getting more flexible?", delay: 14 },
  3: { label: "Double Commission", message: "Hi [Name], just a reminder — I'm still actively buying and happy to let you write the offer on both sides so you keep the full commission.", delay: 14 },
  4: { label: "Office Leads",    message: "Hey [Name], do you know anyone in your office with a property that needs work or a seller who just wants out fast? I pay cash and close in 2 weeks.", delay: 14 },
  5: { label: "Check In",        message: "Hey [Name], hope you're doing well — anything interesting coming across your desk lately?", delay: 10 },
  6: { label: "Expired Listings", message: "Hey [Name], any expired listings or properties where the seller is just done with the process? I can make a quiet cash offer fast — no showings, no hassle.", delay: 14 },
  7: { label: "Market Rates",    message: "Hey [Name], with everything going on with rates lately — what are you seeing on the ground in Milwaukee?", delay: 30 },
  8: { label: "Off Market",      message: "Hi [Name], any off-market pocket listings coming up? I close fast with no contingencies.", delay: 14 },
  9: { label: "Easy Button",     message: "Hey [Name], if you have a difficult seller who needs cash fast, I can be the easy button. No repairs, no showings, close whenever they want.", delay: 14 },
};

export async function POST() {
  try {
    const existing = await getAllScripts();
    const logs: string[] = [];

    // Build lookup: "Drip-0", "Pool-1", etc.
    const existingMap = new Map(
      existing.map((s) => [`${s.campaign}-${s.step}`, s])
    );

    // Drip: steps 0-4
    for (const [stepStr, defaults] of Object.entries(DRIP_DEFAULTS)) {
      const step = Number(stepStr);
      const key = `Drip-${step}`;
      const existing = existingMap.get(key);

      if (existing) {
        await updateScriptFields(existing.id, { message: defaults.message, delay: defaults.delay });
        logs.push(`✅ Updated Drip Step ${step}`);
      } else {
        await createScript({ campaign: "Drip", step, label: defaults.label, message: defaults.message, delay: defaults.delay });
        logs.push(`🆕 Created Drip Step ${step}`);
      }
    }

    // Pool: steps 1-9
    for (const [stepStr, defaults] of Object.entries(POOL_DEFAULTS)) {
      const step = Number(stepStr);
      const key = `Pool-${step}`;
      const existing = existingMap.get(key);

      if (existing) {
        await updateScriptFields(existing.id, { message: defaults.message, delay: defaults.delay });
        logs.push(`✅ Updated Pool Step ${step}`);
      } else {
        await createScript({ campaign: "Pool", step, label: defaults.label, message: defaults.message, delay: defaults.delay });
        logs.push(`🆕 Created Pool Step ${step}`);
      }
    }

    return NextResponse.json({ ok: true, total: logs.length, logs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

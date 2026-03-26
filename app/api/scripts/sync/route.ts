import { NextResponse } from "next/server";
import { getAllScripts, updateScriptFields } from "@/lib/scripts";

// Updated drip messages: singular, no investor hints, Hieu's system
const DRIP_UPDATES: Record<number, { message: string; delay: number }> = {
  0: { message: "Hi [Name], this is [Sender]. I'm looking to buy a home in the Milwaukee area. If you can help, could you give me a call back when you get a chance?", delay: 1 },
  1: { message: "Hey [Name], could you help me out? Would you be available for a quick call today?", delay: 1 },
  2: { message: "Hey [Name], are you still active with your license?", delay: 1 },
  3: { message: "Hey [Name], still looking to connect — when is a good time for a quick call this week?", delay: 1 },
  4: { message: "Hey [Name], last check-in — if a house that needs work or a motivated seller ever comes across your desk, I'd love to hear about it. I close fast.", delay: 60 },
};

const POOL_UPDATES: Record<number, { message: string }> = {
  1: { message: "Hey [Name], still actively buying in Milwaukee — any motivated sellers or off-market deals coming up?" },
  2: { message: "Hey [Name], quick question — what's your take on the Milwaukee market right now? Are sellers getting more flexible?" },
  3: { message: "Hi [Name], just a reminder — I'm still actively buying and happy to let you write the offer on both sides so you keep the full commission." },
  4: { message: "Hey [Name], do you know anyone in your office with a property that needs work or a seller who just wants out fast? I pay cash and close in 2 weeks." },
  5: { message: "Hey [Name], hope you're doing well — anything interesting coming across your desk lately?" },
  6: { message: "Hey [Name], any expired listings or properties where the seller is just done with the process? I can make a quiet cash offer fast — no showings, no hassle." },
  7: { message: "Hey [Name], with everything going on with rates lately — what are you seeing on the ground in Milwaukee?" },
  8: { message: "Hi [Name], any off-market pocket listings coming up? I close fast with no contingencies." },
  9: { message: "Hey [Name], if you have a difficult seller who needs cash fast, I can be the easy button. No repairs, no showings, close whenever they want." },
};

export async function POST() {
  try {
    const scripts = await getAllScripts();
    const logs: string[] = [];

    for (const s of scripts) {
      if (s.campaign === "Drip" && DRIP_UPDATES[s.step]) {
        const update = DRIP_UPDATES[s.step];
        await updateScriptFields(s.id, { message: update.message, delay: update.delay });
        logs.push(`Updated Drip Step ${s.step}: message + delay=${update.delay}`);
      } else if (s.campaign === "Pool" && POOL_UPDATES[s.step]) {
        const update = POOL_UPDATES[s.step];
        await updateScriptFields(s.id, { message: update.message });
        logs.push(`Updated Pool Step ${s.step}: message`);
      }
    }

    return NextResponse.json({ ok: true, updated: logs.length, logs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

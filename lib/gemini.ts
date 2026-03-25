const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export type ClassifyResult = "HOT" | "NO_DEAL" | "NEUTRAL";

export async function classifyReply(message: string): Promise<ClassifyResult> {
  const prompt = `You are an AI assistant for a real estate wholesaling company.
A broker/agent just replied to an SMS. Classify the reply as one of:
- HOT: They showed interest, want to talk, asked about a deal, or sent a property
- NO_DEAL: They asked to be removed, said not interested, or were rude/hostile
- NEUTRAL: Anything else (out of office, confused, generic reply)

Reply: "${message}"

Respond with ONLY one word: HOT, NO_DEAL, or NEUTRAL`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200 },
      }),
    });

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? "NEUTRAL";

    if (text.includes("HOT")) return "HOT";
    if (text.includes("NO_DEAL") || text.includes("NO DEAL")) return "NO_DEAL";
    return "NEUTRAL";
  } catch {
    return "NEUTRAL";
  }
}

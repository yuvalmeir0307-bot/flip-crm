const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export type PillarScore = { score: number; evidence: string };

export type DiscoveryAnalysis = {
  address: string;
  agentName: string;
  dualAgencyEligible: "Yes" | "No" | "Unclear";
  leadScore: number;
  motivation: PillarScore;
  timeline: PillarScore;
  condition: PillarScore;
  priceFlexibility: PillarScore;
  viability: "Hot" | "Warm" | "Cold";
  agentSentiment: "Open to Double Dip" | "Protective/Guard-up";
  agreedToPresent: "Yes" | "No" | "Unclear";
  why: string;
  strategicNote: string;
  nextSteps: string[];
};

export async function analyzeDiscoveryCall(transcript: string): Promise<DiscoveryAnalysis> {
  const prompt = `You are a Real Estate Lead Qualification Specialist for a wholesaling/investing company.

Analyze this discovery call transcript and score the lead on the 4 Pillars (1–5 each):

PILLAR SCORING GUIDE:
Motivation: 1=No reason/testing market, 2=Lifestyle upgrade, 3=Relocation/divorce/inherited, 4=Financial stress/tired landlord, 5=Urgent/distressed/probate/foreclosure
Timeline: 1=No rush/whenever, 2=3-6 months, 3=60-90 days, 4=30-45 days, 5=ASAP/vacated/hard deadline
Condition: 1=Turnkey, 2=Minor cosmetics, 3=Moderate updates needed, 4=Significant repairs (roof/AC/plumbing), 5=Major structural/full rehab
Price Flexibility: 1=Firm on list, 2=Small wiggle (2-5%), 3=Open to reasonable offers, 4=Acknowledged needs work/below market OK, 5=Desperate/will take aggressive cash offer

VIABILITY: Hot=15-20pts, Warm=10-14pts, Cold=below 10

Respond ONLY with a valid JSON object in this exact shape:
{
  "address": "property address or Unknown",
  "agentName": "agent name or Unknown",
  "dualAgencyEligible": "Yes" | "No" | "Unclear",
  "leadScore": <sum of 4 pillar scores>,
  "motivation": { "score": <1-5>, "evidence": "<quote or paraphrase from transcript>" },
  "timeline": { "score": <1-5>, "evidence": "<quote or paraphrase from transcript>" },
  "condition": { "score": <1-5>, "evidence": "<quote or paraphrase from transcript>" },
  "priceFlexibility": { "score": <1-5>, "evidence": "<quote or paraphrase from transcript>" },
  "viability": "Hot" | "Warm" | "Cold",
  "agentSentiment": "Open to Double Dip" | "Protective/Guard-up",
  "agreedToPresent": "Yes" | "No" | "Unclear",
  "why": "<1-2 sentences: real reason seller is selling beneath the surface>",
  "strategicNote": "<agent's biggest pain point or leverage point>",
  "nextSteps": ["<action 1>", "<action 2>", "<action 3>"]
}

TRANSCRIPT:
${transcript}`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    }),
  });

  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");

  const parsed = JSON.parse(jsonMatch[0]) as DiscoveryAnalysis;
  parsed.leadScore = (parsed.motivation?.score ?? 0) + (parsed.timeline?.score ?? 0) + (parsed.condition?.score ?? 0) + (parsed.priceFlexibility?.score ?? 0);
  return parsed;
}

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

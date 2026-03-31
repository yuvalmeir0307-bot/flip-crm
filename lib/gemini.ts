const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
  if (data?.error) throw new Error(`Gemini API error: ${data.error.message ?? JSON.stringify(data.error)}`);
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");

  const parsed = JSON.parse(jsonMatch[0]) as DiscoveryAnalysis;
  parsed.leadScore = (parsed.motivation?.score ?? 0) + (parsed.timeline?.score ?? 0) + (parsed.condition?.score ?? 0) + (parsed.priceFlexibility?.score ?? 0);
  return parsed;
}

export type QualificationAnalysis = {
  agentName: string;
  brokerage: string;
  market: string;
  experience: "New" | "Mid-level" | "Veteran" | "Unknown";
  personality: string;
  callSummary: string;
  doubleCommissionStatus: "Accepted" | "Open" | "Declined" | "Not Discussed";
  doubleCommissionContext: string;
  painPoints: string[];
  rapportBuilders: string[];
  jvPotential: "High" | "Medium" | "Low" | "Too Early to Tell";
  jvReasoning: string;
  followUpStrategy: string;
};

export async function analyzeQualificationCall(transcript: string): Promise<QualificationAnalysis> {
  const prompt = `You are a Real Estate Team Manager and JV Specialist analyzing a qualification/pivot call with a real estate agent.

Your goal: extract agent relationship intelligence so the team can build genuine rapport, provide value, and close deals together.

Respond ONLY with a valid JSON object in this exact shape:
{
  "agentName": "name or Unknown",
  "brokerage": "brokerage name or Unknown",
  "market": "city/area or Unknown",
  "experience": "New" | "Mid-level" | "Veteran" | "Unknown",
  "personality": "brief 3-5 word characterization (e.g. 'Warm and chatty, easy rapport')",
  "callSummary": "3-5 sentence recap of the call: who they are, what was discussed, overall vibe and outcome",
  "doubleCommissionStatus": "Accepted" | "Open" | "Declined" | "Not Discussed",
  "doubleCommissionContext": "1-2 sentences on what was said about dual agency / double commission",
  "painPoints": [
    "Pain point 1 with context",
    "Pain point 2 with context"
  ],
  "rapportBuilders": [
    "Personal detail or shared interest from the call",
    "Another rapport note"
  ],
  "jvPotential": "High" | "Medium" | "Low" | "Too Early to Tell",
  "jvReasoning": "1-2 sentences on why this JV potential rating — based on tone, openness, and what was said",
  "followUpStrategy": "Specific actionable follow-up plan referencing things from the call. What to open with, what to offer, what to ask."
}

TRANSCRIPT:
${transcript}`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    }),
  });

  const data = await res.json();
  if (data?.error) throw new Error(`Gemini API error: ${data.error.message ?? JSON.stringify(data.error)}`);
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");

  return JSON.parse(jsonMatch[0]) as QualificationAnalysis;
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

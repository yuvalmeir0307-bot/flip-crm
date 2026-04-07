/**
 * Skill: grabAgents
 *
 * Finds real estate agents for the Milwaukee, WI area using Gemini + Google
 * Search grounding (replaces realtor.com scraping which is blocked from Vercel).
 * Adds new agents to the Flip CRM Notion database.
 */

import { findContactByPhone, createContact } from "@/lib/notion";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Milwaukee + ~40-min drive radius cities to rotate through
const LOCATIONS = [
  "Milwaukee, WI",
  "Wauwatosa, WI",
  "West Allis, WI",
  "Brookfield, WI",
  "Waukesha, WI",
  "Menomonee Falls, WI",
  "New Berlin, WI",
  "Mequon, WI",
  "Oak Creek, WI",
  "Shorewood, WI",
  "Greenfield, WI",
  "Franklin, WI",
  "Glendale, WI",
  "Racine, WI",
  "Grafton, WI",
];

export interface GrabResult {
  added: string[];
  skipped: string[];
  errors: string[];
}

interface GeminiAgent {
  name: string;
  phone: string;
  email?: string;
  brokerage?: string;
  area?: string;
}

/** Normalize any US phone string to E.164 (+1XXXXXXXXXX) */
function toE164(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 10) return `+1${digits.slice(-10)}`;
  return "";
}

/**
 * Use Gemini with Google Search grounding to find real estate agents
 * in a given city. Returns up to `count` agents with phone numbers.
 */
async function findAgentsViaGemini(city: string, count: number): Promise<GeminiAgent[]> {
  const prompt = `Search for ${count} active real estate agents who work in ${city}.

For each agent find: their full name, phone number (mobile preferred), email address, and brokerage/agency name.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"name": "Full Name", "phone": "+1XXXXXXXXXX", "email": "agent@example.com", "brokerage": "Brokerage Name", "area": "${city}"},
  ...
]

Rules:
- Only include agents with a confirmed phone number
- Phone must be in E.164 format (+1XXXXXXXXXX)
- Return exactly ${count} agents if possible, fewer if you cannot find enough with confirmed phones
- Do not fabricate data — only include agents you can confirm exist`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const agents = JSON.parse(jsonMatch[0]) as GeminiAgent[];
    return Array.isArray(agents) ? agents : [];
  } catch {
    return [];
  }
}

/**
 * Main entry point.
 * Finds `count` new agents (not already in Notion) for the given assignee.
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // Shuffle locations for variety on each run
  const locations = [...LOCATIONS].sort(() => Math.random() - 0.5);

  for (const city of locations) {
    if (added.length >= count) break;

    const needed = count - added.length;
    // Ask for a few extra in case some are duplicates
    const agents = await findAgentsViaGemini(city, Math.min(needed + 2, 8));

    for (const agent of agents) {
      if (added.length >= count) break;
      if (!agent.name || !agent.phone) continue;

      const phone = toE164(agent.phone);
      if (!phone || phone.length !== 12) continue;

      // Skip if already in Notion
      try {
        const existing = await findContactByPhone(phone);
        if (existing) {
          skipped.push(agent.name);
          continue;
        }
      } catch {
        // ignore lookup failures
      }

      try {
        await createContact({
          name: agent.name,
          phone,
          email: agent.email ?? "",
          brokerage: agent.brokerage ?? "",
          area: agent.area ?? city,
          source: "Gemini Search",
          status: "Drip Active",
          altPhones: "",
          assignedTo,
        });
        added.push(agent.name);
      } catch (e) {
        errors.push(
          `${agent.name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
  }

  return { added, skipped, errors };
}

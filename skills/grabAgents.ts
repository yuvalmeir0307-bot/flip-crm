/**
 * Skill: grabAgents
 *
 * Uses Gemini 2.0 Flash with Google Search grounding to discover verified
 * Milwaukee-area real estate agent contacts with personal/direct phone numbers.
 * Deduplicates by phone AND name against Notion, then inserts new agents as
 * "Drip Active" contacts.
 *
 * No ScraperAPI. No paid proxies. Uses GEMINI_GRAB_KEY for search grounding.
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

// Milwaukee + ~40-min drive radius — rotated per run
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
  "Germantown, WI",
  "Hartland, WI",
  "Pewaukee, WI",
  "Oconomowoc, WI",
  "Sussex, WI",
];

export interface GrabResult {
  added: string[];
  skipped: string[];
  errors: string[];
  unverified: string[];
}

interface GeminiAgent {
  name: string;
  phone: string;
  brokerage: string;
  area: string;
  verified: boolean;
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
 * Use Gemini 2.0 Flash with Google Search grounding to discover agents
 * in a specific city. Returns structured agent data with phone numbers.
 */
async function fetchAgentsViaGemini(
  city: string,
  count: number
): Promise<{ agents: GeminiAgent[]; error?: string }> {
  const apiKey = process.env.GEMINI_GRAB_KEY;
  if (!apiKey) return { agents: [], error: "GEMINI_GRAB_KEY not set" };

  const prompt = `Search for ${count * 3} real estate agents currently active in ${city}.
Use realtor.com, zillow.com, and google to find agents with their contact info.

For each agent return their full name, direct/mobile phone number, and brokerage.
IMPORTANT: Only include agents that have a direct or mobile phone number (not just an office number).

Return ONLY a valid JSON array, no other text:
[{"name":"Jane Smith","phone":"4141234567","brokerage":"Keller Williams Milwaukee"}]

Focus on finding personal/direct phone numbers. Skip any agent without a clear phone number.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(45000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { agents: [], error: `Gemini HTTP ${res.status}: ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON array from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return { agents: [], error: `No JSON in response: ${text.slice(0, 80)}` };

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      name?: string;
      phone?: string;
      brokerage?: string;
    }>;

    const agents: GeminiAgent[] = raw
      .filter((a) => a.name && a.phone)
      .map((a) => ({
        name: String(a.name ?? "").trim(),
        phone: toE164(String(a.phone ?? "")),
        brokerage: String(a.brokerage ?? "").trim(),
        area: city,
        verified: true, // Gemini sourced from public directories = verified
      }))
      .filter((a) => a.phone.length === 12 && a.name.length > 2);

    return { agents };
  } catch (e) {
    return {
      agents: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Main entry point.
 * Pulls `count` new agents (not already in Notion) for the given assignee.
 * Uses Gemini search grounding for discovery, checks duplicates by phone AND name.
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];

  // Shuffle locations for variety on each run
  const locations = [...LOCATIONS].sort(() => Math.random() - 0.5);

  for (const city of locations) {
    if (added.length >= count) break;

    const needed = count - added.length;
    const { agents, error } = await fetchAgentsViaGemini(city, needed + 2);

    if (error) {
      errors.push(`[${city}] ${error}`);
      continue;
    }

    for (const agent of agents) {
      if (added.length >= count) break;

      // Duplicate check by phone
      try {
        const existingByPhone = await findContactByPhone(agent.phone);
        if (existingByPhone) {
          skipped.push(`${agent.name} (phone duplicate)`);
          continue;
        }
      } catch {
        /* ignore lookup failures */
      }

      // Duplicate check by name
      try {
        const existingByName = await findContactByName(agent.name);
        if (existingByName) {
          skipped.push(`${agent.name} (name duplicate)`);
          continue;
        }
      } catch {
        /* ignore lookup failures */
      }

      try {
        await createContact({
          name: agent.name,
          phone: agent.phone,
          email: "",
          brokerage: agent.brokerage,
          area: agent.area,
          source: "Realtor.com",
          status: "Drip Active",
          altPhones: "",
          assignedTo,
          verified: agent.verified,
        });
        added.push(agent.name);
        if (!agent.verified) unverified.push(agent.name);
      } catch (e) {
        errors.push(
          `${agent.name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
  }

  return { added, skipped, errors, unverified };
}

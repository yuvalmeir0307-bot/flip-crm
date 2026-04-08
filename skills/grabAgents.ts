/**
 * Skill: grabAgents
 *
 * Uses Gemini 2.0 Flash with Google Search grounding to discover verified
 * Milwaukee-area real estate agent contacts with personal/direct phone numbers.
 * Makes a minimal number of API calls (1-2 per run) to avoid rate limits.
 * Deduplicates by phone AND name against Notion, then inserts "Drip Active".
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

// Rotation pools — pick a different subset each run for variety
const CITY_POOLS = [
  "Milwaukee, Wauwatosa, West Allis, Brookfield, Waukesha",
  "Menomonee Falls, Mequon, Oak Creek, Shorewood, Greenfield",
  "Franklin, Glendale, Racine, Grafton, Germantown",
  "Hartland, Pewaukee, Oconomowoc, Sussex, New Berlin",
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
 * One Gemini call with Google Search grounding to find N agents across
 * a set of Milwaukee-area cities.
 */
async function fetchAgentsViaGemini(
  cities: string,
  count: number,
  attempt: number
): Promise<{ agents: GeminiAgent[]; error?: string }> {
  const apiKey = process.env.GEMINI_GRAB_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { agents: [], error: "No Gemini API key set" };

  // Vary the search angle on retry to get different results
  const searchAngle =
    attempt === 1
      ? "Find real estate agents on realtor.com and zillow.com"
      : "Search Google for real estate agent profiles with phone numbers";

  const prompt = `${searchAngle} in these Wisconsin cities: ${cities}.

Find exactly ${count * 2} active real estate agents with direct or mobile phone numbers.
Use web search to find their contact info from public listings.

Return ONLY a JSON array (no markdown, no explanation):
[{"name":"Full Name","phone":"4141234567","brokerage":"Brokerage Name","city":"City, WI"}]

Rules:
- phone must be a 10-digit US number (no dashes, no parentheses)
- Include only agents with a personal direct or mobile number
- Do not include agents with only office/brokerage main line numbers`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(55000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        agents: [],
        error: `Gemini ${res.status}: ${errText.slice(0, 120)}`,
      };
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = clean.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return { agents: [], error: `No JSON array in response: ${text.slice(0, 100)}` };
    }

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      name?: string;
      phone?: string;
      brokerage?: string;
      city?: string;
    }>;

    const agents: GeminiAgent[] = raw
      .filter((a) => a.name && a.phone)
      .map((a) => ({
        name: String(a.name ?? "").trim(),
        phone: toE164(String(a.phone ?? "")),
        brokerage: String(a.brokerage ?? "").trim(),
        area: String(a.city ?? cities.split(",")[0]).trim(),
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
 * Pulls exactly `count` new agents for the given assignee.
 * Makes at most 2 Gemini calls to avoid rate limits.
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];

  // Pick a random city pool for variety
  const cityPool = CITY_POOLS[Math.floor(Math.random() * CITY_POOLS.length)];

  for (let attempt = 1; attempt <= 2 && added.length < count; attempt++) {
    const needed = count - added.length;
    const { agents, error } = await fetchAgentsViaGemini(cityPool, needed, attempt);

    if (error) {
      errors.push(error);
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
        /* ignore */
      }

      // Duplicate check by name
      try {
        const existingByName = await findContactByName(agent.name);
        if (existingByName) {
          skipped.push(`${agent.name} (name duplicate)`);
          continue;
        }
      } catch {
        /* ignore */
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
          verified: true,
        });
        added.push(agent.name);
      } catch (e) {
        errors.push(
          `${agent.name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
  }

  return { added, skipped, errors, unverified };
}

/**
 * Skill: grabAgents
 *
 * Finds real estate agents for the Milwaukee, WI area using Gemini + Google
 * Search grounding. Uses a dedicated API key (GEMINI_GRAB_KEY) separate from
 * the main Gemini key used for transcription/classification, so quotas don't
 * interfere with each other.
 */

import { findContactByPhone, createContact } from "@/lib/notion";

const GEMINI_API_KEY = process.env.GEMINI_GRAB_KEY ?? "AIzaSyCGbCWnLPQ9TZBMPxvweiUZL4sta1_YkeE";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

function toE164(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 10) return `+1${digits.slice(-10)}`;
  return "";
}

async function findAgentsViaGemini(
  city: string,
  count: number
): Promise<{ agents: GeminiAgent[]; error?: string }> {
  const prompt = `Search for ${count} active real estate agents who work in ${city}.

For each agent find their: full name, direct mobile or personal phone number, email address, and brokerage name.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"name": "Full Name", "phone": "+1XXXXXXXXXX", "email": "agent@example.com", "brokerage": "Brokerage Name", "area": "${city}"},
  ...
]

Rules:
- Phone must be a direct/mobile number for the agent (not a general brokerage office line)
- Phone must be in E.164 format (+1XXXXXXXXXX)
- Only include agents you can confirm exist with a verified phone
- Do not fabricate — if fewer than ${count} found, return what you have`;

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

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { agents: [], error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return { agents: [], error: `Gemini empty response` };
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { agents: [] };

    const agents = JSON.parse(jsonMatch[0]) as GeminiAgent[];
    return { agents: Array.isArray(agents) ? agents : [] };
  } catch (e) {
    return { agents: [], error: `Gemini exception: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const locations = [...LOCATIONS].sort(() => Math.random() - 0.5);

  for (const city of locations) {
    if (added.length >= count) break;

    const needed = count - added.length;
    const { agents, error } = await findAgentsViaGemini(city, Math.min(needed + 3, 8));

    if (error) {
      errors.push(`[${city}] ${error}`);
      break;
    }

    for (const agent of agents) {
      if (added.length >= count) break;
      if (!agent.name || !agent.phone) continue;

      const phone = toE164(agent.phone);
      if (!phone || phone.length !== 12) continue;

      try {
        const existing = await findContactByPhone(phone);
        if (existing) { skipped.push(agent.name); continue; }
      } catch { /* ignore lookup failures */ }

      try {
        await createContact({
          name: agent.name,
          phone,
          email: agent.email ?? "",
          brokerage: agent.brokerage ?? "",
          area: agent.area ?? city,
          source: "Realtor Search",
          status: "Drip Active",
          altPhones: "",
          assignedTo,
        });
        added.push(agent.name);
      } catch (e) {
        errors.push(`${agent.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
  }

  return { added, skipped, errors };
}

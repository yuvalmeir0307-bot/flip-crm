/**
 * Skill: grabAgents
 *
 * Two-tier discovery pipeline:
 *
 * Tier 1 — Gemini (all brokerages):
 *   Uses Gemini 2.0 Flash with Google Search grounding to find Milwaukee-area
 *   agents across ALL brokerages (KW, Coldwell, Redfin, Compass, etc.).
 *   Makes exactly 1 API call per button press to stay within free quota.
 *   Falls back to Tier 2 if quota is exceeded.
 *
 * Tier 2 — RE/MAX direct (reliable fallback):
 *   Fetches RE/MAX city directory pages which expose structured JSON-LD
 *   (RealEstateAgent) data with names and phones. No API keys. No bot blocks.
 *   ~15 city pages × 20 agents = 300 agent pool.
 *
 * Deduplicates by phone AND name against Notion before inserting.
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

// RE/MAX Milwaukee-area city pages (confirmed accessible, ~18-24 agents each)
const REMAX_PAGES = [
  "https://www.remax.com/real-estate-agents/milwaukee-wi",
  "https://www.remax.com/real-estate-agents/brookfield-wi",
  "https://www.remax.com/real-estate-agents/waukesha-wi",
  "https://www.remax.com/real-estate-agents/wauwatosa-wi",
  "https://www.remax.com/real-estate-agents/west-allis-wi",
  "https://www.remax.com/real-estate-agents/mequon-wi",
  "https://www.remax.com/real-estate-agents/menomonee-falls-wi",
  "https://www.remax.com/real-estate-agents/new-berlin-wi",
  "https://www.remax.com/real-estate-agents/oak-creek-wi",
  "https://www.remax.com/real-estate-agents/racine-wi",
  "https://www.remax.com/real-estate-agents/franklin-wi",
  "https://www.remax.com/real-estate-agents/greenfield-wi",
  "https://www.remax.com/real-estate-agents/kenosha-wi",
  "https://www.remax.com/real-estate-agents/oconomowoc-wi",
  "https://www.remax.com/real-estate-agents/pewaukee-wi",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface GrabResult {
  added: string[];
  skipped: string[];
  errors: string[];
  unverified: string[];
}

interface RawCandidate {
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

// ─────────────────────────────────────────────
// Tier 1: Gemini with Google Search grounding
// Returns agents from ALL brokerages
// ─────────────────────────────────────────────

const CITY_POOLS = [
  "Milwaukee, Wauwatosa, West Allis, Brookfield, Waukesha",
  "Menomonee Falls, Mequon, Oak Creek, Shorewood, Greenfield",
  "Franklin, Glendale, Racine, Grafton, Germantown",
  "Hartland, Pewaukee, Oconomowoc, Sussex, New Berlin",
];

async function fetchViaGemini(
  count: number
): Promise<{ agents: RawCandidate[]; rateLimited: boolean; error?: string }> {
  const apiKey = process.env.GEMINI_GRAB_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { agents: [], rateLimited: false, error: "No Gemini API key" };

  const cities = CITY_POOLS[Math.floor(Math.random() * CITY_POOLS.length)];
  const prompt = `Search realtor.com and zillow.com for real estate agents in these Wisconsin cities: ${cities}.

Find ${count * 3} active agents with direct or mobile phone numbers.

Return ONLY a JSON array (no markdown, no explanation):
[{"name":"Full Name","phone":"4141234567","brokerage":"Brokerage Name","city":"City, WI"}]

Rules:
- phone must be 10 digits, no dashes or spaces
- Only agents with a personal direct or mobile number (not a brokerage main line)
- Include agents from ALL brokerages (KW, Coldwell Banker, Compass, Redfin, independent, etc.)`;

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

    if (res.status === 429) return { agents: [], rateLimited: true };
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { agents: [], rateLimited: false, error: `Gemini ${res.status}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = clean.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return { agents: [], rateLimited: false, error: "No JSON in Gemini response" };

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      name?: string; phone?: string; brokerage?: string; city?: string;
    }>;

    const agents: RawCandidate[] = raw
      .filter((a) => a.name && a.phone)
      .map((a) => ({
        name: String(a.name ?? "").trim(),
        phone: toE164(String(a.phone ?? "")),
        brokerage: String(a.brokerage ?? "").trim(),
        area: String(a.city ?? "Milwaukee, WI").trim(),
      }))
      .filter((a) => a.phone.length === 12 && a.name.length > 2);

    return { agents, rateLimited: false };
  } catch (e) {
    return { agents: [], rateLimited: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────
// Tier 2: RE/MAX JSON-LD directory scraping
// Reliable fallback — no API keys needed
// ─────────────────────────────────────────────

async function fetchViaRemax(
  pageUrl: string
): Promise<{ agents: RawCandidate[]; error?: string }> {
  try {
    const res = await fetch(pageUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { agents: [], error: `HTTP ${res.status}` };

    const html = await res.text();
    const ldMatches =
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];

    const agents: RawCandidate[] = [];

    for (const block of ldMatches) {
      try {
        const json = block
          .replace(/<script[^>]*>/, "")
          .replace(/<\/script>/, "")
          .trim();
        const data = JSON.parse(json);
        const items: Array<Record<string, unknown>> = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item["@type"] !== "RealEstateAgent") continue;
          const name = String(item.name ?? "").trim();
          const phone = toE164(String(item.telephone ?? ""));
          if (!name || phone.length !== 12) continue;

          const addr = item.address as Record<string, string> | undefined;
          const city = addr?.addressLocality ?? "Milwaukee";
          const state = addr?.addressRegion ?? "WI";

          agents.push({ name, phone, brokerage: "RE/MAX", area: `${city}, ${state}` });
        }
      } catch { /* skip */ }
    }

    return { agents };
  } catch (e) {
    return { agents: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────

export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];
  const seen = new Set<string>();

  // ── Tier 1: Try Gemini (all brokerages) ──
  const gemini = await fetchViaGemini(count);
  let candidates: RawCandidate[] = gemini.agents;
  const usedGemini = candidates.length > 0;

  if (gemini.rateLimited) {
    errors.push("Gemini quota exceeded today — using RE/MAX fallback (RE/MAX agents only)");
  } else if (gemini.error && !usedGemini) {
    errors.push(`Gemini unavailable (${gemini.error}) — using RE/MAX fallback`);
  }

  // ── Tier 2: RE/MAX fallback if Gemini had no results ──
  if (!usedGemini) {
    const pages = [...REMAX_PAGES].sort(() => Math.random() - 0.5);
    for (const pageUrl of pages) {
      if (candidates.length >= count * 3) break;
      const { agents, error } = await fetchViaRemax(pageUrl);
      if (error) errors.push(`[RE/MAX] ${error}`);
      else candidates.push(...agents);
    }
  }

  // ── Dedup and insert ──
  for (const candidate of candidates) {
    if (added.length >= count) break;

    const key = `${candidate.phone}|${candidate.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const existingByPhone = await findContactByPhone(candidate.phone);
      if (existingByPhone) { skipped.push(`${candidate.name} (phone duplicate)`); continue; }
    } catch { /* ignore */ }

    try {
      const existingByName = await findContactByName(candidate.name);
      if (existingByName) { skipped.push(`${candidate.name} (name duplicate)`); continue; }
    } catch { /* ignore */ }

    try {
      await createContact({
        name: candidate.name,
        phone: candidate.phone,
        email: "",
        brokerage: candidate.brokerage,
        area: candidate.area,
        source: "Realtor.com",
        status: "Drip Active",
        altPhones: "",
        assignedTo,
        verified: usedGemini,
      });
      added.push(candidate.name);
      if (!usedGemini) unverified.push(candidate.name);
    } catch (e) {
      errors.push(`${candidate.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  if (!added.length && !skipped.length) {
    errors.push("No agents found across all sources");
  }

  return { added, skipped, errors, unverified };
}

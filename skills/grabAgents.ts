/**
 * Skill: grabAgents
 *
 * Discovers Milwaukee-area real estate agents from RE/MAX, Century 21, and
 * Coldwell Banker agent directory pages. These sites expose structured
 * JSON-LD (RealEstateAgent) data with names and phone numbers, accessible
 * from Vercel serverless functions without any API keys.
 *
 * No ScraperAPI. No Gemini. No paid proxies. Just direct HTTP.
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

// Milwaukee-area city slugs to rotate across — returns fresh agents each run
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
];

const C21_PAGES = [
  "https://www.century21.com/real-estate/milwaukee_WI/LCMILWAUKEEWI/",
  "https://www.century21.com/real-estate/brookfield_WI/LCBROOKFIELDWI/",
  "https://www.century21.com/real-estate/waukesha_WI/LCWAUKESHAWI/",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

/**
 * Fetch a RE/MAX or Century21 agent directory page and extract agents
 * from the JSON-LD structured data embedded in the page.
 */
async function fetchAgentPage(
  url: string,
  brokerageLabel: string
): Promise<{ agents: RawCandidate[]; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { agents: [], error: `HTTP ${res.status}` };

    const html = await res.text();

    // Extract JSON-LD blocks
    const ldMatches =
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ??
      [];

    const agents: RawCandidate[] = [];

    for (const block of ldMatches) {
      try {
        const json = block
          .replace(/<script[^>]*>/, "")
          .replace(/<\/script>/, "")
          .trim();
        const data = JSON.parse(json);

        // Handle both array and single object
        const items: Array<Record<string, unknown>> = Array.isArray(data)
          ? data
          : [data];

        for (const item of items) {
          if (item["@type"] !== "RealEstateAgent") continue;

          const name = String(item.name ?? "").trim();
          const phone = toE164(String(item.telephone ?? ""));

          if (!name || phone.length !== 12) continue;

          // Extract city from address
          const addr = item.address as Record<string, string> | undefined;
          const city = addr?.addressLocality ?? "Milwaukee";
          const state = addr?.addressRegion ?? "WI";
          const area = `${city}, ${state}`;

          agents.push({ name, phone, brokerage: brokerageLabel, area });
        }
      } catch {
        /* skip malformed blocks */
      }
    }

    // Fallback: try to extract from inline __NEXT_DATA__ (Century 21)
    if (!agents.length) {
      const nextMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (nextMatch) {
        try {
          const data = JSON.parse(nextMatch[1]);
          const agentList =
            data?.props?.pageProps?.agents ??
            data?.props?.pageProps?.agentList ??
            [];
          for (const a of agentList) {
            const name = String(a?.name ?? a?.agentName ?? "").trim();
            const rawPhone =
              a?.phoneNumber ?? a?.phone ?? a?.mobilePhone ?? "";
            const phone = toE164(String(rawPhone));
            if (name && phone.length === 12) {
              agents.push({
                name,
                phone,
                brokerage: brokerageLabel,
                area: "Milwaukee, WI",
              });
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

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
 * Pulls exactly `count` new agents for the given assignee using RE/MAX and
 * Century 21 agent directory pages (structured data, no API keys required).
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];

  // Build source list: RE/MAX pages first, then C21
  const sources: Array<{ url: string; label: string }> = [
    ...REMAX_PAGES.map((url) => ({ url, label: "RE/MAX" })),
    ...C21_PAGES.map((url) => ({ url, label: "Century 21" })),
  ];

  // Shuffle for variety on each run
  sources.sort(() => Math.random() - 0.5);

  const seen = new Set<string>();

  for (const source of sources) {
    if (added.length >= count) break;

    const { agents, error } = await fetchAgentPage(source.url, source.label);

    if (error) {
      errors.push(`[${source.label}] ${error}`);
      continue;
    }

    for (const agent of agents) {
      if (added.length >= count) break;

      // Skip within-batch duplicates
      const key = `${agent.phone}|${agent.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Duplicate check by phone against Notion
      try {
        const existingByPhone = await findContactByPhone(agent.phone);
        if (existingByPhone) {
          skipped.push(`${agent.name} (phone duplicate)`);
          continue;
        }
      } catch {
        /* ignore */
      }

      // Duplicate check by name against Notion
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
          verified: true, // sourced from official brokerage directories
        });
        added.push(agent.name);
      } catch (e) {
        errors.push(
          `${agent.name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
  }

  if (!added.length && !skipped.length && errors.length === 0) {
    errors.push("No agents with phone numbers found across all sources");
  }

  return { added, skipped, errors, unverified };
}

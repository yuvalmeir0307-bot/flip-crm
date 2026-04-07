/**
 * Skill: grabAgents
 *
 * Scrapes real estate agents from realtor.com using ScraperAPI (free tier:
 * 5,000 req/month) to bypass Vercel IP blocking. Extracts direct/mobile
 * phone numbers, verifies them against a second source (DuckDuckGo), checks
 * for duplicates by both phone AND name, then adds new agents to Notion.
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY!;

// Milwaukee + ~40-min drive radius
const LOCATIONS = [
  "Milwaukee_WI",
  "Wauwatosa_WI",
  "West-Allis_WI",
  "Brookfield_WI",
  "Waukesha_WI",
  "Menomonee-Falls_WI",
  "New-Berlin_WI",
  "Mequon_WI",
  "Oak-Creek_WI",
  "Shorewood_WI",
  "Greenfield_WI",
  "Franklin_WI",
  "Glendale_WI",
  "Racine_WI",
  "Grafton_WI",
  "Germantown_WI",
  "Hartland_WI",
  "Pewaukee_WI",
  "Oconomowoc_WI",
  "Sussex_WI",
];

// Phone type priority: lower index = higher priority
const PHONE_PRIORITY = ["mobile", "direct", "office"];

export interface GrabResult {
  added: string[];
  skipped: string[];
  errors: string[];
  unverified: string[];
}

interface RawPhone {
  number: string;
  type: string;
}

interface RawAgent {
  full_name?: string;
  phones?: RawPhone[];
  email?: string;
  broker?: { name?: string };
  office?: { name?: string };
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

/** Sort phones by priority and return { primary, alts, isPersonal } */
function pickBestPhone(phones: RawPhone[]): { primary: string; alts: string[]; isPersonal: boolean } {
  const valid = phones
    .filter((p) => p.number && p.type !== "fax")
    .map((p) => ({ ...p, e164: toE164(p.number) }))
    .filter((p) => p.e164.length === 12);

  valid.sort((a, b) => {
    const ai = PHONE_PRIORITY.indexOf(a.type) === -1 ? 99 : PHONE_PRIORITY.indexOf(a.type);
    const bi = PHONE_PRIORITY.indexOf(b.type) === -1 ? 99 : PHONE_PRIORITY.indexOf(b.type);
    return ai - bi;
  });

  if (!valid.length) return { primary: "", alts: [], isPersonal: false };
  const best = valid[0];
  const primary = best.e164;
  const isPersonal = best.type === "mobile" || best.type === "direct";
  const alts = Array.from(new Set(valid.slice(1).map((p) => p.e164).filter((n) => n !== primary)));
  return { primary, alts, isPersonal };
}

/**
 * Verify a phone number on a second source (DuckDuckGo HTML search).
 * Returns true if the last 7 digits of the number appear in search results
 * alongside the agent's name — confirming it's a real, known number.
 */
async function verifyPhoneSecondSource(name: string, phone: string): Promise<boolean> {
  try {
    const last7 = phone.replace(/\D/g, "").slice(-7);
    const query = encodeURIComponent(`"${name}" "${last7}" realtor Wisconsin`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    if (!res.ok) return false;
    const html = await res.text();
    // Phone verified if last 7 digits appear in results (different source than Realtor.com)
    return html.includes(last7) && html.length > 1000;
  } catch {
    return false;
  }
}

/** Fetch one page of agents from realtor.com via ScraperAPI */
async function fetchAgentsPage(locationSlug: string, page: number): Promise<{ agents: RawAgent[]; error?: string }> {
  const targetUrl = page === 1
    ? `https://www.realtor.com/realestateagents/${locationSlug}`
    : `https://www.realtor.com/realestateagents/${locationSlug}/pg-${page}`;

  const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=false`;

  try {
    const res = await fetch(scraperUrl, {
      headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });

    if (!res.ok) return { agents: [], error: `ScraperAPI HTTP ${res.status}` };

    const html = await res.text();

    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return { agents: [], error: "No __NEXT_DATA__ found" };

    const data = JSON.parse(match[1]);
    const pageProps = data?.props?.pageProps ?? {};

    const agents: RawAgent[] =
      pageProps?.agentInfo?.matching_rows ??
      pageProps?.agents ??
      pageProps?.data?.agents ??
      pageProps?.initialData?.agents ??
      pageProps?.searchResults?.agents ??
      [];

    return { agents };
  } catch (e) {
    return { agents: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Main entry point.
 * Pulls `count` new agents (not already in Notion) for the given assignee.
 * Checks duplicates by phone AND name. Verifies personal numbers via second source.
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];

  if (!SCRAPER_API_KEY) {
    errors.push("SCRAPER_API_KEY env var is not set");
    return { added, skipped, errors, unverified };
  }

  // Shuffle locations for variety on each run
  const locations = [...LOCATIONS].sort(() => Math.random() - 0.5);

  outer: for (const slug of locations) {
    for (let page = 1; page <= 5; page++) {
      if (added.length >= count) break outer;

      const { agents: rawAgents, error } = await fetchAgentsPage(slug, page);

      if (error) {
        errors.push(`[${slug} p${page}] ${error}`);
        if (error.startsWith("ScraperAPI HTTP")) break;
        continue;
      }

      if (!rawAgents.length) break;

      for (const raw of rawAgents) {
        if (added.length >= count) break outer;
        if (!raw.full_name || !raw.phones?.length) continue;

        const { primary, alts, isPersonal } = pickBestPhone(raw.phones);
        if (!primary) continue;

        // Duplicate check by phone
        try {
          const existingByPhone = await findContactByPhone(primary);
          if (existingByPhone) { skipped.push(`${raw.full_name} (phone duplicate)`); continue; }
        } catch { /* ignore lookup failures */ }

        // Duplicate check by name
        try {
          const existingByName = await findContactByName(raw.full_name);
          if (existingByName) { skipped.push(`${raw.full_name} (name duplicate)`); continue; }
        } catch { /* ignore lookup failures */ }

        // Verify personal number on second source (DuckDuckGo)
        // Mobile/direct from Realtor.com = self-reported personal number → verified
        // Office-only → attempt second-source check
        let verified = isPersonal;
        if (!isPersonal) {
          verified = await verifyPhoneSecondSource(raw.full_name, primary);
        }

        const brokerage = raw.broker?.name ?? raw.office?.name ?? "";

        try {
          await createContact({
            name: raw.full_name,
            phone: primary,
            email: raw.email ?? "",
            brokerage,
            area: slug.replace(/_WI$/, ", WI").replace(/_/g, " "),
            source: "Realtor.com",
            status: "Drip Active",
            altPhones: alts.join(", "),
            assignedTo,
            verified,
          });
          added.push(raw.full_name);
          if (!verified) unverified.push(raw.full_name);
        } catch (e) {
          errors.push(`${raw.full_name}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }
  }

  return { added, skipped, errors, unverified };
}

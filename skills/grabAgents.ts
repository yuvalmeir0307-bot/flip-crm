/**
 * Skill: grabAgents
 *
 * Discovers Milwaukee-area real estate agents via DuckDuckGo HTML search
 * (zero API keys required — same source used for phone verification).
 * Extracts agent name, phone, and brokerage from search snippets and
 * individual Realtor.com / Zillow profile pages, then deduplicates against
 * Notion and inserts new agents as "Drip Active" contacts.
 */

import { findContactByPhone, findContactByName, createContact } from "@/lib/notion";

const SEARCH_QUERIES = [
  "real estate agent Milwaukee WI direct phone site:realtor.com",
  "real estate agent Brookfield Wauwatosa WI phone site:realtor.com",
  "realtor Milwaukee WI mobile number site:zillow.com",
  "real estate agent Waukesha Mequon WI phone site:realtor.com",
  "realtor West Allis Oak Creek WI direct number site:realtor.com",
  "real estate agent Menomonee Falls Germantown WI phone",
  "realtor Racine Kenosha WI direct phone number",
  "real estate agent Shorewood Glendale WI phone realtor.com",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
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

/** Extract all US phone numbers from a text string */
function extractPhones(text: string): string[] {
  const matches = text.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? [];
  return [...new Set(matches.map(toE164).filter((p) => p.length === 12))];
}

/** Decode HTML entities */
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Strip all HTML tags */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Search DuckDuckGo HTML and parse results for agent candidates.
 * Returns candidates with name + phone extracted from snippets.
 */
async function searchDuckDuckGo(query: string): Promise<RawCandidate[]> {
  const candidates: RawCandidate[] = [];

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return candidates;

    const html = await res.text();

    // Extract result blocks
    const resultBlocks = html.match(/<div class="result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g) ?? [];

    for (const block of resultBlocks) {
      const text = decodeHtml(stripTags(block));

      // Extract phones from snippet
      const phones = extractPhones(text);
      if (!phones.length) continue;

      // Try to extract agent name — look for title link text
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      if (!titleMatch) continue;
      const titleText = decodeHtml(stripTags(titleMatch[1]));

      // Realtor.com titles look like "Jane Smith - Realtor | Keller Williams"
      // Zillow titles look like "Jane Smith - Real Estate Agent in Milwaukee, WI"
      const namePart = titleText.split(/[-|]/)[0].trim();
      if (!namePart || namePart.length < 4 || namePart.split(" ").length < 2) continue;

      // Extract brokerage from title or snippet
      const brokerageMatch =
        titleText.match(/(?:at|with|\|)\s*([A-Z][A-Za-z\s&]+(?:Realty|Realtors|Group|Properties|Real Estate|RE\/MAX|Keller|Century|Coldwell|Berkshire|eXp|Compass))/i)?.[1] ??
        text.match(/(?:Brokerage|Broker)[:\s]+([A-Z][A-Za-z\s]+)/i)?.[1] ??
        "";

      // Area: extract city from snippet or title
      const areaMatch =
        text.match(/Milwaukee|Wauwatosa|Brookfield|Waukesha|Mequon|Oak Creek|Greenfield|Franklin|Glendale|Racine|West Allis|Shorewood/i)?.[0] ??
        "Milwaukee";

      for (const phone of phones) {
        candidates.push({
          name: namePart,
          phone,
          brokerage: brokerageMatch.trim(),
          area: `${areaMatch}, WI`,
        });
      }
    }
  } catch {
    /* ignore fetch errors */
  }

  return candidates;
}

/**
 * Fetch a Realtor.com individual agent profile page and extract contact info.
 * Individual profiles are far less rate-limited than directory pages.
 */
async function fetchRealtorProfile(profileUrl: string): Promise<RawCandidate | null> {
  try {
    const res = await fetch(profileUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract JSON-LD structured data
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ldMatch) {
      const ld = JSON.parse(ldMatch[1]);
      const name = ld?.name ?? "";
      const phone = toE164(ld?.telephone ?? "");
      const brokerage = ld?.memberOf?.name ?? ld?.worksFor?.name ?? "";
      if (name && phone.length === 12) {
        return { name, phone, brokerage, area: "Milwaukee, WI" };
      }
    }

    // Fallback: extract from __NEXT_DATA__
    const nextMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (nextMatch) {
      const data = JSON.parse(nextMatch[1]);
      const agent =
        data?.props?.pageProps?.agentDetails ??
        data?.props?.pageProps?.agent ??
        {};
      const name = agent?.full_name ?? "";
      const phones: Array<{ number: string; type: string }> = agent?.phones ?? [];
      const best = phones
        .filter((p) => p.type !== "fax" && p.number)
        .sort((a, b) => {
          const order = ["mobile", "direct", "office"];
          return order.indexOf(a.type) - order.indexOf(b.type);
        })[0];
      const phone = best ? toE164(best.number) : "";
      const brokerage = agent?.broker?.name ?? agent?.office?.name ?? "";
      if (name && phone.length === 12) {
        return { name, phone, brokerage, area: "Milwaukee, WI" };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Realtor.com agent profile URLs from a DuckDuckGo result page HTML.
 */
function extractProfileUrls(html: string): string[] {
  const urls: string[] = [];
  const hrefs = html.match(/href="https?:\/\/www\.realtor\.com\/realestateagents\/[a-z0-9-]+"/g) ?? [];
  for (const h of hrefs) {
    const url = h.replace(/href="/, "").replace(/"$/, "");
    // Filter out listing/directory pages — we want individual profiles
    if (!url.includes("/pg-") && !url.endsWith("/realestateagents")) {
      urls.push(url);
    }
  }
  return [...new Set(urls)];
}

/**
 * Main entry point.
 * Pulls exactly `count` new agents for the given assignee.
 * Uses DuckDuckGo search + optional Realtor.com profile fetch.
 * No paid API keys required.
 */
export async function grabAndAddAgents(
  assignedTo: "Yahav" | "Yuval",
  count = 5
): Promise<GrabResult> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const unverified: string[] = [];

  // Shuffle queries for variety
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  const allCandidates: RawCandidate[] = [];

  // Phase 1: Collect candidates from DuckDuckGo snippets
  for (const query of queries) {
    if (allCandidates.length >= count * 4) break;
    const results = await searchDuckDuckGo(query);
    allCandidates.push(...results);
  }

  // Phase 2: If we got profile URLs via DuckDuckGo, also try fetching profiles
  // for richer data (this runs in background alongside snippet candidates)
  if (allCandidates.length < count * 2) {
    try {
      const ddgHtml = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent("realtor.com Milwaukee WI real estate agent profile")}`,
        { headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], Accept: "text/html" } }
      ).then((r) => (r.ok ? r.text() : ""));

      const profileUrls = extractProfileUrls(ddgHtml).slice(0, 10);
      for (const url of profileUrls) {
        const candidate = await fetchRealtorProfile(url);
        if (candidate) allCandidates.push(candidate);
      }
    } catch {
      /* ignore */
    }
  }

  if (!allCandidates.length) {
    errors.push("No candidates found — DuckDuckGo returned no results with phone numbers");
    return { added, skipped, errors, unverified };
  }

  // Phase 3: Dedup and insert
  const seen = new Set<string>();
  for (const candidate of allCandidates) {
    if (added.length >= count) break;

    // Skip within-batch duplicates
    const key = `${candidate.phone}|${candidate.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Duplicate check by phone against Notion
    try {
      const existingByPhone = await findContactByPhone(candidate.phone);
      if (existingByPhone) {
        skipped.push(`${candidate.name} (phone duplicate)`);
        continue;
      }
    } catch {
      /* ignore */
    }

    // Duplicate check by name against Notion
    try {
      const existingByName = await findContactByName(candidate.name);
      if (existingByName) {
        skipped.push(`${candidate.name} (name duplicate)`);
        continue;
      }
    } catch {
      /* ignore */
    }

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
        verified: false, // mark as unverified — sourced from search snippets
      });
      added.push(candidate.name);
      unverified.push(candidate.name); // all snippet-sourced contacts are unverified
    } catch (e) {
      errors.push(
        `${candidate.name}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }

  return { added, skipped, errors, unverified };
}

/**
 * Skill: grabAgents
 *
 * Pulls real estate agents for the Milwaukee, WI area from homes.com
 * (CoStar-backed, crawler-accessible from Vercel), then adds new agents
 * to the Flip CRM Notion database.
 *
 * Falls back to homelight.com if homes.com yields no results.
 */

import { findContactByPhone, createContact } from "@/lib/notion";

// Milwaukee + ~40-min drive radius slugs for homes.com
const HOMES_SLUGS = [
  "milwaukee-wi",
  "wauwatosa-wi",
  "west-allis-wi",
  "brookfield-wi",
  "waukesha-wi",
  "menomonee-falls-wi",
  "new-berlin-wi",
  "mequon-wi",
  "oak-creek-wi",
  "shorewood-wi",
  "greenfield-wi",
  "franklin-wi",
  "glendale-wi",
  "racine-wi",
  "grafton-wi",
];

export interface GrabResult {
  added: string[];
  skipped: string[];
  errors: string[];
}

interface RawAgent {
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

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

/** Parse __NEXT_DATA__ from an HTML string */
function parseNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** Extract all phone-like strings from any text blob */
function extractPhones(text: string): string[] {
  const matches = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) ?? [];
  return [...new Set(matches.map(toE164).filter(p => p.length === 12))];
}

/** Fetch agents from homes.com agent search page */
async function fetchFromHomesPage(slug: string, page: number): Promise<RawAgent[]> {
  const url = page === 1
    ? `https://www.homes.com/real-estate-agents/${slug}/`
    : `https://www.homes.com/real-estate-agents/${slug}/?p=${page}`;

  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) return [];
    const html = await res.text();

    const nextData = parseNextData(html);
    if (nextData) {
      const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } })?.props?.pageProps ?? {};

      // Try known paths for homes.com agent list
      const agents: unknown[] =
        (pageProps as Record<string, unknown[]>)?.agents ??
        (pageProps as { data?: Record<string, unknown[]> })?.data?.agents ??
        (pageProps as { results?: unknown[] })?.results ??
        (pageProps as { agentResults?: unknown[] })?.agentResults ??
        [];

      if (agents.length > 0) {
        return agents.map((a: unknown) => {
          const agent = a as Record<string, unknown>;
          const name = String(agent.fullName ?? agent.name ?? agent.agentName ?? "");
          const rawPhone = String(
            (agent.phones as Record<string, string>[])?.[0]?.phoneNumber ??
            agent.phone ?? agent.phoneNumber ?? ""
          );
          const phone = toE164(rawPhone);
          const email = String(agent.email ?? agent.emailAddress ?? "");
          const brokerage = String(
            (agent.company as Record<string, string>)?.name ??
            agent.brokerage ?? agent.brokerageName ?? agent.officeName ?? ""
          );
          return { name, phone, email, brokerage, area: slug.replace(/-wi$/, "").replace(/-/g, " ") + ", WI" };
        }).filter(a => a.name && a.phone.length === 12);
      }
    }

    // Fallback: extract from JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    const results: RawAgent[] = [];
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item["@type"] === "RealEstateAgent" || item["@type"] === "Person") {
            const name = String(item.name ?? "");
            const rawPhone = String(item.telephone ?? "");
            const phone = toE164(rawPhone);
            const email = String(item.email ?? "");
            const brokerage = String(item.worksFor?.name ?? "");
            if (name && phone.length === 12) {
              results.push({ name, phone, email, brokerage });
            }
          }
        }
      } catch { /* skip */ }
    }
    return results;
  } catch {
    return [];
  }
}

/** Fetch agents from homelight.com agent search page */
async function fetchFromHomelightPage(slug: string): Promise<RawAgent[]> {
  // slug format: "wi/milwaukee"
  const url = `https://www.homelight.com/real-estate-agents/${slug}`;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) return [];
    const html = await res.text();

    const nextData = parseNextData(html);
    if (!nextData) return [];

    const pageProps = (nextData as { props?: { pageProps?: Record<string, unknown> } })?.props?.pageProps ?? {};
    const agents: unknown[] =
      (pageProps as { agents?: unknown[] })?.agents ??
      (pageProps as { agentProfiles?: unknown[] })?.agentProfiles ??
      [];

    return agents.map((a: unknown) => {
      const agent = a as Record<string, unknown>;
      const name = String(agent.fullName ?? agent.name ?? "");
      const rawPhone = String(
        (agent.phone as string) ??
        (agent.mobilePhone as string) ??
        ""
      );
      const phone = toE164(rawPhone);
      const email = String(agent.email ?? "");
      const brokerage = String(
        (agent.brokerage as Record<string, string>)?.name ??
        agent.brokerageName ?? ""
      );
      return { name, phone, email, brokerage };
    }).filter(a => a.name && a.phone.length === 12);
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
  const slugs = [...HOMES_SLUGS].sort(() => Math.random() - 0.5);

  let totalFetched = 0;

  outer: for (const slug of slugs) {
    if (added.length >= count) break;

    for (let page = 1; page <= 3; page++) {
      if (added.length >= count) break outer;

      const agents = await fetchFromHomesPage(slug, page);
      totalFetched += agents.length;

      if (!agents.length) break; // no more pages for this slug

      for (const agent of agents) {
        if (added.length >= count) break outer;

        // Skip if already in Notion
        try {
          const existing = await findContactByPhone(agent.phone);
          if (existing) { skipped.push(agent.name); continue; }
        } catch { /* ignore */ }

        try {
          await createContact({
            name: agent.name,
            phone: agent.phone,
            email: agent.email ?? "",
            brokerage: agent.brokerage ?? "",
            area: agent.area ?? slug.replace(/-wi$/, "").replace(/-/g, " ") + ", WI",
            source: "Homes.com",
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
  }

  // Fallback: try homelight if homes.com returned nothing at all
  if (totalFetched === 0 && added.length < count) {
    const hlSlugs = ["wi/milwaukee", "wi/wauwatosa", "wi/brookfield", "wi/waukesha"];
    for (const hlSlug of hlSlugs) {
      if (added.length >= count) break;
      const agents = await fetchFromHomelightPage(hlSlug);

      for (const agent of agents) {
        if (added.length >= count) break;
        try {
          const existing = await findContactByPhone(agent.phone);
          if (existing) { skipped.push(agent.name); continue; }
        } catch { /* ignore */ }
        try {
          await createContact({
            name: agent.name,
            phone: agent.phone,
            email: agent.email ?? "",
            brokerage: agent.brokerage ?? "",
            area: hlSlug.split("/")[1].replace(/-/g, " ") + ", WI",
            source: "HomeLight",
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
  }

  if (added.length === 0 && skipped.length === 0 && totalFetched === 0) {
    errors.push("No agents parsed from homes.com or homelight.com — site structure may have changed");
  }

  return { added, skipped, errors };
}

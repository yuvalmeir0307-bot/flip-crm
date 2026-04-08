import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-US,en;q=0.9",
};

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function extractJsonLdAgents(html: string): Array<{ name: string; phone: string }> {
  const agents: Array<{ name: string; phone: string }> = [];
  const scripts = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  for (const s of scripts) {
    try {
      const content = s.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "RealEstateAgent" || item?.["@type"] === "Person") {
          const name = String(item.name ?? "");
          const phone = toE164(String(item.telephone ?? ""));
          if (name && phone.length === 12) agents.push({ name, phone });
        }
        // Also check itemListElement
        for (const el of (item?.itemListElement ?? [])) {
          const agent = el?.item ?? el;
          if (agent?.telephone) {
            const name = String(agent.name ?? "");
            const phone = toE164(String(agent.telephone ?? ""));
            if (name && phone.length === 12) agents.push({ name, phone });
          }
        }
      }
    } catch { /* skip */ }
  }
  return agents;
}

export async function GET() {
  // Step 1: fetch RE/MAX list page
  const listHtml = await fetchHtml("https://www.remax.com/real-estate-agents/milwaukee-wi");

  if (!listHtml) return NextResponse.json({ error: "remax list page failed" });

  // Step 2: extract agent profile links from list page
  const profileLinks = Array.from(new Set(
    (listHtml.match(/href="(\/real-estate-agent\/[^"]+)"/g) ?? [])
      .map(m => "https://www.remax.com" + m.replace(/href="/, "").replace(/"$/, ""))
  )).slice(0, 5);

  // Step 3: check list page directly for JSON-LD agents
  const listAgents = extractJsonLdAgents(listHtml);

  // Step 4: check phones directly in list page HTML
  const rawPhones = (listHtml.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? []).slice(0, 10);

  // Step 5: fetch one profile page and check it
  let profileResult: { url: string; agents: Array<{ name: string; phone: string }>; rawPhones: string[] } | null = null;
  if (profileLinks.length > 0) {
    const profileHtml = await fetchHtml(profileLinks[0]);
    if (profileHtml) {
      profileResult = {
        url: profileLinks[0],
        agents: extractJsonLdAgents(profileHtml),
        rawPhones: (profileHtml.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? []).slice(0, 10),
      };
    }
  }

  return NextResponse.json({
    listPageOk: true,
    listHtmlLen: listHtml.length,
    profileLinksFound: profileLinks.length,
    profileLinkSamples: profileLinks,
    listPageJsonLdAgents: listAgents,
    listPageRawPhones: rawPhones,
    profilePage: profileResult,
  });
}

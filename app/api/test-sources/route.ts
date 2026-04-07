import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-US,en;q=0.9",
};

async function probe(label: string, url: string) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { label, status: res.status };
    const html = await res.text();

    // Extract phone numbers
    const phones = Array.from(new Set(
      (html.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? [])
    )).slice(0, 8);

    // Extract names from JSON-LD or data attributes
    const nameMatches = html.match(/"(?:name|fullName|full_name)"\s*:\s*"([A-Z][a-z]+ [A-Z][a-z]+[^"]{0,30})"/g) ?? [];
    const names = Array.from(new Set(nameMatches.map(m => m.replace(/.*:\s*"/, "").replace(/"$/, "")))).slice(0, 8);

    // Check what data stores are present
    const hasNextData = html.includes("__NEXT_DATA__");
    const hasJsonLd = html.includes('application/ld+json');
    const hasPhoneInJsonLd = html.includes('"telephone"');

    return { label, status: res.status, phones, names, hasNextData, hasJsonLd, hasPhoneInJsonLd, htmlLen: html.length };
  } catch (e) {
    return { label, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const results = await Promise.all([
    probe("remax milwaukee agents", "https://www.remax.com/real-estate-agents/milwaukee-wi"),
    probe("century21 milwaukee agents", "https://www.century21.com/real-estate/agents/milwaukee-wi/"),
    probe("remax agent profile sample", "https://www.remax.com/real-estate-agent/johnwilson/johntimwilson/100082461"),
    probe("dsps wi agent search", "https://apps.dsps.wi.gov/apps/LicenseSearch/LicenseList.aspx?profcode=18&city=Milwaukee&Status=1&Action=Search"),
  ]);

  return NextResponse.json(results);
}

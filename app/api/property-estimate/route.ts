import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Fetch Zillow home details HTML and extract zestimate
// Also returns debug info when requested
async function getZestimateFromHtml(zpid: number): Promise<{ value: number | null; debug?: string }> {
  try {
    const res = await fetch(`https://www.zillow.com/homedetails/${zpid}_zpid/`, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.zillow.com/",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { value: null, debug: `HTTP ${res.status}` };
    const html = await res.text();
    const snippet = html.substring(0, 200);
    const hasZestimate = html.includes("zestimate");

    const patterns = [
      /"zestimate":(\d+)/,
      /"Zestimate":(\d+)/,
      /"zestimateLow":(\d+)/,
      /"homeValue":(\d+)/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && Number(m[1]) > 1000) return { value: Number(m[1]) };
    }
    return { value: null, debug: `len=${html.length} hasZ=${hasZestimate} snippet=${snippet}` };
  } catch (e) {
    return { value: null, debug: String(e) };
  }
}

// Redfin: autocomplete → AVM
async function getRedfin(address: string): Promise<number | null> {
  try {
    const acRes = await fetch(
      `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(address)}&v=2`,
      {
        headers: { "User-Agent": UA, "Accept": "text/javascript", "Referer": "https://www.redfin.com/" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!acRes.ok) return null;
    const acJson = JSON.parse((await acRes.text()).replace(/^\{\}&&/, ""));
    const prop = acJson?.payload?.exactMatch ?? acJson?.payload?.sections?.[0]?.rows?.[0];
    const pid = prop?.id?.tableId;
    if (!pid) return null;

    const detRes = await fetch(
      `https://www.redfin.com/stingray/api/home/details/aboveTheFold?propertyId=${pid}&accessLevel=3`,
      {
        headers: { "User-Agent": UA, "Accept": "text/javascript", "Referer": "https://www.redfin.com/" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!detRes.ok) return null;
    const detJson = JSON.parse((await detRes.text()).replace(/^\{\}&&/, ""));
    const avm =
      detJson?.payload?.avmInfo?.predictedValue ??
      detJson?.payload?.avm?.predictedValue ??
      detJson?.payload?.propertySection?.priceInfo?.amount;
    return avm && Number(avm) > 0 ? Number(avm) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const address = params.get("address") ?? "";
  const zpidParam = params.get("zpid");

  // Support two modes:
  // 1) ?zpid=12345  — client already resolved zpid via autocomplete
  // 2) ?address=... — server resolves zpid itself (slower but works)

  let zpid: number | null = zpidParam ? Number(zpidParam) : null;

  if (!zpid && address.trim().length >= 5) {
    try {
      const acRes = await fetch(
        `https://www.zillowstatic.com/autocomplete/v3/suggestions?q=${encodeURIComponent(address)}&abKey=abcdefgh`,
        { headers: { "User-Agent": UA, "Accept": "application/json" }, signal: AbortSignal.timeout(8000) }
      );
      if (acRes.ok) {
        const acJson = await acRes.json();
        zpid = acJson?.results?.[0]?.metaData?.zpid ?? null;
      }
    } catch { /* continue without zpid */ }
  }

  if (!zpid && !address.trim()) {
    return NextResponse.json({ error: "Provide address or zpid" }, { status: 400 });
  }

  const [zR, rR] = await Promise.allSettled([
    zpid ? getZestimateFromHtml(zpid) : Promise.resolve({ value: null }),
    address ? getRedfin(address) : Promise.resolve(null),
  ]);

  const zResult = zR.status === "fulfilled" ? zR.value : { value: null, debug: String((zR as PromiseRejectedResult).reason) };
  const zillow = zResult?.value ?? null;
  const redfin = rR.status === "fulfilled" ? rR.value : null;

  const debug = params.get("debug");
  if (debug) {
    return NextResponse.json({ zillow, redfin, realtorCom: null, zpid, _zDebug: (zResult as { debug?: string })?.debug });
  }
  return NextResponse.json({ zillow, redfin, realtorCom: null, zpid });
}

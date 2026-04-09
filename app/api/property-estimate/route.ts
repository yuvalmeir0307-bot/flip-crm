import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Step 1: Address → zpid via Zillow autocomplete
async function getZpid(address: string): Promise<number | null> {
  try {
    const url = `https://www.zillowstatic.com/autocomplete/v3/suggestions?q=${encodeURIComponent(address)}&abKey=abcdefgh`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const zpid = json?.results?.[0]?.metaData?.zpid;
    return zpid ? Number(zpid) : null;
  } catch {
    return null;
  }
}

// Step 2: zpid → zestimate via Zillow GraphQL persisted query
async function getZestimate(zpid: number): Promise<number | null> {
  try {
    const hash = "3b51e213e2bc8dbf539cdb31f809991a62e1f5ce3cc0d011a8391839e024fa4e";
    const vars = { zpid, altId: null, deviceTypeV2: "WEB_DESKTOP", includeLastSoldListing: true };
    const url =
      `https://www.zillow.com/graphql/?extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }))}&variables=${encodeURIComponent(JSON.stringify(vars))}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "content-type": "application/json",
        "client-id": "home-details-page",
        "Referer": "https://www.zillow.com/",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const z = json?.data?.property?.zestimate;
    return z && z > 0 ? Number(z) : null;
  } catch {
    return null;
  }
}

// Redfin: autocomplete → property details → AVM
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
    const acText = (await acRes.text()).replace(/^\{\}&&/, "");
    const acJson = JSON.parse(acText);
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
    const detText = (await detRes.text()).replace(/^\{\}&&/, "");
    const detJson = JSON.parse(detText);
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
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (address.trim().length < 5) {
    return NextResponse.json({ error: "Address too short" }, { status: 400 });
  }

  // Get zpid first (needed for Zillow), then fetch both in parallel
  const zpid = await getZpid(address);

  const [zR, rR] = await Promise.allSettled([
    zpid ? getZestimate(zpid) : Promise.resolve(null),
    getRedfin(address),
  ]);

  const zillow = zR.status === "fulfilled" ? zR.value : null;
  const redfin = rR.status === "fulfilled" ? rR.value : null;

  return NextResponse.json({ zillow, redfin, realtorCom: null, zpid });
}

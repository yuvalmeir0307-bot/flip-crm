import { NextRequest, NextResponse } from "next/server";

const H = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

async function getRedfin(address: string): Promise<number | null> {
  try {
    const acRes = await fetch(
      `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(address)}&v=2`,
      { headers: { ...H, Accept: "text/javascript" }, signal: AbortSignal.timeout(8000) }
    );
    if (!acRes.ok) return null;
    const acJson = JSON.parse((await acRes.text()).replace(/^\{\}&&/, ""));
    const prop = acJson?.payload?.exactMatch ?? acJson?.payload?.sections?.[0]?.rows?.[0];
    const pid = prop?.id?.tableId;
    if (!pid) return null;

    const detRes = await fetch(
      `https://www.redfin.com/stingray/api/home/details/aboveTheFold?propertyId=${pid}&accessLevel=3`,
      { headers: { ...H, Accept: "text/javascript" }, signal: AbortSignal.timeout(8000) }
    );
    if (!detRes.ok) return null;
    const detJson = JSON.parse((await detRes.text()).replace(/^\{\}&&/, ""));
    const avm =
      detJson?.payload?.avmInfo?.predictedValue ??
      detJson?.payload?.avm?.predictedValue ??
      detJson?.payload?.propertySection?.priceInfo?.amount;
    return avm ? Number(avm) : null;
  } catch {
    return null;
  }
}

async function getZillow(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`,
      {
        headers: { ...H, Accept: "text/html,application/xhtml+xml", Referer: "https://www.zillow.com/" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m?.[1]) return null;
    const cache = JSON.parse(m[1])?.props?.pageProps?.componentProps?.gdpClientCache;
    if (cache) {
      for (const v of Object.values(cache) as Record<string, unknown>[]) {
        const z = (v as { property?: { zestimate?: number } })?.property?.zestimate;
        if (z && z > 0) return z;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (address.trim().length < 5) {
    return NextResponse.json({ error: "Address too short" }, { status: 400 });
  }

  const [zR, rR] = await Promise.allSettled([getZillow(address), getRedfin(address)]);

  return NextResponse.json({
    zillow: zR.status === "fulfilled" ? zR.value : null,
    redfin: rR.status === "fulfilled" ? rR.value : null,
    realtorCom: null,
  });
}

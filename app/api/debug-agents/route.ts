import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://www.realtor.com/realestateagents/Milwaukee_WI";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` });

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return NextResponse.json({ error: "No __NEXT_DATA__ found", htmlSnippet: html.slice(0, 500) });

    const data = JSON.parse(match[1]);
    const pageProps = data?.props?.pageProps ?? {};

    // Return top-level keys and first 2 levels of structure
    const structure: Record<string, unknown> = {};
    for (const key of Object.keys(pageProps)) {
      const val = pageProps[key];
      if (Array.isArray(val)) {
        structure[key] = `Array(${val.length}) first item keys: ${val[0] ? Object.keys(val[0]).join(", ") : "empty"}`;
      } else if (val && typeof val === "object") {
        structure[key] = Object.keys(val);
      } else {
        structure[key] = val;
      }
    }

    return NextResponse.json({ pagePropsKeys: Object.keys(pageProps), structure });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}

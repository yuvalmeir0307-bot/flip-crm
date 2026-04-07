import { NextResponse } from "next/server";

async function tryFetch(label: string, url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
        ...(options?.headers ?? {}),
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text();
    const hasNextData = text.includes("__NEXT_DATA__");
    const nextDataMatch = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

    let agentPaths: string[] = [];
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const pageProps = data?.props?.pageProps ?? {};
        agentPaths = findAgentArrayPaths(pageProps, "", 0);
      } catch { /**/ }
    }

    return {
      label,
      status: res.status,
      ok: res.ok,
      hasNextData,
      agentPaths: agentPaths.slice(0, 10),
      snippet: text.slice(0, 300),
    };
  } catch (e) {
    return { label, status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function findAgentArrayPaths(obj: unknown, path: string, depth: number): string[] {
  if (depth > 5) return [];
  if (!obj || typeof obj !== "object") return [];

  const paths: string[] = [];

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const first = obj[0] as Record<string, unknown>;
      if (first && typeof first === "object" && (
        "full_name" in first || "name" in first || "agentName" in first || "fullName" in first
      )) {
        paths.push(`${path}[${obj.length} items, first keys: ${Object.keys(first).slice(0, 6).join(",")}]`);
      }
    }
    return paths;
  }

  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const newPath = path ? `${path}.${key}` : key;
    paths.push(...findAgentArrayPaths(val, newPath, depth + 1));
  }

  return paths;
}

export async function GET() {
  const results = await Promise.all([
    tryFetch("homes.com Milwaukee agents", "https://www.homes.com/real-estate-agents/milwaukee-wi/"),
    tryFetch("homes.com Milwaukee p2", "https://www.homes.com/real-estate-agents/milwaukee-wi/?p=2"),
    tryFetch("homelight Milwaukee", "https://www.homelight.com/real-estate-agents/wi/milwaukee"),
    tryFetch("realtor.com GraphQL API", "https://www.realtor.com/api/v1/hulk?client_id=rdc-x&schema=vesta", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://www.realtor.com" },
      body: JSON.stringify({ query: "{ __typename }" }),
    }),
    tryFetch("WRA find realtor", "https://www.wra.org/find-a-realtor/"),
  ]);

  return NextResponse.json(results);
}

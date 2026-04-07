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
    tryFetch("zillow agents milwaukee", "https://www.zillow.com/professionals/real-estate-agent-reviews/milwaukee-wi/"),
    tryFetch("century21 agents milwaukee", "https://www.century21.com/real-estate/agents/milwaukee-wi/"),
    tryFetch("kw agents milwaukee", "https://www.kw.com/kw/agents.html?city=Milwaukee&state=WI"),
    tryFetch("coldwellbanker agents", "https://www.coldwellbanker.com/real-estate-agents/milwaukee-wi"),
    tryFetch("remax agents milwaukee", "https://www.remax.com/real-estate-agents/milwaukee-wi"),
    tryFetch("WRA search page", "https://www.wra.org/find-a-realtor/"),
    tryFetch("WRA search POST", "https://www.wra.org/FindaRealtor/Results/?zip=53202&radius=25", {
      method: "GET",
    }),
    tryFetch("har.com milwaukee agents", "https://www.har.com/search/realtors?pn=1&city=Milwaukee&state=WI"),
  ]);

  return NextResponse.json(results);
}

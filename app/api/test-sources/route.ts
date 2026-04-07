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

async function tryFetchFull(label: string, url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { label, status: res.status, ok: false };

    const html = await res.text();

    // Extract phone numbers from entire page
    const phones = [...new Set((html.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? []))].slice(0, 10);

    // Extract agent names (look for common patterns)
    const names = [...new Set((html.match(/"(?:full_?name|agent_?name|name)":\s*"([^"]{5,50})"/gi) ?? [])
      .map(m => m.replace(/.*":\s*"/, "").replace(/"$/, "")))].slice(0, 10);

    // Find __INITIAL_STATE__, __NEXT_DATA__, or window._data patterns
    const hasNextData = html.includes("__NEXT_DATA__");
    const hasInitialState = html.includes("__INITIAL_STATE__") || html.includes("window.__data");
    const hasReduxState = html.includes("window.__REDUX") || html.includes("__PRELOADED_STATE__");

    // Try all embedded JSON blobs
    const jsonBlobs: string[] = [];
    const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]{100,5000}?)<\/script>/g);
    for (const m of scriptMatches) {
      const content = m[1];
      if (content.includes("phone") && (content.includes("agent") || content.includes("Agent"))) {
        jsonBlobs.push(content.slice(0, 500));
      }
    }

    // Try to extract __NEXT_DATA__ agent paths
    let agentPaths: string[] = [];
    if (hasNextData) {
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          agentPaths = findAgentArrayPaths(data?.props?.pageProps ?? {}, "", 0);
        } catch { /**/ }
      }
    }

    return {
      label, status: res.status, ok: true,
      hasNextData, hasInitialState, hasReduxState,
      phones, names, agentPaths,
      jsonBlobCount: jsonBlobs.length,
      jsonBlobSample: jsonBlobs[0]?.slice(0, 300) ?? null,
    };
  } catch (e) {
    return { label, status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const [remax, c21] = await Promise.all([
    tryFetchFull("remax agents milwaukee", "https://www.remax.com/real-estate-agents/milwaukee-wi"),
    tryFetchFull("century21 agents milwaukee", "https://www.century21.com/real-estate/agents/milwaukee-wi/"),
  ]);

  const results = [remax, c21];

  return NextResponse.json(results);
}

/**
 * Debug endpoint — inspect OpenPhone contact for a given phone number.
 * GET /api/debug-openphone?phone=+12627047103
 * DELETE after debugging.
 */
import { NextRequest, NextResponse } from "next/server";

const API_KEY = (process.env.OPENPHONE_API_KEY ?? "").trim();
const BASE = "https://api.openphone.com/v1";

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get("phone") ?? "+12627047103";

  // 1. Search by phone number
  const searchRes = await fetch(`${BASE}/contacts?phoneNumber=${encodeURIComponent(phone)}`, {
    headers: { Authorization: API_KEY },
  });
  const searchData = await searchRes.json();

  // 2. List first 10 contacts to see overall state
  const listRes = await fetch(`${BASE}/contacts?maxResults=5`, {
    headers: { Authorization: API_KEY },
  });
  const listData = await listRes.json();

  return NextResponse.json({
    searchStatus: searchRes.status,
    searchResult: searchData,
    listStatus: listRes.status,
    listSample: listData,
  });
}

import { NextResponse } from "next/server";
import { getRunLogs } from "@/lib/notion";

export async function GET() {
  try {
    const logs = await getRunLogs(100);
    return NextResponse.json(logs);
  } catch {
    // Return empty array on Notion errors — shows "No SMS runs yet" instead of "Setup needed"
    return NextResponse.json([]);
  }
}

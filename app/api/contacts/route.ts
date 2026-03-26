import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, createContact, updateContact, extractContactProps } from "@/lib/notion";

export async function GET() {
  try {
    const pages = await getAllContacts();
    const contacts = pages.map((p) => extractContactProps(p as Record<string, unknown>));
    return NextResponse.json(contacts);
  } catch (e: unknown) {
    console.error("Contacts GET error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const page = await createContact(body);
  return NextResponse.json({ ok: true, id: (page as { id: string }).id });
}

export async function PATCH(req: NextRequest) {
  const { id, ...properties } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Map flat fields back to Notion property format
  const notionProps: Record<string, unknown> = {};
  if (properties.status) {
    notionProps["Status"] = { select: { name: properties.status } };
    // When manually setting to HOT, reset drip/pool steps so no messages fire
    if (properties.status === "Replied - Pivot Call Needed - HOT") {
      notionProps["Drip step"] = { number: 0 };
      notionProps["Pool step"] = { number: 0 };
    }
  }
  if (properties.phone) notionProps["Phone"] = { phone_number: properties.phone };
  if (properties.email) notionProps["Email"] = { email: properties.email };
  if (properties.brokerage) notionProps["Brokerage"] = { rich_text: [{ text: { content: properties.brokerage } }] };
  if (properties.area) notionProps["Area"] = { rich_text: [{ text: { content: properties.area } }] };
  if (properties.dripStep !== undefined) notionProps["Drip step"] = { number: properties.dripStep };
  if (properties.poolStep !== undefined) notionProps["Pool step"] = { number: properties.poolStep };
  if (properties.date) notionProps["Date"] = { date: { start: properties.date } };
  if (properties.offerDate) notionProps["Offer Date"] = { date: { start: properties.offerDate } };
  if (properties.closeDate) notionProps["Close Date"] = { date: { start: properties.closeDate } };

  await updateContact(id, notionProps);
  return NextResponse.json({ ok: true });
}

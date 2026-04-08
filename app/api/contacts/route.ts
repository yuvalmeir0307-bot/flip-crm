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
  try {
    const body = await req.json();
    const page = await createContact(body);
    return NextResponse.json({ ok: true, id: (page as { id: string }).id });
  } catch (e: unknown) {
    console.error("Contacts POST error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
    // When manually moving to The Pool, always set pool step to 1 and Date to 7 days from now
    // so the first pool follow-up fires at the correct time (not immediately).
    // Date is set unconditionally here to prevent any override below from causing an immediate cron pickup.
    if (properties.status === "The Pool") {
      notionProps["Pool step"] = { number: properties.poolStep ?? 1 };
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      notionProps["Date"] = { date: { start: nextDate.toISOString().split("T")[0] } };
    }
  }
  if (properties.phone) notionProps["Phone"] = { phone_number: properties.phone };
  if (properties.email) notionProps["Email"] = { email: properties.email };
  if (properties.brokerage) notionProps["Brokerage"] = { rich_text: [{ text: { content: properties.brokerage } }] };
  if (properties.area) notionProps["Area"] = { rich_text: [{ text: { content: properties.area } }] };
  if (properties.dripStep !== undefined) notionProps["Drip step"] = { number: properties.dripStep };
  if (properties.poolStep !== undefined) notionProps["Pool step"] = { number: properties.poolStep };
  // Don't override Date when moving to Pool — it's already set above with +7 day protection
  if (properties.date && properties.status !== "The Pool") notionProps["Date"] = { date: { start: properties.date } };
  if (properties.offerDate) notionProps["Offer Date"] = { date: { start: properties.offerDate } };
  if (properties.closeDate) notionProps["Close Date"] = { date: { start: properties.closeDate } };
  if (properties.notes !== undefined) notionProps["Notes"] = { rich_text: [{ text: { content: properties.notes } }] };
  if (properties.warmth) notionProps["Warmth"] = { select: { name: properties.warmth } };
  if (properties.followUpDate) notionProps["Follow Up Date"] = { date: { start: properties.followUpDate } };
  if (properties.assignedTo !== undefined) notionProps["Assigned To"] = { rich_text: [{ text: { content: properties.assignedTo } }] };
  if (properties.altPhones !== undefined) notionProps["Alt Phones"] = { rich_text: [{ text: { content: properties.altPhones } }] };
  if (properties.arv !== undefined) notionProps["ARV"] = { number: properties.arv };
  if (properties.rehabCost !== undefined) notionProps["Rehab Cost"] = { number: properties.rehabCost };
  if (properties.monthlyRent !== undefined) notionProps["Monthly Rent"] = { number: properties.monthlyRent };
  if (properties.dealMode !== undefined) notionProps["Deal Mode"] = { select: { name: properties.dealMode } };
  if (properties.flipFactor !== undefined) notionProps["Flip Factor"] = { number: properties.flipFactor };
  if (properties.capRate !== undefined) notionProps["Cap Rate"] = { number: properties.capRate };
  if (properties.expenseRatio !== undefined) notionProps["Expense Ratio"] = { number: properties.expenseRatio };
  if (properties.maoOverride !== undefined) notionProps["MAO Override"] = properties.maoOverride !== null ? { number: properties.maoOverride } : { number: null };
  if (properties.zillow !== undefined) notionProps["Zillow"] = { number: properties.zillow ?? null };
  if (properties.realtorCom !== undefined) notionProps["Realtor Com"] = { number: properties.realtorCom ?? null };
  if (properties.redfin !== undefined) notionProps["Redfin"] = { number: properties.redfin ?? null };
  if (properties.source4 !== undefined) notionProps["Source 4"] = { number: properties.source4 ?? null };
  if (properties.wholesaleFeeOverride !== undefined) notionProps["Wholesale Fee Override"] = properties.wholesaleFeeOverride !== null ? { number: properties.wholesaleFeeOverride } : { number: null };
  if (properties.propertyAddress !== undefined) notionProps["Property Address"] = { rich_text: [{ text: { content: properties.propertyAddress ?? "" } }] };

  await updateContact(id, notionProps);
  return NextResponse.json({ ok: true });
}

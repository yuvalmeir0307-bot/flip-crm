import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DB_ID = process.env.NOTION_DATABASE_ID!;

export async function getActiveContacts() {
  const today = new Date().toISOString().split("T")[0];
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: {
      and: [
        {
          or: [
            { property: "Date", date: { on_or_before: today } },
            { property: "Date", date: { is_empty: true } },
          ],
        },
        {
          or: [
            { property: "Status", select: { equals: "Drip Active" } },
            { property: "Status", select: { equals: "The Pool" } },
          ],
        },
      ],
    },
  });
  return res.results;
}

export async function getAllContacts() {
  const res = await notion.databases.query({
    database_id: DB_ID,
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return res.results;
}

export async function updateContact(pageId: string, properties: Record<string, unknown>) {
  return notion.pages.update({ page_id: pageId, properties } as Parameters<typeof notion.pages.update>[0]);
}

export async function findContactByPhone(phone: string) {
  // First: exact match on primary Phone field
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "Phone", phone_number: { equals: phone } },
  });
  if (res.results[0]) return res.results[0];

  // Second: check Alt Phones field (comma-separated E.164 numbers)
  const digits = phone.replace(/\D/g, "");
  const altRes = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "Alt Phones", rich_text: { contains: digits.slice(-10) } },
  });
  // Verify the match is exact (not a partial substring hit)
  for (const page of altRes.results) {
    const props = (page as { properties: Record<string, { rich_text?: Array<{ plain_text: string }> }> }).properties;
    const altText = props["Alt Phones"]?.rich_text?.[0]?.plain_text ?? "";
    const altNumbers = altText.split(",").map((n: string) => n.trim());
    if (altNumbers.some((n: string) => n === phone || n.replace(/\D/g, "").slice(-10) === digits.slice(-10))) {
      return page;
    }
  }

  return null;
}

export async function findContactByName(name: string): Promise<boolean> {
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "Name", title: { equals: name } },
    page_size: 1,
  });
  return res.results.length > 0;
}

export async function createContact(data: {
  name: string;
  phone: string;
  email?: string;
  brokerage?: string;
  area?: string;
  source?: string;
  status?: string;
  altPhones?: string;
  assignedTo?: string;
  verified?: boolean;
}) {
  return notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Phone: { phone_number: data.phone },
      ...(data.email ? { Email: { email: data.email } } : {}),
      ...(data.brokerage ? { Brokerage: { rich_text: [{ text: { content: data.brokerage } }] } } : {}),
      ...(data.area ? { Area: { rich_text: [{ text: { content: data.area } }] } } : {}),
      ...(data.source ? { Source: { rich_text: [{ text: { content: data.source } }] } } : {}),
      ...(data.altPhones ? { "Alt Phones": { rich_text: [{ text: { content: data.altPhones } }] } } : {}),
      ...(data.assignedTo ? { "Assigned To": { rich_text: [{ text: { content: data.assignedTo } }] } } : {}),
      ...(data.verified !== undefined ? { Verified: { checkbox: data.verified } } : {}),
      Status: { select: { name: data.status ?? "Drip Active" } },
      "Drip step": { number: 0 },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}

// ── Activity Log ─────────────────────────────────────────────────────────────
const ACTIVITY_DB_ID = process.env.NOTION_ACTIVITY_DB_ID;

export type ActivityLog = {
  id: string;
  date: string;
  messagesSent: number;
  replies: number;
  callsMade: number;
  avgCallMinutes: number;
  converted: number;
  notes: string;
};

export async function getActivityLogs(): Promise<ActivityLog[]> {
  if (!ACTIVITY_DB_ID) return [];
  const res = await notion.databases.query({
    database_id: ACTIVITY_DB_ID,
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: 30,
  });
  return res.results.map((p) => {
    const props = (p as { properties: Record<string, Record<string, unknown>> }).properties;
    return {
      id: (p as { id: string }).id,
      date: (props.Date?.date as { start: string })?.start ?? "",
      messagesSent: (props["Messages Sent"]?.number as number) ?? 0,
      replies: (props.Replies?.number as number) ?? 0,
      callsMade: (props["Calls Made"]?.number as number) ?? 0,
      avgCallMinutes: (props["Avg Call Min"]?.number as number) ?? 0,
      converted: (props.Converted?.number as number) ?? 0,
      notes: ((props.Notes?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
    };
  });
}

export async function createActivityLog(data: Omit<ActivityLog, "id">) {
  if (!ACTIVITY_DB_ID) throw new Error("NOTION_ACTIVITY_DB_ID not set");
  return notion.pages.create({
    parent: { database_id: ACTIVITY_DB_ID },
    properties: {
      Date: { date: { start: data.date } },
      "Messages Sent": { number: data.messagesSent },
      Replies: { number: data.replies },
      "Calls Made": { number: data.callsMade },
      "Avg Call Min": { number: data.avgCallMinutes },
      Converted: { number: data.converted },
      Notes: { rich_text: [{ text: { content: data.notes } }] },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}

export async function updateActivityLog(id: string, data: Partial<Omit<ActivityLog, "id">>) {
  if (!ACTIVITY_DB_ID) throw new Error("NOTION_ACTIVITY_DB_ID not set");
  const props: Record<string, unknown> = {};
  if (data.date) props.Date = { date: { start: data.date } };
  if (data.messagesSent !== undefined) props["Messages Sent"] = { number: data.messagesSent };
  if (data.replies !== undefined) props.Replies = { number: data.replies };
  if (data.callsMade !== undefined) props["Calls Made"] = { number: data.callsMade };
  if (data.avgCallMinutes !== undefined) props["Avg Call Min"] = { number: data.avgCallMinutes };
  if (data.converted !== undefined) props.Converted = { number: data.converted };
  if (data.notes !== undefined) props.Notes = { rich_text: [{ text: { content: data.notes } }] };
  return notion.pages.update({ page_id: id, properties: props } as Parameters<typeof notion.pages.update>[0]);
}

// ── Run Logs ─────────────────────────────────────────────────────────────────
const RUNS_DB_ID = process.env.NOTION_RUNS_DB_ID;

export type RunLog = {
  id: string;
  date: string;
  type: string;
  contactName: string;
  phone: string;
  step: string;
  status: "success" | "failed";
  message: string;
  error: string;
};

export async function getAllRunLogs(): Promise<RunLog[]> {
  if (!RUNS_DB_ID) return [];
  const results: RunLog[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id: RUNS_DB_ID,
      sorts: [{ property: "Date", direction: "ascending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...res.results.map((p) => {
      const props = (p as { properties: Record<string, Record<string, unknown>> }).properties;
      return {
        id: (p as { id: string }).id,
        date: (props.Date?.date as { start: string })?.start ?? "",
        type: ((props.Type?.select as { name: string })?.name) ?? "Drip",
        contactName: ((props.Name?.title as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        phone: ((props.Phone?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        step: ((props.Step?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        status: ((props.Status?.select as { name: string })?.name === "failed" ? "failed" : "success") as "success" | "failed",
        message: ((props.Message?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        error: ((props.Error?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
      };
    }));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

export async function getRunLogs(limit = 50): Promise<RunLog[]> {
  if (!RUNS_DB_ID) return [];
  const res = await notion.databases.query({
    database_id: RUNS_DB_ID,
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: limit,
  });
  return res.results.map((p) => {
    const props = (p as { properties: Record<string, Record<string, unknown>> }).properties;
    return {
      id: (p as { id: string }).id,
      date: (props.Date?.date as { start: string })?.start ?? "",
      type: ((props.Type?.select as { name: string })?.name) ?? "Drip",
      contactName: ((props.Name?.title as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
      phone: ((props.Phone?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
      step: ((props.Step?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
      status: ((props.Status?.select as { name: string })?.name === "failed" ? "failed" : "success") as "success" | "failed",
      message: ((props.Message?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
      error: ((props.Error?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
    };
  });
}

export async function createRunLog(data: Omit<RunLog, "id">) {
  if (!RUNS_DB_ID) return;
  await notion.pages.create({
    parent: { database_id: RUNS_DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.contactName } }] },
      Date: { date: { start: data.date } },
      Type: { select: { name: data.type } },
      Phone: { rich_text: [{ text: { content: data.phone } }] },
      Step: { rich_text: [{ text: { content: data.step } }] },
      Status: { select: { name: data.status } },
      Message: { rich_text: [{ text: { content: data.message.slice(0, 200) } }] },
      Error: { rich_text: [{ text: { content: data.error.slice(0, 200) } }] },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}

export function extractContactProps(page: Record<string, unknown>) {
  const props = (page as { properties: Record<string, unknown> }).properties as Record<string, {
    type: string;
    title?: Array<{ plain_text: string }>;
    phone_number?: string;
    select?: { name: string };
    number?: number;
    date?: { start: string };
    rich_text?: Array<{ plain_text: string }>;
    email?: string;
    checkbox?: boolean;
  }>;

  return {
    id: (page as { id: string }).id,
    name: props.Name?.title?.[0]?.plain_text ?? "",
    phone: props.Phone?.phone_number ?? "",
    status: props.Status?.select?.name ?? "",
    dripStep: props["Drip step"]?.number ?? 0,
    poolStep: props["Pool step"]?.number ?? 1,
    date: props.Date?.date?.start ?? null,
    lastContact: props["Last Contact"]?.date?.start ?? null,
    lastReply: props["Last Reply"]?.rich_text?.[0]?.plain_text ?? "",
    email: props.Email?.email ?? "",
    brokerage: props.Brokerage?.rich_text?.[0]?.plain_text ?? "",
    area: props.Area?.rich_text?.[0]?.plain_text ?? "",
    source: props.Source?.rich_text?.[0]?.plain_text ?? "",
    verified: props.Verified?.checkbox ?? false,
    offerDate: props["Offer Date"]?.date?.start ?? null,
    closeDate: props["Close Date"]?.date?.start ?? null,
    notes: props.Notes?.rich_text?.[0]?.plain_text ?? "",
    warmth: props.Warmth?.select?.name ?? "",
    followUpDate: props["Follow Up Date"]?.date?.start ?? null,
    assignedTo: props["Assigned To"]?.rich_text?.[0]?.plain_text ?? "",
    altPhones: props["Alt Phones"]?.rich_text?.[0]?.plain_text ?? "",
    arv: props["ARV"]?.number ?? undefined,
    rehabCost: props["Rehab Cost"]?.number ?? undefined,
    monthlyRent: props["Monthly Rent"]?.number ?? undefined,
    dealMode: (props["Deal Mode"]?.select?.name as "flip" | "rental") ?? undefined,
    flipFactor: props["Flip Factor"]?.number ?? undefined,
    capRate: props["Cap Rate"]?.number ?? undefined,
    expenseRatio: props["Expense Ratio"]?.number ?? undefined,
    maoOverride: props["MAO Override"]?.number ?? null,
  };
}

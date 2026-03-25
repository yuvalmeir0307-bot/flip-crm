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
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "Phone", phone_number: { equals: phone } },
  });
  return res.results[0] ?? null;
}

export async function createContact(data: {
  name: string;
  phone: string;
  email?: string;
  brokerage?: string;
  area?: string;
  source?: string;
  status?: string;
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
      Status: { select: { name: data.status ?? "Drip Active" } },
      "Drip step": { number: 0 },
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
  };
}

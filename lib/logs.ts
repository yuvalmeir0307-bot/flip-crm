import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const LOGS_DB_ID = process.env.NOTION_LOGS_DB ?? "e8199147-19bf-418f-b5c5-9f4173eb4fb6";

export type LogType =
  | "DUPLICATE"
  | "BROKEN_NAME"
  | "FAILED_SMS"
  | "STOP"
  | "DAILY_REPORT"
  | "SMS_SENT"
  | "INFO";

export type LogEntry = {
  id: string;
  title: string;
  type: LogType;
  phone: string;
  details: string;
  resolved: boolean;
  createdAt: string;
};

export async function createLog(
  title: string,
  type: LogType,
  phone?: string,
  details?: string
): Promise<void> {
  try {
    await notion.pages.create({
      parent: { database_id: LOGS_DB_ID },
      properties: {
        Title: { title: [{ text: { content: title } }] },
        Type: { select: { name: type } },
        Phone: { rich_text: [{ text: { content: phone ?? "" } }] },
        Details: { rich_text: [{ text: { content: (details ?? "").slice(0, 2000) } }] },
        Resolved: { checkbox: false },
      } as Parameters<typeof notion.pages.create>[0]["properties"],
    });
  } catch {
    // Non-blocking — never crash the main flow
  }
}

export async function getLogs(limit = 50): Promise<LogEntry[]> {
  try {
    const res = await notion.databases.query({
      database_id: LOGS_DB_ID,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: limit,
    });
    return res.results.map((p) => {
      const props = (p as { properties: Record<string, Record<string, unknown>> }).properties;
      return {
        id: (p as { id: string }).id,
        title: ((props.Title?.title as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        type: ((props.Type?.select as { name: string })?.name ?? "INFO") as LogType,
        phone: ((props.Phone?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        details: ((props.Details?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        resolved: (props.Resolved?.checkbox as boolean) ?? false,
        createdAt: (p as { created_time: string }).created_time ?? "",
      };
    });
  } catch {
    return [];
  }
}

export async function getActiveAlerts(): Promise<LogEntry[]> {
  try {
    const res = await notion.databases.query({
      database_id: LOGS_DB_ID,
      filter: {
        and: [
          { property: "Resolved", checkbox: { equals: false } },
          {
            or: [
              { property: "Type", select: { equals: "DUPLICATE" } },
              { property: "Type", select: { equals: "BROKEN_NAME" } },
              { property: "Type", select: { equals: "FAILED_SMS" } },
              { property: "Type", select: { equals: "STOP" } },
            ],
          },
        ],
      },
      sorts: [{ property: "Created At", direction: "descending" }],
      page_size: 50,
    });
    return res.results.map((p) => {
      const props = (p as { properties: Record<string, Record<string, unknown>> }).properties;
      return {
        id: (p as { id: string }).id,
        title: ((props.Name?.title as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        type: ((props.Type?.select as { name: string })?.name ?? "INFO") as LogType,
        phone: ((props.Phone?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        details: ((props.Details?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text) ?? "",
        resolved: false,
        createdAt: (p as { created_time: string }).created_time ?? "",
      };
    });
  } catch {
    return [];
  }
}

export async function resolveLog(id: string): Promise<void> {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        Resolved: { checkbox: true },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });
  } catch {
    // Non-blocking
  }
}

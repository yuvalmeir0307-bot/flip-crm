import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const SCRIPTS_DB_ID = process.env.SCRIPTS_DB_ID!;

export interface ScriptEntry {
  id: string;
  name: string;
  campaign: "Drip" | "Pool";
  step: number;
  label: string;
  message: string;
  delay: number;
}

export async function getAllScripts(): Promise<ScriptEntry[]> {
  const res = await notion.databases.query({
    database_id: SCRIPTS_DB_ID,
    sorts: [
      { property: "Campaign", direction: "ascending" },
      { property: "Step", direction: "ascending" },
    ],
  });

  return res.results.map((page) => {
    const p = (page as { id: string; properties: Record<string, unknown> }).properties as Record<string, {
      type: string;
      title?: Array<{ plain_text: string }>;
      select?: { name: string };
      number?: number;
      rich_text?: Array<{ plain_text: string }>;
    }>;

    return {
      id: (page as { id: string }).id,
      name: p.Name?.title?.[0]?.plain_text ?? "",
      campaign: (p.Campaign?.select?.name ?? "Drip") as "Drip" | "Pool",
      step: p.Step?.number ?? 0,
      label: p.Label?.rich_text?.[0]?.plain_text ?? "",
      message: p.Message?.rich_text?.[0]?.plain_text ?? "",
      delay: p.Delay?.number ?? 1,
    };
  });
}

export async function updateScriptMessage(id: string, message: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      Message: { rich_text: [{ text: { content: message } }] },
    } as Parameters<typeof notion.pages.update>[0]["properties"],
  });
}

export async function updateScriptFields(id: string, fields: { message?: string; delay?: number }): Promise<void> {
  const props: Record<string, unknown> = {};
  if (fields.message !== undefined) props.Message = { rich_text: [{ text: { content: fields.message } }] };
  if (fields.delay !== undefined) props.Delay = { number: fields.delay };
  await notion.pages.update({
    page_id: id,
    properties: props,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deleteScript(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    archived: true,
  });
}

export async function createScript(data: {
  campaign: "Drip" | "Pool";
  step: number;
  label: string;
  message: string;
  delay: number;
}): Promise<void> {
  await notion.pages.create({
    parent: { database_id: SCRIPTS_DB_ID },
    properties: {
      Name: { title: [{ text: { content: `${data.campaign} Step ${data.step}` } }] },
      Campaign: { select: { name: data.campaign } },
      Step: { number: data.step },
      Label: { rich_text: [{ text: { content: data.label } }] },
      Message: { rich_text: [{ text: { content: data.message } }] },
      Delay: { number: data.delay },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}

export function resolveMessage(template: string, name: string, sender: string): string {
  return template
    .replace(/\[Name\]/g, name)
    .replace(/\[Sender\]/g, sender);
}

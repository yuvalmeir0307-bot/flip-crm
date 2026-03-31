/**
 * Skill: syncContactToOpenPhone
 *
 * When a contact replies, this skill ensures their OpenPhone contact record
 * is created or updated with the correct name from the Flip CRM (Notion).
 */

const API_KEY = process.env.OPENPHONE_API_KEY!;
const BASE = "https://api.openphone.com/v1";

interface OpenPhoneContact {
  id: string;
  defaultFields: {
    firstName?: string;
    lastName?: string;
  };
  phoneNumbers: { value: string }[];
}

async function searchOpenPhoneContact(phone: string): Promise<OpenPhoneContact | null> {
  const res = await fetch(`${BASE}/contacts?phoneNumber=${encodeURIComponent(phone)}`, {
    headers: { Authorization: API_KEY },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.data?.[0] as OpenPhoneContact) ?? null;
}

async function createOpenPhoneContact(phone: string, firstName: string, lastName: string): Promise<boolean> {
  const res = await fetch(`${BASE}/contacts`, {
    method: "POST",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      defaultFields: { firstName, lastName },
      phoneNumbers: [{ value: phone }],
    }),
  });
  return res.ok;
}

async function updateOpenPhoneContact(contactId: string, firstName: string, lastName: string): Promise<boolean> {
  const res = await fetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      defaultFields: { firstName, lastName },
    }),
  });
  return res.ok;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/**
 * Syncs a contact's name from Flip CRM to OpenPhone.
 * Call this whenever a contact replies so OpenPhone always shows the correct name.
 *
 * @param phone - The contact's phone number (E.164 format, e.g. +19545551234)
 * @param fullName - The contact's name from Flip CRM / Notion
 */
export async function syncContactToOpenPhone(phone: string, fullName: string): Promise<{ ok: boolean; action: "created" | "updated" | "skipped" | "error"; error?: string }> {
  try {
    if (!fullName.trim()) return { ok: false, action: "skipped", error: "No name to sync" };

    const { firstName, lastName } = splitName(fullName);
    const existing = await searchOpenPhoneContact(phone);

    if (!existing) {
      const ok = await createOpenPhoneContact(phone, firstName, lastName);
      return ok ? { ok: true, action: "created" } : { ok: false, action: "error", error: "Failed to create contact" };
    }

    // Already has the correct name — skip to avoid unnecessary writes
    if (existing.defaultFields.firstName === firstName && existing.defaultFields.lastName === lastName) {
      return { ok: true, action: "skipped" };
    }

    const ok = await updateOpenPhoneContact(existing.id, firstName, lastName);
    return ok ? { ok: true, action: "updated" } : { ok: false, action: "error", error: "Failed to update contact" };
  } catch (e: unknown) {
    return { ok: false, action: "error", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Skill: syncContactToOpenPhone
 *
 * Creates or updates an OpenPhone contact record with:
 *   firstName: first word of the contact's name
 *   lastName:  remaining words + " Agent Milwaukee"
 *
 * After every write, reads the record back to verify the name
 * was stored correctly. Returns verification status.
 */

const API_KEY = (process.env.OPENPHONE_API_KEY ?? "").trim();
const BASE = "https://api.openphone.com/v1";

interface OpenPhoneContact {
  id: string;
  defaultFields: {
    firstName?: string;
    lastName?: string;
  };
  phoneNumbers: { value: string }[];
}

export type SyncResult = {
  ok: boolean;
  action: "created" | "updated" | "skipped" | "error";
  verified?: boolean;       // true = read-back name matches expected
  storedName?: string;      // what OpenPhone actually has after write
  error?: string;
};

/** firstName = first word, lastName = rest + " Agent Milwaukee" */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const rest = parts.slice(1).join(" ");
  const lastName = rest ? `${rest} Agent Milwaukee` : "Agent Milwaukee";
  return { firstName, lastName };
}

async function searchContact(phone: string): Promise<OpenPhoneContact | null> {
  try {
    const res = await fetch(`${BASE}/contacts?phoneNumber=${encodeURIComponent(phone)}`, {
      headers: { Authorization: API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data?.[0] as OpenPhoneContact) ?? null;
  } catch {
    return null;
  }
}

async function getContact(id: string): Promise<OpenPhoneContact | null> {
  try {
    const res = await fetch(`${BASE}/contacts/${id}`, {
      headers: { Authorization: API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data as OpenPhoneContact) ?? null;
  } catch {
    return null;
  }
}

async function createContact(phone: string, firstName: string, lastName: string): Promise<{ ok: boolean; id?: string }> {
  const res = await fetch(`${BASE}/contacts`, {
    method: "POST",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      defaultFields: { firstName, lastName },
      phoneNumbers: [{ value: phone }],
    }),
  });
  if (!res.ok) return { ok: false };
  const data = await res.json();
  return { ok: true, id: data?.data?.id };
}

async function updateContact(contactId: string, firstName: string, lastName: string): Promise<boolean> {
  const res = await fetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ defaultFields: { firstName, lastName } }),
  });
  return res.ok;
}

/**
 * Syncs a Flip CRM contact name to OpenPhone.
 *
 * Name format stored: "[firstName] [lastName] Agent Milwaukee"
 * e.g. "John Smith" → firstName: "John", lastName: "Smith Agent Milwaukee"
 *
 * After write, reads back and verifies name matches expected.
 *
 * @param phone    E.164 phone number (e.g. +14145551234)
 * @param fullName Contact's full name from Notion
 */
export async function syncContactToOpenPhone(
  phone: string,
  fullName: string
): Promise<SyncResult> {
  try {
    if (!fullName.trim()) return { ok: false, action: "skipped", error: "No name" };
    if (!phone) return { ok: false, action: "skipped", error: "No phone" };

    const { firstName, lastName } = splitName(fullName);
    const expectedFirstName = firstName;
    const expectedLastName = lastName;

    const existing = await searchContact(phone);

    let contactId: string | undefined;
    let action: SyncResult["action"];

    if (!existing) {
      // Create new OpenPhone contact
      const created = await createContact(phone, firstName, lastName);
      if (!created.ok) return { ok: false, action: "error", error: "Failed to create contact in OpenPhone" };
      contactId = created.id;
      action = "created";
    } else {
      contactId = existing.id;
      // Check if name already matches (skip to avoid unnecessary writes)
      if (
        existing.defaultFields.firstName === expectedFirstName &&
        existing.defaultFields.lastName === expectedLastName
      ) {
        return {
          ok: true,
          action: "skipped",
          verified: true,
          storedName: `${expectedFirstName} ${expectedLastName}`.trim(),
        };
      }
      const ok = await updateContact(contactId, firstName, lastName);
      if (!ok) return { ok: false, action: "error", error: "Failed to update contact in OpenPhone" };
      action = "updated";
    }

    // ── Verify: read back and confirm name ──────────────────────
    if (!contactId) {
      return { ok: true, action, verified: false, error: "No contact ID to verify" };
    }

    const readBack = await getContact(contactId);
    const storedFirst = readBack?.defaultFields?.firstName ?? "";
    const storedLast = readBack?.defaultFields?.lastName ?? "";
    const storedName = `${storedFirst} ${storedLast}`.trim();
    const verified =
      storedFirst === expectedFirstName && storedLast === expectedLastName;

    return { ok: true, action, verified, storedName };
  } catch (e: unknown) {
    return { ok: false, action: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

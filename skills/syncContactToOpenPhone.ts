/**
 * Skill: syncContactToOpenPhone
 *
 * Creates or updates an OpenPhone contact record with:
 *   firstName: first word of the contact's name
 *   lastName:  remaining words + " Agent Milwaukee"
 *   phoneNumbers: [{ name: "Primary", value: phone }]  ← inside defaultFields
 *
 * IMPORTANT: phoneNumbers must be nested inside defaultFields (OpenPhone API requirement).
 * Sending them at the top level silently drops them, leaving phoneNumbers: [].
 *
 * Search results are verified — the returned contact must actually contain
 * the target phone number, otherwise we create a new contact.
 *
 * After every write, reads the record back to verify name + phone stored correctly.
 */

const API_KEY = (process.env.OPENPHONE_API_KEY ?? "").trim();
const BASE = "https://api.openphone.com/v1";

interface OPPhoneEntry {
  name?: string;
  value: string;
  id?: string;
}

interface OpenPhoneContact {
  id: string;
  defaultFields: {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumbers?: OPPhoneEntry[];
  };
}

export type SyncResult = {
  ok: boolean;
  action: "created" | "updated" | "skipped" | "error";
  verified?: boolean;
  storedName?: string;
  hasPhone?: boolean;
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

/** Last 10 digits for loose-match comparison */
function last10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/**
 * Search for a contact by phone number and verify the result actually
 * contains that phone number (OpenPhone search can return unrelated contacts).
 */
async function searchContact(phone: string): Promise<OpenPhoneContact | null> {
  try {
    const res = await fetch(
      `${BASE}/contacts?phoneNumber=${encodeURIComponent(phone)}&maxResults=20`,
      { headers: { Authorization: API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const contacts: OpenPhoneContact[] = data?.data ?? [];
    const digits = last10(phone);

    // Must actually have our phone number — don't trust a "partial" search match
    return (
      contacts.find((c) =>
        (c.defaultFields.phoneNumbers ?? []).some(
          (p) => last10(p.value) === digits
        )
      ) ?? null
    );
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

/**
 * Create a new contact.
 * phoneNumbers MUST be inside defaultFields — top-level is silently ignored by OpenPhone.
 */
async function createContact(
  phone: string,
  firstName: string,
  lastName: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch(`${BASE}/contacts`, {
    method: "POST",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      defaultFields: {
        firstName,
        lastName,
        phoneNumbers: [{ name: "Primary", value: phone }],
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { ok: false, error: `${res.status}: ${err}` };
  }
  const data = await res.json();
  return { ok: true, id: data?.data?.id };
}

/**
 * Update an existing contact's name.
 * Also ensures the phone number is present (in case the contact was
 * previously created without it — a historical API bug).
 */
async function updateContact(
  contactId: string,
  phone: string,
  firstName: string,
  lastName: string,
  existingPhones: OPPhoneEntry[]
): Promise<boolean> {
  const digits = last10(phone);
  const hasPhone = existingPhones.some((p) => last10(p.value) === digits);

  const updates: Record<string, unknown> = { firstName, lastName };

  // Add phone if missing — avoid overwriting existing entries
  if (!hasPhone) {
    updates.phoneNumbers = [
      ...existingPhones,
      { name: "Primary", value: phone },
    ];
  }

  const res = await fetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: { Authorization: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ defaultFields: updates }),
  });
  return res.ok;
}

/**
 * Syncs a Flip CRM contact name to OpenPhone.
 *
 * Name format: "[firstName] [lastName] Agent Milwaukee"
 * e.g. "John Smith" → firstName: "John", lastName: "Smith Agent Milwaukee"
 *
 * After write, reads back and verifies name + phone number are stored.
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

    const existing = await searchContact(phone);

    let contactId: string | undefined;
    let action: SyncResult["action"];

    if (!existing) {
      // No contact with this phone — create one
      const created = await createContact(phone, firstName, lastName);
      if (!created.ok) {
        return { ok: false, action: "error", error: created.error ?? "Failed to create" };
      }
      contactId = created.id;
      action = "created";
    } else {
      contactId = existing.id;
      const existingPhones = existing.defaultFields.phoneNumbers ?? [];

      // Skip only if name AND phone are already exactly right
      if (
        existing.defaultFields.firstName === firstName &&
        existing.defaultFields.lastName === lastName &&
        existingPhones.some((p) => last10(p.value) === last10(phone))
      ) {
        return {
          ok: true,
          action: "skipped",
          verified: true,
          storedName: `${firstName} ${lastName}`.trim(),
          hasPhone: true,
        };
      }

      const ok = await updateContact(contactId, phone, firstName, lastName, existingPhones);
      if (!ok) return { ok: false, action: "error", error: "Failed to update" };
      action = "updated";
    }

    // ── Verify: read back and confirm ──────────────────────────
    if (!contactId) {
      return { ok: true, action, verified: false, error: "No contact ID to verify" };
    }

    const readBack = await getContact(contactId);
    const storedFirst = readBack?.defaultFields?.firstName ?? "";
    const storedLast = readBack?.defaultFields?.lastName ?? "";
    const storedPhones = readBack?.defaultFields?.phoneNumbers ?? [];
    const storedName = `${storedFirst} ${storedLast}`.trim();

    const nameOk = storedFirst === firstName && storedLast === lastName;
    const phoneOk = storedPhones.some((p) => last10(p.value) === last10(phone));
    const verified = nameOk && phoneOk;

    return { ok: true, action, verified, storedName, hasPhone: phoneOk };
  } catch (e: unknown) {
    return { ok: false, action: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string;
  email: string; brokerage: string; area: string; source: string; verified: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  "Drip Active": "#3b82f6",
  "The Pool": "#a855f7",
  "Replied - Pivot Call Needed - HOT": "#f97316",
  "Deal sent- Discovery call needed": "#ec4899",
  "No Deal - Auto Reply": "#ef4444",
  "Underwriting": "#22c55e",
  "60-Day Rest": "#6b7280",
};

const ALL_STATUSES = [
  "Drip Active", "The Pool", "Replied - Pivot Call Needed - HOT",
  "Deal sent- Discovery call needed", "No Deal - Auto Reply", "Underwriting", "60-Day Rest",
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", brokerage: "", area: "", status: "Drip Active" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data);
    setLoading(false);
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newContact),
    });
    setNewContact({ name: "", phone: "", email: "", brokerage: "", area: "", status: "Drip Active" });
    setShowAdd(false);
    setSaving(false);
    await loadContacts();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      <nav style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Flip CRM</span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/dashboard" style={{ color: "#888", fontSize: 14 }}>Dashboard</Link>
          <Link href="/contacts" style={{ color: "#e5e5e5", fontSize: 14 }}>Contacts</Link>
          <Link href="/scripts" style={{ color: "#888", fontSize: 14 }}>Scripts</Link>
          <button onClick={logout} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", fontSize: 13 }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Contacts ({filtered.length})</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
          >
            + Add Contact
          </button>
        </div>

        {/* Add Contact Form */}
        {showAdd && (
          <form onSubmit={addContact} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Contact</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <input placeholder="Full Name *" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required />
              <input placeholder="Phone *" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} required />
              <input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
              <input placeholder="Brokerage" value={newContact.brokerage} onChange={(e) => setNewContact({ ...newContact, brokerage: e.target.value })} />
              <input placeholder="Area" value={newContact.area} onChange={(e) => setNewContact({ ...newContact, area: e.target.value })} />
              <select value={newContact.status} onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" disabled={saving} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600, fontSize: 14 }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "8px 20px", fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <input placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: 24, color: "#888", fontSize: 14 }}>Loading contacts...</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#141414", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {["Name", "Phone", "Status", "Step", "Brokerage", "Area", "Next Date", "Last Reply"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #222" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "12px 16px", color: "#888" }}>{c.phone}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        style={{
                          background: (STATUS_COLORS[c.status] ?? "#444") + "22",
                          border: "1px solid " + (STATUS_COLORS[c.status] ?? "#444") + "55",
                          color: STATUS_COLORS[c.status] ?? "#888",
                          borderRadius: 4,
                          padding: "3px 8px",
                          fontSize: 12,
                          width: "auto",
                        }}
                      >
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : `Drip ${c.dripStep}`}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888" }}>{c.brokerage}</td>
                    <td style={{ padding: "12px 16px", color: "#888" }}>{c.area}</td>
                    <td style={{ padding: "12px 16px", color: c.date && c.date <= new Date().toISOString().split("T")[0] ? "#f97316" : "#888", fontSize: 13 }}>
                      {c.date ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.lastReply || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

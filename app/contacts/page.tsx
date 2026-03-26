"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string;
  email: string; brokerage: string; area: string; source: string; verified: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  "Drip Active": "#00e5ff",
  "The Pool": "#a855f7",
  "Replied - Pivot Call Needed - HOT": "#f97316",
  "Deal sent- Discovery call needed": "#ec4899",
  "Offer Submitted": "#facc15",
  "No Deal - Auto Reply": "#ef4444",
  "Underwriting": "#22c55e",
  "60-Day Rest": "#6b7280",
};

const STATUS_SHORT: Record<string, string> = {
  "Drip Active": "Drip Active",
  "The Pool": "The Pool",
  "Replied - Pivot Call Needed - HOT": "Hot",
  "Deal sent- Discovery call needed": "Deal Sent",
  "Offer Submitted": "Offer",
  "No Deal - Auto Reply": "No Deal",
  "Underwriting": "Closed",
  "60-Day Rest": "60-Day Rest",
};

const ALL_STATUSES = [
  "Drip Active", "The Pool", "Replied - Pivot Call Needed - HOT",
  "Deal sent- Discovery call needed", "Offer Submitted",
  "No Deal - Auto Reply", "Underwriting", "60-Day Rest",
];

const FILTER_TABS = [
  { label: "All", value: "", icon: "⊞" },
  { label: "New", value: "New", icon: "✦" },
  { label: "Drip Active", value: "Drip Active", icon: "◎" },
  { label: "Hot Leads", value: "Replied - Pivot Call Needed - HOT", icon: "🔥" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", brokerage: "", area: "", status: "Drip Active" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    setContacts(await res.json());
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

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="app-root">
      <Sidebar />

      <div className="app-main">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Contacts</h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{filtered.length} agents</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              background: "#00e5ff", color: "#000", border: "none",
              borderRadius: 10, padding: "11px 22px", fontWeight: 700,
              fontSize: 14, boxShadow: "0 4px 12px rgba(0,229,255,0.2)",
            }}
          >
            + Add Contact
          </button>
        </div>

        {/* Add Contact Modal */}
        {showAdd && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}>
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 32, width: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>New Contact</h2>
              <form onSubmit={addContact}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <input placeholder="Full Name *" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required />
                  <input placeholder="Phone *" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} required />
                  <input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                  <input placeholder="Brokerage" value={newContact.brokerage} onChange={(e) => setNewContact({ ...newContact, brokerage: e.target.value })} />
                  <input placeholder="Area" value={newContact.area} onChange={(e) => setNewContact({ ...newContact, area: e.target.value })} />
                  <select value={newContact.status} onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}>
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button type="submit" disabled={saving} style={{ background: "#00e5ff", color: "#000", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: 14, flex: 1 }}>
                    {saving ? "Saving..." : "Save Contact"}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} style={{ background: "#2a2a2a", color: "#888", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 14 }}>Search & Filters</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: "none", cursor: "pointer",
                  background: filterStatus === tab.value ? "#ffffff" : "#2a2a2a",
                  color: filterStatus === tab.value ? "#111827" : "#888",
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#1a1a1a", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {loading ? (
            <p style={{ padding: 24, color: "#555", fontSize: 14 }}>Loading contacts...</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#141414" }}>
                  <th style={{ width: 36, padding: "14px 16px" }}>
                    <input type="checkbox" style={{ width: 16, height: 16, accentColor: "#00e5ff" }} />
                  </th>
                  {["Name", "Phone", "Status", "Campaign Stage", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "14px 16px", color: "#555", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #222" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <input type="checkbox" style={{ width: 16, height: 16, accentColor: "#00e5ff" }} />
                    </td>
                    <td style={{ padding: "14px 16px", color: "#fff", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "14px 16px", color: "#666" }}>{c.phone}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        style={{
                          background: (STATUS_COLORS[c.status] ?? "#444") + "22",
                          border: "1px solid " + (STATUS_COLORS[c.status] ?? "#444") + "55",
                          color: STATUS_COLORS[c.status] ?? "#888",
                          borderRadius: 6, padding: "4px 10px",
                          fontSize: 12, fontWeight: 600, width: "auto",
                        }}
                      >
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_SHORT[s] ?? s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666", fontSize: 13 }}>
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : `Drip ${c.dripStep}`}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", letterSpacing: 2 }}>•••</button>
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

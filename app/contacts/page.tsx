"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string; name: string; phone: string; altPhones: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string;
  email: string; brokerage: string; area: string; source: string;
  verified: boolean; assignedTo: string; notes: string;
};

const TEAM_MEMBERS = ["", "Yuval", "Yahav", "Both"];

const STATUS_COLORS: Record<string, string> = {
  "Drip Active": "#00e5ff",
  "The Pool": "#a855f7",
  "Replied - Pivot Call Needed - HOT": "#f97316",
  "Potential Deal": "#10b981",
  "Offer Submitted": "#facc15",
  "No Deal - Auto Reply": "#ef4444",
  "Underwriting": "#22c55e",
  "60-Day Rest": "#6b7280",
};

const STATUS_SHORT: Record<string, string> = {
  "Drip Active": "Drip Active",
  "The Pool": "The Pool",
  "Replied - Pivot Call Needed - HOT": "Hot",
  "Potential Deal": "Potential Deal",
  "Offer Submitted": "Offer",
  "No Deal - Auto Reply": "No Deal",
  "Underwriting": "Closed",
  "60-Day Rest": "60-Day Rest",
};

const ALL_STATUSES = [
  "Drip Active", "The Pool", "Replied - Pivot Call Needed - HOT",
  "Potential Deal", "Offer Submitted",
  "No Deal - Auto Reply", "Underwriting", "60-Day Rest",
];

const FILTER_TABS = [
  { label: "All", value: "", icon: "⊞" },
  { label: "New", value: "New", icon: "✦" },
  { label: "Drip Active", value: "Drip Active", icon: "◎" },
  { label: "Hot Leads", value: "Replied - Pivot Call Needed - HOT", icon: "🔥" },
];

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#ccc" }}>{value || "—"}</div>
    </div>
  );
}

function ContactDetailModal({ contact, onClose, onStatusChange }: {
  contact: Contact;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [callState, setCallState] = useState<"idle" | "confirm" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState("");
  const [msgState, setMsgState] = useState<"idle" | "confirm">("idle");

  async function initiateCall() {
    setCallState("calling");
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: contact.phone }),
      });
      const data = await res.json();
      if (data.ok) {
        setCallState("done");
        setTimeout(() => setCallState("idle"), 4000);
      } else {
        setCallState("error");
        setCallError(data.error ?? "Call failed");
        setTimeout(() => setCallState("idle"), 4000);
      }
    } catch {
      setCallState("error");
      setCallError("Network error");
      setTimeout(() => setCallState("idle"), 4000);
    }
  }

  const statusColor = STATUS_COLORS[contact.status] ?? "#444";
  const campaignStage = contact.status === "The Pool"
    ? `Pool ${contact.poolStep}`
    : contact.status === "Drip Active"
    ? `Drip ${contact.dripStep}`
    : "—";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          border: "1px solid #2a2a2a",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{contact.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                background: statusColor + "22", border: "1px solid " + statusColor + "55",
                color: statusColor, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700,
              }}>
                {STATUS_SHORT[contact.status] ?? contact.status}
              </span>
              {contact.verified && (
                <span style={{
                  fontSize: 11, color: "#34d399", fontWeight: 700,
                  background: "#10b98122", border: "1px solid #10b98144", borderRadius: 20, padding: "3px 10px",
                }}>
                  ✓ Verified
                </span>
              )}
              {contact.assignedTo && (
                <span style={{
                  fontSize: 11, color: "#a78bfa", fontWeight: 600,
                  background: "#7c3aed22", border: "1px solid #7c3aed44", borderRadius: 20, padding: "3px 10px",
                }}>
                  👤 {contact.assignedTo}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20, background: "#141414", borderRadius: 10, padding: 16 }}>
          <InfoField label="Phone" value={contact.phone} />
          <InfoField label="Alt Phones" value={contact.altPhones ? contact.altPhones.split(",").join(", ") : ""} />
          <InfoField label="Email" value={contact.email} />
          <InfoField label="Brokerage" value={contact.brokerage} />
          <InfoField label="Area" value={contact.area} />
          <InfoField label="Source" value={contact.source} />
          <InfoField label="Assigned To" value={contact.assignedTo} />
          <InfoField label="Campaign Stage" value={campaignStage} />
          <InfoField label="Last Contact" value={contact.lastContact ?? ""} />
        </div>

        {/* Last Reply */}
        {contact.lastReply && (
          <div style={{
            marginBottom: 16, background: "#ffffff08", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#bbb", fontStyle: "italic",
            borderLeft: "3px solid #ffffff22",
          }}>
            "{contact.lastReply}"
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, background: "#141414", borderRadius: 8, padding: "10px 14px" }}>{contact.notes}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 16, borderTop: "1px solid #222" }}>
          {/* Call with verification step */}
          {callState === "idle" && (
            <button
              onClick={() => setCallState("confirm")}
              style={{
                background: "#0ea5e922", color: "#38bdf8", border: "1px solid #0ea5e944",
                borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              📞 Call
            </button>
          )}
          {callState === "confirm" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#fb923c", fontWeight: 600 }}>Call {contact.name.split(" ")[0]}?</span>
              <button
                onClick={initiateCall}
                style={{ background: "#f97316", color: "#000", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Confirm
              </button>
              <button
                onClick={() => setCallState("idle")}
                style={{ background: "#2a2a2a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
              >
                ✕
              </button>
            </span>
          )}
          {callState === "calling" && <span style={{ fontSize: 13, color: "#f97316", alignSelf: "center" }}>📞 Calling...</span>}
          {callState === "done" && <span style={{ fontSize: 13, color: "#10b981", alignSelf: "center" }}>✓ Call initiated</span>}
          {callState === "error" && <span style={{ fontSize: 13, color: "#ef4444", alignSelf: "center" }} title={callError}>✗ Call failed</span>}

          {/* Message with verification step */}
          {msgState === "idle" && (
            <button
              onClick={() => setMsgState("confirm")}
              style={{
                background: "#10b98122", color: "#34d399", border: "1px solid #10b98144",
                borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              💬 Message
            </button>
          )}
          {msgState === "confirm" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>Message {contact.name.split(" ")[0]}?</span>
              <a
                href={`sms:${contact.phone}`}
                onClick={() => setMsgState("idle")}
                style={{
                  background: "#10b981", color: "#000", borderRadius: 6,
                  padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                }}
              >
                Confirm
              </a>
              <button
                onClick={() => setMsgState("idle")}
                style={{ background: "#2a2a2a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", brokerage: "", area: "", status: "Drip Active", assignedTo: "" });
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
    setNewContact({ name: "", phone: "", email: "", brokerage: "", area: "", status: "Drip Active", assignedTo: "" });
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
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.altPhones && c.altPhones.includes(search));
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="app-root">
      <Sidebar />

      <div className="app-main">
        {/* Contact Detail Modal */}
        {selectedContact && (
          <ContactDetailModal
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onStatusChange={updateStatus}
          />
        )}

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
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 32, width: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
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
                  <select value={newContact.assignedTo} onChange={(e) => setNewContact({ ...newContact, assignedTo: e.target.value })}>
                    <option value="">Assigned To (optional)</option>
                    {TEAM_MEMBERS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}
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
                  {["Name", "Phone", "Assigned To", "Status", "Campaign Stage", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "14px 16px", color: "#555", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderTop: "1px solid #222", cursor: "pointer" }}
                    onClick={() => setSelectedContact(c)}
                  >
                    <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" style={{ width: 16, height: 16, accentColor: "#00e5ff" }} />
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ color: "#fff", fontWeight: 500 }}>{c.name}</div>
                      {c.verified && <div style={{ fontSize: 10, color: "#34d399", fontWeight: 700, marginTop: 2 }}>✓ Verified</div>}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666" }}>{c.phone}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {c.assignedTo ? (
                        <span style={{
                          background: "#7c3aed22", color: "#a78bfa",
                          border: "1px solid #7c3aed44", borderRadius: 20,
                          padding: "3px 10px", fontSize: 11, fontWeight: 600,
                        }}>
                          👤 {c.assignedTo}
                        </span>
                      ) : (
                        <span style={{ color: "#444", fontSize: 12 }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
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
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : c.status === "Drip Active" ? `Drip ${c.dripStep}` : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedContact(c); }}
                        style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", letterSpacing: 2 }}
                      >
                        •••
                      </button>
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

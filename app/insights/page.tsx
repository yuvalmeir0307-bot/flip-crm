"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string; brokerage: string; area: string;
  offerDate: string | null; closeDate: string | null;
};

type ActivityLog = {
  id: string; date: string; messagesSent: number; replies: number;
  callsMade: number; avgCallMinutes: number; converted: number; notes: string;
};

const STATUSES = [
  "Drip Active", "The Pool", "Replied - Pivot Call Needed - HOT",
  "Deal sent- Discovery call needed", "Offer Submitted",
  "No Deal - Auto Reply", "Underwriting", "60-Day Rest",
];

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

const PIE_COLORS = ["#00e5ff","#a855f7","#f97316","#ec4899","#facc15","#ef4444","#22c55e","#6b7280"];

// ── Modal ────────────────────────────────────────────────────────────────────
function KpiModal({ label, rows: initialRows, onClose, onSave }: {
  label: string; rows: Contact[]; onClose: () => void; onSave: (updated: Contact) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState(initialRows);

  async function saveEdit(r: Contact) {
    setSaving(true);
    try {
      await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, ...editBuf }),
      });
      const updated = { ...r, ...editBuf } as Contact;
      setRows((prev) => prev.map((c) => c.id === r.id ? updated : c));
      onSave(updated);
    } finally { setSaving(false); setEditId(null); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#1a1a1a", borderRadius: 16, border: "1px solid #00e5ff22",
        width: "min(900px, 96vw)", maxHeight: "78vh",
        display: "flex", flexDirection: "column",
        zIndex: 101, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #252525" }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5" }}>{label}</span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 10 }}>{rows.length} contacts</span>
          </div>
          <button onClick={onClose} style={{ background: "#252525", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 18, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {rows.length === 0 ? (
            <div style={{ padding: "28px 24px", color: "#6b7280", fontSize: 13 }}>No contacts in this group.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
                <tr>
                  {["Name","Status","Brokerage","Area","Drip Step","Offer Date","Close Date",""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isEditing = editId === r.id;
                  return (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                      <td style={{ padding: "10px 16px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <select value={editBuf.status ?? r.status}
                            onChange={(e) => setEditBuf((b) => ({ ...b, status: e.target.value }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: "100%" }}>
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: STATUS_COLORS[r.status] ?? "#9ca3af" }}>{r.status || "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <input value={editBuf.brokerage ?? r.brokerage} onChange={(e) => setEditBuf((b) => ({ ...b, brokerage: e.target.value }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: "100%" }} />
                        ) : <span style={{ color: "#d1d5db" }}>{r.brokerage || "—"}</span>}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <input value={editBuf.area ?? r.area} onChange={(e) => setEditBuf((b) => ({ ...b, area: e.target.value }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: "100%" }} />
                        ) : <span style={{ color: "#d1d5db" }}>{r.area || "—"}</span>}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <input type="number" min={1} max={10} value={editBuf.dripStep ?? r.dripStep} onChange={(e) => setEditBuf((b) => ({ ...b, dripStep: Number(e.target.value) }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: 60 }} />
                        ) : <span style={{ color: "#d1d5db" }}>{r.dripStep || "—"}</span>}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <input type="date" value={editBuf.offerDate ?? r.offerDate ?? ""} onChange={(e) => setEditBuf((b) => ({ ...b, offerDate: e.target.value }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} />
                        ) : <span style={{ color: "#d1d5db" }}>{r.offerDate ?? "—"}</span>}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e" }}>
                        {isEditing ? (
                          <input type="date" value={editBuf.closeDate ?? r.closeDate ?? ""} onChange={(e) => setEditBuf((b) => ({ ...b, closeDate: e.target.value }))}
                            style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} />
                        ) : <span style={{ color: "#d1d5db" }}>{r.closeDate ?? "—"}</span>}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => saveEdit(r)} disabled={saving}
                              style={{ background: "#22c55e22", border: "1px solid #22c55e55", color: "#22c55e", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                              {saving ? "…" : "Save"}
                            </button>
                            <button onClick={() => setEditId(null)}
                              style={{ background: "#252525", border: "1px solid #333", color: "#9ca3af", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditId(r.id); setEditBuf({ status: r.status, brokerage: r.brokerage, area: r.area, dripStep: r.dripStep, offerDate: r.offerDate, closeDate: r.closeDate }); }}
                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color = "#e5e5e5", sub, contacts, filterFn, onContactUpdate }: {
  label: string; value: string | number; color?: string; sub?: string;
  contacts: Contact[]; filterFn?: (c: Contact) => boolean; onContactUpdate?: (u: Contact) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = filterFn ? contacts.filter(filterFn) : [];
  return (
    <>
      <div onClick={() => filterFn && setOpen(true)} style={{
        flex: 1, minWidth: 130,
        background: "#1a1a1a", borderRadius: 12, padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 4,
        cursor: filterFn ? "pointer" : "default", userSelect: "none", transition: "background 0.15s",
      }}
        onMouseEnter={(e) => filterFn && ((e.currentTarget as HTMLDivElement).style.background = "#222")}
        onMouseLeave={(e) => filterFn && ((e.currentTarget as HTMLDivElement).style.background = "#1a1a1a")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
          {filterFn && <span style={{ color: "#444", fontSize: 10 }}>↗</span>}
        </div>
        <span style={{ fontSize: 26, fontWeight: 700, color }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: "#6b7280" }}>{sub}</span>}
      </div>
      {open && filterFn && (
        <KpiModal label={label} rows={rows} onClose={() => setOpen(false)} onSave={(u) => { onContactUpdate?.(u); }} />
      )}
    </>
  );
}

// ── Timeline Card ─────────────────────────────────────────────────────────────
function TimelineCard({ label, value, unit = "days", color = "#9ca3af" }: {
  label: string; value: number | null; unit?: string; color?: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 130, background: "#1a1a1a", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color }}>{value !== null ? value : "—"}</span>
        {value !== null && <span style={{ fontSize: 11, color: "#6b7280" }}>{unit}</span>}
      </div>
      {value === null && <span style={{ fontSize: 11, color: "#374151" }}>Not enough data yet</span>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 14px" }}>
      <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ color: payload[0].fill || "#00e5ff", fontSize: 14, fontWeight: 600 }}>{payload[0].value}</p>
    </div>
  );
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (diff < 0) return null;
  return Math.round(diff / 86400000);
}

function avgDays(pairs: (number | null)[]): number | null {
  const valid = pairs.filter((v): v is number => v !== null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "replies" | "activity">("pipeline");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [logForm, setLogForm] = useState({ date: new Date().toISOString().split("T")[0], messagesSent: 0, replies: 0, callsMade: 0, avgCallMinutes: 0, converted: 0, notes: "" });
  const [savingLog, setSavingLog] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [activitySetupNeeded, setActivitySetupNeeded] = useState(false);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => { setContacts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "activity") loadActivityLogs();
  }, [tab]);

  async function loadActivityLogs() {
    setActivityLoading(true);
    try {
      const res = await fetch("/api/activity");
      const data = await res.json();
      if (data.error?.includes("NOTION_ACTIVITY_DB_ID")) { setActivitySetupNeeded(true); }
      else { setActivityLogs(Array.isArray(data) ? data : []); }
    } catch { setActivitySetupNeeded(true); }
    setActivityLoading(false);
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setSavingLog(true);
    try {
      await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logForm) });
      setLogSaved(true);
      setTimeout(() => setLogSaved(false), 2500);
      await loadActivityLogs();
    } finally { setSavingLog(false); }
  }

  function handleContactUpdate(updated: Contact) {
    setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  // ── Funnel counts ───────────────────────────────────────────────────────────
  const total = contacts.length;
  const dripList       = contacts.filter((c) => c.status === "Drip Active");
  const restList       = contacts.filter((c) => c.status === "60-Day Rest");
  const repliedList    = contacts.filter((c) =>
    ["Replied - Pivot Call Needed - HOT","Deal sent- Discovery call needed","Offer Submitted","Underwriting","The Pool","No Deal - Auto Reply"].includes(c.status)
  );
  const poolList       = contacts.filter((c) => c.status === "The Pool");
  const hotList        = contacts.filter((c) =>
    ["Replied - Pivot Call Needed - HOT","Deal sent- Discovery call needed","Offer Submitted","Underwriting"].includes(c.status)
  );
  const dealSentList   = contacts.filter((c) =>
    ["Deal sent- Discovery call needed","Offer Submitted","Underwriting"].includes(c.status)
  );
  const offerList      = contacts.filter((c) =>
    ["Offer Submitted","Underwriting"].includes(c.status)
  );
  const closedList     = contacts.filter((c) => c.status === "Underwriting");
  const noDealList     = contacts.filter((c) => c.status === "No Deal - Auto Reply");

  const replied    = repliedList.length;
  const hot        = hotList.length;
  const dealSent   = dealSentList.length;
  const offers     = offerList.length;
  const closed     = closedList.length;

  // ── Rate calculations ───────────────────────────────────────────────────────
  const replyRate  = total > 0   ? ((replied / total) * 100).toFixed(1) : "0";
  const hotRate    = replied > 0 ? ((hot / replied) * 100).toFixed(1)   : "0";
  const dealRate   = hot > 0     ? ((dealSent / hot) * 100).toFixed(1)  : "0";
  const offerRate  = dealSent > 0 ? ((offers / dealSent) * 100).toFixed(1) : "0";
  const closeRate  = offers > 0  ? ((closed / offers) * 100).toFixed(1) : "0";

  // ── Timeline calculations ───────────────────────────────────────────────────
  const avgLoadedToReply = avgDays(
    repliedList.map((c) => daysBetween(c.date, c.lastContact))
  );
  const avgReplyToDeal = avgDays(
    dealSentList.map((c) => daysBetween(c.lastContact, c.offerDate ?? c.lastContact))
  );
  const avgDealToOffer = avgDays(
    offerList.filter((c) => c.offerDate).map((c) => daysBetween(c.date, c.offerDate))
  );
  const avgOfferToClose = avgDays(
    closedList.filter((c) => c.offerDate && c.closeDate).map((c) => daysBetween(c.offerDate, c.closeDate))
  );

  // ── Chart data ──────────────────────────────────────────────────────────────
  const funnelData = [
    { name: "In System",   value: total,    fill: "#6b7280" },
    { name: "Replied",     value: replied,  fill: "#00e5ff" },
    { name: "The Pool",    value: poolList.length, fill: "#a855f7" },
    { name: "Hot Leads",   value: hot,      fill: "#f97316" },
    { name: "Deal Sent",   value: dealSent, fill: "#ec4899" },
    { name: "Offer",       value: offers,   fill: "#facc15" },
    { name: "Closed",      value: closed,   fill: "#22c55e" },
  ];

  const pieData = STATUSES.map((s) => ({
    name: s.length > 22 ? s.slice(0, 22) + "…" : s,
    fullName: s,
    value: contacts.filter((c) => c.status === s).length,
  })).filter((d) => d.value > 0);

  const dripStepData = Array.from({ length: 10 }, (_, i) => ({
    step: `Step ${i + 1}`,
    count: contacts.filter((c) => c.dripStep === i + 1).length,
  })).filter((d) => d.count > 0);

  const today = new Date();
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      added: contacts.filter((c) => c.date?.startsWith(dateStr)).length,
    };
  });

  const SECTION = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, marginTop: 24 }}>
      {title}
    </div>
  );

  const repliedContacts = contacts.filter((c) =>
    ["Replied - Pivot Call Needed - HOT","Deal sent- Discovery call needed","Offer Submitted","Underwriting","No Deal - Auto Reply"].includes(c.status)
  );
  const poolDeals = contacts.filter((c) =>
    ["Deal sent- Discovery call needed","Offer Submitted","Underwriting"].includes(c.status)
  );

  // Activity totals
  const totalMsgSent = activityLogs.reduce((a, l) => a + l.messagesSent, 0);
  const totalReplies = activityLogs.reduce((a, l) => a + l.replies, 0);
  const totalCalls = activityLogs.reduce((a, l) => a + l.callsMade, 0);
  const totalConverted = activityLogs.reduce((a, l) => a + l.converted, 0);
  const avgCallDuration = activityLogs.filter((l) => l.avgCallMinutes > 0).length > 0
    ? Math.round(activityLogs.filter((l) => l.avgCallMinutes > 0).reduce((a, l) => a + l.avgCallMinutes, 0) / activityLogs.filter((l) => l.avgCallMinutes > 0).length)
    : 0;
  const msgReplyRate = totalMsgSent > 0 ? ((totalReplies / totalMsgSent) * 100).toFixed(1) : "0";
  const callConvRate = totalCalls > 0 ? ((totalConverted / totalCalls) * 100).toFixed(1) : "0";

  const activityChartData = [...activityLogs].reverse().slice(-14).map((l) => ({
    date: l.date.slice(5),
    Messages: l.messagesSent,
    Replies: l.replies,
    Calls: l.callsMade,
  }));

  const TAB_STYLE = (active: boolean) => ({
    padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: "transparent", border: "none",
    borderBottom: active ? "2px solid #00e5ff" : "2px solid transparent",
    color: active ? "#00e5ff" : "#9ca3af", marginBottom: -1,
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Insights</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>Pipeline KPIs — click any card to expand and edit</p>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 28, display: "flex" }}>
          <button style={TAB_STYLE(tab === "pipeline")} onClick={() => setTab("pipeline")}>Pipeline</button>
          <button style={TAB_STYLE(tab === "replies")} onClick={() => setTab("replies")}>
            Replies & Deals
            <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
              {repliedContacts.length} replied · {poolDeals.length} deals
            </span>
          </button>
          <button style={TAB_STYLE(tab === "activity")} onClick={() => setTab("activity")}>
            Daily Activity
            <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
              {activityLogs.length > 0 ? `${activityLogs.length} logs` : "Log daily"}
            </span>
          </button>
        </div>

        {/* ═══ TAB: PIPELINE ═══ */}
        {tab === "pipeline" && (loading ? (
          <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 40 }}>Loading data...</div>
        ) : (
          <>
            {/* ── FUNNEL ── */}
            {SECTION("Funnel")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <KpiCard label="Total Agents"   value={total}            color="#e5e5e5"  contacts={contacts} filterFn={(c) => !!c}                          onContactUpdate={handleContactUpdate} />
              <KpiCard label="Drip Active"    value={dripList.length}  color="#00e5ff"  contacts={contacts} filterFn={(c) => dripList.includes(c)}          onContactUpdate={handleContactUpdate} />
              <KpiCard label="60-Day Rest"    value={restList.length}  color="#6b7280"  contacts={contacts} filterFn={(c) => restList.includes(c)}          onContactUpdate={handleContactUpdate} />
              <KpiCard label="Replied"        value={replied}          color="#00e5ff"  contacts={contacts} filterFn={(c) => repliedList.includes(c)}       onContactUpdate={handleContactUpdate} />
              <KpiCard label="The Pool"       value={poolList.length}  color="#a855f7"  contacts={contacts} filterFn={(c) => poolList.includes(c)}          onContactUpdate={handleContactUpdate} />
              <KpiCard label="Hot Leads"      value={hot}              color="#f97316"  contacts={contacts} filterFn={(c) => hotList.includes(c)}           onContactUpdate={handleContactUpdate} />
              <KpiCard label="Deal Sent"      value={dealSent}         color="#ec4899"  contacts={contacts} filterFn={(c) => dealSentList.includes(c)}      onContactUpdate={handleContactUpdate} />
              <KpiCard label="Offer Submitted" value={offers}          color="#facc15"  contacts={contacts} filterFn={(c) => offerList.includes(c)}         onContactUpdate={handleContactUpdate} />
              <KpiCard label="Closed"         value={closed}           color="#22c55e"  contacts={contacts} filterFn={(c) => closedList.includes(c)}        onContactUpdate={handleContactUpdate} />
              <KpiCard label="No Deal"        value={noDealList.length} color="#ef4444" contacts={contacts} filterFn={(c) => noDealList.includes(c)}        onContactUpdate={handleContactUpdate} />
            </div>

            {/* ── RATES ── */}
            {SECTION("Conversion Rates")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <KpiCard label="Reply Rate"   value={`${replyRate}%`}  color="#00e5ff"  contacts={contacts} sub={`${replied} of ${total}`} />
              <KpiCard label="Hot Rate"     value={`${hotRate}%`}    color="#f97316"  contacts={contacts} sub={`${hot} of ${replied} replied`} />
              <KpiCard label="Deal Rate"    value={`${dealRate}%`}   color="#ec4899"  contacts={contacts} sub={`${dealSent} of ${hot} hot`} />
              <KpiCard label="Offer Rate"   value={`${offerRate}%`}  color="#facc15"  contacts={contacts} sub={`${offers} of ${dealSent} deals`} />
              <KpiCard label="Close Rate"   value={`${closeRate}%`}  color="#22c55e"  contacts={contacts} sub={`${closed} of ${offers} offers`} />
            </div>

            {/* ── TIMELINES ── */}
            {SECTION("Average Timelines")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <TimelineCard label="Loaded → Reply"    value={avgLoadedToReply}  color="#00e5ff" />
              <TimelineCard label="Reply → Deal Sent" value={avgReplyToDeal}    color="#ec4899" />
              <TimelineCard label="Deal → Offer"      value={avgDealToOffer}    color="#facc15" />
              <TimelineCard label="Offer → Closed"    value={avgOfferToClose}   color="#22c55e" />
            </div>

            {/* ── CHARTS ROW 1 ── */}
            <div style={{ display: "flex", gap: 20, marginTop: 28, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "22px 24px", flex: 2, minWidth: 320 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 18 }}>Pipeline Funnel</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "22px 24px", flex: 1, minWidth: 260 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 18 }}>Status Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: "8px 14px" }}>
                          <p style={{ color: "#e5e5e5", fontSize: 12 }}>{payload[0].payload.fullName}</p>
                          <p style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>{payload[0].value}</p>
                        </div>
                      ) : null
                    } />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#9ca3af", flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 12, color: "#e5e5e5", fontWeight: 600 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── CHARTS ROW 2 ── */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "22px 24px", flex: 2, minWidth: 320 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 18 }}>Contacts Added — Last 14 Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#333" }} />
                    <Line type="monotone" dataKey="added" stroke="#00e5ff" strokeWidth={2} dot={{ fill: "#00e5ff", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "22px 24px", flex: 1, minWidth: 240 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 18 }}>Drip Step Distribution</h3>
                {dripStepData.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: 13 }}>No drip data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dripStepData} layout="vertical" barCategoryGap="25%">
                      <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="step" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff08" }} />
                      <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        ))}

        {/* ═══ TAB: REPLIES & DEALS ═══ */}
        {tab === "replies" && (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

            {/* Drip Replies */}
            <div style={{ flex: 1, minWidth: 340, background: "#1a1a1a", borderRadius: 14, padding: "22px 24px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 4 }}>Drip Replies</h3>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Agents who replied to the drip</p>
              {repliedContacts.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>No replies yet.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Name","Status","Brokerage","Last Contact"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repliedContacts.sort((a, b) => (b.lastContact ?? "").localeCompare(a.lastContact ?? "")).map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                        <td style={{ padding: "10px 10px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e" }}>{c.name}</td>
                        <td style={{ padding: "10px 10px", borderBottom: "1px solid #1e1e1e" }}>
                          <span style={{ color: STATUS_COLORS[c.status] ?? "#9ca3af", fontSize: 11 }}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px 10px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e", fontSize: 12 }}>{c.brokerage || "—"}</td>
                        <td style={{ padding: "10px 10px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontSize: 12 }}>{c.lastContact ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pool Deals */}
            <div style={{ flex: 1, minWidth: 340, background: "#1a1a1a", borderRadius: 14, padding: "22px 24px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 4 }}>Deals from Pool</h3>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Agents who brought a deal from the follow-up</p>
              {poolDeals.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>No pool deals yet.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Name","Status","Brokerage","Offer Date","Close Date"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {poolDeals.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                        <td style={{ padding: "10px 10px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e" }}>{c.name}</td>
                        <td style={{ padding: "10px 10px", borderBottom: "1px solid #1e1e1e" }}>
                          <span style={{ color: STATUS_COLORS[c.status] ?? "#9ca3af", fontSize: 11 }}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px 10px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e", fontSize: 12 }}>{c.brokerage || "—"}</td>
                        <td style={{ padding: "10px 10px", color: "#facc15", borderBottom: "1px solid #1e1e1e", fontSize: 12 }}>{c.offerDate ?? "—"}</td>
                        <td style={{ padding: "10px 10px", color: "#22c55e", borderBottom: "1px solid #1e1e1e", fontSize: 12 }}>{c.closeDate ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: DAILY ACTIVITY ═══ */}
        {tab === "activity" && (
          <>
            {activitySetupNeeded ? (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "28px 28px", maxWidth: 560 }}>
                <h3 style={{ color: "#facc15", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Setup needed</h3>
                <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>
                  Create a Notion database with these fields:
                  <br />Date · Messages Sent · Replies · Calls Made · Avg Call Min · Converted · Notes
                  <br /><br />
                  Then add to Vercel env vars:
                </p>
                <code style={{ display: "block", background: "#141414", color: "#00e5ff", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 10 }}>
                  NOTION_ACTIVITY_DB_ID=your_database_id
                </code>
              </div>
            ) : (
              <>
                {/* Section 5: Conversion Analysis */}
                <div style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Conversion Analysis</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
                  {[
                    { label: "Messages Sent", value: totalMsgSent, color: "#00e5ff" },
                    { label: "Replies Received", value: totalReplies, color: "#a855f7" },
                    { label: "Msg → Reply Rate", value: `${msgReplyRate}%`, color: "#00e5ff" },
                    { label: "Calls Made", value: totalCalls, color: "#f97316" },
                    { label: "Converted Agents", value: totalConverted, color: "#22c55e" },
                    { label: "Call → Conversion", value: `${callConvRate}%`, color: "#22c55e" },
                    { label: "Avg Call Duration", value: `${avgCallDuration}m`, color: "#9ca3af" },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, minWidth: 120, background: "#1a1a1a", borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Activity Chart */}
                {activityChartData.length > 0 && (
                  <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "22px 24px", marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 18 }}>Daily Activity — Last 14 Days</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={activityChartData} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                        <Bar dataKey="Messages" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Replies" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Calls" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                      {[["Messages","#00e5ff"],["Replies","#a855f7"],["Calls","#f97316"]].map(([l,c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Log Form */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 320, background: "#1a1a1a", borderRadius: 14, padding: "22px 24px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 16 }}>Log Today&apos;s Activity</h3>
                    <form onSubmit={submitLog} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {([
                          ["Date", "date", "date"],
                          ["Messages Sent", "messagesSent", "number"],
                          ["Replies Received", "replies", "number"],
                          ["Calls Made", "callsMade", "number"],
                          ["Avg Call (min)", "avgCallMinutes", "number"],
                          ["Converted Agents", "converted", "number"],
                        ] as [string, keyof typeof logForm, string][]).map(([label, key, type]) => (
                          <div key={key}>
                            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
                            <input type={type} value={logForm[key] as string | number}
                              onChange={(e) => setLogForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                              style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 4 }}>Notes</label>
                        <textarea value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                          style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%", fontFamily: "inherit", resize: "none" }} />
                      </div>
                      <button type="submit" disabled={savingLog} style={{
                        background: logSaved ? "#22c55e" : "#00e5ff", color: "#000", border: "none",
                        borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>
                        {savingLog ? "Saving..." : logSaved ? "✓ Saved!" : "Save Log"}
                      </button>
                    </form>
                  </div>

                  {/* Recent logs table */}
                  <div style={{ flex: 2, minWidth: 360, background: "#1a1a1a", borderRadius: 14, padding: "22px 24px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 16 }}>Recent Logs</h3>
                    {activityLoading ? (
                      <p style={{ color: "#6b7280", fontSize: 13 }}>Loading...</p>
                    ) : activityLogs.length === 0 ? (
                      <p style={{ color: "#6b7280", fontSize: 13 }}>No logs yet. Start logging daily.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            {["Date","Msgs","Replies","Calls","Avg Min","Converted","Notes"].map((h) => (
                              <th key={h} style={{ padding: "8px 10px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activityLogs.map((l, i) => (
                            <tr key={l.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                              <td style={{ padding: "9px 10px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e" }}>{l.date}</td>
                              <td style={{ padding: "9px 10px", color: "#00e5ff", borderBottom: "1px solid #1e1e1e", fontWeight: 600 }}>{l.messagesSent}</td>
                              <td style={{ padding: "9px 10px", color: "#a855f7", borderBottom: "1px solid #1e1e1e", fontWeight: 600 }}>{l.replies}</td>
                              <td style={{ padding: "9px 10px", color: "#f97316", borderBottom: "1px solid #1e1e1e", fontWeight: 600 }}>{l.callsMade}</td>
                              <td style={{ padding: "9px 10px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>{l.avgCallMinutes}m</td>
                              <td style={{ padding: "9px 10px", color: "#22c55e", borderBottom: "1px solid #1e1e1e", fontWeight: 600 }}>{l.converted}</td>
                              <td style={{ padding: "9px 10px", color: "#6b7280", borderBottom: "1px solid #1e1e1e" }}>{l.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

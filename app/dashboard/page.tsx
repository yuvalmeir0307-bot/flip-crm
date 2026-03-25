"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string; brokerage: string; area: string;
};

const STATUS_COLORS: Record<string, string> = {
  "Drip Active": "#00e5ff",
  "The Pool": "#a855f7",
  "Replied - Pivot Call Needed - HOT": "#f97316",
  "Deal sent- Discovery call needed": "#ec4899",
  "No Deal - Auto Reply": "#ef4444",
  "Underwriting": "#22c55e",
  "60-Day Rest": "#6b7280",
};

const STATUS_SHORT: Record<string, string> = {
  "Drip Active": "Drip Active",
  "The Pool": "The Pool",
  "Replied - Pivot Call Needed - HOT": "Hot 🔥",
  "Deal sent- Discovery call needed": "Deal",
  "No Deal - Auto Reply": "No Deal",
  "Underwriting": "Underwriting",
  "60-Day Rest": "60-Day Rest",
};

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [cronLogs, setCronLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  async function runDrip() {
    setRunningCron(true);
    setCronLogs([]);
    const res = await fetch("/api/cron/drip");
    const data = await res.json();
    setCronLogs(data.logs ?? []);
    setRunningCron(false);
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }

  const counts = {
    total: contacts.length,
    drip: contacts.filter((c) => c.status === "Drip Active").length,
    pool: contacts.filter((c) => c.status === "The Pool").length,
    hot: contacts.filter((c) => c.status === "Replied - Pivot Call Needed - HOT").length,
    deal: contacts.filter((c) => c.status === "Deal sent- Discovery call needed").length,
  };

  const today = new Date().toISOString().split("T")[0];
  const dueToday = contacts.filter(
    (c) => (c.status === "Drip Active" || c.status === "The Pool") && (!c.date || c.date <= today)
  );

  const stats = [
    { label: "Total Contacts", value: counts.total, color: "#ffffff" },
    { label: "Drip Active", value: counts.drip, color: "#00e5ff" },
    { label: "In The Pool", value: counts.pool, color: "#a855f7" },
    { label: "Hot Leads", value: counts.hot, color: "#f97316" },
    { label: "Deals", value: counts.deal, color: "#22c55e" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>Welcome back, Yuval</p>
          </div>
          <button
            onClick={runDrip}
            disabled={runningCron}
            style={{
              background: "#1a1a1a", color: "#fff", border: "none",
              borderRadius: 10, padding: "11px 22px", fontWeight: 600,
              fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {runningCron ? "Running..." : "▶ Run Drip Now"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: "#1a1a1a", borderRadius: 12, padding: "20px 18px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Due Today */}
        <div style={{
          background: "#1a1a1a", borderRadius: 12, padding: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#ffffff", marginBottom: 18 }}>
            Due Today — <span style={{ color: "#00e5ff" }}>{dueToday.length} contacts</span>
          </h2>
          {loading ? (
            <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>
          ) : dueToday.length === 0 ? (
            <p style={{ color: "#555", fontSize: 14 }}>No contacts due today.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {["Name", "Phone", "Status", "Step", "Brokerage"].map((h) => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 12, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dueToday.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #2a2a2a" }}>
                    <td style={{ padding: "12px 0", color: "#fff", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "12px 0", color: "#666" }}>{c.phone}</td>
                    <td style={{ padding: "12px 0" }}>
                      <span style={{
                        background: (STATUS_COLORS[c.status] ?? "#444") + "22",
                        color: STATUS_COLORS[c.status] ?? "#888",
                        borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 500,
                      }}>
                        {STATUS_SHORT[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 0", color: "#666", fontSize: 13 }}>
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : `Drip ${c.dripStep}`}
                    </td>
                    <td style={{ padding: "12px 0", color: "#666" }}>{c.brokerage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cron Logs */}
        {cronLogs.length > 0 && (
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Run Logs</h3>
            {cronLogs.map((log, i) => (
              <p key={i} style={{
                fontSize: 13, marginBottom: 4, fontFamily: "monospace",
                color: log.includes("✓") ? "#22c55e" : log.includes("✗") ? "#ef4444" : "#888",
              }}>
                {log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

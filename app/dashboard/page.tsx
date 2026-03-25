"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string; brokerage: string; area: string;
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

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function runDrip() {
    setRunningCron(true);
    setCronLogs([]);
    const res = await fetch("/api/cron/drip");
    const data = await res.json();
    setCronLogs(data.logs ?? []);
    setRunningCron(false);
    // Refresh contacts
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }

  const counts = {
    total: contacts.length,
    drip: contacts.filter((c) => c.status === "Drip Active").length,
    pool: contacts.filter((c) => c.status === "The Pool").length,
    hot: contacts.filter((c) => c.status === "Replied - Pivot Call Needed - HOT").length,
    noDeal: contacts.filter((c) => c.status === "No Deal - Auto Reply").length,
  };

  const today = new Date().toISOString().split("T")[0];
  const dueToday = contacts.filter(
    (c) => (c.status === "Drip Active" || c.status === "The Pool") && (!c.date || c.date <= today)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      {/* Nav */}
      <nav style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Flip CRM</span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/dashboard" style={{ color: "#e5e5e5", fontSize: 14 }}>Dashboard</Link>
          <Link href="/contacts" style={{ color: "#888", fontSize: 14 }}>Contacts</Link>
          <Link href="/scripts" style={{ color: "#888", fontSize: 14 }}>Scripts</Link>
          <button onClick={logout} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", fontSize: 13 }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
          <button
            onClick={runDrip}
            disabled={runningCron}
            style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
          >
            {runningCron ? "Running..." : "Run Drip Now"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total", value: counts.total, color: "#e5e5e5" },
            { label: "Drip Active", value: counts.drip, color: "#3b82f6" },
            { label: "The Pool", value: counts.pool, color: "#a855f7" },
            { label: "HOT", value: counts.hot, color: "#f97316" },
            { label: "No Deal", value: counts.noDeal, color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "20px 16px" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Due Today */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Due Today — {dueToday.length} contacts
          </h2>
          {loading ? (
            <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>
          ) : dueToday.length === 0 ? (
            <p style={{ color: "#888", fontSize: 14 }}>No contacts due today.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: "#888", borderBottom: "1px solid #2a2a2a" }}>
                  <th style={{ textAlign: "left", paddingBottom: 10 }}>Name</th>
                  <th style={{ textAlign: "left", paddingBottom: 10 }}>Phone</th>
                  <th style={{ textAlign: "left", paddingBottom: 10 }}>Status</th>
                  <th style={{ textAlign: "left", paddingBottom: 10 }}>Step</th>
                  <th style={{ textAlign: "left", paddingBottom: 10 }}>Brokerage</th>
                </tr>
              </thead>
              <tbody>
                {dueToday.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                    <td style={{ padding: "10px 0" }}>{c.name}</td>
                    <td style={{ padding: "10px 0", color: "#888" }}>{c.phone}</td>
                    <td style={{ padding: "10px 0" }}>
                      <span style={{ background: STATUS_COLORS[c.status] + "22", color: STATUS_COLORS[c.status] ?? "#888", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", color: "#888" }}>
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : `Drip ${c.dripStep}`}
                    </td>
                    <td style={{ padding: "10px 0", color: "#888" }}>{c.brokerage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cron Logs */}
        {cronLogs.length > 0 && (
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#888" }}>Run Logs</h3>
            {cronLogs.map((log, i) => (
              <p key={i} style={{ fontSize: 13, color: log.includes("✓") ? "#22c55e" : log.includes("✗") ? "#ef4444" : "#aaa", marginBottom: 4, fontFamily: "monospace" }}>
                {log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

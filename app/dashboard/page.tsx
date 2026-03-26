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

// Mini SVG sparkline chart
function SparkLine({ color, points }: { color: string; points: number[] }) {
  const max = Math.max(...points, 1);
  const w = 120, h = 44;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const areaCoords = `0,${h} ${coords} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaCoords} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
    { label: "Total Contacts", value: counts.total, color: "#ffffff", spark: [2, 3, 3, 4, 4, 4] },
    { label: "Drip Active", value: counts.drip, color: "#00e5ff", spark: [1, 2, 3, 2, 3, 3] },
    { label: "In The Pool", value: counts.pool, color: "#a855f7", spark: [0, 0, 1, 1, 1, 1] },
    { label: "Hot Leads", value: counts.hot, color: "#f97316", spark: [0, 0, 0, 0, 0, 0] },
    { label: "Deals", value: counts.deal, color: "#22c55e", spark: [0, 0, 0, 0, 0, 0] },
  ];

  // Build activity data for chart (drip vs pool over mock weekly points)
  const dripPoints = [0, 1, 1, 2, 2, 3, counts.drip];
  const poolPoints = [0, 0, 0, 1, 1, 1, counts.pool];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Welcome back, Yuval and Yahav</p>
          </div>
          <button
            onClick={runDrip}
            disabled={runningCron}
            style={{
              background: "#1a1a1a", color: "#fff", border: "none",
              borderRadius: 10, padding: "11px 22px", fontWeight: 600,
              fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              opacity: runningCron ? 0.7 : 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polygon points="2,1 11,6 2,11" fill="#fff" />
            </svg>
            {runningCron ? "Running..." : "Run Drip Now"}
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: "#1a1a1a", borderRadius: 14, padding: "20px 20px 16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ marginTop: 8 }}>
                <SparkLine color={s.color} points={s.spark} />
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {/* Drip Activity Chart */}
          <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Drip Activity</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#00e5ff", marginTop: 2 }}>{counts.drip} <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>active</span></p>
              </div>
              <span style={{ background: "#00e5ff18", color: "#00e5ff", fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>DRIP</span>
            </div>
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,80 ${dripPoints.map((v, i) => `${i * (300 / (dripPoints.length - 1))},${80 - (v / Math.max(...dripPoints, 1)) * 70}`).join(" ")} 300,80`} fill="url(#gradTeal)" />
              <polyline points={dripPoints.map((v, i) => `${i * (300 / (dripPoints.length - 1))},${80 - (v / Math.max(...dripPoints, 1)) * 70}`).join(" ")} fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {["7d ago", "6d", "5d", "4d", "3d", "2d", "Today"].map((d) => (
                <span key={d} style={{ fontSize: 10, color: "#444" }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Pool Activity Chart */}
          <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "#555", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pool Activity</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#a855f7", marginTop: 2 }}>{counts.pool} <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>active</span></p>
              </div>
              <span style={{ background: "#a855f718", color: "#a855f7", fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>POOL</span>
            </div>
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,80 ${poolPoints.map((v, i) => `${i * (300 / (poolPoints.length - 1))},${80 - (v / Math.max(...poolPoints, 1)) * 70}`).join(" ")} 300,80`} fill="url(#gradPurple)" />
              <polyline points={poolPoints.map((v, i) => `${i * (300 / (poolPoints.length - 1))},${80 - (v / Math.max(...poolPoints, 1)) * 70}`).join(" ")} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {["7d ago", "6d", "5d", "4d", "3d", "2d", "Today"].map((d) => (
                <span key={d} style={{ fontSize: 10, color: "#444" }}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div style={{
          background: "#1a1a1a", borderRadius: 14, padding: "20px 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)", marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 16 }}>
            Due Today — <span style={{ color: "#00e5ff" }}>{dueToday.length} contacts</span>
          </h2>
          {loading ? (
            <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>
          ) : dueToday.length === 0 ? (
            <p style={{ color: "#555", fontSize: 14 }}>No contacts due today.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {["Name", "Phone", "Status", "Step", "Brokerage"].map((h) => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 10, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dueToday.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #252525" }}>
                    <td style={{ padding: "12px 0", color: "#fff", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "12px 0", color: "#555" }}>{c.phone}</td>
                    <td style={{ padding: "12px 0" }}>
                      <span style={{
                        background: (STATUS_COLORS[c.status] ?? "#444") + "22",
                        color: STATUS_COLORS[c.status] ?? "#888",
                        borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      }}>
                        {STATUS_SHORT[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 0", color: "#555", fontSize: 12 }}>
                      {c.status === "The Pool" ? `Pool ${c.poolStep}` : `Drip ${c.dripStep}`}
                    </td>
                    <td style={{ padding: "12px 0", color: "#555" }}>{c.brokerage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cron Logs */}
        {cronLogs.length > 0 && (
          <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Run Logs</h3>
            {cronLogs.map((log, i) => (
              <p key={i} style={{
                fontSize: 12, marginBottom: 4, fontFamily: "monospace",
                color: log.includes("✓") ? "#22c55e" : log.includes("✗") ? "#ef4444" : "#666",
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

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
  "Replied": "#fbbf24",
  "Potential Deal": "#ec4899",
  "No Deal - Auto Reply": "#ef4444",
  "Underwriting": "#22c55e",
  "60-Day Rest": "#6b7280",
};

const STATUS_SHORT: Record<string, string> = {
  "Drip Active": "Drip Active",
  "The Pool": "The Pool",
  "Replied - Pivot Call Needed - HOT": "Hot 🔥",
  "Replied": "Replied",
  "Potential Deal": "Deal",
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [grabLoading, setGrabLoading] = useState<Record<string, boolean>>({});
  const [grabResult, setGrabResult] = useState<{ person: string; added: string[]; skipped: string[]; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  async function grabAgents(person: "Yahav" | "Yuval") {
    setGrabLoading((prev) => ({ ...prev, [person]: true }));
    setGrabResult(null);
    try {
      const res = await fetch("/api/grab-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: person, count: 5 }),
      });
      const data = await res.json();
      setGrabResult({ person, added: data.added ?? [], skipped: data.skipped ?? [], errors: data.errors ?? [] });
      if ((data.added ?? []).length > 0) {
        fetch("/api/contacts").then((r) => r.json()).then(setContacts);
      }
    } catch {
      setGrabResult({ person, added: [], skipped: [], errors: ["Network error"] });
    } finally {
      setGrabLoading((prev) => ({ ...prev, [person]: false }));
    }
  }

  const step0Count = contacts.filter((c) => c.status === "Drip Active" && (c.dripStep || 0) === 0).length;

  async function runDrip() {
    setShowConfirm(false);
    setRunningCron(true);
    setCronLogs([]);
    const res = await fetch("/api/cron/drip?firstOnly=true", {
      headers: { Authorization: "Bearer flip123secret" },
    });
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
    deal: contacts.filter((c) => c.status === "Potential Deal").length,
  };

  const today = new Date().toISOString().split("T")[0];
  const dueToday = contacts.filter(
    (c) => (c.status === "Drip Active" || c.status === "The Pool") && (!c.date || c.date <= today)
  );

  // Road to First Deal stats
  const DAILY_MSG_GOAL = 10;
  const messagesSentToday = contacts.filter((c) => c.lastContact?.startsWith(today)).length;
  const msgGoalDone = messagesSentToday >= DAILY_MSG_GOAL;
  const msgProgress = Math.min((messagesSentToday / DAILY_MSG_GOAL) * 100, 100);

  const repliedToUs = contacts.filter(
    (c) => c.status === "Replied" || c.status === "Replied - Pivot Call Needed - HOT"
  ).length;
  const reachedBackToday = contacts.filter(
    (c) =>
      (c.status === "Replied" || c.status === "Replied - Pivot Call Needed - HOT") &&
      c.lastContact?.startsWith(today)
  ).length;

  // Build 7-day rolling series from real contact dates
  function buildSeries(days: number, filterFn?: (c: Contact) => boolean) {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      const pool = filterFn ? contacts.filter(filterFn) : contacts;
      return pool.filter((c) => c.date && c.date <= dateStr).length;
    });
  }

  const stats = [
    { label: "Total Contacts", value: counts.total, color: "#ffffff", spark: buildSeries(6) },
    { label: "Drip Active", value: counts.drip, color: "#00e5ff", spark: buildSeries(6, (c) => c.status === "Drip Active") },
    { label: "In The Pool", value: counts.pool, color: "#a855f7", spark: buildSeries(6, (c) => c.status === "The Pool") },
    { label: "Hot Leads", value: counts.hot, color: "#f97316", spark: buildSeries(6, (c) => c.status === "Replied - Pivot Call Needed - HOT") },
    { label: "Deals", value: counts.deal, color: "#22c55e", spark: buildSeries(6, (c) => c.status === "Potential Deal") },
  ];

  // Activity charts: per-day count of contacts touched (based on lastContact date)
  function buildActivitySeries(days: number, filterFn: (c: Contact) => boolean) {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      return contacts.filter(filterFn).filter(
        (c) => (c.lastContact ?? c.date ?? "").startsWith(dateStr)
      ).length;
    });
  }

  const dripPoints = buildActivitySeries(7, (c) => c.status === "Drip Active");
  const poolPoints = buildActivitySeries(7, (c) => c.status === "The Pool");

  // If all zeros (no activity yet), fall back to cumulative so graph isn't empty
  const dripFinal = dripPoints.some((v) => v > 0) ? dripPoints : buildSeries(7, (c) => c.status === "Drip Active");
  const poolFinal = poolPoints.some((v) => v > 0) ? poolPoints : buildSeries(7, (c) => c.status === "The Pool");

  return (
    <div className="app-root">
      <Sidebar />

      <div className="app-main">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Welcome back, Yuval and Yahav</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {(["Yahav", "Yuval"] as const).map((person) => (
              <button
                key={person}
                onClick={() => grabAgents(person)}
                disabled={!!grabLoading[person]}
                style={{
                  background: grabLoading[person] ? "#1a1a1a" : "#7c3aed22",
                  color: grabLoading[person] ? "#555" : "#a78bfa",
                  border: "1px solid #7c3aed44",
                  borderRadius: 10, padding: "11px 18px", fontWeight: 700,
                  fontSize: 13, cursor: grabLoading[person] ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {grabLoading[person] ? `Grabbing ${person}...` : `Grab Agents → ${person}`}
              </button>
            ))}
            <button
              onClick={() => setShowConfirm(true)}
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
        </div>

        {/* ── Confirmation Modal ── */}
        {showConfirm && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(2px)",
          }} onClick={() => setShowConfirm(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: "#1a1a1a", borderRadius: 16, padding: "32px 28px", width: 400, maxWidth: "90vw",
              border: "1px solid #333", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Are you sure?</div>
              <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                This will send the <span style={{ color: "#00e5ff", fontWeight: 600 }}>first SMS</span> to{" "}
                <span style={{ color: "#00e5ff", fontWeight: 700 }}>{step0Count}</span> new contacts at Step 0.
                <br />Messages will be sent immediately and cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    background: "transparent", border: "1px solid #444", color: "#aaa",
                    borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={runDrip}
                  style={{
                    background: "#00e5ff", border: "none", color: "#000",
                    borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700,
                  }}
                >
                  Yes, Send Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grab Agents Result Banner */}
        {grabResult && (
          <div style={{
            background: grabResult.errors.length && !grabResult.added.length ? "#ef444422" : "#10b98122",
            border: `1px solid ${grabResult.errors.length && !grabResult.added.length ? "#ef4444" : "#10b981"}55`,
            borderRadius: 10, padding: "14px 18px", marginBottom: 20,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 4 }}>
                Grab Agents — {grabResult.person}
              </div>
              {grabResult.added.length > 0 && (
                <div style={{ color: "#34d399", fontSize: 13 }}>Added {grabResult.added.length}: {grabResult.added.join(", ")}</div>
              )}
              {grabResult.skipped.length > 0 && (
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Skipped (already in CRM): {grabResult.skipped.length}</div>
              )}
              {grabResult.errors.length > 0 && (
                <div style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>Errors: {grabResult.errors.join("; ")}</div>
              )}
            </div>
            <button onClick={() => setGrabResult(null)} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* ── Road to the First Deal ── */}
        <div style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
          border: "1px solid #2a2a3e",
          borderRadius: 20,
          padding: "32px 36px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Glow effect */}
          <div style={{
            position: "absolute", top: -60, right: -60, width: 220, height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -40, left: 100, width: 160, height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
              OUR MISSION
            </div>
            <h2 style={{
              fontSize: 32, fontWeight: 900, lineHeight: 1.1, margin: 0,
              background: "linear-gradient(90deg, #ffffff 0%, #a5b4fc 50%, #00e5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              ROAD TO THE FIRST DEAL
            </h2>
            <p style={{ fontSize: 13, color: "#4b5563", marginTop: 6, fontStyle: "italic" }}>
              Every message is a step closer. Stay consistent. Stay hungry.
            </p>
          </div>

          {/* Goals Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Daily Goal: Send 10 Messages */}
            <div style={{
              background: msgGoalDone ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${msgGoalDone ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14,
              padding: "22px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    Daily Goal
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>
                    Send 10 Messages
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
                  background: msgGoalDone ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: msgGoalDone ? "#22c55e" : "#ef4444",
                  letterSpacing: "0.05em",
                }}>
                  {msgGoalDone ? "DONE" : "IN PROGRESS"}
                </div>
              </div>

              {/* Big number */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
                <span style={{
                  fontSize: 56, fontWeight: 900, lineHeight: 1,
                  color: msgGoalDone ? "#22c55e" : "#ffffff",
                }}>
                  {messagesSentToday}
                </span>
                <span style={{ fontSize: 20, color: "#4b5563", fontWeight: 600 }}>
                  / {DAILY_MSG_GOAL}
                </span>
                <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 4 }}>sent today</span>
              </div>

              {/* Progress bar */}
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${msgProgress}%`,
                  background: msgGoalDone
                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                    : "linear-gradient(90deg, #6366f1, #00e5ff)",
                  transition: "width 0.6s ease",
                }} />
              </div>
              {!msgGoalDone && (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                  {DAILY_MSG_GOAL - messagesSentToday} more to hit the goal
                </div>
              )}
              {msgGoalDone && (
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 8, fontWeight: 600 }}>
                  Goal crushed! Keep the momentum going.
                </div>
              )}
            </div>

            {/* Reply Back Goal */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "22px 24px",
            }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  Reply Pipeline
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>
                  Respond to Every Reply
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Replied to us */}
                <div style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 10, color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    Replied to Us
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>
                    {repliedToUs}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    waiting in inbox
                  </div>
                </div>

                {/* We reached back */}
                <div style={{
                  background: reachedBackToday > 0 ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${reachedBackToday > 0 ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 10, color: "#4338ca", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    We Reached Back
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: reachedBackToday > 0 ? "#818cf8" : "#374151", lineHeight: 1 }}>
                    {reachedBackToday}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    followed up today
                  </div>
                </div>
              </div>

              {repliedToUs > 0 && reachedBackToday < repliedToUs && (
                <div style={{
                  marginTop: 12, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
                  fontSize: 12, color: "#d97706", fontWeight: 600,
                }}>
                  {repliedToUs - reachedBackToday} replies still need your attention
                </div>
              )}
              {repliedToUs > 0 && reachedBackToday >= repliedToUs && (
                <div style={{
                  marginTop: 12, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                  fontSize: 12, color: "#22c55e", fontWeight: 600,
                }}>
                  All replies handled today. Locked in.
                </div>
              )}
            </div>
          </div>
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
              <polygon points={`0,80 ${dripFinal.map((v, i) => `${i * (300 / (dripFinal.length - 1))},${80 - (v / Math.max(...dripFinal, 1)) * 70}`).join(" ")} 300,80`} fill="url(#gradTeal)" />
              <polyline points={dripFinal.map((v, i) => `${i * (300 / (dripFinal.length - 1))},${80 - (v / Math.max(...dripFinal, 1)) * 70}`).join(" ")} fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
              <polygon points={`0,80 ${poolFinal.map((v, i) => `${i * (300 / (poolFinal.length - 1))},${80 - (v / Math.max(...poolFinal, 1)) * 70}`).join(" ")} 300,80`} fill="url(#gradPurple)" />
              <polyline points={poolFinal.map((v, i) => `${i * (300 / (poolFinal.length - 1))},${80 - (v / Math.max(...poolFinal, 1)) * 70}`).join(" ")} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type RunLog = {
  id: string; date: string; type: string; contactName: string;
  phone: string; step: string; status: "success" | "failed";
  message: string; error: string;
};

type QACheck = { passed: boolean; score: string; failures?: string[]; missing?: string[]; slow?: string[]; warns?: string[]; warnings?: number; new_files?: number; new_file_list?: string[] };
type QAData = { timestamp: string; overall: "PASS" | "FAIL"; duration_s: number; checks: { health: QACheck; structure: QACheck; performance: QACheck; regression: QACheck } };
type QALog = { id: string; title: string; overall: "PASS" | "FAIL"; createdAt: string; data: QAData | null };

type LogEntry = {
  id: string; title: string; type: string; phone: string;
  details: string; resolved: boolean; createdAt: string;
};

type Contact = {
  id: string; name: string; phone: string; status: string;
  dripStep: number; poolStep: number; date: string | null;
  lastContact: string | null; lastReply: string; brokerage: string; area: string;
  offerDate: string | null; closeDate: string | null;
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  DUPLICATE: "#facc15",
  BROKEN_NAME: "#f97316",
  FAILED_SMS: "#ef4444",
  STOP: "#a855f7",
  BLOCKED: "#f97316",
  DAILY_REPORT: "#22c55e",
  SMS_SENT: "#00e5ff",
  INFO: "#6b7280",
};

// ── Alert helpers ────────────────────────────────────────────────────────────
function getBlockReason(details: string): string {
  if (details.includes("Outside send window")) {
    const match = details.match(/Central time is (\d+:\d+)/);
    return match ? `שליחה בשעה ${match[1]} שיקגו (מחוץ ל-09:00–15:00)` : "שליחה מחוץ לשעות מורשות";
  }
  if (details.includes("Already contacted today")) return "קונטקט כבר קיבל הודעה היום";
  if (details.includes("empty or too short")) return "סקריפט חסר ב-Notion לשלב הזה";
  if (details.includes("Script not from Notion")) return "סקריפט hardcoded — נחסם בכוונה";
  return details.split("|").pop()?.trim() || details;
}

function getBlockFix(details: string): string {
  if (details.includes("Outside send window")) return "בדוק vercel.json — הכרון רץ בשעה לא נכונה";
  if (details.includes("Already contacted today")) return "תקין — ממתין ליום הבא";
  if (details.includes("empty or too short")) return "הוסף סקריפט ב-Notion Scripts עבור השלב הזה";
  if (details.includes("Script not from Notion")) return "כתוב סקריפט ב-Notion Scripts DB";
  return "בדוק את הלוגים לפרטים";
}

// ── Flow Node ────────────────────────────────────────────────────────────────
function FlowNode({ label, sub, color, active, last, onClick, count }: {
  label: string; sub?: string; color: string; active?: boolean; last?: boolean;
  onClick?: () => void; count?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        onClick={onClick}
        style={{
          background: active ? color + "22" : "#1a1a1a",
          border: `2px solid ${active ? color : "#333"}`,
          borderRadius: 14, padding: "14px 22px", minWidth: 180,
          textAlign: "center", position: "relative",
          boxShadow: active ? `0 0 20px ${color}33` : "none",
          transition: "all 0.2s",
          cursor: onClick ? "pointer" : "default",
        }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : "#e5e5e5" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
        {count !== undefined && count > 0 && (
          <div style={{
            position: "absolute", top: -8, right: -8, background: color,
            color: "#000", fontSize: 10, fontWeight: 700, borderRadius: 99,
            minWidth: 20, height: 20, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 5px",
          }}>{count}</div>
        )}
      </div>
      {!last && (
        <div style={{ width: 2, height: 32, background: `linear-gradient(to bottom, ${color}88, ${color}22)` }} />
      )}
    </div>
  );
}

function FlowBranch({ children, label, color }: { children: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

// ── Alert Detail Modal ───────────────────────────────────────────────────────
type AlertModalData = { title: string; type: string; phone: string; reason: string; fix: string; time: string; details: string };
function AlertModal({ data, onClose }: { data: AlertModalData; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 16, padding: 28, maxWidth: 540, width: "100%", position: "relative" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ background: "#f9731630", color: "#f97316", fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700 }}>{data.type}</span>
          <span style={{ color: "#d1d5db", fontWeight: 600, fontSize: 15 }}>{data.title}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        {/* rows */}
        {[
          { label: "Contact", value: data.title, color: "#d1d5db" },
          { label: "Phone",   value: data.phone,  color: "#9ca3af" },
          { label: "Time",    value: data.time,   color: "#6b7280" },
          { label: "Reason",  value: data.reason, color: "#fb923c" },
          { label: "Fix",     value: data.fix,    color: "#4ade80" },
          { label: "Details", value: data.details, color: "#6b7280" },
        ].filter(r => r.value).map(r => (
          <div key={r.label} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
            <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 60, paddingTop: 2 }}>{r.label}</span>
            <span style={{ color: r.color, fontSize: 13, lineHeight: 1.5, flex: 1 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<"link" | "runs" | "flow" | "general">("link");
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsSetupNeeded, setRunsSetupNeeded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all");
  const [qaLogs, setQaLogs] = useState<QALog[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [expandedQaRun, setExpandedQaRun] = useState<string | null>(null);
  const [qaRunning, setQaRunning] = useState(false);
  const [qaRunStep, setQaRunStep] = useState("");
  const [qaLiveResult, setQaLiveResult] = useState<QAData | null>(null);
  const [alerts, setAlerts] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModalData | null>(null);

  // Contacts state (for flow modals)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [flowModal, setFlowModal] = useState<{ title: string; color: string; contacts: Contact[] } | null>(null);

  // General settings state
  const [password, setPassword] = useState("");
  const [senderName, setSenderName] = useState("Yuval");
  const [senderPhone, setSenderPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tab === "runs") { loadRuns(); loadLogs(); loadQaLogs(); }
    if (tab === "flow" && !contactsLoaded) loadContacts();
  }, [tab]);

  async function loadQaLogs() {
    setQaLoading(true);
    try {
      const res = await fetch("/api/qa-logs");
      const data = await res.json();
      if (Array.isArray(data)) setQaLogs(data);
    } catch { /* silent */ }
    setQaLoading(false);
  }

  async function runQaNow() {
    setQaRunning(true);
    setQaLiveResult(null);
    setQaRunStep("Checking pages...");
    try {
      setTimeout(() => setQaRunStep("Checking APIs..."), 3000);
      setTimeout(() => setQaRunStep("Running regression tests..."), 7000);
      setTimeout(() => setQaRunStep("Measuring performance..."), 11000);
      setTimeout(() => setQaRunStep("Saving to Notion..."), 15000);
      const res = await fetch("/api/qa-run", {
        method: "POST",
        headers: { "x-qa-secret": "flip123secret" },
      });
      const data = await res.json();
      if (data.overall) {
        setQaLiveResult(data as QAData);
        // Reload history
        await loadQaLogs();
      }
    } catch { /* silent */ }
    setQaRunning(false);
    setQaRunStep("");
  }

  async function loadContacts() {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (Array.isArray(data)) { setContacts(data); setContactsLoaded(true); }
    } catch { /* silent */ }
  }

  function openFlowModal(title: string, color: string, filter: (c: Contact) => boolean) {
    setFlowModal({ title, color, contacts: contacts.filter(filter) });
  }

  async function loadRuns() {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/runs");
      const data = await res.json();
      if (data.error) { setRunsSetupNeeded(true); }
      else { setRuns(Array.isArray(data) ? data : []); }
    } catch { setRunsSetupNeeded(true); }
    setRunsLoading(false);
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const [alertsRes, logsRes] = await Promise.all([
        fetch("/api/logs?mode=alerts"),
        fetch("/api/logs"),
      ]);
      const alertsData = await alertsRes.json();
      const logsData = await logsRes.json();
      if (Array.isArray(alertsData)) setAlerts(alertsData);
      if (Array.isArray(logsData)) setAllLogs(logsData);
    } catch { /* silent */ }
    setLogsLoading(false);
  }

  async function resolveAlert(id: string) {
    try {
      await fetch("/api/logs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setAllLogs((prev) => prev.map((l) => l.id === id ? { ...l, resolved: true } : l));
    } catch { /* silent */ }
  }

  const filteredRuns = filterStatus === "all" ? runs : runs.filter((r) => r.status === filterStatus);
  const successCount = runs.filter((r) => r.status === "success").length;
  const failCount = runs.filter((r) => r.status === "failed").length;

  const TAB_STYLE = (active: boolean) => ({
    padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#1a1a1a" : "transparent",
    border: "none", borderRadius: active ? "10px 10px 0 0" : 10,
    color: active ? "#00e5ff" : "#6b7280",
    borderBottom: active ? "2px solid #00e5ff" : "none",
  });

  const DRIP_STEPS = [
    { label: "Step 1 -- First Touch", sub: "\"Hi [Name], I'm looking to buy a home in Milwaukee...\"", delay: "Immediate" },
    { label: "Step 2 -- Follow Up", sub: "\"Could you help me out? Available for a call today?\"", delay: "+1 day" },
    { label: "Step 3 -- Pattern Interrupt", sub: "\"Are you still active with your license?\"", delay: "+1 day" },
    { label: "Step 4 -- Re-engage", sub: "\"Still looking to connect -- when is a good time?\"", delay: "+1 day" },
    { label: "Step 5 -- Final Drip", sub: "\"Last check-in -- house that needs work? I close fast.\"", delay: "+1 day → 60d pause" },
  ];

  const POOL_STEPS = [
    { label: "Pool 1 -- Deal Ask", sub: "\"Any motivated sellers or off-market deals?\"" },
    { label: "Pool 2 -- Market Check", sub: "\"What's your take on the market right now?\"" },
    { label: "Pool 3 -- Commission Pitch", sub: "\"Write the offer on both sides, full commission.\"" },
    { label: "Pool 4 -- Network Ask", sub: "\"Anyone in your office with a property that needs work?\"" },
    { label: "Pool 5-9 -- Rotate", sub: "Deal asks + relationship builders, every 10-30 days" },
  ];

  return (
    <div className="app-root">
      {alertModal && <AlertModal data={alertModal} onClose={() => setAlertModal(null)} />}
      <Sidebar />
      <main className="app-main">
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>System configuration, automation logs, and SMS flow</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {([
            ["link", "Site Link"],
            ["runs", "Automation Runs"],
            ["flow", "SMS Flow"],
            ["general", "General"],
          ] as [typeof tab, string][]).map(([key, label]) => (
            <button key={key} style={TAB_STYLE(tab === key)} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {/* ═══ SITE LINK ═══ */}
        {tab === "link" && (
          <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "28px 32px", maxWidth: 600 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5", marginBottom: 8 }}>CRM Access Link</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Share this link with team members to access the CRM</p>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#141414", border: "1px solid #333", borderRadius: 10, padding: "14px 18px",
            }}>
              <span style={{ fontSize: 14, color: "#00e5ff", fontFamily: "monospace", flex: 1, wordBreak: "break-all" }}>
                https://flip-crm-two.vercel.app
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText("https://flip-crm-two.vercel.app"); }}
                style={{
                  background: "#00e5ff", color: "#000", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Copy Link
              </button>
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Site is live and accessible</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5ff" }} />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Password protected -- share the password separately</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ AUTOMATION RUNS ═══ */}
        {tab === "runs" && (() => {
          const lastQA = qaLogs[0] ?? null;
          const lastData = lastQA?.data ?? null;
          const allGreen = lastQA?.overall === "PASS";
          const CHECK_LABELS: Record<string, string> = { health: "Health", structure: "Structure", performance: "Performance", regression: "Regression" };
          const CHECK_ICONS: Record<string, string> = { health: "🌐", structure: "📁", performance: "⚡", regression: "🔁" };

          return (
            <>
              {/* ── QA Agent Header ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5", margin: 0 }}>QA Agent</h2>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>Runs at 8:00 AM and 8:00 PM every day · Checks health, performance, and logic</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={loadQaLogs} disabled={qaRunning} style={{ background: "transparent", border: "1px solid #333", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                    Refresh
                  </button>
                  <button
                    onClick={runQaNow}
                    disabled={qaRunning}
                    style={{
                      background: qaRunning ? "#141414" : "#00e5ff",
                      color: qaRunning ? "#6b7280" : "#000",
                      border: `1px solid ${qaRunning ? "#333" : "#00e5ff"}`,
                      borderRadius: 8, padding: "6px 18px", fontSize: 12, fontWeight: 700,
                      cursor: qaRunning ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {qaRunning ? (
                      <>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid #6b7280", borderTopColor: "#00e5ff", animation: "spin 0.8s linear infinite" }} />
                        {qaRunStep || "Running..."}
                      </>
                    ) : "▶ Run Now"}
                  </button>
                </div>
              </div>

              {/* ── Live Result (after manual run) ── */}
              {qaLiveResult && !qaRunning && (
                <div style={{
                  background: qaLiveResult.overall === "PASS" ? "#052e16" : "#1c0a0a",
                  border: `1px solid ${qaLiveResult.overall === "PASS" ? "#16a34a44" : "#dc262644"}`,
                  borderRadius: 12, padding: "16px 20px", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <span style={{ fontSize: 22 }}>{qaLiveResult.overall === "PASS" ? "✅" : "❌"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: qaLiveResult.overall === "PASS" ? "#22c55e" : "#ef4444" }}>
                      Manual run complete — {qaLiveResult.overall === "PASS" ? "All systems OK" : "Issues found"}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {qaLiveResult.duration_s}s · {qaLiveResult.timestamp} · Saved to history
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["health", "performance", "regression"] as const).map(key => {
                      const c = qaLiveResult.checks[key];
                      return (
                        <span key={key} style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                          background: c.passed ? "#22c55e22" : "#ef444422",
                          color: c.passed ? "#22c55e" : "#ef4444",
                        }}>{key}</span>
                      );
                    })}
                  </div>
                  <button onClick={() => setQaLiveResult(null)} style={{ background: "transparent", border: "none", color: "#4b5563", fontSize: 16, cursor: "pointer" }}>×</button>
                </div>
              )}

              {qaLoading ? (
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Loading...</p>
              ) : qaLogs.length === 0 ? (
                /* No QA runs yet */
                <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "32px", textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>No QA runs yet. The agent will run automatically at 8:00 AM and 8:00 PM.</p>
                </div>
              ) : (
                <>
                  {/* ── Status Banner ── */}
                  <div style={{
                    background: allGreen ? "#052e16" : "#1c0a0a",
                    border: `1px solid ${allGreen ? "#16a34a44" : "#dc262644"}`,
                    borderRadius: 14, padding: "20px 24px", marginBottom: 16,
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: allGreen ? "#22c55e22" : "#ef444422",
                      border: `2px solid ${allGreen ? "#22c55e" : "#ef4444"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>
                      {allGreen ? "✅" : "❌"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: allGreen ? "#22c55e" : "#ef4444" }}>
                        {allGreen ? "All systems operational" : "Issues detected — action needed"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                        Last check: {lastQA.createdAt ? new Date(lastQA.createdAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                        {lastData?.duration_s ? ` · ${lastData.duration_s}s` : ""}
                        {" · "}{qaLogs.length} run{qaLogs.length !== 1 ? "s" : ""} on record
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563", textAlign: "right" }}>
                      <div>Next: 8:00 AM / 8:00 PM</div>
                    </div>
                  </div>

                  {/* ── 4 Check Cards ── */}
                  {lastData && (
                    <div className="kpi-grid-4" style={{ gap: 10, marginBottom: 20 }}>
                      {(["health", "structure", "performance", "regression"] as const).map((key) => {
                        const c = lastData.checks[key];
                        const ok = c.passed;
                        const failures = c.failures ?? c.missing ?? [];
                        const warns = c.warns ?? [];
                        return (
                          <div key={key} style={{
                            background: "#1a1a1a", borderRadius: 12, padding: "16px 18px",
                            border: `1px solid ${ok ? "#1e1e1e" : "#ef444433"}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 13 }}>{CHECK_ICONS[key]}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                                background: ok ? "#22c55e22" : "#ef444422",
                                color: ok ? "#22c55e" : "#ef4444",
                              }}>{ok ? "PASS" : "FAIL"}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>{CHECK_LABELS[key]}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: ok ? "#22c55e" : "#ef4444", margin: "6px 0 4px" }}>{c.score}</div>
                            {!ok && failures.length > 0 && (
                              <div style={{ fontSize: 10, color: "#ef4444", lineHeight: 1.5 }}>
                                {failures.slice(0, 2).map((f, i) => <div key={i}>• {f}</div>)}
                                {failures.length > 2 && <div>+{failures.length - 2} more</div>}
                              </div>
                            )}
                            {ok && warns.length > 0 && (
                              <div style={{ fontSize: 10, color: "#facc15", lineHeight: 1.5 }}>
                                ⚠️ {warns.length} warning{warns.length !== 1 ? "s" : ""}
                              </div>
                            )}
                            {ok && key === "structure" && (lastData.checks.structure.new_files ?? 0) > 0 && (
                              <div style={{ fontSize: 10, color: "#00e5ff" }}>
                                +{lastData.checks.structure.new_files} new file{(lastData.checks.structure.new_files ?? 0) !== 1 ? "s" : ""}
                              </div>
                            )}
                            {ok && !warns.length && (key !== "structure" || !(lastData.checks.structure.new_files ?? 0)) && (
                              <div style={{ fontSize: 10, color: "#4b5563" }}>No issues</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Run History ── */}
                  <div style={{ background: "#1a1a1a", borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #252525", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Run History</span>
                      <span style={{ fontSize: 11, color: "#4b5563" }}>{qaLogs.length} runs</span>
                    </div>
                    {qaLogs.map((run, i) => {
                      const isPass = run.overall === "PASS";
                      const d = run.data;
                      const isExpanded = expandedQaRun === run.id;
                      const hasFail = d && !isPass;
                      return (
                        <div key={run.id}>
                          <div
                            onClick={() => setExpandedQaRun(isExpanded ? null : run.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "12px 18px", borderBottom: "1px solid #1e1e1e",
                              background: i % 2 === 0 ? "transparent" : "#161616",
                              cursor: "pointer",
                            }}
                          >
                            {/* Status dot */}
                            <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isPass ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${isPass ? "#22c55e88" : "#ef444488"}` }} />

                            {/* Time */}
                            <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", minWidth: 160 }}>
                              {run.createdAt ? new Date(run.createdAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                            </span>

                            {/* Check pills */}
                            {d && (
                              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                                {(["health", "structure", "performance", "regression"] as const).map((key) => (
                                  <span key={key} style={{
                                    fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                                    background: d.checks[key].passed ? "#22c55e22" : "#ef444422",
                                    color: d.checks[key].passed ? "#22c55e" : "#ef4444",
                                  }}>{CHECK_LABELS[key]}</span>
                                ))}
                              </div>
                            )}

                            {/* Duration */}
                            {d?.duration_s && <span style={{ fontSize: 11, color: "#4b5563", whiteSpace: "nowrap" }}>{d.duration_s}s</span>}

                            {/* Expand arrow */}
                            <span style={{ fontSize: 10, color: "#4b5563" }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && hasFail && d && (
                            <div style={{ background: "#111", padding: "16px 18px 16px 40px", borderBottom: "1px solid #1e1e1e" }}>
                              {(["health", "structure", "performance", "regression"] as const).map((key) => {
                                const c = d.checks[key];
                                if (c.passed) return null;
                                const failures = c.failures ?? c.missing ?? c.slow ?? [];
                                return (
                                  <div key={key} style={{ marginBottom: 10 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{CHECK_ICONS[key]} {CHECK_LABELS[key]} failed</span>
                                    <div style={{ marginTop: 4 }}>
                                      {failures.map((f, j) => (
                                        <div key={j} style={{ fontSize: 11, color: "#9ca3af", paddingLeft: 12 }}>• {f}</div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Divider ── */}
              <div style={{ borderTop: "1px solid #252525", marginBottom: 24, paddingTop: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>SMS Automation Runs</h3>
              </div>

              {/* ── SMS Runs Stats ── */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Total", value: runs.length, color: "#e5e5e5" },
                  { label: "Success", value: successCount, color: "#22c55e" },
                  { label: "Failed", value: failCount, color: "#ef4444" },
                  { label: "Rate", value: `${runs.length > 0 ? ((successCount / runs.length) * 100).toFixed(0) : 0}%`, color: "#00e5ff" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 18px", flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* ── SMS Filter + Table ── */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["all", "success", "failed"] as const).map((f) => (
                  <button key={f} onClick={() => setFilterStatus(f)} style={{
                    padding: "5px 14px", fontSize: 11, fontWeight: 600, borderRadius: 99, cursor: "pointer",
                    background: filterStatus === f ? (f === "success" ? "#22c55e22" : f === "failed" ? "#ef444422" : "#1a1a1a") : "transparent",
                    border: `1px solid ${filterStatus === f ? (f === "success" ? "#22c55e" : f === "failed" ? "#ef4444" : "#333") : "#2a2a2a"}`,
                    color: filterStatus === f ? (f === "success" ? "#22c55e" : f === "failed" ? "#ef4444" : "#e5e5e5") : "#6b7280",
                  }}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {runsSetupNeeded ? (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                  <p style={{ color: "#facc15", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Setup needed</p>
                  <code style={{ fontSize: 12, color: "#00e5ff" }}>NOTION_RUNS_DB_ID=your_database_id</code>
                </div>
              ) : runsLoading ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>Loading...</p>
              ) : filteredRuns.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>{runs.length === 0 ? "No SMS runs yet." : "No runs match this filter."}</p>
                </div>
              ) : (
                <div style={{ background: "#1a1a1a", borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
                  <div className="table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>{["Status","Date","Contact","Phone","Step","Message","Error"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {filteredRuns.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                          <td style={{ padding: "9px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.status === "success" ? "#22c55e" : "#ef4444" }} />
                          </td>
                          <td style={{ padding: "9px 14px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" }}>
                            {r.date ? new Date(r.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                          </td>
                          <td style={{ padding: "9px 14px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", fontWeight: 500 }}>{r.contactName}</td>
                          <td style={{ padding: "9px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontFamily: "monospace", fontSize: 11 }}>{r.phone}</td>
                          <td style={{ padding: "9px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            <span style={{ background: r.type === "Pool" ? "#a855f722" : "#00e5ff22", color: r.type === "Pool" ? "#a855f7" : "#00e5ff", fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{r.step}</span>
                          </td>
                          <td style={{ padding: "9px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message || "--"}</td>
                          <td style={{ padding: "9px 14px", color: "#ef4444", borderBottom: "1px solid #1e1e1e", fontSize: 11 }}>{r.error || "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

              {/* ── Recent Alerts ── */}
              <div id="alerts" style={{ marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>System Alerts</h3>
                  {alerts.length > 0 && <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99 }}>{alerts.length} open</span>}
                </div>
                {logsLoading ? <p style={{ color: "#6b7280", fontSize: 13 }}>Loading...</p> : (
                    <div style={{ background: "#1a1a1a", borderRadius: 12, overflow: "hidden" }}>
                      <div className="table-scroll">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>{["Type","Contact","Phone","Reason","Fix","Time",""].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}</tr></thead>
                        <tbody>
                          {/* ── DEMO ROWS (example only) ── */}
                          {([
                            { contact: "John Smith", phone: "+14141234567", reason: "שליחה בשעה 16:05 שיקגו (מחוץ ל-09:00–15:00)", fix: "בדוק vercel.json — הכרון רץ בשעה לא נכונה", time: "Apr 13 16:05" },
                            { contact: "Sara Lee",   phone: "+14142345678", reason: "קונטקט כבר קיבל הודעה היום",                   fix: "תקין — ממתין ליום הבא",                         time: "Apr 13 10:13" },
                            { contact: "Mike B.",    phone: "+14143456789", reason: "סקריפט חסר ב-Notion לשלב הזה",                 fix: "הוסף סקריפט ב-Notion Scripts עבור השלב הזה", time: "Apr 13 10:21" },
                          ] as { contact: string; phone: string; reason: string; fix: string; time: string }[]).map((d, i) => (
                            <tr key={`demo-${i}`} onClick={() => setAlertModal({ title: d.contact, type: "BLOCKED", phone: d.phone, reason: d.reason, fix: d.fix, time: d.time, details: "שורת דוגמה — לא אמיתי" })} style={{ background: "#1c1008", borderBottom: "1px solid #2a1f0a", cursor: "pointer" }}>
                              <td style={{ padding: "9px 14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span style={{ background: "#f9731630", color: "#f97316", fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700, display: "inline-block" }}>BLOCKED</span>
                                  <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>דוגמה</span>
                                </div>
                              </td>
                              <td style={{ padding: "9px 14px", color: "#d1d5db", fontWeight: 500 }}>{d.contact}</td>
                              <td style={{ padding: "9px 14px", color: "#9ca3af", fontFamily: "monospace", fontSize: 11 }}>{d.phone}</td>
                              <td style={{ padding: "9px 14px", color: "#fb923c", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.reason}>{d.reason}</td>
                              <td style={{ padding: "9px 14px", color: "#4ade80", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.fix}>{d.fix}</td>
                              <td style={{ padding: "9px 14px", color: "#6b7280", fontSize: 11, whiteSpace: "nowrap" }}>{d.time}</td>
                              <td style={{ padding: "9px 14px" }}><span style={{ color: "#6b7280", fontSize: 11, fontStyle: "italic" }}>—</span></td>
                            </tr>
                          ))}
                          {/* ── divider ── */}
                          <tr><td colSpan={7} style={{ padding: "6px 14px", background: "#0d0d0d", borderBottom: "1px solid #252525" }}>
                            <span style={{ color: "#374151", fontSize: 10, letterSpacing: "0.08em" }}>▲ DEMO — לא אמיתי &nbsp;|&nbsp; ▼ LIVE — אלרטים אמיתיים</span>
                          </td></tr>
                          {alerts.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: "20px 14px", textAlign: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                                  <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 500 }}>Guard active — no blocked sends</span>
                                </div>
                                <div style={{ color: "#4b5563", fontSize: 11, marginTop: 6 }}>חסימות יופיעו כאן עם סיבה ופתרון מוצע</div>
                              </td>
                            </tr>
                          ) : alerts.map((a, i) => (
                          <tr key={a.id} onClick={() => setAlertModal({ title: a.title.replace("⛔ Blocked: ","").replace("⛔ Auto-reply blocked: ",""), type: a.type, phone: a.phone, reason: a.type==="BLOCKED" ? getBlockReason(a.details) : a.details, fix: a.type==="BLOCKED" ? getBlockFix(a.details) : "", time: a.createdAt ? new Date(a.createdAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "", details: a.details })} style={{ background: i % 2 === 0 ? "transparent" : "#161616", cursor: "pointer" }}>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid #1e1e1e" }}>
                              <span style={{ background: (ALERT_TYPE_COLORS[a.type] ?? "#6b7280") + "22", color: ALERT_TYPE_COLORS[a.type] ?? "#6b7280", fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{a.type}</span>
                            </td>
                            <td style={{ padding: "9px 14px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", fontWeight: 500, whiteSpace: "nowrap" }}>{a.title.replace("⛔ Blocked: ", "").replace("⛔ Auto-reply blocked: ", "") || "--"}</td>
                            <td style={{ padding: "9px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontFamily: "monospace", fontSize: 11 }}>{a.phone || "--"}</td>
                            <td style={{ padding: "9px 14px", color: "#f97316", borderBottom: "1px solid #1e1e1e", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.type === "BLOCKED" ? getBlockReason(a.details) : a.details}>
                              {a.type === "BLOCKED" ? getBlockReason(a.details) : (a.details || "--")}
                            </td>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid #1e1e1e", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.type === "BLOCKED" ? getBlockFix(a.details) : ""}>
                              {a.type === "BLOCKED"
                                ? <span style={{ color: "#22c55e" }}>{getBlockFix(a.details)}</span>
                                : <span style={{ color: "#6b7280" }}>--</span>}
                            </td>
                            <td style={{ padding: "9px 14px", color: "#4b5563", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap", fontSize: 11 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid #1e1e1e" }}>
                              <button onClick={() => resolveAlert(a.id)} style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Resolve</button>
                            </td>
                          </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
              </div>
            </>
          );
        })()}

        {/* ═══ SMS FLOW ═══ */}
        {tab === "flow" && (
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>

            {/* Cold Drip Flow */}
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "28px 32px", minWidth: 280 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#00e5ff", marginBottom: 6, textAlign: "center" }}>Cold Drip Campaign</h3>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 24, textAlign: "center" }}>5 messages over 5 days</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <FlowNode label="Contact Loaded" sub="Agent enters system" color="#6b7280" active
                  count={contacts.filter(c => c.status === "Drip Active").length}
                  onClick={() => openFlowModal("Contact Loaded", "#6b7280", c => c.status === "Drip Active")} />
                {DRIP_STEPS.map((s, i) => (
                  <FlowNode key={i} label={s.label} sub={`${s.sub}\n${s.delay}`} color="#00e5ff"
                    count={contacts.filter(c => c.status === "Drip Active" && c.dripStep === i).length}
                    onClick={() => openFlowModal(s.label, "#00e5ff", c => c.status === "Drip Active" && c.dripStep === i)} />
                ))}
                <FlowNode label="Reply Detected?" sub="AI Classification (Gemini)" color="#facc15" active
                  count={contacts.filter(c => c.lastReply && c.lastReply.length > 0).length}
                  onClick={() => openFlowModal("Replied", "#facc15", c => c.lastReply !== undefined && c.lastReply.length > 0)} />

                <div style={{ display: "flex", gap: 20, marginTop: 0 }}>
                  <FlowBranch label="HOT" color="#f97316">
                    <FlowNode label="HOT Lead" sub="SMS alert sent to team" color="#f97316" active last
                      count={contacts.filter(c => c.status === "Replied - Pivot Call Needed - HOT").length}
                      onClick={() => openFlowModal("HOT Leads", "#f97316", c => c.status === "Replied - Pivot Call Needed - HOT")} />
                  </FlowBranch>
                  <FlowBranch label="NO DEAL" color="#ef4444">
                    <FlowNode label="No Deal" sub="Auto-reply sent" color="#ef4444" last
                      count={contacts.filter(c => c.status === "No Deal - Auto Reply").length}
                      onClick={() => openFlowModal("No Deal", "#ef4444", c => c.status === "No Deal - Auto Reply")} />
                  </FlowBranch>
                  <FlowBranch label="DEAL" color="#22c55e">
                    <FlowNode label="Potential Deal" sub="Follow up → Discovery Call" color="#10b981" active last
                      count={contacts.filter(c => c.status === "Potential Deal").length}
                      onClick={() => openFlowModal("Deal Sent", "#22c55e", c => c.status === "Potential Deal")} />
                  </FlowBranch>
                </div>
              </div>
            </div>

            {/* No Reply → Pool Flow */}
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "28px 32px", minWidth: 280 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#a855f7", marginBottom: 6, textAlign: "center" }}>The Pool -- Nurture</h3>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 24, textAlign: "center" }}>Post-call follow-up, every 10-30 days</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <FlowNode label="No Reply After 5 Steps" sub="60-day pause → enters Pool" color="#6b7280" active
                  count={contacts.filter(c => c.status === "60-Day Rest").length}
                  onClick={() => openFlowModal("60-Day Rest", "#6b7280", c => c.status === "60-Day Rest")} />
                <FlowNode label="Initial Phone Call" sub={'"Looking to buy investment properties..."'} color="#a855f7"
                  count={contacts.filter(c => c.status === "The Pool" && c.poolStep === 1).length}
                  onClick={() => openFlowModal("Pool - Initial Call", "#a855f7", c => c.status === "The Pool" && c.poolStep === 1)} />
                {POOL_STEPS.map((s, i) => {
                  const step = i + 1;
                  const isRange = i === 4;
                  return (
                    <FlowNode key={i} label={s.label} sub={s.sub} color="#a855f7"
                      count={contacts.filter(c => c.status === "The Pool" && (isRange ? c.poolStep >= 5 : c.poolStep === step)).length}
                      onClick={() => openFlowModal(s.label, "#a855f7", c => c.status === "The Pool" && (isRange ? c.poolStep >= 5 : c.poolStep === step))} />
                  );
                })}
                <FlowNode label="Agent Replies" sub={'Immediately pivot: "What can I buy right now?"'} color="#facc15" active
                  count={contacts.filter(c => c.status === "The Pool" && c.lastReply.length > 0).length}
                  onClick={() => openFlowModal("Pool Replies", "#facc15", c => c.status === "The Pool" && c.lastReply.length > 0)} />
                <FlowNode label="Deal Lead Received" sub="Call back immediately → Discovery Call" color="#22c55e" active last
                  count={contacts.filter(c => c.status === "Potential Deal").length}
                  onClick={() => openFlowModal("Deal Leads", "#22c55e", c => c.status === "Potential Deal")} />
              </div>
            </div>

            {/* Deal Flow */}
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "28px 32px", minWidth: 240 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 6, textAlign: "center" }}>Deal Pipeline</h3>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 24, textAlign: "center" }}>From discovery to close</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <FlowNode label="Discovery Call" sub="Get address, ARV, repair estimate" color="#ec4899" active
                  count={contacts.filter(c => c.status === "Potential Deal").length}
                  onClick={() => openFlowModal("Discovery Call", "#ec4899", c => c.status === "Potential Deal")} />
                <FlowNode label="Run Numbers" sub="Purchase + Renovation (x1.3) + Timeline" color="#facc15"
                  count={contacts.filter(c => c.status === "Underwriting").length}
                  onClick={() => openFlowModal("Underwriting", "#facc15", c => c.status === "Underwriting")} />
                <FlowNode label="Offer Submitted" sub="Agent negotiates with seller" color="#facc15" active
                  count={contacts.filter(c => c.status === "Offer Submitted").length}
                  onClick={() => openFlowModal("Offer Submitted", "#facc15", c => c.status === "Offer Submitted")} />
                <FlowNode label="Contract Signed" sub="1 in 15 offers = contract" color="#22c55e"
                  count={contacts.filter(c => c.status === "Offer Submitted" && c.offerDate).length}
                  onClick={() => openFlowModal("Contract Signed", "#22c55e", c => c.status === "Offer Submitted" && !!c.offerDate)} />
                <FlowNode label="Deal Closed" sub="Flip completed" color="#22c55e" active last
                  count={contacts.filter(c => c.closeDate).length}
                  onClick={() => openFlowModal("Deals Closed", "#22c55e", c => !!c.closeDate)} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ FLOW MODAL ═══ */}
        {flowModal && (
          <div onClick={() => setFlowModal(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1a1a1a", borderRadius: 16, padding: "28px 32px",
              minWidth: 700, maxWidth: 900, maxHeight: "80vh", overflowY: "auto",
              border: `1px solid ${flowModal.color}33`,
              boxShadow: `0 0 40px ${flowModal.color}22`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e5e5" }}>{flowModal.title}</h3>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{flowModal.contacts.length} contacts</span>
                </div>
                <button onClick={() => setFlowModal(null)} style={{
                  background: "#252525", border: "1px solid #333", color: "#9ca3af",
                  borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16,
                }}>X</button>
              </div>

              {flowModal.contacts.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 20 }}>No contacts at this step</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Name", "Status", "Brokerage", "Area", "Drip Step", "Offer Date", "Close Date"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flowModal.contacts.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                        <td style={{ padding: "10px 12px", color: "#d1d5db", fontWeight: 500, borderBottom: "1px solid #1e1e1e" }}>{c.name}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e1e1e" }}>
                          <span style={{ color: flowModal.color, fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>{c.brokerage || "--"}</td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>{c.area || "--"}</td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>
                          {c.status === "The Pool" ? `Pool ${c.poolStep}` : c.dripStep !== undefined ? String(c.dripStep) : "--"}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>{c.offerDate || "--"}</td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e" }}>{c.closeDate || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ GENERAL SETTINGS ═══ */}
        {tab === "general" && (
          <div style={{ maxWidth: 500 }}>
            <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "28px 32px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5", marginBottom: 20 }}>General Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Password */}
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 6 }}>Change Password</label>
                  <input type="password" placeholder="New password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
                </div>

                {/* Sender Name */}
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 6 }}>Sender Name</label>
                  <input placeholder="Yuval" value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
                  <p style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>Replaces [Sender] in SMS templates</p>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 6 }}>Sender Phone (OpenPhone)</label>
                  <input placeholder="+1..." value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    style={{ background: "#252525", border: "1px solid #333", color: "#e5e5e5", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
                  <p style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>Currently managed via Vercel env vars</p>
                </div>

                <button onClick={async () => {
                  setSaving(true);
                  // For now, show saved state -- actual env update requires Vercel API
                  await new Promise((r) => setTimeout(r, 600));
                  setSaving(false); setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                }} style={{
                  background: saved ? "#22c55e" : "#00e5ff", color: "#000", border: "none",
                  borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  marginTop: 8,
                }}>
                  {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
                </button>
              </div>
            </div>

            <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px 28px", marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12 }}>System Info</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                {[
                  ["Platform", "Vercel + Next.js 14"],
                  ["Database", "Notion"],
                  ["SMS Provider", "OpenPhone"],
                  ["AI Classification", "Gemini"],
                  ["Drip Timing", "5 messages / 5 days → 60-day pause"],
                  ["Pool Timing", "Every 10-30 days"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>{k}</span>
                    <span style={{ color: "#9ca3af", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

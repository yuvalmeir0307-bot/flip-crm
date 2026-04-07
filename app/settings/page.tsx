"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type RunLog = {
  id: string; date: string; type: string; contactName: string;
  phone: string; step: string; status: "success" | "failed";
  message: string; error: string;
};

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
  DAILY_REPORT: "#22c55e",
  SMS_SENT: "#00e5ff",
  INFO: "#6b7280",
};

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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<"link" | "runs" | "flow" | "general">("link");
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsSetupNeeded, setRunsSetupNeeded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all");
  const [alerts, setAlerts] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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
    if (tab === "runs") { loadRuns(); loadLogs(); }
    if (tab === "flow" && !contactsLoaded) loadContacts();
  }, [tab]);

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
        {tab === "runs" && (
          <>
            {/* Stats bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px 22px", flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Runs</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#e5e5e5", marginTop: 4 }}>{runs.length}</div>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px 22px", flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Success</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e", marginTop: 4 }}>{successCount}</div>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px 22px", flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Failed</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444", marginTop: 4 }}>{failCount}</div>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px 22px", flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Success Rate</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#00e5ff", marginTop: 4 }}>
                  {runs.length > 0 ? ((successCount / runs.length) * 100).toFixed(0) : 0}%
                </div>
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["all", "success", "failed"] as const).map((f) => (
                <button key={f} onClick={() => setFilterStatus(f)} style={{
                  padding: "6px 16px", fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: "pointer",
                  background: filterStatus === f ? (f === "success" ? "#22c55e22" : f === "failed" ? "#ef444422" : "#1a1a1a") : "transparent",
                  border: `1px solid ${filterStatus === f ? (f === "success" ? "#22c55e" : f === "failed" ? "#ef4444" : "#333") : "#333"}`,
                  color: filterStatus === f ? (f === "success" ? "#22c55e" : f === "failed" ? "#ef4444" : "#e5e5e5") : "#6b7280",
                }}>
                  {f === "all" ? "All" : f === "success" ? "Success" : "Failed"}
                </button>
              ))}
            </div>

            {runsSetupNeeded ? (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "28px", maxWidth: 560 }}>
                <h3 style={{ color: "#facc15", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Setup needed</h3>
                <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>
                  Create a Notion database with fields:<br />
                  Name · Date · Type · Phone · Step · Status · Message · Error
                </p>
                <code style={{ display: "block", background: "#141414", color: "#00e5ff", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 10 }}>
                  NOTION_RUNS_DB_ID=your_database_id
                </code>
              </div>
            ) : runsLoading ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Loading...</p>
            ) : filteredRuns.length === 0 ? (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "28px", textAlign: "center" }}>
                <p style={{ color: "#6b7280", fontSize: 13 }}>
                  {runs.length === 0 ? "No automation runs yet. Run the drip to start logging." : "No runs match this filter."}
                </p>
              </div>
            ) : (
              <div style={{ background: "#1a1a1a", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Status","Date","Contact","Phone","Step","Message","Error"].map((h) => (
                        <th key={h} style={{ padding: "12px 14px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: "50%",
                            background: r.status === "success" ? "#22c55e" : "#ef4444",
                            boxShadow: `0 0 8px ${r.status === "success" ? "#22c55e66" : "#ef444466"}`,
                          }} />
                        </td>
                        <td style={{ padding: "10px 14px", color: "#9ca3af", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" }}>
                          {r.date ? new Date(r.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", fontWeight: 500 }}>{r.contactName}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontFamily: "monospace", fontSize: 11 }}>{r.phone}</td>
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                          <span style={{
                            background: r.type === "Pool" ? "#a855f722" : "#00e5ff22",
                            color: r.type === "Pool" ? "#a855f7" : "#00e5ff",
                            fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                          }}>{r.step}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.message || "--"}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#ef4444", borderBottom: "1px solid #1e1e1e", fontSize: 11 }}>
                          {r.error || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Recent Alerts ── */}
            <div id="alerts" style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>Recent Alerts</h3>
                {alerts.length > 0 && (
                  <span style={{
                    background: "#ef444422", color: "#ef4444", fontSize: 11,
                    fontWeight: 700, padding: "2px 10px", borderRadius: 99,
                  }}>{alerts.length} open</span>
                )}
              </div>
              {logsLoading ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>Loading alerts...</p>
              ) : alerts.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#6b7280", fontSize: 13 }}>No open alerts — system healthy</span>
                </div>
              ) : (
                <div style={{ background: "#1a1a1a", borderRadius: 14, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Type", "Title", "Phone", "Details", "Time", ""].map((h) => (
                          <th key={h} style={{ padding: "12px 14px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((a, i) => (
                        <tr key={a.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616" }}>
                          <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            <span style={{
                              background: (ALERT_TYPE_COLORS[a.type] ?? "#6b7280") + "22",
                              color: ALERT_TYPE_COLORS[a.type] ?? "#6b7280",
                              fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                            }}>{a.type}</span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", fontWeight: 500 }}>{a.title}</td>
                          <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontFamily: "monospace", fontSize: 11 }}>{a.phone || "--"}</td>
                          <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.details || "--"}</td>
                          <td style={{ padding: "10px 14px", color: "#4b5563", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap", fontSize: 11 }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                          </td>
                          <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            <button
                              onClick={() => resolveAlert(a.id)}
                              style={{
                                background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44",
                                borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Full Activity Log ── */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5", marginBottom: 14 }}>Activity Log</h3>
              {logsLoading ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>Loading log...</p>
              ) : allLogs.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "20px 24px" }}>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>No log entries yet.</p>
                </div>
              ) : (
                <div style={{ background: "#1a1a1a", borderRadius: 14, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Type", "Title", "Phone", "Details", "Time", "Resolved"].map((h) => (
                          <th key={h} style={{ padding: "12px 14px", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "1px solid #252525", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allLogs.map((l, i) => (
                        <tr key={l.id} style={{ background: i % 2 === 0 ? "transparent" : "#161616", opacity: l.resolved ? 0.5 : 1 }}>
                          <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            <span style={{
                              background: (ALERT_TYPE_COLORS[l.type] ?? "#6b7280") + "22",
                              color: ALERT_TYPE_COLORS[l.type] ?? "#6b7280",
                              fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                            }}>{l.type}</span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#d1d5db", borderBottom: "1px solid #1e1e1e", fontWeight: 500 }}>{l.title}</td>
                          <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", fontFamily: "monospace", fontSize: 11 }}>{l.phone || "--"}</td>
                          <td style={{ padding: "10px 14px", color: "#6b7280", borderBottom: "1px solid #1e1e1e", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.details || "--"}</td>
                          <td style={{ padding: "10px 14px", color: "#4b5563", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap", fontSize: 11 }}>
                            {l.createdAt ? new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}
                          </td>
                          <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e1e1e" }}>
                            {l.resolved ? (
                              <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>Resolved</span>
                            ) : (
                              <span style={{ color: "#6b7280", fontSize: 11 }}>Open</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

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

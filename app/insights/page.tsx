"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string;
  status: string;
  dripStep: number;
  poolStep: number;
  lastReply: string;
  lastContact: string | null;
  assignedTo?: string;
};

type Period = "day" | "week" | "month" | "quarter" | "year" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "year", label: "Yearly" },
  { key: "all", label: "All Time" },
];

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(now);
  if (period === "week") d.setDate(d.getDate() - 6);
  else if (period === "month") d.setDate(d.getDate() - 29);
  else if (period === "quarter") d.setDate(d.getDate() - 89);
  else if (period === "year") d.setFullYear(d.getFullYear() - 1);
  else return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterByPeriod(contacts: Contact[], period: Period): Contact[] {
  const start = getPeriodStart(period);
  if (!start) return contacts;
  return contacts.filter((c) => c.lastContact && new Date(c.lastContact) >= start);
}

const REPLIED_STATUSES = [
  "Replied - Pivot Call Needed - HOT",
  "Replied",
  "Potential Deal",
  "No Deal - Auto Reply",
  "Underwriting",
];

const QUALIFIED_STATUSES = [
  "The Pool",
  "Replied - Pivot Call Needed - HOT",
  "Potential Deal",
  "Offer Submitted",
  "Underwriting",
];

function isReplied(c: Contact) {
  return (c.lastReply && c.lastReply.trim() !== "") || REPLIED_STATUSES.includes(c.status);
}

const TEAM_MEMBERS = ["Yahav", "Yuval"] as const;
type TeamMember = typeof TEAM_MEMBERS[number];
const MEMBER_COLORS: Record<TeamMember, string> = { Yahav: "#00e5ff", Yuval: "#f97316" };

function getMemberContacts(contacts: Contact[], member: TeamMember) {
  return contacts.filter((c) => c.assignedTo === member || c.assignedTo === "Both");
}

// Bar chart for reply stage breakdown
function StageBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
      {data.map((item) => (
        <div
          key={item.label}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
          <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${Math.max((item.value / max) * 80, item.value > 0 ? 4 : 0)}px`,
                background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}88 100%)`,
                borderRadius: "5px 5px 0 0",
                transition: "height 0.4s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: "#555", textAlign: "center", whiteSpace: "nowrap" }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  onClick,
  clickable,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1a1a1a",
        borderRadius: 16,
        padding: "28px 28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: clickable ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}22`;
      }}
      onMouseLeave={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {clickable && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 9,
            color: "#555",
            fontWeight: 600,
            background: "#252525",
            padding: "2px 8px",
            borderRadius: 99,
            letterSpacing: "0.05em",
          }}
        >
          CLICK FOR BREAKDOWN
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color,
          lineHeight: 1,
          letterSpacing: "-1px",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RateCard({
  label,
  color,
  numerator,
  denominator,
}: {
  label: string;
  color: string;
  numerator: number;
  denominator: number;
}) {
  const pct = denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: 16,
        padding: "28px 28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color,
          lineHeight: 1,
          letterSpacing: "-1px",
        }}
      >
        {pct}%
      </div>
      <div
        style={{ background: "#252525", borderRadius: 99, height: 6, overflow: "hidden" }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#555" }}>
        {numerator} of {denominator}
      </div>
    </div>
  );
}

function PeriodToggle({
  value,
  onChange,
  dark,
}: {
  value: Period;
  onChange: (p: Period) => void;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: dark ? "#1a1a1a" : "#f3f4f6",
        borderRadius: 10,
        padding: 4,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "all 0.15s ease",
            background:
              value === key ? (dark ? "#333" : "#111827") : "transparent",
            color: value === key ? "#ffffff" : dark ? "#555" : "#6b7280",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const STAGE_META = [
  { label: "Step 0", desc: "First message", color: "#00e5ff" },
  { label: "Step 1", desc: "Follow-up 1", color: "#f97316" },
  { label: "Step 2", desc: "Activity check", color: "#ec4899" },
  { label: "Step 3", desc: "Reconnect", color: "#a855f7" },
  { label: "Step 4", desc: "Last check-in", color: "#22c55e" },
  { label: "Pool", desc: "Warm nurture", color: "#818cf8" },
];

export default function Insights() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");
  const [teamPeriod, setTeamPeriod] = useState<Period>("all");
  const [showRepliedModal, setShowRepliedModal] = useState(false);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  const filtered = filterByPeriod(contacts, period);
  const teamFiltered = filterByPeriod(contacts, teamPeriod);

  // New Outreach = contacts reached for the first time (only message 0 sent → dripStep === 1)
  const newOutreach = filtered.filter((c) => c.dripStep === 1).length;

  const replied = filtered.filter(isReplied).length;

  const engagedCalls = filtered.filter(
    (c) =>
      c.status === "Replied - Pivot Call Needed - HOT" ||
      c.status === "Potential Deal"
  ).length;

  const convertedToPool = filtered.filter((c) =>
    ["The Pool", "Potential Deal", "Offer Submitted", "Underwriting"].includes(c.status)
  ).length;

  const contacted = filtered.filter((c) => c.dripStep > 0 || c.poolStep > 0).length;

  // Reply stage breakdown
  const repliedContacts = filtered.filter(isReplied);
  const stageData = STAGE_META.map((meta, i) => {
    const count =
      i < 5
        ? repliedContacts.filter(
            (c) => c.dripStep === i + 1 && c.poolStep === 0
          ).length
        : repliedContacts.filter((c) => c.poolStep > 0).length;
    return { label: meta.label, desc: meta.desc, value: count, color: meta.color };
  });

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />

      <div className="app-main">
        {/* Header */}
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
              Insights
            </h1>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
              Campaign performance overview
            </p>
          </div>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        {/* 4 stat cards */}
        <div className="kpi-grid-4" style={{ marginBottom: 14 }}>
          <StatCard
            label="New Outreach"
            value={newOutreach}
            sub="Contacts reached for the first time"
            color="#00e5ff"
          />
          <StatCard
            label="Replied"
            value={replied}
            sub="Tap to see breakdown by drip stage"
            color="#f97316"
            clickable
            onClick={() => setShowRepliedModal(true)}
          />
          <StatCard
            label="Engaged Calls"
            value={engagedCalls}
            sub="HOT leads & discovery calls"
            color="#ec4899"
          />
          <StatCard
            label="Had a Call"
            value={convertedToPool}
            sub="Agents who had a conversation"
            color="#a855f7"
          />
        </div>

        {/* 2 rate cards */}
        <div className="kpi-grid-2" style={{ gap: 14, marginBottom: 32 }}>
          <RateCard
            label="Reply Rate"
            color="#f97316"
            numerator={replied}
            denominator={contacted}
          />
          <RateCard
            label="Call Rate"
            color="#a855f7"
            numerator={convertedToPool}
            denominator={contacted}
          />
        </div>

        {/* ── Team Performance ── */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 20,
            padding: "28px 28px 24px",
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "#6366f1",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Team Performance
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
                Individual Breakdown
              </h2>
            </div>
            <PeriodToggle value={teamPeriod} onChange={setTeamPeriod} dark />
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 1fr 1fr 1fr",
              gap: 12,
              marginBottom: 8,
              paddingBottom: 10,
              borderBottom: "1px solid #1e1e1e",
            }}
          >
            <div style={{ fontSize: 10, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Member
            </div>
            {[
              { label: "New Outreach", color: "#00e5ff" },
              { label: "Replies", color: "#f97316" },
              { label: "Qualified", color: "#22c55e" },
              { label: "Potential Deals", color: "#ec4899" },
            ].map(({ label, color }) => (
              <div
                key={label}
                style={{
                  fontSize: 10,
                  color,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Team member rows */}
          {TEAM_MEMBERS.map((member) => {
            const mc = getMemberContacts(teamFiltered, member);
            const mNewOutreach = mc.filter((c) => c.dripStep === 1).length;
            const mReplies = mc.filter(isReplied).length;
            const mQualified = mc.filter((c) => QUALIFIED_STATUSES.includes(c.status)).length;
            const mDeals = mc.filter((c) => c.status === "Potential Deal").length;
            const color = MEMBER_COLORS[member];

            return (
              <div
                key={member}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr 1fr 1fr 1fr",
                  gap: 12,
                  padding: "18px 0",
                  borderBottom: "1px solid #1a1a1a",
                  alignItems: "center",
                }}
              >
                {/* Avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: `${color}18`,
                      border: `1.5px solid ${color}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color,
                    }}
                  >
                    {member[0]}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>{member}</span>
                </div>

                {/* Metrics */}
                {[
                  { value: mNewOutreach, color: "#00e5ff" },
                  { value: mReplies, color: "#f97316" },
                  { value: mQualified, color: "#22c55e" },
                  { value: mDeals, color: "#ec4899" },
                ].map(({ value, color: c }, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: value === 0 ? "#333" : c,
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Totals row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 1fr 1fr 1fr",
              gap: 12,
              paddingTop: 14,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total
            </div>
            {[
              {
                value: teamFiltered.filter((c) => c.dripStep === 1).length,
                color: "#00e5ff",
              },
              { value: teamFiltered.filter(isReplied).length, color: "#f97316" },
              {
                value: teamFiltered.filter((c) => QUALIFIED_STATUSES.includes(c.status)).length,
                color: "#22c55e",
              },
              {
                value: teamFiltered.filter((c) => c.status === "Potential Deal").length,
                color: "#ec4899",
              },
            ].map(({ value, color: c }, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1 }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Replied Breakdown Modal ── */}
      {showRepliedModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowRepliedModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a",
              borderRadius: 20,
              padding: "32px 36px",
              width: 520,
              maxWidth: "92vw",
              border: "1px solid #2a2a2a",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 28,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#f97316",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Reply Analysis
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
                  Replies by Drip Stage
                </h2>
                <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                  Total:{" "}
                  <span style={{ color: "#f97316", fontWeight: 700 }}>{replied}</span>{" "}
                  replies across all stages
                </p>
              </div>
              <button
                onClick={() => setShowRepliedModal(false)}
                style={{
                  background: "#252525",
                  border: "none",
                  color: "#888",
                  fontSize: 16,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Bar chart */}
            <StageBarChart data={stageData} />

            {/* Detail list */}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 2 }}>
              {stageData.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: item.value > 0 ? `${item.color}08` : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#9ca3af", flex: 1 }}>
                    <span style={{ fontWeight: 600, color: "#e5e7eb" }}>{item.label}</span>
                    {" — "}
                    {item.desc}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: item.value > 0 ? item.color : "#333" }}>
                    {item.value}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#555",
                      width: 32,
                      textAlign: "right",
                    }}
                  >
                    {replied > 0 ? `${Math.round((item.value / replied) * 100)}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

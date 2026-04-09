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
};

type Period = "day" | "week" | "month" | "year" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
  { key: "all", label: "All Time" },
];

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "year") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

function filterByPeriod(contacts: Contact[], period: Period): Contact[] {
  const start = getPeriodStart(period);
  if (!start) return contacts;
  return contacts.filter((c) => {
    if (!c.lastContact) return false;
    return new Date(c.lastContact) >= start;
  });
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: 16,
        padding: "28px 28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{sub}</div>
      )}
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
        style={{
          background: "#252525",
          borderRadius: 99,
          height: 6,
          overflow: "hidden",
        }}
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

export default function Insights() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  const filtered = filterByPeriod(contacts, period);

  // Messages sent = total drip + pool steps sent across all contacts
  const messagesSent = filtered.reduce((sum, c) => sum + c.dripStep + c.poolStep, 0);

  // Replied = contacts with a lastReply value OR status indicates a reply
  const repliedStatuses = [
    "Replied - Pivot Call Needed - HOT",
    "Potential Deal",
    "No Deal - Auto Reply",
    "Underwriting",
  ];
  const replied = filtered.filter(
    (c) =>
      (c.lastReply && c.lastReply.trim() !== "") ||
      repliedStatuses.includes(c.status)
  ).length;

  // Engaged calls = HOT leads + discovery call needed
  const engagedCalls = filtered.filter(
    (c) =>
      c.status === "Replied - Pivot Call Needed - HOT" ||
      c.status === "Potential Deal"
  ).length;

  // Call rate = contacts who had an actual call (now in Pool or beyond)
  const convertedToPool = filtered.filter(
    (c) => ["The Pool", "Potential Deal", "Offer Submitted", "Underwriting"].includes(c.status)
  ).length;

  // Contacted = at least 1 message sent
  const contacted = filtered.filter((c) => c.dripStep > 0 || c.poolStep > 0).length;

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

          {/* Period toggle */}
          <div
            style={{
              display: "flex",
              background: "#f3f4f6",
              borderRadius: 10,
              padding: 4,
              gap: 2,
            }}
          >
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                  background: period === key ? "#111827" : "transparent",
                  color: period === key ? "#ffffff" : "#6b7280",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 count cards */}
        <div className="kpi-grid-4" style={{ marginBottom: 14 }}>
          <StatCard
            label="Messages Sent"
            value={messagesSent}
            sub="Total drip + pool messages"
            color="#00e5ff"
          />
          <StatCard
            label="Replied"
            value={replied}
            sub="Contacts who responded"
            color="#f97316"
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
        <div className="kpi-grid-2" style={{ gap: 14 }}>
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
      </div>
    </div>
  );
}

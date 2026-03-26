"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string;
  status: string;
  dripStep: number;
  poolStep: number;
  lastReply: string;
};

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

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  // Messages sent = total drip + pool steps sent across all contacts
  const messagesSent = contacts.reduce((sum, c) => sum + c.dripStep + c.poolStep, 0);

  // Replied = contacts with a lastReply value OR status indicates a reply
  const repliedStatuses = [
    "Replied - Pivot Call Needed - HOT",
    "Deal sent- Discovery call needed",
    "No Deal - Auto Reply",
    "Underwriting",
  ];
  const replied = contacts.filter(
    (c) =>
      (c.lastReply && c.lastReply.trim() !== "") ||
      repliedStatuses.includes(c.status)
  ).length;

  // Engaged calls = HOT leads + discovery call needed
  const engagedCalls = contacts.filter(
    (c) =>
      c.status === "Replied - Pivot Call Needed - HOT" ||
      c.status === "Deal sent- Discovery call needed"
  ).length;

  // Converted to pool = in The Pool or has pool steps
  const convertedToPool = contacts.filter(
    (c) => c.status === "The Pool" || c.poolStep > 0
  ).length;

  // Contacted = at least 1 message sent
  const contacted = contacts.filter((c) => c.dripStep > 0 || c.poolStep > 0).length;

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

      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
            Insights
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            Campaign performance overview
          </p>
        </div>

        {/* 4 count cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
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
            label="Converted to Pool"
            value={convertedToPool}
            sub="Moved into pool campaign"
            color="#a855f7"
          />
        </div>

        {/* 2 rate cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 14,
          }}
        >
          <RateCard
            label="Reply Rate"
            color="#f97316"
            numerator={replied}
            denominator={contacted}
          />
          <RateCard
            label="Pool Conversion Rate"
            color="#a855f7"
            numerator={convertedToPool}
            denominator={contacted}
          />
        </div>
      </div>
    </div>
  );
}

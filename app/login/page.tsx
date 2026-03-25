"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Wrong password");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#00e5ff22", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>F</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Flip CRM</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 80, maxWidth: 1000, width: "100%" }}>
          {/* Left: text + form */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, color: "#111827", marginBottom: 16 }}>
              Flip CRM:<br />Automate Your<br />Real Estate.
            </h1>
            <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 40 }}>
              Agent outreach automation — close faster, track smarter.
            </p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#111827", borderRadius: 8, padding: "12px 16px", fontSize: 14 }}
              />
              {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#111827", color: "#ffffff", border: "none",
                  borderRadius: 8, padding: "13px 0", fontWeight: 700,
                  fontSize: 14, letterSpacing: "0.5px",
                }}
              >
                {loading ? "LOGGING IN..." : "GET STARTED"}
              </button>
            </form>
          </div>

          {/* Right: visual */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 380, height: 320, background: "#1a1a1a",
              borderRadius: 20, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#888", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em" }}>TOTAL CONTACTS</span>
                <span style={{ background: "#00e5ff22", color: "#00e5ff", fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>Performance</span>
              </div>
              <div style={{ color: "#ffffff", fontSize: 32, fontWeight: 700 }}>3,335</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Hot Leads", value: "48", color: "#f97316" },
                  { label: "Drip Active", value: "127", color: "#00e5ff" },
                  { label: "In The Pool", value: "89", color: "#a855f7" },
                  { label: "Deals Closed", value: "12", color: "#22c55e" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#252525", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

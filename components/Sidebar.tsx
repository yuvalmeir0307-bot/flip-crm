"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function IconGrid({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={color} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={color} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={color} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={color} />
    </svg>
  );
}

function IconUser({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" fill={color} />
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDoc({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="1" width="10" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="5" x2="10" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="8" x2="10" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="11" x2="9" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChart({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12 L5 7 L8 9 L11 4 L14 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="2" y1="14" x2="14" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGear({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: IconGrid },
  { href: "/contacts", label: "Contacts", Icon: IconUser },
  { href: "/scripts", label: "Scripts", Icon: IconDoc },
  { href: "/insights", label: "Insights", Icon: IconChart },
  { href: "/settings", label: "Settings", Icon: IconGear },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div style={{
      width: 220, minHeight: "100vh", background: "#1a1a1a",
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "sticky", top: 0, height: "100vh",
      boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid #252525" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: "#00e5ff18",
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #00e5ff33",
          }}>
            <span style={{ color: "#00e5ff", fontSize: 17, fontWeight: 800, lineHeight: 1 }}>F</span>
          </div>
          <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>Flip CRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {NAV.map((item) => {
          const active = path === item.href || (item.href === "/dashboard" && path === "/");
          const iconColor = active ? "#00e5ff" : "#555";
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, marginBottom: 2,
              background: active ? "#00e5ff12" : "transparent",
              color: active ? "#00e5ff" : "#666",
              fontSize: 14, fontWeight: active ? 600 : 400,
              textDecoration: "none",
            }}>
              <item.Icon color={iconColor} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid #252525" }}>
        <button onClick={logout} style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px", borderRadius: 8,
          background: "transparent", border: "none",
          color: "#555", fontSize: 14, cursor: "pointer", textAlign: "left",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 7h7M9 4l3 3-3 3" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

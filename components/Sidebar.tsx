"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "⊞" },
  { href: "/contacts", label: "Contacts", icon: "👤" },
  { href: "/scripts", label: "Scripts", icon: "📋" },
  { href: "/insights", label: "Insights", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙" },
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
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: "#00e5ff22",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>F</span>
          </div>
          <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Flip CRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {NAV.map((item) => {
          const active = path === item.href || (item.href === "/dashboard" && path === "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, marginBottom: 2,
              background: active ? "#00e5ff15" : "transparent",
              color: active ? "#00e5ff" : "#888",
              fontSize: 14, fontWeight: active ? 600 : 400,
              textDecoration: "none", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom logout */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid #2a2a2a" }}>
        <button onClick={logout} style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px", borderRadius: 8,
          background: "transparent", border: "none",
          color: "#666", fontSize: 14, cursor: "pointer", textAlign: "left",
        }}>
          <span>↪</span> Logout
        </button>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Contact = {
  id: string;
  name: string;
  phone: string;
  status: string;
  brokerage: string;
  area: string;
  lastReply: string;
  notes: string;
  warmth: string;
  followUpDate: string | null;
};

const WARMTH_OPTIONS = ["Cold", "Warm", "Hot"];
const WARMTH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Cold:  { bg: "#1e3a5f22", text: "#60a5fa", border: "#3b82f622" },
  Warm:  { bg: "#7c3aed22", text: "#a78bfa", border: "#7c3aed44" },
  Hot:   { bg: "#f9731622", text: "#fb923c", border: "#f9731644" },
};

function WarmthBadge({ level }: { level: string }) {
  if (!level) return null;
  const c = WARMTH_COLORS[level] ?? { bg: "#ffffff11", text: "#888", border: "#ffffff22" };
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
    }}>
      {level === "Hot" ? "🔥 Hot" : level === "Warm" ? "🌡 Warm" : "❄️ Cold"}
    </span>
  );
}

function ScriptPanel({ title, accentColor, children }: { title: string; accentColor: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "#141414", borderRadius: 12, marginBottom: 16,
      border: `1px solid ${accentColor}33`,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          📋 {title}
        </span>
        <span style={{ fontSize: 16, color: accentColor, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ›
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${accentColor}22` }}>
          {children}
        </div>
      )}
    </div>
  );
}

type ScriptLine =
  | { type: "pause"; text?: never }
  | { type: "line" | "bold" | "bracket"; text: string };

type DiscoveryStep = {
  num: number;
  text: string;
  bold?: boolean;
  sub: { bold: boolean; text: string }[];
};

const HOT_SCRIPT_LINES: ScriptLine[] = [
  { type: "line", text: 'Hi [Agent name], this is [Your name] with HBI Realty. How you doing?' },
  { type: "pause" },
  { type: "bold", text: "Awesome. I'm contacting you because me and my partner are looking to buy another investment property in the [market] area. Is this something you can help with?" },
  { type: "pause" },
  { type: "bracket", text: 'Yes / It depends / What are you looking for? / How can I help? / etc' },
  { type: "pause" },
  { type: "bold", text: "We're looking for properties with motivated sellers that want to sell fast for cash, or houses that need some work... The reason because my partner has a construction team to help me fix up the houses after we buy them. But it's been difficult lately to find any properties on the MLS that makes sense..." },
  { type: "bold", text: "So I thought I tried you to see if you have any properties with motivated sellers coming up, or if you can ask around your office to see if any of your agent friends have a house that needs work about to hit the market?" },
  { type: "pause" },
  { type: "bracket", text: 'If they say no' },
  { type: "bold", text: "I'm going to send you my contact information after we hang up so you can have it saved in your phone. If you have any properties coming up the pipeline in the future, please let me know. I would love to have you write the offers for us, and this way you can keep both sides of the commissions on all of your listings." },
  { type: "pause" },
  { type: "line", text: "I appreciate your time. Nice talking to you. Have a great day." },
  { type: "pause" },
  { type: "bracket", text: 'If agent said they have a property coming up' },
  { type: "bold", text: "Great. Can you catch me up to speed with the seller situation on this property?" },
  { type: "line", text: "What's the property address?" },
];

const DISCOVERY_STEPS: DiscoveryStep[] = [
  { num: 1, text: "Build rapport (15 – 30 seconds)", sub: [] },
  {
    num: 2, text: "Ask for property address if not available. If agent doesn't want to give address:", sub: [
      { bold: true, text: "Ask if they can send property-specific BBA for us to sign, then they share the address → reassure agent that we don't go around them." },
      { bold: false, text: "Ask why cannot share? When are they able to give an update on it?" },
      { bold: false, text: "Most common reason why agent don't wanna share address is because they don't have listing agreement. About 5% of the time seller don't wanna disclose address." },
    ],
  },
  {
    num: 3, bold: true,
    text: '"Can you catch me up to speed with the situation of the seller on this one?" / "What\'s the story on this house"', sub: [],
  },
  {
    num: 4, text: "If agent doesn't tell seller situation, begin to ask assumption questions such as:", sub: [
      { bold: false, text: "Is it an owner-occupied house or did the seller rent it out?" },
      { bold: false, text: "Is it vacant at the moment or someone living in it?" },
    ],
  },
  {
    num: 5, text: "Ask agent about the condition of the property (don't have to ask all depending on the flow):", sub: [
      { bold: false, text: "What kind of conditions is it in?" },
      { bold: false, text: "What repairs do you think it needs?" },
      { bold: false, text: "Any ideas on age of roof and AC?" },
    ],
  },
  {
    num: 6, bold: true, text: "[Back up] way to ask seller motivation if still unclear", sub: [
      { bold: false, text: '[Say something about the feature of the house or the history of the house]... What makes the seller decide to sell?' },
    ],
  },
  { num: 7, text: "Ask timeline.", sub: [] },
];

function HotCard({ contact, onStatusChange }: { contact: Contact; onStatusChange: (id: string, status: string) => void }) {
  const [callState, setCallState] = useState<"idle" | "confirm" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState("");

  async function initiateCall() {
    setCallState("calling");
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: contact.phone }),
      });
      const data = await res.json();
      if (data.ok) {
        setCallState("done");
        setTimeout(() => setCallState("idle"), 4000);
      } else {
        setCallState("error");
        setCallError(data.error ?? "Call failed");
        setTimeout(() => setCallState("idle"), 4000);
      }
    } catch {
      setCallState("error");
      setCallError("Network error");
      setTimeout(() => setCallState("idle"), 4000);
    }
  }

  return (
    <div style={{
      background: "#1a1a1a", borderRadius: 14, padding: 20,
      border: "1px solid #f9731622",
      boxShadow: "0 4px 20px rgba(249,115,22,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{contact.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "#666" }}>{contact.phone}</span>
            {/* Call Button */}
            {callState === "idle" && (
              <button
                onClick={() => setCallState("confirm")}
                style={{
                  background: "#0ea5e922", color: "#38bdf8", border: "1px solid #0ea5e944",
                  borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                📞 Call
              </button>
            )}
            {callState === "confirm" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#fb923c", fontWeight: 600 }}>Call {contact.name.split(" ")[0]}?</span>
                <button
                  onClick={initiateCall}
                  style={{
                    background: "#f97316", color: "#000", border: "none",
                    borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setCallState("idle")}
                  style={{
                    background: "#2a2a2a", color: "#888", border: "1px solid #333",
                    borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            {callState === "calling" && (
              <span style={{ fontSize: 11, color: "#f97316" }}>📞 Calling...</span>
            )}
            {callState === "done" && (
              <span style={{ fontSize: 11, color: "#10b981" }}>✓ Call initiated</span>
            )}
            {callState === "error" && (
              <span style={{ fontSize: 11, color: "#ef4444" }} title={callError}>✗ Failed</span>
            )}
          </div>
        </div>
        <span style={{
          background: "#f9731622", color: "#fb923c",
          border: "1px solid #f9731644",
          borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
        }}>
          🔥 Replied - HOT
        </span>
      </div>

      {contact.brokerage && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
          🏢 {contact.brokerage}{contact.area ? ` · ${contact.area}` : ""}
        </div>
      )}

      {contact.lastReply && (
        <div style={{
          background: "#ffffff08", borderRadius: 8, padding: "10px 12px",
          fontSize: 13, color: "#bbb", fontStyle: "italic", marginBottom: 14,
          borderLeft: "3px solid #f9731644",
        }}>
          "{contact.lastReply}"
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onStatusChange(contact.id, "Potential Deal")}
          style={{
            background: "#10b98122", color: "#34d399", border: "1px solid #10b98144",
            borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Potential Deal
        </button>
        <button
          onClick={() => onStatusChange(contact.id, "The Pool")}
          style={{
            background: "#a855f722", color: "#c084fc", border: "1px solid #a855f744",
            borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Move to Pool
        </button>
      </div>
    </div>
  );
}

function DealCard({ contact, onSave, onStatusChange }: {
  contact: Contact;
  onSave: (id: string, data: Partial<Contact>) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(contact.notes);
  const [warmth, setWarmth] = useState(contact.warmth);
  const [followUpDate, setFollowUpDate] = useState(contact.followUpDate ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(contact.id, { notes, warmth, followUpDate: followUpDate || null });
    setSaving(false);
    setEditing(false);
  }

  const isOverdue = followUpDate && new Date(followUpDate) < new Date(new Date().toDateString());
  const isToday = followUpDate && new Date(followUpDate).toDateString() === new Date().toDateString();

  return (
    <div style={{
      background: "#1a1a1a", borderRadius: 14, padding: 20,
      border: "1px solid #10b98122",
      boxShadow: "0 4px 20px rgba(16,185,129,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{contact.name}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{contact.phone}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <WarmthBadge level={warmth} />
        </div>
      </div>

      {contact.brokerage && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          🏢 {contact.brokerage}{contact.area ? ` · ${contact.area}` : ""}
        </div>
      )}

      {/* Follow Up Date */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Next Follow-Up
        </div>
        {editing ? (
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, background: "#111", border: "1px solid #333", color: "#fff" }}
          />
        ) : followUpDate ? (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: isOverdue ? "#ef4444" : isToday ? "#facc15" : "#34d399",
          }}>
            {isOverdue ? "⚠️ " : isToday ? "📅 " : "🗓 "}
            {new Date(followUpDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {isOverdue && " (overdue)"}
            {isToday && " (today)"}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "#555" }}>Not set</span>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Notes
        </div>
        {editing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes..."
            style={{
              width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8,
              background: "#111", border: "1px solid #333", color: "#fff",
              resize: "vertical", fontFamily: "inherit",
            }}
          />
        ) : notes ? (
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>{notes}</div>
        ) : (
          <span style={{ fontSize: 13, color: "#444" }}>No notes</span>
        )}
      </div>

      {/* Warmth selector (editing only) */}
      {editing && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Warmth Level
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {WARMTH_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWarmth(w)}
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  background: warmth === w ? (WARMTH_COLORS[w]?.bg ?? "#333") : "transparent",
                  color: WARMTH_COLORS[w]?.text ?? "#888",
                  borderColor: WARMTH_COLORS[w]?.border ?? "#333",
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {editing ? (
          <>
            <button onClick={save} disabled={saving} style={{
              background: "#10b981", color: "#000", border: "none",
              borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setNotes(contact.notes); setWarmth(contact.warmth); setFollowUpDate(contact.followUpDate ?? ""); }} style={{
              background: "#2a2a2a", color: "#888", border: "none",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
            }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} style={{
              background: "#ffffff0d", color: "#aaa", border: "1px solid #333",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const all: Contact[] = await res.json();
    setContacts(all.filter((c) =>
      c.status === "Replied - Pivot Call Needed - HOT" || c.status === "Potential Deal"
    ));
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  async function handleSave(id: string, data: Partial<Contact>) {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
  }

  const hotContacts = contacts.filter((c) => c.status === "Replied - Pivot Call Needed - HOT");
  const dealContacts = contacts.filter((c) => c.status === "Potential Deal");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Opportunities</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
            {hotContacts.length} replied · {dealContacts.length} potential deals
          </p>
        </div>

        {loading ? (
          <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

            {/* Replied - HOT */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: "#f97316",
                  boxShadow: "0 0 8px #f97316",
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Replied — HOT
                </span>
                <span style={{
                  background: "#f9731622", color: "#fb923c",
                  borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                  {hotContacts.length}
                </span>
              </div>
              <ScriptPanel title="גיוס מתווכים — Recruitment Script" accentColor="#f97316">
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {HOT_SCRIPT_LINES.map((line, i) => {
                    if (line.type === "pause") return (
                      <div key={i} style={{ color: "#444", fontSize: 12, paddingLeft: 4 }}>...</div>
                    );
                    if (line.type === "bracket") return (
                      <div key={i} style={{
                        color: "#f97316", fontSize: 12, fontStyle: "italic",
                        background: "#f9731611", borderRadius: 6, padding: "4px 10px",
                      }}>
                        [{line.text}]
                      </div>
                    );
                    if (line.type === "bold") return (
                      <div key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{line.text}</div>
                    );
                    return (
                      <div key={i} style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>{line.text}</div>
                    );
                  })}
                </div>
              </ScriptPanel>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {hotContacts.length === 0 ? (
                  <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 24, color: "#444", fontSize: 13, textAlign: "center" }}>
                    No hot leads right now
                  </div>
                ) : hotContacts.map((c) => (
                  <HotCard key={c.id} contact={c} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>

            {/* Potential Deal */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Potential Deal
                </span>
                <span style={{
                  background: "#10b98122", color: "#34d399",
                  borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                  {dealContacts.length}
                </span>
              </div>
              <ScriptPanel title="1st Discovery Call Script" accentColor="#10b981">
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {DISCOVERY_STEPS.map((step) => (
                    <div key={step.num}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{
                          minWidth: 20, height: 20, borderRadius: "50%",
                          background: "#10b98133", color: "#34d399",
                          fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>{step.num}</span>
                        <span style={{ fontSize: 13, color: step.bold ? "#fff" : "#bbb", fontWeight: step.bold ? 700 : 400, lineHeight: 1.5 }}>
                          {step.text}
                        </span>
                      </div>
                      {step.sub.length > 0 && (
                        <div style={{ marginLeft: 28, marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                          {step.sub.map((s, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <span style={{ color: "#10b981", fontSize: 11, marginTop: 2, flexShrink: 0 }}>›</span>
                              <span style={{ fontSize: 12, color: s.bold ? "#fff" : "#999", fontWeight: s.bold ? 700 : 400, lineHeight: 1.5 }}>
                                {s.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScriptPanel>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {dealContacts.length === 0 ? (
                  <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 24, color: "#444", fontSize: 13, textAlign: "center" }}>
                    No potential deals yet
                  </div>
                ) : dealContacts.map((c) => (
                  <DealCard key={c.id} contact={c} onSave={handleSave} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

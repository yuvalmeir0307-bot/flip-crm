"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type PillarScore = { score: number; evidence: string };
type DiscoveryAnalysis = {
  address: string;
  agentName: string;
  dualAgencyEligible: "Yes" | "No" | "Unclear";
  leadScore: number;
  motivation: PillarScore;
  timeline: PillarScore;
  condition: PillarScore;
  priceFlexibility: PillarScore;
  viability: "Hot" | "Warm" | "Cold";
  agentSentiment: "Open to Double Dip" | "Protective/Guard-up";
  agreedToPresent: "Yes" | "No" | "Unclear";
  why: string;
  strategicNote: string;
  nextSteps: string[];
};

type QualificationAnalysis = {
  agentName: string;
  brokerage: string;
  market: string;
  experience: "New" | "Mid-level" | "Veteran" | "Unknown";
  personality: string;
  callSummary: string;
  doubleCommissionStatus: "Accepted" | "Open" | "Declined" | "Not Discussed";
  doubleCommissionContext: string;
  painPoints: string[];
  rapportBuilders: string[];
  jvPotential: "High" | "Medium" | "Low" | "Too Early to Tell";
  jvReasoning: string;
  followUpStrategy: string;
};

function QualificationModal({ analysis, contactName, onClose, onSave }: {
  analysis: QualificationAnalysis;
  contactName: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [saved, setSaved] = useState(false);

  const jvColor = analysis.jvPotential === "High" ? "#10b981"
    : analysis.jvPotential === "Medium" ? "#facc15"
    : analysis.jvPotential === "Too Early to Tell" ? "#a78bfa"
    : "#60a5fa";

  const dcColor = analysis.doubleCommissionStatus === "Accepted" ? "#10b981"
    : analysis.doubleCommissionStatus === "Open" ? "#facc15"
    : analysis.doubleCommissionStatus === "Declined" ? "#ef4444"
    : "#888";

  const dcIcon = analysis.doubleCommissionStatus === "Accepted" ? "✅"
    : analysis.doubleCommissionStatus === "Open" ? "🤔"
    : analysis.doubleCommissionStatus === "Declined" ? "❌"
    : "—";

  const summaryNote = `[Qualification Call — ${new Date().toLocaleDateString()}]
Agent: ${analysis.agentName} | ${analysis.brokerage} | ${analysis.market}
Double Commission: ${analysis.doubleCommissionStatus} | JV Potential: ${analysis.jvPotential}
${analysis.callSummary}
Pain Points: ${analysis.painPoints.join(" | ")}
Rapport: ${analysis.rapportBuilders.join(" | ")}
Follow-Up: ${analysis.followUpStrategy}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414", border: "1px solid #333", borderRadius: 16,
          width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
          padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Qualification Call Analysis
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{contactName}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{analysis.brokerage} · {analysis.market}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              background: `${jvColor}22`, color: jvColor, border: `1px solid ${jvColor}44`,
              borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700,
            }}>
              JV: {analysis.jvPotential}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Double Commission Banner */}
        <div style={{
          background: `${dcColor}11`, border: `1px solid ${dcColor}33`,
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>{dcIcon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: dcColor, marginBottom: 3 }}>
              Double Commission — {analysis.doubleCommissionStatus}
            </div>
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.5 }}>{analysis.doubleCommissionContext}</div>
          </div>
        </div>

        {/* Call Summary */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Call Summary</div>
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6, background: "#1a1a1a", borderRadius: 8, padding: "10px 14px" }}>
            {analysis.callSummary}
          </div>
        </div>

        {/* Pain Points */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pain Points</div>
          {analysis.painPoints.length === 0 ? (
            <div style={{ fontSize: 12, color: "#444" }}>None identified</div>
          ) : analysis.painPoints.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ color: "#f97316", fontSize: 12, marginTop: 2, flexShrink: 0 }}>⚡</span>
              <span style={{ fontSize: 13, color: "#ddd", lineHeight: 1.4 }}>{pt}</span>
            </div>
          ))}
        </div>

        {/* Rapport Builders */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Rapport Builders</div>
          {analysis.rapportBuilders.length === 0 ? (
            <div style={{ fontSize: 12, color: "#444" }}>None captured</div>
          ) : analysis.rapportBuilders.map((rb, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ color: "#34d399", fontSize: 12, marginTop: 2, flexShrink: 0 }}>💬</span>
              <span style={{ fontSize: 13, color: "#ddd", lineHeight: 1.4 }}>{rb}</span>
            </div>
          ))}
        </div>

        {/* JV Potential */}
        <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>JV Potential</span>
            <span style={{ color: jvColor, fontWeight: 700, fontSize: 12 }}>{analysis.jvPotential}</span>
          </div>
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>{analysis.jvReasoning}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
            {analysis.agentName} · {analysis.experience} · {analysis.personality}
          </div>
        </div>

        {/* Follow-Up Strategy */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Follow-Up Strategy</div>
          <div style={{
            fontSize: 13, color: "#ddd", lineHeight: 1.6,
            background: "#10b98111", border: "1px solid #10b98133",
            borderRadius: 8, padding: "12px 14px",
          }}>
            {analysis.followUpStrategy}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", gap: 10 }}>
          {saved ? (
            <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>✓ Notes saved to contact</span>
          ) : (
            <button
              onClick={() => { onSave(summaryNote); setSaved(true); }}
              style={{
                background: "#10b981", color: "#000", border: "none",
                borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Save Notes to Contact
            </button>
          )}
          <button onClick={onClose} style={{ background: "#2a2a2a", color: "#888", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalysisModal({ analysis, contactName, onClose, onSave }: {
  analysis: DiscoveryAnalysis;
  contactName: string;
  onClose: () => void;
  onSave: (warmth: string, notes: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const viabilityColor = analysis.viability === "Hot" ? "#f97316" : analysis.viability === "Warm" ? "#a78bfa" : "#60a5fa";
  const warmthMap: Record<string, string> = { Hot: "Hot", Warm: "Warm", Cold: "Cold" };
  const suggestedWarmth = warmthMap[analysis.viability] ?? "Cold";

  const scoreColor = (s: number) => s >= 4 ? "#f97316" : s >= 3 ? "#facc15" : "#60a5fa";

  const summaryNote = `[Discovery Call Analysis — Score ${analysis.leadScore}/20 | ${analysis.viability}]
Address: ${analysis.address}
Motivation (${analysis.motivation.score}/5): ${analysis.motivation.evidence}
Timeline (${analysis.timeline.score}/5): ${analysis.timeline.evidence}
Condition (${analysis.condition.score}/5): ${analysis.condition.evidence}
Price Flexibility (${analysis.priceFlexibility.score}/5): ${analysis.priceFlexibility.evidence}
Agent Sentiment: ${analysis.agentSentiment} | Dual Agency: ${analysis.dualAgencyEligible} | Agreed to Present: ${analysis.agreedToPresent}
Why: ${analysis.why}
Strategic Note: ${analysis.strategicNote}
Next Steps: ${analysis.nextSteps.join(" | ")}`;

  async function handleSave() {
    setSaving(true);
    onSave(suggestedWarmth, summaryNote);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414", border: "1px solid #333", borderRadius: 16,
          width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
          padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Discovery Call Analysis
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{contactName}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{analysis.address}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              background: `${viabilityColor}22`, color: viabilityColor,
              border: `1px solid ${viabilityColor}44`,
              borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700,
            }}>
              {analysis.viability === "Hot" ? "🔥" : analysis.viability === "Warm" ? "🌡" : "❄️"} {analysis.viability}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Score Bar */}
        <div style={{ marginBottom: 20, background: "#1a1a1a", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>LEAD SCORE</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: viabilityColor }}>{analysis.leadScore}<span style={{ fontSize: 13, color: "#555" }}>/20</span></span>
          </div>
          <div style={{ background: "#2a2a2a", borderRadius: 6, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${(analysis.leadScore / 20) * 100}%`, height: "100%", background: viabilityColor, borderRadius: 6, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: "Motivation", score: analysis.motivation.score },
              { label: "Timeline", score: analysis.timeline.score },
              { label: "Condition", score: analysis.condition.score },
              { label: "Price Flex", score: analysis.priceFlexibility.score },
            ].map(({ label, score }) => (
              <span key={label} style={{ fontSize: 11, color: "#888" }}>
                {label}: <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score}/5</span>
              </span>
            ))}
          </div>
        </div>

        {/* Pillars */}
        {[
          { label: "Motivation", data: analysis.motivation },
          { label: "Timeline", data: analysis.timeline },
          { label: "Condition", data: analysis.condition },
          { label: "Price Flexibility", data: analysis.priceFlexibility },
        ].map(({ label, data }) => (
          <div key={label} style={{ marginBottom: 12, borderLeft: `3px solid ${scoreColor(data.score)}`, paddingLeft: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(data.score) }}>{data.score}/5</span>
            </div>
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.5 }}>{data.evidence}</div>
          </div>
        ))}

        {/* Sentiment Row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
          <span style={{
            background: analysis.agentSentiment === "Open to Double Dip" ? "#10b98122" : "#ef444422",
            color: analysis.agentSentiment === "Open to Double Dip" ? "#34d399" : "#f87171",
            border: `1px solid ${analysis.agentSentiment === "Open to Double Dip" ? "#10b98144" : "#ef444444"}`,
            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
          }}>
            {analysis.agentSentiment}
          </span>
          <span style={{ background: "#ffffff11", color: "#aaa", border: "1px solid #333", borderRadius: 20, padding: "3px 10px", fontSize: 11 }}>
            Dual Agency: {analysis.dualAgencyEligible}
          </span>
          <span style={{ background: "#ffffff11", color: "#aaa", border: "1px solid #333", borderRadius: 20, padding: "3px 10px", fontSize: 11 }}>
            Agreed to Present: {analysis.agreedToPresent}
          </span>
        </div>

        {/* Critical Analysis */}
        <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Critical Analysis</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#f97316", fontWeight: 600, marginBottom: 3 }}>The "Why"</div>
            <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>{analysis.why}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, marginBottom: 3 }}>Strategic Note</div>
            <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>{analysis.strategicNote}</div>
          </div>
        </div>

        {/* Next Steps */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Next Steps</div>
          {analysis.nextSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ minWidth: 18, height: 18, borderRadius: "50%", background: "#10b98133", color: "#34d399", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: "#bbb", lineHeight: 1.4 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", gap: 10 }}>
          {saved ? (
            <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>✓ Saved to contact</span>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#10b981", color: "#000", border: "none",
                borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : `Save & Set Warmth → ${suggestedWarmth}`}
            </button>
          )}
          <button onClick={onClose} style={{ background: "#2a2a2a", color: "#888", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type Contact = {
  id: string;
  name: string;
  phone: string;
  altPhones: string;
  status: string;
  brokerage: string;
  area: string;
  lastReply: string;
  notes: string;
  warmth: string;
  followUpDate: string | null;
  assignedTo: string;
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

function HotCard({ contact, onStatusChange, onSave }: {
  contact: Contact;
  onStatusChange: (id: string, status: string) => void;
  onSave: (id: string, data: Partial<Contact>) => void;
}) {
  const [callState, setCallState] = useState<"idle" | "confirm" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState("");
  const [msgState, setMsgState] = useState<"idle" | "confirm">("idle");
  const [qualifyState, setQualifyState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [qualifyError, setQualifyError] = useState("");
  const [qualifySetupUrl, setQualifySetupUrl] = useState("");
  const [qualification, setQualification] = useState<QualificationAnalysis | null>(null);

  async function qualifyCall() {
    setQualifyState("loading");
    setQualifyError("");
    setQualifySetupUrl("");
    try {
      const res = await fetch("/api/qualify-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: contact.phone, altPhones: contact.altPhones }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQualifyState("error");
        setQualifyError(data.error ?? "Analysis failed");
        if (data.setupUrl) setQualifySetupUrl(data.setupUrl);
        setTimeout(() => setQualifyState("idle"), 8000);
      } else {
        setQualification(data.analysis);
        setQualifyState("done");
      }
    } catch {
      setQualifyState("error");
      setQualifyError("Network error");
      setTimeout(() => setQualifyState("idle"), 8000);
    }
  }

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
    <>
    {qualifyState === "done" && qualification && (
      <QualificationModal
        analysis={qualification}
        contactName={contact.name}
        onClose={() => setQualifyState("idle")}
        onSave={(notes) => onSave(contact.id, { notes })}
      />
    )}
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
            {/* Message Button */}
            {msgState === "idle" && (
              <button
                onClick={() => setMsgState("confirm")}
                style={{
                  background: "#10b98122", color: "#34d399", border: "1px solid #10b98144",
                  borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                💬 Message
              </button>
            )}
            {msgState === "confirm" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>Message {contact.name.split(" ")[0]}?</span>
                <a
                  href={`sms:${contact.phone}`}
                  onClick={() => setMsgState("idle")}
                  style={{
                    background: "#10b981", color: "#000", borderRadius: 6,
                    padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                  }}
                >
                  Confirm
                </a>
                <button
                  onClick={() => setMsgState("idle")}
                  style={{ background: "#2a2a2a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </span>
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

      {contact.assignedTo && (
        <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6, fontWeight: 600 }}>
          👤 {contact.assignedTo}
        </div>
      )}

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
        {qualifyState === "idle" && (
          <button
            onClick={qualifyCall}
            style={{
              background: "#0ea5e922", color: "#38bdf8", border: "1px solid #0ea5e944",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            🧠 Analyze Call
          </button>
        )}
        {qualifyState === "loading" && (
          <span style={{ fontSize: 12, color: "#38bdf8", alignSelf: "center" }}>⏳ Analyzing...</span>
        )}
        {qualifyState === "error" && (
          <span style={{ fontSize: 12, color: "#f87171", alignSelf: "center", maxWidth: 240 }}>
            ✗ {qualifyError}
            {qualifySetupUrl && (
              <a href={qualifySetupUrl} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 6, color: "#38bdf8", textDecoration: "underline" }}>
                Enable recording →
              </a>
            )}
          </span>
        )}
      </div>
    </div>
    </>
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
  const [callState, setCallState] = useState<"idle" | "confirm" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState("");
  const [msgState, setMsgState] = useState<"idle" | "confirm">("idle");
  const [analyzeState, setAnalyzeState] = useState<"idle" | "loading" | "done" | "error" | "manual">("idle");
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeSetupUrl, setAnalyzeSetupUrl] = useState("");
  const [analysis, setAnalysis] = useState<DiscoveryAnalysis | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");

  async function analyzeManualTranscript() {
    if (!manualTranscript.trim()) return;
    setAnalyzeState("loading");
    try {
      const res = await fetch("/api/analyze-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: manualTranscript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeState("error");
        setAnalyzeError(data.error ?? "Analysis failed");
        setTimeout(() => setAnalyzeState("idle"), 8000);
      } else {
        setAnalysis(data.analysis);
        setAnalyzeState("done");
      }
    } catch {
      setAnalyzeState("error");
      setAnalyzeError("Network error");
      setTimeout(() => setAnalyzeState("idle"), 8000);
    }
  }

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

  async function analyzeCall() {
    setAnalyzeState("loading");
    setAnalyzeError("");
    setAnalyzeSetupUrl("");
    try {
      const res = await fetch("/api/analyze-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: contact.phone, altPhones: contact.altPhones }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show manual transcript input instead of a timed error
        setAnalyzeState("manual");
        setAnalyzeError(data.error ?? "Analysis failed");
      } else {
        setAnalysis(data.analysis);
        setAnalyzeState("done");
      }
    } catch {
      setAnalyzeState("error");
      setAnalyzeError("Network error");
      setTimeout(() => setAnalyzeState("idle"), 8000);
    }
  }

  async function save() {
    setSaving(true);
    await onSave(contact.id, { notes, warmth, followUpDate: followUpDate || null });
    setSaving(false);
    setEditing(false);
  }

  const isOverdue = followUpDate && new Date(followUpDate) < new Date(new Date().toDateString());
  const isToday = followUpDate && new Date(followUpDate).toDateString() === new Date().toDateString();

  return (
    <>
    {analyzeState === "done" && analysis && (
      <AnalysisModal
        analysis={analysis}
        contactName={contact.name}
        onClose={() => setAnalyzeState("idle")}
        onSave={(newWarmth, newNotes) => {
          setWarmth(newWarmth);
          setNotes((prev) => newNotes + (prev ? "\n\n" + prev : ""));
          onSave(contact.id, { warmth: newWarmth, notes: newNotes + (notes ? "\n\n" + notes : "") });
        }}
      />
    )}
    <div style={{
      background: "#1a1a1a", borderRadius: 14, padding: 20,
      border: "1px solid #10b98122",
      boxShadow: "0 4px 20px rgba(16,185,129,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{contact.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
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
                  style={{ background: "#f97316", color: "#000", border: "none", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setCallState("idle")}
                  style={{ background: "#2a2a2a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </span>
            )}
            {callState === "calling" && <span style={{ fontSize: 11, color: "#f97316" }}>📞 Calling...</span>}
            {callState === "done" && <span style={{ fontSize: 11, color: "#10b981" }}>✓ Call initiated</span>}
            {callState === "error" && <span style={{ fontSize: 11, color: "#ef4444" }} title={callError}>✗ Failed</span>}
            {/* Message Button */}
            {msgState === "idle" && (
              <button
                onClick={() => setMsgState("confirm")}
                style={{
                  background: "#10b98122", color: "#34d399", border: "1px solid #10b98144",
                  borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                💬 Message
              </button>
            )}
            {msgState === "confirm" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>Message {contact.name.split(" ")[0]}?</span>
                <a
                  href={`sms:${contact.phone}`}
                  onClick={() => setMsgState("idle")}
                  style={{
                    background: "#10b981", color: "#000", borderRadius: 6,
                    padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                  }}
                >
                  Confirm
                </a>
                <button
                  onClick={() => setMsgState("idle")}
                  style={{ background: "#2a2a2a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <WarmthBadge level={warmth} />
        </div>
      </div>

      {contact.assignedTo && (
        <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6, fontWeight: 600 }}>
          👤 {contact.assignedTo}
        </div>
      )}

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
            {analyzeState === "idle" && (
              <button
                onClick={analyzeCall}
                style={{
                  background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44",
                  borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                🧠 Analyze Call
              </button>
            )}
            {analyzeState === "loading" && (
              <span style={{ fontSize: 12, color: "#a78bfa", alignSelf: "center" }}>⏳ Analyzing...</span>
            )}
            {analyzeState === "error" && (
              <span style={{ fontSize: 12, color: "#f87171", alignSelf: "center", maxWidth: 240 }}>
                ✗ {analyzeError}
              </span>
            )}
            {analyzeState === "manual" && (
              <div style={{ width: "100%", marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>
                  No recording found. Paste your call notes below to analyze:
                </div>
                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  rows={4}
                  placeholder="Paste call transcript or notes here..."
                  style={{
                    width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 8,
                    background: "#111", border: "1px solid #7c3aed44", color: "#fff",
                    resize: "vertical", fontFamily: "inherit", marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={analyzeManualTranscript}
                    disabled={!manualTranscript.trim()}
                    style={{
                      background: "#7c3aed", color: "#fff", border: "none",
                      borderRadius: 8, padding: "6px 16px", fontSize: 12,
                      fontWeight: 700, cursor: manualTranscript.trim() ? "pointer" : "not-allowed",
                      opacity: manualTranscript.trim() ? 1 : 0.5,
                    }}
                  >
                    Analyze Notes
                  </button>
                  <button
                    onClick={() => { setAnalyzeState("idle"); setManualTranscript(""); }}
                    style={{
                      background: "#2a2a2a", color: "#888", border: "1px solid #333",
                      borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}

type InsightPeriod = "daily" | "weekly" | "monthly" | "yearly";

function InsightsPanel({ allContacts }: { allContacts: Contact[] }) {
  const [period, setPeriod] = useState<InsightPeriod>("weekly");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getPeriodEnd(): Date {
    const d = new Date(today);
    if (period === "daily") d.setDate(d.getDate() + 1);
    else if (period === "weekly") d.setDate(d.getDate() + 7);
    else if (period === "monthly") d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  function getPeriodStart(): Date {
    const d = new Date(today);
    if (period === "daily") { /* today */ }
    else if (period === "weekly") d.setDate(d.getDate() - 7);
    else if (period === "monthly") d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  const periodStart = getPeriodStart();
  const periodEnd = getPeriodEnd();

  const followUpsInPeriod = allContacts.filter((c) => {
    if (!c.followUpDate) return false;
    const d = new Date(c.followUpDate + "T12:00:00");
    return d >= today && d < periodEnd;
  });

  const overdueFollowUps = allContacts.filter((c) => {
    if (!c.followUpDate) return false;
    const d = new Date(c.followUpDate + "T12:00:00");
    return d < today;
  });

  const hotLeads = allContacts.filter((c) => c.status === "Replied - Pivot Call Needed - HOT");
  const potentialDeals = allContacts.filter((c) => c.status === "Potential Deal");
  const hotWarmth = allContacts.filter((c) => c.warmth === "Hot");
  const warmWarmth = allContacts.filter((c) => c.warmth === "Warm");
  const coldWarmth = allContacts.filter((c) => c.warmth === "Cold");

  const periodLabel = period === "daily" ? "Today" : period === "weekly" ? "This Week" : period === "monthly" ? "This Month" : "This Year";

  const PERIODS: { key: InsightPeriod; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];

  return (
    <div>
      {/* Period Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: "7px 18px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              background: period === p.key ? "#6366f1" : "transparent",
              color: period === p.key ? "#fff" : "#6b7280",
              borderColor: period === p.key ? "#6366f1" : "#e5e7eb",
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Hot Leads", value: hotLeads.length, color: "#f97316", sub: "Replied — pivot call needed" },
          { label: "Potential Deals", value: potentialDeals.length, color: "#10b981", sub: "Active deal pipeline" },
          { label: `Follow-Ups (${periodLabel})`, value: followUpsInPeriod.length, color: "#6366f1", sub: `Scheduled in this ${period}` },
          { label: "Overdue Follow-Ups", value: overdueFollowUps.length, color: overdueFollowUps.length > 0 ? "#ef4444" : "#10b981", sub: "Past due date" },
          { label: "Hot Warmth", value: hotWarmth.length, color: "#fb923c", sub: "Contacts marked Hot" },
          { label: "Warm Warmth", value: warmWarmth.length, color: "#a78bfa", sub: "Contacts marked Warm" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#1a1a1a", borderRadius: 14, padding: "20px 22px",
            border: "1px solid #222",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-1px" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Conversion Rate */}
      <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px 22px", border: "1px solid #222", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Pipeline Overview — {periodLabel}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { label: "Hot → Deal Rate", num: potentialDeals.length, den: hotLeads.length + potentialDeals.length, color: "#10b981" },
            { label: "Overdue Rate", num: overdueFollowUps.length, den: allContacts.filter(c => c.followUpDate).length, color: "#ef4444" },
            { label: "Warm/Hot Coverage", num: hotWarmth.length + warmWarmth.length, den: allContacts.length, color: "#a78bfa" },
          ].map(({ label, num, den, color }) => {
            const pct = den === 0 ? 0 : Math.round((num / den) * 100);
            return (
              <div key={label} style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ background: "#2a2a2a", borderRadius: 4, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Follow-Ups */}
      {followUpsInPeriod.length > 0 && (
        <div style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px 22px", border: "1px solid #222" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Upcoming Follow-Ups — {periodLabel}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {followUpsInPeriod.slice(0, 10).map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, color: "#ddd", fontWeight: 600 }}>{c.name}</span>
                  {c.brokerage && <span style={{ fontSize: 12, color: "#555", marginLeft: 8 }}>{c.brokerage}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <WarmthBadge level={c.warmth} />
                  <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
                    {new Date(c.followUpDate! + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
            {followUpsInPeriod.length > 10 && (
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>+{followUpsInPeriod.length - 10} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"opportunities" | "insights">("opportunities");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const all: Contact[] = await res.json();
    setAllContacts(all);
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

  const TABS = [
    { key: "opportunities" as const, label: "Opportunities" },
    { key: "insights" as const, label: "Insights" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Opportunities</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
            {hotContacts.length} replied · {dealContacts.length} potential deals
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid #e5e7eb" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: "none",
                color: activeTab === tab.key ? "#111827" : "#9ca3af",
                borderBottom: activeTab === tab.key ? "2px solid #111827" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>
        ) : activeTab === "insights" ? (
          <InsightsPanel allContacts={allContacts} />
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
                  <HotCard key={c.id} contact={c} onStatusChange={handleStatusChange} onSave={handleSave} />
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

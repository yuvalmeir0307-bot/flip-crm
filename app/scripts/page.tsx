"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface ScriptEntry {
  id: string; name: string; campaign: "Drip" | "Pool";
  step: number; label: string; message: string; delay: number;
}

function delayLabel(d: number) {
  return d === 1 ? "1 day delay" : `${d} days delay`;
}

function StepCard({ script, onSave, onDelete, onTest }: {
  script: ScriptEntry;
  onSave: (id: string, msg: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (message: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(script.message);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setValue(script.message); }, [script.message]);

  const handleEdit = () => { setEditing(true); setSaved(false); setTimeout(() => textareaRef.current?.focus(), 50); };

  const handleSave = async () => {
    if (value === script.message) { setEditing(false); return; }
    setSaving(true);
    await onSave(script.id, value);
    setSaving(false); setEditing(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try { await onTest(value); setTestResult("ok"); }
    catch { setTestResult("fail"); }
    setTesting(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await onDelete(script.id);
    setDeleting(false);
  };

  const stepNum = script.campaign === "Drip" ? script.step + 1 : script.step;
  const badgeBg = script.campaign === "Drip" ? "#00e5ff22" : "#a855f722";
  const badgeColor = script.campaign === "Drip" ? "#00e5ff" : "#a855f7";
  const badgeLabel = script.campaign === "Drip" ? "Drip Active" : "The Pool";

  return (
    <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#ffffff" }}>
            Step {stepNum} ◆ {script.label}
          </span>
          <span style={{ background: badgeBg, color: badgeColor, fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
            {badgeLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#555" }}>⏱ {delayLabel(script.delay)}</span>

          {/* Test */}
          <button onClick={handleTest} disabled={testing} style={{
            fontSize: 12, padding: "5px 13px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
            background: testResult === "fail" ? "#ef444422" : "#22c55e22",
            border: `1px solid ${testResult === "fail" ? "#ef4444" : "#22c55e"}`,
            color: testResult === "fail" ? "#ef4444" : "#22c55e",
            opacity: testing ? 0.6 : 1,
          }}>
            {testing ? "..." : testResult === "ok" ? "✓ Sent!" : testResult === "fail" ? "✗ Failed" : "✓ Test"}
          </button>

          {/* Edit / Save / Cancel */}
          {!editing ? (
            <button onClick={handleEdit} style={{
              fontSize: 12, padding: "5px 13px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
              background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b",
            }}>
              ✏ Edit
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} style={{
                fontSize: 12, padding: "5px 13px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                background: "#22c55e", color: "#fff", border: "none", opacity: saving ? 0.6 : 1,
              }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setValue(script.message); setEditing(false); }} style={{
                fontSize: 12, padding: "5px 13px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                background: "#2a2a2a", color: "#888", border: "1px solid #333",
              }}>
                Cancel
              </button>
            </>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{
              fontSize: 12, padding: "5px 13px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
              background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444",
            }}>
              🗑 Delete
            </button>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={handleDeleteConfirm} disabled={deleting} style={{
                fontSize: 12, padding: "5px 10px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                background: "#ef4444", color: "#fff", border: "none",
              }}>
                {deleting ? "..." : "Confirm"}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{
                fontSize: 12, padding: "5px 10px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                background: "#2a2a2a", color: "#888", border: "1px solid #333",
              }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#555", fontWeight: 500, marginBottom: 8 }}>Yahav&apos;s message</p>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          style={{
            width: "100%", fontSize: 14, color: "#e5e5e5",
            border: "1px solid #00e5ff55", borderRadius: 8, padding: 12,
            outline: "none", resize: "none", lineHeight: 1.6,
            background: "#141414", fontFamily: "inherit",
          }}
        />
      ) : (
        <p onClick={handleEdit} style={{ fontSize: 14, color: saved ? "#22c55e" : "#999", lineHeight: 1.6, cursor: "pointer" }}>
          {value}
        </p>
      )}

      {saved && !editing && (
        <p style={{ fontSize: 12, color: "#22c55e", marginTop: 6, fontWeight: 500 }}>✓ Saved</p>
      )}
    </div>
  );
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Drip" | "Pool">("Drip");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ label: "", message: "", delay: 7 });
  const [addingSaving, setAddingSaving] = useState(false);

  useEffect(() => { loadScripts(); }, []);

  async function loadScripts() {
    setLoading(true);
    try {
      const res = await fetch("/api/scripts");
      const data = await res.json();
      setScripts(Array.isArray(data) ? data : []);
    } catch { setError("Failed to load scripts"); }
    setLoading(false);
  }

  async function handleSave(id: string, message: string) {
    await fetch("/api/scripts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, message }) });
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, message } : s)));
  }

  async function handleDelete(id: string) {
    await fetch("/api/scripts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleTest(message: string) {
    const res = await fetch("/api/scripts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", message }) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    setAddingSaving(true);
    const currentSteps = scripts.filter((s) => s.campaign === tab);
    const maxStep = currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.step)) : 0;
    await fetch("/api/scripts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", campaign: tab, step: maxStep + 1, label: newStep.label, message: newStep.message, delay: newStep.delay }),
    });
    setNewStep({ label: "", message: "", delay: 7 });
    setShowAddForm(false); setAddingSaving(false);
    await loadScripts();
  }

  const dripScripts = scripts.filter((s) => s.campaign === "Drip").sort((a, b) => a.step - b.step);
  const poolScripts = scripts.filter((s) => s.campaign === "Pool").sort((a, b) => a.step - b.step);
  const displayed = tab === "Drip" ? dripScripts : poolScripts;

  return (
    <div className="app-root">
      <Sidebar />

      <div className="app-main">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Campaign Scripts</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Synced with Workflow · Edit saves directly to Build Message node.</p>
        </div>

        {/* AI Banner */}
        <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 18px", marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#a855f7" }}>🤖 AI Auto-Classification on Reply (Gemini)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ background: "#2a2a2a", color: "#888", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              🌙 NO_DEAL → Auto-reply sent, status updated
            </span>
            <span style={{ background: "#f9731622", color: "#f97316", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              🔥 HOT → Both of you get SMS alert
            </span>
            <span style={{ background: "#22c55e22", color: "#22c55e", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              ✅ DEAL → Both of you get SMS alert
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex" }}>
            {(["Drip", "Pool"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setShowAddForm(false); }} style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                borderBottom: tab === t ? "2px solid #ef4444" : "2px solid transparent",
                color: tab === t ? "#ef4444" : "#9ca3af", marginBottom: -1,
              }}>
                {t === "Drip" ? "DRIP CAMPAIGN" : "THE POOL"}
                <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
                  {t === "Drip" ? `${dripScripts.length} messages · New agents` : `${poolScripts.length} messages · Qualified agents`}
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            fontSize: 13, padding: "7px 16px", borderRadius: 8, fontWeight: 500, cursor: "pointer",
            border: "1px solid #1a1a1a", color: "#111827", background: "#fff", marginBottom: 8,
          }}>
            + Add Step
          </button>
        </div>

        {/* Pool info */}
        {tab === "Pool" && (
          <div style={{ background: "#00e5ff11", border: "1px solid #00e5ff33", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#00e5ff" }}>
            📋 Agents enter The Pool after completing Drip step 4.
          </div>
        )}

        {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center", padding: 24 }}>{error}</p>}

        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>Loading scripts...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {displayed.map((s) => (
              <StepCard key={s.id} script={s} onSave={handleSave} onDelete={handleDelete} onTest={handleTest} />
            ))}

            {/* Add Step Form */}
            {showAddForm && (
              <form onSubmit={handleAddStep} style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
                  New Step — {tab === "Drip" ? `Step ${dripScripts.length + 1}` : `Pool Step ${poolScripts.length + 1}`}
                </p>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <input placeholder="Label (e.g. Follow Up)" value={newStep.label} onChange={(e) => setNewStep({ ...newStep, label: e.target.value })} required />
                  <input type="number" placeholder="Delay (days)" value={newStep.delay} onChange={(e) => setNewStep({ ...newStep, delay: Number(e.target.value) })} required min={1} style={{ width: 140 }} />
                </div>
                <textarea placeholder="Message — use [Name] and [Sender]" value={newStep.message} onChange={(e) => setNewStep({ ...newStep, message: e.target.value })} required rows={4} style={{ marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={addingSaving} style={{ background: "#00e5ff", color: "#000", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {addingSaving ? "Saving..." : "Save Step"}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} style={{ background: "#2a2a2a", color: "#888", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: 12, color: "#555", padding: "14px 0", borderTop: "1px dashed #e5e7eb", marginTop: 4 }}>
              {tab === "Drip" ? "📋 After Step 5 → auto-moves to The Pool" : "🔁 After Step 9: loops back to Step 5"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

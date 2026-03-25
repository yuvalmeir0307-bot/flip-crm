"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ScriptEntry {
  id: string;
  name: string;
  campaign: "Drip" | "Pool";
  step: number;
  label: string;
  message: string;
  delay: number;
}

function delayLabel(d: number) {
  return d === 1 ? "1 day delay" : `${d} days delay`;
}

function StepCard({
  script,
  onSave,
  onDelete,
  onTest,
}: {
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

  const handleEdit = () => {
    setEditing(true);
    setSaved(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    if (value === script.message) { setEditing(false); return; }
    setSaving(true);
    await onSave(script.id, value);
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setValue(script.message);
    setEditing(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await onTest(value);
      setTestResult("ok");
    } catch {
      setTestResult("fail");
    }
    setTesting(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await onDelete(script.id);
    setDeleting(false);
  };

  const stepNum = script.campaign === "Drip" ? script.step + 1 : script.step;
  const badgeBg = script.campaign === "Drip" ? "#dbeafe" : "#f3e8ff";
  const badgeColor = script.campaign === "Drip" ? "#1d4ed8" : "#7c3aed";
  const badgeLabel = script.campaign === "Drip" ? "Drip Active" : "The Pool";

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
            Step {stepNum} ◆ {script.label}
          </span>
          <span style={{ background: badgeBg, color: badgeColor, fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>
            {badgeLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>⏱ {delayLabel(script.delay)}</span>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testing}
            style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer",
              border: testResult === "ok" ? "1px solid #16a34a" : testResult === "fail" ? "1px solid #dc2626" : "1px solid #16a34a",
              color: testResult === "ok" ? "#16a34a" : testResult === "fail" ? "#dc2626" : "#16a34a",
              background: "transparent",
              opacity: testing ? 0.6 : 1,
            }}
          >
            {testing ? "Sending..." : testResult === "ok" ? "✓ Sent!" : testResult === "fail" ? "✗ Failed" : "✓ Test"}
          </button>

          {/* Edit / Save / Cancel */}
          {!editing ? (
            <button
              onClick={handleEdit}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer", border: "1px solid #f59e0b", color: "#d97706", background: "transparent" }}
            >
              ✏ Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer", background: "#22c55e", color: "#fff", border: "none", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer", background: "transparent", color: "#6b7280", border: "1px solid #d1d5db" }}
              >
                Cancel
              </button>
            </>
          )}

          {/* Delete button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer", border: "1px solid #ef4444", color: "#ef4444", background: "transparent" }}
            >
              🗑 Delete
            </button>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, fontWeight: 500, cursor: "pointer", background: "#ef4444", color: "#fff", border: "none" }}
              >
                {deleting ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, fontWeight: 500, cursor: "pointer", background: "transparent", color: "#6b7280", border: "1px solid #d1d5db" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sender label */}
      <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 8 }}>
        Yahav&apos;s message
      </p>

      {/* Message */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          style={{
            width: "100%", fontSize: 14, color: "#374151", border: "1px solid #93c5fd",
            borderRadius: 8, padding: 12, outline: "none", resize: "none", lineHeight: 1.6,
            background: "#fff", fontFamily: "inherit",
          }}
          placeholder="Write the message..."
        />
      ) : (
        <p
          onClick={handleEdit}
          style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, cursor: "pointer", padding: "4px 0" }}
        >
          {saved ? <span style={{ color: "#16a34a" }}>{value}</span> : value}
        </p>
      )}

      {saved && !editing && (
        <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4, fontWeight: 500 }}>Saved successfully</p>
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
  const router = useRouter();

  useEffect(() => {
    loadScripts();
  }, []);

  async function loadScripts() {
    setLoading(true);
    try {
      const res = await fetch("/api/scripts");
      const data = await res.json();
      setScripts(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load scripts");
    }
    setLoading(false);
  }

  async function handleSave(id: string, message: string) {
    await fetch("/api/scripts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, message }),
    });
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, message } : s)));
  }

  async function handleDelete(id: string) {
    await fetch("/api/scripts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleTest(message: string) {
    const res = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", message }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    setAddingSaving(true);
    const currentSteps = scripts.filter((s) => s.campaign === tab);
    const maxStep = currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.step)) : 0;
    const nextStep = maxStep + 1;
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        campaign: tab,
        step: nextStep,
        label: newStep.label,
        message: newStep.message,
        delay: newStep.delay,
      }),
    });
    setNewStep({ label: "", message: "", delay: 7 });
    setShowAddForm(false);
    setAddingSaving(false);
    await loadScripts();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const dripScripts = scripts.filter((s) => s.campaign === "Drip").sort((a, b) => a.step - b.step);
  const poolScripts = scripts.filter((s) => s.campaign === "Pool").sort((a, b) => a.step - b.step);
  const displayed = tab === "Drip" ? dripScripts : poolScripts;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Nav */}
      <nav style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#e5e5e5" }}>Flip CRM</span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/dashboard" style={{ color: "#888", fontSize: 14 }}>Dashboard</Link>
          <Link href="/contacts" style={{ color: "#888", fontSize: 14 }}>Contacts</Link>
          <Link href="/scripts" style={{ color: "#e5e5e5", fontSize: 14 }}>Scripts</Link>
          <button onClick={logout} style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Campaign Scripts</h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Edit saves directly to the Drip engine — changes take effect on next send.
          </p>
        </div>

        {/* AI Classification Banner */}
        <div style={{ background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>🤖 AI Auto-Classification on Reply (Gemini)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ background: "#f3f4f6", color: "#4b5563", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              🌙 NO_DEAL → Auto-reply sent, status updated
            </span>
            <span style={{ background: "#fff7ed", color: "#c2410c", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              🔥 HOT → Both of you get SMS alert
            </span>
            <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: 12, padding: "4px 12px", borderRadius: 99, fontWeight: 500 }}>
              ✅ DEAL → Both of you get SMS alert
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex" }}>
            {(["Drip", "Pool"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setShowAddForm(false); }}
                style={{
                  padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: "none",
                  borderBottom: tab === t ? "2px solid #ef4444" : "2px solid transparent",
                  color: tab === t ? "#ef4444" : "#6b7280",
                  marginBottom: -1,
                }}
              >
                {t === "Drip" ? "DRIP CAMPAIGN" : "THE POOL"}
                <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
                  {t === "Drip" ? `${dripScripts.length} messages · New agents` : `${poolScripts.length} messages · Qualified agents`}
                </span>
              </button>
            ))}
          </div>

          {/* + Add Step button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              fontSize: 13, padding: "6px 14px", borderRadius: 8, fontWeight: 500, cursor: "pointer",
              border: "1px solid #d1d5db", color: "#374151", background: "#fff",
              marginBottom: 8,
            }}
          >
            + Add Step
          </button>
        </div>

        {/* Pool info */}
        {tab === "Pool" && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#1d4ed8" }}>
            Agents enter The Pool after completing Drip step 4.
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center", padding: 24 }}>{error}</p>
        )}

        {/* Loading */}
        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>Loading scripts...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {displayed.map((s) => (
              <StepCard key={s.id} script={s} onSave={handleSave} onDelete={handleDelete} onTest={handleTest} />
            ))}

            {/* Add Step Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddStep}
                style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 14 }}>
                  New Step — {tab === "Drip" ? `Step ${dripScripts.length + 1}` : `Pool Step ${poolScripts.length + 1}`}
                </p>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <input
                    placeholder="Label (e.g. Follow Up)"
                    value={newStep.label}
                    onChange={(e) => setNewStep({ ...newStep, label: e.target.value })}
                    required
                    style={{ background: "#f9fafb", border: "1px solid #d1d5db", color: "#111827", borderRadius: 8, padding: "8px 12px", fontSize: 13, flex: 1 }}
                  />
                  <input
                    type="number"
                    placeholder="Delay (days)"
                    value={newStep.delay}
                    onChange={(e) => setNewStep({ ...newStep, delay: Number(e.target.value) })}
                    required
                    min={1}
                    style={{ background: "#f9fafb", border: "1px solid #d1d5db", color: "#111827", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: 140 }}
                  />
                </div>
                <textarea
                  placeholder="Message — use [Name] and [Sender] as placeholders"
                  value={newStep.message}
                  onChange={(e) => setNewStep({ ...newStep, message: e.target.value })}
                  required
                  rows={4}
                  style={{ width: "100%", background: "#f9fafb", border: "1px solid #d1d5db", color: "#111827", borderRadius: 8, padding: "10px 12px", fontSize: 13, resize: "none", fontFamily: "inherit", marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    disabled={addingSaving}
                    style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {addingSaving ? "Saving..." : "Save Step"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{ background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Footer note */}
            <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", padding: "12px 0", borderTop: "1px dashed #e5e7eb", marginTop: 4 }}>
              {tab === "Drip"
                ? "📋 After Step 5 → auto-moves to The Pool"
                : "🔁 After Step 9: loops back to Step 5"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

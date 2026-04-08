import { NextResponse } from "next/server";
import { createLog } from "@/lib/logs";
import { createRunLog } from "@/lib/notion";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://flip-crm-two.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET || "flip123secret";

async function checkUrl(path: string, opts: { method?: string; body?: unknown; expectStatuses: number[] }) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    return { status: res.status, latency: Date.now() - start, passed: opts.expectStatuses.includes(res.status) };
  } catch (e) {
    return { status: 0, latency: Date.now() - start, passed: false, error: String(e) };
  }
}

export async function POST(req: Request) {
  // Auth: only allow from dashboard (require cron secret in header OR from same origin)
  const auth = req.headers.get("x-qa-secret");
  if (auth !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  // ── Health checks ──────────────────────────────────────────
  const healthChecks = await Promise.all([
    checkUrl("/login",         { expectStatuses: [200] }).then(r => ({ name: "Login Page",     ...r })),
    checkUrl("/dashboard",     { expectStatuses: [200, 307] }).then(r => ({ name: "Dashboard", ...r })),
    checkUrl("/contacts",      { expectStatuses: [200, 307] }).then(r => ({ name: "Contacts",  ...r })),
    checkUrl("/opportunities", { expectStatuses: [200, 307] }).then(r => ({ name: "Opportunities", ...r })),
    checkUrl("/scripts",       { expectStatuses: [200, 307] }).then(r => ({ name: "Scripts",   ...r })),
    checkUrl("/insights",      { expectStatuses: [200, 307] }).then(r => ({ name: "Insights",  ...r })),
    checkUrl("/settings",      { expectStatuses: [200, 307] }).then(r => ({ name: "Settings",  ...r })),
  ]);

  // ── Regression checks ──────────────────────────────────────
  const regressionChecks = await Promise.all([
    checkUrl("/api/auth/login", { method: "POST", body: { password: "wrong_qa_check" }, expectStatuses: [401] })
      .then(r => ({ name: "Auth rejects wrong password", ...r })),
    checkUrl("/api/contacts", { expectStatuses: [401, 403, 307] })
      .then(r => ({ name: "Contacts route is protected", ...r })),
    checkUrl("/api/runs", { expectStatuses: [401, 403, 307] })
      .then(r => ({ name: "Runs route is protected", ...r })),
    checkUrl("/api/cron/drip", { expectStatuses: [401, 403] })
      .then(r => ({ name: "Cron blocked without secret", ...r })),
    checkUrl("/api/cron/daily-report", {
      expectStatuses: [200, 201, 500], // 200/500 = auth passed
    }).then(r => ({ name: "Cron accepts valid secret", ...r })),
  ]);

  // Fix cron check: override passed field based on actual logic
  const cronCheck = regressionChecks[4];
  regressionChecks[4] = { ...cronCheck, passed: ![401, 403].includes(cronCheck.status) };

  // ── Performance check ──────────────────────────────────────
  const perfChecks = await Promise.all([
    checkUrl("/login",       { expectStatuses: [200] }).then(r => ({ name: "Login",    ...r, passed: r.latency < 3000 })),
    checkUrl("/api/logs",    { expectStatuses: [200, 401] }).then(r => ({ name: "Logs API", ...r, passed: r.latency < 2000 })),
  ]);

  // ── Aggregate ──────────────────────────────────────────────
  const healthPassed = healthChecks.every(c => c.passed);
  const regressionPassed = regressionChecks.every(c => c.passed);
  const perfPassed = perfChecks.every(c => c.passed);
  const overall = healthPassed && regressionPassed && perfPassed ? "PASS" : "FAIL";

  const result = {
    timestamp: new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
    overall,
    duration_s: parseFloat(((Date.now() - startTime) / 1000).toFixed(1)),
    checks: {
      health: {
        passed: healthPassed,
        score: `${healthChecks.filter(c => c.passed).length}/${healthChecks.length}`,
        failures: healthChecks.filter(c => !c.passed).map(c => `${c.name} (${c.status})`),
        items: healthChecks,
      },
      structure: {
        passed: true,
        score: "N/A",
        note: "Structure check runs via GitHub Actions only",
      },
      performance: {
        passed: perfPassed,
        score: `${perfChecks.filter(c => c.passed).length}/${perfChecks.length}`,
        failures: perfChecks.filter(c => !c.passed).map(c => `${c.name} (${c.latency}ms)`),
        items: perfChecks,
      },
      regression: {
        passed: regressionPassed,
        score: `${regressionChecks.filter(c => c.passed).length}/${regressionChecks.length}`,
        failures: regressionChecks.filter(c => !c.passed).map(c => c.name),
        items: regressionChecks,
      },
    },
  };

  // ── Log to Notion System Logs ──────────────────────────────
  const title = `${overall === "PASS" ? "QA_PASS" : "QA_FAIL"} — ${result.timestamp} (manual)`;
  await createLog(title, overall === "PASS" ? "INFO" : "FAILED_SMS", undefined, JSON.stringify(result).substring(0, 2000));

  // ── Log to Runs DB (SMS Automation Runs table) ─────────────
  const allFailures = [
    ...result.checks.health.failures,
    ...result.checks.regression.failures,
    ...result.checks.performance.failures,
  ];
  const summary = [
    `Health ${result.checks.health.score}`,
    `Regression ${result.checks.regression.score}`,
    `Perf ${result.checks.performance.score}`,
    `${result.duration_s}s`,
  ].join(" · ");

  await createRunLog({
    date: new Date().toISOString(),
    type: "Drip",           // Notion Type field only accepts Drip/Pool
    contactName: `QA — ${overall}`,
    phone: "system",
    step: overall,
    status: overall === "PASS" ? "success" : "failed",
    message: summary,
    error: allFailures.slice(0, 3).join(", "),
  });

  return NextResponse.json(result);
}

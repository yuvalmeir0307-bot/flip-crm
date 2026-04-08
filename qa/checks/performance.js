/**
 * Performance Check — Flip CRM QA Agent
 * Measures response times and flags slow endpoints
 */

const BASE_URL = process.env.SITE_URL || 'https://flip-crm-two.vercel.app';

const THRESHOLDS = {
  page_ms: 3000,   // Pages should load in under 3s
  api_ms: 2000,    // APIs should respond in under 2s
  warn_ms: 1500,   // Warn if over 1.5s
};

const ENDPOINTS_TO_MEASURE = [
  { path: '/login', type: 'page', name: 'Login' },
  { path: '/dashboard', type: 'page', name: 'Dashboard' },
  { path: '/api/logs', type: 'api', name: 'Logs API' },
  { path: '/api/runs', type: 'api', name: 'Runs API' },
];

async function measureLatency(endpoint, samples = 2) {
  const latencies = [];

  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    try {
      await fetch(`${BASE_URL}${endpoint.path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      latencies.push(Date.now() - start);
    } catch {
      latencies.push(null);
    }
    if (i < samples - 1) await new Promise(r => setTimeout(r, 500));
  }

  const valid = latencies.filter(l => l !== null);
  const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const max = valid.length ? Math.max(...valid) : null;

  const threshold = endpoint.type === 'page' ? THRESHOLDS.page_ms : THRESHOLDS.api_ms;
  const passed = avg !== null && avg < threshold;
  const warning = avg !== null && avg >= THRESHOLDS.warn_ms && avg < threshold;

  return {
    name: endpoint.name,
    path: endpoint.path,
    type: endpoint.type,
    avg_ms: avg,
    max_ms: max,
    threshold_ms: threshold,
    passed,
    warning,
    error: avg === null ? 'All requests failed' : null,
    flag: avg === null ? 'ERROR' : avg >= threshold ? 'SLOW' : avg >= THRESHOLDS.warn_ms ? 'WARN' : 'OK',
  };
}

async function runPerformanceChecks() {
  console.log('\n⚡ Performance Checks');
  console.log('─'.repeat(50));

  const results = await Promise.all(ENDPOINTS_TO_MEASURE.map(e => measureLatency(e)));

  for (const r of results) {
    const icon = r.flag === 'OK' ? '✅' : r.flag === 'WARN' ? '⚠️' : '❌';
    const latencyStr = r.avg_ms !== null ? `${r.avg_ms}ms avg` : 'FAILED';
    console.log(`${icon} ${r.name} — ${latencyStr} (limit: ${r.threshold_ms}ms) [${r.flag}]`);
  }

  const failed = results.filter(r => !r.passed && !r.warning);
  const warnings = results.filter(r => r.warning);

  return {
    category: 'performance',
    passed: failed.length === 0,
    results,
    summary: {
      total: results.length,
      ok: results.filter(r => r.flag === 'OK').length,
      warnings: warnings.length,
      failed: failed.length,
    },
    failures: failed.map(r => ({ name: r.name, error: `${r.avg_ms}ms — over ${r.threshold_ms}ms limit` })),
    warnings: warnings.map(r => ({ name: r.name, message: `${r.avg_ms}ms — approaching limit (${r.threshold_ms}ms)` })),
  };
}

module.exports = { runPerformanceChecks };

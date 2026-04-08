/**
 * Regression Check — Flip CRM QA Agent
 * Verifies critical flows haven't broken after code changes
 * Tests: auth flow, API contracts, cron endpoint protection
 */

const BASE_URL = process.env.SITE_URL || 'https://flip-crm-two.vercel.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET || 'flip123secret';

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
    redirect: 'manual',
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    signal: AbortSignal.timeout(10000),
    redirect: 'manual',
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

const REGRESSION_TESTS = [
  {
    name: 'Auth: Wrong password returns 401',
    run: async () => {
      const r = await post('/api/auth/login', { password: 'definitively_wrong_password_qa' });
      return { passed: r.status === 401, detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Auth: Login endpoint exists and responds',
    run: async () => {
      const r = await post('/api/auth/login', { password: '' });
      return { passed: [400, 401, 422].includes(r.status), detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Protected routes: /api/contacts requires auth',
    run: async () => {
      const r = await get('/api/contacts');
      return { passed: [401, 403, 307].includes(r.status), detail: `Got ${r.status} (should be auth-gated)` };
    },
  },
  {
    name: 'Protected routes: /api/runs requires auth',
    run: async () => {
      const r = await get('/api/runs');
      return { passed: [401, 403, 307].includes(r.status), detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Cron: /api/cron/drip blocked without secret',
    run: async () => {
      const r = await get('/api/cron/drip');
      return { passed: [401, 403].includes(r.status), detail: `Got ${r.status} (should reject missing secret)` };
    },
  },
  {
    name: 'Cron: /api/cron/daily-report blocked without secret',
    run: async () => {
      const r = await get('/api/cron/daily-report');
      return { passed: [401, 403].includes(r.status), detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Cron: /api/cron/check-duplicates blocked without secret',
    run: async () => {
      const r = await get('/api/cron/check-duplicates');
      return { passed: [401, 403].includes(r.status), detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Cron: Accepts valid CRON_SECRET',
    run: async () => {
      // We just check it doesn't return 401/403 with valid secret
      // Using daily-report to avoid triggering actual drip
      const r = await get('/api/cron/daily-report', {
        Authorization: `Bearer ${CRON_SECRET}`,
      });
      // 200 = ran fine, 500 = ran but had internal error (Notion issue etc.) — both mean auth worked
      const authPassed = ![401, 403].includes(r.status);
      return { passed: authPassed, detail: `Got ${r.status} with valid secret` };
    },
  },
  {
    name: 'Webhook: POST /api/webhook accessible',
    run: async () => {
      // Send minimal payload — should respond (not 404/405)
      const r = await post('/api/webhook', { type: 'qa-test', data: {} });
      return { passed: r.status !== 404 && r.status !== 405, detail: `Got ${r.status}` };
    },
  },
  {
    name: 'Logs API: GET /api/logs responds',
    run: async () => {
      const r = await get('/api/logs');
      return { passed: [200, 401, 403].includes(r.status), detail: `Got ${r.status}` };
    },
  },
];

async function runRegressionTests() {
  console.log('\n🔁 Regression Tests');
  console.log('─'.repeat(50));

  const results = [];

  for (const test of REGRESSION_TESTS) {
    try {
      const result = await test.run();
      results.push({ name: test.name, ...result });
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${test.name} — ${result.detail}`);
    } catch (err) {
      results.push({ name: test.name, passed: false, detail: `Exception: ${err.message}` });
      console.log(`❌ ${test.name} — Exception: ${err.message}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nRegression: ${passed}/${results.length} passed`);

  return {
    category: 'regression',
    passed: failed === 0,
    results,
    summary: { total: results.length, passed, failed },
    failures: results.filter(r => !r.passed).map(r => ({ name: r.name, error: r.detail })),
  };
}

module.exports = { runRegressionTests };

/**
 * Health Check — Flip CRM QA Agent
 * Checks that all pages and API endpoints respond correctly
 */

const BASE_URL = process.env.SITE_URL || 'https://flip-crm-two.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || 'flip123secret';

const PAGES = [
  { path: '/login',         expectedStatus: 200, name: 'Login Page' },
  { path: '/dashboard',     expectedStatus: [200, 307], name: 'Dashboard (redirect if logged out)' },
  { path: '/contacts',      expectedStatus: [200, 307], name: 'Contacts Page' },
  { path: '/opportunities', expectedStatus: [200, 307], name: 'Opportunities Page' },
  { path: '/scripts',       expectedStatus: [200, 307], name: 'Scripts Page' },
  { path: '/insights',      expectedStatus: [200, 307], name: 'Insights Page' },
  { path: '/settings',      expectedStatus: [200, 307], name: 'Settings Page' },
];

const API_ENDPOINTS = [
  {
    path: '/api/auth/login',
    method: 'POST',
    body: { password: 'wrong_password_intentional' },
    expectedStatus: 401,
    name: 'Auth Login (rejects wrong password)',
  },
  {
    path: '/api/logs',
    method: 'GET',
    expectedStatus: [200, 401],
    name: 'Logs API (accessible or auth-gated)',
  },
  {
    path: '/api/runs',
    method: 'GET',
    expectedStatus: [200, 401],
    name: 'Runs API',
  },
];

async function checkPage(page) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${page.path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - start;
    const expectedStatuses = Array.isArray(page.expectedStatus)
      ? page.expectedStatus
      : [page.expectedStatus];

    const passed = expectedStatuses.includes(res.status);

    return {
      name: page.name,
      path: page.path,
      status: res.status,
      latency_ms: latency,
      passed,
      error: passed ? null : `Expected ${expectedStatuses.join(' or ')}, got ${res.status}`,
    };
  } catch (err) {
    return {
      name: page.name,
      path: page.path,
      status: null,
      latency_ms: Date.now() - start,
      passed: false,
      error: `Request failed: ${err.message}`,
    };
  }
}

async function checkAPI(endpoint) {
  const start = Date.now();
  try {
    const options = {
      method: endpoint.method || 'GET',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const res = await fetch(`${BASE_URL}${endpoint.path}`, options);
    const latency = Date.now() - start;

    const expectedStatuses = Array.isArray(endpoint.expectedStatus)
      ? endpoint.expectedStatus
      : [endpoint.expectedStatus];

    const passed = expectedStatuses.includes(res.status);

    return {
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method || 'GET',
      status: res.status,
      latency_ms: latency,
      passed,
      error: passed ? null : `Expected ${expectedStatuses.join(' or ')}, got ${res.status}`,
    };
  } catch (err) {
    return {
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method || 'GET',
      status: null,
      latency_ms: Date.now() - start,
      passed: false,
      error: `Request failed: ${err.message}`,
    };
  }
}

async function runHealthChecks() {
  console.log(`\n🔍 Health Checks — ${BASE_URL}`);
  console.log('─'.repeat(50));

  const pageResults = await Promise.all(PAGES.map(checkPage));
  const apiResults = await Promise.all(API_ENDPOINTS.map(checkAPI));

  const allResults = [...pageResults, ...apiResults];

  for (const r of allResults) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name} — ${r.status ?? 'NO RESPONSE'} (${r.latency_ms}ms)${r.error ? ` — ${r.error}` : ''}`);
  }

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  console.log(`\nHealth: ${passed}/${allResults.length} passed`);

  return {
    category: 'health',
    passed: failed === 0,
    results: allResults,
    summary: { total: allResults.length, passed, failed },
    failures: allResults.filter(r => !r.passed),
  };
}

module.exports = { runHealthChecks };

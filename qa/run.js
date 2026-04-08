#!/usr/bin/env node
/**
 * Flip CRM — QA Agent
 * Runs twice daily (8:00 AM + 8:00 PM Israel time via GitHub Actions)
 *
 * Checks:
 *   1. Health      — all pages and API endpoints respond correctly
 *   2. Structure   — no critical files missing after code changes
 *   3. Performance — response times within acceptable limits
 *   4. Regression  — auth, protected routes, cron protection still working
 *
 * Output:
 *   - Console log (GitHub Actions artifact)
 *   - Notion System Logs DB
 *   - SMS via OpenPhone (Yuval always, Yahav on failures)
 */

const { runHealthChecks }      = require('./checks/health');
const { runStructureCheck }    = require('./checks/structure');
const { runPerformanceChecks } = require('./checks/performance');
const { runRegressionTests }   = require('./checks/regression');
const { logQARun }             = require('./utils/logger');
const { sendAlerts }           = require('./utils/alert');

async function main() {
  const startTime = Date.now();
  const runTime = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

  console.log('═'.repeat(60));
  console.log(`  Flip CRM QA Agent — ${runTime}`);
  console.log('═'.repeat(60));

  // Run all checks
  const [health, structure, performance, regression] = await Promise.all([
    runHealthChecks(),
    runStructureCheck(),
    runPerformanceChecks(),
    runRegressionTests(),
  ]);

  const runResult = { health, structure, performance, regression };
  const allPassed = [health, structure, performance, regression].every(r => r.passed);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`  RESULT: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ FAILURES DETECTED'}`);
  console.log(`  Duration: ${duration}s`);
  console.log('═'.repeat(60));

  // Log to Notion
  await logQARun(runResult, Date.now() - startTime);

  // Send SMS
  await sendAlerts(runResult);

  // Exit with error code if anything failed (GitHub Actions will mark as failed)
  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('QA Agent crashed:', err);
  process.exit(1);
});

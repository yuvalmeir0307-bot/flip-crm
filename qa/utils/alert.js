/**
 * Alert — Flip CRM QA Agent
 * Sends SMS to Yuval (and optionally Yahav) via OpenPhone when failures detected
 */

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;
const YUVAL_PERSONAL_PHONE = process.env.YUVAL_PERSONAL_PHONE;
const YAHAV_PERSONAL_PHONE = process.env.YAHAV_PERSONAL_PHONE;
const YUVAL_PHONE_NUMBER = process.env.YUVAL_PHONE_NUMBER;

async function sendSMS(to, body) {
  if (!OPENPHONE_API_KEY || !YUVAL_PHONE_NUMBER) {
    console.warn('⚠️  OpenPhone env vars missing — skipping SMS alert');
    return false;
  }

  if (!to) {
    console.warn('⚠️  No recipient phone — skipping SMS');
    return false;
  }

  try {
    const res = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: OPENPHONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: YUVAL_PHONE_NUMBER,
        to: [to],
        content: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`SMS failed to ${to}:`, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('SMS error:', err.message);
    return false;
  }
}

function buildAlertMessage(runResult, timestamp) {
  const { health, structure, performance, regression } = runResult;

  const failureLines = [];

  if (!health.passed) {
    const names = health.failures.map(f => f.name).join(', ');
    failureLines.push(`Health: ${names}`);
  }
  if (!structure.passed) {
    const files = structure.failures.map(f => f.name).join(', ');
    failureLines.push(`Missing files: ${files}`);
  }
  if (!performance.passed) {
    const slow = performance.failures.map(f => f.name).join(', ');
    failureLines.push(`Slow: ${slow}`);
  }
  if (!regression.passed) {
    const tests = regression.failures.map(f => f.name).join(', ');
    failureLines.push(`Regression: ${tests}`);
  }

  return [
    `🔴 Flip CRM QA FAIL — ${timestamp}`,
    '',
    failureLines.join('\n'),
    '',
    'Check: https://flip-crm-two.vercel.app',
  ].join('\n');
}

function buildSuccessMessage(runResult, timestamp) {
  const { health, structure, performance, regression } = runResult;

  const lines = [
    `✅ Flip CRM QA PASS — ${timestamp}`,
    '',
    `Health: ${health.summary.passed}/${health.summary.total}`,
    `Files: ${structure.summary.present}/${structure.summary.total}`,
    `Performance: ${performance.summary.ok} OK${performance.summary.warnings > 0 ? `, ${performance.summary.warnings} warnings` : ''}`,
    `Regression: ${regression.summary.passed}/${regression.summary.total}`,
  ];

  if (structure.new_files) {
    const newCount = structure.new_files.api_routes.length + structure.new_files.lib_files.length + structure.new_files.pages.length;
    if (newCount > 0) lines.push(`📁 ${newCount} new file(s) added since baseline`);
  }

  return lines.join('\n');
}

async function sendAlerts(runResult) {
  const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const allPassed = ['health', 'structure', 'performance', 'regression']
    .every(k => runResult[k]?.passed);

  console.log('\n📲 Sending alerts...');

  if (allPassed) {
    // On success: only send to Yuval (quiet success report, not spam)
    const message = buildSuccessMessage(runResult, timestamp);
    const sent = await sendSMS(YUVAL_PERSONAL_PHONE, message);
    console.log(sent ? '✅ Success report sent to Yuval' : '⚠️  SMS skipped');
  } else {
    // On failure: alert BOTH partners
    const message = buildAlertMessage(runResult, timestamp);
    const [yuvalSent, yahavSent] = await Promise.all([
      sendSMS(YUVAL_PERSONAL_PHONE, message),
      sendSMS(YAHAV_PERSONAL_PHONE, message),
    ]);
    console.log(yuvalSent ? '✅ Alert sent to Yuval' : '⚠️  Yuval SMS skipped');
    console.log(yahavSent ? '✅ Alert sent to Yahav' : '⚠️  Yahav SMS skipped');
  }
}

module.exports = { sendAlerts };

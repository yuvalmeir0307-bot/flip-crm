/**
 * Notion Logger — Flip CRM QA Agent
 * Logs all QA results to the System Logs DB in an organized format
 */

const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_LOGS_DB = process.env.NOTION_LOGS_DB || 'e8199147-19bf-418f-b5c5-9f4173eb4fb6';

async function createNotionLog({ title, type, details, phone = '' }) {
  if (!NOTION_API_TOKEN) {
    console.warn('⚠️  No NOTION_API_TOKEN — skipping Notion log');
    return null;
  }

  // Truncate details to 2000 chars (Notion limit)
  const truncated = details.length > 2000 ? details.substring(0, 1990) + '…' : details;

  const body = {
    parent: { database_id: NOTION_LOGS_DB },
    properties: {
      Title: { title: [{ text: { content: title } }] },
      Type: { select: { name: type } },
      Details: { rich_text: [{ text: { content: truncated } }] },
      Resolved: { checkbox: false },
    },
  };

  if (phone) {
    body.properties.Phone = { rich_text: [{ text: { content: phone } }] };
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Notion log failed:', err);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Notion logger error:', err.message);
    return null;
  }
}

function formatQAReport(runResult, timestamp) {
  const { health, structure, performance, regression } = runResult;
  const allPassed = [health, structure, performance, regression].every(r => r.passed);

  const lines = [
    `QA Run — ${timestamp}`,
    `Overall: ${allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}`,
    '',
    `Health:      ${health.summary.passed}/${health.summary.total} ✓`,
    `Structure:   ${structure.summary.present}/${structure.summary.total} files present`,
    `Performance: ${performance.summary.ok} OK, ${performance.summary.warnings} warnings, ${performance.summary.failed} failed`,
    `Regression:  ${regression.summary.passed}/${regression.summary.total} ✓`,
  ];

  if (!allPassed) {
    lines.push('', '--- FAILURES ---');

    for (const check of [health, structure, performance, regression]) {
      if (!check.passed && check.failures?.length > 0) {
        lines.push(`\n[${check.category.toUpperCase()}]`);
        for (const f of check.failures) {
          lines.push(`  • ${f.name || f.file}: ${f.error}`);
        }
      }
    }
  }

  if (performance.warnings?.length > 0) {
    lines.push('', '--- PERFORMANCE WARNINGS ---');
    for (const w of performance.warnings) {
      lines.push(`  ⚠️  ${w.name}: ${w.message}`);
    }
  }

  if (structure.new_files) {
    const { api_routes, lib_files, pages } = structure.new_files;
    const hasNew = api_routes.length + lib_files.length + pages.length > 0;
    if (hasNew) {
      lines.push('', '--- NEW FILES (since baseline) ---');
      [...api_routes, ...lib_files, ...pages].forEach(f => lines.push(`  + ${f}`));
    }
  }

  return lines.join('\n');
}

async function logQARun(runResult) {
  const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const allPassed = ['health', 'structure', 'performance', 'regression']
    .every(k => runResult[k]?.passed);

  const title = allPassed
    ? `✅ QA PASS — ${timestamp}`
    : `❌ QA FAIL — ${timestamp}`;

  const type = allPassed ? 'INFO' : 'FAILED_SMS'; // reuse existing Notion log types
  const details = formatQAReport(runResult, timestamp);

  console.log('\n📋 Logging to Notion...');
  const page = await createNotionLog({ title, type, details });

  if (page) {
    console.log('✅ Logged to Notion');
  }

  return { title, details, allPassed };
}

module.exports = { logQARun, formatQAReport };

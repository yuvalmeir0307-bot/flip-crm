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

function formatQAReport(runResult, timestamp, durationMs) {
  const { health, structure, performance, regression } = runResult;
  const allPassed = [health, structure, performance, regression].every(r => r.passed);

  // Store as structured JSON so the Settings page can parse and display it cleanly
  const structured = {
    timestamp,
    overall: allPassed ? 'PASS' : 'FAIL',
    duration_s: durationMs ? parseFloat((durationMs / 1000).toFixed(1)) : null,
    checks: {
      health: {
        passed: health.passed,
        score: `${health.summary.passed}/${health.summary.total}`,
        failures: health.failures?.map(f => f.name) || [],
      },
      structure: {
        passed: structure.passed,
        score: `${structure.summary.present}/${structure.summary.total}`,
        missing: structure.failures?.map(f => f.name) || [],
        new_files: (structure.new_files?.api_routes?.length || 0) +
                   (structure.new_files?.lib_files?.length || 0) +
                   (structure.new_files?.pages?.length || 0),
        new_file_list: [
          ...(structure.new_files?.api_routes || []),
          ...(structure.new_files?.lib_files || []),
          ...(structure.new_files?.pages || []),
        ],
      },
      performance: {
        passed: performance.passed,
        score: `${performance.summary.ok}/${performance.summary.total}`,
        warnings: performance.summary.warnings,
        slow: performance.failures?.map(f => `${f.name} (${f.error})`) || [],
        warns: performance.warnings?.map(w => `${w.name}: ${w.message}`) || [],
      },
      regression: {
        passed: regression.passed,
        score: `${regression.summary.passed}/${regression.summary.total}`,
        failures: regression.failures?.map(f => f.name) || [],
      },
    },
  };

  return JSON.stringify(structured);
}

async function logQARun(runResult, durationMs) {
  const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const allPassed = ['health', 'structure', 'performance', 'regression']
    .every(k => runResult[k]?.passed);

  const title = allPassed
    ? `QA_PASS — ${timestamp}`
    : `QA_FAIL — ${timestamp}`;

  const type = allPassed ? 'INFO' : 'FAILED_SMS';
  const details = formatQAReport(runResult, timestamp, durationMs);

  console.log('\n📋 Logging to Notion...');
  const page = await createNotionLog({ title, type, details });

  if (page) {
    console.log('✅ Logged to Notion');
  }

  return { title, details, allPassed };
}

module.exports = { logQARun, formatQAReport };

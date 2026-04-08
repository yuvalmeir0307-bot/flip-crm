/**
 * Structure Check — Flip CRM QA Agent
 * Verifies critical files haven't been deleted or moved by mistake
 * Alerts when new unexpected files appear in critical directories
 */

const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.join(__dirname, '../baseline/structure.json');
const PROJECT_ROOT = path.join(__dirname, '../../');

function fileExists(relativePath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

function scanDirectory(dir, exclude = ['node_modules', '.next', '.git', '.vercel']) {
  const results = [];
  const fullPath = path.join(PROJECT_ROOT, dir);

  if (!fs.existsSync(fullPath)) return results;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const rel = path.relative(PROJECT_ROOT, path.join(current, entry.name)).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name));
      } else {
        results.push(rel);
      }
    }
  }

  walk(fullPath);
  return results;
}

async function runStructureCheck() {
  console.log('\n📁 Structure Check');
  console.log('─'.repeat(50));

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
  const results = [];

  // 1. Check all critical files exist
  const allCritical = [
    ...baseline.critical_files,
    ...baseline.critical_pages,
    ...baseline.critical_api_routes,
    ...baseline.critical_libs,
    ...baseline.critical_components,
    ...baseline.critical_skills,
  ];

  for (const file of allCritical) {
    const exists = fileExists(file);
    const result = {
      file,
      passed: exists,
      issue: exists ? null : `MISSING: ${file}`,
    };
    results.push(result);
    if (!exists) {
      console.log(`❌ MISSING: ${file}`);
    }
  }

  const missing = results.filter(r => !r.passed);

  // 2. Check for unexpected files in critical directories
  const currentApiRoutes = scanDirectory('app/api');
  const currentLibFiles = scanDirectory('lib');
  const currentPageFiles = scanDirectory('app').filter(f => f.endsWith('page.tsx'));

  // Find new API routes (not in baseline)
  const baselineApiFiles = baseline.critical_api_routes;
  const newApiRoutes = currentApiRoutes.filter(f =>
    f.endsWith('route.ts') && !baselineApiFiles.includes(f)
  );

  // Find new lib files (not in baseline)
  const baselineLibFiles = baseline.critical_libs;
  const newLibFiles = currentLibFiles.filter(f =>
    f.endsWith('.ts') && !baselineLibFiles.includes(f)
  );

  // Find new pages (not in baseline)
  const baselinePages = baseline.critical_pages;
  const newPages = currentPageFiles.filter(f => !baselinePages.includes(f));

  if (newApiRoutes.length > 0) {
    console.log(`\n🆕 New API routes (since baseline):`);
    newApiRoutes.forEach(f => console.log(`   + ${f}`));
  }
  if (newLibFiles.length > 0) {
    console.log(`\n🆕 New lib files:`);
    newLibFiles.forEach(f => console.log(`   + ${f}`));
  }
  if (newPages.length > 0) {
    console.log(`\n🆕 New pages:`);
    newPages.forEach(f => console.log(`   + ${f}`));
  }

  const passed = missing.length === 0;

  if (passed) {
    console.log(`✅ All ${allCritical.length} critical files present`);
  } else {
    console.log(`\n❌ ${missing.length} critical file(s) missing`);
  }

  return {
    category: 'structure',
    passed,
    results,
    summary: {
      total: allCritical.length,
      present: allCritical.length - missing.length,
      missing: missing.length,
    },
    new_files: { api_routes: newApiRoutes, lib_files: newLibFiles, pages: newPages },
    failures: missing.map(r => ({ name: r.file, error: r.issue })),
  };
}

module.exports = { runStructureCheck };

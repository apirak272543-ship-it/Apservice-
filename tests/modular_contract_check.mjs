// Verifies the compatibility-first ES module layer under /modules stays consistent
// with the classic inline scripts it wraps. Two things must always hold:
//
//   1. Every module file under /modules must be syntactically valid and importable
//      in isolation (no accidental top-level DOM/window access that would break
//      import in a plain Node ESM context).
//   2. Every action name declared in LEGACY_PUBLIC_FUNCTIONS (modules/legacy-bridge.js)
//      — the functions markup calls via onclick="..." — must still be defined
//      somewhere in index.html or admin_contact_ui_patch.js. If a name is migrated
//      into a module, this check forces the developer to also expose it (e.g. via
//      publishLegacyAction) so old markup never silently breaks.
//
// Run with: node tests/modular_contract_check.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const modulesDir = path.join(root, 'modules');

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listJsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const results = [];

// 1. Syntax + isolated importability of every module file.
const jsFiles = listJsFiles(modulesDir);
for (const file of jsFiles) {
  const rel = path.relative(root, file);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    results.push([`Module syntax valid: ${rel}`, true, '']);
  } catch (error) {
    results.push([`Module syntax valid: ${rel}`, false, String(error.stderr || error.message)]);
  }
}

for (const file of jsFiles) {
  const rel = path.relative(root, file);
  try {
    await import(`file://${file}?t=${Date.now()}`);
    results.push([`Module imports without error: ${rel}`, true, '']);
  } catch (error) {
    results.push([`Module imports without error: ${rel}`, false, String(error.message)]);
  }
}

// 2. Legacy action contract: every onclick-bound global still exists somewhere.
const bridgeSource = readFileSync(path.join(modulesDir, 'legacy-bridge.js'), 'utf8');
const listMatch = bridgeSource.match(/LEGACY_PUBLIC_FUNCTIONS = Object\.freeze\(\[(.*?)\]\)/s);
if (!listMatch) {
  results.push(['Found LEGACY_PUBLIC_FUNCTIONS list in legacy-bridge.js', false, 'pattern not found']);
} else {
  const names = [...listMatch[1].matchAll(/'([a-zA-Z0-9_]+)'/g)].map((m) => m[1]);
  const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
  const patchJs = readFileSync(path.join(root, 'admin_contact_ui_patch.js'), 'utf8');
  const combined = indexHtml + '\n' + patchJs;
  const isDefined = (name) => (
    new RegExp(`function ${name}\\s*\\(`).test(combined)
    || new RegExp(`window\\.${name}\\s*=`).test(combined)
    || new RegExp(`\\b${name}\\s*=\\s*(async\\s*)?\\(`).test(combined)
    || new RegExp(`\\b${name}\\s*=\\s*(async\\s*)?function`).test(combined)
  );
  const missing = names.filter((name) => !isDefined(name));
  results.push([
    `Legacy action contract: all ${names.length} onclick-bound globals still defined`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : '',
  ]);
}

// 3. index.html must actually load the module bootstrapper (otherwise the whole
//    facade layer is dead code that never runs).
const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
results.push([
  'index.html loads modules/boot.js as an ES module',
  /<script[^>]*type="module"[^>]*src="\.\/modules\/boot\.js/.test(indexHtml),
  '',
]);

let failed = 0;
for (const [label, ok, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${ok ? '' : `\n  ${detail}`}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.log(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log(`\nPASS: module contract holds (${results.length} checks).`);

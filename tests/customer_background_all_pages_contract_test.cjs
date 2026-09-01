const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(path.join(root, 'customer')).filter(name => name.endsWith('.html'));
const cssVersions = new Set();
const runtimeVersions = new Set();
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, 'customer', page), 'utf8');
  const css = html.match(/customer-ui-polish\.css\?v=([^" ]+)/);
  const runtime = html.match(/customer-visual-runtime\.js\?v=([^" ]+)/);
  if (css) cssVersions.add(css[1]);
  assert.ok(runtime, `${page} must load customer visual runtime`);
  runtimeVersions.add(runtime[1]);
}
assert.equal(cssVersions.size, 1, 'all Customer pages with polish CSS must use one cache-busting version');
assert.equal(runtimeVersions.size, 1, 'all Customer pages must use one visual runtime version');
const css = fs.readFileSync(path.join(root, 'customer/customer-ui-polish.css'), 'utf8');
assert.match(css, /body\[data-page\]::before[\s\S]*?z-index:\s*0/);
assert.match(css, /body\[data-page\] > \*[\s\S]*?z-index:\s*1/);
const runtime = fs.readFileSync(path.join(root, 'customer/customer-visual-runtime.js'), 'utf8');
assert.match(runtime, /visuals\.pages\[page\]/);
assert.match(runtime, /--customer-admin-background-url/);
console.log(`customer_background_all_pages_contract_test: PASS (${pages.length} pages)`);

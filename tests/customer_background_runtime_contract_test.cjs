const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'customer/customer-visual-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'customer/customer-ui-polish.css'), 'utf8');
const pages = fs.readdirSync(path.join(root, 'customer')).filter(name => name.endsWith('.html'));

assert.match(runtime, /backgroundUrl \|\| input\?\.background_url \|\| input\?\.background/);
assert.match(runtime, /body\.style\.setProperty\('--customer-admin-background-url'/);
assert.match(runtime, /body\.dataset\.adminBackground = 'true'/);
assert.match(runtime, /forceFresh: true/);
assert.match(css, /body\[data-page\]::before/);
assert.match(css, /var\(--customer-admin-background-url, none\)/);
assert.equal(pages.length, 22, 'Customer must keep the 22-page MPA surface');
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, 'customer', page), 'utf8');
  assert.match(html, /customer-visual-runtime\.js\?v=customer-visual-runtime-v2-db-background/, `${page} must load the current background runtime`);
  if (html.includes('customer-ui-polish.css')) assert.match(html, /customer-ui-polish\.css\?v=customer-ui-polish-v2(?:-[^"']+)?/, `${page} must load the current background CSS`);
}
console.log('customer_background_runtime_contract_test: PASS');

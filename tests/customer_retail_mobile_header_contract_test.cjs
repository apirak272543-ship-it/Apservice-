const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'customer', 'customer-retail.css'), 'utf8');
const retail = fs.readFileSync(path.join(root, 'customer', 'retail.html'), 'utf8');
const checkout = fs.readFileSync(path.join(root, 'customer', 'retail-checkout.html'), 'utf8');

assert.match(css, /@media\(max-width:720px\)\{body\[data-page\^="retail"\] \.retail-topbar/, 'Retail must define a compact mobile header');
assert.match(css, /body\[data-page\^="retail"\] \.retail-toplinks\{display:none\}/, 'Retail must hide duplicate desktop links on mobile because Customer bottom navigation remains available');
assert.match(css, /retail-brand small\{max-width:calc\(100vw - 84px\)/, 'Retail brand subtitle must stay within mobile viewport');
assert.match(retail, /customer-retail\.css\?v=retail-v2-mobile-header/, 'Retail entrypoint must request mobile header revision');
assert.match(checkout, /customer-retail\.css\?v=retail-v2-mobile-header/, 'Retail checkout must request the shared mobile header revision');

console.log('customer retail mobile header contract: PASS');

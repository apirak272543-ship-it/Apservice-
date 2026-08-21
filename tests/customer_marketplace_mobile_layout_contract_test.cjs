const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'customer', 'customer-unified-theme.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'customer', 'customer-app.js'), 'utf8');
const marketplace = fs.readFileSync(path.join(root, 'customer', 'marketplace.html'), 'utf8');

assert.match(css, /body\[data-page="marketplace"\] \.mpa-grid\.cards\{grid-template-columns:minmax\(0,1fr\)/, 'Marketplace must use a single balanced card column on mobile');
assert.match(css, /body\[data-page="marketplace"\] \.customer-store-card\{display:grid;grid-template-columns:104px minmax\(0,1fr\)/, 'Marketplace card must distribute media and copy horizontally on mobile');
assert.match(css, /body\[data-page="marketplace"\] \.customer-store-meta\{display:flex;align-items:center;justify-content:space-between/, 'Marketplace price and detail action must remain balanced');
assert.match(app, /customer-unified-theme\.css\?v=customer-unified-v2-marketplace-card/, 'Runtime must request the marketplace-card theme revision');
assert.match(marketplace, /marketplace=marketplace-card-v2/, 'Marketplace entrypoint must request the fresh Customer runtime revision');

console.log('customer marketplace mobile layout contract: PASS');

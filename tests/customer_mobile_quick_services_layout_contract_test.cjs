const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'customer', 'customer-design-system.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'customer', 'customer-mobile-native.js'), 'utf8');

assert.match(runtime, /customer-native-quick-actions/, 'Home enhancer must render the quick-service row');
assert.match(runtime, /stores\.html\?service=food/, 'Food quick service must remain available');
assert.match(runtime, /retail\.html/, 'Retail quick service must remain available');
assert.match(runtime, /parcel\.html/, 'A-to-B quick service must remain available');
assert.match(css, /\.customer-native-quick-actions\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, 'Quick services must use a three-column mobile grid rather than hidden horizontal overflow');
assert.doesNotMatch(css, /\.customer-native-quick-actions\{[^}]*overflow:auto/, 'Quick services must not require undisclosed horizontal scrolling');
assert.match(css, /\.customer-native-quick-actions a\{display:flex;min-width:0/, 'Quick-service cards must shrink within their grid cells');
assert.match(css, /text-overflow:ellipsis/, 'Long quick-service labels must degrade predictably instead of overflowing');

console.log('customer mobile quick-services layout contract: PASS');

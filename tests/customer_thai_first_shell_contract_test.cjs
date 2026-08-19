const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
assert.match(app, /บริการเดลิเวอรีและบริการในชีวิตประจำวัน/, 'Customer default brand tagline must be Thai-first');
assert.doesNotMatch(app, /data-brand-tag>Delivery & Everyday Services</, 'Customer default brand tagline must not expose English system copy');
assert.doesNotMatch(app, /AP SERVICE · DELIVERY & EVERYDAY SERVICES/, 'Customer hero eyebrow must not expose English system copy');
console.log('customer thai-first shell contract: PASS');

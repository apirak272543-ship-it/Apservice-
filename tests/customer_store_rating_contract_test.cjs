const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'customer', 'customer-app.js'), 'utf8');
const checks = [
  ['defines an explicit no-rating label', source.includes("const storeRatingLabel = value =>") && source.includes("'ยังไม่มีคะแนน'")],
  ['only formats a rating when it is a positive finite value', source.includes('Number.isFinite(rating) && rating > 0')],
  ['store card uses the shared rating label', source.includes('h(storeRatingLabel(store.rating))')],
  ['store card no longer fabricates a zero-star rating', !source.includes('Number(store.rating || 0).toFixed(1)')],
  ['store card keeps the existing menu route', source.includes('href="store.html?id=${encodeURIComponent(store.id)}"')],
];

for (const [label, passed] of checks) {
  if (!passed) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (process.exitCode) process.exit(1);
console.log('Customer store rating contract checks passed.');

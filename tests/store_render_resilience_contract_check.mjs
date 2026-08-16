import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const supermarket = fs.readFileSync(new URL('supermarket_category_distance_patch.js', root), 'utf8');

const checks = [
  ['store cards still use openStore', html.includes('onclick="openStore(')],
  ['broken media has a visible fallback sibling', html.includes('asset-fallback') && html.includes('nextElementSibling.hidden=false')],
  ['setMediaContent handles missing elements', html.includes('if(!element)return')],
  ['observer is scheduled and coalesced', supermarket.includes('observeScheduled') && supermarket.includes('MutationObserver(() =>')],
  ['distance input event only fires on value change', supermarket.includes('if (fieldValueChanged) field?.dispatchEvent')],
  ['safe store opening reports errors instead of silently freezing', supermarket.includes('__safeStoreOpen') && supermarket.includes('เปิดหน้าร้านไม่สำเร็จ')],
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
console.log('Store render resilience contract checks passed.');

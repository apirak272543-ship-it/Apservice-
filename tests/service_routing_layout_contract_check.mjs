import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const patch = fs.readFileSync(new URL('service_routing_layout_patch.js', root), 'utf8');

const checks = [
  ['food service keeps the general stores target', /data-feature="food"[^>]+onclick="requireLoginThen\('stores'\)"/.test(html)],
  ['home supermarket card has its dedicated action', /id="service-supermarket"[^>]+data-feature="supermarket"[^>]+onclick="openSupermarkets\(\)"/.test(html)],
  ['general store route resets category to all', patch.includes("target === 'stores'") && patch.includes("ux.activeStoreCategory = 'all'" )],
  ['supermarket route selects only supermarket category', patch.includes("ux.activeStoreCategory = 'store-supermarket'" )],
  ['route patch loads after supermarket patch', html.indexOf('supermarket_category_distance_patch.js') < html.indexOf('service_routing_layout_patch.js')],
  ['mobile service chooser is compact', patch.includes('#view-home .services{gap:8px') && patch.includes('#view-home .service{padding:12px;min-height:0}')],
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
console.log('Service routing and layout contract checks passed.');

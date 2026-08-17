const fs = require('fs');
const assert = require('assert');

const architecture = fs.readFileSync('ARCHITECTURE_CONTRACT.md', 'utf8');
const mpaRequirement = fs.readFileSync('docs/MULTI_PAGE_ARCHITECTURE_REQUIREMENT.md', 'utf8');
const routes = fs.readFileSync('docs/PAGE_ROUTE_MANIFEST.md', 'utf8');
const dependencies = fs.readFileSync('docs/DEPENDENCY_MAP.md', 'utf8');
const store = fs.readFileSync('store.html', 'utf8');
const rider = fs.readFileSync('rider.html', 'utf8');

assert.match(architecture, /Multi-Page Architecture \(MPA\)/, 'Architecture Contract ต้องบังคับ MPA');
assert.match(architecture, /Admin is the control plane/, 'Architecture Contract ต้องกำหนด Admin Control Plane');
assert.match(mpaRequirement, /not a compliant final architecture/, 'ต้องระบุว่า copy monolith ไม่ใช่ final architecture');
assert.match(dependencies, /not MPA final/, 'Dependency Map ต้องระบุว่า compatibility monolith ไม่ใช่ MPA final');

for (const route of [
  '/customer/stores.html', '/admin/dashboard.html', '/merchant/orders.html', '/rider/delivery.html?id='
]) assert.ok(routes.includes(route), `Route manifest ต้องมี ${route}`);

for (const [name, source] of [['Merchant', store], ['Rider', rider]]) {
  assert.match(source, /shared\/ap-service-core\.js/, `${name} ต้องโหลด Shared Core`);
  assert.match(source, /APServiceCore\?\.order\?\.canTransition/, `${name} ต้อง validate order transition ผ่าน Shared Core`);
}

console.log('multi-page architecture contract: PASS');

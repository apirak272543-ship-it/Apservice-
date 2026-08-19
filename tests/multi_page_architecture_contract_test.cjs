const fs = require('fs');
const assert = require('assert');

const architecture = fs.readFileSync('ARCHITECTURE_CONTRACT.md', 'utf8');
const mpaRequirement = fs.readFileSync('docs/MULTI_PAGE_ARCHITECTURE_REQUIREMENT.md', 'utf8');
const routes = fs.readFileSync('docs/PAGE_ROUTE_MANIFEST.md', 'utf8');
const dependencies = fs.readFileSync('docs/DEPENDENCY_MAP.md', 'utf8');
const customerRoutes = ['customer/stores.html', 'customer/store.html', 'customer/checkout.html', 'customer/orders.html'];

assert.match(architecture, /Multi-Page Architecture \(MPA\)/, 'Architecture Contract ต้องบังคับ MPA');
assert.match(architecture, /Admin is the control plane/, 'Architecture Contract ต้องกำหนด Admin Control Plane');
assert.match(mpaRequirement, /not a compliant final architecture/, 'ต้องระบุว่า copy monolith ไม่ใช่ final architecture');
assert.match(dependencies, /not MPA final/, 'Dependency Map ต้องระบุว่า compatibility monolith ไม่ใช่ MPA final');
for (const route of ['/customer/stores.html', '/admin/dashboard.html', '/merchant/orders.html', '/rider/delivery.html?id=']) assert.ok(routes.includes(route), `Route manifest ต้องมี ${route}`);
for (const file of customerRoutes) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /shared\/ap-service-core\.js/, `${file} ต้องโหลด Shared Core`);
  assert.match(source, /customer-app\.js/, `${file} ต้องโหลด Customer runtime ที่เรียก Shared Core`);
}
for (const legacyFile of ['store.html', 'rider.html']) {
  assert.equal(fs.existsSync(legacyFile), false, `Customer repository ไม่ควรมี ${legacyFile} root monolith หลังแยก application`);
}

console.log('multi-page architecture contract: PASS');

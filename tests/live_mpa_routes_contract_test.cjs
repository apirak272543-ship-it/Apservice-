const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('shared/ap-service-mpa.js', 'utf8');
const stylesheet = fs.readFileSync('shared/ap-service-mpa.css', 'utf8');
assert.match(runtime, /requireRole/, 'Shared MPA runtime ต้องมี role guard');
assert.match(runtime, /auth\/v1\/\$\{normalizePath\(path\)\}/, 'Shared MPA runtime ต้องเชื่อม Supabase Auth');
assert.match(runtime, /token\?grant_type=password/, 'Shared MPA runtime ต้องรองรับการเข้าสู่ระบบด้วย Supabase Auth');
assert.match(runtime, /rest\/v1/, 'Shared MPA runtime ต้องเชื่อม Supabase REST endpoint');
assert.match(stylesheet, /mpa-loading/, 'Shared MPA shell ต้องมี loading state');
assert.match(stylesheet, /mpa-error/, 'Shared MPA shell ต้องมี error state');

const routes = {
  customer: ['index.html', 'stores.html', 'store.html', 'checkout.html', 'orders.html', 'profile.html'],
  admin: ['index.html', 'login.html', 'dashboard.html', 'orders.html', 'stores.html', 'customers.html', 'riders.html', 'finance.html', 'notifications.html', 'ai-workspace.html', 'settings.html'],
  merchant: ['index.html', 'login.html', 'dashboard.html', 'orders.html', 'menu.html', 'store.html', 'finance.html', 'settings.html'],
  rider: ['index.html', 'login.html', 'dashboard.html', 'jobs.html', 'delivery.html', 'earnings.html', 'profile.html', 'settings.html'],
};

for (const [app, files] of Object.entries(routes)) {
  for (const file of files) {
    const path = `${app}/${file}`;
    assert.ok(fs.existsSync(path), `${path} ต้องมีอยู่จริง`);
    const source = fs.readFileSync(path, 'utf8');
    if (!['admin/login.html', 'merchant/index.html', 'rider/index.html'].includes(path)) {
      assert.match(source, /shared\/ap-service-mpa\.js/, `${path} ต้องโหลด Shared MPA runtime`);
      assert.match(source, /shared\/ap-service-core\.js/, `${path} ต้องโหลด Shared Core`);
    }
    assert.doesNotMatch(source, /<script[^>]+src="\.\.\/(?:index|admin|store|rider)\.html/i, `${path} ห้ามโหลด Monolith เป็น runtime`);
  }
}

for (const [app, runtimeFile] of [['customer', 'customer-app.js'], ['admin', 'admin-app.js'], ['merchant', 'merchant-app.js'], ['rider', 'rider-app.js']]) {
  const source = fs.readFileSync(`${app}/${runtimeFile}`, 'utf8');
  assert.match(source, /APServiceMPA/, `${app} ต้องใช้ Shared MPA runtime`);
  assert.match(source, /APServiceCore/, `${app} ต้องใช้ Shared Core`);
}

console.log('live MPA routes contract: PASS');

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const bootstrap = fs.readFileSync('admin-dedicated-bootstrap.js', 'utf8');

assert.match(adminHtml, /<title>AP Service \| Dedicated Admin Application<\/title>/, 'Dedicated app ต้องใช้ title ของ Admin');
assert.match(adminHtml, /id="view-admin"/, 'Dedicated app ต้องมี Admin view จริง');
assert.match(adminHtml, /id="adminTabs"/, 'Dedicated app ต้องมี Admin navigation จริง');
assert.match(adminHtml, /id="admin-overview"/, 'Dedicated app ต้องมี Dashboard จริง');
assert.match(adminHtml, /id="admin-orders"/, 'Dedicated app ต้องมี Orders จริง');
assert.match(adminHtml, /id="admin-customers"/, 'Dedicated app ต้องมี Customer CRM จริง');
assert.match(adminHtml, /id="admin-finance"/, 'Dedicated app ต้องมี Finance จริง');
assert.match(adminHtml, /id="admin-content"/, 'Dedicated app ต้องมี Content Studio จริง');
assert.match(adminHtml, /id="admin-settings"/, 'Dedicated app ต้องมี Platform settings จริง');
assert.match(adminHtml, /id="admin-stores"/, 'Dedicated app ต้องมี Store management จริง');
assert.match(adminHtml, /id="admin-riders"/, 'Dedicated app ต้องมี Rider management จริง');
assert.match(adminHtml, /admin_floating_cart_patch\.js/, 'Dedicated app ต้องโหลด payment slip queue runtime');
assert.match(adminHtml, /ensureSupportAdminControls/, 'Dedicated app ต้องมี customer chat admin runtime');
assert.match(adminHtml, /admin-dedicated-bootstrap\.js/, 'Dedicated app ต้องมี dedicated admin bootstrap');
assert.match(adminHtml, /data-app-scope="admin"/, 'Dedicated app ต้องอยู่ใน admin scope');
assert.match(adminHtml, /dedicated-admin-login/, 'Dedicated app ต้องมี scoped Admin Login entry');
assert.match(bootstrap, /SupabaseSync\?\.signIn/, 'Admin Login ต้องใช้ Supabase Auth sign-in');
assert.match(bootstrap, /SupabaseSync\?\.session/, 'Admin Login ต้องตรวจ Supabase session');
assert.match(bootstrap, /showView\?\.\('login'\)/, 'ผู้ที่ยังไม่ผ่านสิทธิ์ต้องถูกส่งไปหน้า Admin Login');
assert.match(bootstrap, /showView\?\.\('admin'\)/, 'ผู้ผ่านสิทธิ์ต้องถูกส่งไป Dashboard');
assert.match(bootstrap, /ไม่มีสิทธิ์ผู้ดูแลระบบ/, 'Admin Login ต้องปฏิเสธบัญชีที่ไม่มี role แอดมิน');

for (const customerView of ['view-home', 'view-stores', 'view-storefront', 'view-errand', 'view-marketplace']) {
  assert.match(adminHtml, new RegExp(`#${customerView}[,\\s]`), `Dedicated app ต้องซ่อน ${customerView} จาก UI`);
}

const inlineScripts = [...adminHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.ok(inlineScripts.length >= 10, 'Dedicated app ต้องมี runtime scripts ของ production admin');
for (const script of inlineScripts) {
  new vm.Script(`(function(){${script}\n})()`);
}

console.log('dedicated admin functional contract: PASS');

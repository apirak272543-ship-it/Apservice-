const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

assert.match(adminHtml, /Dedicated Admin Application/, 'Admin app ต้องมีชื่อหัวข้อที่ถูกต้อง');
assert.match(adminHtml, /apcx_user/, 'Admin app ต้องใช้กลไก session ร่วมกัน');
assert.match(adminHtml, /apcx_admins/, 'Admin app ต้องตรวจสอบสิทธิ์แอดมิน');
assert.match(adminHtml, /modules\/boot\.js/, 'Admin app ต้องโหลด shared core boot');
assert.match(adminHtml, /admin_contact_ui_patch\.js/, 'Admin app ต้องโหลด admin UI patch');
assert.match(adminHtml, /admin_performance_audit_patch\.js/, 'Admin app ต้องโหลด admin performance patch');
assert.match(adminHtml, /admin_menu_sync_patch\.js/, 'Admin app ต้องโหลด admin menu sync patch');

const inlineScripts = [...adminHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert.ok(inlineScripts.length >= 1, 'Admin app ต้องมี inline bootstrap script');
for (const script of inlineScripts) {
  new vm.Script(`(function(){${script}\n})()`);
}

for (const relativeAsset of [
  'modules/boot.js',
  'admin_contact_ui_patch.js',
  'admin_performance_audit_patch.js',
  'admin_menu_sync_patch.js',
]) {
  assert.ok(fs.existsSync(relativeAsset), `Admin app asset ต้องมีอยู่จริง: ${relativeAsset}`);
}

console.log('two-app dedicated admin contract: PASS');

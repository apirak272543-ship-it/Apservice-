const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const standaloneHtml = fs.readFileSync('admin-standalone.html', 'utf8');

assert.match(standaloneHtml, /AP Service \| Admin Standalone Console/, 'Standalone shell ต้องมีชื่อหัวข้อที่ถูกต้อง');
assert.match(standaloneHtml, /apcx_user/, 'Standalone shell ต้องตรวจสอบผู้ใช้จาก storage ร่วมกัน');
assert.match(standaloneHtml, /apcx_admins/, 'Standalone shell ต้องตรวจสอบสิทธิ์แอดมินจากอาร์เรย์กลาง');
assert.match(standaloneHtml, /index\.html/, 'Standalone shell ต้องมีลิงก์กลับสู่ monolith app เสมอ');
assert.match(standaloneHtml, /modules\/boot\.js/, 'Standalone shell ต้องโหลด shared boot entry');
assert.match(standaloneHtml, /admin_contact_ui_patch\.js/, 'Standalone shell ต้องโหลด admin contact patch ร่วมกัน');
assert.match(standaloneHtml, /admin_performance_audit_patch\.js/, 'Standalone shell ต้องโหลด admin performance patch ร่วมกัน');
assert.match(standaloneHtml, /admin_menu_sync_patch\.js/, 'Standalone shell ต้องโหลด admin menu sync patch ร่วมกัน');

const inlineScripts = [...standaloneHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
assert.ok(inlineScripts.length >= 1, 'Standalone shell ต้องมี inline bootstrap script');
for (const script of inlineScripts) {
  new vm.Script(`(function(){${script}\n})()`);
}

for (const relativeAsset of [
  'modules/boot.js',
  'admin_contact_ui_patch.js',
  'admin_performance_audit_patch.js',
  'admin_menu_sync_patch.js',
]) {
  assert.ok(fs.existsSync(relativeAsset), `Standalone asset ต้องมีอยู่จริง: ${relativeAsset}`);
}

console.log('admin standalone shell contract: PASS');

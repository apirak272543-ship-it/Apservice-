import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../admin_contact_ui_patch.js', import.meta.url), 'utf8');

assert.match(index, /admin_contact_ui_patch\.js\?v=admin-mobile-layout-v3/);
assert.match(patch, /\['operations', 'งานและออร์เดอร์'/);
assert.match(patch, /\['stores', 'ร้านค้าและเมนู'/);
assert.match(patch, /\['content', 'หน้าแรกและการตลาด'/);
assert.match(patch, /\['finance', 'การเงินและการจ่าย'/);
assert.match(patch, /\['platform', 'ระบบ การเชื่อมต่อ และความปลอดภัย'/);
assert.match(patch, /\['team', 'ทีมงานและ AI Workspace'/);
assert.match(patch, /#view-admin \.admin-layout\{grid-template-columns:minmax\(210px,260px\) minmax\(0,1fr\)/);
assert.match(patch, /#view-admin \.stats\{grid-template-columns:repeat\(auto-fit,minmax\(180px,1fr\)\)/);
assert.match(patch, /#view-admin>\.section-head>div:last-child \.btn\{height:auto!important/);
assert.match(patch, /#view-login \.login-card,#view-register \.login-card/);
assert.match(patch, /@media \(max-width:720px\).*#view-admin \.stats\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
assert.match(patch, /@media \(max-width:390px\).*#view-admin>\.section-head>div:last-child\{grid-template-columns:1fr\}/s);

console.log('PASS: Admin navigation groups keep related operations together');
console.log('PASS: Admin dashboard, action buttons, stats and tables have responsive rules');
console.log('PASS: Home/login responsive rules and cache-busting are present');

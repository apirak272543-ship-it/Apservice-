const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'customer', 'customer-app.js'), 'utf8');

assert.match(source, /const customerLoginMessage = error/, 'Customer Login must map auth errors before they reach the user');
assert.match(source, /กรุณากรอกอีเมลและรหัสผ่านให้ครบ/, 'Customer Login must explain missing fields in Thai');
assert.match(source, /if \(!email \|\| !password\).*return;/, 'Customer Login must return before calling Auth for empty credentials');
assert.match(source, /M\.auth\.signIn\(email, password\)/, 'Customer Login must call Auth only with validated fields');
assert.match(source, /อีเมลหรือรหัสผ่านไม่ถูกต้อง/, 'Customer Login must map invalid credential errors to Thai');
assert.doesNotMatch(source, /showError\(loginForm, err\.message/, 'Customer Login must not expose raw provider messages directly');

console.log('customer login validation contract: PASS');

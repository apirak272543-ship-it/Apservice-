const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'customer', 'customer-app.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'customer', 'profile.html'), 'utf8');

assert.match(source, /const message = error/, 'Customer Login must map auth errors before they reach the user');
assert.match(source, /กรุณากรอกอีเมล/, 'Customer Login must explain missing email fields in Thai');
assert.match(source, /if \(!email\).*return;/, 'Customer Login must return before calling Auth for an empty email');
assert.match(source, /M\.auth\.sendMagicLink\(email, callback\.href\)/, 'Customer Login must request a magic-link only with a validated email');
assert.match(source, /ยังส่งลิงก์ยืนยันไม่ได้/, 'Customer Login must map magic-link errors to Thai');
assert.doesNotMatch(source, /showError\(loginForm, err\.message/, 'Customer Login must not expose raw provider messages directly');
assert.match(profile, /customer-auth-v3-simple-login/, 'Customer Profile must request the simple-login runtime revision');

console.log('customer login validation contract: PASS');

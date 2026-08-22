const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'shared', 'ap-login-media.css'), 'utf8');
const native = fs.readFileSync(path.join(root, 'customer', 'customer-mobile-native.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'customer', 'profile.html'), 'utf8');

assert.match(css, /body\[data-page\] \.ap-login-field \.ap-login-control input \{ padding: 0 48px 0 62px; \}/, 'Input copy must reserve space for the left icon despite unified-theme overrides');
assert.match(native, /function normalizeProfileLoginCopy\(\)/, 'Profile Login copy must be normalized after runtime render');
assert.match(native, /role\.textContent = 'เข้าสู่ระบบลูกค้า'/, 'Profile Login role label must be Thai');
assert.match(native, /ไม่ต้องจำรหัสผ่าน|จัดการข้อมูลจัดส่งของคุณ/, 'Profile Login intro must explain the passwordless flow in concise Thai');
assert.match(profile, /auth-ui-v4-field-resolved/, 'Profile must request the field-inset stylesheet revision');
assert.match(profile, /customer-native-v8-simple-login-copy/, 'Profile must request the localized simple-login runtime revision');

console.log('customer profile login ui contract: PASS');

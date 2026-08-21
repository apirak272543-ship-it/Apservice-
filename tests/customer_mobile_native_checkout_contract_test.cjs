const assert = require('assert');
const fs = require('fs');

const native = fs.readFileSync('customer/customer-mobile-native.js', 'utf8');
assert.match(native, /function enhanceCheckout\(\)/, 'mobile-native ต้องมี checkout decorator');
assert.match(native, /let booting = false/, 'mobile-native ต้องมี guard ป้องกัน boot ซ้อน');
assert.match(native, /const runBoot = \(\) =>/, 'mobile-native ต้องใช้ bounded boot runner');
assert.match(native, /setTimeout\(runBoot, 1800\)/, 'mobile-native ต้อง retry หลัง checkout helper render เสร็จ');
assert.doesNotMatch(native, /new MutationObserver\(\(\) => boot\)/, 'mobile-native ห้ามใช้ observer เรียก boot แบบไม่จำกัด');
assert.doesNotMatch(native, /observer\.observe\(document\.body/, 'mobile-native ห้ามผูก observer กับ document.body');
console.log('customer mobile-native checkout contract: PASS');

const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('customer/customer-app.js', 'utf8');
assert.match(
  source,
  /event\.preventDefault\(\); const current = M\.cart\.read\(\);[\s\S]*?const checkoutForm = event\.currentTarget, submitButton = checkoutForm\.querySelector\('\[type="submit"\]'\);[\s\S]*?const user = await currentCustomerWithSessionRestore\(/,
  'checkout ต้องเก็บ form reference ก่อน await session restore เพื่อไม่ให้ event.currentTarget เป็น null'
);
assert.doesNotMatch(
  source,
  /const user = await currentCustomerWithSessionRestore\([\s\S]*?const address = .*?\n\s*const checkoutForm = event\.currentTarget/,
  'ห้ามอ่าน event.currentTarget หลัง await ใน checkout submit handler'
);
console.log('customer checkout submit contract: PASS');

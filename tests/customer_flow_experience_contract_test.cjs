const fs = require('fs');
const assert = require('assert');

const patch = fs.readFileSync('customer/customer-flow-experience-patch.js', 'utf8');
const css = fs.readFileSync('customer/customer-flow-experience.css', 'utf8');
for (const route of ['orders.html', 'order.html', 'support.html', 'checkout.html']) {
  const html = fs.readFileSync(`customer/${route}`, 'utf8');
  assert.match(html, /customer-flow-experience-patch\.js\?v=customer-flow-v1/, `${route} ต้องโหลด customer experience patch`);
  assert.match(html, /customer-flow-experience\.css\?v=customer-flow-v1/, `${route} ต้องโหลด stylesheet ของ customer experience`);
}
assert.match(patch, /canonicalSteps = Object\.freeze\(\['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'\]\)/, 'Tracking ต้องยึด canonical statuses เท่านั้น');
assert.match(patch, /cancelled/, 'Tracking ต้องแสดง state ยกเลิกได้');
assert.match(patch, /support\.html\$\{orderId/, 'Order detail ต้องมีทางลัดไป support พร้อม order context');
assert.match(patch, /ต้องการความช่วยเหลือเกี่ยวกับออเดอร์/, 'Support ต้องเติม context จากออเดอร์อย่างโปร่งใส');
assert.match(patch, /JPEG และบีบอัดอัตโนมัติ/, 'Checkout ต้องอธิบาย media pipeline แก่ผู้ใช้');
assert.match(css, /customer-tracker/, 'ต้องมี style สำหรับ tracking journey');
console.log('customer flow experience contract: PASS');


import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const customer = new URL('../', import.meta.url);
const script = await readFile(new URL('customer-retail-patch.js', customer), 'utf8');
const homepage = await readFile(new URL('index.html', customer), 'utf8');
const retail = await readFile(new URL('retail.html', customer), 'utf8');
const checkout = await readFile(new URL('retail-checkout.html', customer), 'utf8');

assert.match(script, /const cartKey = 'apservice_retail_cart_v1';/);
assert.doesNotMatch(script, /M\.cart\./);
assert.match(script, /retail_list_customer_stores/);
assert.match(script, /retail_list_customer_products/);
assert.match(script, /retail_create_customer_delivery_order/);
assert.match(script, /crypto\?\.randomUUID/);
assert.match(script, /สต๊อกจะได้รับการตรวจสอบอีกครั้งเมื่อยืนยันคำสั่งซื้อ/);
assert.match(script, /ค่าจัดส่งและการยืนยันการชำระเงินจะแจ้งตามสถานะออร์เดอร์/);
assert.doesNotMatch(script, /ค่าจัดส่ง[^<]*฿/);
for (const html of [homepage, retail, checkout]) {
  assert.match(html, /customer-retail\.css\?v=retail-v1/);
  assert.match(html, /customer-retail-patch\.js\?v=retail-v1/);
}
assert.match(retail, /data-page="retail"/);
assert.match(checkout, /data-page="retail-checkout"/);
console.log('Customer retail contract checks passed.');

const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
const orderPage = fs.readFileSync('customer/order.html', 'utf8');
const notificationsPage = fs.readFileSync('customer/notifications.html', 'utf8');

assert.match(app, /function orderDetail/, 'Customer MPA ต้องมี order detail/tracking route');
assert.match(app, /delivery_order_items\?select=name,emoji,unit_price,quantity/, 'Order detail ต้องใช้รายการสินค้าจาก data source จริง');
assert.match(app, /order_status_events\?select=status,actor_label,created_at/, 'Order detail ต้องใช้ status events จริง');
assert.match(app, /customer_id=eq\./, 'Order detail ต้อง scope request ด้วย customer account');
assert.match(app, /function notifications/, 'Customer MPA ต้องมี notification inbox');
assert.match(app, /mobile_notifications\?select=id,title,body,data,status,(?:read_at,)?created_at/, 'Notification inbox ต้องใช้ table จริงและรองรับ read_at แบบ additive');
assert.match(app, /customer-notifications:/, 'Notification inbox ต้องมี scoped cache/sync key');
assert.match(orderPage, /data-page="order"/, 'Order detail ต้องเป็น MPA document แยก');
assert.match(notificationsPage, /data-page="notifications"/, 'Notifications ต้องเป็น MPA document แยก');

console.log('customer order and notification parity contract: PASS');

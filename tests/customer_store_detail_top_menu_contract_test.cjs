const fs = require('fs');
const assert = require('assert');

const root = process.cwd();
const moduleCode = fs.readFileSync(`${root}/customer/customer-store-detail.js`, 'utf8');
const style = fs.readFileSync(`${root}/customer/customer-store-detail.css`, 'utf8');
const page = fs.readFileSync(`${root}/customer/store.html`, 'utf8');
const app = fs.readFileSync(`${root}/customer/customer-app.js`, 'utf8');
const migration = fs.readFileSync(`${root}/supabase/migrations/20260820_customer_store_top_menu_items.sql`, 'utf8');

assert.match(page, /customer-store-detail\.css\?v=store-detail-v1/);
assert.match(page, /customer-store-detail\.js\?v=store-detail-v1/);
assert.match(app, /APServiceStoreDetail\?\.mount/);
assert.match(moduleCode, /rpc\/customer_store_top_menu_items/);
assert.match(moduleCode, /p_limit:\s*10/);
assert.match(moduleCode, /10 เมนูขายดีของร้าน/);
assert.match(moduleCode, /ไม่มีการสร้างอันดับแทนข้อมูลจริง/);
assert.match(moduleCode, /if \(!user\)/);
assert.match(moduleCode, /profile\.html\?next=/);
assert.match(moduleCode, /store-menu-rail/);
assert.match(style, /scroll-snap-type:\s*inline mandatory/);
assert.match(style, /border-radius:\s*23px/);
assert.match(style, /prefers-reduced-motion/);
assert.match(migration, /completed_at IS NOT NULL/);
assert.match(migration, /LIMIT LEAST\(GREATEST\(COALESCE\(p_limit, 10\), 1\), 10\)/);
assert.match(migration, /REVOKE ALL ON FUNCTION/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO anon, authenticated/);
console.log('customer_store_detail_top_menu_contract_test: PASS');

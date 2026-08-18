const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('customer/customer-app.js', 'utf8');
for (const route of ['marketplace.html', 'marketplace-item.html', 'marketplace-new.html', 'marketplace-profile.html', 'marketplace-chat.html']) assert.ok(fs.existsSync(`customer/${route}`), `ต้องมี MPA route ${route}`);
assert.match(app, /function marketplace\(\)/, 'Customer ต้องมี marketplace browse');
assert.match(app, /href="marketplace\.html"/, 'Customer home ต้องมี marketplace entry point');
assert.match(app, /function marketplaceItem\(\)/, 'Customer ต้องมี marketplace detail');
assert.match(app, /function marketplaceNew\(\)/, 'Customer ต้องมี marketplace create');
assert.match(app, /function marketplaceProfile\(\)/, 'Customer ต้องมี marketplace profile');
assert.match(app, /function marketplaceChat\(\)/, 'Customer ต้องมี marketplace chat');
assert.match(app, /marketplace_listings\?select=id,title,description,category,price,image_url/, 'Browse ต้องใช้ public active listings data source');
assert.match(app, /status: 'active'/, 'Listing create ต้องใช้ active status ที่ schema อนุญาต');
assert.match(app, /status: 'pending'/, 'Marketplace purchase ต้องใช้ pending status ที่ schema อนุญาต');
assert.match(app, /marketplace_conversations/, 'Marketplace chat ต้องใช้ participant conversation table');
assert.match(app, /marketplace-messages:/, 'Marketplace chat ต้องใช้ scoped message sync');

console.log('customer marketplace parity contract: PASS');

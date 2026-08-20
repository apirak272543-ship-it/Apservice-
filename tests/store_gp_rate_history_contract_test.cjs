const fs = require('fs');
const assert = require('assert');
const migration = fs.readFileSync('supabase/migrations/20260820_store_gp_rate_history.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/role-access/index.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.store_gp_rate_history/, 'ต้องมี GP history table');
assert.match(migration, /previous_gp_percent/, 'history ต้องเก็บอัตราก่อนเปลี่ยน');
assert.match(migration, /gp_percent numeric NOT NULL CHECK \(gp_percent BETWEEN 0 AND 100\)/, 'GP ต้องถูกจำกัด 0–100');
assert.match(migration, /length\(trim\(reason\)\) BETWEEN 3 AND 500/, 'history ต้องบังคับเหตุผล');
assert.match(migration, /private\.owns_store\(store_id\) OR private\.has_role\('admin'\)/, 'history ต้องอ่านได้เฉพาะเจ้าของร้านหรือ Admin');
assert.match(edge, /body\.action === 'update_store_gp_rate'/, 'ต้องมี server action เปลี่ยน GP');
assert.match(edge, /store_gp_rate_history/, 'server action ต้องสร้าง history');
assert.match(edge, /store_gp_rate_updated/, 'server action ต้องสร้าง Admin audit');
console.log('store GP history contract: PASS');

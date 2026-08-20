const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260820_local_ocr_menu_import.sql'), 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.menu_import_audit/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /private\.has_role\('admin'\) OR private\.owns_store\(store_id\)/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.import_menu_drafts\(/);
assert.match(migration, /IF NOT v_is_admin AND NOT private\.owns_store\(p_store_id\)/);
assert.match(migration, /jsonb_array_length\(p_rows\)/);
assert.match(migration, /v_requested < 1 OR v_requested > 60/);
assert.match(migration, /Validate every row before the first write/);
assert.match(migration, /available, promo, image_url, category_id/);
assert.match(migration, /v_item_id, p_store_id, v_name, '🍜', '', v_price, 0, v_stock, false, false, NULL, v_category_id/);
assert.match(migration, /skipped_duplicate_count/);
assert.match(migration, /menu_local_ocr_import/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.import_menu_drafts/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.import_menu_drafts\(text, jsonb, text\) TO authenticated/);

console.log('local_ocr_menu_import_contract_test: passed');

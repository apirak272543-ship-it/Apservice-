const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('supabase/migrations/20260819_order_financial_state_machine.sql', 'utf8');
const stateMachine = fs.readFileSync('docs/wave-p1-2-order-financial-state-machine.md', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.checkout_groups/, 'ต้องมี parent object สำหรับ multi-store checkout');
assert.match(migration, /UNIQUE\(customer_id, idempotency_key\)/, 'checkout/cancellation ต้องมี idempotency ที่ผูกเจ้าของ');
assert.match(migration, /ADD COLUMN IF NOT EXISTS workflow_state/, 'ออร์เดอร์ต้องมี canonical workflow state แยกจาก Thai status legacy');
assert.match(migration, /sync_order_workflow_from_legacy_status/, 'ต้อง map legacy status เข้าสู่ workflow state กลาง');
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_payments/, 'ต้องมี payment object แยกจาก order');
assert.match(migration, /WHERE o\.customer_id IS NOT NULL/, 'payment backfill ต้องไม่ทำให้ legacy guest order ที่ไม่มี customer ID ล้มเหลว');
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_cancellation_requests/, 'ต้องมี cancellation request แยกจาก order');
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_refunds/, 'ต้องมี refund transaction แยกจาก order');
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_financial_events/, 'ต้องมี append-only financial event');
assert.match(migration, /FOR SELECT TO authenticated/, 'ข้อมูลการเงินต้องอยู่ใต้ authenticated RLS policy');
assert.match(migration, /private\.has_role\('admin'\)/, 'Admin financial action ต้องตรวจ role บน server');
assert.match(migration, /pg_advisory_xact_lock/, 'คำขอยกเลิกต้อง serialize idempotency key ป้องกัน race');
assert.match(migration, /request_customer_order_cancellation/, 'Customer cancellation ต้องผ่าน RPC server');
assert.match(migration, /admin_resolve_order_cancellation/, 'Admin resolution ต้องผ่าน RPC server');
assert.match(migration, /INSERT INTO public\.admin_action_audit/, 'Admin cancellation decision ต้องมี immutable audit');
assert.match(migration, /REVOKE ALL ON FUNCTION/, 'ต้อง revoke direct execution ของ security-definer functions');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.request_customer_order_cancellation[\s\S]*FROM PUBLIC, anon/, 'RPC cancellation ต้องไม่เปิดให้ anon');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_resolve_order_cancellation[\s\S]*FROM PUBLIC, anon/, 'RPC resolution ต้องไม่เปิดให้ anon');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ensure_order_payment_record\(\) FROM PUBLIC, anon, authenticated/, 'trigger function ต้องไม่เปิด direct execution');
assert.match(stateMachine, /Refund is never assumed/, 'นโยบายห้ามคืนเงินอัตโนมัติต้องถูกระบุชัด');
assert.match(stateMachine, /client never provides the final refundable balance/, 'ยอดคืนเงินต้องคำนวณโดย server');
assert.match(stateMachine, /multi-store/i, 'ต้องมี policy สำหรับ multi-store');

console.log('order financial state machine contract: PASS');

-- Keep the legacy Thai status column compatible with the current Shared Core contract.
-- The UI owns the current labels; workflow_state remains the canonical backend state.
-- This migration intentionally preserves every previously supported legacy label.

CREATE OR REPLACE FUNCTION public.sync_order_workflow_from_legacy_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.workflow_state IS DISTINCT FROM OLD.workflow_state THEN
    RETURN NEW;
  END IF;

  v_state := CASE lower(coalesce(NEW.status, ''))
    WHEN 'รอตรวจสอบการชำระเงิน' THEN 'payment_review'
    WHEN 'ต้องแนบสลิปใหม่' THEN 'payment_rejected'
    WHEN 'รอชำระเงิน' THEN 'awaiting_payment'
    WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
    WHEN 'กำลังดำเนินการ' THEN 'store_accepted'
    WHEN 'กำลังเตรียมอาหาร' THEN 'preparing'
    WHEN 'กำลังเตรียมสินค้า' THEN 'preparing'
    WHEN 'พร้อมรับสินค้า' THEN 'ready_for_pickup'
    WHEN 'ไรเดอร์กำลังไปรับ' THEN 'rider_assigned'
    WHEN 'มอบหมายไรเดอร์แล้ว' THEN 'rider_assigned'
    WHEN 'ไรเดอร์รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'กำลังจัดส่ง' THEN 'delivering'
    WHEN 'ไรเดอร์กำลังจัดส่ง' THEN 'delivering'
    WHEN 'กำลังไปส่ง' THEN 'delivering'
    WHEN 'ส่งสำเร็จ' THEN 'delivered'
    WHEN 'สำเร็จแล้ว' THEN 'completed'
    WHEN 'เสร็จสิ้นแล้ว' THEN 'completed'
    WHEN 'ยกเลิกแล้ว' THEN 'cancelled'
    WHEN 'ยกเลิก' THEN 'cancelled'
    WHEN 'รอดำเนินการคืนเงิน' THEN 'refund_pending'
    WHEN 'คืนเงินแล้ว' THEN 'refunded'
    ELSE NULL
  END;

  IF v_state IS NOT NULL THEN
    NEW.workflow_state := v_state;
    NEW.workflow_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_initial_order_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(NEW.workflow_state, 'legacy_unmapped') <> 'legacy_unmapped' THEN
    RETURN NEW;
  END IF;

  NEW.workflow_state := CASE lower(coalesce(NEW.status, ''))
    WHEN 'รอตรวจสอบการชำระเงิน' THEN 'payment_review'
    WHEN 'ต้องแนบสลิปใหม่' THEN 'payment_rejected'
    WHEN 'รอชำระเงิน' THEN 'awaiting_payment'
    WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
    WHEN 'กำลังดำเนินการ' THEN 'store_accepted'
    WHEN 'กำลังเตรียมอาหาร' THEN 'preparing'
    WHEN 'กำลังเตรียมสินค้า' THEN 'preparing'
    WHEN 'พร้อมรับสินค้า' THEN 'ready_for_pickup'
    WHEN 'ไรเดอร์กำลังไปรับ' THEN 'rider_assigned'
    WHEN 'มอบหมายไรเดอร์แล้ว' THEN 'rider_assigned'
    WHEN 'ไรเดอร์รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'กำลังจัดส่ง' THEN 'delivering'
    WHEN 'ไรเดอร์กำลังจัดส่ง' THEN 'delivering'
    WHEN 'กำลังไปส่ง' THEN 'delivering'
    WHEN 'ส่งสำเร็จ' THEN 'delivered'
    WHEN 'สำเร็จแล้ว' THEN 'completed'
    WHEN 'เสร็จสิ้นแล้ว' THEN 'completed'
    WHEN 'ยกเลิกแล้ว' THEN 'cancelled'
    WHEN 'ยกเลิก' THEN 'cancelled'
    WHEN 'รอดำเนินการคืนเงิน' THEN 'refund_pending'
    WHEN 'คืนเงินแล้ว' THEN 'refunded'
    ELSE 'legacy_unmapped'
  END;
  NEW.workflow_updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_order_workflow_from_legacy_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_initial_order_workflow_state() FROM PUBLIC, anon, authenticated;

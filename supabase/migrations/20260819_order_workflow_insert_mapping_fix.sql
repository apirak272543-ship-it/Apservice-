-- Corrective trigger for new orders created after Wave P1.2 initial migration.
CREATE OR REPLACE FUNCTION public.assign_initial_order_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(NEW.workflow_state, 'legacy_unmapped') <> 'legacy_unmapped' THEN RETURN NEW; END IF;
  NEW.workflow_state := CASE NEW.status
    WHEN 'รอตรวจสอบการชำระเงิน' THEN 'payment_review'
    WHEN 'รอชำระเงิน' THEN 'awaiting_payment'
    WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
    WHEN 'กำลังดำเนินการ' THEN 'store_accepted'
    WHEN 'กำลังเตรียมอาหาร' THEN 'preparing'
    WHEN 'พร้อมรับสินค้า' THEN 'ready_for_pickup'
    WHEN 'ไรเดอร์กำลังไปรับ' THEN 'rider_assigned'
    WHEN 'มอบหมายไรเดอร์แล้ว' THEN 'rider_assigned'
    WHEN 'ไรเดอร์รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'กำลังจัดส่ง' THEN 'delivering'
    WHEN 'ไรเดอร์กำลังจัดส่ง' THEN 'delivering'
    WHEN 'ส่งสำเร็จ' THEN 'delivered'
    WHEN 'สำเร็จแล้ว' THEN 'completed'
    WHEN 'เสร็จสิ้นแล้ว' THEN 'completed'
    WHEN 'ยกเลิก' THEN 'cancelled'
    ELSE 'legacy_unmapped'
  END;
  NEW.workflow_updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS assign_initial_order_workflow_before_insert ON public.delivery_orders;
CREATE TRIGGER assign_initial_order_workflow_before_insert
  BEFORE INSERT ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_initial_order_workflow_state();
REVOKE ALL ON FUNCTION public.assign_initial_order_workflow_state() FROM PUBLIC, anon, authenticated;

-- Corrective mapping for statuses used by current Customer checkout and legacy delivery imports.
UPDATE public.delivery_orders
SET workflow_state = CASE status
  WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
  WHEN 'กำลังดำเนินการ' THEN 'store_accepted'
  WHEN 'ไรเดอร์กำลังไปรับ' THEN 'rider_assigned'
  WHEN 'ไรเดอร์กำลังจัดส่ง' THEN 'delivering'
  ELSE workflow_state
END,
workflow_updated_at = now(),
updated_at = now()
WHERE workflow_state = 'legacy_unmapped'
  AND status IN ('ร้านค้ารับออร์เดอร์','กำลังดำเนินการ','ไรเดอร์กำลังไปรับ','ไรเดอร์กำลังจัดส่ง');

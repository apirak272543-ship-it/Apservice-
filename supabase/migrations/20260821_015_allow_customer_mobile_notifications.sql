BEGIN;

ALTER TABLE public.mobile_notifications
  DROP CONSTRAINT IF EXISTS mobile_notifications_recipient_role_check;

ALTER TABLE public.mobile_notifications
  ADD CONSTRAINT mobile_notifications_recipient_role_check
  CHECK (recipient_role = ANY (ARRAY['customer'::text, 'rider'::text, 'store_owner'::text]));

COMMENT ON CONSTRAINT mobile_notifications_recipient_role_check ON public.mobile_notifications
  IS 'รองรับผู้รับแจ้งเตือนตาม role ที่มีอยู่จริงในแพลตฟอร์ม: customer, rider และ store_owner';

COMMIT;

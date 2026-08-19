-- Admin notification views and unread counters distinguish read and unread entries.
-- Add this optional timestamp without changing existing notification delivery data.
BEGIN;

ALTER TABLE public.mobile_notifications
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS mobile_notifications_recipient_unread_idx
  ON public.mobile_notifications (recipient_id, read_at, created_at DESC);

COMMENT ON COLUMN public.mobile_notifications.read_at IS 'เวลาที่ผู้รับเปิดอ่านข้อความแจ้งเตือน';

COMMIT;

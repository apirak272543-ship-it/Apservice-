-- Admin Rider management renders and saves an operational note per rider.
-- Add the field without altering any existing rider identity, status, or earnings data.
BEGIN;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.riders.note IS 'หมายเหตุการปฏิบัติงานของ Rider สำหรับ Admin control plane';

COMMIT;

-- Shared delivery order contract for Admin, Rider and Store applications.
-- All three clients use these fields when creating, viewing or completing an order.

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'เงินสดปลายทาง (COD)',
  ADD COLUMN IF NOT EXISTS payment_received numeric NOT NULL DEFAULT 0 CHECK (payment_received >= 0),
  ADD COLUMN IF NOT EXISTS payment_change numeric NOT NULL DEFAULT 0 CHECK (payment_change >= 0),
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

NOTIFY pgrst, 'reload schema';

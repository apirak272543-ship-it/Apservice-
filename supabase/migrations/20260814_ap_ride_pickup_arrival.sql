ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS ride_arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS ride_arrived_location jsonb;

NOTIFY pgrst, 'reload schema';

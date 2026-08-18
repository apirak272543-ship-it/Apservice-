-- Atomic server checkout owns order identifiers; legacy clients may still supply
-- their own id, while server-created orders receive a collision-resistant default.
ALTER TABLE public.delivery_orders
  ALTER COLUMN id SET DEFAULT ('order-' || replace(gen_random_uuid()::text, '-', ''));

-- A Rider may inspect food-item requirements for an unassigned dispatch job,
-- then continues to read the same items once the job is assigned to that Rider.
DROP POLICY IF EXISTS "order_items_read_participant" ON public.delivery_order_items;
CREATE POLICY "order_items_read_participant" ON public.delivery_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.delivery_orders o
      WHERE o.id = delivery_order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR private.owns_store(o.store_id)
          OR private.owns_rider(o.rider_id)
          OR (o.rider_id IS NULL AND private.has_role('rider'))
          OR private.has_role('admin')
        )
    )
  );

NOTIFY pgrst, 'reload schema';

-- AP Service: role-scoped access for operations data.
-- Admin manages all data; store owners manage their own store/menu/orders;
-- riders manage their own rider profile, assigned jobs and personal device data.

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_participant_update" ON public.delivery_orders;
CREATE POLICY "orders_participant_update"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  private.has_role('admin')
  OR customer_id = auth.uid()
  OR private.owns_store(store_id)
  OR private.owns_rider(rider_id)
  OR (rider_id IS NULL AND private.has_role('rider'))
)
WITH CHECK (
  private.has_role('admin')
  OR customer_id = auth.uid()
  OR private.owns_store(store_id)
  OR (rider_id IS NOT NULL AND private.owns_rider(rider_id))
);

GRANT SELECT, INSERT, UPDATE ON public.delivery_orders TO authenticated;

-- A user may update only notification rows addressed to their own account.
DROP POLICY IF EXISTS "mobile_notifications_recipient_or_admin_update" ON public.mobile_notifications;
CREATE POLICY "mobile_notifications_recipient_or_admin_update"
ON public.mobile_notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid() OR private.has_role('admin'))
WITH CHECK (recipient_id = auth.uid() OR private.has_role('admin'));

GRANT SELECT, UPDATE ON public.mobile_notifications TO authenticated;

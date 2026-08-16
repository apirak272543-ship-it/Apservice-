-- Payment orders must remain customer-visible only until an Admin approves the associated slip.
-- This prevents clients from bypassing the front-end queue filter through direct REST calls.
drop policy if exists orders_read_participant on public.delivery_orders;
create policy orders_read_participant on public.delivery_orders
for select to authenticated
using (
  private.has_role('admin'::text)
  or customer_id = auth.uid()
  or (
    status not in ('รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่')
    and (
      private.owns_store(store_id)
      or private.owns_rider(rider_id)
      or (rider_id is null and private.has_role('rider'::text))
    )
  )
);

drop policy if exists orders_participant_update on public.delivery_orders;
create policy orders_participant_update on public.delivery_orders
for update to authenticated
using (
  private.has_role('admin'::text)
  or (
    status not in ('รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่')
    and (
      private.owns_store(store_id)
      or private.owns_rider(rider_id)
      or (rider_id is null and private.has_role('rider'::text))
    )
  )
)
with check (
  private.has_role('admin'::text)
  or (
    status not in ('รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่')
    and (
      private.owns_store(store_id)
      or (rider_id is not null and private.owns_rider(rider_id))
    )
  )
);

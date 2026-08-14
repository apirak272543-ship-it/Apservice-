-- Preserve strict owner-only reviews while allowing completed legacy orders that
-- were recorded with a customer email before customer_id was populated.

CREATE OR REPLACE FUNCTION private.customer_can_review_order(
  review_order_id text,
  review_target_type text,
  review_store_id text,
  review_rider_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_orders AS o
    WHERE o.id = review_order_id
      AND o.completed_at IS NOT NULL
      AND (
        o.customer_id = auth.uid()
        OR (
          o.customer_id IS NULL
          AND lower(trim(coalesce(o.customer_email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
        )
      )
      AND (
        (review_target_type = 'store' AND review_store_id = o.store_id AND review_rider_id IS NULL)
        OR
        (review_target_type = 'rider' AND review_rider_id = o.rider_id AND review_store_id IS NULL)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.customer_can_review_order(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.customer_can_review_order(text, text, text, text) TO authenticated;

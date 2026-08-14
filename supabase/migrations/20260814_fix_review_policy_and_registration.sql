-- Fix the registration wrapper client-side separately. This migration corrects
-- the review policy correlation so the target IDs are checked against the
-- delivery order rather than accidentally comparing the order table to itself.

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
      AND o.customer_id = auth.uid()
      AND o.completed_at IS NOT NULL
      AND (
        (review_target_type = 'store' AND review_store_id = o.store_id AND review_rider_id IS NULL)
        OR
        (review_target_type = 'rider' AND review_rider_id = o.rider_id AND review_store_id IS NULL)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.customer_can_review_order(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.customer_can_review_order(text, text, text, text) TO authenticated;

DROP POLICY IF EXISTS "reviews_customer_insert_completed_order" ON public.order_reviews;
CREATE POLICY "reviews_customer_insert_completed_order"
  ON public.order_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND private.customer_can_review_order(order_id, target_type, store_id, rider_id)
  );

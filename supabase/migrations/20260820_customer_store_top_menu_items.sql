-- Public Store Detail may show a limited ranking based only on completed sales.
-- The function deliberately exposes neither customer nor order-level data.

CREATE INDEX IF NOT EXISTS delivery_orders_store_completed_idx
  ON public.delivery_orders (store_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS delivery_order_items_item_order_idx
  ON public.delivery_order_items (item_id, order_id);

CREATE OR REPLACE FUNCTION public.customer_store_top_menu_items(
  p_store_id text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id text,
  sold_quantity bigint,
  completed_order_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible_store AS (
    SELECT s.id
    FROM public.stores AS s
    WHERE s.id = p_store_id
      AND s.active IS TRUE
      AND s.emergency_closed IS FALSE
  )
  SELECT
    oi.item_id,
    SUM(GREATEST(COALESCE(oi.quantity, 0), 0))::bigint AS sold_quantity,
    COUNT(DISTINCT oi.order_id)::bigint AS completed_order_count
  FROM public.delivery_order_items AS oi
  JOIN public.delivery_orders AS o
    ON o.id = oi.order_id
   AND o.store_id = p_store_id
   AND o.completed_at IS NOT NULL
  JOIN public.menu_items AS m
    ON m.id = oi.item_id
   AND m.store_id = p_store_id
   AND m.available IS TRUE
  WHERE EXISTS (SELECT 1 FROM eligible_store)
    AND oi.item_id IS NOT NULL
  GROUP BY oi.item_id
  ORDER BY sold_quantity DESC, completed_order_count DESC, oi.item_id ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
$$;

REVOKE ALL ON FUNCTION public.customer_store_top_menu_items(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_store_top_menu_items(text, integer) TO anon, authenticated;

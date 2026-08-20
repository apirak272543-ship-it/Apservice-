CREATE OR REPLACE FUNCTION public.merchant_list_order_adjustment_log(
  p_order_id text,
  p_limit integer DEFAULT 60
)
RETURNS TABLE (
  source text,
  created_at timestamptz,
  label text,
  actor_label text,
  detail text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_merchant_id uuid := auth.uid();
BEGIN
  IF v_merchant_id IS NULL OR NOT private.has_role('store_owner') THEN
    RAISE EXCEPTION 'เฉพาะบัญชีร้านค้าเท่านั้นที่เปิดประวัติการปรับออร์เดอร์ได้';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = p_order_id AND s.owner_id = v_merchant_id
  ) THEN
    RAISE EXCEPTION 'ไม่พบออร์เดอร์ของร้านค้าที่เข้าสู่ระบบ';
  END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT 'status'::text AS source, e.created_at, e.status AS label, e.actor_label, ''::text AS detail
    FROM public.order_status_events e
    WHERE e.order_id = p_order_id
    UNION ALL
    SELECT 'cancellation'::text, c.created_at,
           CASE c.status WHEN 'requested' THEN 'คำขอยกเลิกรอการพิจารณา' WHEN 'approved' THEN 'คำขอยกเลิกได้รับอนุมัติ' WHEN 'rejected' THEN 'คำขอยกเลิกถูกปฏิเสธ' ELSE 'คำขอยกเลิกถูกถอน' END,
           c.requester_role, left(c.reason, 500)
    FROM public.order_cancellation_requests c
    WHERE c.order_id = p_order_id
    UNION ALL
    SELECT 'financial'::text, f.created_at, f.action, f.actor_role, left(f.reason, 500)
    FROM public.order_financial_events f
    WHERE f.order_id = p_order_id
  ) AS timeline
  ORDER BY created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 60), 100));
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_list_order_adjustment_log(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_list_order_adjustment_log(text,integer) TO authenticated;

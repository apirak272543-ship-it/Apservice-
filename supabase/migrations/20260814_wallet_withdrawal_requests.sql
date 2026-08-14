-- Wallet balances are calculated from completed work, settlements, and withdrawal requests.
-- A payout is allocated to whole eligible order earnings so the same order cannot be paid twice.

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL CHECK (recipient_type IN ('store','rider')),
  store_id text REFERENCES public.stores(id) ON DELETE CASCADE,
  rider_id text REFERENCES public.riders(id) ON DELETE CASCADE,
  recipient_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount > 0),
  payout_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','paid','rejected','cancelled')),
  recipient_note text NOT NULL DEFAULT '',
  admin_note text NOT NULL DEFAULT '',
  proof_image_url text,
  payment_reference text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  CONSTRAINT withdrawal_requests_one_recipient CHECK (
    (recipient_type = 'store' AND store_id IS NOT NULL AND rider_id IS NULL)
    OR (recipient_type = 'rider' AND rider_id IS NOT NULL AND store_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.withdrawal_request_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  withdrawal_request_id uuid NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('store','rider')),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  gross_amount numeric NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  net_amount numeric NOT NULL CHECK (net_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (withdrawal_request_id, order_id)
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_recipient_status_idx ON public.withdrawal_requests(store_id, rider_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_request_items_order_type_idx ON public.withdrawal_request_items(order_id, recipient_type);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_requests_admin_all" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_admin_all" ON public.withdrawal_requests
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "withdrawal_requests_recipient_read" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_recipient_read" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING ((recipient_type = 'store' AND private.owns_store(store_id)) OR (recipient_type = 'rider' AND private.owns_rider(rider_id)));

DROP POLICY IF EXISTS "withdrawal_request_items_admin_all" ON public.withdrawal_request_items;
CREATE POLICY "withdrawal_request_items_admin_all" ON public.withdrawal_request_items
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "withdrawal_request_items_recipient_read" ON public.withdrawal_request_items;
CREATE POLICY "withdrawal_request_items_recipient_read" ON public.withdrawal_request_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.withdrawal_requests wr
    WHERE wr.id = withdrawal_request_id
      AND ((wr.recipient_type = 'store' AND private.owns_store(wr.store_id))
        OR (wr.recipient_type = 'rider' AND private.owns_rider(wr.rider_id)))
  ));

CREATE OR REPLACE FUNCTION public.wallet_summary(p_recipient_type text, p_recipient_id text)
RETURNS TABLE(total_earned numeric, available_amount numeric, processing_amount numeric, paid_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_available numeric := 0;
  v_processing numeric := 0;
  v_paid numeric := 0;
  v_gp numeric := 0;
BEGIN
  IF p_recipient_type NOT IN ('store','rider') THEN RAISE EXCEPTION 'Invalid recipient type'; END IF;
  IF NOT private.has_role('admin') AND NOT ((p_recipient_type = 'store' AND private.owns_store(p_recipient_id)) OR (p_recipient_type = 'rider' AND private.owns_rider(p_recipient_id))) THEN
    RAISE EXCEPTION 'Not allowed to read this wallet';
  END IF;

  IF p_recipient_type = 'store' THEN
    SELECT settlement_gp_percent INTO v_gp FROM public.stores WHERE id = p_recipient_id;
    SELECT COALESCE(SUM(COALESCE(i.items_total, GREATEST(o.total - COALESCE(o.delivery_fee, 0), 0)) * (1 - COALESCE(v_gp,0) / 100)), 0)
      INTO v_available
      FROM public.delivery_orders o
      LEFT JOIN LATERAL (SELECT SUM(unit_price * quantity) AS items_total FROM public.delivery_order_items WHERE order_id = o.id) i ON true
      WHERE o.store_id = p_recipient_id AND o.completed_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'store' AND si.order_id = o.id)
        AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id = wi.withdrawal_request_id WHERE wi.recipient_type = 'store' AND wi.order_id = o.id AND wr.status IN ('requested','approved','paid'));
    SELECT COALESCE(SUM(net_amount),0) INTO v_processing FROM public.settlements WHERE store_id = p_recipient_id AND status = 'pending';
    SELECT v_processing + COALESCE(SUM(amount),0) INTO v_processing FROM public.withdrawal_requests WHERE store_id = p_recipient_id AND status IN ('requested','approved');
    SELECT COALESCE(SUM(net_amount),0) INTO v_paid FROM public.settlements WHERE store_id = p_recipient_id AND status = 'paid';
    SELECT v_paid + COALESCE(SUM(amount),0) INTO v_paid FROM public.withdrawal_requests WHERE store_id = p_recipient_id AND status = 'paid';
  ELSE
    SELECT COALESCE(SUM(e.rider_share), 0) INTO v_available FROM public.rider_earnings e
      WHERE e.rider_id = p_recipient_id
        AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'rider' AND si.order_id = e.order_id)
        AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id = wi.withdrawal_request_id WHERE wi.recipient_type = 'rider' AND wi.order_id = e.order_id AND wr.status IN ('requested','approved','paid'));
    SELECT COALESCE(SUM(net_amount),0) INTO v_processing FROM public.settlements WHERE rider_id = p_recipient_id AND status = 'pending';
    SELECT v_processing + COALESCE(SUM(amount),0) INTO v_processing FROM public.withdrawal_requests WHERE rider_id = p_recipient_id AND status IN ('requested','approved');
    SELECT COALESCE(SUM(net_amount),0) INTO v_paid FROM public.settlements WHERE rider_id = p_recipient_id AND status = 'paid';
    SELECT v_paid + COALESCE(SUM(amount),0) INTO v_paid FROM public.withdrawal_requests WHERE rider_id = p_recipient_id AND status = 'paid';
  END IF;
  RETURN QUERY SELECT ROUND(v_available + v_processing + v_paid,2), ROUND(v_available,2), ROUND(v_processing,2), ROUND(v_paid,2);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_full_wallet_withdrawal(p_recipient_type text, p_recipient_id text, p_recipient_note text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_request_id uuid;
  v_amount numeric := 0;
  v_name text := '';
  v_gp numeric := 0;
  v_payout jsonb := '{}'::jsonb;
BEGIN
  IF p_recipient_type NOT IN ('store','rider') OR NOT ((p_recipient_type = 'store' AND private.owns_store(p_recipient_id)) OR (p_recipient_type = 'rider' AND private.owns_rider(p_recipient_id))) THEN RAISE EXCEPTION 'Not allowed to request withdrawal'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE (store_id = p_recipient_id OR rider_id = p_recipient_id) AND status IN ('requested','approved')) THEN RAISE EXCEPTION 'There is already a withdrawal request being reviewed'; END IF;

  IF p_recipient_type = 'store' THEN
    SELECT name, settlement_gp_percent, jsonb_strip_nulls(jsonb_build_object('method', payout_method, 'bank_name', payout_bank_name, 'account_name', payout_account_name, 'account_number', payout_account_number, 'qr_url', payout_qr_url, 'note', settlement_note)) INTO v_name, v_gp, v_payout FROM public.stores WHERE id = p_recipient_id;
    SELECT COALESCE(SUM(COALESCE(i.items_total, GREATEST(o.total - COALESCE(o.delivery_fee,0),0)) * (1 - COALESCE(v_gp,0)/100)),0) INTO v_amount FROM public.delivery_orders o LEFT JOIN LATERAL (SELECT SUM(unit_price * quantity) AS items_total FROM public.delivery_order_items WHERE order_id=o.id) i ON true WHERE o.store_id=p_recipient_id AND o.completed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type='store' AND si.order_id=o.id) AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id=wi.withdrawal_request_id WHERE wi.recipient_type='store' AND wi.order_id=o.id AND wr.status IN ('requested','approved','paid'));
  ELSE
    SELECT name, jsonb_strip_nulls(jsonb_build_object('method', payout_method, 'bank_name', payout_bank_name, 'account_name', payout_account_name, 'account_number', payout_account_number, 'qr_url', payout_qr_url, 'note', settlement_note)) INTO v_name, v_payout FROM public.riders WHERE id = p_recipient_id;
    SELECT COALESCE(SUM(e.rider_share),0) INTO v_amount FROM public.rider_earnings e WHERE e.rider_id=p_recipient_id AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type='rider' AND si.order_id=e.order_id) AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id=wi.withdrawal_request_id WHERE wi.recipient_type='rider' AND wi.order_id=e.order_id AND wr.status IN ('requested','approved','paid'));
  END IF;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'No available balance to withdraw'; END IF;
  INSERT INTO public.withdrawal_requests(recipient_type,store_id,rider_id,recipient_name,amount,payout_snapshot,recipient_note) VALUES(p_recipient_type,CASE WHEN p_recipient_type='store' THEN p_recipient_id END,CASE WHEN p_recipient_type='rider' THEN p_recipient_id END,COALESCE(v_name,''),ROUND(v_amount,2),COALESCE(v_payout,'{}'::jsonb),LEFT(COALESCE(p_recipient_note,''),500)) RETURNING id INTO v_request_id;
  IF p_recipient_type='store' THEN
    INSERT INTO public.withdrawal_request_items(withdrawal_request_id,recipient_type,order_id,gross_amount,net_amount) SELECT v_request_id,'store',o.id,COALESCE(i.items_total,GREATEST(o.total-COALESCE(o.delivery_fee,0),0)),ROUND(COALESCE(i.items_total,GREATEST(o.total-COALESCE(o.delivery_fee,0),0))*(1-COALESCE(v_gp,0)/100),2) FROM public.delivery_orders o LEFT JOIN LATERAL (SELECT SUM(unit_price*quantity) AS items_total FROM public.delivery_order_items WHERE order_id=o.id) i ON true WHERE o.store_id=p_recipient_id AND o.completed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type='store' AND si.order_id=o.id) AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id=wi.withdrawal_request_id WHERE wi.recipient_type='store' AND wi.order_id=o.id AND wr.status IN ('requested','approved','paid'));
  ELSE
    INSERT INTO public.withdrawal_request_items(withdrawal_request_id,recipient_type,order_id,gross_amount,net_amount) SELECT v_request_id,'rider',e.order_id,e.rider_share,e.rider_share FROM public.rider_earnings e WHERE e.rider_id=p_recipient_id AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type='rider' AND si.order_id=e.order_id) AND NOT EXISTS (SELECT 1 FROM public.withdrawal_request_items wi JOIN public.withdrawal_requests wr ON wr.id=wi.withdrawal_request_id WHERE wi.recipient_type='rider' AND wi.order_id=e.order_id AND wr.status IN ('requested','approved','paid'));
  END IF;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(p_request_id uuid, p_action text, p_proof_image_url text DEFAULT '', p_payment_reference text DEFAULT '', p_admin_note text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'Only administrators can review withdrawals'; END IF;
  IF p_action NOT IN ('approved','rejected','paid') THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  IF p_action='paid' AND COALESCE(trim(p_proof_image_url),'')='' THEN RAISE EXCEPTION 'Payment proof image is required'; END IF;
  UPDATE public.withdrawal_requests SET status=p_action, admin_note=LEFT(COALESCE(p_admin_note,''),500), proof_image_url=CASE WHEN p_action='paid' THEN p_proof_image_url ELSE proof_image_url END, payment_reference=CASE WHEN p_action='paid' THEN COALESCE(p_payment_reference,'') ELSE payment_reference END, reviewed_by=auth.uid(), reviewed_at=now(), paid_at=CASE WHEN p_action='paid' THEN now() ELSE paid_at END WHERE id=p_request_id AND status IN ('requested','approved');
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found or already closed'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_summary(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_full_wallet_withdrawal(text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_withdrawal(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_summary(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_full_wallet_withdrawal(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid,text,text,text,text) TO authenticated;

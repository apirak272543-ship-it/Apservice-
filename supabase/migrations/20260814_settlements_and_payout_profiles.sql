-- Settlement: payment terms and payout profiles for stores and riders.
-- The sensitive account/QR details remain in protected base tables; catalog views stay public-safe.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS settlement_mode text NOT NULL DEFAULT 'credit' CHECK (settlement_mode IN ('cash','credit')),
  ADD COLUMN IF NOT EXISTS settlement_credit_days integer NOT NULL DEFAULT 1 CHECK (settlement_credit_days BETWEEN 0 AND 365),
  ADD COLUMN IF NOT EXISTS settlement_gp_percent numeric NOT NULL DEFAULT 0 CHECK (settlement_gp_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank','qr','cash','other')),
  ADD COLUMN IF NOT EXISTS payout_bank_name text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_qr_url text,
  ADD COLUMN IF NOT EXISTS settlement_note text;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS settlement_mode text NOT NULL DEFAULT 'credit' CHECK (settlement_mode IN ('cash','credit')),
  ADD COLUMN IF NOT EXISTS settlement_credit_days integer NOT NULL DEFAULT 1 CHECK (settlement_credit_days BETWEEN 0 AND 365),
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank','qr','cash','other')),
  ADD COLUMN IF NOT EXISTS payout_bank_name text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_qr_url text,
  ADD COLUMN IF NOT EXISTS settlement_note text;

CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL CHECK (recipient_type IN ('store','rider')),
  store_id text REFERENCES public.stores(id) ON DELETE CASCADE,
  rider_id text REFERENCES public.riders(id) ON DELETE CASCADE,
  recipient_name text NOT NULL DEFAULT '',
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  gp_percent numeric NOT NULL DEFAULT 0 CHECK (gp_percent BETWEEN 0 AND 100),
  gp_amount numeric NOT NULL DEFAULT 0 CHECK (gp_amount >= 0),
  net_amount numeric NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  payout_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  proof_image_url text,
  payment_reference text,
  payment_note text,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settlements_one_recipient CHECK (
    (recipient_type = 'store' AND store_id IS NOT NULL AND rider_id IS NULL)
    OR (recipient_type = 'rider' AND rider_id IS NOT NULL AND store_id IS NULL)
  ),
  CONSTRAINT settlements_period_valid CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.settlement_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('store','rider')),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  gross_amount numeric NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  net_amount numeric NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (settlement_id, order_id),
  UNIQUE (recipient_type, order_id)
);

CREATE INDEX IF NOT EXISTS settlements_due_status_idx ON public.settlements(status, due_date, recipient_type);
CREATE INDEX IF NOT EXISTS settlements_store_status_idx ON public.settlements(store_id, status, due_date) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS settlements_rider_status_idx ON public.settlements(rider_id, status, due_date) WHERE rider_id IS NOT NULL;

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_admin_all" ON public.settlements;
CREATE POLICY "settlements_admin_all" ON public.settlements
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "settlements_recipient_read" ON public.settlements;
CREATE POLICY "settlements_recipient_read" ON public.settlements
  FOR SELECT TO authenticated
  USING (
    (recipient_type = 'store' AND private.owns_store(store_id))
    OR (recipient_type = 'rider' AND private.owns_rider(rider_id))
  );

DROP POLICY IF EXISTS "settlement_items_admin_all" ON public.settlement_items;
CREATE POLICY "settlement_items_admin_all" ON public.settlement_items
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "settlement_items_recipient_read" ON public.settlement_items;
CREATE POLICY "settlement_items_recipient_read" ON public.settlement_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements s
      WHERE s.id = settlement_id
        AND ((s.recipient_type = 'store' AND private.owns_store(s.store_id))
          OR (s.recipient_type = 'rider' AND private.owns_rider(s.rider_id)))
    )
  );

CREATE OR REPLACE FUNCTION public.admin_create_settlement(
  p_recipient_type text,
  p_recipient_id text,
  p_period_start date,
  p_period_end date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_settlement_id uuid;
  v_name text;
  v_gp_percent numeric := 0;
  v_mode text := 'credit';
  v_credit_days integer := 1;
  v_payout jsonb := '{}'::jsonb;
  v_gross numeric := 0;
  v_net numeric := 0;
  v_due_date date;
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'Only administrators can create settlements';
  END IF;
  IF p_recipient_type NOT IN ('store','rider') OR p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Invalid settlement parameters';
  END IF;

  IF p_recipient_type = 'store' THEN
    SELECT name, settlement_gp_percent, settlement_mode, settlement_credit_days,
      jsonb_strip_nulls(jsonb_build_object('method', payout_method, 'bank_name', payout_bank_name, 'account_name', payout_account_name, 'account_number', payout_account_number, 'qr_url', payout_qr_url, 'note', settlement_note))
    INTO v_name, v_gp_percent, v_mode, v_credit_days, v_payout
    FROM public.stores WHERE id = p_recipient_id;
    IF v_name IS NULL THEN RAISE EXCEPTION 'Store not found'; END IF;

    SELECT COALESCE(SUM(COALESCE(i.items_total, GREATEST(o.total - COALESCE(o.delivery_fee,0), 0))), 0)
    INTO v_gross
    FROM public.delivery_orders o
    LEFT JOIN LATERAL (
      SELECT SUM(unit_price * quantity) AS items_total
      FROM public.delivery_order_items doi WHERE doi.order_id = o.id
    ) i ON true
    WHERE o.store_id = p_recipient_id
      AND o.completed_at IS NOT NULL
      AND o.completed_at::date BETWEEN p_period_start AND p_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'store' AND si.order_id = o.id);
  ELSE
    SELECT name, settlement_mode, settlement_credit_days,
      jsonb_strip_nulls(jsonb_build_object('method', payout_method, 'bank_name', payout_bank_name, 'account_name', payout_account_name, 'account_number', payout_account_number, 'qr_url', payout_qr_url, 'note', settlement_note))
    INTO v_name, v_mode, v_credit_days, v_payout
    FROM public.riders WHERE id = p_recipient_id;
    IF v_name IS NULL THEN RAISE EXCEPTION 'Rider not found'; END IF;

    SELECT COALESCE(SUM(e.rider_share), 0)
    INTO v_gross
    FROM public.rider_earnings e
    WHERE e.rider_id = p_recipient_id
      AND e.completed_at::date BETWEEN p_period_start AND p_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'rider' AND si.order_id = e.order_id);
  END IF;

  IF v_gross <= 0 THEN
    RAISE EXCEPTION 'No eligible completed work in the selected period';
  END IF;

  v_net := ROUND(v_gross * (1 - v_gp_percent / 100), 2);
  v_due_date := p_period_end + CASE WHEN v_mode = 'cash' THEN 0 ELSE COALESCE(v_credit_days, 1) END;

  INSERT INTO public.settlements (recipient_type, store_id, rider_id, recipient_name, period_start, period_end, due_date, gross_amount, gp_percent, gp_amount, net_amount, payout_snapshot)
  VALUES (p_recipient_type, CASE WHEN p_recipient_type = 'store' THEN p_recipient_id END, CASE WHEN p_recipient_type = 'rider' THEN p_recipient_id END, v_name, p_period_start, p_period_end, v_due_date, v_gross, v_gp_percent, v_gross - v_net, v_net, COALESCE(v_payout, '{}'::jsonb))
  RETURNING id INTO v_settlement_id;

  IF p_recipient_type = 'store' THEN
    INSERT INTO public.settlement_items (settlement_id, recipient_type, order_id, gross_amount, net_amount)
    SELECT v_settlement_id, 'store', o.id, COALESCE(i.items_total, GREATEST(o.total - COALESCE(o.delivery_fee,0), 0)), ROUND(COALESCE(i.items_total, GREATEST(o.total - COALESCE(o.delivery_fee,0), 0)) * (1 - v_gp_percent / 100), 2)
    FROM public.delivery_orders o
    LEFT JOIN LATERAL (SELECT SUM(unit_price * quantity) AS items_total FROM public.delivery_order_items doi WHERE doi.order_id = o.id) i ON true
    WHERE o.store_id = p_recipient_id AND o.completed_at IS NOT NULL
      AND o.completed_at::date BETWEEN p_period_start AND p_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'store' AND si.order_id = o.id);
  ELSE
    INSERT INTO public.settlement_items (settlement_id, recipient_type, order_id, gross_amount, net_amount)
    SELECT v_settlement_id, 'rider', e.order_id, e.rider_share, e.rider_share
    FROM public.rider_earnings e
    WHERE e.rider_id = p_recipient_id AND e.completed_at::date BETWEEN p_period_start AND p_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_items si WHERE si.recipient_type = 'rider' AND si.order_id = e.order_id);
  END IF;
  RETURN v_settlement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_settlement_paid(
  p_settlement_id uuid,
  p_proof_image_url text,
  p_payment_reference text DEFAULT '',
  p_payment_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'Only administrators can mark settlements paid'; END IF;
  IF COALESCE(trim(p_proof_image_url), '') = '' THEN RAISE EXCEPTION 'Payment proof image is required'; END IF;
  UPDATE public.settlements
  SET status = 'paid', proof_image_url = p_proof_image_url, payment_reference = COALESCE(p_payment_reference,''), payment_note = COALESCE(p_payment_note,''), paid_by = auth.uid(), paid_at = now(), updated_at = now()
  WHERE id = p_settlement_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found or already closed'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_settlement(text, text, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mark_settlement_paid(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_settlement(text, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_settlement_paid(uuid, text, text, text) TO authenticated;

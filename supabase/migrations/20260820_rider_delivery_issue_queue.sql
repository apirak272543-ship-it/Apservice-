-- Rider issue reports create a dispatch-visible queue without changing the order,
-- assigning another rider, or issuing financial adjustments automatically.

CREATE TABLE IF NOT EXISTS public.rider_delivery_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  rider_id text NOT NULL REFERENCES public.riders(id) ON DELETE RESTRICT,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issue_type text NOT NULL CHECK (issue_type IN ('vehicle_breakdown','customer_unreachable','accident','incorrect_pin','severe_weather','other')),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 500),
  evidence_path text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text NOT NULL DEFAULT '' CHECK (char_length(resolution_note) <= 500),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS rider_delivery_issues_dispatch_idx
  ON public.rider_delivery_issues(status, created_at DESC);
CREATE INDEX IF NOT EXISTS rider_delivery_issues_order_idx
  ON public.rider_delivery_issues(order_id, created_at DESC);

ALTER TABLE public.rider_delivery_issues ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rider_delivery_issues TO authenticated;

DROP POLICY IF EXISTS "rider_delivery_issues_rider_read_own" ON public.rider_delivery_issues;
CREATE POLICY "rider_delivery_issues_rider_read_own" ON public.rider_delivery_issues
  FOR SELECT TO authenticated
  USING (private.owns_rider(rider_id));

DROP POLICY IF EXISTS "rider_delivery_issues_admin_all" ON public.rider_delivery_issues;
CREATE POLICY "rider_delivery_issues_admin_all" ON public.rider_delivery_issues
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

-- Extensible campaign model for future free-delivery, delivery-discount, and GP incentive programs.
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  campaign_type text NOT NULL CHECK (campaign_type IN ('free_delivery','delivery_discount','gp_incentive','store_sponsored')),
  funded_by text NOT NULL DEFAULT 'platform' CHECK (funded_by IN ('platform','store','shared')),
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_amount numeric NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  max_discount_amount numeric CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  gp_percent_override numeric CHECK (gp_percent_override IS NULL OR (gp_percent_override >= 0 AND gp_percent_override <= 100)),
  applies_to_all_stores boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_stores (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  funded_share_percent numeric NOT NULL DEFAULT 0 CHECK (funded_share_percent >= 0 AND funded_share_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, store_id)
);

CREATE INDEX IF NOT EXISTS campaigns_active_window_idx ON public.campaigns(active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS campaign_stores_store_idx ON public.campaign_stores(store_id, active);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_public_read_active" ON public.campaigns;
CREATE POLICY "campaigns_public_read_active" ON public.campaigns FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
CREATE POLICY "campaigns_admin_all" ON public.campaigns FOR ALL TO authenticated USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));
DROP POLICY IF EXISTS "campaign_stores_public_read" ON public.campaign_stores;
CREATE POLICY "campaign_stores_public_read" ON public.campaign_stores FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "campaign_stores_admin_all" ON public.campaign_stores;
CREATE POLICY "campaign_stores_admin_all" ON public.campaign_stores FOR ALL TO authenticated USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));

GRANT SELECT ON public.campaigns, public.campaign_stores TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns, public.campaign_stores TO authenticated;

NOTIFY pgrst, 'reload schema';

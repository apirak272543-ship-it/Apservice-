-- Coupon management: admin-created offers for customer checkout/profile.
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  scope_type text NOT NULL DEFAULT 'all' CHECK (scope_type IN ('all', 'store', 'menu')),
  min_order_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  per_customer_limit integer NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK ((scope_type = 'all') OR (scope_type IN ('store', 'menu')))
);

CREATE TABLE IF NOT EXISTS public.coupon_stores (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.coupon_menu_items (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  menu_item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_id text REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, customer_id, order_id)
);

CREATE INDEX IF NOT EXISTS coupons_active_window_idx ON public.coupons(active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS coupon_redemptions_customer_idx ON public.coupon_redemptions(customer_id, coupon_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_admin_all ON public.coupons;
CREATE POLICY coupons_admin_all ON public.coupons FOR ALL TO authenticated USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));
DROP POLICY IF EXISTS coupons_customer_read_active ON public.coupons;
CREATE POLICY coupons_customer_read_active ON public.coupons FOR SELECT TO authenticated USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS coupon_stores_admin_all ON public.coupon_stores;
CREATE POLICY coupon_stores_admin_all ON public.coupon_stores FOR ALL TO authenticated USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));
DROP POLICY IF EXISTS coupon_stores_customer_read ON public.coupon_stores;
CREATE POLICY coupon_stores_customer_read ON public.coupon_stores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_id AND c.active = true AND c.starts_at <= now() AND (c.ends_at IS NULL OR c.ends_at >= now())));
DROP POLICY IF EXISTS coupon_menu_items_admin_all ON public.coupon_menu_items;
CREATE POLICY coupon_menu_items_admin_all ON public.coupon_menu_items FOR ALL TO authenticated USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));
DROP POLICY IF EXISTS coupon_menu_items_customer_read ON public.coupon_menu_items;
CREATE POLICY coupon_menu_items_customer_read ON public.coupon_menu_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_id AND c.active = true AND c.starts_at <= now() AND (c.ends_at IS NULL OR c.ends_at >= now())));
DROP POLICY IF EXISTS coupon_redemptions_customer_read ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_customer_read ON public.coupon_redemptions FOR SELECT TO authenticated USING (customer_id = auth.uid());
DROP POLICY IF EXISTS coupon_redemptions_admin_read ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_admin_read ON public.coupon_redemptions FOR SELECT TO authenticated USING (private.has_role('admin'));

GRANT SELECT ON public.coupons, public.coupon_stores, public.coupon_menu_items TO authenticated;
GRANT ALL ON public.coupons, public.coupon_stores, public.coupon_menu_items TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;

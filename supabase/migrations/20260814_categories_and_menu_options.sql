-- Shared food-discovery and menu-customisation model.
-- Store categories are platform-wide; menu categories can be global or owned by one store.

CREATE TABLE IF NOT EXISTS public.store_categories (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  icon text NOT NULL DEFAULT '🍽️' CHECK (char_length(icon) <= 16),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id text PRIMARY KEY,
  store_id text REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  icon text NOT NULL DEFAULT '🍜' CHECK (char_length(icon) <= 16),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_scope_name_unique
  ON public.menu_categories (COALESCE(store_id, ''), lower(name));

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS category_id text REFERENCES public.store_categories(id) ON DELETE SET NULL;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_id text REFERENCES public.menu_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.menu_option_groups (
  id text PRIMARY KEY,
  menu_item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  min_selections smallint NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections smallint NOT NULL DEFAULT 1 CHECK (max_selections >= 1 AND max_selections >= min_selections),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_option_values (
  id text PRIMARY KEY,
  option_group_id text NOT NULL REFERENCES public.menu_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  price_delta numeric NOT NULL DEFAULT 0 CHECK (price_delta >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_category_id_idx ON public.stores(category_id);
CREATE INDEX IF NOT EXISTS menu_items_store_category_idx ON public.menu_items(store_id, category_id);
CREATE INDEX IF NOT EXISTS menu_categories_store_active_idx ON public.menu_categories(store_id, active, sort_order);
CREATE INDEX IF NOT EXISTS menu_option_groups_item_active_idx ON public.menu_option_groups(menu_item_id, active, sort_order);
CREATE INDEX IF NOT EXISTS menu_option_values_group_active_idx ON public.menu_option_values(option_group_id, active, sort_order);

INSERT INTO public.store_categories (id, name, description, icon, sort_order) VALUES
  ('store-all', 'ร้านอาหารทั้งหมด', 'ร้านอาหารและเครื่องดื่มทุกประเภท', '🍽️', 0),
  ('store-made-to-order', 'อาหารตามสั่ง', 'ข้าวจานเดียว ผัด และเมนูสั่งทำ', '🍛', 10),
  ('store-noodle', 'ก๋วยเตี๋ยว', 'ก๋วยเตี๋ยวและเส้นหลากหลายรูปแบบ', '🍜', 20),
  ('store-drinks', 'เครื่องดื่ม', 'ชา กาแฟ ชานม และโซดา', '🧋', 30),
  ('store-dessert', 'ขนมและของหวาน', 'เบเกอรี ขนม และของหวาน', '🍰', 40),
  ('store-other', 'อื่น ๆ', 'ร้านประเภทอื่น', '🏪', 99)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_categories (id, store_id, name, description, icon, sort_order) VALUES
  ('menu-main', NULL, 'เมนูหลัก', 'เมนูอาหารหลักของร้าน', '🍽️', 0),
  ('menu-stir-fry', NULL, 'ผัดและอาหารตามสั่ง', 'เช่น ผัดกะเพรา ผัดพริกแกง', '🍳', 10),
  ('menu-noodle', NULL, 'ก๋วยเตี๋ยวและเส้น', 'ก๋วยเตี๋ยวน้ำ แห้ง และเมนูเส้น', '🍜', 20),
  ('menu-bubble-tea', NULL, 'ชานมและชาไข่มุก', 'ชานม ชาเย็น และท็อปปิงไข่มุก', '🧋', 30),
  ('menu-soda', NULL, 'โซดาและน้ำผลไม้', 'น้ำมะนาวโซดาและเครื่องดื่มเย็น', '🥤', 40),
  ('menu-dessert', NULL, 'ขนมและของหวาน', 'เบเกอรีและของหวาน', '🍰', 50),
  ('menu-other', NULL, 'อื่น ๆ', 'รายการอื่นของร้าน', '🍴', 99)
ON CONFLICT (id) DO NOTHING;

UPDATE public.stores SET category_id = 'store-other' WHERE category_id IS NULL;
UPDATE public.menu_items SET category_id = 'menu-other' WHERE category_id IS NULL;

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_categories_public_read" ON public.store_categories;
CREATE POLICY "store_categories_public_read" ON public.store_categories
  FOR SELECT USING (active IS TRUE OR private.has_role('admin'));
DROP POLICY IF EXISTS "store_categories_admin_manage" ON public.store_categories;
CREATE POLICY "store_categories_admin_manage" ON public.store_categories
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "menu_categories_read_by_scope" ON public.menu_categories;
CREATE POLICY "menu_categories_read_by_scope" ON public.menu_categories
  FOR SELECT USING (
    private.has_role('admin')
    OR (store_id IS NOT NULL AND private.owns_store(store_id))
    OR (active IS TRUE AND (store_id IS NULL OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = menu_categories.store_id
        AND s.active IS TRUE
        AND s.emergency_closed IS FALSE
    )))
  );
DROP POLICY IF EXISTS "menu_categories_owner_or_admin_manage" ON public.menu_categories;
CREATE POLICY "menu_categories_owner_or_admin_manage" ON public.menu_categories
  FOR ALL TO authenticated
  USING (private.has_role('admin') OR (store_id IS NOT NULL AND private.owns_store(store_id)))
  WITH CHECK (private.has_role('admin') OR (store_id IS NOT NULL AND private.owns_store(store_id)));

DROP POLICY IF EXISTS "menu_option_groups_read" ON public.menu_option_groups;
CREATE POLICY "menu_option_groups_read" ON public.menu_option_groups
  FOR SELECT USING (
    private.has_role('admin') OR EXISTS (
      SELECT 1 FROM public.menu_items m
      WHERE m.id = menu_option_groups.menu_item_id
        AND (private.owns_store(m.store_id) OR (m.available IS TRUE AND m.stock > 0 AND EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = m.store_id AND s.active IS TRUE AND s.emergency_closed IS FALSE
        )))
    )
  );
DROP POLICY IF EXISTS "menu_option_groups_owner_or_admin_manage" ON public.menu_option_groups;
CREATE POLICY "menu_option_groups_owner_or_admin_manage" ON public.menu_option_groups
  FOR ALL TO authenticated
  USING (private.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.menu_items m
    WHERE m.id = menu_option_groups.menu_item_id AND private.owns_store(m.store_id)
  ))
  WITH CHECK (private.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.menu_items m
    WHERE m.id = menu_option_groups.menu_item_id AND private.owns_store(m.store_id)
  ));

DROP POLICY IF EXISTS "menu_option_values_read" ON public.menu_option_values;
CREATE POLICY "menu_option_values_read" ON public.menu_option_values
  FOR SELECT USING (
    private.has_role('admin') OR EXISTS (
      SELECT 1
      FROM public.menu_option_groups g
      JOIN public.menu_items m ON m.id = g.menu_item_id
      WHERE g.id = menu_option_values.option_group_id
        AND (private.owns_store(m.store_id) OR (g.active IS TRUE AND m.available IS TRUE AND m.stock > 0 AND EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = m.store_id AND s.active IS TRUE AND s.emergency_closed IS FALSE
        )))
    )
  );
DROP POLICY IF EXISTS "menu_option_values_owner_or_admin_manage" ON public.menu_option_values;
CREATE POLICY "menu_option_values_owner_or_admin_manage" ON public.menu_option_values
  FOR ALL TO authenticated
  USING (private.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.menu_option_groups g
    JOIN public.menu_items m ON m.id = g.menu_item_id
    WHERE g.id = menu_option_values.option_group_id AND private.owns_store(m.store_id)
  ))
  WITH CHECK (private.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.menu_option_groups g
    JOIN public.menu_items m ON m.id = g.menu_item_id
    WHERE g.id = menu_option_values.option_group_id AND private.owns_store(m.store_id)
  ));

GRANT SELECT ON public.store_categories, public.menu_categories, public.menu_option_groups, public.menu_option_values TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_categories, public.menu_categories, public.menu_option_groups, public.menu_option_values TO authenticated;

CREATE OR REPLACE VIEW public.catalog_stores AS
SELECT s.id, s.name, s.emoji, s.description, s.rating, s.eta, s.location, s.active,
       s.image_url, s.review_count, s.open_time, s.close_time, s.order_cutoff_minutes, s.emergency_closed, s.emergency_note,
       s.category_id, c.name AS category_name, c.icon AS category_icon
FROM public.stores s
LEFT JOIN public.store_categories c ON c.id = s.category_id
WHERE s.active IS TRUE AND s.emergency_closed IS FALSE;

CREATE OR REPLACE VIEW public.catalog_menu_items AS
SELECT m.id, m.store_id, m.name, m.emoji, m.description, m.price, m.available, m.promo,
       m.image_url, m.stock, m.category_id, c.name AS category_name, c.icon AS category_icon
FROM public.menu_items m
LEFT JOIN public.menu_categories c ON c.id = m.category_id;

GRANT SELECT ON public.catalog_stores, public.catalog_menu_items TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

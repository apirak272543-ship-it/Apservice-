-- AP Service: Supermarket is a first-class store category.
-- Reuses the existing store, menu, cart, order, and store-owner workflows.
INSERT INTO public.store_categories (id, name, description, icon, sort_order, active)
VALUES (
  'store-supermarket',
  'ซูเปอร์มาร์เก็ต',
  'ร้านซูเปอร์มาร์เก็ตและร้านสะดวกซื้อ จัดการสินค้าและออร์เดอร์เหมือนร้านอาหาร',
  '🛒',
  50,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = TRUE,
  updated_at = now();

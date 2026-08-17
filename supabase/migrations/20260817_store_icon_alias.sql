-- Store media contract: image_url remains the stored primary icon asset.
-- icon_url is an additive alias for clients that use explicit icon naming.
CREATE OR REPLACE VIEW public.catalog_stores AS
SELECT s.id,
       s.name,
       s.emoji,
       s.description,
       s.rating,
       s.eta,
       s.location,
       s.active,
       s.image_url,
       s.review_count,
       s.open_time,
       s.close_time,
       s.order_cutoff_minutes,
       s.emergency_closed,
       s.emergency_note,
       s.category_id,
       c.name AS category_name,
       c.icon AS category_icon,
       s.background_url,
       s.image_url AS icon_url
FROM public.stores s
LEFT JOIN public.store_categories c ON c.id = s.category_id
WHERE s.active IS TRUE AND s.emergency_closed IS FALSE;

GRANT SELECT ON public.catalog_stores TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

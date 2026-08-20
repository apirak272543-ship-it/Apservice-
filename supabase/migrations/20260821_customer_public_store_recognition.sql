-- Customer-safe projection for public store recognition.
-- Exposes only the published tier label and period; never private totals,
-- subject_user_id, ranking internals, or recognition event payloads.

CREATE OR REPLACE FUNCTION public.customer_public_store_recognition(p_store_ids text[] DEFAULT NULL)
RETURNS TABLE(
  store_id text,
  tier smallint,
  label text,
  badge_variant text,
  scope text,
  period_end timestamptz,
  is_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (rs.subject_id)
      rs.subject_id AS store_id,
      rs.tier,
      rs.scope,
      rs.period_end
    FROM public.recognition_snapshots rs
    JOIN public.stores s ON s.id = rs.subject_id
    WHERE rs.subject_role = 'store'
      AND rs.tier BETWEEN 1 AND 5
      AND rs.period_end <= now()
      AND rs.scope IN ('weekly', 'monthly')
      AND s.active = true
      AND s.emergency_closed = false
      AND s.moderation_status = 'active'
      AND (p_store_ids IS NULL OR rs.subject_id = ANY(p_store_ids))
    ORDER BY rs.subject_id, rs.period_end DESC,
      CASE rs.scope WHEN 'weekly' THEN 0 ELSE 1 END,
      rs.computed_at DESC
  )
  SELECT
    latest.store_id,
    latest.tier,
    ('Tier ' || latest.tier)::text AS label,
    (CASE latest.tier
      WHEN 1 THEN 'gold'
      WHEN 2 THEN 'teal'
      WHEN 3 THEN 'green'
      WHEN 4 THEN 'blue'
      WHEN 5 THEN 'slate'
      ELSE 'neutral'
    END)::text AS badge_variant,
    latest.scope,
    latest.period_end,
    true::boolean AS is_public
  FROM latest;
$$;

REVOKE ALL ON FUNCTION public.customer_public_store_recognition(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_public_store_recognition(text[]) TO anon, authenticated;

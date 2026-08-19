-- Preserve menu history and order references while replacing destructive menu deletion.

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS menu_items_store_archived_idx
  ON public.menu_items (store_id, archived_at, updated_at DESC);

CREATE OR REPLACE FUNCTION public.archive_menu_item(
  p_menu_item_id text,
  p_reason text DEFAULT ''
)
RETURNS public.menu_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_menu public.menu_items;
BEGIN
  SELECT * INTO v_menu FROM public.menu_items WHERE id = p_menu_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบเมนูที่ต้องการเก็บออกจากรายการ'; END IF;
  IF NOT private.has_role('admin') AND NOT private.owns_store(v_menu.store_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์จัดการเมนูนี้';
  END IF;

  UPDATE public.menu_items
  SET available = false,
      archived_at = now(),
      archived_by = auth.uid(),
      archived_reason = NULLIF(left(trim(coalesce(p_reason, '')), 280), ''),
      updated_at = now()
  WHERE id = p_menu_item_id
  RETURNING * INTO v_menu;

  RETURN v_menu;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_menu_item(p_menu_item_id text)
RETURNS public.menu_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_menu public.menu_items;
BEGIN
  SELECT * INTO v_menu FROM public.menu_items WHERE id = p_menu_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบเมนูที่ต้องการนำกลับ'; END IF;
  IF NOT private.has_role('admin') AND NOT private.owns_store(v_menu.store_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์จัดการเมนูนี้';
  END IF;

  UPDATE public.menu_items
  SET available = false,
      archived_at = NULL,
      archived_by = NULL,
      archived_reason = NULL,
      updated_at = now()
  WHERE id = p_menu_item_id
  RETURNING * INTO v_menu;

  RETURN v_menu;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_menu_item(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_menu_item(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_menu_item(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_menu_item(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

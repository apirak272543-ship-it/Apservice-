-- Local-first menu import. OCR is performed in Web/Android WebView; this RPC only accepts
-- merchant/admin-reviewed draft rows and never receives an image or any provider credential.

CREATE TABLE IF NOT EXISTS public.menu_import_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'local_ocr' CHECK (source IN ('local_ocr', 'manual_review')),
  requested_count integer NOT NULL CHECK (requested_count BETWEEN 1 AND 60),
  inserted_count integer NOT NULL DEFAULT 0 CHECK (inserted_count >= 0),
  skipped_duplicate_count integer NOT NULL DEFAULT 0 CHECK (skipped_duplicate_count >= 0),
  created_category_count integer NOT NULL DEFAULT 0 CHECK (created_category_count >= 0),
  imported_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_import_audit_store_created_idx
  ON public.menu_import_audit (store_id, created_at DESC);

ALTER TABLE public.menu_import_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_import_audit_owner_or_admin_read" ON public.menu_import_audit;
CREATE POLICY "menu_import_audit_owner_or_admin_read" ON public.menu_import_audit
  FOR SELECT TO authenticated
  USING (private.has_role('admin') OR private.owns_store(store_id));

REVOKE ALL ON TABLE public.menu_import_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.menu_import_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.import_menu_drafts(
  p_store_id text,
  p_rows jsonb,
  p_source text DEFAULT 'local_ocr'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_is_admin boolean := private.has_role('admin');
  v_row jsonb;
  v_name text;
  v_category_name text;
  v_category_id text;
  v_price numeric;
  v_stock integer;
  v_item_id text;
  v_requested integer;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_created_categories integer := 0;
  v_imported_ids jsonb := '[]'::jsonb;
  v_existing_count integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบก่อนนำเข้าเมนู'; END IF;
  IF p_store_id IS NULL OR btrim(p_store_id) = '' THEN RAISE EXCEPTION 'กรุณาเลือกร้านที่ต้องการนำเข้าเมนู'; END IF;
  IF NOT v_is_admin AND NOT private.owns_store(p_store_id) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์นำเข้าเมนูให้ร้านนี้';
  END IF;
  IF p_source <> 'local_ocr' THEN RAISE EXCEPTION 'แหล่งข้อมูลนำเข้าไม่ถูกต้อง'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'รายการเมนูต้องเป็นชุดข้อมูลแบบ array'; END IF;

  v_requested := jsonb_array_length(p_rows);
  IF v_requested < 1 OR v_requested > 60 THEN RAISE EXCEPTION 'นำเข้าได้ครั้งละ 1 ถึง 60 รายการ'; END IF;

  -- Validate every row before the first write, so invalid input never creates a partial import.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    IF jsonb_typeof(v_row) <> 'object' THEN RAISE EXCEPTION 'รูปแบบรายการเมนูไม่ถูกต้อง'; END IF;
    v_name := left(btrim(coalesce(v_row->>'name', '')), 120);
    v_price := nullif(btrim(coalesce(v_row->>'price', '')), '')::numeric;
    v_stock := coalesce(nullif(btrim(coalesce(v_row->>'stock', '')), '')::integer, 0);
    v_category_name := left(btrim(coalesce(v_row->>'categoryName', '')), 80);
    IF char_length(v_name) < 1 THEN RAISE EXCEPTION 'ทุกรายการต้องมีชื่อเมนู'; END IF;
    IF v_price IS NULL OR v_price < 0 OR v_price > 1000000 THEN RAISE EXCEPTION 'ราคาเมนูต้องอยู่ระหว่าง 0 ถึง 1,000,000 บาท'; END IF;
    IF v_stock < 0 OR v_stock > 1000000 THEN RAISE EXCEPTION 'สต็อกเมนูไม่ถูกต้อง'; END IF;
  END LOOP;

  SELECT count(*) INTO v_existing_count
  FROM public.menu_items
  WHERE store_id = p_store_id AND archived_at IS NULL;

  -- Serialise imports for one store to keep duplicate checks deterministic inside this transaction.
  PERFORM pg_advisory_xact_lock(hashtext('menu-import:' || p_store_id));

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_name := left(btrim(v_row->>'name'), 120);
    v_price := (v_row->>'price')::numeric;
    v_stock := coalesce((v_row->>'stock')::integer, 0);
    v_category_name := left(btrim(coalesce(v_row->>'categoryName', '')), 80);

    IF EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE store_id = p_store_id
        AND archived_at IS NULL
        AND lower(btrim(name)) = lower(v_name)
    ) THEN
      v_duplicates := v_duplicates + 1;
      CONTINUE;
    END IF;

    v_category_id := NULL;
    IF v_category_name <> '' THEN
      SELECT id INTO v_category_id
      FROM public.menu_categories
      WHERE lower(btrim(name)) = lower(v_category_name)
        AND (store_id = p_store_id OR store_id IS NULL)
      ORDER BY (store_id = p_store_id) DESC, sort_order ASC
      LIMIT 1;

      IF v_category_id IS NULL THEN
        v_category_id := 'menu-cat-' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO public.menu_categories (id, store_id, name, description, icon, sort_order, active)
        VALUES (v_category_id, p_store_id, v_category_name, '', '🍜', 999, true);
        v_created_categories := v_created_categories + 1;
      END IF;
    END IF;

    v_item_id := 'menu-import-' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.menu_items (
      id, store_id, name, emoji, description, price, cost, stock, available, promo, image_url, category_id
    ) VALUES (
      v_item_id, p_store_id, v_name, '🍜', '', v_price, 0, v_stock, false, false, NULL, v_category_id
    );
    v_inserted := v_inserted + 1;
    v_imported_ids := v_imported_ids || jsonb_build_array(v_item_id);
  END LOOP;

  INSERT INTO public.menu_import_audit (
    actor_id, store_id, source, requested_count, inserted_count, skipped_duplicate_count, created_category_count, imported_item_ids
  ) VALUES (
    v_actor_id, p_store_id, p_source, v_requested, v_inserted, v_duplicates, v_created_categories, v_imported_ids
  );

  IF v_is_admin THEN
    INSERT INTO public.admin_action_audit (
      actor_id, action, reason, before_state, after_state, target_type, target_id, metadata
    ) VALUES (
      v_actor_id,
      'menu_local_ocr_import',
      'admin reviewed local OCR menu draft',
      jsonb_build_object('active_menu_count', v_existing_count),
      jsonb_build_object('inserted_count', v_inserted, 'skipped_duplicate_count', v_duplicates),
      'store',
      p_store_id,
      jsonb_build_object('source', p_source, 'requested_count', v_requested, 'created_category_count', v_created_categories, 'item_ids', v_imported_ids)
    );
  END IF;

  RETURN jsonb_build_object(
    'inserted_count', v_inserted,
    'skipped_duplicate_count', v_duplicates,
    'created_category_count', v_created_categories,
    'imported_item_ids', v_imported_ids,
    'available', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_menu_drafts(text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_menu_drafts(text, jsonb, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

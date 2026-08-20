-- Wave P2a: merchant-controlled operating hours are server-authorized and auditable.
CREATE TABLE IF NOT EXISTS public.store_opening_hours (
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT false,
  open_time time,
  close_time time,
  order_cutoff_minutes integer NOT NULL DEFAULT 30 CHECK (order_cutoff_minutes BETWEEN 0 AND 180),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, weekday),
  CHECK ((is_closed IS TRUE AND open_time IS NULL AND close_time IS NULL) OR (is_closed IS FALSE AND open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time))
);

CREATE TABLE IF NOT EXISTS public.store_operation_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('merchant_operations_updated','admin_operations_updated')),
  reason text NOT NULL DEFAULT '',
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_operation_events_store_created_idx ON public.store_operation_events(store_id, created_at DESC);

ALTER TABLE public.store_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_operation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store hours owner or admin read" ON public.store_opening_hours;
CREATE POLICY "store hours owner or admin read" ON public.store_opening_hours FOR SELECT TO authenticated USING (private.owns_store(store_id) OR private.has_role('admin'));
DROP POLICY IF EXISTS "store operation events owner or admin read" ON public.store_operation_events;
CREATE POLICY "store operation events owner or admin read" ON public.store_operation_events FOR SELECT TO authenticated USING (private.owns_store(store_id) OR private.has_role('admin'));

CREATE OR REPLACE FUNCTION private.store_accepts_food_orders(target_store_id text, at_time timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_store public.stores%ROWTYPE; v_hour public.store_opening_hours%ROWTYPE; v_local timestamp; v_time time; v_weekday smallint;
BEGIN
  SELECT * INTO v_store FROM public.stores WHERE id = target_store_id;
  IF NOT FOUND OR v_store.active IS NOT TRUE OR v_store.emergency_closed IS TRUE OR v_store.moderation_status <> 'active' THEN RETURN false; END IF;
  v_local := at_time AT TIME ZONE 'Asia/Bangkok'; v_time := v_local::time; v_weekday := EXTRACT(DOW FROM v_local)::smallint;
  SELECT * INTO v_hour FROM public.store_opening_hours WHERE store_id = target_store_id AND weekday = v_weekday;
  IF FOUND THEN
    IF v_hour.is_closed THEN RETURN false; END IF;
    RETURN v_time >= v_hour.open_time AND v_time < (v_hour.close_time - make_interval(mins => v_hour.order_cutoff_minutes));
  END IF;
  RETURN v_time >= v_store.open_time AND v_time < (v_store.close_time - make_interval(mins => v_store.order_cutoff_minutes));
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_update_store_operations(
  p_active boolean,
  p_emergency_closed boolean,
  p_emergency_note text,
  p_hours jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_store public.stores%ROWTYPE; v_before jsonb; v_hours jsonb := COALESCE(p_hours, '[]'::jsonb); v_row jsonb; v_weekday integer; v_open time; v_close time; v_cutoff integer;
BEGIN
  SELECT * INTO v_store FROM public.stores WHERE owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบร้านค้าที่ผูกกับบัญชีนี้'; END IF;
  IF p_active IS NULL OR p_emergency_closed IS NULL OR jsonb_typeof(v_hours) <> 'array' OR jsonb_array_length(v_hours) <> 7 THEN RAISE EXCEPTION 'ข้อมูลสถานะร้านหรือตารางเวลาไม่ครบ'; END IF;
  IF p_emergency_closed AND length(trim(COALESCE(p_emergency_note, ''))) < 3 THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลปิดฉุกเฉินอย่างน้อย 3 ตัวอักษร'; END IF;
  v_before := jsonb_build_object('active', v_store.active, 'emergency_closed', v_store.emergency_closed, 'emergency_note', v_store.emergency_note, 'hours', COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday', weekday, 'is_closed', is_closed, 'open_time', open_time, 'close_time', close_time, 'order_cutoff_minutes', order_cutoff_minutes) ORDER BY weekday) FROM public.store_opening_hours WHERE store_id = v_store.id), '[]'::jsonb));
  FOR v_row IN SELECT value FROM jsonb_array_elements(v_hours) LOOP
    v_weekday := (v_row->>'weekday')::integer;
    IF v_weekday < 0 OR v_weekday > 6 THEN RAISE EXCEPTION 'วันในตารางเวลาไม่ถูกต้อง'; END IF;
    IF COALESCE((v_row->>'is_closed')::boolean, false) THEN
      INSERT INTO public.store_opening_hours(store_id, weekday, is_closed, open_time, close_time, order_cutoff_minutes, updated_by, updated_at)
      VALUES (v_store.id, v_weekday, true, NULL, NULL, 0, auth.uid(), now())
      ON CONFLICT (store_id, weekday) DO UPDATE SET is_closed = true, open_time = NULL, close_time = NULL, order_cutoff_minutes = 0, updated_by = auth.uid(), updated_at = now();
    ELSE
      v_open := (v_row->>'open_time')::time; v_close := (v_row->>'close_time')::time; v_cutoff := COALESCE((v_row->>'order_cutoff_minutes')::integer, v_store.order_cutoff_minutes);
      IF v_open IS NULL OR v_close IS NULL OR v_open >= v_close OR v_cutoff < 0 OR v_cutoff > 180 OR v_close - make_interval(mins => v_cutoff) <= v_open THEN RAISE EXCEPTION 'เวลาเปิด ปิด หรือเวลาตัดรับออร์เดอร์ไม่ถูกต้อง'; END IF;
      INSERT INTO public.store_opening_hours(store_id, weekday, is_closed, open_time, close_time, order_cutoff_minutes, updated_by, updated_at)
      VALUES (v_store.id, v_weekday, false, v_open, v_close, v_cutoff, auth.uid(), now())
      ON CONFLICT (store_id, weekday) DO UPDATE SET is_closed = false, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, order_cutoff_minutes = EXCLUDED.order_cutoff_minutes, updated_by = auth.uid(), updated_at = now();
    END IF;
  END LOOP;
  UPDATE public.stores SET active = p_active, emergency_closed = p_emergency_closed, emergency_note = CASE WHEN p_emergency_closed THEN left(trim(p_emergency_note), 500) ELSE NULL END, emergency_closed_at = CASE WHEN p_emergency_closed THEN now() ELSE NULL END, updated_at = now() WHERE id = v_store.id;
  INSERT INTO public.store_operation_events(store_id, actor_id, action, reason, before_state, after_state)
  SELECT v_store.id, auth.uid(), 'merchant_operations_updated', CASE WHEN p_emergency_closed THEN left(trim(p_emergency_note), 500) ELSE '' END, v_before, jsonb_build_object('active', p_active, 'emergency_closed', p_emergency_closed, 'hours', v_hours);
  RETURN (SELECT jsonb_build_object('store_id', id, 'active', active, 'emergency_closed', emergency_closed, 'emergency_note', emergency_note) FROM public.stores WHERE id = v_store.id);
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_update_store_operations(boolean, boolean, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_update_store_operations(boolean, boolean, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION private.store_accepts_food_orders(text, timestamptz) FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';

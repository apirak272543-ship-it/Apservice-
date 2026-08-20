CREATE TABLE IF NOT EXISTS public.store_gp_rate_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  previous_gp_percent numeric NOT NULL CHECK (previous_gp_percent BETWEEN 0 AND 100),
  gp_percent numeric NOT NULL CHECK (gp_percent BETWEEN 0 AND 100),
  effective_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_gp_rate_history_store_effective_idx ON public.store_gp_rate_history(store_id, effective_at DESC);
ALTER TABLE public.store_gp_rate_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store gp history owner or admin read" ON public.store_gp_rate_history;
CREATE POLICY "store gp history owner or admin read" ON public.store_gp_rate_history FOR SELECT TO authenticated USING (private.owns_store(store_id) OR private.has_role('admin'));
NOTIFY pgrst, 'reload schema';

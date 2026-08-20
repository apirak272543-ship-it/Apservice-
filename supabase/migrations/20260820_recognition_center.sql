-- AP Service Recognition Center v1
-- Keeps historical Recognition separate from the Customer page's live Tier calculation.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.recognition_config (
  config_key text PRIMARY KEY,
  numeric_value numeric NOT NULL CHECK (numeric_value >= 0),
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.recognition_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_role text NOT NULL CHECK (subject_role IN ('store', 'rider')),
  subject_id text NOT NULL,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('daily', 'weekly', 'monthly')),
  period_key text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  comparison_group text NOT NULL DEFAULT 'platform',
  ranking_position integer,
  tier smallint CHECK (tier BETWEEN 1 AND 5),
  quality_score numeric NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  completed_orders integer NOT NULL DEFAULT 0 CHECK (completed_orders >= 0),
  average_rating numeric NOT NULL DEFAULT 0 CHECK (average_rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  private_total numeric NOT NULL DEFAULT 0 CHECK (private_total >= 0),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_role, subject_id, scope, period_key)
);

CREATE TABLE IF NOT EXISTS public.recognition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_role text NOT NULL CHECK (subject_role IN ('store', 'rider')),
  subject_id text NOT NULL,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id uuid REFERENCES public.recognition_snapshots(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('tier_earned', 'tier_promoted', 'tier_streak_3', 'top_50_quality', 'monthly_milestone')),
  scope text NOT NULL CHECK (scope IN ('weekly', 'monthly')),
  period_key text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_role, subject_id, event_type, scope, period_key)
);

CREATE INDEX IF NOT EXISTS recognition_snapshots_owner_period_idx ON public.recognition_snapshots(subject_user_id, period_end DESC);
CREATE INDEX IF NOT EXISTS recognition_events_owner_unseen_idx ON public.recognition_events(subject_user_id, seen_at, created_at DESC);

ALTER TABLE public.recognition_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recognition_config_admin_only ON public.recognition_config;
CREATE POLICY recognition_config_admin_only ON public.recognition_config FOR ALL TO authenticated
  USING (private.has_role('admin')) WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS recognition_snapshots_owner_or_admin ON public.recognition_snapshots;
CREATE POLICY recognition_snapshots_owner_or_admin ON public.recognition_snapshots FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS recognition_events_owner_or_admin ON public.recognition_events;
CREATE POLICY recognition_events_owner_or_admin ON public.recognition_events FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid() OR private.has_role('admin'));

INSERT INTO public.recognition_config(config_key, numeric_value, description)
VALUES
  ('minimum_completed_orders_daily', 1, 'จำนวนงานสำเร็จขั้นต่ำสำหรับข้อมูลรายวัน'),
  ('minimum_completed_orders_weekly', 3, 'จำนวนงานสำเร็จขั้นต่ำเพื่อได้รับ Tier รายสัปดาห์'),
  ('minimum_completed_orders_monthly', 12, 'จำนวนงานสำเร็จขั้นต่ำเพื่อได้รับ Tier และ milestone รายเดือน'),
  ('top_quality_limit', 50, 'จำนวนผู้ให้บริการคุณภาพสูงสูงสุดต่อกลุ่มเปรียบเทียบ')
ON CONFLICT (config_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.recognition_config_number(p_key text, p_default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$ SELECT COALESCE((SELECT numeric_value FROM public.recognition_config WHERE config_key = p_key), p_default); $$;

CREATE OR REPLACE FUNCTION public.fn_compute_store_tier(p_period_start timestamptz, p_period_end timestamptz, p_category_id text DEFAULT NULL)
RETURNS TABLE(subject_id text, subject_user_id uuid, comparison_group text, ranking_position integer, tier smallint, quality_score numeric, completed_orders integer, average_rating numeric, review_count integer, private_total numeric, metrics jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH threshold AS (
    SELECT CASE WHEN p_period_end - p_period_start >= interval '28 days' THEN private.recognition_config_number('minimum_completed_orders_monthly', 12)
                WHEN p_period_end - p_period_start >= interval '7 days' THEN private.recognition_config_number('minimum_completed_orders_weekly', 3)
                ELSE private.recognition_config_number('minimum_completed_orders_daily', 1) END::integer AS minimum_orders
  ), orders AS (
    SELECT store_id, count(*)::integer AS completed_orders, coalesce(sum(total),0)::numeric AS sales_total
    FROM public.delivery_orders
    WHERE completed_at >= p_period_start AND completed_at < p_period_end AND completed_at IS NOT NULL
    GROUP BY store_id
  ), reviews AS (
    SELECT store_id, avg(rating)::numeric AS average_rating, count(*)::integer AS review_count
    FROM public.order_reviews
    WHERE target_type = 'store' AND status = 'PUBLISHED' AND created_at >= p_period_start AND created_at < p_period_end
    GROUP BY store_id
  ), candidates AS (
    SELECT s.id, s.owner_id, coalesce(nullif(s.category_id,''),'uncategorized') AS comparison_group,
      o.completed_orders, o.sales_total, coalesce(r.average_rating,s.rating,0)::numeric AS average_rating,
      coalesce(r.review_count,0)::integer AS review_count,
      CASE WHEN s.active AND NOT s.emergency_closed AND s.moderation_status = 'active' THEN 1::numeric ELSE 0::numeric END AS availability
    FROM public.stores s JOIN orders o ON o.store_id = s.id LEFT JOIN reviews r ON r.store_id = s.id CROSS JOIN threshold t
    WHERE s.owner_id IS NOT NULL AND o.completed_orders >= t.minimum_orders AND (p_category_id IS NULL OR s.category_id = p_category_id)
  ), normalized AS (
    SELECT *, greatest(max(completed_orders) OVER (PARTITION BY comparison_group),1) AS max_orders,
      greatest(max(review_count) OVER (PARTITION BY comparison_group),1) AS max_reviews
    FROM candidates
  ), scored AS (
    SELECT *, round((least(average_rating/5,1) * least(review_count::numeric/max_reviews,1) * 40)
      + (completed_orders::numeric/max_orders * 30) + (availability * 15) + (least(completed_orders::numeric/3,1) * 15),2) AS score
    FROM normalized
  ), ranked AS (
    SELECT *, row_number() OVER (PARTITION BY comparison_group ORDER BY score DESC, average_rating DESC, completed_orders DESC, id) AS position
    FROM scored
  )
  SELECT id, owner_id, comparison_group, position::integer,
    CASE WHEN position <= 5 THEN position::smallint ELSE NULL END, score, completed_orders, round(average_rating,2), review_count, round(sales_total,2),
    jsonb_build_object('availability',availability,'sales_total',round(sales_total,2),'rating_weighted',round(least(average_rating/5,1)*least(review_count::numeric/max_reviews,1)*40,2))
  FROM ranked;
$$;

CREATE OR REPLACE FUNCTION public.fn_compute_rider_tier(p_period_start timestamptz, p_period_end timestamptz, p_zone text DEFAULT NULL)
RETURNS TABLE(subject_id text, subject_user_id uuid, comparison_group text, ranking_position integer, tier smallint, quality_score numeric, completed_orders integer, average_rating numeric, review_count integer, private_total numeric, metrics jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH threshold AS (
    SELECT CASE WHEN p_period_end - p_period_start >= interval '28 days' THEN private.recognition_config_number('minimum_completed_orders_monthly', 12)
                WHEN p_period_end - p_period_start >= interval '7 days' THEN private.recognition_config_number('minimum_completed_orders_weekly', 3)
                ELSE private.recognition_config_number('minimum_completed_orders_daily', 1) END::integer AS minimum_orders
  ), orders AS (
    SELECT rider_id, count(*)::integer AS completed_orders FROM public.delivery_orders
    WHERE completed_at >= p_period_start AND completed_at < p_period_end AND completed_at IS NOT NULL AND rider_id IS NOT NULL GROUP BY rider_id
  ), earnings AS (
    SELECT rider_id, coalesce(sum(rider_share),0)::numeric AS income_total FROM public.rider_earnings
    WHERE completed_at >= p_period_start AND completed_at < p_period_end AND settlement_status = 'settled' GROUP BY rider_id
  ), reviews AS (
    SELECT rider_id, avg(rating)::numeric AS average_rating, count(*)::integer AS review_count FROM public.order_reviews
    WHERE target_type = 'rider' AND status = 'PUBLISHED' AND created_at >= p_period_start AND created_at < p_period_end GROUP BY rider_id
  ), candidates AS (
    SELECT r.id, r.user_id, 'platform'::text AS comparison_group, o.completed_orders, coalesce(e.income_total,0)::numeric AS income_total,
      coalesce(v.average_rating,r.rating,0)::numeric AS average_rating, coalesce(v.review_count,0)::integer AS review_count,
      CASE WHEN r.ride_available AND r.compliance_status = 'approved' THEN 1::numeric ELSE 0::numeric END AS availability
    FROM public.riders r JOIN orders o ON o.rider_id = r.id LEFT JOIN earnings e ON e.rider_id = r.id LEFT JOIN reviews v ON v.rider_id = r.id CROSS JOIN threshold t
    WHERE r.user_id IS NOT NULL AND r.ride_available AND r.compliance_status = 'approved' AND o.completed_orders >= t.minimum_orders
  ), normalized AS (
    SELECT *, greatest(max(completed_orders) OVER (),1) AS max_orders, greatest(max(review_count) OVER (),1) AS max_reviews FROM candidates
  ), scored AS (
    SELECT *, round((least(average_rating/5,1)*least(review_count::numeric/max_reviews,1)*40) + (completed_orders::numeric/max_orders*35) + (availability*15) + (least(completed_orders::numeric/3,1)*10),2) AS score FROM normalized
  ), ranked AS (
    SELECT *, row_number() OVER (ORDER BY score DESC, average_rating DESC, completed_orders DESC, id) AS position FROM scored
  )
  SELECT id, user_id, comparison_group, position::integer, CASE WHEN position <= 5 THEN position::smallint ELSE NULL END, score, completed_orders, round(average_rating,2), review_count, round(income_total,2),
    jsonb_build_object('availability',availability,'income_total',round(income_total,2),'rating_weighted',round(least(average_rating/5,1)*least(review_count::numeric/max_reviews,1)*40,2)) FROM ranked;
$$;

CREATE OR REPLACE FUNCTION private.persist_recognition_scope(p_scope text, p_period_start timestamptz, p_period_end timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp
AS $$
DECLARE v_key text := to_char(p_period_start AT TIME ZONE 'Asia/Bangkok', CASE WHEN p_scope = 'daily' THEN 'YYYY-MM-DD' WHEN p_scope = 'weekly' THEN 'IYYY-"W"IW' ELSE 'YYYY-MM' END); v_count integer := 0; v_top_limit integer := private.recognition_config_number('top_quality_limit',50)::integer;
BEGIN
  INSERT INTO public.recognition_snapshots(subject_role,subject_id,subject_user_id,scope,period_key,period_start,period_end,comparison_group,ranking_position,tier,quality_score,completed_orders,average_rating,review_count,private_total,metrics)
  SELECT 'store', subject_id, subject_user_id, p_scope, v_key, p_period_start, p_period_end, comparison_group, ranking_position, tier, quality_score, completed_orders, average_rating, review_count, private_total, metrics FROM public.fn_compute_store_tier(p_period_start,p_period_end)
  ON CONFLICT (subject_role,subject_id,scope,period_key) DO UPDATE SET ranking_position=EXCLUDED.ranking_position,tier=EXCLUDED.tier,quality_score=EXCLUDED.quality_score,completed_orders=EXCLUDED.completed_orders,average_rating=EXCLUDED.average_rating,review_count=EXCLUDED.review_count,private_total=EXCLUDED.private_total,metrics=EXCLUDED.metrics,computed_at=now();
  INSERT INTO public.recognition_snapshots(subject_role,subject_id,subject_user_id,scope,period_key,period_start,period_end,comparison_group,ranking_position,tier,quality_score,completed_orders,average_rating,review_count,private_total,metrics)
  SELECT 'rider', subject_id, subject_user_id, p_scope, v_key, p_period_start, p_period_end, comparison_group, ranking_position, tier, quality_score, completed_orders, average_rating, review_count, private_total, metrics FROM public.fn_compute_rider_tier(p_period_start,p_period_end)
  ON CONFLICT (subject_role,subject_id,scope,period_key) DO UPDATE SET ranking_position=EXCLUDED.ranking_position,tier=EXCLUDED.tier,quality_score=EXCLUDED.quality_score,completed_orders=EXCLUDED.completed_orders,average_rating=EXCLUDED.average_rating,review_count=EXCLUDED.review_count,private_total=EXCLUDED.private_total,metrics=EXCLUDED.metrics,computed_at=now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF p_scope = 'daily' THEN RETURN v_count; END IF;
  INSERT INTO public.recognition_events(subject_role,subject_id,subject_user_id,snapshot_id,event_type,scope,period_key,title,message,payload)
  SELECT s.subject_role,s.subject_id,s.subject_user_id,s.id,'tier_earned',p_scope,v_key,'ยินดีด้วย คุณได้รับ Tier '||s.tier,'คุณได้รับ Tier '||s.tier||' จากผลงานรอบล่าสุด',jsonb_build_object('tier',s.tier,'completed_orders',s.completed_orders,'average_rating',s.average_rating)
  FROM public.recognition_snapshots s LEFT JOIN LATERAL (SELECT tier FROM public.recognition_snapshots p WHERE p.subject_role=s.subject_role AND p.subject_id=s.subject_id AND p.scope=s.scope AND p.period_start<s.period_start ORDER BY p.period_start DESC LIMIT 1) prior ON true
  WHERE s.scope=p_scope AND s.period_key=v_key AND s.tier IS NOT NULL AND prior.tier IS NULL
  ON CONFLICT (subject_role,subject_id,event_type,scope,period_key) DO NOTHING;
  INSERT INTO public.recognition_events(subject_role,subject_id,subject_user_id,snapshot_id,event_type,scope,period_key,title,message,payload)
  SELECT s.subject_role,s.subject_id,s.subject_user_id,s.id,'tier_promoted','weekly',v_key,'Tier ของคุณดีขึ้นเป็นระดับ '||s.tier,'ขอแสดงความยินดีกับการพัฒนาจาก Tier '||prior.tier||' เป็น Tier '||s.tier,jsonb_build_object('tier',s.tier,'previous_tier',prior.tier)
  FROM public.recognition_snapshots s JOIN LATERAL (SELECT tier FROM public.recognition_snapshots p WHERE p.subject_role=s.subject_role AND p.subject_id=s.subject_id AND p.scope='weekly' AND p.period_start<s.period_start AND p.tier IS NOT NULL ORDER BY p.period_start DESC LIMIT 1) prior ON true
  WHERE p_scope='weekly' AND s.scope='weekly' AND s.period_key=v_key AND s.tier < prior.tier
  ON CONFLICT (subject_role,subject_id,event_type,scope,period_key) DO NOTHING;
  INSERT INTO public.recognition_events(subject_role,subject_id,subject_user_id,snapshot_id,event_type,scope,period_key,title,message,payload)
  SELECT s.subject_role,s.subject_id,s.subject_user_id,s.id,'tier_streak_3','weekly',v_key,'รักษา Tier '||s.tier||' ต่อเนื่อง 3 สัปดาห์','คุณรักษา Tier '||s.tier||' ได้ต่อเนื่องครบ 3 สัปดาห์แล้ว',jsonb_build_object('tier',s.tier,'streak_weeks',3)
  FROM public.recognition_snapshots s JOIN LATERAL (
    SELECT array_agg(tier ORDER BY period_start DESC) AS tiers, array_agg(period_start ORDER BY period_start DESC) AS starts, count(*) AS item_count
    FROM (SELECT tier,period_start FROM public.recognition_snapshots p WHERE p.subject_role=s.subject_role AND p.subject_id=s.subject_id AND p.scope='weekly' AND p.period_start<=s.period_start ORDER BY p.period_start DESC LIMIT 3) recent
  ) history ON true
  WHERE p_scope='weekly' AND s.scope='weekly' AND s.period_key=v_key AND s.tier IS NOT NULL AND history.item_count=3
    AND history.tiers[1]=s.tier AND history.tiers[2]=s.tier AND history.tiers[3]=s.tier
    AND history.starts[2]=s.period_start-interval '7 days' AND history.starts[3]=s.period_start-interval '14 days'
  ON CONFLICT (subject_role,subject_id,event_type,scope,period_key) DO NOTHING;
  INSERT INTO public.recognition_events(subject_role,subject_id,subject_user_id,snapshot_id,event_type,scope,period_key,title,message,payload)
  SELECT s.subject_role,s.subject_id,s.subject_user_id,s.id,'top_50_quality',p_scope,v_key,'ผู้ให้บริการคุณภาพสูง 1 ใน 50','ผลงานคุณติดกลุ่มผู้ให้บริการคุณภาพสูงของรอบนี้',jsonb_build_object('badge','top_50_quality')
  FROM public.recognition_snapshots s WHERE s.scope=p_scope AND s.period_key=v_key AND s.ranking_position<=v_top_limit AND coalesce(s.tier,99)>3
  ON CONFLICT (subject_role,subject_id,event_type,scope,period_key) DO NOTHING;
  INSERT INTO public.recognition_events(subject_role,subject_id,subject_user_id,snapshot_id,event_type,scope,period_key,title,message,payload)
  SELECT s.subject_role,s.subject_id,s.subject_user_id,s.id,'monthly_milestone','monthly',v_key,'สรุปผลงานประจำเดือน','คุณปิดเดือนด้วยผลงานที่ผ่านเกณฑ์ Recognition',jsonb_build_object('completed_orders',s.completed_orders,'average_rating',s.average_rating,'private_total',s.private_total)
  FROM public.recognition_snapshots s WHERE p_scope='monthly' AND s.scope='monthly' AND s.period_key=v_key AND s.completed_orders>=private.recognition_config_number('minimum_completed_orders_monthly',12)
  ON CONFLICT (subject_role,subject_id,event_type,scope,period_key) DO NOTHING;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_run_daily_recognition() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp AS $$ DECLARE d date := (now() AT TIME ZONE 'Asia/Bangkok')::date - 1; BEGIN RETURN private.persist_recognition_scope('daily', d::timestamp AT TIME ZONE 'Asia/Bangkok', (d+1)::timestamp AT TIME ZONE 'Asia/Bangkok'); END; $$;
CREATE OR REPLACE FUNCTION public.fn_run_weekly_recognition() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp AS $$ DECLARE d date := date_trunc('week',(now() AT TIME ZONE 'Asia/Bangkok'))::date - 7; BEGIN RETURN private.persist_recognition_scope('weekly', d::timestamp AT TIME ZONE 'Asia/Bangkok', (d+7)::timestamp AT TIME ZONE 'Asia/Bangkok'); END; $$;
CREATE OR REPLACE FUNCTION public.fn_run_monthly_recognition() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp AS $$ DECLARE d date := date_trunc('month',(now() AT TIME ZONE 'Asia/Bangkok'))::date; BEGIN IF (now() AT TIME ZONE 'Asia/Bangkok')::date <> d THEN RETURN 0; END IF; RETURN private.persist_recognition_scope('monthly', (d-interval '1 month')::timestamp AT TIME ZONE 'Asia/Bangkok', d::timestamp AT TIME ZONE 'Asia/Bangkok'); END; $$;

CREATE OR REPLACE FUNCTION public.recognition_mark_event_seen(p_event_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp AS $$ BEGIN UPDATE public.recognition_events SET seen_at=coalesce(seen_at,now()) WHERE id=p_event_id AND (subject_user_id=auth.uid() OR private.has_role('admin')); IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบเหตุการณ์ Recognition ที่เข้าถึงได้'; END IF; END; $$;

CREATE OR REPLACE FUNCTION private.configure_recognition_cron() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = cron, public, private, pg_temp AS $$ DECLARE j record; BEGIN FOR j IN SELECT jobid FROM cron.job WHERE jobname IN ('apservice-recognition-daily','apservice-recognition-weekly','apservice-recognition-monthly') LOOP PERFORM cron.unschedule(j.jobid); END LOOP; PERFORM cron.schedule('apservice-recognition-daily','15 19 * * *','SELECT public.fn_run_daily_recognition();'); PERFORM cron.schedule('apservice-recognition-weekly','30 19 * * 0','SELECT public.fn_run_weekly_recognition();'); PERFORM cron.schedule('apservice-recognition-monthly','15 20 28-31 * *','SELECT public.fn_run_monthly_recognition();'); END; $$;

SELECT private.configure_recognition_cron();

REVOKE ALL ON FUNCTION public.fn_compute_store_tier(timestamptz,timestamptz,text), public.fn_compute_rider_tier(timestamptz,timestamptz,text), public.fn_run_daily_recognition(), public.fn_run_weekly_recognition(), public.fn_run_monthly_recognition(), public.recognition_mark_event_seen(uuid), private.persist_recognition_scope(text,timestamptz,timestamptz), private.configure_recognition_cron() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recognition_mark_event_seen(uuid) TO authenticated;

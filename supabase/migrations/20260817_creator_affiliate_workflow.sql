-- Secure workflow functions for referral capture and order attribution.

create or replace function public.start_creator_referral(
  p_code text,
  p_anonymous_token uuid,
  p_landing_path text default '/',
  p_source_url text default ''
)
returns table (
  referral_session_id uuid,
  campaign_id uuid,
  creator_id uuid,
  referral_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.creator_campaigns%rowtype;
  v_expiry timestamptz;
  v_session_id uuid;
begin
  select c.* into v_campaign
  from public.creator_campaigns c
  join public.creators cr on cr.id = c.creator_id
  where c.referral_code = upper(trim(p_code))
    and c.status = 'active'
    and cr.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
  limit 1;
  if not found then
    return;
  end if;

  v_expiry := now() + make_interval(days => v_campaign.attribution_window_days);
  insert into public.creator_referral_sessions (
    campaign_id, anonymous_token, customer_id, landing_path, source_url, first_seen_at, last_seen_at, expires_at
  ) values (
    v_campaign.id, p_anonymous_token, auth.uid(), coalesce(nullif(trim(p_landing_path), ''), '/'), left(coalesce(p_source_url, ''), 1500), now(), now(), v_expiry
  )
  on conflict (anonymous_token) do update set
    campaign_id = excluded.campaign_id,
    customer_id = coalesce(public.creator_referral_sessions.customer_id, excluded.customer_id),
    landing_path = excluded.landing_path,
    source_url = excluded.source_url,
    last_seen_at = now(),
    expires_at = excluded.expires_at
  returning id into v_session_id;

  return query select v_session_id, v_campaign.id, v_campaign.creator_id, v_campaign.referral_code, v_expiry;
end;
$$;

create or replace function public.attribute_creator_order(
  p_order_id text,
  p_code text,
  p_anonymous_token uuid default null
)
returns table (
  attribution_id uuid,
  commission_id uuid,
  campaign_id uuid,
  creator_id uuid,
  referral_code text,
  commission_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.delivery_orders%rowtype;
  v_campaign public.creator_campaigns%rowtype;
  v_session public.creator_referral_sessions%rowtype;
  v_attribution_id uuid;
  v_commission_id uuid;
  v_basis_amount numeric(12,2);
  v_commission_amount numeric(12,2);
  v_status text := 'pending_qualification';
  v_method text := 'code';
begin
  select * into v_order from public.delivery_orders where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบออร์เดอร์ที่ต้องการผูกรหัสแนะนำ';
  end if;
  if auth.uid() is null or v_order.customer_id is distinct from auth.uid() then
    raise exception 'คุณไม่มีสิทธิ์ผูกรหัสแนะนำกับออร์เดอร์นี้';
  end if;

  select c.* into v_campaign
  from public.creator_campaigns c
  join public.creators cr on cr.id = c.creator_id
  where c.referral_code = upper(trim(p_code))
    and c.status = 'active'
    and cr.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
  limit 1;
  if not found then
    raise exception 'รหัส Creator ใช้งานไม่ได้หรือหมดอายุแล้ว';
  end if;

  if p_anonymous_token is not null then
    select * into v_session
    from public.creator_referral_sessions
    where anonymous_token = p_anonymous_token and campaign_id = v_campaign.id and expires_at >= now()
    limit 1;
    if found then
      v_method := 'both';
      update public.creator_referral_sessions set customer_id = coalesce(customer_id, auth.uid()), converted_at = coalesce(converted_at, now()), last_seen_at = now() where id = v_session.id;
    end if;
  end if;

  v_basis_amount := case when v_campaign.commission_basis = 'order_total_excluding_delivery'
    then greatest(coalesce(v_order.total, 0) - coalesce(v_order.delivery_fee, 0), 0)
    else greatest(coalesce(v_order.total, 0), 0)
  end;
  v_commission_amount := round(v_basis_amount * v_campaign.commission_rate / 100.0, 2);
  if lower(coalesce(v_order.status, '')) in ('สำเร็จแล้ว','เสร็จสิ้นแล้ว','completed','delivered') then
    v_status := 'qualified';
  elsif lower(coalesce(v_order.status, '')) in ('ยกเลิก','cancelled','canceled','refunded') then
    v_status := 'void';
  end if;

  insert into public.creator_order_attributions (
    order_id, campaign_id, creator_id, referral_session_id, attribution_method, referral_code_snapshot, order_status_snapshot
  ) values (
    v_order.id, v_campaign.id, v_campaign.creator_id, v_session.id, v_method, v_campaign.referral_code, coalesce(v_order.status, '')
  ) on conflict (order_id) do update set updated_at = now()
  returning id into v_attribution_id;

  insert into public.creator_commissions (
    attribution_id, creator_id, campaign_id, order_id, commission_rate, commission_basis, commissionable_amount, commission_amount, status, qualified_at
  ) values (
    v_attribution_id, v_campaign.creator_id, v_campaign.id, v_order.id, v_campaign.commission_rate, v_campaign.commission_basis, v_basis_amount, v_commission_amount, v_status,
    case when v_status = 'qualified' then now() else null end
  ) on conflict (order_id) do update set updated_at = now()
  returning id into v_commission_id;

  return query select v_attribution_id, v_commission_id, v_campaign.id, v_campaign.creator_id, v_campaign.referral_code, v_status;
end;
$$;

create or replace function public.sync_creator_commission_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_amount numeric(12,2);
  v_rate numeric(7,4);
  v_basis text;
begin
  select commission_rate, commission_basis into v_rate, v_basis
  from public.creator_commissions where order_id = new.id;
  if not found then return new; end if;

  v_amount := case when v_basis = 'order_total_excluding_delivery'
    then greatest(coalesce(new.total, 0) - coalesce(new.delivery_fee, 0), 0)
    else greatest(coalesce(new.total, 0), 0)
  end;
  if lower(coalesce(new.status, '')) in ('สำเร็จแล้ว','เสร็จสิ้นแล้ว','completed','delivered') then
    v_status := 'qualified';
  elsif lower(coalesce(new.status, '')) in ('ยกเลิก','cancelled','canceled','refunded') then
    v_status := 'void';
  else
    v_status := 'pending_qualification';
  end if;

  update public.creator_order_attributions
  set order_status_snapshot = coalesce(new.status, ''), updated_at = now()
  where order_id = new.id;

  update public.creator_commissions
  set commissionable_amount = v_amount,
      commission_amount = round(v_amount * v_rate / 100.0, 2),
      status = case when status in ('approved','paid') then status else v_status end,
      qualified_at = case when status not in ('approved','paid') and v_status = 'qualified' then coalesce(qualified_at, now()) else qualified_at end,
      updated_at = now()
  where order_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_creator_commission_from_order on public.delivery_orders;
create trigger trg_sync_creator_commission_from_order
after update of status, total, delivery_fee, completed_at on public.delivery_orders
for each row execute function public.sync_creator_commission_from_order();

grant execute on function public.start_creator_referral(text, uuid, text, text) to anon, authenticated;
grant execute on function public.attribute_creator_order(text, text, uuid) to authenticated;

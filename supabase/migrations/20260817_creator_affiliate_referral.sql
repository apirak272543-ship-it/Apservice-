-- Creator Affiliate & Referral: commission is always set per campaign; no default rate is assumed.

create or replace function public.is_creator_affiliate_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_creator_affiliate_admin() to authenticated;

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 140),
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  local_area text not null default '',
  platform text not null default 'other' check (platform in ('tiktok','facebook','instagram','youtube','other')),
  channel_url text not null default '',
  follower_count integer not null default 0 check (follower_count >= 0),
  status text not null default 'pending' check (status in ('pending','active','paused','archived')),
  payout_method text not null default 'bank' check (payout_method in ('bank','qr','cash','other')),
  payout_bank_name text,
  payout_account_name text,
  payout_account_number text,
  payout_qr_url text,
  note text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null default '',
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9][A-Z0-9-]{2,47}$'),
  landing_path text not null default '/',
  commission_rate numeric(7,4) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  commission_basis text not null default 'order_total_excluding_delivery' check (commission_basis in ('order_total','order_total_excluding_delivery')),
  attribution_window_days integer not null default 30 check (attribution_window_days between 1 and 90),
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_campaign_stores (
  campaign_id uuid not null references public.creator_campaigns(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, store_id)
);

create table if not exists public.creator_referral_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.creator_campaigns(id) on delete cascade,
  anonymous_token uuid not null unique default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  landing_path text not null default '/',
  source_url text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  converted_at timestamptz
);

create table if not exists public.creator_order_attributions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique references public.delivery_orders(id) on delete cascade,
  campaign_id uuid not null references public.creator_campaigns(id) on delete restrict,
  creator_id uuid not null references public.creators(id) on delete restrict,
  referral_session_id uuid references public.creator_referral_sessions(id) on delete set null,
  attribution_method text not null check (attribution_method in ('code','link','both')),
  referral_code_snapshot text not null,
  order_status_snapshot text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commissions (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null unique references public.creator_order_attributions(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete restrict,
  campaign_id uuid not null references public.creator_campaigns(id) on delete restrict,
  order_id text not null unique references public.delivery_orders(id) on delete restrict,
  commission_rate numeric(7,4) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_basis text not null check (commission_basis in ('order_total','order_total_excluding_delivery')),
  commissionable_amount numeric(12,2) not null default 0 check (commissionable_amount >= 0),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  status text not null default 'pending_qualification' check (status in ('pending_qualification','qualified','void','approved','paid')),
  qualified_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  payout_reference text,
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_content_rights (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  campaign_id uuid references public.creator_campaigns(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  content_url text not null,
  platform text not null default 'other' check (platform in ('tiktok','facebook','instagram','youtube','other')),
  allowed_channels jsonb not null default '[]'::jsonb,
  usage_scope text not null default 'organic_only' check (usage_scope in ('organic_only','paid_ads_allowed','all_platform_use')),
  consent_status text not null default 'pending' check (consent_status in ('pending','approved','revoked','expired')),
  consent_proof_url text,
  starts_at timestamptz,
  expires_at timestamptz,
  note text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_campaigns_creator_status_idx on public.creator_campaigns (creator_id, status);
create index if not exists creator_referral_sessions_campaign_expiry_idx on public.creator_referral_sessions (campaign_id, expires_at desc);
create index if not exists creator_order_attributions_creator_idx on public.creator_order_attributions (creator_id, created_at desc);
create index if not exists creator_commissions_creator_status_idx on public.creator_commissions (creator_id, status, created_at desc);
create index if not exists creator_content_rights_creator_status_idx on public.creator_content_rights (creator_id, consent_status, created_at desc);

alter table public.creators enable row level security;
alter table public.creator_campaigns enable row level security;
alter table public.creator_campaign_stores enable row level security;
alter table public.creator_referral_sessions enable row level security;
alter table public.creator_order_attributions enable row level security;
alter table public.creator_commissions enable row level security;
alter table public.creator_content_rights enable row level security;

create policy creators_admin_all on public.creators for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy creators_self_read on public.creators for select to authenticated using (user_id = auth.uid());
create policy campaigns_admin_all on public.creator_campaigns for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy campaign_stores_admin_all on public.creator_campaign_stores for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy referral_sessions_admin_all on public.creator_referral_sessions for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy order_attributions_admin_all on public.creator_order_attributions for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy commissions_admin_all on public.creator_commissions for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());
create policy content_rights_admin_all on public.creator_content_rights for all to authenticated using (public.is_creator_affiliate_admin()) with check (public.is_creator_affiliate_admin());

create policy campaigns_creator_read on public.creator_campaigns for select to authenticated using (
  exists (select 1 from public.creators c where c.id = creator_campaigns.creator_id and c.user_id = auth.uid())
);
create policy commissions_creator_read on public.creator_commissions for select to authenticated using (
  exists (select 1 from public.creators c where c.id = creator_commissions.creator_id and c.user_id = auth.uid())
);
create policy content_rights_creator_read on public.creator_content_rights for select to authenticated using (
  exists (select 1 from public.creators c where c.id = creator_content_rights.creator_id and c.user_id = auth.uid())
);

create or replace function public.resolve_creator_referral(p_code text)
returns table (
  campaign_id uuid,
  creator_id uuid,
  referral_code text,
  landing_path text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.creator_id, c.referral_code, c.landing_path, c.ends_at
  from public.creator_campaigns c
  join public.creators cr on cr.id = c.creator_id
  where c.referral_code = upper(trim(p_code))
    and c.status = 'active'
    and cr.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
  limit 1;
$$;

grant execute on function public.resolve_creator_referral(text) to anon, authenticated;

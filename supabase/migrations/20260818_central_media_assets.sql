-- Central Media registry: additive only. Existing URL/Data URL references remain untouched.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  owner_type text not null check (owner_type in ('customer', 'merchant', 'rider', 'admin', 'system')),
  media_type text not null check (media_type in ('STORE_LOGO', 'STORE_BACKGROUND', 'PRODUCT_IMAGE', 'USER_AVATAR', 'RIDER_AVATAR', 'BANNER', 'ADVERTISEMENT', 'PROMOTION', 'PAYMENT_SLIP', 'DELIVERY_PROOF', 'IDENTITY_DOCUMENT', 'LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE', 'QR_CODE', 'ADMIN_MEDIA', 'SYSTEM_MEDIA')),
  bucket_id text not null,
  storage_path text not null,
  visibility text not null check (visibility in ('public', 'private')),
  variant text not null default 'original',
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 1000000),
  width integer check (width > 0),
  height integer check (height > 0),
  version integer not null default 1 check (version > 0),
  status text not null default 'ready' check (status in ('processing', 'ready', 'replaced', 'archived', 'failed')),
  legacy_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create index if not exists media_assets_owner_created_idx on public.media_assets (owner_id, created_at desc);
create index if not exists media_assets_type_visibility_idx on public.media_assets (media_type, visibility, status);

alter table public.media_assets enable row level security;
grant select on public.media_assets to anon, authenticated;
grant insert, update on public.media_assets to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and policyname = 'media_assets_read_public_owner_or_admin') then
    create policy media_assets_read_public_owner_or_admin on public.media_assets for select to anon, authenticated using (visibility = 'public' or owner_id = auth.uid() or private.has_role('admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and policyname = 'media_assets_insert_owner') then
    create policy media_assets_insert_owner on public.media_assets for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and policyname = 'media_assets_update_owner_or_admin') then
    create policy media_assets_update_owner_or_admin on public.media_assets for update to authenticated using (owner_id = auth.uid() or private.has_role('admin')) with check (owner_id = auth.uid() or private.has_role('admin'));
  end if;
end $$;

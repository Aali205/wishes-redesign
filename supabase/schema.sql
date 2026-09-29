-- ---------------------------------------------------------------------------
-- Wishes orders. Run once in Supabase: Dashboard -> SQL Editor -> New query.
-- Customers (anon) may only place new, unpaid orders; only emails listed in
-- public.admins can read or update them.
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  email text primary key
);

create table if not exists public.orders (
  id text primary key check (id ~ '^W-[A-Z0-9]{4,16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(10, 2) not null check (total >= 0),
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 6 and 30),
  city text not null check (char_length(city) between 1 and 50),
  area text not null check (char_length(area) between 2 and 300),
  notes text check (char_length(notes) <= 1000),
  payment text not null check (payment in ('cod', 'shamcash')),
  txn text check (char_length(txn) <= 100),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  paid boolean not null default false
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.admins enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

drop policy if exists "customers place orders" on public.orders;
create policy "customers place orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'new' and paid = false and updated_at is null);

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins
  for select to authenticated
  using (public.is_admin());

revoke all on public.orders from anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update (status, paid, updated_at) on public.orders to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Dashboard admins (lower-case emails). Add the store owner's email here too.
insert into public.admins (email) values ('alihussinakil@gmail.com')
on conflict do nothing;

-- Customer order tracking lives in track_order.sql (run it after this file).

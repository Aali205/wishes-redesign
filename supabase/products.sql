-- ---------------------------------------------------------------------------
-- Products live in the database so the admin (and the admin assistant) can
-- add, edit, restock and delete them. Run after schema.sql.
--   * Everyone can read active products; only admins can change them.
--   * Product photos go to the public "product-images" storage bucket.
--   * Orders are re-priced from this table and stock is checked/decremented
--     when an order is placed, so a customer can't send their own prices.
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  "desc" text not null default '' check (char_length("desc") <= 300),
  details text not null default '' check (char_length(details) <= 2000),
  category text not null check (category in ('fragrance', 'body', 'hair', 'makeup')),
  price numeric(10, 2) not null check (price >= 0),
  image text not null default '' check (char_length(image) <= 500),
  tag text check (char_length(tag) <= 30),
  stock integer check (stock >= 0),  -- null = not tracked
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.products enable row level security;

drop policy if exists "anyone reads active products" on public.products;
create policy "anyone reads active products" on public.products
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Photo storage ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins change product images" on storage.objects;
create policy "admins change product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Orders: price from the catalogue and keep stock in step -----------------

create or replace function public.price_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  line jsonb;
  item record;
  qty integer;
  priced jsonb := '[]'::jsonb;
  sum_total numeric := 0;
begin
  if jsonb_array_length(new.items) = 0 then
    raise exception 'empty_order';
  end if;

  for line in select * from jsonb_array_elements(new.items) loop
    qty := (line ->> 'qty')::integer;
    if qty is null or qty < 1 or qty > 99 then
      raise exception 'bad_quantity';
    end if;

    select p.id, p.name, p.price, p.stock into item
    from public.products p
    where p.id = line ->> 'id' and p.active
    for update;

    if not found then
      raise exception 'unavailable:%', line ->> 'id';
    end if;
    if item.stock is not null and item.stock < qty then
      raise exception 'out_of_stock:%', item.id;
    end if;

    update public.products
    set stock = stock - qty
    where id = item.id and stock is not null;

    priced := priced || jsonb_build_object(
      'id', item.id, 'name', item.name, 'qty', qty,
      'price', item.price, 'total', item.price * qty);
    sum_total := sum_total + item.price * qty;
  end loop;

  new.items := priced;
  new.total := sum_total;
  return new;
end;
$$;

drop trigger if exists price_new_order on public.orders;
create trigger price_new_order
  before insert on public.orders
  for each row execute function public.price_new_order();

-- Cancelling an order puts its items back in stock (and un-cancelling
-- takes them out again).
create or replace function public.restock_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  line jsonb;
  direction integer;
begin
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    direction := 1;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    direction := -1;
  else
    return new;
  end if;

  for line in select * from jsonb_array_elements(new.items) loop
    update public.products
    set stock = greatest(stock + direction * (line ->> 'qty')::integer, 0)
    where id = line ->> 'id' and stock is not null;
  end loop;
  return new;
end;
$$;

drop trigger if exists restock_cancelled_order on public.orders;
create trigger restock_cancelled_order
  after update of status on public.orders
  for each row execute function public.restock_cancelled_order();

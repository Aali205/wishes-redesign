-- ---------------------------------------------------------------------------
-- Order tracking for customers ("رحلة طلباتي"). Customers can't read the
-- orders table; this returns one order only when both its number and the
-- phone it was placed with match, and only the fields the customer needs.
-- ---------------------------------------------------------------------------

create or replace function public.track_order(p_id text, p_phone text)
returns table (
  id text,
  created_at timestamptz,
  updated_at timestamptz,
  status text,
  paid boolean,
  payment text,
  total numeric,
  items jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.created_at, o.updated_at, o.status, o.paid, o.payment,
         o.total, o.items
  from public.orders o
  where o.id = upper(trim(p_id))
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 6
    and right(regexp_replace(o.phone, '\D', '', 'g'), 9)
      = right(regexp_replace(p_phone, '\D', '', 'g'), 9);
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

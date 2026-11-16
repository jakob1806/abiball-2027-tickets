-- Altersgruppen pro Ticket (Jugendschutz, Bändchenfarbe am Einlass) und Verkauf an der Abendkasse.
--
-- Altersgruppe = Alter am Tag des Abiballs:
--   u16 = unter 16 · u18 = 16 oder 17 · a18 = 18 oder älter

-- ---------------------------------------------------------------------------
-- Spalten
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists age_group text check (age_group in ('u16', 'u18', 'a18'));

-- Altersgruppen in derselben Reihenfolge wie die Namen (Besteller/in zuerst, dann guest_names)
alter table public.orders
  add column if not exists age_groups text[] not null default '{}';

-- Neue Zahlungsart „abendkasse“ (Barverkauf am Einlass, nur Afterparty)
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('stripe', 'bar', 'ueberweisung', 'frei', 'abendkasse'));

-- ---------------------------------------------------------------------------
-- create_reservation: neuer Parameter p_age_groups
-- ---------------------------------------------------------------------------
drop function if exists public.create_reservation(text, text, text, text, text[], boolean, boolean, jsonb, text, boolean, text);

create function public.create_reservation(
  p_buyer_name text,
  p_email text,
  p_relation text,
  p_guest_of text,
  p_guest_names text[],
  p_youth_ack boolean,
  p_terms_ack boolean,
  p_items jsonb,
  p_payment_method text default 'stripe',
  p_free boolean default false,
  p_notes text default null,
  p_age_groups text[] default '{}'
) returns public.orders
language plpgsql security definer set search_path = public, extensions as $$
declare
  s settings;
  item jsonb;
  tt ticket_types;
  qty int;
  total_qty int := 0;
  total_taken int;
  amount int := 0;
  avail record;
  new_order orders;
  ag text;
begin
  -- Serialisiert alle Reservierungen, damit nie überbucht wird
  perform pg_advisory_xact_lock(hashtext('abiball-capacity'));

  select * into s from settings where id;

  if p_payment_method = 'stripe' and not s.sales_open then
    raise exception 'SALES_CLOSED';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := (item->>'quantity')::int;
    if qty is null or qty < 0 then
      raise exception 'INVALID_QUANTITY';
    end if;
    total_qty := total_qty + qty;
  end loop;

  if total_qty < 1 then
    raise exception 'EMPTY_ORDER';
  end if;
  if total_qty > s.max_per_order then
    raise exception 'MAX_PER_ORDER';
  end if;

  -- Pro Ticket genau eine gültige Altersgruppe. Ein leeres Array ist nur erlaubt, damit Code, der noch ohne
  -- Altersabfrage läuft (z. B. während des Deployments), weiter funktioniert; die API-Routen verlangen das Alter.
  if coalesce(array_length(p_age_groups, 1), 0) > 0 then
    if array_length(p_age_groups, 1) <> total_qty then
      raise exception 'AGE_GROUPS_MISSING';
    end if;
    foreach ag in array p_age_groups loop
      if ag is null or ag not in ('u16', 'u18', 'a18') then
        raise exception 'AGE_GROUPS_INVALID';
      end if;
    end loop;
  end if;

  select coalesce(sum(a.taken), 0) into total_taken from ticket_availability() a;
  if total_taken + total_qty > s.total_capacity then
    raise exception 'SOLD_OUT';
  end if;

  insert into orders (buyer_name, email, relation, guest_of, guest_names,
                      youth_protection_ack, terms_ack, payment_method,
                      reserved_until, notes, age_groups)
  values (p_buyer_name, lower(trim(p_email)), p_relation, p_guest_of,
          coalesce(p_guest_names, '{}'), p_youth_ack, p_terms_ack, p_payment_method,
          now() + make_interval(mins => s.reservation_minutes + 5), p_notes, p_age_groups)
  returning * into new_order;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := (item->>'quantity')::int;
    continue when qty = 0;

    select * into tt from ticket_types where id = item->>'ticket_type_id' and active;
    if not found then
      raise exception 'UNKNOWN_TICKET_TYPE';
    end if;

    select * into avail from ticket_availability() a where a.ticket_type_id = tt.id;
    if avail.taken + qty > avail.quota then
      raise exception 'SOLD_OUT:%', tt.id;
    end if;

    insert into order_items (order_id, ticket_type_id, quantity, unit_price_cents)
    values (new_order.id, tt.id, qty, case when p_free then 0 else tt.price_cents end);

    amount := amount + qty * (case when p_free then 0 else tt.price_cents end);
  end loop;

  update orders set amount_cents = amount where id = new_order.id returning * into new_order;
  return new_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- fulfill_order: Ticketnummer (wie bisher) und Altersgruppe auf jedes Ticket
-- ---------------------------------------------------------------------------
create or replace function public.fulfill_order(
  p_order_id uuid,
  p_session_id text default null,
  p_payment_intent text default null
) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  o orders;
  it order_items;
  names text[];
  ages text[];
  name_idx int := 1;
  n int;
  holder text;
  new_code text;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if o.status = 'paid' then
    return false;
  end if;
  if o.status in ('cancelled', 'refunded') then
    raise exception 'ORDER_NOT_FULFILLABLE';
  end if;

  update orders
     set status = 'paid',
         paid_at = now(),
         reserved_until = null,
         stripe_session_id = coalesce(p_session_id, stripe_session_id),
         stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
   where id = o.id;

  -- Ticketinhaber: zuerst Besteller/in, danach die Gäste. Altersgruppen in derselben Reihenfolge.
  names := array[o.buyer_name] || coalesce(o.guest_names, '{}');
  ages := coalesce(o.age_groups, '{}');

  for it in select * from order_items where order_id = o.id order by ticket_type_id = 'ball' desc loop
    for n in 1..it.quantity loop
      holder := coalesce(nullif(trim(names[name_idx]), ''), o.buyer_name);
      loop
        new_code := generate_ticket_code();
        exit when not exists (select 1 from tickets where code = new_code);
      end loop;
      insert into tickets (order_id, ticket_type_id, code, holder_name, ticket_number, age_group)
      values (o.id, it.ticket_type_id, new_code, holder, next_ticket_number(it.ticket_type_id), ages[name_idx]);
      name_idx := name_idx + 1;
    end loop;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_in (mit Scanner-Konto): gibt zusätzlich die Altersgruppe zurück
-- ---------------------------------------------------------------------------
drop function if exists public.check_in(text, uuid, text);
create function public.check_in(p_code text, p_scanner_id uuid default null, p_label text default null)
returns table (
  result text,
  ticket_id uuid,
  code text,
  holder_name text,
  ticket_type_id text,
  checked_in_at timestamptz,
  order_id uuid,
  ticket_number text,
  checked_in_by_label text,
  age_group text
)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  t tickets;
  o orders;
  normalized text := upper(regexp_replace(trim(p_code), '\s', '', 'g'));
  res text;
  prev timestamptz;
  by_label text;
begin
  select * into t from tickets k where k.code = normalized for update;
  if not found then
    insert into checkins (code, result, scanner_user_id, scanner_label) values (normalized, 'invalid', p_scanner_id, p_label);
    return query select 'invalid'::text, null::uuid, normalized, null::text, null::text, null::timestamptz, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  select * into o from orders where id = t.order_id;

  if t.status <> 'valid' or o.status <> 'paid' then
    res := 'cancelled';
    prev := t.checked_in_at;
    by_label := t.checked_in_by_label;
  elsif t.checked_in_at is not null then
    res := 'duplicate';
    prev := t.checked_in_at;
    by_label := t.checked_in_by_label;
  else
    res := 'ok';
    update tickets
       set checked_in_at = now(), checked_in_by = p_scanner_id, checked_in_by_label = p_label
     where id = t.id
     returning tickets.checked_in_at into prev;
    by_label := p_label;
  end if;

  insert into checkins (ticket_id, code, result, scanner_user_id, scanner_label) values (t.id, t.code, res, p_scanner_id, p_label);
  return query select res, t.id, t.code, t.holder_name, t.ticket_type_id, prev, t.order_id, t.ticket_number, by_label, t.age_group;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rechte: nur der Server (service_role)
-- ---------------------------------------------------------------------------
revoke all on function public.create_reservation(text, text, text, text, text[], boolean, boolean, jsonb, text, boolean, text, text[]) from public, anon, authenticated;
revoke all on function public.fulfill_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.check_in(text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_reservation(text, text, text, text, text[], boolean, boolean, jsonb, text, boolean, text, text[]) to service_role;
grant execute on function public.fulfill_order(uuid, text, text) to service_role;
grant execute on function public.check_in(text, uuid, text) to service_role;

notify pgrst, 'reload schema';

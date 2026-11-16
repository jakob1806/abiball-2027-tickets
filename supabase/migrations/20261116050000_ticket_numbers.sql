-- Fortlaufende Ticketnummern je Ticketart, z. B. B-001 (Ball) und A-001 (Afterparty).
alter table public.ticket_types add column if not exists number_prefix text;
update public.ticket_types set number_prefix = 'B' where id = 'ball' and number_prefix is null;
update public.ticket_types set number_prefix = 'A' where id = 'afterparty' and number_prefix is null;
update public.ticket_types set number_prefix = upper(left(id, 1)) where number_prefix is null;
alter table public.ticket_types alter column number_prefix set not null;

create table if not exists public.ticket_counters (
  ticket_type_id text primary key references public.ticket_types (id),
  last_number integer not null default 0
);
alter table public.ticket_counters enable row level security;
revoke all on public.ticket_counters from anon, authenticated;

alter table public.tickets add column if not exists ticket_number text unique;

-- Nächste Nummer atomar vergeben
create or replace function public.next_ticket_number(p_type text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  n integer;
  prefix text;
begin
  insert into ticket_counters (ticket_type_id, last_number) values (p_type, 0)
  on conflict (ticket_type_id) do nothing;
  update ticket_counters set last_number = last_number + 1 where ticket_type_id = p_type returning last_number into n;
  select number_prefix into prefix from ticket_types where id = p_type;
  return prefix || '-' || lpad(n::text, 3, '0');
end;
$$;
revoke all on function public.next_ticket_number(text) from public, anon, authenticated;

-- Bestehende Tickets nachnummerieren (nach Erstellungszeit)
do $$
declare t record;
begin
  for t in select id, ticket_type_id from tickets where ticket_number is null order by created_at, code loop
    update tickets set ticket_number = next_ticket_number(t.ticket_type_id) where id = t.id;
  end loop;
end $$;

-- fulfill_order: vergibt jetzt zusätzlich die Ticketnummer
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

  names := array[o.buyer_name] || coalesce(o.guest_names, '{}');

  for it in select * from order_items where order_id = o.id order by ticket_type_id = 'ball' desc loop
    for n in 1..it.quantity loop
      holder := coalesce(nullif(trim(names[name_idx]), ''), o.buyer_name);
      name_idx := name_idx + 1;
      loop
        new_code := generate_ticket_code();
        exit when not exists (select 1 from tickets where code = new_code);
      end loop;
      insert into tickets (order_id, ticket_type_id, code, holder_name, ticket_number)
      values (o.id, it.ticket_type_id, new_code, holder, next_ticket_number(it.ticket_type_id));
    end loop;
  end loop;

  return true;
end;
$$;

-- check_in: gibt zusätzlich die Ticketnummer zurück
drop function if exists public.check_in(text);
create function public.check_in(p_code text)
returns table (
  result text,
  ticket_id uuid,
  code text,
  holder_name text,
  ticket_type_id text,
  checked_in_at timestamptz,
  order_id uuid,
  ticket_number text
)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  t tickets;
  o orders;
  normalized text := upper(regexp_replace(trim(p_code), '\s', '', 'g'));
  res text;
  prev timestamptz;
begin
  select * into t from tickets k where k.code = normalized for update;
  if not found then
    insert into checkins (code, result) values (normalized, 'invalid');
    return query select 'invalid'::text, null::uuid, normalized, null::text, null::text, null::timestamptz, null::uuid, null::text;
    return;
  end if;

  select * into o from orders where id = t.order_id;

  if t.status <> 'valid' or o.status <> 'paid' then
    res := 'cancelled';
    prev := t.checked_in_at;
  elsif t.checked_in_at is not null then
    res := 'duplicate';
    prev := t.checked_in_at;
  else
    res := 'ok';
    update tickets set checked_in_at = now() where id = t.id returning tickets.checked_in_at into prev;
  end if;

  insert into checkins (ticket_id, code, result) values (t.id, t.code, res);
  return query select res, t.id, t.code, t.holder_name, t.ticket_type_id, prev, t.order_id, t.ticket_number;
end;
$$;
revoke all on function public.check_in(text) from public, anon, authenticated;
grant execute on function public.check_in(text) to service_role;

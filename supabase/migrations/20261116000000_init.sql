-- Abiball 2027 – Ticketportal
-- Initiales Schema. Zugriff ausschließlich über den Service-Role-Key (Server).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Einstellungen (eine Zeile)
-- ---------------------------------------------------------------------------
create table public.settings (
  id               boolean primary key default true check (id),
  total_capacity   integer not null default 350 check (total_capacity > 0),
  max_per_order    integer not null default 8 check (max_per_order > 0),
  reservation_minutes integer not null default 30 check (reservation_minutes >= 30),
  sales_open       boolean not null default true
);
insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Ticketarten – Preise und Kontingente werden hier gepflegt
-- ---------------------------------------------------------------------------
create table public.ticket_types (
  id           text primary key,
  name         text not null,
  description  text not null default '',
  admission    text not null,            -- z. B. "ab 19:00 Uhr"
  price_cents  integer not null check (price_cents >= 0),
  quota        integer not null check (quota >= 0),
  sort         integer not null default 0,
  active       boolean not null default true
);

-- Platzhalterwerte – vor dem Verkaufsstart anpassen!
insert into public.ticket_types (id, name, description, admission, price_cents, quota, sort) values
  ('ball', 'Ball-Ticket', 'Einlass ab 19:00 Uhr, Buffet, Programm und Afterparty.', 'ab 19:00 Uhr', 6500, 300, 1),
  ('afterparty', 'Afterparty-Ticket', 'Einlass ab 22:30 Uhr zur Afterparty.', 'ab 22:30 Uhr', 2000, 100, 2);

-- ---------------------------------------------------------------------------
-- Bestellungen
-- ---------------------------------------------------------------------------
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  public_token          text not null unique default encode(gen_random_bytes(24), 'hex'),
  status                text not null default 'pending'
                        check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded')),
  buyer_name            text not null,
  email                 text not null,
  relation              text not null check (relation in ('abiturient', 'gast')),
  guest_of              text,
  guest_names           text[] not null default '{}',
  youth_protection_ack  boolean not null default false,
  terms_ack             boolean not null default false,
  payment_method        text not null default 'stripe'
                        check (payment_method in ('stripe', 'bar', 'ueberweisung', 'frei')),
  amount_cents          integer not null default 0,
  stripe_session_id     text unique,
  stripe_payment_intent text,
  reserved_until        timestamptz,
  paid_at               timestamptz,
  cancelled_at          timestamptz,
  refunded_at           timestamptz,
  mail_sent_at          timestamptz,
  notes                 text,
  created_at            timestamptz not null default now()
);
create index orders_status_idx on public.orders (status);
create index orders_email_idx on public.orders (lower(email));
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  order_id          uuid not null references public.orders (id) on delete cascade,
  ticket_type_id    text not null references public.ticket_types (id),
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  primary key (order_id, ticket_type_id)
);

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------
create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  ticket_type_id  text not null references public.ticket_types (id),
  code            text not null unique,
  holder_name     text not null,
  status          text not null default 'valid' check (status in ('valid', 'cancelled')),
  checked_in_at   timestamptz,
  created_at      timestamptz not null default now()
);
create index tickets_order_idx on public.tickets (order_id);

create table public.checkins (
  id          bigserial primary key,
  ticket_id   uuid references public.tickets (id) on delete set null,
  code        text not null,
  result      text not null check (result in ('ok', 'duplicate', 'invalid', 'cancelled')),
  created_at  timestamptz not null default now()
);

-- Verarbeitete Stripe-Events (Idempotenz)
create table public.stripe_events (
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: kein Zugriff für anon/authenticated. Der Service-Role-Key umgeht RLS.
-- ---------------------------------------------------------------------------
alter table public.settings      enable row level security;
alter table public.ticket_types  enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.tickets       enable row level security;
alter table public.checkins      enable row level security;
alter table public.stripe_events enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- Belegte Plätze je Ticketart: gültige Tickets + offene, nicht abgelaufene Reservierungen
create or replace function public.ticket_availability()
returns table (ticket_type_id text, quota integer, taken integer)
language sql stable security definer set search_path = public, extensions as $$
  select t.id,
         t.quota,
         (
           coalesce((select count(*) from tickets k
                      where k.ticket_type_id = t.id and k.status = 'valid'), 0)
           +
           coalesce((select sum(i.quantity) from order_items i
                      join orders o on o.id = i.order_id
                      where i.ticket_type_id = t.id
                        and o.status = 'pending'
                        and o.reserved_until > now()), 0)
         )::integer as taken
  from ticket_types t;
$$;

-- Ticketcode: WG27-XXXX-XXXX-XXXX (ohne verwechselbare Zeichen)
create or replace function public.generate_ticket_code()
returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(12);
  result text := 'WG27-';
  i int;
begin
  for i in 0..11 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    if i in (3, 7) then
      result := result || '-';
    end if;
  end loop;
  return result;
end;
$$;

-- Reservierung anlegen (atomar, mit Kapazitätsprüfung)
-- p_items: [{"ticket_type_id":"ball","quantity":2}, ...]
create or replace function public.create_reservation(
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
  p_notes text default null
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

  select coalesce(sum(a.taken), 0) into total_taken from ticket_availability() a;
  if total_taken + total_qty > s.total_capacity then
    raise exception 'SOLD_OUT';
  end if;

  insert into orders (buyer_name, email, relation, guest_of, guest_names,
                      youth_protection_ack, terms_ack, payment_method,
                      reserved_until, notes)
  values (p_buyer_name, lower(trim(p_email)), p_relation, p_guest_of,
          coalesce(p_guest_names, '{}'), p_youth_ack, p_terms_ack, p_payment_method,
          now() + make_interval(mins => s.reservation_minutes + 5), p_notes)
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

-- Bestellung als bezahlt markieren und Tickets erzeugen (idempotent)
-- Gibt true zurück, wenn die Bestellung in diesem Aufruf erfüllt wurde.
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

  -- Ticketinhaber: zuerst Besteller/in, danach die angegebenen Gäste
  names := array[o.buyer_name] || coalesce(o.guest_names, '{}');

  for it in select * from order_items where order_id = o.id order by ticket_type_id = 'ball' desc loop
    for n in 1..it.quantity loop
      holder := coalesce(nullif(trim(names[name_idx]), ''), o.buyer_name);
      name_idx := name_idx + 1;
      loop
        new_code := generate_ticket_code();
        exit when not exists (select 1 from tickets where code = new_code);
      end loop;
      insert into tickets (order_id, ticket_type_id, code, holder_name)
      values (o.id, it.ticket_type_id, new_code, holder);
    end loop;
  end loop;

  return true;
end;
$$;

-- Einlass: prüft und markiert ein Ticket atomar
create or replace function public.check_in(p_code text)
returns table (
  result text,
  ticket_id uuid,
  code text,
  holder_name text,
  ticket_type_id text,
  checked_in_at timestamptz,
  order_id uuid
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
    return query select 'invalid'::text, null::uuid, normalized, null::text, null::text, null::timestamptz, null::uuid;
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
  return query select res, t.id, t.code, t.holder_name, t.ticket_type_id, prev, t.order_id;
end;
$$;

revoke all on function public.ticket_availability() from public, anon, authenticated;
revoke all on function public.generate_ticket_code() from public, anon, authenticated;
revoke all on function public.create_reservation(text, text, text, text, text[], boolean, boolean, jsonb, text, boolean, text) from public, anon, authenticated;
revoke all on function public.fulfill_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.check_in(text) from public, anon, authenticated;
grant execute on function public.ticket_availability() to service_role;
grant execute on function public.create_reservation(text, text, text, text, text[], boolean, boolean, jsonb, text, boolean, text) to service_role;
grant execute on function public.fulfill_order(uuid, text, text) to service_role;
grant execute on function public.check_in(text) to service_role;
